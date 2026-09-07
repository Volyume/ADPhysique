-- migrate_163_community_place_and_finder.sql
--
-- FINDINGS FOR THE LEAD (every judgement call made while building this
-- file; nothing below is founder-gated, all are within-spec engineering
-- calls made to keep the migration additive, idempotent and consistent
-- with 160-162's own conventions):
--
--   1. The "operator-verification column in 162" the brief asked me to
--      confirm or STOP on: it is `gym_venues.verification_status` (text,
--      default 'unverified'; other values 'user_submitted_pending',
--      'user_submitted_verified', 'moderator_verified', 'rejected' -- the
--      last only ever paired with status='closed', so it is never visible
--      via `_gyms_visible`). There is no boolean column. I derive
--      `operator_unconfirmed` as `verification_status = 'unverified'`
--      (the pipeline's own unclassified default; a confirmed/moderator-
--      verified or even freshly-submitted-pending row all count as "not
--      the plain pipeline default", which is the only distinction the
--      catalogue draws today) rather than STOPping, since a column exists
--      and this reading is unambiguous from its own CHECK/usage.
--   2. `community_set_place`'s stored centroid for a POSTCODE-kind place is
--      recomputed at OUTWARD level via `_gyms_outward_centroid`, not taken
--      verbatim from `gyms_place_centroid`'s own 'postcode' branch (which
--      resolves a FULL postcode to its SECTOR centroid for gym-search
--      purposes). Reason: `place_kind` is CHECKed to `('outward','town')`
--      -- there is no 'sector' option -- and 20-JUDGEMENT.md section 7
--      is explicit that a place is never sharper than a town/district ("a
--      person carries a place key and the place's public centroid, never
--      their own coordinate"). Storing a full-postcode-shaped label or a
--      sector-level centroid on a person's OWN chosen place would be both
--      a CHECK violation and a privacy regression, so the outward code
--      (never the full postcode) is always both the label and the key for
--      a postcode-shaped `_q`, regardless of whether the caller typed a
--      full postcode or just the district.
--   3. Spec 1.1 B names the place-from-gym population as living in
--      `community_upsert_profile`; spec 1.2's Join-step narrative says the
--      place is "populated server-side from the main gym" at
--      `community_set_gyms` time (Join submit calls `community_set_gyms`,
--      never `community_upsert_profile`, for gym selection). Both are
--      true statements about different moments, so the population logic
--      is one idempotent helper, `_community_populate_place_from_gym`
--      (never overwrites an existing `place_key`), called from BOTH
--      `community_set_gyms` (so Join submission gets a place immediately,
--      matching 1.2) and `community_upsert_profile` (so a profile that
--      picked a gym before this migration backfills its place the next
--      time it saves anything, matching 1.1 B's own words). Neither call
--      site's existing signature changes.
--   4. That helper updates `place_*` only, never `area_label`/`area_key`:
--      those stay whatever the person's own free-text area save (or a
--      prior `community_set_place` call) already wrote. Only the explicit
--      `community_set_place` RPC (a deliberate user action) syncs
--      `area_label`/`area_key` to match, per spec 1.1 B's own line for
--      that function specifically. Silently overwriting a person's typed
--      area string as a side effect of an unrelated gym pick would be a
--      surprising, not-asked-for behaviour change.
--   5. `community_find_people`'s new `_filters.scope` is independent of
--      `_mode`: a filter sheet can apply "Where: My gym" on top of any
--      door (blueprint P0-E, "doors remain as presets over the same
--      query"). So `_filters` predicates test `v_me.gym_key`/
--      `v_me.place_key` directly and are ANDed alongside the existing,
--      UNCHANGED per-mode predicates -- they never replace the 'gym' or
--      'area' mode's own key match. The 'area' mode's OWN key resolution
--      does change (place_key with area_key fallback), exactly as spec'd.
--   6. Place-reason score weights are not numerically specified in
--      30-IMPLEMENTATION.md (only "plus +1 ... reason same_age_band ...
--      and place reasons: same_place, near_place, within_25_miles").
--      `same_age_band` is the specified +1. For the three place reasons I
--      used +2/+1/+1 (same_place/near_place/within_25_miles), mirroring
--      the existing area-match weight (+2) it supersedes and the file's
--      existing small-integer scale for a same_key match. Flagging for
--      lead confirmation rather than treating it as fact.
--   7. The keyset cursor for `community_find_people` is encoded as
--      `score|iso_timestamp|uuid` (a new pair of helpers,
--      `_community_find_people_cursor_of`/`_parts`), matching the EXACT
--      style of the existing `_community_cursor_of`/`_community_cursor_
--      parts` pipe-delimited convention (migrate_160:1007/977) rather
--      than the base64-JSON shape floated in the dispatch brief: a
--      same-file convention that already exists and that every other
--      cursor in this codebase uses takes precedence over inventing a
--      second cursor grammar. The client never parses this string (every
--      current caller treats `cursor` as an opaque pass-through), so this
--      is a compatible choice, not a breaking one.
--   8. `community_find_people`'s `count`/`count_truncated` are redefined
--      per spec ("the number actually scored" / "true when the scan cap
--      was hit") to replace the OLD separate exact-count query entirely:
--      `count` is now the number of candidate rows the 1,000-row scan
--      actually iterated (not the post-score-filter or post-page count),
--      and `count_truncated` is true exactly when that scan hit its cap.
--   9. The SD-28 fallback (mode returns <5 rows, first page, no filters)
--      is read as applying to any door once its own key requirement is
--      satisfied (so a keyed door with a real key but a genuinely small
--      network still gets it) -- "never for keyed doors whose key is
--      missing" is satisfied structurally because that case already
--      returns early with an empty page before the fallback block runs.
--  10. Lead addition (2026-09-07, `09-gym-journey-tests.md` findings
--      S1/D2/R1): implemented as items A6-A8 below (search headers).
--      Finding S1's second half ("brand_match must only count when the
--      venue's brand_key matches") was VERIFIED, not changed: 162's
--      existing `brand_match` column is already computed only from the
--      LEFT JOINed `gym_brands b` row where `b.id = v.brand_id`, so an
--      independent venue with `brand_id IS NULL` already scores
--      `brand_match = 0` regardless of what its own name text contains
--      ("The Gym Van" can still be a CANDIDATE via ordinary name-token
--      overlap, which is correct and intentional, but it can never be
--      ranked as a brand match). An explicit `v.brand_id IS NOT NULL`
--      guard is added to the CASE anyway, redundant today, to make that
--      invariant self-evident in the SQL and trivially guardable by a
--      source test, per the lead's specific naming of this concern.
--  11. Unrelated observation, not fixed (touch only what the task
--      requires): `community_moderation_queue`'s `content` CASE
--      (migrate_160:3571-3587) has no branch for `target_kind = 'message'`
--      and would fall into the profile branch with a message id, reading
--      nothing useful. Spec 1.1 D does not name this RPC; left alone.
--
-- Purpose:            Community product audit 2026-09-07 (authority
--                    `docs/community-product-audit-2026-09-07/
--                    30-IMPLEMENTATION.md` section 1.1, informed by
--                    `20-JUDGEMENT.md` section 7's location/privacy model
--                    and `09-gym-journey-tests.md` sections 3/7/9). Five
--                    groups of change, all additive over 160-162, no new
--                    table:
--
--                      A. Gym finder: `_gyms_outward_centroid` and
--                         `gyms_place_centroid` (new), `gyms_search`
--                         re-issued (new trailing `_radius_m`, postcode
--                         centroid + radius union, `operator_unconfirmed`
--                         field/tiebreak, region/local authority/country,
--                         Finding S1's leftover-token fuzzy sort key,
--                         Finding D2's stripped-Jaccard duplicate check
--                         reused inside `gyms_submit`), `gyms_near`
--                         re-issued (radius clamp to 80,468 m,
--                         `operator_unconfirmed`, `truncated`, region/LA/
--                         country), `gyms_get`/`gyms_in_place` re-issued
--                         (region/LA/country only).
--                      B. Place, not string: five additive
--                         `community_profiles` columns (`place_key`,
--                         `place_label`, `place_lat`, `place_lng`,
--                         `place_kind`) plus an index; `community_set_place`
--                         (new); `community_upsert_profile` and
--                         `community_set_gyms` re-issued to backfill a
--                         missing place from the caller's main gym's town;
--                         `_community_profile_card` re-issued (adds
--                         `place_label`, `age_band`, `can_connect`);
--                         `_community_place_band_m` (new).
--                      C. Find people, combinable: `community_find_people`
--                         re-issued with a new trailing `_filters jsonb`,
--                         keyset paging, the 1,000-row scan cap, muted/
--                         connect-from exclusions and the SD-28 fallback;
--                         `community_suggested_people` re-issued for the
--                         same two exclusions.
--                      D. Fixes: `community_report` re-issued to accept
--                         `target_kind = 'message'`.
--                      E. Tests: `src/__tests__/migrate163.rpcOnly.guard.
--                         test.js` (new) plus the dedupe-tokenizer
--                         regression fixture; `scripts/security/supabase-
--                         matrix.targets.json` gains the two new client
--                         RPC names.
--
--                    Security shape exactly as 162 (SD-14): every new/
--                    re-issued function is SECURITY DEFINER, `SET
--                    search_path = public, pg_temp`, derives its caller
--                    from `_community_caller()`, is revoked from PUBLIC
--                    and anon (helpers also from authenticated) and
--                    EXECUTE is granted to `authenticated` only for the
--                    two new client RPCs (`gyms_place_centroid`,
--                    `community_set_place`) plus every re-issued RPC,
--                    restated in Part 17 below for the same readability/
--                    audit-trail reason 162's Part 11 restates functions
--                    whose ACL a plain CREATE OR REPLACE would not have
--                    changed. `gyms_search` and `community_find_people`
--                    gain a new trailing parameter, which Postgres treats
--                    as a DIFFERENT signature (a new overload), so both
--                    are DROPped by name (any existing overload, CASCADE)
--                    before being re-created -- the exact pattern already
--                    used in this repo for a prior signature change
--                    (migrate_114_food_entry_weight_state.sql:75-90,
--                    migrate_116_food_library_pull_micros.sql:44-63) --
--                    so no stale duplicate overload, and no accidental
--                    fallback to a function-default-privileges-locked
--                    orphan, survives the apply.
--
--                    `delete_user_data()` needs no re-issue: every new
--                    column in this file lives on `community_profiles`
--                    (already deleted whole-row by 160's block) and no new
--                    table is created.
--
-- Push:              None from the app for the two new RPCs
--                    (`gyms_place_centroid` is a read; `community_set_place`
--                    is an online-first write, exactly like every other
--                    Community/gym mutation, SD-13): no local SQLite
--                    table, no sync registry entry, no watermark.
-- Pull:              None, for the same reason.
--
-- Applied locally:   N/A -- no local SQLite table or schema change;
--                    `PRAGMA user_version` is untouched.
--
-- Applied remotely:  NO -- WRITTEN, NOT APPLIED. Waits for the founder's
--                    exact phrase "run against production" for the batch
--                    that contains it (supabase/README.md status block,
--                    CLAUDE.md section 2). DEPENDS ON migrate_160_
--                    community.sql, migrate_161_community_connections.sql
--                    and migrate_162_gym_directory.sql; must never run
--                    before any of them.
--
-- Safe to re-run:    YES. `ADD COLUMN IF NOT EXISTS`, the one new CHECK
--                    inside a `duplicate_object`-tolerant `DO` block,
--                    `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE
--                    FUNCTION` throughout, and the two DROP-by-name blocks
--                    use `DROP FUNCTION IF EXISTS ... CASCADE` inside a
--                    dynamic loop keyed on `pg_get_function_identity_
--                    arguments`, so re-running drops whatever the LAST run
--                    of this same file left (the new signature) and
--                    recreates the identical function -- idempotent.
--
-- Rollback:          alter table public.community_profiles
--                      drop column if exists place_key, place_label,
--                        place_lat, place_lng, place_kind;
--                    drop function if exists
--                      public.gyms_place_centroid(text),
--                      public.community_set_place(text),
--                      public._gyms_outward_centroid(text),
--                      public._gyms_brand_alias_tokens(uuid),
--                      public._gyms_tokens_strip(text[], text[]),
--                      public._gyms_dedupe_jaccard(text[], uuid, text[], text),
--                      public._community_can_connect(uuid, uuid),
--                      public._community_place_band_m(uuid, uuid),
--                      public._community_populate_place_from_gym(uuid),
--                      public._community_find_people_cursor_of(int, timestamptz, uuid),
--                      public._community_find_people_cursor_parts(text),
--                      public.gyms_search(text, double precision, double precision, int, double precision),
--                      public.community_find_people(text, text, int, jsonb);
--                    re-apply migrate_162_gym_directory.sql to restore
--                      gyms_search(text,double precision,double precision,int),
--                      gyms_near, gyms_get, gyms_in_place, gyms_submit,
--                      community_set_gyms, community_upsert_profile,
--                      _community_profile_card and community_report to
--                      their pre-163 bodies; re-apply migrate_161_
--                      community_connections.sql to restore
--                      community_find_people(text,text,int) and
--                      community_suggested_people to their pre-163 bodies
--                      (CREATE OR REPLACE means the LATEST definition wins
--                      until a later file replaces it again -- there is no
--                      automatic revert). Nothing existing is dropped or
--                      rewritten beyond those function bodies and the five
--                      additive columns, so a rollback loses only the
--                      place feature, the finder's radius/centroid/
--                      unconfirmed-sort/fuzzy-token improvements and the
--                      combinable Find People filters.
--
-- GDPR note:         `place_lat`/`place_lng` are the PUBLIC centroid of a
--                    chosen postcode district or town -- never a device
--                    coordinate, never more precise than a town/outward
--                    district (LJ-01, 20-JUDGEMENT.md section 7). Every
--                    function that can write them (`community_set_place`,
--                    `_community_populate_place_from_gym`) takes TEXT or a
--                    stored gym reference only; neither takes a `_lat`/
--                    `_lng` argument, so a device position can never reach
--                    this column through any RPC this file declares
--                    (guarded by `src/__tests__/migrate163.rpcOnly.guard.
--                    test.js`). No new personal-data category is
--                    introduced beyond the coarse place already covered by
--                    the `community_visibility` consent basis 160
--                    recorded; `age_band` surfaces an existing consented
--                    column (`tp_age_band`, migrate_161, `share_age_band`)
--                    under a second key on the same viewer-gated card,
--                    nothing new is collected. `delete_user_data()` needs
--                    no change: the whole `community_profiles` row,
--                    including every column this file adds, is already
--                    deleted by migrate_160's existing block.
--
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1: community_profiles gains a chosen PLACE (spec 1.1 B) ───────

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS place_key   text,
  ADD COLUMN IF NOT EXISTS place_label text,
  ADD COLUMN IF NOT EXISTS place_lat   double precision,
  ADD COLUMN IF NOT EXISTS place_lng   double precision,
  ADD COLUMN IF NOT EXISTS place_kind  text;

DO $$ BEGIN
  ALTER TABLE public.community_profiles
    ADD CONSTRAINT community_profiles_place_kind_check
    CHECK (place_kind IS NULL OR place_kind IN ('outward', 'town'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS community_profiles_place_key_idx
  ON public.community_profiles (place_key) WHERE place_key IS NOT NULL;

-- ─── Part 2: gym-side internal helpers (revoked from authenticated) ─────

-- Average of every postcode-sector centroid whose sector starts with this
-- outward code (spec 1.1 A). NULL when the outward code is not seeded.
CREATE OR REPLACE FUNCTION public._gyms_outward_centroid(
  _outward text, OUT o_lat double precision, OUT o_lng double precision
)
RETURNS record
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT avg(lat), avg(lng)
  FROM public.gym_postcode_sectors
  WHERE _outward IS NOT NULL AND sector LIKE (_outward || ' %');
$$;

-- Lead addition D2 (community-product-audit-2026-09-07/
-- 09-gym-journey-tests.md section 9): the flattened, folded word set for
-- every alias of one brand (build.mjs's own `brandAliasTokens`, reproduced
-- here from the same `gym_brands.aliases` column the pipeline seeded from
-- the identical alias list -- see scripts/gyms/lib/brands.js's SEED_BRANDS
-- -- rather than re-deriving `tokenize()`'s brand-composition rule, which
-- also folds in `composeBrandBranch`'s own display-name assembly and is
-- not reproducible from SQL alone). NULL/no-brand input returns an empty
-- array, never NULL, so callers can unnest it unconditionally.
CREATE OR REPLACE FUNCTION public._gyms_brand_alias_tokens(_brand_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(DISTINCT t) FILTER (WHERE t <> ''), ARRAY[]::text[])
  FROM public.gym_brands b
  CROSS JOIN LATERAL unnest(string_to_array(
    public._community_fold(coalesce((SELECT string_agg(al, ' ') FROM unnest(b.aliases) al), '')),
    ' '
  )) AS t
  WHERE b.id = _brand_id;
$$;

-- Every token in `_tokens` that is NOT present in `_strip`, order not
-- preserved (Jaccard is order-independent). Never NULL.
CREATE OR REPLACE FUNCTION public._gyms_tokens_strip(_tokens text[], _strip text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(t), ARRAY[]::text[])
  FROM unnest(coalesce(_tokens, ARRAY[]::text[])) t
  WHERE NOT (t = ANY (coalesce(_strip, ARRAY[]::text[])));
$$;

-- Lead addition D2 (Finding D2, 53.0%/94.7% miss rates measured against
-- the real catalogue): the root cause is a tokenizer ASYMMETRY, not a
-- threshold problem -- the catalogue's own `tokens` column (built once by
-- scripts/gyms/normalise.mjs + build.mjs at pipeline time) routinely
-- carries 2-4 extra generic tokens a real submitter would never type: the
-- outward code, the literal "uk" (from an alias like "pure gym uk"), and
-- the brand's own alias words a SECOND time alongside the compound brand
-- token ("puregym" AND, separately, "pure"/"gym"). Each extra token
-- inflates the Jaccard UNION without adding to the intersection. Rather
-- than reproduce the pipeline's full name-composition rule in SQL (not
-- faithfully reproducible -- `composeBrandBranch` depends on multi-source
-- priority data this database does not hold), this strips the SAME noise
-- from BOTH sides before comparing: the candidate's own brand's alias
-- words, the literal "uk", and the shared outward code. Reproduced by
-- hand against the two named test cases in the brief: "Pure Gym
-- Motherwell"/"PureGym Motherwell" both against PureGym Motherwell's
-- stored tokens strip down to {motherwell} on both sides (Jaccard 1.0,
-- was 0.50/0.33); "Volt Gym"+"Burscough" (an INDEPENDENT, so no brand
-- tokens to strip) against Volt Gym's stored tokens strips only the
-- outward code, {volt,gym,burscough} vs {volt,gym} (Jaccard 0.667, was
-- 0.50 -- now clears the 0.6 postcode-unit threshold). The thresholds
-- themselves (0.6/0.85) are unchanged.
CREATE OR REPLACE FUNCTION public._gyms_dedupe_jaccard(
  _candidate_tokens text[], _candidate_brand_id uuid,
  _submission_tokens text[], _outward_token text
)
RETURNS double precision
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_strip text[];
BEGIN
  SELECT coalesce(array_agg(DISTINCT s.t) FILTER (WHERE s.t IS NOT NULL AND s.t <> ''), ARRAY[]::text[])
  INTO v_strip
  FROM (
    SELECT unnest(public._gyms_brand_alias_tokens(_candidate_brand_id)) AS t
    UNION
    SELECT 'uk'
    UNION
    SELECT _outward_token
  ) s;

  RETURN public._gyms_token_jaccard(
    public._gyms_tokens_strip(_candidate_tokens, v_strip),
    public._gyms_tokens_strip(_submission_tokens, v_strip)
  );
END $$;

-- ─── Part 3: community-side internal helpers (revoked from authenticated) ─

-- Mirrors community_connect's own recipient-control check (migrate_161:
-- 1226-1235) exactly, as a read: would THIS viewer's connect request be
-- accepted right now? Self is always true (not a meaningful question); a
-- missing target profile defaults true (harmless -- there is no card to
-- show a false refusal on).
CREATE OR REPLACE FUNCTION public._community_can_connect(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _viewer = _target THEN true
    ELSE coalesce((
      SELECT CASE p.connect_from
               WHEN 'nobody' THEN false
               WHEN 'followers' THEN EXISTS (
                 SELECT 1 FROM public.community_follows f
                 WHERE f.follower_id = _viewer AND f.followee_id = _target
                   AND f.state = 'accepted'
               )
               ELSE true
             END
      FROM public.community_profiles p WHERE p.user_id = _target
    ), true)
  END;
$$;

-- Haversine metres between two people's PLACE centroids (never a device
-- coordinate -- LJ-01). NULL whenever either side has no place, or either
-- user id does not resolve to a profile. Used only inside
-- community_find_people to pick a fixed reason TOKEN or to test a filter
-- band; the metre value itself is never returned to a client.
CREATE OR REPLACE FUNCTION public._community_place_band_m(_a uuid, _b uuid)
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public._gyms_distance_m(pa.place_lat, pa.place_lng, pb.place_lat, pb.place_lng)
  FROM public.community_profiles pa, public.community_profiles pb
  WHERE pa.user_id = _a AND pb.user_id = _b;
$$;

-- Findings for the lead, item 3: backfills a missing place from the
-- caller's own MAIN gym's town, the town-centroid rule (average of that
-- town_key's open venues). A no-op whenever the profile already has a
-- place (never overwrites an explicit choice), has no main gym, or that
-- gym's town cannot be resolved to any open-venue centroid. Deliberately
-- leaves area_label/area_key untouched (findings item 4).
CREATE OR REPLACE FUNCTION public._community_populate_place_from_gym(_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me       public.community_profiles%ROWTYPE;
  v_town_key text;
  v_town     text;
  v_lat      double precision;
  v_lng      double precision;
BEGIN
  SELECT * INTO v_me FROM public.community_profiles WHERE user_id = _uid;
  IF NOT FOUND OR v_me.place_key IS NOT NULL OR v_me.gym_id IS NULL THEN
    RETURN;
  END IF;

  SELECT gv.town_key, gv.town INTO v_town_key, v_town
  FROM public.gym_venues gv WHERE gv.id = v_me.gym_id;
  IF v_town_key IS NULL THEN RETURN; END IF;

  SELECT avg(v.lat), avg(v.lng) INTO v_lat, v_lng
  FROM public.gym_venues v
  WHERE v.status = 'open' AND v.town_key = v_town_key
    AND v.lat IS NOT NULL AND v.lng IS NOT NULL;
  IF v_lat IS NULL THEN RETURN; END IF;

  UPDATE public.community_profiles
     SET place_key   = 'town:' || v_town_key,
         place_label = coalesce(v_town, v_town_key),
         place_lat   = v_lat,
         place_lng   = v_lng,
         place_kind  = 'town'
   WHERE user_id = _uid AND place_key IS NULL;
END $$;

-- The keyset cursor for community_find_people: 'score|created_at ISO|uuid',
-- the exact pipe-delimited style _community_cursor_of/_community_cursor_
-- parts already use (migrate_160:977-1018), extended with the leading
-- score field this door's ordering needs. An absent/empty cursor means
-- "start at the top"; a malformed one is invalid_input, never a silent
-- full read.
CREATE OR REPLACE FUNCTION public._community_find_people_cursor_of(
  _score int, _ts timestamptz, _id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _score IS NULL OR _ts IS NULL OR _id IS NULL THEN NULL
    ELSE _score::text || '|' || to_char(_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.USOF') || '|' || _id::text
  END;
$$;

CREATE OR REPLACE FUNCTION public._community_find_people_cursor_parts(_cursor text)
RETURNS TABLE (c_score int, c_ts timestamptz, c_id uuid)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF _cursor IS NULL OR btrim(_cursor) = '' THEN RETURN; END IF;
  BEGIN
    c_score := split_part(_cursor, '|', 1)::int;
    c_ts    := split_part(_cursor, '|', 2)::timestamptz;
    c_id    := split_part(_cursor, '|', 3)::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END;
  RETURN NEXT;
END $$;

-- ─── Part 4: gyms_place_centroid (new RPC, spec 1.1 A) ───────────────────

CREATE OR REPLACE FUNCTION public.gyms_place_centroid(_q text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
END $$;

-- ─── Part 5: gyms_search re-issued (new trailing _radius_m) ──────────────
--
-- Different argument COUNT is a different signature to Postgres (a new
-- overload, not a replacement) -- dropped by name first so the stale
-- 4-argument version cannot survive alongside this one and silently
-- absorb a 4-argument call from any caller that has not yet passed the
-- fifth parameter.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
                  n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS cmd
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'gyms_search' AND n.nspname = 'public'
  LOOP
    EXECUTE r.cmd;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.gyms_search(
  _q text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL,
  _limit int DEFAULT 40, _radius_m double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
END $$;

-- ─── Part 6: gyms_near re-issued (same signature) ────────────────────────

CREATE OR REPLACE FUNCTION public.gyms_near(
  _lat double precision, _lng double precision, _radius_m int DEFAULT 8000, _limit int DEFAULT 40
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
END $$;

-- ─── Part 7: gyms_get re-issued (region/local authority/country) ────────

CREATE OR REPLACE FUNCTION public.gyms_get(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
END $$;

-- ─── Part 8: gyms_in_place re-issued (region/local authority/country) ───

CREATE OR REPLACE FUNCTION public.gyms_in_place(_town_key text, _limit int DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
END $$;

-- ─── Part 9: gyms_submit re-issued (Finding D2's stripped Jaccard) ──────

CREATE OR REPLACE FUNCTION public.gyms_submit(_p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_name     text;
  v_address  text;
  v_town     text;
  v_postcode text;
  v_website  text;
  v_operator text;
  v_sector   text;
  v_lat      double precision;
  v_lng      double precision;
  v_tokens   text[];
  v_brand_id uuid;
  v_type     text := 'independent_gym';
  v_id       uuid;
  v_dup_id   uuid;
  v_dup_name text;
  v_twin_id     uuid;
  v_twin_name   text;
  v_twin_status text;
  v_twin_distinct int;
  -- Finding D2: the submission's own outward code, folded, so the SAME
  -- noise (outward code, 'uk', the matched candidate's own brand alias
  -- words) is stripped from both sides of the Jaccard comparison.
  v_outward_tok text;
BEGIN
  IF _p IS NULL OR jsonb_typeof(_p) <> 'object' THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;

  v_name     := btrim(coalesce(_p ->> 'name', ''));
  v_address  := btrim(coalesce(_p ->> 'address_line', ''));
  v_town     := btrim(coalesce(_p ->> 'town', ''));
  v_postcode := upper(btrim(coalesce(_p ->> 'postcode', '')));
  v_website  := nullif(btrim(coalesce(_p ->> 'website', '')), '');
  v_operator := nullif(btrim(coalesce(_p ->> 'operator', '')), '');

  v_name := public._community_clean_text(v_name);
  v_address := public._community_clean_text(v_address);
  v_town := public._community_clean_text(v_town);
  IF v_operator IS NOT NULL THEN v_operator := public._community_clean_text(v_operator); END IF;
  IF v_website IS NOT NULL THEN v_website := public._community_clean_text(v_website); END IF;

  IF length(v_name) < 1 OR length(v_name) > 60
     OR length(v_address) < 1 OR length(v_address) > 200
     OR length(v_town) < 1 OR length(v_town) > 80 THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  IF v_website IS NOT NULL AND (length(v_website) > 200 OR v_website !~* '^https?://') THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  IF v_operator IS NOT NULL AND length(v_operator) > 80 THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  IF NOT public._gyms_postcode_full_valid(v_postcode) THEN
    RAISE EXCEPTION USING message = 'invalid_postcode';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'gyms_submit', 3, 3, interval '24 hours');

  v_sector := public._gyms_sector_of(v_postcode);
  SELECT lat, lng INTO v_lat, v_lng FROM public.gym_postcode_sectors WHERE sector = v_sector;
  IF v_lat IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_postcode';
  END IF;

  v_tokens := public._gyms_tokens_of(v_name, v_town);
  v_outward_tok := lower(public._gyms_outward_of(v_postcode));

  SELECT v.id, v.display_name INTO v_dup_id, v_dup_name
  FROM public.gym_venues v
  WHERE v.status IN ('open', 'pending')
    AND v.outward = public._gyms_outward_of(v_postcode)
    AND public._gyms_visible(v, v_uid)
    AND (
      (v.postcode IS NOT NULL
        AND public._gyms_postcode_compact(v.postcode) = public._gyms_postcode_compact(v_postcode)
        AND public._gyms_dedupe_jaccard(v.tokens, v.brand_id, v_tokens, v_outward_tok) >= 0.6)
      OR public._gyms_dedupe_jaccard(v.tokens, v.brand_id, v_tokens, v_outward_tok) >= 0.85
    )
  ORDER BY public._gyms_dedupe_jaccard(v.tokens, v.brand_id, v_tokens, v_outward_tok) DESC
  LIMIT 1;

  IF v_dup_id IS NOT NULL THEN
    RETURN jsonb_build_object('duplicate_of', v_dup_id, 'display_name', v_dup_name);
  END IF;

  SELECT v.id, v.display_name, v.status INTO v_twin_id, v_twin_name, v_twin_status
  FROM public.gym_venues v
  WHERE v.status = 'pending'
    AND v.outward = public._gyms_outward_of(v_postcode)
    AND (
      (v.postcode IS NOT NULL
        AND public._gyms_postcode_compact(v.postcode) = public._gyms_postcode_compact(v_postcode)
        AND public._gyms_dedupe_jaccard(v.tokens, v.brand_id, v_tokens, v_outward_tok) >= 0.6)
      OR public._gyms_dedupe_jaccard(v.tokens, v.brand_id, v_tokens, v_outward_tok) >= 0.85
    )
  ORDER BY public._gyms_dedupe_jaccard(v.tokens, v.brand_id, v_tokens, v_outward_tok) DESC
  LIMIT 1;

  IF v_twin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.gym_submissions s
      WHERE s.id = v_twin_id AND s.submitter_id = v_uid
    ) AND NOT EXISTS (
      SELECT 1 FROM public.gym_venue_history h
      WHERE h.venue_id = v_twin_id AND h.change = 'confirm' AND h.actor = v_uid::text
    ) THEN
      INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
      VALUES (gen_random_uuid(), v_twin_id, 'confirm', NULL,
              jsonb_build_object('confirmer', v_uid), v_uid::text, now());

      UPDATE public.gym_submissions SET confirmations = confirmations + 1 WHERE id = v_twin_id;

      SELECT count(DISTINCT h.actor)::int INTO v_twin_distinct
      FROM public.gym_venue_history h
      WHERE h.venue_id = v_twin_id AND h.change = 'confirm';

      IF v_twin_distinct >= 2 THEN
        UPDATE public.gym_venues
           SET status = 'open', verification_status = 'user_submitted_verified'
         WHERE id = v_twin_id AND status = 'pending';
        UPDATE public.gym_submissions
           SET status = 'verified', reviewed_at = now()
         WHERE id = v_twin_id AND status = 'pending';
        INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
        VALUES (gen_random_uuid(), v_twin_id, 'verify',
                jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'open'),
                v_uid::text, now());
        v_twin_status := 'open';
      END IF;
    END IF;

    RETURN jsonb_build_object('id', v_twin_id, 'display_name', v_twin_name, 'status', v_twin_status);
  END IF;

  IF v_operator IS NOT NULL THEN
    SELECT b.id INTO v_brand_id FROM public.gym_brands b
    WHERE public._community_fold(v_operator) = ANY (
      SELECT public._community_fold(a) FROM unnest(b.aliases) a
    ) LIMIT 1;
    IF v_brand_id IS NOT NULL THEN v_type := 'commercial_gym'; END IF;
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO public.gym_venues (
    id, display_name, name, brand_id, venue_type, status, address_line, town, town_key,
    postcode, outward, sector, lat, lng, coord_source, website, facility_count,
    verification_status, source_count, tokens, first_seen, geocell
  ) VALUES (
    v_id, v_name, v_name, v_brand_id, v_type, 'pending', v_address, v_town,
    nullif(public._community_fold(v_town), ''),
    v_postcode, public._gyms_outward_of(v_postcode), v_sector, v_lat, v_lng,
    'postcode_sector', v_website, 1,
    'user_submitted_pending', 1, v_tokens, now(), public._gyms_geocell(v_lat, v_lng)
  );

  INSERT INTO public.gym_submissions (
    id, submitter_id, name, address_line, town, postcode, website, operator,
    lat, lng, status, confirmations, created_at
  ) VALUES (
    v_id, v_uid, v_name, v_address, v_town, v_postcode, v_website, v_operator,
    v_lat, v_lng, 'pending', 1, now()
  );

  INSERT INTO public.gym_venue_sources (id, venue_id, source, source_record_id, retrieved_at)
  VALUES (gen_random_uuid(), v_id, 'user', v_uid::text, now());

  INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
  VALUES (gen_random_uuid(), v_id, 'submit', NULL,
          jsonb_build_object('display_name', v_name, 'status', 'pending'), v_uid::text, now());
  INSERT INTO public.gym_venue_history (id, venue_id, change, before, after, actor, created_at)
  VALUES (gen_random_uuid(), v_id, 'confirm', NULL,
          jsonb_build_object('confirmer', v_uid, 'implicit', true), v_uid::text, now());

  RETURN jsonb_build_object('id', v_id, 'display_name', v_name, 'status', 'pending');
END $$;

-- ─── Part 10: community_set_place (new RPC, spec 1.1 B) ─────────────────

CREATE OR REPLACE FUNCTION public.community_set_place(_q text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid      uuid := public._community_caller();
  v_raw      text := left(btrim(coalesce(_q, '')), 80);
  v_centroid jsonb;
  v_kind     text;
  v_label    text;
  v_lat      double precision;
  v_lng      double precision;
  v_key      text;
  v_place_kind text;
  v_outward  text;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  PERFORM public._community_rate_check(v_uid, 'set_place', 120, 120, interval '1 hour');

  IF v_raw = '' THEN
    UPDATE public.community_profiles
       SET place_key = NULL, place_label = NULL, place_lat = NULL, place_lng = NULL,
           place_kind = NULL, area_label = NULL, area_key = NULL
     WHERE user_id = v_uid;
    RETURN public._community_profile_card(v_uid, v_uid);
  END IF;

  -- Findings item 2: a postcode-shaped `_q` is ALWAYS coarsened to its
  -- outward district here (never the sector centroid gyms_place_centroid
  -- returns for gym-search purposes, and never the full postcode as a
  -- label) -- place_kind's own CHECK allows only 'outward'/'town', and
  -- LJ-01 forbids a sharper-than-district personal place.
  IF public._gyms_postcode_full_valid(v_raw) OR public._gyms_postcode_outward_valid(v_raw) THEN
    v_outward := public._gyms_outward_of(v_raw);
    IF v_outward IS NULL THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    SELECT o_lat, o_lng INTO v_lat, v_lng FROM public._gyms_outward_centroid(v_outward);
    IF v_lat IS NULL THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_label := v_outward;
    v_key := 'outward:' || v_outward;
    v_place_kind := 'outward';
  ELSE
    v_centroid := public.gyms_place_centroid(v_raw);
    v_kind := coalesce(v_centroid ->> 'kind', 'none');
    IF v_kind <> 'town' THEN
      RAISE EXCEPTION USING message = 'invalid_input';
    END IF;
    v_label := v_centroid ->> 'label';
    v_lat := (v_centroid ->> 'lat')::double precision;
    v_lng := (v_centroid ->> 'lng')::double precision;
    v_key := 'town:' || nullif(public._community_fold(v_label), '');
    v_place_kind := 'town';
  END IF;

  UPDATE public.community_profiles
     SET place_key = v_key, place_label = v_label, place_lat = v_lat, place_lng = v_lng,
         place_kind = v_place_kind, area_label = v_label, area_key = v_key
   WHERE user_id = v_uid;

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

-- ─── Part 11: community_set_gyms re-issued (populates place, findings 3) ─

CREATE OR REPLACE FUNCTION public.community_set_gyms(_gym_id uuid, _other_gym_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_others uuid[];
  v_id     uuid;
BEGIN
  PERFORM public._community_require_profile(v_uid, true);
  PERFORM public._community_rate_check(v_uid, 'set_gyms', 60, 60, interval '1 hour');

  SELECT coalesce(array_agg(DISTINCT g), ARRAY[]::uuid[])
    INTO v_others
  FROM unnest(coalesce(_other_gym_ids, ARRAY[]::uuid[])) g
  WHERE g IS NOT NULL AND g IS DISTINCT FROM _gym_id;

  IF array_length(v_others, 1) > 3 THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF _gym_id IS NOT NULL AND NOT public._gyms_selectable(_gym_id, v_uid) THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF array_length(v_others, 1) IS NOT NULL THEN
    FOREACH v_id IN ARRAY v_others LOOP
      IF NOT public._gyms_selectable(v_id, v_uid) THEN
        RAISE EXCEPTION USING message = 'invalid_input';
      END IF;
    END LOOP;
  END IF;

  UPDATE public.community_profiles
     SET gym_id = _gym_id, other_gym_ids = v_others
   WHERE user_id = v_uid;

  PERFORM public._community_populate_place_from_gym(v_uid);

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

-- ─── Part 12: community_upsert_profile re-issued (populates place too) ──
--
-- Body otherwise identical to migrate_162's re-issue (Review 35 findings
-- 1/2/5: once gym_id is set, the sync trigger is the SOLE writer of
-- gym_key/gym_label, so this function never re-derives or re-validates
-- them). The only addition is the place backfill call before returning.

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
      'visibility',    v_existing.visibility
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
      user_id, handle, display_name, avatar_preset, bio, styles, goal, setting,
      area_label, area_key, gym_label, gym_key, visibility, is_minor, status,
      rules_version, last_active_at)
    VALUES (
      v_uid, v_handle, v_display, v_avatar, v_bio, v_styles, v_goal, v_setting,
      v_area_label, v_area_key, v_gym_label, v_gym_key, v_visibility, v_minor,
      'active', public._community_rules_version(), now());

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

  -- Findings item 3: backfill a missing place from the main gym's town on
  -- every save (covers a profile that picked a gym via community_set_gyms
  -- before this migration existed).
  PERFORM public._community_populate_place_from_gym(v_uid);

  RETURN public._community_profile_card(v_uid, v_uid);
END $$;

-- ─── Part 13: _community_profile_card re-issued (place/age/can_connect) ─
--
-- Body otherwise identical to migrate_162's re-issue (lead addition (a):
-- gym_id/other_gym_ids under the same v_viewable gate / self-only gate).

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
BEGIN
  SELECT * INTO p FROM public.community_profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p.status = 'suspended' AND _viewer <> _uid THEN RETURN NULL; END IF;
  v_viewable := public._community_can_view(_viewer, _uid);

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
    'goal',            CASE WHEN v_viewable THEN p.goal END,
    'setting',         CASE WHEN v_viewable THEN p.setting END,
    'area_label',      CASE WHEN v_viewable THEN p.area_label END,
    -- Spec 1.1 B: place_label under the SAME viewer gate as area_label.
    'place_label',     CASE WHEN v_viewable THEN p.place_label END,
    'gym_id',          CASE WHEN v_viewable THEN p.gym_id END,
    'gym_label',       CASE WHEN v_viewable THEN p.gym_label END,
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
    -- Spec 1.1 B: the SAME band under the 'age_band' key the client/spec
    -- names, still gated identically (the column is only ever non-null
    -- when the owner shared it and is not a minor, migrate_161).
    'age_band',          CASE WHEN v_viewable THEN p.tp_age_band END,
    'other_gym_ids',    CASE WHEN _viewer = _uid THEN to_jsonb(p.other_gym_ids) END,
    -- Spec 1.1 C: never removed from any list, just flagged so the client
    -- can show Follow instead of Connect (ConnectButton, lane S3).
    'can_connect',      public._community_can_connect(_viewer, _uid),
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

-- ─── Part 14: community_find_people re-issued (new trailing _filters) ──

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
  _filters jsonb DEFAULT NULL
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
  -- _filters (spec 1.1 C): every key optional, every one a HARD filter.
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
  -- Keyset paging.
  v_cur_score int;
  v_cur_ts    timestamptz;
  v_cur_id    uuid;
  v_page      jsonb;
  v_remaining int;
  v_next_cursor text;
  -- SD-28 fallback.
  v_already   uuid[];
  v_fallback  jsonb;
  v_page_len  int;
BEGIN
  IF _mode IS NULL OR _mode NOT IN
     ('like_me', 'gym', 'area', 'programme', 'partners', 'might_know') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  v_me := public._community_require_profile(v_uid, false);
  PERFORM public._community_rate_check(v_uid, 'find_people', 120, 120, interval '1 hour');

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
    -- age_band: usable only when the caller shares their own band (a
    -- caller with none simply cannot filter by a band they never chose to
    -- reveal about themselves either).
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
    -- Spec 1.1 C: place_key when the caller has one, else the legacy
    -- area_key path for a pre-163 profile.
    IF v_me.place_key IS NOT NULL THEN
      v_key := v_me.place_key; v_label := v_me.place_label;
    ELSE
      v_key := v_me.area_key; v_label := v_me.area_label;
    END IF;
  ELSIF _mode = 'programme' THEN
    v_key := v_me.tp_programme_key;
    IF v_key LIKE 'style:%' THEN
      v_label := public._community_style_label(substring(v_key FROM 7));
    ELSIF v_key IS NOT NULL AND public._community_can_view_programme(v_uid, v_key::uuid) THEN
      SELECT g.title INTO v_label FROM public.community_programmes g
      WHERE g.id = v_key::uuid;
    END IF;
  ELSIF _mode = 'partners' THEN
    IF coalesce((v_me.partner_prefs ->> 'same_gym_only')::boolean, false)
       AND v_me.gym_key IS NOT NULL THEN
      v_label := 'at your gym';
    ELSE
      v_label := 'in your area';
    END IF;
  END IF;

  IF (_mode IN ('gym', 'area', 'programme') AND v_key IS NULL)
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
      AND (_mode <> 'gym'       OR p.gym_key = v_key
             OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))
      AND (_mode <> 'area'      OR (
             (v_me.place_key IS NOT NULL AND p.place_key = v_key)
             OR (v_me.place_key IS NULL AND p.area_key = v_key)
           ))
      AND (_mode <> 'programme' OR (p.tp_programme_key = v_key AND p.show_programmes = true))
      AND (_mode <> 'partners'  OR p.open_to_partner = true)
      AND (_mode <> 'partners'
           OR NOT coalesce((p.partner_prefs ->> 'same_gym_only')::boolean, false)
           OR (v_me.gym_key IS NOT NULL AND p.gym_key = v_me.gym_key))
      -- _filters (findings item 5): independent of _mode, ANDed alongside.
      AND (v_scope <> 'gym' OR p.gym_key = v_me.gym_key
             OR (v_me.gym_id IS NOT NULL AND v_me.gym_id = ANY (p.other_gym_ids)))
      AND (v_scope <> 'place' OR (
             CASE
               WHEN v_band_m IS NULL THEN
                 (v_me.place_key IS NOT NULL AND p.place_key = v_me.place_key)
                 OR (v_me.place_key IS NULL AND v_me.area_key IS NOT NULL AND p.area_key = v_me.area_key)
               WHEN v_band_m = 0 THEN
                 (v_me.place_key IS NOT NULL AND p.place_key = v_me.place_key)
               ELSE
                 coalesce(public._community_place_band_m(v_uid, p.user_id), 1e12::double precision) <= v_band_m
             END
           ))
      AND (NOT coalesce(v_partner_only, false) OR p.open_to_partner = true)
      AND (v_f_days IS NULL OR (p.tp_days IS NOT NULL AND p.tp_days && v_f_days))
      AND (v_f_bands IS NULL OR (p.tp_time_bands IS NOT NULL AND p.tp_time_bands && v_f_bands))
      AND (v_f_styles IS NULL OR (p.styles IS NOT NULL AND p.styles && v_f_styles))
      AND (v_f_goal IS NULL OR p.goal = v_f_goal)
      AND (v_f_exp IS NULL OR p.tp_experience_band = v_f_exp)
      AND (v_f_age IS NULL OR p.tp_age_band = v_f_age)
    ORDER BY p.last_active_at DESC
    LIMIT 1000
  LOOP
    v_scanned := v_scanned + 1;
    v_score := 0;
    v_reasons := ARRAY[]::text[];

    IF v_me.gym_key IS NOT NULL AND v_row.gym_key = v_me.gym_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || ('Trains at ' || coalesce(v_row.gym_label, v_me.gym_label));
    ELSIF v_me.gym_id IS NOT NULL AND v_row.other_gym_ids IS NOT NULL
          AND v_me.gym_id = ANY (v_row.other_gym_ids) THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || 'Also trains at your gym'::text;
    END IF;

    IF v_me.tp_programme_key IS NOT NULL
       AND v_row.tp_programme_key = v_me.tp_programme_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || 'On the same programme'::text;
    END IF;

    SELECT s INTO v_style
    FROM unnest(v_me.styles) AS s
    WHERE s = ANY (v_row.styles)
    LIMIT 1;
    IF v_style IS NOT NULL THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Also trains ' || public._community_style_label(v_style));
    END IF;

    IF v_me.area_key IS NOT NULL AND v_row.area_key = v_me.area_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Lists ' || coalesce(v_row.area_label, v_me.area_label));
    END IF;

    -- Spec 1.1 C: place reasons are FIXED TOKENS, never a distance number
    -- for a person (only a venue ever carries distance_m).
    IF v_me.place_key IS NOT NULL AND v_row.place_key = v_me.place_key THEN
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

    IF v_score >= 1 OR _mode IN ('gym', 'area', 'programme', 'partners') THEN
      v_items := v_items || jsonb_build_object(
        'card',    public._community_profile_card(v_row.user_id, v_uid),
        'reasons', to_jsonb(v_reasons),
        'score',   v_score,
        'last_active_at', v_row.last_active_at,
        'user_id', v_row.user_id);
    END IF;
  END LOOP;

  -- Keyset page: strictly AFTER the cursor row in (score DESC,
  -- last_active_at DESC, user_id DESC) order.
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

  -- SD-28 fallback: first page only, only when no hard filter narrowed the
  -- pool, and only when the real result is thin. Never for a keyed door
  -- whose key is missing (that case already returned early above).
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

  -- The card-only output shape every existing caller reads: strip the
  -- internal 'user_id'/'last_active_at' sort keys back out.
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

-- ─── Part 15: community_suggested_people re-issued (mute exclusion) ─────
--
-- Body otherwise identical to migrate_160's original (can_connect already
-- travels via _community_profile_card, re-issued in Part 13 above).

CREATE OR REPLACE FUNCTION public.community_suggested_people(_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := public._community_caller();
  v_lim   int  := public._community_limit(_limit);
  v_me    public.community_profiles%ROWTYPE;
  v_out   jsonb := '[]'::jsonb;
  v_row   record;
  v_score int;
  v_reasons text[];
  v_style text;
  v_mutual int;
  v_items jsonb[] := ARRAY[]::jsonb[];
BEGIN
  v_me := public._community_require_profile(v_uid, false);

  FOR v_row IN
    SELECT p.*
    FROM public.community_profiles p
    WHERE p.status = 'active'
      AND p.visibility = 'public'
      AND p.is_minor = false
      AND p.user_id <> v_uid
      AND NOT public._community_is_blocked(v_uid, p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_mutes mu
        WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.community_follows f
        WHERE f.follower_id = v_uid AND f.followee_id = p.user_id)
    ORDER BY p.last_active_at DESC
    LIMIT 200
  LOOP
    v_score := 0;
    v_reasons := ARRAY[]::text[];

    IF EXISTS (
      SELECT 1
      FROM public.community_programme_uses a
      JOIN public.community_programme_uses b ON b.programme_id = a.programme_id
      WHERE a.user_id = v_uid AND b.user_id = v_row.user_id
      UNION ALL
      SELECT 1
      FROM public.community_programmes g
      JOIN public.community_programme_uses u ON u.programme_id = g.id
      WHERE (g.owner_id = v_uid AND u.user_id = v_row.user_id)
         OR (g.owner_id = v_row.user_id AND u.user_id = v_uid)
    ) THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || ('Uses a programme you use')::text;
    END IF;

    IF v_me.gym_key IS NOT NULL AND v_row.gym_key = v_me.gym_key THEN
      v_score := v_score + 3;
      v_reasons := v_reasons || ('Trains at ' || coalesce(v_row.gym_label, v_me.gym_label));
    END IF;

    SELECT s INTO v_style
    FROM unnest(v_me.styles) AS s
    WHERE s = ANY (v_row.styles)
    LIMIT 1;
    IF v_style IS NOT NULL THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Also trains ' || public._community_style_label(v_style));
    END IF;

    IF v_me.area_key IS NOT NULL AND v_row.area_key = v_me.area_key THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Lists ' || coalesce(v_row.area_label, v_me.area_label));
    END IF;

    IF v_me.goal IS NOT NULL AND v_row.goal = v_me.goal THEN
      v_score := v_score + 1;
      v_reasons := v_reasons || ('Same goal')::text;
    END IF;

    SELECT count(*) INTO v_mutual
    FROM public.community_follows mine
    JOIN public.community_follows theirs ON theirs.follower_id = mine.followee_id
    WHERE mine.follower_id = v_uid AND mine.state = 'accepted'
      AND theirs.followee_id = v_row.user_id AND theirs.state = 'accepted';
    IF v_mutual > 0 THEN
      v_score := v_score + 2;
      v_reasons := v_reasons || ('Followed by ' || v_mutual::text || ' you follow');
    END IF;

    IF v_score >= 1 THEN
      v_items := v_items || jsonb_build_object(
        'card',    public._community_profile_card(v_row.user_id, v_uid),
        'reasons', to_jsonb(v_reasons),
        'score',   v_score,
        'last_active_at', v_row.last_active_at);
    END IF;
  END LOOP;

  SELECT coalesce(jsonb_agg(z.x ORDER BY (z.x ->> 'score')::int DESC,
                            (z.x ->> 'last_active_at')::timestamptz DESC), '[]'::jsonb)
  INTO v_out
  FROM (
    SELECT t.x
    FROM (SELECT unnest(v_items) AS x) t
    ORDER BY (t.x ->> 'score')::int DESC, (t.x ->> 'last_active_at')::timestamptz DESC
    LIMIT v_lim
  ) z;

  RETURN jsonb_build_object('people', v_out);
END $$;

-- ─── Part 16: community_report re-issued (message target_kind, spec 1.1 D) ─
--
-- The 'message' value was already added to community_reports_target_kind_
-- check by migrate_161 (:338-339); this function's own IN-list and owner
-- resolution are what still needed to catch up.

CREATE OR REPLACE FUNCTION public.community_report(
  _target_kind text, _target_id uuid, _reason text, _detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_owner  uuid;
  v_detail text;
  v_id     uuid;
BEGIN
  IF _target_kind NOT IN ('profile', 'post', 'comment', 'programme', 'message')
     OR _target_id IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;
  IF _reason NOT IN ('spam', 'harassment', 'impersonation',
                     'harmful_body_or_eating_content', 'inappropriate', 'other') THEN
    RAISE EXCEPTION USING message = 'invalid_input';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_reports
    WHERE reporter_id = v_uid AND target_kind = _target_kind
      AND target_id = _target_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION USING message = 'already_reported';
  END IF;

  PERFORM public._community_rate_check(v_uid, 'report', 20, 20);

  v_detail := nullif(btrim(coalesce(_detail, '')), '');
  IF v_detail IS NOT NULL AND length(v_detail) > 1000 THEN
    v_detail := left(v_detail, 1000);
  END IF;

  IF _target_kind = 'profile' THEN
    SELECT user_id  INTO v_owner FROM public.community_profiles   WHERE user_id = _target_id;
  ELSIF _target_kind = 'post' THEN
    SELECT author_id INTO v_owner FROM public.community_posts      WHERE id = _target_id;
  ELSIF _target_kind = 'comment' THEN
    SELECT author_id INTO v_owner FROM public.community_comments   WHERE id = _target_id;
  ELSIF _target_kind = 'message' THEN
    -- The target owner is the message SENDER; the caller must be a party
    -- to the conversation (either side); a message from a closed
    -- conversation is still reportable -- evidence survives closure, so
    -- `closed_at` is never checked here.
    SELECT m.sender_id INTO v_owner
    FROM public.community_messages m
    JOIN public.community_conversations c ON c.id = m.conversation_id
    WHERE m.id = _target_id AND (c.user_a = v_uid OR c.user_b = v_uid);
  ELSE
    SELECT owner_id  INTO v_owner FROM public.community_programmes WHERE id = _target_id;
  END IF;
  IF v_owner IS NULL THEN RAISE EXCEPTION USING message = 'not_found'; END IF;

  INSERT INTO public.community_reports
    (reporter_id, target_kind, target_id, target_owner_id, reason, detail, priority)
  VALUES (v_uid, _target_kind, _target_id, v_owner, _reason, v_detail,
          _reason = 'harmful_body_or_eating_content')
  RETURNING id INTO v_id;

  PERFORM public._community_auto_hide(_target_kind, _target_id);

  RETURN jsonb_build_object('id', v_id);
END $$;

-- ─── Part 17: privileges ─────────────────────────────────────────────────

DO $$
DECLARE
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    '_gyms_outward_centroid(text)',
    '_gyms_brand_alias_tokens(uuid)',
    '_gyms_tokens_strip(text[], text[])',
    '_gyms_dedupe_jaccard(text[], uuid, text[], text)',
    '_community_can_connect(uuid, uuid)',
    '_community_place_band_m(uuid, uuid)',
    '_community_populate_place_from_gym(uuid)',
    '_community_find_people_cursor_of(int, timestamptz, uuid)',
    '_community_find_people_cursor_parts(text)',
    -- Restated for the same readability/audit-trail reason
    -- migrate_162 Part 11 restates functions a plain CREATE OR REPLACE
    -- would not have changed the ACL of.
    '_community_profile_card(uuid, uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', sig);
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'gyms_place_centroid(text)',
    'gyms_search(text, double precision, double precision, int, double precision)',
    'gyms_near(double precision, double precision, int, int)',
    'gyms_get(uuid)',
    'gyms_in_place(text, int)',
    'gyms_submit(jsonb)',
    'community_set_place(text)',
    'community_set_gyms(uuid, uuid[])',
    'community_upsert_profile(jsonb)',
    'community_find_people(text, text, int, jsonb)',
    'community_suggested_people(int)',
    'community_report(text, uuid, text, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', sig);
  END LOOP;
END $$;

-- ─── Part 18: acceptance check (read-only) ───────────────────────────────
--
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: the five community_profiles columns present; every
-- function below SECURITY DEFINER with the search_path pinned;
-- `authenticated` executing exactly the client RPCs this file grants and
-- no helper.

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'community_profiles'
  AND column_name IN ('place_key', 'place_label', 'place_lat', 'place_lng', 'place_kind')
ORDER BY column_name;

SELECT p.proname,
       p.prosecdef AS security_definer,
       p.proconfig AS settings,
       pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname LIKE 'gyms\_%' OR p.proname LIKE '\_gyms\_%'
       OR p.proname IN (
         'community_set_place', 'community_set_gyms', 'community_upsert_profile',
         '_community_profile_card', 'community_find_people', 'community_suggested_people',
         'community_report', '_community_can_connect', '_community_place_band_m',
         '_community_populate_place_from_gym', '_community_find_people_cursor_of',
         '_community_find_people_cursor_parts'
       ))
ORDER BY p.proname, args;
