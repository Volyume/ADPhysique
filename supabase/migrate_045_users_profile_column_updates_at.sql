-- Migration 045: users_profile.column_updates_at JSONB
--
-- Per SYNC_REGISTRY: profiles.conflictStrategy = 'merge'. The
-- conflict.resolve() merge path in src/lib/sync/conflict.js needs
-- per-column write timestamps on both ends of the sync round to
-- decide, column-by-column, which side wrote that field most
-- recently:
--
--   for col in local.column_updates_at:
--     if local.column_updates_at[col] > server.column_updates_at[col]:
--       merged[col] = local[col]
--     else:
--       merged[col] = server[col]
--
-- This column carries those timestamps. Shape:
--   { "first_name": "2026-05-27T09:11:42.000Z",
--     "training_focus": "2026-05-25T18:02:09.000Z",
--     "bar_weight":  "2026-05-20T08:00:00.000Z",
--     ... }
--
-- Keys are the snake_case column names of users_profile that we
-- consider user-editable: first_name, units, training_focus,
-- training_age, primary_equipment, bar_weight. `tier` is omitted
-- — the server owns tier exclusively per migrate_005's update
-- trigger, so per-column conflict resolution does not apply.
--
-- Defaults to '{}'::jsonb on every existing row so legacy data
-- merges as "server beats local for every column" (no local
-- timestamp = server wins) which is the conservative default
-- per CLAUDE.md release policy 2026-05-24 ("the old app on
-- closed testing is required to remain functional against the
-- new schema").
--
-- The trigger below merges client-supplied column_updates_at on
-- UPDATE rather than replacing it, so two clients touching
-- different fields don't clobber each other's per-column
-- timestamps. The client always sends a COMPLETE column_updates_at
-- including server timestamps for fields it didn't touch — the
-- merge is a safety net for the case where two clients race a
-- push against the same row.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        045
--   - Purpose:                 users_profile.column_updates_at JSONB
--                              + safe-merge trigger to power the
--                              registry-locked profiles.merge
--                              conflict strategy.
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION +
--                              DROP/CREATE TRIGGER)
--   - Rollback:                ALTER TABLE users_profile DROP
--                              COLUMN column_updates_at;
--                              DROP TRIGGER users_profile_merge_column_updates_at;
--                              DROP FUNCTION _users_profile_merge_column_updates_at;
--                              Safe — the column is purely a sync
--                              signal; profile reads use the named
--                              columns, not column_updates_at.
--   - App-code dependencies:   src/lib/sync/tables/profiles.js
--                              push payload includes column_updates_at
--                              keyed by every field that has been
--                              touched locally; pull feeds
--                              column_updates_at into conflict.resolve()
--                              for the merge strategy. Old AAB has
--                              no writer or reader for this column;
--                              the trigger's merge behaviour means
--                              the old client's plain UPDATE still
--                              succeeds (column_updates_at stays
--                              empty for fields it didn't include).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS column_updates_at jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Safe-merge trigger. On UPDATE:
--   - If NEW.column_updates_at is NULL or empty, keep OLD.column_updates_at
--     so an old-client UPDATE (which doesn't know about this column)
--     does not wipe per-column timestamps.
--   - Otherwise merge OLD <- NEW so any timestamps the client sent
--     replace what was there, but fields the client didn't touch
--     keep their previous server timestamp.
--
-- The merge favours NEW so the client's intent wins; that's the
-- whole point of LWW per-column.
CREATE OR REPLACE FUNCTION _users_profile_merge_column_updates_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.column_updates_at IS NULL OR NEW.column_updates_at = '{}'::jsonb THEN
    NEW.column_updates_at := COALESCE(OLD.column_updates_at, '{}'::jsonb);
  ELSE
    NEW.column_updates_at :=
      COALESCE(OLD.column_updates_at, '{}'::jsonb)
      || NEW.column_updates_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS users_profile_merge_column_updates_at
  ON users_profile;
CREATE TRIGGER users_profile_merge_column_updates_at
  BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION _users_profile_merge_column_updates_at();

-- Sanity check: existing rows now have an empty column_updates_at
-- so legacy data merges as "server wins for every column" until the
-- new client writes a per-column timestamp. SELECT used to confirm
-- the default landed; harmless if the table is empty.
SELECT count(*) FILTER (WHERE column_updates_at IS NULL) AS null_rows,
       count(*) AS total_rows
FROM users_profile;
