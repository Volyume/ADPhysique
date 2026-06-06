-- ════════════════════════════════════════════════════════════════════
-- Migration 068: tier RPCs bypass the protect-tier trigger via a GUC,
--                not session_replication_role
-- ════════════════════════════════════════════════════════════════════
--
-- Problem (production, 2026-06-06, confirmed in Sentry):
--   start_cascade, upgrade_tier, upgrade_tier_for_user and
--   cascade_advance_due_users all did
--       PERFORM set_config('session_replication_role', 'replica', true);
--   to disable the users_profile_protect_tier trigger while they write
--   the tier column. session_replication_role is a superuser-only
--   parameter. On hosted Supabase the function owner is not a superuser,
--   so every one of these RPCs throws
--       "permission denied to set parameter session_replication_role"
--   and aborts. The visible symptom: starting the 14-day Pro trial fails,
--   so a user who taps "Go Pro" never actually goes Pro and the app keeps
--   routing them to the free first-run screen. Downgrades, the paid RTDN
--   grant, and the day-14 expiry worker were all broken the same way.
--
-- Fix:
--   The protect-tier trigger now also allows a tier change when a
--   session-local custom GUC, app.allow_tier_change, is 'on'. Custom GUCs
--   in a dotted namespace need no special role, unlike
--   session_replication_role. Each trusted tier RPC sets the flag around
--   its UPDATE instead of toggling session_replication_role.
--
--   Security: a client cannot set app.allow_tier_change. PostgREST runs
--   each request as a single statement with no way to SET a GUC first, and
--   there is no RPC that sets it; only these SECURITY DEFINER functions do,
--   and the flag is transaction-local (is_local = true), so it cannot leak
--   across requests on a pooled connection. The existing auth.uid() IS NULL
--   service-role bypass is kept as well.
--
-- Behaviour: bodies are reproduced verbatim from their latest definitions
--   (start_cascade migration 065, upgrade_tier migration 067,
--   upgrade_tier_for_user migration 042, cascade_advance_due_users
--   migration 033). The ONLY change in each is swapping the two
--   session_replication_role set_config calls for the app.allow_tier_change
--   flag. No signatures, return shapes, transition logic, grants or
--   pricing change.
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending)
-- Safe to re-run:                    YES (CREATE OR REPLACE, idempotent)
-- Rollback:                          re-apply migrations 065/067/042/033 and
--                                    setup_complete.sql's trigger function.
--                                    (Rollback restores the broken state, so
--                                    only roll back if 068 itself is wrong.)
-- App-code dependency:               none new. The client already calls
--   start_cascade / upgrade_tier with the same arguments; this just makes
--   them succeed. The frozen closed-test AAB calls start_cascade too, so it
--   benefits from the fix without any client change.
-- ════════════════════════════════════════════════════════════════════


-- ─── 1. protect-tier trigger: honour the app.allow_tier_change flag ───
-- Reverts any client UPDATE that tries to change `tier`, EXCEPT when a
-- trusted tier RPC has set app.allow_tier_change='on' for this transaction,
-- or the caller is the service role (auth.uid() IS NULL).
CREATE OR REPLACE FUNCTION protect_users_profile_tier()
RETURNS TRIGGER AS $func$
BEGIN
  -- Trusted tier RPCs set this transaction-local flag around their write.
  IF current_setting('app.allow_tier_change', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.tier IS DISTINCT FROM OLD.tier THEN
        NEW.tier := OLD.tier;
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      -- New profiles must start as 'free'; only service role can
      -- promote them (auth.uid() IS NULL bypasses this branch).
      IF NEW.tier IS DISTINCT FROM 'free' THEN
        NEW.tier := 'free';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger definition itself is unchanged; recreate for idempotency.
DROP TRIGGER IF EXISTS users_profile_protect_tier ON users_profile;
CREATE TRIGGER users_profile_protect_tier
  BEFORE INSERT OR UPDATE ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION protect_users_profile_tier();


-- ─── 2. start_cascade (from migration 065, 14-day trial) ───
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

  -- 14-day cardless in-app reverse trial. The 7-day Play intro trial is
  -- configured in Play Console, not here.
  ends_at := starts_at + interval '14 days';

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile SET
    tier = 'pro',
    trial_state = 'pro_trial_active',
    trial_started_at = starts_at,
    pro_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('app.allow_tier_change', 'off', true);

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


-- ─── 3. upgrade_tier (from migration 067, downgrade-only for clients) ───
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

  -- C-1 (2026-06-06): paid 'pro' grants are server-authoritative. A user's own
  -- session must never grant itself Pro. Real grants come only from the Google
  -- Play RTDN via the service-role upgrade_tier_for_user (migration 042) after
  -- Play Developer API verification; the trial grant is start_cascade. This
  -- authenticated function may only move a user toward 'free'.
  IF _target_tier <> 'free' THEN
    RAISE EXCEPTION 'pro grants are server-authoritative; client upgrade_tier may only downgrade to free';
  END IF;
  IF _reason IN ('user_paid','admin') THEN
    RAISE EXCEPTION 'reason % is not permitted from the client upgrade_tier', _reason;
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

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile SET
    tier = new_tier,
    trial_state = new_trial_state,
    locked_in_price_tier = new_lock,
    pro_trial_ends_at = new_pro_ends
  WHERE id = uid;
  PERFORM set_config('app.allow_tier_change', 'off', true);

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


-- ─── 4. upgrade_tier_for_user (from migration 042, service-role grant) ───
CREATE OR REPLACE FUNCTION upgrade_tier_for_user(
  _user_id uuid,
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
  uid uuid := _user_id;
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
    RAISE EXCEPTION 'upgrade_tier_for_user: _user_id is required';
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

  IF cur.locked_in_price_tier IS NULL AND _reason = 'user_paid' THEN
    new_lock := current_pricing_window();
  ELSE
    new_lock := cur.locked_in_price_tier;
  END IF;

  new_complete_ends := cur.complete_trial_ends_at;
  new_pro_ends := cur.pro_trial_ends_at;

  IF new_trial_state = 'pro_trial_active'
     AND cur.trial_state = 'complete_trial_active' THEN
    new_pro_ends := now() + interval '14 days';
  END IF;

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

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile SET
    tier = new_tier,
    trial_state = new_trial_state,
    locked_in_price_tier = new_lock,
    complete_trial_ends_at = new_complete_ends,
    pro_trial_ends_at = new_pro_ends
  WHERE id = uid;
  PERFORM set_config('app.allow_tier_change', 'off', true);

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

-- Service-role only. A compromised client must not be able to grant
-- itself Pro on someone else's account by calling this directly.
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM authenticated;


-- ─── 5. cascade_advance_due_users (from migration 033, day-14 worker) ───
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
  PERFORM set_config('app.allow_tier_change', 'on', true);

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

  PERFORM set_config('app.allow_tier_change', 'off', true);

  RETURN jsonb_build_object(
    'advanced_to_free', advanced_to_free_count,
    'ran_at', started_at,
    'duration_ms', round(EXTRACT(epoch FROM (now() - started_at)) * 1000)
  );
END $$;

REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM authenticated;

-- Verification (run as the SQL editor / service role):
--   -- trial start should now succeed and return tier='pro':
--   --   SELECT start_cascade();   (as an authenticated user whose
--   --   trial_state='unstarted')
--   -- confirm the trigger no longer reverts the RPC write:
--   --   SELECT tier, trial_state FROM users_profile WHERE id = auth.uid();
--   -- a direct client tier write must STILL be blocked:
--   --   UPDATE users_profile SET tier='pro' WHERE id = auth.uid();
--   --   SELECT tier FROM users_profile WHERE id = auth.uid();  -- still 'free'
