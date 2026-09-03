-- Migration 157: pause the trial-cascade pg_cron worker
-- (founder decision 2026-09-03: Volyume is fully free).
--
-- Purpose: migration 031 scheduled `cascade-advance-due-users` to run
-- `cascade_advance_due_users()` every 15 minutes. That worker advances users
-- through the trial cascade and AUTO-DOWNGRADES them when a gate falls due.
-- Volyume no longer has a trial, a Free/Pro split, a paywall or an expiry, so
-- the app never starts a cascade and no user should ever be advanced or
-- downgraded by a server timer again. Left running, the job would keep
-- rewriting trial_state / tier rows underneath a client that has stopped
-- reading them for entitlement, and could downgrade a live user's row for a
-- product state that no longer exists.
--
-- This migration UNSCHEDULES that job and nothing else. Deliberately NOT done
-- here, so the billing infrastructure stays dormant rather than demolished:
--
--   * the `cascade_advance_due_users()` FUNCTION is NOT dropped -- it stays
--     defined, with its migration 152 execute privileges intact;
--   * no table, column, constraint, RPC, policy or trigger is touched --
--     start_cascade / upgrade_tier / upgrade_tier_for_user and the
--     users_profile trial columns are all untouched;
--   * no user data is read, written or deleted;
--   * the live store product identifiers pro_monthly / pro_annual are not
--     referenced here and do not change.
--
-- Re-arming monetisation is therefore a deliberate act: re-schedule this job
-- (see Rollback) AND flip FULL_ACCESS_FOR_ALL in src/lib/proGate.js. Neither
-- alone re-starts the cascade.
--
-- Applied locally:  NOT APPLIED - awaits the founder's exact phrase "run
--                   against production" (per CLAUDE.md; cloud migrations are
--                   applied manually, never automatically).
-- Applied remotely: NOT APPLIED - awaits the founder's exact phrase "run
--                   against production".
-- Safe to re-run:   YES. The unschedule is wrapped in an exception-swallowing
--                   block, so running it when the job is already gone (or
--                   when pg_cron is unavailable) is a no-op. Additive in the
--                   sense that matters: it removes no schema object and no
--                   data.
-- Rollback:         re-schedule the job exactly as migration 031 did:
--                     SELECT cron.schedule(
--                       'cascade-advance-due-users',
--                       '*/15 * * * *',
--                       $cron$SELECT cascade_advance_due_users();$cron$
--                     );
--                   The function it calls was never dropped, so the rollback
--                   is that one statement.

DO $$
BEGIN
  -- cron.unschedule raises if the job does not exist, and the whole block
  -- raises if pg_cron is not installed in this environment. Swallow both:
  -- either way the desired end state (no cascade job scheduled) holds.
  BEGIN
    PERFORM cron.unschedule('cascade-advance-due-users');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
