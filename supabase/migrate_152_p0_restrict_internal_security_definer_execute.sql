-- migrate_152_p0_restrict_internal_security_definer_execute.sql
--
-- PURPOSE (P0-01, independent Codex adversarial audit 2026-08-26).
--   Six SECURITY DEFINER functions in public were EXECUTE-able by the
--   `authenticated` role although none of them is a client RPC. Three take a
--   user identifier and none of those three asserts ownership, so a signed-in
--   user could name another user's id. Verified read-only against production
--   before writing this file (38 SECURITY DEFINER functions: anon 0, PUBLIC 0,
--   authenticated 35, service_role 38).
--
--   This migration removes `authenticated` EXECUTE from the internal set and
--   adds two in-body ownership assertions as defence in depth, so a future
--   migration that accidentally re-grants EXECUTE still cannot produce a
--   cross-account call.
--
-- ROOT CAUSE. Postgres grants EXECUTE to PUBLIC on every new function, and
--   PUBLIC includes `authenticated`. migrate_130 then converted that implicit
--   PUBLIC grant into an explicit `authenticated` + `service_role` grant while
--   closing the anon path. migrate_130 did not widen anyone's privileges (the
--   set it re-granted is exactly the set PUBLIC already had), but it did make
--   the authenticated exposure explicit and durable rather than incidental.
--   The exposure predates it and comes from the Postgres default.
--
-- WHY EACH FUNCTION IS SAFE TO CLOSE (traced, not assumed):
--   recompute_daily_intake_rollup  invoked by trigger food_entries_to_rollup
--                                  on food_entries, never by the client.
--   _partner_first_name            invoked by create_partner_invite and
--                                  redeem_partner_invite, both SECURITY
--                                  DEFINER owned by postgres.
--   apply_founder_pro_entitlement  invoked by trigger
--                                  users_profile_founder_pro_entitlement and
--                                  by start_cascade, both SECURITY DEFINER.
--   cascade_advance_due_users      pg_cron job `cascade-advance-due-users`,
--                                  username=postgres.
--   refresh_food_frequents         pg_cron job `refresh-food-frequents`,
--                                  username=postgres.
--   finalise_partner_signals       no caller in database or app at all.
--   A call made from inside a SECURITY DEFINER function runs as its owner
--   (postgres), which owns every function here, so revoking `authenticated`
--   cannot break any of those paths. pg_cron runs as postgres for the same
--   reason. Confirmed no function below appears in any RLS policy expression
--   (only is_active_coach_of does, and it is deliberately untouched).
--
-- NOT A BLANKET GRANT. This deliberately names each function. It never uses
--   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA, which is the pattern that
--   produced this class of problem in the first place.
--
-- Applied locally:  n/a (grants are environment state; nothing local)
-- Applied remotely: YES. 2026-08-27 05:13:20 UTC, project sujrylzzxcqxxfygptns
--   (Volyume, eu-west-1), recorded as supabase_migrations version
--   20260827051320. Founder authorised with the Section 2 gate phrase.
--   Verified after applying, all read-only:
--     - the 11 functions below: authenticated=false, anon=false,
--       service_role=true; both ownership guards present in the live bodies;
--     - SECURITY DEFINER functions executable by authenticated: 35 -> 24;
--     - all 13 client RPCs (15 overloads) still executable by authenticated,
--       0 broken; is_active_coach_of untouched so RLS is unaffected;
--     - cross-account proof, in a self-aborting DO block that persisted
--       nothing: role authenticated BLOCKED 42501 at the grant; a JWT naming
--       another user BLOCKED 42501 by the body guard; the same JWT acting on
--       ITSELF passed the guard and failed only on a foreign key, which is
--       the trigger path proven still open;
--     - cron job cascade-advance-due-users ran at 05:15:00, after this
--       migration, and succeeded;
--     - unchanged: 25 users, 16 food_entries, 1 rollup, 18 tier_history,
--       last rollup write still 2026-08-26 17:57, no synthetic rows left.
--   food_frequents moved 0 -> 16 between the pre-check and the post-check.
--   Not caused by this migration: all 16 rows carry one computed_at of
--   2026-08-27 03:10:00 and the refresh-food-frequents cron succeeded at
--   03:10:00.26, two hours before this ran.
--
-- Earlier attempt history, kept because the first failure is instructive:
--     1. First attempt FAILED and rolled back atomically on
--        "42P13: cannot remove parameter defaults from existing function",
--        because the CREATE OR REPLACE for apply_founder_pro_entitlement
--        omitted the DEFAULT on _source_surface. Production was verified
--        unchanged immediately afterwards: all six functions still
--        authenticated=true, neither guard present. That defect is fixed
--        below and is the reason the DEFAULT is now spelled out.
--     2. Second attempt was BLOCKED BEFORE REACHING THE DATABASE by the
--        agent harness's permission classifier, not by Postgres. No SQL ran.
--   Both are superseded by the successful apply recorded above. Production no
--   longer carries the P0 exposure. State before the fix, for the record: 38
--   SECURITY DEFINER functions, anon 0, PUBLIC 0, authenticated 35, svc 38.
-- Safe to re-run:   yes. REVOKE of an absent privilege and GRANT of a held
--                   one are both no-ops, and both function bodies are
--                   CREATE OR REPLACE with identical signatures.
-- Rollback:         GRANT EXECUTE ON FUNCTION public.<sig> TO authenticated;
--                   for each of the six signatures in section A, and re-apply
--                   the pre-change bodies (recorded in section B's comments)
--                   for the two replaced functions.
--
-- Transaction:      no explicit BEGIN/COMMIT. Both the Supabase SQL editor and
--                   the migration runner execute a migration as one
--                   transaction, so an inner BEGIN would nest and an inner
--                   COMMIT would end the outer one early. All-or-nothing is
--                   still guaranteed by the runner.

-- ---------------------------------------------------------------------------
-- A. REVOKE. Internal / cron / trigger-only functions lose `authenticated`.
--    PUBLIC and anon are revoked defensively too: they hold nothing today,
--    but a future CREATE OR REPLACE re-establishes the PUBLIC default, and
--    this file is the one place that is expected to be re-run after such a
--    change.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.recompute_daily_intake_rollup(uuid, date)   FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._partner_first_name(uuid)                   FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_founder_pro_entitlement(uuid, text)   FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cascade_advance_due_users()                 FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_food_frequents()                    FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalise_partner_signals()                  FROM authenticated, anon, PUBLIC;

-- Trigger functions. PostgREST will not expose a function returning `trigger`,
-- so this is hygiene rather than a live hole, but an internal function should
-- not carry a client grant it has no use for.
REVOKE EXECUTE ON FUNCTION public.founder_pro_entitlement_trigger()           FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_users_profile_tier()                FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._partnership_ended_purge_block()            FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._partnership_ended_purge_intentions()       FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._partnership_ended_purge_win_cards()        FROM authenticated, anon, PUBLIC;

-- The internal set stays reachable by server-side automation. These are
-- already held; the GRANTs are explicit so the intended audience is readable
-- from this file rather than inferred from the absence of a REVOKE.
GRANT EXECUTE ON FUNCTION public.recompute_daily_intake_rollup(uuid, date)    TO service_role;
GRANT EXECUTE ON FUNCTION public._partner_first_name(uuid)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_founder_pro_entitlement(uuid, text)    TO service_role;
GRANT EXECUTE ON FUNCTION public.cascade_advance_due_users()                  TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_food_frequents()                     TO service_role;
GRANT EXECUTE ON FUNCTION public.finalise_partner_signals()                   TO service_role;

-- ---------------------------------------------------------------------------
-- B. DEFENCE IN DEPTH. Ownership assertions inside the two user-targeting
--    functions that a caller could otherwise aim at someone else.
--
--    The assertion shape is deliberately:
--        auth.uid() IS NOT NULL AND auth.uid() <> <target>
--    and NOT a bare `auth.uid() = <target>`. A bare equality would break every
--    legitimate internal path, because trigger, cron and service_role calls
--    carry no JWT and auth.uid() is NULL there. This shape rejects exactly one
--    thing: a JWT-bearing caller naming somebody else.
--
--    _partner_first_name deliberately receives NO assertion. Reading the OTHER
--    party's first name is its entire purpose inside create_partner_invite and
--    redeem_partner_invite, so an ownership check would break the feature. The
--    grant revoke in section A is its control, and it is now unreachable by a
--    client.
-- ---------------------------------------------------------------------------

-- Previous body: identical, minus the guard block. Signature, return type,
-- language, volatility, SECURITY DEFINER and search_path are unchanged.
CREATE OR REPLACE FUNCTION public.recompute_daily_intake_rollup(target_user_id uuid, target_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- P0-01. Trigger, cron and service_role callers have no JWT, so auth.uid()
  -- is NULL and they pass. A signed-in caller may only recompute its own day.
  IF auth.uid() IS NOT NULL AND auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'recompute_daily_intake_rollup: cross-account call refused'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO daily_intake_rollups (
    user_id, entry_date, kcal_total, protein_g, carbs_g, fat_g, fibre_g, entries_count, updated_at
  )
  SELECT
    target_user_id,
    target_date,
    COALESCE(SUM(kcal), 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0),
    NULLIF(COALESCE(SUM(fibre_g), 0), 0),
    COUNT(*),
    now()
  FROM food_entries
  WHERE user_id = target_user_id
    AND entry_date = target_date
    AND deleted_at IS NULL
  ON CONFLICT (user_id, entry_date) DO UPDATE
    SET kcal_total = EXCLUDED.kcal_total,
        protein_g  = EXCLUDED.protein_g,
        carbs_g    = EXCLUDED.carbs_g,
        fat_g      = EXCLUDED.fat_g,
        fibre_g    = EXCLUDED.fibre_g,
        entries_count = EXCLUDED.entries_count,
        updated_at = now();
END;
$function$;

-- Previous body: identical, minus the guard block. The founder allow-list
-- check (private.is_founder_pro_user) is retained exactly as it was; this adds
-- a second, independent barrier rather than replacing it.
--   start_cascade calls this with uid := auth.uid(), so uid = _user_id.
--   users_profile_founder_pro_entitlement fires on the row being written; a
--   client can only write its own profile row, and a service_role insert
--   carries no JWT. Both pass.
-- The DEFAULT on _source_surface is part of the live signature and MUST be
-- reproduced: CREATE OR REPLACE cannot drop a parameter default, and a first
-- attempt at this migration failed on exactly that ("42P13: cannot remove
-- parameter defaults from existing function"). It failed atomically, so
-- nothing was applied. pg_get_function_identity_arguments omits defaults;
-- pg_get_function_arguments is the one that shows them.
CREATE OR REPLACE FUNCTION public.apply_founder_pro_entitlement(_user_id uuid, _source_surface text DEFAULT 'founder_pro_entitlement'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cur record;
  history_from text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'apply_founder_pro_entitlement: _user_id is required';
  END IF;

  -- P0-01. Entitlement is never applied to a third party on a signed-in
  -- caller's say-so. NULL auth.uid() is the trigger/cron/service path.
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'apply_founder_pro_entitlement: cross-account call refused'
      USING ERRCODE = '42501';
  END IF;

  IF NOT private.is_founder_pro_user(_user_id) THEN
    RETURN jsonb_build_object('founder_pro', false);
  END IF;

  SELECT tier, trial_state
    INTO cur
    FROM users_profile
   WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'founder_pro', true,
      'profile_found', false
    );
  END IF;

  IF cur.tier = 'pro' AND cur.trial_state = 'paid_pro' THEN
    RETURN jsonb_build_object(
      'founder_pro', true,
      'already_applied', true,
      'tier', 'pro',
      'trial_state', 'paid_pro'
    );
  END IF;

  history_from := CASE cur.trial_state
    WHEN 'complete_trial_active' THEN 'complete_trial'
    WHEN 'pro_trial_active'      THEN 'pro_trial'
    WHEN 'paid_complete'         THEN 'complete'
    WHEN 'paid_pro'              THEN 'pro'
    ELSE CASE WHEN cur.tier = 'pro' THEN 'pro' ELSE 'free' END
  END;

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile
     SET tier = 'pro',
         trial_state = 'paid_pro',
         trial_started_at = NULL,
         complete_trial_ends_at = NULL,
         pro_trial_ends_at = NULL
   WHERE id = _user_id;
  PERFORM set_config('app.allow_tier_change', 'off', true);

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (_user_id, history_from, 'pro', 'admin', _source_surface);

  RETURN jsonb_build_object(
    'founder_pro', true,
    'tier', 'pro',
    'trial_state', 'paid_pro'
  );
END
$function$;

-- CREATE OR REPLACE re-establishes the default PUBLIC EXECUTE grant on both
-- functions, so the revoke must be repeated after section B.
REVOKE EXECUTE ON FUNCTION public.recompute_daily_intake_rollup(uuid, date) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_founder_pro_entitlement(uuid, text) FROM authenticated, anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.recompute_daily_intake_rollup(uuid, date) TO service_role;
GRANT  EXECUTE ON FUNCTION public.apply_founder_pro_entitlement(uuid, text) TO service_role;
