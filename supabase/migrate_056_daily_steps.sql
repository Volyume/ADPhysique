-- Migration 056: daily_steps activity store (cardio/steps audit)
--
-- Backs the manual step-logging path and the coach's step-target
-- checks from
-- docs/audit/volyume-cardio-steps-audit-2026-05-30.md. Before this, the
-- app stored the coach's step *target* (coach_outputs.steps_target) and a
-- weekly hit/mostly/missed memory (weekly_checkins), but nothing recorded
-- what the user actually walked. daily_steps is that store: one row per
-- local day, the day's step total, and where the figure came from
-- ('manual' typed by hand with no wearable, or 'health' filled from a
-- platform). Same per-day shape and last-write-wins contract as
-- daily_water.
--
-- The local SQLite mirror (CREATE TABLE daily_steps) and the per-table
-- sync handler (src/lib/sync/tables/dailySteps.js, registry entry
-- daily_steps, bidirectional LWW) ship in the same change. The handler
-- pushes updated_at as an ISO timestamp and uses it as the LWW gate on
-- pull; the BEFORE UPDATE touch trigger below refuses stale writes so the
-- round trip is symmetric.
--
-- Account deletion: the user_id FK is ON DELETE CASCADE to auth.users(id),
-- so when the delete-account Edge Function calls auth.admin.deleteUser the
-- daily_steps rows are removed automatically. The delete_user_data RPC
-- (migration 025) enumerates every user-scoped table for its pre-wipe but
-- is NOT rewritten here on purpose: reproducing its ~45 DELETE statements
-- to add one line risks regressing the completeness 025 established, and
-- the CASCADE already guarantees the rows are gone. Fold a
--   BEGIN DELETE FROM daily_steps WHERE user_id = uid;
--     EXCEPTION WHEN undefined_table THEN NULL; END;
-- line into delete_user_data the next time that function is revised, in
-- the per-day / food-domain block beside daily_water.
--
-- Old AAB compatibility (release policy 2026-05-24): strictly additive.
-- The frozen closed-test build has no daily_steps writer or reader, so the
-- new table is invisible to it. New table, no change to any table the old
-- build touches. Safe.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        056
--   - Purpose:                 new daily_steps table (per-day step
--                              total + source) so the manual step log
--                              has a synced home and the coach's step
--                              target has real data to check against.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (CREATE TABLE IF NOT EXISTS,
--                              CREATE OR REPLACE FUNCTION, DROP/CREATE
--                              TRIGGER, DROP POLICY IF EXISTS then
--                              CREATE, all idempotent)
--   - Rollback:                DROP TABLE IF EXISTS daily_steps CASCADE;
--                              DROP FUNCTION IF EXISTS
--                                _daily_steps_touch_updated_at();
--                              The new client falls back to local-only
--                              steps (push errors are caught per-table
--                              and do not fail the wider sync run).
--   - App-code dependencies:   src/lib/sync/tables/dailySteps.js
--                              (push expects updated_at; pull uses it as
--                              the LWW gate). src/lib/database.js owns
--                              the local mirror + CRUD. Old AAB has no
--                              writer, so the table is invisible to it.
--   - Dependencies:            none (standalone table).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run. See verification in
-- supabase/README.md § Verify daily_steps.

CREATE TABLE IF NOT EXISTS daily_steps (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date        NOT NULL,
  steps      int         NOT NULL DEFAULT 0,
  source     text        NOT NULL DEFAULT 'manual',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entry_date)
);

ALTER TABLE daily_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own steps" ON daily_steps;
CREATE POLICY "Users can manage own steps" ON daily_steps
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Last-write-wins gate: refuse a write whose updated_at is older than the
-- row already there, and auto-stamp updated_at when the client did not.
-- Same shape as _body_metrics_touch_updated_at (migration 047).
CREATE OR REPLACE FUNCTION _daily_steps_touch_updated_at()
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

DROP TRIGGER IF EXISTS daily_steps_touch_updated_at ON daily_steps;
CREATE TRIGGER daily_steps_touch_updated_at
  BEFORE UPDATE ON daily_steps
  FOR EACH ROW EXECUTE FUNCTION _daily_steps_touch_updated_at();
