-- Migration 104: add 'photo_prompt_shown' and 'photo_prompt_accepted' to
-- record_engine_telemetry's allow-list so the Progress Photos LOOP-3 invitation
-- (ProgressPhotoPrompt in src/components/ProgressPhotoPrompt.js, mounted on
-- WorkoutSummaryScreen) can record its take rate. This is the impression ->
-- accept funnel for the milestone-adjacent photo-capture invitation.
--
--   photo_prompt_shown     no payload — the invitation was surfaced on a
--                          competence win (a PB or a session-streak milestone).
--   photo_prompt_accepted  no payload — the user tapped "Add a photo".
--
-- Feature keys only. NO PII: no photo, no weight, no body measurement, no
-- milestone content, no values (the standing telemetry rule). The surface is
-- ED-safety-adjacent and fires only after its fail-closed suppression / Pro /
-- opt-out / frequency gates pass on-device.
--
-- The client allow-list (src/lib/telemetry/events.js) is the source of truth;
-- this server CHECK must list every emittable event or its push is rejected and
-- the row re-pushes forever. Reproduces the migration 103 COMPLETE list plus the
-- two new names, so 104 is the complete canonical allow-list and should be the
-- last one applied.
--
-- Applied locally:  NO (pending)
-- Applied remotely: YES (2026-07-10, applied to EU-Dublin by Claude via the Supabase connector, founder-authorised "run against production")
--                   workflow is retired (E0); cloud migrations are run by the
--                   founder per CLAUDE.md. Apply this BEFORE shipping a client
--                   build that emits these events, or those pushes are rejected
--                   and retried until it lands (nothing else is affected).
-- Safe to re-run:   YES. CREATE OR REPLACE; no schema change.
-- Rollback:         re-apply migration 103 to drop the two new names (103's list
--                   is the complete canonical list minus these two).

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
    'photo_prompt_accepted'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
