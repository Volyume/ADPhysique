-- migrate_127_scan_calibration_vision_debug.sql
--
-- Purpose (D83, founder order 2026-07-13): founder-account-only diagnostic
-- payload on scan calibration rows -- the exact 256px model input and
-- quantised output mask per pose, so cross-device scoring divergences can
-- be diagnosed straight from the cloud table. The client attaches this
-- column ONLY for accounts on the calibration allow-list
-- (src/lib/progressScanCalibrationAccess.js); every other account's rows
-- never carry image-derived pixels, preserving the consent promise.
--
-- Status: NOT applied at authoring time; founder-gated ("run against
-- production").
-- Safe to re-run: yes (ADD COLUMN IF NOT EXISTS).
-- Rollback: alter table public.scan_calibration_events
--   drop column if exists vision_debug;

alter table public.scan_calibration_events
  add column if not exists vision_debug jsonb;

-- Abstained/withheld scans now send rows too (score null): the engine's own
-- abstention reason codes, so failed scans are diagnosable from the table.
alter table public.scan_calibration_events
  add column if not exists abstention_reasons jsonb;
