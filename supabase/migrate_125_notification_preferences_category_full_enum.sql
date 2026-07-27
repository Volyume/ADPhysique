-- Migration 125: extend notification_preferences category CHECK to the
-- FULL client category enum (src/lib/notifications/categories.js).
--
-- Production failure (Sentry VOLYUME-20/21/22, founder repro 2026-07-13):
-- the Coaching reminders "Planned-meal confirm" toggle writes a local row
-- with category 'planned_meal_confirm' (CoachingRemindersScreen ->
-- setPreference), which migration 085's CHECK rejects (23514). The batched
-- push then failed the whole preference round every sync, and the non-zero
-- errored_count blocked sign-out behind the "Sync incomplete" prompt.
--
-- The client now degrades gracefully (per-row retry, constraint-rejected
-- rows counted as skipped, not errored), but the rows only reach the cloud
-- once this CHECK admits them. Rather than chase the enum one category at
-- a time (084 -> 085 -> this), admit every category the client enum
-- defines, including the ones with no preference toggle yet, so a future
-- toggle cannot recreate this failure class. Unknown-category defence
-- stays intact: anything outside the client enum is still rejected.
--
-- Additive only. RLS, PK and trigger from migration 044 unchanged.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        125
--   - Purpose:                 extend notification_preferences category
--                              CHECK to the full client category enum
--   - Applied locally:         no (no local dev Supabase project at v1)
--   - Applied remotely:        APPLIED 2026-07-27 on the founder's explicit
--                              "Yes run 119 and 125 against production".
--                              Recorded in the cloud migration history as
--                              migrate_125_notification_preferences_category_full_enum.
--                              Verified after the run: the CHECK admits
--                              'planned_meal_confirm' (the category whose
--                              23514 rejection failed the whole preference
--                              push every sync and blocked sign-out) and
--                              carries all 23 categories. The list was
--                              diffed against CATEGORY in
--                              src/lib/notifications/categories.js before
--                              applying: 23 for 23, no drift either way.
--   - Safe to re-run:          yes (DROP CONSTRAINT IF EXISTS + ADD)
--   - Rollback:                re-run migration 085's constraint block to
--                              restore the previous 14-value CHECK
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_category_check;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_category_check CHECK (category IN (
    'daily_checkin_reminder',
    'weekly_checkin_reminder',
    'cascade_gate',
    'subscription_payment_failure',
    'subscription_expiring',
    'sync_error',
    'ed_pattern_lockout',
    'ffm_floor_hold',
    'weekly_coach_ready',
    'coach_trial_ending',
    'morning_weight',
    'evening_weight',
    'training_reminder',
    'year_of_lifts_unlock',
    'checkin_missed',
    'monthly_recap',
    'trial_day3',
    'winback',
    'partner_cheer',
    'planned_meal_confirm',
    'rest_timer',
    'meal_log_reminder',
    'activation_nudge'
  ));
