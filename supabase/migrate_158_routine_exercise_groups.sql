-- migrate_158_routine_exercise_groups.sql
--
-- Purpose:           EL-9 circuit model (docs/exercise-library-expansion-
--                    2026-09-05/05-DECISIONS.md; 07-CORPUS-FORMAT.md
--                    section 5). Adds two nullable columns to
--                    public.routine_exercises:
--                      group_kind           text, null = superset (today's
--                                            behaviour, unchanged) |
--                                            'circuit'. The live workout's
--                                            existing group-advance cycle
--                                            (A -> B -> C -> A) runs circuit
--                                            semantics for a 'circuit' group
--                                            instead of superset semantics:
--                                            no rest between stations, round
--                                            rest only after the last one.
--                      round_rest_seconds   integer, the circuit's
--                                            between-round rest, stored on
--                                            every member so any station can
--                                            read it off when it finishes
--                                            the round.
--                    NULL on every existing row and every non-circuit group
--                    (ordinary exercises, ordinary supersets): identical
--                    behaviour to today.
--
--                    Push:  src/lib/sync.js _pushRoutinesAndExercises. The
--                           two columns are OMITTED from the payload
--                           entirely while CIRCUIT_SYNC_COLUMNS_ENABLED
--                           (src/lib/sync/featureFlags.js) is false, because
--                           an unknown column fails the WHOLE upsert chunk
--                           in Postgres, not just this field - unlike
--                           selection_reason (migrate_139), which tolerates
--                           a per-column retry-without-strip. Flipping the
--                           flag on is a deliberate step alongside applying
--                           this migration.
--                    Pull:  src/lib/database.js insertRoutineExerciseFromCloud
--                           reads both via `?? null`, so a payload missing
--                           them (pre-flip pushes, or a cloud row from
--                           before this migration ran) degrades to null -
--                           the pre-migration meaning - with no crash.
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: two ALTER TABLE ADD
--                    COLUMN statements on routine_exercises, no backfill -
--                    every existing row is correctly NULL/superset).
--
-- Applied remotely:  YES - 2026-09-05, Claude-run on the founder's exact
--                    phrase, via the Supabase MCP apply_migration path;
--                    columns, CHECK constraint and ledger row verified
--                    read-only afterwards (supabase/README, 2026-09-05
--                    batch).
-- Safe to re-run:    YES - both statements are IF NOT EXISTS / duplicate-
--                    tolerant.
--
-- Rollback:          alter table public.routine_exercises drop column if exists group_kind;
--                    alter table public.routine_exercises drop column if exists round_rest_seconds;
--                    Columns are additive and unread by any pre-EL-9 client;
--                    dropping them (or leaving them NULL) restores prior
--                    behaviour exactly. No data rewrite occurs here.
--
-- GDPR note:         No new user data category. These columns describe plan
--                    STRUCTURE (which exercises are grouped, and how long
--                    the group rests) - the same class of data rest_seconds
--                    and superset_group_id (migrate_010) already carry.

alter table public.routine_exercises
  add column if not exists group_kind text;

alter table public.routine_exercises
  add column if not exists round_rest_seconds integer;

do $$
begin
  begin
    alter table public.routine_exercises
      add constraint routine_exercises_group_kind_check
      check (group_kind is null or group_kind in ('superset', 'circuit'));
  exception when duplicate_object then null;
  end;
end $$;

-- ─── Acceptance check ────────────────────────────────────────────────────

select
  table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'routine_exercises'
  and column_name in ('group_kind', 'round_rest_seconds')
order by column_name;
