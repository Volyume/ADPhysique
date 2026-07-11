-- Migration 072: workouts pre-workout readiness columns (COMP-008)
--
-- COMP-008 (survey diet) moves the three "walked-in-with" facts out of the
-- post-workout summary and into the pre-workout intent prompt, capturing them
-- at the moment they are true rather than through end-of-session recall. They
-- are written to the workout row at create time (src/lib/database.js
-- createWorkout) and round-trip through the workout sync seam
-- (_upsertWorkout / insertWorkoutFromCloud).
--
-- soreness_24h_before already exists on workouts (added in migrate_012) and is
-- reused, no DDL here. This migration adds the two genuinely new columns:
--   sleep_quality integer NULL   -- 1-5 domain (prompt offers 2/3/4)
--   energy_score  integer NULL   -- 1-5 domain (prompt offers 2/3/4)
--
-- Old-client compatibility (release policy 2026-05-24): additive + nullable,
-- no default. The frozen closed-test build never reads or writes these; its
-- workout pushes omit them and the upsert leaves them NULL. No behaviour change
-- for the old AAB. Safe to re-run (IF NOT EXISTS).
--
-- The matching local SQLite columns are added by the additive migration block
-- in src/lib/database.js (SCHEMA_MIGRATIONS, COMP-008 entry).
--
-- Re-runnable: yes. Rollback: DROP COLUMN sleep_quality, energy_score (loses
-- only the captured readiness values themselves).
--
-- SUPERSEDED 2026-07-11: this file was written but never applied to
-- production (Sentry VOLYUME-S/VOLYUME-1C, ~4300 combined occurrences --
-- every pre-workout readiness value was silently discarded by sync.js's
-- missingSchemaColumn shim before reaching cloud). Its DDL was carried
-- forward verbatim as step 1 of migrate_118_workouts_recipes_sync_schema_fix.sql,
-- applied to production 2026-07-11. Kept here for history; do not re-run
-- standalone, migrate_118 is now the record of what actually shipped.

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS sleep_quality integer,
  ADD COLUMN IF NOT EXISTS energy_score integer;

-- Verification:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'workouts'
--     AND column_name IN ('sleep_quality', 'energy_score');
-- Expect two rows.
