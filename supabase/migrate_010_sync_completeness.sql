-- Migration 010: cloud schema completeness for sync round-trip
--
-- The local app writes a number of columns that the cloud tables don't
-- have. PostgREST rejects the entire upsert when ANY column doesn't
-- exist, so on a cross-device sign-in we ended up with:
--   - routines restored without a programme_id link → "No active plan
--     on device" on Train, "0 workouts" on plan detail, the plan
--     routines moved into the "Workout templates" bucket instead.
--   - body_metrics never round-tripping — the push wrote a `thigh`,
--     `ham`, `body_fat_percent`, `body_fat_source` columns that don't
--     exist, every metric was rejected, and on a fresh device the
--     Athlete Hub showed "No entries yet".
--   - routine_exercises and workout_sets silently dropping when they
--     referenced a canonical (seeded) exercise, because the cloud
--     `exercises` table is only populated for is_custom=1 rows so the
--     FK to exercises(id) violated for the rest.
--
-- This migration makes the cloud schema accept everything the JS layer
-- writes today and removes the FK that was filtering out otherwise-
-- valid rows. None of the changes are destructive — every statement is
-- additive or a constraint drop.
--
-- Apply with: Supabase Dashboard → SQL Editor → paste → Run.

-- ─── routines: plan-link + metadata columns ──────────────────────────────
ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS programme_id TEXT,
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_library BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_routine_id TEXT;

CREATE INDEX IF NOT EXISTS idx_routines_programme ON routines(programme_id);

-- ─── routine_exercises: per-exercise defaults that were local-only ──────
ALTER TABLE routine_exercises
  ADD COLUMN IF NOT EXISTS starting_weight NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS rest_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS superset_group_id TEXT;

-- ─── body_metrics: body-fat fields ───────────────────────────────────────
ALTER TABLE body_metrics
  ADD COLUMN IF NOT EXISTS body_fat_percent NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS body_fat_source TEXT;

-- ─── Drop FK constraints that block legitimate sync ──────────────────────
-- The cloud `exercises` table only carries user-created (is_custom=1)
-- exercises; the canonical 250+ seed exercises live only in local
-- SQLite (via seedExercises.js). Keeping a FOREIGN KEY from
-- routine_exercises.exercise_id → exercises(id) means any row pointing
-- at a canonical exercise (i.e. nearly all of them) gets rejected.
-- Same story for workout_sets.exercise_id.
--
-- The exercise UUIDs are deterministic and shared across installs, so
-- soft references are safe — joining tables can still resolve names by
-- looking up the canonical id locally. Dropping the FK does not lose
-- meaningful integrity; it removes a constraint that was actively
-- preventing the user's data from ever reaching the cloud.

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'routine_exercises'::regclass
      AND contype = 'f'
      AND confrelid = 'exercises'::regclass
  LOOP
    EXECUTE 'ALTER TABLE routine_exercises DROP CONSTRAINT ' || quote_ident(c);
  END LOOP;
END $$;

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'workout_sets'::regclass
      AND contype = 'f'
      AND confrelid = 'exercises'::regclass
  LOOP
    EXECUTE 'ALTER TABLE workout_sets DROP CONSTRAINT ' || quote_ident(c);
  END LOOP;
END $$;

-- Some installs created `routine_exercises.exercise_id` and
-- `workout_sets.exercise_id` as UUID. Once the FK is gone, the column
-- type still constrains incoming values — local ids are UUID v4
-- strings so this is fine, but make the intent explicit by relaxing
-- the column to TEXT where it isn't already, so future canonical
-- exercise id schemes don't trip the cast.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routine_exercises' AND column_name = 'exercise_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE routine_exercises ALTER COLUMN exercise_id TYPE TEXT USING exercise_id::text;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_sets' AND column_name = 'exercise_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE workout_sets ALTER COLUMN exercise_id TYPE TEXT USING exercise_id::text;
  END IF;
END $$;
