-- ════════════════════════════════════════════════════════════════════
-- Migration 065: in-app reverse trial, 21 days to 14 days
-- ════════════════════════════════════════════════════════════════════
--
-- Purpose
--   Founder direction 2026-06-06: the trial becomes 14 cardless days in
--   the app plus a 7-day Google Play intro free-trial offer on the Pro
--   subscription product, 21 days free total. This migration changes the
--   in-app cardless window only: start_cascade now sets pro_trial_ends_at
--   to 14 days, not 21. The 7-day half is a Play Console offer on the
--   subscription product and is NOT a database concern (Google manages
--   that trial; our state machine treats a subscriber as paid_pro the
--   moment the Play subscription starts, intro trial or not).
--
-- What changes
--   start_cascade(): the only edit is `interval '21 days'` →
--   `interval '14 days'`. Body, signature, return keys, and the
--   tier_history insert are byte-for-byte identical to migration 033
--   otherwise. The cascade_advance_due_users worker is UNCHANGED: it
--   expires whenever `pro_trial_ends_at <= now()`, so a 14-day window
--   auto-expires at day 14 with no worker edit.
--
-- Applied locally (dev Supabase project):   NO  (pending)
-- Applied remotely (closed-test project):    NO  (pending founder apply)
--
-- Safe to re-run
--   Yes. CREATE OR REPLACE FUNCTION; no data writes, no schema change.
--   Idempotent.
--
-- Rollback
--   Re-apply migration 033's start_cascade body (interval '21 days') to
--   restore the previous window. No data migration either way; only the
--   value written into pro_trial_ends_at for trials started AFTER the
--   change is affected. In-flight trials keep whatever end date they
--   were already given.
--
-- App-code dependency
--   * PaywallScreen copy now states the 7-day Play intro trial (the
--     purchase-surface disclosure must match what Google actually bills),
--     not 21 days. Updated in the same change set.
--   * Safe to apply during the closed beta: PRO_BETA_ACTIVE forces every
--     signed-in user to tier='pro' regardless of trial_state, so the
--     shortened expiry does not strip anyone of Pro on the current build.
--   * The frozen closed-test AAB calls start_cascade and reads
--     pro_trial_ends_at with no hardcoded 21-day assumption that breaks;
--     a new trial just lasts 14 days. Its paywall string still reads
--     "21 days", a cosmetic mismatch on the frozen build, not a break.
--   * Apply alongside (or before) enabling real Play Billing + the Play
--     Console 7-day offer; do not rely on it converting trials until that
--     billing path exists.
-- ════════════════════════════════════════════════════════════════════

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

  -- 14-day cardless in-app reverse trial (was 21). The 7-day Play intro
  -- trial is configured in Play Console, not here.
  ends_at := starts_at + interval '14 days';

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
