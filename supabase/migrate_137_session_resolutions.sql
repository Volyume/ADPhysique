-- migrate_137_session_resolutions.sql
--
-- PURPOSE. Campaign 18 block-progression amendment. Persists the EXPLICIT
-- non-completion resolutions for a required training session so programme
-- position survives a device change.
--
-- Programme position used to be `programmes.next_workout_index`, a single
-- integer advanced blindly on any completion, so training an out-of-order
-- workout moved the pointer past an unperformed required session and consumed
-- it. The replacement resolves each required session instance individually.
-- COMPLETED is derived from the existing workout rows and is deliberately NOT
-- stored here, so there remains exactly one authority for what was performed;
-- this table holds only what execution cannot prove - that the athlete
-- deliberately skipped an instance, or deliberately finished one early.
--
-- Without this table those two states are device-local, and a restored device
-- would resurrect a skipped session as outstanding, overriding a choice the
-- athlete already made.
--
-- IDENTITY. (mesocycle_week_id, routine_id). A repeated session within one
-- programme week is written as its own routine row, so names may repeat but
-- ids do not. The unique constraint makes "one current resolution per required
-- instance" structural, and the client derives the primary key from the same
-- pair so two devices converge on one row rather than racing two.
--
-- APPLIED LOCALLY: yes, via the corresponding PRAGMA user_version migration in
--   src/lib/database.js.
-- APPLIED REMOTELY: NOT YET. Founder-gated; requires the exact phrase
--   "run against production". The client push fails soft until then, so
--   progression stays correct on-device and only portability waits.
-- ADDITIVE: yes. New table only; nothing existing is altered or dropped.
-- SAFE TO RE-RUN: yes. IF NOT EXISTS throughout.
-- ROLLBACK: DROP TABLE public.session_resolutions. Every reader treats an
--   absent resolution as outstanding, which is the pre-amendment behaviour.

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

-- Only the two states execution cannot prove. COMPLETED never appears here.
ALTER TABLE public.session_resolutions
  DROP CONSTRAINT IF EXISTS session_resolutions_resolution_check;
ALTER TABLE public.session_resolutions
  ADD CONSTRAINT session_resolutions_resolution_check
  CHECK (resolution IN ('skipped_by_user', 'ended_early'));

-- One current resolution per required instance, structurally.
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_resolutions_instance
  ON public.session_resolutions (user_id, mesocycle_week_id, routine_id);

CREATE INDEX IF NOT EXISTS idx_session_resolutions_user
  ON public.session_resolutions (user_id);

ALTER TABLE public.session_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_resolutions_owner ON public.session_resolutions;
CREATE POLICY session_resolutions_owner ON public.session_resolutions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
