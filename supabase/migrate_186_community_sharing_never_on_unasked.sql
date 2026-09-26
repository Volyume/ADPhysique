-- migrate_186_community_sharing_never_on_unasked.sql
--
-- Purpose:           Register D212 (lead ruling under the founder's
--                    delegation of 2026-09-26, "Make the decisions that
--                    bring the absolute best product for end users"). Found
--                    the same day, after migrate_184 was applied: the
--                    Community Join screen created a profile WITHOUT the
--                    person's "Share what I did" choice and published the
--                    choice afterwards only when it was on. Before 184 an
--                    omitted choice meant off, so switching it off before
--                    "Create profile" worked; 184 made an omitted choice on
--                    a NEW profile mean ON, so from 13:49 UTC a person who
--                    switched sharing off on that screen would have been
--                    stored as sharing, and the phone then mirrors the
--                    server. No profile was created in that window (read-only
--                    count 2026-09-26: still the two test profiles, newest
--                    13 September). The app fix sends the choice with the
--                    create; this file protects the builds already
--                    installed: `community_upsert_profile(jsonb, boolean)`
--                    re-issued IN FULL from migrate_184 with one change, an
--                    omitted `share_sessions` on a NEW profile is OFF (the
--                    guard `migrate186.guard.test.js` diffs the two bodies
--                    line by line). The on-by-default order (D194) is
--                    unchanged for every person: the app shows the switch
--                    on and sends on (the onboarding step and the Join
--                    screen both do); a person under 18 starts off (D212,
--                    ICO Children's Code standard 7). The audience fallback
--                    (everyone for an adult, followers for a minor), the
--                    minor refusal of everyone and the column default stay
--                    exactly as 184 left them; an EXISTING profile is
--                    untouched (the merge block folds its stored values
--                    back into the payload before either fallback is read).
--
-- Applied locally:   N/A - no local SQLite table; nothing in
--                    `src/lib/database.js` changes, `PRAGMA user_version`
--                    is untouched.
-- Applied remotely:  NO - written 2026-09-26. Waits for the founder's exact
--                    phrase "run against production" naming this file, then
--                    Claude-run through the Supabase connector under the
--                    checksum protocol (supabase/README status block is the
--                    live record).
-- Safe to re-run:    YES. CREATE OR REPLACE FUNCTION replaces the body with
--                    the same text; the REVOKE/GRANT pair is idempotent; the
--                    acceptance block is read-only.
-- Rollback:          Re-run migrate_184 Part 2 (community_upsert_profile)
--                    exactly as written there.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        184 (the function this re-issues), 174
--                    (_community_minor), 175 (the rules gate it carries).

-- ─── Part 1: community_upsert_profile, migrate_184's body with one change ───

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
  -- migrate_184 (founder order 2026-09-26, register D194 addendum 2):
  -- "It is on for all users by default." An omitted key on a NEW profile
  -- now means ON. An existing profile never reaches this fallback: the
  -- merge block above folded its stored value back into _p.
  -- migrate_186 (register D212, 2026-09-26): an omitted key on a NEW
  -- profile is OFF again. The default ON lives in the app, which shows the
  -- switch on (off for a person under 18) and now sends the choice with the
  -- create; a build that omits the key is one whose Join screen published
  -- the choice only when it was on, so for it an omitted key means the
  -- person switched sharing off. Sharing is never switched on by the server
  -- without the person's own on.
  v_share_sessions := false;
  IF jsonb_typeof(_p -> 'share_sessions') = 'boolean' THEN
    v_share_sessions := (_p ->> 'share_sessions')::boolean;
  END IF;

  -- migrate_184: an omitted audience on a NEW profile is 'everyone' for an
  -- adult and 'followers' for a minor. Minor-aware HERE, not only in the
  -- clamp below, because the clamp REFUSES 'everyone' from a minor: a
  -- plain 'everyone' fallback would turn a minor's omitted key into an
  -- invalid_input refusal instead of a followers-only profile.
  v_sessions_audience := coalesce(nullif(btrim(coalesce(_p ->> 'sessions_audience', '')), ''),
                                  CASE WHEN v_minor THEN 'followers' ELSE 'everyone' END);
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
    -- migrate_175: the record attests only to a notice the server has
    -- published (UK GDPR Article 7 evidence): a build one version ahead is
    -- accepted above but recorded at the current version, and re-accepts
    -- once when its migration lands.
    v_accept := least(v_accept, public._community_rules_version());

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
      v_accept := least(v_accept, public._community_rules_version()); -- migrate_175: as above
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

-- ─── Part 2: acceptance check (read-only) ──────────────────────────────────
--
-- Expect: the new-profile fallback for share_sessions is off; the audience
-- fallback, the minor refusal and the grants are as 184 left them.

DO $$
DECLARE
  v_up text;
BEGIN
  v_up := pg_get_functiondef('public.community_upsert_profile(jsonb, boolean)'::regprocedure);
  IF position('v_share_sessions := false;' IN v_up) = 0
     OR position('v_share_sessions := true;' IN v_up) > 0 THEN
    RAISE EXCEPTION 'acceptance failed: the new-profile share_sessions fallback is not off';
  END IF;
  IF position('CASE WHEN v_minor THEN ''followers'' ELSE ''everyone'' END' IN v_up) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the minor-aware audience fallback is missing';
  END IF;
  IF position('IF v_sessions_audience = ''everyone'' THEN' IN v_up) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the minor refusal of everyone is missing';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_upsert_profile(jsonb, boolean)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_upsert_profile(jsonb, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile grants are wrong';
  END IF;
  RAISE NOTICE 'migrate_186 acceptance: OK';
END $$;
