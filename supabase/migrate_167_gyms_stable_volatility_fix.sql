-- migrate_167_gyms_stable_volatility_fix.sql
--
-- Purpose:           REAL ROOT-CAUSE FIX for the incident migrate_166 only
--                    partially patched (Sentry VOLYUME-37, Postgres error
--                    25006, "cannot execute ... in a read-only transaction").
--
--                    migrate_166 guessed the cause was a flaky pooler/
--                    routing condition and guarded the opportunistic-prune
--                    DELETE inside `_community_rate_check` with an
--                    exception handler. That was wrong, and the founder
--                    confirmed it made no difference: Sentry kept
--                    recording the SAME error immediately after migrate_166
--                    was applied, now on the mandatory
--                    `INSERT INTO community_rate_events` a few lines
--                    further down the same function -- a statement no
--                    guard was ever going to save, because it is not
--                    optional.
--
--                    The actual mechanism (confirmed by reading
--                    pg_get_functiondef against the live database, not
--                    inferred): `gyms_search`, `gyms_near`, `gyms_in_place`,
--                    `gyms_get` and `gyms_place_centroid` (all re-issued by
--                    migrate_163) are declared STABLE. PostgREST forces a
--                    hard READ ONLY transaction for any RPC call to a
--                    function declared STABLE or IMMUTABLE, REGARDLESS of
--                    the HTTP method used to call it (GET or POST) -- it
--                    trusts the function's own declared volatility. Every
--                    one of these five functions calls
--                    `_community_rate_check`, which is not read-only: it
--                    deletes stale rate rows and inserts a new one. So
--                    every single call to any of the five -- not "some
--                    fraction of connections", every one -- ran inside a
--                    transaction Postgres would never allow a write in.
--                    This explains every symptom the founder reported: no
--                    results within any radius with location on, AND a
--                    plain name search failing with no location at all --
--                    both paths call `gyms_search`/`gyms_near`, which were
--                    ALWAYS going to fail on the write, deterministically,
--                    not intermittently. The "pooler/routing condition"
--                    theory in migrate_166's own header was an inference
--                    stated as fact and was wrong.
--
--                    No other Community RPC that calls
--                    `_community_rate_check` is declared STABLE (checked
--                    against every call site across migrate_160/161/162/
--                    163/164/165) -- this bug is scoped exactly to the gym
--                    finder, matching what was actually reported.
--
--                    The fix: re-issue the five functions with their
--                    bodies UNCHANGED (pulled from the live database via
--                    pg_get_functiondef, not retyped) and the STABLE
--                    keyword removed, so Postgres treats them as VOLATILE
--                    (the correct label for a function with side effects)
--                    and PostgREST runs them in an ordinary read-write
--                    transaction like every other Community RPC.
--
--                    This also REVERTS migrate_166's exception guard on
--                    the prune DELETE. It was never the real fix and,
--                    with the actual cause corrected here, the DELETE and
--                    the INSERT that follows it run in a normal read-write
--                    transaction and have no reason to fail. Swallowing
--                    the error was masking the symptom, not curing it;
--                    once the cause is gone, so is the justification for
--                    swallowing anything. `_community_rate_check` is
--                    restored to its original migrate_160 body (plain
--                    DELETE, no handler).
--
-- Applied locally:   N/A (cloud-only functions).
-- Applied remotely:  NOT YET APPLIED. Founder gate: apply on the exact
--                    phrase "run against production" (CLAUDE.md).
-- Safe to re-run:    Yes. CREATE OR REPLACE FUNCTION, same signatures,
--                    grants unchanged (EXECUTE stays revoked from PUBLIC
--                    and anon, granted to authenticated -- matches the
--                    live ACL, confirmed via aclexplode(proacl) before
--                    writing this migration).
-- Rollback:          Re-apply migrate_163's versions of the five gyms_*
--                    functions (adds STABLE back) and migrate_166's
--                    guarded `_community_rate_check` -- not recommended,
--                    since it restores the incident.
--
-- ─── The fix ────────────────────────────────────────────────────────────

-- Part 1: _community_rate_check reverted to its original, unguarded form.
CREATE OR REPLACE FUNCTION public._community_rate_check(
  _uid uuid,
  _action text,
  _limit_new integer,
  _limit_established integer,
  _window interval DEFAULT '24:00:00'::interval
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_created timestamptz;
  v_limit   int;
  v_count   int;
BEGIN
  -- Opportunistic prune, so the rail never needs a cron job.
  DELETE FROM public.community_rate_events
  WHERE user_id = _uid AND created_at < now() - interval '7 days';

  SELECT created_at INTO v_created
  FROM public.community_profiles WHERE user_id = _uid;

  v_limit := CASE
    WHEN v_created IS NOT NULL AND v_created <= now() - interval '7 days'
      THEN _limit_established
    ELSE _limit_new
  END;

  SELECT count(*) INTO v_count
  FROM public.community_rate_events
  WHERE user_id = _uid AND action = _action AND created_at > now() - _window;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION USING message = 'rate_limited';
  END IF;

  INSERT INTO public.community_rate_events (user_id, action) VALUES (_uid, _action);
END $$;

REVOKE ALL ON FUNCTION public._community_rate_check(uuid, text, integer, integer, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._community_rate_check(uuid, text, integer, integer, interval) TO authenticated;

-- Part 2: the five gym-finder reads, VOLATILE instead of (wrongly) STABLE.
-- Bodies below are byte-identical to the live functions (pulled via
-- pg_get_functiondef against production immediately before writing this
-- migration); the only change on each is the removed STABLE keyword.

CREATE OR REPLACE FUNCTION public.gyms_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid          uuid := public._community_caller();
  v_v            public.gym_venues%ROWTYPE;
  v_brand        text;
  v_source_names jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  SELECT * INTO v_v FROM public.gym_venues WHERE id = _id;
  IF NOT FOUND OR NOT public._gyms_visible(v_v, v_uid) THEN
    RETURN NULL;
  END IF;

  SELECT b.name INTO v_brand FROM public.gym_brands b WHERE b.id = v_v.brand_id;

  SELECT coalesce(jsonb_agg(DISTINCT coalesce(s.source_name, s.source)
           ORDER BY coalesce(s.source_name, s.source)), '[]'::jsonb)
  INTO v_source_names
  FROM public.gym_venue_sources s
  WHERE s.venue_id = v_v.id;

  RETURN jsonb_build_object(
    'id', v_v.id, 'display_name', v_v.display_name, 'name', v_v.name, 'brand', v_brand,
    'venue_type', v_v.venue_type, 'address_line', v_v.address_line, 'town', v_v.town,
    'outward', v_v.outward, 'postcode', v_v.postcode, 'lat', v_v.lat, 'lng', v_v.lng,
    'region_name', v_v.region_name, 'local_authority_name', v_v.local_authority_name,
    'country', v_v.country,
    'website', v_v.website, 'phone', v_v.phone, 'facility_count', v_v.facility_count,
    'status', v_v.status, 'verification_status', v_v.verification_status,
    'source_names', v_source_names
  );
END $function$;

CREATE OR REPLACE FUNCTION public.gyms_in_place(_town_key text, _limit integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid    uuid := public._community_caller();
  v_key    text := nullif(btrim(coalesce(_town_key, '')), '');
  v_limit  int := least(greatest(coalesce(_limit, 60), 1), 80);
  v_venues jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF v_key IS NULL THEN
    RETURN jsonb_build_object('venues', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb
           ORDER BY z.brand_match DESC, z.display_name ASC), '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
           v.outward, v.postcode, v.lat, v.lng, NULL::double precision AS distance_m,
           v.region_name, v.local_authority_name, v.country,
           v.status, v.verification_status,
           (CASE WHEN v.brand_id IS NOT NULL THEN 1 ELSE 0 END) AS brand_match
    FROM public.gym_venues v
    LEFT JOIN public.gym_brands b ON b.id = v.brand_id
    WHERE v.venue_type <> 'excluded'
      AND public._gyms_visible(v, v_uid)
      AND v.town_key = v_key
    ORDER BY brand_match DESC, v.display_name ASC
    LIMIT v_limit
  ) z;

  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb));
END $function$;

CREATE OR REPLACE FUNCTION public.gyms_near(_lat double precision, _lng double precision, _radius_m integer DEFAULT 8000, _limit integer DEFAULT 40)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid       uuid := public._community_caller();
  v_radius    double precision := least(greatest(coalesce(_radius_m, 8000), 1), 80468);
  v_limit     int := least(greatest(coalesce(_limit, 40), 1), 50);
  v_lat_delta double precision := public._gyms_bbox_lat_delta(v_radius);
  v_lng_delta double precision := public._gyms_bbox_lng_delta(_lat, v_radius);
  v_venues    jsonb;
  v_returned  int;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF _lat IS NULL OR _lng IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb
           ORDER BY z.operator_unconfirmed ASC, z.distance_m ASC), '[]'::jsonb),
         count(*)
  INTO v_venues, v_returned
  FROM (
    SELECT v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
           v.outward, v.postcode, v.lat, v.lng,
           v.region_name, v.local_authority_name, v.country,
           public._gyms_distance_m(_lat, _lng, v.lat, v.lng) AS distance_m,
           v.status, v.verification_status,
           (v.verification_status = 'unverified') AS operator_unconfirmed
    FROM public.gym_venues v
    LEFT JOIN public.gym_brands b ON b.id = v.brand_id
    WHERE v.venue_type NOT IN ('excluded', 'other_fitness')
      AND public._gyms_visible(v, v_uid)
      AND v.lat IS NOT NULL AND v.lng IS NOT NULL
      AND v.lat BETWEEN _lat - v_lat_delta AND _lat + v_lat_delta
      AND v.lng BETWEEN _lng - v_lng_delta AND _lng + v_lng_delta
      AND public._gyms_distance_m(_lat, _lng, v.lat, v.lng) <= v_radius
    ORDER BY public._gyms_distance_m(_lat, _lng, v.lat, v.lng) ASC
    LIMIT v_limit
  ) z;

  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb),
                            'truncated', coalesce(v_returned, 0) >= v_limit);
END $function$;

CREATE OR REPLACE FUNCTION public.gyms_place_centroid(_q text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid       uuid := public._community_caller();
  v_raw       text := left(btrim(coalesce(_q, '')), 80);
  v_input_key text;
  v_lat       double precision;
  v_lng       double precision;
  v_town_key  text;
  v_town      text;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF v_raw = '' THEN
    RETURN jsonb_build_object('kind', 'none', 'label', NULL, 'lat', NULL, 'lng', NULL);
  END IF;

  IF public._gyms_postcode_full_valid(v_raw) THEN
    SELECT lat, lng INTO v_lat, v_lng
    FROM public.gym_postcode_sectors WHERE sector = public._gyms_sector_of(v_raw);
    IF v_lat IS NOT NULL THEN
      -- "The postcode as typed and normalised": outward + a single space +
      -- the three-character inward code, upper-cased and unpadded (e.g.
      -- "ML1 1AA"), the standard UK display form.
      RETURN jsonb_build_object(
        'kind', 'postcode',
        'label', public._gyms_outward_of(v_raw) || ' ' ||
                 right(public._gyms_postcode_compact(v_raw), 3),
        'lat', v_lat, 'lng', v_lng);
    END IF;
    RETURN jsonb_build_object('kind', 'none', 'label', NULL, 'lat', NULL, 'lng', NULL);
  ELSIF public._gyms_postcode_outward_valid(v_raw) THEN
    SELECT o_lat, o_lng INTO v_lat, v_lng
    FROM public._gyms_outward_centroid(public._gyms_outward_of(v_raw));
    IF v_lat IS NOT NULL THEN
      RETURN jsonb_build_object('kind', 'postcode', 'label', public._gyms_outward_of(v_raw),
                                 'lat', v_lat, 'lng', v_lng);
    END IF;
    RETURN jsonb_build_object('kind', 'none', 'label', NULL, 'lat', NULL, 'lng', NULL);
  END IF;

  v_input_key := nullif(public._community_fold(v_raw), '');
  IF v_input_key IS NULL THEN
    RETURN jsonb_build_object('kind', 'none', 'label', NULL, 'lat', NULL, 'lng', NULL);
  END IF;

  -- Best matching town_key: exact match first, then the most-populous
  -- prefix match, ties by key (spec: "most venues wins; ties by name").
  SELECT z.town_key INTO v_town_key
  FROM (
    SELECT v.town_key, count(*) AS n
    FROM public.gym_venues v
    WHERE v.status = 'open' AND v.town_key IS NOT NULL
      AND (v.town_key = v_input_key OR v.town_key LIKE v_input_key || '%')
    GROUP BY v.town_key
    ORDER BY (v.town_key = v_input_key) DESC, n DESC, v.town_key ASC
    LIMIT 1
  ) z;
  IF v_town_key IS NULL THEN
    RETURN jsonb_build_object('kind', 'none', 'label', NULL, 'lat', NULL, 'lng', NULL);
  END IF;

  -- The town's display casing: the MODAL `town` string for that key.
  SELECT v.town INTO v_town
  FROM public.gym_venues v
  WHERE v.status = 'open' AND v.town_key = v_town_key AND v.town IS NOT NULL
  GROUP BY v.town
  ORDER BY count(*) DESC, v.town ASC
  LIMIT 1;

  SELECT avg(v.lat), avg(v.lng) INTO v_lat, v_lng
  FROM public.gym_venues v
  WHERE v.status = 'open' AND v.town_key = v_town_key AND v.lat IS NOT NULL AND v.lng IS NOT NULL;
  IF v_lat IS NULL THEN
    RETURN jsonb_build_object('kind', 'none', 'label', NULL, 'lat', NULL, 'lng', NULL);
  END IF;

  RETURN jsonb_build_object('kind', 'town', 'label', coalesce(v_town, v_town_key),
                             'lat', v_lat, 'lng', v_lng);
END $function$;

CREATE OR REPLACE FUNCTION public.gyms_search(_q text, _lat double precision DEFAULT NULL::double precision, _lng double precision DEFAULT NULL::double precision, _limit integer DEFAULT 40, _radius_m double precision DEFAULT NULL::double precision)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid       uuid := public._community_caller();
  v_raw       text := left(btrim(coalesce(_q, '')), 80);
  v_is_pc     boolean := public._gyms_postcode_full_valid(v_raw)
                      OR public._gyms_postcode_outward_valid(v_raw);
  v_outward   text := public._gyms_outward_of(v_raw);
  v_toks      text[] := (array_remove(
                  string_to_array(public._community_fold(v_raw), ' '), ''))[1:8];
  v_last_tok  text;
  v_limit     int := least(greatest(coalesce(_limit, 40), 1), 40);
  v_radius    double precision := least(greatest(coalesce(_radius_m, 8047), 1), 80468);
  v_lat_delta double precision;
  v_lng_delta double precision;
  v_venues    jsonb;
  v_centroid  jsonb;
  v_c_lat     double precision;
  v_c_lng     double precision;
  -- Lead addition, Finding S1 (09-gym-journey-tests.md section 7): the
  -- brand the QUERY TEXT matches (independent of any one candidate row),
  -- and the tokens left over once that brand's own words are set aside.
  v_query_brand_id   uuid;
  v_brand_alias_toks text[];
  v_nonbrand_toks    text[];
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF array_length(v_toks, 1) > 0 THEN
    v_last_tok := v_toks[array_length(v_toks, 1)];
  END IF;

  SELECT b.id INTO v_query_brand_id
  FROM public.gym_brands b, unnest(b.aliases) al
  WHERE array_length(v_toks, 1) > 0 AND (
    public._community_fold(al) = ANY (v_toks)
    OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE public._community_fold(al) LIKE qt || '%')
  )
  ORDER BY length(public._community_fold(al)) DESC
  LIMIT 1;
  v_brand_alias_toks := public._gyms_brand_alias_tokens(v_query_brand_id);
  SELECT coalesce(array_agg(t), ARRAY[]::text[]) INTO v_nonbrand_toks
  FROM unnest(coalesce(v_toks, ARRAY[]::text[])) t
  WHERE NOT (t = ANY (coalesce(v_brand_alias_toks, ARRAY[]::text[])));

  -- Spec 1.1 A: a recognised postcode with no caller-supplied coordinate
  -- resolves its own centroid server-side, returned to the client so it
  -- can run a separate near() at whatever mile band is chosen.
  IF v_is_pc AND _lat IS NULL AND _lng IS NULL THEN
    v_centroid := public.gyms_place_centroid(v_raw);
    IF coalesce(v_centroid ->> 'kind', 'none') <> 'none' THEN
      v_c_lat := (v_centroid ->> 'lat')::double precision;
      v_c_lng := (v_centroid ->> 'lng')::double precision;
    ELSE
      v_centroid := NULL;
    END IF;
  END IF;

  IF _lat IS NOT NULL AND _lng IS NOT NULL THEN
    v_lat_delta := public._gyms_bbox_lat_delta(40000);
    v_lng_delta := public._gyms_bbox_lng_delta(_lat, 40000);
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb
           ORDER BY z.brand_match DESC, z.town_match DESC, z.near_nonbrand_match DESC,
                    z.operator_unconfirmed ASC, z.distance_m ASC NULLS LAST, z.display_name ASC),
         '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT
      v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
      v.outward, v.postcode, v.lat, v.lng,
      v.region_name, v.local_authority_name, v.country,
      CASE
        WHEN _lat IS NOT NULL AND _lng IS NOT NULL
          THEN public._gyms_distance_m(_lat, _lng, v.lat, v.lng)
        WHEN v_c_lat IS NOT NULL AND v_c_lng IS NOT NULL
          THEN public._gyms_distance_m(v_c_lat, v_c_lng, v.lat, v.lng)
      END AS distance_m,
      v.status, v.verification_status,
      (v.verification_status = 'unverified') AS operator_unconfirmed,
      -- Findings item 10 / Finding S1 second half: brand_match counts only
      -- a venue whose OWN assigned brand (v.brand_id, joined as `b` below)
      -- matches -- never an independent whose free-text name merely
      -- contains an alias word.
      (CASE WHEN array_length(v_toks, 1) > 0 AND v.brand_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
         WHERE public._community_fold(al) = ANY (v_toks)
            OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE public._community_fold(al) LIKE qt || '%')
       ) THEN 1 ELSE 0 END) AS brand_match,
      (CASE WHEN array_length(v_toks, 1) > 0 AND (
         v.town_key = ANY (v_toks)
         OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE v.town_key LIKE qt || '%')
       ) THEN 1 ELSE 0 END) AS town_match,
      -- Finding S1: a leftover non-brand query token fuzzy-matches this
      -- row's town or name tokens on their first four folded characters
      -- (a cheap, extension-free stand-in for edit distance, GD-09),
      -- inserted ahead of the alphabetical tie-break so a brand+town typo
      -- is not silently excluded by the 40-candidate cap.
      (CASE WHEN array_length(v_nonbrand_toks, 1) > 0 AND EXISTS (
         SELECT 1 FROM unnest(v_nonbrand_toks) nt
         WHERE length(nt) > 0 AND (
           v.town_key LIKE left(nt, 4) || '%'
           OR EXISTS (SELECT 1 FROM unnest(v.tokens) vt WHERE vt LIKE left(nt, 4) || '%')
         )
       ) THEN 1 ELSE 0 END) AS near_nonbrand_match
    FROM public.gym_venues v
    LEFT JOIN public.gym_brands b ON b.id = v.brand_id
    WHERE v.venue_type <> 'excluded'
      AND public._gyms_visible(v, v_uid)
      AND (
        (v_is_pc AND v_outward IS NOT NULL AND (
          v.outward = v_outward
          OR (v_c_lat IS NOT NULL AND v_c_lng IS NOT NULL AND v.status = 'open'
              AND v.lat IS NOT NULL AND v.lng IS NOT NULL
              AND public._gyms_distance_m(v_c_lat, v_c_lng, v.lat, v.lng) <= v_radius)
        ))
        OR (NOT v_is_pc AND array_length(v_toks, 1) > 0 AND (
          v.tokens && v_toks
          OR EXISTS (SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
                     WHERE public._community_fold(al) = ANY (v_toks))
          OR v.town_key = ANY (v_toks)
          OR (
            v_last_tok IS NOT NULL
            AND (
              EXISTS (SELECT 1 FROM unnest(v.tokens) t WHERE t LIKE v_last_tok || '%')
              OR v.town_key LIKE v_last_tok || '%'
              OR EXISTS (SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
                         WHERE public._community_fold(al) LIKE v_last_tok || '%')
            )
          )
        ))
      )
      AND (_lat IS NULL OR _lng IS NULL OR v.lat IS NULL OR v.lng IS NULL OR (
        v.lat BETWEEN _lat - v_lat_delta AND _lat + v_lat_delta AND
        v.lng BETWEEN _lng - v_lng_delta AND _lng + v_lng_delta
      ))
    ORDER BY brand_match DESC, town_match DESC, near_nonbrand_match DESC,
             operator_unconfirmed ASC, distance_m ASC NULLS LAST, v.display_name ASC
    LIMIT v_limit
  ) z;

  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb),
                            'recognised_postcode', v_is_pc,
                            'centroid', v_centroid);
END $function$;

REVOKE ALL ON FUNCTION public.gyms_get(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_get(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.gyms_in_place(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_in_place(text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.gyms_near(double precision, double precision, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_near(double precision, double precision, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.gyms_place_centroid(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_place_centroid(text) TO authenticated;
REVOKE ALL ON FUNCTION public.gyms_search(text, double precision, double precision, integer, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_search(text, double precision, double precision, integer, double precision) TO authenticated;

-- ─── Acceptance check (read-only) ───────────────────────────────────────
DO $$
DECLARE
  v_bad_count int;
  v_rate_src  text;
BEGIN
  SELECT count(*) INTO v_bad_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('gyms_search', 'gyms_near', 'gyms_in_place', 'gyms_get', 'gyms_place_centroid')
    AND provolatile = 's';
  IF v_bad_count > 0 THEN
    RAISE EXCEPTION 'acceptance failed: % gym-finder function(s) still STABLE', v_bad_count;
  END IF;

  SELECT pg_get_functiondef(oid) INTO v_rate_src
  FROM pg_proc WHERE proname = '_community_rate_check' AND pronamespace = 'public'::regnamespace;
  IF v_rate_src ILIKE '%EXCEPTION WHEN OTHERS THEN%' THEN
    RAISE EXCEPTION 'acceptance failed: _community_rate_check still swallows errors';
  END IF;

  RAISE NOTICE 'migrate_167 acceptance: OK — gym-finder functions are VOLATILE, rate-check prune unguarded';
END $$;
