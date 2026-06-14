-- Migration 077: add the COMP-019 chart-window-changed event to
-- record_engine_telemetry.
--
-- COMP-019 Stage 1a (interactive charts: window chips + recomputed takeaway).
-- One event measures whether users actually change a chart's time window:
--
--   chart_window_changed   (a window chip tap on a hero chart)
--     payload: { chart_id, window } — e.g. weight | e1rm | volume, and 3M
--
-- No PII: chart + window labels only, never any weight, strength or volume
-- value. Flows through the same opt-out gate as every other event.
--
-- The client allow-list (src/lib/telemetry/events.js) is the source of truth;
-- this server CHECK must list every emittable event or its push is rejected and
-- the row re-pushes forever. Reproduces the migration 076 list verbatim plus
-- the one new name.
--
-- Applied locally:  NO (pending)
-- Applied remotely: NO (pending founder apply)
-- Safe to re-run:   YES. CREATE OR REPLACE; no schema change.
-- Rollback:         re-apply migration 076 to drop the name.
-- App dependency:   apply before a build that emits the event reaches
--                   production sync; until then those pushes are rejected (and
--                   retried) but nothing else is affected.

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
    'plan_activated',
    'session_adjustment_shown',
    'session_adjustment_reverted',
    'methodology_opened',
    'recap_opened',
    'first_session_choice',
    'chart_window_changed'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
