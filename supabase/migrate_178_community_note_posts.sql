-- migrate_178_community_note_posts.sql
--
-- Purpose:           A first post without a workout (founder order
--                    2026-09-22, item 5 of eleven; audit evidence
--                    docs/audit/community-audit-2026-09-22/
--                    A-adoption-visibility-look-copy.md finding A-05:
--                    every post kind is generated from logged training
--                    data, so a curious new joiner with no session
--                    logged yet can post nothing). Adds a short free-
--                    text post kind, 'note'. It carries NO payload keys
--                    at all; its text is the existing `caption` field,
--                    cleaned and capped at 280 exactly like every other
--                    post's caption. A note is therefore subject to the
--                    same rate limits, reporting, deletion, block and
--                    mute filtering as every other post kind, with no
--                    new mechanism.
--
--                    Part 1 widens `community_posts_kind_check`
--                    (migrate_160 line 289) to add 'note', keeping
--                    every existing value -- 'pr', 'session', 'block',
--                    'milestone' and 'programme' ('programme' is kept
--                    even though no client posts it any more since
--                    migrate_164's retirement, because the CHECK must
--                    never reject a row that already exists).
--
--                    Part 2 re-issues `_community_payload_keys(text)`
--                    from migrate_160 lines 652-675 byte-for-byte with
--                    ONE marked addition: 'note' returns an EMPTY
--                    text[], never NULL -- NULL is what
--                    `community_create_post` reads as an unknown kind
--                    and refuses with invalid_input.
--
--                    Part 3 (fix P1, Opus adversarial review, founder
--                    order 2026-09-22, "ship with fixes") adds a new
--                    helper, `_community_payload_has_blocked_term`: until
--                    now only the caption was ever checked against
--                    `_community_blocked_terms()` (via
--                    `_community_clean_text`), so a payload STRING VALUE
--                    -- a session name, plan name, exercise name or
--                    milestone title -- reached every feed and public
--                    page with no such check at all. The helper recurses
--                    over the payload the same way
--                    `_community_forbidden_keys` does (migrate_160 lines
--                    939-971) and matches with the exact fold-and-whole-
--                    word test `_community_clean_text` uses (migrate_160
--                    lines 924-930), so the two checks can never
--                    disagree; it is depth-bounded the same way that
--                    function already is, since it is only ever called
--                    after `community_create_post`'s own payload-size
--                    cap has run.
--
--                    Part 4 re-issues `community_create_post` from its
--                    last definition (migrate_170 lines 2981-3185)
--                    byte-for-byte with THREE marked additions. (1) A
--                    'note' post must carry a non-empty caption (the
--                    caption IS the whole post), checked AFTER the
--                    caption is cleaned, so a blocked-term caption still
--                    raises content_not_allowed first rather than being
--                    masked as invalid_input -- fix F8 (Opus adversarial
--                    review) tests that emptiness with a whitespace
--                    CLASS rather than trusting v_caption's own NULL-
--                    ness, since btrim (used both above and inside
--                    `_community_clean_text`) strips only the ASCII
--                    space character, and a caption made only of a non-
--                    breaking space (U+00A0) or a zero-width space
--                    (U+200B) would otherwise have survived as non-NULL
--                    and passed as a real note. (2) Fix F6 refuses an
--                    automatic ('note' + `_auto`) post outright: a note
--                    is a person's own words, and the client never sets
--                    `_auto` for one. (3) Fix P1 raises
--                    content_not_allowed when Part 3's new helper finds
--                    a blocked term anywhere in the payload, placed
--                    after the allow-list and forbidden-key checks and
--                    before the caption rule. Every other kind's caption
--                    stays optional, exactly as before.
--
--                    Confirmed unchanged by this campaign item, so NOT
--                    touched by this file: `_community_clean_text`
--                    already runs on every kind's caption unconditionally
--                    (migrate_170 line 3027), so the blocked-terms check
--                    already covers a note's caption today.
--                    `community_feed`, `community_dimension_recent` and
--                    `community_group_feed` (all last defined in
--                    migrate_170), and `community_discover_posts` (last
--                    defined in migrate_160, line 2687), filter posts on
--                    visibility, author status, block/mute pairs and
--                    group membership only -- never on `kind` -- so a
--                    visible 'note' post reaches every list a visible
--                    post of any other kind reaches. The post JSON a
--                    client reads, `_community_post_json` (migrate_160,
--                    never re-issued since), names `kind`, `payload` and
--                    `caption` generically for every kind, so it needs
--                    no change either.
--
--                    ACCEPTED (Opus adversarial review, founder order
--                    2026-09-22), not re-issued: fix F9,
--                    `community_post_set_note(_post_id, NULL)`
--                    (migrate_170 Part B5, lines 3187-3234) can blank
--                    ANY post's caption, note included, through a direct
--                    RPC call with no kind check at all. The app never
--                    offers this for a note -- its only caller,
--                    CommunityComposeScreen.js's "Add a note" path,
--                    always targets an EXISTING item by its own id -- and
--                    a blank note is harmless (empty text, no visibility
--                    or ownership change), so this is accepted as-is.
--
--                    Every re-issue is guard-proved:
--                    src/__tests__/migrate178.guard.test.js reverts the
--                    marked lines and compares with the source files.
--
-- Applied locally:   n/a (cloud-only objects; nothing in database.js)
-- Applied remotely:  YES - 2026-09-24 14:33 UTC (written 2026-09-22), under
--                    the founder's exact phrase "run against production"
--                    given 2026-09-24 for the batch 176 to 183; Claude-run
--                    through the Supabase connector under the checksum
--                    protocol: whole file md5
--                    `1d88be8baec6219a9ff10397d6abdce9` / 30,396 bytes
--                    re-checked inside the executing DO block, acceptance
--                    block passed, verified read-only after the apply
--                    (supabase/README status block is the live record).
-- Safe to re-run:    YES - the CHECK widening drops and re-adds by name
--                    (DROP CONSTRAINT IF EXISTS), CREATE OR REPLACE
--                    FUNCTION and REVOKE/GRANT are idempotent, and the
--                    acceptance block at the end is read-only.
-- Rollback:          drop and re-add community_posts_kind_check without
--                    'note' (only safe once no row carries the value);
--                    re-issue `_community_payload_keys(text)` from
--                    migrate_160 lines 652-675 and `community_create_post`
--                    from migrate_170 lines 2981-3185 (the versions
--                    without the 'note' branch, the auto-refusal, the
--                    blocked-term check and the caption-required rule);
--                    drop `_community_payload_has_blocked_term(jsonb)`
--                    (new in this file; nothing else calls it). No table
--                    is created or dropped by this file.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (community_posts, _community_payload_keys,
--                    _community_clean_text, _community_forbidden_keys,
--                    _community_post_json, _community_fold,
--                    _community_blocked_terms), 170
--                    (community_create_post's current 8-argument
--                    signature, community_post_groups, client_ref,
--                    _community_rate_check).

-- ─── Part 1: community_posts.kind gains 'note' ───────────────────────────

DO $$ BEGIN
  ALTER TABLE public.community_posts
    DROP CONSTRAINT IF EXISTS community_posts_kind_check;
  ALTER TABLE public.community_posts
    ADD CONSTRAINT community_posts_kind_check
    CHECK (kind IN ('pr', 'session', 'block', 'milestone', 'programme', 'note'));
END $$;

-- ─── Part 2: _community_payload_keys('note') is an empty allow-list ──────
-- migrate_160 lines 652-675 carried forward byte-for-byte; the marked
-- migrate_178 addition is the ONLY difference (guard-proved).

CREATE OR REPLACE FUNCTION public._community_payload_keys(_kind text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE _kind
    WHEN 'pr' THEN ARRAY[
      'exerciseName', 'weight', 'reps', 'units', 'previousBest', 'date']
    WHEN 'session' THEN ARRAY[
      'sessionName', 'workingSets', 'duration', 'tonnage', 'exerciseCount',
      'exercises', 'prCount', 'topSet', 'intensityTier', 'units', 'planName',
      'date']
    WHEN 'block' THEN ARRAY[
      'planName', 'weeks', 'sessions', 'sessionsPerWeek', 'completedAt',
      'lifts']
    WHEN 'milestone' THEN ARRAY[
      'eyebrow', 'title', 'heroValue', 'heroUnit', 'caption', 'stats']
    WHEN 'programme' THEN ARRAY[
      'id', 'title', 'style_key', 'days_per_week', 'exercise_count']
    WHEN 'note' THEN ARRAY[]::text[] -- migrate_178: no payload; the caption IS the post
    ELSE NULL
  END::text[];
$$;

REVOKE ALL ON FUNCTION public._community_payload_keys(text) FROM PUBLIC, anon, authenticated;

-- ─── Part 3 (fix P1): a payload STRING VALUE against the blocked terms ──
-- New helper, not a re-issue of anything -- see the header for the full
-- rationale. Recurses over objects (by value) and arrays (by element)
-- the same way `_community_forbidden_keys` does (migrate_160 lines
-- 939-971); depth-bounded the same way that function already is, by
-- `community_create_post`'s own octet_length(_payload::text) > 16384
-- check, which always runs before this is ever called. The match itself
-- is copied verbatim from `_community_clean_text` (migrate_160 lines
-- 924-930): fold the string, pad it with a leading and trailing space,
-- and test every `_community_blocked_terms()` entry as a whole word --
-- same fold, same list, so this can never disagree with the caption's
-- own check.
CREATE OR REPLACE FUNCTION public._community_payload_has_blocked_term(_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_val    jsonb;
  v_item   jsonb;
  v_folded text;
  v_term   text;
BEGIN
  IF _payload IS NULL THEN RETURN false; END IF;

  IF jsonb_typeof(_payload) = 'string' THEN
    -- The exact match _community_clean_text uses (migrate_160 lines
    -- 924-930): fold, pad with spaces, whole-word test.
    v_folded := ' ' || public._community_fold(_payload #>> '{}') || ' ';
    FOREACH v_term IN ARRAY public._community_blocked_terms() LOOP
      IF position(' ' || v_term || ' ' IN v_folded) > 0 THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  ELSIF jsonb_typeof(_payload) = 'object' THEN
    FOR v_val IN SELECT value FROM jsonb_each(_payload) LOOP
      IF public._community_payload_has_blocked_term(v_val) THEN RETURN true; END IF;
    END LOOP;
    RETURN false;
  ELSIF jsonb_typeof(_payload) = 'array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(_payload) LOOP
      IF public._community_payload_has_blocked_term(v_item) THEN RETURN true; END IF;
    END LOOP;
    RETURN false;
  ELSE
    RETURN false;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public._community_payload_has_blocked_term(jsonb) FROM PUBLIC, anon, authenticated;

-- ─── Part 4: community_create_post requires a caption for a 'note', ─────
-- refuses an automatic note, and refuses a blocked term anywhere in the
-- payload (fixes F8, F6, P1) ──────────────────────────────────────────
-- migrate_170 lines 2981-3185 carried forward byte-for-byte; the marked
-- migrate_178 additions are the ONLY difference (guard-proved).

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

-- ─── Acceptance check (read-only) ──────────────────────────────────────────
DO $$
DECLARE
  v_def   text;
  v_check text;
BEGIN
  IF to_regprocedure('public._community_payload_keys(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_payload_keys(text) missing';
  END IF;
  IF to_regprocedure('public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post(8 args) missing';
  END IF;
  -- fix P1: the new blocked-term helper exists.
  IF to_regprocedure('public._community_payload_has_blocked_term(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_payload_has_blocked_term(jsonb) missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('_community_payload_keys', 'community_create_post', '_community_payload_has_blocked_term')
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_178 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  v_def := pg_get_functiondef(to_regprocedure('public._community_payload_keys(text)'));
  IF strpos(v_def, $m$WHEN 'note' THEN ARRAY[]::text[]$m$) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: _community_payload_keys does not carry the note branch';
  END IF;

  v_def := pg_get_functiondef(
    to_regprocedure('public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])'));
  IF strpos(v_def, 'migrate_178') = 0
     -- F8: the note-caption rule now tests emptiness with the whitespace
     -- class, not a bare v_caption IS NULL.
     OR strpos(v_def, $m$IF _kind = 'note' AND (v_caption IS NULL OR v_caption ~ ('^(\s|' || chr(160) || '|' || chr(8203) || ')*$')) THEN$m$) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post does not carry the migrate_178 note-caption rule';
  END IF;
  -- fix F6: an automatic note is refused outright.
  IF strpos(v_def, $m$IF _kind = 'note' AND coalesce(_auto, false) THEN$m$) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post does not refuse an automatic note (fix F6)';
  END IF;
  -- fix P1: the new helper is actually called, and raises the right code.
  IF strpos(v_def, 'public._community_payload_has_blocked_term(_payload)') = 0
     OR strpos(v_def, $m$IF public._community_payload_has_blocked_term(_payload) THEN
    RAISE EXCEPTION USING message = 'content_not_allowed';$m$) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post does not call the blocked-term helper (fix P1)';
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO v_check
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'community_posts' AND c.conname = 'community_posts_kind_check';
  IF v_check IS NULL OR strpos(v_check, '''note''') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_posts_kind_check does not carry note';
  END IF;
  IF strpos(v_check, '''pr''') = 0 OR strpos(v_check, '''session''') = 0
     OR strpos(v_check, '''block''') = 0 OR strpos(v_check, '''milestone''') = 0
     OR strpos(v_check, '''programme''') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_posts_kind_check dropped an existing value';
  END IF;

  IF NOT has_function_privilege(
       'authenticated',
       'public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])',
       'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_create_post is not executable by authenticated';
  END IF;
  IF has_function_privilege(
       'anon',
       'public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])',
       'EXECUTE')
     OR has_function_privilege('anon', 'public._community_payload_keys(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_payload_keys(text)', 'EXECUTE')
     -- fix P1: the new helper is EXECUTE-revoked from every role that is
     -- not this function itself, the same as _community_payload_keys.
     OR has_function_privilege('anon', 'public._community_payload_has_blocked_term(jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_payload_has_blocked_term(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_178 function has the wrong grant';
  END IF;

  RAISE NOTICE 'migrate_178 acceptance: OK';
END $$;
