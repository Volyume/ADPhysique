-- Migration 134: refuse-stale-write triggers on the unguarded
--                coaching-state tables
--
-- Campaign 1, P0-8 multi-device conflict audit.
--
-- THE PROBLEM. The sync runner pushes BEFORE it pulls on every
-- cycle (src/lib/sync/runner.js), so a device that has been
-- offline uploads its stale world to the cloud before it learns
-- the cloud has moved on. The registry contract
-- (src/lib/sync/registry.js) states last_write_wins as "server
-- compares incoming updated_at, newer wins" - but that comparison
-- only exists on the eight tables that already carry a
-- `_..._touch_updated_at` BEFORE UPDATE trigger (body_metrics,
-- weekly_checkins_v2, notification_preferences,
-- recipe_ingredients, daily_steps, morning_weights, cardio_log,
-- perday_target_offsets). Everywhere else a blind upsert from any
-- device overwrites the cloud row regardless of timestamps.
--
-- Consequences the audit proved on this exact mechanism: a stale
-- device re-activating a COMPLETED training block and nulling its
-- Block Ledger; a stale device's calorie/macro targets landing
-- over newer ones; a stale device's scoff_score (ED-screening
-- data) overwriting the up-to-date copy.
--
-- WHAT THIS MIGRATION DOES. Adds the standard refuse-stale-write
-- trigger - the canonical body from
-- supabase/migrate_047_body_metrics_weekly_checkins_lww.sql:94-115,
-- adapted per table - to the nine remaining coaching-state
-- tables:
--
--   mesocycles, mesocycle_weeks, coach_outputs,
--   nutrition_targets, user_body_profile, programmes, routines,
--   routine_exercises, planned_muscle_volume
--
-- Trigger semantics, identical to the eight already live:
--   * NEW.updated_at < OLD.updated_at  -> RETURN OLD (the stale
--     write is silently refused; the row keeps the newer content)
--   * NEW.updated_at IS NULL or unchanged -> stamp now() so an
--     old client that ships no timestamp still produces a
--     comparable ordering key
--   * otherwise -> accept
--
-- Each table also gets `ADD COLUMN IF NOT EXISTS updated_at
-- timestamptz NOT NULL DEFAULT now()` immediately before its
-- trigger. On every table that already has the column this is a
-- no-op; where a table predates the column the trigger would not
-- be meaningful without it. Both statements are additive and
-- re-runnable.
--
-- WHY THIS IS SAFE TO ADD NOW (read before applying). A refuse-
-- stale-write trigger is only safe once every client push ships
-- an HONEST updated_at - the row's own edit time, not the time of
-- the push. Otherwise a legitimate edit stamped `now()` at push
-- time would still win, and worse, a device whose clock ran
-- behind would find its real edits silently refused. As of
-- Campaign 1 every push path for these nine tables ships the
-- row's own timestamp:
--   mesocycles / programmes / routines /
--   routine_exercises / planned_muscle_volume
--                       src/lib/sync.js - already honest (F5
--                       Phase A: `new Date(x.updatedAt ??
--                       x.createdAt ?? Date.now())`)
--   mesocycle_weeks     honest as of the Campaign 1 adversarial
--                       review (finding 9): the applier used to
--                       restamp pulled rows with Date.now(),
--                       which would have laundered pull time as
--                       edit time through the F5 push. The
--                       applier now preserves cloud timestamps
--                       and gates on strictly-newer updated_at
--                       (weeks DO carry a user edit: the
--                       confirm-then-apply early deload).
--   coach_outputs       honest as of P0-8 D7: saveCoachOutput now
--                       writes the local updated_at column on
--                       both branches, so _pushCoachOutputs no
--                       longer falls back to Date.now()
--   nutrition_targets   honest as of P0-8 D9:
--                       src/lib/sync/tables/nutritionTargets.js
--                       pushes _toIso(targets.updatedAt)
--   user_body_profile   honest as of P0-8 D14:
--                       _pushUserBodyProfile pushes p.updatedAt
-- The pull-side appliers in src/lib/database.js were gated in the
-- same campaign, so the two halves of last-write-wins now agree.
--
-- Old AAB compatibility (release policy 2026-05-24): a client
-- that ships no updated_at at all hits the IS NULL branch and the
-- trigger stamps now() for it, which is exactly today's
-- behaviour. A client that ships an honest OLDER timestamp has
-- its stale write refused - that IS the point of the migration,
-- and it is the same posture the eight guarded tables have been
-- in since 047. No client change is required for this migration
-- to be applied; no client breaks if it is not.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        134
--   - Purpose:                 refuse-stale-write (LWW) triggers
--                              on the nine unguarded coaching-
--                              state tables, closing the cloud
--                              half of P0-8 D1/D2/D3/D9/D14.
--   - Applied locally:         n/a (no local dev Supabase project)
--   - Applied remotely:        YES - applied to EU-Dublin
--                              production 2026-08-12 on the
--                              founder's order (Claude-run).
--                              Verified: all nine target tables
--                              carry a *_touch_updated_at trigger,
--                              joining the eight guarded since 047.
--   - Safe to re-run:          yes (ADD COLUMN IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION +
--                              DROP TRIGGER IF EXISTS / CREATE
--                              TRIGGER throughout)
--   - Rollback:                DROP TRIGGER IF EXISTS
--                                <table>_touch_updated_at ON <table>;
--                              DROP FUNCTION IF EXISTS
--                                _<table>_touch_updated_at();
--                              for each of the nine tables. The
--                              updated_at columns are left in
--                              place on rollback: the sync layer
--                              reads and writes them and dropping
--                              one would break delta pulls.
--   - Order:                   independent of 129/131/132/133;
--                              apply in any order relative to
--                              them.

-- ─── mesocycles ──────────────────────────────────────────────────

ALTER TABLE mesocycles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _mesocycles_touch_updated_at()
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

DROP TRIGGER IF EXISTS mesocycles_touch_updated_at
  ON mesocycles;
CREATE TRIGGER mesocycles_touch_updated_at
  BEFORE UPDATE ON mesocycles
  FOR EACH ROW EXECUTE FUNCTION _mesocycles_touch_updated_at();

-- ─── mesocycle_weeks ─────────────────────────────────────────────

ALTER TABLE mesocycle_weeks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _mesocycle_weeks_touch_updated_at()
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

DROP TRIGGER IF EXISTS mesocycle_weeks_touch_updated_at
  ON mesocycle_weeks;
CREATE TRIGGER mesocycle_weeks_touch_updated_at
  BEFORE UPDATE ON mesocycle_weeks
  FOR EACH ROW EXECUTE FUNCTION _mesocycle_weeks_touch_updated_at();

-- ─── coach_outputs ───────────────────────────────────────────────

ALTER TABLE coach_outputs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _coach_outputs_touch_updated_at()
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

DROP TRIGGER IF EXISTS coach_outputs_touch_updated_at
  ON coach_outputs;
CREATE TRIGGER coach_outputs_touch_updated_at
  BEFORE UPDATE ON coach_outputs
  FOR EACH ROW EXECUTE FUNCTION _coach_outputs_touch_updated_at();

-- ─── nutrition_targets ───────────────────────────────────────────

ALTER TABLE nutrition_targets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _nutrition_targets_touch_updated_at()
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

DROP TRIGGER IF EXISTS nutrition_targets_touch_updated_at
  ON nutrition_targets;
CREATE TRIGGER nutrition_targets_touch_updated_at
  BEFORE UPDATE ON nutrition_targets
  FOR EACH ROW EXECUTE FUNCTION _nutrition_targets_touch_updated_at();

-- ─── user_body_profile ───────────────────────────────────────────
-- Carries scoff_score (ED screening) and the goal lock, so a stale
-- device winning here is a safety-relevant regression, not just an
-- annoyance.

ALTER TABLE user_body_profile
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _user_body_profile_touch_updated_at()
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

DROP TRIGGER IF EXISTS user_body_profile_touch_updated_at
  ON user_body_profile;
CREATE TRIGGER user_body_profile_touch_updated_at
  BEFORE UPDATE ON user_body_profile
  FOR EACH ROW EXECUTE FUNCTION _user_body_profile_touch_updated_at();

-- ─── programmes ──────────────────────────────────────────────────

ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _programmes_touch_updated_at()
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

DROP TRIGGER IF EXISTS programmes_touch_updated_at
  ON programmes;
CREATE TRIGGER programmes_touch_updated_at
  BEFORE UPDATE ON programmes
  FOR EACH ROW EXECUTE FUNCTION _programmes_touch_updated_at();

-- ─── routines ────────────────────────────────────────────────────

ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _routines_touch_updated_at()
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

DROP TRIGGER IF EXISTS routines_touch_updated_at
  ON routines;
CREATE TRIGGER routines_touch_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE FUNCTION _routines_touch_updated_at();

-- ─── routine_exercises ───────────────────────────────────────────

ALTER TABLE routine_exercises
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _routine_exercises_touch_updated_at()
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

DROP TRIGGER IF EXISTS routine_exercises_touch_updated_at
  ON routine_exercises;
CREATE TRIGGER routine_exercises_touch_updated_at
  BEFORE UPDATE ON routine_exercises
  FOR EACH ROW EXECUTE FUNCTION _routine_exercises_touch_updated_at();

-- ─── planned_muscle_volume ───────────────────────────────────────

ALTER TABLE planned_muscle_volume
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION _planned_muscle_volume_touch_updated_at()
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

DROP TRIGGER IF EXISTS planned_muscle_volume_touch_updated_at
  ON planned_muscle_volume;
CREATE TRIGGER planned_muscle_volume_touch_updated_at
  BEFORE UPDATE ON planned_muscle_volume
  FOR EACH ROW EXECUTE FUNCTION _planned_muscle_volume_touch_updated_at();
