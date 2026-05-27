-- Migration 049: drop peak_week_plans table
--
-- Peak Week module was removed entirely by founder direction 2026-05-25
-- ("peak week needs a human eye, not numbers"). The cloud table created
-- by migration 012 has been dormant since. This migration removes it.
--
-- ⚠️ This is a DRAFT. Do not apply yet. Client-side cleanup required first:
--
-- 1. `src/lib/sync.js` line 965: remove `_pushPeakWeekPlans` and the
--    caller in `bulkUploadLocalData`.
-- 2. `src/lib/database.js` line 201: remove the local `peak_week_plans`
--    CREATE TABLE statement and any DAO helpers
--    (`getAllPeakWeekPlansForUser` referenced in sync.js).
-- 3. `src/lib/database.js` line 633: drop the
--    'ALTER TABLE peak_week_plans ADD COLUMN deleted_at INTEGER'
--    migration step (no-op after table is gone).
-- 4. `supabase/audit_cloud_schema_drift.sql` line 244: remove
--    'peak_week_plans' from the expected table set.
-- 5. `supabase/migrate_025_delete_user_data_completeness.sql`: the
--    `DELETE FROM peak_week_plans` branch is already wrapped in
--    `EXCEPTION WHEN undefined_table THEN NULL` so it tolerates the
--    drop. No edit required.
-- 6. Ship a new client build that does NOT push to `peak_week_plans`
--    BEFORE running this migration in cloud. The closed-test build
--    will continue to push to the cloud table until users update;
--    the table dropping breaks those pushes (silently per the sync
--    error tolerance in CLAUDE.md release policy).
--
-- Per the release policy: "sync errors in log are acceptable; total
-- break is not". Dropping a table currently being pushed to surfaces
-- as a 42P01 (undefined_table) on every sync cycle from any device
-- still running the old build. Acceptable per the policy, but ugly.
-- Preferred: ship the client cleanup first, give users a week to
-- update, then drop the cloud table.
--
-- Safe to re-run: drop is conditional on table presence.
-- Rollback considerations: cloud rows are lost when the table drops.
-- The data was never wired to any user-facing screen, so no user
-- workflow is affected.

DROP TABLE IF EXISTS public.peak_week_plans CASCADE;

-- Verification: ensure the table is gone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'peak_week_plans'
  ) THEN
    RAISE EXCEPTION 'peak_week_plans still exists after DROP';
  END IF;
END $$;
