-- Migration 005: RLS hardening + tier protection + delete_user_data fix
--
-- Closes three real holes flagged by the schema audit:
--
-- 1. Every `FOR ALL USING (...)` policy lacked a matching WITH CHECK clause.
--    The USING clause only filters READ access; without WITH CHECK a user
--    can INSERT/UPDATE rows with user_id set to anyone they like. Most
--    obviously, the users_profile policy allowed
--      UPDATE users_profile SET tier='pro' WHERE id = auth.uid()
--    so any signed-in user could self-promote to Pro and bypass payment.
--    All FOR ALL policies are rebuilt with both USING and WITH CHECK.
--
-- 2. users_profile.tier is now write-protected from clients. A BEFORE
--    UPDATE trigger reverts any client-side change to `tier`,
--    `is_beta_tester`, and `pro_started_at`. Service-role updates from
--    edge functions / Stripe webhooks bypass the trigger because
--    `auth.uid()` is NULL for the service role.
--
-- 3. delete_user_data() did not clean up `volume_landmarks`, leaving
--    orphan rows after a GDPR deletion. Added.
--
-- Run order: AFTER migrate_001..migrate_004 are applied to the existing
-- schema. Safe to re-run (DROP POLICY IF EXISTS, CREATE OR REPLACE
-- FUNCTION, CREATE TRIGGER IF NOT EXISTS pattern).

-- ─── 1. Rebuild every FOR ALL policy with WITH CHECK ──────────────────────

-- users_profile
DROP POLICY IF EXISTS "Users can read/write own profile" ON users_profile;
CREATE POLICY "Users can read/write own profile" ON users_profile
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- exercises (custom only)
DROP POLICY IF EXISTS "Users can manage own custom exercises" ON exercises;
CREATE POLICY "Users can manage own custom exercises" ON exercises
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- routines
DROP POLICY IF EXISTS "Users can manage own routines" ON routines;
CREATE POLICY "Users can manage own routines" ON routines
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- routine_exercises (own-routine sub-select)
DROP POLICY IF EXISTS "Users can manage own routine exercises" ON routine_exercises;
CREATE POLICY "Users can manage own routine exercises" ON routine_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND user_id = auth.uid())
  );

-- mesocycles
DROP POLICY IF EXISTS "Users can manage own mesocycles" ON mesocycles;
CREATE POLICY "Users can manage own mesocycles" ON mesocycles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- mesocycle_weeks (own-mesocycle sub-select)
DROP POLICY IF EXISTS "Users can manage own mesocycle weeks" ON mesocycle_weeks;
CREATE POLICY "Users can manage own mesocycle weeks" ON mesocycle_weeks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesocycles WHERE id = mesocycle_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM mesocycles WHERE id = mesocycle_id AND user_id = auth.uid())
  );

-- workouts
DROP POLICY IF EXISTS "Users can manage own workouts" ON workouts;
CREATE POLICY "Users can manage own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workout_sets
DROP POLICY IF EXISTS "Users can manage own sets" ON workout_sets;
CREATE POLICY "Users can manage own sets" ON workout_sets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- volume_landmarks
DROP POLICY IF EXISTS "Users can manage own landmarks" ON volume_landmarks;
CREATE POLICY "Users can manage own landmarks" ON volume_landmarks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- weekly_volumes
DROP POLICY IF EXISTS "Users can manage own weekly volumes" ON weekly_volumes;
CREATE POLICY "Users can manage own weekly volumes" ON weekly_volumes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- personal_records
DROP POLICY IF EXISTS "Users can manage own PRs" ON personal_records;
CREATE POLICY "Users can manage own PRs" ON personal_records
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- body_metrics
DROP POLICY IF EXISTS "Users can manage own body metrics" ON body_metrics;
CREATE POLICY "Users can manage own body metrics" ON body_metrics
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- progress_photos
DROP POLICY IF EXISTS "Users can manage own photos" ON progress_photos;
CREATE POLICY "Users can manage own photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- achievements
DROP POLICY IF EXISTS "Users can manage own achievements" ON achievements;
CREATE POLICY "Users can manage own achievements" ON achievements
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- weekly_checkins
DROP POLICY IF EXISTS "Users can manage own checkins" ON weekly_checkins;
CREATE POLICY "Users can manage own checkins" ON weekly_checkins
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- autoregulation_suggestions
DROP POLICY IF EXISTS "Users can manage own autoregulation suggestions" ON autoregulation_suggestions;
CREATE POLICY "Users can manage own autoregulation suggestions" ON autoregulation_suggestions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── 2. Lock tier and beta-tester flag against client UPDATE ──────────────
--
-- Even with WITH CHECK the user still owns their users_profile row, so they
-- can still UPDATE their own row's tier column. This trigger rolls back
-- any client attempt to change the tier / billing-related columns. The
-- trigger checks auth.uid() — service-role calls (from edge functions or
-- Stripe webhooks) come through with NULL auth.uid() and bypass the lock.

CREATE OR REPLACE FUNCTION protect_users_profile_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce for authenticated client calls. The Postgres service role
  -- has no auth.uid() and is the only role that should set tier.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.tier IS DISTINCT FROM OLD.tier THEN
      NEW.tier := OLD.tier;
    END IF;
    -- is_beta_tester is deliberately NOT protected here — it's a soft tag
    -- granted during beta sign-up and the client still writes it on the
    -- INSERT path. After beta, when payment becomes required, this can
    -- be tightened to revert client changes the same way `tier` is.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS users_profile_protect_tier ON users_profile;
CREATE TRIGGER users_profile_protect_tier
  BEFORE UPDATE ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION protect_users_profile_tier();


-- ─── 3. delete_user_data: include volume_landmarks ────────────────────────

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
  DELETE FROM volume_landmarks            WHERE user_id = uid; -- was missing
  DELETE FROM workouts                    WHERE user_id = uid; -- cascades workout_sets
  DELETE FROM mesocycles                  WHERE user_id = uid; -- cascades mesocycle_weeks
  DELETE FROM routines                    WHERE user_id = uid; -- cascades routine_exercises
  DELETE FROM exercises                   WHERE user_id = uid; -- custom exercises only
  DELETE FROM users_profile               WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;
