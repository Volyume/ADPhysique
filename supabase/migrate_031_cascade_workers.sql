-- Migration 031: cascade auto-downgrade workers (pg_cron)
--
-- The cascade transitions complete_trial_active → pro_trial_active
-- at day 14, and pro_trial_active → cascade_expired at day 28. Per
-- SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 107-114 + MOVE_5_TIER_INFRASTRUCTURE.md
-- lines 117-130 these run as Supabase scheduled functions.
--
-- One worker function does both gates. Scheduled every 15 minutes
-- so the latency between trial-end and downgrade is bounded.
-- Granular enough for the day-12 / day-14 / day-26 / day-28 cadence
-- locked in NOTIFICATIONS_LOCKED.md.
--
-- Idempotent and safe to run concurrently:
--   * Uses tier-protect trigger bypass via session_replication_role
--     (same pattern as upgrade_tier).
--   * Each transition is one batched UPDATE + matching INSERT into
--     tier_history.
--   * trial_state guard in the WHERE clause ensures rows already
--     transitioned can never be advanced twice.
--
-- Requires pg_cron extension. Supabase Free tier supports this;
-- enable in Dashboard → Database → Extensions if not already on
-- (CREATE EXTENSION below is idempotent and silently succeeds).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ────────────────────────────────────────────────────────────────────
-- Worker function
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cascade_advance_due_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_uids uuid[];
  advanced_to_pro_count int := 0;
  advanced_to_free_count int := 0;
  started_at timestamptz := now();
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);

  -- ─── Day 14: complete_trial_active → pro_trial_active ────────────
  SELECT array_agg(id) INTO expired_uids
  FROM users_profile
  WHERE trial_state = 'complete_trial_active'
    AND complete_trial_ends_at IS NOT NULL
    AND complete_trial_ends_at <= started_at;

  IF expired_uids IS NOT NULL AND array_length(expired_uids, 1) > 0 THEN
    UPDATE users_profile
       SET trial_state = 'pro_trial_active',
           tier = 'pro',
           pro_trial_ends_at = started_at + interval '14 days'
     WHERE id = ANY(expired_uids)
       AND trial_state = 'complete_trial_active';  -- re-check to avoid double-advance

    INSERT INTO tier_history (
      user_id, from_tier, to_tier, reason, source_surface, occurred_at
    )
    SELECT u, 'complete_trial', 'pro_trial', 'auto_downgrade',
           'cascade_day14_worker', started_at
    FROM unnest(expired_uids) u;

    advanced_to_pro_count := array_length(expired_uids, 1);
  END IF;

  -- ─── Day 28: pro_trial_active → cascade_expired ──────────────────
  expired_uids := NULL;
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
           'cascade_day28_worker', started_at
    FROM unnest(expired_uids) u;

    advanced_to_free_count := array_length(expired_uids, 1);
  END IF;

  PERFORM set_config('session_replication_role', 'origin', true);

  RETURN jsonb_build_object(
    'advanced_to_pro', advanced_to_pro_count,
    'advanced_to_free', advanced_to_free_count,
    'ran_at', started_at,
    'duration_ms', round(EXTRACT(epoch FROM (now() - started_at)) * 1000)
  );
END $$;

-- Restrict execution. Worker should only ever be invoked by pg_cron
-- (which runs as the cron user) or by service-role for ops triggers.
REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Schedule: every 15 minutes. Idempotent unschedule + re-schedule so
-- re-running this migration updates the schedule cleanly.
-- ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- cron.unschedule raises if the job doesn't exist; swallow.
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
