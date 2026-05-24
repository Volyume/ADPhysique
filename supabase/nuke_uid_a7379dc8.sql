-- One-shot: hard-delete an orphan auth.users row + every public.* row
-- referencing it. Use when a prior failed delete-account attempt left
-- the account half-deleted (auth row survived, public rows survived,
-- next sign-in pulls them back as "your data").
--
-- Replace the UID below with the target. Paste into Supabase Dashboard
-- → SQL Editor → Run. Requires postgres role (service-role-equivalent
-- the SQL Editor uses by default).
--
-- Safe to re-run: every DELETE is idempotent; the auth.users delete is
-- skipped if the row is already gone.

DO $$
DECLARE
  target_uid uuid := 'a7379dc8-a597-4d00-9ebf-5693ae8450cb';
BEGIN
  RAISE NOTICE 'Nuking uid=%', target_uid;

  -- public.* in the same order as migrate_025's delete_user_data RPC.
  -- Wrapped per-table so a missing table doesn't abort the rest.
  BEGIN DELETE FROM engine_telemetry            WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM engine_overrides            WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM ed_pattern_flags            WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM consent_log                 WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM recipe_ingredients          WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM recipes                     WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM saved_meals                 WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_favourites             WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_water                 WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_intake_rollups        WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_entries                WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_foods                WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_sets                WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_notes_v2            WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workouts                    WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routine_exercises           WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routines                    WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycle_weeks             WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycles                  WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM planned_muscle_volume       WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM adaptation_events           WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM programmes                  WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM peak_week_plans             WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_user_notes         WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_goals              WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_exercises            WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM volume_landmarks            WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_volumes              WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM personal_records            WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins_v2          WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins             WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM morning_weights             WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM body_metrics                WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM progress_photos             WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM achievements                WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM coach_outputs               WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM nutrition_targets           WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_insights               WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM autoregulation_suggestions  WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_body_profile           WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_feedback               WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM debug_log_uploads           WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercises                   WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_prefs                  WHERE user_id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- users_profile: keyed on id not user_id
  BEGIN DELETE FROM users_profile WHERE id = target_uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Finally the auth row. Service role required; the SQL Editor runs
  -- as postgres which has the rights. If FKs we don't know about still
  -- block this, the EXCEPTION will surface the table name so we can
  -- add it to the wipe list.
  BEGIN
    DELETE FROM auth.users WHERE id = target_uid;
    RAISE NOTICE 'auth.users row deleted for uid=%', target_uid;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auth.users delete failed for uid=%: %', target_uid, SQLERRM;
  END;

  RAISE NOTICE 'Nuke complete for uid=%', target_uid;
END $$;

-- Verify the account is gone.
SELECT 'auth.users' AS source, count(*) AS remaining FROM auth.users WHERE id = 'a7379dc8-a597-4d00-9ebf-5693ae8450cb'
UNION ALL
SELECT 'users_profile', count(*) FROM users_profile WHERE id = 'a7379dc8-a597-4d00-9ebf-5693ae8450cb'
UNION ALL
SELECT 'custom_exercises', count(*) FROM custom_exercises WHERE user_id = 'a7379dc8-a597-4d00-9ebf-5693ae8450cb'
UNION ALL
SELECT 'nutrition_targets', count(*) FROM nutrition_targets WHERE user_id = 'a7379dc8-a597-4d00-9ebf-5693ae8450cb'
UNION ALL
SELECT 'planned_muscle_volume', count(*) FROM planned_muscle_volume WHERE user_id = 'a7379dc8-a597-4d00-9ebf-5693ae8450cb';
