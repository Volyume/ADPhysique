-- migrate_168_gym_finder_relevance_and_order_fix.sql
--
-- Purpose:           Two real, founder-reproduced defects in the gym
--                    finder, found immediately after migrate_167 fixed
--                    the transaction incident and the finder became
--                    usable again.
--
--                    (1) `gyms_near` ("Use my location") ordered its
--                    results `operator_unconfirmed ASC, distance_m ASC`
--                    -- verification status BEFORE distance. Any
--                    confirmed venue, however far, sorted ahead of every
--                    unconfirmed venue, however close: founder device
--                    report showed "Anytime Fitness Southport" at 4.2
--                    miles listed above "Formby Hall Golf Resort And
--                    Spa" at 0.4 miles and "My Gym at Formby Hall" at 0.6
--                    miles, on a screen whose entire point is a
--                    distance-ordered "near me" list. Fixed by making
--                    distance the primary sort key and verification the
--                    tie-break, matching what the mile badge on every
--                    row already promises.
--
--                    (2) `gyms_search`'s free-text match qualifies a
--                    venue on ANY shared token between the query and the
--                    venue's name (`v.tokens && v_toks`), with no
--                    distinction between a distinguishing word and a
--                    generic venue-type word. Confirmed directly against
--                    production: the query "volt gym" matches 4,075 of
--                    the ~10,600 open venues on the word "gym" alone
--                    (4,073 of them carry that token), swamping the 4
--                    real Volt-named venues; with no coordinate supplied
--                    (the client's text search never sends one, on
--                    purpose -- GD-09, "a typed name still appears
--                    whatever the radius") the results are capped at 40
--                    and tie-broken alphabetically, so the real match
--                    routinely does not survive the cap at all. Fixed by
--                    stripping a short, fixed list of generic venue-type
--                    words (gym, fitness, club, centre, leisure, studio,
--                    health, academy, training, sports, plus bare
--                    stopwords "the"/"and"/"of"/"a"/"an"/"s") from the
--                    tokens used to QUALIFY a match (both the token-
--                    overlap check and the last-token typo-tolerance
--                    fallback), falling back to the full token set only
--                    when every token typed is generic (so a bare "gym"
--                    search still returns every gym, as before). Verified
--                    directly against production: stripping "gym" from
--                    "volt gym" drops the candidate count from 4,075 to
--                    the correct 4. Town/brand/postcode matching,
--                    distance and the display-order ranking are
--                    unchanged; activity-type words that are genuinely
--                    distinguishing (yoga, pilates, karate, boxing,
--                    martial, arts, gymnastics, crossfit) are
--                    deliberately NOT on the generic list.
--
-- Applied locally:   N/A (cloud-only functions).
-- Applied remotely:  NOT YET APPLIED. Founder gate: apply on the exact
--                    phrase "run against production" (CLAUDE.md).
-- Safe to re-run:    Yes. CREATE OR REPLACE FUNCTION, same signatures,
--                    grants unchanged (EXECUTE stays revoked from PUBLIC
--                    and anon, granted to authenticated).
-- Rollback:          Re-apply migrate_167's versions of `gyms_search` and
--                    `gyms_near` (not recommended, restores both defects).
--
-- ─── The fix ────────────────────────────────────────────────────────────

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
           -- Distance first: this is a "near me" list and every row shows
           -- a mile badge, so the order must match what that badge says.
           -- Verification stays a tie-break only (founder device report
           -- 2026-09-07, migrate_168).
           ORDER BY z.distance_m ASC, z.operator_unconfirmed ASC), '[]'::jsonb),
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
  -- migrate_168: words that name a venue TYPE rather than distinguish
  -- one venue from another. On their own they qualify a match (a bare
  -- "gym" search still returns every gym, unchanged); alongside a real
  -- distinguishing word they must not, or that word does all the work
  -- ("volt gym" matched 4,075 of ~10,600 open venues on "gym" alone,
  -- confirmed against production before writing this migration).
  -- Deliberately excludes genuine activity words (yoga, pilates, karate,
  -- martial, arts, boxing, gymnastics, crossfit) - those DO distinguish.
  v_generic_toks CONSTANT text[] := ARRAY[
    'gym', 'gyms', 'fitness', 'club', 'clubs', 'centre', 'center',
    'leisure', 'studio', 'studios', 'health', 'academy', 'training',
    'sports', 'sport', 'the', 'and', 'of', 'a', 'an', 's'
  ];
  v_meaningful_toks text[];
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

  -- Fall back to every token typed only when ALL of them are generic
  -- (so "gym" alone, or "fitness club", still matches broadly as before).
  SELECT array_agg(t) INTO v_meaningful_toks
  FROM unnest(v_toks) t WHERE NOT (t = ANY (v_generic_toks));
  IF v_meaningful_toks IS NULL OR array_length(v_meaningful_toks, 1) IS NULL THEN
    v_meaningful_toks := v_toks;
  END IF;

  IF array_length(v_meaningful_toks, 1) > 0 THEN
    v_last_tok := v_meaningful_toks[array_length(v_meaningful_toks, 1)];
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
  FROM unnest(coalesce(v_meaningful_toks, ARRAY[]::text[])) t
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
        OR (NOT v_is_pc AND array_length(v_meaningful_toks, 1) > 0 AND (
          v.tokens && v_meaningful_toks
          OR EXISTS (SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
                     WHERE public._community_fold(al) = ANY (v_meaningful_toks))
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

REVOKE ALL ON FUNCTION public.gyms_near(double precision, double precision, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_near(double precision, double precision, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.gyms_search(text, double precision, double precision, integer, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gyms_search(text, double precision, double precision, integer, double precision) TO authenticated;

-- ─── Acceptance check (read-only) ───────────────────────────────────────
DO $$
DECLARE
  v_near_src   text;
  v_search_src text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_near_src
  FROM pg_proc WHERE proname = 'gyms_near' AND pronamespace = 'public'::regnamespace;
  IF v_near_src NOT ILIKE '%ORDER BY z.distance_m ASC, z.operator_unconfirmed ASC%' THEN
    RAISE EXCEPTION 'acceptance failed: gyms_near is not distance-first';
  END IF;

  SELECT pg_get_functiondef(oid) INTO v_search_src
  FROM pg_proc WHERE proname = 'gyms_search' AND pronamespace = 'public'::regnamespace;
  IF v_search_src NOT ILIKE '%v_generic_toks%' THEN
    RAISE EXCEPTION 'acceptance failed: gyms_search has no generic-word list';
  END IF;

  RAISE NOTICE 'migrate_168 acceptance: OK — gyms_near is distance-first, gyms_search ignores generic venue words when a real word is present';
END $$;
