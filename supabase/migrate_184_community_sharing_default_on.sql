-- migrate_184_community_sharing_default_on.sql
--
-- Purpose:           Founder order 2026-09-26, verbatim: "Flip them all and
--                    I test with all. Make the decisions based on the best
--                    product. It is on for all users by default. New and
--                    existing they can turn it off if they want after. We
--                    need that in the privacy policy also" (register D194
--                    addendum 2). This file carries the SERVER half of
--                    "on by default" and the read-back the device needs;
--                    migrate_185 flips the existing rows.
--                      Part 1  `community_profiles.share_sessions` column
--                              default false -> true. `sessions_audience`
--                              keeps its column default 'followers' on
--                              purpose: every insert goes through
--                              community_upsert_profile (below), which
--                              sets the audience itself, so the column
--                              default is only a backstop, and the safe
--                              backstop for a row nobody clamped is the
--                              narrow one.
--                      Part 2  `community_upsert_profile(jsonb, boolean)`
--                              re-issued IN FULL from migrate_175 with two
--                              changes and nothing else (the guard
--                              `migrate184.guard.test.js` diffs the two
--                              bodies line by line): an omitted
--                              `share_sessions` on a NEW profile means ON
--                              (was off), and an omitted
--                              `sessions_audience` means 'everyone' for an
--                              adult and 'followers' for a minor (was
--                              'followers' for all). The minor rule is
--                              applied at the fallback itself because the
--                              existing clamp REFUSES 'everyone' from a
--                              minor; a plain 'everyone' fallback would
--                              have turned a minor's omitted key into an
--                              invalid_input refusal. An EXISTING profile
--                              is untouched by both: the merge block folds
--                              its stored values back into the payload
--                              before either fallback is read.
--                      Part 3  `community_get_me()` re-issued IN FULL from
--                              migrate_161 with two keys added to its
--                              result, `share_sessions` and
--                              `sessions_audience`, read from the caller's
--                              own row (NULL with no profile). Until now
--                              the device stored its own copy of the
--                              switch and never read the row back, so a
--                              phone could show sharing on while the row
--                              said off, and the server then refused every
--                              automatic post without a word (D194
--                              addendum, 2026-09-26). The client mirrors
--                              the row into the device store on each
--                              refresh unless a sharing change of its own
--                              is still waiting to publish.
--                    The server-side gate on automatic posts is unchanged:
--                    community_create_post still refuses an auto item when
--                    the ROW has sharing off, and a minor's audience is
--                    still clamped to followers.
--
-- Applied locally:   N/A - no local SQLite table; nothing in
--                    `src/lib/database.js` changes, `PRAGMA user_version`
--                    is untouched.
-- Applied remotely:  NO - written 2026-09-26. Waits for the founder's exact
--                    phrase "run against production" naming this file, then
--                    Claude-run through the Supabase connector under the
--                    checksum protocol (supabase/README status block is the
--                    live record).
-- Safe to re-run:    YES. ALTER COLUMN ... SET DEFAULT is idempotent;
--                    CREATE OR REPLACE FUNCTION replaces the body with the
--                    same text; the REVOKE/GRANT pairs are idempotent; the
--                    acceptance block is read-only.
-- Rollback:          Re-run migrate_175 Part 1 (community_upsert_profile)
--                    and migrate_161's community_get_me() definition, each
--                    exactly as written there, then:
--                      ALTER TABLE public.community_profiles
--                        ALTER COLUMN share_sessions SET DEFAULT false;
--                    A client on a build with the mirror reads a missing
--                    key as "no reading" and keeps its own stored value, so
--                    the rollback never breaks a device.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        161 (community_get_me), 170 (share_sessions and
--                    sessions_audience), 174 (_community_minor), 175
--                    (community_upsert_profile). Apply before 185.

-- ─── Part 1: the column default ─────────────────────────────────────────────

ALTER TABLE public.community_profiles
  ALTER COLUMN share_sessions SET DEFAULT true;

-- ─── Part 2: community_upsert_profile, migrate_175's body with two changes ──

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
  v_share_sessions := true;
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

-- ─── Part 3: community_get_me, migrate_161's body plus the two sharing keys ─

CREATE OR REPLACE FUNCTION public.community_get_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_p        public.community_profiles%ROWTYPE;
  v_card     jsonb;
  v_pending  int := 0;
  v_unseen   int := 0;
  v_connects int := 0;
  v_msgs     int := 0;
BEGIN
  v_card := public._community_profile_card(v_uid, v_uid);
  SELECT * INTO v_p FROM public.community_profiles WHERE user_id = v_uid;

  IF v_card IS NOT NULL THEN
    SELECT count(*) INTO v_pending
    FROM public.community_follows
    WHERE followee_id = v_uid AND state = 'requested';

    SELECT count(*) INTO v_unseen
    FROM public.community_activity
    WHERE user_id = v_uid AND seen_at IS NULL;

    SELECT count(*) INTO v_connects
    FROM public.community_connections c
    WHERE c.state = 'requested' AND c.requester_id <> v_uid
      AND (c.user_a = v_uid OR c.user_b = v_uid);

    -- Unread MESSAGES, in open conversations only, from the other person
    -- only, newer than this person's own read marker.
    SELECT count(*) INTO v_msgs
    FROM public.community_messages m
    JOIN public.community_conversations c ON c.id = m.conversation_id
    WHERE c.closed_at IS NULL
      AND (c.user_a = v_uid OR c.user_b = v_uid)
      AND m.sender_id <> v_uid
      AND m.created_at > coalesce(
        CASE WHEN c.user_a = v_uid THEN c.a_last_read_at ELSE c.b_last_read_at END,
        '-infinity'::timestamptz)
      AND NOT public._community_is_blocked(v_uid, m.sender_id);

    -- Security review 2026-09-06 (finding 1): every hub open self-heals the
    -- stored is_minor column from a fresh derivation, so a birthday or a
    -- corrected date of birth is never more than one open away from being
    -- enforced everywhere that column is read (find_people, gym summary,
    -- the profile card).
    UPDATE public.community_profiles
       SET last_active_at = now(),
           is_minor = public._community_minor(v_uid)
     WHERE user_id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'profile',                 v_card,
    'pending_requests',        v_pending,
    'unseen_activity',         v_unseen,
    'is_moderator',            public.community_is_moderator(),
    'is_minor',                public._community_minor(v_uid),
    'rules_version',           public._community_rules_version(),
    'accepted_rules_version',  v_p.rules_version,
    'pending_connect_requests', v_connects,
    'unseen_messages',         v_msgs,
    'connect_from',            coalesce(v_p.connect_from, 'anyone'),
    'open_to_partner',         coalesce(v_p.open_to_partner, false),
    'partner_prefs',           v_p.partner_prefs,
    'show_programmes',         coalesce(v_p.show_programmes, true),
    'tp_days',                 to_jsonb(v_p.tp_days),
    'tp_time_bands',           to_jsonb(v_p.tp_time_bands),
    'tp_sessions_band',        v_p.tp_sessions_band,
    'tp_staple_lifts',         to_jsonb(v_p.tp_staple_lifts),
    'tp_experience_band',      v_p.tp_experience_band,
    'tp_programme_key',        v_p.tp_programme_key,
    'tp_age_band',             v_p.tp_age_band,
    -- migrate_184 (register D194 addendum 2): the row's own sharing
    -- setting, so the device can mirror it. NULL when the caller has no
    -- profile; the client mirrors only a boolean.
    'share_sessions',          v_p.share_sessions,
    'sessions_audience',       v_p.sessions_audience
  );
END $$;

REVOKE ALL ON FUNCTION public.community_get_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_get_me() TO authenticated;

-- ─── Part 4: acceptance check (read-only) ──────────────────────────────────
--
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: the column default is true; both function bodies carry
-- their migrate_184 lines and the minor refusal is still in place; both
-- functions are executable by authenticated and not by anon.

DO $$
DECLARE
  v_default text;
  v_up      text;
  v_gm      text;
BEGIN
  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'community_profiles'
    AND column_name = 'share_sessions';
  IF v_default IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'acceptance failed: share_sessions default is %, expected true', v_default;
  END IF;

  v_up := pg_get_functiondef('public.community_upsert_profile(jsonb, boolean)'::regprocedure);
  IF position('v_share_sessions := true;' IN v_up) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile has no ON fallback for share_sessions';
  END IF;
  IF position('CASE WHEN v_minor THEN ''followers'' ELSE ''everyone'' END' IN v_up) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile has no minor-aware audience fallback';
  END IF;
  -- The minor refusal of an explicit 'everyone' is still in place.
  IF position('IF v_sessions_audience = ''everyone'' THEN' IN v_up) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the minor refusal of everyone is missing';
  END IF;

  v_gm := pg_get_functiondef('public.community_get_me()'::regprocedure);
  IF position('''share_sessions'',          v_p.share_sessions' IN v_gm) = 0
     OR position('''sessions_audience'',       v_p.sessions_audience' IN v_gm) = 0 THEN
    RAISE EXCEPTION 'acceptance failed: community_get_me does not return the sharing fields';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.community_upsert_profile(jsonb, boolean)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_upsert_profile(jsonb, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_upsert_profile grants are wrong';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_get_me()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.community_get_me()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_get_me grants are wrong';
  END IF;

  RAISE NOTICE 'migrate_184 acceptance: OK';
END $$;
