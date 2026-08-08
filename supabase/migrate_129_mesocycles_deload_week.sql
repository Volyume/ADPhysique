-- migrate_129_mesocycles_deload_week.sql
--
-- Purpose: add the deload_week column the local schema has carried since
--   local migration v68. Without it the value cannot sync: the pull path
--   falls back to deriving it (deload_week ?? planned_weeks ?? duration_weeks)
--   and a cloud restore loses the user's genuine deload placement.
--   Closes the last block/week sync gap from the cross-surface consistency
--   audit (docs/audit/cross-surface-consistency-audit-2026-07-30.md) after
--   planned_weeks/block_type/rir_ladder were wired in Wave 2 there.
--   Founder GO 2026-08-06 (multi-choice ruling, comprehension-trust
--   campaign D89 follow-ons).
--
-- ORDERING (important): the app-side push of this column (sync.js
--   _pushMesocycles) lands on main in the same change as this file. Run
--   this migration against production BEFORE building/shipping that code:
--   a client pushing deload_week against a database without the column
--   fails the whole mesocycles upsert batch.
--
-- Applied locally:  n/a (cloud-only; the local column exists since v68)
-- Applied remotely: YES 2026-08-06 (founder GO "you can run migrations";
--   pre-flight showed the column ALREADY existed on production, so the
--   apply recorded the migration + comment; push wiring has no ordering risk)
-- Safe to re-run:   yes (ADD COLUMN IF NOT EXISTS)
-- Rollback:         ALTER TABLE public.mesocycles DROP COLUMN IF EXISTS deload_week;
--                   (client tolerates absence only BEFORE the push wiring
--                   ships; after that, dropping the column breaks push.)

ALTER TABLE public.mesocycles
  ADD COLUMN IF NOT EXISTS deload_week integer;

COMMENT ON COLUMN public.mesocycles.deload_week IS
  '1-indexed week number of the planned deload within the block; NULL means derive from planned_weeks (legacy rows). Mirrors the local column added in local migration v68.';
