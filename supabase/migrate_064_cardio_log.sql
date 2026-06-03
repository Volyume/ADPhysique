-- Migration 064: cardio_log session store (cardio-integration audit)
--
-- Backs the user-led cardio logging from
-- docs/audit/volyume-cardio-integration-2026-06-03. One row per logged
-- cardio session, so unlike daily_steps (one row per day) the primary key
-- is (user_id, id), with entry_date a regular column keyed to the local
-- calendar day (so a day's cardio lines up with that day's food and steps).
-- activity_id references the in-code cardio library; activity_name + met are
-- snapshotted so a row is self-describing if the library later changes.
-- est_kcal is session feedback only and is never added to a calorie target.
--
-- Soft delete (deleted_at) + last-write-wins (updated_at), the same contract
-- as recipe_ingredients (migration 046) and body_composition_log (047). The
-- local SQLite mirror (CREATE TABLE cardio_log) and the per-table sync handler
-- (src/lib/sync/tables/cardioLog.js, registry entry cardio_log, bidirectional
-- LWW + softDelete) ship in the same change. The handler pushes updated_at as
-- ISO and uses it as the LWW gate on pull; the BEFORE UPDATE touch trigger
-- below refuses stale writes so the round trip is symmetric.
--
-- Account deletion: user_id FK is ON DELETE CASCADE to auth.users(id), so the
-- delete-account Edge Function's auth.admin.deleteUser removes cardio_log rows
-- automatically. delete_user_data (migration 025/062) is NOT rewritten here on
-- purpose (the CASCADE already guarantees removal); fold a
--   BEGIN DELETE FROM cardio_log WHERE user_id = uid;
--     EXCEPTION WHEN undefined_table THEN NULL; END;
-- line in the next time that function is revised.
--
-- Old AAB compatibility (release policy 2026-05-24): strictly additive. The
-- frozen closed-test build has no cardio_log writer or reader, so the new
-- table is invisible to it. Safe.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        064
--   - Purpose:                 new cardio_log table (one row per cardio
--                              session) so user-led cardio logging has a
--                              synced home, the Plans card / check-in
--                              compliance / coach read real sessions, and
--                              cardio survives reinstall + syncs across
--                              devices.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (CREATE TABLE IF NOT EXISTS, CREATE OR
--                              REPLACE FUNCTION, DROP/CREATE TRIGGER, DROP
--                              POLICY IF EXISTS then CREATE, all idempotent)
--   - Rollback:                DROP TABLE IF EXISTS cardio_log CASCADE;
--                              DROP FUNCTION IF EXISTS
--                                _cardio_log_touch_updated_at();
--                              The client falls back to local-only cardio
--                              (push errors are caught per-table and do not
--                              fail the wider sync run).
--   - App-code dependencies:   src/lib/sync/tables/cardioLog.js (push sends
--                              updated_at + deleted_at; pull uses updated_at
--                              as the LWW gate). src/lib/database.js owns the
--                              local mirror + CRUD. Old AAB has no writer.
--   - Dependencies:            none (standalone table).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run. See verification in
-- supabase/README.md § Verify cardio_log.

CREATE TABLE IF NOT EXISTS cardio_log (
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id              text        NOT NULL,
  entry_date      date        NOT NULL,
  activity_id     text,
  activity_name   text        NOT NULL,
  category        text,
  duration_min    int         NOT NULL DEFAULT 0,
  intensity       text        NOT NULL DEFAULT 'moderate',
  met             real,
  est_kcal        int,
  recovery_impact text,
  impact_type     text,
  distance        real,
  avg_hr          int,
  source          text        NOT NULL DEFAULT 'manual',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_cardio_log_user_date ON cardio_log(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_cardio_log_user_updated ON cardio_log(user_id, updated_at);

ALTER TABLE cardio_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cardio" ON cardio_log;
CREATE POLICY "Users can manage own cardio" ON cardio_log
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Last-write-wins gate: refuse a write whose updated_at is older than the row
-- already there, and auto-stamp updated_at when the client did not. Same shape
-- as _daily_steps_touch_updated_at (migration 056).
CREATE OR REPLACE FUNCTION _cardio_log_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;

  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cardio_log_touch_updated_at ON cardio_log;
CREATE TRIGGER cardio_log_touch_updated_at
  BEFORE UPDATE ON cardio_log
  FOR EACH ROW EXECUTE FUNCTION _cardio_log_touch_updated_at();
