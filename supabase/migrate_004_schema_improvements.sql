-- Migration 004: Schema improvements from scientific/UX audit
-- Run in Supabase SQL Editor after migrate_003_delete_rpc.sql

-- 1. Add weekly_checkins table (CRITICAL: fixes GDPR delete_user_data RPC)
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

ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_checkins' AND policyname = 'Users can manage own checkins'
  ) THEN
    CREATE POLICY "Users can manage own checkins" ON weekly_checkins
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user_date ON weekly_checkins(user_id, checkin_date DESC);

-- 2. Add tension_at_stretch to exercises
-- Tags each exercise by whether peak resistance occurs when the muscle is lengthened.
-- 'high' = peak tension at stretch (incline curl, lying leg curl, RDL, overhead extension)
-- 'medium' = neutral resistance profile
-- 'low' = peak tension at shortened position (preacher curl, leg extension short ROM)
-- Evidence: Maeo et al. (2024), JAP; Sato et al. (2024); PMC12460394 (2025)
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS tension_at_stretch TEXT DEFAULT 'medium'
    CHECK(tension_at_stretch IN ('high', 'medium', 'low'));

-- 3. Update known high-stretch exercises in the canonical library
-- Biceps: incline / prone variants train long head at length
UPDATE exercises SET tension_at_stretch = 'high'
WHERE user_id IS NULL AND name ILIKE ANY (ARRAY[
  '%Incline Dumbbell Curl%', '%Prone Incline Curl%', '%Incline Curl%',
  '%Spider Curl%'
]);

-- Biceps: preacher curl is short position dominant
UPDATE exercises SET tension_at_stretch = 'low'
WHERE user_id IS NULL AND name ILIKE ANY (ARRAY[
  '%Preacher Curl%'
]);

-- Hamstrings: hip-hinge pattern trains at long muscle length
UPDATE exercises SET tension_at_stretch = 'high'
WHERE user_id IS NULL AND name ILIKE ANY (ARRAY[
  '%Romanian Deadlift%', '%Good Morning%', '%Stiff-Leg Deadlift%',
  '%Nordic Hamstring%', '%Lying Leg Curl%'
]);

-- Seated leg curl: shorter muscle length than lying
UPDATE exercises SET tension_at_stretch = 'medium'
WHERE user_id IS NULL AND name ILIKE '%Seated Leg Curl%';

-- Triceps: overhead movements train long head at stretch
UPDATE exercises SET tension_at_stretch = 'high'
WHERE user_id IS NULL AND name ILIKE ANY (ARRAY[
  '%Overhead Cable Tricep%', '%Overhead Dumbbell Extension%',
  '%Skull Crusher%', '%Lying Tricep Extension%', '%JM Press%'
]);

-- Triceps: pushdowns train at shortened position
UPDATE exercises SET tension_at_stretch = 'low'
WHERE user_id IS NULL AND name ILIKE ANY (ARRAY[
  '%Pushdown%', '%Push-Down%'
]);

-- Chest: flies train at lengthened position
UPDATE exercises SET tension_at_stretch = 'high'
WHERE user_id IS NULL AND name ILIKE ANY (ARRAY[
  '%Dumbbell Fly%', '%Incline Dumbbell Fly%', '%Cable Fly%',
  '%Cable Crossover%', '%Pec Deck%'
]);

-- 4. Verify weekly_checkins appears in delete_user_data scope
-- (The function already references this table — now the table exists so the RPC works)
COMMENT ON TABLE weekly_checkins IS 'Pre/post session check-ins, refeed day tracking, and adherence logging. Referenced by delete_user_data() GDPR RPC.';
