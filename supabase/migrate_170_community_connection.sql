-- migrate_170_community_connection.sql
--
-- Purpose:           PART A of the Community connection/consistency revamp
--                     (authority `docs/communities-revamp-2026-09-10/
--                     20-BLUEPRINT.md` sections 3, 4 (profile-strip rule
--                     only), 7 and 8; `21-PHASE1-SPEC.md` section 5 "Honest
--                     gaps carried to phase 2"). Phase 2 of the blueprint's
--                     section 11 build order: the discipline taxonomy, the
--                     discipline and age-band cohorts, the counters other
--                     people's profile cards were missing, and one summary
--                     RPC for the Hub. Part B (ambient sharing, Together,
--                     Respect everyone, the daily digest) is a SEPARATE
--                     migration (170 part B, or 171) and is NOT in this
--                     file.
--
--                     1. `community_profiles.discipline_keys text[]` (up to
--                        three, from a fixed 15-value taxonomy), validated
--                        by a new IMMUTABLE helper `_community_discipline_
--                        key_ok` and labelled in British English by
--                        `_community_discipline_label`. `community_upsert_
--                        profile` re-issued to accept `discipline_keys`
--                        inside its existing `_p jsonb` payload, on the
--                        SAME "omit the key to leave it unchanged" contract
--                        every other optional field on that RPC already
--                        has (the styles array is the model: absent key =
--                        untouched, explicit array = replaces it).
--                     2. `_community_profile_card` re-issued: always
--                        returns `discipline_keys`/`discipline_labels`
--                        under the existing v_viewable gate (same gate
--                        `styles` uses), and now ALSO returns the nine
--                        `c_*` consistency counters migrate_165 added to
--                        the table, but ONLY when the OWNER's
--                        `share_consistency` is true, `status = 'active'`
--                        and `is_minor = false` - otherwise every counter
--                        key is present and null. This is the "counters on
--                        other people's profile cards" gap 21-PHASE1-
--                        SPEC.md section 5 named and explicitly deferred to
--                        this migration (lane B STOP, 2026-09-10). Nothing
--                        else about the person is added to the card.
--                     3. `community_dimension` gains two `_kind` values:
--                        `discipline` (membership = active, non-minor,
--                        public profiles whose discipline_keys contains
--                        the key) and `age_band` (reciprocal: the caller
--                        must share their own tp_age_band AND the
--                        requested key must equal it, else the function
--                        returns the same empty shape 'programme' already
--                        returns - never an error, never another band's
--                        roster). `programme` keeps returning empty.
--                     4. New internal helper `_community_cohort_stats`
--                        computes `member_count`, `trained_today_count`
--                        and a a to-three-person `sample` for a
--                        (kind, key) cohort, reusing the exact
--                        `c_last_trained_day = _today` day-level test
--                        `community_board` (migrate_165/169) already uses
--                        for "trained today". `community_dimensions_me` is
--                        DROPped and re-created taking a new `_today`
--                        parameter (the board already requires one for the
--                        same reason: "today" is the caller's LOCAL day,
--                        never the server's `now()::date`), so every row
--                        it returns - the existing style/gym/area rows
--                        (now sourced from the same helper instead of a
--                        second, separately-computed count) plus one new
--                        row per discipline key the caller holds and one
--                        new reciprocal age-band row - carries
--                        member_count/trained_today_count/sample. Minors
--                        are excluded from every count and every sample by
--                        the helper's own WHERE clause (`is_minor = false`
--                        is never conditional).
--                     5. `community_board` re-issued: adds scopes `area`,
--                        `style`, `discipline` and `age_band` to the
--                        existing `gym`/`following`/`group`/`everyone` set.
--                        `style` and `discipline` require an explicit
--                        `_scope_key` (a profile can hold up to three of
--                        either, so there is no single implicit "yours"
--                        the way there is for gym/area); `area` falls back
--                        to the caller's own `area_key` exactly like `gym`
--                        falls back to the caller's own `gym_id`;
--                        `age_band` requires the caller to already share
--                        their own tp_age_band (else `not_allowed`, the
--                        same refusal shape the `group` scope already
--                        uses when the caller is not a member) and always
--                        means the caller's own band. Body is otherwise
--                        BYTE-IDENTICAL to migrate_169's fix: same
--                        windows, same small-group threshold
--                        (`threshold_met: count >= 8`), same keyset
--                        paging, same `u.x` alias (never migrate_165's
--                        `x.*` bug), same own-row return, same rate rail.
--                     6. New `community_hub_summary(_today)`: one call
--                        returning `{cohorts: [...], groups: [...]}` for
--                        the caller's gym, area, up to three styles, up to
--                        three disciplines, age band (only while shared)
--                        and the groups they are a MEMBER of (not
--                        requested/invited) - each cohort/group carrying
--                        member_count/trained_today_count/sample, built on
--                        the same `_community_cohort_stats` helper
--                        `community_dimensions_me` now uses, so the two
--                        callers can never disagree about who counts. Rate-
--                        railed and VOLATILE (it calls
--                        `_community_rate_check`, which writes - the exact
--                        migrate_167 lesson: a function that calls it must
--                        never be STABLE/IMMUTABLE, or PostgREST forces a
--                        read-only transaction and every call fails on the
--                        rate check's own INSERT).
--                     7. `community_find_people` DROPped and re-created
--                        with a new trailing `_discipline text DEFAULT
--                        NULL` parameter: a HARD filter (narrows the
--                        candidate pool in the WHERE clause), not a scored
--                        signal, matching how `_filters`' own hard filters
--                        (days/bands/goal/age_band) already work there.
--                        `delete_user_data()` needs no change: no new
--                        table, and `community_profiles` is already
--                        deleted whole-row, taking `discipline_keys` with
--                        it.
--
--                     Every re-issued or new function keeps the standing
--                     shape: SECURITY DEFINER, `SET search_path = public,
--                     pg_temp`, no STABLE/IMMUTABLE on anything that calls
--                     `_community_rate_check` (migrate_167's lesson),
--                     revoked from PUBLIC and anon (helpers ALSO revoked
--                     from authenticated, never granted), granted to
--                     authenticated only for the public RPCs.
--
-- Applied locally:   N/A. Community has no local SQLite table (SD-13,
--                     online-first); nothing in src/lib/database.js or
--                     PRAGMA user_version changes.
--
-- Applied remotely:  NO - WRITTEN, NOT APPLIED. This file waits for the
--                     founder's exact phrase "run against production" for
--                     the batch that carries it (CLAUDE.md section 2
--                     "Database schema"; supabase/README.md status block).
--                     Nothing here has reached EU-Dublin. DEPENDS ON 160,
--                     161, 162, 163, 164, 165, 167 and 169; must never run
--                     before any of them (it re-issues functions each of
--                     those last touched).
--
-- Safe to re-run:    YES. `ADD COLUMN IF NOT EXISTS`; the discipline_keys
--                     CHECK is added inside a `DO $$ ... EXCEPTION WHEN
--                     duplicate_object THEN NULL; END $$;` block; the new
--                     index is `CREATE INDEX IF NOT EXISTS`; every
--                     function is `CREATE OR REPLACE FUNCTION`; the two
--                     functions whose PARAMETER LIST changes
--                     (`community_dimensions_me`, `community_find_people`)
--                     are preceded by a `DO $$ ... DROP FUNCTION IF EXISTS
--                     %I.%I(%s) CASCADE ... END $$;` block that
--                     introspects `pg_proc`/`pg_get_function_identity_
--                     arguments` for whatever signature is CURRENTLY
--                     installed and drops exactly that - the same pattern
--                     migrate_163 and migrate_164 already use for this
--                     exact reason, so a second run finds the new
--                     signature already installed, drops it, and recreates
--                     the identical thing. Re-running changes nothing.
--
-- Rollback:          ALTER TABLE public.community_profiles DROP COLUMN IF
--                       EXISTS discipline_keys; (also drops its CHECK and
--                       the GIN index)
--                     DROP FUNCTION IF EXISTS public._community_discipline_key_ok(text[]);
--                     DROP FUNCTION IF EXISTS public._community_discipline_label(text);
--                     DROP FUNCTION IF EXISTS public._community_cohort_stats(uuid, text, text, text);
--                     DROP FUNCTION IF EXISTS public.community_hub_summary(text);
--                     DROP FUNCTION IF EXISTS public.community_dimensions_me(text);
--                     DROP FUNCTION IF EXISTS public.community_find_people(text, text, integer, jsonb, text);
--                     then re-apply migrate_164's `_community_profile_card`
--                     and `community_dimension`, migrate_163's
--                     `community_upsert_profile`, migrate_160's
--                     `community_dimensions_me()` (no-arg), migrate_169's
--                     `community_board` and migrate_164's
--                     `community_find_people` (4-arg) to restore their
--                     pre-170 bodies (CREATE OR REPLACE means the LATEST
--                     definition wins until a later file replaces it again
--                     - there is no automatic revert).
--
-- GDPR note:         `discipline_keys` is a new voluntary, self-declared
--                     identity fact on the SAME consent rail every other
--                     Community profile field already rides
--                     (`community_visibility`, Article 6(1)(a), recorded
--                     at `community_upsert_profile` time) - it is not a
--                     new consent TYPE, and it is never inferred, only
--                     chosen. It carries no Article 9 health data: the
--                     taxonomy is fifteen closed identity labels, never a
--                     free-text field, and the six physique-adjacent
--                     values (bodybuilding, mens_physique, classic_
--                     physique, womens_physique, figure, bikini) are body-
--                     adjacent but not body DATA - no measurement, weight
--                     or size ever accompanies them here or anywhere in
--                     Community. This migration does not implement the
--                     blueprint's calm-mode/open-ED-flag withholding of a
--                     person's OWN physique-division cohort pages
--                     (section 8, Q1b): that is the viewer's own client
--                     choosing not to open/render that page for
--                     themselves, which needs no server support - the
--                     server has no reason to know a viewer's calm-mode
--                     state to serve a `discipline` cohort to everyone
--                     ELSE. The consistency counters this migration
--                     exposes on OTHER people's profile cards are gated
--                     by the SAME `share_consistency` toggle and consent
--                     migrate_165 already captured; this file enforces
--                     that existing choice on a surface (someone else's
--                     card) that previously never read it, and adds no
--                     new toggle. Minors are excluded from every count,
--                     sample and board row this migration touches by the
--                     same `is_minor = false` predicate already used
--                     everywhere else in Community, unconditionally.
--
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1: community_profiles.discipline_keys ──────────────────────────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS discipline_keys text[] NOT NULL DEFAULT '{}';

-- ─── Part 2: discipline taxonomy helpers ─────────────────────────────────
--
-- Q1/Q1b (20-BLUEPRINT.md section 12): the fifteen founder-ruled keys,
-- fixed snake_case, British English labels. No adaptive/para tag on
-- purpose (self-declaring it would disclose disability, special-category
-- data, in a social profile).

-- Returns true iff `_keys` has at most three elements and every element is
-- one of the fifteen taxonomy keys. Used both as the column CHECK below and
-- inside community_upsert_profile/community_find_people/community_board,
-- so the taxonomy list itself exists exactly once in this file.
CREATE OR REPLACE FUNCTION public._community_discipline_key_ok(_keys text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _keys IS NOT NULL
    AND coalesce(array_length(_keys, 1), 0) <= 3
    AND NOT EXISTS (
      SELECT 1 FROM unnest(_keys) AS k
      WHERE k <> ALL (ARRAY[
        'bodybuilding', 'mens_physique', 'classic_physique', 'womens_physique',
        'figure', 'bikini', 'wellness', 'powerlifting', 'olympic_weightlifting',
        'strongman', 'crossfit_functional', 'calisthenics', 'hybrid',
        'sport_sc', 'general_strength'
      ]::text[])
    );
$$;

REVOKE ALL ON FUNCTION public._community_discipline_key_ok(text[]) FROM PUBLIC, anon, authenticated;

-- British English label for one discipline key. NULL for anything outside
-- the taxonomy (the caller already refused that at save time via the
-- helper above; this never has to raise).
CREATE OR REPLACE FUNCTION public._community_discipline_label(_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE _key
    WHEN 'bodybuilding'          THEN 'Bodybuilding'
    WHEN 'mens_physique'         THEN 'Men''s physique'
    WHEN 'classic_physique'      THEN 'Classic physique'
    WHEN 'womens_physique'       THEN 'Women''s physique'
    WHEN 'figure'                THEN 'Figure'
    WHEN 'bikini'                THEN 'Bikini'
    WHEN 'wellness'              THEN 'Wellness'
    WHEN 'powerlifting'          THEN 'Powerlifting'
    WHEN 'olympic_weightlifting' THEN 'Olympic weightlifting'
    WHEN 'strongman'             THEN 'Strongman and strongwoman'
    WHEN 'crossfit_functional'   THEN 'CrossFit and functional fitness'
    WHEN 'calisthenics'          THEN 'Calisthenics'
    WHEN 'hybrid'                THEN 'Hybrid (lifting and endurance)'
    WHEN 'sport_sc'              THEN 'Sport strength and conditioning'
    WHEN 'general_strength'      THEN 'General strength and fitness'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public._community_discipline_label(text) FROM PUBLIC, anon, authenticated;

-- The CHECK itself. Added here, AFTER the helper it calls exists, inside
-- the standard duplicate_object-tolerant block every other named CHECK in
-- this migration family uses.
DO $$ BEGIN
  ALTER TABLE public.community_profiles
    ADD CONSTRAINT community_profiles_discipline_keys_check
    CHECK (public._community_discipline_key_ok(discipline_keys));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Same treatment styles already gets: a GIN index for the `= ANY`/`&&`
-- membership queries community_dimension, community_board,
-- community_find_people and _community_cohort_stats all run against it.
CREATE INDEX IF NOT EXISTS community_profiles_discipline_keys_idx
  ON public.community_profiles USING gin (discipline_keys);

-- ─── Part 3: community_upsert_profile re-issued (discipline_keys) ───────
--
-- Body identical to migrate_163's version except for the additions marked
-- migrate_170 below. Same signature (_p jsonb): discipline_keys travels as
-- a key inside the payload, on the exact "omit to leave unchanged" contract
-- `styles` already has via the existing-row defaults-merge a few lines in.

CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb)
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
      'discipline_keys', to_jsonb(coalesce(v_existing.discipline_keys, ARRAY[]::text[]))
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

  PERFORM public._community_rate_check(v_uid, 'profile_upsert', 5, 5);

  IF v_is_new THEN
    IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_accept := (_p ->> 'accept_rules_version')::int;
    IF v_accept IS DISTINCT FROM public._community_rules_version() THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    INSERT INTO public.community_profiles (
      user_id, handle, display_name, avatar_preset, bio, styles, discipline_keys,
      goal, setting, area_label, area_key, gym_label, gym_key, visibility, is_minor,
      status, rules_version, last_active_at)
    VALUES (
      v_uid, v_handle, v_display, v_avatar, v_bio, v_styles, v_discipline_keys,
      v_goal, v_setting, v_area_label, v_area_key, v_gym_label, v_gym_key,
      v_visibility, v_minor, 'active', public._community_rules_version(), now());

    INSERT INTO public.consent_log
      (user_id, consent_type, granted, granted_at, notice_version)
    VALUES (v_uid, 'community_visibility', true, now(),
            public._community_rules_version()::text);

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
      last_active_at    = now()
    WHERE user_id = v_uid;

    IF _p ? 'accept_rules_version' THEN
      IF coalesce(_p ->> 'accept_rules_version', '') !~ '^[0-9]{1,6}$' THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_accept := (_p ->> 'accept_rules_version')::int;
      IF v_accept IS DISTINCT FROM public._community_rules_version() THEN
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

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb) TO authenticated;

-- ─── Part 4: _community_profile_card re-issued (discipline + counters) ──
--
-- Body identical to migrate_164's version except for the additions marked
-- migrate_170 below. Still STABLE: every addition here is a read of the
-- same row already loaded, never a write and never a call to
-- _community_rate_check.

CREATE OR REPLACE FUNCTION public._community_profile_card(_uid uuid, _viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p public.community_profiles%ROWTYPE;
  v_following text;
  v_viewable boolean;
  v_show_gym boolean;
  v_show_place boolean;
  v_show_consistency boolean; -- migrate_170
BEGIN
  SELECT * INTO p FROM public.community_profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p.status = 'suspended' AND _viewer <> _uid THEN RETURN NULL; END IF;
  v_viewable := public._community_can_view(_viewer, _uid);
  v_show_gym   := _viewer = _uid OR coalesce(p.show_gym, true);
  v_show_place := _viewer = _uid OR coalesce(p.show_place, true);

  -- migrate_170 (blueprint section 3/21-PHASE1-SPEC.md section 5): the
  -- counters travel to ANY viewer who may see the profile, but only while
  -- the OWNER keeps sharing them, is active and is not a minor. Applies
  -- uniformly, including to the owner's own view - a restricted/suspended-
  -- from-counters state hides them from their own card too, matching how
  -- community_board's own eligibility predicate already treats these same
  -- three conditions as one gate, not two.
  v_show_consistency := v_viewable AND coalesce(p.share_consistency, false)
    AND p.status = 'active' AND p.is_minor = false;

  SELECT f.state INTO v_following
  FROM public.community_follows f
  WHERE f.follower_id = _viewer AND f.followee_id = _uid;

  RETURN jsonb_build_object(
    'user_id',         p.user_id,
    'handle',          p.handle,
    'display_name',    p.display_name,
    'avatar_preset',   p.avatar_preset,
    'bio',             p.bio,
    'styles',          CASE WHEN v_viewable THEN to_jsonb(p.styles) ELSE '[]'::jsonb END,
    -- migrate_170: same v_viewable gate styles uses, same empty-array
    -- shape when not viewable (never null, so the client never has to
    -- special-case a missing key).
    'discipline_keys',   CASE WHEN v_viewable THEN to_jsonb(p.discipline_keys) ELSE '[]'::jsonb END,
    'discipline_labels', CASE WHEN v_viewable THEN (
      SELECT coalesce(jsonb_agg(public._community_discipline_label(k)), '[]'::jsonb)
      FROM unnest(p.discipline_keys) AS k
    ) ELSE '[]'::jsonb END,
    'goal',            CASE WHEN v_viewable THEN p.goal END,
    'setting',         CASE WHEN v_viewable THEN p.setting END,
    'area_label',      CASE WHEN v_viewable AND v_show_place THEN p.area_label END,
    'place_label',     CASE WHEN v_viewable AND v_show_place THEN p.place_label END,
    'gym_id',          CASE WHEN v_viewable AND v_show_gym THEN p.gym_id END,
    'gym_label',       CASE WHEN v_viewable AND v_show_gym THEN p.gym_label END,
    'show_gym',        CASE WHEN _viewer = _uid THEN coalesce(p.show_gym, true) END,
    'show_place',      CASE WHEN _viewer = _uid THEN coalesce(p.show_place, true) END,
    'visibility',      p.visibility,
    'follower_count',  p.follower_count,
    'following_count', p.following_count,
    'connection',      public._community_connection_state(_viewer, _uid),
    'connection_count', CASE WHEN v_viewable THEN p.connection_count END,
    'open_to_partner', CASE WHEN v_viewable THEN p.open_to_partner ELSE false END,
    'tp_days',           CASE WHEN v_viewable THEN to_jsonb(p.tp_days) END,
    'tp_time_bands',     CASE WHEN v_viewable THEN to_jsonb(p.tp_time_bands) END,
    'tp_sessions_band',  CASE WHEN v_viewable THEN p.tp_sessions_band END,
    'tp_staple_lifts',   CASE WHEN v_viewable THEN to_jsonb(p.tp_staple_lifts) END,
    'tp_experience_band', CASE WHEN v_viewable THEN p.tp_experience_band END,
    'tp_programme_key',  CASE WHEN v_viewable THEN p.tp_programme_key END,
    'tp_age_band',       CASE WHEN v_viewable THEN p.tp_age_band END,
    'age_band',          CASE WHEN v_viewable THEN p.tp_age_band END,
    'other_gym_ids',    CASE WHEN _viewer = _uid THEN to_jsonb(p.other_gym_ids) END,
    'can_connect',      public._community_can_connect(_viewer, _uid),
    -- migrate_170: the nine migrate_165 counters, gated as above. Every
    -- key is always present; the VALUE is null unless v_show_consistency.
    'c_sessions_week',        CASE WHEN v_show_consistency THEN p.c_sessions_week END,
    'c_sessions_month',       CASE WHEN v_show_consistency THEN p.c_sessions_month END,
    'c_weeks_streak',         CASE WHEN v_show_consistency THEN p.c_weeks_streak END,
    'c_planned_pct_4w',       CASE WHEN v_show_consistency THEN p.c_planned_pct_4w END,
    'c_consistent_weeks_12w', CASE WHEN v_show_consistency THEN p.c_consistent_weeks_12w END,
    'c_trained_days_week',    CASE WHEN v_show_consistency THEN to_jsonb(p.c_trained_days_week) END,
    'c_last_trained_day',     CASE WHEN v_show_consistency THEN p.c_last_trained_day END,
    'c_updated_at',           CASE WHEN v_show_consistency THEN p.c_updated_at END,
    'c_weeks_history',        CASE WHEN v_show_consistency THEN to_jsonb(p.c_weeks_history) END,
    'relationship',    jsonb_build_object(
      'following',   coalesce(v_following, 'none'),
      'followed_by', EXISTS (
        SELECT 1 FROM public.community_follows f2
        WHERE f2.follower_id = _uid AND f2.followee_id = _viewer
          AND f2.state = 'accepted'),
      'muted',       EXISTS (
        SELECT 1 FROM public.community_mutes m
        WHERE m.muter_id = _viewer AND m.muted_id = _uid),
      'blocked',     EXISTS (
        SELECT 1 FROM public.community_blocks b
        WHERE b.blocker_id = _viewer AND b.blocked_id = _uid)
    )
  );
END $$;

REVOKE ALL ON FUNCTION public._community_profile_card(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ─── Part 5: _community_cohort_stats (new internal helper) ──────────────
--
-- member_count / trained_today_count / a to-three "who trained today, else
-- who's a member" sample for one (kind, key) cohort, from the caller's own
-- viewpoint (blocked pairs excluded, never a minor, never the caller
-- themselves in their own sample). Shared by community_dimensions_me
-- (every row) and community_hub_summary (every cohort), so the counting
-- and sampling rule lives once. Handles style/gym/area/discipline/age_band;
-- 'programme' is deliberately NOT one of the kinds here - that layer is
-- retired (migrate_164) and community_programmes holds no rows, so
-- community_dimensions_me's own programme loop (unchanged by this
-- migration) never has anything to enrich.

CREATE OR REPLACE FUNCTION public._community_cohort_stats(
  _uid uuid, _kind text, _key text, _today text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member_count  int := 0;
  v_trained_count int := 0;
  v_sample        jsonb := '[]'::jsonb;
BEGIN
  SELECT count(*),
         count(*) FILTER (
           WHERE p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today)
  INTO v_member_count, v_trained_count
  FROM public.community_profiles p
  WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
    AND p.user_id <> _uid
    AND NOT public._community_is_blocked(_uid, p.user_id)
    AND (
      (_kind = 'style'      AND _key = ANY (p.styles))
   OR (_kind = 'gym'        AND p.gym_key = _key)
   OR (_kind = 'area'       AND p.area_key = _key)
   OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
   OR (_kind = 'age_band'   AND p.tp_age_band = _key)
    );

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'user_id', x.user_id, 'handle', x.handle,
           'display_name', x.display_name, 'avatar_preset', x.avatar_preset
         ) ORDER BY x.trained_today DESC, x.user_id), '[]'::jsonb)
  INTO v_sample
  FROM (
    SELECT p.user_id, p.handle, p.display_name, p.avatar_preset,
      (p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today) AS trained_today
    FROM public.community_profiles p
    WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
      AND p.user_id <> _uid
      AND NOT public._community_is_blocked(_uid, p.user_id)
      AND (
        (_kind = 'style'      AND _key = ANY (p.styles))
     OR (_kind = 'gym'        AND p.gym_key = _key)
     OR (_kind = 'area'       AND p.area_key = _key)
     OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
     OR (_kind = 'age_band'   AND p.tp_age_band = _key)
      )
    ORDER BY trained_today DESC, p.user_id
    LIMIT 3
  ) x;

  RETURN jsonb_build_object(
    'member_count', v_member_count,
    'trained_today_count', v_trained_count,
    'sample', v_sample
  );
END $$;

REVOKE ALL ON FUNCTION public._community_cohort_stats(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- ─── Part 6: community_dimension re-issued (discipline, age_band kinds) ─
--
-- Body identical to migrate_164's version except for the additions marked
-- migrate_170 below. No STABLE/VOLATILE keyword, same as migrate_164's
-- version (defaults to VOLATILE; it does not call _community_rate_check
-- either way, so this is unaffected by the migrate_167 lesson).

CREATE OR REPLACE FUNCTION public.community_dimension(
  _kind text, _key text, _cursor text DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_lim   int  := public._community_limit(_limit);
  v_ts    timestamptz;
  v_id    uuid;
  v_label text;
  v_count int := 0;
  v_people jsonb := '[]'::jsonb;
  v_progs  jsonb := '[]'::jsonb;
  v_lts   timestamptz;
  v_lid   uuid;
  v_my_age_band text; -- migrate_170
BEGIN
  -- migrate_170: two new kinds.
  IF _kind NOT IN ('style', 'programme', 'gym', 'area', 'discipline', 'age_band')
     OR _key IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _kind = 'programme' THEN
    RETURN jsonb_build_object(
      'label', NULL, 'count', 0,
      'people', '[]'::jsonb, 'programmes', '[]'::jsonb, 'cursor', NULL);
  END IF;

  -- migrate_170 (blueprint section 3): age_band is reciprocal. A caller who
  -- does not share their own band, or asks for a band that is not their
  -- own, gets the same empty shape 'programme' returns above - never an
  -- error, never another band's roster.
  IF _kind = 'age_band' THEN
    SELECT tp_age_band INTO v_my_age_band
    FROM public.community_profiles WHERE user_id = v_uid;
    IF v_my_age_band IS NULL OR v_my_age_band <> _key THEN
      RETURN jsonb_build_object(
        'label', NULL, 'count', 0,
        'people', '[]'::jsonb, 'programmes', '[]'::jsonb, 'cursor', NULL);
    END IF;
  END IF;

  SELECT c_ts, c_id INTO v_ts, v_id FROM public._community_cursor_parts(_cursor);

  IF _kind = 'style' THEN
    v_label := public._community_style_label(_key);
  ELSIF _kind = 'discipline' THEN
    v_label := public._community_discipline_label(_key);
  ELSIF _kind = 'age_band' THEN
    -- migrate_170: no server-side age-band prose exists anywhere in this
    -- schema; the client already owns the key->text mapping (TP_AGE_BANDS)
    -- for every other age-band surface, so the raw key travels as its own
    -- label rather than this file inventing new copy.
    v_label := _key;
  ELSE
    SELECT CASE WHEN _kind = 'gym' THEN gym_label ELSE area_label END INTO v_label
    FROM public.community_profiles
    WHERE (_kind = 'gym' AND gym_key = _key) OR (_kind = 'area' AND area_key = _key)
    LIMIT 1;
  END IF;

  WITH page AS (
    SELECT p.user_id AS user_id, p.created_at AS created_at
    FROM public.community_profiles p
    WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
      AND p.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND (
        (_kind = 'style' AND _key = ANY (p.styles))
     OR (_kind = 'gym'   AND p.gym_key = _key)
     OR (_kind = 'area'  AND p.area_key = _key)
     OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
     OR (_kind = 'age_band'   AND p.tp_age_band = _key)
      )
      AND (v_ts IS NULL OR (p.created_at, p.user_id) < (v_ts, v_id))
    ORDER BY p.created_at DESC, p.user_id DESC
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(public._community_profile_card(page.user_id, v_uid)
             ORDER BY page.created_at DESC, page.user_id DESC), '[]'::jsonb),
    (array_agg(page.created_at ORDER BY page.created_at ASC, page.user_id ASC))[1],
    (array_agg(page.user_id    ORDER BY page.created_at ASC, page.user_id ASC))[1]
  INTO v_people, v_lts, v_lid
  FROM page;

  SELECT count(*) INTO v_count
  FROM public.community_profiles p
  WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
    AND p.user_id <> v_uid
    AND NOT public._community_is_blocked(v_uid, p.user_id)
    AND (
      (_kind = 'style' AND _key = ANY (p.styles))
   OR (_kind = 'gym'   AND p.gym_key = _key)
   OR (_kind = 'area'  AND p.area_key = _key)
   OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))
   OR (_kind = 'age_band'   AND p.tp_age_band = _key)
    );

  v_progs := '[]'::jsonb;

  RETURN jsonb_build_object(
    'label', v_label, 'count', v_count,
    'people', coalesce(v_people, '[]'::jsonb),
    'programmes', v_progs,
    'cursor', public._community_cursor_of(v_lts, v_lid));
END $$;

REVOKE ALL ON FUNCTION public.community_dimension(text, text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_dimension(text, text, text, int) TO authenticated;

-- ─── Part 7: community_dimensions_me DROPped and re-created (_today) ────
--
-- Signature change (0 args -> 1): dynamically drop whatever is currently
-- installed first, the same pattern migrate_163/164 use for
-- community_find_people/community_send_message, so a second run of this
-- file finds the new signature already there, drops it, and recreates the
-- identical thing.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_dimensions_me' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.community_dimensions_me(_today text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := public._community_caller();
  v_me   public.community_profiles%ROWTYPE;
  v_out  jsonb := '[]'::jsonb;
  v_items jsonb[] := ARRAY[]::jsonb[];
  v_style text;
  v_count int;
  v_prog  record;
  v_discipline text; -- migrate_170
  v_stats jsonb;      -- migrate_170
BEGIN
  -- migrate_170: "today" is the caller's LOCAL day, the same reason
  -- community_board already requires it rather than trusting now()::date.
  IF _today IS NULL OR _today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, false);

  -- migrate_170: style rows now source member_count from the same helper
  -- that produces trained_today_count/sample, instead of a second,
  -- functionally-identical COUNT query.
  FOREACH v_style IN ARRAY v_me.styles LOOP
    v_stats := public._community_cohort_stats(v_uid, 'style', v_style, _today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'style', 'key', v_style,
        'label', public._community_style_label(v_style), 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  IF v_me.gym_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'gym', v_me.gym_key, _today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'gym', 'key', v_me.gym_key, 'label', v_me.gym_label, 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  IF v_me.area_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'area', v_me.area_key, _today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'area', 'key', v_me.area_key, 'label', v_me.area_label, 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  -- migrate_170 (blueprint section 3): one row per discipline key the
  -- caller holds, same shape as the style loop above.
  FOREACH v_discipline IN ARRAY v_me.discipline_keys LOOP
    v_stats := public._community_cohort_stats(v_uid, 'discipline', v_discipline, _today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'discipline', 'key', v_discipline,
        'label', public._community_discipline_label(v_discipline), 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  -- migrate_170: one reciprocal age-band row, only while the caller shares
  -- their own band.
  IF v_me.tp_age_band IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'age_band', v_me.tp_age_band, _today);
    v_count := (v_stats ->> 'member_count')::int;
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'age_band', 'key', v_me.tp_age_band, 'label', v_me.tp_age_band, 'count', v_count,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  -- Programmes I published or use. Unchanged by migrate_170: the layer is
  -- retired (migrate_164) and community_programmes holds no rows, so this
  -- loop never actually emits a row; left exactly as migrate_160 wrote it
  -- rather than extending a retired layer's join shape into the new
  -- cohort-stats helper.
  FOR v_prog IN
    SELECT g.id, g.title
    FROM public.community_programmes g
    WHERE g.status = 'visible'
      AND (g.owner_id = v_uid
           OR EXISTS (SELECT 1 FROM public.community_programme_uses u
                      WHERE u.programme_id = g.id AND u.user_id = v_uid))
  LOOP
    SELECT count(*) INTO v_count
    FROM public.community_programme_uses u
    JOIN public.community_profiles p ON p.user_id = u.user_id
    WHERE u.programme_id = v_prog.id AND u.user_id <> v_uid
      AND p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
      AND NOT public._community_is_blocked(v_uid, p.user_id);
    IF v_count >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'kind', 'programme', 'key', v_prog.id::text, 'label', v_prog.title, 'count', v_count);
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(x ORDER BY (x ->> 'count')::int DESC), '[]'::jsonb)
  INTO v_out FROM (SELECT unnest(v_items) AS x) t;

  RETURN jsonb_build_object('dimensions', v_out);
END $$;

REVOKE ALL ON FUNCTION public.community_dimensions_me(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_dimensions_me(text) TO authenticated;

-- ─── Part 8: community_board re-issued (area, style, discipline, age_band) ─
--
-- Body identical to migrate_169's fix except for the additions marked
-- migrate_170 below. Same signature, same windows, same small-group
-- threshold, same keyset paging, same `u.x` alias throughout (never
-- `x.*` - the exact migrate_165 bug migrate_169 fixed), same own-row
-- return, same rate rail. No STABLE/IMMUTABLE keyword (migrate_167's
-- lesson: it calls _community_rate_check, which writes).

CREATE OR REPLACE FUNCTION public.community_board(_scope text, _scope_key text DEFAULT NULL::text, _window text DEFAULT 'week'::text, _cursor text DEFAULT NULL::text, _limit integer DEFAULT 20, _today text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid   uuid := public._community_caller();
  v_me    public.community_profiles%ROWTYPE;
  v_lim   int  := public._community_limit(_limit);
  v_row   record;
  v_items jsonb[] := ARRAY[]::jsonb[];
  v_count int := 0;
  v_cur_metric int;
  v_cur_tie    int;
  v_cur_handle text;
  v_cur_id     uuid;
  v_out_rows   jsonb;
  v_last_metric int;
  v_last_tie    int;
  v_last_handle text;
  v_last_id     uuid;
  v_remaining   int;
  v_page_len    int;
  v_next_cursor text;
  v_you_rank   int;
  v_you_metric int;
  v_you jsonb := NULL;
  v_gym_id     uuid;
  v_area_key   text; -- migrate_170
BEGIN
  -- migrate_170: four new scopes.
  IF _scope NOT IN ('gym', 'following', 'group', 'everyone', 'area', 'style', 'discipline', 'age_band') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _window NOT IN ('week', 'month', 'consistency') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope = 'group' AND (_scope_key IS NULL OR btrim(_scope_key) = '') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  -- migrate_170: style/discipline have no single implicit "yours" (a
  -- profile can hold up to three of either), so - like group - they
  -- require an explicit key. discipline's key is checked against the
  -- taxonomy here too, the same helper community_upsert_profile uses.
  IF _scope IN ('style', 'discipline') AND (_scope_key IS NULL OR btrim(_scope_key) = '') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _scope = 'discipline' AND _scope_key IS NOT NULL
     AND NOT public._community_discipline_key_ok(ARRAY[_scope_key]) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _today IS NULL OR _today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'board', 120, 120, interval '1 hour');

  IF _scope = 'group' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.community_group_members m
      WHERE m.group_id = _scope_key::uuid AND m.user_id = v_uid AND m.state = 'member'
    ) THEN
      RAISE EXCEPTION USING message = 'not_allowed';
    END IF;
  END IF;

  -- migrate_170: age_band is reciprocal, exactly like community_dimension's
  -- age_band kind - the caller must already share their own band, and it
  -- always means their OWN band (no scope_key). "not_allowed" mirrors the
  -- refusal the group scope above already gives a non-member.
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

  -- migrate_170: area falls back to the caller's own area_key exactly like
  -- gym falls back to the caller's own gym_id above. A caller with neither
  -- an explicit key nor an own area_key simply sees an empty board
  -- (v_area_key stays NULL, so no row can ever match below) rather than an
  -- error - the same graceful-empty behaviour the gym scope already has
  -- when v_gym_id ends up NULL.
  IF _scope = 'area' THEN
    IF _scope_key IS NOT NULL AND btrim(_scope_key) <> '' THEN
      v_area_key := _scope_key;
    ELSE
      v_area_key := v_me.area_key;
    END IF;
  END IF;

  IF _cursor IS NOT NULL AND btrim(_cursor) <> '' THEN
    BEGIN
      v_cur_metric := split_part(_cursor, '|', 1)::int;
      v_cur_tie    := nullif(split_part(_cursor, '|', 2), '')::int;
      v_cur_handle := nullif(split_part(_cursor, '|', 3), '');
      v_cur_id     := split_part(_cursor, '|', 4)::uuid;
      IF v_cur_id IS NULL THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END;
  END IF;

  FOR v_row IN
    SELECT p.user_id, p.handle, p.c_trained_days_week, p.c_last_trained_day,
      CASE _window WHEN 'week' THEN p.c_sessions_week
                   WHEN 'month' THEN p.c_sessions_month
                   ELSE p.c_weeks_streak END AS metric,
      CASE _window
        WHEN 'week' THEN coalesce(array_length(p.c_trained_days_week, 1), 0)
        WHEN 'consistency' THEN coalesce(p.c_consistent_weeks_12w, 0) * 1000 + coalesce(p.c_planned_pct_4w, 0)
        ELSE 0
      END AS tiebreak
    FROM public.community_profiles p
    WHERE p.status = 'active'
      AND p.is_minor = false
      AND p.share_consistency = true
      AND p.c_updated_at IS NOT NULL
      AND p.c_updated_at >= now() - interval '14 days'
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND (
        _scope = 'everyone'
        OR (_scope = 'following' AND (
              p.user_id = v_uid
              OR EXISTS (SELECT 1 FROM public.community_follows f
                         WHERE f.follower_id = v_uid AND f.followee_id = p.user_id AND f.state = 'accepted')))
        OR (_scope = 'gym' AND v_gym_id IS NOT NULL AND (
              p.gym_id = v_gym_id
              OR v_gym_id = ANY (coalesce(p.other_gym_ids, ARRAY[]::uuid[]))))
        OR (_scope = 'group' AND EXISTS (
              SELECT 1 FROM public.community_group_members m
              WHERE m.group_id = _scope_key::uuid AND m.user_id = p.user_id AND m.state = 'member'))
        -- migrate_170: the four new scopes.
        OR (_scope = 'area' AND v_area_key IS NOT NULL AND p.area_key = v_area_key)
        OR (_scope = 'style' AND _scope_key = ANY (p.styles))
        OR (_scope = 'discipline' AND _scope_key = ANY (p.discipline_keys))
        OR (_scope = 'age_band' AND v_me.tp_age_band IS NOT NULL AND p.tp_age_band = v_me.tp_age_band)
      )
    LIMIT 2000
  LOOP
    IF v_row.metric IS NULL THEN CONTINUE; END IF;
    v_count := v_count + 1;
    v_items := v_items || jsonb_build_object(
      'user_id', v_row.user_id,
      'handle', coalesce(v_row.handle, ''),
      'metric', v_row.metric,
      'tiebreak', v_row.tiebreak,
      'trained_days', to_jsonb(coalesce(v_row.c_trained_days_week, ARRAY[]::text[])),
      'trained_today', (v_row.c_last_trained_day IS NOT NULL AND v_row.c_last_trained_day = _today)
    );
  END LOOP;

  WITH ranked AS (
    SELECT u.x, row_number() OVER (
      ORDER BY (x ->> 'metric')::int DESC, (x ->> 'tiebreak')::int DESC,
               (x ->> 'handle') DESC, (x ->> 'user_id') DESC
    ) AS rnk
    FROM (SELECT unnest(v_items) AS x) u
  )
  SELECT r.rnk, (r.x ->> 'metric')::int INTO v_you_rank, v_you_metric
  FROM ranked r WHERE (r.x ->> 'user_id')::uuid = v_uid;

  IF v_you_rank IS NOT NULL THEN
    v_you := jsonb_build_object('rank', v_you_rank, 'metric', v_you_metric);
  END IF;

  WITH ranked AS (
    SELECT u.x, row_number() OVER (
      ORDER BY (x ->> 'metric')::int DESC, (x ->> 'tiebreak')::int DESC,
               (x ->> 'handle') DESC, (x ->> 'user_id') DESC
    ) AS rnk
    FROM (SELECT unnest(v_items) AS x) u
  ),
  page AS (
    SELECT r.*
    FROM ranked r
    WHERE v_cur_metric IS NULL OR (
      ((r.x ->> 'metric')::int, coalesce((r.x ->> 'tiebreak')::int, 0),
       coalesce(r.x ->> 'handle', ''), (r.x ->> 'user_id')::uuid)
      < (v_cur_metric, coalesce(v_cur_tie, 0), coalesce(v_cur_handle, ''), v_cur_id)
    )
    ORDER BY r.rnk
    LIMIT v_lim
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'card',   public._community_profile_card((p.x ->> 'user_id')::uuid, v_uid),
      'metric', (p.x ->> 'metric')::int,
      'trained_days',  p.x -> 'trained_days',
      'trained_today', (p.x ->> 'trained_today')::boolean,
      'is_you', (p.x ->> 'user_id')::uuid = v_uid,
      'rank',   p.rnk
    ) ORDER BY p.rnk), '[]'::jsonb),
    (array_agg((p.x ->> 'metric')::int ORDER BY p.rnk DESC))[1],
    (array_agg((p.x ->> 'tiebreak')::int ORDER BY p.rnk DESC))[1],
    (array_agg(p.x ->> 'handle' ORDER BY p.rnk DESC))[1],
    (array_agg((p.x ->> 'user_id')::uuid ORDER BY p.rnk DESC))[1]
  INTO v_out_rows, v_last_metric, v_last_tie, v_last_handle, v_last_id
  FROM page p;

  v_out_rows := coalesce(v_out_rows, '[]'::jsonb);
  v_page_len := jsonb_array_length(v_out_rows);

  WITH ranked AS (
    SELECT u.x, row_number() OVER (
      ORDER BY (x ->> 'metric')::int DESC, (x ->> 'tiebreak')::int DESC,
               (x ->> 'handle') DESC, (x ->> 'user_id') DESC
    ) AS rnk
    FROM (SELECT unnest(v_items) AS x) u
  )
  SELECT count(*) INTO v_remaining
  FROM ranked r
  WHERE v_cur_metric IS NULL OR (
    ((r.x ->> 'metric')::int, coalesce((r.x ->> 'tiebreak')::int, 0),
     coalesce(r.x ->> 'handle', ''), (r.x ->> 'user_id')::uuid)
    < (v_cur_metric, coalesce(v_cur_tie, 0), coalesce(v_cur_handle, ''), v_cur_id)
  );

  IF v_remaining > v_lim AND v_page_len > 0 THEN
    v_next_cursor := v_last_metric::text || '|' || coalesce(v_last_tie::text, '')
      || '|' || coalesce(v_last_handle, '') || '|' || v_last_id::text;
  END IF;

  RETURN jsonb_build_object(
    'rows', v_out_rows,
    'you', v_you,
    'count', v_count,
    'threshold_met', v_count >= 8,
    'cursor', v_next_cursor
  );
END $function$;

REVOKE ALL ON FUNCTION public.community_board(text, text, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_board(text, text, text, text, integer, text) TO authenticated;

-- ─── Part 9: community_hub_summary (new) ─────────────────────────────────
--
-- One call for the Hub (21-PHASE1-SPEC.md section 2 / blueprint section 9):
-- cohorts for the caller's gym, area, up to three styles, up to three
-- disciplines and age band (only while shared), plus the groups the caller
-- is a MEMBER of (state = 'member', not requested/invited). Rate-railed
-- and VOLATILE like every other Community read that writes a rate-check
-- row (migrate_167's lesson: STABLE/IMMUTABLE here would force PostgREST
-- into a read-only transaction and fail on the rate check's own INSERT).
-- No explicit minor-caller gate beyond what _community_cohort_stats and
-- the group query already enforce (is_minor = false on every counted or
-- sampled row, unconditionally) - no existing Community read blocks a
-- minor CALLER outright, so this does not invent one.

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
BEGIN
  IF _today IS NULL OR _today !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'hub_summary', 120, 120, interval '1 hour');

  IF v_me.gym_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'gym', v_me.gym_key, _today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'gym', 'key', v_me.gym_key, 'label', v_me.gym_label,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  IF v_me.area_key IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'area', v_me.area_key, _today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'area', 'key', v_me.area_key, 'label', v_me.area_label,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  FOREACH v_style IN ARRAY v_me.styles LOOP
    v_stats := public._community_cohort_stats(v_uid, 'style', v_style, _today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'style', 'key', v_style, 'label', public._community_style_label(v_style),
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  FOREACH v_disc IN ARRAY v_me.discipline_keys LOOP
    v_stats := public._community_cohort_stats(v_uid, 'discipline', v_disc, _today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'discipline', 'key', v_disc, 'label', public._community_discipline_label(v_disc),
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END LOOP;

  IF v_me.tp_age_band IS NOT NULL THEN
    v_stats := public._community_cohort_stats(v_uid, 'age_band', v_me.tp_age_band, _today);
    IF (v_stats ->> 'member_count')::int >= 1 THEN
      v_cohorts := v_cohorts || jsonb_build_object(
        'kind', 'age_band', 'key', v_me.tp_age_band, 'label', v_me.tp_age_band,
        'member_count', v_stats -> 'member_count',
        'trained_today_count', v_stats -> 'trained_today_count',
        'sample', v_stats -> 'sample');
    END IF;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'access', g.access,
      'member_count', g.member_count,
      'trained_today_count', (
        SELECT count(*)
        FROM public.community_group_members gm2
        JOIN public.community_profiles p2 ON p2.user_id = gm2.user_id
        WHERE gm2.group_id = g.id AND gm2.state = 'member'
          AND p2.status = 'active' AND p2.is_minor = false
          AND p2.c_last_trained_day IS NOT NULL AND p2.c_last_trained_day = _today
      ),
      'sample', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'user_id', s.user_id, 'handle', s.handle,
                 'display_name', s.display_name, 'avatar_preset', s.avatar_preset
               ) ORDER BY s.trained_today DESC, s.user_id), '[]'::jsonb)
        FROM (
          SELECT p3.user_id, p3.handle, p3.display_name, p3.avatar_preset,
            (p3.c_last_trained_day IS NOT NULL AND p3.c_last_trained_day = _today) AS trained_today
          FROM public.community_group_members gm3
          JOIN public.community_profiles p3 ON p3.user_id = gm3.user_id
          WHERE gm3.group_id = g.id AND gm3.state = 'member'
            AND p3.status = 'active' AND p3.is_minor = false
          ORDER BY trained_today DESC, p3.user_id
          LIMIT 3
        ) s
      )
    ) ORDER BY g.name), '[]'::jsonb)
  INTO v_groups
  FROM public.community_group_members m
  JOIN public.community_groups g ON g.id = m.group_id
  WHERE m.user_id = v_uid AND m.state = 'member';

  RETURN jsonb_build_object('cohorts', v_cohorts, 'groups', coalesce(v_groups, '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.community_hub_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_hub_summary(text) TO authenticated;

-- ─── Part 10: community_find_people DROPped and re-created (_discipline) ─
--
-- Signature change (4 args -> 5): dynamically drop whatever is currently
-- installed first, same pattern as Part 7. Body identical to migrate_164's
-- version except for the additions marked migrate_170 below. _discipline is
-- a HARD filter only (narrows the WHERE clause), not a scored signal -
-- matching how _filters' own hard filters (days/bands/goal/age_band)
-- already behave, as distinct from the scored "shared attribute" reasons
-- computed later in the function.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'community_find_people' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.community_find_people(
  _mode text DEFAULT 'like_me', _cursor text DEFAULT NULL, _limit int DEFAULT 20,
  _filters jsonb DEFAULT NULL, _discipline text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := public._community_caller();
  v_lim     int  := public._community_limit(_limit);
  v_me      public.community_profiles%ROWTYPE;
  v_key     text;
  v_label   text;
  v_row     record;
  v_score   int;
  v_reasons text[];
  v_items   jsonb[] := ARRAY[]::jsonb[];
  v_style   text;
  v_band    text;
  v_days    text[];
  v_mconn   int;
  v_mfoll   int;
  v_lifts   int;
  v_place_m double precision;
  v_scanned int := 0;
  v_scope         text;
  v_band_raw      text;
  v_band_m        int;
  v_partner_only  boolean;
  v_f_days        text[];
  v_f_bands       text[];
  v_f_styles      text[];
  v_f_goal        text;
  v_f_exp         text;
  v_f_age         text;
  v_cur_score int;
  v_cur_ts    timestamptz;
  v_cur_id    uuid;
  v_page      jsonb;
  v_remaining int;
  v_next_cursor text;
  v_already   uuid[];
  v_fallback  jsonb;
  v_page_len  int;
  v_discipline text; -- migrate_170
BEGIN
  IF _mode IS NULL OR _mode NOT IN
     ('like_me', 'gym', 'area', 'partners', 'might_know') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'find_people', 120, 120, interval '1 hour');

  -- migrate_170: _discipline is a trailing parameter of its own (not
  -- nested in _filters), because a discipline is a first-class cohort door
  -- like gym/area, not a combinable _filters preference. Validated against
  -- the same taxonomy helper community_upsert_profile uses.
  v_discipline := nullif(btrim(coalesce(_discipline, '')), '');
  IF v_discipline IS NOT NULL AND NOT public._community_discipline_key_ok(ARRAY[v_discipline]) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _filters IS NOT NULL THEN
    IF jsonb_typeof(_filters) <> 'object' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    v_scope := nullif(btrim(coalesce(_filters ->> 'scope', '')), '');
    IF v_scope IS NOT NULL AND v_scope NOT IN ('gym', 'place', 'any') THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;

    IF _filters ? 'place_band_miles' THEN
      v_band_raw := _filters ->> 'place_band_miles';
      IF v_band_raw NOT IN ('0', '5', '10', '25') THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
      v_band_m := CASE v_band_raw WHEN '0' THEN 0 WHEN '5' THEN 8047
                                   WHEN '10' THEN 16093 ELSE 40234 END;
    END IF;

    v_partner_only := _filters ? 'partner_only'
      AND coalesce((_filters ->> 'partner_only')::boolean, false);

    IF jsonb_typeof(_filters -> 'days') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_f_days FROM jsonb_array_elements_text(_filters -> 'days');
    END IF;
    IF jsonb_typeof(_filters -> 'time_bands') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_f_bands FROM jsonb_array_elements_text(_filters -> 'time_bands');
    END IF;
    IF jsonb_typeof(_filters -> 'styles') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_f_styles FROM jsonb_array_elements_text(_filters -> 'styles');
    END IF;
    v_f_goal := nullif(btrim(coalesce(_filters ->> 'goal', '')), '');
    v_f_exp  := nullif(btrim(coalesce(_filters ->> 'experience_band', '')), '');
    v_f_age := nullif(btrim(coalesce(_filters ->> 'age_band', '')), '');
    IF v_f_age IS NOT NULL AND v_me.tp_age_band IS NULL THEN
      v_f_age := NULL;
    END IF;
  END IF;

  IF v_scope IS NULL THEN
    v_scope := CASE WHEN _mode = 'gym' THEN 'gym' WHEN _mode = 'area' THEN 'place' ELSE 'any' END;
  END IF;

  IF _cursor IS NOT NULL AND btrim(_cursor) <> '' THEN
    SELECT c_score, c_ts, c_id INTO v_cur_score, v_cur_ts, v_cur_id
    FROM public._community_find_people_cursor_parts(_cursor);
  END IF;

  IF _mode = 'gym' THEN
    v_key := v_me.gym_key; v_label := v_me.gym_label;
  ELSIF _mode = 'area' THEN
    IF v_me.place_key IS NOT NULL THEN
      v_key := v_me.place_key; v_label := v_me.place_label;
    ELSE
      v_key := v_me.area_key; v_label := v_me.area_label;
    END IF;
  ELSIF _mode = 'partners' THEN
    IF coalesce((v_me.partner_prefs ->> 'same_gym_only')::boolean, false)
       AND v_me.gym_key IS NOT NULL THEN
      v_label := 'at your gym';
    ELSE
      v_label := 'in your area';
    END IF;
  END IF;

  IF (_mode IN ('gym', 'area') AND v_key IS NULL)
     OR (_mode = 'partners' AND NOT coalesce(v_me.open_to_partner, false))
     OR (v_scope = 'gym' AND v_me.gym_key IS NULL)
     OR (v_scope = 'place' AND v_me.place_key IS NULL AND v_me.area_key IS NULL) THEN
    RETURN jsonb_build_object(
      'mode', _mode, 'key', v_key, 'label', v_label,
      'count', 0, 'count_truncated', false, 'people', '[]'::jsonb, 'cursor', NULL);
  END IF;

  FOR v_row IN
    SELECT p.*
    FROM public.community_profiles p
    WHERE p.status = 'active'
      AND p.visibility = 'public'
      AND p.is_minor = false
      AND p.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND NOT public._community_is_connected(v_uid, p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes mu
        WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
      AND (_mode <> 'gym'       OR (coalesce(p.show_gym, true) AND (
             p.gym_key = v_key
             OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))))
      AND (_mode <> 'area'      OR (coalesce(p.show_place, true) AND (
             (v_me.place_key IS NOT NULL AND p.place_key = v_key)
             OR (v_me.place_key IS NULL AND p.area_key = v_key)
           )))
      AND (_mode <> 'partners'  OR p.open_to_partner = true)
      AND (_mode <> 'partners'
           OR NOT coalesce((p.partner_prefs ->> 'same_gym_only')::boolean, false)
           OR (v_me.gym_key IS NOT NULL AND coalesce(p.show_gym, true) AND p.gym_key = v_me.gym_key))
      AND (v_scope <> 'gym' OR (coalesce(p.show_gym, true) AND (
             p.gym_key = v_me.gym_key
             OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))))
      AND (v_scope <> 'place' OR (coalesce(p.show_place, true) AND (
             CASE
               WHEN v_band_m IS NULL THEN
                 (v_me.place_key IS NOT NULL AND p.place_key = v_me.place_key)
                 OR (v_me.place_key IS NULL AND v_me.area_key IS NOT NULL AND p.area_key = v_me.area_key)
               WHEN v_band_m = 0 THEN
                 (v_me.place_key IS NOT NULL AND p.place_key = v_me.place_key)
               ELSE
                 coalesce(public._community_place_band_m(v_uid, p.user_id), 1e12::double precision) <= v_band_m
             END
           )))
      AND (NOT coalesce(v_partner_only, false) OR p.open_to_partner = true)
      AND (v_f_days IS NULL OR (p.tp_days IS NOT NULL AND p.tp_days && v_f_days))
      AND (v_f_bands IS NULL OR (p.tp_time_bands IS NOT NULL AND p.tp_time_bands && v_f_bands))
      AND (v_f_styles IS NULL OR (p.styles IS NOT NULL AND p.styles && v_f_styles))
      AND (v_f_goal IS NULL OR p.goal = v_f_goal)
      AND (v_f_exp IS NULL OR p.tp_experience_band = v_f_exp)
      AND (v_f_age IS NULL OR p.tp_age_band = v_f_age)
      -- migrate_170: hard filter, independent of _mode/_filters, same shape.
      AND (v_discipline IS NULL OR v_discipline = ANY (p.discipline_keys))
    ORDER BY p.last_active_at DESC
    LIMIT 1000
  LOOP
    v_scanned := v_scanned + 1;
    v_score := 0;
    v_reasons := ARRAY[]::text[];

    IF coalesce(v_row.show_gym, true) AND v_me.gym_key IS NOT NULL
       AND v_row.gym_key = v_me.gym_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || ('Trains at ' || coalesce(v_row.gym_label, v_me.gym_label));
    ELSIF coalesce(v_row.show_gym, true) AND v_me.gym_id IS NOT NULL
          AND v_row.other_gym_ids IS NOT NULL
          AND v_me.gym_id = ANY (v_row.other_gym_ids) THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'Also trains at your gym'::text;
    END IF;

    SELECT s INTO v_style
    FROM unnest(v_me.styles) AS s
    WHERE s = ANY (v_row.styles)
    LIMIT 1;
    IF v_style IS NOT NULL THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Also trains ' || public._community_style_label(v_style));
    END IF;

    IF coalesce(v_row.show_place, true) AND v_me.area_key IS NOT NULL
       AND v_row.area_key = v_me.area_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Lists ' || coalesce(v_row.area_label, v_me.area_label));
    END IF;

    IF NOT coalesce(v_row.show_place, true) THEN
      NULL;
    ELSIF v_me.place_key IS NOT NULL AND v_row.place_key = v_me.place_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'same_place'::text;
    ELSE
      v_place_m := public._community_place_band_m(v_uid, v_row.user_id);
      IF v_place_m IS NOT NULL AND v_place_m <= 16093 THEN
        v_score := v_score + 1;
        v_reasons := v_reasons || 'near_place'::text;
      ELSIF v_place_m IS NOT NULL AND v_place_m <= 40234 THEN
        v_score := v_score + 1;
        v_reasons := v_reasons || 'within_25_miles'::text;
      END IF;
    END IF;

    IF v_me.tp_age_band IS NOT NULL AND v_row.tp_age_band = v_me.tp_age_band THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || 'same_age_band'::text;
    END IF;

    SELECT count(*) INTO v_mconn FROM (
      SELECT CASE WHEN c.user_a = v_uid THEN c.user_b ELSE c.user_a END AS m
      FROM public.community_connections c
      WHERE c.state = 'connected' AND (c.user_a = v_uid OR c.user_b = v_uid)
      INTERSECT
      SELECT CASE WHEN d.user_a = v_row.user_id THEN d.user_b ELSE d.user_a END
      FROM public.community_connections d
      WHERE d.state = 'connected'
        AND (d.user_a = v_row.user_id OR d.user_b = v_row.user_id)
    ) q;
    IF v_mconn > 0 THEN
      v_score := v_score + least(v_mconn * 2, 3);
      v_reasons := v_reasons || ('Connected to ' || v_mconn::text || ' of your connections');
    END IF;

    SELECT count(*) INTO v_mfoll
    FROM public.community_follows mine
    JOIN public.community_follows theirs ON theirs.follower_id = mine.followee_id
    WHERE mine.follower_id = v_uid AND mine.state = 'accepted'
      AND theirs.followee_id = v_row.user_id AND theirs.state = 'accepted';
    IF v_mfoll > 0 THEN
      v_score := v_score + least(v_mfoll, 3);
      v_reasons := v_reasons || ('Followed by ' || v_mfoll::text || ' you follow');
    END IF;

    IF v_me.goal IS NOT NULL AND v_row.goal = v_me.goal THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || 'Same goal'::text;
    END IF;

    IF v_me.tp_time_bands IS NOT NULL AND v_row.tp_time_bands IS NOT NULL THEN
      SELECT b INTO v_band
      FROM unnest(v_me.tp_time_bands) AS b
      WHERE b = ANY (v_row.tp_time_bands)
      ORDER BY array_position(public._community_tp_time_bands_list(), b)
      LIMIT 1;
      IF v_band IS NOT NULL THEN
        v_score := v_score + 2;
        v_reasons := v_reasons
          || ('Both usually train ' || public._community_time_band_phrase(v_band));
      END IF;
    END IF;

    IF v_me.tp_days IS NOT NULL AND v_row.tp_days IS NOT NULL THEN
      SELECT array_agg(s.d ORDER BY array_position(public._community_tp_days_list(), s.d))
      INTO v_days
      FROM (SELECT unnest(v_me.tp_days) AS d
            INTERSECT
            SELECT unnest(v_row.tp_days)) s;
      IF v_days IS NOT NULL AND array_length(v_days, 1) >= 2 THEN
        v_score := v_score + 1;
        v_reasons := v_reasons || ('Both train ' || public._community_day_list(v_days));
      END IF;
    END IF;

    IF v_me.tp_sessions_band IS NOT NULL
       AND v_row.tp_sessions_band = v_me.tp_sessions_band THEN
      v_score := v_score + 1;
      v_reasons := v_reasons
        || ('Both train ' || public._community_sessions_phrase(v_me.tp_sessions_band)
            || ' times a week');
    END IF;

    IF v_me.tp_experience_band IS NOT NULL
       AND v_row.tp_experience_band = v_me.tp_experience_band THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || 'Similar experience'::text;
    END IF;

    IF v_me.tp_staple_lifts IS NOT NULL AND v_row.tp_staple_lifts IS NOT NULL THEN
      SELECT count(*) INTO v_lifts FROM (
        SELECT unnest(v_me.tp_staple_lifts) AS l
        INTERSECT
        SELECT unnest(v_row.tp_staple_lifts)) s;
      IF v_lifts > 0 THEN
        v_score := v_score + least(v_lifts, 3);
        v_reasons := v_reasons || (v_lifts::text ||
          CASE WHEN v_lifts = 1 THEN ' staple lift in common'
               ELSE ' staple lifts in common' END);
      END IF;
    END IF;

    IF coalesce(v_me.open_to_partner, false) AND coalesce(v_row.open_to_partner, false) THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'Both open to training together'::text;
    END IF;

    IF v_score >= 1 OR _mode IN ('gym', 'area', 'partners') THEN
      v_items := v_items || jsonb_build_object(
        'card',    public._community_profile_card(v_row.user_id, v_uid),
        'reasons', to_jsonb(v_reasons),
        'score',   v_score,
        'last_active_at', v_row.last_active_at,
        'user_id', v_row.user_id);
    END IF;
  END LOOP;

  SELECT jsonb_agg(t.x ORDER BY (t.x ->> 'score')::int DESC,
                    (t.x ->> 'last_active_at')::timestamptz DESC,
                    (t.x ->> 'user_id')::uuid DESC)
  INTO v_page
  FROM (
    SELECT u.x
    FROM (SELECT unnest(v_items) AS x) u
    WHERE v_cur_score IS NULL OR (
      ((u.x ->> 'score')::int, (u.x ->> 'last_active_at')::timestamptz, (u.x ->> 'user_id')::uuid)
      < (v_cur_score, v_cur_ts, v_cur_id)
    )
    ORDER BY (u.x ->> 'score')::int DESC, (u.x ->> 'last_active_at')::timestamptz DESC,
             (u.x ->> 'user_id')::uuid DESC
    LIMIT v_lim
  ) t;
  v_page := coalesce(v_page, '[]'::jsonb);

  SELECT count(*) INTO v_remaining
  FROM (SELECT unnest(v_items) AS x) u
  WHERE v_cur_score IS NULL OR (
    ((u.x ->> 'score')::int, (u.x ->> 'last_active_at')::timestamptz, (u.x ->> 'user_id')::uuid)
    < (v_cur_score, v_cur_ts, v_cur_id)
  );

  v_page_len := jsonb_array_length(v_page);
  IF v_remaining > v_lim AND v_page_len > 0 THEN
    v_next_cursor := public._community_find_people_cursor_of(
      ((v_page -> (v_page_len - 1)) ->> 'score')::int,
      ((v_page -> (v_page_len - 1)) ->> 'last_active_at')::timestamptz,
      ((v_page -> (v_page_len - 1)) ->> 'user_id')::uuid
    );
  END IF;

  IF _cursor IS NULL AND _filters IS NULL AND v_page_len < 5 THEN
    SELECT coalesce(array_agg((x ->> 'user_id')::uuid), ARRAY[]::uuid[]) INTO v_already
    FROM jsonb_array_elements(v_page) x;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'card',    public._community_profile_card(f.user_id, v_uid),
             'reasons', '[]'::jsonb,
             'score',   0,
             'fallback', true)
           ORDER BY f.last_active_at DESC), '[]'::jsonb)
    INTO v_fallback
    FROM (
      SELECT p.user_id, p.last_active_at
      FROM public.community_profiles p
      WHERE p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false
        AND p.user_id <> v_uid
        AND NOT (p.user_id = ANY (v_already))
        AND NOT public._community_is_blocked(v_uid, p.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.community_mutes mu
          WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
      ORDER BY p.last_active_at DESC
      LIMIT 10
    ) f;

    v_page := v_page || coalesce(v_fallback, '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'card', x -> 'card', 'reasons', x -> 'reasons', 'score', x -> 'score',
           'fallback', coalesce(x -> 'fallback', 'false'::jsonb))), '[]'::jsonb)
  INTO v_page
  FROM jsonb_array_elements(v_page) x;

  RETURN jsonb_build_object(
    'mode',   _mode,
    'key',    v_key,
    'label',  v_label,
    'count',  v_scanned,
    'count_truncated', v_scanned >= 1000,
    'people', v_page,
    'cursor', v_next_cursor);
END $$;

REVOKE ALL ON FUNCTION public.community_find_people(text, text, int, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_find_people(text, text, int, jsonb, text) TO authenticated;

-- ─── Acceptance check (read-only) ────────────────────────────────────────

DO $$
DECLARE
  v_ok  boolean;
  v_src text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_profiles'
      AND column_name = 'discipline_keys'
  ) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'acceptance failed: discipline_keys column missing'; END IF;

  IF to_regprocedure('public._community_discipline_key_ok(text[])') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_discipline_key_ok missing';
  END IF;
  IF to_regprocedure('public._community_discipline_label(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_discipline_label missing';
  END IF;
  IF to_regprocedure('public._community_cohort_stats(uuid, text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: _community_cohort_stats missing';
  END IF;
  IF to_regprocedure('public.community_hub_summary(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary missing';
  END IF;
  IF to_regprocedure('public.community_dimensions_me(text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_dimensions_me(text) missing (old 0-arg signature not dropped, or new one not created)';
  END IF;
  IF to_regprocedure('public.community_find_people(text, text, integer, jsonb, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: community_find_people(..., _discipline) missing';
  END IF;

  -- migrate_167's lesson: a function that calls _community_rate_check must
  -- never be STABLE/IMMUTABLE (provolatile 's'/'i'), or PostgREST forces a
  -- read-only transaction and the rate check's own write fails every time.
  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.community_hub_summary(text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary is not VOLATILE';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure(
    'public.community_board(text, text, text, text, integer, text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_board is not VOLATILE';
  END IF;

  SELECT p.provolatile = 'v' INTO v_ok
  FROM pg_proc p WHERE p.oid = to_regprocedure(
    'public.community_find_people(text, text, integer, jsonb, text)');
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'acceptance failed: community_find_people is not VOLATILE';
  END IF;

  -- migrate_169's lesson: no ranking CTE may reference the nonexistent
  -- table alias `x` (unnest's own column alias) instead of the derived
  -- table `u`.
  SELECT pg_get_functiondef(oid) INTO v_src
  FROM pg_proc WHERE proname = 'community_board' AND pronamespace = 'public'::regnamespace;
  IF v_src ILIKE '%SELECT x.*,%' THEN
    RAISE EXCEPTION 'acceptance failed: the x.* alias bug is present in community_board';
  END IF;
  IF v_src NOT ILIKE '%discipline%' THEN
    RAISE EXCEPTION 'acceptance failed: community_board does not mention the discipline scope';
  END IF;

  -- Every function this migration touches stays SECURITY DEFINER with the
  -- pinned search_path.
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        '_community_discipline_key_ok', '_community_discipline_label',
        '_community_cohort_stats', 'community_hub_summary',
        'community_dimensions_me', 'community_dimension',
        'community_board', 'community_find_people', 'community_upsert_profile',
        '_community_profile_card')
      AND (NOT p.prosecdef OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_170 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  -- The two helpers must never be reachable by authenticated or anon.
  IF has_function_privilege('authenticated', 'public._community_discipline_key_ok(text[])', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_discipline_label(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._community_cohort_stats(uuid, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_170 helper is executable by authenticated';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_hub_summary(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_hub_summary is not executable by authenticated';
  END IF;

  RAISE NOTICE 'migrate_170 part A acceptance: OK';
END $$;
