-- Migration 012: complete cloud sync coverage
--
-- The previous architecture only synced ~13 of the user's 21 local
-- tables, none of their AsyncStorage prefs, and the synced tables
-- pushed an incomplete column set. Net effect: signing in on a new
-- device restored some data and silently lost the rest — workouts had
-- no name or volume totals, routines lost their exercise contents,
-- training blocks lost their planned volume, body profile / insights
-- / notes / goals never reached the cloud at all, and accessibility
-- + unit prefs reset to defaults.
--
-- This migration makes the cloud a complete superset of every user-
-- generated value the app holds, so a fresh install can recover the
-- exact state of the last device. Everything is additive — existing
-- rows are untouched, new columns default to NULL, new tables come
-- up empty.
--
-- Apply with: Supabase Dashboard → SQL Editor → paste → Run.
--
-- Pairs with local SQLite migrations v18 + v19 in src/lib/database.js.

-- ─── 1. Universal sync columns ───────────────────────────────────────────
-- Every user-owned table gets updated_at (last write wall-clock,
-- TIMESTAMPTZ) and deleted_at (soft-delete marker). Delta sync queries
-- WHERE updated_at > since; soft-deleted rows are filtered out by the
-- pull helper rather than physically removed, so a delete made on
-- device A propagates to device B without leaving the row resurrected
-- by an in-flight push.

-- Two passes: (1) add the universal updated_at + deleted_at columns
-- on every user-owned table, (2) add the (user_id, updated_at) index
-- on tables that actually carry user_id. routine_exercises owns its
-- user via routine_id → routines.user_id; mesocycle_weeks via
-- mesocycle_id → mesocycles.user_id. Those rows don't need their own
-- user_id index — a delta pull joins through the parent.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workouts', 'workout_sets', 'routines', 'programmes',
    'routine_exercises', 'mesocycles', 'mesocycle_weeks',
    'nutrition_targets', 'body_metrics', 'morning_weights',
    'weekly_checkins_v2', 'coach_outputs', 'exercises',
    'user_body_profile', 'exercise_user_notes'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', t);
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workouts', 'workout_sets', 'routines', 'programmes',
    'mesocycles',
    'nutrition_targets', 'body_metrics', 'morning_weights',
    'weekly_checkins_v2', 'coach_outputs', 'exercises',
    'exercise_user_notes'
  ]
  LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_user_updated ON %I(user_id, updated_at DESC) WHERE deleted_at IS NULL',
      t, t
    );
  END LOOP;
END $$;

-- routine_exercises uses (routine_id, updated_at) for the delta
-- query path. mesocycle_weeks uses (mesocycle_id, updated_at).
-- user_body_profile is one row per user (PK = user_id), so a
-- compound index would duplicate the PK; skipped.
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_updated
  ON routine_exercises(routine_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mesocycle_weeks_meso_updated
  ON mesocycle_weeks(mesocycle_id, updated_at DESC) WHERE deleted_at IS NULL;

-- ─── 2. Denormalised exercise name on FK-bearing rows ────────────────────
-- routine_exercises.exercise_id and workout_sets.exercise_id are
-- references to the canonical exercise UUID. A previous build minted
-- those UUIDs randomly per device (now fixed via deterministic IDs in
-- seedExercises.js), but for any data already in the cloud the
-- references can't resolve on a new device. Storing the exercise NAME
-- alongside the id gives the pull side a fallback path: look up the
-- local exercise with the same name and rewrite the id at insert.

ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS exercise_name TEXT;
ALTER TABLE workout_sets      ADD COLUMN IF NOT EXISTS exercise_name TEXT;

-- ─── 3. Missing columns on partially-synced tables ───────────────────────
-- These columns hold user-entered data that the previous push helpers
-- didn't carry. Adding them allows the sync layer to be column-
-- complete for every row.

ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS pre_workout_intent TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_elapsed_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS set_count INTEGER,
  ADD COLUMN IF NOT EXISTS total_volume NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS mesocycle_week_id TEXT,
  ADD COLUMN IF NOT EXISTS joint_discomfort INTEGER;

ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS missed_reps INTEGER;

ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS next_workout_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT,
  ADD COLUMN IF NOT EXISTS split_type TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS difficulty INTEGER;

ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

ALTER TABLE mesocycles
  ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'offseason_hypertrophy',
  ADD COLUMN IF NOT EXISTS planned_weeks INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS deload_protocol TEXT DEFAULT 'rp_classic',
  ADD COLUMN IF NOT EXISTS rir_ladder TEXT DEFAULT '[3,2,1,0,4]',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS auto_regulation_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS goals TEXT;

ALTER TABLE mesocycle_weeks
  ADD COLUMN IF NOT EXISTS week_start_date DATE;

ALTER TABLE weekly_checkins_v2
  ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS subregion TEXT,
  ADD COLUMN IF NOT EXISTS compound_isolation TEXT,
  ADD COLUMN IF NOT EXISTS default_rep_min INTEGER,
  ADD COLUMN IF NOT EXISTS default_rep_max INTEGER,
  ADD COLUMN IF NOT EXISTS exercise_category TEXT DEFAULT 'compound',
  ADD COLUMN IF NOT EXISTS increment_kg NUMERIC(4, 2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE body_metrics
  ADD COLUMN IF NOT EXISTS thigh NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS ham NUMERIC(5, 2);
-- (quads + hamstrings already exist; thigh/ham added for the JS
-- variable names the push layer historically used. Either set is
-- safe to write to. Pull prefers quads/hamstrings.)

-- ─── 4. New tables for previously local-only data ────────────────────────

-- User body profile — sex, dob, height, training experience, goal.
-- These drive Coach Builder, nutrition targets, and strength
-- standards. A new install without them falls back to onboarding.
CREATE TABLE IF NOT EXISTS user_body_profile (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sex              TEXT,
  date_of_birth    TEXT,
  height_cm        NUMERIC(5, 1),
  experience_level TEXT,
  training_age_years NUMERIC(4, 1),
  primary_goal     TEXT,
  scoff_score      INTEGER,
  gdpr_consented   BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);
-- Already exists as a partial table from setup_complete.sql, so the
-- CREATE IF NOT EXISTS above just no-ops on those installs. The
-- ALTER columns below cover any column gaps.
ALTER TABLE user_body_profile
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS training_age_years NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS primary_goal TEXT,
  ADD COLUMN IF NOT EXISTS scoff_score INTEGER,
  ADD COLUMN IF NOT EXISTS gdpr_consented BOOLEAN DEFAULT FALSE;

-- Insights generated by insightsEngine — dismissable coaching cards.
-- Synced so a dismissal on device A doesn't reappear on device B.
CREATE TABLE IF NOT EXISTS user_insights (
  id              TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_key     TEXT NOT NULL,
  type            TEXT,
  severity        INTEGER,
  copy            TEXT,
  action_payload  TEXT,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(user_id, insight_key)
);

-- Planned muscle volume per mesocycle week. Restores the block
-- dashboard's "planned 12 sets of side delts this week" view.
CREATE TABLE IF NOT EXISTS planned_muscle_volume (
  id                  TEXT PRIMARY KEY,
  mesocycle_week_id   TEXT NOT NULL,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muscle              TEXT NOT NULL,
  planned_sets        INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_planned_volume_user ON planned_muscle_volume(user_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Adaptation events — block-level training events (deload triggered,
-- volume bumped, etc.). Drives the mesocycle timeline.
CREATE TABLE IF NOT EXISTS adaptation_events (
  id                  TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mesocycle_week_id   TEXT,
  event_type          TEXT NOT NULL,
  payload             TEXT,
  recorded_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_adaptation_events_user ON adaptation_events(user_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Peak week plans — Pro contest prep config.
CREATE TABLE IF NOT EXISTS peak_week_plans (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_date         TEXT,
  federation        TEXT,
  current_bodyweight NUMERIC(5, 2),
  lean_estimate     NUMERIC(5, 2),
  prep_carbs_per_kg NUMERIC(4, 2),
  prep_sodium_mg    NUMERIC(7, 0),
  prep_water_l      NUMERIC(4, 2),
  status            TEXT DEFAULT 'active',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- Exercise user notes — per-exercise free text the user typed.
-- exercise_user_notes already exists in setup_complete.sql; this
-- block just ensures sync columns are present.
ALTER TABLE exercise_user_notes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Workout notes — per-workout free text.
CREATE TABLE IF NOT EXISTS workout_notes (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id  TEXT NOT NULL,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workout_notes_user ON workout_notes(user_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Exercise goals — per-exercise target weights / dates.
CREATE TABLE IF NOT EXISTS exercise_goals (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL,
  target_weight NUMERIC(6, 2),
  target_reps   INTEGER,
  target_date   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_exercise_goals_user ON exercise_goals(user_id, updated_at DESC) WHERE deleted_at IS NULL;

-- ─── 5. User preferences (key-value) ─────────────────────────────────────
-- AsyncStorage-style settings sync via a generic key-value table.
-- Adding a new pref doesn't need a schema migration — the app picks
-- it up automatically. Last-write-wins via updated_at.
CREATE TABLE IF NOT EXISTS user_prefs (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_updated ON user_prefs(user_id, updated_at DESC);

-- ─── 6. RLS policies for every new table ─────────────────────────────────
-- Each table follows the same shape: enable RLS, drop any prior
-- policy of the same name (idempotent re-runs), recreate the
-- "users manage own rows" policy.

ALTER TABLE user_insights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_muscle_volume ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptation_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_week_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prefs            ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_insights', 'planned_muscle_volume', 'adaptation_events',
    'peak_week_plans', 'workout_notes', 'exercise_goals', 'user_prefs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users manage own %s" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "Users manage own %s" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      t, t
    );
  END LOOP;
END $$;
