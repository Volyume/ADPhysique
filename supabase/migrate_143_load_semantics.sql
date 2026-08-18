-- migrate_143_load_semantics.sql
--
-- Purpose:           D107-2 load semantics (docs/complaint-research-triage-
--                    2026-08-17/LOAD-SEMANTICS-SPEC.md). Adds one nullable
--                    `load_semantics` column to public.exercises and
--                    public.custom_exercises: what the ENTERED weight number
--                    means for that exercise.
--                      total            the whole load moved per rep (default)
--                      per_hand         one implement per hand; entered weight
--                                       is ONE of them (dumbbells/kettlebells)
--                      assisted         the entered weight is the machine's
--                                       ASSISTANCE - less is stronger
--                      added_bodyweight the entered weight is the external
--                                       addition to a bodyweight movement
--                    Calculation changes live entirely in the app
--                    (src/lib/algorithms.js: per_hand tonnage x2, assisted
--                    excluded from tonnage and PR direction inverted);
--                    historical workout rows are NEVER rewritten - semantics
--                    apply from the exercise definition at read time.
--
--                    Mirrors migrate_091_exercise_type.sql exactly: same two
--                    tables, same nullable-with-app-side-default pattern, a
--                    CHECK pinning the four-value vocabulary.
--
--                    Push:  src/lib/sync.js syncExercises (custom exercises
--                           only; sends load_semantics on every row, 'total'
--                           for anything unclassified).
--                    Pull:  src/lib/sync.js -> insertOrUpdateExerciseFromCloud
--                           (reads load_semantics, defaults 'total' when the
--                           column is absent from the payload).
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: exercises +
--                    custom_exercises columns, plus a canonical-row backfill
--                    via seedExercises.deriveLoadSemantics - the same
--                    derivation new installs seed with).
--
-- Applied remotely:  YES - 2026-08-18, Claude-run on the founder's exact
--                    phrase "run against production" (project
--                    sujrylzzxcqxxfygptns, EU-Dublin), in the same batch as
--                    migrate_142. Verified after the apply: load_semantics
--                    present (text, nullable) on BOTH tables, and both named
--                    CHECK constraints present in pg_constraint.
--
-- Additive:          YES. One nullable column on each of two existing tables
--                    plus one CHECK per table. Nothing existing is altered,
--                    dropped or read.
--
-- Safe to re-run:    YES. ADD COLUMN IF NOT EXISTS; the CHECKs are added
--                    under fixed names inside a duplicate-tolerant DO block.
--
-- Rollback:          alter table public.exercises        drop column if exists load_semantics;
--                    alter table public.custom_exercises drop column if exists load_semantics;
--                    Every reader treats an absent/NULL value as 'total',
--                    which is the pre-migration meaning of every row.
--
-- GDPR note:         No new data category. This describes exercise equipment
--                    conventions, not the user; the ED-safety review point in
--                    the spec is app-side (assisted rows are EXCLUDED from
--                    tonnage so no bodyweight-derived number ever enters
--                    training analytics).

alter table public.exercises
  add column if not exists load_semantics text;

alter table public.custom_exercises
  add column if not exists load_semantics text;

do $$
begin
  begin
    alter table public.exercises
      add constraint exercises_load_semantics_check
      check (load_semantics is null or load_semantics in
        ('total', 'per_hand', 'assisted', 'added_bodyweight'));
  exception when duplicate_object then null;
  end;
  begin
    alter table public.custom_exercises
      add constraint custom_exercises_load_semantics_check
      check (load_semantics is null or load_semantics in
        ('total', 'per_hand', 'assisted', 'added_bodyweight'));
  exception when duplicate_object then null;
  end;
end $$;

-- ─── Acceptance check ────────────────────────────────────────────────────

select
  table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('exercises', 'custom_exercises')
  and column_name = 'load_semantics';
