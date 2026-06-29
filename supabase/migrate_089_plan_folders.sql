-- migrate_089_plan_folders.sql
-- Plan folders (Hevy teardown 02-routines-programs.md, R1 "Routine/plan
-- folders", P1). Lets a user ORGANISE the My Plans list (= programmes) into
-- collapsible folders. Organisation of a FREE feature, so it is itself FREE —
-- NO Pro gate anywhere in this stack.
--
-- ADDITIVE + idempotent only. Applied by CI on merge to main
-- (deploy-migrations.yml); never run by hand against production.
--
-- Shape mirrors the local SQLite plan_folders table: timestamps stay epoch
-- milliseconds (bigint) so last-write-wins comparisons round-trip without
-- timezone/precision conversion, matching meal_plans (086). A folder NEVER
-- owns a plan's lifecycle: programmes.folder_id is nullable and
-- ON DELETE SET NULL, so deleting a folder only UNFILES its plans (folder_id
-- → NULL) and never deletes a plan.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  089
--   - Purpose:           plan_folders table + RLS (own-row) + deleted_at
--                        tombstone + programmes.folder_id
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  NO (auto-applies on merge to main via
--                        deploy-migrations.yml, which targets the LIVE
--                        EU-Dublin production project — there is no separate
--                        staging gate; the migration is additive + idempotent)
--   - Safe to re-run:    YES (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT
--                        EXISTS, CREATE INDEX IF NOT EXISTS, DROP POLICY IF
--                        EXISTS then CREATE — idempotent)
--   - Rollback:          ALTER TABLE programmes DROP COLUMN IF EXISTS folder_id;
--                        DROP TABLE IF EXISTS plan_folders;
--   - App-code deps:     src/lib/sync/tables/planFolders.js ships tombstoned
--                        rows on push and applies remote tombstones on pull;
--                        registry.js sets softDelete:true; transport.js wires
--                        the handler into MIGRATED_TABLES.
--
-- Apply via deploy-migrations.yml on merge, or Dashboard -> SQL Editor.

CREATE TABLE IF NOT EXISTS plan_folders (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text    NOT NULL,
  sort_order  int     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_folders_user
  ON plan_folders (user_id, sort_order);

-- Soft-delete tombstone (NULL = live; non-NULL = deleted). Nullable + additive
-- so the local table (which already carries deleted_at) and the cloud agree:
-- deleting a folder tombstones it here and the tombstone propagates cross-device
-- (mirrors the food-delete tombstone contract, migrate_090). The local delete
-- also unfiles the folder's plans (programmes.folder_id -> NULL); that travels
-- via the programmes round-trip.
ALTER TABLE plan_folders
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial index over the live rows so the common (non-deleted) read stays fast.
CREATE INDEX IF NOT EXISTS idx_plan_folders_live
  ON plan_folders (user_id)
  WHERE deleted_at IS NULL;

-- RLS: mandatory on every new table (docs/rules/supabase.md). Own-row only.
ALTER TABLE plan_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data" ON plan_folders;
CREATE POLICY "Users can read own data"
  ON plan_folders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own data" ON plan_folders;
CREATE POLICY "Users can insert own data"
  ON plan_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own data" ON plan_folders;
CREATE POLICY "Users can update own data"
  ON plan_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own data" ON plan_folders;
CREATE POLICY "Users can delete own data"
  ON plan_folders FOR DELETE
  USING (auth.uid() = user_id);

-- ON DELETE SET NULL: deleting a folder UNFILES its plans, never deletes them.
ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS folder_id uuid
    REFERENCES plan_folders(id) ON DELETE SET NULL;
