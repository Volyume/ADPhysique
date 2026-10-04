/**
 * Sync-layer feature flags.
 *
 * Two flags: CIRCUIT_SYNC_COLUMNS_ENABLED (below) and PLAN_FACTS_PUSH (end of
 * file). The first gates whether the three
 * EL-9/EL-7 circuit columns (routine_exercises.group_kind,
 * routine_exercises.round_rest_seconds, workout_sets.evidence_class -
 * docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md) are included
 * in the cloud push payload.
 *
 * These columns exist locally (SCHEMA_MIGRATIONS in database.js) but their
 * cloud counterparts (supabase/migrate_158_routine_exercise_groups.sql,
 * supabase/migrate_159_workout_set_evidence_class.sql) are WRITTEN, NOT
 * APPLIED - CLAUDE.md Section 2 forbids Claude ever applying a cloud
 * migration. Pushing the columns against a cloud schema that doesn't have
 * them yet would fail the WHOLE upsert batch for every row in the chunk
 * (Postgres rejects an unknown column for the entire payload), exactly the
 * tolerated failure mode migrate_137's header already describes. Omitting
 * the columns while this flag is off keeps every OTHER field syncing
 * normally; flipping it on was the deliberate two-step alongside the founder
 * running "run against production" on both migrations.
 *
 * Flip this to true ONLY after the founder has run both migrations against
 * production and their presence has been verified (supabase/README status
 * block updated to APPLIED).
 */
export const CIRCUIT_SYNC_COLUMNS_ENABLED = true;

/**
 * PLAN_FACTS_PUSH (D219, lane S1; the EL-9 pattern above): gates whether
 * programmes.plan_facts, the facts a plan built by the new planner carries
 * (docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md section 9),
 * goes in the programmes upsert.
 *
 * The local column exists (SCHEMA_MIGRATIONS in database.js) but its cloud
 * counterpart, supabase/migrate_188_programmes_plan_facts.sql, is WRITTEN,
 * NOT APPLIED: only the founder's exact phrase "run against production"
 * applies a cloud migration. The programmes upsert is ONE request with no
 * fallback (sync.js _pushProgrammes), so a build that pushed a column the
 * cloud lacks would stop programme sync for every user and block ordinary
 * sign-out (the sign-out push-first safety refuses while a push errors).
 * Omitting the column while this flag is off keeps every other programme
 * field syncing normally. The pull side already reads plan_facts defensively
 * (a missing key is NULL, and a cloud NULL never overwrites a local value).
 *
 * Ships OFF. Flip this to true ONLY in the landing after the founder has run
 * migrate_188 against production and its presence has been verified
 * (supabase/README status block updated to APPLIED).
 */
export const PLAN_FACTS_PUSH = false;
