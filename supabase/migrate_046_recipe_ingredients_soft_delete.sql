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

-- No explicit backfill from created_at. The first version of
-- this migration tried to do that and exploded with
--   ERROR 42703: column "created_at" does not exist
-- because the live cloud schema for recipe_ingredients diverged
-- from migration 015's CREATE TABLE somewhere along the way
-- (the canonical CREATE includes `created_at timestamptz DEFAULT
-- now()` but the running instance does not have it). Rather than
-- speculate about which migration dropped it, the safer move is
-- to skip the backfill entirely: the DEFAULT now() on the new
-- updated_at column already lands a non-null timestamp on every
-- pre-existing row at column-creation time. That's "row was
-- migrated at" rather than "row was created at" but the LWW gate
-- only cares about monotonic progression — any subsequent client
-- write bumps updated_at past the migration-time default and
-- the comparison stays correct.

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
