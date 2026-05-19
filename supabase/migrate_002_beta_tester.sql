-- Migration 002: add is_beta_tester flag to users_profile
-- Run this in Supabase SQL Editor

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false;

-- When beta ends, run this to grant extended Pro to all testers who signed up:
-- UPDATE users_profile SET tier = 'pro' WHERE is_beta_tester = true;
