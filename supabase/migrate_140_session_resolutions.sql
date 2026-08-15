-- migrate_140_session_resolutions.sql
--
-- PURPOSE. Campaign 18 block-progression amendment. Persists the EXPLICIT
-- non-completion resolutions for a required training session so programme
-- position survives a device change.
--
-- NUMBERING. This was initially drafted as migrate_137_session_resolutions,
-- but 137 was already occupied by migrate_137_exercise_swap_scope.sql and is
-- still pending in production. It is 140 so the operator has one unambiguous
-- ordered migration after the existing 139 file.
--
-- COMPLETED is derived from workout rows and is deliberately NOT stored here.
-- IDENTITY is (mesocycle_week_id, routine_id); the client derives `id` from
-- that same pair so two devices converge on one logical row per user.
--
-- CONFLICT LAW. Ordinary PostgREST upsert is arrival-ordered, not logical
-- last-write-wins. The trigger below refuses an older updated_at. An exact
-- clock tie uses the same total ordering as compareSessionResolutionVersions:
-- resolved_at, ENDED_EARLY over SKIPPED_BY_USER, workout_id, id. Retrying the
-- exact same mutation is therefore a no-op and reversed network arrival gives
-- the same final row.
--
-- APPLIED LOCALLY: yes, via the corresponding PRAGMA user_version migration in
--   src/lib/database.js.
-- APPLIED REMOTELY: NOT YET. Founder-gated; requires the exact phrase
--   "run against production". The client push fails soft until then and every
--   bulk sync re-reads the durable local rows, so portability waits without
--   acknowledging or dropping the mutation.
-- DEPENDENCIES: auth.users plus the already-live routines, mesocycles and
--   mesocycle_weeks tables. It does not depend on held migrations 132-139 for
--   its SQL objects, but numeric application order requires the operator to
--   resolve the pending 137-139 status before applying 140. Migration 049 is
--   unrelated and remains HELD.
-- ADDITIVE: yes. New table, indexes, function, trigger and policy only.
-- SAFE TO RE-RUN: yes. Existing policy/trigger are replaced intentionally.
-- ROLLBACK: drop trigger `session_resolutions_refuse_stale`, function
--   `_session_resolutions_refuse_stale`, then table `session_resolutions`.

CREATE TABLE IF NOT EXISTS public.session_resolutions (
  id                TEXT NOT NULL,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mesocycle_week_id TEXT NOT NULL,
  routine_id        TEXT NOT NULL,
  mesocycle_id      TEXT,
  resolution        TEXT NOT NULL,
  workout_id        TEXT,
  resolved_at       TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.session_resolutions
  DROP CONSTRAINT IF EXISTS session_resolutions_resolution_check;
ALTER TABLE public.session_resolutions
  ADD CONSTRAINT session_resolutions_resolution_check
  CHECK (resolution IN ('skipped_by_user', 'ended_early'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_resolutions_instance
  ON public.session_resolutions (user_id, mesocycle_week_id, routine_id);

CREATE INDEX IF NOT EXISTS idx_session_resolutions_user
  ON public.session_resolutions (user_id);

CREATE OR REPLACE FUNCTION public._session_resolutions_refuse_stale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_resolution_rank integer := CASE NEW.resolution
    WHEN 'ended_early' THEN 2 WHEN 'skipped_by_user' THEN 1 ELSE 0 END;
  old_resolution_rank integer := CASE OLD.resolution
    WHEN 'ended_early' THEN 2 WHEN 'skipped_by_user' THEN 1 ELSE 0 END;
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;

  IF NEW.updated_at = OLD.updated_at
     AND (NEW.resolved_at, new_resolution_rank,
          COALESCE(NEW.workout_id, '') COLLATE "C", NEW.id COLLATE "C")
       <= (OLD.resolved_at, old_resolution_rank,
           COALESCE(OLD.workout_id, '') COLLATE "C", OLD.id COLLATE "C") THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS session_resolutions_refuse_stale
  ON public.session_resolutions;
CREATE TRIGGER session_resolutions_refuse_stale
  BEFORE UPDATE ON public.session_resolutions
  FOR EACH ROW EXECUTE FUNCTION public._session_resolutions_refuse_stale();

ALTER TABLE public.session_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_resolutions_owner ON public.session_resolutions;
CREATE POLICY session_resolutions_owner ON public.session_resolutions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.mesocycle_weeks mw
      JOIN public.mesocycles m ON m.id = mw.mesocycle_id
      WHERE mw.id::text = session_resolutions.mesocycle_week_id
        AND m.id::text = COALESCE(session_resolutions.mesocycle_id, m.id::text)
        AND m.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.routines r
      WHERE r.id::text = session_resolutions.routine_id
        AND r.user_id = auth.uid()
    )
  );
