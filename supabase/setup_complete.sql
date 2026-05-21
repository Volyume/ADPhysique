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
  ADD COLUMN IF NOT EXISTS goal_start_date TIMESTAMPTZ;

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


-- ═══ 2. ROW LEVEL SECURITY (always-on) ════════════════════════════════════
-- ENABLE is idempotent; safe to re-run.

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


-- ═══ 4. tier lockdown trigger ════════════════════════════════════════════
-- Reverts any client UPDATE that tries to change the `tier` column.
-- Service-role calls (Stripe webhook, edge function) have auth.uid()=NULL
-- and bypass the lock so legitimate upgrades still go through.

CREATE OR REPLACE FUNCTION protect_users_profile_tier()
RETURNS TRIGGER AS $func$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.tier IS DISTINCT FROM OLD.tier THEN
      NEW.tier := OLD.tier;
    END IF;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS users_profile_protect_tier ON users_profile;
CREATE TRIGGER users_profile_protect_tier
  BEFORE UPDATE ON users_profile
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
