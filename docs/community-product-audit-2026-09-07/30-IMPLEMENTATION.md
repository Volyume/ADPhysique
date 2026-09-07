# 30 — IMPLEMENTATION: P0 specification (edit gate), build record, verification

Authority: `20-JUDGEMENT.md` section 8 (P0-B to P0-F), the founder's
gym-onboarding addition, SD-20..SD-32, GD-01..GD-26, CLAUDE.md Section 2.
Every builder works from THIS section, not from the judgement prose.
Anything not specified here is a STOP-and-report, never an interpretation.

## 1. Specification

### 1.1 Migration `supabase/migrate_163_community_place_and_finder.sql` (lane S1)

Header per the house convention (purpose, applied-locally/remotely
status WRITTEN NOT APPLIED, safe to re-run YES, rollback). Additive and
idempotent throughout: `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE
FUNCTION`, re-issued functions keep their existing signatures or add
parameters WITH DEFAULTS so every current client call still resolves.
Security shape exactly as 162: `SECURITY DEFINER`, `SET search_path =
public, pg_temp`, `_community_caller()`, `_community_rate_check` on every
new entry point, REVOKE ALL from public/anon then GRANT EXECUTE to
authenticated for every new function, and the rpc-only guard test list
extended (`src/__tests__/*rpc*guard*` — read it first and keep it green).
`delete_user_data()` needs no re-issue: every new column lives on
`community_profiles` (cascade) and no new table is created.

A. Gym finder
- `public._gyms_outward_centroid(_outward text)` STABLE: average of
  `gym_postcode_sectors.lat/lng` whose `sector` starts with `_outward || ' '`;
  NULL when none.
- `public.gyms_place_centroid(_q text)` RETURNS jsonb
  `{kind: 'postcode'|'town'|'none', label, lat, lng}`. A full postcode
  resolves to its sector centroid; an outward code to
  `_gyms_outward_centroid`; otherwise the folded text is matched against
  `gym_venues.town_key` (exact, then prefix on the whole string) and the
  centroid is the average of open venues' coordinates for the best town
  key (most venues wins; ties by name). Label: the postcode as typed and
  normalised, or the town's display casing (take the modal `town` for that
  `town_key`). Rate rail `gyms_read`.
- `public.gyms_search` re-issued with a new trailing parameter
  `_radius_m double precision DEFAULT NULL`. When the query is a
  recognised postcode and no `_lat/_lng` are supplied, resolve the centroid
  as above and return the union of (a) exact-outward matches and (b) open
  venues within `coalesce(_radius_m, 8047)` metres, each with
  `distance_m`, ordered by brand match, then town match, then
  `operator_unconfirmed` ascending (confirmed first; use the existing
  verification column, whatever its exact name is in 162, and STOP if
  there is none), then distance, then name. Non-postcode behaviour
  unchanged except the same `operator_unconfirmed` sort key inserted before
  distance. Response gains `centroid: {lat,lng,label} | null`.
- `public.gyms_near` re-issued: same `operator_unconfirmed` tiebreak
  after distance; radius clamp raised to 80,468 m (50 miles); the
  candidate limit stays 40 and the response gains `truncated: boolean`.
- `public.gyms_get` and the venue JSON used by search/near/in_place gain
  `region_name`, `local_authority_name`, `country` (already stored).

B. Place, not string
- `community_profiles` gains `place_key text`, `place_label text`,
  `place_lat double precision`, `place_lng double precision`,
  `place_kind text CHECK (place_kind IN ('outward','town'))`, index on
  `place_key`. `area_label`/`area_key` stay for display and for profiles
  saved before 163; nothing reads them for matching once `place_key` is set.
- `public.community_set_place(_q text)` RETURNS jsonb: resolves through
  the same logic as `gyms_place_centroid`; stores key (`outward:<ML1>` or
  `town:<town_key>`), label, kind and the PLACE centroid (never a device
  coordinate: the function takes text only). `_q = ''` clears the place.
  Also writes `area_label := place_label`, `area_key := place_key` so every
  existing surface that displays area keeps working. Rate rail 120/hour.
- `public.community_upsert_profile` re-issued: when `gym_id` is set and
  the profile has no `place_key`, populate the place from the venue's
  `town_key` (label = venue town) using the town centroid rule. Never
  overwrite an explicitly chosen place.
- `_community_profile_card` gains `place_label` (viewer-gated exactly as
  `area_label` is today) and `age_band` (only when the owner shares it and
  is not a minor; string band such as `'30s'` from `tp_age_band`).
- Place band helper `public._community_place_band_m(a uuid, b uuid)`:
  haversine between the two place centroids, NULL when either is unset.

C. Find people, combinable
- `public.community_find_people` re-issued with a new trailing parameter
  `_filters jsonb DEFAULT NULL`. Keys, all optional, all HARD filters:
  `scope` ('gym'|'place'|'any'; default follows the mode),
  `place_band_miles` (0 = same place key, 5, 10, 25; applied when scope is
  'place'), `partner_only` (bool), `days` (text[] of day keys; candidate
  must share at least one), `time_bands` (text[]; at least one shared),
  `styles` (text[]; at least one shared), `goal` (text), `experience_band`
  (text), `age_band` (text; only when the caller shares their own band).
  Every existing mode keeps its current meaning when `_filters` is NULL.
  The `area` mode becomes: same `place_key` when the caller has one,
  falling back to `area_key` equality for pre-163 profiles.
- Scoring unchanged in weights, plus `+1` and reason `same_age_band` when
  both share an age band, and place reasons: `same_place` ("In
  <place_label>" is rendered by the client), `near_place` (within 10
  miles), `within_25_miles`. Reasons remain fixed strings; no number is
  ever returned for a distance between people.
- Exclusions added to BOTH `community_find_people` and
  `community_suggested_people`: muted-by-caller, and (new) profiles whose
  `connect_from` would refuse the caller carry `can_connect: false` on the
  card (helper `_community_can_connect(viewer, target)`), they are NOT
  removed (a person may still follow).
- Paging: keyset over `(score DESC, last_active_at DESC, user_id)`
  encoded in `_cursor`; the scoring scan cap rises to 1,000 rows;
  response `count` is the number actually scored and `count_truncated`
  is true when the scan cap was hit.
- Fallback (SD-28 honest): when a mode returns fewer than 5 rows on the
  first page and `_filters` is NULL, append up to 10 recently active public
  adult profiles not already listed, not blocked or muted, each flagged
  `fallback: true` with an empty reasons array. Never for keyed doors
  whose key is missing (the honest empty door stays).

D. Fixes
- `public.community_report` re-issued: `target_kind = 'message'` accepted;
  the target owner is the message sender; the caller must be a party to
  the conversation; a report on a message from a closed conversation is
  still accepted (evidence survives closure). Everything else unchanged.
- `community_update_training_profile`: unchanged (age band already
  stored); confirm `v_share AND NOT is_minor` still nulls it for minors.

E. Tests (Jest, `supabase/__tests__` or wherever 162's guards live):
extend the rpc-only guard list; add a source guard that `gyms_search`,
`gyms_near` and `community_find_people` never return a numeric distance
between two PEOPLE (only venue `distance_m`), and that no function stores
a `_lat/_lng` argument into `community_profiles`.

### 1.2 Gym finder client and Join step (lane S2)

Files: `src/lib/gyms/index.js` (+ `placeCentroid(q)`, `near` radius in
miles helper, `search(q, {radiusM})`), `src/lib/gyms/rank.js` (small
penalty for `operator_unconfirmed`), `src/components/community/GymPicker.js`
(rebuilt as the finder), `src/screens/CommunityJoinScreen.js` (new step),
`src/screens/CommunityEditProfileScreen.js` (place picker replaces the
area text box; same finder component in place mode), new
`src/lib/deviceLocation.js`, new `src/components/community/PlacePicker.js`
(may share internals with GymPicker).

- `src/lib/deviceLocation.js`: `isAvailable()` returns false and
  `getApproximatePosition()` rejects with code `unavailable` UNTIL the
  founder's dependency answer; no `expo-location` string anywhere in the
  tree yet. The module's header records the two-line change that arms it.
  Nothing else in the client may reference a location API; the privacy
  guard stays green.
- Finder behaviour (GymPicker):
  1. Header "Where do you train?"; sub line "Your gym helps people at the
     same gym find you. You choose what is shown."
  2. Search field always visible, placeholder "Gym, town or postcode".
  3. "Use my location" row shown only when `deviceLocation.isAvailable()`.
     On tap: position → `gyms.near(lat, lng, {radiusM: 5 miles})`; the
     coordinate is held in component state for the session only.
  4. Typed postcode or town: `gyms.search(q)` (server returns the
     centroid) merged with `gyms.near(centroid, 5 miles)`; de-duplicated by
     id; ranked by `rankVenues`.
  5. Distance band (founder order in chat 2026-09-07: "my gym is 15
     miles away", wider ranges must be obvious): whenever a centroid is
     known (device position, postcode or town), a Chip row "Within 5 · 10
     · 25 · 50 miles" sits directly under the search field, default 5,
     always visible, one tap to widen; the list re-queries `gyms.near`
     at the chosen band. Text matches by name, brand or branch from
     `gyms.search` are NEVER filtered by the band (a typed "PureGym
     Motherwell" appears whatever the band), so a person who knows the
     name is never blocked by distance. When the near list is truncated
     at the candidate limit the footer reads "Showing the nearest 40.
     Type the gym's name to narrow it down." The band resets to 5 when
     the centroid changes.
  6. Every row: display name; second line `town · outward · 3.8 miles`
     (distance only when known, one decimal, miles); pending venues carry
     the existing pending mark.
  7. Bottom of every list and every empty state: "Can't find your gym?
     Add it" → `CommunityGymAdd`, returning the pending venue selected.
  8. Empty state copy for a postcode with nothing within the band: "No
     gyms within 5 miles of ML1 yet. Try a wider distance, or add yours."
- Join step: inserted after the identity step and before privacy; main
  gym via the finder; "Add another gym you train at" (up to three, same
  finder); "Not now" skips with no penalty. Selection persists via the
  existing `community_set_gyms` path on Join submit; the profile's place
  is populated server-side from the main gym (spec 1.1 B) and the Join
  privacy receipt line already covers gym and area.
- Edit profile: "Area" text box replaced by "Place" picker (town or
  postcode district) calling `community_set_place`; hint "Shown as
  'In Motherwell'. Used to find people near you. Never your exact
  location."; a "Use my gym's town" shortcut when a main gym is set.
- Tests: `GymPicker` (radius stepping, row format, empty state, add-gym
  route), `deviceLocation` stub, Join step (skip path, main + other gyms,
  minor unaffected), Edit profile place picker.

### 1.3 Find people filters and fixes (lane S3, after S1 or S2 completes)

Files: `src/lib/community/findPeople.js`, `src/screens/
CommunityFindPeopleScreen.js`, `src/screens/CommunityPeopleListScreen.js`,
`src/components/community/ProfileCard.js`, `ConnectButton.js`,
`src/screens/CommunityTrainingProfileScreen.js`,
`src/screens/CommunityConversationScreen.js`, `src/screens/
CommunityHubScreen.js`, `src/lib/community/feed.js`,
`src/lib/community/trainingProfile.js`, `src/lib/community/messages.js`.

- Filters sheet on the people list for every door: Chip rows "Where"
  (My gym / Near me: same place, 5, 10, 25 miles / Anywhere), "When"
  (days, time bands), "Training" (styles, goal, experience band), "Open to
  training together" switch, "Age band" chips only when the caller shares
  theirs. Applied filters render as removable chips above the list; the
  count line reads "N people" or "N+ people" when `count_truncated`.
  Filters pass through as `_filters` (spec 1.1 C). Keyset cursor replaces
  offset in `findPeople.js`.
- Reason vocabulary extended: `same_age_band` → "Same age band",
  `same_place` → "In <place_label>", `near_place` → "Near you",
  `within_25_miles` → "Within 25 miles". Fallback rows render under a
  divider "More people on Volyume" with no reasons.
- `ProfileCard`: place chip from `place_label` (falls back to
  `area_label`); age band chip when present; `can_connect === false` hides
  Connect and shows Follow with the line "Accepts requests from people who
  follow them" (or "Not taking requests" for nobody).
- `CommunityTrainingProfileScreen`: age band row filtered for a minor,
  exactly as Join does; preview line and `TrainingProfileLine` include the
  age band when shared.
- `CommunityConversationScreen`: the reference attaches when the screen
  was opened with a ref and it has not been sent in THIS opening; the
  placeholder follows the ref; `refSent` no longer derives from row count.
- `CommunityHubScreen`/`feed.js`: remove the unrendered `suggestedPeople`
  fetch (the RPC stays for compatibility; note in `feed.js`).
- Tests for each item above; the existing door tests keep passing with
  `_filters` absent.

## 2. Build record

- **S2 gym finder, Join step, place picker (Sonnet) — landed after lead
  review.** `src/lib/deviceLocation.js` (armed on the founder's yes;
  lead fixed an uncleared timeout timer that would have rejected an
  unlistened promise after every successful read), `src/lib/gyms/index.js`
  (`placeCentroid`, `near` returns `{venues, truncated}`), `rank.js`
  (null distance scores 0, unconfirmed penalty 40, reasons never
  rendered), `GymPicker.js` rebuilt as the finder (Use my location,
  visible 5/10/25/50 band chips, text matches never cut by the band,
  truncation footer, add-gym on every list and empty state, denied
  withdraws the button and never re-prompts), new `PlacePicker.js`,
  `CommunityJoinScreen.js` gym step (main + up to three others, "Not
  now"; required onboarding fields untouched), `CommunityEditProfileScreen.js`
  place picker replacing the area box with "Use my gym's town",
  `profile.js` `setPlace`, `__mocks__/expo-location.js` + jest mapper.
  Deviations accepted: SectionLabel not h3 (V19); four radio chips for
  the band (V6/V12); `distanceLabel` always one decimal; `near()` shape
  change (no prior caller). Lane tests 12 suites / 953 green; lint clean.
- **Lead: dependency and platform config.** `expo-location` ~19.0.8;
  app.json plugin, iOS `NSLocationDefaultAccuracyReduced`, Android
  FINE and BACKGROUND location blocked; privacy guard extended so the
  adapter is the only door and only opens forwards (guard green on the
  full tree).
- **S1 migration 163 (Sonnet) — reviewed; two follow-ups in flight
  (brand+postcode merge signal in `gyms_submit`, message preview in the
  moderation queue).** Lead review of the privacy-critical bodies:
  `community_set_place` takes text only and stores the PLACE centroid;
  `_community_profile_card` exposes `age_band` only through the
  consented column; every fallback and filter branch keeps
  `is_minor = false`; `community_report('message')` requires the caller
  to be a party and names the sender as owner. Weights +2/+1/+1 for
  place reasons confirmed. Lane tests 6 suites / 289 green; full
  `src/__tests__` scope 108 suites green.
- **S3 Find people filters and fixes (Sonnet; died on the 11:00 UTC
  rate limit at its last tests, resumed by a second Sonnet lane against
  the on-disk work) — landed after lead review.** `PeopleFiltersSheet.js`
  (draft-then-apply; age band section renders only when the caller's
  own `tp_age_band` is present, which the server nulls for minors and
  non-sharers), `reasons.js` (four tokens, fixed copy, `same_place`
  reads the row's own `place_label`), `findPeople.js` (`_filters`
  passthrough, keyset cursor, fallback rows), `ProfileCard.js` (place
  and age band chips; `can_connect === false` shows Follow with the
  refusal line), `TrainingProfileLine.js` + `trainingProfile.js`
  (shared `previewLine` includes the band), `CommunityTrainingProfileScreen.js`
  (minor filter matches Join), `CommunityConversationScreen.js`
  (`refSent` is per mount, never derived from row count),
  `CommunityHubScreen.js`/`feed.js` (unrendered suggestion fetch
  removed). The resume lane also fixed a privacy-guard hit (the bare
  word `age` in two discovery files, renamed to `ageLabel`/`ageBand`)
  and four list-header tests that the flash-list mock cannot render.
  Lane scope 31 suites / 1327 green; full repo 1256 suites / 18676
  green at that point; lint clean.
- **Lead slip, corrected:** earlier board commits used `git add -A`
  and swept in-flight lane files into intermediate commits. From here
  files are staged explicitly after review.

## 3. Verification
(lint, tests, guards, device checklist; filled at landing)
