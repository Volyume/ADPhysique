-- Migration 085: extend notification_preferences category CHECK with
-- 'checkin_missed' (OPP-C03 missed check-in ghost prevention).
--
-- The new Settings → Coaching reminders → "Check-in follow-up" toggle
-- writes a local SQLite row with category 'checkin_missed'
-- (src/lib/notifications/preferences.js setPreference, called from
-- CoachingRemindersScreen). The registry-driven push
-- (src/lib/sync/tables/notificationPreferences.js) upserts that row to
-- the cloud table, where migration 044's CHECK constraint would reject
-- it. The upsert is batched, so until this migration is applied a
-- 'checkin_missed' row in the batch fails the WHOLE preference push for
-- that round (logged via logSyncError, retried next sync; local SQLite
-- remains the source of truth, so no user-visible breakage).
--
-- No telemetry allow-list change is needed: the follow-ups reuse the
-- existing notification_sent / notification_tapped / notification_failed
-- event names (migration 040) with category carried in the payload.
--
-- Known gap, deliberately NOT addressed here: categories monthly_recap,
-- trial_day3, winback and partner_cheer exist in the client enum but are
-- also absent from the 044 CHECK. None of them writes a preference row
-- today (no toggles), so nothing syncs for them; extend the CHECK again
-- when one grows a toggle.
--
-- Additive only. RLS, PK and trigger from migration 044 unchanged.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        085
--   - Purpose:                 extend notification_preferences category
--                              CHECK with 'checkin_missed'
--   - Applied locally:         no (no local dev Supabase project at v1)
--   - Applied remotely:        pending founder apply -- NEVER run from
--                              an agent; production requires the exact
--                              phrase "run against production"
--   - Safe to re-run:          yes (DROP CONSTRAINT IF EXISTS + ADD)
--   - Rollback:                re-run with 'checkin_missed' removed from
--                              the list below. Any synced
--                              'checkin_missed' rows must be deleted
--                              first or the ADD CONSTRAINT fails
--                              validation.
--   - App-code dependencies:   CoachingRemindersScreen toggle ->
--                              setPreference('checkin_missed', ...);
--                              sync push/pull is category-agnostic.
--                              Old AABs are unaffected: they have no
--                              writer for this category.
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
    'training_reminder',
    'year_of_lifts_unlock',
    'checkin_missed'
  ));
