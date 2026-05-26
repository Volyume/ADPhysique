-- Migration 042: upgrade_tier_for_user (service-role-only variant of
-- upgrade_tier that takes the user_id as an explicit parameter).
--
-- Why this exists:
--   The Google Play Real-Time Developer Notifications (RTDN) Edge
--   Function (supabase/functions/play-billing-rtdn/index.ts) runs
--   with the service role and needs to write tier transitions for
--   arbitrary users (renewal, cancellation, refund, expiry,
--   restart). The original upgrade_tier RPC reads auth.uid() to
--   decide whose row to write. PostgREST's service-role JWT does
--   not populate auth.uid() with the target user, so calling
--   upgrade_tier from the Edge Function silently failed with
--   "Not authenticated" or wrote rows under the service role
--   instead of the purchasing user. The webhook tried to work
--   around this with a fabricated x-supabase-user-id header,
--   which PostgREST does not honour.
--
--   upgrade_tier_for_user accepts the user_id directly. It is
--   service-role-only (REVOKE PUBLIC + GRANT service_role) so a
--   compromised client cannot abuse it to grant itself Pro on
--   arbitrary accounts. The body mirrors upgrade_tier exactly
--   except for the uid binding; intentional duplication rather
--   than refactoring the production upgrade_tier signature,
--   which the closed-test build calls and must keep working
--   (CLAUDE.md release policy 2026-05-24).
--
-- Additive only. No change to upgrade_tier, users_profile,
-- tier_history, or any existing trigger. Re-runnable
-- (CREATE OR REPLACE FUNCTION).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

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

-- Service-role only. A compromised client must not be able to grant
-- itself Pro on someone else's account by calling this directly.
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) TO service_role;
