-- migrate_200_growth_telemetry.sql
--
-- Purpose:           Founder brief 2026-10-19, "a unified telemetry and
--                    continuous improvement layer" (answers: 1a safety
--                    analytics as group totals only; 2a batched sending and
--                    an event catalogue table; data kept 6 months; 4 nothing
--                    health-related before Article 9 consent, failure and
--                    performance events allowed). Parts:
--                     1. telemetry_event_catalogue: every allowed event with
--                        its area, signal, plain-English description, the
--                        fields its payload may carry and whether it may be
--                        sent before consent. Replaces the hard-coded list:
--                        a new event is one row. Seeded from migrate_193's
--                        list plus the 35 growth events (schema.js).
--                     2. record_engine_telemetry re-issued to read the
--                        catalogue, with a 4 KB payload cap and no future
--                        timestamps.
--                     3. record_engine_telemetry_batch: up to 200 events in
--                        one call; unknown names are returned as rejected
--                        indexes, never fail the batch.
--                     4. app_releases: what changed in each version, for
--                        before-and-after analysis.
--                     5. Six-month retention: a daily pg_cron purge.
--                     6. Analysis views and telemetry_weekly_digest(), all
--                        service-role only (no anon or authenticated read).
--                    Payloads are categories, buckets, booleans, small
--                    integers and route names only (client schema.js;
--                    pinned by src/lib/telemetry/__tests__/schema.test.js).
--                    The safety view joins existing ed_pattern_flags rows
--                    and shows a group only at 10 or more people; no new
--                    event carries calm mode or a flag.
--
-- Applied locally:   no (cloud-only objects)
-- Applied remotely:  NO. Founder runs it: "run against production 200".
--                    Until then the client sends one event at a time as
--                    before and the old function refuses the new names,
--                    which stay queued on the device and go once this lands.
-- Safe to re-run:    yes (IF NOT EXISTS, CREATE OR REPLACE, ON CONFLICT DO
--                    UPDATE for catalogue rows, cron unscheduled by name
--                    before scheduling).
-- Rollback:          DROP FUNCTION record_engine_telemetry_batch(jsonb),
--                    telemetry_weekly_digest(); DROP VIEW the v_* views below;
--                    DROP TABLE telemetry_event_catalogue, app_releases;
--                    SELECT cron.unschedule('engine-telemetry-purge');
--                    re-run migrate_193's record_engine_telemetry.
-- Depends on:        017 (engine_telemetry, ed_pattern_flags), 193.

-- ─── Part 1: the event catalogue ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telemetry_event_catalogue (
  name         text PRIMARY KEY CHECK (name ~ '^[a-z][a-z0-9_]{1,63}$'),
  area         text NOT NULL,
  signal       text NOT NULL CHECK (signal IN ('legacy', 'progression', 'friction', 'retention', 'performance', 'confusion', 'exposure')),
  description  text NOT NULL,
  fields       jsonb NOT NULL DEFAULT '{}'::jsonb,
  pre_consent  boolean NOT NULL DEFAULT false,
  added_in     text NOT NULL
);
ALTER TABLE public.telemetry_event_catalogue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telemetry_event_catalogue FROM anon, authenticated;
GRANT SELECT ON public.telemetry_event_catalogue TO service_role;

INSERT INTO public.telemetry_event_catalogue (name, area, signal, description, fields, pre_consent, added_in) VALUES
  ('ed_pattern_flag_fired', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('ed_pattern_flag_cleared', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('goal_lock_set', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('goal_lock_cleared', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('tier_changed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('cascade_started', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('cascade_advanced', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('cascade_skipped_ahead', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('paid_converted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('churn_at_gate', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('food_lookup_barcode', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('ocr_writeback_attempted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('rapid_loss_compression_triggered', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('weekly_coach_run', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('ffm_floor_hold_fired', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('food_logged', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('food_search_attempt', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('paywall_shown', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('paywall_tapped_cta', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('sign_in', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('sign_out', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('article9_consent_recorded', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('account_created', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('custom_food_created', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('app_cold_start', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('app_foregrounded', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('app_backgrounded', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('sync_run', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('cascade_state_transition', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('purchase_initiated', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('purchase_completed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('purchase_failed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('subscription_cancelled', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('restore_purchases_attempted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('notification_sent', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('notification_tapped', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('notification_failed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('article9_consent_withdrawn', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, true, 'before 3.1'),
  ('sync_conflict_resolved', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('workout_started', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('workout_completed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('plan_activated', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('session_adjustment_shown', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('session_adjustment_reverted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('methodology_opened', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('recap_opened', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_session_choice', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('chart_window_changed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('streak_week_resolved', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('streak_milestone_reached', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('streak_paused', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('cancel_reason_captured', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('step_tdee_modifier_evaluated', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_invite_sent', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_invite_accepted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_cheer_sent', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_blocked', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_block_proposed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_block_adopted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_block_left', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('watch_session_attached', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('watch_set_logged', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('watch_apply_duplicate_dropped', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('watch_replay_recovered', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('meal_plan_assembled', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('food_promote_failed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('ocr_low_confidence_saved', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('food_sanity_check_failed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('tonnage_milestone_reached', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('perfect_month_reached', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('longest_run_pb_reached', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('onboarding_step_completed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_plan_generated', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_workout_logged', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_food_logged', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('trial_lapse_day1_return', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_surface_view', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_invite_journey_step', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_invite_minted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_invite_redeemed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_invite_died_at_paywall', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_cheer', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_unpair', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('partner_pair_week_active', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('feature_locked_viewed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('photo_prompt_shown', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('photo_prompt_accepted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_workout_started', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_weigh_in', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('checkin_started', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_checkin_completed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('coach_result_viewed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('coach_recommendation_accepted', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('coach_recommendation_declined', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('notification_permission_requested', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('setup_started', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('first_home_landed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('plan_preview_shown', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('plan_preview_confirmed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('plan_preview_dismissed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('block_decision', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('library_plan_previewed', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('manual_plan_started', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('manual_plan_saved', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('plan_replaced', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('structure_refused', 'legacy', 'legacy', 'Recorded before the growth catalogue; see src/lib/telemetry/events.js for its fields.', '{}'::jsonb, false, 'before 3.1'),
  ('screen_viewed', 'app', 'progression', 'A screen opened, with the screen before it and how long the person stayed there.', '{"screen":{"type":"route"},"from_screen":{"type":"route"},"prev_dwell":{"type":"bucket","kind":"dwell"}}'::jsonb, true, '3.2'),
  ('session_ended', 'app', 'retention', 'The app went to the background: how long the visit lasted, how many screens, how many errors were shown, and what was achieved.', '{"duration":{"type":"bucket","kind":"minutes"},"screens":{"type":"bucket","kind":"count"},"errors":{"type":"bucket","kind":"count"},"did_workout":{"type":"bool"},"did_food":{"type":"bool"},"did_checkin":{"type":"bool"}}'::jsonb, true, '3.2'),
  ('screen_ready', 'performance', 'performance', 'How long a key screen took to show its content.', '{"screen":{"type":"route"},"ms":{"type":"bucket","kind":"ms"}}'::jsonb, true, '3.2'),
  ('error_shown', 'app', 'friction', 'The person saw a failure: an error message, an alert or an error screen.', '{"screen":{"type":"route"},"kind":{"type":"enum","values":["toast","alert","error_view"]}}'::jsonb, true, '3.2'),
  ('setup_stage_stalled', 'performance', 'performance', 'A setup or start-up stage took far longer than it should (report only).', '{"stage":{"type":"enum","values":["fit","fit_full","reminder_prefs","build","notification_permission","reminder_lay","boot_splash","boot_first_run","boot_tier","boot_auth","boot_consent","other"]}}'::jsonb, true, '3.2'),
  ('onboarding_path_chosen', 'onboarding', 'progression', 'After consent, the person chose full coaching setup or a quick start (and, for a quick start, a ready-made plan or their own).', '{"path":{"type":"enum","values":["coaching","quick_start"]},"plan_source":{"type":"enum","values":["library","builder","none"]}}'::jsonb, false, '3.2'),
  ('onboarding_step_viewed', 'onboarding', 'progression', 'A setup step was shown.', '{"step":{"type":"int","min":1,"max":8},"mode":{"type":"enum","values":["full","coaching_setup"]}}'::jsonb, false, '3.2'),
  ('onboarding_validation_blocked', 'onboarding', 'friction', 'Continue was tapped with a required answer missing.', '{"step":{"type":"int","min":1,"max":8},"field":{"type":"enum","values":["sex","age","height","weight","phase","archetype","experience","session_length","days","equipment","plan_choice","other"]},"mode":{"type":"enum","values":["full","coaching_setup"]}}'::jsonb, false, '3.2'),
  ('onboarding_completed', 'onboarding', 'progression', 'Setup finished.', '{"path":{"type":"enum","values":["coaching","quick_start"]},"mode":{"type":"enum","values":["full","coaching_setup"]},"duration":{"type":"bucket","kind":"minutes"}}'::jsonb, false, '3.2'),
  ('coaching_setup_card_shown', 'onboarding', 'retention', 'A "Set up coaching" card was shown to a quick-start person (once a day per surface).', '{"surface":{"type":"enum","values":["nutrition","meal_plan","targets","checkin","coach_output","coach_home","home","goal_setup","challenge","unknown"]}}'::jsonb, false, '3.2'),
  ('coaching_setup_started', 'onboarding', 'progression', 'A quick-start person opened coaching setup.', '{"entry":{"type":"enum","values":["nutrition","meal_plan","targets","checkin","coach_output","coach_home","home","goal_setup","challenge","unknown"]}}'::jsonb, false, '3.2'),
  ('coaching_setup_finished', 'onboarding', 'progression', 'Coaching setup finished: kept the plan or rebuilt it, and how a rebuild ended.', '{"plan_choice":{"type":"enum","values":["keep","rebuild"]},"rebuild_outcome":{"type":"enum","values":["built","declined","failed","none"]}}'::jsonb, false, '3.2'),
  ('archetype_chosen', 'plan', 'progression', 'A training style was chosen.', '{"archetype":{"type":"enum","values":["balanced","v_taper","x_frame","upper_density","powerbuilder","minimalist"]},"surface":{"type":"enum","values":["onboarding","plan_update","goal_setup"]}}'::jsonb, false, '3.2'),
  ('workout_discarded', 'workout', 'friction', 'A started workout was thrown away.', '{"sets":{"type":"bucket","kind":"count"},"duration":{"type":"bucket","kind":"minutes"}}'::jsonb, false, '3.2'),
  ('workout_abandoned', 'workout', 'friction', 'A workout was left open and found unfinished at a later launch.', '{"age":{"type":"bucket","kind":"age"},"sets":{"type":"bucket","kind":"count"}}'::jsonb, false, '3.2'),
  ('exercise_swapped', 'workout', 'friction', 'An exercise was swapped during a workout.', '{"scope":{"type":"enum","values":["session","programme"]},"cause":{"type":"enum","values":["constraint","style","choice"]}}'::jsonb, false, '3.2'),
  ('workout_session_summary', 'workout', 'progression', 'A finished workout, as counts of what happened in it.', '{"edits":{"type":"bucket","kind":"count"},"swaps":{"type":"bucket","kind":"count"},"rest_timer_uses":{"type":"bucket","kind":"count"},"warmups_added":{"type":"bucket","kind":"count"},"discarded_sets":{"type":"bucket","kind":"count"}}'::jsonb, false, '3.2'),
  ('food_search_empty', 'food', 'friction', 'A food search found nothing.', '{"query_length":{"type":"bucket","kind":"count"}}'::jsonb, false, '3.2'),
  ('food_scan_result', 'food', 'progression', 'A barcode or label scan ended.', '{"method":{"type":"enum","values":["barcode","label"]},"outcome":{"type":"enum","values":["found","not_found","cancelled","saved_custom","error"]}}'::jsonb, false, '3.2'),
  ('planned_meal_confirmed', 'food', 'progression', 'Planned food was confirmed as eaten.', '{"scope":{"type":"enum","values":["meal","day"]},"items":{"type":"bucket","kind":"count"}}'::jsonb, false, '3.2'),
  ('diary_entries_moved', 'food', 'progression', 'Diary entries were copied or moved.', '{"action":{"type":"enum","values":["copy","move"]},"items":{"type":"bucket","kind":"count"}}'::jsonb, false, '3.2'),
  ('food_plate_logged', 'food', 'progression', 'Several foods were logged in one go from search.', '{"items":{"type":"bucket","kind":"count"}}'::jsonb, false, '3.2'),
  ('plan_generation_finished', 'plan', 'progression', 'A plan build finished: built, refused by the rules, or failed, and how long it took.', '{"outcome":{"type":"enum","values":["ok","refused","failed"]},"ms":{"type":"bucket","kind":"ms"},"trigger":{"type":"enum","values":["onboarding","coaching_setup","rebuild","start_with_plan","other"]}}'::jsonb, false, '3.2'),
  ('checkin_completed', 'coach', 'progression', 'A weekly check-in was submitted.', '{"first":{"type":"bool"},"duration":{"type":"bucket","kind":"minutes"}}'::jsonb, false, '3.2'),
  ('checkin_abandoned', 'coach', 'friction', 'A weekly check-in was left before submitting.', '{"step_reached":{"type":"int","min":0,"max":12}}'::jsonb, false, '3.2'),
  ('coach_recommendation_held', 'coach', 'progression', 'A coach recommendation was held (kept as it was).', '{"kind":{"type":"enum","values":["calories","training","deload","diet_break","other"]}}'::jsonb, false, '3.2'),
  ('coach_recommendation_dismissed', 'coach', 'progression', 'A coach recommendation of any kind was declined.', '{"kind":{"type":"enum","values":["calories","training","deload","diet_break","other"]}}'::jsonb, false, '3.2'),
  ('share_attempted', 'community', 'retention', 'The person started sharing something.', '{"surface":{"type":"enum","values":["workout","week","pr","clip","progress","other"]},"audience":{"type":"enum","values":["followers","public","gym","external","none"]}}'::jsonb, false, '3.2'),
  ('share_completed', 'community', 'retention', 'A share went out.', '{"surface":{"type":"enum","values":["workout","week","pr","clip","progress","other"]},"audience":{"type":"enum","values":["followers","public","gym","external","none"]}}'::jsonb, false, '3.2'),
  ('challenge_join_viewed', 'challenge', 'exposure', 'The gym challenge join screen showed a challenge.', '{"source":{"type":"enum","values":["link","gym_invite","code"]},"status":{"type":"enum","values":["upcoming","active","ended","closed"]}}'::jsonb, false, '3.2'),
  ('challenge_joined', 'challenge', 'progression', 'A person joined a gym challenge.', '{"source":{"type":"enum","values":["link","gym_invite","code"]},"coaching":{"type":"bool"}}'::jsonb, false, '3.2'),
  ('challenge_viewed', 'challenge', 'retention', 'An entrant opened their gym challenge.', '{"status":{"type":"enum","values":["upcoming","active","ended","closed"]},"tier":{"type":"enum","values":["main","second","none"]}}'::jsonb, false, '3.2'),
  ('challenge_withdrawn', 'challenge', 'retention', 'An entrant left a gym challenge.', '{}'::jsonb, false, '3.2'),
  ('help_opened', 'app', 'confusion', 'An explanation (info tooltip or help) was opened.', '{"topic":{"type":"code"},"screen":{"type":"route"}}'::jsonb, false, '3.2'),
  ('feature_seen', 'app', 'exposure', 'A new feature was seen for the first time.', '{"feature":{"type":"enum","values":["start_choice","archetype_cards","warmup_chip","shopping_list_days","raw_cooked_toggle","coaching_setup_card","declined_today_card"]}}'::jsonb, false, '3.2'),
  ('experiment_exposed', 'app', 'exposure', 'The person was placed in one arm of an A/B test (once per test).', '{"experiment":{"type":"code"},"variant":{"type":"enum","values":["a","b","c","d"]}}'::jsonb, false, '3.2'),
  ('exit_reason_given', 'app', 'retention', 'An optional one-tap reason at a moment of leaving.', '{"moment":{"type":"enum","values":["workout_discard","setup_leave","reminders_off"]},"reason":{"type":"enum","values":["no_time","felt_off","app_problem","just_browsing","too_many_questions","not_ready","too_many_reminders","not_useful","other"]}}'::jsonb, false, '3.2'),
  ('reminders_turned_off', 'app', 'retention', 'A reminder category was switched off.', '{"category":{"type":"enum","values":["checkin","weigh_in","training","meals","community","all","other"]}}'::jsonb, false, '3.2'),
  ('notification_permission_result', 'app', 'retention', 'The answer to the system notification prompt.', '{"outcome":{"type":"enum","values":["granted","denied","blocked"]}}'::jsonb, false, '3.2')ON CONFLICT (name) DO UPDATE SET
  area = EXCLUDED.area, signal = EXCLUDED.signal, description = EXCLUDED.description,
  fields = EXCLUDED.fields, pre_consent = EXCLUDED.pre_consent;

-- ─── Part 2: the single-event function reads the catalogue ─────────────
CREATE OR REPLACE FUNCTION public.record_engine_telemetry(
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
  IF NOT EXISTS (SELECT 1 FROM public.telemetry_event_catalogue c WHERE c.name = _event) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;
  IF _payload IS NOT NULL AND octet_length(_payload::text) > 4096 THEN
    RAISE EXCEPTION 'Engine telemetry payload too large';
  END IF;
  INSERT INTO public.engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, LEAST(COALESCE(_occurred_at, now()), now()))
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;

-- ─── Part 3: the batch function ─────────────────────────────────────────
-- _events: [{ "event": text, "payload": jsonb|null, "occurred_at": iso }].
-- Returns { "inserted": n, "rejected": [index, ...] }. A row the catalogue
-- does not know (a newer build's name), an oversized payload or a malformed
-- row is rejected by index; the device keeps it queued.
CREATE OR REPLACE FUNCTION public.record_engine_telemetry_batch(_events jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  item jsonb;
  idx int := 0;
  ev text;
  pl jsonb;
  at timestamptz;
  inserted int := 0;
  rejected int[] := ARRAY[]::int[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _events IS NULL OR jsonb_typeof(_events) <> 'array' THEN
    RAISE EXCEPTION 'Engine telemetry batch must be an array';
  END IF;
  IF jsonb_array_length(_events) > 200 THEN
    RAISE EXCEPTION 'Engine telemetry batch too large';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(_events) LOOP
    BEGIN
      ev := item->>'event';
      pl := CASE WHEN jsonb_typeof(item->'payload') = 'object' THEN item->'payload' ELSE NULL END;
      at := LEAST(COALESCE((item->>'occurred_at')::timestamptz, now()), now());
      IF ev IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.telemetry_event_catalogue c WHERE c.name = ev)
        OR (pl IS NOT NULL AND octet_length(pl::text) > 4096) THEN
        rejected := rejected || idx;
      ELSE
        INSERT INTO public.engine_telemetry (user_id, event, payload_json, occurred_at)
        VALUES (uid, ev, pl, at);
        inserted := inserted + 1;
      END IF;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN
      rejected := rejected || idx;
    END;
    idx := idx + 1;
  END LOOP;
  RETURN jsonb_build_object('inserted', inserted, 'rejected', to_jsonb(rejected));
END $$;
REVOKE ALL ON FUNCTION public.record_engine_telemetry_batch(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_engine_telemetry_batch(jsonb) TO authenticated;

-- ─── Part 4: release notes, for before-and-after analysis ──────────────
CREATE TABLE IF NOT EXISTS public.app_releases (
  version      text PRIMARY KEY,
  released_on  date NOT NULL,
  notes        text NOT NULL DEFAULT ''
);
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_releases FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_releases TO service_role;
INSERT INTO public.app_releases (version, released_on, notes) VALUES
  ('3.1.0', DATE '2026-10-18', 'Android setup fix: setup no longer waits on reminders or food import.'),
  ('3.2.0', DATE '2026-10-19', 'Coaching-first onboarding with quick start; physique archetypes; warm-up chip; raw/cooked weights and shopping list days; kitchen rounding; growth telemetry.')
ON CONFLICT (version) DO NOTHING;

-- ─── Part 5: six months of events, then gone ───────────────────────────
CREATE OR REPLACE FUNCTION public.purge_engine_telemetry()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH gone AS (
    DELETE FROM public.engine_telemetry WHERE occurred_at < now() - interval '6 months' RETURNING 1
  )
  SELECT count(*)::int FROM gone;
$$;
REVOKE ALL ON FUNCTION public.purge_engine_telemetry() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL OR to_regprocedure('cron.schedule(text, text, text)') IS NULL THEN
    RAISE NOTICE 'pg_cron is not installed: run SELECT public.purge_engine_telemetry() on a schedule by hand.';
    RETURN;
  END IF;
  PERFORM cron.unschedule(j.jobid) FROM cron.job j WHERE j.jobname = 'engine-telemetry-purge';
  PERFORM cron.schedule('engine-telemetry-purge', '17 3 * * *', 'SELECT public.purge_engine_telemetry()');
END $$;

-- ─── Part 6: analysis views (service role only) ────────────────────────
-- Each view answers one question, has a date column and a few category
-- columns, and reads only engine_telemetry (plus app_releases and, for the
-- safety view, ed_pattern_flags in group totals). "Active" means any of the
-- app's own visit events that day.

CREATE OR REPLACE VIEW public.v_user_activity_days AS
SELECT DISTINCT user_id, (occurred_at AT TIME ZONE 'Europe/London')::date AS day
FROM public.engine_telemetry
WHERE event IN ('app_cold_start', 'app_foregrounded', 'screen_viewed', 'session_ended', 'workout_completed', 'food_logged');

CREATE OR REPLACE VIEW public.v_user_signups AS
SELECT user_id,
       min(occurred_at) FILTER (WHERE event = 'account_created') AS account_created_at,
       min(occurred_at) AS first_seen_at,
       COALESCE(min(occurred_at) FILTER (WHERE event = 'account_created'), min(occurred_at)) AS signed_up_at
FROM public.engine_telemetry
GROUP BY user_id;

CREATE OR REPLACE VIEW public.v_user_paths AS
SELECT DISTINCT ON (user_id) user_id,
       payload_json->>'path' AS path,
       payload_json->>'plan_source' AS plan_source,
       occurred_at AS chosen_at
FROM public.engine_telemetry
WHERE event = 'onboarding_path_chosen'
ORDER BY user_id, occurred_at;

-- Where do people stop in setup? One row per week, mode, step.
CREATE OR REPLACE VIEW public.v_onboarding_funnel AS
WITH steps AS (
  SELECT e.user_id,
         date_trunc('week', e.occurred_at)::date AS week,
         COALESCE(e.payload_json->>'mode', 'full') AS mode,
         (e.payload_json->>'step')::int AS step,
         e.event
  FROM public.engine_telemetry e
  WHERE e.event IN ('onboarding_step_viewed', 'onboarding_step_completed')
    AND (e.payload_json->>'step') ~ '^[0-9]+$'
)
SELECT s.week, s.mode, COALESCE(p.path, 'coaching') AS path, s.step,
       count(DISTINCT s.user_id) FILTER (WHERE s.event = 'onboarding_step_viewed') AS users_reached,
       count(DISTINCT s.user_id) FILTER (WHERE s.event = 'onboarding_step_completed') AS users_completed,
       round(100.0 * (1 - count(DISTINCT s.user_id) FILTER (WHERE s.event = 'onboarding_step_completed')::numeric
         / NULLIF(count(DISTINCT s.user_id) FILTER (WHERE s.event = 'onboarding_step_viewed'), 0)), 1) AS drop_pct
FROM steps s
LEFT JOIN public.v_user_paths p ON p.user_id = s.user_id
GROUP BY s.week, s.mode, COALESCE(p.path, 'coaching'), s.step;

-- Which start leads to training and coming back?
CREATE OR REPLACE VIEW public.v_activation_by_path AS
WITH base AS (
  SELECT u.user_id, u.signed_up_at,
         COALESCE(p.path, 'coaching') AS path, COALESCE(p.plan_source, 'none') AS plan_source
  FROM public.v_user_signups u
  LEFT JOIN public.v_user_paths p ON p.user_id = u.user_id
),
flags AS (
  SELECT b.*,
    EXISTS (SELECT 1 FROM public.engine_telemetry w WHERE w.user_id = b.user_id AND w.event = 'workout_completed'
            AND w.occurred_at < b.signed_up_at + interval '7 days') AS workout_7d,
    EXISTS (SELECT 1 FROM public.engine_telemetry w WHERE w.user_id = b.user_id AND w.event = 'coaching_setup_finished') AS set_up_coaching_later,
    (SELECT max(a.day) FROM public.v_user_activity_days a WHERE a.user_id = b.user_id) AS last_day
  FROM base b
)
SELECT date_trunc('week', signed_up_at)::date AS signup_week, path, plan_source,
       count(*) AS users,
       round(100.0 * avg(workout_7d::int), 1) AS first_workout_within_7d_pct,
       round(100.0 * avg(set_up_coaching_later::int) FILTER (WHERE path = 'quick_start'), 1) AS quick_start_later_set_up_pct,
       round(100.0 * avg((last_day >= (signed_up_at + interval '1 day')::date)::int) FILTER (WHERE signed_up_at < now() - interval '1 day'), 1) AS active_after_day_1_pct,
       round(100.0 * avg((last_day >= (signed_up_at + interval '7 days')::date)::int) FILTER (WHERE signed_up_at < now() - interval '7 days'), 1) AS active_after_day_7_pct,
       round(100.0 * avg((last_day >= (signed_up_at + interval '14 days')::date)::int) FILTER (WHERE signed_up_at < now() - interval '14 days'), 1) AS active_after_day_14_pct,
       round(100.0 * avg((last_day >= (signed_up_at + interval '30 days')::date)::int) FILTER (WHERE signed_up_at < now() - interval '30 days'), 1) AS active_after_day_30_pct
FROM flags
GROUP BY 1, 2, 3;

-- Weekly cohorts: of people who signed up in a week, how many were active
-- N weeks later.
CREATE OR REPLACE VIEW public.v_retention_cohorts AS
WITH cohort AS (
  SELECT user_id, date_trunc('week', signed_up_at)::date AS cohort_week FROM public.v_user_signups
),
weeks AS (
  SELECT c.cohort_week, c.user_id, ((a.day - c.cohort_week) / 7) AS week_number
  FROM cohort c JOIN public.v_user_activity_days a ON a.user_id = c.user_id
  WHERE a.day >= c.cohort_week
)
SELECT w.cohort_week, w.week_number,
       (SELECT count(*) FROM cohort c2 WHERE c2.cohort_week = w.cohort_week) AS cohort_size,
       count(DISTINCT w.user_id) AS active_users,
       round(100.0 * count(DISTINCT w.user_id) / NULLIF((SELECT count(*) FROM cohort c2 WHERE c2.cohort_week = w.cohort_week), 0), 1) AS active_pct
FROM weeks w
WHERE w.week_number BETWEEN 0 AND 26
GROUP BY w.cohort_week, w.week_number;

-- Which friction in someone's first week goes with them not coming back?
-- Return = active on any day from day 7 to day 13 after sign-up.
CREATE OR REPLACE VIEW public.v_friction_vs_return AS
WITH eligible AS (
  SELECT user_id, signed_up_at FROM public.v_user_signups WHERE signed_up_at < now() - interval '14 days'
),
ret AS (
  SELECT e.user_id,
    EXISTS (SELECT 1 FROM public.v_user_activity_days a WHERE a.user_id = e.user_id
            AND a.day BETWEEN (e.signed_up_at + interval '7 days')::date AND (e.signed_up_at + interval '13 days')::date) AS returned
  FROM eligible e
),
friction AS (
  SELECT DISTINCT t.user_id, t.event AS friction_event
  FROM public.engine_telemetry t
  JOIN eligible e ON e.user_id = t.user_id
  JOIN public.telemetry_event_catalogue c ON c.name = t.event AND c.signal IN ('friction', 'confusion')
  WHERE t.occurred_at < e.signed_up_at + interval '7 days'
),
kinds AS (SELECT DISTINCT friction_event FROM friction)
SELECT k.friction_event,
       count(*) FILTER (WHERE f.user_id IS NOT NULL) AS users_hit,
       round(100.0 * avg(r.returned::int) FILTER (WHERE f.user_id IS NOT NULL), 1) AS return_pct_hit,
       count(*) FILTER (WHERE f.user_id IS NULL) AS users_not_hit,
       round(100.0 * avg(r.returned::int) FILTER (WHERE f.user_id IS NULL), 1) AS return_pct_not_hit,
       round(100.0 * avg(r.returned::int) FILTER (WHERE f.user_id IS NOT NULL)
             - 100.0 * avg(r.returned::int) FILTER (WHERE f.user_id IS NULL), 1) AS return_gap_pct
FROM kinds k
CROSS JOIN ret r
LEFT JOIN friction f ON f.user_id = r.user_id AND f.friction_event = k.friction_event
GROUP BY k.friction_event;

-- The core loops, week by week.
CREATE OR REPLACE VIEW public.v_core_loops_weekly AS
SELECT date_trunc('week', occurred_at)::date AS week,
       count(DISTINCT user_id) AS users_with_events,
       count(*) FILTER (WHERE event = 'workout_started') AS workouts_started,
       count(*) FILTER (WHERE event = 'workout_completed') AS workouts_completed,
       count(*) FILTER (WHERE event = 'workout_discarded') AS workouts_discarded,
       count(*) FILTER (WHERE event = 'workout_abandoned') AS workouts_abandoned,
       count(*) FILTER (WHERE event = 'food_logged') AS foods_logged,
       count(*) FILTER (WHERE event = 'food_search_empty') AS food_searches_empty,
       count(*) FILTER (WHERE event = 'checkin_started') AS checkins_started,
       count(*) FILTER (WHERE event = 'checkin_completed') AS checkins_completed,
       count(*) FILTER (WHERE event = 'checkin_abandoned') AS checkins_abandoned,
       count(*) FILTER (WHERE event = 'coach_recommendation_accepted') AS coach_accepted,
       count(*) FILTER (WHERE event IN ('coach_recommendation_declined', 'coach_recommendation_dismissed')) AS coach_declined,
       count(*) FILTER (WHERE event = 'coach_recommendation_held') AS coach_held,
       count(*) FILTER (WHERE event = 'error_shown') AS errors_shown,
       count(*) FILTER (WHERE event = 'share_completed') AS shares
FROM public.engine_telemetry
GROUP BY 1;

-- How fast is the app, by version and platform? Buckets are ordered, so
-- the median and the slowest-tenth bucket are read from their positions.
CREATE OR REPLACE VIEW public.v_performance_by_version AS
WITH ord(bucket, pos) AS (
  VALUES ('<250ms', 1), ('250-500ms', 2), ('500ms-1s', 3), ('1-2s', 4), ('2-5s', 5), ('5-10s', 6), ('10s+', 7)
),
samples AS (
  SELECT COALESCE(e.payload_json->>'app_version', 'unknown') AS app_version,
         COALESCE(e.payload_json->>'platform', 'unknown') AS platform,
         CASE WHEN e.event = 'screen_ready' THEN 'screen:' || COALESCE(e.payload_json->>'screen', 'unknown')
              ELSE e.event END AS measure,
         e.payload_json->>'ms' AS bucket
  FROM public.engine_telemetry e
  WHERE e.event IN ('screen_ready', 'plan_generation_finished')
)
SELECT s.app_version, s.platform, s.measure, count(*) AS samples,
       (SELECT o2.bucket FROM ord o2 WHERE o2.pos = percentile_disc(0.5) WITHIN GROUP (ORDER BY o.pos)) AS median_bucket,
       (SELECT o2.bucket FROM ord o2 WHERE o2.pos = percentile_disc(0.9) WITHIN GROUP (ORDER BY o.pos)) AS slowest_tenth_bucket,
       round(100.0 * avg((o.pos >= 4)::int), 1) AS over_1s_pct
FROM samples s JOIN ord o ON o.bucket = s.bucket
GROUP BY s.app_version, s.platform, s.measure;

-- Each person's engagement status (lists people: service role only; the
-- source for targeted surveys through member email, whose own opt-out and
-- ED-flag exclusion still apply).
CREATE OR REPLACE VIEW public.v_engagement_status AS
WITH last AS (
  SELECT user_id, max(day) AS last_active_day FROM public.v_user_activity_days GROUP BY user_id
)
SELECT u.user_id, u.signed_up_at, l.last_active_day,
       (current_date - l.last_active_day) AS days_since_active,
       CASE
         WHEN u.signed_up_at > now() - interval '7 days' THEN 'new'
         WHEN current_date - l.last_active_day <= 6 THEN 'active'
         WHEN current_date - l.last_active_day <= 13 THEN 'slipping'
         ELSE 'lapsed'
       END AS status,
       COALESCE(p.path, 'coaching') AS path,
       (SELECT count(*) FROM public.engine_telemetry w WHERE w.user_id = u.user_id AND w.event = 'workout_completed'
          AND w.occurred_at > now() - interval '30 days') AS workouts_30d,
       (SELECT count(*) FROM public.engine_telemetry w WHERE w.user_id = u.user_id AND w.event = 'checkin_completed'
          AND w.occurred_at > now() - interval '30 days') AS checkins_30d
FROM public.v_user_signups u
LEFT JOIN last l ON l.user_id = u.user_id
LEFT JOIN public.v_user_paths p ON p.user_id = u.user_id;

-- The last visit of everyone who has gone quiet for 14 days or more.
CREATE OR REPLACE VIEW public.v_last_session_before_lapse AS
WITH lapsed AS (
  SELECT user_id, last_active_day FROM public.v_engagement_status WHERE status = 'lapsed'
),
last_visit AS (
  SELECT DISTINCT ON (e.user_id) e.user_id, e.occurred_at, e.payload_json
  FROM public.engine_telemetry e JOIN lapsed l ON l.user_id = e.user_id
  WHERE e.event = 'session_ended'
  ORDER BY e.user_id, e.occurred_at DESC
),
last_screen AS (
  SELECT DISTINCT ON (e.user_id) e.user_id, e.payload_json->>'screen' AS last_screen
  FROM public.engine_telemetry e JOIN lapsed l ON l.user_id = e.user_id
  WHERE e.event = 'screen_viewed'
  ORDER BY e.user_id, e.occurred_at DESC
),
last_activity AS (
  SELECT e.user_id, max(e.occurred_at) AS last_at FROM public.engine_telemetry e JOIN lapsed l ON l.user_id = e.user_id GROUP BY e.user_id
)
SELECT l.user_id, l.last_active_day, s.last_screen,
       v.payload_json->>'duration' AS last_visit_duration,
       v.payload_json->>'screens' AS last_visit_screens,
       v.payload_json->>'errors' AS last_visit_errors,
       (v.payload_json->>'did_workout')::boolean AS last_visit_did_workout,
       (v.payload_json->>'did_food')::boolean AS last_visit_did_food,
       ARRAY(SELECT DISTINCT f.event FROM public.engine_telemetry f
             JOIN public.telemetry_event_catalogue c ON c.name = f.event AND c.signal IN ('friction', 'confusion')
             WHERE f.user_id = l.user_id AND f.occurred_at > a.last_at - interval '24 hours') AS friction_in_last_day
FROM lapsed l
LEFT JOIN last_visit v ON v.user_id = l.user_id
LEFT JOIN last_screen s ON s.user_id = l.user_id
LEFT JOIN last_activity a ON a.user_id = l.user_id;

-- The screens people were on when they left for good, against the screens
-- people who stayed last saw.
CREATE OR REPLACE VIEW public.v_lapse_last_screens AS
WITH last_screen AS (
  SELECT DISTINCT ON (e.user_id) e.user_id, e.payload_json->>'screen' AS screen
  FROM public.engine_telemetry e WHERE e.event = 'screen_viewed'
  ORDER BY e.user_id, e.occurred_at DESC
)
SELECT ls.screen AS last_screen,
       count(*) FILTER (WHERE es.status = 'lapsed') AS lapsed_users,
       round(100.0 * count(*) FILTER (WHERE es.status = 'lapsed') / NULLIF(sum(count(*) FILTER (WHERE es.status = 'lapsed')) OVER (), 0), 1) AS lapsed_share_pct,
       count(*) FILTER (WHERE es.status = 'active') AS active_users,
       round(100.0 * count(*) FILTER (WHERE es.status = 'active') / NULLIF(sum(count(*) FILTER (WHERE es.status = 'active')) OVER (), 0), 1) AS active_share_pct
FROM last_screen ls JOIN public.v_engagement_status es ON es.user_id = ls.user_id
GROUP BY ls.screen;

-- Every visit as one row.
CREATE OR REPLACE VIEW public.v_session_summary AS
SELECT date_trunc('week', occurred_at)::date AS week,
       COALESCE(payload_json->>'app_version', 'unknown') AS app_version,
       payload_json->>'duration' AS duration,
       payload_json->>'screens' AS screens,
       payload_json->>'errors' AS errors,
       count(*) AS visits,
       round(100.0 * avg(((payload_json->>'did_workout')::boolean)::int), 1) AS with_workout_pct,
       round(100.0 * avg(((payload_json->>'did_food')::boolean)::int), 1) AS with_food_pct,
       round(100.0 * avg(((payload_json->>'did_checkin')::boolean)::int), 1) AS with_checkin_pct
FROM public.engine_telemetry
WHERE event = 'session_ended'
GROUP BY 1, 2, 3, 4, 5;

-- What confuses people: explanations opened, by topic and screen.
CREATE OR REPLACE VIEW public.v_confusion_topics AS
SELECT date_trunc('week', occurred_at)::date AS week,
       payload_json->>'topic' AS topic, payload_json->>'screen' AS screen,
       count(*) AS opens, count(DISTINCT user_id) AS users
FROM public.engine_telemetry WHERE event = 'help_opened'
GROUP BY 1, 2, 3;

-- Why people stopped, in their own one-tap words.
CREATE OR REPLACE VIEW public.v_exit_reasons AS
SELECT date_trunc('week', occurred_at)::date AS week,
       payload_json->>'moment' AS moment, payload_json->>'reason' AS reason,
       count(*) AS answers, count(DISTINCT user_id) AS users
FROM public.engine_telemetry WHERE event = 'exit_reason_given'
GROUP BY 1, 2, 3;

-- Did a feature change behaviour? Workouts in the 14 days before and after
-- each person first saw it.
CREATE OR REPLACE VIEW public.v_feature_exposure_effect AS
WITH seen AS (
  SELECT user_id, payload_json->>'feature' AS feature, min(occurred_at) AS seen_at
  FROM public.engine_telemetry WHERE event = 'feature_seen' GROUP BY 1, 2
)
SELECT s.feature, count(*) AS users_seen, min(s.seen_at)::date AS first_seen,
       round(avg((SELECT count(*) FROM public.engine_telemetry w WHERE w.user_id = s.user_id AND w.event = 'workout_completed'
          AND w.occurred_at BETWEEN s.seen_at - interval '14 days' AND s.seen_at)), 2) AS workouts_14d_before,
       round(avg((SELECT count(*) FROM public.engine_telemetry w WHERE w.user_id = s.user_id AND w.event = 'workout_completed'
          AND w.occurred_at BETWEEN s.seen_at AND s.seen_at + interval '14 days')), 2) AS workouts_14d_after
FROM seen s
GROUP BY s.feature;

-- A/B tests: each arm's people, their 14-day return and workouts.
CREATE OR REPLACE VIEW public.v_experiment_results AS
WITH arms AS (
  SELECT DISTINCT ON (user_id, payload_json->>'experiment') user_id,
         payload_json->>'experiment' AS experiment, payload_json->>'variant' AS variant, occurred_at AS exposed_at
  FROM public.engine_telemetry WHERE event = 'experiment_exposed'
  ORDER BY user_id, payload_json->>'experiment', occurred_at
)
SELECT a.experiment, a.variant, count(*) AS users,
       round(100.0 * avg((EXISTS (SELECT 1 FROM public.v_user_activity_days d WHERE d.user_id = a.user_id
          AND d.day BETWEEN (a.exposed_at + interval '7 days')::date AND (a.exposed_at + interval '14 days')::date))::int), 1) AS active_day_7_to_14_pct,
       round(avg((SELECT count(*) FROM public.engine_telemetry w WHERE w.user_id = a.user_id AND w.event = 'workout_completed'
          AND w.occurred_at BETWEEN a.exposed_at AND a.exposed_at + interval '14 days')), 2) AS workouts_14d
FROM arms a
GROUP BY a.experiment, a.variant;

-- Before and after each release: per version, how people used the app.
CREATE OR REPLACE VIEW public.v_release_compare AS
WITH per AS (
  SELECT COALESCE(payload_json->>'app_version', 'unknown') AS app_version, user_id, event, occurred_at
  FROM public.engine_telemetry
)
SELECT p.app_version, r.released_on, r.notes,
       min(p.occurred_at)::date AS first_seen, count(DISTINCT p.user_id) AS users,
       count(*) FILTER (WHERE p.event = 'session_ended') AS visits,
       round(count(*) FILTER (WHERE p.event = 'workout_completed')::numeric / NULLIF(count(DISTINCT p.user_id), 0), 2) AS workouts_per_user,
       round(100.0 * count(*) FILTER (WHERE p.event = 'workout_discarded')
             / NULLIF(count(*) FILTER (WHERE p.event IN ('workout_completed', 'workout_discarded')), 0), 1) AS workout_discard_pct,
       round(count(*) FILTER (WHERE p.event = 'error_shown')::numeric / NULLIF(count(*) FILTER (WHERE p.event = 'session_ended'), 0), 3) AS errors_per_visit
FROM per p LEFT JOIN public.app_releases r ON r.version = p.app_version
GROUP BY p.app_version, r.released_on, r.notes;

-- Safety and activity, group totals only (founder answer 1a): people with
-- an open ED flag that week against everyone else, and only where a group
-- has 10 or more people; a smaller group shows no row at all.
CREATE OR REPLACE VIEW public.v_safety_activity_groups AS
WITH weeks AS (
  SELECT DISTINCT user_id, date_trunc('week', day)::date AS week FROM public.v_user_activity_days
),
grouped AS (
  SELECT w.week, w.user_id,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.ed_pattern_flags f
      WHERE f.user_id = w.user_id AND f.deleted_at IS NULL
        AND f.raised_at < w.week + interval '7 days'
        AND (f.cleared_at IS NULL OR f.cleared_at >= w.week)
    ) THEN 'flag_open' ELSE 'no_flag' END AS safety_group
  FROM weeks w
),
activity AS (
  SELECT g.week, g.safety_group, g.user_id,
    (SELECT count(*) FROM public.v_user_activity_days d WHERE d.user_id = g.user_id AND date_trunc('week', d.day)::date = g.week) AS active_days,
    (SELECT count(*) FROM public.engine_telemetry e WHERE e.user_id = g.user_id AND e.event = 'workout_completed'
       AND date_trunc('week', e.occurred_at)::date = g.week) AS workouts
  FROM grouped g
)
SELECT week, safety_group, count(*) AS users,
       round(avg(active_days), 2) AS active_days_per_user,
       round(avg(workouts), 2) AS workouts_per_user
FROM activity
GROUP BY week, safety_group
HAVING count(*) >= 10;

-- Every view above is for the service role (the founder's tools and the
-- weekly analysis), never for a signed-in app user.
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'v_user_activity_days', 'v_user_signups', 'v_user_paths', 'v_onboarding_funnel', 'v_activation_by_path',
    'v_retention_cohorts', 'v_friction_vs_return', 'v_core_loops_weekly', 'v_performance_by_version',
    'v_engagement_status', 'v_last_session_before_lapse', 'v_lapse_last_screens', 'v_session_summary',
    'v_confusion_topics', 'v_exit_reasons', 'v_feature_exposure_effect', 'v_experiment_results',
    'v_release_compare', 'v_safety_activity_groups'
  ] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', v);
    EXECUTE format('GRANT SELECT ON public.%I TO service_role', v);
  END LOOP;
END $$;

-- One read for the weekly analysis: the aggregate views (never the
-- per-person ones) for the last `_weeks` weeks.
CREATE OR REPLACE FUNCTION public.telemetry_weekly_digest(_weeks int DEFAULT 8)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'weeks', _weeks,
    'catalogue', (SELECT jsonb_agg(jsonb_build_object('name', name, 'area', area, 'signal', signal, 'description', description) ORDER BY area, name)
                  FROM telemetry_event_catalogue WHERE signal <> 'legacy'),
    'releases', (SELECT jsonb_agg(to_jsonb(r) ORDER BY released_on) FROM app_releases r),
    'core_loops', (SELECT jsonb_agg(to_jsonb(x) ORDER BY week) FROM v_core_loops_weekly x WHERE week > current_date - (_weeks * 7)),
    'onboarding_funnel', (SELECT jsonb_agg(to_jsonb(x) ORDER BY week, mode, step) FROM v_onboarding_funnel x WHERE week > current_date - (_weeks * 7)),
    'activation_by_path', (SELECT jsonb_agg(to_jsonb(x) ORDER BY signup_week) FROM v_activation_by_path x WHERE signup_week > current_date - (_weeks * 7)),
    'retention_cohorts', (SELECT jsonb_agg(to_jsonb(x) ORDER BY cohort_week, week_number) FROM v_retention_cohorts x WHERE cohort_week > current_date - (_weeks * 7)),
    'friction_vs_return', (SELECT jsonb_agg(to_jsonb(x) ORDER BY return_gap_pct) FROM v_friction_vs_return x),
    'performance_by_version', (SELECT jsonb_agg(to_jsonb(x)) FROM v_performance_by_version x),
    'lapse_last_screens', (SELECT jsonb_agg(to_jsonb(x) ORDER BY lapsed_users DESC) FROM v_lapse_last_screens x),
    'session_summary', (SELECT jsonb_agg(to_jsonb(x)) FROM v_session_summary x WHERE week > current_date - (_weeks * 7)),
    'confusion_topics', (SELECT jsonb_agg(to_jsonb(x) ORDER BY opens DESC) FROM v_confusion_topics x WHERE week > current_date - (_weeks * 7)),
    'exit_reasons', (SELECT jsonb_agg(to_jsonb(x)) FROM v_exit_reasons x WHERE week > current_date - (_weeks * 7)),
    'feature_exposure_effect', (SELECT jsonb_agg(to_jsonb(x)) FROM v_feature_exposure_effect x),
    'experiment_results', (SELECT jsonb_agg(to_jsonb(x)) FROM v_experiment_results x),
    'release_compare', (SELECT jsonb_agg(to_jsonb(x) ORDER BY first_seen) FROM v_release_compare x),
    'safety_activity_groups', (SELECT jsonb_agg(to_jsonb(x) ORDER BY week) FROM v_safety_activity_groups x WHERE week > current_date - (_weeks * 7)),
    'engagement_status_counts', (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) AS n FROM v_engagement_status GROUP BY status) s)
  );
$$;
REVOKE ALL ON FUNCTION public.telemetry_weekly_digest(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telemetry_weekly_digest(int) TO service_role;
