-- migrate_149_swap_cause_effective_choice.sql
--
-- Purpose:           CC29 (docs/capability-campaign-25-2026-08-20/
--                    ARCHITECTURE.md sections 5.5, 14). Two additive
--                    nullable columns:
--                      exercise_swaps.cause - 'constraint' provenance,
--                        ELIGIBILITY-DERIVED at write time (any swap whose
--                        from-exercise is capability-ineligible at swap
--                        time), never UI-path-keyed, never free text
--                        (CAP-13). NULL on every pre-CC29 row = unknown,
--                        which no reader ever counts.
--                      capability_constraints.effective_choice - the
--                        section 14 standing Apply/Decline on an EPISODE
--                        rule's session effect ('applied'|'declined';
--                        NULL = undecided). Lives on the rule row so sync,
--                        erasure and export inherit automatically (R1 #19).
--
--                    Push: src/lib/sync.js _pushExerciseSwaps and
--                    src/lib/sync/tables/capabilityConstraints.js. Until
--                    this migration runs both batches fail soft per the
--                    migrate_143 tolerated mode - device data safe, lands
--                    on the next sync after apply.
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: guarded ALTERs).
--
-- Applied remotely:  NO - NOT RUN. Production requires the founder's exact
--                    phrase "run against production" (CC-F7).
--
-- Safe to re-run:    YES - both ALTERs are guarded by IF NOT EXISTS checks.
--
-- Rollback:          Columns are additive and unread by pre-CC29 clients;
--                    dropping them (or leaving NULL) restores prior
--                    behaviour exactly.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'exercise_swaps' AND column_name = 'cause') THEN
    ALTER TABLE public.exercise_swaps ADD COLUMN cause text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'capability_constraints' AND column_name = 'effective_choice') THEN
    ALTER TABLE public.capability_constraints ADD COLUMN effective_choice text
      CHECK (effective_choice IN ('applied','declined'));
  END IF;
END $$;
