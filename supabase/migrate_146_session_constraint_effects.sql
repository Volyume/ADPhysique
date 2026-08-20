-- ============================================================================
-- Migration 146: session_constraint_effects (CC26 schema foundation)
-- ============================================================================
-- PURPOSE. The per-session record of what the constraint stage changed
-- (ARCHITECTURE.md section 5.3): substituted / omitted / reduced slots with
-- the constraint ids that caused them. CC26 ships the SCHEMA only; the
-- writers arrive in CC29 (effective prescription). Role-scoped by law:
-- episode effects only, never baseline (RT2-1 revision).
--
-- APPLIED LOCALLY: YES (same CC26 SCHEMA_MIGRATIONS entry as 145's table).
-- APPLIED REMOTELY: NOT YET - founder-gated; required before any CC29
-- build ships, and harmless to apply alongside 145.
-- ADDITIVE: YES. SAFE TO RE-RUN: YES. ROLLBACK: drop table (no writers
-- exist until CC29).
-- GDPR NOTE: Article-9-derived (R1 classification row 19); erased with the
-- capability lane (consent withdrawal tombstones + purge; account deletion
-- via the same delete_user_data() addition noted in 145).
-- ============================================================================

create table if not exists public.session_constraint_effects (
  id           text not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  workout_id   text not null,
  effects_json jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (user_id, id),
  unique (user_id, workout_id)
);

create index if not exists idx_session_constraint_effects_user
  on public.session_constraint_effects (user_id);

create or replace function public._session_constraint_effects_refuse_stale()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.updated_at <= old.updated_at then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists session_constraint_effects_refuse_stale
  on public.session_constraint_effects;
create trigger session_constraint_effects_refuse_stale
  before update on public.session_constraint_effects
  for each row execute function public._session_constraint_effects_refuse_stale();

alter table public.session_constraint_effects enable row level security;

drop policy if exists session_constraint_effects_owner on public.session_constraint_effects;
create policy session_constraint_effects_owner
  on public.session_constraint_effects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Acceptance check
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'session_constraint_effects'
order by ordinal_position;
