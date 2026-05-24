-- Migration 020: custom_exercises table (library/custom split)
--
-- Safe to apply now. Creates a new table; no breaking change to the
-- existing exercises table. The old app continues to read + write
-- exercises unchanged. New app code (when shipped) writes custom
-- exercises to this new table instead, with composite PK preventing
-- cross-user collisions by construction.
--
-- Locked in docs/IDENTITY_AND_OWNERSHIP_LOCKED.md. The exercises
-- table is mixed-ownership (shared library rows have user_id NULL,
-- user customs have user_id set) which blocks the composite PK
-- pattern there (PK columns must be NOT NULL). Splitting into two
-- tables resolves it: exercises stays library-only, custom_exercises
-- carries per-user rows with the locked schema invariant.
--
-- Apply with: paste into Supabase Dashboard -> SQL Editor -> Run.

-- ─────────────────────────────────────────────────────────────────────
-- custom_exercises: per-user exercise rows, composite PK.
-- Same column shape as exercises so the app's display code paths
-- (ExerciseLibraryScreen, set entry pickers etc) can union the two
-- tables without column-mapping shims. Soft-delete via deleted_at so
-- the sync layer can propagate removals.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_exercises (
  id                       uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  primary_muscle           text,
  secondary_muscles        jsonb,
  equipment                text,
  movement_pattern         text,
  compound_isolation       text,
  default_rep_min          integer,
  default_rep_max          integer,
  fatigue_cost             integer,
  stimulus_to_fatigue_ratio integer,
  subregion                text,
  exercise_category        text,
  increment_kg             real,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_custom_exercises_user      ON custom_exercises(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_id        ON custom_exercises(id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_undeleted ON custom_exercises(user_id) WHERE deleted_at IS NULL;

ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own custom_exercises"   ON custom_exercises;
DROP POLICY IF EXISTS "Users can insert own custom_exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can update own custom_exercises" ON custom_exercises;
DROP POLICY IF EXISTS "Users can delete own custom_exercises" ON custom_exercises;

CREATE POLICY "Users can read own custom_exercises"
  ON custom_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom_exercises"
  ON custom_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom_exercises"
  ON custom_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom_exercises"
  ON custom_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- Defensive backfill: copy any rows from the legacy exercises table
-- that have a non-null user_id into custom_exercises. Those rows are
-- the historical "user customs" that should never have shared a table
-- with the library. Skip on conflict (composite PK) so re-running the
-- migration is idempotent. The originals in exercises are NOT deleted
-- here -- old app builds might still reference them by id and pulling
-- them out would orphan workout_sets / routine_exercises that point
-- at them. Cleanup of the legacy rows lands in a future migration
-- once the old app retires.
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO custom_exercises
  (id, user_id, name, primary_muscle, secondary_muscles, equipment,
   movement_pattern, compound_isolation, default_rep_min, default_rep_max,
   fatigue_cost, stimulus_to_fatigue_ratio, subregion, exercise_category,
   increment_kg, notes, created_at, updated_at)
SELECT
  id, user_id, name, primary_muscle, secondary_muscles, equipment,
  movement_pattern, compound_isolation, default_rep_min, default_rep_max,
  fatigue_cost, stimulus_to_fatigue_ratio, subregion, exercise_category,
  increment_kg, notes,
  COALESCE(created_at::timestamptz, now()),
  COALESCE(updated_at::timestamptz, now())
FROM exercises
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, id) DO NOTHING;
