-- migrate_148_exercise_demands.sql
--
-- Purpose:           CC27 demand ontology (docs/capability-campaign-25-
--                    2026-08-20/ARCHITECTURE.md sections 5.4, 8). Adds the
--                    ten nullable demand columns to public.exercises and
--                    public.custom_exercises - the ONE closed vocabulary
--                    shared verbatim between exercise metadata and
--                    capability constraint rules, so eligibility resolution
--                    is set intersection and explanations are mechanical.
--                      position            standing|seated|lying|kneeling|mixed
--                      floor_access        boolean: floor down/up is part of it
--                      overhead_position   boolean: hands/load above the head
--                      grip_demand         none|supportive|bar
--                      unilateral_loadable boolean: loadable one side at a time
--                      bilateral_upper     boolean: REQUIRES both arms
--                      bilateral_lower     boolean: REQUIRES both legs
--                      axial_load          boolean: spinal compression under load
--                      impact              boolean: jumping/landing
--                      balance_demand      supported|stable|high
--                    NULL = UNKNOWN everywhere, and unknown is meaningful
--                    (CAP-8): automatic surfaces treat NULL on a constrained
--                    axis as ineligible with its own honest reason; manual
--                    use never needs any of this. These columns carry NO
--                    user data - they describe movements, not people; the
--                    Article 9 lane stays entirely in capability_constraints
--                    (migrate_145).
--
--                    Mirrors migrate_143_load_semantics.sql: same two
--                    tables, nullable additive columns, CHECKs pinning the
--                    closed vocabularies.
--
--                    Push:  src/lib/sync.js syncExercises (custom exercises
--                           only; owner-answered axes round-trip, unanswered
--                           stay NULL). Until this migration runs, the push
--                           batch fails soft per the migrate_143 tolerated
--                           mode - device data safe, lands on next sync
--                           after apply.
--                    Pull:  src/lib/sync.js -> insertOrUpdateExerciseFromCloud
--                           (COALESCE keeps local derivation authoritative
--                           when the payload lacks a value).
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: ten ALTER TABLE
--                    ADD COLUMN on exercises + a canonical-row backfill via
--                    capability/demands.deriveDemandMetadata - the same
--                    derivation new installs seed with; 551-row coverage
--                    report in docs/capability-campaign-25-2026-08-20/
--                    CC27-DEMAND-COVERAGE.md).
--
-- Applied remotely:  NO - NOT RUN. Production requires the founder's exact
--                    phrase "run against production" (CC-F7; supabase/README
--                    ledger). Written and locally proven only.
--
-- Safe to re-run:    YES - every statement is IF NOT EXISTS / guarded.
--
-- Rollback:          Columns are additive and unread by any pre-CC27 client;
--                    dropping them (or leaving them NULL) restores prior
--                    behaviour exactly. No data rewrite occurs here.

DO $$
BEGIN
  -- public.exercises -----------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'position') THEN
    ALTER TABLE public.exercises ADD COLUMN position text
      CHECK (position IN ('standing','seated','lying','kneeling','mixed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'floor_access') THEN
    ALTER TABLE public.exercises ADD COLUMN floor_access boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'overhead_position') THEN
    ALTER TABLE public.exercises ADD COLUMN overhead_position boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'grip_demand') THEN
    ALTER TABLE public.exercises ADD COLUMN grip_demand text
      CHECK (grip_demand IN ('none','supportive','bar'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'unilateral_loadable') THEN
    ALTER TABLE public.exercises ADD COLUMN unilateral_loadable boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'bilateral_upper') THEN
    ALTER TABLE public.exercises ADD COLUMN bilateral_upper boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'bilateral_lower') THEN
    ALTER TABLE public.exercises ADD COLUMN bilateral_lower boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'axial_load') THEN
    ALTER TABLE public.exercises ADD COLUMN axial_load boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'impact') THEN
    ALTER TABLE public.exercises ADD COLUMN impact boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'balance_demand') THEN
    ALTER TABLE public.exercises ADD COLUMN balance_demand text
      CHECK (balance_demand IN ('supported','stable','high'));
  END IF;

  -- public.custom_exercises ----------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'position') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN position text
      CHECK (position IN ('standing','seated','lying','kneeling','mixed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'floor_access') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN floor_access boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'overhead_position') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN overhead_position boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'grip_demand') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN grip_demand text
      CHECK (grip_demand IN ('none','supportive','bar'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'unilateral_loadable') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN unilateral_loadable boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'bilateral_upper') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN bilateral_upper boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'bilateral_lower') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN bilateral_lower boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'axial_load') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN axial_load boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'impact') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN impact boolean;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'custom_exercises' AND column_name = 'balance_demand') THEN
    ALTER TABLE public.custom_exercises ADD COLUMN balance_demand text
      CHECK (balance_demand IN ('supported','stable','high'));
  END IF;
END $$;
