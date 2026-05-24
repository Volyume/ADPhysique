-- Migration 026: silence the closed-testing client's library-row push noise
--
-- Root cause: sync.js:511 in the closed-testing APK calls
-- syncExercises(uid) without customOnly, which bulk-pushes every local
-- exercise -- library + custom -- to cloud exercises with user_id
-- stamped. The deterministic library UUIDs already exist on cloud with
-- user_id = NULL. UPSERT hits ON CONFLICT DO UPDATE, the UPDATE's USING
-- (auth.uid() = user_id) fails against the existing NULL row, and
-- PostgreSQL raises 42501. ~9 warns per fresh-signup sync cycle.
--
-- Client-side fix (sync.js targeting custom_exercises only) requires a
-- new APK build, which the release policy blocks until the project is
-- fully built out. This migration silences the noise cloud-side.
--
-- Approach: BEFORE INSERT trigger that checks if the incoming id
-- already exists with user_id IS NULL (i.e., it's a library row).
-- If so, return NULL -- the INSERT is silently skipped, ON CONFLICT
-- never fires, no 42501. Customs have random UUIDs so they never
-- collide with library rows; the trigger lets them through unchanged.
--
-- Safe to apply now. Doesn't change what users can do: library rows
-- stay protected, customs stay user-scoped. Just stops the closed-
-- testing client's bogus pushes from raising errors.

CREATE OR REPLACE FUNCTION exercises_skip_library_overwrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_user_id uuid;
BEGIN
  -- Is this id already a library row?
  SELECT user_id INTO existing_user_id
  FROM exercises
  WHERE id = NEW.id
  LIMIT 1;

  IF FOUND AND existing_user_id IS NULL THEN
    -- Library row exists with this canonical id. The client is trying
    -- to "claim" it by stamping user_id. Silently drop the insert; the
    -- library row stays intact and the client doesn't see a 42501.
    RETURN NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_exercises_skip_library_overwrite ON exercises;
CREATE TRIGGER trg_exercises_skip_library_overwrite
BEFORE INSERT ON exercises
FOR EACH ROW EXECUTE FUNCTION exercises_skip_library_overwrite();
