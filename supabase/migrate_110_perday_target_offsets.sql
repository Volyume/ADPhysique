-- Migration 110: perday_target_offsets — cloud mirror for the per-day-of-week
-- calorie planning offsets.
--
-- Purpose:
--   Design-usability audit 2026-07-09, finding L05-PDT1 (founder decision D5,
--   docs/design-usability-audit-2026-07-09/DECISIONS-2026-07-09.md): the
--   per-day planning offsets set on PerDayTargetsScreen
--   (src/lib/food/perDayTargets.js) were device-local only (AsyncStorage),
--   never synced, so a weekend-eating plan was lost on reinstall or a new
--   device. This migration creates the cloud table; the app-side sync
--   handler is src/lib/sync/tables/perDayTargetOffsets.js, registered in
--   src/lib/sync/registry.js (table 'perday_target_offsets', pk user_id,
--   last_write_wins, no soft delete, bidirectional).
--
--   One row per user, 7 integer kcal-offset columns (Monday-first weekday
--   keys, matching WEEKDAY_KEYS in perDayTargets.js). PLANNING DATA ONLY:
--   these are the same display-only kcal deltas PerDayTargetsScreen already
--   clamps against the safe floor on-device before showing them. This
--   migration does not touch, read, or gate on nutrition_targets, the
--   engine, or any ED-safety floor — it only gives the user's own offsets a
--   synced home. "Reset all to base target" (the screen's reset action)
--   writes zeros to every column; there is no delete path, so no soft-delete
--   tombstone column is needed.
--
-- Data honesty:
--   Every offset column defaults to 0 (matches DEFAULT_PERDAY_OFFSETS) and is
--   bounded to the same +/-1500 kcal presentation cap the client enforces
--   (sanitiseOffset / MAX_PERDAY_OFFSET_KCAL in perDayTargets.js), as a
--   defence-in-depth CHECK constraint. Existing rows are unaffected (this is
--   a brand-new table).
--
-- Applied: LOCALLY/staging via db push; PRODUCTION only on the founder
--   running this file explicitly (run against production). Not auto-applied
--   — the app never runs cloud migrations, and the deploy-migrations
--   workflow is manual-dispatch only.
-- Safe to re-run: YES (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE
--   FUNCTION, DROP/CREATE TRIGGER, DROP POLICY IF EXISTS then CREATE, all
--   idempotent).
-- Rollback:
--   DROP TABLE IF EXISTS public.perday_target_offsets CASCADE;
--   DROP FUNCTION IF EXISTS public._perday_target_offsets_touch_updated_at();
--   The client falls back to local-only per-day offsets (push/pull already
--   treat a missing table as a benign skip via the shared missing-table
--   detector, so a rollback cannot trip the push-first sign-out guard).
--
-- App-code dependencies:
--   src/lib/sync/tables/perDayTargetOffsets.js (push upserts on user_id;
--   pull applies under a client-side LWW gate). src/lib/food/perDayTargets.js
--   owns the local AsyncStorage mirror + the last-write-wins clock. Until
--   this migration is applied, both push and pull benign-skip on the
--   "table not in schema cache" response (PGRST205 / 42P01), the same
--   pattern cardio_log (migration 064) and daily_steps (migration 056) use.
-- Dependencies: none (standalone table).

CREATE TABLE IF NOT EXISTS public.perday_target_offsets (
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mon_offset_kcal  int         NOT NULL DEFAULT 0,
  tue_offset_kcal  int         NOT NULL DEFAULT 0,
  wed_offset_kcal  int         NOT NULL DEFAULT 0,
  thu_offset_kcal  int         NOT NULL DEFAULT 0,
  fri_offset_kcal  int         NOT NULL DEFAULT 0,
  sat_offset_kcal  int         NOT NULL DEFAULT 0,
  sun_offset_kcal  int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id),
  CONSTRAINT perday_target_offsets_bounds CHECK (
    mon_offset_kcal BETWEEN -1500 AND 1500 AND
    tue_offset_kcal BETWEEN -1500 AND 1500 AND
    wed_offset_kcal BETWEEN -1500 AND 1500 AND
    thu_offset_kcal BETWEEN -1500 AND 1500 AND
    fri_offset_kcal BETWEEN -1500 AND 1500 AND
    sat_offset_kcal BETWEEN -1500 AND 1500 AND
    sun_offset_kcal BETWEEN -1500 AND 1500
  )
);

-- RLS: mandatory on every new table (docs/rules/supabase.md).
ALTER TABLE public.perday_target_offsets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own perday target offsets" ON public.perday_target_offsets;
CREATE POLICY "Users can manage own perday target offsets" ON public.perday_target_offsets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Last-write-wins gate: refuse a write whose updated_at is older than the row
-- already there, and auto-stamp updated_at when the client did not. Same
-- shape as _cardio_log_touch_updated_at (migration 064) /
-- _daily_steps_touch_updated_at (migration 056).
CREATE OR REPLACE FUNCTION public._perday_target_offsets_touch_updated_at()
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

DROP TRIGGER IF EXISTS perday_target_offsets_touch_updated_at ON public.perday_target_offsets;
CREATE TRIGGER perday_target_offsets_touch_updated_at
  BEFORE UPDATE ON public.perday_target_offsets
  FOR EACH ROW EXECUTE FUNCTION public._perday_target_offsets_touch_updated_at();
