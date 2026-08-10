-- migrate_132_planned_muscle_volume_provenance.sql
--
-- Purpose (Campaign 1 P0-1, 2026-08-10): carry the per-muscle landmark
-- bounds and the seed source/provenance of planned_muscle_volume rows to
-- the cloud. The local table has always stored mev/mav/mrv/source (the
-- adaptive campaign's explanation surfaces derive from the WRITTEN rows
-- and their source labels), but the cloud table only ever held
-- planned_sets - so a new device restored set counts with no provenance,
-- and in practice restored them into an unread mirror table. The client
-- fix (same batch) pushes these columns with column-tolerant retries and
-- pulls rows into the PRIMARY local table with last-write-wins by
-- updated_at, so prescriptions AND their explanation provenance survive
-- reinstall and cross-device restore.
--
-- Applied locally: n/a (the local schema has carried these columns since
-- the adaptive build). Applied remotely: NO - awaiting the founder's
-- explicit "run against production" for this batch.
-- RELEASE NOTE: NOT a hard gate for shipping the client fix - the push
-- retries without these columns until the migration lands (rows keep
-- syncing set counts exactly as today) - but cross-device provenance
-- restore only becomes real once this is applied, so it should run with
-- the next production batch.
--
-- Additive and idempotent: yes (ADD COLUMN IF NOT EXISTS, all nullable,
-- no defaults, no backfill - legacy rows stay null and the client
-- degrades them honestly to research landmarks with source 'template',
-- which claims no personalisation). Safe to re-run: yes.
-- Rollback: ALTER TABLE public.planned_muscle_volume
--   DROP COLUMN mev, DROP COLUMN mav, DROP COLUMN mrv, DROP COLUMN source;
-- (nullable, no policy or function reads them).

ALTER TABLE public.planned_muscle_volume
  ADD COLUMN IF NOT EXISTS mev integer,
  ADD COLUMN IF NOT EXISTS mav integer,
  ADD COLUMN IF NOT EXISTS mrv integer,
  ADD COLUMN IF NOT EXISTS source text;

-- Verification: prints the four columns when present.
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'planned_muscle_volume'
   AND column_name IN ('mev', 'mav', 'mrv', 'source')
 ORDER BY column_name;
