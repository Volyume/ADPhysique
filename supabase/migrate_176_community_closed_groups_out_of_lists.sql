-- migrate_176_community_closed_groups_out_of_lists.sql
--
-- Purpose:           A closed group leaves the lists it was in (Community
--                    early days, 26-EARLY-DAYS-SPEC.md, CR-16 / D162; found
--                    by the two-account production proof of 2026-09-13).
--                    `community_group_close` sets `status = 'closed'`, but
--                    `community_hub_summary` (the Hub's GROUPS section) and
--                    `community_group_list_mine` (the "My groups" audience,
--                    the Join screen's groups check) select the caller's
--                    memberships with no status test, so a closed group sat
--                    in every member's Hub for ever and could still be picked
--                    as an audience. Observed on production: the admin's Hub
--                    listed "Volt Gym crew" after closing it.
--
--                    Part 1 re-issues `community_hub_summary(text)` from
--                    migrate_170 lines 1550-1705 byte-for-byte with ONE
--                    marked change: the membership join keeps only
--                    `g.status = 'active'`.
--
--                    Part 2 re-issues `community_group_list_mine()` from
--                    migrate_165 lines 1212-1233 byte-for-byte with the same
--                    one marked change.
--
--                    Part 3 re-issues `community_group_accept_invite(uuid,
--                    uuid)` from migrate_165 lines 1146-1208 byte-for-byte
--                    with ONE marked change: the group row is re-read after
--                    the member count is incremented, so the card returned to
--                    the client carries the count after the join (it carried
--                    the count before it; the client reloads the page anyway,
--                    so nothing rendered wrong, but the payload was stale).
--
--                    Every re-issue is guard-proved:
--                    src/__tests__/migrate176.rpcOnly.guard.test.js reverts
--                    the marked lines and compares with the source files.
--
-- Applied locally:   n/a (cloud-only objects; nothing in database.js)
-- Applied remotely:  NOT YET - WRITTEN 2026-09-13; waits for the founder's
--                    exact phrase "run against production" (supabase/README
--                    status block is the live record). Claude-run through
--                    the Supabase connector under the checksum protocol when
--                    it runs.
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION, REVOKE/GRANT are
--                    idempotent, and the acceptance block is read-only.
-- Rollback:          re-issue `community_hub_summary(text)` from migrate_170
--                    lines 1550-1705, and `community_group_list_mine()` and
--                    `community_group_accept_invite(uuid, uuid)` from
--                    migrate_165 lines 1212-1233 and 1146-1208 (the versions
--                    without the status test and the re-read). No table
--                    changes.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (community_profiles, the helpers), 165 (groups: the
--                    two functions re-issued in parts 2 and 3,
--                    _community_group_card), 170 (the function re-issued in
--                    part 1, _community_cohort_stats, _community_is_blocked).

-- ─── Part 1: the Hub summary lists active groups only ────────────────────────
-- migrate_170 lines 1550-1705 carried forward byte-for-byte; the marked
-- migrate_176 change is the ONLY difference (guard-proved).

CREATE OR REPLACE FUNCTION public.community_hub_summary(_today text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_me      public.community_profiles%ROWTYPE;
  v_cohorts jsonb := '[]'::jsonb;
  v_groups  jsonb := '[]'::jsonb;
  v_style   text;
  v_disc    text;
  v_stats   jsonb;
  v_today   text;     -- reviewer 2026-09-10
BEGIN
  -- reviewer 2026-09-10 (lead ruling 1): backwards compatibility is
  -- mandatory. Live builds on Google Play call this with no `_today` at
  -- all, so a NULL or absent value falls back to the UK-local day key
  -- rather than refusing - `to_char(timezone('Europe/London', now()),
  -- 'YYYY-MM-DD')` produces the exact zero-padded YYYY-MM-DD string
  -- src/lib/dayKey.js's localDayKey() builds, so an old client and a new
  -- one compare equal against c_last_trained_day. A value that IS supplied
  -- must still be well-formed: the caller's own local day is the only
  -- correct answer whenever the client can give it, and this fallback is
  -- never `now()::date` (server UTC), which would put a late-evening UK
  -- session on the wrong day for half the year.
  v_today := nullif(btrim(coalesce(_today, '')), '');
  IF v_today IS NULL THEN
    v_today := to_char(timezone('Europe/London', now()), 'YYYY-MM-DD');
  ELSIF v_today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'hub_summary', 120, 120, interval '1 hour');

  IF v_me.gym_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'gym', v_me.gym_key, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'gym', 'key', v_me.gym_key, 'label', v_me.gym_label,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  IF v_me.area_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'area', v_me.area_key, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'area', 'key', v_me.area_key, 'label', v_me.area_label,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  FOREACH v_style IN ARRAY v_me.styles LOOP
    v_stats := public._community_cohort_stats(v_uid, 'style', v_style, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'style', 'key', v_style, 'label', public._community_style_label(v_style),
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  FOREACH v_disc IN ARRAY v_me.discipline_keys LOOP
    v_stats := public._community_cohort_stats(v_uid, 'discipline', v_disc, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'discipline', 'key', v_disc, 'label', public._community_discipline_label(v_disc),
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  IF v_me.tp_age_band IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'age_band', v_me.tp_age_band, v_today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'age_band', 'key', v_me.tp_age_band, 'label', v_me.tp_age_band,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  -- reviewer 2026-09-10: three fixes to this block.
  --  1. member_count was `g.member_count`, the stored counter on
  --     community_groups, which counts EVERY member row - minors, suspended
  --     and restricted profiles included - while the two figures beside it
  --     exclude exactly those. A hub object could therefore report more
  --     members than the roster it samples, and a minor could be counted.
  --     It is now computed on the same predicate as its siblings, so
  --     trained_today_count <= member_count always holds and no minor is
  --     ever in a count (blueprint section 8, "minors never in cohorts,
  --     boards, groups or age bands").
  --  2. neither figure excluded blocked pairs, so a blocked person's face
  --     could appear in the caller's own Hub sample. Every other new query
  --     path in this migration calls _community_is_blocked; these now do.
  --  3. share_consistency stated outright on the trained-today tests, for
  --     the same reason as _community_cohort_stats above.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'access', g.access,
      'member_count', (
        SELECT count(*)
        FROM public.community_group_members gm1
        JOIN public.community_profiles p1 ON p1.user_id = gm1.user_id
        WHERE gm1.group_id = g.id AND gm1.state = 'member'
          AND p1.status = 'active' AND p1.is_minor = false
          AND NOT public._community_is_blocked(v_uid, p1.user_id)
      ),
      'trained_today_count', (
        SELECT count(*)
        FROM public.community_group_members gm2
        JOIN public.community_profiles p2 ON p2.user_id = gm2.user_id
        WHERE gm2.group_id = g.id AND gm2.state = 'member'
          AND p2.status = 'active' AND p2.is_minor = false
          AND NOT public._community_is_blocked(v_uid, p2.user_id)
          AND p2.share_consistency = true
          AND p2.c_last_trained_day IS NOT NULL AND p2.c_last_trained_day = v_today
      ),
      'sample', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'user_id', s.user_id, 'handle', s.handle,
                 'display_name', s.display_name, 'avatar_preset', s.avatar_preset
               ) ORDER BY s.trained_today DESC, s.user_id), '[]'::jsonb)
        FROM (
          SELECT p3.user_id, p3.handle, p3.display_name, p3.avatar_preset,
            (p3.share_consistency = true
             AND p3.c_last_trained_day IS NOT NULL AND p3.c_last_trained_day = v_today) AS trained_today
          FROM public.community_group_members gm3
          JOIN public.community_profiles p3 ON p3.user_id = gm3.user_id
          WHERE gm3.group_id = g.id AND gm3.state = 'member'
            AND p3.status = 'active' AND p3.is_minor = false
            AND NOT public._community_is_blocked(v_uid, p3.user_id)
          ORDER BY trained_today DESC, p3.user_id
          LIMIT 3
        ) s
      )
    ) ORDER BY g.name, g.id), '[]'::jsonb)
  INTO v_groups
  FROM public.community_group_members m
  JOIN public.community_groups g ON g.id = m.group_id
  WHERE m.user_id = v_uid AND m.state = 'member'
    AND g.status = 'active'; -- migrate_176: a closed group leaves the Hub

  RETURN jsonb_build_object('cohorts', v_cohorts, 'groups', coalesce(v_groups, '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.community_hub_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_hub_summary(text) TO authenticated;

-- ─── Part 2: "My groups" lists active groups only ────────────────────────────
-- migrate_165 lines 1212-1233 carried forward byte-for-byte; the marked
-- migrate_176 change is the ONLY difference (guard-proved).

CREATE OR REPLACE FUNCTION public.community_group_list_mine()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_out jsonb;
BEGIN
  PERFORM public._community_require_profile(v_uid, false);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'group', public._community_group_card(g), 'role', m.role, 'state', m.state)
         ORDER BY m.joined_at DESC), '[]'::jsonb)
  INTO v_out
  FROM public.community_group_members m
  JOIN public.community_groups g ON g.id = m.group_id
  WHERE m.user_id = v_uid AND m.state IN ('member', 'requested', 'invited')
    AND g.status = 'active'; -- migrate_176: a closed group leaves "My groups"

  RETURN jsonb_build_object('groups', v_out);
END $$;

REVOKE ALL ON FUNCTION public.community_group_list_mine() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_list_mine() TO authenticated;

-- ─── Part 3: the accepted invite returns the count after the join ────────────
-- migrate_165 lines 1146-1208 carried forward byte-for-byte; the marked
-- migrate_176 change is the ONLY difference (guard-proved).

CREATE OR REPLACE FUNCTION public.community_group_accept_invite(_token uuid DEFAULT NULL, _group_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := public._community_caller();
  v_inv public.community_group_invites%ROWTYPE;
  v_g   public.community_groups%ROWTYPE;
  v_gid uuid;
  v_existing text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  IF public._community_caller_is_minor(v_uid) THEN
    RAISE EXCEPTION USING message = 'minor_restricted';
  END IF;
  IF _token IS NULL AND _group_id IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.community_group_invites WHERE token = _token;
    IF NOT FOUND OR v_inv.expires_at < now() THEN
      RAISE EXCEPTION USING message = 'not_found';
    END IF;
    v_gid := v_inv.group_id;
  ELSE
    v_gid := _group_id;
    SELECT state INTO v_existing FROM public.community_group_members
    WHERE group_id = v_gid AND user_id = v_uid;
    IF v_existing IS DISTINCT FROM 'invited' THEN
      RAISE EXCEPTION USING message = 'not_found';
    END IF;
  END IF;

  SELECT * INTO v_g FROM public.community_groups WHERE id = v_gid;
  IF NOT FOUND THEN RAISE EXCEPTION USING message = 'not_found'; END IF;
  IF v_g.status <> 'active' THEN RAISE EXCEPTION USING message = 'group_closed'; END IF;

  IF _token IS NOT NULL THEN
    SELECT state INTO v_existing FROM public.community_group_members
    WHERE group_id = v_gid AND user_id = v_uid;
    IF v_existing = 'member' THEN RAISE EXCEPTION USING message = 'already_member'; END IF;
  END IF;

  IF v_existing = 'invited' THEN
    UPDATE public.community_group_members SET state = 'member', joined_at = now()
    WHERE group_id = v_gid AND user_id = v_uid;
  ELSE
    -- A link accepted by someone with no pending invite row: an open group
    -- admits directly, an invite-only group is still admitted by the link
    -- (the link IS the invitation) unless already a member/requested.
    IF v_existing IS NOT NULL THEN RAISE EXCEPTION USING message = 'already_member'; END IF;
    INSERT INTO public.community_group_members (group_id, user_id, role, state)
    VALUES (v_gid, v_uid, 'member', 'member');
  END IF;

  UPDATE public.community_groups SET member_count = member_count + 1, updated_at = now()
  WHERE id = v_gid;

  SELECT * INTO v_g FROM public.community_groups WHERE id = v_gid; -- migrate_176: the count after the join
  RETURN public._community_group_card(v_g);
END $$;

REVOKE ALL ON FUNCTION public.community_group_accept_invite(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_accept_invite(uuid, uuid) TO authenticated;

-- ─── Acceptance check (read-only) ──────────────────────────────────────────
DO $$
DECLARE
  v_def text;
BEGIN
  IF to_regprocedure('public.community_hub_summary(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary(text) missing';
  END IF;
  IF to_regprocedure('public.community_group_list_mine()') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_group_list_mine() missing';
  END IF;
  IF to_regprocedure('public.community_group_accept_invite(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_group_accept_invite(uuid, uuid) missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('community_hub_summary', 'community_group_list_mine', 'community_group_accept_invite')
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_176 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  -- The live bodies carry the status test (strpos, not LIKE: an underscore
  -- is a LIKE wildcard) and the re-read; every lookup is guarded against a
  -- NULL definition by the to_regprocedure checks above.
  v_def := pg_get_functiondef(to_regprocedure('public.community_hub_summary(text)'));
  IF strpos(v_def, 'AND g.status = ''active''; -- migrate_176') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary does not keep active groups only';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_group_list_mine()'));
  IF strpos(v_def, 'AND g.status = ''active''; -- migrate_176') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_group_list_mine does not keep active groups only';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.community_group_accept_invite(uuid, uuid)'));
  IF strpos(v_def, 'SELECT * INTO v_g FROM public.community_groups WHERE id = v_gid; -- migrate_176') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_group_accept_invite does not re-read the group after the join';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.community_hub_summary(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.community_group_list_mine()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.community_group_accept_invite(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_176 function is not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.community_hub_summary(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_group_list_mine()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_group_accept_invite(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_176 function is executable by anon';
  END IF;

  RAISE NOTICE 'migrate_176 acceptance: OK';
END $$;
