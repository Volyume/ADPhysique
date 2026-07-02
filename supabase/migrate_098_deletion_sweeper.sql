-- ════════════════════════════════════════════════════════════════════
-- Migration 098: server-side deletion sweeper (Article 17 completion)
-- ════════════════════════════════════════════════════════════════════
--
-- Purpose (Wave-3 hostile review, confirmed major; founder decision
-- 2026-07-02 "Yes, prepare it"):
--   A user who deletes their account while the delete-account Edge
--   Function is unreachable falls back to the delete_user_data RPC.
--   The RPC erases every public.* row but cannot remove the auth.users
--   row, and the client-side retry only ever runs if that user signs
--   in again. A user who never returns leaves their sign-in record
--   (email + OAuth identity) on the server indefinitely. This
--   migration closes that gap server-side, and also finishes any
--   Edge-Function deletion that erased data but failed at the
--   auth.admin.deleteUser step (rows already in account_deletions_log
--   with completed_at IS NULL).
--
-- What this does:
--   1. record_rpc_fallback_deletion(): a self-only RPC the client calls
--      right after a successful delete_user_data fallback. It VERIFIES
--      the wipe actually happened (no workouts / weekly check-ins /
--      morning weights remain for auth.uid()) before writing an
--      account_deletions_log row (source 'rpc_fallback',
--      completed_at NULL), so it cannot be used to enqueue a live,
--      un-wiped account. Self-only by construction: it reads auth.uid()
--      and takes no user parameter.
--   2. private.sweep_incomplete_account_deletions(grace interval):
--      SECURITY DEFINER sweep over account_deletions_log rows with
--      completed_at IS NULL and initiated_at older than the grace
--      period (default 3 days, so the client-side retry gets first go).
--      For each: if the auth.users row still exists, delete it (this is
--      the erasure the user asked for; identities and sessions cascade);
--      then stamp completed_at. Rows whose auth user is already gone
--      are simply stamped, healing the Panel 8 queue-depth metric.
--   3. Schedules the sweep daily via pg_cron (03:17 UTC), tolerant of
--      environments without pg_cron (local dev): scheduling failures
--      are caught and reported as a NOTICE, and the founder can run
--      SELECT private.sweep_incomplete_account_deletions(); by hand.
--
-- Numbering note: the F5 plan (docs/f5-legacy-sync-plan-2026-07-02.md)
-- proposed migrations starting at 098 before this file existed; F5's
-- set shifts to 099+ when written.
--
-- Applied locally (dev Supabase):   NO (pending)
-- Applied remotely (prod):          NO — founder-run, manual, like every
--                                   cloud migration. Apply via Supabase
--                                   Dashboard → SQL Editor → Run.
-- Safe to re-run:                   YES (CREATE OR REPLACE throughout;
--                                   the cron job is unscheduled before
--                                   scheduling; the sweep itself is
--                                   idempotent — completed rows are
--                                   never revisited).
-- Rollback:                         SELECT cron.unschedule('deletion-sweeper-daily');
--                                   DROP FUNCTION private.sweep_incomplete_account_deletions(interval);
--                                   DROP FUNCTION public.record_rpc_fallback_deletion();
--                                   (log rows written meanwhile are part
--                                   of the deletion audit record and stay.)
-- ════════════════════════════════════════════════════════════════════

-- 1 ── self-only fallback logger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_rpc_fallback_deletion()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _has_data boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  -- Verify the wipe actually happened before enqueuing an auth-row
  -- deletion. Each probe tolerates a missing table (older schemas),
  -- matching delete_user_data's own defensive pattern.
  BEGIN
    SELECT EXISTS(SELECT 1 FROM workouts WHERE user_id = _uid) INTO _has_data;
  EXCEPTION WHEN undefined_table THEN _has_data := false; END;
  IF _has_data THEN RETURN false; END IF;

  BEGIN
    SELECT EXISTS(SELECT 1 FROM weekly_checkins_v2 WHERE user_id = _uid) INTO _has_data;
  EXCEPTION WHEN undefined_table THEN _has_data := false; END;
  IF _has_data THEN RETURN false; END IF;

  BEGIN
    SELECT EXISTS(SELECT 1 FROM morning_weights WHERE user_id = _uid) INTO _has_data;
  EXCEPTION WHEN undefined_table THEN _has_data := false; END;
  IF _has_data THEN RETURN false; END IF;

  -- One open row per user is enough; a repeat call refreshes nothing.
  IF EXISTS (
    SELECT 1 FROM account_deletions_log
    WHERE user_id = _uid AND completed_at IS NULL
  ) THEN
    RETURN true;
  END IF;

  INSERT INTO account_deletions_log (user_id, initiated_at, reason, source)
  VALUES (_uid, now(), 'rpc_fallback_auth_pending', 'rpc_fallback');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_rpc_fallback_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_rpc_fallback_deletion() TO authenticated;

-- 2 ── the sweep ──────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.sweep_incomplete_account_deletions(_grace interval DEFAULT interval '3 days')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _swept integer := 0;
BEGIN
  FOR _row IN
    SELECT id, user_id
    FROM account_deletions_log
    WHERE completed_at IS NULL
      AND initiated_at < now() - _grace
    ORDER BY initiated_at
    LIMIT 200  -- bounded per run; the daily cadence drains any backlog
  LOOP
    -- The erasure the user asked for: remove the surviving sign-in
    -- record. Identities, sessions and refresh tokens cascade.
    DELETE FROM auth.users WHERE id = _row.user_id;
    UPDATE account_deletions_log
    SET completed_at = now()
    WHERE id = _row.id;
    _swept := _swept + 1;
  END LOOP;
  RETURN _swept;
END;
$$;

REVOKE ALL ON FUNCTION private.sweep_incomplete_account_deletions(interval) FROM PUBLIC;
-- No grants: service-role / postgres only (pg_cron runs as the job owner).

-- 3 ── daily schedule (tolerant of missing pg_cron on local dev) ──────
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable (%). Run SELECT private.sweep_incomplete_account_deletions(); manually or schedule via the dashboard.', SQLERRM;
    RETURN;
  END;
  BEGIN
    PERFORM cron.unschedule('deletion-sweeper-daily');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- not scheduled yet
  END;
  PERFORM cron.schedule(
    'deletion-sweeper-daily',
    '17 3 * * *',
    $job$SELECT private.sweep_incomplete_account_deletions();$job$
  );
END;
$$;
