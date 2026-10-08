/**
 * Sync-layer feature flags.
 *
 * Three flags: CIRCUIT_SYNC_COLUMNS_ENABLED (below), PLAN_FACTS_PUSH and
 * ENTRY_TYPED_PUSH (end of file). The first gates whether the three
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
 * The local column exists (SCHEMA_MIGRATIONS in database.js) and its cloud
 * counterpart, supabase/migrate_188_programmes_plan_facts.sql, is APPLIED
 * (2026-10-05 11:14:30 UTC, founder: "run against production: 188"; verified
 * read-only: jsonb, nullable, no default). The programmes upsert is ONE request with no
 * fallback (sync.js _pushProgrammes), so a build that pushed a column the
 * cloud lacks would stop programme sync for every user and block ordinary
 * sign-out (the sign-out push-first safety refuses while a push errors).
 * Omitting the column while this flag is off keeps every other programme
 * field syncing normally. The pull side already reads plan_facts defensively
 * (a missing key is NULL, and a cloud NULL never overwrites a local value).
 *
 * ON since the landing after migrate_188 was applied and verified
 * (supabase/README status block, APPLIED 2026-10-05).
 */
export const PLAN_FACTS_PUSH = true;

/**
 * ENTRY_TYPED_PUSH (D219 learner data path, lane LR2; the EL-9 pattern above):
 * gates whether workout_sets.entry_typed, the fact of whether the person typed
 * or changed a set's weight or reps (true) or kept it exactly as the screen
 * filled it in (false), goes in the workout_sets upsert.
 *
 * The local column exists (SCHEMA_MIGRATIONS in database.js) and its cloud
 * counterpart, supabase/migrate_189_workout_sets_entry_typed.sql, is APPLIED
 * (2026-10-08 10:40 UTC, under the founder's "Deploy all and run all
 * migrations remaining against production"; the founder's exact phrase
 * "run against production: 189" was the gate, CLAUDE.md Section 2). Pushing
 * the column against a cloud schema that lacks it fails the WHOLE upsert
 * chunk in Postgres, and with it the workout's sets (sync.js _upsertSets
 * throws after every chunk so the push watermark holds), which is why the
 * flag shipped OFF until the column was verified present read-only. The pull
 * side reads the field defensively (an absent key is NULL, and a cloud NULL
 * never overwrites a local value).
 *
 * Flipped to true in the landing after the apply, as the migration header
 * required (the supabase/README status block says APPLIED, the header is
 * edited to match, and the guard in
 * src/lib/__tests__/sync.entryTypedPush.test.js is re-pinned here).
 */
export const ENTRY_TYPED_PUSH = true;
