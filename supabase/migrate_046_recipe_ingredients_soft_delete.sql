-- Migration 046: recipe_ingredients soft-delete + LWW columns
--
-- The local SQLite schema gained `deleted_at` + `updated_at` in
-- commit `bc117a1` (additive migration block at the bottom of
-- src/lib/database.js). The transport handler at
-- src/lib/sync/tables/recipeIngredients.js now ships both
-- columns on every push. Without this migration the cloud table
-- doesn't have them and PostgREST rejects the push with
--   PGRST204: "Could not find the 'deleted_at' column of
--    'recipe_ingredients' in the schema cache"
-- so the per-table push for this registry entry silently fails
-- on every sync until this is applied.
--
-- Adds:
--   updated_at  timestamptz NOT NULL DEFAULT now()  (backfilled
--               = created_at for legacy rows so the LWW gate has
--               something to compare against)
--   deleted_at  timestamptz  (NULL = live; non-NULL = tombstone)
--
-- Plus a BEFORE UPDATE trigger that touches updated_at on every
-- UPDATE so server-side mutations also advance the LWW clock.
-- Mirrors the pattern from migration 044's
-- _notification_preferences_touch_updated_at trigger.
--
-- Plus a partial index over the live rows (deleted_at IS NULL)
-- so recipe-builder reads against the cloud also stay fast
-- once that UI ships.
--
-- RLS unchanged: the existing "Users can manage own recipe
-- ingredients" policy already gates on the parent recipe's
-- user_id, which works for both live + tombstoned rows.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        046
--   - Purpose:                 recipe_ingredients.updated_at +
--                              deleted_at + touch trigger +
--                              partial live index. Backs the
--                              softDelete:true + LWW contract in
--                              SYNC_REGISTRY (flipped in commit
--                              bc117a1).
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION +
--                              DROP/CREATE TRIGGER +
--                              CREATE INDEX IF NOT EXISTS)
--   - Rollback:                ALTER TABLE recipe_ingredients
--                              DROP COLUMN deleted_at, DROP
--                              COLUMN updated_at;
--                              DROP TRIGGER + DROP FUNCTION.
--                              Safe — local SQLite would still
--                              ship both columns on push and
--                              re-introduce the PGRST204; only
--                              roll back paired with a client
--                              revert of bc117a1.
--   - App-code dependencies:   src/lib/sync/tables/recipeIngredients.js
--                              expects both columns on push +
--                              uses cloud updated_at as the LWW
--                              gate on pull. Old AAB has no
--                              writer for recipe_ingredients at
--                              all (legacy food bulk RPC excluded
--                              this table) so the new columns
--                              are invisible to it; safe.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Backfill updated_at from created_at for rows that landed before
-- this migration ran. WHERE updated_at = its INSERT default
-- (now()) is unreliable on a long-running table so we just
-- explicitly copy created_at where it's older than updated_at.
-- Idempotent: re-running does nothing on a row that's been
-- touched since.
UPDATE recipe_ingredients
SET updated_at = created_at
WHERE created_at IS NOT NULL
  AND updated_at IS NOT NULL
  AND created_at < updated_at
  AND updated_at - created_at < interval '5 seconds';
-- The 5-second window is a conservative "if updated_at looks
-- like the migration-time default, copy created_at over it"
-- heuristic. Real client writes will be seconds-to-days after
-- created_at so they survive.

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_live
  ON recipe_ingredients(user_id, recipe_id)
  WHERE deleted_at IS NULL;

-- Touch trigger: keep updated_at fresh on every UPDATE so the
-- sync layer's LWW comparison has a reliable monotonic clock.
-- Client sync writes carry an explicit updated_at from SQLite;
-- preserve it when it is newer, refuse stale writes so an older
-- device cannot clobber a newer cloud value. Mirrors migration
-- 044's notification_preferences trigger.
CREATE OR REPLACE FUNCTION _recipe_ingredients_touch_updated_at()
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

DROP TRIGGER IF EXISTS recipe_ingredients_touch_updated_at
  ON recipe_ingredients;
CREATE TRIGGER recipe_ingredients_touch_updated_at
  BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION _recipe_ingredients_touch_updated_at();
