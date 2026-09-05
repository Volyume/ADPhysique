-- migrate_159_workout_set_evidence_class.sql
--
-- Purpose:           EL-7 evidence classes (docs/exercise-library-expansion-
--                    2026-09-05/05-DECISIONS.md; 06-EVIDENCE-CONSUMERS.md;
--                    07-CORPUS-FORMAT.md section 5). Adds one nullable
--                    `evidence_class` column to public.workout_sets:
--                      null                conventional (today's meaning,
--                                          unchanged)
--                      'circuit'           the set was logged inside a
--                                          circuit group (EL-9)
--                      'ballistic'         the exercise is a ballistic
--                                          movement (swing/clean/snatch/
--                                          jerk/throw/jump)
--                      'circuit_ballistic' both
--                    Stamped at WRITE time by the live screen from structure
--                    (routine_exercises.group_kind) and exercise metadata
--                    (load_character), never chosen by the user. Consumers
--                    (src/lib/algorithms.js, livePrescription.js,
--                    blockLedgerGather.js, history/detail screens) read this
--                    to exclude circuit/ballistic evidence from trend,
--                    plateau, load-progression, learned-range, block-seed
--                    and structure-memory consumers while still counting it
--                    as volume and letting it be a PR (06-EVIDENCE-CONSUMERS.md
--                    section 3). Historical rows are NEVER rewritten:
--                    every pre-migration set is NULL/conventional, which is
--                    the honest, correct classification for a row logged
--                    before circuits or ballistic tagging existed.
--
--                    Push:  src/lib/sync.js _upsertSets. The column is
--                           OMITTED from the payload entirely while
--                           CIRCUIT_SYNC_COLUMNS_ENABLED
--                           (src/lib/sync/featureFlags.js) is false, because
--                           an unknown column fails the WHOLE upsert chunk
--                           in Postgres.
--                    Pull:  src/lib/database.js insertWorkoutSetFromCloud
--                           reads it via `?? null`, so a payload missing it
--                           (pre-flip pushes, or a cloud row from before
--                           this migration ran) degrades to null -
--                           conventional - with no crash.
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: one ALTER TABLE ADD
--                    COLUMN on workout_sets, no backfill - every existing
--                    row is correctly NULL/conventional).
--
-- Applied remotely:  NO - NOT RUN. Production requires the founder's exact
--                    phrase "run against production" (CLAUDE.md Section 2;
--                    supabase/README ledger). Written and locally proven
--                    only; do not apply without that phrase in this
--                    session, given AFTER Claude has presented the audited
--                    apply list.
--
-- Safe to re-run:    YES - IF NOT EXISTS / duplicate-tolerant.
--
-- Rollback:          alter table public.workout_sets drop column if exists evidence_class;
--                    Additive and unread by any pre-EL-7 client; dropping it
--                    (or leaving it NULL) restores prior behaviour exactly.
--                    No data rewrite occurs here.
--
-- GDPR note:         No new user data category. This describes the STYLE of
--                    a logged set (how it was trained), the same class of
--                    data set_type already carries; it carries no health
--                    inference and is not read by any ED-safety mechanism.

alter table public.workout_sets
  add column if not exists evidence_class text;

do $$
begin
  begin
    alter table public.workout_sets
      add constraint workout_sets_evidence_class_check
      check (evidence_class is null or evidence_class in
        ('circuit', 'ballistic', 'circuit_ballistic'));
  exception when duplicate_object then null;
  end;
end $$;

-- ─── Acceptance check ────────────────────────────────────────────────────

select
  table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'workout_sets'
  and column_name = 'evidence_class';
