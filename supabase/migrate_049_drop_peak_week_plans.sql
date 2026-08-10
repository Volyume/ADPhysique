-- Migration 049: drop peak_week_plans table
--
-- ⚠️ HELD. DO NOT APPLY. Header corrected 2026-08-10 (Campaign 4,
-- docs/coherence-cleanup-2026-08-10/AUDIT-PEAKWEEK-SYNC.md and
-- AUDIT-DOCS-COHERENCE.md §1.5). Text only; the gate and the SQL below
-- are unchanged.
--
-- THE ORIGINAL RATIONALE WAS WRONG. This header used to say the Peak Week
-- module "was removed entirely" (founder direction 2026-05-25, "peak week
-- needs a human eye, not numbers") and that the table "has been dormant
-- since" and "was never wired to any user-facing screen". None of that is
-- true today. `peak_week_plans` is LIVE product state behind the B4 contest
-- countdown, read by two shipped screens:
--
--   * `src/screens/ProGoalSetupScreen.js:182` - `getActivePeakWeekPlan`
--   * `src/screens/CoachOutputScreen.js:1100` - `getActivePeakWeekPlan`
--
-- Applying this migration would delete the data behind a shipped surface and
-- break sync. It stays HELD until a deliberate retirement design exists
-- (recorded as founder item FR-PW-1).
--
-- Client-side cleanup that would have to land FIRST, re-derived against the
-- current tree on 2026-08-10 (every line number in the old list was stale,
-- and the list omitted both the pull path and the live readers):
--
-- 1. `src/lib/sync.js`: remove `_pushPeakWeekPlans` (definition line 1186,
--    caller line 742) AND `_pullPeakWeekPlans` (definition line 1836,
--    caller line 1611). The pull path was never mentioned in the old list.
-- 2. `src/lib/database.js:316`: remove the local `peak_week_plans`
--    CREATE TABLE statement, plus the DAO helpers
--    `getAllPeakWeekPlansForUser` (:6833), `getActivePeakWeekPlan` (:6845),
--    `setPeakWeekShowDate` (:6858) and
--    `insertOrUpdatePeakWeekPlanFromCloud` (:7857), and the three table
--    lists that name it (:4845, :5225, :8512).
-- 3. `src/lib/database.js:751`: drop the
--    'ALTER TABLE peak_week_plans ADD COLUMN deleted_at INTEGER'
--    migration step (no-op after table is gone).
-- 4. `supabase/audit_cloud_schema_drift.sql:247`: remove
--    'peak_week_plans' from the expected table set.
-- 5. `supabase/migrate_025_delete_user_data_completeness.sql`: the
--    `DELETE FROM peak_week_plans` branch is already wrapped in
--    `EXCEPTION WHEN undefined_table THEN NULL` so it tolerates the
--    drop. No edit required.
-- 6. Retire the two live screen readers above, then ship a client build
--    that neither reads nor pushes `peak_week_plans` BEFORE running this
--    migration in cloud. Older builds keep pushing to the cloud table until
--    users update; dropping the table breaks those pushes (silently per the
--    sync error tolerance in CLAUDE.md release policy).
--
-- Per the release policy: "sync errors in log are acceptable; total
-- break is not". Dropping a table currently being pushed to surfaces
-- as a 42P01 (undefined_table) on every sync cycle from any device
-- still running the old build. Acceptable per the policy, but ugly.
-- Preferred: ship the client cleanup first, give users a week to
-- update, then drop the cloud table.
--
-- Safe to re-run: drop is conditional on table presence.
-- Rollback considerations: cloud rows are lost when the table drops, with
-- no rollback. Correction 2026-08-10: the old claim here that "the data was
-- never wired to any user-facing screen, so no user workflow is affected"
-- is FALSE - see the two live readers named at the top of this header. A
-- user's contest countdown would be destroyed.

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
