-- migrate_175_community_rules_gate_tolerant.sql
--
-- Purpose:           The Community rules gate tolerates an older client
--                    (founder order 2026-09-12, ruled by the lead on the
--                    delegation "decisions ... make them in what brings the
--                    best product"; register D160). `community_upsert_profile`
--                    required the client's `accept_rules_version` to EQUAL the
--                    server's `_community_rules_version()`, on create and on
--                    re-consent. Every Community build on the founder's own
--                    devices on 2026-09-12 (iOS 2.0.0+65, Android 3573 to
--                    3575; the store apps carry Community only from the next
--                    published build) carries rules text version 2 and sends
--                    2; migrate_174 moved the server to 3
--                    on 2026-09-11 22:34 UTC, so from that moment every
--                    profile create and edit from those builds was refused
--                    with `invalid_input` (hostile review OJ-REV-SQL-2 F6,
--                    which the lead wrongly judged safe by checking the Play
--                    build only). Part 2 of 174 was rolled back to `SELECT 2`
--                    as a stopgap at 14:33 UTC on 2026-09-12; no profile write
--                    had reached the server in the window.
--
--                    Part 1 re-issues `community_upsert_profile(jsonb,
--                    boolean)` byte-for-byte from migrate_170 lines 2597-2902
--                    with four marked changes, proved by
--                    src/__tests__/migrate175.rpcOnly.guard.test.js: the two
--                    equality gates become a range (1 up to the server's
--                    version plus one; an older client is accepted, a client
--                    one version ahead of a not-yet-applied migration is
--                    accepted, anything else is malformed), and the create
--                    path stores the version the person ACTUALLY accepted in
--                    `community_profiles.rules_version` and `consent_log`,
--                    not the server's. The consent record is therefore honest
--                    in every case, and `_community_require_rules`
--                    (migrate_161, unchanged) keeps raising `rules_outdated`
--                    on connect, message and training-profile share for a
--                    profile whose accepted version is below the current one;
--                    a re-consent at an older version than the one stored
--                    changes nothing (the existing `<` guard). An old build
--                    therefore keeps its profile, hub, gyms and boards, and
--                    is asked for the current rules on the acts that need
--                    them; the client half (same landing) shows an "update
--                    Volyume" line on the rules screen when the server's
--                    version is ahead of the text the build carries, instead
--                    of an accept button that cannot satisfy the server.
--
--                    Part 2 restores `_community_rules_version()` to 3 in the
--                    SAME transaction as the tolerant gate, so there is no
--                    moment at which any build is refused.
--
--                    Why not `>=` alone: an old build cannot consent to a
--                    text it cannot show, so consent is recorded at the
--                    version accepted and the acts that need the current
--                    text stay gated. Why plus one: the one realistic process
--                    gap (a build carrying a new constant shipping before its
--                    migration, as happened on 2026-09-10) is harmless
--                    instead of refusing every profile write.
--
-- Applied locally:   n/a (cloud-only objects; nothing in database.js)
-- Applied remotely:  NOT YET - runs under the founder's order of 2026-09-12
--                    ("just finish everything so it is ready when I build"),
--                    completing the batch the founder's exact phrase
--                    "run against production" (2026-09-11) authorised;
--                    Claude-run through the Supabase connector under the
--                    checksum protocol (supabase/README.md status block).
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION, REVOKE/GRANT are
--                    idempotent, and the acceptance block is read-only.
-- Rollback:          re-issue `community_upsert_profile(jsonb, boolean)` from
--                    migrate_170 lines 2597-2905 (the exact-equality gates and
--                    grants) and `_community_rules_version()` from migrate_174
--                    (`SELECT 3`) or migrate_161 (`SELECT 2`). No table
--                    changes.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (community_profiles, consent_log, the helpers), 161
--                    (_community_rules_version, _community_require_rules),
--                    170 (the function re-issued here), 174 (the version 3
--                    ruling this restores).

-- ─── Part 1: the tolerant gate ───────────────────────────────────────────────
-- migrate_170 lines 2597-2902 carried forward byte-for-byte; the four marked
-- migrate_175 changes are the ONLY differences (guard-proved).

CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb, _remove_shared boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := public._community_caller();
  v_existing   public.community_profiles%ROWTYPE;
  v_is_new     boolean;
  v_handle     text;
  v_display    text;
  v_bio        text;
  v_avatar     text;
  v_styles     text[];
  v_goal       text;
  v_setting    text;
  v_area_label text;
  v_area_key   text;
  v_gym_label  text;
  v_gym_key    text;
  v_visibility text;
  v_minor      boolean;
  v_accept     int;
  v_style      text;
  v_discipline_keys text[]; -- migrate_170
  v_dk         text;        -- migrate_170
  v_share_sessions    boolean; -- migrate_170 part B
  v_sessions_audience text;    -- migrate_170 part B
  v_c_planned_per_week int;    -- migrate_170 part B
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  SELECT * INTO v_existing FROM public.community_profiles WHERE user_id = v_uid;
  v_is_new := NOT FOUND;
  IF NOT v_is_new THEN
    _p := jsonb_build_object(
      'handle',        v_existing.handle,
      'display_name',  v_existing.display_name,
      'avatar_preset', v_existing.avatar_preset,
      'bio',           v_existing.bio,
      'styles',        to_jsonb(v_existing.styles),
      'goal',          v_existing.goal,
      'setting',       v_existing.setting,
      'area_label',    v_existing.area_label,
      'gym_label',     v_existing.gym_label,
      'visibility',    v_existing.visibility,
      -- migrate_170: same "existing value survives an omitted key" rule.
      'discipline_keys', to_jsonb(coalesce(v_existing.discipline_keys, ARRAY[]::text[])),
      -- migrate_170 part B: same rule, for the three new fields.
      'share_sessions',    coalesce(v_existing.share_sessions, false),
      'sessions_audience', coalesce(v_existing.sessions_audience, 'followers'),
      'c_planned_per_week', v_existing.c_planned_per_week
    ) || coalesce(_p, '{}'::jsonb);
  END IF;

  IF NOT v_is_new AND v_existing.status = 'suspended' THEN
    RAISE EXCEPTION USING message = 'profile_suspended';
  END IF;

  v_handle := lower(btrim(coalesce(_p ->> 'handle', '')));
  IF NOT public._community_handle_valid(v_handle) THEN
    RAISE EXCEPTION USING message = 'handle_invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.community_profiles
    WHERE handle = v_handle AND user_id <> v_uid
  ) THEN
    RAISE EXCEPTION USING message = 'handle_taken';
  END IF;
  IF NOT v_is_new AND v_handle <> v_existing.handle THEN
    IF v_existing.handle_changed_at IS NOT NULL
       AND v_existing.handle_changed_at > now() - interval '30 days' THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  v_display := public._community_clean_text(btrim(coalesce(_p ->> 'display_name', '')));
  IF v_display IS NULL OR length(v_display) < 1 OR length(v_display) > 40 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_bio := nullif(btrim(coalesce(_p ->> 'bio', '')), '');
  IF v_bio IS NOT NULL THEN
    v_bio := public._community_clean_text(v_bio);
    IF length(v_bio) > 160 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
  END IF;

  v_avatar := nullif(btrim(coalesce(_p ->> 'avatar_preset', '')), '');
  IF v_avatar IS NOT NULL AND v_avatar !~ '^[a-z0-9_]{1,32}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_styles := ARRAY[]::text[];
  IF _p ? 'styles' AND jsonb_typeof(_p -> 'styles') = 'array' THEN
    FOR v_style IN SELECT jsonb_array_elements_text(_p -> 'styles') LOOP
      v_style := lower(btrim(coalesce(v_style, '')));
      IF v_style = '' THEN CONTINUE; END IF;
      IF v_style !~ '^[a-z0-9_]{2,32}$' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF NOT (v_style = ANY (v_styles)) THEN v_styles := v_styles || v_style; END IF;
    END LOOP;
  END IF;
  IF array_length(v_styles, 1) > 3 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;

  -- migrate_170: discipline_keys, same shape of parsing as styles above,
  -- validated against the taxonomy (and the <= 3 cap) by the one helper.
  v_discipline_keys := ARRAY[]::text[];
  -- reviewer 2026-09-10: a `discipline_keys` key that is present but is not
  -- an array used to fall straight through to the empty array, i.e. it
  -- silently ERASED the stored keys instead of refusing. Refuse instead;
  -- losing a person's saved choices to a malformed payload is worse than an
  -- error. (`styles` a few lines above has the same shape, pre-existing and
  -- deliberately left alone here.)
  IF _p ? 'discipline_keys' AND jsonb_typeof(_p -> 'discipline_keys') <> 'array' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _p ? 'discipline_keys' AND jsonb_typeof(_p -> 'discipline_keys') = 'array' THEN
    FOR v_dk IN SELECT jsonb_array_elements_text(_p -> 'discipline_keys') LOOP
      v_dk := lower(btrim(coalesce(v_dk, '')));
      IF v_dk = '' THEN CONTINUE; END IF;
      IF NOT (v_dk = ANY (v_discipline_keys)) THEN v_discipline_keys := v_discipline_keys || v_dk; END IF;
    END LOOP;
  END IF;
  IF NOT public._community_discipline_key_ok(v_discipline_keys) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_goal := nullif(btrim(coalesce(_p ->> 'goal', '')), '');
  IF v_goal IS NOT NULL
     AND v_goal NOT IN ('build_muscle', 'get_stronger', 'general_fitness', 'returning') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_setting := nullif(btrim(coalesce(_p ->> 'setting', '')), '');
  IF v_setting IS NOT NULL
     AND v_setting NOT IN ('commercial_gym', 'home_gym', 'minimal_kit') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_area_label := nullif(btrim(coalesce(_p ->> 'area_label', '')), '');
  IF v_area_label IS NOT NULL THEN
    v_area_label := public._community_clean_text(v_area_label);
    IF length(v_area_label) > 40 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
    v_area_key := nullif(public._community_fold(v_area_label), '');
  END IF;

  IF v_existing.gym_id IS NOT NULL THEN
    v_gym_label := v_existing.gym_label;
    v_gym_key   := v_existing.gym_key;
  ELSE
    v_gym_label := nullif(btrim(coalesce(_p ->> 'gym_label', '')), '');
    IF v_gym_label IS NOT NULL THEN
      v_gym_label := public._community_clean_text(v_gym_label);
      IF length(v_gym_label) > 60 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      v_gym_key := nullif(coalesce(v_area_key, '') || ':' || public._community_fold(v_gym_label), ':');
    END IF;
  END IF;

  v_visibility := coalesce(nullif(btrim(coalesce(_p ->> 'visibility', '')), ''), 'public');
  IF v_visibility NOT IN ('public', 'followers') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_minor := public._community_minor(v_uid);
  IF v_minor THEN v_visibility := 'followers'; END IF;

  -- migrate_170 part B (phase3 spec section 1): share_sessions/
  -- sessions_audience, same "omit key = unchanged" contract as every other
  -- optional field above (the merge-defaults block already folded the
  -- existing values back into _p when the key was omitted).
  v_share_sessions := false;
  IF jsonb_typeof(_p -> 'share_sessions') = 'boolean' THEN
    v_share_sessions := (_p ->> 'share_sessions')::boolean;
  END IF;

  v_sessions_audience := coalesce(nullif(btrim(coalesce(_p ->> 'sessions_audience', '')), ''), 'followers');
  IF v_sessions_audience NOT IN ('followers', 'groups', 'everyone') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  -- migrate_170 part B (phase3 spec section 1, blueprint section 8): a
  -- minor never gets an audience wider than their followers. 'everyone' is
  -- refused outright rather than silently rewritten - the same "refuse,
  -- never quietly erase/rewrite a minor's choice" posture the discipline_
  -- keys refusal above set - because it is the one value a minor must never
  -- reach even transiently; anything else a minor sends (including
  -- 'groups', which they can never actually populate: community_group_join/
  -- _create already refuse a minor) is simply forced down to 'followers'.
  IF v_minor THEN
    IF v_sessions_audience = 'everyone' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_sessions_audience := 'followers';
  END IF;

  -- migrate_170 part B: c_planned_per_week, the same clamp-or-drop posture
  -- community_update_training_profile already uses for its own counters
  -- (out-of-range or malformed is dropped to NULL, never a hard refusal -
  -- a stale build sending one bad field should not lose the whole call).
  v_c_planned_per_week := NULL;
  IF jsonb_typeof(_p -> 'c_planned_per_week') = 'number' THEN
    -- reviewer 2026-09-10 (B): upper bound 14, not 21. This number is only
    -- ever summed into the group's "Together" planned figure, and a bound
    -- nobody can plan to is a bound that only ever makes that line read
    -- wrong. Two sessions a day, every day, is already past any plan this
    -- engine generates.
    v_c_planned_per_week := greatest(0, least((_p ->> 'c_planned_per_week')::int, 14));
  END IF;

  PERFORM public._community_rate_check(v_uid, 'profile_upsert', 5, 5);

  IF v_is_new THEN
    IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_accept := (_p ->> 'accept_rules_version')::int;
    -- migrate_175: the gate tolerates an OLDER client (its build carries an
    -- earlier rules text; the version it accepted is stored below, and the
    -- acts that need the current text keep raising rules_outdated through
    -- _community_require_rules) and a client ONE version ahead (a build
    -- shipped before its migration). Anything else is malformed.
    IF v_accept < 1 OR v_accept > public._community_rules_version() + 1 THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    INSERT INTO public.community_profiles (
      user_id, handle, display_name, avatar_preset, bio, styles, discipline_keys,
      goal, setting, area_label, area_key, gym_label, gym_key, visibility, is_minor,
      status, rules_version, last_active_at,
      share_sessions, sessions_audience, c_planned_per_week)
    VALUES (
      v_uid, v_handle, v_display, v_avatar, v_bio, v_styles, v_discipline_keys,
      v_goal, v_setting, v_area_label, v_area_key, v_gym_label, v_gym_key,
      v_visibility, v_minor, 'active', v_accept, now(), -- migrate_175: the version accepted
      v_share_sessions, v_sessions_audience, v_c_planned_per_week);

    INSERT INTO public.consent_log
      (user_id, consent_type, granted, granted_at, notice_version)
    VALUES (v_uid, 'community_visibility', true, now(),
            v_accept::text); -- migrate_175: the version accepted

    PERFORM public._community_convert_partnerships(v_uid);
  ELSE
    UPDATE public.community_profiles SET
      handle            = v_handle,
      handle_changed_at = CASE WHEN v_handle <> v_existing.handle THEN now()
                               ELSE v_existing.handle_changed_at END,
      display_name      = v_display,
      avatar_preset     = v_avatar,
      bio               = v_bio,
      styles            = v_styles,
      discipline_keys   = v_discipline_keys,
      goal              = v_goal,
      setting           = v_setting,
      area_label        = v_area_label,
      area_key          = v_area_key,
      gym_label         = v_gym_label,
      gym_key           = v_gym_key,
      visibility        = v_visibility,
      is_minor          = v_minor,
      share_sessions      = v_share_sessions,
      sessions_audience   = v_sessions_audience,
      c_planned_per_week  = v_c_planned_per_week,
      last_active_at    = now()
    WHERE user_id = v_uid;

    IF _p ? 'accept_rules_version' THEN
      IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_accept := (_p ->> 'accept_rules_version')::int;
      -- migrate_175: same tolerance as the create path above; a re-consent
      -- at an older version than the one already stored changes nothing.
      IF v_accept < 1 OR v_accept > public._community_rules_version() + 1 THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      IF coalesce(v_existing.rules_version, 0) < v_accept THEN
        UPDATE public.community_profiles SET rules_version = v_accept WHERE user_id = v_uid;
        INSERT INTO public.consent_log
          (user_id, consent_type, granted, granted_at, notice_version)
        VALUES (v_uid, 'community_visibility', true, now(), v_accept::text);
      END IF;
    END IF;

    PERFORM public._community_convert_partnerships(v_uid);
  END IF;

  PERFORM public._community_populate_place_from_gym(v_uid);

  -- migrate_170 part B (phase3 spec section 1): "Remove the items already
  -- shared?" turning share_sessions off with removal requested deletes
  -- every auto item this account posted, mirroring community_delete_post's
  -- own cleanup (comments, activity) since a bulk delete here bypasses that
  -- single-post RPC; community_reactions and community_post_groups cascade
  -- via their post_id foreign key. A no-op (nothing to delete, or sharing
  -- was not actually turned off) is harmless, so this never needs an extra
  -- guard beyond the two conditions in the IF.
  IF _remove_shared AND NOT v_share_sessions THEN
    DELETE FROM public.community_comments
    WHERE target_kind = 'post'
      AND target_id IN (SELECT id FROM public.community_posts WHERE author_id = v_uid AND auto = true);
    DELETE FROM public.community_activity
    WHERE target_kind = 'post'
      AND target_id IN (SELECT id FROM public.community_posts WHERE author_id = v_uid AND auto = true);
    DELETE FROM public.community_posts WHERE author_id = v_uid AND auto = true;
  END IF;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb, boolean) TO authenticated;

-- ─── Part 2: the rules version the server requires, restored to 3 ───────────
-- migrate_174 part 2 again, in the same transaction as the gate above.

CREATE OR REPLACE FUNCTION public._community_rules_version()
RETURNS int
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 3;
$$;

-- ─── Acceptance check (read-only) ──────────────────────────────────────────

DO $$
DECLARE
  v_vol "char";
  v_def text;
BEGIN
  IF to_regprocedure('public.community_upsert_profile(jsonb, boolean)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile(jsonb, boolean) missing';
  END IF;
  IF to_regprocedure('public.community_upsert_profile(jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'acceptance failed: a one-argument community_upsert_profile overload exists';
  END IF;

  SELECT p.provolatile INTO v_vol
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_upsert_profile(jsonb, boolean)');
  IF v_vol IS DISTINCT FROM 'v' THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile is not VOLATILE';
  END IF;
  SELECT p.provolatile INTO v_vol
  FROM pg_proc p WHERE p.oid = to_regprocedure('public._community_rules_version()');
  IF v_vol IS DISTINCT FROM 'i' THEN
    RAISE EXCEPTION 'acceptance failed: _community_rules_version is not IMMUTABLE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('community_upsert_profile', '_community_rules_version', '_community_require_rules')
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_175 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.community_upsert_profile(jsonb, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile is not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.community_upsert_profile(jsonb, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile is executable by anon';
  END IF;

  -- The live body carries the tolerant range twice (create and re-consent)
  -- and the exact-equality gate nowhere.
  v_def := pg_get_functiondef(to_regprocedure('public.community_upsert_profile(jsonb, boolean)'));
  IF (SELECT count(*) FROM regexp_matches(v_def, 'v_accept > public\._community_rules_version\(\) \+ 1', 'g')) <> 2 THEN
    RAISE EXCEPTION 'acceptance failed: the tolerant gate is not present exactly twice';
  END IF;
  IF v_def LIKE '%v_accept IS DISTINCT FROM public._community_rules_version()%' THEN
    RAISE EXCEPTION 'acceptance failed: the exact-equality gate is still present';
  END IF;
  IF v_def NOT LIKE '%''active'', v_accept, now(),%' THEN
    RAISE EXCEPTION 'acceptance failed: the create path does not store the version accepted';
  END IF;

  -- The act-level gate is untouched and still compares against the current version.
  v_def := pg_get_functiondef(to_regprocedure('public._community_require_rules(public.community_profiles)'));
  IF v_def NOT LIKE '%< public._community_rules_version()%' THEN
    RAISE EXCEPTION 'acceptance failed: _community_require_rules no longer gates on the current version';
  END IF;

  IF public._community_rules_version() IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'acceptance failed: _community_rules_version is not 3';
  END IF;

  RAISE NOTICE 'migrate_175 acceptance: OK';
END $$;
