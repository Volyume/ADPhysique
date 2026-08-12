-- migrate_136_exercise_intent.sql
--
-- Purpose:           the cloud half of the Campaign 9 exercise-intent
--                    layer. Three new user-scoped tables so that what a
--                    user has told the app about an EXERCISE survives a
--                    device swap, a reinstall and a second phone:
--
--                      exercise_intent        "don't suggest this"
--                                             (indefinite) and "avoid for
--                                             this block" (scoped to one
--                                             mesocycle id, so it expires
--                                             at the block boundary, not
--                                             on a calendar timer).
--                                             `reason` is OPTIONAL free
--                                             context the user may skip;
--                                             it is never read as a
--                                             diagnosis, by this schema or
--                                             by any client.
--                      exercise_swaps         the A->B replacement event
--                                             log with its context, so a
--                                             repeated deliberate choice
--                                             can outrank alphabetical
--                                             ordering. Append-only.
--                      exercise_slot_defaults a user-APPROVED default
--                                             replacement for a source
--                                             exercise in a plan.
--
--                    None of this is training history and none of it is
--                    health data: excluding an exercise records a
--                    preference about FUTURE suggestions. Workouts, sets,
--                    PRs and progression are untouched. Data minimisation:
--                    no free text beyond the optional `reason` the user
--                    types themselves, no names, no bodyweight, no
--                    measurements. EU-Dublin residency unchanged (this is
--                    the same project, no new region, no new egress).
--
--                    Push:  src/lib/sync.js _pushExerciseIntent /
--                           _pushExerciseSwaps / _pushExerciseSlotDefaults
--                    Pull:  src/lib/sync.js _pullExerciseIntent /
--                           _pullExerciseSwaps / _pullExerciseSlotDefaults
--                           -> insertOrUpdateExerciseIntentFromCloud /
--                              insertOrUpdateExerciseSwapFromCloud /
--                              insertOrUpdateExerciseSlotDefaultFromCloud
--                              in src/lib/database.js
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS v73, "Campaign 9,
--                    exercise intent + swap memory" -- the local SQLite
--                    tables already exist and are already being written).
--
-- Applied remotely:  NO -- founder-gated, requires the exact phrase
--                    "run against production" per supabase/README. Claude
--                    must not run this file anywhere.
--                    ORDER MATTERS (migrate_129 / migrate_131 precedent):
--                    this must run against production BEFORE a build
--                    carrying the sync push of these three tables ships,
--                    or every upsert batch is rejected on the unknown
--                    relation. Until it runs, the push helpers log a
--                    PostgREST error and carry on -- the app keeps working
--                    and the data stays safe on device, it simply does not
--                    reach the user's other phone.
--
-- Additive:          YES. Three brand-new tables plus their indexes,
--                    policies and triggers. No existing table, column,
--                    policy, function or row is altered or read.
--
-- Safe to re-run:    YES. CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
--                    EXISTS, CREATE OR REPLACE FUNCTION, DROP POLICY IF
--                    EXISTS before each CREATE POLICY, DROP TRIGGER IF
--                    EXISTS before each CREATE TRIGGER. A second run is a
--                    no-op and touches no data.
--
-- Rollback:          drop trigger if exists exercise_intent_touch_updated_at
--                      on public.exercise_intent;
--                    drop trigger if exists
--                      exercise_slot_defaults_touch_updated_at
--                      on public.exercise_slot_defaults;
--                    drop function if exists
--                      _exercise_intent_touch_updated_at();
--                    drop function if exists
--                      _exercise_slot_defaults_touch_updated_at();
--                    drop table if exists public.exercise_slot_defaults;
--                    drop table if exists public.exercise_swaps;
--                    drop table if exists public.exercise_intent;
--                    Nothing references these tables, so dropping them
--                    cannot strand anything. Every client reader treats
--                    their absence as "no intent recorded", which is the
--                    pre-Campaign-9 behaviour exactly; the local SQLite
--                    copies are unaffected and remain device truth.
--
-- GDPR note (surfaced, NOT actioned here): the account-delete Edge
--   Function removes the auth.users row and the ON DELETE CASCADE FKs
--   below wipe these three tables with it, so the primary Article 17 path
--   is complete on day one. The RPC FALLBACK delete_user_data (last made
--   complete in migrate_096) deletes table-by-table and does not know
--   about these three, so a deletion that goes down the fallback path
--   would leave their rows behind. Extending that RPC means re-creating
--   its whole body, which is outside this migration's scope -- flagged
--   for a follow-up migration rather than parked silently.

-- ─── exercise_intent ─────────────────────────────────────────────────────
-- PRIMARY KEY (user_id, id) per docs/IDENTITY_AND_OWNERSHIP_LOCKED.md and
-- migrate_018: two users cannot collide on a row at the schema level.
--
-- The local table also carries UNIQUE(user_id, exercise_id). That is
-- deliberately NOT mirrored here. SQLite is the source of truth and the
-- cloud is the backup; a cloud unique constraint would turn the harmless
-- case of two devices independently minting their own id for the same
-- exercise into a 23505 that rejects the whole 200-row upsert batch. The
-- appliers in database.js collapse duplicates by natural key on the way in
-- (newer updated_at wins), so local truth stays single-rowed either way.

create table if not exists public.exercise_intent (
  id                 text not null,
  user_id            uuid not null references auth.users(id) on delete cascade,
  exercise_id        text not null,
  kind               text not null,
  scope_mesocycle_id text,
  reason             text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  primary key (user_id, id)
);

-- Delta-pull cursor. Tombstones are INCLUDED (no partial WHERE): a
-- tombstone here is the user's "allow this exercise again" and it has to
-- reach their other devices, so the pull selects it like any other row.
create index if not exists idx_exercise_intent_user_updated
  on public.exercise_intent(user_id, updated_at desc);
create index if not exists idx_exercise_intent_user_exercise
  on public.exercise_intent(user_id, exercise_id);

-- ─── exercise_swaps ──────────────────────────────────────────────────────
-- Append-only event log. Rows are inserted, never edited, so it carries no
-- refuse-stale-write trigger: there is no later version of an event that
-- happened. The client applies it with INSERT OR IGNORE so a re-pull can
-- never duplicate an event and inflate how often a replacement was chosen.

create table if not exists public.exercise_swaps (
  id               text not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  from_exercise_id text not null,
  to_exercise_id   text not null,
  routine_id       text,
  mesocycle_id     text,
  explicit         boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  primary key (user_id, id)
);

create index if not exists idx_exercise_swaps_user_updated
  on public.exercise_swaps(user_id, updated_at desc);
create index if not exists idx_exercise_swaps_user_from
  on public.exercise_swaps(user_id, from_exercise_id);

-- ─── exercise_slot_defaults ──────────────────────────────────────────────
-- The local UNIQUE(user_id, from_exercise_id, routine_id) is not mirrored,
-- for the reason given above and one more: routine_id is nullable, and a
-- Postgres unique constraint treats NULLs as distinct, so it would not
-- constrain the plan-wide default row anyway.

create table if not exists public.exercise_slot_defaults (
  id               text not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  from_exercise_id text not null,
  routine_id       text,
  exercise_id      text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  primary key (user_id, id)
);

create index if not exists idx_exercise_slot_defaults_user_updated
  on public.exercise_slot_defaults(user_id, updated_at desc);
create index if not exists idx_exercise_slot_defaults_user_from
  on public.exercise_slot_defaults(user_id, from_exercise_id);

-- ─── Row level security ──────────────────────────────────────────────────
-- One "users manage own rows" policy per table, the migrate_012 shape:
-- FOR ALL, USING and WITH CHECK both pinned to auth.uid() = user_id, so a
-- client can neither read nor write another account's rows and cannot
-- re-key one of its own rows onto another user on the way out.

alter table public.exercise_intent        enable row level security;
alter table public.exercise_swaps         enable row level security;
alter table public.exercise_slot_defaults enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'exercise_intent', 'exercise_swaps', 'exercise_slot_defaults'
  ]
  loop
    execute format('drop policy if exists "Users manage own %s" on public.%I', t, t);
    execute format(
      'create policy "Users manage own %s" on public.%I for all '
      || 'using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end $$;

-- ─── Refuse-stale-write (last-write-wins) triggers ───────────────────────
-- The canonical body from migrate_047_body_metrics_weekly_checkins_lww.sql
-- :94-115, extended to the nine coaching-state tables by migrate_134.
--
-- Semantics, identical to the tables already guarded:
--   * NEW.updated_at < OLD.updated_at        -> RETURN OLD (stale write is
--                                               silently refused)
--   * NEW.updated_at IS NULL or unchanged    -> stamp now()
--   * otherwise                              -> accept
--
-- Safe here for the reason migrate_134 requires: both push paths ship the
-- ROW's own edit time, never now() (src/lib/sync.js _pushExerciseIntent /
-- _pushExerciseSlotDefaults), and these tables are brand new, so there is
-- no historic client that stamps push time and could have its real edits
-- refused. This is the cloud half of the same rule the appliers enforce on
-- device: the newest thing the user explicitly said about an exercise is
-- the thing that stands.
--
-- exercise_swaps is deliberately excluded (append-only, see above).

create or replace function _exercise_intent_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;

  if new.updated_at is null or new.updated_at = old.updated_at then
    new.updated_at := now();
  end if;

  return new;
end $$;

drop trigger if exists exercise_intent_touch_updated_at
  on public.exercise_intent;
create trigger exercise_intent_touch_updated_at
  before update on public.exercise_intent
  for each row execute function _exercise_intent_touch_updated_at();

create or replace function _exercise_slot_defaults_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;

  if new.updated_at is null or new.updated_at = old.updated_at then
    new.updated_at := now();
  end if;

  return new;
end $$;

drop trigger if exists exercise_slot_defaults_touch_updated_at
  on public.exercise_slot_defaults;
create trigger exercise_slot_defaults_touch_updated_at
  before update on public.exercise_slot_defaults
  for each row execute function _exercise_slot_defaults_touch_updated_at();

-- ─── Acceptance check ────────────────────────────────────────────────────
-- Prints one row per new table with its primary-key columns and its RLS
-- state. Reads cleanly in the Supabase SQL Editor output panel.

select
  c.relname::text as table_name,
  c.relrowsecurity as rls_enabled,
  string_agg(a.attname, ',' order by array_position(pk.conkey, a.attnum)) as pk_cols
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_constraint pk on pk.conrelid = c.oid and pk.contype = 'p'
join pg_attribute a on a.attrelid = c.oid and a.attnum = any(pk.conkey)
where n.nspname = 'public'
  and c.relname in ('exercise_intent', 'exercise_swaps', 'exercise_slot_defaults')
group by c.relname, c.relrowsecurity
order by table_name;
