-- Migration 003: GDPR delete_user_data RPC
-- Run once in the Supabase SQL Editor (or via supabase db push).

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
  DELETE FROM users_profile               WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;
