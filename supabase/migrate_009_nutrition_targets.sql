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
