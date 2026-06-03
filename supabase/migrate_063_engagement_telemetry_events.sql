-- Migration 063: add the core engagement events to record_engine_telemetry
--
-- LB-8. The telemetry catalogue covered the conversion funnel, engine
-- health, food, sync, notifications and app lifecycle, but had no core
-- product-engagement events, so the dashboards could not show activation or
-- retention (did a user start a session, finish one, activate a plan).
-- These three close that gap:
--
--   workout_started    (createWorkout)               from_routine flag
--   workout_completed  (ActiveWorkoutScreen finish)  set/exercise count + duration
--   plan_activated     (setActivePlan)               no payload
--
-- Payloads carry counts/flags only, never training content. They flow
-- through the same opt-out gate as every other event (LB-9).
--
-- The client allow-list (src/lib/telemetry/events.js) is the source of
-- truth; this server CHECK must list every emittable event or its push is
-- rejected and the row re-pushes forever. Reproduces the migration 043
-- list verbatim plus the three new names.
--
-- Applied locally:  NO (pending)
-- Applied remotely: NO (pending founder apply)
-- Safe to re-run:   YES. CREATE OR REPLACE; no schema change.
-- Rollback:         re-apply migration 043 to drop the three names.
-- App dependency:   apply before a build that emits the three events
--                   reaches production sync; until then those pushes are
--                   rejected (and retried) but nothing else is affected.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run',
    'cascade_state_transition',
    'purchase_initiated',
    'purchase_completed',
    'purchase_failed',
    'subscription_cancelled',
    'restore_purchases_attempted',
    'notification_sent',
    'notification_tapped',
    'notification_failed',
    'article9_consent_withdrawn',
    'sync_conflict_resolved',
    'workout_started',
    'workout_completed',
    'plan_activated'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
