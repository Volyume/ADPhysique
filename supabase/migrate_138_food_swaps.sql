-- migrate_138_food_swaps.sql
--
-- Purpose:           the cloud half of the Campaign 17A job 3 food-intent
--                    layer: one new user-scoped table so that what a user
--                    has told the app about a FOOD survives a device swap,
--                    a reinstall and a second phone.
--
--                      food_swaps   the A->B food replacement event log,
--                                   with the SCOPE that says what the user
--                                   meant by it. Append-only.
--
--                    THE DEFECT THIS CLOSES. The food domain could not tell
--                    three completely different user actions apart:
--
--                      "there's no chicken in the house tonight"
--                      "use turkey instead of chicken from now on"
--                      "never show me chicken again"
--
--                    The first two left no trace at all beyond the edited
--                    plan, so a deliberate standing preference was forgotten
--                    the moment the plan regenerated; and any attempt to
--                    learn from swaps would have read the first as if it
--                    were the second, teaching a dislike the user never
--                    expressed. The exercise domain solved exactly this in
--                    Campaign 16 (exercise_swaps.scope, migrate_137); this
--                    is its food counterpart, built scope-first rather than
--                    bolted on afterwards.
--
--                    Values for `scope`:
--                      'just_this_time'  affects the current plan occurrence
--                                        and nothing else. NEVER read as a
--                                        preference, positive or negative.
--                      'persistent'      a deliberate standing replacement.
--                                        Legitimately steers future plans.
--                    NOT NULL: unlike migrate_137, which had to tolerate
--                    pre-existing rows of unknown kind, every row in this
--                    table is written by a client that already knows the
--                    scope, so "unknown" is not a state that can occur.
--
--                    "Never suggest this" is deliberately NOT here. It
--                    already lives on the profile (mealPlanExcludeFoods,
--                    carried in user_prefs) and is intent rather than an
--                    event, exactly as exercise_intent is separate from
--                    exercise_swaps.
--
--                    Food keys are curated-food keys
--                    (src/lib/food/curatedFoods.js) - short stable
--                    identifiers like 'chicken_breast'. They are the same
--                    vocabulary the existing exclusion list already stores.
--
--                    NOT health data. A food preference records what a user
--                    wants SUGGESTED in future; it is not intake, not a
--                    diary entry and not a clinical fact. Nothing here
--                    touches food_entries or any rollup. Data minimisation:
--                    no free text, no names, no bodyweight, no measurements,
--                    no quantities. EU-Dublin residency unchanged (same
--                    project, no new region, no new egress).
--
--                    Push:  src/lib/sync.js _pushFoodSwaps
--                    Pull:  src/lib/sync.js _pullFoodSwaps ->
--                           insertOrUpdateFoodSwapFromCloud in
--                           src/lib/food/db.js
--
-- Applied locally:   YES (src/lib/database.js SCHEMA_MIGRATIONS v77).
--
-- Applied remotely:  YES. Verified LIVE 2026-08-18 by a direct
--                    information_schema check during the 142/143 batch
--                    (the food_swaps table is present in production). The
--                    exact apply date/session is not resolvable from the
--                    repository - see supabase/README.md's 2026-08-18
--                    batch note, which is the authority.
--
--                    Ship order does NOT matter. Until this runs, the table
--                    is device-local: the push finds no remote table, the
--                    slice is skipped, and a second device simply has no
--                    remembered replacements - which is exactly the
--                    behaviour before this feature existed. No user loses a
--                    plan, a meal or an exclusion either way.
--
-- Additive:          YES. One new table plus two indexes. No existing table,
--                    column, policy, grant or trigger is altered, and no
--                    existing row is rewritten.
-- Safe to re-run:    YES. `if not exists` throughout; the policy block drops
--                    and recreates its own policy by name.
-- Rollback:          drop table if exists public.food_swaps;
--                    Every reader treats an absent row as "no intent
--                    recorded", which is the pre-17A behaviour. Local rows
--                    are untouched by a cloud rollback.

-- ─── food_swaps ──────────────────────────────────────────────────────────
-- Append-only event log, the same shape and reasoning as
-- public.exercise_swaps (migrate_136): the local table's own uniqueness is
-- not mirrored, and there is deliberately NO refuse-stale-write trigger,
-- because there is no later version of an event that happened. The client
-- applies pulled rows with INSERT OR IGNORE so a re-pull can never duplicate
-- an event and inflate how often a replacement was chosen.

create table if not exists public.food_swaps (
  id            text not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  from_food_key text not null,
  to_food_key   text not null,
  scope         text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  primary key (user_id, id)
);

create index if not exists idx_food_swaps_user_updated
  on public.food_swaps(user_id, updated_at desc);
create index if not exists idx_food_swaps_user_from
  on public.food_swaps(user_id, from_food_key);

comment on column public.food_swaps.scope is
  'just_this_time | persistent. Only ''persistent'' may steer future meal plans; a one-off swap (no chicken in the house tonight) must never teach food dislike. See Campaign 17A job 3.';

-- ─── Row level security ──────────────────────────────────────────────────
-- One "users manage own rows" policy, the migrate_012 shape: FOR ALL, USING
-- and WITH CHECK both pinned to auth.uid() = user_id, so a client can
-- neither read nor write another account's rows and cannot re-key one of its
-- own rows onto another user on the way out.

alter table public.food_swaps enable row level security;

drop policy if exists "Users manage own food_swaps" on public.food_swaps;
create policy "Users manage own food_swaps" on public.food_swaps
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Grants: the authenticated role only, never anon. Matches every other
-- user-scoped table in this schema.
grant select, insert, update, delete on public.food_swaps to authenticated;
