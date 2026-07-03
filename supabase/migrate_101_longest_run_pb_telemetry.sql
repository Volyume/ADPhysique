-- migrate_101_longest_run_pb_telemetry.sql
--
-- Purpose:          Add 'longest_run_pb_reached' to the server allow-list in
--                   record_engine_telemetry() so the S2c longest-run personal-
--                   best celebration can record its landmark. Counts only
--                   (payload { weeks } — a consecutive-week run length), never a
--                   body value, weight, calorie or date. Suppressed under an
--                   open ED flag / SCOFF / calm mode client-side before it ever
--                   reaches here.
-- Applied locally:  N/A — cloud only; there is no local-DB analogue (the local
--                   PB state lives in AsyncStorage via streakState.js).
-- Applied remotely: NO — founder runs this MANUALLY against EU-Dublin, like
--                   every cloud migration. The app never runs it.
-- Safe to re-run:   YES — CREATE OR REPLACE FUNCTION fully redefines the
--                   allow-list each run; idempotent. GRANT is idempotent.
-- Rollback:         Re-apply migrate_093 (the same function without the new
--                   event), or CREATE OR REPLACE with 'longest_run_pb_reached'
--                   removed. The client only emits it; removing it from the list
--                   just makes that one event's push RAISE, nothing else.
--
-- The allow-list is a hardcoded IN (...) inside the function, so a new landmark
-- is added by replacing the function with the extended list (mirrors migrate_093
-- exactly, one event longer).

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
    'chart_window_changed',
    'streak_week_resolved',
    'streak_milestone_reached',
    'streak_paused',
    'cancel_reason_captured',
    'step_tdee_modifier_evaluated',
    'partner_invite_sent',
    'partner_invite_accepted',
    'partner_cheer_sent',
    'partner_blocked',
    'watch_session_attached',
    'watch_set_logged',
    'watch_apply_duplicate_dropped',
    'watch_replay_recovered',
    'meal_plan_assembled',
    'food_promote_failed',
    'ocr_low_confidence_saved',
    'food_sanity_check_failed',
    'tonnage_milestone_reached',
    'perfect_month_reached',
    'longest_run_pb_reached'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
