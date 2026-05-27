-- ─────────────────────────────────────────────────────────────────
-- Volyume test-project bootstrap bundle (auto-generated).
--
-- Paste this whole file into the SQL Editor of a THROWAWAY
-- Supabase test project (NEVER production), then click Run once.
-- The bundle concatenates setup_complete.sql + every migrate_006
-- through migrate_047 file in numeric order, each separated by a
-- comment banner naming the source file so any error points at
-- the right original.
--
-- Every block is idempotent (CREATE TABLE IF NOT EXISTS, ADD
-- COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION, DROP/CREATE
-- TRIGGER). Re-running on an already-bootstrapped project is a
-- no-op (no rows changed; no errors raised).
--
-- After running this bundle, also paste:
--   supabase/audit_cloud_schema_drift.sql
-- to confirm every column the sync handlers expect is present.
-- ─────────────────────────────────────────────────────────────────

-- ═════════════════════════════════════════════════════════════════
-- BEGIN setup_complete.sql
-- ═════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
--  Volyume — complete Supabase setup
--  Run this once in the Supabase SQL editor.
--  Idempotent: safe to re-run; existing tables/columns/policies are skipped.
--
--  Consolidates schema.sql + migrate_001..005 into a single defensive script.
--  Covers:
--    1. All 16 tables (users_profile, exercises, routines, ... weekly_checkins,
--       autoregulation_suggestions)
--    2. Profile column additions: first_name, tier, bar_weight, is_beta_tester,
--       tension_at_stretch on exercises
--    3. RLS enabled on every table
--    4. Every FOR ALL policy rebuilt with WITH CHECK
--    5. tier lockdown trigger (clients can't UPDATE their own tier)
--    6. delete_user_data() GDPR RPC covering every table
--    7. Indexes (idx_workouts_user_started, etc.)
-- ──────────────────────────────────────────────────────────────────────────


-- ═══ 1. TABLES ════════════════════════════════════════════════════════════
-- Each CREATE TABLE uses IF NOT EXISTS so it doesn't disturb existing tables.

CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  first_name TEXT,
  training_focus TEXT DEFAULT 'bodybuilding',
  training_age NUMERIC,
  primary_equipment TEXT,
  units TEXT DEFAULT 'kg',
  tier TEXT DEFAULT 'free',
  bar_weight NUMERIC DEFAULT 20,
  is_beta_tester BOOLEAN DEFAULT FALSE,
  goal_start_date TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add columns to users_profile that older schemas may be missing.
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS bar_weight NUMERIC DEFAULT 20,
  ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS goal_start_date TIMESTAMPTZ,
  -- first_run_complete persists the onboarding-done state to the cloud so a
  -- user who signs in on a new device doesn't have to redo the wizard.
  ADD COLUMN IF NOT EXISTS first_run_complete BOOLEAN DEFAULT FALSE;

-- Widen training_age to NUMERIC if it was originally INTEGER
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users_profile' AND column_name = 'training_age'
               AND data_type = 'integer') THEN
    ALTER TABLE users_profile ALTER COLUMN training_age TYPE NUMERIC USING training_age::NUMERIC;
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  aliases TEXT[],
  primary_muscle TEXT NOT NULL,
  secondary_muscles JSONB,
  equipment TEXT,
  movement_pattern TEXT,
  compound_isolation TEXT DEFAULT 'isolation',
  unilateral_bilateral TEXT DEFAULT 'bilateral',
  default_rep_min INTEGER DEFAULT 6,
  default_rep_max INTEGER DEFAULT 12,
  valid_set_types TEXT[] DEFAULT ARRAY['straight', 'dropset', 'superset', 'myo_reps'],
  resistance_profile TEXT,
  fatigue_cost INTEGER DEFAULT 1,
  stimulus_to_fatigue_ratio INTEGER DEFAULT 3,
  injury_sensitivity TEXT,
  tension_at_stretch TEXT DEFAULT 'medium' CHECK(tension_at_stretch IN ('high', 'medium', 'low')),
  substitute_exercise_ids UUID[],
  notes TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS tension_at_stretch TEXT DEFAULT 'medium'
    CHECK(tension_at_stretch IN ('high', 'medium', 'low'));


CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  split_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  order_in_routine INTEGER,
  recommended_sets INTEGER DEFAULT 3,
  recommended_reps_min INTEGER DEFAULT 6,
  recommended_reps_max INTEGER DEFAULT 12,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS mesocycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_weeks INTEGER,
  focus TEXT,
  goals TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  deload_week INTEGER,
  auto_regulation_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS mesocycle_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_start_date DATE,
  is_deload BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  routine_id UUID REFERENCES routines(id),
  mesocycle_id UUID REFERENCES mesocycles(id),
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  notes TEXT,
  session_difficulty INTEGER,
  overall_pump INTEGER,
  soreness_24h_before INTEGER,
  fatigue_level INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP
);


CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  set_type TEXT DEFAULT 'straight',
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  actual_reps INTEGER NOT NULL,
  weight NUMERIC(6, 2),
  rir INTEGER,
  rpe INTEGER,
  failed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  post_set_pump INTEGER,
  post_set_muscle_connection INTEGER,
  joint_discomfort INTEGER,
  is_amrap BOOLEAN DEFAULT FALSE,
  amrap_reps INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS volume_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  muscle_group TEXT NOT NULL,
  mev INTEGER,
  mav INTEGER,
  mrv INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, muscle_group)
);


CREATE TABLE IF NOT EXISTS weekly_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_ending_date DATE NOT NULL,
  muscle_group TEXT NOT NULL,
  total_hard_sets INTEGER,
  total_reps INTEGER,
  estimated_tonnage NUMERIC(10, 2),
  mev_status TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_ending_date, muscle_group)
);


CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  record_type TEXT NOT NULL,
  value NUMERIC(10, 2),
  reps INTEGER,
  total_sets INTEGER,
  total_tonnage NUMERIC(12, 2),
  achieved_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  metric_date DATE NOT NULL,
  body_weight NUMERIC(5, 2),
  chest NUMERIC(5, 2),
  shoulders NUMERIC(5, 2),
  arms NUMERIC(5, 2),
  forearms NUMERIC(5, 2),
  waist NUMERIC(5, 2),
  hips NUMERIC(5, 2),
  quads NUMERIC(5, 2),
  hamstrings NUMERIC(5, 2),
  calves NUMERIC(5, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL,
  pose TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  achievement_type TEXT,
  achieved_date DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  checkin_date DATE NOT NULL,
  energy_score INTEGER CHECK(energy_score BETWEEN 1 AND 5),
  sleep_hours NUMERIC(3,1),
  sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 5),
  life_stress INTEGER CHECK(life_stress BETWEEN 1 AND 5),
  training_motivation INTEGER CHECK(training_motivation BETWEEN 1 AND 5),
  recovery_rating TEXT CHECK(recovery_rating IN ('poor', 'average', 'good')),
  refeed_day BOOLEAN DEFAULT FALSE,
  adherence_calories TEXT CHECK(adherence_calories IN ('yes', 'mostly', 'no')),
  adherence_protein TEXT CHECK(adherence_protein IN ('yes', 'mostly', 'no')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);


CREATE TABLE IF NOT EXISTS autoregulation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  suggestion_type TEXT,
  muscle_group TEXT,
  suggestion_text TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


-- ─── Tables added for full Pro sync coverage ──────────────────────────────
-- These are sync targets for the Pro user's local-first state. Schemas are
-- intentionally permissive (TEXT for ids that are uid()-generated locally,
-- TIMESTAMPTZ for time fields) so the sync layer doesn't have to coerce.

CREATE TABLE IF NOT EXISTS programmes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  is_library BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  source_programme_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS morning_weights (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  weight_kg NUMERIC(5, 2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, logged_at)
);

-- coach_outputs stores the JSON output of weeklyCoach for each week so it
-- can be replayed / referenced on a new device.
CREATE TABLE IF NOT EXISTS coach_outputs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_start BIGINT NOT NULL,                  -- ms epoch, Monday-anchored
  output_json TEXT NOT NULL,                   -- full runWeeklyCoach output
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE TABLE IF NOT EXISTS user_body_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  height_cm NUMERIC(5, 1),
  birth_date DATE,
  biological_sex TEXT CHECK(biological_sex IN ('male', 'female', 'other')),
  activity_level TEXT,
  goal TEXT,
  target_weight_kg NUMERIC(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_user_notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  exercise_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Volyume's local weekly_checkins schema captures everything the coach
-- engine reads. The pre-existing weekly_checkins from schema.sql had a
-- different shape (sleep_quality, life_stress, refeed_day etc.) intended
-- for an earlier check-in design. To avoid breaking either consumer, the
-- sync layer writes to a new `weekly_checkins_v2` table whose columns
-- match runWeeklyCoach's expected input exactly.
CREATE TABLE IF NOT EXISTS weekly_checkins_v2 (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_start BIGINT NOT NULL,                  -- Monday-anchored ms epoch
  energy_score INTEGER CHECK(energy_score BETWEEN 1 AND 5),
  soreness_score INTEGER CHECK(soreness_score BETWEEN 1 AND 5),
  stress_score INTEGER CHECK(stress_score BETWEEN 1 AND 5),
  sleep_hours NUMERIC(3, 1),
  cals_adherence TEXT,                          -- hit / under / over / untracked
  steps_adherence TEXT,
  training_performance TEXT,
  joint_pain BOOLEAN DEFAULT FALSE,
  sore_muscles TEXT,
  cycle_override BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ─── Debug logs (beta diagnostics) ────────────────────────────────────────
-- Auto-shipped from the on-device error-log ring buffer so beta testers'
-- failures land in your Supabase dashboard for analysis. user_id is
-- nullable so anon / local users can also ship logs. Service role reads
-- in the dashboard; users only insert their own rows.
CREATE TABLE IF NOT EXISTS debug_log_uploads (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  device_id TEXT,                  -- @volyume_local_user_id when no auth
  ts BIGINT NOT NULL,              -- ms since epoch from the device clock
  level TEXT NOT NULL,             -- 'error' | 'warn' | 'info'
  scope TEXT,
  message TEXT,
  stack TEXT,
  context TEXT,
  app_version TEXT,
  platform TEXT,                   -- 'android' | 'ios' | 'web'
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debug_log_uploads_uploaded ON debug_log_uploads(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_log_uploads_user_ts  ON debug_log_uploads(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_debug_log_uploads_level    ON debug_log_uploads(level, uploaded_at DESC);


-- ═══ 2. ROW LEVEL SECURITY (always-on) ════════════════════════════════════
-- ENABLE is idempotent; safe to re-run.

ALTER TABLE debug_log_uploads ENABLE ROW LEVEL SECURITY;
-- Anyone (anon + authenticated) can INSERT. Reads are service-role only,
-- so the dashboard query works but clients can't peek at other users'
-- logs. SELECT not permitted at all from the client side.
DROP POLICY IF EXISTS "Anyone can insert debug logs" ON debug_log_uploads;
CREATE POLICY "Anyone can insert debug logs" ON debug_log_uploads
  FOR INSERT WITH CHECK (true);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesocycle_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoregulation_suggestions ENABLE ROW LEVEL SECURITY;

-- Pro sync tables (added across later migrations — must be RLS-protected
-- or any authenticated user can read/write each other's data)
ALTER TABLE programmes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE morning_weights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_outputs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_body_profile       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_user_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins_v2      ENABLE ROW LEVEL SECURITY;


-- ═══ 3. RLS POLICIES (with WITH CHECK) ═══════════════════════════════════
-- DROP + CREATE ensures any older USING-only policy is replaced.

DROP POLICY IF EXISTS "Users can read/write own profile" ON users_profile;
CREATE POLICY "Users can read/write own profile" ON users_profile
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- exercises has TWO policies — one for canonical (user_id IS NULL) read, one for own custom
DROP POLICY IF EXISTS "Anyone can read canonical exercises" ON exercises;
CREATE POLICY "Anyone can read canonical exercises" ON exercises
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own custom exercises" ON exercises;
CREATE POLICY "Users can manage own custom exercises" ON exercises
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own routines" ON routines;
CREATE POLICY "Users can manage own routines" ON routines
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own routine exercises" ON routine_exercises;
CREATE POLICY "Users can manage own routine exercises" ON routine_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage own mesocycles" ON mesocycles;
CREATE POLICY "Users can manage own mesocycles" ON mesocycles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own mesocycle weeks" ON mesocycle_weeks;
CREATE POLICY "Users can manage own mesocycle weeks" ON mesocycle_weeks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesocycles WHERE id = mesocycle_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM mesocycles WHERE id = mesocycle_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage own workouts" ON workouts;
CREATE POLICY "Users can manage own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own sets" ON workout_sets;
CREATE POLICY "Users can manage own sets" ON workout_sets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own landmarks" ON volume_landmarks;
CREATE POLICY "Users can manage own landmarks" ON volume_landmarks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own weekly volumes" ON weekly_volumes;
CREATE POLICY "Users can manage own weekly volumes" ON weekly_volumes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own PRs" ON personal_records;
CREATE POLICY "Users can manage own PRs" ON personal_records
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own body metrics" ON body_metrics;
CREATE POLICY "Users can manage own body metrics" ON body_metrics
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own photos" ON progress_photos;
CREATE POLICY "Users can manage own photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own achievements" ON achievements;
CREATE POLICY "Users can manage own achievements" ON achievements
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own checkins" ON weekly_checkins;
CREATE POLICY "Users can manage own checkins" ON weekly_checkins
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own autoregulation suggestions" ON autoregulation_suggestions;
CREATE POLICY "Users can manage own autoregulation suggestions" ON autoregulation_suggestions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Pro sync table policies (mirrored from migrate_007) ──────────────

DROP POLICY IF EXISTS "Users can manage own programmes" ON programmes;
CREATE POLICY "Users can manage own programmes" ON programmes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own morning weights" ON morning_weights;
CREATE POLICY "Users can manage own morning weights" ON morning_weights
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own coach outputs" ON coach_outputs;
CREATE POLICY "Users can manage own coach outputs" ON coach_outputs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own body profile" ON user_body_profile;
CREATE POLICY "Users can manage own body profile" ON user_body_profile
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own exercise notes" ON exercise_user_notes;
CREATE POLICY "Users can manage own exercise notes" ON exercise_user_notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own v2 checkins" ON weekly_checkins_v2;
CREATE POLICY "Users can manage own v2 checkins" ON weekly_checkins_v2
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ═══ 4. tier lockdown trigger ════════════════════════════════════════════
-- Reverts any client UPDATE that tries to change the `tier` column.
-- Service-role calls (Stripe webhook, edge function) have auth.uid()=NULL
-- and bypass the lock so legitimate upgrades still go through.

CREATE OR REPLACE FUNCTION protect_users_profile_tier()
RETURNS TRIGGER AS $func$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.tier IS DISTINCT FROM OLD.tier THEN
        NEW.tier := OLD.tier;
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      -- New profiles must start as 'free'; only service role can
      -- promote them (auth.uid() IS NULL bypasses this branch).
      IF NEW.tier IS DISTINCT FROM 'free' THEN
        NEW.tier := 'free';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS users_profile_protect_tier ON users_profile;
CREATE TRIGGER users_profile_protect_tier
  BEFORE INSERT OR UPDATE ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION protect_users_profile_tier();


-- ═══ 5. INDEXES ══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_workouts_user_started      ON workouts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_routine           ON workouts(routine_id);
CREATE INDEX IF NOT EXISTS idx_workouts_mesocycle         ON workouts(mesocycle_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout       ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise      ON workout_sets(exercise_id, user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle           ON exercises(primary_muscle);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine  ON routine_exercises(routine_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_mesocycle_weeks_mesocycle  ON mesocycle_weeks(mesocycle_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_ex   ON personal_records(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_weekly_volumes_user_date   ON weekly_volumes(user_id, week_ending_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user_date  ON weekly_checkins(user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date     ON body_metrics(user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date  ON progress_photos(user_id, photo_date DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user_date     ON achievements(user_id, achieved_date DESC);
CREATE INDEX IF NOT EXISTS idx_autoreg_workout            ON autoregulation_suggestions(workout_id, user_id);
CREATE INDEX IF NOT EXISTS idx_volume_landmarks_user      ON volume_landmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user             ON exercises(user_id) WHERE user_id IS NOT NULL;


-- ═══ 6. delete_user_data RPC (GDPR) ══════════════════════════════════════
-- Covers every user-owned table; cascades handle child tables.
-- Each DELETE is wrapped to skip tables that don't exist on partial schemas.

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

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='autoregulation_suggestions')
    THEN DELETE FROM autoregulation_suggestions WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='achievements')
    THEN DELETE FROM achievements                WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='progress_photos')
    THEN DELETE FROM progress_photos             WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='body_metrics')
    THEN DELETE FROM body_metrics                WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='weekly_volumes')
    THEN DELETE FROM weekly_volumes              WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='personal_records')
    THEN DELETE FROM personal_records            WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='weekly_checkins')
    THEN DELETE FROM weekly_checkins             WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='volume_landmarks')
    THEN DELETE FROM volume_landmarks            WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='workouts')
    THEN DELETE FROM workouts                    WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='mesocycles')
    THEN DELETE FROM mesocycles                  WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='routines')
    THEN DELETE FROM routines                    WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='exercises')
    THEN DELETE FROM exercises                   WHERE user_id = uid; END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users_profile')
    THEN DELETE FROM users_profile               WHERE id = uid; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;


-- ═══ 7. Sanity check ═════════════════════════════════════════════════════
-- Pop this in a separate query when you're done to confirm everything is in place.
--
--   SELECT
--     (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename IN (
--       'users_profile','exercises','routines','routine_exercises','mesocycles',
--       'mesocycle_weeks','workouts','workout_sets','volume_landmarks',
--       'weekly_volumes','personal_records','body_metrics','progress_photos',
--       'achievements','weekly_checkins','autoregulation_suggestions'))                 AS tables_present,
--     (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
--        AND qual IS NOT NULL AND with_check IS NOT NULL)                              AS policies_with_check,
--     (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'users_profile_protect_tier')    AS tier_trigger;
--
-- Expect: tables_present = 16, policies_with_check >= 15, tier_trigger = 1.


-- END setup_complete.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_006_delete_rpc_v2.sql
-- ═════════════════════════════════════════════════════════════════

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


-- END migrate_006_delete_rpc_v2.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_007_pro_rls_hardening.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 007: RLS on Pro sync tables + tier trigger hardening
-- Critical security fix flagged by audit.
--
-- The Pro sync tables added across recent migrations were never granted
-- RLS or policies in setup_complete.sql. This means any authenticated
-- user could read, update, or delete other users' data in:
--
--   programmes              — every user's plans
--   morning_weights         — every user's body weight log
--   coach_outputs           — every user's weekly coach JSON
--   user_body_profile       — every user's body screening
--   exercise_user_notes     — every user's personal exercise notes
--   weekly_checkins_v2      — every user's coach check-in answers
--
-- This migration:
--   1. Enables RLS on all six tables.
--   2. Adds "manage own rows" policies keyed on auth.uid() = user_id.
--   3. Extends the tier-lockdown trigger to fire on INSERT as well as
--      UPDATE, closing a defense-in-depth gap where a client INSERT
--      with tier='pro' would slip past the BEFORE-UPDATE-only guard
--      if the RLS WITH CHECK ever loosened.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ── 1. RLS enable for the six previously-unprotected tables ───────────

ALTER TABLE programmes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE morning_weights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_outputs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_body_profile       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_user_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins_v2      ENABLE ROW LEVEL SECURITY;

-- ── 2. Own-row policies ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can manage own programmes" ON programmes;
CREATE POLICY "Users can manage own programmes" ON programmes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own morning weights" ON morning_weights;
CREATE POLICY "Users can manage own morning weights" ON morning_weights
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own coach outputs" ON coach_outputs;
CREATE POLICY "Users can manage own coach outputs" ON coach_outputs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own body profile" ON user_body_profile;
CREATE POLICY "Users can manage own body profile" ON user_body_profile
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own exercise notes" ON exercise_user_notes;
CREATE POLICY "Users can manage own exercise notes" ON exercise_user_notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own v2 checkins" ON weekly_checkins_v2;
CREATE POLICY "Users can manage own v2 checkins" ON weekly_checkins_v2
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Tier-lockdown trigger: also reject INSERTs with tier != 'free' ─
-- Existing migrate_005 trigger covers UPDATE. Without an INSERT leg, a
-- client could (in theory) sneak a tier='pro' row past the trigger
-- during initial profile creation. RLS WITH CHECK on users_profile
-- already enforces auth.uid() = id, but the tier value itself was
-- only constrained at update time. Belt + braces.

CREATE OR REPLACE FUNCTION protect_users_profile_tier()
RETURNS TRIGGER AS $func$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.tier IS DISTINCT FROM OLD.tier THEN
        NEW.tier := OLD.tier;
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      -- New profiles must start as 'free'; only service role can
      -- promote them (auth.uid() IS NULL bypasses this branch).
      IF NEW.tier IS DISTINCT FROM 'free' THEN
        NEW.tier := 'free';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS users_profile_protect_tier ON users_profile;
CREATE TRIGGER users_profile_protect_tier
  BEFORE INSERT OR UPDATE ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION protect_users_profile_tier();

-- ── 4. Indexes for common Pro-table query paths ──────────────────────
-- Without these, every coach-output read or weekly-checkin pull does a
-- full-table scan filtered by the RLS policy. Adding composite indexes
-- on (user_id, time-key) so the optimizer can use them directly.

CREATE INDEX IF NOT EXISTS idx_morning_weights_user_ts
  ON morning_weights(user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_outputs_user_week
  ON coach_outputs(user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_checkins_v2_user_week
  ON weekly_checkins_v2(user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_programmes_user_active
  ON programmes(user_id, is_active);


-- END migrate_007_pro_rls_hardening.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_008_delete_rpc_tolerant.sql
-- ═════════════════════════════════════════════════════════════════

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


-- END migrate_008_delete_rpc_tolerant.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_009_nutrition_targets.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 009: nutrition_targets cloud table
--
-- The app stores each user's calculated nutrition targets in a local
-- SQLite nutrition_targets table, but the matching Supabase table was
-- never created. As a result, signing into an existing account on a
-- fresh device restores workouts, plans and weight history but the
-- nutrition page reads as if it had never been filled in.
--
-- This migration adds the cloud table, RLS, and ownership policy so
-- push + pull can persist targets across devices.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

CREATE TABLE IF NOT EXISTS nutrition_targets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bmr             real,
  tdee            real,
  target_kcal     real,
  protein_g       real,
  carbs_g         real,
  fat_g           real,
  phase           text,
  bmr_method      text,
  activity_level  text,
  confidence      text,
  warnings        jsonb,
  gdpr_consented  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_targets_user ON nutrition_targets(user_id);

-- One active target row per user is the local invariant. Mirror it
-- here so an upsert from a second device doesn't create duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_nutrition_targets_user ON nutrition_targets(user_id);

ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own nutrition targets" ON nutrition_targets;
CREATE POLICY "Users can manage own nutrition targets" ON nutrition_targets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- END migrate_009_nutrition_targets.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_010_sync_completeness.sql
-- ═════════════════════════════════════════════════════════════════

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


-- END migrate_010_sync_completeness.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_012_complete_sync.sql
-- ═════════════════════════════════════════════════════════════════

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


-- END migrate_012_complete_sync.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_013_user_feedback.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 013: user feedback table
--
-- Single source of truth for sentiment + bug reports collected from
-- the in-app feedback sheet. Every row is auto-enriched with session
-- id, build identity, recent breadcrumbs, last error — so a manual
-- pass through the table tells you not just "this is broken" but
-- "this is broken on iOS 17, app version 1.2, in screen X, with
-- error Y happening in the last 60s before submission."
--
-- The companion view (v_feedback_weekly_digest) groups by
-- (sentiment, screen, app_version) so you can answer "which screen
-- gets the most 'confusing' reports in this release" without
-- reading a single message body.

CREATE TABLE IF NOT EXISTS user_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ts            TIMESTAMPTZ DEFAULT NOW(),

  -- Trigger: where in the app the feedback came from.
  -- 'contextual' = post-event prompt (workout complete, plan
  -- generated, etc.)
  -- 'shake'      = power-user shake-to-report
  -- 'settings'   = intentional Settings → Send feedback
  -- 'crash_recovery' = banner after a previous-session crash
  trigger       TEXT NOT NULL,

  -- Sentiment chip selected. Five chips keeps the choice
  -- low-friction; "love" and "buggy" are the two we filter for
  -- when doing release-health checks.
  sentiment     TEXT NOT NULL CHECK (sentiment IN ('love', 'helpful', 'confusing', 'slow', 'buggy')),

  -- Optional free text. Capped at 500 chars by the UI; the column
  -- allows more so we don't reject longer rants if someone has
  -- something to say.
  message       TEXT,

  -- Auto-attached at submission. None of these are user-typed.
  session_id    TEXT,
  app_version   TEXT,
  build_number  TEXT,
  platform      TEXT,
  commit_sha    TEXT,
  runtime_version TEXT,

  -- Context: where they were, what they just did, what was wrong.
  screen          TEXT,
  recent_screens  JSONB,    -- last ~10 screen names + ts
  recent_actions  JSONB,    -- last ~20 store actions + ts
  last_error      JSONB,    -- last error in the last 60s if any
  session_age_ms  BIGINT,   -- how long the session ran before they reported

  -- Auto-computed tags for grouping in the dashboard.
  tags          TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_ts ON user_feedback(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_sentiment ON user_feedback(sentiment, ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_version ON user_feedback(app_version, ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_screen ON user_feedback(screen, ts DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- Users can INSERT their own row. They cannot read or update any row
-- (their own or anyone else's) — feedback is fire-and-forget from
-- their side. Dashboard reads run as the service role.

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON user_feedback;
CREATE POLICY "Users insert own feedback" ON user_feedback
  FOR INSERT
  WITH CHECK (
    -- Anonymous reports are allowed (user_id IS NULL); authenticated
    -- reports must match the calling user.
    auth.uid() = user_id OR user_id IS NULL
  );

-- ─── Weekly digest view ───────────────────────────────────────────────────
-- The "do it without manual work" surface. One query and you see the
-- top patterns of the week:
--   - Which (sentiment, screen, version) buckets are biggest?
--   - How many of each bucket had a recent error?
--   - What did the users actually say?
--
-- Run from the Supabase SQL Editor or hook into a Slack/email digest.

CREATE OR REPLACE VIEW v_feedback_weekly_digest AS
SELECT
  sentiment,
  screen,
  app_version,
  platform,
  COUNT(*) AS cnt,
  COUNT(last_error) AS cnt_with_error,
  COUNT(message) AS cnt_with_message,
  -- The first 5 messages so you can scan-read sentiment at a
  -- glance without paging through every row.
  array_agg(message) FILTER (WHERE message IS NOT NULL) AS sample_messages,
  array_agg(DISTINCT unnest_tag) AS all_tags
FROM user_feedback
LEFT JOIN LATERAL unnest(tags) AS unnest_tag ON true
WHERE ts > NOW() - INTERVAL '7 days'
GROUP BY sentiment, screen, app_version, platform
ORDER BY cnt DESC;

-- ─── Error-correlation view ───────────────────────────────────────────────
-- When feedback comes with a recent error attached, the user
-- effectively reported a Sentry-grouped issue. This view stitches
-- the two together: error fingerprint × user sentiment.

CREATE OR REPLACE VIEW v_feedback_error_correlation AS
SELECT
  last_error->>'message' AS error_message,
  screen,
  app_version,
  COUNT(*) AS cnt_reports,
  COUNT(*) FILTER (WHERE sentiment IN ('buggy', 'slow')) AS cnt_negative,
  COUNT(*) FILTER (WHERE sentiment IN ('love', 'helpful')) AS cnt_positive,
  MIN(ts) AS first_seen,
  MAX(ts) AS last_seen
FROM user_feedback
WHERE last_error IS NOT NULL
GROUP BY last_error->>'message', screen, app_version
ORDER BY cnt_reports DESC;


-- END migrate_013_user_feedback.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_014_feedback_view_hardening.sql
-- ═════════════════════════════════════════════════════════════════

-- Migrate 014: lock down the feedback dashboard views
-- ─────────────────────────────────────────────────────────────────────
--
-- migrate_013_user_feedback.sql created two views in the public schema:
--   v_feedback_weekly_digest
--   v_feedback_error_correlation
--
-- Both pull user_feedback.message and user_feedback.last_error, which
-- contain user-typed text and (potentially) Sentry-grouped error
-- messages from other users' sessions.
--
-- By default, a Postgres view runs as the view OWNER, not the calling
-- role. That means the underlying RLS on user_feedback (insert-only
-- by authenticated users) is BYPASSED on read for anyone who can
-- SELECT the view. Since both views were created in the public schema
-- and not explicitly locked down, any authenticated client could read
-- every user's feedback messages by querying the view directly.
--
-- This migration:
--   1. Sets security_invoker = true on both views so they respect the
--      calling user's RLS (Postgres 15+).
--   2. Revokes SELECT from anon + authenticated as a belt-and-braces
--      so even pre-PG15 deployments are safe.
--   3. Grants SELECT to service_role only (used by the dashboard /
--      digest scripts that should be the only readers of these views).

-- Step 1: security_invoker (Postgres 15+; ignored harmlessly on older).
DO $$
BEGIN
  BEGIN
    ALTER VIEW public.v_feedback_weekly_digest SET (security_invoker = true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'security_invoker not available, falling back to REVOKE: %', SQLERRM;
  END;
  BEGIN
    ALTER VIEW public.v_feedback_error_correlation SET (security_invoker = true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'security_invoker not available, falling back to REVOKE: %', SQLERRM;
  END;
END $$;

-- Step 2: hard-revoke read access from the API roles.
REVOKE ALL ON public.v_feedback_weekly_digest      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.v_feedback_error_correlation  FROM PUBLIC, anon, authenticated;

-- Step 3: only the service role (SQL editor / cron / scheduled
-- functions) gets to read these. Dashboards that need the digest
-- should run as service_role.
GRANT SELECT ON public.v_feedback_weekly_digest     TO service_role;
GRANT SELECT ON public.v_feedback_error_correlation TO service_role;


-- END migrate_014_feedback_view_hardening.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_015_food_logging.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 015: food logging cloud schema
--
-- Adds the food-domain tables for Move #1 (food foundation + FFM floor).
-- All tables are sync targets registered in src/lib/sync/registry.js per
-- docs/SYNC_ARCHITECTURE_LOCKED.md.
--
-- Schema locked in docs/DATABASE_SCHEMA_LOCKED.md. The plan referenced
-- this as "migration 005" but that number is already taken on Supabase;
-- the actual file is migrate_015_food_logging.sql.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ─────────────────────────────────────────────────────────────────────
-- foods: canonical food records, readable by all authenticated users.
-- Source field allows mixing OpenFoodFacts, USDA, CoFID, user-created
-- via OCR. Writes happen through service role only.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL CHECK (source IN ('off','usda','cofid','user_ocr')),
  source_id       text,
  barcode_ean     text,
  name            text NOT NULL,
  brand           text,
  serving_g       numeric NOT NULL,
  serving_label   text,
  kcal_100g       numeric NOT NULL,
  protein_100g    numeric NOT NULL,
  carbs_100g      numeric NOT NULL,
  fat_100g        numeric NOT NULL,
  fibre_100g      numeric,
  sodium_100g     numeric,
  sugar_100g      numeric,
  verified        boolean DEFAULT false,
  fetched_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode_ean) WHERE barcode_ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_name_lower ON foods(lower(name) text_pattern_ops);
CREATE UNIQUE INDEX IF NOT EXISTS uq_foods_source_source_id ON foods(source, source_id);
CREATE INDEX IF NOT EXISTS idx_foods_verified_updated ON foods(verified, updated_at DESC);

ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read foods" ON foods;
CREATE POLICY "Authenticated users can read foods" ON foods
  FOR SELECT TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- custom_foods: user-created food records.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_foods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  brand           text,
  serving_g       numeric NOT NULL,
  serving_label   text,
  kcal_100g       numeric NOT NULL,
  protein_100g    numeric NOT NULL,
  carbs_100g      numeric NOT NULL,
  fat_100g        numeric NOT NULL,
  fibre_100g      numeric,
  sodium_100g     numeric,
  sugar_100g      numeric,
  photo_url       text,
  notes           text,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_foods_user_active ON custom_foods(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custom_foods_user_name ON custom_foods(user_id, lower(name));

ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own custom foods" ON custom_foods;
CREATE POLICY "Users can manage own custom foods" ON custom_foods
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- food_entries: the diary. Macros denormalised at log time so changes
-- to the underlying food don't rewrite history.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      date NOT NULL,
  meal_slot       text NOT NULL CHECK (meal_slot IN ('breakfast','lunch','dinner','snack')),
  food_ref        text NOT NULL,
  quantity_g      numeric NOT NULL,
  kcal            numeric NOT NULL,
  protein_g       numeric NOT NULL,
  carbs_g         numeric NOT NULL,
  fat_g           numeric NOT NULL,
  fibre_g         numeric,
  logged_at       timestamptz DEFAULT now(),
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_entries_user_date_slot ON food_entries(user_id, entry_date, meal_slot) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_food_entries_user_recent ON food_entries(user_id, logged_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own food entries" ON food_entries;
CREATE POLICY "Users can manage own food entries" ON food_entries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- daily_intake_rollups: derived totals for fast engine reads.
-- Maintained by trigger on food_entries.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_intake_rollups (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      date NOT NULL,
  kcal_total      numeric NOT NULL DEFAULT 0,
  protein_g       numeric NOT NULL DEFAULT 0,
  carbs_g         numeric NOT NULL DEFAULT 0,
  fat_g           numeric NOT NULL DEFAULT 0,
  fibre_g         numeric,
  entries_count   int NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, entry_date)
);

ALTER TABLE daily_intake_rollups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own intake rollups" ON daily_intake_rollups;
CREATE POLICY "Users can read own intake rollups" ON daily_intake_rollups
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own intake rollups" ON daily_intake_rollups;
CREATE POLICY "Users can update own intake rollups" ON daily_intake_rollups
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger function: recompute the rollup for a (user, date) on any
-- food_entries insert/update/delete. Runs in the same transaction.
CREATE OR REPLACE FUNCTION recompute_daily_intake_rollup(
  target_user_id uuid,
  target_date    date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_intake_rollups (
    user_id, entry_date, kcal_total, protein_g, carbs_g, fat_g, fibre_g, entries_count, updated_at
  )
  SELECT
    target_user_id,
    target_date,
    COALESCE(SUM(kcal), 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0),
    NULLIF(COALESCE(SUM(fibre_g), 0), 0),
    COUNT(*),
    now()
  FROM food_entries
  WHERE user_id = target_user_id
    AND entry_date = target_date
    AND deleted_at IS NULL
  ON CONFLICT (user_id, entry_date) DO UPDATE
    SET kcal_total = EXCLUDED.kcal_total,
        protein_g  = EXCLUDED.protein_g,
        carbs_g    = EXCLUDED.carbs_g,
        fat_g      = EXCLUDED.fat_g,
        fibre_g    = EXCLUDED.fibre_g,
        entries_count = EXCLUDED.entries_count,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION food_entries_rollup_trigger() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_daily_intake_rollup(OLD.user_id, OLD.entry_date);
    RETURN OLD;
  END IF;
  PERFORM recompute_daily_intake_rollup(NEW.user_id, NEW.entry_date);
  -- If an update changed the entry_date, also recompute the old date.
  IF TG_OP = 'UPDATE' AND OLD.entry_date <> NEW.entry_date THEN
    PERFORM recompute_daily_intake_rollup(OLD.user_id, OLD.entry_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS food_entries_to_rollup ON food_entries;
CREATE TRIGGER food_entries_to_rollup
  AFTER INSERT OR UPDATE OR DELETE ON food_entries
  FOR EACH ROW
  EXECUTE FUNCTION food_entries_rollup_trigger();

-- ─────────────────────────────────────────────────────────────────────
-- saved_meals: user-created meal templates.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_meals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  items_json      jsonb NOT NULL,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user_active ON saved_meals(user_id) WHERE deleted_at IS NULL;

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own saved meals" ON saved_meals;
CREATE POLICY "Users can manage own saved meals" ON saved_meals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- recipes + recipe_ingredients.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  total_servings  numeric NOT NULL,
  notes           text,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_active ON recipes(user_id) WHERE deleted_at IS NULL;

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own recipes" ON recipes;
CREATE POLICY "Users can manage own recipes" ON recipes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_ref        text NOT NULL,
  quantity_g      numeric NOT NULL,
  order_index     int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can manage own recipe ingredients" ON recipe_ingredients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────
-- food_favourites: composite PK on (user_id, food_ref).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_favourites (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_ref        text NOT NULL,
  last_used_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, food_ref)
);

ALTER TABLE food_favourites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own favourites" ON food_favourites;
CREATE POLICY "Users can manage own favourites" ON food_favourites
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- daily_water: composite PK on (user_id, entry_date).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_water (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      date NOT NULL,
  ml              int NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, entry_date)
);

ALTER TABLE daily_water ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own water log" ON daily_water;
CREATE POLICY "Users can manage own water log" ON daily_water
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- END migrate_015_food_logging.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_016_food_sync_rpcs.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 016: food sync RPC functions
--
-- The hand-rolled sync engine (docs/SYNC_ARCHITECTURE_LOCKED.md) calls
-- two RPCs per cycle: food_sync_pull to fetch changes since the client's
-- last_pulled_at, and food_sync_push to apply queued local writes.
--
-- Both RPCs are scoped to auth.uid() and reject any payload that
-- references another user's data.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.
--
-- Re-runnable: the DO block below drops every overload of the two
-- function names regardless of signature. CREATE OR REPLACE cannot
-- change a function's return type or argument list -- Postgres
-- throws 42P13 ("cannot change return type of existing function").
-- A plain DROP FUNCTION IF EXISTS food_sync_push(jsonb) only matches
-- byte-identical signatures, so an earlier version with a different
-- argument list survives and 42P13 still fires. The DO block walks
-- pg_proc and drops every variant by exact identity arguments.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname IN ('food_sync_pull', 'food_sync_push')
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- food_sync_pull: returns changes since last_pulled_at.
-- Shape: { timestamp, changes: { <table>: { created: [], updated: [], deleted: [] } } }
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION food_sync_pull(last_pulled_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb;
  v_safe_last timestamptz := COALESCE(last_pulled_at, 'epoch'::timestamptz);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_sync_pull: not authenticated';
  END IF;

  v_result := jsonb_build_object(
    'timestamp', v_now,
    'changes', jsonb_build_object(

      'custom_foods', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM custom_foods t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM custom_foods t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM custom_foods t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      'food_entries', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_entries t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_entries t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_entries t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      'daily_intake_rollups', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM daily_intake_rollups t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last
        ), '[]'::jsonb),
        'deleted', '[]'::jsonb
      ),

      'saved_meals', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM saved_meals t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM saved_meals t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM saved_meals t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      'recipes', jsonb_build_object(
        'created', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM recipes t
          WHERE t.user_id = v_uid AND t.created_at > v_safe_last AND t.created_at = t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM recipes t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last AND t.created_at <> t.updated_at AND t.deleted_at IS NULL
        ), '[]'::jsonb),
        'deleted', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM recipes t
          WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last
        ), '[]'::jsonb)
      ),

      'food_favourites', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM food_favourites t
          WHERE t.user_id = v_uid AND t.last_used_at > v_safe_last
        ), '[]'::jsonb),
        'deleted', '[]'::jsonb
      ),

      'daily_water', jsonb_build_object(
        'created', '[]'::jsonb,
        'updated', COALESCE((
          SELECT jsonb_agg(to_jsonb(t)) FROM daily_water t
          WHERE t.user_id = v_uid AND t.updated_at > v_safe_last
        ), '[]'::jsonb),
        'deleted', '[]'::jsonb
      )

    )
  );

  RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- food_sync_push: applies inserts, updates, and soft-deletes from the
-- client. Last-write-wins per record using updated_at. Rejects payload
-- that references other users' data.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION food_sync_push(changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb := '{}'::jsonb;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_sync_push: not authenticated';
  END IF;

  -- custom_foods
  IF changes ? 'custom_foods' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO custom_foods (
        id, user_id, name, brand, serving_g, serving_label,
        kcal_100g, protein_100g, carbs_100g, fat_100g,
        fibre_100g, sodium_100g, sugar_100g, photo_url, notes,
        created_at, updated_at
      )
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name', v_row->>'brand',
        (v_row->>'serving_g')::numeric, v_row->>'serving_label',
        (v_row->>'kcal_100g')::numeric, (v_row->>'protein_100g')::numeric,
        (v_row->>'carbs_100g')::numeric, (v_row->>'fat_100g')::numeric,
        (v_row->>'fibre_100g')::numeric, (v_row->>'sodium_100g')::numeric,
        (v_row->>'sugar_100g')::numeric, v_row->>'photo_url', v_row->>'notes',
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            serving_g = EXCLUDED.serving_g,
            serving_label = EXCLUDED.serving_label,
            kcal_100g = EXCLUDED.kcal_100g,
            protein_100g = EXCLUDED.protein_100g,
            carbs_100g = EXCLUDED.carbs_100g,
            fat_100g = EXCLUDED.fat_100g,
            fibre_100g = EXCLUDED.fibre_100g,
            sodium_100g = EXCLUDED.sodium_100g,
            sugar_100g = EXCLUDED.sugar_100g,
            photo_url = EXCLUDED.photo_url,
            notes = EXCLUDED.notes,
            updated_at = v_now
        WHERE custom_foods.user_id = v_uid
          AND custom_foods.updated_at < EXCLUDED.updated_at;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'updated', '[]'::jsonb))
    LOOP
      UPDATE custom_foods SET
        name = v_row->>'name',
        brand = v_row->>'brand',
        serving_g = (v_row->>'serving_g')::numeric,
        serving_label = v_row->>'serving_label',
        kcal_100g = (v_row->>'kcal_100g')::numeric,
        protein_100g = (v_row->>'protein_100g')::numeric,
        carbs_100g = (v_row->>'carbs_100g')::numeric,
        fat_100g = (v_row->>'fat_100g')::numeric,
        fibre_100g = (v_row->>'fibre_100g')::numeric,
        sodium_100g = (v_row->>'sodium_100g')::numeric,
        sugar_100g = (v_row->>'sugar_100g')::numeric,
        photo_url = v_row->>'photo_url',
        notes = v_row->>'notes',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE custom_foods
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- food_entries
  IF changes ? 'food_entries' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO food_entries (
        id, user_id, entry_date, meal_slot, food_ref, quantity_g,
        kcal, protein_g, carbs_g, fat_g, fibre_g, logged_at,
        created_at, updated_at
      )
      VALUES (
        (v_row->>'id')::uuid, v_uid, (v_row->>'entry_date')::date,
        v_row->>'meal_slot', v_row->>'food_ref',
        (v_row->>'quantity_g')::numeric,
        (v_row->>'kcal')::numeric, (v_row->>'protein_g')::numeric,
        (v_row->>'carbs_g')::numeric, (v_row->>'fat_g')::numeric,
        (v_row->>'fibre_g')::numeric,
        COALESCE((v_row->>'logged_at')::timestamptz, v_now),
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'updated', '[]'::jsonb))
    LOOP
      UPDATE food_entries SET
        entry_date = (v_row->>'entry_date')::date,
        meal_slot = v_row->>'meal_slot',
        food_ref = v_row->>'food_ref',
        quantity_g = (v_row->>'quantity_g')::numeric,
        kcal = (v_row->>'kcal')::numeric,
        protein_g = (v_row->>'protein_g')::numeric,
        carbs_g = (v_row->>'carbs_g')::numeric,
        fat_g = (v_row->>'fat_g')::numeric,
        fibre_g = (v_row->>'fibre_g')::numeric,
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE food_entries
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- food_favourites (composite PK)
  IF changes ? 'food_favourites' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_favourites'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO food_favourites (user_id, food_ref, last_used_at)
      VALUES (
        v_uid, v_row->>'food_ref',
        COALESCE((v_row->>'last_used_at')::timestamptz, v_now)
      )
      ON CONFLICT (user_id, food_ref) DO UPDATE
        SET last_used_at = EXCLUDED.last_used_at
        WHERE food_favourites.last_used_at < EXCLUDED.last_used_at;
    END LOOP;
  END IF;

  -- daily_water (composite PK)
  IF changes ? 'daily_water' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_water'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO daily_water (user_id, entry_date, ml, updated_at)
      VALUES (
        v_uid, (v_row->>'entry_date')::date,
        (v_row->>'ml')::int, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET ml = EXCLUDED.ml,
            updated_at = v_now
        WHERE daily_water.updated_at < EXCLUDED.updated_at;
    END LOOP;
  END IF;

  -- saved_meals
  IF changes ? 'saved_meals' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO saved_meals (id, user_id, name, items_json, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        COALESCE(v_row->'items_json', '[]'::jsonb),
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'updated', '[]'::jsonb))
    LOOP
      UPDATE saved_meals SET
        name = v_row->>'name',
        items_json = COALESCE(v_row->'items_json', items_json),
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE saved_meals
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- recipes (recipe_ingredients sync separately via a follow-up call to keep this RPC bounded)
  IF changes ? 'recipes' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipes (id, user_id, name, total_servings, notes, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        (v_row->>'total_servings')::numeric, v_row->>'notes',
        COALESCE((v_row->>'created_at')::timestamptz, v_now), v_now
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'updated', '[]'::jsonb))
    LOOP
      UPDATE recipes SET
        name = v_row->>'name',
        total_servings = (v_row->>'total_servings')::numeric,
        notes = v_row->>'notes',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid
        AND user_id = v_uid
        AND updated_at < (v_row->>'updated_at')::timestamptz;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'deleted', '[]'::jsonb))
    LOOP
      UPDATE recipes
        SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),
            updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  v_result := jsonb_build_object('timestamp', v_now);
  RETURN v_result;
END;
$$;

-- Grant execute to authenticated role.
GRANT EXECUTE ON FUNCTION food_sync_pull(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION food_sync_push(jsonb) TO authenticated;


-- END migrate_016_food_sync_rpcs.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_017_ed_pattern_and_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 017: ED-pattern detection + goal lock + engine telemetry
--
-- Cloud companion for Move #2 (ED-pattern detection) and Move #3
-- (cascade telemetry). The local SQLite schema added in this same
-- release writes to ed_pattern_flags, user_body_profile.goal_lock_*
-- and engine_telemetry. This migration mirrors those tables on the
-- Supabase side so sync round-trips them, and adds two RPCs the
-- engine and the You-tab edit surface call directly.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ─── ed_pattern_flags ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ed_pattern_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_state      text NOT NULL CHECK (flag_state IN ('raised', 'cleared')),
  reason          text,
  signals_json    jsonb,
  raised_at       timestamptz NOT NULL DEFAULT now(),
  cleared_at      timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ed_pattern_flags_user      ON ed_pattern_flags(user_id, raised_at DESC);
CREATE INDEX IF NOT EXISTS idx_ed_pattern_flags_open      ON ed_pattern_flags(user_id) WHERE cleared_at IS NULL AND deleted_at IS NULL;

ALTER TABLE ed_pattern_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ed_pattern_flags"  ON ed_pattern_flags;
DROP POLICY IF EXISTS "Users can write own ed_pattern_flags" ON ed_pattern_flags;
DROP POLICY IF EXISTS "Users can update own ed_pattern_flags" ON ed_pattern_flags;

CREATE POLICY "Users can read own ed_pattern_flags"
  ON ed_pattern_flags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can write own ed_pattern_flags"
  ON ed_pattern_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ed_pattern_flags"
  ON ed_pattern_flags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_body_profile.goal_lock_advanced ──────────────────────────

ALTER TABLE user_body_profile
  ADD COLUMN IF NOT EXISTS goal_lock_advanced boolean DEFAULT false;

ALTER TABLE user_body_profile
  ADD COLUMN IF NOT EXISTS goal_lock_set_at   timestamptz;

-- ─── clear_goal_lock RPC ───────────────────────────────────────────
-- The user can flip goal_lock_advanced from the You-tab Goal lock
-- edit surface. This RPC also writes a telemetry event so cohort
-- analysis can track who turned advanced mode off vs on.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'clear_goal_lock'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION clear_goal_lock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_body_profile
  SET goal_lock_advanced = false,
      goal_lock_set_at   = now(),
      updated_at         = now()
  WHERE user_id = uid;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, 'goal_lock_cleared', '{"source":"rpc"}'::jsonb, now());
END;
$$;

GRANT EXECUTE ON FUNCTION clear_goal_lock TO authenticated;

-- ─── engine_telemetry ──────────────────────────────────────────────
-- Per-event log. Written client-side and pushed via
-- record_engine_telemetry. The daily rollup view aggregates this
-- into engine_telemetry_daily for the cohort dashboard.

CREATE TABLE IF NOT EXISTS engine_telemetry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event           text NOT NULL,
  payload_json    jsonb,
  occurred_at     timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engine_telemetry_user        ON engine_telemetry(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_engine_telemetry_event_day   ON engine_telemetry(event, occurred_at);

ALTER TABLE engine_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own engine_telemetry"  ON engine_telemetry;
DROP POLICY IF EXISTS "Users can write own engine_telemetry" ON engine_telemetry;

CREATE POLICY "Users can read own engine_telemetry"
  ON engine_telemetry FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can write own engine_telemetry"
  ON engine_telemetry FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── record_engine_telemetry RPC ───────────────────────────────────
-- Single entry point the client calls in the push helper. Validates
-- the event name against an allow-list so a misconfigured client
-- can't pollute the table with arbitrary strings.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'record_engine_telemetry'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event   text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid    uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry TO authenticated;

-- ─── engine_telemetry_daily view ───────────────────────────────────
-- Daily aggregations for the cohort dashboard. Selected by
-- analytics queries, not by the client. RLS is intentionally NOT
-- enabled on this view; the founder's Supabase Studio access reads
-- it directly and exports for the weekly review.

CREATE OR REPLACE VIEW engine_telemetry_daily AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  event,
  COUNT(*)                              AS event_count,
  COUNT(DISTINCT user_id)               AS user_count
FROM engine_telemetry
GROUP BY 1, 2;

-- ─── engine_overrides (groundwork) ─────────────────────────────────
-- Locked spec calls for this table in phase 2 (B2B). No client
-- consumers yet at this move; the table exists so the schema is
-- migration-complete and we don't ship a partial 017 to production.

CREATE TABLE IF NOT EXISTS engine_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  override_key    text NOT NULL,
  override_value  jsonb NOT NULL,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_engine_overrides_user ON engine_overrides(user_id, override_key);

ALTER TABLE engine_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own engine_overrides" ON engine_overrides;
CREATE POLICY "Users can read own engine_overrides"
  ON engine_overrides FOR SELECT
  USING (auth.uid() = user_id);


-- END migrate_017_ed_pattern_and_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_018_composite_pks.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 018: composite (user_id, id) primary keys
--
-- ============================================================
-- APPLY THIS MIGRATION NOW. Hold the new app build for later.
--
-- Release policy locked 2026-05-24:
--   - This SQL applies to production cloud NOW, to support the
--     continued build on the branch.
--   - The current Play Console closed-testing build (pre-Eat
--     component, "old app") stays in place. No new app version
--     ships to closed testers until the entire branch is built
--     out, not half done.
--
-- Why this is safe for the old app:
--   - Reads (SELECT) work unchanged; column structure is intact.
--   - Inserts of new rows succeed; old app already supplies user_id
--     on parent tables. For routine_exercises and mesocycle_weeks
--     (which the old app doesn't populate with user_id), triggers
--     below auto-fill it from the parent row so those inserts also
--     succeed.
--   - Upserts with onConflict: 'id' FAIL after composite PK lands
--     (no unique on id alone). That's a sync error in the log per
--     the locked release-tolerance contract, not a crash. The old
--     app continues to function locally; users can still log
--     workouts, see history, etc. Cloud just doesn't accept their
--     edit-style upserts. Acceptable.
--
-- When the new app build is ready (whole project done), it ships
-- via Play Console closed testing and the upsert errors disappear
-- because the new code uses onConflict: 'user_id,id'.
--
-- ============================================================
--
-- Locked in docs/IDENTITY_AND_OWNERSHIP_LOCKED.md:
--   "Every user-scoped table is PRIMARY KEY (user_id, id). Two users
--   cannot collide on a row at the schema level. Cross-user-id-clash
--   becomes impossible, not merely unlikely."
--
-- This single change fixes the existing 42501 cascade automatically:
-- previously-failing local rows push as fresh (current_user, id)
-- inserts because (current_user, id) is a different primary key from
-- the (old_user, id) that already exists in cloud.

-- ─────────────────────────────────────────────────────────────────────
-- Helper: drop every FK constraint pointing AT a given table. We need
-- this because changing a PK to composite invalidates every FK that
-- referenced the old single-column PK. We don't re-add app-layer FKs
-- after the change; RLS + app-side joins handle the integrity. This
-- keeps the migration short and skips a thousand lines of constraint
-- rebuild SQL. Foreign-key checks at the app layer were already the
-- de-facto enforcer for years.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                  c.connamespace::regnamespace, c.conrelid::regclass, c.conname) AS cmd
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid::regclass::text IN (
        -- Parents whose PK is changing; FKs that reference these by id
        -- need to come down. exercises + recipes excluded (their PKs
        -- aren't changing in this migration; see notes below).
        'routines', 'workouts', 'mesocycles', 'programmes'
      )
  LOOP
    BEGIN
      EXECUTE r.cmd;
    EXCEPTION WHEN OTHERS THEN
      -- Already dropped or never existed. Continue.
      NULL;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Add user_id to children that don't have one. Backfill from parent.
-- These columns become NOT NULL once backfilled.
-- ─────────────────────────────────────────────────────────────────────

-- routine_exercises: no user_id; inherits from routines.
ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE routine_exercises re
SET user_id = r.user_id
FROM routines r
WHERE re.routine_id = r.id AND re.user_id IS NULL;
-- Rows with no resolvable parent get deleted (cascade-orphan cleanup).
DELETE FROM routine_exercises WHERE user_id IS NULL;
ALTER TABLE routine_exercises ALTER COLUMN user_id SET NOT NULL;

-- mesocycle_weeks: no user_id; inherits from mesocycles.
ALTER TABLE mesocycle_weeks ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE mesocycle_weeks mw
SET user_id = m.user_id
FROM mesocycles m
WHERE mw.mesocycle_id = m.id AND mw.user_id IS NULL;
DELETE FROM mesocycle_weeks WHERE user_id IS NULL;
ALTER TABLE mesocycle_weeks ALTER COLUMN user_id SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- Old-client safety triggers. The pre-Eat-component closed-testing
-- build (still in production on Play Console) pushes routine_exercises
-- and mesocycle_weeks WITHOUT a user_id field. The NOT NULL constraint
-- above would reject those inserts and break sync for those tables
-- entirely on the old app. The triggers below populate user_id from
-- the parent row on insert so the old client's inserts succeed
-- transparently. New app builds set user_id explicitly and the trigger
-- becomes a no-op for those rows.
--
-- onConflict: 'id' upserts from old clients will still fail (no unique
-- constraint on id alone after the composite PK swap below); that's
-- a sync-error-in-log per the locked release-tolerance contract, not
-- a functional break.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION routine_exercises_inherit_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM routines WHERE id = NEW.routine_id LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_routine_exercises_inherit_user_id ON routine_exercises;
CREATE TRIGGER trg_routine_exercises_inherit_user_id
BEFORE INSERT ON routine_exercises
FOR EACH ROW EXECUTE FUNCTION routine_exercises_inherit_user_id();

CREATE OR REPLACE FUNCTION mesocycle_weeks_inherit_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM mesocycles WHERE id = NEW.mesocycle_id LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mesocycle_weeks_inherit_user_id ON mesocycle_weeks;
CREATE TRIGGER trg_mesocycle_weeks_inherit_user_id
BEFORE INSERT ON mesocycle_weeks
FOR EACH ROW EXECUTE FUNCTION mesocycle_weeks_inherit_user_id();

-- recipe_ingredients deliberately excluded: food tables retain their
-- existing (id) primary keys for now. The food sync RPC (migration 016)
-- uses ON CONFLICT (id) internally and would need a coordinated
-- update; that's a separate workstream when the food layer matures.
-- The 42501 cascade reported by the founder did not include food
-- tables, so deferring is safe.

-- ─────────────────────────────────────────────────────────────────────
-- Swap each table's PK from (id) to (user_id, id).
--
-- Pattern: discover the existing PK constraint name, drop it, add the
-- composite. PK constraint names vary across environments depending on
-- whether the table was created via PRIMARY KEY shorthand, named
-- explicitly, or recreated by a prior migration. Walking pg_constraint
-- finds whatever's there.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  pkname text;
  tables text[] := ARRAY[
    -- Tables that hit 42501 in the founder's debug log and the
    -- supporting tables they reference. Composite-PK these; old app
    -- builds continue to read and insert fresh rows; only their
    -- upsert-with-id-conflict path stops working.
    'routines', 'routine_exercises',
    'workouts', 'workout_sets',
    -- exercises excluded: mixed-ownership (user_id nullable for the
    -- shared library rows). Composite PK requires NOT NULL; a
    -- library/custom split is a separate workstream.
    'mesocycles', 'mesocycle_weeks',
    'planned_muscle_volume', 'adaptation_events',
    'programmes',
    'morning_weights', 'weekly_checkins_v2', 'coach_outputs',
    'body_metrics',
    'nutrition_targets', 'user_insights',
    'peak_week_plans', 'exercise_user_notes', 'exercise_goals',
    'workout_notes_v2',
    'ed_pattern_flags', 'engine_telemetry', 'engine_overrides'
    -- Food tables (custom_foods, food_entries, saved_meals, recipes,
    -- recipe_ingredients) deliberately excluded; see comment above.
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Skip the table if it doesn't exist in this database. Beta
    -- testers' older Supabase project may not have shipped the food
    -- or ED-pattern migrations yet, so those tables may be missing.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE NOTICE 'Skipping %: table does not exist', tbl;
      CONTINUE;
    END IF;

    -- Find the existing PK name.
    SELECT conname INTO pkname
    FROM pg_constraint
    WHERE conrelid = format('public.%I', tbl)::regclass
      AND contype = 'p'
    LIMIT 1;

    -- If a composite (user_id, id) already exists, skip. Re-runnable.
    IF pkname IS NOT NULL THEN
      DECLARE
        pkcols text;
      BEGIN
        SELECT string_agg(attname, ',' ORDER BY array_position(conkey, attnum))
          INTO pkcols
        FROM pg_attribute a
        JOIN pg_constraint c ON c.conrelid = a.attrelid
        WHERE c.conname = pkname AND a.attnum = ANY(c.conkey)
          AND a.attrelid = format('public.%I', tbl)::regclass;
        IF pkcols = 'user_id,id' OR pkcols = 'id,user_id' THEN
          RAISE NOTICE 'Skipping %: composite PK already present (%)', tbl, pkcols;
          CONTINUE;
        END IF;
      END;
    END IF;

    -- Some user-scoped tables already use a different composite PK
    -- (daily_intake_rollups uses (user_id, entry_date) which is the
    -- correct natural key). Skip those: they're already collision-safe.
    IF pkname IS NOT NULL THEN
      DECLARE
        pkhas_user_id boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM pg_attribute a
          JOIN pg_constraint c ON c.conrelid = a.attrelid
          WHERE c.conname = pkname
            AND a.attname = 'user_id'
            AND a.attnum = ANY(c.conkey)
            AND a.attrelid = format('public.%I', tbl)::regclass
        ) INTO pkhas_user_id;
        IF pkhas_user_id THEN
          RAISE NOTICE 'Skipping %: PK already includes user_id', tbl;
          CONTINUE;
        END IF;
      END;
    END IF;

    -- Drop the old PK, add the composite. Wrapped per-table so one
    -- failure (e.g. orphan rows blocking the new PK) doesn't abort
    -- the whole migration -- the user sees which table needs hand
    -- attention.
    BEGIN
      IF pkname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, pkname);
      END IF;
      EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (user_id, id)', tbl);
      RAISE NOTICE 'Composite PK installed on %', tbl;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to set composite PK on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Indexes that the old single-column PK provided for free. Recreate
-- explicitly so id-only lookups (used by some app paths and PostgREST
-- /table/{id} routes) stay fast.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'routines', 'routine_exercises',
    'workouts', 'workout_sets',
    -- exercises excluded: mixed-ownership (user_id nullable for the
    -- shared library rows). Composite PK requires NOT NULL; a
    -- library/custom split is a separate workstream.
    'mesocycles', 'mesocycle_weeks',
    'planned_muscle_volume', 'adaptation_events',
    'programmes',
    'morning_weights', 'weekly_checkins_v2', 'coach_outputs',
    'body_metrics',
    'nutrition_targets', 'user_insights',
    'peak_week_plans', 'exercise_user_notes', 'exercise_goals',
    'workout_notes_v2',
    'ed_pattern_flags', 'engine_telemetry', 'engine_overrides'
    -- Food tables (custom_foods, food_entries, saved_meals, recipes,
    -- recipe_ingredients) deliberately excluded; see comment above.
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_id ON public.%I(id)',
        tbl, tbl
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to add id-index on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Acceptance check. Should print one row per migrated table showing
-- the new composite PK. Reads cleanly in the Supabase SQL Editor
-- output panel.
-- ─────────────────────────────────────────────────────────────────────

SELECT
  c.conrelid::regclass::text AS table_name,
  string_agg(a.attname, ',' ORDER BY array_position(c.conkey, a.attnum)) AS pk_cols
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'p'
  AND c.conrelid::regclass::text = ANY(ARRAY[
    'routines', 'routine_exercises',
    'workouts', 'workout_sets',
    -- exercises excluded: mixed-ownership (user_id nullable for the
    -- shared library rows). Composite PK requires NOT NULL; a
    -- library/custom split is a separate workstream.
    'mesocycles', 'mesocycle_weeks',
    'planned_muscle_volume', 'adaptation_events',
    'programmes',
    'morning_weights', 'weekly_checkins_v2', 'coach_outputs',
    'body_metrics',
    'nutrition_targets', 'user_insights',
    'peak_week_plans', 'exercise_user_notes', 'exercise_goals',
    'workout_notes_v2',
    'ed_pattern_flags', 'engine_telemetry', 'engine_overrides'
    -- Food tables (custom_foods, food_entries, saved_meals, recipes,
    -- recipe_ingredients) deliberately excluded; see comment above.
  ])
GROUP BY c.conrelid
ORDER BY table_name;


-- END migrate_018_composite_pks.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_019_health_consent.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 019: Article 9 health-data consent + audit log
--
-- Safe to apply now. Adds nullable columns + new table; no breaking
-- changes to old app. Old app reads users_profile unchanged; the new
-- consent columns just stay null for users who haven't ticked the
-- box yet. New app builds gate the main UI behind the consent screen.
--
-- Locked in docs/PRIVACY_CONSENT_LOCKED.md + ONBOARDING_SEQUENCE_LOCKED.md
-- Screen 3.
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

-- ─────────────────────────────────────────────────────────────────────
-- users_profile gains two columns: the current consent state + when
-- it was granted. State is intentionally nullable so the existence
-- of a value (rather than its truthiness) is the "user has been
-- through the consent screen" signal. A user can revoke consent
-- later from You → Privacy; revoking sets health_data_consent=false
-- and triggers the account-delete flow under Article 17.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS health_data_consent boolean,
  ADD COLUMN IF NOT EXISTS health_data_consent_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────
-- consent_log: append-only audit trail for every grant + revoke.
-- Required per Article 9 best practice so a regulator audit can
-- trace exactly when consent was given, by whom, and from what
-- client. Rows are NEVER updated or deleted (RLS denies both); on
-- account delete the rows go with the user via FK cascade.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consent_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type    text NOT NULL CHECK (consent_type IN ('health_data', 'marketing', 'analytics')),
  granted         boolean NOT NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  app_version     text,
  platform        text
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id, granted_at DESC);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own consent_log"  ON consent_log;
DROP POLICY IF EXISTS "Users can write own consent_log" ON consent_log;

CREATE POLICY "Users can read own consent_log"
  ON consent_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can write own consent_log"
  ON consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies. The audit log is append-only by
-- design; the only way a row leaves consent_log is via the FK
-- cascade when auth.users.delete fires.

-- ─────────────────────────────────────────────────────────────────────
-- record_health_consent RPC: single entry point the client calls to
-- record a consent grant or revoke. Updates users_profile + appends
-- to consent_log in one transaction so the two surfaces stay
-- consistent. Returns nothing meaningful; client checks the boolean
-- on users_profile after the call.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'record_health_consent'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION record_health_consent(
  _granted     boolean,
  _app_version text DEFAULT NULL,
  _platform    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the live state on users_profile.
  UPDATE users_profile
  SET health_data_consent    = _granted,
      health_data_consent_at = now()
  WHERE id = uid;

  -- Append the audit row. Never updates an existing row; every
  -- grant + revoke gets its own immutable timestamped record.
  INSERT INTO consent_log (user_id, consent_type, granted, granted_at, app_version, platform)
  VALUES (uid, 'health_data', _granted, now(), _app_version, _platform);
END;
$$;

GRANT EXECUTE ON FUNCTION record_health_consent TO authenticated;


-- END migrate_019_health_consent.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_020_custom_exercises.sql
-- ═════════════════════════════════════════════════════════════════

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


-- END migrate_020_custom_exercises.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_021_food_composite_pks.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 021: composite (user_id, id) PKs on food tables
--
-- Safe to apply now. Extends the IDENTITY_AND_OWNERSHIP_LOCKED.md
-- design to the food domain. Deferred from migration 018 because the
-- food sync RPC (defined in migration 016) used ON CONFLICT (id)
-- internally and needed a coordinated update; this migration handles
-- both the schema change AND the RPC update in one apply.
--
-- Tables migrated to composite PK:
--   custom_foods         (PK was id; now (user_id, id))
--   food_entries         (PK was id; now (user_id, id))
--   saved_meals          (PK was id; now (user_id, id))
--   recipes              (PK was id; now (user_id, id))
--   recipe_ingredients   (no user_id today; added + backfilled, then
--                         (user_id, id) PK installed)
--
-- Already-composite (no change):
--   daily_intake_rollups (PK (user_id, entry_date) already correct)
--   food_favourites      (PK (user_id, food_ref) already correct)
--   daily_water          (PK (user_id, entry_date) already correct)
--
-- Library-only (no change):
--   foods                (shared OFF/USDA/CoFID cache, no user_id)
--
-- Old-client safety:
--   recipe_ingredients gets a BEFORE INSERT trigger that auto-fills
--   user_id from the parent recipe, mirroring the routine_exercises
--   approach in migration 018. Old app pushes that don't include
--   user_id continue to succeed.
--
-- Apply with: paste into Supabase Dashboard -> SQL Editor -> Run.

-- ─────────────────────────────────────────────────────────────────────
-- Add user_id column to recipe_ingredients (the one food child table
-- that lacks it). Backfill from parent, then enforce NOT NULL.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE recipe_ingredients ri
SET user_id = r.user_id
FROM recipes r
WHERE ri.recipe_id = r.id AND ri.user_id IS NULL;

DELETE FROM recipe_ingredients WHERE user_id IS NULL;

ALTER TABLE recipe_ingredients ALTER COLUMN user_id SET NOT NULL;

-- Old-client safety trigger: pre-Eat-component build pushes
-- recipe_ingredients without user_id. Trigger fills it from the
-- parent so inserts continue to succeed.
CREATE OR REPLACE FUNCTION recipe_ingredients_inherit_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM recipes WHERE id = NEW.recipe_id LIMIT 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recipe_ingredients_inherit_user_id ON recipe_ingredients;
CREATE TRIGGER trg_recipe_ingredients_inherit_user_id
BEFORE INSERT ON recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION recipe_ingredients_inherit_user_id();

-- ─────────────────────────────────────────────────────────────────────
-- Drop FK constraints that reference the parents whose PK is changing.
-- (recipe_ingredients.recipe_id was the only one; routine_exercises
--  and similar were already handled in migration 018.) App-layer
-- enforcement + RLS continue to keep referential integrity.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                  c.connamespace::regnamespace, c.conrelid::regclass, c.conname) AS cmd
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid::regclass::text IN ('custom_foods', 'food_entries', 'saved_meals', 'recipes')
  LOOP
    BEGIN
      EXECUTE r.cmd;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Swap each food table's PK from (id) to (user_id, id). Same per-table
-- pattern as migration 018, including skip-if-already-composite.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  pkname text;
  tables text[] := ARRAY[
    'custom_foods', 'food_entries', 'saved_meals', 'recipes', 'recipe_ingredients'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE NOTICE 'Skipping %: table does not exist', tbl;
      CONTINUE;
    END IF;

    SELECT conname INTO pkname
    FROM pg_constraint
    WHERE conrelid = format('public.%I', tbl)::regclass
      AND contype = 'p'
    LIMIT 1;

    IF pkname IS NOT NULL THEN
      DECLARE
        pkhas_user_id boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM pg_attribute a
          JOIN pg_constraint c ON c.conrelid = a.attrelid
          WHERE c.conname = pkname
            AND a.attname = 'user_id'
            AND a.attnum = ANY(c.conkey)
            AND a.attrelid = format('public.%I', tbl)::regclass
        ) INTO pkhas_user_id;
        IF pkhas_user_id THEN
          RAISE NOTICE 'Skipping %: PK already includes user_id', tbl;
          CONTINUE;
        END IF;
      END;
    END IF;

    BEGIN
      IF pkname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, pkname);
      END IF;
      EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (user_id, id)', tbl);
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_id ON public.%I(id)',
        tbl, tbl
      );
      RAISE NOTICE 'Composite PK installed on %', tbl;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to set composite PK on %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- Update food_sync_push RPC to use ON CONFLICT (user_id, id) for the
-- food tables that just moved to composite PK. The recipe_ingredients
-- block also switches from (id) -> (user_id, id) since the column is
-- now NOT NULL on that table.
--
-- This re-declares the function. The DROP guard handles the case where
-- the existing function signature differs from the new one (PostgREST
-- otherwise refuses CREATE OR REPLACE on signature change).
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'food_sync_push'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION food_sync_push(changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb := '{}'::jsonb;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_sync_push: not authenticated';
  END IF;

  -- custom_foods (composite PK now)
  IF changes ? 'custom_foods' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO custom_foods (
        id, user_id, name, brand, serving_g, serving_label,
        kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
        sodium_100g, sugar_100g, created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        v_row->>'name', v_row->>'brand',
        (v_row->>'serving_g')::real, v_row->>'serving_label',
        (v_row->>'kcal_100g')::real, (v_row->>'protein_100g')::real,
        (v_row->>'carbs_100g')::real, (v_row->>'fat_100g')::real,
        NULLIF(v_row->>'fibre_100g','')::real,
        NULLIF(v_row->>'sodium_100g','')::real,
        NULLIF(v_row->>'sugar_100g','')::real,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO UPDATE
        SET name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            serving_g = EXCLUDED.serving_g,
            serving_label = EXCLUDED.serving_label,
            kcal_100g = EXCLUDED.kcal_100g,
            protein_100g = EXCLUDED.protein_100g,
            carbs_100g = EXCLUDED.carbs_100g,
            fat_100g = EXCLUDED.fat_100g,
            fibre_100g = EXCLUDED.fibre_100g,
            sodium_100g = EXCLUDED.sodium_100g,
            sugar_100g = EXCLUDED.sugar_100g,
            updated_at = v_now;
    END LOOP;
  END IF;

  -- food_entries
  IF changes ? 'food_entries' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO food_entries (
        id, user_id, entry_date, meal_slot, food_ref, quantity_g,
        kcal, protein_g, carbs_g, fat_g, fibre_g,
        created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        (v_row->>'entry_date')::date, v_row->>'meal_slot',
        v_row->>'food_ref', (v_row->>'quantity_g')::real,
        (v_row->>'kcal')::real, (v_row->>'protein_g')::real,
        (v_row->>'carbs_g')::real, (v_row->>'fat_g')::real,
        NULLIF(v_row->>'fibre_g','')::real,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'updated', '[]'::jsonb))
    LOOP
      UPDATE food_entries SET
        entry_date = (v_row->>'entry_date')::date,
        meal_slot = v_row->>'meal_slot',
        food_ref = v_row->>'food_ref',
        quantity_g = (v_row->>'quantity_g')::real,
        kcal = (v_row->>'kcal')::real,
        protein_g = (v_row->>'protein_g')::real,
        carbs_g = (v_row->>'carbs_g')::real,
        fat_g = (v_row->>'fat_g')::real,
        fibre_g = NULLIF(v_row->>'fibre_g','')::real,
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM food_entries
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- daily_intake_rollups (composite PK on (user_id, entry_date) already)
  IF changes ? 'daily_intake_rollups' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_intake_rollups'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO daily_intake_rollups (
        user_id, entry_date, kcal_total, protein_total, carbs_total,
        fat_total, fibre_total, updated_at
      ) VALUES (
        v_uid, (v_row->>'entry_date')::date,
        (v_row->>'kcal_total')::real, (v_row->>'protein_total')::real,
        (v_row->>'carbs_total')::real, (v_row->>'fat_total')::real,
        NULLIF(v_row->>'fibre_total','')::real, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET kcal_total = EXCLUDED.kcal_total,
            protein_total = EXCLUDED.protein_total,
            carbs_total = EXCLUDED.carbs_total,
            fat_total = EXCLUDED.fat_total,
            fibre_total = EXCLUDED.fibre_total,
            updated_at = v_now;
    END LOOP;
  END IF;

  -- food_favourites (composite PK on (user_id, food_ref) already)
  IF changes ? 'food_favourites' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_favourites'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO food_favourites (user_id, food_ref, last_used_at)
      VALUES (
        v_uid, v_row->>'food_ref',
        COALESCE((v_row->>'last_used_at')::timestamptz, v_now)
      )
      ON CONFLICT (user_id, food_ref) DO UPDATE
        SET last_used_at = EXCLUDED.last_used_at
        WHERE food_favourites.last_used_at < EXCLUDED.last_used_at;
    END LOOP;
  END IF;

  -- daily_water (composite PK)
  IF changes ? 'daily_water' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_water'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO daily_water (user_id, entry_date, ml, updated_at)
      VALUES (
        v_uid, (v_row->>'entry_date')::date,
        (v_row->>'ml')::integer, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET ml = EXCLUDED.ml,
            updated_at = v_now
        WHERE daily_water.updated_at < EXCLUDED.updated_at;
    END LOOP;
  END IF;

  -- saved_meals (composite PK now)
  IF changes ? 'saved_meals' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO saved_meals (id, user_id, name, ingredients, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        v_row->'ingredients', v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'updated', '[]'::jsonb))
    LOOP
      UPDATE saved_meals SET
        name = v_row->>'name',
        ingredients = v_row->'ingredients',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM saved_meals
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- recipes (composite PK now)
  IF changes ? 'recipes' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipes (id, user_id, name, servings, notes, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        NULLIF(v_row->>'servings','')::real,
        v_row->>'notes', v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'updated', '[]'::jsonb))
    LOOP
      UPDATE recipes SET
        name = v_row->>'name',
        servings = NULLIF(v_row->>'servings','')::real,
        notes = v_row->>'notes',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM recipes
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- recipe_ingredients (composite PK now; user_id auto-fills from
  -- parent via the trigger above for old-app inserts).
  IF changes ? 'recipe_ingredients' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipe_ingredients'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipe_ingredients (
        id, user_id, recipe_id, food_ref, quantity_g, created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        (v_row->>'recipe_id')::uuid,
        v_row->>'food_ref', (v_row->>'quantity_g')::real,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipe_ingredients'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM recipe_ingredients
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  v_result := jsonb_build_object('applied_at', v_now);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION food_sync_push(jsonb) TO authenticated;


-- END migrate_021_food_composite_pks.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_022_food_telemetry_events.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 022: extend record_engine_telemetry allow-list for Move #1.5
--
-- Adds two food-domain events to the server-side allow-list so the
-- waterfall + OFF write-back queue can push them without the RPC
-- rejecting the row. Allow-list is duplicated client/server by
-- design (catches typos at both ends).
--
-- Events added:
--   food_lookup_barcode      every barcode resolve, source = local | off_live | usda | miss
--   ocr_writeback_attempted  every OFF contribution POST, status = success | failure
--
-- Safe to apply now. Old app builds don't push either event, so
-- nothing breaks if cloud rolls ahead of client.

-- Migration 017 declared the function with `_occurred_at timestamptz
-- DEFAULT now()`, but cloud projects that pre-date that change (or
-- that took an earlier in-flight variant of 017) may have a different
-- default set on the row in pg_proc, which makes CREATE OR REPLACE
-- raise 42P13 ("cannot remove parameter defaults from existing
-- function"). Drop + recreate is the documented escape hatch and is
-- atomic inside Supabase's SQL editor transaction, so callers never
-- observe a missing function.
DROP FUNCTION IF EXISTS record_engine_telemetry(text, jsonb, timestamptz);

CREATE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb,
  _occurred_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, COALESCE(_occurred_at, now()))
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_022_food_telemetry_events.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_023_custom_foods_barcode.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 023: custom_foods.barcode_ean for Move #1.5 phase 3
--
-- Adds barcode persistence to custom_foods so a barcode the user
-- entered manually (after a scan-miss against OFF/USDA) lives on
-- the custom food, and the next scan resolves locally instead of
-- hitting the network again.
--
-- Schema change is additive (nullable column). Old app builds keep
-- working: they push custom_foods without the column, the RPC just
-- writes NULL.
--
-- Safe to apply now.

ALTER TABLE custom_foods
  ADD COLUMN IF NOT EXISTS barcode_ean text;

CREATE INDEX IF NOT EXISTS idx_custom_foods_user_barcode
  ON custom_foods(user_id, barcode_ean)
  WHERE barcode_ean IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- Update food_sync_push RPC: include barcode_ean in custom_foods
-- INSERT + UPDATE paths. Rest of the RPC body stays identical to
-- migration 021.
--
-- DROP + CREATE rather than CREATE OR REPLACE so a signature change
-- doesn't get rejected by PostgREST.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'food_sync_push'
      AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION food_sync_push(changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_result jsonb := '{}'::jsonb;
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'food_sync_push: not authenticated';
  END IF;

  -- custom_foods (composite PK + barcode_ean as of migration 023)
  IF changes ? 'custom_foods' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO custom_foods (
        id, user_id, name, brand, serving_g, serving_label,
        kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g,
        sodium_100g, sugar_100g, barcode_ean, created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        v_row->>'name', v_row->>'brand',
        (v_row->>'serving_g')::real, v_row->>'serving_label',
        (v_row->>'kcal_100g')::real, (v_row->>'protein_100g')::real,
        (v_row->>'carbs_100g')::real, (v_row->>'fat_100g')::real,
        NULLIF(v_row->>'fibre_100g','')::real,
        NULLIF(v_row->>'sodium_100g','')::real,
        NULLIF(v_row->>'sugar_100g','')::real,
        NULLIF(v_row->>'barcode_ean',''),
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO UPDATE
        SET name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            serving_g = EXCLUDED.serving_g,
            serving_label = EXCLUDED.serving_label,
            kcal_100g = EXCLUDED.kcal_100g,
            protein_100g = EXCLUDED.protein_100g,
            carbs_100g = EXCLUDED.carbs_100g,
            fat_100g = EXCLUDED.fat_100g,
            fibre_100g = EXCLUDED.fibre_100g,
            sodium_100g = EXCLUDED.sodium_100g,
            sugar_100g = EXCLUDED.sugar_100g,
            barcode_ean = EXCLUDED.barcode_ean,
            updated_at = v_now;
    END LOOP;
  END IF;

  -- food_entries
  IF changes ? 'food_entries' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO food_entries (
        id, user_id, entry_date, meal_slot, food_ref, quantity_g,
        kcal, protein_g, carbs_g, fat_g, fibre_g,
        created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        (v_row->>'entry_date')::date, v_row->>'meal_slot',
        v_row->>'food_ref', (v_row->>'quantity_g')::real,
        (v_row->>'kcal')::real, (v_row->>'protein_g')::real,
        (v_row->>'carbs_g')::real, (v_row->>'fat_g')::real,
        NULLIF(v_row->>'fibre_g','')::real,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'updated', '[]'::jsonb))
    LOOP
      UPDATE food_entries SET
        entry_date = (v_row->>'entry_date')::date,
        meal_slot = v_row->>'meal_slot',
        food_ref = v_row->>'food_ref',
        quantity_g = (v_row->>'quantity_g')::real,
        kcal = (v_row->>'kcal')::real,
        protein_g = (v_row->>'protein_g')::real,
        carbs_g = (v_row->>'carbs_g')::real,
        fat_g = (v_row->>'fat_g')::real,
        fibre_g = NULLIF(v_row->>'fibre_g','')::real,
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM food_entries
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  -- daily_intake_rollups (unchanged from migration 021)
  IF changes ? 'daily_intake_rollups' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_intake_rollups'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO daily_intake_rollups (
        user_id, entry_date, kcal_total, protein_total, carbs_total,
        fat_total, fibre_total, updated_at
      ) VALUES (
        v_uid, (v_row->>'entry_date')::date,
        (v_row->>'kcal_total')::real, (v_row->>'protein_total')::real,
        (v_row->>'carbs_total')::real, (v_row->>'fat_total')::real,
        NULLIF(v_row->>'fibre_total','')::real, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET kcal_total = EXCLUDED.kcal_total,
            protein_total = EXCLUDED.protein_total,
            carbs_total = EXCLUDED.carbs_total,
            fat_total = EXCLUDED.fat_total,
            fibre_total = EXCLUDED.fibre_total,
            updated_at = v_now;
    END LOOP;
  END IF;

  IF changes ? 'food_favourites' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_favourites'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO food_favourites (user_id, food_ref, last_used_at)
      VALUES (
        v_uid, v_row->>'food_ref',
        COALESCE((v_row->>'last_used_at')::timestamptz, v_now)
      )
      ON CONFLICT (user_id, food_ref) DO UPDATE
        SET last_used_at = EXCLUDED.last_used_at
        WHERE food_favourites.last_used_at < EXCLUDED.last_used_at;
    END LOOP;
  END IF;

  IF changes ? 'daily_water' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'daily_water'->'updated', '[]'::jsonb))
    LOOP
      INSERT INTO daily_water (user_id, entry_date, ml, updated_at)
      VALUES (
        v_uid, (v_row->>'entry_date')::date,
        (v_row->>'ml')::integer, v_now
      )
      ON CONFLICT (user_id, entry_date) DO UPDATE
        SET ml = EXCLUDED.ml,
            updated_at = v_now
        WHERE daily_water.updated_at < EXCLUDED.updated_at;
    END LOOP;
  END IF;

  IF changes ? 'saved_meals' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO saved_meals (id, user_id, name, ingredients, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        v_row->'ingredients', v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'updated', '[]'::jsonb))
    LOOP
      UPDATE saved_meals SET
        name = v_row->>'name',
        ingredients = v_row->'ingredients',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'saved_meals'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM saved_meals
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF changes ? 'recipes' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipes (id, user_id, name, servings, notes, created_at, updated_at)
      VALUES (
        (v_row->>'id')::uuid, v_uid, v_row->>'name',
        NULLIF(v_row->>'servings','')::real,
        v_row->>'notes', v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'updated', '[]'::jsonb))
    LOOP
      UPDATE recipes SET
        name = v_row->>'name',
        servings = NULLIF(v_row->>'servings','')::real,
        notes = v_row->>'notes',
        updated_at = v_now
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipes'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM recipes
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  IF changes ? 'recipe_ingredients' THEN
    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipe_ingredients'->'created', '[]'::jsonb))
    LOOP
      INSERT INTO recipe_ingredients (
        id, user_id, recipe_id, food_ref, quantity_g, created_at, updated_at
      ) VALUES (
        (v_row->>'id')::uuid, v_uid,
        (v_row->>'recipe_id')::uuid,
        v_row->>'food_ref', (v_row->>'quantity_g')::real,
        v_now, v_now
      )
      ON CONFLICT (user_id, id) DO NOTHING;
    END LOOP;

    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'recipe_ingredients'->'deleted', '[]'::jsonb))
    LOOP
      DELETE FROM recipe_ingredients
      WHERE id = (v_row->>'id')::uuid AND user_id = v_uid;
    END LOOP;
  END IF;

  v_result := jsonb_build_object('applied_at', v_now);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION food_sync_push(jsonb) TO authenticated;


-- END migrate_023_custom_foods_barcode.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_024_consent_log_composite_pk.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 024: composite (user_id, id) PK on consent_log
--
-- consent_log shipped in migration 019 with a simple `id` primary key,
-- which violates IDENTITY_AND_OWNERSHIP_LOCKED.md rule 1 ("every
-- user-scoped table is PRIMARY KEY (user_id, id)"). The collision risk
-- in practice is effectively zero (IDs come from server-side
-- gen_random_uuid() and RLS prevents cross-user reads/writes), but the
-- rule is hard-locked and the audit pass found this as the one
-- outstanding deviation. This migration brings it into line.
--
-- Old-app compatibility: the existing closed-testing build does not
-- write consent_log at all (the consent screen ships only in the new
-- build), so there are no client-side writes to break.
--
-- Safe to apply now.

DO $$
DECLARE
  pkname text;
  pkhas_user_id boolean;
BEGIN
  SELECT conname INTO pkname
  FROM pg_constraint
  WHERE conrelid = 'public.consent_log'::regclass
    AND contype = 'p'
  LIMIT 1;

  IF pkname IS NULL THEN
    RAISE NOTICE 'consent_log has no primary key; adding composite';
    ALTER TABLE public.consent_log ADD PRIMARY KEY (user_id, id);
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_constraint c ON c.conrelid = a.attrelid
    WHERE c.conname = pkname
      AND a.attname = 'user_id'
      AND a.attnum = ANY(c.conkey)
      AND a.attrelid = 'public.consent_log'::regclass
  ) INTO pkhas_user_id;

  IF pkhas_user_id THEN
    RAISE NOTICE 'consent_log PK already includes user_id; nothing to do';
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.consent_log DROP CONSTRAINT %I', pkname);
  ALTER TABLE public.consent_log ADD PRIMARY KEY (user_id, id);
  CREATE INDEX IF NOT EXISTS idx_consent_log_id ON public.consent_log(id);
  RAISE NOTICE 'consent_log composite PK installed';
END $$;


-- END migrate_024_consent_log_composite_pk.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_025_delete_user_data_completeness.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 025: rewrite delete_user_data to know about every user-scoped table
--
-- The existing RPC was last updated in migration 008 and only wipes
-- ten of the legacy tables. Every table added since (food domain,
-- engine domain, identity domain, consent domain, plus the
-- pre-existing tables that migration 008 simply missed) is left
-- intact when delete_user_data runs.
--
-- The downstream symptom: the delete-account Edge Function calls
-- delete_user_data successfully, then calls auth.admin.deleteUser(uid).
-- The auth delete tries to CASCADE through every FK to auth.users(id).
-- If any of those FKs has incomplete CASCADE setup (or even if all
-- are correctly CASCADE-ing, the auth admin can return the generic
-- "Database error deleting user" when the cascade walk is slow or
-- partially fails), the auth user is left in place. The client then
-- shows "Couldn't delete your account" and the founder can never get
-- rid of their test account.
--
-- Fix: enumerate every user-scoped table in this codebase and wipe
-- it. Each delete is in its own sub-block with EXCEPTION WHEN
-- undefined_table THEN NULL so a table that doesn't exist in this
-- particular project (older deployments, mid-migration projects)
-- doesn't abort the whole RPC.
--
-- Safe to apply now. Strictly additive; no schema change. Old app
-- builds calling delete_user_data continue to work and now actually
-- wipe everything they should have been wiping.
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

  -- Order matters when FKs are in play: wipe children before
  -- parents. Each delete is wrapped so a missing table doesn't
  -- abort the rest of the RPC.

  -- ─── Engine + safety domain (Move #2, #3) ───────────────────────────
  BEGIN DELETE FROM engine_telemetry            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM engine_overrides            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM ed_pattern_flags            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Consent + audit domain (Move #2 deferral) ──────────────────────
  BEGIN DELETE FROM consent_log                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Food domain (Move #1, #1.5) ────────────────────────────────────
  BEGIN DELETE FROM recipe_ingredients          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM recipes                     WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM saved_meals                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_favourites             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_water                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_intake_rollups        WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_entries                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_foods                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Training domain ────────────────────────────────────────────────
  BEGIN DELETE FROM workout_sets                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_notes_v2            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workouts                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routine_exercises           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routines                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycle_weeks             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycles                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM planned_muscle_volume       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM adaptation_events           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM programmes                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM peak_week_plans             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_user_notes         WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_goals              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_exercises            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM volume_landmarks            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_volumes              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM personal_records            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Check-ins, metrics, photos ─────────────────────────────────────
  BEGIN DELETE FROM weekly_checkins_v2          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM morning_weights             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM body_metrics                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM progress_photos             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM achievements                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Coach + insights surfaces ──────────────────────────────────────
  BEGIN DELETE FROM coach_outputs               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM nutrition_targets           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_insights               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM autoregulation_suggestions  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── User-owned support rows ────────────────────────────────────────
  BEGIN DELETE FROM user_body_profile           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_feedback               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM debug_log_uploads           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Legacy mixed-ownership exercises (user-customs only) ───────────
  -- exercises.user_id is nullable: library rows have NULL, old user
  -- customs have a uid. Custom rows moved to custom_exercises in 020
  -- but the originals stay for old-app id-by-reference. Wipe them
  -- now so the auth-row delete cascade has nothing left to chase.
  BEGIN DELETE FROM exercises                   WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── users_profile last (load-bearing) ──────────────────────────────
  -- Let this raise if it's missing — that means the deployment is
  -- broken and we want to know about it.
  DELETE FROM users_profile WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;


-- END migrate_025_delete_user_data_completeness.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_027_rapid_loss_compression_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 027: extend record_engine_telemetry allow-list for Move #3
--
-- Adds one event to the server-side allow-list so the upward gate
-- compression fire site can push it without the RPC rejecting the
-- row. Allow-list is duplicated client/server by design (catches
-- typos at both ends).
--
-- Event added:
--   rapid_loss_compression_triggered
--     payload: { weekly_loss_pct: number, energy_score: number,
--                kcal_delta: number, days_compressed: 7 }
--
-- Locked in MOVE_3_UPWARD_GATE_COMPRESSION.md and
-- TELEMETRY_DASHBOARDS_LOCKED.md.
--
-- Safe to apply now. Old app builds don't push the event, so cloud
-- can roll ahead of client without anything breaking. The
-- engine_telemetry_daily view (created in migration 017) is generic
-- and pivots on event name, so no view change is needed --
-- 'rapid_loss_compression_triggered' just appears as a new row in
-- the daily aggregation.
--
-- Migration 017 declared the function with `_occurred_at timestamptz
-- DEFAULT now()`; subsequent migrations (022, this one) DROP +
-- CREATE rather than CREATE OR REPLACE because pg_proc default
-- changes can raise 42P13 on existing rows. Idempotent: re-running
-- this migration produces the same function definition.

DROP FUNCTION IF EXISTS record_engine_telemetry(text, jsonb, timestamptz);

CREATE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb,
  _occurred_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, COALESCE(_occurred_at, now()))
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_027_rapid_loss_compression_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_028_food_library_pull.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 028: food_library_pull RPC for cloud-side delta sync
--
-- Step 3 of the food data plan. The bundled OFF UK snapshot
-- (assets/seed/off_uk_snapshot.json) primes every fresh install
-- with ~20-25k UK products. Between APK releases, new products and
-- corrections land in OpenFoodFacts. We mirror those into cloud
-- `foods` via a separate CI job, then the client polls THIS RPC
-- to pull just the changed rows since its last pull. No full
-- re-download; only the delta.
--
-- Read-only. Returns rows with updated_at > _since. Caps at 5000
-- rows per call so the response stays bounded. Client paginates
-- via repeated calls using the highest updated_at it saw.
--
-- Safe to apply now. Strictly additive; no schema change.
-- Compatible with the old client (won't call this RPC).
--
-- Apply with: paste into Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION food_library_pull(_since timestamptz)
RETURNS TABLE (
  id uuid,
  source text,
  source_id text,
  barcode_ean text,
  name text,
  brand text,
  serving_g numeric,
  serving_label text,
  kcal_100g numeric,
  protein_100g numeric,
  carbs_100g numeric,
  fat_100g numeric,
  fibre_100g numeric,
  sodium_100g numeric,
  sugar_100g numeric,
  verified boolean,
  fetched_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT f.id, f.source, f.source_id, f.barcode_ean,
           f.name, f.brand, f.serving_g, f.serving_label,
           f.kcal_100g, f.protein_100g, f.carbs_100g, f.fat_100g,
           f.fibre_100g, f.sodium_100g, f.sugar_100g,
           f.verified, f.fetched_at, f.updated_at
    FROM foods f
    WHERE f.updated_at > COALESCE(_since, '1970-01-01'::timestamptz)
    ORDER BY f.updated_at ASC
    LIMIT 5000;
END $$;

GRANT EXECUTE ON FUNCTION food_library_pull(timestamptz) TO authenticated;


-- END migrate_028_food_library_pull.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_029_telemetry_allowlist_extension.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 029: extend record_engine_telemetry allow-list
--
-- Adds four events from the locked TELEMETRY_DASHBOARDS_LOCKED.md
-- catalogue that exist for shipped Moves but had no server-side
-- allow-list entry. Without this, the client's `track()` call
-- succeeds locally (the row sits in the SQLite engine_telemetry
-- table) but the cloud push raises "Unknown engine telemetry event".
--
-- Events added:
--   weekly_coach_run        every weekly coach run on a user
--   ffm_floor_hold_fired    FFM floor held a calorie cut
--   food_logged             user logged a food entry
--   food_search_attempt     user ran a text search via the waterfall
--
-- Migration is additive only. No schema change, no RLS change.
-- Safe to apply now. Compatible with the existing closed-testing
-- build (old client never calls these events, so the broader
-- allow-list doesn't change behaviour for it).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_029_telemetry_allowlist_extension.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_030_tier_infrastructure.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 030: Move #5 tier infrastructure (cascade + payments foundation)
--
-- Adds the schema layer the cascade state machine reads and writes:
--   * users_profile columns: trial_state + 4 supporting cols + revenuecat ref
--   * tier_history audit table (composite PK per IDENTITY_AND_OWNERSHIP_LOCKED)
--   * pricing_config single-row table + current_pricing_window() helper
--   * upgrade_tier RPC (the single entry point for tier changes)
--   * start_cascade RPC (the unstarted -> complete_trial_active transition)
--
-- Compatible with the existing closed-testing build:
--   * Schema additions are nullable / defaulted. Old client ignores
--     them and continues to read/write `tier` directly through the
--     existing protect_users_profile_tier trigger.
--   * The new RPCs are net-new; old client never calls them.
--
-- Backfill: existing users with tier='pro' get trial_state='paid_pro'
-- so they are not accidentally treated as cascade-eligible. Existing
-- free users stay at 'unstarted' so the cascade fires when they next
-- grant Article 9 consent in the new flow.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

-- ────────────────────────────────────────────────────────────────────
-- 1. users_profile column additions
-- Schema source: DATABASE_SCHEMA_LOCKED.md lines 459-478 +
--                SUBSCRIPTION_AND_PAYMENT_LOCKED.md line 255 (revenuecat).
-- goal_lock_advanced + goal_lock_set_at + health_data_consent columns
-- already shipped in migrations 017 and 019.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS trial_state text NOT NULL DEFAULT 'unstarted'
    CHECK (trial_state IN (
      'unstarted',
      'complete_trial_active',
      'pro_trial_active',
      'paid_complete',
      'paid_pro',
      'free',
      'cascade_expired'
    )),
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS complete_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_in_price_tier text
    CHECK (locked_in_price_tier IS NULL OR locked_in_price_tier IN ('open_beta','founders','standard')),
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text;

-- Existing pro users (beta testers) keep their paid state. Free
-- users stay 'unstarted' so the next Article 9 consent triggers the
-- cascade. Idempotent: only fires for rows still at the default.
UPDATE users_profile
   SET trial_state = 'paid_pro'
 WHERE trial_state = 'unstarted'
   AND tier = 'pro';

-- ────────────────────────────────────────────────────────────────────
-- 2. tier_history audit table
-- Per DATABASE_SCHEMA_LOCKED.md lines 432-451. Composite PK per
-- IDENTITY_AND_OWNERSHIP_LOCKED.md decision 3.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tier_history (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_tier       text NOT NULL CHECK (from_tier IN ('free','pro','complete','complete_trial','pro_trial')),
  to_tier         text NOT NULL CHECK (to_tier IN ('free','pro','complete','complete_trial','pro_trial')),
  reason          text NOT NULL CHECK (reason IN (
                    'auto_downgrade','user_skip','user_paid',
                    'user_cancelled','grace_lapsed','admin','refunded'
                  )),
  source_surface  text,
  payment_ref     text,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tier_history_user_occurred
  ON tier_history(user_id, occurred_at DESC);

ALTER TABLE tier_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tier history" ON tier_history;
CREATE POLICY "Users read own tier history" ON tier_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies. Writes happen only via the
-- SECURITY DEFINER RPCs below, which bypass RLS by design.

-- ────────────────────────────────────────────────────────────────────
-- 3. pricing_config + current_pricing_window()
-- Single-row config holds the launch-phase boundaries. NULL = phase
-- has not yet started. Pre-launch (all NULL) returns 'open_beta' so
-- any accidental paid transition during Phase A internal testing
-- locks in the best price for that tester (better-safe-than-sorry).
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_config (
  id             int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phase_b_start  timestamptz,
  phase_c_start  timestamptz,
  phase_d_start  timestamptz,
  updated_at     timestamptz DEFAULT now()
);

INSERT INTO pricing_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read pricing_config" ON pricing_config;
CREATE POLICY "Authenticated can read pricing_config" ON pricing_config
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION current_pricing_window()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg pricing_config%ROWTYPE;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO cfg FROM pricing_config WHERE id = 1;

  IF cfg.phase_d_start IS NOT NULL AND now_ts >= cfg.phase_d_start THEN
    RETURN 'standard';
  ELSIF cfg.phase_c_start IS NOT NULL AND now_ts >= cfg.phase_c_start THEN
    RETURN 'founders';
  ELSE
    -- Pre-launch or Phase B (open beta).
    RETURN 'open_beta';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION current_pricing_window() TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 4. _tier_for_trial_state helper (internal)
-- Maps cascade trial_state to the user-facing tier the engine reads.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _tier_for_trial_state(_state text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE _state
    WHEN 'complete_trial_active' THEN 'complete'
    WHEN 'pro_trial_active'      THEN 'pro'
    WHEN 'paid_complete'         THEN 'complete'
    WHEN 'paid_pro'              THEN 'pro'
    ELSE 'free'  -- unstarted, free, cascade_expired
  END;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 5. start_cascade RPC
-- The 'unstarted' -> 'complete_trial_active' transition fired when
-- Article 9 consent is granted at onboarding (per
-- SUBSCRIPTION_AND_PAYMENT_LOCKED.md line 106). Idempotent: re-runs
-- against an already-started cascade no-op.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION start_cascade()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur_state text;
  starts_at timestamptz := now();
  ends_at timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trial_state INTO cur_state FROM users_profile WHERE id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Idempotent: only the first call from 'unstarted' starts the
  -- cascade. Any other state just returns the current values.
  IF cur_state <> 'unstarted' THEN
    RETURN jsonb_build_object(
      'trial_state', cur_state,
      'already_started', true
    );
  END IF;

  ends_at := starts_at + interval '14 days';

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = 'complete',
    trial_state = 'complete_trial_active',
    trial_started_at = starts_at,
    complete_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (uid, 'free', 'complete_trial', 'admin', 'onboarding_article9');

  RETURN jsonb_build_object(
    'trial_state', 'complete_trial_active',
    'tier', 'complete',
    'trial_started_at', starts_at,
    'complete_trial_ends_at', ends_at
  );
END $$;

GRANT EXECUTE ON FUNCTION start_cascade() TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 6. upgrade_tier RPC
-- The single entry point for every tier change other than the
-- initial cascade start. Computes the destination trial_state from
-- (target_tier, reason), updates users_profile, writes a
-- tier_history row, returns the new state.
--
-- Bypasses protect_users_profile_tier via session_replication_role
-- so tier UPDATEs from this RPC are NOT reverted. The trigger still
-- protects against client-direct UPDATEs.
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upgrade_tier(
  _target_tier text,
  _reason text,
  _source_surface text DEFAULT NULL,
  _payment_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur RECORD;
  new_trial_state text;
  new_tier text;
  new_lock text;
  new_complete_ends timestamptz;
  new_pro_ends timestamptz;
  history_from text;
  history_to text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _target_tier NOT IN ('pro','complete','free') THEN
    RAISE EXCEPTION 'Invalid target_tier: %', _target_tier;
  END IF;

  IF _reason NOT IN ('auto_downgrade','user_skip','user_paid',
                     'user_cancelled','grace_lapsed','admin','refunded') THEN
    RAISE EXCEPTION 'Invalid reason: %', _reason;
  END IF;

  IF _reason = 'user_paid' AND _payment_ref IS NULL THEN
    RAISE EXCEPTION 'user_paid requires payment_ref';
  END IF;

  SELECT tier, trial_state, locked_in_price_tier,
         complete_trial_ends_at, pro_trial_ends_at, trial_started_at
    INTO cur
  FROM users_profile WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Compute destination trial_state from (target, reason). Locked
  -- table per SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 102-119.
  new_trial_state := CASE
    WHEN _reason = 'user_paid'      AND _target_tier = 'complete' THEN 'paid_complete'
    WHEN _reason = 'user_paid'      AND _target_tier = 'pro'      THEN 'paid_pro'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'pro'      THEN 'pro_trial_active'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'free'     THEN 'cascade_expired'
    WHEN _reason = 'user_skip'      AND _target_tier = 'pro'      THEN 'pro_trial_active'
    WHEN _reason = 'user_skip'      AND _target_tier = 'free'     THEN 'free'
    WHEN _reason IN ('user_cancelled','grace_lapsed','refunded')
                                    AND _target_tier = 'free'     THEN 'free'
    WHEN _reason = 'admin'          AND _target_tier = 'complete' THEN 'paid_complete'
    WHEN _reason = 'admin'          AND _target_tier = 'pro'      THEN 'paid_pro'
    WHEN _reason = 'admin'          AND _target_tier = 'free'     THEN 'free'
    ELSE NULL
  END;

  IF new_trial_state IS NULL THEN
    RAISE EXCEPTION 'Invalid transition: target=% reason=% (current trial_state=%)',
      _target_tier, _reason, cur.trial_state;
  END IF;

  new_tier := _tier_for_trial_state(new_trial_state);

  -- Lock in the pricing window on the first paid transition.
  IF cur.locked_in_price_tier IS NULL AND _reason = 'user_paid' THEN
    new_lock := current_pricing_window();
  ELSE
    new_lock := cur.locked_in_price_tier;
  END IF;

  -- If we are entering pro_trial_active from complete_trial_active
  -- via auto_downgrade, set the pro trial's 14-day window.
  new_complete_ends := cur.complete_trial_ends_at;
  new_pro_ends := cur.pro_trial_ends_at;

  IF new_trial_state = 'pro_trial_active'
     AND cur.trial_state = 'complete_trial_active' THEN
    new_pro_ends := now() + interval '14 days';
  END IF;

  -- Map cur.trial_state + new_trial_state to history tier names.
  -- complete_trial / pro_trial are tier-history-only labels for the
  -- trial states; complete / pro / free are stable post-cascade.
  history_from := CASE cur.trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_complete' THEN 'complete'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;
  history_to := CASE new_trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_complete' THEN 'complete'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = new_tier,
    trial_state = new_trial_state,
    locked_in_price_tier = new_lock,
    complete_trial_ends_at = new_complete_ends,
    pro_trial_ends_at = new_pro_ends
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (
    user_id, from_tier, to_tier, reason, source_surface, payment_ref
  ) VALUES (
    uid, history_from, history_to, _reason, _source_surface, _payment_ref
  );

  RETURN jsonb_build_object(
    'trial_state', new_trial_state,
    'tier', new_tier,
    'locked_in_price_tier', new_lock,
    'complete_trial_ends_at', new_complete_ends,
    'pro_trial_ends_at', new_pro_ends,
    'payment_ref', _payment_ref
  );
END $$;

GRANT EXECUTE ON FUNCTION upgrade_tier(text, text, text, text) TO authenticated;


-- END migrate_030_tier_infrastructure.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_031_cascade_workers.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 031: cascade auto-downgrade workers (pg_cron)
--
-- The cascade transitions complete_trial_active → pro_trial_active
-- at day 14, and pro_trial_active → cascade_expired at day 28. Per
-- SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 107-114 + MOVE_5_TIER_INFRASTRUCTURE.md
-- lines 117-130 these run as Supabase scheduled functions.
--
-- One worker function does both gates. Scheduled every 15 minutes
-- so the latency between trial-end and downgrade is bounded.
-- Granular enough for the day-12 / day-14 / day-26 / day-28 cadence
-- locked in NOTIFICATIONS_LOCKED.md.
--
-- Idempotent and safe to run concurrently:
--   * Uses tier-protect trigger bypass via session_replication_role
--     (same pattern as upgrade_tier).
--   * Each transition is one batched UPDATE + matching INSERT into
--     tier_history.
--   * trial_state guard in the WHERE clause ensures rows already
--     transitioned can never be advanced twice.
--
-- Requires pg_cron extension. Supabase Free tier supports this;
-- enable in Dashboard → Database → Extensions if not already on
-- (CREATE EXTENSION below is idempotent and silently succeeds).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ────────────────────────────────────────────────────────────────────
-- Worker function
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cascade_advance_due_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_uids uuid[];
  advanced_to_pro_count int := 0;
  advanced_to_free_count int := 0;
  started_at timestamptz := now();
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);

  -- ─── Day 14: complete_trial_active → pro_trial_active ────────────
  SELECT array_agg(id) INTO expired_uids
  FROM users_profile
  WHERE trial_state = 'complete_trial_active'
    AND complete_trial_ends_at IS NOT NULL
    AND complete_trial_ends_at <= started_at;

  IF expired_uids IS NOT NULL AND array_length(expired_uids, 1) > 0 THEN
    UPDATE users_profile
       SET trial_state = 'pro_trial_active',
           tier = 'pro',
           pro_trial_ends_at = started_at + interval '14 days'
     WHERE id = ANY(expired_uids)
       AND trial_state = 'complete_trial_active';  -- re-check to avoid double-advance

    INSERT INTO tier_history (
      user_id, from_tier, to_tier, reason, source_surface, occurred_at
    )
    SELECT u, 'complete_trial', 'pro_trial', 'auto_downgrade',
           'cascade_day14_worker', started_at
    FROM unnest(expired_uids) u;

    advanced_to_pro_count := array_length(expired_uids, 1);
  END IF;

  -- ─── Day 28: pro_trial_active → cascade_expired ──────────────────
  expired_uids := NULL;
  SELECT array_agg(id) INTO expired_uids
  FROM users_profile
  WHERE trial_state = 'pro_trial_active'
    AND pro_trial_ends_at IS NOT NULL
    AND pro_trial_ends_at <= started_at;

  IF expired_uids IS NOT NULL AND array_length(expired_uids, 1) > 0 THEN
    UPDATE users_profile
       SET trial_state = 'cascade_expired',
           tier = 'free'
     WHERE id = ANY(expired_uids)
       AND trial_state = 'pro_trial_active';

    INSERT INTO tier_history (
      user_id, from_tier, to_tier, reason, source_surface, occurred_at
    )
    SELECT u, 'pro_trial', 'free', 'auto_downgrade',
           'cascade_day28_worker', started_at
    FROM unnest(expired_uids) u;

    advanced_to_free_count := array_length(expired_uids, 1);
  END IF;

  PERFORM set_config('session_replication_role', 'origin', true);

  RETURN jsonb_build_object(
    'advanced_to_pro', advanced_to_pro_count,
    'advanced_to_free', advanced_to_free_count,
    'ran_at', started_at,
    'duration_ms', round(EXTRACT(epoch FROM (now() - started_at)) * 1000)
  );
END $$;

-- Restrict execution. Worker should only ever be invoked by pg_cron
-- (which runs as the cron user) or by service-role for ops triggers.
REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Schedule: every 15 minutes. Idempotent unschedule + re-schedule so
-- re-running this migration updates the schedule cleanly.
-- ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- cron.unschedule raises if the job doesn't exist; swallow.
  BEGIN
    PERFORM cron.unschedule('cascade-advance-due-users');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

SELECT cron.schedule(
  'cascade-advance-due-users',
  '*/15 * * * *',
  $cron$SELECT cascade_advance_due_users();$cron$
);


-- END migrate_031_cascade_workers.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_032_paywall_telemetry_events.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 032: extend record_engine_telemetry allow-list with the
-- two Move #4 differential paywall events.
--
-- Events added:
--   paywall_shown          DifferentialBadge appeared on a coach output
--   paywall_tapped_cta     User chose pay / dismiss
--
-- Together they drive the cascade-and-conversion dashboard panel
-- per TELEMETRY_DASHBOARDS_LOCKED.md Panel 5.
--
-- Migration is additive only. Backward-compatible with the existing
-- closed-test build (it doesn't emit these events).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_032_paywall_telemetry_events.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_033_two_tier_consolidation.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 033: 2-tier consolidation (founder override 2026-05-25)
--
-- Volyume shipped originally as 3 tiers (Free, Pro, Complete) with a
-- 28-day Complete→Pro→Free cascade. Founder direction 2026-05-25:
-- consolidate to 2 tiers (Free, Pro), single 21-day Pro trial,
-- Complete tier dropped, Peak Week removed entirely. See
-- docs/COMPLETE_TIER_SCOPE_LOCKED.md and
-- docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md for the new locked spec.
--
-- Schema changes:
--
--   * start_cascade RPC: now transitions to 'pro_trial_active' with
--     a 21-day window (was 'complete_trial_active' with 14-day).
--   * upgrade_tier RPC: simplified case statements. Legacy
--     transitions to/from 'complete_*' states left in for schema
--     safety but unreachable in normal client flow.
--   * cascade_advance_due_users worker: drops the day-14
--     Complete→Pro step; only handles the day-21 Pro→Free expiry.
--
-- CHECK constraints on trial_state, tier_history.from_tier, and
-- tier_history.to_tier are left INCLUSIVE of the legacy 'complete*'
-- values. This is deliberate: the values are dead in the 2-tier
-- model but never get written by the new code, so dropping them
-- from the CHECK would require a coordinated schema rewrite for
-- zero functional benefit. The unused values stay in the constraint
-- like dead language tags in an i18n bundle.
--
-- Backfill: no rows in production currently sit at
-- 'complete_trial_active' or 'paid_complete' (migration 030's
-- backfill mapped existing tier='pro' users to 'paid_pro' and free
-- users to 'unstarted'). If any are inadvertently in those states,
-- the migration below maps them to the 2-tier equivalents.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

-- ────────────────────────────────────────────────────────────────────
-- 1. Backfill any users still in legacy Complete states
-- ────────────────────────────────────────────────────────────────────

UPDATE users_profile
   SET trial_state = 'pro_trial_active',
       tier = 'pro',
       pro_trial_ends_at = COALESCE(complete_trial_ends_at, now() + interval '21 days'),
       complete_trial_ends_at = NULL
 WHERE trial_state = 'complete_trial_active';

UPDATE users_profile
   SET trial_state = 'paid_pro',
       tier = 'pro'
 WHERE trial_state = 'paid_complete';

-- ────────────────────────────────────────────────────────────────────
-- 2. start_cascade RPC — 21-day Pro trial
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION start_cascade()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur_state text;
  starts_at timestamptz := now();
  ends_at timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trial_state INTO cur_state FROM users_profile WHERE id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  IF cur_state <> 'unstarted' THEN
    RETURN jsonb_build_object(
      'trial_state', cur_state,
      'already_started', true
    );
  END IF;

  ends_at := starts_at + interval '21 days';

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = 'pro',
    trial_state = 'pro_trial_active',
    trial_started_at = starts_at,
    pro_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9');

  RETURN jsonb_build_object(
    'trial_state', 'pro_trial_active',
    'tier', 'pro',
    'trial_started_at', starts_at,
    'pro_trial_ends_at', ends_at
  );
END $$;

GRANT EXECUTE ON FUNCTION start_cascade() TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 3. upgrade_tier RPC — simplified for 2 tiers
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upgrade_tier(
  _target_tier text,
  _reason text,
  _source_surface text DEFAULT NULL,
  _payment_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur RECORD;
  new_trial_state text;
  new_tier text;
  new_lock text;
  new_pro_ends timestamptz;
  history_from text;
  history_to text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2-tier model: target is 'pro' or 'free'. ('complete' rejected.)
  IF _target_tier NOT IN ('pro', 'free') THEN
    RAISE EXCEPTION 'Invalid target_tier: % (2-tier model accepts pro|free only)', _target_tier;
  END IF;

  IF _reason NOT IN ('auto_downgrade','user_skip','user_paid',
                     'user_cancelled','grace_lapsed','admin','refunded') THEN
    RAISE EXCEPTION 'Invalid reason: %', _reason;
  END IF;

  IF _reason = 'user_paid' AND _payment_ref IS NULL THEN
    RAISE EXCEPTION 'user_paid requires payment_ref';
  END IF;

  SELECT tier, trial_state, locked_in_price_tier,
         pro_trial_ends_at, trial_started_at
    INTO cur
  FROM users_profile WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Compute destination trial_state. Simpler than the 3-tier era;
  -- the only paid destination is paid_pro.
  new_trial_state := CASE
    WHEN _reason = 'user_paid'      AND _target_tier = 'pro'  THEN 'paid_pro'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'free' THEN 'cascade_expired'
    WHEN _reason = 'user_skip'      AND _target_tier = 'free' THEN 'free'
    WHEN _reason IN ('user_cancelled','grace_lapsed','refunded')
                                    AND _target_tier = 'free' THEN 'free'
    WHEN _reason = 'admin'          AND _target_tier = 'pro'  THEN 'paid_pro'
    WHEN _reason = 'admin'          AND _target_tier = 'free' THEN 'free'
    ELSE NULL
  END;

  IF new_trial_state IS NULL THEN
    RAISE EXCEPTION 'Invalid transition: target=% reason=% (current trial_state=%)',
      _target_tier, _reason, cur.trial_state;
  END IF;

  new_tier := CASE
    WHEN new_trial_state IN ('paid_pro') THEN 'pro'
    ELSE 'free'
  END;

  -- Lock in pricing window on the first paid transition.
  IF cur.locked_in_price_tier IS NULL AND _reason = 'user_paid' THEN
    new_lock := current_pricing_window();
  ELSE
    new_lock := cur.locked_in_price_tier;
  END IF;

  new_pro_ends := cur.pro_trial_ends_at;

  -- Map current + new trial_state to history tier labels.
  history_from := CASE cur.trial_state
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_pro' THEN 'pro'
    -- Legacy values (unreachable in normal flow, kept for safety):
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'paid_complete' THEN 'complete'
    ELSE 'free'
  END;
  history_to := CASE new_trial_state
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = new_tier,
    trial_state = new_trial_state,
    locked_in_price_tier = new_lock,
    pro_trial_ends_at = new_pro_ends
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (
    user_id, from_tier, to_tier, reason, source_surface, payment_ref
  ) VALUES (
    uid, history_from, history_to, _reason, _source_surface, _payment_ref
  );

  RETURN jsonb_build_object(
    'trial_state', new_trial_state,
    'tier', new_tier,
    'locked_in_price_tier', new_lock,
    'pro_trial_ends_at', new_pro_ends,
    'payment_ref', _payment_ref
  );
END $$;

GRANT EXECUTE ON FUNCTION upgrade_tier(text, text, text, text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 4. cascade_advance_due_users — 2-tier version
-- ────────────────────────────────────────────────────────────────────
-- Only one transition path now: pro_trial_active → cascade_expired
-- when pro_trial_ends_at lapses. The 14-day complete→pro step is
-- removed.

CREATE OR REPLACE FUNCTION cascade_advance_due_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_uids uuid[];
  advanced_to_free_count int := 0;
  started_at timestamptz := now();
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);

  -- pro_trial_active → cascade_expired
  SELECT array_agg(id) INTO expired_uids
  FROM users_profile
  WHERE trial_state = 'pro_trial_active'
    AND pro_trial_ends_at IS NOT NULL
    AND pro_trial_ends_at <= started_at;

  IF expired_uids IS NOT NULL AND array_length(expired_uids, 1) > 0 THEN
    UPDATE users_profile
       SET trial_state = 'cascade_expired',
           tier = 'free'
     WHERE id = ANY(expired_uids)
       AND trial_state = 'pro_trial_active';

    INSERT INTO tier_history (
      user_id, from_tier, to_tier, reason, source_surface, occurred_at
    )
    SELECT u, 'pro_trial', 'free', 'auto_downgrade',
           'cascade_day21_worker', started_at
    FROM unnest(expired_uids) u;

    advanced_to_free_count := array_length(expired_uids, 1);
  END IF;

  PERFORM set_config('session_replication_role', 'origin', true);

  RETURN jsonb_build_object(
    'advanced_to_free', advanced_to_free_count,
    'ran_at', started_at,
    'duration_ms', round(EXTRACT(epoch FROM (now() - started_at)) * 1000)
  );
END $$;

REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cascade_advance_due_users() FROM authenticated;

-- pg_cron schedule is unchanged from migration 031; the worker just
-- has fewer states to process now. Re-schedule to confirm the
-- replaced function is the one cron calls.
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('cascade-advance-due-users');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

SELECT cron.schedule(
  'cascade-advance-due-users',
  '*/15 * * * *',
  $cron$SELECT cascade_advance_due_users();$cron$
);


-- END migrate_033_two_tier_consolidation.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_034_telemetry_payload_column_fix.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 034: fix record_engine_telemetry INSERT column name.
--
-- Migrations 029 and 032 (extending the event allow-list) introduced a
-- typo: they INSERT into a column named `payload` but the actual
-- engine_telemetry column from migration 017 is `payload_json`. With
-- migration 032 currently live, every cloud push raises:
--
--   column "payload" of relation "engine_telemetry" does not exist
--
-- visible in the client as repeated WARN engineTelemetry.flush.rpc
-- entries. The local SQLite row still lands (it has its own column
-- shape and INSERT path), but the cloud row is dropped.
--
-- This migration restores the correct column name. It keeps the full
-- event allow-list from migration 032 (the most recent superset).
--
-- Additive only. No schema change, no RLS change. Safe to apply now;
-- existing closed-test build never emits the newer events so the
-- broader allow-list doesn't change behaviour for it.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_034_telemetry_payload_column_fix.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_035_auth_consent_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 035: extend record_engine_telemetry allow-list with the
-- auth + consent funnel events.
--
-- Events added:
--   sign_in                     SIGNED_IN auth event (not session restore)
--   sign_out                    sign-out flow start, before local wipe
--   article9_consent_recorded   UK GDPR Article 9 explicit consent granted
--
-- Together they cover the funnel from account entry through consent
-- through exit, which Panel 1 (engine health) and Panel 8 (account
-- lifecycle) of TELEMETRY_DASHBOARDS_LOCKED.md need to populate.
--
-- The legal evidence trail for Article 9 consent still lives in the
-- consent_log table (migration 019); this event is the dashboard
-- counterpart, not the legal record.
--
-- Additive only. No schema change, no RLS change. Compatible with
-- the existing closed-test build (it never emits these events).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_035_auth_consent_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_036_signup_funnel_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 036: extend record_engine_telemetry allow-list with the
-- signup funnel closure events.
--
-- Events added:
--   account_created        fires on SIGNED_IN when session.user.created_at
--                          is within the last 5 minutes (covers
--                          email-auto-confirm and OAuth signup paths)
--   custom_food_created    fires when AddCustomFoodScreen.onSave
--                          successfully writes a custom_foods row
--
-- Closes the gap between sign_in (Move #035) and the in-app activity
-- events (food_logged, weekly_coach_run). With these two, the cohort
-- dashboard can compute account-create → consent → first-log
-- conversion ratios across the funnel.
--
-- Additive only. No schema change, no RLS change. Compatible with
-- the existing closed-test build (it never emits these events).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_036_signup_funnel_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_037_lifecycle_sync_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 037: extend record_engine_telemetry allow-list with the
-- app lifecycle + sync cadence events.
--
-- Events added:
--   app_cold_start     once per process, the first time the foreground
--                      sync resolves a signed-in user.
--   app_foregrounded   AppState change to 'active' AFTER cold-start
--                      (so the first 'active' on mount doesn't double-
--                      count with app_cold_start).
--   app_backgrounded   AppState change to 'background'. Excludes
--                      'inactive' (the iOS transient control-centre /
--                      phone-call state), which would otherwise
--                      overstate sessions.
--   sync_run           end of each maybeSync round that resolved a
--                      signed-in user. Throttled by the upstream
--                      MIN_SYNC_INTERVAL_MS = 60s gate.
--
-- Together these fill Panel 1 (engine health) — DAU / WAU / MAU
-- cohorts, sync staleness alerts, and time-to-foreground after
-- background. Closed-test build doesn't emit any of them so the
-- broader allow-list is a no-op for it.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_037_lifecycle_sync_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_038_payments_cascade_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 038: extend record_engine_telemetry allow-list with the
-- payments + cascade telemetry catalogue.
--
-- Events added:
--   cascade_state_transition       generic umbrella with reason +
--                                  source_surface + target_tier; fired
--                                  on every cascade.* RPC success.
--   purchase_initiated             top of playBilling.purchasePackage,
--                                  before the IAP dialog opens.
--   purchase_completed             purchaseUpdatedListener success path.
--   purchase_failed                purchaseErrorListener (excluding
--                                  user-cancel; that's a normal flow).
--   subscription_cancelled         cascade.cancel / graceLapsed /
--                                  refunded paths (RTDN webhook
--                                  reconciliation).
--   restore_purchases_attempted    top of payments/restore.restorePurchases.
--
-- Together these populate Panel 5 (cascade and conversion) with the
-- full state-transition stream + the purchase funnel. The granular
-- cascade variants (cascade_started, cascade_advanced,
-- cascade_skipped_ahead, paid_converted, churn_at_gate) were already
-- allow-listed in migration 017 and 029; this migration is the new
-- coverage layer on top.
--
-- Additive only. No schema change, no RLS change. Compatible with
-- the existing closed-test build (it never emits these events).
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run',
    'cascade_state_transition',
    'purchase_initiated',
    'purchase_completed',
    'purchase_failed',
    'subscription_cancelled',
    'restore_purchases_attempted'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_038_payments_cascade_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_039_account_deletions_log.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 039: account_deletions_log
--
-- Non-cascading audit table for account deletion events. The
-- engine_telemetry table has ON DELETE CASCADE on user_id, so any
-- account_deleted event written there would die instantly with the
-- auth.users row during the delete flow. This table intentionally
-- does NOT have a foreign key to auth.users so the row survives.
--
-- Drives TELEMETRY_DASHBOARDS_LOCKED.md Panel 8:
--   - "Open account deletion queue depth" = COUNT(*) WHERE completed_at IS NULL
--   - "Account deletion queue stuck" alert = age(initiated_at) > 48h AND completed_at IS NULL
--   - "Consent withdrawal → account deletion completed" ratio against
--     the reason column (the consent_log table also cascades, so we
--     capture the withdrawal context here at delete time)
--
-- Written by the delete-account Edge Function via service-role key.
-- No client-side INSERT policy (RLS denies all by default), so no
-- caller can spoof a deletion event. Read access stays
-- service-role-only too; the dashboard reads via the analytics SQL
-- role (Supabase Studio).
--
-- FTC HBNR + UK GDPR: stores the user's email at deletion time so
-- the breach-notification obligation can be satisfied without
-- needing the dead auth.users row. Email is PII and retained
-- indefinitely; this is an acceptable trade-off for compliance.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE TABLE IF NOT EXISTS account_deletions_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  user_email      text,
  initiated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  reason          text,
  source          text NOT NULL DEFAULT 'in_app',
  app_version     text,
  platform        text
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_log_open
  ON account_deletions_log(initiated_at DESC)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_account_deletions_log_user
  ON account_deletions_log(user_id, initiated_at DESC);

ALTER TABLE account_deletions_log ENABLE ROW LEVEL SECURITY;

-- No policies. RLS denies all access for anon/authenticated roles;
-- only the service-role key (used by the delete-account Edge
-- Function and analytics SQL) bypasses RLS.

DROP POLICY IF EXISTS "deny all on account_deletions_log" ON account_deletions_log;

-- ─────────────────────────────────────────────────────────────────────
-- record_account_deletion_started: called by the Edge Function with
-- the service-role client AFTER delete_user_data() succeeds and
-- BEFORE auth.admin.deleteUser() runs. Returns the new row id so
-- the function can update completed_at after the auth delete lands.
-- ─────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS record_account_deletion_started(uuid, text, text, text, text, text) CASCADE;

CREATE FUNCTION record_account_deletion_started(
  _user_id     uuid,
  _user_email  text,
  _reason      text DEFAULT NULL,
  _source      text DEFAULT 'in_app',
  _app_version text DEFAULT NULL,
  _platform    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO account_deletions_log
    (user_id, user_email, reason, source, app_version, platform)
  VALUES (_user_id, _user_email, _reason, _source, _app_version, _platform)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- Service role only. No GRANT to authenticated; the Edge Function
-- runs with the service role for this step. The explicit GRANT to
-- service_role is required: REVOKE FROM PUBLIC strips the default
-- grant chain, and service_role does not inherit EXECUTE on
-- SECURITY DEFINER functions automatically.
REVOKE EXECUTE ON FUNCTION record_account_deletion_started(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_account_deletion_started(uuid, text, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION record_account_deletion_started(uuid, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION record_account_deletion_started(uuid, text, text, text, text, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- record_account_deletion_completed: called immediately after
-- auth.admin.deleteUser() returns successfully. Sets completed_at so
-- the queue depth dashboard goes back to zero.
-- ─────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS record_account_deletion_completed(uuid) CASCADE;

CREATE FUNCTION record_account_deletion_completed(
  _row_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE account_deletions_log
  SET completed_at = now()
  WHERE id = _row_id AND completed_at IS NULL;
  RETURN FOUND;
END $$;

REVOKE EXECUTE ON FUNCTION record_account_deletion_completed(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_account_deletion_completed(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION record_account_deletion_completed(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION record_account_deletion_completed(uuid) TO service_role;


-- END migrate_039_account_deletions_log.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_040_notification_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 040: extend record_engine_telemetry allow-list with the
-- notification surface catalogue (Panel 6, NOTIFICATIONS_LOCKED.md).
--
-- Events added:
--   notification_sent     fired from the expo-notifications received-
--                         listener when the OS delivers a notification
--                         while the app process is alive enough to
--                         observe it. Payload carries the category +
--                         scheduled_for + delivered_at so Panel 6 can
--                         break send rate down per category.
--   notification_tapped   fired from the response-listener whenever
--                         a delivered notification is opened. Powers
--                         per-category open rate.
--   notification_failed   fired when a local schedule call throws
--                         (storage failure, expo-notifications threw,
--                         missing channel). Cross-device push
--                         deliverability failures live with the Expo
--                         Push service and are not surfaced here.
--
-- Together these populate Panel 6 (notification rates) with send /
-- open / fail counts per category. The categories themselves come
-- from src/lib/notifications/categories.js -- no server-side enum
-- is enforced; the RPC just records whatever string the client
-- sends in the payload.category JSON field.
--
-- Additive only. No schema change, no RLS change. Compatible with
-- the existing closed-test build (it never emits these events).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run',
    'cascade_state_transition',
    'purchase_initiated',
    'purchase_completed',
    'purchase_failed',
    'subscription_cancelled',
    'restore_purchases_attempted',
    'notification_sent',
    'notification_tapped',
    'notification_failed'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_040_notification_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_041_consent_withdrawal_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 041: extend record_engine_telemetry allow-list with the
-- Article 9 consent withdrawal event.
--
-- Event added:
--   article9_consent_withdrawn   fires from SettingsScreen's withdraw
--                                flow once record_health_consent(false)
--                                returns successfully. The consent_log
--                                table (migration 019) is the legal
--                                audit trail; this event populates the
--                                Panel 8 withdrawal-rate dashboard so
--                                we can see how many users revoke and
--                                from which surface.
--
-- Additive only. No schema change, no RLS change. Compatible with the
-- existing closed-test build (it doesn't emit this event yet).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run',
    'cascade_state_transition',
    'purchase_initiated',
    'purchase_completed',
    'purchase_failed',
    'subscription_cancelled',
    'restore_purchases_attempted',
    'notification_sent',
    'notification_tapped',
    'notification_failed',
    'article9_consent_withdrawn'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_041_consent_withdrawal_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_042_upgrade_tier_for_user.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 042: upgrade_tier_for_user (service-role-only variant of
-- upgrade_tier that takes the user_id as an explicit parameter).
--
-- Why this exists:
--   The Google Play Real-Time Developer Notifications (RTDN) Edge
--   Function (supabase/functions/play-billing-rtdn/index.ts) runs
--   with the service role and needs to write tier transitions for
--   arbitrary users (renewal, cancellation, refund, expiry,
--   restart). The original upgrade_tier RPC reads auth.uid() to
--   decide whose row to write. PostgREST's service-role JWT does
--   not populate auth.uid() with the target user, so calling
--   upgrade_tier from the Edge Function silently failed with
--   "Not authenticated" or wrote rows under the service role
--   instead of the purchasing user. The webhook tried to work
--   around this with a fabricated x-supabase-user-id header,
--   which PostgREST does not honour.
--
--   upgrade_tier_for_user accepts the user_id directly. It is
--   service-role-only (REVOKE PUBLIC + GRANT service_role) so a
--   compromised client cannot abuse it to grant itself Pro on
--   arbitrary accounts. The body mirrors upgrade_tier exactly
--   except for the uid binding; intentional duplication rather
--   than refactoring the production upgrade_tier signature,
--   which the closed-test build calls and must keep working
--   (CLAUDE.md release policy 2026-05-24).
--
-- Additive only. No change to upgrade_tier, users_profile,
-- tier_history, or any existing trigger. Re-runnable
-- (CREATE OR REPLACE FUNCTION).
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        042
--   - Purpose:                 service-role-only upgrade_tier_for_user RPC
--   - Applied locally:         no (no local dev Supabase project at v1)
--   - Applied remotely:        pending founder apply (supabase/README.md)
--   - Safe to re-run:          yes (CREATE OR REPLACE FUNCTION)
--   - Rollback:                DROP FUNCTION upgrade_tier_for_user(uuid, text, text, text, text)
--   - App-code dependencies:   supabase/functions/play-billing-rtdn/index.ts
--                              calls this RPC for every RTDN tier
--                              transition. Old AAB (pre-RTDN) is
--                              unaffected because nothing in it calls
--                              this function.
--
-- Apply via Supabase Dashboard → SQL Editor → Run.

CREATE OR REPLACE FUNCTION upgrade_tier_for_user(
  _user_id uuid,
  _target_tier text,
  _reason text,
  _source_surface text DEFAULT NULL,
  _payment_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := _user_id;
  cur RECORD;
  new_trial_state text;
  new_tier text;
  new_lock text;
  new_complete_ends timestamptz;
  new_pro_ends timestamptz;
  history_from text;
  history_to text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'upgrade_tier_for_user: _user_id is required';
  END IF;

  IF _target_tier NOT IN ('pro','complete','free') THEN
    RAISE EXCEPTION 'Invalid target_tier: %', _target_tier;
  END IF;

  IF _reason NOT IN ('auto_downgrade','user_skip','user_paid',
                     'user_cancelled','grace_lapsed','admin','refunded') THEN
    RAISE EXCEPTION 'Invalid reason: %', _reason;
  END IF;

  IF _reason = 'user_paid' AND _payment_ref IS NULL THEN
    RAISE EXCEPTION 'user_paid requires payment_ref';
  END IF;

  SELECT tier, trial_state, locked_in_price_tier,
         complete_trial_ends_at, pro_trial_ends_at, trial_started_at
    INTO cur
  FROM users_profile WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  new_trial_state := CASE
    WHEN _reason = 'user_paid'      AND _target_tier = 'complete' THEN 'paid_complete'
    WHEN _reason = 'user_paid'      AND _target_tier = 'pro'      THEN 'paid_pro'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'pro'      THEN 'pro_trial_active'
    WHEN _reason = 'auto_downgrade' AND _target_tier = 'free'     THEN 'cascade_expired'
    WHEN _reason = 'user_skip'      AND _target_tier = 'pro'      THEN 'pro_trial_active'
    WHEN _reason = 'user_skip'      AND _target_tier = 'free'     THEN 'free'
    WHEN _reason IN ('user_cancelled','grace_lapsed','refunded')
                                    AND _target_tier = 'free'     THEN 'free'
    WHEN _reason = 'admin'          AND _target_tier = 'complete' THEN 'paid_complete'
    WHEN _reason = 'admin'          AND _target_tier = 'pro'      THEN 'paid_pro'
    WHEN _reason = 'admin'          AND _target_tier = 'free'     THEN 'free'
    ELSE NULL
  END;

  IF new_trial_state IS NULL THEN
    RAISE EXCEPTION 'Invalid transition: target=% reason=% (current trial_state=%)',
      _target_tier, _reason, cur.trial_state;
  END IF;

  new_tier := _tier_for_trial_state(new_trial_state);

  IF cur.locked_in_price_tier IS NULL AND _reason = 'user_paid' THEN
    new_lock := current_pricing_window();
  ELSE
    new_lock := cur.locked_in_price_tier;
  END IF;

  new_complete_ends := cur.complete_trial_ends_at;
  new_pro_ends := cur.pro_trial_ends_at;

  IF new_trial_state = 'pro_trial_active'
     AND cur.trial_state = 'complete_trial_active' THEN
    new_pro_ends := now() + interval '14 days';
  END IF;

  history_from := CASE cur.trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_complete' THEN 'complete'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;
  history_to := CASE new_trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active' THEN 'pro_trial'
    WHEN 'paid_complete' THEN 'complete'
    WHEN 'paid_pro' THEN 'pro'
    ELSE 'free'
  END;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE users_profile SET
    tier = new_tier,
    trial_state = new_trial_state,
    locked_in_price_tier = new_lock,
    complete_trial_ends_at = new_complete_ends,
    pro_trial_ends_at = new_pro_ends
  WHERE id = uid;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO tier_history (
    user_id, from_tier, to_tier, reason, source_surface, payment_ref
  ) VALUES (
    uid, history_from, history_to, _reason, _source_surface, _payment_ref
  );

  RETURN jsonb_build_object(
    'trial_state', new_trial_state,
    'tier', new_tier,
    'locked_in_price_tier', new_lock,
    'complete_trial_ends_at', new_complete_ends,
    'pro_trial_ends_at', new_pro_ends,
    'payment_ref', _payment_ref
  );
END $$;

-- Service-role only. A compromised client must not be able to grant
-- itself Pro on someone else's account by calling this directly.
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION upgrade_tier_for_user(uuid, text, text, text, text) TO service_role;


-- END migrate_042_upgrade_tier_for_user.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_043_sync_conflict_telemetry.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 043: extend record_engine_telemetry allow-list with the
-- sync_conflict_resolved event.
--
-- Event added:
--   sync_conflict_resolved   fires from src/lib/sync/conflict.js
--                            whenever a row is contested between the
--                            local SQLite copy and the cloud row.
--                            Payload carries:
--                              table          (registry table name)
--                              record_id      (composite key as text)
--                              strategy       ('last_write_wins' |
--                                              'server_wins' | 'merge')
--                              winner         ('client' | 'server' |
--                                              'merged')
--
-- Drives the conflict-resolution slice of Panel 4 (sync health),
-- giving us rejection rate over time and a per-table breakdown of
-- which tables generate the most cross-device contention.
--
-- Additive only. No schema change, no RLS change. Compatible with the
-- existing closed-test build (it doesn't emit this event yet because
-- the new sync runner ships unwired in this iteration).
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        043
--   - Purpose:                 extend record_engine_telemetry allow-list
--                              with sync_conflict_resolved
--   - Applied locally:         no (no local dev Supabase project at v1)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (CREATE OR REPLACE FUNCTION); each
--                              re-run replaces the function definition
--                              wholesale, so the IN-list always
--                              represents the most recent migration.
--   - Rollback:                re-run migration 041 to restore the
--                              previous allow-list. The event itself
--                              is harmless once allow-listed; the only
--                              rollback path is the previous IN-list.
--   - App-code dependencies:   src/lib/sync/conflict.js emits the
--                              event via src/lib/sync/telemetry.js +
--                              src/lib/engineTelemetry.js. Old AAB
--                              has no emitter so nothing breaks for
--                              the closed-test build.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run',
    'cascade_state_transition',
    'purchase_initiated',
    'purchase_completed',
    'purchase_failed',
    'subscription_cancelled',
    'restore_purchases_attempted',
    'notification_sent',
    'notification_tapped',
    'notification_failed',
    'article9_consent_withdrawn',
    'sync_conflict_resolved'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;


-- END migrate_043_sync_conflict_telemetry.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_044_notification_preferences.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 044: notification_preferences
--
-- Per NOTIFICATIONS_LOCKED.md lines 117-119:
--   "notification_preferences(user_id, category, enabled, time_pref)
--    table. RLS scoped to user_id. Synced via the registry."
--
-- Each row is a single user's preference for a single notification
-- category. Categories enumerated in src/lib/notifications/categories.js
-- (CATEGORY freeze). Adding a new category there is the only step
-- needed; the CHECK constraint below mirrors that enum so an unknown
-- category fails at INSERT/UPDATE time.
--
-- time_pref shape:
--   Daily categories:  'HH:MM' (24-hour, user-local). Defaults map
--                      to NOTIFICATIONS_LOCKED.md "Timing" table:
--                        daily_checkin_reminder      19:00
--                        weekly_coach_ready          09:00
--   Weekly categories: 'dow_HH:MM' with dow = sun..sat, e.g.
--                      'sun_18:00' for the weekly_checkin_reminder
--                      default.
--   Categories with no time (cascade_gate, payment_failure, etc.)
--   leave time_pref NULL; scheduling logic owns the timing rule.
--
-- Composite PK (user_id, category) matches IDENTITY_AND_OWNERSHIP_LOCKED.md
-- rule 3 ("every user-scoped table is PRIMARY KEY (user_id, X)" with
-- X the natural row identifier). One row per user per category.
--
-- Additive only. RLS scoped to auth.uid().
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        044
--   - Purpose:                 notification_preferences table +
--                              composite PK + RLS + updated_at trigger
--   - Applied locally:         no (no local dev Supabase project at v1)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (CREATE TABLE IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION + DROP/CREATE
--                              policies + DROP/CREATE trigger)
--   - Rollback:                DROP TABLE notification_preferences
--                              CASCADE (also removes the trigger and
--                              policies). No app code depends on the
--                              cloud row existing; local SQLite mirror
--                              is the source of truth at v1.
--   - App-code dependencies:   src/lib/notifications/preferences.js
--                              reads + writes the local SQLite copy;
--                              src/lib/sync.js bulkUploadLocalData
--                              pushes the rows to this table. Added
--                              to SYNC_REGISTRY as the 16th entry.
--                              Old AAB is unaffected: it has no writer
--                              for this table.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL CHECK (category IN (
    'daily_checkin_reminder',
    'weekly_checkin_reminder',
    'cascade_gate',
    'subscription_payment_failure',
    'subscription_expiring',
    'sync_error',
    'ed_pattern_lockout',
    'ffm_floor_hold',
    'weekly_coach_ready',
    'coach_trial_ending',
    'morning_weight',
    'training_reminder',
    'year_of_lifts_unlock'
  )),
  enabled     boolean NOT NULL DEFAULT true,
  time_pref   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_updated
  ON notification_preferences(user_id, updated_at DESC);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
CREATE POLICY "notification_preferences_select" ON notification_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
CREATE POLICY "notification_preferences_insert" ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;
CREATE POLICY "notification_preferences_update" ON notification_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences_delete" ON notification_preferences;
CREATE POLICY "notification_preferences_delete" ON notification_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Keep updated_at fresh on every UPDATE so the sync layer's
-- last-write-wins resolver has a reliable comparison. Client sync
-- writes may carry an explicit updated_at from SQLite; preserve it
-- when it is newer, and refuse stale writes so an older device cannot
-- clobber a newer cloud value.
CREATE OR REPLACE FUNCTION _notification_preferences_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;

  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notification_preferences_touch_updated_at
  ON notification_preferences;
CREATE TRIGGER notification_preferences_touch_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION _notification_preferences_touch_updated_at();


-- END migrate_044_notification_preferences.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_045_users_profile_column_updates_at.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 045: users_profile.column_updates_at JSONB
--
-- Per SYNC_REGISTRY: profiles.conflictStrategy = 'merge'. The
-- conflict.resolve() merge path in src/lib/sync/conflict.js needs
-- per-column write timestamps on both ends of the sync round to
-- decide, column-by-column, which side wrote that field most
-- recently:
--
--   for col in local.column_updates_at:
--     if local.column_updates_at[col] > server.column_updates_at[col]:
--       merged[col] = local[col]
--     else:
--       merged[col] = server[col]
--
-- This column carries those timestamps. Shape:
--   { "first_name": "2026-05-27T09:11:42.000Z",
--     "training_focus": "2026-05-25T18:02:09.000Z",
--     "bar_weight":  "2026-05-20T08:00:00.000Z",
--     ... }
--
-- Keys are the snake_case column names of users_profile that we
-- consider user-editable: first_name, units, training_focus,
-- training_age, primary_equipment, bar_weight. `tier` is omitted
-- — the server owns tier exclusively per migrate_005's update
-- trigger, so per-column conflict resolution does not apply.
--
-- Defaults to '{}'::jsonb on every existing row so legacy data
-- merges as "server beats local for every column" (no local
-- timestamp = server wins) which is the conservative default
-- per CLAUDE.md release policy 2026-05-24 ("the old app on
-- closed testing is required to remain functional against the
-- new schema").
--
-- The trigger below merges client-supplied column_updates_at on
-- UPDATE rather than replacing it, so two clients touching
-- different fields don't clobber each other's per-column
-- timestamps. The client always sends a COMPLETE column_updates_at
-- including server timestamps for fields it didn't touch — the
-- merge is a safety net for the case where two clients race a
-- push against the same row.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        045
--   - Purpose:                 users_profile.column_updates_at JSONB
--                              + safe-merge trigger to power the
--                              registry-locked profiles.merge
--                              conflict strategy.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION +
--                              DROP/CREATE TRIGGER)
--   - Rollback:                ALTER TABLE users_profile DROP
--                              COLUMN column_updates_at;
--                              DROP TRIGGER users_profile_merge_column_updates_at;
--                              DROP FUNCTION _users_profile_merge_column_updates_at;
--                              Safe — the column is purely a sync
--                              signal; profile reads use the named
--                              columns, not column_updates_at.
--   - App-code dependencies:   src/lib/sync/tables/profiles.js
--                              push payload includes column_updates_at
--                              keyed by every field that has been
--                              touched locally; pull feeds
--                              column_updates_at into conflict.resolve()
--                              for the merge strategy. Old AAB has
--                              no writer or reader for this column;
--                              the trigger's merge behaviour means
--                              the old client's plain UPDATE still
--                              succeeds (column_updates_at stays
--                              empty for fields it didn't include).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS column_updates_at jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Safe-merge trigger. On UPDATE:
--   - If NEW.column_updates_at is NULL or empty, keep OLD.column_updates_at
--     so an old-client UPDATE (which doesn't know about this column)
--     does not wipe per-column timestamps.
--   - Otherwise merge OLD <- NEW so any timestamps the client sent
--     replace what was there, but fields the client didn't touch
--     keep their previous server timestamp.
--
-- The merge favours NEW so the client's intent wins; that's the
-- whole point of LWW per-column.
CREATE OR REPLACE FUNCTION _users_profile_merge_column_updates_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.column_updates_at IS NULL OR NEW.column_updates_at = '{}'::jsonb THEN
    NEW.column_updates_at := COALESCE(OLD.column_updates_at, '{}'::jsonb);
  ELSE
    NEW.column_updates_at :=
      COALESCE(OLD.column_updates_at, '{}'::jsonb)
      || NEW.column_updates_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS users_profile_merge_column_updates_at
  ON users_profile;
CREATE TRIGGER users_profile_merge_column_updates_at
  BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION _users_profile_merge_column_updates_at();

-- Sanity check: existing rows now have an empty column_updates_at
-- so legacy data merges as "server wins for every column" until the
-- new client writes a per-column timestamp. SELECT used to confirm
-- the default landed; harmless if the table is empty.
SELECT count(*) FILTER (WHERE column_updates_at IS NULL) AS null_rows,
       count(*) AS total_rows
FROM users_profile;


-- END migrate_045_users_profile_column_updates_at.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_046_recipe_ingredients_soft_delete.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 046: recipe_ingredients soft-delete + LWW columns
--
-- The local SQLite schema gained `deleted_at` + `updated_at` in
-- commit `bc117a1` (additive migration block at the bottom of
-- src/lib/database.js). The transport handler at
-- src/lib/sync/tables/recipeIngredients.js now ships both
-- columns on every push. Without this migration the cloud table
-- doesn't have them and PostgREST rejects the push with
--   PGRST204: "Could not find the 'deleted_at' column of
--    'recipe_ingredients' in the schema cache"
-- so the per-table push for this registry entry silently fails
-- on every sync until this is applied.
--
-- Adds:
--   updated_at  timestamptz NOT NULL DEFAULT now()  (backfilled
--               = created_at for legacy rows so the LWW gate has
--               something to compare against)
--   deleted_at  timestamptz  (NULL = live; non-NULL = tombstone)
--
-- Plus a BEFORE UPDATE trigger that touches updated_at on every
-- UPDATE so server-side mutations also advance the LWW clock.
-- Mirrors the pattern from migration 044's
-- _notification_preferences_touch_updated_at trigger.
--
-- Plus a partial index over the live rows (deleted_at IS NULL)
-- so recipe-builder reads against the cloud also stay fast
-- once that UI ships.
--
-- RLS unchanged: the existing "Users can manage own recipe
-- ingredients" policy already gates on the parent recipe's
-- user_id, which works for both live + tombstoned rows.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        046
--   - Purpose:                 recipe_ingredients.updated_at +
--                              deleted_at + touch trigger +
--                              partial live index. Backs the
--                              softDelete:true + LWW contract in
--                              SYNC_REGISTRY (flipped in commit
--                              bc117a1).
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION +
--                              DROP/CREATE TRIGGER +
--                              CREATE INDEX IF NOT EXISTS)
--   - Rollback:                ALTER TABLE recipe_ingredients
--                              DROP COLUMN deleted_at, DROP
--                              COLUMN updated_at;
--                              DROP TRIGGER + DROP FUNCTION.
--                              Safe — local SQLite would still
--                              ship both columns on push and
--                              re-introduce the PGRST204; only
--                              roll back paired with a client
--                              revert of bc117a1.
--   - App-code dependencies:   src/lib/sync/tables/recipeIngredients.js
--                              expects both columns on push +
--                              uses cloud updated_at as the LWW
--                              gate on pull. Old AAB has no
--                              writer for recipe_ingredients at
--                              all (legacy food bulk RPC excluded
--                              this table) so the new columns
--                              are invisible to it; safe.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- No explicit backfill from created_at. The first version of
-- this migration tried to do that and exploded with
--   ERROR 42703: column "created_at" does not exist
-- because the live cloud schema for recipe_ingredients diverged
-- from migration 015's CREATE TABLE somewhere along the way
-- (the canonical CREATE includes `created_at timestamptz DEFAULT
-- now()` but the running instance does not have it). Rather than
-- speculate about which migration dropped it, the safer move is
-- to skip the backfill entirely: the DEFAULT now() on the new
-- updated_at column already lands a non-null timestamp on every
-- pre-existing row at column-creation time. That's "row was
-- migrated at" rather than "row was created at" but the LWW gate
-- only cares about monotonic progression — any subsequent client
-- write bumps updated_at past the migration-time default and
-- the comparison stays correct.

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_live
  ON recipe_ingredients(user_id, recipe_id)
  WHERE deleted_at IS NULL;

-- Touch trigger: keep updated_at fresh on every UPDATE so the
-- sync layer's LWW comparison has a reliable monotonic clock.
-- Client sync writes carry an explicit updated_at from SQLite;
-- preserve it when it is newer, refuse stale writes so an older
-- device cannot clobber a newer cloud value. Mirrors migration
-- 044's notification_preferences trigger.
CREATE OR REPLACE FUNCTION _recipe_ingredients_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;

  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS recipe_ingredients_touch_updated_at
  ON recipe_ingredients;
CREATE TRIGGER recipe_ingredients_touch_updated_at
  BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION _recipe_ingredients_touch_updated_at();


-- END migrate_046_recipe_ingredients_soft_delete.sql

-- ═════════════════════════════════════════════════════════════════
-- BEGIN migrate_047_body_metrics_weekly_checkins_lww.sql
-- ═════════════════════════════════════════════════════════════════

-- Migration 047: body_metrics + weekly_checkins_v2 LWW + soft-delete
--
-- The local SQLite schema for both `body_metric_log` and
-- `weekly_checkins` carries `updated_at` + `deleted_at` columns
-- (additive block at the bottom of src/lib/database.js). The
-- registry contract is:
--   body_composition_log -> last_write_wins, softDelete: true
--   weekly_checkins_v2   -> last_write_wins, softDelete: false
-- but the cloud tables have neither column today, so the per-
-- table push handlers cannot ship `updated_at` (no LWW gate
-- possible on either pull) and cannot ship `deleted_at` (no soft-
-- delete possible for body composition). The matrix tests at
-- src/lib/sync/__tests__/sync.regressionMatrix.test.js T3/T5
-- currently lock the gap as "known behaviour"; this migration
-- closes it on the cloud side so the next commit can close the
-- corresponding handler + test gaps.
--
-- Adds (both tables):
--   updated_at  timestamptz NOT NULL DEFAULT now()
--   BEFORE UPDATE touch trigger (refuses stale writes; auto-
--     bumps updated_at when the client did not stamp one)
--
-- Adds (body_metrics only — softDelete:true per registry):
--   deleted_at  timestamptz NULL
--   partial index over live rows (deleted_at IS NULL) on
--     (user_id, metric_date) for the Athlete Hub timeline
--
-- weekly_checkins_v2 stays hard-delete (softDelete:false) so no
-- deleted_at column there. Adding the column "just in case"
-- would diverge from the registry; the registry stays canonical.
--
-- Old AAB compatibility (release policy 2026-05-24):
--   The closed-test build pushes both tables without updated_at
--   / deleted_at. PostgREST tolerates missing columns on insert
--   when defaults exist; DEFAULT now() fills updated_at server-
--   side and deleted_at stays NULL. Pull responses include the
--   new columns; the old client's pull handlers select all and
--   pass the row to insertBodyMetricFromCloud /
--   insertWeeklyCheckinFromCloud, both of which read named
--   fields and ignore unknown ones. Safe.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        047
--   - Purpose:                 body_metrics + weekly_checkins_v2
--                              gain updated_at (both) +
--                              deleted_at (body_metrics) +
--                              touch triggers + partial live
--                              index, so the per-table sync
--                              handlers can honour LWW + soft-
--                              delete per the registry contract.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION +
--                              DROP / CREATE TRIGGER + CREATE
--                              INDEX IF NOT EXISTS)
--   - Rollback:                ALTER TABLE body_metrics
--                                DROP COLUMN deleted_at,
--                                DROP COLUMN updated_at;
--                              ALTER TABLE weekly_checkins_v2
--                                DROP COLUMN updated_at;
--                              DROP TRIGGER + DROP FUNCTION on
--                              both. Safe — only impact is the
--                              new client falls back to the old
--                              behaviour (no LWW gate, no soft
--                              delete) for those two tables.
--   - App-code dependencies:   src/lib/sync/tables/bodyComposition.js
--                              expects updated_at + deleted_at
--                              on push, uses updated_at as the
--                              LWW gate on pull.
--                              src/lib/sync/tables/weeklyCheckins.js
--                              expects updated_at on push, uses
--                              it as the LWW gate on pull. The
--                              old AAB has no updated_at /
--                              deleted_at writer for either
--                              table so the new columns are
--                              invisible to it; safe.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

-- ─── body_metrics ────────────────────────────────────────────────

ALTER TABLE body_metrics
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE body_metrics
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial live index for Athlete Hub timeline reads (no point
-- including tombstones — the UI never shows them).
CREATE INDEX IF NOT EXISTS idx_body_metrics_live
  ON body_metrics(user_id, metric_date)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION _body_metrics_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;

  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS body_metrics_touch_updated_at
  ON body_metrics;
CREATE TRIGGER body_metrics_touch_updated_at
  BEFORE UPDATE ON body_metrics
  FOR EACH ROW EXECUTE FUNCTION _body_metrics_touch_updated_at();

-- ─── weekly_checkins_v2 ──────────────────────────────────────────

ALTER TABLE weekly_checkins_v2
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _weekly_checkins_v2_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;

  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS weekly_checkins_v2_touch_updated_at
  ON weekly_checkins_v2;
CREATE TRIGGER weekly_checkins_v2_touch_updated_at
  BEFORE UPDATE ON weekly_checkins_v2
  FOR EACH ROW EXECUTE FUNCTION _weekly_checkins_v2_touch_updated_at();


-- END migrate_047_body_metrics_weekly_checkins_lww.sql

