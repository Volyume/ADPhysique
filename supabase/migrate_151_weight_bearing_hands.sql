-- migrate_151_weight_bearing_hands.sql
--
-- Purpose:           Gap-closure Phase C (docs/capability-campaign-25-
--                    2026-08-20/MOVEMENT-PATH-AUDIT.md). Adds the eleventh
--                    nullable demand column to public.exercises and
--                    public.custom_exercises:
--                      weight_bearing_hands  boolean: load borne through the
--                                            palms with extended wrists (the
--                                            push-up / quadruped class,
--                                            handstands, front-rack catches)
--                    The push-up class reads as grip-free on grip_demand, so
--                    wrist and hand restrictions could not be expressed
--                    without this axis. NULL = UNKNOWN and unknown is
--                    meaningful (CAP-8): automatic surfaces treat NULL on a
--                    constrained axis as ineligible with its own honest
--                    reason; manual use never needs it. The column carries
--                    NO user data - it describes movements, not people; the
--                    Article 9 lane stays entirely in capability_constraints
--                    (migrate_145).
--
--                    Mirrors migrate_148_exercise_demands.sql exactly: same
--                    two tables, nullable additive boolean.
--
--                    Push:  src/lib/sync.js syncExercises (custom exercises
--                           only). Until this migration runs, the push batch
--                           fails soft per the migrate_143 tolerated mode -
--                           device data safe, lands on next sync after apply.
--                    Pull:  src/lib/sync.js -> insertOrUpdateExerciseFromCloud
--                           (COALESCE keeps local derivation authoritative
--                           when the payload lacks a value).
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: one ALTER TABLE ADD
--                    COLUMN on exercises + a canonical-row backfill via
--                    capability/demands.deriveDemandMetadata - the same
--                    derivation new installs seed with; coverage report in
--                    docs/capability-campaign-25-2026-08-20/
--                    CC27-DEMAND-COVERAGE.md).
--
-- Applied remotely:  NO - NOT RUN. Production requires the founder's exact
--                    phrase "run against production" (CC-F7; supabase/README
--                    ledger). Written and locally proven only.
--
-- Safe to re-run:    YES - every statement is guarded IF NOT EXISTS.
--
-- Rollback:          Column is additive and unread by any pre-gap-closure
--                    client; dropping it (or leaving it NULL) restores prior
--                    behaviour exactly. No data rewrite occurs here.

DO $$
BEGIN
  -- public.exercises -----------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'weight_bearing_hands') THEN
    ALTER TABLE public.exercises ADD COLUMN weight_bearing_hands boolean;
  END IF;

  -- public.custom_exercises ----------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'weight_bearing_hands') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN weight_bearing_hands boolean;
  END IF;
END $$;
