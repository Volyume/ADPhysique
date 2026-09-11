-- migrate_172_community_pr_count.sql
--
-- Purpose:           The progress strip's "3 PRs in 4 weeks" figure
--                    (communities revamp blueprint section 4, CR-05, and
--                    section 9's profile: "PRs show as a count on the strip
--                    when the person shares what they did"). The fresh-eyes
--                    review of phases 0 to 3 (2026-09-11, finding F8) found
--                    it was never built in the schema or the client: no
--                    column, no counter, no strip cell. This migration is
--                    the schema half.
--
--                    One additive column, `community_profiles.c_prs_4w`
--                    (smallint, the number of personal records the device
--                    counted in the last 28 days, clamped 0..200), accepted
--                    by `community_update_training_profile` under EXACTLY
--                    the gate every other counter has (sent only when
--                    `share_consistency` is true, never for a minor or a
--                    non-active caller, out-of-range dropped to null), and
--                    exposed on `_community_profile_card` only when the
--                    owner shares consistency AND shares what they did
--                    (`share_sessions`), to a viewer who may see the
--                    profile. A count, never a lift: no exercise, no
--                    weight, no rep count leaves the device through this
--                    field (SD rulings: a PR is a moment, never a table).
--
--                    Both functions are RE-ISSUED IN FULL, carried forward
--                    byte-for-byte from their current definitions
--                    (`community_update_training_profile` from migrate_165
--                    lines 298-517; `_community_profile_card` from
--                    migrate_170 lines 765-866) with only the lines marked
--                    `migrate_172` added, and the guard test proves that
--                    derivation (`src/__tests__/migrate172.rpcOnly.guard.
--                    test.js`).
--
-- Applied locally:   n/a (cloud-only; nothing in database.js)
-- Applied remotely:  NOT YET - waits for the founder's exact phrase
--                    "run against production"; Claude-run through the
--                    Supabase connector on that phrase, in the same batch
--                    as migrate_171. The client half (the device counter,
--                    its publish, and the strip cell) lands after the apply.
-- Safe to re-run:    YES - ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE for
--                    both functions, idempotent REVOKE/GRANT, read-only
--                    acceptance block.
-- Rollback:          re-apply migrate_165's community_update_training_profile
--                    and migrate_170's _community_profile_card as written
--                    there (both CREATE OR REPLACE), then
--                    ALTER TABLE public.community_profiles DROP COLUMN IF
--                    EXISTS c_prs_4w. An old client that still sends the key
--                    is simply ignored by the older function.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        165 (the counters and their gate), 170 (share_sessions,
--                    the card's v_show_consistency gate).

-- ─── Part 1: the column ────────────────────────────────────────────────────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS c_prs_4w smallint;

-- ─── Part 2: community_update_training_profile, re-issued in full ──────────
-- Carried forward byte-for-byte from migrate_165 lines 298-517; only the
-- lines marked migrate_172 are new.

CREATE OR REPLACE FUNCTION public.community_update_training_profile(_p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_me       public.community_profiles%ROWTYPE;
  v_days     text[];
  v_bands    text[];
  v_lifts    text[];
  v_sessions text;
  v_exp      text;
  v_prog     text;
  v_share    boolean := false;
  v_age      text;
  v_raw      text;
  v_dob      date;
  v_years    int;
  v_v        text;
  -- Design 60 §1: consistency counters, accepted only when share_consistency
  -- is sent true; a minor or non-active caller never gets one stored.
  v_share_consistency boolean := false;
  v_c_sessions_week    int;
  v_c_sessions_month   int;
  v_c_weeks_streak     int;
  v_c_planned_pct_4w   smallint;
  v_c_consistent_12w   smallint;
  v_c_trained_days     text[];
  v_c_last_trained_day text;
  v_c_weeks_history     smallint[];
  -- migrate_172 (blueprint section 4, CR-05): PRs in the last four weeks,
  -- a count only, never a lift; accepted under the same gate as every
  -- counter above.
  v_c_prs_4w           smallint;
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  -- Belt and braces: a payload that somehow carried a body or nutrition key
  -- is refused before anything is written (migrate_160 Part 7).
  PERFORM public._community_forbidden_keys(_p);

  v_me := public._community_require_profile(v_uid, true);
  PERFORM public._community_require_rules(v_me);

  IF jsonb_typeof(_p -> 'tp_days') = 'array' THEN
    SELECT array_agg(s.d ORDER BY array_position(public._community_tp_days_list(), s.d))
    INTO v_days
    FROM (SELECT DISTINCT value AS d FROM jsonb_array_elements_text(_p -> 'tp_days')) s;
    IF v_days IS NOT NULL THEN
      IF array_length(v_days, 1) > 7 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      FOREACH v_v IN ARRAY v_days LOOP
        IF NOT (v_v = ANY (public._community_tp_days_list())) THEN
          RAISE EXCEPTION USING message = 'invalid_input';
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF jsonb_typeof(_p -> 'tp_time_bands') = 'array' THEN
    SELECT array_agg(s.b ORDER BY array_position(public._community_tp_time_bands_list(), s.b))
    INTO v_bands
    FROM (SELECT DISTINCT value AS b FROM jsonb_array_elements_text(_p -> 'tp_time_bands')) s;
    IF v_bands IS NOT NULL THEN
      IF array_length(v_bands, 1) > 2 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      FOREACH v_v IN ARRAY v_bands LOOP
        IF NOT (v_v = ANY (public._community_tp_time_bands_list())) THEN
          RAISE EXCEPTION USING message = 'invalid_input';
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF jsonb_typeof(_p -> 'tp_staple_lifts') = 'array' THEN
    SELECT array_agg(s.l) INTO v_lifts
    FROM (SELECT DISTINCT value AS l FROM jsonb_array_elements_text(_p -> 'tp_staple_lifts')) s;
    IF v_lifts IS NOT NULL THEN
      IF array_length(v_lifts, 1) > 5 THEN RAISE EXCEPTION USING message = 'invalid_input'; END IF;
      FOREACH v_v IN ARRAY v_lifts LOOP
        IF v_v !~ '^[a-z0-9_:-]{1,64}$' THEN
          RAISE EXCEPTION USING message = 'invalid_input';
        END IF;
      END LOOP;
    END IF;
  END IF;

  v_sessions := nullif(btrim(coalesce(_p ->> 'tp_sessions_band', '')), '');
  IF v_sessions IS NOT NULL
     AND NOT (v_sessions = ANY (public._community_tp_sessions_list())) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_exp := nullif(btrim(coalesce(_p ->> 'tp_experience_band', '')), '');
  IF v_exp IS NOT NULL
     AND NOT (v_exp = ANY (public._community_tp_experience_list())) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  v_prog := nullif(btrim(coalesce(_p ->> 'tp_programme_key', '')), '');
  IF v_prog IS NOT NULL THEN
    IF v_prog LIKE 'community:%' THEN v_prog := btrim(substring(v_prog FROM 11)); END IF;
    IF NOT (v_prog ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            OR v_prog ~ '^style:[a-z0-9_]{1,64}$') THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    IF v_prog !~ '^style:' AND NOT public._community_can_view_programme(v_uid, v_prog::uuid) THEN
      v_prog := NULL;
    END IF;
  END IF;

  IF jsonb_typeof(_p -> 'share_age_band') = 'boolean' THEN
    v_share := (_p ->> 'share_age_band')::boolean;
  END IF;
  IF v_share AND NOT public._community_caller_is_minor(v_uid) THEN
    SELECT date_of_birth INTO v_raw FROM public.user_body_profile
    WHERE user_id = v_uid LIMIT 1;
    IF v_raw IS NOT NULL AND btrim(v_raw) <> '' THEN
      BEGIN
        v_dob := substring(btrim(v_raw) FROM 1 FOR 10)::date;
      EXCEPTION WHEN others THEN
        v_dob := NULL;
      END;
    END IF;
    IF v_dob IS NOT NULL THEN
      v_years := date_part('year', age(current_date, v_dob))::int;
      v_age := CASE
        WHEN v_years < 18 THEN NULL
        WHEN v_years <= 24 THEN '18_24'
        WHEN v_years <= 34 THEN '25_34'
        WHEN v_years <= 44 THEN '35_44'
        WHEN v_years <= 54 THEN '45_54'
        ELSE '55_plus'
      END;
    END IF;
  END IF;

  -- Design 60 §1: the counters travel only when share_consistency is sent
  -- true, and only for a caller who is neither a minor nor restricted (the
  -- `_community_require_profile(v_uid, true)` call above already refused a
  -- non-active caller before this point is reached). Every counter is
  -- validated key-by-key -- jsonb has no CHECK-constraint equivalent -- and
  -- an out-of-range value is simply dropped (null), never a hard refusal:
  -- a device on a stale build sending one bad field should not lose every
  -- other field it sent correctly.
  IF jsonb_typeof(_p -> 'share_consistency') = 'boolean' THEN
    v_share_consistency := (_p ->> 'share_consistency')::boolean;
  END IF;
  IF v_share_consistency AND public._community_caller_is_minor(v_uid) THEN
    v_share_consistency := false;
  END IF;

  IF v_share_consistency THEN
    IF jsonb_typeof(_p -> 'c_sessions_week') = 'number' THEN
      v_c_sessions_week := greatest(0, least((_p ->> 'c_sessions_week')::int, 21));
    END IF;
    IF jsonb_typeof(_p -> 'c_sessions_month') = 'number' THEN
      v_c_sessions_month := greatest(0, least((_p ->> 'c_sessions_month')::int, 93));
    END IF;
    IF jsonb_typeof(_p -> 'c_weeks_streak') = 'number' THEN
      v_c_weeks_streak := greatest(0, least((_p ->> 'c_weeks_streak')::int, 520));
    END IF;
    IF jsonb_typeof(_p -> 'c_planned_pct_4w') = 'number' THEN
      v_c_planned_pct_4w := greatest(0, least((_p ->> 'c_planned_pct_4w')::int, 100))::smallint;
    END IF;
    IF jsonb_typeof(_p -> 'c_consistent_weeks_12w') = 'number' THEN
      v_c_consistent_12w := greatest(0, least((_p ->> 'c_consistent_weeks_12w')::int, 12))::smallint;
    END IF;
    IF jsonb_typeof(_p -> 'c_trained_days_week') = 'array' THEN
      SELECT array_agg(DISTINCT value) INTO v_c_trained_days
      FROM jsonb_array_elements_text(_p -> 'c_trained_days_week') AS value
      WHERE value IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
    END IF;
    v_c_last_trained_day := nullif(btrim(coalesce(_p ->> 'c_last_trained_day', '')), '');
    IF v_c_last_trained_day IS NOT NULL AND v_c_last_trained_day !~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_c_last_trained_day := NULL;
    END IF;
    -- Design 60 section 4, D4: the 8-week history for the mini bars.
    -- Malformed input (wrong length, non-numeric elements) is dropped to
    -- null rather than refusing the whole call, the same posture every
    -- other counter here has.
    IF jsonb_typeof(_p -> 'c_weeks_history') = 'array' THEN
      BEGIN
        SELECT array_agg(greatest(0, least(x.v, 21))::smallint ORDER BY x.ord)
        INTO v_c_weeks_history
        FROM (
          SELECT (elem)::int AS v, ord
          FROM jsonb_array_elements_text(_p -> 'c_weeks_history') WITH ORDINALITY AS e(elem, ord)
        ) x;
      EXCEPTION WHEN others THEN
        v_c_weeks_history := NULL;
      END;
      IF v_c_weeks_history IS NOT NULL AND array_length(v_c_weeks_history, 1) <> 8 THEN
        v_c_weeks_history := NULL;
      END IF;
    END IF;
    -- migrate_172: the PR count, clamped like its siblings; an out-of-range
    -- or missing value is null, never a refusal.
    IF jsonb_typeof(_p -> 'c_prs_4w') = 'number' THEN
      v_c_prs_4w := greatest(0, least((_p ->> 'c_prs_4w')::int, 200))::smallint;
    END IF;
  END IF;

  PERFORM public._community_rate_check(v_uid, 'update_training_profile', 120, 120, interval '1 hour');

  UPDATE public.community_profiles SET
    tp_days            = v_days,
    tp_time_bands      = v_bands,
    tp_sessions_band   = v_sessions,
    tp_staple_lifts    = v_lifts,
    tp_experience_band = v_exp,
    tp_programme_key   = v_prog,
    tp_age_band        = v_age,
    tp_updated_at      = now(),
    share_consistency      = v_share_consistency,
    c_sessions_week        = v_c_sessions_week,
    c_sessions_month       = v_c_sessions_month,
    c_weeks_streak         = v_c_weeks_streak,
    c_planned_pct_4w       = v_c_planned_pct_4w,
    c_consistent_weeks_12w = v_c_consistent_12w,
    c_trained_days_week    = v_c_trained_days,
    c_last_trained_day     = v_c_last_trained_day,
    c_weeks_history         = v_c_weeks_history,
    c_prs_4w               = v_c_prs_4w,
    c_updated_at           = CASE WHEN v_share_consistency THEN now() ELSE NULL END
  WHERE user_id = v_uid;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

REVOKE ALL ON FUNCTION public.community_update_training_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_update_training_profile(jsonb) TO authenticated;

-- ─── Part 3: _community_profile_card, re-issued in full ───────────────────
-- Carried forward byte-for-byte from migrate_170 lines 765-866; only the
-- lines marked migrate_172 are new. Internal helper: never executable by
-- anon or authenticated.

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
    -- migrate_172 (blueprint section 4): the PR count travels only when the
    -- owner shares consistency AND shares what they did; a count, never a
    -- lift. The key is always present, the value null otherwise.
    'c_prs_4w',               CASE WHEN v_show_consistency AND coalesce(p.share_sessions, false) THEN p.c_prs_4w END,
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

-- ─── Acceptance check (read-only) ──────────────────────────────────────────

DO $$
DECLARE
  v_src text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_profiles' AND column_name = 'c_prs_4w'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: community_profiles.c_prs_4w missing';
  END IF;

  SELECT pg_get_functiondef(to_regprocedure('public.community_update_training_profile(jsonb)')) INTO v_src;
  IF v_src IS NULL OR v_src NOT ILIKE '%c_prs_4w%' THEN
    RAISE EXCEPTION 'acceptance failed: community_update_training_profile does not accept c_prs_4w';
  END IF;
  SELECT pg_get_functiondef(to_regprocedure('public._community_profile_card(uuid, uuid)')) INTO v_src;
  IF v_src IS NULL OR v_src NOT ILIKE '%c_prs_4w%' THEN
    RAISE EXCEPTION 'acceptance failed: _community_profile_card does not carry c_prs_4w';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('community_update_training_profile', '_community_profile_card')
      AND (NOT p.prosecdef OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_172 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.community_update_training_profile(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_update_training_profile is not executable by authenticated';
  END IF;
  IF has_function_privilege('authenticated', 'public._community_profile_card(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public._community_profile_card(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: _community_profile_card is executable by a client role';
  END IF;

  RAISE NOTICE 'migrate_172 acceptance: OK';
END $$;
