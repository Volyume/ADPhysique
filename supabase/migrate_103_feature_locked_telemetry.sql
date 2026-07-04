-- Migration 103: add 'feature_locked_viewed' to record_engine_telemetry's
-- allow-list so the full-screen Pro lock (ProLocked in src/components/ProGate.js)
-- can record its view. This is the view half of the lock -> upgrade funnel: with
-- it, lock-view -> ProUpgrade -> trial becomes computable, where before only the
-- CTA tap was measured.
--
--   feature_locked_viewed  payload: { feature } — the gated feature key only
--                          (e.g. 'Food diary'). Fired once per feature key when
--                          a free user lands on a Pro route and ProLocked
--                          renders. No PII, no values.
--
-- Counts / flags / small enums only. NO PII: no food names or values, no
-- training content, no weight, no step counts (the standing telemetry rule).
--
-- The client allow-list (src/lib/telemetry/events.js) is the source of truth;
-- this server CHECK must list every emittable event or its push is rejected and
-- the row re-pushes forever. Reproduces the migration 102 list plus the one new
-- name (feature_locked_viewed) AND restores 'longest_run_pb_reached', which 102
-- dropped when it forked its list from 100 (101 had added it). 103 is therefore
-- the complete canonical allow-list and should be the last one applied.
--
-- Applied locally:  NO (pending)
-- Applied remotely: NO — founder-applied manually. The deploy-migrations
--                   workflow is retired (E0); cloud migrations are run by the
--                   founder per CLAUDE.md. Apply this BEFORE shipping a client
--                   build that emits this event, or those pushes are rejected
--                   and retried until it lands (nothing else is affected).
-- Safe to re-run:   YES. CREATE OR REPLACE; no schema change.
-- Rollback:         re-apply migration 102 to drop 'feature_locked_viewed'.
--                   NOTE: doing so also re-drops 'longest_run_pb_reached'
--                   (102's list omits it), so a clean rollback should keep the
--                   103 list minus only 'feature_locked_viewed' rather than
--                   reverting to 102 wholesale.

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
    -- Restored here: migration 102 forked its allow-list from 100 and dropped
    -- 'longest_run_pb_reached' (added by 101), so applying 102/103 last would
    -- silently reject it. 103 is the complete canonical list, so this event is
    -- allowed again once 103 is applied.
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
    -- Full-screen Pro lock impression (view half of the lock -> upgrade funnel).
    -- Payload: { feature } key only; no PII.
    'feature_locked_viewed'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
