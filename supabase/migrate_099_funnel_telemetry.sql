-- Migration 099: add the activation-funnel events to record_engine_telemetry
-- (E7.2 growth baseline). These are the "before" measurement the elevation
-- programme needs live in production before the interaction waves ship to
-- users, so the funnel's impact is measurable.
--
--   onboarding_step_completed  payload: { step }  — a forward advance through
--                              the Pro onboarding wizard (step 1..5). Counts
--                              only; no answers.
--   first_plan_generated       first-ever plan generation for this user
--                              (durable, once per user via telemetry_firsts).
--   first_workout_logged       first-ever completed workout.
--   first_food_logged          first-ever food-diary entry.
--   trial_lapse_day1_return    a cascade-expired (trial-lapsed) user opened the
--                              app again — the day-1 retention signal that had
--                              no emitter before. Flag only.
--
-- The rest of the requested funnel already rides existing events: trial start =
-- cascade_started; subscribe = paid_converted / purchase_completed; cascade-gate
-- outcomes = churn_at_gate / cascade_skipped_ahead / paid_converted; paywall
-- viewed/dismissed = paywall_shown / paywall_tapped_cta. No duplicates added.
--
-- Counts / flags / small enums only. NO PII: no food names or values, no
-- training content, no weight, no step counts (the standing telemetry rule).
--
-- The client allow-list (src/lib/telemetry/events.js) is the source of truth;
-- this server CHECK must list every emittable event or its push is rejected and
-- the row re-pushes forever. Reproduces the migration 093 list verbatim plus the
-- five new names.
--
-- Applied locally:  NO (pending)
-- Applied remotely: NO — founder-applied manually. The deploy-migrations
--                   workflow is retired (E0); cloud migrations are run by the
--                   founder per CLAUDE.md. Apply this BEFORE shipping a client
--                   build that emits these events, or those pushes are rejected
--                   and retried until it lands (nothing else is affected).
-- Safe to re-run:   YES. CREATE OR REPLACE; no schema change.
-- Rollback:         re-apply migration 093 to drop the five names.

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
    'onboarding_step_completed',
    'first_plan_generated',
    'first_workout_logged',
    'first_food_logged',
    'trial_lapse_day1_return'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
