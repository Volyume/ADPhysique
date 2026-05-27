-- Migration 047: body_metrics + weekly_checkins_v2 LWW + soft-delete
--
-- The local SQLite schema for both `body_metric_log` and
-- `weekly_checkins` carries `updated_at` + `deleted_at` columns
-- (additive block at the bottom of src/lib/database.js). The
-- registry contract is:
--   body_composition_log -> last_write_wins, softDelete: true
--   weekly_checkins_v2   -> last_write_wins, softDelete: false
-- but the cloud tables have neither column today, so the per-
-- table push handlers cannot ship `updated_at` (no LWW gate
-- possible on either pull) and cannot ship `deleted_at` (no soft-
-- delete possible for body composition). The matrix tests at
-- src/lib/sync/__tests__/sync.regressionMatrix.test.js T3/T5
-- currently lock the gap as "known behaviour"; this migration
-- closes it on the cloud side so the next commit can close the
-- corresponding handler + test gaps.
--
-- Adds (both tables):
--   updated_at  timestamptz NOT NULL DEFAULT now()
--   BEFORE UPDATE touch trigger (refuses stale writes; auto-
--     bumps updated_at when the client did not stamp one)
--
-- Adds (body_metrics only — softDelete:true per registry):
--   deleted_at  timestamptz NULL
--   partial index over live rows (deleted_at IS NULL) on
--     (user_id, metric_date) for the Athlete Hub timeline
--
-- weekly_checkins_v2 stays hard-delete (softDelete:false) so no
-- deleted_at column there. Adding the column "just in case"
-- would diverge from the registry; the registry stays canonical.
--
-- Old AAB compatibility (release policy 2026-05-24):
--   The closed-test build pushes both tables without updated_at
--   / deleted_at. PostgREST tolerates missing columns on insert
--   when defaults exist; DEFAULT now() fills updated_at server-
--   side and deleted_at stays NULL. Pull responses include the
--   new columns; the old client's pull handlers select all and
--   pass the row to insertBodyMetricFromCloud /
--   insertWeeklyCheckinFromCloud, both of which read named
--   fields and ignore unknown ones. Safe.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        047
--   - Purpose:                 body_metrics + weekly_checkins_v2
--                              gain updated_at (both) +
--                              deleted_at (body_metrics) +
--                              touch triggers + partial live
--                              index, so the per-table sync
--                              handlers can honour LWW + soft-
--                              delete per the registry contract.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION +
--                              DROP / CREATE TRIGGER + CREATE
--                              INDEX IF NOT EXISTS)
--   - Rollback:                ALTER TABLE body_metrics
--                                DROP COLUMN deleted_at,
--                                DROP COLUMN updated_at;
--                              ALTER TABLE weekly_checkins_v2
--                                DROP COLUMN updated_at;
--                              DROP TRIGGER + DROP FUNCTION on
--                              both. Safe — only impact is the
--                              new client falls back to the old
--                              behaviour (no LWW gate, no soft
--                              delete) for those two tables.
--   - App-code dependencies:   src/lib/sync/tables/bodyComposition.js
--                              expects updated_at + deleted_at
--                              on push, uses updated_at as the
--                              LWW gate on pull.
--                              src/lib/sync/tables/weeklyCheckins.js
--                              expects updated_at on push, uses
--                              it as the LWW gate on pull. The
--                              old AAB has no updated_at /
--                              deleted_at writer for either
--                              table so the new columns are
--                              invisible to it; safe.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

-- ─── body_metrics ────────────────────────────────────────────────

ALTER TABLE body_metrics
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE body_metrics
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial live index for Athlete Hub timeline reads (no point
-- including tombstones — the UI never shows them).
CREATE INDEX IF NOT EXISTS idx_body_metrics_live
  ON body_metrics(user_id, metric_date)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION _body_metrics_touch_updated_at()
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

DROP TRIGGER IF EXISTS body_metrics_touch_updated_at
  ON body_metrics;
CREATE TRIGGER body_metrics_touch_updated_at
  BEFORE UPDATE ON body_metrics
  FOR EACH ROW EXECUTE FUNCTION _body_metrics_touch_updated_at();

-- ─── weekly_checkins_v2 ──────────────────────────────────────────

ALTER TABLE weekly_checkins_v2
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _weekly_checkins_v2_touch_updated_at()
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

DROP TRIGGER IF EXISTS weekly_checkins_v2_touch_updated_at
  ON weekly_checkins_v2;
CREATE TRIGGER weekly_checkins_v2_touch_updated_at
  BEFORE UPDATE ON weekly_checkins_v2
  FOR EACH ROW EXECUTE FUNCTION _weekly_checkins_v2_touch_updated_at();
