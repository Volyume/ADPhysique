-- Migration 008: make delete_user_data tolerant of missing tables.
--
-- Problem flagged in the 2026-05-21 debug log dump:
--   ERROR: relation "debug_log_uploads" does not exist
--
-- The v2 RPC from migrate_006 tries to DELETE FROM every user-keyed
-- table. If any one of them doesn't exist in the target database (e.g.
-- the user upgraded across many migrations and skipped setup_complete
-- for a recently-added table), the RPC bails on the first missing
-- table and everything after it is left behind. Subsequent
-- auth.admin.deleteUser still trips because the surviving tables
-- have FK rows.
--
-- Fix: wrap each DELETE in its own BEGIN/EXCEPTION sub-block so a
-- missing table is silently skipped instead of aborting the whole RPC.
-- Tables that DO exist still get wiped.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Every delete is wrapped so a missing table doesn't abort the rest.
  -- Order still matters when tables DO exist (we wipe referencing rows
  -- before their target so FK constraints don't trip), but if a table
  -- is missing the sub-block just skips and we keep going.

  BEGIN DELETE FROM autoregulation_suggestions WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM achievements               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM progress_photos            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM body_metrics               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_volumes             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM personal_records           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workouts                   WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycles                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routines                   WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM volume_landmarks           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM programmes                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM morning_weights            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM coach_outputs              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_body_profile          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_user_notes        WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins_v2         WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM debug_log_uploads          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM exercises                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- users_profile is the load-bearing one — if this is missing the
  -- whole deployment is broken. Let it raise so we know.
  DELETE FROM users_profile WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;
