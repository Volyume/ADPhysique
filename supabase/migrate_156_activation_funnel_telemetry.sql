-- Migration 156: add the activation-funnel elevation events to
-- record_engine_telemetry's allow-list (lead activation ruling, 2026-09-03).
--
-- NUMBERING NOTE: the brief for this work named this file migrate_137, but
-- 137-155 already exist on this branch (exercise_swap_scope through
-- partner_cheer_server_date) -- the highest migration in the tree is 155,
-- not 136 as CLAUDE.md's slimmed STATUS block states. 156 is the next free
-- number; nothing is renumbered or overwritten.
--
-- Purpose: the business must be able to see where new users drop between
-- install and their first coaching payoff, using the existing first-party
-- telemetry pipe. Counts / flags / small enums only. NO PII: no food or
-- training content, no weight or calorie VALUES, no free text (the standing
-- telemetry rule).
--
--   first_workout_started        first-ever workout session started
--                                 (alongside the existing workout_started;
--                                 database.js, trackFirst).
--   first_weigh_in                first-ever morning/body weight saved
--                                 through BodyMetricsScreen's new-entry save
--                                 path. Count only, never the value.
--   checkin_started               { first: boolean } WeeklyCheckInScreen
--                                 opened into the 'open' gate state (the
--                                 form itself, not a too_soon/need_weights/
--                                 wrong_day gate screen). `first` reuses the
--                                 screen's existing getLatestCoachOutput read.
--   first_checkin_completed       first-ever successful weekly check-in
--                                 submit (trackFirst).
--   coach_result_viewed           { first: boolean, hold: boolean }
--                                 CoachOutputScreen rendered a completed
--                                 coaching decision, once per mount. `hold`
--                                 is true when the decision carried a data
--                                 hold (heldDecisions non-empty).
--   coach_recommendation_accepted / _declined   { kind: enum } a coach
--                                 suggestion was applied or declined. kind is
--                                 a small closed enum: 'calories' | 'volume'
--                                 | 'deload' | 'other'. Never the magnitude
--                                 or the resulting number.
--   notification_permission_requested   { status: enum } the OS permission
--                                 prompt's result: 'granted' | 'denied' |
--                                 'undetermined' | 'unknown'. Emitted inside
--                                 requestNotificationPermissions() itself so
--                                 every caller is covered.
--   setup_started                 first-ever mount of the account-setup
--                                 wizard's first visible step, for a
--                                 signed-in user (trackFirst).
--   first_home_landed             first-ever landing on Home after setup
--                                 completes (trackFirst). Emitter lives in
--                                 HomeScreen.
--
-- No 'signup_started' event exists: it would fire before an account does,
-- and this pipeline attributes rows to auth.uid() only (no anonymous install
-- id, by the standing privacy posture). The pre-account gap is read as store
-- installs against account_created, the first attributable event.
-- A "second workout" milestone is deliberately not a new event either: it
-- is derived server-side as the second workout_completed row per user.
--
-- The client allow-list (src/lib/telemetry/events.js) is the source of
-- truth; this server CHECK must list every emittable event or its push is
-- rejected and the row re-pushes forever until this migration applies --
-- nothing is lost, transport.js's client-side retry (getUnpushedEngineTelemetry
-- / markEngineTelemetryPushed) keeps unpushed rows queued locally and
-- re-attempts them on every flush cycle. Reproduces the migration 104
-- COMPLETE list plus ten new names, so 156 is the complete canonical
-- allow-list and should be the last one applied.
--
-- Applied locally:  NOT APPLIED - awaits the founder's exact phrase "run
--                   against production" (per CLAUDE.md; migrations are
--                   applied manually, never automatically).
-- Applied remotely: NOT APPLIED - awaits the founder's exact phrase "run
--                   against production".
-- Safe to re-run:   YES. CREATE OR REPLACE; no schema change, no data
--                   migration, purely additive to the allow-list.
-- Rollback:         re-apply migration 104 to drop the ten new names (104
--                   is the complete canonical list minus these ten).

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
    'first_home_landed'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;

-- Verification after apply:
-- SELECT record_engine_telemetry('first_workout_started', '{}'::jsonb);
-- (run as an authenticated user; expect a UUID back, not an exception)
