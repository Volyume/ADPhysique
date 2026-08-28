-- migrate_152_capability_adaptation_mode.sql
--
-- Purpose:           CC33 D112 R8 (ARCHITECTURE section 25; audit finding
--                    T2-26; register D112). One additive nullable column:
--                      capability_constraints.adaptation_mode - the
--                        per-episode "just hold my plan" choice
--                        ('hold' | 'propose'; NULL = propose, the
--                        standing default). 'hold' pauses the app's OWN
--                        adaptation for the episode - serve-time
--                        substitution, effective-diff proposals, coach
--                        volume holds and adherence excusal - while
--                        user-initiated suggestion surfaces (pickers,
--                        generation) keep honouring the rules. Lives on
--                        the rule rows so sync, erasure and export
--                        inherit automatically, exactly like
--                        effective_choice (migrate_149).
--
--                    Push: src/lib/sync/tables/capabilityConstraints.js
--                    includes the field only when some pushed row carries
--                    it (PostgREST needs uniform batch keys), so a user
--                    who never uses hold pushes the pre-152 shape and
--                    stays green before this runs; a hold user's push
--                    fails soft (queued retry, local durability) until
--                    apply - the 145/149 pre-apply posture.
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: guarded ALTER
--                    with the same CHECK).
--
-- Applied remotely:  NO - NOT RUN. Production requires the founder's exact
--                    phrase "run against production" (CC-F7).
--
-- Safe to re-run:    YES - the ALTER is guarded by an IF NOT EXISTS check.
--
-- Rollback:          Column is additive and unread by pre-CC33 clients;
--                    dropping it (or leaving NULL) restores prior
--                    behaviour exactly - NULL already means propose.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'capability_constraints' AND column_name = 'adaptation_mode') THEN
    ALTER TABLE public.capability_constraints
      ADD COLUMN adaptation_mode text CHECK (adaptation_mode IN ('propose', 'hold'));
  END IF;
END $$;
