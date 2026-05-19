-- Migration 001: add first_name, tier, bar_weight to users_profile
-- Run this in Supabase SQL Editor (only needed if you already ran schema.sql)

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS bar_weight NUMERIC DEFAULT 20;

-- training_age was INTEGER, widen to NUMERIC to match app data
ALTER TABLE users_profile
  ALTER COLUMN training_age TYPE NUMERIC USING training_age::NUMERIC;
