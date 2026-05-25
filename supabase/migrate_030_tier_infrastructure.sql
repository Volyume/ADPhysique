-- Migration 030: Move #5 tier infrastructure (cascade + payments foundation)
--
-- Adds the schema layer the cascade state machine reads and writes:
--   * users_profile columns: trial_state + 4 supporting cols + revenuecat ref
--   * tier_history audit table (composite PK per IDENTITY_AND_OWNERSHIP_LOCKED)
--   * pricing_config single-row table + current_pricing_window() helper
--   * upgrade_tier RPC (the single entry point for tier changes)
--   * start_cascade RPC (the unstarted -> complete_trial_active transition)
--
-- Compatible with the existing closed-testing build:
--   * Schema additions are nullable / defaulted. Old client ignores
--     them and continues to read/write `tier` directly through the
--     existing protect_users_profile_tier trigger.
--   * The new RPCs are net-new; old client never calls them.
--
-- Backfill: existing users with tier='pro' get trial_state='paid_pro'
-- so they are not accidentally treated as cascade-eligible. Existing
-- free users stay at 'unstarted' so the cascade fires when they next
-- grant Article 9 consent in the new flow.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

-- ────────────────────────────────────────────────────────────────────
-- 1. users_profile column additions
-- Schema source: DATABASE_SCHEMA_LOCKED.md lines 459-478 +
--                SUBSCRIPTION_AND_PAYMENT_LOCKED.md line 255 (revenuecat).
-- goal_lock_advanced + goal_lock_set_at + health_data_consent columns
-- already shipped in migrations 017 and 019.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS trial_state text NOT NULL DEFAULT 'unstarted'
    CHECK (trial_state IN (
      'unstarted',
      'complete_trial_active',
      'pro_trial_active',
      'paid_complete',
      'paid_pro',
      'free',
      'cascade_expired'
    )),
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS complete_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_in_price_tier text
    CHECK (locked_in_price_tier IS NULL OR locked_in_price_tier IN ('open_beta','founders','standard')),
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text;

-- Existing pro users (beta testers) keep their paid state. Free
-- users stay 'unstarted' so the next Article 9 consent triggers the
-- cascade. Idempotent: only fires for rows still at the default.
UPDATE users_profile
   SET trial_state = 'paid_pro'
 WHERE trial_state = 'unstarted'
   AND tier = 'pro';

-- ────────────────────────────────────────────────────────────────────
-- 2. tier_history audit table
-- Per DATABASE_SCHEMA_LOCKED.md lines 432-451. Composite PK per
-- IDENTITY_AND_OWNERSHIP_LOCKED.md decision 3.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tier_history (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_tier       text NOT NULL CHECK (from_tier IN ('free','pro','complete','complete_trial','pro_trial')),
  to_tier         text NOT NULL CHECK (to_tier IN ('free','pro','complete','complete_trial','pro_trial')),
  reason          text NOT NULL CHECK (reason IN (
                    'auto_downgrade','user_skip','user_paid',
                    'user_cancelled','grace_lapsed','admin','refunded'
                  )),
  source_surface  text,
  payment_ref     text,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tier_history_user_occurred
  ON tier_history(user_id, occurred_at DESC);

ALTER TABLE tier_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tier history" ON tier_history;
CREATE POLICY "Users read own tier history" ON tier_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies. Writes happen only via the
-- SECURITY DEFINER RPCs below, which bypass RLS by design.

-- ────────────────────────────────────────────────────────────────────
-- 3. pricing_config + current_pricing_window()
-- Single-row config holds the launch-phase boundaries. NULL = phase
-- has not yet started. Pre-launch (all NULL) returns 'open_beta' so
-- any accidental paid transition during Phase A internal testing
-- locks in the best price for that tester (better-safe-than-sorry).
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_config (
  id             int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phase_b_start  timestamptz,
  phase_c_start  timestamptz,
  phase_d_start  timestamptz,
  updated_at     timestamptz DEFAULT now()
);

INSERT INTO pricing_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read pricing_config" ON pricing_config;
CREATE POLICY "Authenticated can read pricing_config" ON pricing_config
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION current_pricing_window()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg pricing_config%ROWTYPE;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO cfg FROM pricing_config WHERE id = 1;

  IF cfg.phase_d_start IS NOT NULL AND now_ts >= cfg.phase_d_start THEN
    RETURN 'standard';
  ELSIF cfg.phase_c_start IS NOT NULL AND now_ts >= cfg.phase_c_start THEN
    RETURN 'founders';
  ELSE
    -- Pre-launch or Phase B (open beta).
    RETURN 'open_beta';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION current_pricing_window() TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 4. _tier_for_trial_state helper (internal)
-- Maps cascade trial_state to the user-facing tier the engine reads.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _tier_for_trial_state(_state text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE _state
    WHEN 'complete_trial_active' THEN 'complete'
    WHEN 'pro_trial_active'      THEN 'pro'
    WHEN 'paid_complete'         THEN 'complete'
    WHEN 'paid_pro'              THEN 'pro'
    ELSE 'free'  -- unstarted, free, cascade_expired
  END;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 5. start_cascade RPC
-- The 'unstarted' -> 'complete_trial_active' transition fired when
-- Article 9 consent is granted at onboarding (per
-- SUBSCRIPTION_AND_PAYMENT_LOCKED.md line 106). Idempotent: re-runs
-- against an already-started cascade no-op.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION start_cascade()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur_state text;
  starts_at timestamptz := now();
  ends_at timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trial_state INTO cur_state FROM users_profile WHERE id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Idempotent: only the first call from 'unstarted' starts the
  -- cascade. Any other state just returns the current values.
  IF cur_state <> 'unstarted' THEN
    RETURN jsonb_build_object(
      'trial_state', cur_state,
      'already_started', true
    );
  END IF;

  ends_at := starts_at + interval '14 days';

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = 'complete',
    trial_state = 'complete_trial_active',
    trial_started_at = starts_at,
    complete_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (uid, 'free', 'complete_trial', 'admin', 'onboarding_article9');

  RETURN jsonb_build_object(
    'trial_state', 'complete_trial_active',
    'tier', 'complete',
    'trial_started_at', starts_at,
    'complete_trial_ends_at', ends_at
  );
END $$;

GRANT EXECUTE ON FUNCTION start_cascade() TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 6. upgrade_tier RPC
-- The single entry point for every tier change other than the
-- initial cascade start. Computes the destination trial_state from
-- (target_tier, reason), updates users_profile, writes a
-- tier_history row, returns the new state.
--
-- Bypasses protect_users_profile_tier via session_replication_role
-- so tier UPDATEs from this RPC are NOT reverted. The trigger still
-- protects against client-direct UPDATEs.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upgrade_tier(
  _target_tier text,
  _reason text,
  _source_surface text DEFAULT NULL,
  _payment_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur RECORD;
  new_trial_state text;
  new_tier text;
  new_lock text;
  new_complete_ends timestamptz;
  new_pro_ends timestamptz;
  history_from text;
  history_to text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _target_tier NOT IN ('pro','complete','free') THEN
    RAISE EXCEPTION 'Invalid target_tier: %', _target_tier;
  END IF;

  IF _reason NOT IN ('auto_downgrade','user_skip','user_paid',
                     'user_cancelled','grace_lapsed','admin','refunded') THEN
    RAISE EXCEPTION 'Invalid reason: %', _reason;
  END IF;

  IF _reason = 'user_paid' AND _payment_ref IS NULL THEN
    RAISE EXCEPTION 'user_paid requires payment_ref';
  END IF;

  SELECT tier, trial_state, locked_in_price_tier,
         complete_trial_ends_at, pro_trial_ends_at, trial_started_at
    INTO cur
  FROM users_profile WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Compute destination trial_state from (target, reason). Locked
  -- table per SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 102-119.
  new_trial_state := CASE
    WHEN _reason = 'user_paid'      AND _target_tier = 'complete' THEN 'paid_complete'
    WHEN _reason = 'user_paid'      AND _target_tier = 'pro'      THEN 'paid_pro'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'pro'      THEN 'pro_trial_active'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'free'     THEN 'cascade_expired'
    WHEN _reason = 'user_skip'      AND _target_tier = 'pro'      THEN 'pro_trial_active'
    WHEN _reason = 'user_skip'      AND _target_tier = 'free'     THEN 'free'
    WHEN _reason IN ('user_cancelled','grace_lapsed','refunded')
                                    AND _target_tier = 'free'     THEN 'free'
    WHEN _reason = 'admin'          AND _target_tier = 'complete' THEN 'paid_complete'
    WHEN _reason = 'admin'          AND _target_tier = 'pro'      THEN 'paid_pro'
    WHEN _reason = 'admin'          AND _target_tier = 'free'     THEN 'free'
    ELSE NULL
  END;

  IF new_trial_state IS NULL THEN
    RAISE EXCEPTION 'Invalid transition: target=% reason=% (current trial_state=%)',
      _target_tier, _reason, cur.trial_state;
  END IF;

  new_tier := _tier_for_trial_state(new_trial_state);

  -- Lock in the pricing window on the first paid transition.
  IF cur.locked_in_price_tier IS NULL AND _reason = 'user_paid' THEN
    new_lock := current_pricing_window();
  ELSE
    new_lock := cur.locked_in_price_tier;
  END IF;

  -- If we are entering pro_trial_active from complete_trial_active
  -- via auto_downgrade, set the pro trial's 14-day window.
  new_complete_ends := cur.complete_trial_ends_at;
  new_pro_ends := cur.pro_trial_ends_at;

  IF new_trial_state = 'pro_trial_active'
     AND cur.trial_state = 'complete_trial_active' THEN
    new_pro_ends := now() + interval '14 days';
  END IF;

  -- Map cur.trial_state + new_trial_state to history tier names.
  -- complete_trial / pro_trial are tier-history-only labels for the
  -- trial states; complete / pro / free are stable post-cascade.
  history_from := CASE cur.trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_complete' THEN 'complete'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;
  history_to := CASE new_trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_complete' THEN 'complete'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = new_tier,
    trial_state = new_trial_state,
    locked_in_price_tier = new_lock,
    complete_trial_ends_at = new_complete_ends,
    pro_trial_ends_at = new_pro_ends
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (
    user_id, from_tier, to_tier, reason, source_surface, payment_ref
  ) VALUES (
    uid, history_from, history_to, _reason, _source_surface, _payment_ref
  );

  RETURN jsonb_build_object(
    'trial_state', new_trial_state,
    'tier', new_tier,
    'locked_in_price_tier', new_lock,
    'complete_trial_ends_at', new_complete_ends,
    'pro_trial_ends_at', new_pro_ends,
    'payment_ref', _payment_ref
  );
END $$;

GRANT EXECUTE ON FUNCTION upgrade_tier(text, text, text, text) TO authenticated;
