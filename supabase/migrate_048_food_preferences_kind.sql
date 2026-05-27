-- Migration 048: food_favourites.kind for like/dislike
--
-- Today the `food_favourites` table is a single concept ("user
-- has favourited this food"). The audit at 2026-05-27 surfaced
-- the gap: there's no equivalent for "user has explicitly said
-- they don't eat this", which the coach needs in order to avoid
-- suggesting disliked foods when meal suggestions / recipe
-- builder ship.
--
-- Solution: a single `kind` column on `food_favourites`. Values:
--   'fav'     — user wants to see this near the top of search
--               results. Existing behaviour.
--   'dislike' — user has explicitly excluded this food from
--               coach suggestions. Still searchable; still
--               loggable on purpose; just not surfaced as a
--               recommendation.
--
-- Single table + single PK (user_id, food_ref) means a food can
-- be one of {nothing, fav, dislike} but never both. Toggle UX in
-- the client cycles through the three states on long-press.
--
-- Schema (post-migration):
--   user_id        uuid NOT NULL REFERENCES auth.users(id)
--   food_ref       text NOT NULL
--   last_used_at   timestamptz NOT NULL DEFAULT now()
--   kind           text NOT NULL DEFAULT 'fav'
--                  CHECK (kind IN ('fav', 'dislike'))
--   PRIMARY KEY (user_id, food_ref)
--
-- Old-client compatibility (release policy 2026-05-24): the
-- closed-test build pushes food_favourites without a `kind`
-- column. The DEFAULT 'fav' on insert keeps every legacy push
-- behaving exactly as before (favourite, never dislike). Reads
-- include the new column; the old client ignores unknown fields
-- per supabase-js + PostgREST. Safe.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        048
--   - Purpose:                 food_favourites.kind column +
--                              check constraint so the same
--                              table can hold both "wants to
--                              see this" and "don't suggest
--                              this" entries.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              guarded check constraint)
--   - Rollback:                ALTER TABLE food_favourites
--                                DROP COLUMN kind;
--                              Safe — the new client falls back
--                              to treating every row as a fav,
--                              same as before this work.
--   - App-code dependencies:   src/lib/food/db.js exports
--                              setFoodPreference / getDislikes /
--                              getFavourites (kind-filtered) on
--                              top of the existing toggleFavourite
--                              backwards-compat wrapper.
--                              src/lib/sync/tables/foodDomain.js
--                              ships `kind` in the food_sync_push
--                              changes.food_favourites payload.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE food_favourites
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'fav';

-- The CHECK constraint is added separately so the ADD COLUMN
-- step above stays trivially safe to re-run. If the constraint
-- already exists (re-run on a project that's already been
-- migrated) the DO block silently skips.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'food_favourites_kind_check'
  ) THEN
    ALTER TABLE food_favourites
      ADD CONSTRAINT food_favourites_kind_check
      CHECK (kind IN ('fav', 'dislike'));
  END IF;
END $$;
