-- Migration 060: morning_weights gains updated_at + LWW touch trigger
--
-- SYNC-6. The cloud `morning_weights` table never had an `updated_at`
-- column (setup_complete.sql created it without one; migration 018 only
-- changed its PK). The client pull (`_pullMorningWeights` in
-- src/lib/sync.js) already filters `.gte('updated_at', cursor)` and advances
-- a per-table watermark off `updated_at`, so without the column the cursor
-- can never advance and the table re-pulls everything every cycle. Worse,
-- the local applier used `INSERT OR IGNORE`, so an existing local row was
-- never updated: a morning weight edited on another device never
-- reconciled. This migration gives the cloud table the column + a touch
-- trigger so edits bump `updated_at`, and the client commit that ships with
-- it switches the applier to a last-write-wins upsert.
--
-- Adds:
--   updated_at  timestamptz NOT NULL DEFAULT now()
--   BEFORE UPDATE touch trigger (refuses stale writes; auto-bumps
--     updated_at when the client did not stamp one)
--
-- No deleted_at: morning_weights has no soft-delete path (the app never
-- tombstones a weigh-in), so it stays hard-delete, matching the
-- weekly_checkins_v2 treatment in migration 047. The local SQLite table
-- already carries updated_at (additive block in src/lib/database.js) and
-- logMorningWeight already stamps it.
--
-- Old AAB compatibility (release policy 2026-05-24):
--   The frozen closed-test build pushes morning_weights without updated_at.
--   DEFAULT now() fills it on insert; the touch trigger bumps it on update.
--   The old client's pull selects all columns and passes the row to
--   insertMorningWeightFromCloud, which reads named fields and ignores
--   unknown ones. The old build's pull `.gte('updated_at', ...)` starts
--   working rather than breaking. Safe.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        060
--   - Purpose:                 morning_weights gains updated_at + touch
--                              trigger so cross-device edits are detectable
--                              and the per-table pull watermark can advance
--                              (SYNC-6).
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION + DROP / CREATE
--                              TRIGGER)
--   - Rollback:                DROP TRIGGER morning_weights_touch_updated_at
--                              ON morning_weights;
--                              DROP FUNCTION _morning_weights_touch_updated_at();
--                              ALTER TABLE morning_weights DROP COLUMN updated_at;
--                              Safe — the new client falls back to no LWW gate
--                              (re-pull-all, INSERT OR REPLACE behaviour) for
--                              this table.
--   - App-code dependencies:   src/lib/database.js insertMorningWeightFromCloud
--                              uses updated_at as the LWW gate on pull;
--                              src/lib/sync.js _pullMorningWeights filters and
--                              advances the watermark on updated_at. The push
--                              (_pushMorningWeights) does NOT send updated_at;
--                              the trigger fills/bumps it. Apply this before
--                              the next AAB that relies on cross-device weight
--                              reconcile.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE morning_weights
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _morning_weights_touch_updated_at()
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

DROP TRIGGER IF EXISTS morning_weights_touch_updated_at
  ON morning_weights;
CREATE TRIGGER morning_weights_touch_updated_at
  BEFORE UPDATE ON morning_weights
  FOR EACH ROW EXECUTE FUNCTION _morning_weights_touch_updated_at();
