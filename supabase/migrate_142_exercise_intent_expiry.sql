-- migrate_142_exercise_intent_expiry.sql
--
-- Purpose:           D107-2, the injury/constraint layer (docs/complaint-
--                    research-triage-2026-08-17/INJURY-CONSTRAINTS-SPEC.md).
--                    Adds ONE nullable column, `expires_at`, to the existing
--                    public.exercise_intent table (created by
--                    migrate_136_exercise_intent.sql) so the new PATTERN_AVOID
--                    intent kind's day-bound duration (7/14/30 days) survives
--                    a device swap, a reinstall and a second phone, the same
--                    as every other Campaign 9 intent fact.
--
--                    PATTERN_AVOID targets a movementFamily key (e.g.
--                    "overhead pressing") rather than one exercise id, via the
--                    existing `exercise_id` column carrying a `family:<key>`
--                    target string (src/lib/exercise/intent.js
--                    familyTargetKey) - no new target column, no parallel
--                    table. "Avoid for this block" and "indefinite" pattern
--                    avoidance reuse the pre-existing AVOIDED_BLOCK/EXCLUDED
--                    kinds against the same family target and leave this
--                    column NULL, exactly like every exercise-level row of
--                    those two kinds always has.
--
--                    Local column is `expires_at_ms` (INTEGER, epoch
--                    milliseconds, database.js SCHEMA_MIGRATIONS). This cloud
--                    column follows the project's existing convention instead
--                    (timestamptz, same as created_at/updated_at/deleted_at
--                    on this very table): src/lib/sync.js converts between
--                    the two on push/pull, the same conversion every other
--                    timestamp field on this table already does.
--
--                    Push:  src/lib/sync.js _pushExerciseIntent (sends
--                           expires_at on every row; null for every kind
--                           except PATTERN_AVOID, unchanged for all existing
--                           rows).
--                    Pull:  src/lib/sync.js exercise_intent pull ->
--                           insertOrUpdateExerciseIntentFromCloud in
--                           src/lib/database.js.
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS, the entry appended
--                    directly after "ALTER TABLE effective_maintenance_memos
--                    ADD COLUMN revalidation_context_signature TEXT" -- the
--                    local expires_at_ms column already exists and is
--                    already being written by setExerciseIntent and read by
--                    getExerciseIntents).
--
-- Applied remotely:  NO -- founder-gated. Cloud migrations are applied
--                    MANUALLY by the founder on the exact phrase "run against
--                    production" (CLAUDE.md, supabase/README.md). Until this
--                    runs, the push helper's upsert batch is rejected on the
--                    unknown column and logs a PostgREST error (same
--                    tolerated failure mode as migrate_137's `scope` column
--                    before it was applied) -- the app keeps working, no data
--                    is lost, PATTERN_AVOID constraints simply do not sync to
--                    a second device until this runs. ORDER MATTERS
--                    (migrate_129/131/136 precedent): run this BEFORE a build
--                    carrying the PATTERN_AVOID push ships, or every
--                    exercise_intent upsert batch is rejected, not just the
--                    PATTERN_AVOID rows within it.
--
-- Additive:          YES. One nullable column on an existing table. No
--                    existing column, row, policy, function, index or
--                    trigger is altered, dropped or read.
--
-- Safe to re-run:    YES. `ADD COLUMN IF NOT EXISTS`. A second run is a
--                    no-op and touches no data.
--
-- Rollback:          alter table public.exercise_intent drop column if
--                      exists expires_at;
--                    Every reader treats an absent/NULL expires_at as "no
--                    expiry", which is the pre-migration behaviour for every
--                    row of every kind except PATTERN_AVOID; a PATTERN_AVOID
--                    row would read as never-expiring rather than being
--                    dropped, so this rollback is only safe alongside
--                    rolling the app build back too (the local schema still
--                    carries expires_at_ms independently either way).
--
-- GDPR note:         No new data category. expires_at is a plain future
--                    timestamp the user chose (7/14/30 days from an action
--                    they took), not health data; the row it lives on is
--                    already covered by migrate_136's RLS policy and by
--                    delete_user_data()'s existing exercise_intent DELETE.

alter table public.exercise_intent
  add column if not exists expires_at timestamptz;

-- ─── Acceptance check ────────────────────────────────────────────────────

select
  column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'exercise_intent'
  and column_name = 'expires_at';
