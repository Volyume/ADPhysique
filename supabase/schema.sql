-- Volyume Database Schema
-- Run this in the Supabase SQL Editor

-- 1. Users Profile
CREATE TABLE users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  first_name TEXT,
  training_focus TEXT DEFAULT 'bodybuilding',
  training_age NUMERIC,
  primary_equipment TEXT,
  units TEXT DEFAULT 'kg',
  tier TEXT DEFAULT 'free',
  bar_weight NUMERIC DEFAULT 20,
  goal_start_date TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read/write own profile" ON users_profile
  FOR ALL USING (auth.uid() = id);

-- 2. Exercises
CREATE TABLE exercises (
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

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read canonical exercises" ON exercises
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own custom exercises" ON exercises
  FOR ALL USING (auth.uid() = user_id);

-- 3. Routines
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  split_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own routines" ON routines
  FOR ALL USING (auth.uid() = user_id);

-- 4. Routine Exercises
CREATE TABLE routine_exercises (
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

ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own routine exercises" ON routine_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND user_id = auth.uid())
  );

-- 5. Mesocycles
CREATE TABLE mesocycles (
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

ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mesocycles" ON mesocycles
  FOR ALL USING (auth.uid() = user_id);

-- 6. Mesocycle Weeks
CREATE TABLE mesocycle_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_start_date DATE,
  is_deload BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE mesocycle_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mesocycle weeks" ON mesocycle_weeks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesocycles WHERE id = mesocycle_id AND user_id = auth.uid())
  );

-- 7. Workouts
CREATE TABLE workouts (
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

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id);

-- 8. Workout Sets
CREATE TABLE workout_sets (
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

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sets" ON workout_sets
  FOR ALL USING (auth.uid() = user_id);

-- 9. Volume Landmarks
CREATE TABLE volume_landmarks (
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

ALTER TABLE volume_landmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own landmarks" ON volume_landmarks
  FOR ALL USING (auth.uid() = user_id);

-- 10. Weekly Volumes
CREATE TABLE weekly_volumes (
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

ALTER TABLE weekly_volumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own weekly volumes" ON weekly_volumes
  FOR ALL USING (auth.uid() = user_id);

-- 11. Personal Records
CREATE TABLE personal_records (
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

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own PRs" ON personal_records
  FOR ALL USING (auth.uid() = user_id);

-- 12. Body Metrics
CREATE TABLE body_metrics (
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

ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own body metrics" ON body_metrics
  FOR ALL USING (auth.uid() = user_id);

-- 13. Progress Photos
CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL,
  pose TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id);

-- 14. Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  achievement_type TEXT,
  achieved_date DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own achievements" ON achievements
  FOR ALL USING (auth.uid() = user_id);

-- 15. Weekly Check-ins (pre/post session readiness, adherence, refeed tracking)
CREATE TABLE weekly_checkins (
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

ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own checkins" ON weekly_checkins
  FOR ALL USING (auth.uid() = user_id);

-- 16. Auto-Regulation Suggestions
CREATE TABLE autoregulation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  suggestion_type TEXT,
  muscle_group TEXT,
  suggestion_text TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE autoregulation_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own autoregulation suggestions" ON autoregulation_suggestions
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_workouts_user_started ON workouts(user_id, started_at DESC);
CREATE INDEX idx_workout_sets_workout ON workout_sets(workout_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id, user_id);
CREATE INDEX idx_exercises_muscle ON exercises(primary_muscle);
CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_weekly_volumes_user_date ON weekly_volumes(user_id, week_ending_date DESC);
CREATE INDEX idx_weekly_checkins_user_date ON weekly_checkins(user_id, checkin_date DESC);

-- GDPR: delete_user_data RPC
-- Deletes all rows owned by the calling user across every table.
-- auth.users deletion itself must be triggered via Supabase Auth Admin API from a trusted server.
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

-- Allow any authenticated user to call the function (RLS on each table still applies).
GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;
