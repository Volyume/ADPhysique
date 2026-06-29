-- migrate_091_exercise_type.sql
-- Exercise TYPE axis (Hevy teardown docs/hevy-teardown-2026-06-29/03-exercise-library.md,
-- R3 "Introduce an exerciseType / set-schema field", P2). One logger now handles
-- reps-only / duration / distance / weighted-bodyweight exercises, not only
-- weight x reps. The column drives which set-input fields render on the device;
-- it does NOT change how a weight_reps row is stored or scored.
--
-- RISK NOTE: weight_reps is the default for every existing row and every new
-- one, so the byte-for-byte behaviour of the existing weight x reps path is
-- preserved. The CHECK pins the vocabulary to the five supported schemas.
--
-- ADDITIVE + idempotent only. Applied by CI on merge to main
-- (deploy-migrations.yml); never run by hand against production.
--
-- No new workout-set columns: duration is stored as seconds in the existing
-- reps field and distance as metres in the existing weight field on the device
-- (see src/lib/database.js / ActiveWorkoutScreen.js); the cloud set tables are
-- unchanged, so only the exercise catalogue tables gain the type axis here.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  091
--   - Purpose:           exercises.exercise_type + custom_exercises.exercise_type
--                        (text, default 'weight_reps', CHECK over the 5 schemas),
--                        backfill existing NULLs to 'weight_reps'.
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  NO (auto-applies on merge to main via
--                        deploy-migrations.yml; STAGING per docs/rules/supabase.md)
--   - Safe to re-run:    YES (ADD COLUMN IF NOT EXISTS + idempotent CHECK add +
--                        backfill UPDATE that no-ops once filled)
--   - Rollback:          ALTER TABLE exercises        DROP COLUMN IF EXISTS exercise_type;
--                        ALTER TABLE custom_exercises DROP COLUMN IF EXISTS exercise_type;
--   - App-code deps:     src/lib/seedExercises.js sets exercise_type on a small,
--                        conservative set of rows (holds -> duration, distance
--                        cardio -> distance, bodyweight rep movements ->
--                        weighted_bodyweight); everything else stays weight_reps.
--
-- Apply via deploy-migrations.yml on merge, or Dashboard -> SQL Editor.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add the column (additive, nullable-then-defaulted). Default keeps the
--    frozen old AAB writing nothing and reading the safe weight_reps schema.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS exercise_type text DEFAULT 'weight_reps';

ALTER TABLE custom_exercises
  ADD COLUMN IF NOT EXISTS exercise_type text DEFAULT 'weight_reps';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Backfill any pre-existing NULL rows to the safe default.
-- ─────────────────────────────────────────────────────────────────────
UPDATE exercises        SET exercise_type = 'weight_reps' WHERE exercise_type IS NULL;
UPDATE custom_exercises SET exercise_type = 'weight_reps' WHERE exercise_type IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Pin the vocabulary. ADD CONSTRAINT has no IF NOT EXISTS, so guard the
--    add so the migration stays re-runnable.
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercises_exercise_type_chk'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_exercise_type_chk
      CHECK (exercise_type IN (
        'weight_reps','reps_only','duration','distance','weighted_bodyweight'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'custom_exercises_exercise_type_chk'
  ) THEN
    ALTER TABLE custom_exercises
      ADD CONSTRAINT custom_exercises_exercise_type_chk
      CHECK (exercise_type IN (
        'weight_reps','reps_only','duration','distance','weighted_bodyweight'
      ));
  END IF;
END $$;
