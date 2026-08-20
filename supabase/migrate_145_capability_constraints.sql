-- ============================================================================
-- Migration 145: capability_constraints (CC26 capability foundations)
-- ============================================================================
-- PURPOSE. The Article 9 capability lane's durable store
-- (docs/capability-campaign-25-2026-08-20/ARCHITECTURE.md section 5.1):
-- baseline capability facts and temporary-episode restrictions, typed by
-- role/source/rule, with the append-only-in-meaning lifecycle whose
-- intervals later campaigns join provenance against (CAP-14). Structurally
-- SEPARATE from exercise_intent - the preference lane stays ordinary
-- personal data only because these never share a table (CAP-4, R1 #8).
--
-- APPLIED LOCALLY: YES - the same table ships in src/lib/database.js
-- SCHEMA_MIGRATIONS in the CC26 build.
-- APPLIED REMOTELY: NOT YET. Founder-gated per CLAUDE.md: production
-- requires the exact phrase "run against production". Must land BEFORE any
-- build carrying the CC26 capability push ships.
-- ADDITIVE: YES - one new table + trigger + policies; touches nothing else
-- except delete_user_data(), which is recreated with one added DELETE.
-- SAFE TO RE-RUN: YES - IF NOT EXISTS / OR REPLACE / DROP IF NOT throughout.
-- ROLLBACK: DROP TABLE public.capability_constraints (client push then
-- fails soft and queues, as for every founder-gated table); recreate
-- delete_user_data() from migration 136's body to drop the added DELETE.
--
-- GDPR NOTE. This table IS special-category (Article 9) health-adjacent
-- data by design and is treated so end to end: granular consent gates every
-- client write (record_capability_consent, migration 147); rows are
-- exportable; consent withdrawal tombstones every row client-side and the
-- 30-day purge removes them here; account deletion hard-deletes below.
-- No diagnosis field exists and no free text is accepted (CAP-3, CC-D13).
-- ============================================================================

create table if not exists public.capability_constraints (
  id               text not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             text not null check (role in ('baseline','episode')),
  source           text not null check (source in ('self','clinician_reported')),
  rule_kind        text not null check (rule_kind in ('demand','family','exercise','exercise_allow')),
  rule_value       text not null,
  laterality       text check (laterality in ('left','right')),
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  state            text not null check (state in ('active','ended')),
  ended_at         timestamptz,
  ended_reason     text check (ended_reason in ('expired','user_ended','superseded','promoted')),
  episode_group_id text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  -- IDENTITY_AND_OWNERSHIP_LOCKED.md rule 1: composite PK.
  primary key (user_id, id)
);

create index if not exists idx_capability_constraints_user_state
  on public.capability_constraints (user_id, state);
create index if not exists idx_capability_constraints_user_group
  on public.capability_constraints (user_id, episode_group_id);

-- Refuse-stale guard (registry contract): a stale client can never
-- overwrite a newer row, so pull-side strictly-newer LWW has a monotonic
-- clock to trust. Ties keep the standing row.
create or replace function public._capability_constraints_refuse_stale()
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

drop trigger if exists capability_constraints_refuse_stale
  on public.capability_constraints;
create trigger capability_constraints_refuse_stale
  before update on public.capability_constraints
  for each row execute function public._capability_constraints_refuse_stale();

alter table public.capability_constraints enable row level security;

drop policy if exists capability_constraints_owner on public.capability_constraints;
create policy capability_constraints_owner
  on public.capability_constraints
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Account deletion reaches the lane (CAP-20). delete_user_data() is
-- recreated WHOLESALE per the standing convention (supabase/README): the
-- body below is migration 136's current body (the latest definition in
-- the repo) plus the two capability DELETEs in their own section. Both
-- new tables also carry ON DELETE CASCADE to auth.users, so auth-level
-- account deletion reaches them even before this function is reapplied.

CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Order matters when FKs are in play: wipe children before
  -- parents. Each delete is wrapped so a missing table doesn't
  -- abort the rest of the RPC.

  -- ─── Engine + safety domain (Move #2, #3) ───────────────────────────
  BEGIN DELETE FROM engine_telemetry            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM engine_overrides            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM ed_pattern_flags            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Consent + audit domain (Move #2 deferral) ──────────────────────
  BEGIN DELETE FROM consent_log                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Food domain (Move #1, #1.5) ────────────────────────────────────
  BEGIN DELETE FROM recipe_ingredients          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM recipes                     WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM saved_meals                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_favourites             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_water                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_intake_rollups        WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_entries                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_foods                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Training domain ────────────────────────────────────────────────
  BEGIN DELETE FROM workout_sets                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_notes_v2            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workouts                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routine_exercises           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routines                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycle_weeks             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycles                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM planned_muscle_volume       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM adaptation_events           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM programmes                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM peak_week_plans             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_user_notes         WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_goals              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_exercises            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM volume_landmarks            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_volumes              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM personal_records            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Check-ins + body metrics ───────────────────────────────────────
  BEGIN DELETE FROM weekly_checkins_v2          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM morning_weights             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM body_metrics                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM progress_photos             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM achievements                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Coaching outputs ───────────────────────────────────────────────
  BEGIN DELETE FROM coach_outputs               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM nutrition_targets           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_insights               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM autoregulation_suggestions  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Profile + misc ─────────────────────────────────────────────────
  BEGIN DELETE FROM user_body_profile           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_feedback               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM debug_log_uploads           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Tables added since migration 025 (HP-3) ────────────────────────
  -- account_deletions_log is intentionally excluded: it is the surviving
  -- audit trail of this very deletion and must not be wiped.
  BEGIN DELETE FROM tier_history                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM notification_preferences    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_frequents              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM device_push_tokens          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_steps                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Tables added since migration 062 (SC-2) ────────────────────────
  -- cardio_log: migration 064's header explicitly asked for this line in
  -- the next revision of this function; the Wave-3 review caught that this
  -- revision had missed it (cardio history is special-category health data).
  BEGIN DELETE FROM cardio_log                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM meal_plans                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM plan_folders                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Training partners (081/092, SC-2) ──────────────────────────────
  -- Shared pair data first, while membership still identifies the pairs:
  -- both members' signals and cheers go, honouring the 092 promise
  -- ("everything that was shared between you is deleted"). The user_id/
  -- sender_id sweeps are belt-and-braces for rows orphaned from a pair.
  BEGIN
    DELETE FROM partner_week_signals
    WHERE user_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_cheers
    WHERE sender_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  -- Block list: both directions (the user's own list AND other users'
  -- entries naming this user), matching the auth-row CASCADE.
  BEGIN DELETE FROM partner_blocks WHERE blocker_id = uid OR blocked_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- The partnership row survives as an 'ended' tombstone with this
  -- member's column NULLed (what ON DELETE SET NULL would produce), so
  -- the surviving partner sees only "Partnership ended". A pending
  -- invite's code hash is cleared so it can never be redeemed.
  BEGIN
    UPDATE partnerships
    SET member_a = NULL, status = 'ended',
        ended_at = COALESCE(ended_at, now()), invite_code_hash = NULL
    WHERE member_a = uid;
    UPDATE partnerships
    SET member_b = NULL, status = 'ended',
        ended_at = COALESCE(ended_at, now()), invite_code_hash = NULL
    WHERE member_b = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Legacy mixed-ownership exercises (user-customs only) ───────────
  -- exercises.user_id is nullable: library rows have NULL, old user
  -- customs have a uid. Custom rows moved to custom_exercises in 020
  -- but the originals stay for old-app id-by-reference. Wipe them
  -- now so the auth-row delete cascade has nothing left to chase.
  BEGIN DELETE FROM exercises                   WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Exercise intelligence (Campaign 9) ─────────────────────────────
  -- The three tables this migration creates. The Edge Function path wipes
  -- them through ON DELETE CASCADE on auth.users, but this RPC is the
  -- fallback when that function is unreachable, and it deletes
  -- table-by-table. Without these three an erasure that fell back here
  -- would leave the user's exclusions, swap history and approved defaults
  -- behind. Guarded like every sibling, so running this against a project
  -- where the tables above have not yet been created is still safe.
  BEGIN DELETE FROM exercise_slot_defaults      WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_swaps              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_intent             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Capability lane (CC26, migrations 145/146) ─────────────────────
  -- Children (effects reference constraint ids in their JSON) before the
  -- constraints themselves; both are also ON DELETE CASCADE on auth.users.
  BEGIN DELETE FROM session_constraint_effects  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM capability_constraints      WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── users_profile last (load-bearing) ──────────────────────────────
  -- Let this raise if it's missing — that means the deployment is
  -- broken and we want to know about it.
  DELETE FROM users_profile WHERE id = uid;
END;
$$;

-- Acceptance check
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'capability_constraints'
order by ordinal_position;
