-- migrate_187_community_posts_accept_everyone.sql
--
-- Purpose:           Founder report 2026-09-27: "It didn't auto share my
--                    workout today and doesn't show any for this last week
--                    against my gym either". The production API log for the
--                    workout's finish (2026-09-27, 12:01 UTC) shows the app
--                    sent its automatic session and PR posts, and
--                    community_create_post refused every one as invalid_input:
--                    the app sends the person's audience setting as the post's
--                    visibility, the setting says 'everyone' where a post says
--                    'public', and this function accepts only 'public',
--                    'followers' or 'groups'. So every automatic post for an
--                    'everyone' audience has failed since migrate_184/185 made
--                    'everyone' the default and moved the existing profiles to
--                    it (2026-09-26). The app now sends 'public' (commit
--                    39d112aa), but the builds already sent to Apple and
--                    Google keep sending 'everyone', and no further build can
--                    go out now (founder, 2026-09-27). This file re-issues
--                    community_create_post IN FULL from migrate_178 (the live
--                    body, md5 b191d7b339bf4e9b25d55c65902e5c91, matched
--                    2026-09-27) with one change: a requested visibility of
--                    'everyone' is read as 'public' before it is checked, the
--                    same reading the automatic-post rule further down already
--                    gives the setting. Nothing is widened: 'public' was
--                    already accepted; an automatic post is still held to the
--                    person's own setting (sharing on, and followers or the
--                    setting's own reading); a person under 18 is still
--                    refused anything above followers. The guard
--                    `migrate187.guard.test.js` diffs the body against 178's
--                    line by line.
--
-- Applied locally:   N/A - no local SQLite table; nothing in
--                    `src/lib/database.js` changes, `PRAGMA user_version`
--                    is untouched.
-- Applied remotely:  YES - 2026-09-27 15:59 UTC (written 2026-09-27), under
--                    the founder's exact phrase "run against production:
--                    187" given 2026-09-27; Claude-run through the Supabase
--                    connector under the checksum protocol: three chunks
--                    verified, whole file md5
--                    `1c411bfc117a7d7f3cf1f885a6300342` / 17,475 bytes
--                    re-checked inside the executing DO block, acceptance
--                    block passed, verified read-only after the apply
--                    (supabase/README status block is the live record).
-- Safe to re-run:    YES. CREATE OR REPLACE FUNCTION replaces the body with
--                    the same text; the REVOKE/GRANT pair is idempotent; the
--                    acceptance block is read-only.
-- Rollback:          Re-run migrate_178's community_create_post block (the
--                    function and its REVOKE/GRANT pair) exactly as written
--                    there.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        178 (the function this re-issues, and everything it
--                    calls).

-- ─── Part 1: community_create_post, migrate_178's body with one change ───

CREATE OR REPLACE FUNCTION public.community_create_post(
  _kind text, _payload jsonb, _caption text DEFAULT NULL,
  _programme_id uuid DEFAULT NULL, _visibility text DEFAULT 'public',
  _auto boolean DEFAULT false, _client_ref text DEFAULT NULL,
  _group_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_allowed text[];
  v_key     text;
  v_caption text;
  v_vis     text;
  v_id      uuid;
  v_client_ref text; -- migrate_170 part B
  v_group_ids  uuid[]; -- migrate_170 part B
  v_gid        uuid; -- migrate_170 part B
  v_inserted   boolean; -- migrate_170 part B
  v_share_sessions    boolean; -- reviewer 2026-09-10 (B)
  v_sessions_audience text;    -- reviewer 2026-09-10 (B)
  v_auto_vis          text;    -- reviewer 2026-09-10 (B)
  v_day_start         timestamptz; -- lead ruling 2026-09-10 (B)
BEGIN
  PERFORM public._community_require_profile(v_uid, true);

  v_allowed := public._community_payload_keys(_kind);
  IF v_allowed IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF octet_length(_payload::text) > 16384 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  FOR v_key IN SELECT key FROM jsonb_each(_payload) LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
  END LOOP;
  PERFORM public._community_forbidden_keys(_payload);

  -- migrate_178 P1 (lead ruling, Opus adversarial review, founder order
  -- 2026-09-22): a payload STRING VALUE (a session name, plan name,
  -- exercise name, milestone title) reached every feed and public page
  -- with no blocked-terms check at all until now -- only the caption
  -- ever had one. Same helper, same list as the caption's own check, so
  -- the two can never disagree. Placed after the allow-list and
  -- forbidden-key checks (the payload is now known well-formed and
  -- PII-free) and before the caption rule.
  IF public._community_payload_has_blocked_term(_payload) THEN
    RAISE EXCEPTION USING message = 'content_not_allowed';
  END IF;

  v_caption := nullif(btrim(coalesce(_caption, '')), '');
  IF v_caption IS NOT NULL THEN
    v_caption := public._community_clean_text(v_caption);
    IF length(v_caption) > 280 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  END IF;

  -- migrate_178 (founder order 2026-09-22 item 5, A-05): a 'note' carries
  -- no payload at all, so its caption IS the whole post; every other
  -- kind's caption stays optional, exactly as before. Checked AFTER
  -- cleaning, so a blocked-term caption still raises content_not_allowed
  -- first, never masked as invalid_input.
  --
  -- F8 (Opus adversarial review, founder order 2026-09-22): emptiness is
  -- now tested with a whitespace CLASS, not v_caption's own NULL-ness.
  -- btrim (used above, and inside _community_clean_text) strips only
  -- the ASCII space character, so a caption made only of a non-breaking
  -- space (U+00A0) or a zero-width space (U+200B) survived as non-NULL
  -- and would have passed as a real note. Alternation, not a bracket
  -- class: _community_fold's own '\s+' (migrate_160 line 712) already
  -- proves this engine accepts \s standalone, kept unambiguous here by
  -- never mixing \s with other characters inside one [...] class.
  -- Lead review 2026-09-23: the no-break space (U+00A0) and the zero-width
  -- space (U+200B) are spelt chr(160) and chr(8203) so the rule is visible
  -- in the file, never two invisible bytes an editor could drop.
  IF _kind = 'note' AND (v_caption IS NULL OR v_caption ~ ('^(\s|' || chr(160) || '|' || chr(8203) || ')*$')) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- migrate_178 F6 (Opus adversarial review, founder order 2026-09-22):
  -- a note is a person's own words, never a machine-generated ambient
  -- item -- CommunityComposeScreen.js never sets _auto for kind 'note'.
  -- Placed with the note rule immediately above; refuses a caller who
  -- tries anyway rather than silently accepting it.
  IF _kind = 'note' AND coalesce(_auto, false) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- migrate_170 part B (phase3 spec section 3): visibility gains 'groups'.
  v_vis := coalesce(nullif(btrim(coalesce(_visibility, '')), ''), 'public');
  -- migrate_187 (founder report 2026-09-27): the app's automatic posts send
  -- the sharing setting's own word for a public post, 'everyone'. Read it
  -- as 'public', the reading the automatic-post rule below already gives
  -- the setting, so the builds already in people's hands post.
  IF v_vis = 'everyone' THEN v_vis := 'public'; END IF;
  IF v_vis NOT IN ('public', 'followers', 'groups') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _programme_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.community_programmes WHERE id = _programme_id) THEN
    RAISE EXCEPTION USING message = 'not_found';
  END IF;

  -- migrate_170 part B (phase3 spec section 2): client_ref, trimmed to a
  -- sane bound. NULL stays NULL (an ordinary manual post never carries
  -- one), so the partial unique index above never applies to it.
  v_client_ref := nullif(btrim(coalesce(_client_ref, '')), '');
  IF v_client_ref IS NOT NULL AND length(v_client_ref) > 120 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- migrate_170 part B (phase3 spec sections 3 and 6): a 'groups' post must
  -- name at least one group (never zero - that would be a post nobody but
  -- its own author could ever see), the caller must currently belong to
  -- every group named, and a minor is refused outright with its own error
  -- rather than silently stripped - the same "refuse, never erase" posture
  -- community_upsert_profile's discipline_keys check already set for this
  -- file (reviewer 2026-09-10, part A). Minors cannot be group members at
  -- all (community_group_join/_create already refuse them), so this is
  -- belt and braces, not the only thing standing in a minor's way.
  v_group_ids := NULL;
  IF _group_ids IS NOT NULL AND array_length(_group_ids, 1) > 0 THEN
    IF v_vis <> 'groups' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    IF public._community_caller_is_minor(v_uid) THEN
      RAISE EXCEPTION USING message = 'minor_restricted';
    END IF;
    SELECT array_agg(DISTINCT g) INTO v_group_ids FROM unnest(_group_ids) AS g;
    IF array_length(v_group_ids, 1) > 20 THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    FOREACH v_gid IN ARRAY v_group_ids LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.community_group_members m
        WHERE m.group_id = v_gid AND m.user_id = v_uid AND m.state = 'member'
      ) THEN
        RAISE EXCEPTION USING message = 'not_allowed';
      END IF;
    END LOOP;
  ELSIF v_vis = 'groups' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- reviewer 2026-09-10 (B): CONSENT, checked on the server, not only in
  -- the client that sets _auto. An ambient item is Article 9 training data
  -- published on an express toggle (blueprint section 8, tightening R3), so
  -- "share_sessions is on" must be a fact this function establishes for
  -- itself: a stale build, a replayed offline queue flushed after the
  -- toggle went off, or any caller holding a session JWT could otherwise
  -- publish auto items the owner never consented to. The audience is
  -- enforced with it - an auto item may never be WIDER than the audience
  -- the owner chose ('public' only under 'everyone', 'groups' only under
  -- 'groups'), while 'followers' stays permitted under every audience
  -- because it is this product's consent floor: the value a minor is
  -- forced to, and the value a queued item narrows to when the owner's
  -- choice moved on. A minor therefore can never reach 'public' or
  -- 'groups' here at all, since sessions_audience is forced to 'followers'
  -- for them on write (B2 above); the explicit minor line below is belt
  -- and braces on top of that, never the only thing standing in the way.
  IF coalesce(_auto, false) THEN
    SELECT p.share_sessions, p.sessions_audience
      INTO v_share_sessions, v_sessions_audience
    FROM public.community_profiles p WHERE p.user_id = v_uid;
    IF NOT coalesce(v_share_sessions, false) THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    v_auto_vis := CASE coalesce(v_sessions_audience, 'followers')
                    WHEN 'everyone' THEN 'public'
                    WHEN 'groups'   THEN 'groups'
                    ELSE 'followers' END;
    IF v_vis <> 'followers' AND v_vis <> v_auto_vis THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
    IF v_vis <> 'followers' AND public._community_caller_is_minor(v_uid) THEN
      RAISE EXCEPTION USING message = 'minor_restricted';
    END IF;
  END IF;

  -- reviewer 2026-09-10 (B): resolve an already-flushed client_ref BEFORE
  -- the rate rail. The ON CONFLICT below made the WRITE idempotent, but the
  -- rail is spent before it is ever reached, so the contract's "safe to
  -- retry an offline-queued flush any number of times" was false: three
  -- retries of one pending item exhaust a new member's whole day of three
  -- and the queue can then never drain. A ref this author has already
  -- posted is not a new post and must not cost one. The ON CONFLICT clause
  -- stays as the race-safe backstop for two flushes landing at once.
  IF v_client_ref IS NOT NULL THEN
    SELECT p.id INTO v_id FROM public.community_posts p
    WHERE p.author_id = v_uid AND p.client_ref = v_client_ref;
    IF FOUND THEN
      RETURN jsonb_build_object('id', v_id);
    END IF;
  END IF;

  -- The rate check runs LAST, after every validation: a rejected post must
  -- not spend one of the day's three.
  --
  -- Lead ruling 2026-09-10 (B): an ambient item does NOT spend the manual
  -- post rail. One workout makes at most four items (a session plus up to
  -- three PR moments), so the manual rail's 3-a-day for an account under a
  -- week old made the feature unusable on a new member's first PR-heavy
  -- session. `post_auto` is its own action, 12 a day (three workouts at
  -- four items), flat for new and established accounts alike; the manual
  -- `post` rail is untouched, and neither can eat the other. The window is
  -- a real UK-local day rather than the helper's default rolling 24 hours:
  -- the interval passed is exactly "how long since UK-local midnight", so
  -- _community_rate_check counts only today's own items and the allowance
  -- resets at midnight the way a person expects it to.
  IF coalesce(_auto, false) THEN
    v_day_start := date_trunc('day', timezone('Europe/London', now())) AT TIME ZONE 'Europe/London';
    PERFORM public._community_rate_check(v_uid, 'post_auto', 12, 12, now() - v_day_start);
  ELSE
    PERFORM public._community_rate_check(v_uid, 'post', 3, 10);
  END IF;

  -- migrate_170 part B: idempotent on (author_id, client_ref) when a
  -- client_ref is supplied - a retried flush of the same pending ambient
  -- item returns the row that already exists rather than duplicating it
  -- (phase3 spec section 2). "DO UPDATE SET id = id" is a deliberate
  -- no-op: it exists only so ON CONFLICT has something to update, which is
  -- what makes RETURNING fire for the conflicting row; nothing about the
  -- existing row actually changes. xmax = 0 is the standard way to tell a
  -- fresh INSERT apart from an UPDATE that hit that no-op path.
  INSERT INTO public.community_posts (
    author_id, kind, payload, caption, programme_id, visibility, auto, client_ref)
  VALUES (
    v_uid, _kind, _payload, v_caption, _programme_id, v_vis,
    coalesce(_auto, false), v_client_ref)
  ON CONFLICT (author_id, client_ref) WHERE client_ref IS NOT NULL
  DO UPDATE SET id = community_posts.id
  RETURNING id, (xmax = 0) INTO v_id, v_inserted;

  -- Only a genuinely NEW row gets its group audience written; a conflict
  -- hit returns the row exactly as it already stood.
  IF v_inserted AND v_group_ids IS NOT NULL THEN
    FOREACH v_gid IN ARRAY v_group_ids LOOP
      INSERT INTO public.community_post_groups (post_id, group_id)
      VALUES (v_id, v_gid) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', v_id);
END $$;
REVOKE ALL ON FUNCTION public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[]) TO authenticated;

-- ─── Part 2: acceptance check (read-only) ──────────────────────────────────
DO $$
DECLARE
  v_def text;
BEGIN
  IF to_regprocedure('public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post missing';
  END IF;
  v_def := pg_get_functiondef('public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])'::regprocedure);
  IF position('IF v_vis = ''everyone'' THEN v_vis := ''public''; END IF;' IN v_def) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the everyone reading is not in the live body';
  END IF;
  IF position('WHEN ''everyone'' THEN ''public''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the automatic-post rule is missing';
  END IF;
  IF has_function_privilege('anon', 'public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: anon can execute community_create_post';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: authenticated cannot execute community_create_post';
  END IF;
END $$;
