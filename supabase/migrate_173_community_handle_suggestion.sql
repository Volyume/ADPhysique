-- migrate_173_community_handle_suggestion.sql
--
-- Purpose:           Community at onboarding (founder order 2026-09-11;
--                    docs/communities-revamp-2026-09-10/
--                    25-ONBOARDING-COMMUNITY-SPEC.md section 4.1; CR-15,
--                    D158). One RPC, `community_handle_suggestion()`, that
--                    proposes a FREE handle for the caller so the onboarding
--                    step and the Join screen can offer a ready profile that
--                    the person confirms with one tap and may edit first.
--
--                    The founder asked for the handle to come from the
--                    person's username or email local part. `email` is on
--                    Community's refusal list and the privacy source guard
--                    forbids every Community client file from reading it, so
--                    the derivation happens HERE, inside a SECURITY DEFINER
--                    function reading `auth.users` (the precedent of
--                    migrate_071, 095 and 108), and only the derived handle
--                    ever leaves. The RAW address is never returned, logged
--                    or raised; the handle IS its sanitised local part,
--                    which is what founder question Q2 (spec ruling b, data
--                    minimisation) is open on. DO NOT APPLY before Q2 is
--                    answered; if the answer is "given name only", Source 1
--                    below is removed before the phrase.
--
--                    Derivation (`_community_handle_base`): lower-case; the
--                    part before the first `+` (plus-addressing tag dropped);
--                    every run of characters outside a-z and 0-9 becomes one
--                    underscore; repeats collapsed; underscores trimmed at
--                    both ends; cut to twenty characters and trimmed again;
--                    NULL when shorter than three characters, when
--                    `_community_handle_valid` refuses it, or when it is on
--                    the suggestion's exclusion list.
--
--                    Sources, in order: the email local part, unless the
--                    address is an Apple private relay
--                    (`privaterelay.appleid.com`, a random token that names
--                    nobody); the given name the sign-in provider supplied
--                    (`raw_user_meta_data.given_name`, else the first word of
--                    `full_name` or `name`); the neutral base `athlete`.
--                    Collisions append `_2` .. `_99`, then an underscore and
--                    four random digits. Every candidate is re-checked with
--                    `_community_handle_valid` and against every OTHER
--                    person's handle. A caller who already has a profile gets
--                    their own handle back (`source: 'existing'`); the
--                    screens never create a second profile.
--
--                    The suggestion is never reserved: the create call
--                    (`community_upsert_profile`, migrate_170) still decides,
--                    and a race is reported to the client as `handle_taken`
--                    exactly as a typed handle would be.
--
--                    Exclusion list (`_community_handle_suggest_reserved`):
--                    the client's own reserved words
--                    (src/lib/community/validation.js RESERVED_HANDLES), so a
--                    suggestion can never land on `app`, `settings` or
--                    `login`. `_community_handle_reserved()` itself is NOT
--                    re-issued: `community_upsert_profile` re-validates the
--                    merged handle on EVERY save, including a display-name
--                    edit, so widening the hard list would refuse every
--                    future edit from an existing member whose handle is on
--                    it. The wider list applies to what the server SUGGESTS;
--                    the client keeps refusing the same words for what a
--                    person TYPES, as it does today.
--
--                    VOLATILE: the rate rail writes (migrate_167's lesson).
--                    Oracle bound (hostile review 2026-09-11): one call may
--                    test up to 120 candidates against other people's
--                    handles, so the rail alone is not the answer. The bound
--                    is the ALPHABET: every candidate is `base`, `base_2` ..
--                    `base_99` or `base_NNNN` where `base` derives solely
--                    from the caller's own auth.users row (plus-addressing
--                    stripped, so `a+1@` and `a+2@` collapse to one base);
--                    varying the base needs a fresh confirmed mailbox per
--                    probe, strictly weaker than community_check_handle's
--                    120 free-form checks an hour. Thirty an hour covers a
--                    screen mounting.
--
--                    Order inside the body (a recorded departure from the
--                    spec's listing): an existing member's own handle is
--                    returned BEFORE the rate rail, so a pre-fill for
--                    someone already in never spends rail; that early read
--                    discloses only the caller's own row.
--
-- Applied locally:   n/a (cloud-only objects; nothing in database.js)
-- Applied remotely:  NOT YET - waits for the founder's exact phrase
--                    "run against production". Claude-run on that phrase
--                    through the Supabase connector under the checksum
--                    protocol (supabase/README.md status block). The client
--                    treats a missing function as `unavailable` (the
--                    onboarding step then offers an empty handle field and
--                    the Join screen behaves as today), so the client half
--                    may land first.
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION, REVOKE/GRANT are
--                    idempotent, and the acceptance block is read-only.
-- Rollback:          DROP FUNCTION IF EXISTS public.community_handle_suggestion();
--                    DROP FUNCTION IF EXISTS public._community_handle_base(text);
--                    DROP FUNCTION IF EXISTS public._community_handle_suggest_reserved();
--                    Nothing else is touched; no table changes.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (community_profiles, _community_caller,
--                    _community_rate_check, _community_handle_valid,
--                    _community_handle_reserved), 170 (community_upsert_profile
--                    creates the profile the suggestion is for).

-- ─── Part 1: the suggestion's exclusion list ─────────────────────────────────
-- Byte-for-byte the client's RESERVED_HANDLES (src/lib/community/
-- validation.js), pinned by src/__tests__/migrate173.rpcOnly.guard.test.js.
-- No client role may execute it: it is a helper of the suggestion below.

CREATE OR REPLACE FUNCTION public._community_handle_suggest_reserved()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ARRAY[
    'volyume', 'admin', 'administrator', 'support', 'help', 'helpdesk',
    'moderator', 'moderation', 'mod', 'official', 'staff', 'team',
    'community', 'coach', 'coaching', 'beat', 'nhs',
    'u', 'p', 's', 'profile', 'programme', 'programmes', 'program', 'post',
    'posts', 'story', 'stories', 'feed', 'discover', 'search', 'activity',
    'dimension', 'rules', 'privacy', 'terms', 'report', 'block', 'mute',
    'follow', 'followers', 'following', 'partner', 'partners', 'join',
    'home', 'today', 'train', 'plans', 'plan', 'progress', 'food', 'you',
    'settings', 'account', 'notifications', 'about', 'legal', 'scan',
    'www', 'api', 'app', 'web', 'blog', 'news', 'login', 'signin', 'signup',
    'register', 'auth', 'callback', 'password', 'reset', 'delete', 'new',
    'edit', 'me', 'null', 'undefined', 'anonymous'
  ]::text[];
$$;

REVOKE ALL ON FUNCTION public._community_handle_suggest_reserved() FROM PUBLIC, anon, authenticated;

-- ─── Part 2: the sanitiser ───────────────────────────────────────────────────
-- Pure (IMMUTABLE): the same input always gives the same base, so the
-- acceptance block below can test it without any data. NULL means "no usable
-- base from this input"; the caller moves to its next source.

CREATE OR REPLACE FUNCTION public._community_handle_base(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v text;
BEGIN
  v := lower(coalesce(_raw, ''));
  v := split_part(v, '+', 1);
  v := regexp_replace(v, '[^a-z0-9]+', '_', 'g');
  v := regexp_replace(v, '_+', '_', 'g');
  v := btrim(v, '_');
  v := btrim(left(v, 20), '_');
  IF length(v) < 3 THEN RETURN NULL; END IF;
  IF NOT public._community_handle_valid(v) THEN RETURN NULL; END IF;
  IF v = ANY (public._community_handle_suggest_reserved()) THEN RETURN NULL; END IF;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public._community_handle_base(text) FROM PUBLIC, anon, authenticated;

-- ─── Part 3: the RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.community_handle_suggestion()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := public._community_caller();
  v_existing  text;
  v_address   text;
  v_meta      jsonb;
  v_local     text;
  v_domain    text;
  v_base      text;
  v_source    text;
  v_candidate text;
  v_n         int;
  v_tries     int;
BEGIN
  -- An existing member gets their own handle back: the screens that call
  -- this pre-fill a NEW profile, and a second profile is never created.
  SELECT p.handle INTO v_existing
  FROM public.community_profiles p
  WHERE p.user_id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('handle', v_existing, 'source', 'existing');
  END IF;

  PERFORM public._community_rate_check(v_uid, 'handle_suggest', 30, 30, interval '1 hour');

  -- The one read of the caller's own sign-in record. The address is held
  -- in a local for the two split_part calls and is never returned, logged
  -- or raised.
  SELECT lower(u.email), u.raw_user_meta_data INTO v_address, v_meta
  FROM auth.users u
  WHERE u.id = v_uid;

  v_local  := split_part(coalesce(v_address, ''), '@', 1);
  v_domain := split_part(coalesce(v_address, ''), '@', 2);
  v_address := NULL;

  -- Source 1 (the founder's order): the email local part, unless the
  -- address is an Apple private relay, whose local part is a random token.
  IF v_domain <> 'privaterelay.appleid.com' THEN
    v_base := public._community_handle_base(v_local);
    IF v_base IS NOT NULL THEN v_source := 'email'; END IF;
  END IF;

  -- Source 2: the given name the sign-in provider supplied, when any.
  IF v_base IS NULL THEN
    v_base := public._community_handle_base(
      coalesce(
        nullif(btrim(coalesce(v_meta ->> 'given_name', '')), ''),
        split_part(btrim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), ' ', 1)
      ));
    IF v_base IS NOT NULL THEN v_source := 'name'; END IF;
  END IF;

  -- Source 3: a neutral base.
  IF v_base IS NULL THEN
    v_base := 'athlete';
    v_source := 'fallback';
  END IF;

  -- Collision walk: base, base_2 .. base_99, then an underscore and four
  -- random digits. Bounded, so a pathological namespace ends in a refusal
  -- the client already understands rather than a loop.
  v_candidate := v_base;
  v_n := 1;
  v_tries := 0;
  WHILE NOT public._community_handle_valid(v_candidate)
     OR EXISTS (
       SELECT 1 FROM public.community_profiles p
       WHERE p.handle = v_candidate AND p.user_id <> v_uid)
  LOOP
    v_n := v_n + 1;
    v_tries := v_tries + 1;
    IF v_tries > 120 THEN
      RAISE EXCEPTION USING message = 'unavailable';
    END IF;
    IF v_n <= 99 THEN
      v_candidate := rtrim(left(v_base, 20 - length(v_n::text) - 1), '_') || '_' || v_n::text;
    ELSE
      v_candidate := rtrim(left(v_base, 15), '_') || '_'
        || lpad((floor(random() * 10000))::int::text, 4, '0');
    END IF;
  END LOOP;

  RETURN jsonb_build_object('handle', v_candidate, 'source', v_source);
END $$;

REVOKE ALL ON FUNCTION public.community_handle_suggestion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_handle_suggestion() TO authenticated;

-- ─── Acceptance check (read-only) ──────────────────────────────────────────

DO $$
DECLARE
  v_vol "char";
BEGIN
  IF to_regprocedure('public.community_handle_suggestion()') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_handle_suggestion missing';
  END IF;
  IF to_regprocedure('public._community_handle_base(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base missing';
  END IF;
  IF to_regprocedure('public._community_handle_suggest_reserved()') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_suggest_reserved missing';
  END IF;

  -- The rate rail writes, so the RPC must be VOLATILE (migrate_167's lesson);
  -- the two helpers are pure and must be IMMUTABLE.
  SELECT p.provolatile INTO v_vol
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_handle_suggestion()');
  IF v_vol IS DISTINCT FROM 'v' THEN
    RAISE EXCEPTION 'acceptance failed: community_handle_suggestion is not VOLATILE';
  END IF;
  SELECT p.provolatile INTO v_vol
  FROM pg_proc p WHERE p.oid = to_regprocedure('public._community_handle_base(text)');
  IF v_vol IS DISTINCT FROM 'i' THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base is not IMMUTABLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('community_handle_suggestion', '_community_handle_base', '_community_handle_suggest_reserved')
      -- `proconfig IS NULL` named explicitly (hostile review 2026-09-11):
      -- `= ANY (NULL)` is NULL, not false, so a function with NO SET clause
      -- would otherwise slip through this check unseen.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_173 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.community_handle_suggestion()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_handle_suggestion is not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.community_handle_suggestion()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_handle_suggestion is executable by anon';
  END IF;
  IF has_function_privilege('authenticated', 'public._community_handle_base(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_handle_base(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base is executable by a client role';
  END IF;
  IF has_function_privilege('authenticated', 'public._community_handle_suggest_reserved()', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_handle_suggest_reserved()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_suggest_reserved is executable by a client role';
  END IF;

  -- The exclusion list carries the client's route and app words.
  IF NOT (ARRAY['app', 'settings', 'login', 'me', 'today'] <@ public._community_handle_suggest_reserved()) THEN
    RAISE EXCEPTION 'acceptance failed: the suggestion exclusion list is missing client words';
  END IF;

  -- The sanitiser, tested pure (no data involved).
  IF public._community_handle_base('John.Smith+gym') IS DISTINCT FROM 'john_smith' THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base(John.Smith+gym) is not john_smith';
  END IF;
  IF public._community_handle_base('  --ab-- ') IS NOT NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base admits a two-character base';
  END IF;
  IF public._community_handle_base('app') IS NOT NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base admits a reserved word';
  END IF;
  IF length(public._community_handle_base('abcdefghijklmnopqrstuvwxyz')) IS DISTINCT FROM 20 THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base does not cut to twenty';
  END IF;
  IF public._community_handle_base('sam.j.parker-1990') IS DISTINCT FROM 'sam_j_parker_1990' THEN
    RAISE EXCEPTION 'acceptance failed: _community_handle_base mishandles dots, dashes and digits';
  END IF;

  RAISE NOTICE 'migrate_173 acceptance: OK';
END $$;
