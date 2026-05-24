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
--    UPDATE trigger reverts any client-side change to `tier`.
--    Service-role updates from edge functions / Stripe webhooks bypass
--    the trigger because `auth.uid()` is NULL for the service role.
--
-- 3. delete_user_data() did not clean up `volume_landmarks` and custom
--    `exercises`, leaving orphan rows after a GDPR deletion. Added.
--
-- DEFENSIVE: every block is wrapped in `DO $$ BEGIN ... IF EXISTS ... END $$`
-- so the migration runs cleanly against a partial schema. If your project
-- doesn't have `weekly_checkins` (or any other table) yet, that block is
-- silently skipped instead of aborting the whole migration. Re-runnable.

-- ─── 1. Rebuild every FOR ALL policy with WITH CHECK ──────────────────────

-- users_profile
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users_profile') THEN
    DROP POLICY IF EXISTS "Users can read/write own profile" ON users_profile;
    CREATE POLICY "Users can read/write own profile" ON users_profile
      FOR ALL USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- exercises (custom only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exercises') THEN
    DROP POLICY IF EXISTS "Users can manage own custom exercises" ON exercises;
    CREATE POLICY "Users can manage own custom exercises" ON exercises
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- routines
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routines') THEN
    DROP POLICY IF EXISTS "Users can manage own routines" ON routines;
    CREATE POLICY "Users can manage own routines" ON routines
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- routine_exercises (own-routine sub-select)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routine_exercises') THEN
    DROP POLICY IF EXISTS "Users can manage own routine exercises" ON routine_exercises;
    CREATE POLICY "Users can manage own routine exercises" ON routine_exercises
      FOR ALL USING (
        EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM routines WHERE id = routine_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- mesocycles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mesocycles') THEN
    DROP POLICY IF EXISTS "Users can manage own mesocycles" ON mesocycles;
    CREATE POLICY "Users can manage own mesocycles" ON mesocycles
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- mesocycle_weeks (own-mesocycle sub-select)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mesocycle_weeks') THEN
    DROP POLICY IF EXISTS "Users can manage own mesocycle weeks" ON mesocycle_weeks;
    CREATE POLICY "Users can manage own mesocycle weeks" ON mesocycle_weeks
      FOR ALL USING (
        EXISTS (SELECT 1 FROM mesocycles WHERE id = mesocycle_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM mesocycles WHERE id = mesocycle_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- workouts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workouts') THEN
    DROP POLICY IF EXISTS "Users can manage own workouts" ON workouts;
    CREATE POLICY "Users can manage own workouts" ON workouts
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- workout_sets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_sets') THEN
    DROP POLICY IF EXISTS "Users can manage own sets" ON workout_sets;
    CREATE POLICY "Users can manage own sets" ON workout_sets
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- volume_landmarks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'volume_landmarks') THEN
    DROP POLICY IF EXISTS "Users can manage own landmarks" ON volume_landmarks;
    CREATE POLICY "Users can manage own landmarks" ON volume_landmarks
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- weekly_volumes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_volumes') THEN
    DROP POLICY IF EXISTS "Users can manage own weekly volumes" ON weekly_volumes;
    CREATE POLICY "Users can manage own weekly volumes" ON weekly_volumes
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- personal_records
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'personal_records') THEN
    DROP POLICY IF EXISTS "Users can manage own PRs" ON personal_records;
    CREATE POLICY "Users can manage own PRs" ON personal_records
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- body_metrics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'body_metrics') THEN
    DROP POLICY IF EXISTS "Users can manage own body metrics" ON body_metrics;
    CREATE POLICY "Users can manage own body metrics" ON body_metrics
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- progress_photos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'progress_photos') THEN
    DROP POLICY IF EXISTS "Users can manage own photos" ON progress_photos;
    CREATE POLICY "Users can manage own photos" ON progress_photos
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- achievements
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'achievements') THEN
    DROP POLICY IF EXISTS "Users can manage own achievements" ON achievements;
    CREATE POLICY "Users can manage own achievements" ON achievements
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- weekly_checkins
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_checkins') THEN
    DROP POLICY IF EXISTS "Users can manage own checkins" ON weekly_checkins;
    CREATE POLICY "Users can manage own checkins" ON weekly_checkins
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- autoregulation_suggestions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'autoregulation_suggestions') THEN
    DROP POLICY IF EXISTS "Users can manage own autoregulation suggestions" ON autoregulation_suggestions;
    CREATE POLICY "Users can manage own autoregulation suggestions" ON autoregulation_suggestions
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ─── 2. Lock tier against client UPDATE ───────────────────────────────────
--
-- Even with WITH CHECK the user owns their users_profile row, so they
-- can still UPDATE their own row's tier column. This trigger rolls back
-- any client attempt to change the tier column. Service-role calls
-- (from edge functions or Stripe webhooks) come through with NULL
-- auth.uid() and bypass the lock so legitimate upgrades still work.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users_profile') THEN
    CREATE OR REPLACE FUNCTION protect_users_profile_tier()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Only enforce for authenticated client calls. The Postgres service
      -- role has no auth.uid() and is the only role that should set tier.
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
  END IF;
END $$;


-- ─── 3. delete_user_data: include volume_landmarks + custom exercises ─────
--
-- Each DELETE is now also defensive — only runs against tables that
-- exist. The function as a whole is replaced atomically so partial
-- previous versions are overwritten.

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
