# 09 — Gym journey tests (behavioural, against the real dataset and ranker)

Authority: founder addition to the Community audit brief (2026-09-07,
"gym selection must be real, location-aware and universal"),
`docs/community-product-audit-2026-09-07/README.md`, and
`docs/gym-database-2026-09-06/20-BLUEPRINT.md` rulings **GD-09**
(search), **GD-10** (near me), **GD-11** (user-created gyms /
duplicates). Read in full before this file was written.

Scope discipline: this file is BEHAVIOURAL testing of the finder only
(what a real query returns, in what order, and what the current
onboarding screen actually offers). It does not duplicate `06-gym-
database-coverage.md` (counts, provenance, chain-recall methodology —
a separate agent's file), except for the small "Data readiness"
section GD-09/GD-10/GD-11 specifically need (coordinate/town/outward/
brand completeness, since the finder's behaviour depends on it).

Read-only agent. No repo file was edited, no migration applied, no
Supabase MCP tool called, nothing committed or pushed. Everything
below was produced by decompressing the shipped data files into the
scratchpad and running a Node harness against them there.

## 1. What was read (file:line for everything quoted)

- `supabase/migrate_162_gym_directory.sql` — full file (2,758 lines),
  read start to finish. RPC bodies quoted verbatim below:
  `gyms_search` (734-832), `gyms_near` (837-880), `gyms_in_place`
  (882-919), `gyms_get` (923-963), `gyms_suggest` (968-978),
  `gyms_submit` duplicate/twin logic (1081-1229), `gyms_confirm_
  submission` (1243- onward). Helper functions `_gyms_postcode_*`,
  `_gyms_outward_of`, `_gyms_sector_of`, `_gyms_distance_m`, `_gyms_
  bbox_lat_delta`/`_gyms_bbox_lng_delta`, `_gyms_geocell`, `_gyms_
  tokens_of`, `_gyms_token_jaccard`, `_gyms_visible`, `_gyms_
  selectable` (467-641).
- `supabase/migrate_160_community.sql:686-714` — `_community_fold`,
  reused by every `_gyms_*` fold/token function (`gyms_search` has no
  fold of its own).
- `src/lib/gyms/rank.js` (full file, 208 lines) — `rankVenues`,
  `BRAND_ALIASES`, `WEIGHT`, `scoreVenue`, `distanceScore`,
  `looseMatch`, `editDistance`.
- `src/lib/gyms/postcode.js` (full file, 93 lines) — `recognisePostcode`,
  `extractPostcode`, outward-code regexes.
- `src/lib/gyms/index.js` (full file, 278 lines) — `search`, `near`,
  `inPlace`, `submit`, `venueLine`, `distanceLabel`, and the header
  deviation note quoted in full in §5 below.
- `src/components/community/GymPicker.js` (full file, 144 lines).
- `src/components/community/GymRow.js` (full file, 85 lines).
- `src/screens/CommunityGymAddScreen.js` (full file, 217 lines).
- `src/screens/CommunityJoinScreen.js:85-330` (the gym step and its
  surrounding state/handlers) plus the import at line 50 and line 44.
- `src/screens/CommunityEditProfileScreen.js:41,298,356` — confirms
  GD-14's claim that the profile editor also uses `GymPicker` (two
  instances: primary gym and "other gyms").
- `data/gyms/uk-gyms.v1.jsonl.gz` (46,817 rows), `data/gyms/brands.v1.
  json`, `data/gyms/postcode-sectors.v1.csv` (12,508 sectors) —
  decompressed/copied into the scratchpad, never into the repo.
- `scripts/gyms/dedupe.mjs:1-60` — read to confirm this is the
  PIPELINE-time (GD-06) dedupe, a different mechanism from the
  submission-time check inside `gyms_submit` this file tests.

## 2. Verbatim SQL — the four read RPCs plus the submission duplicate check

### `gyms_search` (migrate_162_gym_directory.sql:734-832)

```sql
CREATE OR REPLACE FUNCTION public.gyms_search(
  _q text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL,
  _limit int DEFAULT 40
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
  v_lat_delta double precision;
  v_lng_delta double precision;
  v_venues    jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');

  IF array_length(v_toks, 1) > 0 THEN
    v_last_tok := v_toks[array_length(v_toks, 1)];
  END IF;

  IF _lat IS NOT NULL AND _lng IS NOT NULL THEN
    v_lat_delta := public._gyms_bbox_lat_delta(40000);
    v_lng_delta := public._gyms_bbox_lng_delta(_lat, 40000);
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb
           ORDER BY z.brand_match DESC, z.town_match DESC,
                    z.distance_m ASC NULLS LAST, z.display_name ASC),
         '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT
      v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
      v.outward, v.postcode, v.lat, v.lng,
      CASE WHEN _lat IS NOT NULL AND _lng IS NOT NULL
        THEN public._gyms_distance_m(_lat, _lng, v.lat, v.lng) END AS distance_m,
      v.status, v.verification_status,
      (CASE WHEN array_length(v_toks, 1) > 0 AND EXISTS (
         SELECT 1 FROM unnest(coalesce(b.aliases, ARRAY[]::text[])) al
         WHERE public._community_fold(al) = ANY (v_toks)
            OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE public._community_fold(al) LIKE qt || '%')
       ) THEN 1 ELSE 0 END) AS brand_match,
      (CASE WHEN array_length(v_toks, 1) > 0 AND (
         v.town_key = ANY (v_toks)
         OR EXISTS (SELECT 1 FROM unnest(v_toks) qt WHERE v.town_key LIKE qt || '%')
       ) THEN 1 ELSE 0 END) AS town_match
    FROM public.gym_venues v
    LEFT JOIN public.gym_brands b ON b.id = v.brand_id
    WHERE v.venue_type <> 'excluded'
      AND public._gyms_visible(v, v_uid)
      AND (
        (v_is_pc AND v_outward IS NOT NULL AND v.outward = v_outward)
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
    ORDER BY brand_match DESC, town_match DESC, distance_m ASC NULLS LAST, v.display_name ASC
    LIMIT v_limit
  ) z;

  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb),
                            'recognised_postcode', v_is_pc);
END $$;
```

Token array build: `_q` is trimmed and capped at 80 chars
(`left(btrim(...), 80)`); if it is NOT a recognised postcode, it is
folded through `_community_fold` (lower-case, accent-strip, every
non-`[a-z0-9]` run collapsed to one space) and split on spaces into
up to 8 tokens (`[1:8]` slice) — no de-duplication at this step (that
happens in `_gyms_tokens_of`, used only by `gyms_submit`, not here).
Postcode recognition: `_gyms_postcode_full_valid`/`_gyms_postcode_
outward_valid` (regexes below) decide `v_is_pc`; when true, matching
is by EXACT outward-code equality only (`v.outward = v_outward`) —
nothing fuzzy, and the token/brand/town branch is skipped entirely
(`NOT v_is_pc` guards it). Bounding box: only computed and applied
when BOTH `_lat` and `_lng` are supplied, a fixed 40 km box
(`_gyms_bbox_lat_delta(40000)`/`_gyms_bbox_lng_delta(_lat, 40000)`),
applied identically to the postcode branch and the token branch, and
skipped for a venue that itself lacks coordinates. Row-level matching
(the `WHERE`) is: exact array-overlap on `tokens` OR an exact brand-
alias fold match against any token OR exact `town_key` match against
any token OR — only on the LAST token — a prefix match against the
venue's own tokens, its `town_key`, or a brand alias. Limit: clamped
`least(greatest(coalesce(_limit,40),1),40)`. Ordering happens INSIDE
the subquery, before `LIMIT`, so the 40 rows handed back are already
the best 40 by `(brand_match, town_match, distance_m, display_name)`.

### Postcode helpers (migrate_162_gym_directory.sql:467-524)

```sql
CREATE OR REPLACE FUNCTION public._gyms_postcode_full_valid(_pc text) ...
  SELECT public._gyms_postcode_compact(_pc) ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$';

CREATE OR REPLACE FUNCTION public._gyms_postcode_outward_valid(_pc text) ...
  SELECT public._gyms_postcode_compact(_pc) ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?$';

CREATE OR REPLACE FUNCTION public._gyms_outward_of(_pc text) ...
  SELECT CASE WHEN public._gyms_postcode_full_valid(_pc)
    THEN substring(public._gyms_postcode_compact(_pc) FROM '^([A-Z]{1,2}[0-9][A-Z0-9]?)[0-9][A-Z]{2}$')
    WHEN public._gyms_postcode_outward_valid(_pc)
    THEN public._gyms_postcode_compact(_pc)
    ELSE NULL END;
```

`ML1` and `ML11` are both valid shapes of the outward regex
(`[A-Z]{1,2}[0-9][A-Z0-9]?`: letters + digit + one OPTIONAL alnum), so
they are two distinct, exactly-matched outward codes — `ML1` never
matches an `ML11` row and vice versa, confirmed in the results below.

### `gyms_near` (migrate_162_gym_directory.sql:837-880)

```sql
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
  v_radius    double precision := least(greatest(coalesce(_radius_m, 8000), 1), 50000);
  v_limit     int := least(greatest(coalesce(_limit, 40), 1), 50);
  v_lat_delta double precision := public._gyms_bbox_lat_delta(v_radius);
  v_lng_delta double precision := public._gyms_bbox_lng_delta(_lat, v_radius);
  v_venues    jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');
  IF _lat IS NULL OR _lng IS NULL THEN
    RAISE EXCEPTION USING message = 'invalid';
  END IF;
  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb ORDER BY z.distance_m ASC), '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
           v.outward, v.postcode, v.lat, v.lng,
           public._gyms_distance_m(_lat, _lng, v.lat, v.lng) AS distance_m,
           v.status, v.verification_status
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
  RETURN jsonb_build_object('venues', coalesce(v_venues, '[]'::jsonb));
END $$;
```

Bounding box uses the RADIUS itself (not a fixed 40 km), haversine
(`_gyms_distance_m`, mean earth radius 6,371,000 m) both narrows the
scan and is the actual cutoff (`<= v_radius`), `other_fitness` venues
are excluded from near-me (not from `gyms_search`), limit clamps to
1..50 (default 40, NOT 40 max — this one differs from `gyms_search`'s
1..40 clamp).

### `gyms_in_place` (migrate_162_gym_directory.sql:882-919)

```sql
CREATE OR REPLACE FUNCTION public.gyms_in_place(_town_key text, _limit int DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := public._community_caller();
  v_key    text := nullif(btrim(coalesce(_town_key, '')), '');
  v_limit  int := least(greatest(coalesce(_limit, 60), 1), 80);
  v_venues jsonb;
BEGIN
  PERFORM public._community_rate_check(v_uid, 'gyms_read', 120, 120, interval '1 minute');
  IF v_key IS NULL THEN RETURN jsonb_build_object('venues', '[]'::jsonb); END IF;
  SELECT coalesce(jsonb_agg(row_to_json(z)::jsonb
           ORDER BY z.brand_match DESC, z.display_name ASC), '[]'::jsonb)
  INTO v_venues
  FROM (
    SELECT v.id, v.display_name, v.name, b.name AS brand, v.venue_type, v.town,
           v.outward, v.postcode, v.lat, v.lng, NULL::double precision AS distance_m,
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
```

Exact `town_key` equality only — no prefix, no fuzzy. Never distance-
sorted (distance_m is always `NULL`); brand-having venues sort first,
then alphabetical. Nothing in the client (`src/lib/gyms/index.js`
`inPlace()`) is called from any screen read in this audit — `06` may
have more on reachability.

### `gyms_suggest` (migrate_162_gym_directory.sql:968-978)

```sql
CREATE OR REPLACE FUNCTION public.gyms_suggest(
  _q text, _lat double precision DEFAULT NULL, _lng double precision DEFAULT NULL
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('venues', public.gyms_search(_q, _lat, _lng, 8) -> 'venues');
$$;
```

Pure delegation to `gyms_search` with `_limit` fixed at 8 — identical
matching, so every finding below about `gyms_search` applies here too.
Nothing in `GymPicker.js` or either screen read in this audit calls
`suggest()` (`src/lib/gyms/index.js:155`) — the picker calls `search()`
directly, debounced (see §5).

### `gyms_submit`'s duplicate and twin checks (migrate_162_gym_directory.sql:1081-1177)

```sql
  SELECT v.id, v.display_name INTO v_dup_id, v_dup_name
  FROM public.gym_venues v
  WHERE v.status IN ('open', 'pending')
    AND v.outward = public._gyms_outward_of(v_postcode)
    AND public._gyms_visible(v, v_uid)
    AND (
      (v.postcode IS NOT NULL
        AND public._gyms_postcode_compact(v.postcode) = public._gyms_postcode_compact(v_postcode)
        AND public._gyms_token_jaccard(v.tokens, v_tokens) >= 0.6)
      OR public._gyms_token_jaccard(v.tokens, v_tokens) >= 0.85
    )
  ORDER BY public._gyms_token_jaccard(v.tokens, v_tokens) DESC
  LIMIT 1;

  IF v_dup_id IS NOT NULL THEN
    RETURN jsonb_build_object('duplicate_of', v_dup_id, 'display_name', v_dup_name);
  END IF;

  -- [twin-pending scan, same predicate, status='pending' only, no
  -- visibility restriction — confirms a second independent
  -- submitter into the EXISTING pending row rather than inserting a
  -- second identical pending venue]
```

`v_tokens := public._gyms_tokens_of(v_name, v_town)` — this is a
DIFFERENT tokenizer from the catalogue's own `tokens` column (see
§4's divergence and the duplicate-check findings in §7): it folds
ONLY `name || ' ' || town`, with no outward code, no brand-name
splitting, no operator suffix words, whereas the catalogue's `tokens`
column (built by the pipeline, `scripts/gyms/normalise.mjs`, and
present verbatim in `data/gyms/uk-gyms.v1.jsonl`) routinely carries
2-4 EXTRA tokens per branded venue (the outward code, "uk", brand
words split out separately from the compound brand token, operator-
feed suffix words like "group"/"centre"/"wellbeing"). This asymmetry
is the root cause of the duplicate-detection gap in §7.
## 3. Client ranker — verbatim (`src/lib/gyms/rank.js`)

`rankVenues` re-orders whatever `gyms_search` (or `gyms_suggest`)
already returned; it never adds a candidate the server did not
return. Weights (rank.js:104-111):

```js
const WEIGHT = {
  BRAND_EXACT: 1000,
  BRAND_CLOSE: 700,
  POSTCODE: 500,
  TOWN: 300,
  NAME_TOKEN: 60,
  NAME_TOKEN_CLOSE: 30,
};
```

Distance scoring (rank.js:113-120):

```js
function distanceScore(distanceM) {
  if (!Number.isFinite(Number(distanceM))) return 0;
  return Math.max(0, 200 - Number(distanceM) / 100);
}
```

**Finding R1 (real bug, reproduced against the unmodified file, not a
harness artefact): `distanceScore(null)` returns 200, not 0.**
`Number(null)` is `0`, which IS finite, so the early-return guard
never fires for a venue with NO distance at all (every search made
with no coordinate, which is every search `GymPicker` makes today,
see §5). The function then computes `Math.max(0, 200 - 0/100) = 200`
for every single row. Because it is a CONSTANT 200 added to every
candidate alike, it never changes relative ORDER when no coordinate
is supplied — but `scoreVenue` also pushes the reason string
`'Nearby'` (rank.js:170-174) whenever `dScore > 0`, so **every result
row in every no-coordinate search carries a "Nearby" reason**, which
is false: nothing about proximity was computed or known. This is
visible in every "No coordinate" table in §6 below (every row's
reason list ends `; Nearby`). The fix (not made — this agent is
read-only) is to return 0 early when `distanceM` is strictly `null`/
`undefined`, e.g. `if (distanceM == null || !Number.isFinite(Number(distanceM))) return 0;`.

**Finding R1b — this bug also INVERTS ranking order when a
coordinate IS supplied, if any candidate has no coordinates at all**,
because a null distance scores 200 (as if 0 m away) while a real
19.9 km/12.3 mi distance only scores `max(0, 200 - 19873/100) ≈ 1.3`.
Reproduced end to end with the Motherwell coordinate on `"david
lloyd hamilton"`: the raw SQL candidate `"David Lloyd Clubs in
Bristol"` (an operator-feed scraping fault — `town: null`,
`postcode: "F5F 5EF"`, not a valid UK postcode shape, `lat`/`lng`
both `null`, `coord_source: "none"` — see `data/gyms/uk-gyms.v1.
jsonl`, id `e88b5381-c603-5ca8-b781-4ef4961ed8b0`; full provenance is
`06`'s territory, flagged here only because it changes ranked order)
sits at raw position 5 of 40 server-side candidates (ordered
correctly there, `distance_m NULLS LAST` puts it behind every
real-distance branch) but **`rankVenues` promotes it to #1**, ahead
of the genuinely-nearest real David Lloyd branch (Rouken Glen,
Glasgow, 12.3 mi) — confirmed: `rankVenues(candidates, 'david lloyd
hamilton')[0].display_name === 'David Lloyd Clubs in Bristol'`,
`[0].reasons === ['Matches David Lloyd', 'Nearby']`. So the bug is
not merely cosmetic: a single malformed, coordinate-less catalogue
row for a popular brand can outrank the real nearest branch on a
phone that DID share its location, the moment such a row exists in
the brand's candidate set.

## 4. Postcode recognition — verbatim (`src/lib/gyms/postcode.js:18-26`)

```js
const OUTWARD_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;
const FULL_RE = /^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/;
```

Identical shape to the server's `_gyms_postcode_*` regexes (both
teams evidently derived from the same UK postcode grammar), so the
client's "recognised as a postcode" chip and the server's postcode
branch agree on every input tested.

## 5. The onboarding path as coded today (file:line)

- **`CommunityJoinScreen.js:287-315`** — the gym step, headed
  "Trains at (optional)" (line 288). It is OPTIONAL and never blocks
  `canCreate`/`create()` (lines 194-236 make no reference to
  `primaryGym`). While `editingGym` is true it renders
  `<GymPicker navigation={navigation} onSelect={(venue) => { setPrimaryGym(venue); setEditingGym(false); }} />`
  (lines 290-293); once a venue is picked it collapses to a `Card`
  showing just `venueLine(primaryGym).primary` (the display name
  only — town/outward/distance are NOT shown once picked) plus a
  "Change" button (lines 295-310). Line 312-314: "Only the gym you
  choose. Never your location. Can be added later from Edit profile."
  On create, `setGyms(primaryGym.id, [])` is fired best-effort (line
  221-223) — a failure here is swallowed with the comment "can be
  added later", so a person can finish Join believing their gym was
  saved when the write silently failed.
- **`CommunityGymAddScreen.js:41,63,90,54-65`** — imported by
  `GymPicker.js:36` reachable only via the empty-state action
  (`GymPicker.js:121-131`, "Can't find your gym? Add it"). The whole
  screen (name/address/town/postcode/website/operator) is described
  in full in §7 alongside the duplicate-check evidence.
- **`CommunityEditProfileScreen.js:41,298,356`** — confirms GD-14:
  the SAME `GymPicker` component is used twice here (primary gym,
  other gyms), so this is not a Join-only path.

**What the gym step offers today, answered directly:**

| Question | Answer | Evidence |
|---|---|---|
| Typeahead? | Yes — `GymPicker`, 250 ms debounce, min 2 characters | `GymPicker.js:38-39,56-84` |
| Which function? | `search()` → `gyms_search` RPC only | `GymPicker.js:36,69`; `index.js:90-99` |
| Any near-me? | **No.** Nothing calls `near()`/`gyms_near` from any screen read in this audit | `index.js:8-19` header deviation note (quoted below), confirmed by absence of any `near(` call in `GymPicker.js`, `CommunityJoinScreen.js`, `CommunityEditProfileScreen.js`, `CommunityGymAddScreen.js` |
| Any radius control? | No — there is no radius UI anywhere in the picker or either screen | `GymPicker.js` (full file has no radius state or control) |
| Any "can't find your gym" link? | Yes — `EmptyState` action "Can't find your gym? Add it" → `CommunityGymAdd` | `GymPicker.js:121-131` |
| Branch shown as name+town+outward? | **Only in the LIST.** Once selected, the summary card shows the display name alone — no town/outward/distance | `GymPicker.js` via `GymRow.js:22-63` (`venueLine`) for the list; `CommunityJoinScreen.js:295-310` for the post-selection card |
| Is a coordinate ever read or sent? | **No, anywhere in this module** (GD-13 compliant) | `index.js:8-19` |

`src/lib/gyms/index.js:8-19`, verbatim:

> DEVIATION (GD-10, recorded per the brief): "near me" is meant to
> offer "Use my location" only when the app already carries a
> location permission dependency. `expo-location` is NOT in
> package.json, and nothing here adds it (CLAUDE.md: never add a
> dependency without asking). So `near()` below is implemented
> against `gyms_near` for completeness and for a future permission
> decision, but nothing in `GymPicker` calls it: "near me" today is
> reached only through the recognised-postcode chip / town search
> path (`search()`, which the server resolves via the postcode's
> ONSPD sector centroid, GD-08), never through the device's own
> coordinates. No coordinate is ever requested, read, or stored by
> this module (GD-13).

**Consequence for the "WITH a Motherwell centre coordinate" half of
§6 and all of §7's near-me bands below: none of it is reachable
through the app as it stands today.** Every coordinate-bearing
scenario in this report is a harness-level test of the RPC contract
and the ranker's OWN behaviour when handed a coordinate — useful
evidence for a founder decision on whether to add the location
dependency GD-10 anticipates, but not a description of what a real
user sees today. The no-coordinate tables in §6 ARE what today's
`GymPicker` actually returns for that typed text.

## 6. Harness — path, method, and how to re-run it

Path: `/tmp/claude-0/-home-user-ADPhysique/adfb48c5-e305-58f7-b963-213d69115cc4/scratchpad/`
(scratchpad only, nothing written to the repo):

- `gymlib/pgSim.mjs` — re-implementation of every `_gyms_*` SQL
  helper and the bodies of `gyms_search`, `gyms_near`, `gyms_in_
  place`, and `gyms_submit`'s duplicate/twin check, transcribed
  directly from the quotes in §2.
- `gymlib/postcode.mjs`, `gymlib/rank.mjs` — byte-identical copies of
  `src/lib/gyms/postcode.js` and `src/lib/gyms/rank.js`, renamed to
  `.mjs` and with ONE line changed (the relative import extension,
  `'./postcode'` → `'./postcode.mjs'`) so plain Node can load them as
  ES modules; no other line touched. This is the REAL client ranker,
  not a re-implementation.
- `gymlib/load.mjs` — loads `uk-gyms.v1.jsonl`, `brands.v1.json`,
  `postcode-sectors.v1.csv` into memory.
- `run-queries.mjs` / `run-queries-md.mjs` — the 37-query sweep, no
  coordinate and with the Motherwell coordinate.
- `run-near.mjs` / `run-near-md.mjs` — the near-me mile-band sweep.
- `run-duplicate.mjs` — the `gyms_submit` duplicate-check cases.
- `find-rural.mjs` — the search that picked the ~15-mile rural point.

To re-run (from a machine with this repo checked out and Node ≥18):

```sh
mkdir -p /tmp/gymharness && cd /tmp/gymharness
node -e "const z=require('zlib'),fs=require('fs');
  fs.writeFileSync('uk-gyms.v1.jsonl', z.gunzipSync(fs.readFileSync('<repo>/data/gyms/uk-gyms.v1.jsonl.gz')));"
cp <repo>/data/gyms/brands.v1.json <repo>/data/gyms/postcode-sectors.v1.csv .
mkdir gymlib
cp <repo>/src/lib/gyms/postcode.js gymlib/postcode.mjs
cp <repo>/src/lib/gyms/rank.js gymlib/rank.mjs
sed -i "s|from './postcode'|from './postcode.mjs'|" gymlib/rank.mjs
# copy pgSim.mjs / load.mjs / run-*.mjs from this session's scratchpad
node run-queries-md.mjs > queries.md
node run-near-md.mjs > near.md
node run-duplicate.mjs
```

### Harness-vs-Postgres divergences (every place this could differ)

1. **Visibility with no session.** The harness always calls with
   `uid = null`, so `_gyms_visible` only ever admits `status =
   'open'` rows (`pgSim.mjs` `gymsVisible`). A real signed-in caller
   viewing their OWN pending submission would additionally see that
   one `pending` row; this harness cannot reproduce that per-user
   case (no submissions were made against a live database), but it
   is a one-row difference by construction (GD-11), not a systemic
   one.
2. **`_community_fold`'s Latin transliteration table** was
   transcribed as a JS `Map` (`pgSim.mjs` `communityFold`) built from
   the same `FROM_CHARS`/`TO_CHARS` strings as the SQL. Untested
   against the real Postgres function — no accented characters
   appeared in the 37 test queries, so this divergence path was never
   exercised, only inspected.
3. **JSON number precision.** `lat`/`lng` in the JSONL are IEEE
   doubles from the pipeline's own JSON serialisation; Postgres
   `double precision` and JS `number` are both IEEE 754 doubles, so
   no precision divergence is expected, but this was not
   independently verified bit-for-bit.
4. **`gyms_submit`'s side effects were NOT executed.** The harness
   implements only the READ half of the duplicate/twin logic
   (`gymsSubmitDuplicateCheck` in `pgSim.mjs`) — no row is inserted,
   no `gym_venue_history`/`gym_submissions` write happens, and the
   twin-confirm state transition (two distinct confirmers flip a
   pending row to `open`) is described from the SQL, not exercised
   end-to-end.
5. **Rate limiting (`_community_rate_check`) is not simulated** — the
   harness never throttles; every query in §6/§7 assumes the caller
   is under the 120/minute read budget and the 3/day submit budget,
   which is true for a single test run but would not be true for the
   thousands of calls a real load test might make.
6. **`gen_random_uuid()`, `now()`, and every other server-side
   default were not exercised** since no INSERT ran.
7. **Postgres `unnest`/`ANY`/`LIKE` semantics on NULL or empty
   arrays** were reasoned about and matched with plain JS
   `Array.prototype` methods (`.some`, `.includes`); this was
   spot-checked against the SQL's own NULL-guards (`coalesce(b.
   aliases, ARRAY[]::text[])`, `array_length(v_toks,1) > 0` guards)
   but not run against a live Postgres instance for confirmation.
8. **Case/locale-sensitive string comparison.** `ORDER BY ...
   display_name ASC` in Postgres uses the database's collation
   (typically `en_US`/`C` depending on the Supabase project's
   locale, not inspected here); the harness uses JS
   `String.prototype.localeCompare()`. For the display names actually
   returned across all 37×2 queries this produced no dispute (plain
   ASCII alphabetical order throughout), but a collation difference on
   punctuation or non-ASCII names cannot be ruled out from this test
   alone.
## 7. Search results — 37 queries, full pipeline (`gyms_search` → `rankVenues`)

Every table below is the REAL client ranker's top 10 over the
harness's re-implementation of the server's candidate set (§2/§6),
exactly as `src/lib/gyms/index.js` `search()` composes them
(`rankVenues(venuesFrom(data), text)`). "candidates returned by
`gyms_search`" is the size of the server-side result BEFORE client
ranking (capped at 40) — when it reads 40, more may exist in the
catalogue than the server ever handed the ranker, so the true 41st+
best match (by whatever ordering) never reaches the phone at all; see
Finding S1 immediately after the tables.

### Headline findings from this sweep (read before or alongside the tables)

- **Finding S1 (real, quantified) — the exact chain branch a person
  is looking for can be silently excluded from the candidate set
  before the client ranker ever runs, when the query text does not
  exactly match on the server's coarse `(brand_match, town_match,
  distance_m, display_name)` pre-ranking.** `"pure gym mothewell"`
  (one dropped letter in "Motherwell", a wholly plausible mobile
  typo) returns 40 candidates, but **`PureGym Motherwell` is not
  among them** — confirmed directly against the harness's raw
  candidate list (not just the ranked top 10): of 455 open PureGym
  branches nationwide, the server's tie-break is alphabetical by
  `display_name` when `brand_match`/`town_match`/`distance_m` are
  equal, and "PureGym Motherwell" sorts alphabetically after 39 other
  PureGym branches ("PureGym Aberdare" through "PureGym Birmingham
  Maypole") that all tie on `brand_match=1, town_match=0,
  distance_m=NULL` (no coordinate supplied) — so the 40-candidate cap
  cuts the list off before Motherwell is ever reached, and the
  client's fuzzy `rankVenues` (which WOULD have promoted it, see
  Finding S2) never sees it. The correctly-spelled `"Puregym
  Motherwel"` (typo dropping the trailing "l" of Motherwell) DOES
  surface it at #1, because a trailing-letter typo still leaves a
  true PREFIX match ("motherwel" is a genuine prefix of the town_key
  "motherwell"), which the server's last-token prefix branch catches;
  an INTERNAL typo/deletion ("mothewell", missing the "r") is not a
  prefix of anything and gets no server-side leniency at all. A
  misspelling that breaks prefix-ness is silently unrecoverable for
  a common chain in a market with 400+ branches.
- **Finding S2 (ranker only, not reachable in this case) —
  `rankVenues` DOES have a fuzzy allowance (`looseMatch`, edit
  distance ≤ 25% of the shorter string) that would have scored
  "PureGym Motherwell" highly for "mothewell" (town-name edit
  distance 1) had it been a candidate at all — this is filtration at
  the SERVER layer that the CLIENT'S fuzzy logic can never undo.**
  Confirmed by hand-scoring: brand-exact (1000) + two name-token
  bonuses (pure/gym containment, 60+30) + town-name loose match via
  `NAME_TOKEN_CLOSE` (30) would have out-scored every alphabetically-
  earlier PureGym branch, which only get brand-exact + the same two
  name-token bonuses (no town bonus) — but it never gets the chance.
- **`"puregm"` (a plausible fat-finger typo, dropping the "y") returns
  ZERO candidates, in both the no-coordinate and coordinate cases.**
  The server's last-token prefix check requires the CATALOGUE token
  to start with the typed text ("puregym".startsWith("puregm")` is
  false — the 6th character differs, "y" vs "m"), and there is no
  server-side fuzzy/edit-distance matching at all; the client ranker
  never gets any candidates to rescue.
- **Postcode district precision is correct where tested.** `ML1` and
  `ML11` (Lanark) never cross-contaminate — confirmed: `ML1` returns
  only Motherwell venues, `ML11` (and `ML1 1`, which resolves to the
  SAME outward "ML11" — see the postcode-parsing note below) returns
  only Lanark venues.
- **Postcode-parsing footgun, not a bug but worth flagging: `"ML1 1"`
  is parsed as the FULL postcode outward "ML11", not as "ML1" plus a
  partial inward code.** `_gyms_postcode_full_valid`/`FULL_RE` require
  a complete 3-letter-shaped inward half (digit + 2 letters); "ML1 1"
  compacts to "ML11" which matches the OUTWARD-only regex, so both the
  client chip and the server return Lanark (ML11) results, not
  Motherwell (ML1) results — a user who types a postcode one token at
  a time and pauses after "ML1 1" (meaning to continue toward "ML1
  1AA") is silently redirected to the wrong town's postcode district
  for as long as they leave the field there. This reproduces
  identically with and without a coordinate.
- **Brand searches do distinguish branches by name+town+outward, but
  the number of DISTINCT branches visible within the 40-candidate cap
  varies hugely by how common the chain's shared name tokens are.**
  See the per-brand notes under "Brand-only query notes" below the
  tables.
- **`distance_m` is `null` throughout every "No coordinate" table**
  (correct — GD-13, no coordinate was ever supplied), but every row
  still carries the `Nearby` reason string (Finding R1, §3) — a
  cosmetic but real defect: a user with no location shared sees
  "Nearby" attached to a result in Truro when they searched from
  nowhere in particular.

### Brand-only query notes (branch distinction, count within limit, nearest-first)

| Query | Distinguishes branches (name+town+outward)? | Distinct branches within the 40-candidate cap (no coord) | Nearest branch first when Motherwell coordinate supplied? |
|---|---|---|---|
| `puregym` / `pure gym` / `PureGym` | Yes | 40 (of 455 open nationwide, alphabetical from "Aberdare") | Yes — Motherwell (0.1 mi) is #1, then Airdrie 5.3 mi, East Kilbride 7.5 mi, ascending |
| `JD Motherwell` / `jd gyms` | Yes | 10 (of a much smaller national footprint; brand alias "jd"/"jd gyms" also pulls in Xercise4Less branches, same brand key per GD-05/`brands.v1.json`) | Yes when a JD/Xercise4Less branch is close enough to be a candidate at all (see JD Motherwell row in §7 tables — nearest returned branch is Livingston, 22.7 mi, since no JD/Xercise4Less branch sits inside the 40 km box around Motherwell) |
| `the gym` / `the gym group motherwell` | Yes, but the alias "the gym" also matches every INDEPENDENT venue whose OWN name literally contains the words "the" + "gym" ("The Gym Van", "At The Gym", "MyPT The Gym") — these are not The Gym Group branches at all and are shown mixed in with real branches, indistinguishable in the UI beyond the brand text itself not appearing (no `brand` field renders on the row today, see §5's picker table — the "Matches The Gym Group" text is a RANKER reason, internal, never rendered) | ~9 of ~40 candidates are genuine The Gym Group branches | Yes among the branches present, but the true nearest Gym Group branch (Hamilton, 1.6 mi) only appears because it happened to make the 40-candidate cut; a busier alias in a busier area could push it out the same way Finding S1 describes |
| `anytime` | Yes | 40 nationwide (no coord) / 5 within the 40 km box (with coord) | Yes |
| `david lloyd hamilton` | Yes | 40 nationwide (no coord, alphabetical — Aberdeen before Hamilton, so the actual Hamilton-adjacent branches don't appear in the no-coordinate top 10 at all despite the word "hamilton" being typed) / with coordinate, nearest genuine David Lloyd branch is Rouken Glen, Glasgow, 12.3 mi (no David Lloyd in Hamilton itself) | Yes, among candidates present |
| `nuffield` | Yes | 40 nationwide (no coord) / 4 within 40 km of Motherwell (with coord) | Yes |
| `crossfit` / `glasgow crossfit` | Yes (independent CrossFit affiliates, not a single chain — `BRAND_ALIASES.crossfit`) | 40 nationwide / 15 within 40 km (with coord, `"crossfit"` alone) | Yes among candidates present |

Full top-10 tables for all 37 queries, both conditions, follow.

### No coordinate

#### "PureGym Motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | - | Matches PureGym; In Motherwell; Nearby |
| 2 | PureGym Aberdare | Aberdare | CF44 | - | Matches PureGym; Nearby |
| 3 | PureGym Aberdeen Kittybrewster | Aberdeen | AB24 | - | Matches PureGym; Nearby |
| 4 | PureGym Aberdeen Rubislaw | Aberdeen | AB15 | - | Matches PureGym; Nearby |
| 5 | PureGym Aberdeen Shiprow | Aberdeen | AB11 | - | Matches PureGym; Nearby |
| 6 | PureGym Aberdeen Wellington Circle | Aberdeen | AB12 | - | Matches PureGym; Nearby |
| 7 | PureGym Aintree | Liverpool | L9 | - | Matches PureGym; Nearby |
| 8 | PureGym Airdrie | Airdrie | ML6 | - | Matches PureGym; Nearby |
| 9 | PureGym Aldershot Westgate Retail Park | Aldershot | GU11 | - | Matches PureGym; Nearby |
| 10 | PureGym Alfreton | Alfreton | DE55 | - | Matches PureGym; Nearby |

#### "puregym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Aberdare | Aberdare | CF44 | - | Matches PureGym; Nearby |
| 2 | PureGym Aberdeen Kittybrewster | Aberdeen | AB24 | - | Matches PureGym; Nearby |
| 3 | PureGym Aberdeen Rubislaw | Aberdeen | AB15 | - | Matches PureGym; Nearby |
| 4 | PureGym Aberdeen Shiprow | Aberdeen | AB11 | - | Matches PureGym; Nearby |
| 5 | PureGym Aberdeen Wellington Circle | Aberdeen | AB12 | - | Matches PureGym; Nearby |
| 6 | PureGym Aintree | Liverpool | L9 | - | Matches PureGym; Nearby |
| 7 | PureGym Airdrie | Airdrie | ML6 | - | Matches PureGym; Nearby |
| 8 | PureGym Aldershot Westgate Retail Park | Aldershot | GU11 | - | Matches PureGym; Nearby |
| 9 | PureGym Alfreton | Alfreton | DE55 | - | Matches PureGym; Nearby |
| 10 | PureGym Alloa | Alloa | FK10 | - | Matches PureGym; Nearby |

#### "pure gym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Aberdare | Aberdare | CF44 | - | Matches PureGym; Nearby |
| 2 | PureGym Aberdeen Kittybrewster | Aberdeen | AB24 | - | Matches PureGym; Nearby |
| 3 | PureGym Aberdeen Rubislaw | Aberdeen | AB15 | - | Matches PureGym; Nearby |
| 4 | PureGym Aberdeen Shiprow | Aberdeen | AB11 | - | Matches PureGym; Nearby |
| 5 | PureGym Aberdeen Wellington Circle | Aberdeen | AB12 | - | Matches PureGym; Nearby |
| 6 | PureGym Aintree | Liverpool | L9 | - | Matches PureGym; Nearby |
| 7 | PureGym Airdrie | Airdrie | ML6 | - | Matches PureGym; Nearby |
| 8 | PureGym Aldershot Westgate Retail Park | Aldershot | GU11 | - | Matches PureGym; Nearby |
| 9 | PureGym Alfreton | Alfreton | DE55 | - | Matches PureGym; Nearby |
| 10 | PureGym Alloa | Alloa | FK10 | - | Matches PureGym; Nearby |

#### "PureGym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Aberdare | Aberdare | CF44 | - | Matches PureGym; Nearby |
| 2 | PureGym Aberdeen Kittybrewster | Aberdeen | AB24 | - | Matches PureGym; Nearby |
| 3 | PureGym Aberdeen Rubislaw | Aberdeen | AB15 | - | Matches PureGym; Nearby |
| 4 | PureGym Aberdeen Shiprow | Aberdeen | AB11 | - | Matches PureGym; Nearby |
| 5 | PureGym Aberdeen Wellington Circle | Aberdeen | AB12 | - | Matches PureGym; Nearby |
| 6 | PureGym Aintree | Liverpool | L9 | - | Matches PureGym; Nearby |
| 7 | PureGym Airdrie | Airdrie | ML6 | - | Matches PureGym; Nearby |
| 8 | PureGym Aldershot Westgate Retail Park | Aldershot | GU11 | - | Matches PureGym; Nearby |
| 9 | PureGym Alfreton | Alfreton | DE55 | - | Matches PureGym; Nearby |
| 10 | PureGym Alloa | Alloa | FK10 | - | Matches PureGym; Nearby |

#### "JD Motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | JD Aerial Fitness Academy Liverpool | Liverpool | L9 | - | Matches JD Gyms; Nearby |
| 2 | JD Fitness | Newton Abbot | TQ12 | - | Matches JD Gyms; Nearby |
| 3 | JD Fitness | Livingston | EH27 | - | Matches JD Gyms; Nearby |
| 4 | JD Gyms - Chester | Chester | CH1 | - | Matches JD Gyms; Nearby |
| 5 | JD Gyms - Edinburgh Chesser | Edinburgh | EH14 | - | Matches JD Gyms; Nearby |
| 6 | JD Gyms - Lancaster and Morecambe | Morecambe | LA3 | - | Matches JD Gyms; Nearby |
| 7 | JD Gyms - Newtownabbey | Newtownabbey | BT37 | - | Matches JD Gyms; Nearby |
| 8 | JD Gyms - Wakefield | Wakefield | WF1 | - | Matches JD Gyms; Nearby |
| 9 | JD Gyms Aintree | Bootle | L30 | - | Matches JD Gyms; Nearby |
| 10 | JD Gyms Chesterfield | Chesterfield | S40 | - | Matches JD Gyms; Nearby |

#### "jd gyms"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | JD Gyms - Chester | Chester | CH1 | - | Matches JD Gyms; Nearby |
| 2 | JD Gyms - Edinburgh Chesser | Edinburgh | EH14 | - | Matches JD Gyms; Nearby |
| 3 | JD Gyms - Lancaster and Morecambe | Morecambe | LA3 | - | Matches JD Gyms; Nearby |
| 4 | JD Gyms - Newtownabbey | Newtownabbey | BT37 | - | Matches JD Gyms; Nearby |
| 5 | JD Gyms - Wakefield | Wakefield | WF1 | - | Matches JD Gyms; Nearby |
| 6 | JD Gyms Aintree | Bootle | L30 | - | Matches JD Gyms; Nearby |
| 7 | JD Gyms Chesterfield | Chesterfield | S40 | - | Matches JD Gyms; Nearby |
| 8 | JD Gyms Wolverhampton | Wolverhampton | WV1 | - | Matches JD Gyms; Nearby |
| 9 | JD's Old Skool Gym | Tamworth | B79 | - | Matches JD Gyms; Nearby |
| 10 | JD Aerial Fitness Academy Liverpool | Liverpool | L9 | - | Matches JD Gyms; Nearby |

#### "motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=29

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 2 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 3 | Rivals Gym Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 4 | XS Taekwondo Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 5 | Yogamind - Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 6 | Suzanne O'Reilly Fitness | Motherwell | ML1 | - | In Motherwell; Nearby |
| 7 | The Boathouse Fitness Club | Motherwell | ML1 | - | In Motherwell; Nearby |
| 8 | ACT Scotland | Motherwell | ML1 | - | In Motherwell; Nearby |
| 9 | Advance Bodies | Motherwell | ML1 | - | In Motherwell; Nearby |
| 10 | Aesthetic13 GYM | Motherwell | ML1 | - | In Motherwell; Nearby |

#### "Motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=29

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 2 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 3 | Rivals Gym Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 4 | XS Taekwondo Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 5 | Yogamind - Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 6 | Suzanne O'Reilly Fitness | Motherwell | ML1 | - | In Motherwell; Nearby |
| 7 | The Boathouse Fitness Club | Motherwell | ML1 | - | In Motherwell; Nearby |
| 8 | ACT Scotland | Motherwell | ML1 | - | In Motherwell; Nearby |
| 9 | Advance Bodies | Motherwell | ML1 | - | In Motherwell; Nearby |
| 10 | Aesthetic13 GYM | Motherwell | ML1 | - | In Motherwell; Nearby |

#### "ML1"
recognised_postcode=true, candidates returned by `gyms_search`=33

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | ACT Scotland | Motherwell | ML1 | - | Near ML1; Nearby |
| 2 | Advance Bodies | Motherwell | ML1 | - | Near ML1; Nearby |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | - | Near ML1; Nearby |
| 4 | ALBA Military Fitness | Motherwell | ML1 | - | Near ML1; Nearby |
| 5 | Chikara Karate Club | Motherwell | ML1 | - | Near ML1; Nearby |
| 6 | Cleland Boxing Club | Motherwell | ML1 | - | Near ML1; Nearby |
| 7 | Colville Park Bowling Club | Motherwell | ML1 | - | Near ML1; Nearby |
| 8 | Curves Fitness for Women | Motherwell | ML1 | - | Near ML1; Nearby |
| 9 | Dynamic Gymnastics Academy | Motherwell | ML1 | - | Near ML1; Nearby |
| 10 | Enduro Fit Studio | Eurocentral | ML1 | - | Near ML1; Nearby |

#### "ML1 1"
recognised_postcode=true, candidates returned by `gyms_search`=18

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Blue Lotus | Lanark | ML11 | - | Near ML11; Nearby |
| 2 | BRC Fitness | Lanark | ML11 | - | Near ML11; Nearby |
| 3 | Curtis Bros Fitness | Lanark | ML11 | - | Near ML11; Nearby |
| 4 | KMB Fitness & Rehabilitation | Lanark | ML11 | - | Near ML11; Nearby |
| 5 | Know Your Strength Fitness | Lanark | ML11 | - | Near ML11; Nearby |
| 6 | LA's Spin Fit | Lanark | ML11 | - | Near ML11; Nearby |
| 7 | Lanark boxing club | Lanark | ML11 | - | Near ML11; Nearby |
| 8 | Lunar Gymnastics Club | Lanark | ML11 | - | Near ML11; Nearby |
| 9 | New Lanark Health and Fitness Club | Lanark | ML11 | - | Near ML11; Nearby |
| 10 | Nirvana Yoga | Lanark | ML11 | - | Near ML11; Nearby |

#### "ML11"
recognised_postcode=true, candidates returned by `gyms_search`=18

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Blue Lotus | Lanark | ML11 | - | Near ML11; Nearby |
| 2 | BRC Fitness | Lanark | ML11 | - | Near ML11; Nearby |
| 3 | Curtis Bros Fitness | Lanark | ML11 | - | Near ML11; Nearby |
| 4 | KMB Fitness & Rehabilitation | Lanark | ML11 | - | Near ML11; Nearby |
| 5 | Know Your Strength Fitness | Lanark | ML11 | - | Near ML11; Nearby |
| 6 | LA's Spin Fit | Lanark | ML11 | - | Near ML11; Nearby |
| 7 | Lanark boxing club | Lanark | ML11 | - | Near ML11; Nearby |
| 8 | Lunar Gymnastics Club | Lanark | ML11 | - | Near ML11; Nearby |
| 9 | New Lanark Health and Fitness Club | Lanark | ML11 | - | Near ML11; Nearby |
| 10 | Nirvana Yoga | Lanark | ML11 | - | Near ML11; Nearby |

#### "G1"
recognised_postcode=true, candidates returned by `gyms_search`=23

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Asgard MMA And Fitness Studio | Glasgow | G1 | - | Near G1; Nearby |
| 2 | Athlete Focused | Glasgow | G1 | - | Near G1; Nearby |
| 3 | Battlefield Gym | Glasgow | G1 | - | Near G1; Nearby |
| 4 | Cam Cooney Meditation | Glasgow | G1 | - | Near G1; Nearby |
| 5 | CaveFit Glasgow | Glasgow | G1 | - | Near G1; Nearby |
| 6 | Central Strength Gym | Glasgow | G1 | - | Near G1; Nearby |
| 7 | Centre for Sport and Recreation | Glasgow | G1 | - | Near G1; Nearby |
| 8 | CJR Physique and Fitness | Glasgow | G1 | - | Near G1; Nearby |
| 9 | Glasgow Kickboxing | Glasgow | G1 | - | Near G1; Nearby |
| 10 | Hearcare | Glasgow | G1 | - | Near G1; Nearby |

#### "Glasgow"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | 3d Health and Fitness Glasgow | Glasgow | G2 | - | In Glasgow; Nearby |
| 2 | Aiki Shuren Dojo Aikido Glasgow | Glasgow | G4 | - | In Glasgow; Nearby |
| 3 | Anytime Fitness Glasgow | Glasgow | G76 | - | In Glasgow; Nearby |
| 4 | Anytime Fitness Glasgow | Glasgow | G11 | - | In Glasgow; Nearby |
| 5 | Anytime Fitness Glasgow | Glasgow | G64 | - | In Glasgow; Nearby |
| 6 | Ashtanga Yoga Glasgow | Glasgow | G3 | - | In Glasgow; Nearby |
| 7 | A.B Acro | Glasgow | G53 | - | In Glasgow; Nearby |
| 8 | A.B Acro Newton | Glasgow | G72 | - | In Glasgow; Nearby |
| 9 | Average Joe's Strength and Conditioning | Glasgow | G75 | - | In Glasgow; Nearby |
| 10 | 1 to One Health & Lifestyle Management | Glasgow | G3 | - | In Glasgow; Nearby |

#### "glasgow crossfit"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | CrossFit Glasgow | Glasgow | G5 | - | Matches CrossFit; In Glasgow; Nearby |
| 2 | Base Fitness & CrossFit | Glasgow | G74 | - | Matches CrossFit; In Glasgow; Nearby |
| 3 | CrossFit Astraea | Glasgow | G40 | - | Matches CrossFit; In Glasgow; Nearby |
| 4 | Crossfit Kirkintilloch | Glasgow | G66 | - | Matches CrossFit; In Glasgow; Nearby |
| 5 | CrossFit MTN | Glasgow | G45 | - | Matches CrossFit; In Glasgow; Nearby |
| 6 | C W 1 Crossfit | Crewe | CW1 | - | Matches CrossFit; Nearby |
| 7 | 11.24 Unity CrossFit | Edinburgh | EH6 | - | Matches CrossFit; Nearby |
| 8 | 179 CrossFit | Swansea | SA5 | - | Matches CrossFit; Nearby |
| 9 | 3 Bros CrossFit | Thetford | IP24 | - | Matches CrossFit; Nearby |
| 10 | Aeternum CrossFit | Lochgelly | KY5 | - | Matches CrossFit; Nearby |

#### "Ravenscraig"
recognised_postcode=false, candidates returned by `gyms_search`=3

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Ravenscraig Regional Sport Centre | Motherwell | ML1 | - | Nearby |
| 2 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | - | Nearby |
| 3 | Ravenscraig Sports Centre | Greenock | PA16 | - | Nearby |

#### "Volt"
recognised_postcode=false, candidates returned by `gyms_search`=4

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Volt Fitness | Rochdale | OL11 | - | Nearby |
| 2 | Volt Gym | Burscough | L40 | - | Nearby |
| 3 | VOLT Studio Fitness | Penrith | CA11 | - | Nearby |
| 4 | Voltz Fitness | Rochdale | OL11 | - | Nearby |

#### "volt burscough"
recognised_postcode=false, candidates returned by `gyms_search`=7

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Volt Gym | Burscough | L40 | - | In Burscough; Nearby |
| 2 | Burscough Family Karate | Ormskirk | WA11 | - | Nearby |
| 3 | Burscough Sports | Ormskirk | L40 | - | Nearby |
| 4 | Burscough Wellbeing & Leisure Hub | Ormskirk | L40 | - | Nearby |
| 5 | Chang Muay Thai Burscough | Ormskirk | L40 | - | Nearby |
| 6 | Volt Fitness | Rochdale | OL11 | - | Nearby |
| 7 | VOLT Studio Fitness | Penrith | CA11 | - | Nearby |

#### "the gym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | The Gym Van | Thetford | IP24 | - | Matches The Gym Group; Nearby |
| 2 | At The Gym | Bristol | BS48 | - | Matches The Gym Group; Nearby |
| 3 | MyPT The Gym | Croydon | CR0 | - | Matches The Gym Group; Nearby |
| 4 | S.C fitness The Gym | Thornhill | DG3 | - | Matches The Gym Group; Nearby |
| 5 | The GYM - Brian Goddard - Atherton | Manchester | M46 | - | Matches The Gym Group; Nearby |
| 6 | The Gym - Cleveleys | Thornton Cleveleys | FY5 | - | Matches The Gym Group; Nearby |
| 7 | The Gym - Metrodome | Barnsley | S70 | - | Matches The Gym Group; Nearby |
| 8 | The Gym @ The Park Inn | Nottingham | NG3 | - | Matches The Gym Group; Nearby |
| 9 | The Gym & Club at County Hall | London | SE1 | - | Matches The Gym Group; Nearby |
| 10 | The Gym 24/7 | Birmingham | B12 | - | Matches The Gym Group; Nearby |

#### "the gym group motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | The Gym Group Aberystwyth | Aberystwyth | SY23 | - | Matches The Gym Group; Nearby |
| 2 | The Gym Group Accrington | Accrington | BB5 | - | Matches The Gym Group; Nearby |
| 3 | The Gym Group Altrincham | Altrincham, Greater Manchester | WA14 | - | Matches The Gym Group; Nearby |
| 4 | The Gym Van | Thetford | IP24 | - | Matches The Gym Group; Nearby |
| 5 | At The Gym | Bristol | BS48 | - | Matches The Gym Group; Nearby |
| 6 | MyPT The Gym | Croydon | CR0 | - | Matches The Gym Group; Nearby |
| 7 | S.C fitness The Gym | Thornhill | DG3 | - | Matches The Gym Group; Nearby |
| 8 | The GYM - Brian Goddard - Atherton | Manchester | M46 | - | Matches The Gym Group; Nearby |
| 9 | The Gym - Cleveleys | Thornton Cleveleys | FY5 | - | Matches The Gym Group; Nearby |
| 10 | The Gym - Metrodome | Barnsley | S70 | - | Matches The Gym Group; Nearby |

#### "anytime"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Anytime Fitness - Coming Soon | Greater London | E16 | - | Matches Anytime Fitness; Nearby |
| 2 | Anytime Fitness Addlestone | Addlestone | KT15 | - | Matches Anytime Fitness; Nearby |
| 3 | Anytime Fitness Aldershot | Aldershot | GU11 | - | Matches Anytime Fitness; Nearby |
| 4 | Anytime Fitness Aldgate | London | E1 | - | Matches Anytime Fitness; Nearby |
| 5 | Anytime Fitness Aldridge | Walsall | WS9 | - | Matches Anytime Fitness; Nearby |
| 6 | Anytime Fitness Alperton | Wembley | HA0 | - | Matches Anytime Fitness; Nearby |
| 7 | Anytime Fitness Altrincham | Altrincham | WA14 | - | Matches Anytime Fitness; Nearby |
| 8 | Anytime Fitness Angel, Islington | London | EC1V | - | Matches Anytime Fitness; Nearby |
| 9 | Anytime Fitness Ashford | Ashford | TN24 | - | Matches Anytime Fitness; Nearby |
| 10 | Anytime Fitness Ashton under Lyne | Ashton under Lyne | OL6 | - | Matches Anytime Fitness; Nearby |

#### "david lloyd hamilton"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Blaze Studio Birmingham by David Lloyd Clubs | Birmingham | B3 | - | Matches David Lloyd; Nearby |
| 2 | David Lloyd Aberdeen | Aberdeen | AB10 | - | Matches David Lloyd; Nearby |
| 3 | David Lloyd Acton Park | London | W3 | - | Matches David Lloyd; Nearby |
| 4 | David Lloyd Ashford | - | TN24 | - | Matches David Lloyd; Nearby |
| 5 | David Lloyd Basildon | Basildon | SS14 | - | Matches David Lloyd; Nearby |
| 6 | David Lloyd Beaconsfield | High Wycombe | HP10 | - | Matches David Lloyd; Nearby |
| 7 | David Lloyd Beckenham | Beckenham | BR3 | - | Matches David Lloyd; Nearby |
| 8 | David Lloyd Belfast | Dundonald | BT16 | - | Matches David Lloyd; Nearby |
| 9 | David Lloyd Bicester | Bicester | OX25 | - | Matches David Lloyd; Nearby |
| 10 | David Lloyd Birmingham | Birmingham | B44 | - | Matches David Lloyd; Nearby |

#### "nuffield"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Bromford Sports Centre Nuffield Health | Wickford | SS12 | - | Matches Nuffield Health; Nearby |
| 2 | Nuffield Health Abridge | Abridge | RM4 | - | Matches Nuffield Health; Nearby |
| 3 | Nuffield Health Aylesbury Fitness & Wellbeing Gym Aylesbury | Aylesbury | HP19 | - | Matches Nuffield Health; Nearby |
| 4 | Nuffield Health Baltimore Wharf | London | E14 | - | Matches Nuffield Health; Nearby |
| 5 | Nuffield Health Barrow-in-Furness | Barrow-in-Furness | LA14 | - | Matches Nuffield Health; Nearby |
| 6 | Nuffield Health Battersea Fitness & Wellbeing Gym Battersea | London | SW11 | - | Matches Nuffield Health; Nearby |
| 7 | Nuffield Health Birmingham Central | Birmingham | B16 | - | Matches Nuffield Health; Nearby |
| 8 | Nuffield Health Birmingham Rubery | Birmingham | B45 | - | Matches Nuffield Health; Nearby |
| 9 | Nuffield Health Bishop's Stortford Fitness & Wellbeing | Bishop&#x27;s Stortford | CM23 | - | Matches Nuffield Health; Nearby |
| 10 | Nuffield Health Bloomsbury Fitness & Wellbeing Gym Bloomsbury | London | WC1N | - | Matches Nuffield Health; Nearby |

#### "pure gym mothewell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Aberdare | Aberdare | CF44 | - | Matches PureGym; Nearby |
| 2 | PureGym Aberdeen Kittybrewster | Aberdeen | AB24 | - | Matches PureGym; Nearby |
| 3 | PureGym Aberdeen Rubislaw | Aberdeen | AB15 | - | Matches PureGym; Nearby |
| 4 | PureGym Aberdeen Shiprow | Aberdeen | AB11 | - | Matches PureGym; Nearby |
| 5 | PureGym Aberdeen Wellington Circle | Aberdeen | AB12 | - | Matches PureGym; Nearby |
| 6 | PureGym Aintree | Liverpool | L9 | - | Matches PureGym; Nearby |
| 7 | PureGym Airdrie | Airdrie | ML6 | - | Matches PureGym; Nearby |
| 8 | PureGym Aldershot Westgate Retail Park | Aldershot | GU11 | - | Matches PureGym; Nearby |
| 9 | PureGym Alfreton | Alfreton | DE55 | - | Matches PureGym; Nearby |
| 10 | PureGym Alloa | Alloa | FK10 | - | Matches PureGym; Nearby |

#### "puregm"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._

#### "Puregym Motherwel"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | - | Matches PureGym; Nearby |
| 2 | PureGym Aberdare | Aberdare | CF44 | - | Matches PureGym; Nearby |
| 3 | PureGym Aberdeen Kittybrewster | Aberdeen | AB24 | - | Matches PureGym; Nearby |
| 4 | PureGym Aberdeen Rubislaw | Aberdeen | AB15 | - | Matches PureGym; Nearby |
| 5 | PureGym Aberdeen Shiprow | Aberdeen | AB11 | - | Matches PureGym; Nearby |
| 6 | PureGym Aberdeen Wellington Circle | Aberdeen | AB12 | - | Matches PureGym; Nearby |
| 7 | PureGym Aintree | Liverpool | L9 | - | Matches PureGym; Nearby |
| 8 | PureGym Airdrie | Airdrie | ML6 | - | Matches PureGym; Nearby |
| 9 | PureGym Aldershot Westgate Retail Park | Aldershot | GU11 | - | Matches PureGym; Nearby |
| 10 | PureGym Alfreton | Alfreton | DE55 | - | Matches PureGym; Nearby |

#### "strength gym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | S.C fitness The Gym | Thornhill | DG3 | - | Nearby |
| 2 | At The Gym | Bristol | BS48 | - | Nearby |
| 3 | Green Gym Group | Brighton | BN2 | - | Nearby |
| 4 | Gymbox Cannon Street | London | EC3V | - | Nearby |
| 5 | Gymbox Chelmsford | Chelmsford | CM2 | - | Nearby |
| 6 | Gymbox Ealing | London | W5 | - | Nearby |
| 7 | Gymbox Finsbury Park | London | N4 | - | Nearby |
| 8 | Gymbox Hayes Health | London | SE1 | - | Nearby |
| 9 | Gymbox London | London | EC1N | - | Nearby |
| 10 | Gymbox Old Street | London | EC1V | - | Nearby |

#### "powerlifting"
recognised_postcode=false, candidates returned by `gyms_search`=4

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Big Al’s Powerlifting & Coaching | Consett | DH8 | - | Nearby |
| 2 | Iron Raven Powerlifting & Strength Gym | Tonbridge | TN9 | - | Nearby |
| 3 | SS Powerlifting | Camelford | PL32 | - | Nearby |
| 4 | West Midlands Powerlifting Club | Brierley Hill | DY5 | - | Nearby |

#### "crossfit"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | 11.24 Unity CrossFit | Edinburgh | EH6 | - | Matches CrossFit; Nearby |
| 2 | 179 CrossFit | Swansea | SA5 | - | Matches CrossFit; Nearby |
| 3 | 3 Bros CrossFit | Thetford | IP24 | - | Matches CrossFit; Nearby |
| 4 | Aeternum CrossFit | Lochgelly | KY5 | - | Matches CrossFit; Nearby |
| 5 | Afs CrossFit | Andover | SP10 | - | Matches CrossFit; Nearby |
| 6 | Aphobos CrossFit | Bromley | BR2 | - | Matches CrossFit; Nearby |
| 7 | Atlantic Way Crossfit | Barry | CF63 | - | Matches CrossFit; Nearby |
| 8 | Avenge Crossfit | Newtownabbey | BT36 | - | Matches CrossFit; Nearby |
| 9 | BALDR CrossFit | London | SE8 | - | Matches CrossFit; Nearby |
| 10 | Base Fitness & CrossFit | Glasgow | G74 | - | Matches CrossFit; Nearby |

#### "leisure centre motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 2 | PureGym Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 3 | Ravenscraig Regional Sport Centre | Motherwell | ML1 | - | In Motherwell; Nearby |
| 4 | Rivals Gym Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 5 | XS Taekwondo Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 6 | Yogamind - Motherwell | Motherwell | ML1 | - | In Motherwell; Nearby |
| 7 | Suzanne O'Reilly Fitness | Motherwell | ML1 | - | In Motherwell; Nearby |
| 8 | The Boathouse Fitness Club | Motherwell | ML1 | - | In Motherwell; Nearby |
| 9 | ACT Scotland | Motherwell | ML1 | - | In Motherwell; Nearby |
| 10 | Advance Bodies | Motherwell | ML1 | - | In Motherwell; Nearby |

#### "Wishaw"
recognised_postcode=false, candidates returned by `gyms_search`=27

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | CWS Fitness - Wishaw | Wishaw | ML2 | - | In Wishaw; Nearby |
| 2 | New Age Fitness Wishaw | Wishaw | ML2 | - | In Wishaw; Nearby |
| 3 | Wishaw | Wishaw | ML2 | - | In Wishaw; Nearby |
| 4 | Wishaw Leisure Centre | Wishaw | ML2 | - | In Wishaw; Nearby |
| 5 | Wishaw Wycombe Wanderers Girls Football Academy | Wishaw | ML2 | - | In Wishaw; Nearby |
| 6 | A M Fitness Academy | Wishaw | ML2 | - | In Wishaw; Nearby |
| 7 | 360 Performance Academy | Wishaw | ML2 | - | In Wishaw; Nearby |
| 8 | Bezerkerfit | Wishaw | ML2 | - | In Wishaw; Nearby |
| 9 | Cambusnethan Boxing Club | Wishaw | ML2 | - | In Wishaw; Nearby |
| 10 | Clubbercise Coltness with Claire | Wishaw | ML2 | - | In Wishaw; Nearby |

#### "Hamilton"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Esporta Hamilton | Hamilton | ML3 | - | In Hamilton; Nearby |
| 2 | Hamilton Boxing Club | Hamilton | ML3 | - | In Hamilton; Nearby |
| 3 | Hamilton Gymnastics Club | Hamilton | G72 | - | In Hamilton; Nearby |
| 4 | Hamilton Gymnastics Club | Hamilton | ML3 | - | In Hamilton; Nearby |
| 5 | Hamilton Judo Club | Hamilton | ML3 | - | In Hamilton; Nearby |
| 6 | Hamilton Pilates Studio | Hamilton | ML3 | - | In Hamilton; Nearby |
| 7 | McGowans Blackbelt Academy Hamilton | Hamilton | ML3 | - | In Hamilton; Nearby |
| 8 | New Age Fitness Hamilton | Hamilton | ML3 | - | In Hamilton; Nearby |
| 9 | Shotokan Karate - Hamilton | Hamilton | ML3 | - | In Hamilton; Nearby |
| 10 | The Gym Group Hamilton | Hamilton, Hamilton | ML3 | - | In Hamilton, Hamilton; Nearby |

#### "Bellshill"
recognised_postcode=false, candidates returned by `gyms_search`=16

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Bellshill Martial Arts Academy | Bellshill | ML4 | - | In Bellshill; Nearby |
| 2 | Bellshill TAGB Tae Kwon-Do | Bellshill | ML4 | - | In Bellshill; Nearby |
| 3 | Bellshill Wado Kai | Bellshill | ML4 | - | In Bellshill; Nearby |
| 4 | XS Taekwon-do Bellshill | Bellshill | ML4 | - | In Bellshill; Nearby |
| 5 | XS Taekwondo Bellshill East | Bellshill | ML4 | - | In Bellshill; Nearby |
| 6 | CGDC- Chloe's Gymnastics & Dance Company | Bellshill | ML4 | - | In Bellshill; Nearby |
| 7 | Fame Xtreme Dance and Cheer | Bellshill | ML4 | - | In Bellshill; Nearby |
| 8 | Fighting Scots Gym | Bellshill | ML4 | - | In Bellshill; Nearby |
| 9 | Kixudo Kickboxing HQ | Bellshill | ML4 | - | In Bellshill; Nearby |
| 10 | LivingWell | Bellshill | ML4 | - | In Bellshill; Nearby |

#### "Airdrie"
recognised_postcode=false, candidates returned by `gyms_search`=20

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Crossfit Airdrie | Airdrie | ML6 | - | In Airdrie; Nearby |
| 2 | PureGym Airdrie | Airdrie | ML6 | - | In Airdrie; Nearby |
| 3 | Rivals Gym Airdrie | Airdrie | ML6 | - | In Airdrie; Nearby |
| 4 | Ultimate Fitness Airdrie | Airdrie | ML6 | - | In Airdrie; Nearby |
| 5 | D.R-fitness | Airdrie | ML6 | - | In Airdrie; Nearby |
| 6 | Blair Inglis Personal Training and Sports Massage | Airdrie | ML6 | - | In Airdrie; Nearby |
| 7 | Cobra Martial Arts | Airdrie | ML6 | - | In Airdrie; Nearby |
| 8 | Cobra Martial Arts | Airdrie | ML6 | - | In Airdrie; Nearby |
| 9 | Go Bananas Softplay | Airdrie | ML6 | - | In Airdrie; Nearby |
| 10 | Hut Yoga | Airdrie | ML6 | - | In Airdrie; Nearby |

#### "EH1"
recognised_postcode=true, candidates returned by `gyms_search`=23

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Bai He Alba Kung Fu | Edinburgh | EH1 | - | Near EH1; Nearby |
| 2 | Blue Morpho Edinburgh | Edinburgh | EH1 | - | Near EH1; Nearby |
| 3 | East Side Yoga | Edinburgh | EH1 | - | Near EH1; Nearby |
| 4 | Escape Health Clubs | Edinburgh | EH1 | - | Near EH1; Nearby |
| 5 | Evolve Health & Fitness | Edinburgh | EH1 | - | Near EH1; Nearby |
| 6 | Factory Gyms | Edinburgh | EH1 | - | Near EH1; Nearby |
| 7 | Gareth's Zumba Classes | Edinburgh | EH1 | - | Near EH1; Nearby |
| 8 | Gathering Essence | Edinburgh | EH1 | - | Near EH1; Nearby |
| 9 | Gleneagles Of Scotland | Edinburgh | EH1 | - | Near EH1; Nearby |
| 10 | Holmes Place Health Clubs | Edinburgh | EH1 | - | Near EH1; Nearby |

#### "Belfast"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Abhyasa Yoga Belfast | Belfast | BT9 | - | In Belfast; Nearby |
| 2 | Acroyoga Belfast | Belfast | BT9 | - | In Belfast; Nearby |
| 3 | Anytime Fitness Belfast | Belfast | BT9 | - | In Belfast; Nearby |
| 4 | Atlas Gym Belfast | Belfast | BT13 | - | In Belfast; Nearby |
| 5 | Barre & Beyond Belfast | Belfast | BT1 | - | In Belfast; Nearby |
| 6 | Belfast Aikido | Belfast | BT6 | - | In Belfast; Nearby |
| 7 | Belfast Baseball Facility | Belfast | BT8 | - | In Belfast; Nearby |
| 8 | Belfast Boat and Tennis Club | Belfast | BT9 | - | In Belfast; Nearby |
| 9 | Belfast Boxing Fitness | Belfast | BT5 | - | In Belfast; Nearby |
| 10 | Belfast Indoor Tennis Arena | Belfast | BT6 | - | In Belfast; Nearby |

#### "Cardiff"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | 30+ Bootcamp Cardiff | Cardiff | CF11 | - | In Cardiff; Nearby |
| 2 | Accomplish Fitness Studio Cardiff | Cardiff | CF11 | - | In Cardiff; Nearby |
| 3 | Air Arena Cardiff | Cardiff | CF10 | - | In Cardiff; Nearby |
| 4 | Bannatyne Cardiff | Cardiff | CF14 | - | In Cardiff; Nearby |
| 5 | BarreConcept Cardiff | Cardiff | CF14 | - | In Cardiff; Nearby |
| 6 | Cardiff | Cardiff | CF24 | - | In Cardiff; Nearby |
| 7 | Cardiff | Cardiff | CF23 | - | In Cardiff; Nearby |
| 8 | Cardiff Academy of Muay Thai and Martial Arts | Cardiff | CF24 | - | In Cardiff; Nearby |
| 9 | Cardiff Bay Leisure Centre | Cardiff | CF95 | - | In Cardiff; Nearby |
| 10 | Cardiff Central Kung Fu | Cardiff | CF11 | - | In Cardiff; Nearby |

#### "Aberdeen"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | 5ives Football Aberdeen | Aberdeen | AB24 | - | In Aberdeen; Nearby |
| 2 | A.M personal training and fitness | Aberdeen | AB25 | - | In Aberdeen; Nearby |
| 3 | Aberdeen | Aberdeen | AB24 | - | In Aberdeen; Nearby |
| 4 | Aberdeen | Aberdeen | AB10 | - | In Aberdeen; Nearby |
| 5 | Aberdeen | Aberdeen | AB22 | - | In Aberdeen; Nearby |
| 6 | Aberdeen | Aberdeen | AB16 | - | In Aberdeen; Nearby |
| 7 | Aberdeen Aikido | Aberdeen | AB10 | - | In Aberdeen; Nearby |
| 8 | Aberdeen Boxing Club | Aberdeen | AB16 | - | In Aberdeen; Nearby |
| 9 | Aberdeen City Aikido Club | Aberdeen | AB25 | - | In Aberdeen; Nearby |
| 10 | Aberdeen Fitness and Combat Centre | Aberdeen | AB25 | - | In Aberdeen; Nearby |

#### "Truro"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Anytime Fitness Truro | Truro | TR1 | - | In Truro; Nearby |
| 2 | Better Truro | Truro | TR1 | - | In Truro; Nearby |
| 3 | CrossFit Truro Cornwall | Truro | TR4 | - | In Truro; Nearby |
| 4 | Gym in Truro - Snap Fitness UK | Truro | TR1 | - | In Truro; Nearby |
| 5 | Hotpod Yoga Truro | Truro | TR1 | - | In Truro; Nearby |
| 6 | Pilates Hub Truro | Truro | TR1 | - | In Truro; Nearby |
| 7 | Sunny Corner Malpas Truro | Truro | TR1 | - | In Truro; Nearby |
| 8 | Absolutely Flabulos / AbFlab Beauty | Truro | TR1 | - | In Truro; Nearby |
| 9 | Breathe HQ | Truro | TR1 | - | In Truro; Nearby |
| 10 | Byrne Black Belt Academy Wreckers | Truro | - | - | In Truro; Nearby |

#### "Lerwick"
recognised_postcode=false, candidates returned by `gyms_search`=2

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Shetland Budokai | Lerwick | ZE1 | - | In Lerwick; Nearby |
| 2 | SL Fitness | Lerwick | ZE1 | - | In Lerwick; Nearby |

### With Motherwell centre coordinate (55.789, -3.991)

#### "PureGym Motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Matches PureGym; In Motherwell; Nearby |
| 2 | PureGym Airdrie | Airdrie | ML6 | 5.3 mi | Matches PureGym; Nearby |
| 3 | PureGym East Kilbride | East Kilbride | G74 | 7.5 mi | Matches PureGym; Nearby |
| 4 | PureGym Glasgow Rutherglen | Glasgow | G73 | 8.6 mi | Matches PureGym; Nearby |
| 5 | PureGym Glasgow Robroyston | Glasgow | G33 | 10.4 mi | Matches PureGym; Nearby |
| 6 | PureGym Glasgow Shawlands | Glasgow | G41 | 11.7 mi | Matches PureGym; Nearby |
| 7 | PureGym Glasgow Bath Street | Glasgow | G2 | 11.7 mi | Matches PureGym; Nearby |
| 8 | PureGym Glasgow Giffnock | Glasgow | G46 | 11.8 mi | Matches PureGym; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Matches PureGym; Nearby |
| 10 | PureGym Cumbernauld | Cumbernauld | G68 | 12.9 mi | Matches PureGym |

#### "puregym"
recognised_postcode=false, candidates returned by `gyms_search`=20

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Matches PureGym; Nearby |
| 2 | PureGym Airdrie | Airdrie | ML6 | 5.3 mi | Matches PureGym; Nearby |
| 3 | PureGym East Kilbride | East Kilbride | G74 | 7.5 mi | Matches PureGym; Nearby |
| 4 | PureGym Glasgow Rutherglen | Glasgow | G73 | 8.6 mi | Matches PureGym; Nearby |
| 5 | PureGym Glasgow Robroyston | Glasgow | G33 | 10.4 mi | Matches PureGym; Nearby |
| 6 | PureGym Glasgow Shawlands | Glasgow | G41 | 11.7 mi | Matches PureGym; Nearby |
| 7 | PureGym Glasgow Bath Street | Glasgow | G2 | 11.7 mi | Matches PureGym; Nearby |
| 8 | PureGym Glasgow Giffnock | Glasgow | G46 | 11.8 mi | Matches PureGym; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Matches PureGym; Nearby |
| 10 | PureGym Cumbernauld | Cumbernauld | G68 | 12.9 mi | Matches PureGym |

#### "pure gym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Matches PureGym; Nearby |
| 2 | PureGym Airdrie | Airdrie | ML6 | 5.3 mi | Matches PureGym; Nearby |
| 3 | PureGym East Kilbride | East Kilbride | G74 | 7.5 mi | Matches PureGym; Nearby |
| 4 | PureGym Glasgow Rutherglen | Glasgow | G73 | 8.6 mi | Matches PureGym; Nearby |
| 5 | PureGym Glasgow Robroyston | Glasgow | G33 | 10.4 mi | Matches PureGym; Nearby |
| 6 | PureGym Glasgow Shawlands | Glasgow | G41 | 11.7 mi | Matches PureGym; Nearby |
| 7 | PureGym Glasgow Bath Street | Glasgow | G2 | 11.7 mi | Matches PureGym; Nearby |
| 8 | PureGym Glasgow Giffnock | Glasgow | G46 | 11.8 mi | Matches PureGym; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Matches PureGym; Nearby |
| 10 | PureGym Cumbernauld | Cumbernauld | G68 | 12.9 mi | Matches PureGym |

#### "PureGym"
recognised_postcode=false, candidates returned by `gyms_search`=20

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Matches PureGym; Nearby |
| 2 | PureGym Airdrie | Airdrie | ML6 | 5.3 mi | Matches PureGym; Nearby |
| 3 | PureGym East Kilbride | East Kilbride | G74 | 7.5 mi | Matches PureGym; Nearby |
| 4 | PureGym Glasgow Rutherglen | Glasgow | G73 | 8.6 mi | Matches PureGym; Nearby |
| 5 | PureGym Glasgow Robroyston | Glasgow | G33 | 10.4 mi | Matches PureGym; Nearby |
| 6 | PureGym Glasgow Shawlands | Glasgow | G41 | 11.7 mi | Matches PureGym; Nearby |
| 7 | PureGym Glasgow Bath Street | Glasgow | G2 | 11.7 mi | Matches PureGym; Nearby |
| 8 | PureGym Glasgow Giffnock | Glasgow | G46 | 11.8 mi | Matches PureGym; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Matches PureGym; Nearby |
| 10 | PureGym Cumbernauld | Cumbernauld | G68 | 12.9 mi | Matches PureGym |

#### "JD Motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=32

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | JD Fitness | Livingston | EH27 | 22.7 mi | Matches JD Gyms |
| 2 | Xercise4Less Glasgow Gym | Glasgow | G2 | 11.7 mi | Matches JD Gyms; Nearby |
| 3 | Xercise4Less Falkirk Gym | Falkirk | FK1 | 16.6 mi | Matches JD Gyms |
| 4 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | In Motherwell; Nearby |
| 5 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi | In Motherwell; Nearby |
| 6 | Yogamind - Motherwell | Motherwell | ML1 | 0.6 mi | In Motherwell; Nearby |
| 7 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | 1.4 mi | In Motherwell; Nearby |
| 8 | XS Taekwondo Motherwell | Motherwell | ML1 | 1.6 mi | In Motherwell; Nearby |
| 9 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi | In Motherwell; Nearby |
| 10 | The Boathouse Fitness Club | Motherwell | ML1 | 1.3 mi | In Motherwell; Nearby |

#### "jd gyms"
recognised_postcode=false, candidates returned by `gyms_search`=7

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Xercise4Less Glasgow Gym | Glasgow | G2 | 11.7 mi | Matches JD Gyms; Nearby |
| 2 | Xercise4Less Falkirk Gym | Falkirk | FK1 | 16.6 mi | Matches JD Gyms |
| 3 | JD Fitness | Livingston | EH27 | 22.7 mi | Matches JD Gyms |
| 4 | Pinnacle Gyms | Hamilton | ML3 | 2.4 mi | Nearby |
| 5 | Everlast Gyms Glasgow | Glasgow | G74 | 7.4 mi | Nearby |
| 6 | Everlast Gyms Glasgow | Glasgow | G34 | 7.7 mi | Nearby |
| 7 | Village Gym Glasgow | Glasgow | G51 | 12.5 mi | - |

#### "motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=29

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | In Motherwell; Nearby |
| 2 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi | In Motherwell; Nearby |
| 3 | Yogamind - Motherwell | Motherwell | ML1 | 0.6 mi | In Motherwell; Nearby |
| 4 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | 1.4 mi | In Motherwell; Nearby |
| 5 | XS Taekwondo Motherwell | Motherwell | ML1 | 1.6 mi | In Motherwell; Nearby |
| 6 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi | In Motherwell; Nearby |
| 7 | The Boathouse Fitness Club | Motherwell | ML1 | 1.3 mi | In Motherwell; Nearby |
| 8 | Quest Fitness | Motherwell | ML1 | 0.2 mi | In Motherwell; Nearby |
| 9 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi | In Motherwell; Nearby |
| 10 | Ferri Fit | Motherwell | ML1 | 0.3 mi | In Motherwell; Nearby |

#### "Motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=29

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | In Motherwell; Nearby |
| 2 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi | In Motherwell; Nearby |
| 3 | Yogamind - Motherwell | Motherwell | ML1 | 0.6 mi | In Motherwell; Nearby |
| 4 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | 1.4 mi | In Motherwell; Nearby |
| 5 | XS Taekwondo Motherwell | Motherwell | ML1 | 1.6 mi | In Motherwell; Nearby |
| 6 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi | In Motherwell; Nearby |
| 7 | The Boathouse Fitness Club | Motherwell | ML1 | 1.3 mi | In Motherwell; Nearby |
| 8 | Quest Fitness | Motherwell | ML1 | 0.2 mi | In Motherwell; Nearby |
| 9 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi | In Motherwell; Nearby |
| 10 | Ferri Fit | Motherwell | ML1 | 0.3 mi | In Motherwell; Nearby |

#### "ML1"
recognised_postcode=true, candidates returned by `gyms_search`=33

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Near ML1; Nearby |
| 2 | Quest Fitness | Motherwell | ML1 | 0.2 mi | Near ML1; Nearby |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi | Near ML1; Nearby |
| 4 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi | Near ML1; Nearby |
| 5 | Ferri Fit | Motherwell | ML1 | 0.3 mi | Near ML1; Nearby |
| 6 | Perfect Balance | Motherwell | ML1 | 0.3 mi | Near ML1; Nearby |
| 7 | Forgewood boxing club | Motherwell | ML1 | 0.3 mi | Near ML1; Nearby |
| 8 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi | Near ML1; Nearby |
| 9 | Gillian Stevenson Boxercise | Motherwell | ML1 | 0.4 mi | Near ML1; Nearby |
| 10 | Evolve Fitness Lab Limited | Motherwell | ML1 | 0.5 mi | Near ML1; Nearby |

#### "ML1 1"
recognised_postcode=true, candidates returned by `gyms_search`=18

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Platinum Strength Lanark | Carluke | ML11 | 7 mi | Near ML11; Nearby |
| 2 | XS Taekwondo | Lanark | ML11 | 8.6 mi | Near ML11; Nearby |
| 3 | SuperStrength | Glasgow | ML11 | 9.8 mi | Near ML11; Nearby |
| 4 | LA's Spin Fit | Lanark | ML11 | 10.9 mi | Near ML11; Nearby |
| 5 | Outdoor Cleghorn | Lanark | ML11 | 11.2 mi | Near ML11; Nearby |
| 6 | Nirvana Yoga | Lanark | ML11 | 11.4 mi | Near ML11; Nearby |
| 7 | Lanark boxing club | Lanark | ML11 | 11.5 mi | Near ML11; Nearby |
| 8 | Curtis Bros Fitness | Lanark | ML11 | 11.5 mi | Near ML11; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Near ML11; Nearby |
| 10 | New Lanark Health and Fitness Club | Lanark | ML11 | 11.9 mi | Near ML11; Nearby |

#### "ML11"
recognised_postcode=true, candidates returned by `gyms_search`=18

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Platinum Strength Lanark | Carluke | ML11 | 7 mi | Near ML11; Nearby |
| 2 | XS Taekwondo | Lanark | ML11 | 8.6 mi | Near ML11; Nearby |
| 3 | SuperStrength | Glasgow | ML11 | 9.8 mi | Near ML11; Nearby |
| 4 | LA's Spin Fit | Lanark | ML11 | 10.9 mi | Near ML11; Nearby |
| 5 | Outdoor Cleghorn | Lanark | ML11 | 11.2 mi | Near ML11; Nearby |
| 6 | Nirvana Yoga | Lanark | ML11 | 11.4 mi | Near ML11; Nearby |
| 7 | Lanark boxing club | Lanark | ML11 | 11.5 mi | Near ML11; Nearby |
| 8 | Curtis Bros Fitness | Lanark | ML11 | 11.5 mi | Near ML11; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Near ML11; Nearby |
| 10 | New Lanark Health and Fitness Club | Lanark | ML11 | 11.9 mi | Near ML11; Nearby |

#### "G1"
recognised_postcode=true, candidates returned by `gyms_search`=23

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | West Boathouse | Glasgow | G1 | 10.7 mi | Near G1; Nearby |
| 2 | JKS Glasgow | Glasgow | G1 | 10.9 mi | Near G1; Nearby |
| 3 | Smart Golf | Glasgow | G1 | 10.9 mi | Near G1; Nearby |
| 4 | Young Scot and Kidz Card | Glasgow | G1 | 10.9 mi | Near G1; Nearby |
| 5 | Infinity Yoga | Glasgow | G1 | 10.9 mi | Near G1; Nearby |
| 6 | Athlete Focused | Glasgow | G1 | 10.9 mi | Near G1; Nearby |
| 7 | Zhagaram_StrathSociety | Glasgow | G1 | 11 mi | Near G1; Nearby |
| 8 | Cam Cooney Meditation | Glasgow | G1 | 11 mi | Near G1; Nearby |
| 9 | Hearcare | Glasgow | G1 | 11.1 mi | Near G1; Nearby |
| 10 | CJR Physique and Fitness | Glasgow | G1 | 11.1 mi | Near G1; Nearby |

#### "Glasgow"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Glasgow Celtic Football Club | Glasgow | G71 | 3.3 mi | In Glasgow; Nearby |
| 2 | Elite Fitness Uddingston | Glasgow | ML4 | 3.3 mi | In Glasgow; Nearby |
| 3 | Yogamrita.Yoga Studio Bellshill | Glasgow | ML4 | 3.3 mi | In Glasgow; Nearby |
| 4 | Tick Tock Martial Arts and Fitness | Glasgow | ML4 | 3.4 mi | In Glasgow; Nearby |
| 5 | Integrity martial arts | Glasgow | G71 | 3.5 mi | In Glasgow; Nearby |
| 6 | Evolve Gym | Glasgow | G72 | 3.6 mi | In Glasgow; Nearby |
| 7 | Rivals Jiu Jitsu | Glasgow | G72 | 3.6 mi | In Glasgow; Nearby |
| 8 | Owen Lennon Boxing Bootcamp | Glasgow | G71 | 3.6 mi | In Glasgow; Nearby |
| 9 | Yoga Rose | Glasgow | G72 | 3.7 mi | In Glasgow; Nearby |
| 10 | Ross Convery HiiT2FiT | Glasgow | G72 | 3.7 mi | In Glasgow; Nearby |

#### "glasgow crossfit"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Base Fitness & CrossFit | Glasgow | G74 | 6.8 mi | Matches CrossFit; In Glasgow; Nearby |
| 2 | CrossFit Glasgow | Glasgow | G5 | 11.4 mi | Matches CrossFit; In Glasgow; Nearby |
| 3 | CrossFit Astraea | Glasgow | G40 | 9.6 mi | Matches CrossFit; In Glasgow; Nearby |
| 4 | CrossFit MTN | Glasgow | G45 | 10.1 mi | Matches CrossFit; In Glasgow; Nearby |
| 5 | Crossfit Kirkintilloch | Glasgow | G66 | 12.5 mi | Matches CrossFit; In Glasgow |
| 6 | Win Fitness - CrossFit Hamilton | Hamilton | G72 | 2.2 mi | Matches CrossFit; Nearby |
| 7 | New Generation CrossFit | Wishaw | ML2 | 4.3 mi | Matches CrossFit; Nearby |
| 8 | Crossfit Airdrie | Airdrie | ML6 | 5 mi | Matches CrossFit; Nearby |
| 9 | CrossFit Clydeside | Paisley | PA3 | 15.5 mi | Matches CrossFit |
| 10 | Crossfit 1298 | Falkirk | FK2 | 17.2 mi | Matches CrossFit |

#### "Ravenscraig"
recognised_postcode=false, candidates returned by `gyms_search`=2

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | 1.4 mi | Nearby |
| 2 | Ravenscraig Regional Sport Centre | Motherwell | ML1 | 2 mi | Nearby |

#### "Volt"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._

#### "volt burscough"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._

#### "the gym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | The Gym Group Hamilton | Hamilton, Hamilton | ML3 | 1.6 mi | Matches The Gym Group; Nearby |
| 2 | The Gym Group Glasgow Forge | Parkhead, East Glasgow | G31 | 9.7 mi | Matches The Gym Group; Nearby |
| 3 | The Gym Group Glasgow South | Glasgow, Glasgow | G42 | 10.8 mi | Matches The Gym Group; Nearby |
| 4 | The Gym Group Glasgow Bothwell Street | Glasgow, Glasgow | G2 | 11.8 mi | Matches The Gym Group; Nearby |
| 5 | The Gym Group Glasgow Quay | Glasgow, Glasgow | G5 | 11.9 mi | Matches The Gym Group; Nearby |
| 6 | The Gym Group Glasgow West End | Glasgow | G12 | 13.1 mi | Matches The Gym Group |
| 7 | The Gym Group Glasgow Anniesland | Glasgow | G13 | 14.7 mi | Matches The Gym Group |
| 8 | The Gym Group Kilmarnock | Kilmarnock, Ayrshire | KA1 | 23.3 mi | Matches The Gym Group |
| 9 | The Gym Group Ayr | Ayr | KA8 | 31.9 mi | Matches The Gym Group |
| 10 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi | Nearby |

#### "the gym group motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | The Gym Group Hamilton | Hamilton, Hamilton | ML3 | 1.6 mi | Matches The Gym Group; Nearby |
| 2 | The Gym Group Glasgow Forge | Parkhead, East Glasgow | G31 | 9.7 mi | Matches The Gym Group; Nearby |
| 3 | The Gym Group Glasgow South | Glasgow, Glasgow | G42 | 10.8 mi | Matches The Gym Group; Nearby |
| 4 | The Gym Group Glasgow Bothwell Street | Glasgow, Glasgow | G2 | 11.8 mi | Matches The Gym Group; Nearby |
| 5 | The Gym Group Glasgow Quay | Glasgow, Glasgow | G5 | 11.9 mi | Matches The Gym Group; Nearby |
| 6 | The Gym Group Glasgow West End | Glasgow | G12 | 13.1 mi | Matches The Gym Group |
| 7 | The Gym Group Glasgow Anniesland | Glasgow | G13 | 14.7 mi | Matches The Gym Group |
| 8 | The Gym Group Kilmarnock | Kilmarnock, Ayrshire | KA1 | 23.3 mi | Matches The Gym Group |
| 9 | The Gym Group Ayr | Ayr | KA8 | 31.9 mi | Matches The Gym Group |
| 10 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi | In Motherwell; Nearby |

#### "anytime"
recognised_postcode=false, candidates returned by `gyms_search`=5

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Anytime Fitness Open Fitness East Kilbride | Glasgow | G74 | 7.1 mi | Matches Anytime Fitness; Nearby |
| 2 | Anytime Fitness Glasgow | Glasgow | G76 | 11.1 mi | Matches Anytime Fitness; Nearby |
| 3 | Anytime Fitness Glasgow | Glasgow | G64 | 12.4 mi | Matches Anytime Fitness; Nearby |
| 4 | Anytime Fitness Glasgow | Glasgow | G11 | 13.3 mi | Matches Anytime Fitness |
| 5 | Anytime Fitness Open Fitness Bathgate | Bathgate | EH48 | 15.4 mi | Matches Anytime Fitness |

#### "david lloyd hamilton"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | David Lloyd Clubs in Bristol | - | F5F | - | Matches David Lloyd; Nearby |
| 2 | David Lloyd Glasgow Rouken Glen | - | G46 | 12.3 mi | Matches David Lloyd; Nearby |
| 3 | David Lloyd Newton Mearns | Newton Mearns | G77 | 12.6 mi | Matches David Lloyd |
| 4 | David Lloyd Glasgow West End | Glasgow | G13 | 15 mi | Matches David Lloyd |
| 5 | David Lloyd Glasgow Renfrew | - | PA4 | 16.4 mi | Matches David Lloyd |
| 6 | Esporta Hamilton | Hamilton | ML3 | 1.8 mi | In Hamilton; Nearby |
| 7 | Win Fitness - CrossFit Hamilton | Hamilton | G72 | 2.2 mi | In Hamilton; Nearby |
| 8 | Hamilton Pilates Studio | Hamilton | ML3 | 2.3 mi | In Hamilton; Nearby |
| 9 | Hamilton Boxing Club | Hamilton | ML3 | 2.6 mi | In Hamilton; Nearby |
| 10 | Hamilton Judo Club | Hamilton | ML3 | 2.8 mi | In Hamilton; Nearby |

#### "nuffield"
recognised_postcode=false, candidates returned by `gyms_search`=4

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Nuffield Health East Kilbride | Glasgow | G75 | 7.1 mi | Matches Nuffield Health; Nearby |
| 2 | Nuffield Health Glasgow Giffnock | Glasgow | G46 | 11.4 mi | Matches Nuffield Health; Nearby |
| 3 | Nuffield Health Glasgow Central | Glasgow | G3 | 12.3 mi | Matches Nuffield Health; Nearby |
| 4 | Nuffield Health Milngavie Fitness & Wellbeing Gym Milngavie | Glasgow | G62 | 16.3 mi | Matches Nuffield Health |

#### "pure gym mothewell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Matches PureGym; Nearby |
| 2 | PureGym Airdrie | Airdrie | ML6 | 5.3 mi | Matches PureGym; Nearby |
| 3 | PureGym East Kilbride | East Kilbride | G74 | 7.5 mi | Matches PureGym; Nearby |
| 4 | PureGym Glasgow Rutherglen | Glasgow | G73 | 8.6 mi | Matches PureGym; Nearby |
| 5 | PureGym Glasgow Robroyston | Glasgow | G33 | 10.4 mi | Matches PureGym; Nearby |
| 6 | PureGym Glasgow Shawlands | Glasgow | G41 | 11.7 mi | Matches PureGym; Nearby |
| 7 | PureGym Glasgow Bath Street | Glasgow | G2 | 11.7 mi | Matches PureGym; Nearby |
| 8 | PureGym Glasgow Giffnock | Glasgow | G46 | 11.8 mi | Matches PureGym; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Matches PureGym; Nearby |
| 10 | PureGym Cumbernauld | Cumbernauld | G68 | 12.9 mi | Matches PureGym |

#### "puregm"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._

#### "Puregym Motherwel"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Matches PureGym; Nearby |
| 2 | PureGym Airdrie | Airdrie | ML6 | 5.3 mi | Matches PureGym; Nearby |
| 3 | PureGym East Kilbride | East Kilbride | G74 | 7.5 mi | Matches PureGym; Nearby |
| 4 | PureGym Glasgow Rutherglen | Glasgow | G73 | 8.6 mi | Matches PureGym; Nearby |
| 5 | PureGym Glasgow Robroyston | Glasgow | G33 | 10.4 mi | Matches PureGym; Nearby |
| 6 | PureGym Glasgow Shawlands | Glasgow | G41 | 11.7 mi | Matches PureGym; Nearby |
| 7 | PureGym Glasgow Bath Street | Glasgow | G2 | 11.7 mi | Matches PureGym; Nearby |
| 8 | PureGym Glasgow Giffnock | Glasgow | G46 | 11.8 mi | Matches PureGym; Nearby |
| 9 | PureGym Lanark | Lanark | ML11 | 11.8 mi | Matches PureGym; Nearby |
| 10 | PureGym Cumbernauld | Cumbernauld | G68 | 12.9 mi | Matches PureGym |

#### "strength gym"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | CGDC- Chloe's Gymnastics & Dance Company | Bellshill | ML4 | 2.4 mi | Nearby |
| 2 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi | Nearby |
| 3 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi | Nearby |
| 4 | St andrews high sports hub gym | Coatbridge | ML5 | 4.3 mi | Nearby |
| 5 | JP's Gym | Coatbridge | ML5 | 4.7 mi | Nearby |
| 6 | Dynamic Gymnastics Academy | Motherwell | ML1 | 1.1 mi | Nearby |
| 7 | Hostile Strength | Wishaw | ML1 | 1.2 mi | Nearby |
| 8 | The Gym Group Hamilton | Hamilton, Hamilton | ML3 | 1.6 mi | Nearby |
| 9 | Maximum Gym | Hamilton | ML3 | 1.8 mi | Nearby |
| 10 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | Nearby |

#### "powerlifting"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._

#### "crossfit"
recognised_postcode=false, candidates returned by `gyms_search`=15

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Win Fitness - CrossFit Hamilton | Hamilton | G72 | 2.2 mi | Matches CrossFit; Nearby |
| 2 | New Generation CrossFit | Wishaw | ML2 | 4.3 mi | Matches CrossFit; Nearby |
| 3 | Crossfit Airdrie | Airdrie | ML6 | 5 mi | Matches CrossFit; Nearby |
| 4 | Base Fitness & CrossFit | Glasgow | G74 | 6.8 mi | Matches CrossFit; Nearby |
| 5 | CrossFit Astraea | Glasgow | G40 | 9.6 mi | Matches CrossFit; Nearby |
| 6 | CrossFit MTN | Glasgow | G45 | 10.1 mi | Matches CrossFit; Nearby |
| 7 | CrossFit Glasgow | Glasgow | G5 | 11.4 mi | Matches CrossFit; Nearby |
| 8 | Crossfit Kirkintilloch | Glasgow | G66 | 12.5 mi | Matches CrossFit |
| 9 | CrossFit Clydeside | Paisley | PA3 | 15.5 mi | Matches CrossFit |
| 10 | Crossfit 1298 | Falkirk | FK2 | 17.2 mi | Matches CrossFit |

#### "leisure centre motherwell"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Ravenscraig Regional Sports Centre, Motherwell | Motherwell | ML1 | 1.4 mi | In Motherwell; Nearby |
| 2 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi | In Motherwell; Nearby |
| 3 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi | In Motherwell; Nearby |
| 4 | Yogamind - Motherwell | Motherwell | ML1 | 0.6 mi | In Motherwell; Nearby |
| 5 | XS Taekwondo Motherwell | Motherwell | ML1 | 1.6 mi | In Motherwell; Nearby |
| 6 | Ravenscraig Regional Sport Centre | Motherwell | ML1 | 2 mi | In Motherwell; Nearby |
| 7 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi | In Motherwell; Nearby |
| 8 | The Boathouse Fitness Club | Motherwell | ML1 | 1.3 mi | In Motherwell; Nearby |
| 9 | Quest Fitness | Motherwell | ML1 | 0.2 mi | In Motherwell; Nearby |
| 10 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi | In Motherwell; Nearby |

#### "Wishaw"
recognised_postcode=false, candidates returned by `gyms_search`=26

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Wishaw | Wishaw | ML2 | 2.7 mi | In Wishaw; Nearby |
| 2 | Wishaw Leisure Centre | Wishaw | ML2 | 2.7 mi | In Wishaw; Nearby |
| 3 | New Age Fitness Wishaw | Wishaw | ML2 | 3 mi | In Wishaw; Nearby |
| 4 | Wishaw Wycombe Wanderers Girls Football Academy | Wishaw | ML2 | 3.1 mi | In Wishaw; Nearby |
| 5 | CWS Fitness - Wishaw | Wishaw | ML2 | 3.1 mi | In Wishaw; Nearby |
| 6 | A M Fitness Academy | Wishaw | ML2 | 2.7 mi | In Wishaw; Nearby |
| 7 | Hostile Strength | Wishaw | ML1 | 1.2 mi | In Wishaw; Nearby |
| 8 | Peak Power Fitness | Wishaw | ML1 | 1.2 mi | In Wishaw; Nearby |
| 9 | Immortal Fitness | Wishaw | ML2 | 1.6 mi | In Wishaw; Nearby |
| 10 | Gym Rebel | Wishaw | ML2 | 2.3 mi | In Wishaw; Nearby |

#### "Hamilton"
recognised_postcode=false, candidates returned by `gyms_search`=40

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | The Gym Group Hamilton | Hamilton, Hamilton | ML3 | 1.6 mi | In Hamilton, Hamilton; Nearby |
| 2 | Esporta Hamilton | Hamilton | ML3 | 1.8 mi | In Hamilton; Nearby |
| 3 | Win Fitness - CrossFit Hamilton | Hamilton | G72 | 2.2 mi | In Hamilton; Nearby |
| 4 | Hamilton Pilates Studio | Hamilton | ML3 | 2.3 mi | In Hamilton; Nearby |
| 5 | Hamilton Boxing Club | Hamilton | ML3 | 2.6 mi | In Hamilton; Nearby |
| 6 | Hamilton Judo Club | Hamilton | ML3 | 2.8 mi | In Hamilton; Nearby |
| 7 | Shotokan Karate - Hamilton | Hamilton | ML3 | 3.1 mi | In Hamilton; Nearby |
| 8 | Hamilton Gymnastics Club | Hamilton | ML3 | 3.2 mi | In Hamilton; Nearby |
| 9 | McGowans Blackbelt Academy Hamilton | Hamilton | ML3 | 3.2 mi | In Hamilton; Nearby |
| 10 | New Age Fitness Hamilton | Hamilton | ML3 | 3.3 mi | In Hamilton; Nearby |

#### "Bellshill"
recognised_postcode=false, candidates returned by `gyms_search`=16

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Bellshill Wado Kai | Bellshill | ML4 | 2.1 mi | In Bellshill; Nearby |
| 2 | Bellshill Martial Arts Academy | Bellshill | ML4 | 2.2 mi | In Bellshill; Nearby |
| 3 | XS Taekwondo Bellshill East | Bellshill | ML4 | 2.3 mi | In Bellshill; Nearby |
| 4 | XS Taekwon-do Bellshill | Bellshill | ML4 | 2.6 mi | In Bellshill; Nearby |
| 5 | Bellshill TAGB Tae Kwon-Do | Bellshill | ML4 | 2.6 mi | In Bellshill; Nearby |
| 6 | CGDC- Chloe's Gymnastics & Dance Company | Bellshill | ML4 | 2.4 mi | In Bellshill; Nearby |
| 7 | Fighting Scots Gym | Bellshill | ML4 | 2.1 mi | In Bellshill; Nearby |
| 8 | Fame Xtreme Dance and Cheer | Bellshill | ML4 | 2.3 mi | In Bellshill; Nearby |
| 9 | Mania Boxing & Fitness | Bellshill | ML4 | 2.4 mi | In Bellshill; Nearby |
| 10 | Sakura Karate Club | Bellshill | ML4 | 2.4 mi | In Bellshill; Nearby |

#### "Airdrie"
recognised_postcode=false, candidates returned by `gyms_search`=20

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Ultimate Fitness Airdrie | Airdrie | ML6 | 4.4 mi | In Airdrie; Nearby |
| 2 | Crossfit Airdrie | Airdrie | ML6 | 5 mi | In Airdrie; Nearby |
| 3 | PureGym Airdrie | Airdrie | ML6 | 5.3 mi | In Airdrie; Nearby |
| 4 | Rivals Gym Airdrie | Airdrie | ML6 | 5.6 mi | In Airdrie; Nearby |
| 5 | D.R-fitness | Airdrie | ML6 | 5.5 mi | In Airdrie; Nearby |
| 6 | Hut Yoga | Airdrie | ML6 | 3.9 mi | In Airdrie; Nearby |
| 7 | The Studio Wellness | Airdrie | ML6 | 4 mi | In Airdrie; Nearby |
| 8 | Revolution Fitness | Airdrie | ML6 | 4.5 mi | In Airdrie; Nearby |
| 9 | New Age Fitness | Airdrie | ML5 | 4.9 mi | In Airdrie; Nearby |
| 10 | Southburn Studio | Airdrie | ML6 | 5.1 mi | In Airdrie; Nearby |

#### "EH1"
recognised_postcode=true, candidates returned by `gyms_search`=0

_No results._

#### "Belfast"
recognised_postcode=false, candidates returned by `gyms_search`=10

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Better Andersonstown | Belfast | BT11 | - | In Belfast; Nearby |
| 2 | Better Ballysillan | Belfast | BT14 | - | In Belfast; Nearby |
| 3 | Better Brook | Belfast | BT17 | - | In Belfast; Nearby |
| 4 | Better Girdwood Community Hub | Belfast | BT14 | - | In Belfast; Nearby |
| 5 | Better Grove Wellbeing Centre | Belfast | BT15 | - | In Belfast; Nearby |
| 6 | Better Indoor Tennis Centre and Ozone Complex | Belfast | BT6 | - | In Belfast; Nearby |
| 7 | Better Lisnasharragh | Belfast | BT6 | - | In Belfast; Nearby |
| 8 | Better Olympia Leisure Centre and Spa | Belfast | BT12 | - | In Belfast; Nearby |
| 9 | Better Shankill | Belfast | BT13 | - | In Belfast; Nearby |
| 10 | Better Whiterock | Belfast | BT12 | - | In Belfast; Nearby |

#### "Cardiff"
recognised_postcode=false, candidates returned by `gyms_search`=7

| # | Display name | Town | Outward | Distance | Reasons |
|---|---|---|---|---|---|
| 1 | Better Fairwater | Cardiff | CF5 | - | In Cardiff; Nearby |
| 2 | Better Llanishen | Cardiff | CF14 | - | In Cardiff; Nearby |
| 3 | Better Maindy Centre | Cardiff | CF14 | - | In Cardiff; Nearby |
| 4 | Better Pentwyn | Cardiff | CF23 | - | In Cardiff; Nearby |
| 5 | Better Penylan Library and Community Centre | Cardiff | CF23 | - | In Cardiff; Nearby |
| 6 | Better Star Hub | Cardiff | CF24 | - | In Cardiff; Nearby |
| 7 | Better Western | Cardiff | CF5 | - | In Cardiff; Nearby |

#### "Aberdeen"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._

#### "Truro"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._

#### "Lerwick"
recognised_postcode=false, candidates returned by `gyms_search`=0

_No results._
## 8. Near me (`gyms_near`) mile bands — 1/2/5/10/25/50 miles

**Reminder from §5: nothing in the app calls `gyms_near` today.** This
section is a pure RPC-contract test — evidence for the founder
decision GD-10 anticipates (adding `expo-location`), not a
description of current behaviour.

Points tested:

| Point | Coordinates | Why chosen |
|---|---|---|
| Motherwell centre | 55.789, -3.991 | As specified |
| Rural point | 57.456585, -6.609566 (postcode sector **IV55 8**, Dunvegan, Isle of Skye) | Chosen by scanning every postcode-sector centroid in the Scottish Highlands/Islands, Scottish Borders and Cumbria postcode areas (`TD`, `CA`, `LD`, `SY`, `KA`, `DG`, `PH`, `IV`, `KW`, `NR`, `LL`, `HR`) for the one whose nearest open, non-excluded, non-`other_fitness` gym-type venue is closest to 15 miles away. IV55 8's nearest such venue is **A C E Target Sports Skye, Portree (IV51), 15.0 mi away** — the closest match to the brief's "~15 miles" target found in the data (full ranked list of candidates is in `find-rural.mjs`'s output, reproducible from the harness). A candidate at 14.5 mi (postcode sector **CA13 3**) was REJECTED — see Finding D1 below, its centroid is corrupt. |
| Lerwick, Shetland | 60.1547, -1.1494 | As specified |
| Central London | 51.515, -0.09 | As specified |

**Finding D1 (data quality, flagged here because it was found while
picking the rural test point, not chased further — `06` owns
provenance/coverage): `data/gyms/postcode-sectors.v1.csv` row
`CA13 3,59.196503,-3.029946,30,England,E12000002,E06000063` is wrong.**
CA13 is the Cockermouth, Cumbria postcode area; its neighbouring
sectors in the same file sit at lat ≈54.66 (`CA13 0` → 54.662831,
`CA13 9` → 54.658178), consistent with Cumbria. `CA13 3`'s row instead
reads lat 59.196503 / lng -3.029946 — out in the North Sea, roughly
level with Orkney/Shetland, ~500 km from where CA13 actually is. Any
`gyms_submit` for a genuine CA13 3 postcode, or any postcode/town
search resolving through this sector's ONSPD fallback centroid
(GD-08), would silently place that venue five hundred kilometres from
its real location.

### Results

Count reported per band is what `gyms_near` returns (already clamped
to its own limit, default 40, max 50 — see §2); when the count reads
exactly the limit requested, the true number of venues within that
radius may be higher and the 41st+ closest never reaches the client
at all (this is the SAME 40/50-candidate ceiling mechanism as
Finding S1, applied to a physical radius instead of a text query).

### Motherwell centre (55.789, -3.991)

#### 1 mi band
Count returned: 15 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi |
| 2 | Quest Fitness | Motherwell | ML1 | 0.2 mi |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi |
| 4 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi |
| 5 | Ferri Fit | Motherwell | ML1 | 0.3 mi |
| 6 | Forgewood boxing club | Motherwell | ML1 | 0.3 mi |
| 7 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi |
| 8 | Gillian Stevenson Boxercise | Motherwell | ML1 | 0.4 mi |
| 9 | Evolve Fitness Lab Limited | Motherwell | ML1 | 0.5 mi |
| 10 | Fitness For You | Motherwell | ML1 | 0.6 mi |

#### 2 mi band
Count returned: 30 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi |
| 2 | Quest Fitness | Motherwell | ML1 | 0.2 mi |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi |
| 4 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi |
| 5 | Ferri Fit | Motherwell | ML1 | 0.3 mi |
| 6 | Forgewood boxing club | Motherwell | ML1 | 0.3 mi |
| 7 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi |
| 8 | Gillian Stevenson Boxercise | Motherwell | ML1 | 0.4 mi |
| 9 | Evolve Fitness Lab Limited | Motherwell | ML1 | 0.5 mi |
| 10 | Fitness For You | Motherwell | ML1 | 0.6 mi |

#### 5 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi |
| 2 | Quest Fitness | Motherwell | ML1 | 0.2 mi |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi |
| 4 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi |
| 5 | Ferri Fit | Motherwell | ML1 | 0.3 mi |
| 6 | Forgewood boxing club | Motherwell | ML1 | 0.3 mi |
| 7 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi |
| 8 | Gillian Stevenson Boxercise | Motherwell | ML1 | 0.4 mi |
| 9 | Evolve Fitness Lab Limited | Motherwell | ML1 | 0.5 mi |
| 10 | Fitness For You | Motherwell | ML1 | 0.6 mi |

#### 10 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi |
| 2 | Quest Fitness | Motherwell | ML1 | 0.2 mi |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi |
| 4 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi |
| 5 | Ferri Fit | Motherwell | ML1 | 0.3 mi |
| 6 | Forgewood boxing club | Motherwell | ML1 | 0.3 mi |
| 7 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi |
| 8 | Gillian Stevenson Boxercise | Motherwell | ML1 | 0.4 mi |
| 9 | Evolve Fitness Lab Limited | Motherwell | ML1 | 0.5 mi |
| 10 | Fitness For You | Motherwell | ML1 | 0.6 mi |

#### 25 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi |
| 2 | Quest Fitness | Motherwell | ML1 | 0.2 mi |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi |
| 4 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi |
| 5 | Ferri Fit | Motherwell | ML1 | 0.3 mi |
| 6 | Forgewood boxing club | Motherwell | ML1 | 0.3 mi |
| 7 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi |
| 8 | Gillian Stevenson Boxercise | Motherwell | ML1 | 0.4 mi |
| 9 | Evolve Fitness Lab Limited | Motherwell | ML1 | 0.5 mi |
| 10 | Fitness For You | Motherwell | ML1 | 0.6 mi |

#### 50 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | PureGym Motherwell | Motherwell | ML1 | 0.1 mi |
| 2 | Quest Fitness | Motherwell | ML1 | 0.2 mi |
| 3 | Aesthetic13 GYM | Motherwell | ML1 | 0.2 mi |
| 4 | Suzanne O'Reilly Fitness | Motherwell | ML1 | 0.3 mi |
| 5 | Ferri Fit | Motherwell | ML1 | 0.3 mi |
| 6 | Forgewood boxing club | Motherwell | ML1 | 0.3 mi |
| 7 | Rivals Gym Motherwell | Motherwell | ML1 | 0.4 mi |
| 8 | Gillian Stevenson Boxercise | Motherwell | ML1 | 0.4 mi |
| 9 | Evolve Fitness Lab Limited | Motherwell | ML1 | 0.5 mi |
| 10 | Fitness For You | Motherwell | ML1 | 0.6 mi |

### Rural point: IV55 8 sector centroid (Dunvegan, Isle of Skye) — nearest open gym-type venue is A C E Target Sports Skye, Portree IV51, 15.0 mi away (57.456585, -6.609566)

#### 1 mi band
Count returned: 0 (true count within this radius, uncapped)

_No results._

#### 2 mi band
Count returned: 0 (true count within this radius, uncapped)

_No results._

#### 5 mi band
Count returned: 0 (true count within this radius, uncapped)

_No results._

#### 10 mi band
Count returned: 0 (true count within this radius, uncapped)

_No results._

#### 25 mi band
Count returned: 1 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | A C E Target Sports Skye | Portree | IV51 | 15 mi |

#### 50 mi band
Count returned: 4 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | A C E Target Sports Skye | Portree | IV51 | 15 mi |
| 2 | Liniclate Sport Centres | Isle of Benbecula | HS7 | 28.2 mi |
| 3 | Benbecula Freedive | Isle of Benbecula | HS7 | 28.2 mi |
| 4 | Different Strokes Fitness Training | Strathcarron | - | 29.6 mi |

### Lerwick, Shetland (60.1547, -1.1494)

#### 1 mi band
Count returned: 2 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Shetland Budokai | Lerwick | ZE1 | 0.4 mi |
| 2 | SL Fitness | Lerwick | ZE1 | 0.9 mi |

#### 2 mi band
Count returned: 2 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Shetland Budokai | Lerwick | ZE1 | 0.4 mi |
| 2 | SL Fitness | Lerwick | ZE1 | 0.9 mi |

#### 5 mi band
Count returned: 4 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Shetland Budokai | Lerwick | ZE1 | 0.4 mi |
| 2 | SL Fitness | Lerwick | ZE1 | 0.9 mi |
| 3 | Gym Gair | Shetland | ZE1 | 4.2 mi |
| 4 | Shetland Weight Training Club | Shetland | ZE1 | 4.7 mi |

#### 10 mi band
Count returned: 5 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Shetland Budokai | Lerwick | ZE1 | 0.4 mi |
| 2 | SL Fitness | Lerwick | ZE1 | 0.9 mi |
| 3 | Gym Gair | Shetland | ZE1 | 4.2 mi |
| 4 | Shetland Weight Training Club | Shetland | ZE1 | 4.7 mi |
| 5 | Breckenlea Shetland Pony Stud | Shetland | ZE2 | 9.3 mi |

#### 25 mi band
Count returned: 6 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Shetland Budokai | Lerwick | ZE1 | 0.4 mi |
| 2 | SL Fitness | Lerwick | ZE1 | 0.9 mi |
| 3 | Gym Gair | Shetland | ZE1 | 4.2 mi |
| 4 | Shetland Weight Training Club | Shetland | ZE1 | 4.7 mi |
| 5 | Breckenlea Shetland Pony Stud | Shetland | ZE2 | 9.3 mi |
| 6 | Mossbank Community Gym | Shetland | ZE2 | 21 mi |

#### 50 mi band
Count returned: 6 (true count within this radius, uncapped)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Shetland Budokai | Lerwick | ZE1 | 0.4 mi |
| 2 | SL Fitness | Lerwick | ZE1 | 0.9 mi |
| 3 | Gym Gair | Shetland | ZE1 | 4.2 mi |
| 4 | Shetland Weight Training Club | Shetland | ZE1 | 4.7 mi |
| 5 | Breckenlea Shetland Pony Stud | Shetland | ZE2 | 9.3 mi |
| 6 | Mossbank Community Gym | Shetland | ZE2 | 21 mi |

### Central London (51.515, -0.09)

#### 1 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Another Space | London | EC2R | 0 mi |
| 2 | Oliver Saville Fitness | London | EC2R | 0 mi |
| 3 | Cre8 Fitness | London | EC2R | 0.1 mi |
| 4 | Embody Fitness | London | EC2N | 0.1 mi |
| 5 | Josh Peck - Coach | London | EC2V | 0.1 mi |
| 6 | Blumew Academy | London | EC2R | 0.1 mi |
| 7 | Surge Fitness | London | EC2R | 0.1 mi |
| 8 | Ben West Fitness | London | EC2V | 0.1 mi |
| 9 | PEMFiT City of London | London | EC2V | 0.1 mi |
| 10 | Arsenal True fan club | London | EC2M | 0.2 mi |

#### 2 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Another Space | London | EC2R | 0 mi |
| 2 | Oliver Saville Fitness | London | EC2R | 0 mi |
| 3 | Cre8 Fitness | London | EC2R | 0.1 mi |
| 4 | Embody Fitness | London | EC2N | 0.1 mi |
| 5 | Josh Peck - Coach | London | EC2V | 0.1 mi |
| 6 | Blumew Academy | London | EC2R | 0.1 mi |
| 7 | Surge Fitness | London | EC2R | 0.1 mi |
| 8 | Ben West Fitness | London | EC2V | 0.1 mi |
| 9 | PEMFiT City of London | London | EC2V | 0.1 mi |
| 10 | Arsenal True fan club | London | EC2M | 0.2 mi |

#### 5 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Another Space | London | EC2R | 0 mi |
| 2 | Oliver Saville Fitness | London | EC2R | 0 mi |
| 3 | Cre8 Fitness | London | EC2R | 0.1 mi |
| 4 | Embody Fitness | London | EC2N | 0.1 mi |
| 5 | Josh Peck - Coach | London | EC2V | 0.1 mi |
| 6 | Blumew Academy | London | EC2R | 0.1 mi |
| 7 | Surge Fitness | London | EC2R | 0.1 mi |
| 8 | Ben West Fitness | London | EC2V | 0.1 mi |
| 9 | PEMFiT City of London | London | EC2V | 0.1 mi |
| 10 | Arsenal True fan club | London | EC2M | 0.2 mi |

#### 10 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Another Space | London | EC2R | 0 mi |
| 2 | Oliver Saville Fitness | London | EC2R | 0 mi |
| 3 | Cre8 Fitness | London | EC2R | 0.1 mi |
| 4 | Embody Fitness | London | EC2N | 0.1 mi |
| 5 | Josh Peck - Coach | London | EC2V | 0.1 mi |
| 6 | Blumew Academy | London | EC2R | 0.1 mi |
| 7 | Surge Fitness | London | EC2R | 0.1 mi |
| 8 | Ben West Fitness | London | EC2V | 0.1 mi |
| 9 | PEMFiT City of London | London | EC2V | 0.1 mi |
| 10 | Arsenal True fan club | London | EC2M | 0.2 mi |

#### 25 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Another Space | London | EC2R | 0 mi |
| 2 | Oliver Saville Fitness | London | EC2R | 0 mi |
| 3 | Cre8 Fitness | London | EC2R | 0.1 mi |
| 4 | Embody Fitness | London | EC2N | 0.1 mi |
| 5 | Josh Peck - Coach | London | EC2V | 0.1 mi |
| 6 | Blumew Academy | London | EC2R | 0.1 mi |
| 7 | Surge Fitness | London | EC2R | 0.1 mi |
| 8 | Ben West Fitness | London | EC2V | 0.1 mi |
| 9 | PEMFiT City of London | London | EC2V | 0.1 mi |
| 10 | Arsenal True fan club | London | EC2M | 0.2 mi |

#### 50 mi band
Count returned: 40 (hit the 40-candidate cap — the true count within this radius may be higher; top 10 by distance shown)

| # | Display name | Town | Outward | Distance |
|---|---|---|---|---|
| 1 | Another Space | London | EC2R | 0 mi |
| 2 | Oliver Saville Fitness | London | EC2R | 0 mi |
| 3 | Cre8 Fitness | London | EC2R | 0.1 mi |
| 4 | Embody Fitness | London | EC2N | 0.1 mi |
| 5 | Josh Peck - Coach | London | EC2V | 0.1 mi |
| 6 | Blumew Academy | London | EC2R | 0.1 mi |
| 7 | Surge Fitness | London | EC2R | 0.1 mi |
| 8 | Ben West Fitness | London | EC2V | 0.1 mi |
| 9 | PEMFiT City of London | London | EC2V | 0.1 mi |
| 10 | Arsenal True fan club | London | EC2M | 0.2 mi |
### Near-me findings

- **Motherwell**: dense enough that the 5/10/25/50-mile bands are all
  identical (all hit the 40-candidate cap and show the same nearest
  40 venues, 0.1-0.6 mi onward) — the mile-band UI concept genuinely
  only differentiates the 1 mi (15 results) and 2 mi (30 results)
  bands here; every wider band the founder's five-band design
  proposes (GD-10: 1/2/5/10/25) would render an IDENTICAL list from 5
  miles upward for a Motherwell-like urban centre, because the true
  count of venues within 5-50 miles vastly exceeds 40 and the RPC has
  already thrown the rest away before the client ever sees a radius.
- **Rural point (IV55 8, Dunvegan)**: exactly reproduces the intended
  test. 1/2/5/10 mi bands are empty (0 results); the true nearest gym
  (A C E Target Sports Skye, Portree, 15.0 mi) first appears at the
  **25 mile** band; by 50 miles there are 4 results spanning Skye,
  Benbecula and Strathcarron. This is the single cleanest evidence in
  this report that the mile-band design (1/2/5/10/25) genuinely needs
  a "nothing nearby" empty state distinct from "your gym isn't in the
  directory yet" for anyone starting the search from a genuinely
  rural point — the two 0-result outcomes are exactly the two GD-11
  is designed to tell apart ("can't find your gym" vs "there
  genuinely isn't one nearby").
- **Lerwick, Shetland**: small, stable counts throughout (2 at 1 mi,
  rising to 6 by 25 mi and staying at 6 through 50 mi) — the true
  Shetland gym population is fully captured well inside the
  40-candidate cap, so THIS location's near-me experience is
  unaffected by the cap. Useful as the contrast case: the cap is a
  density problem, not a universal one.
- **Central London**: **every band from 1 through 50 miles returns
  the exact same 40 venues, all within about 0.2 miles of the query
  point**, because London's fitness-venue density is so high that
  even a 1-mile radius already exceeds 40 candidates. What "falls
  off" between the 1-mile and 50-mile bands, per the RPC's own
  design, is **every venue beyond the nearest ~40 within a few
  hundred metres** — asking for "gyms within 50 miles of central
  London" and "gyms within 1 mile of central London" produce
  IDENTICAL results today. If the product intends the wider bands to
  show meaningfully different (further, less locally-saturated)
  results in dense cities, `gyms_near`'s fixed 40/50 cap defeats that
  for any UK city centre, not just London — Motherwell already shows
  the same pattern from 5 miles up, just with a smaller population of
  affected bands.
## 9. Add-gym duplicate check (`gyms_submit`, GD-06/GD-11 as actually coded in migrate_162)

Note on scope: `scripts/gyms/dedupe.mjs` (read, lines 1-60 quoted in
§1) is a DIFFERENT mechanism — it runs once, offline, during the
PIPELINE BUILD (GD-06's full multi-signal score: brand/name-Jaccard/
postcode-unit/street/proximity/phone/website, merge ≥5, review 3-5,
distinct <5) to decide which SOURCE RECORDS collapse into one
canonical `gym_venues` row before the catalogue ever ships. It never
runs at submission time and was not exercised further here (no
build was re-run). What actually gates a live user's "Add gym"
submission is the much narrower text-only check inside `gyms_submit`
quoted in §2: same outward code, THEN (same postcode unit AND token
Jaccard ≥ 0.6) OR (token Jaccard ≥ 0.85 regardless of postcode).

### Test cases (harness re-implementation of the read-only duplicate/twin scan; no row was inserted — see divergence #4, §6)

| Case | Input | `tokens_of(name, town)` | Existing catalogue row's `tokens` | Jaccard | Result |
|---|---|---|---|---|---|
| Exact re-submission, "Pure Gym" spacing | name="Pure Gym Motherwell", town="Motherwell", postcode="ML1 1LX" (real PureGym Motherwell postcode) | `["pure","gym","motherwell"]` | `["puregym","motherwell","pure","gym","uk","ml1"]` | **0.50** | **`new_submission` — NOT caught as a duplicate** |
| Exact re-submission, "PureGym" one word | name="PureGym Motherwell", town="Motherwell", postcode="ML1 1LX" | `["puregym","motherwell"]` | `["puregym","motherwell","pure","gym","uk","ml1"]` | **0.33** | **`new_submission` — NOT caught** |
| Volt Gym, Burscough (GD-17's named test case), real postcode | name="Volt Gym", town="Burscough", postcode="L40 8TG" (real) | `["volt","gym","burscough"]` | `["volt","gym","l40"]` | **0.50** | **`new_submission` — NOT caught** |
| Volt Gym, casing/word-order variant | name="volt gym burscough", town="Burscough", postcode="L40 8TG" | `["volt","gym","burscough"]` | `["volt","gym","l40"]` | **0.50** | **`new_submission` — NOT caught** |
| Genuinely different business, SAME postcode as an existing venue (a real "gym inside a leisure centre" case GD-06 explicitly wants kept distinct) | name="Sunshine Physio and Wellness", town="Motherwell", postcode="ML1 1LX" | `["sunshine","physio","and","wellness","motherwell"]` | (PureGym Motherwell's tokens, above) | 0.00 | `new_submission` — correctly NOT flagged (this is the intended behaviour) |
| Genuinely new gym, unrelated postcode | name="Steel City Strength Club", town="Sheffield", postcode="S1 2AB" | — | no candidate at that outward+postcode | — | `new_submission` — correctly not flagged |

### Finding D2 (real, quantified) — the submission-time duplicate check, run against this real catalogue, fails to catch an exact-name resubmission of a well-known chain branch more than half the time.

Root cause is the tokenizer asymmetry flagged in §2: `_gyms_tokens_
of(name, town)` at submission time folds ONLY the typed name + town,
while the catalogue's own `tokens` column (built once by `scripts/
gyms/normalise.mjs` at pipeline time and shipped verbatim in
`uk-gyms.v1.jsonl`) routinely carries 2-4 EXTRA generic tokens per
branded venue that a real user would never type into the "Add gym"
form: the outward code (`"ml1"`, `"l40"`), the literal string
`"uk"` (from alias variants like "pure gym uk"), and brand words
split out a second time alongside the compound brand token
(`"puregym"` AND separately `"pure"`, `"gym"`). Each extra token
inflates the UNION in the Jaccard calculation
(`intersection / union`) without adding to the intersection, pulling
the score down. Measured systematically across the whole catalogue
(not just the two named test cases): for the **3,002 open, postcode-
bearing, brand-carrying venues**, re-tokenizing each one's OWN
`display_name` + `town` exactly as a fresh submission would and
comparing to its OWN stored `tokens` —

- **1,590 of 3,002 (53.0%)** score below the 0.6 postcode-unit
  threshold — a byte-for-byte resubmission of the SAME chain
  branch's name, at its OWN real postcode, would not be recognised as
  a duplicate by this rule for over half of all branded venues in the
  catalogue today.
- **2,844 of 3,002 (94.7%)** score below the 0.85 threshold that
  would apply if the postcode didn't match exactly (e.g. a typo'd
  house number).

This means the two founder-named test cases in the brief ("Pure Gym
Motherwell, ML1 1AB"-style" and "Volt Gym, Burscough") were not
edge-case gotchas found by chance — they are representative of the
majority case for any chain venue, because the pipeline's tokenizer
and the submission-time tokenizer were never made to agree on what
counts as a token for the SAME venue.

### What the user would be shown

For every "NOT caught" row above, `gyms_submit`'s duplicate branch
never fires, so its TWIN-pending branch (also miss, same tokenizer
and threshold) also never fires, and the function falls through to
insert a brand-new `pending` `gym_venues` row plus its `gym_
submissions` row (migrate_162:1192-1228). `CommunityGymAddScreen.js`
(the only consumer of `submit()`) would show its SUCCESS path
(`CommunityGymAddScreen.js:89-94`): `toast.show('Added. It shows for
everyone once a second person confirms it.')`, then navigate back
with the new venue selected — **never the "Did you mean PureGym
Motherwell?" duplicate prompt** (`CommunityGymAddScreen.js:106-132`),
because `out.duplicate` was never set. The practical user-facing
consequence: submitting an already-catalogued PureGym or Volt Gym
branch under a plausible real-world spelling creates a second,
genuinely duplicate `pending` venue in the directory more than half
the time, silently, with no warning to the submitter and no
moderator signal beyond the ordinary review queue.
## 10. Data readiness for this journey (GD-09/GD-10/GD-11 dependencies only — full coverage/provenance is `06`'s file)

Computed directly from `data/gyms/uk-gyms.v1.jsonl` (46,817 rows) in
the scratchpad, restricted to `status = 'open'` (44,210 rows — the
population every ordinary, non-submitter search actually sees,
per `_gyms_visible`):

| Field | Present | Of 44,210 open venues | Note |
|---|---|---|---|
| Coordinates (`coord_source = 'source'`, i.e. real, not a fallback) | 44,087 | 99.72% | |
| Coordinates via postcode-sector fallback (`coord_source = 'postcode_sector'`) | 75 | 0.17% | GD-08's fallback path |
| No coordinates at all (`coord_source = 'none'`) | 48 | 0.11% | These rows bypass every bounding-box filter entirely regardless of query location — see Finding R1b, §3 |
| `town` | 44,095 | 99.7% | |
| `outward` | 43,950 | 99.4% | |
| `brand_key` (a recognised chain) | 3,101 | 7.0% | The other 93% are independents/leisure-centres/martial-arts studios etc., matched on name/town tokens only, never on a `BRAND_ALIASES` entry |

**Does the client show outward code and town on a result row today?**
Yes, both, plus distance when known: `GymRow.js:22-63` renders
`venueLine(venue)` from `src/lib/gyms/index.js:251-267`, which builds
`secondary` as `[town, outward, distanceLabel].filter(Boolean).join(' · ')`
— confirmed directly against every non-empty-town/outward result in
every table in §7/§8 above (e.g. "Motherwell · ML1 · 0.1 mi").
Once a venue is SELECTED, however (§5), the town/outward/distance
line is dropped and only the bare display name remains on the
summary card (`CommunityJoinScreen.js:295-310`) — a person confirming
their choice cannot see confirmation of which branch/town they
picked if two branches share a display name (there are exact-
duplicate `display_name` collisions in the data, e.g. two rows
named plain "Aberdeen" at AB24/AB10/AB22/AB16, two rows named
"Cardiff" at CF24/CF23, two rows named "Hamilton Gymnastics Club" at
ML3/G72 — all observed directly in the §7 "Aberdeen"/"Cardiff"/
"Hamilton" tables).
## Ambiguities / could not determine

- **Whether `gyms_search`'s brand-alias matching behaves identically
  on Postgres for a multi-word alias split across the LAST-token
  prefix branch.** The harness reproduces the SQL's `LIKE qt || '%'`
  semantics with JS `.startsWith()`, which should be equivalent for
  the plain-ASCII aliases in `brands.v1.json`, but this was not run
  against a live Postgres instance to confirm byte-for-byte (no
  Supabase MCP tool was called, per this agent's hard bounds).
- **Whether `_community_rate_check`'s 120-reads-per-minute rail would
  ever visibly throttle the picker's 250 ms debounce in real use.**
  Not modelled — the harness has no concept of a rate window.
- **The real Postgres collation used for `ORDER BY display_name ASC`**
  was not inspected (would require a live database read), so a
  collation-sensitive tie-break difference on non-ASCII or
  punctuation-heavy names cannot be fully ruled out, though none of
  the 37×2 test queries exposed one.
- **Whether `gyms_suggest` (the 8-row autocomplete variant) is called
  from ANY surface not read in this audit.** `GymPicker.js`,
  `CommunityJoinScreen.js`, `CommunityEditProfileScreen.js` and
  `CommunityGymAddScreen.js` were the only consumers checked; a
  repo-wide grep for every caller of `src/lib/gyms/index.js`'s
  `suggest` export was not run (out of this agent's brief, which
  named these specific files).
- **Whether the twin-pending-confirmation path in `gyms_submit`
  (migrate_162:1127-1177) behaves as documented when actually
  exercised against a live database with two real distinct
  submitters** — this agent implemented and reasoned about the READ
  half only (divergence #4, §6); no insert was performed anywhere.
- **The exact wording/interaction the founder intends for a
  "genuinely no gyms nearby" empty state** (surfaced as a real gap by
  the Dunvegan rural-point test in §8) is a product decision, not
  something this file can determine from code alone.
