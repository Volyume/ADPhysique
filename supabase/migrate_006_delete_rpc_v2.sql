-- Migration 006: extend delete_user_data RPC to wipe every table that
-- references auth.users(id), so auth.admin.deleteUser can complete.
--
-- Symptom that triggered this: the delete-account Edge Function was
-- returning {"error":"Auth deletion failed: Database error deleting user"}
-- because nine user-keyed tables were left behind after the v1 RPC ran,
-- which then blocked auth.users delete on FK violation.
--
-- Tables added since migrate_003_delete_rpc:
--   - exercises               (custom user exercises; user_id nullable)
--   - volume_landmarks        (per-user volume targets)
--   - programmes              (sync layer plan rows)
--   - morning_weights         (Pro morning weight log)
--   - coach_outputs           (weekly coach JSON snapshots)
--   - user_body_profile       (Pro coaching body screen)
--   - exercise_user_notes     (per-exercise notes)
--   - weekly_checkins_v2      (modern coach check-in schema)
--   - debug_log_uploads       (beta debug log ring buffer)
--
-- Order rationale: anything that references exercises (workout_sets,
-- routine_exercises, personal_records) must be wiped before exercises
-- itself. workouts cascades workout_sets; routines cascades
-- routine_exercises; personal_records is keyed by user_id and deleted
-- explicitly. So we wipe in the same order as v1, then drop the new
-- additions, then finally exercises (now safe to delete) and
-- users_profile last.
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

  -- v1 deletes (unchanged order)
  DELETE FROM autoregulation_suggestions  WHERE user_id = uid;
  DELETE FROM achievements                WHERE user_id = uid;
  DELETE FROM progress_photos             WHERE user_id = uid;
  DELETE FROM body_metrics                WHERE user_id = uid;
  DELETE FROM weekly_volumes              WHERE user_id = uid;
  DELETE FROM personal_records            WHERE user_id = uid;
  DELETE FROM weekly_checkins             WHERE user_id = uid;
  DELETE FROM workouts                    WHERE user_id = uid; -- cascades workout_sets
  DELETE FROM mesocycles                  WHERE user_id = uid; -- cascades mesocycle_weeks
  DELETE FROM routines                    WHERE user_id = uid; -- cascades routine_exercises

  -- v2 additions
  DELETE FROM volume_landmarks            WHERE user_id = uid;
  DELETE FROM programmes                  WHERE user_id = uid;
  DELETE FROM morning_weights             WHERE user_id = uid;
  DELETE FROM coach_outputs               WHERE user_id = uid;
  DELETE FROM user_body_profile           WHERE user_id = uid;
  DELETE FROM exercise_user_notes         WHERE user_id = uid;
  DELETE FROM weekly_checkins_v2          WHERE user_id = uid;
  DELETE FROM debug_log_uploads           WHERE user_id = uid;

  -- exercises last — workout_sets/routine_exercises/personal_records
  -- have all been wiped above so the exercise rows are no longer
  -- referenced and can drop without an FK violation.
  DELETE FROM exercises                   WHERE user_id = uid;

  DELETE FROM users_profile               WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;
