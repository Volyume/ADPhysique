-- migrate_190_community_feed_scopes.sql
--
-- Tables and columns changing: NONE. One function is replaced
-- (public.community_feed) and one helper is added
-- (public._community_cursor_parts3). Additive in effect: the two-argument
-- call community_feed(_cursor, _limit) keeps working and answers exactly
-- what it answered before (scope 'following', sort 'newest'). Environment:
-- the EU-Dublin production project (and any staging copy), applied by hand
-- only.
--
-- Purpose:           register D221, docs/audit/community-level-up-2026-10-08/
--                    12-BUILD-SPEC.md section 2.2 (lane 1B): the Community
--                    Feed gains four scopes and two sorts.
--                    Scopes (the `_scope` argument, default 'following'):
--                      following  today's body (migrate_170 part B8, line
--                                 3356): the caller's own posts and posts
--                                 by authors the caller follows (accepted).
--                      gym        authors who train at the caller's gym:
--                                 author.gym_id = caller.gym_id, or the
--                                 caller's gym_id is in the author's
--                                 other_gym_ids (uuid[], migrate_162 line
--                                 449), AND the author's show_gym is on
--                                 (migrate_164 Part 1, written by
--                                 community_set_show_gym), AND the author is
--                                 not a minor (gym EXCLUDES minors: a shared
--                                 gym is not a relationship, D212; is_minor = false). The
--                                 caller's own posts are included. place_key
--                                 is an outward code or town (migrate_163
--                                 CHECK), never a gym, so it is NOT used.
--                                 An author the caller does not
--                                 follow is shown only the posts the
--                                 current visibility rules allow: public,
--                                 followers-only if the caller has an
--                                 accepted follow, groups-only if the
--                                 caller shares one of the post's groups.
--                                 An author other than the caller must also be
--                                 status 'active' and either have a public
--                                 profile or be followed (accepted): a
--                                 private profile chose that nobody reads
--                                 it without an accepted follow, and
--                                 sharing a gym or group must not undo
--                                 that (data minimisation).
--                                 A caller with a NULL gym_id sees only
--                                 their own posts.
--                      groups     authors who share at least one group with
--                                 the caller (both community_group_members
--                                 rows state = 'member'), the caller's own
--                                 posts included, same visibility rules
--                                 and the same author-profile condition as
--                                 gym. groups does NOT exclude minors: a
--                                 co-member of the caller's group is shown
--                                 as group pages already show members.
--                      everyone   the body of community_discover_posts
--                                 (migrate_160 line 2687, never re-issued
--                                 since; migrate_178 confirms): public
--                                 posts by active, public, non-minor
--                                 authors. Like that function it needs no
--                                 Community profile to read.
--                    Sorts (the `_sort` argument, default 'newest'):
--                      newest     (created_at, id) DESC with the existing
--                                 two-part cursor, unchanged.
--                      respected  posts from the last 14 days ordered
--                                 (reaction_count DESC, created_at DESC,
--                                 id DESC), with a three-part cursor
--                                 'reaction_count|created_at|id' decoded by
--                                 the new _community_cursor_parts3 and
--                                 returned in that shape.
--                    An unknown scope or sort raises invalid_input, as the
--                    other community functions do.
--
--                    What is NOT changed (spec 2.2): every scope keeps the
--                    status = 'visible' filter, the mute, block and
--                    suspended-author filters exactly as migrate_170's
--                    community_feed states them (and the discover body's
--                    own, for 'everyone'), through the same helpers
--                    (_community_is_blocked, _community_post_json,
--                    _community_profile_card, _community_require_profile).
--                    READ-SIDE WITHHOLDS: migrate_180 and migrate_182 gate
--                    consistency sharing and the ED/calm mirror, not the
--                    reading of posts; neither touches community_feed or
--                    community_discover_posts, so there is no ED or calm
--                    read-side withhold on post lists today and none is
--                    added or removed here. The rate rail: community_feed
--                    has no _community_rate_check today and none is added.
--
-- Overload note:     in PostgreSQL a CREATE OR REPLACE with a different
--                    argument list creates an OVERLOAD beside the old
--                    function, and PostgREST would then meet two candidates
--                    for a two-argument rpc call. The precedent (migrate_163
--                    line 686 gyms_search, migrate_164 line 291,
--                    migrate_170 line 245 community_dimensions_me and
--                    community_find_people) is a DO block that introspects
--                    pg_proc and drops whatever signature(s) of the name
--                    are installed, then CREATE OR REPLACE the new one.
--                    The same is done here for community_feed. The new
--                    four-argument function defaults _scope and _sort, so a
--                    two-argument call resolves to it uniquely.
--
-- Applied locally:   N/A (Community adds no local SQLite table; the client
--                    is src/lib/community/feed.js).
-- Applied remotely:  NO (UNAPPLIED). STATUS: UNAPPLIED, written 2026-10-08
--                    by lane 1B. Apply only on the founder's exact phrase
--                    "run against production: 190" (CLAUDE.md section 2,
--                    "Database schema"); the app never runs it and the
--                    deploy workflow is manual-dispatch only. The route is
--                    the Claude session's Supabase connector under the
--                    checksum protocol (docs/rules/supabase.md, "Cloud
--                    route"). The client tolerates the file not being
--                    applied: on a signature error it retries without
--                    _scope/_sort and reports fallback 'scope' or 'sort'.
--                    After the apply: the acceptance block at the foot, this
--                    header edited to the applied state, the README ledger
--                    row and the CLAUDE.md "applied through" line updated.
-- Additive and idempotent: yes. Safe to re-run: yes (the DO block drops the
--                    installed community_feed signature(s) and the
--                    CREATE OR REPLACE statements recreate the identical
--                    function; the helper is CREATE OR REPLACE; REVOKE and
--                    GRANT are restated after the recreate, as every
--                    earlier re-issue does). No table, column, row or
--                    policy is created, altered or deleted.
-- Rollback:          DROP FUNCTION IF EXISTS public.community_feed(text, int, text, text);
--                    DROP FUNCTION IF EXISTS public._community_cursor_parts3(text);
--                    then re-run the migrate_170 community_feed block
--                    verbatim (supabase/migrate_170_community_connection.sql,
--                    "B8: community_feed re-issued", from
--                    `CREATE OR REPLACE FUNCTION public.community_feed(_cursor
--                    text DEFAULT NULL, _limit int DEFAULT 20)` at line 3356
--                    through its `GRANT EXECUTE ON FUNCTION
--                    public.community_feed(text, int) TO authenticated;` at
--                    line 3428). Nothing else reads the new helper.
-- GDPR note:         no new data is stored or collected. The function reads
--                    posts and profile cards the caller could already read
--                    through community_feed and community_discover_posts;
--                    'gym' and 'groups' only select among authors by a
--                    place or group the caller shares, and never return a
--                    post the existing visibility rules withhold. No name,
--                    bodyweight, measurement, private note or food figure
--                    enters any payload. EU-Dublin residency unchanged.

-- ─── Helper: the three-part cursor 'reaction_count|created_at|id' ───────
--
-- Same contract as _community_cursor_parts: an absent or empty cursor
-- returns no rows (the caller's variables stay NULL: start at the top); a
-- malformed one is invalid_input.

CREATE OR REPLACE FUNCTION public._community_cursor_parts3(_cursor text)
RETURNS TABLE (c_n int, c_ts timestamptz, c_id uuid)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF _cursor IS NULL OR btrim(_cursor) = '' THEN RETURN; END IF;
  BEGIN
    c_n  := split_part(_cursor, '|', 1)::int;
    c_ts := split_part(_cursor, '|', 2)::timestamptz;
    c_id := split_part(_cursor, '|', 3)::uuid;
    IF c_n < 0 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public._community_cursor_parts3(text) FROM PUBLIC, anon, authenticated;

-- ─── community_feed: scopes and sorts ───────────────────────────────────
-- Drop the installed signature(s) first so no two-argument overload
-- survives beside the four-argument function (see the Overload note).

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s)',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_feed' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.community_feed(
  _cursor text DEFAULT NULL, _limit int DEFAULT 20,
  _scope text DEFAULT 'following', _sort text DEFAULT 'newest')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_lim   int  := public._community_limit(_limit);
  v_scope text := coalesce(_scope, 'following');
  v_sort  text := coalesce(_sort, 'newest');
  v_gym   uuid;
  v_ts    timestamptz;
  v_id    uuid;
  v_n     int;
  v_rows  jsonb;
  v_lts   timestamptz;
  v_lid   uuid;
  v_ln    int;
  v_cursor text;
BEGIN
  IF v_scope NOT IN ('following', 'gym', 'groups', 'everyone')
     OR v_sort NOT IN ('newest', 'respected') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- 'everyone' is community_discover_posts' body, which never needed a
  -- Community profile (SD-04); every other scope is the Following feed's
  -- gate, unchanged.
  IF v_scope <> 'everyone' THEN
    PERFORM public._community_require_profile(v_uid, false);
  END IF;

  IF v_sort = 'respected' THEN
    SELECT c_n, c_ts, c_id INTO v_n, v_ts, v_id FROM public._community_cursor_parts3(_cursor);
  ELSE
    SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);
  END IF;

  IF v_scope = 'gym' THEN
    SELECT me.gym_id INTO v_gym
    FROM public.community_profiles me WHERE me.user_id = v_uid;
  END IF;

  WITH page AS (
    SELECT r AS rec, r.created_at AS created_at, r.id AS id,
           r.author_id AS author_id, r.reaction_count AS rc,
           (CASE WHEN v_sort = 'respected' THEN r.reaction_count ELSE 0 END) AS sort_n
    FROM public.community_posts r
    WHERE r.status = 'visible'
      AND (
        -- following: today's WHERE (migrate_170 B8), unchanged.
        (v_scope = 'following'
          AND (
            r.author_id = v_uid
            OR EXISTS (
              SELECT 1 FROM public.community_follows f
              WHERE f.follower_id = v_uid AND f.followee_id = r.author_id
                AND f.state = 'accepted')
          )
          AND (
            r.visibility <> 'groups'
            OR r.author_id = v_uid
            OR EXISTS (
              SELECT 1 FROM public.community_post_groups pg
              JOIN public.community_group_members gm ON gm.group_id = pg.group_id
              WHERE pg.post_id = r.id AND gm.user_id = v_uid AND gm.state = 'member')
          ))
        -- gym: same gym_id (main or other) as the caller, show_gym on, plus own.
        OR (v_scope = 'gym'
          AND (
            r.author_id = v_uid
            OR (
              v_gym IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM public.community_profiles gp
                WHERE gp.user_id = r.author_id
                  AND (gp.gym_id = v_gym OR v_gym = ANY (gp.other_gym_ids))
                  AND gp.show_gym = true
                  AND gp.is_minor = false)
            )
          )
          AND (
            r.author_id = v_uid
            OR EXISTS (
              SELECT 1 FROM public.community_profiles ap2
              WHERE ap2.user_id = r.author_id AND ap2.status = 'active'
                AND (ap2.visibility = 'public' OR EXISTS (
                  SELECT 1 FROM public.community_follows f2
                  WHERE f2.follower_id = v_uid AND f2.followee_id = r.author_id
                    AND f2.state = 'accepted')))
          )
          AND (
            r.author_id = v_uid
            OR r.visibility = 'public'
            OR (r.visibility = 'followers' AND EXISTS (
              SELECT 1 FROM public.community_follows f
              WHERE f.follower_id = v_uid AND f.followee_id = r.author_id
                AND f.state = 'accepted'))
            OR (r.visibility = 'groups' AND EXISTS (
              SELECT 1 FROM public.community_post_groups pg
              JOIN public.community_group_members gm ON gm.group_id = pg.group_id
              WHERE pg.post_id = r.id AND gm.user_id = v_uid AND gm.state = 'member'))
          ))
        -- groups: author and caller are both 'member' of one group.
        OR (v_scope = 'groups'
          AND (
            r.author_id = v_uid
            OR EXISTS (
              SELECT 1 FROM public.community_group_members mine
              JOIN public.community_group_members theirs ON theirs.group_id = mine.group_id
              WHERE mine.user_id = v_uid AND mine.state = 'member'
                AND theirs.user_id = r.author_id AND theirs.state = 'member')
          )
          AND (
            r.author_id = v_uid
            OR EXISTS (
              SELECT 1 FROM public.community_profiles ap2
              WHERE ap2.user_id = r.author_id AND ap2.status = 'active'
                AND (ap2.visibility = 'public' OR EXISTS (
                  SELECT 1 FROM public.community_follows f2
                  WHERE f2.follower_id = v_uid AND f2.followee_id = r.author_id
                    AND f2.state = 'accepted')))
          )
          AND (
            r.author_id = v_uid
            OR r.visibility = 'public'
            OR (r.visibility = 'followers' AND EXISTS (
              SELECT 1 FROM public.community_follows f
              WHERE f.follower_id = v_uid AND f.followee_id = r.author_id
                AND f.state = 'accepted'))
            OR (r.visibility = 'groups' AND EXISTS (
              SELECT 1 FROM public.community_post_groups pg
              JOIN public.community_group_members gm ON gm.group_id = pg.group_id
              WHERE pg.post_id = r.id AND gm.user_id = v_uid AND gm.state = 'member'))
          ))
        -- everyone: community_discover_posts' predicate (migrate_160 2687).
        OR (v_scope = 'everyone'
          AND r.visibility = 'public'
          AND EXISTS (
            SELECT 1 FROM public.community_profiles dp
            WHERE dp.user_id = r.author_id
              AND dp.status = 'active'
              AND dp.visibility = 'public'
              AND dp.is_minor = false)
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes m
        WHERE m.muter_id = v_uid AND m.muted_id = r.author_id)
      AND NOT public._community_is_blocked(v_uid, r.author_id)
      -- SD-11: a suspended profile is invisible everywhere.
      AND EXISTS (
        SELECT 1 FROM public.community_profiles ap
        WHERE ap.user_id = r.author_id AND ap.status <> 'suspended')
      AND (
        CASE WHEN v_sort = 'respected'
          THEN r.created_at >= now() - interval '14 days'
               AND (v_ts IS NULL
                    OR (r.reaction_count, r.created_at, r.id) < (v_n, v_ts, v_id))
          ELSE (v_ts IS NULL OR (r.created_at, r.id) < (v_ts, v_id))
        END)
    ORDER BY (CASE WHEN v_sort = 'respected' THEN r.reaction_count ELSE 0 END) DESC,
             r.created_at DESC, r.id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
        'post',   public._community_post_json(page.rec),
        'author', public._community_profile_card(page.author_id, v_uid),
        'my_reaction', EXISTS (
          SELECT 1 FROM public.community_reactions rr
          WHERE rr.post_id = page.id AND rr.user_id = v_uid))
      ORDER BY page.sort_n DESC, page.created_at DESC, page.id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.sort_n ASC, page.created_at ASC, page.id ASC))[1],
    (array_agg(page.id         ORDER BY page.sort_n ASC, page.created_at ASC, page.id ASC))[1],
    (array_agg(page.rc         ORDER BY page.sort_n ASC, page.created_at ASC, page.id ASC))[1]
  INTO v_rows, v_lts, v_lid, v_ln
  FROM page;

  IF v_sort = 'respected' THEN
    v_cursor := CASE
      WHEN v_lts IS NULL OR v_lid IS NULL THEN NULL
      ELSE v_ln::text || '|'
           || to_char(v_lts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.USOF')
           || '|' || v_lid::text
    END;
  ELSE
    v_cursor := public._community_cursor_of(v_lts, v_lid);
  END IF;

  RETURN jsonb_build_object(
    'posts', coalesce(v_rows, '[]'::jsonb),
    'cursor', v_cursor);
END $$;

REVOKE ALL ON FUNCTION public.community_feed(text, int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed(text, int, text, text) TO authenticated;

-- ─── Acceptance ──────────────────────────────────────────────────────────
-- Read-only catalogue check (run after the apply): expect exactly ONE row,
-- args '_cursor text, _limit integer, _scope text, _sort text', and
-- authenticated EXECUTE true, anon false.
--
-- SELECT p.oid::regprocedure AS fn,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname = 'public' AND p.proname = 'community_feed';
--
-- Also F: a PRIVATE profile (visibility <> 'public') with the same gym_id
-- as A, one public post, not followed by A: never returned by gym; returned
-- by gym once A's follow of F is accepted.
--
-- Behaviour fixture, run on a STAGING copy or inside a transaction that is
-- rolled back (never leave the fixture rows behind). Profiles plus the
-- caller: A (caller) follows B (accepted); A, C and G share gym_id
-- (G has show_gym off); A and D are 'member' of one group; E is blocked by A. Each
-- of B, C, D, E has one public visible post. Impersonate A with
-- set_config('request.jwt.claims', '{"sub":"<A uuid>","role":"authenticated"}', true).
--
--   following -> exactly B's post (and A's own)           : expect {B}
--   gym       -> exactly C's post (and A's own), never G  : expect {C}
--   groups    -> exactly D's post (and A's own)           : expect {D}
--   everyone  -> A (own), B, C, D public posts, never E (blocked) : expect {A,B,C,D} (proved, 16-HARNESS-190-191.md)
--
-- SELECT jsonb_path_query_array(
--          public.community_feed(NULL, 20, 'following', 'newest'),
--          '$.posts[*].author.user_id');   -- repeat for each scope
-- SELECT public.community_feed(NULL, 20);  -- two-argument call == following
-- SELECT public.community_feed(NULL, 20, 'respected_x', 'newest');
--   -> raises invalid_input   (also scope 'x': community_feed(NULL, 20, 'x'))
-- SELECT public.community_feed(NULL, 20, 'everyone', 'x');
--   -> raises invalid_input
-- SELECT public.community_feed(NULL, 20, 'everyone', 'respected');
--   -> posts newest-14-days ordered reaction_count DESC; the returned
--      cursor has three '|' separated parts; passing it back as _cursor
--      returns the next page with no repeated post id.
-- SELECT public.community_feed('2026-01-01T00:00:00.000000+00|' ||
--          gen_random_uuid()::text, 20, 'everyone', 'respected');
--   -> raises invalid_input   (a two-part cursor is not a respected cursor)
