-- migrate_131_mesocycles_block_ledger.sql
--
-- Purpose: add the Block Ledger column to mesocycles (Stage 6 of the
-- adaptive mesocycle build, 2026-08-09). The app computes a per-muscle
-- ledger when a block finishes (src/lib/interBlock.js, versioned JSON)
-- and persists it on the finished block's row; the next block's seeding
-- and the learned working range replay it. The cloud column completes
-- the cross-device round trip (push: sync.js _pushMesocycles; pull:
-- insertMesocycleFromCloud, which preserves a local ledger when the
-- cloud row carries none).
--
-- Applied locally: YES (database.js SCHEMA_MIGRATIONS user_version bump,
-- same build). Applied remotely: NO — awaiting the founder's explicit
-- "run against production" for this batch.
-- ORDER MATTERS (migrate_129 precedent): this must run against
-- production BEFORE a build carrying the sync push of block_ledger
-- ships, or every mesocycles upsert batch rejects on the unknown column.
--
-- Additive and idempotent: yes (ADD COLUMN IF NOT EXISTS, nullable, no
-- default, no backfill). Safe to re-run: yes (no-op when present).
-- Rollback: ALTER TABLE public.mesocycles DROP COLUMN block_ledger;
-- (nullable and unread by any RLS policy or function, so dropping it
-- cannot strand anything).

ALTER TABLE public.mesocycles
  ADD COLUMN IF NOT EXISTS block_ledger jsonb;

-- Verification: prints the column when present.
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'mesocycles'
   AND column_name = 'block_ledger';
