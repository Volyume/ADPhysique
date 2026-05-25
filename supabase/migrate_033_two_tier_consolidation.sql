-- Migration 033: 2-tier consolidation (founder override 2026-05-25)
--
-- Volyume shipped originally as 3 tiers (Free, Pro, Complete) with a
-- 28-day Complete→Pro→Free cascade. Founder direction 2026-05-25:
-- consolidate to 2 tiers (Free, Pro), single 21-day Pro trial,
-- Complete tier dropped, Peak Week removed entirely. See
-- docs/COMPLETE_TIER_SCOPE_LOCKED.md and
-- docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md for the new locked spec.
--
-- Schema changes:
--
--   * start_cascade RPC: now transitions to 'pro_trial_active' with
--     a 21-day window (was 'complete_trial_active' with 14-day).
--   * upgrade_tier RPC: simplified case statements. Legacy
--     transitions to/from 'complete_*' states left in for schema
--     safety but unreachable in normal client flow.
--   * cascade_advance_due_users worker: drops the day-14
--     Complete→Pro step; only handles the day-21 Pro→Free expiry.
--
-- CHECK constraints on trial_state, tier_history.from_tier, and
-- tier_history.to_tier are left INCLUSIVE of the legacy 'complete*'
-- values. This is deliberate: the values are dead in the 2-tier
-- model but never get written by the new code, so dropping them
-- from the CHECK would require a coordinated schema rewrite for
-- zero functional benefit. The unused values stay in the constraint
-- like dead language tags in an i18n bundle.
--
-- Backfill: no rows in production currently sit at
-- 'complete_trial_active' or 'paid_complete' (migration 030's
-- backfill mapped existing tier='pro' users to 'paid_pro' and free
-- users to 'unstarted'). If any are inadvertently in those states,
-- the migration below maps them to the 2-tier equivalents.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

-- ────────────────────────────────────────────────────────────────────
-- 1. Backfill any users still in legacy Complete states
-- ────────────────────────────────────────────────────────────────────

UPDATE users_profile
   SET trial_state = 'pro_trial_active',
       tier = 'pro',
       pro_trial_ends_at = COALESCE(complete_trial_ends_at, now() + interval '21 days'),
       complete_trial_ends_at = NULL
 WHERE trial_state = 'complete_trial_active';

UPDATE users_profile
   SET trial_state = 'paid_pro',
       tier = 'pro'
 WHERE trial_state = 'paid_complete';

-- ────────────────────────────────────────────────────────────────────
-- 2. start_cascade RPC — 21-day Pro trial
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

  IF cur_state <> 'unstarted' THEN
    RETURN jsonb_build_object(
      'trial_state', cur_state,
      'already_started', true
    );
  END IF;

  ends_at := starts_at + interval '21 days';

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = 'pro',
    trial_state = 'pro_trial_active',
    trial_started_at = starts_at,
    pro_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9');

  RETURN jsonb_build_object(
    'trial_state', 'pro_trial_active',
    'tier', 'pro',
    'trial_started_at', starts_at,
    'pro_trial_ends_at', ends_at
  );
END $$;

GRANT EXECUTE ON FUNCTION start_cascade() TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 3. upgrade_tier RPC — simplified for 2 tiers
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
  new_pro_ends timestamptz;
  history_from text;
  history_to text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2-tier model: target is 'pro' or 'free'. ('complete' rejected.)
  IF _target_tier NOT IN ('pro', 'free') THEN
    RAISE EXCEPTION 'Invalid target_tier: % (2-tier model accepts pro|free only)', _target_tier;
  END IF;

  IF _reason NOT IN ('auto_downgrade','user_skip','user_paid',
                     'user_cancelled','grace_lapsed','admin','refunded') THEN
    RAISE EXCEPTION 'Invalid reason: %', _reason;
  END IF;

  IF _reason = 'user_paid' AND _payment_ref IS NULL THEN
    RAISE EXCEPTION 'user_paid requires payment_ref';
  END IF;

  SELECT tier, trial_state, locked_in_price_tier,
         pro_trial_ends_at, trial_started_at
    INTO cur
  FROM users_profile WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Compute destination trial_state. Simpler than the 3-tier era;
  -- the only paid destination is paid_pro.
  new_trial_state := CASE
    WHEN _reason = 'user_paid'      AND _target_tier = 'pro'  THEN 'paid_pro'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'free' THEN 'cascade_expired'
    WHEN _reason = 'user_skip'      AND _target_tier = 'free' THEN 'free'
    WHEN _reason IN ('user_cancelled','grace_lapsed','refunded')
                                    AND _target_tier = 'free' THEN 'free'
    WHEN _reason = 'admin'          AND _target_tier = 'pro'  THEN 'paid_pro'
    WHEN _reason = 'admin'          AND _target_tier = 'free' THEN 'free'
    ELSE NULL
  END;

  IF new_trial_state IS NULL THEN
    RAISE EXCEPTION 'Invalid transition: target=% reason=% (current trial_state=%)',
      _target_tier, _reason, cur.trial_state;
  END IF;

  new_tier := CASE
    WHEN new_trial_state IN ('paid_pro') THEN 'pro'
    ELSE 'free'
  END;

  -- Lock in pricing window on the first paid transition.
  IF cur.locked_in_price_tier IS NULL AND _reason = 'user_paid' THEN
    new_lock := current_pricing_window();
  ELSE
    new_lock := cur.locked_in_price_tier;
  END IF;

  new_pro_ends := cur.pro_trial_ends_at;

  -- Map current + new trial_state to history tier labels.
  history_from := CASE cur.trial_state
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_pro' THEN 'pro'
    -- Legacy values (unreachable in normal flow, kept for safety):
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'paid_complete' THEN 'complete'
    ELSE 'free'
  END;
  history_to := CASE new_trial_state
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = new_tier,
    trial_state = new_trial_state,
    locked_in_price_tier = new_lock,
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
    'pro_trial_ends_at', new_pro_ends,
    'payment_ref', _payment_ref
  );
END $$;

GRANT EXECUTE ON FUNCTION upgrade_tier(text, text, text, text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 4. cascade_advance_due_users — 2-tier version
-- ────────────────────────────────────────────────────────────────────
-- Only one transition path now: pro_trial_active → cascade_expired
-- when pro_trial_ends_at lapses. The 14-day complete→pro step is
-- removed.

CREATE OR REPLACE FUNCTION cascade_advance_due_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_uids uuid[];
  advanced_to_free_count int := 0;
  started_at timestamptz := now();
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);

  -- pro_trial_active → cascade_expired
  SELECT array_agg(id) INTO expired_uids
  FROM users_profile
  WHERE trial_state = 'pro_trial_active'
    AND pro_trial_ends_at IS NOT NULL
    AND pro_trial_ends_at <= started_at;

  IF expired_uids IS NOT NULL AND array_length(expired_uids, 1) > 0 THEN
    UPDATE users_profile
       SET trial_state = 'cascade_expired',
           tier = 'free'
     WHERE id = ANY(expired_uids)
       AND trial_state = 'pro_trial_active';

    INSERT INTO tier_history (
      user_id, from_tier, to_tier, reason, source_surface, occurred_at
    )
    SELECT u, 'pro_trial', 'free', 'auto_downgrade',
           'cascade_day21_worker', started_at
    FROM unnest(expired_uids) u;

    advanced_to_free_count := array_length(expired_uids, 1);
  END IF;

  PERFORM set_config('session_replication_role', 'origin', true);

  RETURN jsonb_build_object(
    'advanced_to_free', advanced_to_free_count,
    'ran_at', started_at,
    'duration_ms', round(EXTRACT(epoch FROM (now() - started_at)) * 1000)
  );
END $$;

REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM authenticated;

-- pg_cron schedule is unchanged from migration 031; the worker just
-- has fewer states to process now. Re-schedule to confirm the
-- replaced function is the one cron calls.
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('cascade-advance-due-users');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

SELECT cron.schedule(
  'cascade-advance-due-users',
  '*/15 * * * *',
  $cron$SELECT cascade_advance_due_users();$cron$
);
