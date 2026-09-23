-- migrate_177_community_notify_recipients.sql
--
-- Purpose:           Server half of founder order 2026-09-22, item 1
--                    ("wire the pushes"). Two Community actions could not
--                    notify because the server never told the client who
--                    to notify (recorded in code by the client lane as
--                    STOP comments in src/lib/community/respect.js and
--                    above `joinGroup` in src/lib/community/groups.js):
--
--                    Part 1 re-issues `community_respect_all(text, text,
--                    text)` from migrate_170 lines 3744-3888 byte-for-byte
--                    with THREE marked changes: one new DECLARE
--                    (`v_recipients`), one new line inside the existing
--                    `IF FOUND THEN` block that appends the recipient the
--                    loop just gave a brand-new reaction to, and the
--                    RETURN, which now carries that list alongside the
--                    count. The loop already wrote one `community_activity`
--                    row per recipient; it just never told the caller who
--                    they were.
--
--                    Part 2 re-issues `community_group_join(uuid)` from
--                    migrate_165 lines 933-979 byte-for-byte with THREE
--                    marked changes: one new DECLARE (`v_admin_ids`), one
--                    new SELECT immediately after the existing PERFORM
--                    (same filter, so it is the identical admin set that
--                    PERFORM already notified in-app), and the 'requested'
--                    RETURN, which now carries that admin list. The
--                    'member' (open-group) RETURN is untouched -- design
--                    60 §3 already says no push for an ordinary open join.
--
--                    Neither function's signature, grants or search_path
--                    changed. No new tables, no DROPs. Both re-issues are
--                    guard-proved byte-for-byte (minus the marked changes)
--                    against their source files by
--                    src/__tests__/migrate177.guard.test.js.
--
-- Applied locally:   n/a (cloud-only objects; nothing in database.js)
-- Applied remotely:  NOT YET - WRITTEN 2026-09-22; waits for the founder's
--                    exact phrase "run against production" (supabase/README
--                    status block is the live record). Claude-run through
--                    the Supabase connector under the checksum protocol
--                    when it runs.
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION, REVOKE/GRANT are
--                    idempotent, and the acceptance block is read-only.
-- Rollback:          re-issue `community_respect_all(text, text, text)`
--                    from migrate_170 lines 3744-3888 (RETURN
--                    `jsonb_build_object('given', v_given)` only, no
--                    `recipients` key) and `community_group_join(uuid)`
--                    from migrate_165 lines 933-979 (the 'requested'
--                    RETURN drops back to `jsonb_build_object('state',
--                    'requested')`, no `admin_ids` key). No table changes.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (community_profiles, _community_caller,
--                    _community_require_profile, _community_is_blocked),
--                    165 (community_group_join, community_group_members
--                    and its role/state vocabulary, _community_rate_check),
--                    170 (community_respect_all, community_reactions,
--                    community_posts, _community_add_activity,
--                    _community_can_view_post).

-- ─── Part 1: community_respect_all returns its new recipients ───────────
-- migrate_170 lines 3744-3888 carried forward byte-for-byte; the marked
-- migrate_177 changes below (one DECLARE, one line inside the existing
-- `IF FOUND` block, and the RETURN) are the only difference (guard-proved).
-- RE-ANCHORED 2026-09-22 (founder order, item 1, "wire the pushes"): the
-- STOP comment in src/lib/community/respect.js recorded that this RPC gave
-- no way to notify the people it just gave Respect to, although the loop
-- below already knows exactly who they are.

CREATE OR REPLACE FUNCTION public.community_respect_all(
  _scope text, _scope_key text DEFAULT NULL, _today text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_me       public.community_profiles%ROWTYPE;
  v_today    text;
  v_gym_id   uuid;
  v_group_id uuid; -- reviewer 2026-09-10 (B)
  v_area_key text;
  v_given    int := 0;
  -- migrate_177: exactly the recipients this call gave a brand-new
  -- reaction to, so the client can notify them without a second call.
  v_recipients jsonb := '[]'::jsonb;
  v_row      record;
BEGIN
  IF _scope NOT IN ('gym', 'area', 'style', 'discipline', 'age_band', 'group', 'following') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope IN ('style', 'discipline', 'group') AND (_scope_key IS NULL OR btrim(_scope_key) = '') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope = 'discipline' AND _scope_key IS NOT NULL
     AND NOT public._community_discipline_key_ok(ARRAY[_scope_key]) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- Same fallback shape as community_dimensions_me/community_hub_summary
  -- (lead ruling 1, part A): a NULL/absent _today falls back to the
  -- UK-local day key; a SUPPLIED value is still validated.
  v_today := nullif(btrim(coalesce(_today, '')), '');
  IF v_today IS NULL THEN
    v_today := to_char(timezone('Europe/London', now()), 'YYYY-MM-DD');
  ELSIF v_today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, true);

  IF _scope = 'group' THEN
    -- reviewer 2026-09-10 (B): the cast is guarded, exactly as the gym
    -- scope's already was. A non-uuid _scope_key used to raise Postgres's
    -- own 22P02 here, which reaches the client as a raw invalid-input-
    -- syntax string instead of this file's own 'invalid_input' envelope.
    BEGIN
      v_group_id := _scope_key::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END;
    IF NOT EXISTS (
      SELECT 1 FROM public.community_group_members m
      WHERE m.group_id = v_group_id AND m.user_id = v_uid AND m.state = 'member'
    ) THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  IF _scope = 'age_band' AND v_me.tp_age_band IS NULL THEN
    RAISE EXCEPTION USING message = 'not_allowed';
  END IF;

  IF _scope = 'gym' THEN
    IF _scope_key IS NOT NULL AND btrim(_scope_key) <> '' THEN
      BEGIN
        v_gym_id := _scope_key::uuid;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END;
    ELSE
      v_gym_id := v_me.gym_id;
    END IF;
  END IF;

  IF _scope = 'area' THEN
    IF _scope_key IS NOT NULL AND btrim(_scope_key) <> '' THEN
      v_area_key := _scope_key;
    ELSE
      v_area_key := v_me.area_key;
    END IF;
  END IF;

  -- reviewer 2026-09-10 (B): the rail runs LAST, after every validation -
  -- this file's own stated convention ("a rejected post must not spend one
  -- of the day's three", community_create_post). It used to sit above the
  -- group-membership, age-band and gym-key checks, so a refused call still
  -- spent one of the ten an hour and a client looping on a not_allowed
  -- locked the caller out of the button for an hour.
  PERFORM public._community_rate_check(v_uid, 'respect_all', 10, 10, interval '1 hour');

  -- One reaction per eligible member's latest today-dated auto session
  -- post, exactly community_react's own INSERT ... ON CONFLICT DO NOTHING,
  -- looped so v_given only counts genuinely NEW reactions (idempotent per
  -- post: calling this twice the same day never double-gives or
  -- double-notifies). LIMIT 500 on the candidate scan is a defensive
  -- bound, the same shape community_find_people's 1000-row scan cap has.
  FOR v_row IN
    WITH scope_members AS (
      SELECT p.user_id
      FROM public.community_profiles p
      WHERE p.status = 'active' AND p.is_minor = false
        AND p.user_id <> v_uid
        AND p.share_sessions = true
        AND NOT public._community_is_blocked(v_uid, p.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.community_mutes mu
          WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
        AND (
             (_scope = 'gym' AND v_gym_id IS NOT NULL AND (
                p.gym_id = v_gym_id OR v_gym_id = ANY (coalesce(p.other_gym_ids, ARRAY[]::uuid[]))))
          OR (_scope = 'area' AND v_area_key IS NOT NULL AND p.area_key = v_area_key)
          OR (_scope = 'style' AND _scope_key = ANY (p.styles))
          OR (_scope = 'discipline' AND _scope_key = ANY (p.discipline_keys))
          OR (_scope = 'age_band' AND v_me.tp_age_band IS NOT NULL AND p.tp_age_band = v_me.tp_age_band)
          OR (_scope = 'group' AND EXISTS (
                SELECT 1 FROM public.community_group_members gm
                WHERE gm.group_id = v_group_id AND gm.user_id = p.user_id AND gm.state = 'member'))
          OR (_scope = 'following' AND EXISTS (
                SELECT 1 FROM public.community_follows f
                WHERE f.follower_id = v_uid AND f.followee_id = p.user_id AND f.state = 'accepted'))
        )
      LIMIT 500
    ),
    latest_post AS (
      SELECT DISTINCT ON (r.author_id) r.id, r.author_id, r.created_at
      FROM public.community_posts r
      JOIN scope_members sm ON sm.user_id = r.author_id
      WHERE r.auto = true AND r.kind = 'session' AND r.status = 'visible'
      ORDER BY r.author_id, r.created_at DESC
    )
    SELECT lp.id AS post_id, lp.author_id
    FROM latest_post lp
    WHERE to_char(timezone('Europe/London', lp.created_at), 'YYYY-MM-DD') = v_today
      AND public._community_can_view_post(v_uid, lp.id)
  LOOP
    INSERT INTO public.community_reactions (post_id, user_id)
    VALUES (v_row.post_id, v_uid) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      v_given := v_given + 1;
      v_recipients := v_recipients || jsonb_build_object('user_id', v_row.author_id, 'post_id', v_row.post_id);
      PERFORM public._community_add_activity(v_row.author_id, v_uid, 'reaction', 'post', v_row.post_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('given', v_given, 'recipients', v_recipients);
END $$;

REVOKE ALL ON FUNCTION public.community_respect_all(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_respect_all(text, text, text) TO authenticated;

-- ─── Part 2: community_group_join returns the admin list to notify ──────
-- migrate_165 lines 933-979 carried forward byte-for-byte; the marked
-- migrate_177 changes below (one DECLARE, one new SELECT after the
-- existing PERFORM, and the 'requested' RETURN) are the only difference
-- (guard-proved). The 'member' (open-group) RETURN is untouched.
-- RE-ANCHORED 2026-09-22 (founder order, item 1, "wire the pushes"): the
-- STOP comment above `joinGroup` in src/lib/community/groups.js recorded
-- that no client-callable RPC ever handed a requester the admin list the
-- comment above the PERFORM already promised ("Notified to every admin").

CREATE OR REPLACE FUNCTION public.community_group_join(_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_g   public.community_groups%ROWTYPE;
  v_existing text;
  -- migrate_177: the group's current admins, handed back only on the
  -- 'requested' branch so the client can fan the push out itself.
  v_admin_ids uuid[];
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  IF public._community_caller_is_minor(v_uid) THEN
    RAISE EXCEPTION USING message = 'minor_restricted';
  END IF;

  SELECT * INTO v_g FROM public.community_groups WHERE id = _group_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  SELECT state INTO v_existing FROM public.community_group_members
  WHERE group_id = _group_id AND user_id = v_uid;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION USING message = 'already_member';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'group_join', 30, 100, interval '1 hour');

  IF v_g.access = 'open' THEN
    INSERT INTO public.community_group_members (group_id, user_id, role, state)
    VALUES (_group_id, v_uid, 'member', 'member');
    UPDATE public.community_groups SET member_count = member_count + 1, updated_at = now()
    WHERE id = _group_id;
    -- Design 60 §3: no push for an ordinary open-group join.
    RETURN jsonb_build_object('state', 'member');
  ELSE
    INSERT INTO public.community_group_members (group_id, user_id, role, state)
    VALUES (_group_id, v_uid, 'member', 'requested');
    -- Notified to every admin as `group_request` (design 60 §3); the
    -- client fans this out to each admin the way it already does for
    -- follow requests.
    PERFORM public._community_add_activity(a.user_id, v_uid, 'group_request', 'group', _group_id)
    FROM public.community_group_members a
    WHERE a.group_id = _group_id AND a.role = 'admin' AND a.state = 'member';
    -- migrate_177: the same admin set the PERFORM above just notified,
    -- handed back so the client can call community-notify itself (its
    -- group_request branch is proved by the CALLER's own 'requested' row).
    -- Lead ruling 2026-09-23 (review F1): this hands a requester the ids
    -- of the group's current admins, which no other call gives a
    -- non-member (only the creator's id is public through the group
    -- card). The client uses them as push targets only and never shows
    -- them; they are group metadata, never health data. Accepted.
    SELECT coalesce(array_agg(a.user_id), ARRAY[]::uuid[]) INTO v_admin_ids
    FROM public.community_group_members a
    WHERE a.group_id = _group_id AND a.role = 'admin' AND a.state = 'member';
    RETURN jsonb_build_object('state', 'requested', 'admin_ids', to_jsonb(v_admin_ids));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.community_group_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_join(uuid) TO authenticated;

-- ─── Acceptance check (read-only) ────────────────────────────────────────
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: both functions present, SECURITY DEFINER, search_path
-- pinned to public, pg_temp; authenticated executing both; anon and PUBLIC
-- executing neither (unchanged from before this migration).

DO $$
BEGIN
  IF to_regprocedure('public.community_respect_all(text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_respect_all missing';
  END IF;
  IF to_regprocedure('public.community_group_join(uuid)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_group_join missing';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_respect_all(text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: authenticated cannot execute community_respect_all';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_group_join(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: authenticated cannot execute community_group_join';
  END IF;
  IF has_function_privilege('anon', 'public.community_respect_all(text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: anon can execute community_respect_all';
  END IF;
  IF has_function_privilege('anon', 'public.community_group_join(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: anon can execute community_group_join';
  END IF;
END $$;

SELECT p.proname, p.prosecdef AS security_definer, p.proconfig AS settings,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
WHERE p.proname IN ('community_respect_all', 'community_group_join')
ORDER BY p.proname;
