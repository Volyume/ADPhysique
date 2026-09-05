/**
 * Sync-layer feature flags.
 *
 * One flag today: CIRCUIT_SYNC_COLUMNS_ENABLED, gating whether the three
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
 * normally; flipping it on is a deliberate two-step alongside the founder
 * running "run against production" on both migrations.
 *
 * Flip this to true ONLY after the founder has run both migrations against
 * production and their presence has been verified (supabase/README status
 * block updated to APPLIED).
 */
export const CIRCUIT_SYNC_COLUMNS_ENABLED = false;
