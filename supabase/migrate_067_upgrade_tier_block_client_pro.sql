-- ════════════════════════════════════════════════════════════════════
-- Migration 067: upgrade_tier (authenticated) becomes downgrade-only
-- ════════════════════════════════════════════════════════════════════
--
-- Purpose (C-1, subscriptions audit 2026-06-06)
--   Close the self-grant hole. The authenticated upgrade_tier accepted
--   _reason='user_paid' with any client-supplied _payment_ref and no
--   receipt verification, so any signed-in caller could grant itself
--   paid_pro for free by calling the RPC directly. RTDN never corrects
--   it (no Google event exists for a purchase that never happened).
--
--   Fix: the authenticated upgrade_tier may now ONLY move a user toward
--   'free'. The paid 'pro' grant is server-authoritative: it comes only
--   from the Google Play RTDN via the service-role upgrade_tier_for_user
--   (migration 042), AFTER Play Developer API verification. The trial
--   grant is start_cascade (a separate function, unchanged). The body is
--   reproduced verbatim from migration 033 with one guard added.
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending)
-- Safe to re-run:                    YES (CREATE OR REPLACE, idempotent)
-- Rollback:                          re-apply migration 033's upgrade_tier body
-- App-code dependency:               ships WITH the client change that makes a
--   paid purchase an optimistic local unlock reconciled by the RTDN-written
--   tier (cascade.payAt + store.setOptimisticPaid, 2026-06-06). The frozen
--   closed-test AAB never calls upgrade_tier('pro') (payments post-date it), so
--   this is frozen-AAB safe. start_cascade and upgrade_tier_for_user are
--   unaffected, so the trial and the RTDN grant path still work.
-- ════════════════════════════════════════════════════════════════════

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

-- Verification:
--   SELECT upgrade_tier('pro','user_paid',NULL,'x');  -- expect: ERROR (server-authoritative)
--   SELECT upgrade_tier('free','user_skip','test',NULL);  -- expect: ok, tier=free
