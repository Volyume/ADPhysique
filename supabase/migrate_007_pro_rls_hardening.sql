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
