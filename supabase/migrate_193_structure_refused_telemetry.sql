-- migrate_193_structure_refused_telemetry.sql
--
-- Purpose:           D228 item 5 (founder "Go as recommended", 2026-10-15,
--                    option C: the refusal chooser PLUS telemetry). One new
--                    engine telemetry event, `structure_refused`, so the
--                    rate at which the plan builder refuses a week, and
--                    why, is visible. The payload is reason codes and the
--                    numbers of the request only (reason, days, length in
--                    minutes, suggested days and length, minimum days,
--                    surface): no muscle names, no body data, nothing
--                    about the person (2026-08-21 Q4 posture).
--                    The server allow-list in record_engine_telemetry
--                    (migrate_156) must list every emittable event or the
--                    push is rejected and retried for ever, so this file
--                    re-issues that function with the one new name. Body
--                    verbatim from migrate_156 apart from the added line.
--
-- Applied locally:   no (cloud-only object)
-- Applied remotely:  YES, 2026-10-15 15:37:46 UTC (founder: "against
--                    production 193.", given in the same breath as the
--                    phrase for 192, 2026-10-15; Claude-run through the
--                    Supabase connector under the checksum protocol). The
--                    client emit (STRUCTURE_REFUSED_TELEMETRY,
--                    src/lib/sync/featureFlags.js) was turned on in the
--                    same landing.
-- Safe to re-run:    yes (CREATE OR REPLACE; GRANT is idempotent).
-- Rollback:          re-run migrate_156's record_engine_telemetry
--                    definition (the list without 'structure_refused').
-- Depends on:        156.

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
    'photo_prompt_shown',
    'photo_prompt_accepted',
    -- Activation-funnel elevation (lead activation ruling, 2026-09-03). See
    -- the header comment above for each event's payload shape.
    'first_workout_started',
    'first_weigh_in',
    'checkin_started',
    'first_checkin_completed',
    'coach_result_viewed',
    'coach_recommendation_accepted',
    'coach_recommendation_declined',
    'notification_permission_requested',
    'setup_started',
    'first_home_landed',
    -- D139 addendum (see header): plan-preview + manual-builder funnels.
    'plan_preview_shown',
    'plan_preview_confirmed',
    'plan_preview_dismissed',
    'block_decision',
    'library_plan_previewed',
    'manual_plan_started',
    'manual_plan_saved',
    'plan_replaced',
    -- migrate_193 (D228 item 5): the structure engine refused a week
    'structure_refused'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;

-- Acceptance check (read-only): expect the function source to contain the
-- new name.
SELECT position('structure_refused' IN pg_get_functiondef('public.record_engine_telemetry(text, jsonb, timestamptz)'::regprocedure)) > 0 AS lists_structure_refused;
