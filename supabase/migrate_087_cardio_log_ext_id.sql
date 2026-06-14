-- Migration 087: cardio_log.ext_id for passive cardio import (ULTIMATE-CUX-PCI)
--
-- Passive cardio import (read-only Apple Health / Health Connect sessions, audit
-- docs/ultimate-audit-2026-06-13/pass4-blueprints-cardio-ux.md ITEM 1) needs a
-- stable per-session key from the source platform (HealthKit UUID / Health
-- Connect record id) so re-running the import never duplicates a session. This
-- adds that key as a nullable column plus a PARTIAL unique index: manual logs
-- leave ext_id NULL and are unconstrained; imported rows are de-duped on
-- (user_id, ext_id). NA-cux-4 founder decision (2026-06-14): dedicated column.
--
-- Strictly additive (ADD COLUMN + index). The frozen closed-test build has no
-- importer, so it never writes ext_id; safe. Mirrors the local SQLite migration
-- (src/lib/database.js SCHEMA_MIGRATIONS trailing entry: ALTER TABLE cardio_log
-- ADD COLUMN ext_id TEXT + idx_cardio_log_user_extid). The sync handler
-- (src/lib/sync/tables/cardioLog.js) pushes ext_id and pulls it via select('*').
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        087
--   - Purpose:                 add cardio_log.ext_id (platform sample id) +
--                              partial unique index so passive imports de-dup.
--   - Tables/columns changing: cardio_log: + ext_id (text, nullable).
--   - Additive or destructive: additive only.
--   - Environment:             production EU-Dublin (apply via Dashboard SQL
--                              editor or supabase db push; NEVER run from app).
--   - Applied locally:         no (no local dev Supabase project)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS, CREATE UNIQUE
--                              INDEX IF NOT EXISTS — both idempotent)
--   - Rollback:                DROP INDEX IF EXISTS idx_cardio_log_user_extid;
--                              ALTER TABLE cardio_log DROP COLUMN IF EXISTS ext_id;
--   - App-code dependencies:   src/lib/database.js (local mirror + insert),
--                              src/lib/sync/tables/cardioLog.js (push mapping),
--                              src/lib/health.js (importNewCardio sets ext_id).
--   - Dependencies:            migration 064 (cardio_log table).
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

ALTER TABLE cardio_log ADD COLUMN IF NOT EXISTS ext_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cardio_log_user_extid
  ON cardio_log(user_id, ext_id)
  WHERE ext_id IS NOT NULL;
