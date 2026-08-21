-- Migration 150: add the CC32 capability OPERATIONAL counters to
-- record_engine_telemetry's allow-list (ARCHITECTURE section 29).
--
--   capability_resolution_no_candidate  {count} capability-blocked slots
--                                       in one committed generation run
--   capability_state_unavailable        no payload - a resolver read
--                                       failed during generation
--   capability_unknown_metadata_hit     {axis} - closed-vocabulary demand
--                                       axis name only
--   effective_diff_applied              no payload
--   effective_diff_declined             no payload
--
-- Aggregate and content-free BY LAW (R1 #12): counts and axis names
-- only - never rule content, exercise ids tied to users, or any health
-- data. Threshold/suppression review with counsel before any dashboard
-- (R1 L10).
--
-- Status: NOT APPLIED to production (founder-gated, supabase/README
-- process). Until it runs the server rejects the five events and the
-- client's fire-and-forget posts drop harmlessly - no data loss class.
-- Additive + idempotent (CREATE OR REPLACE of the same function with a
-- superset list; migrate_104's list is the base). Safe to re-run.
-- Rollback: re-run migrate_104 to restore the previous list.

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
    'partner_block_proposed',
    'partner_block_adopted',
    'partner_block_left',
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
    'longest_run_pb_reached',
    'onboarding_step_completed',
    'first_plan_generated',
    'first_workout_logged',
    'first_food_logged',
    'trial_lapse_day1_return',
    'partner_surface_view',
    'partner_invite_journey_step',
    'partner_invite_minted',
    'partner_invite_redeemed',
    'partner_invite_died_at_paywall',
    'partner_cheer',
    'partner_unpair',
    'partner_pair_week_active',
    'feature_locked_viewed',
    -- Progress Photos LOOP-3 (D4): the milestone-adjacent photo-capture
    -- invitation funnel. No payload; feature key only, no PII.
    'photo_prompt_shown',
    'photo_prompt_accepted',
    -- CC32 capability operational counters (section 29; content-free).
    'capability_resolution_no_candidate',
    'capability_state_unavailable',
    'capability_unknown_metadata_hit',
    'effective_diff_applied',
    'effective_diff_declined'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
