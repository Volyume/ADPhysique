# A1 — Internal Code Audit: Progress Photos (VOLYUME)

READ-ONLY audit. Every claim is file:line-sourced. Scope: `src/lib/progressPhotos.js`,
`src/screens/ProgressPhotosScreen.js`, their tests, navigation wiring, the sync layer,
consent/privacy, and the bodyweight data seam.

---

## 1. DATA MODEL TODAY

**Storage location.** All photos live in a single device-local directory:
`${FileSystem.documentDirectory}progress_photos/` — `src/lib/progressPhotos.js:16`
(`const DIR`), exposed by `photoDir()` at `:18`. This is the app's private document
directory via `expo-file-system/legacy` (`:14`). Never a cloud bucket.

**Per-photo data model.** A photo is *only a file*. There is no row, no JSON sidecar
per photo, no EXIF read. The entire model is the filename: `<epochMs>.jpg`
(`src/lib/progressPhotos.js:8` header; `saveProgressPhoto` builds `${DIR}${ts}.jpg`
at `:55`). In-memory a photo is the object `{ name, uri, ts }` built by `orderPhotos`
(`:30`), where `uri = DIR + name` and `ts = timestampFromName(name)`.

**Is a capture DATE/timestamp stored, or only derivable?** It is *derived only*, never
stored as independent metadata. The capture timestamp IS the filename; it is parsed
back out with the regex `/^(\d+)\.jpg$/` in `timestampFromName` (`:22-25`) and used
for ordering + display. Consequence: the timestamp is the *save/copy* time
(`Date.now()` at `:54`, injectable as `nowMs`), NOT a true camera-capture EXIF time.
Re-importing an old library photo stamps it "now". There is no separate "date taken"
field anywhere.

**Filename scheme.** `<epochMs>.jpg` (fixed `.jpg` extension regardless of source
format). Foreign filenames (`IMG_0001.jpg`, `notes.txt`, `.DS_Store`) parse to `null`
and are filtered out of the gallery (`:31-32`; test `progressPhotos.test.js:37-39`).

**Owner-marker sidecar.** One directory-level sidecar `owner.txt`
(`src/lib/progressPhotos.js:75` `OWNER_FILE = ${DIR}owner.txt`). It holds a single
string: the signed-in `userId` who owns the gallery (`markPhotosOwner` writes it at
`:81`). It is per-DEVICE, not per-photo. It never appears in the gallery because it
fails the `<ms>.jpg` filter (test `progressPhotos.test.js:85-87`).

**Every exported function** in `src/lib/progressPhotos.js`:
- `photoDir()` `:18` — returns `DIR`.
- `timestampFromName(name)` `:22` — parse epoch-ms from `<ms>.jpg`, else `null`.
- `orderPhotos(names)` `:28` — pure; maps to `{name,uri,ts}`, drops non-ours, sorts newest-first.
- `ensurePhotoDir()` `:35` — mkdir (intermediates) if absent; swallows errors.
- `listProgressPhotos()` `:42` — ensures dir, reads dir, returns `orderPhotos(...)`; `[]` on failure.
- `saveProgressPhoto(srcUri, nowMs)` `:51` — copies src into `${DIR}${ts}.jpg`; returns `{name,uri,ts}` or `null`.
- `deleteProgressPhoto(uri)` `:60` — `deleteAsync(idempotent)`; returns bool.
- `markPhotosOwner(userId)` `:77` — writes `owner.txt`; best-effort.
- `photosViewableBy(userId)` `:90` — fail-closed read gate (see §4).

No update/rename/tag/note function exists. No metadata mutation surface at all.

---

## 2. SCREEN + COMPONENT TREE (`src/screens/ProgressPhotosScreen.js`)

**Component tree** (single functional component `ProgressPhotosScreen`, `:34`):
- `SafeAreaView` (`:200`)
  - Header `View` (`:201`): back `TouchableOpacity` (`:202`); title "Progress photos"
    (`:205`); add `TouchableOpacity` (`:209`) **only when `!readOnly`**, else a 26px
    spacer `View` (`:213`).
  - Privacy `note` `Text` (`:217-222`) — calm/read-only variants (see ED gate below).
  - Compare bar `View` (`:224-261`) — shown when `!loading && (selecting || photos.length >= 2)`.
  - Body: `ActivityIndicator` while loading (`:264`) / empty state (`:265-269`) /
    `FlashList` grid (`:271-318`, `@shopify/flash-list`, `COLS = 3` at `:26`).
  - Compare `Modal` (`:322-361`) — side-by-side two-pane comparison.

**Capture path — CAPTURE EXISTS.** `expo-image-picker` is lazy-required (`:23-24`,
mirrors ShareCard, so the screen imports under node tests). `pickFrom(source)` (`:85`):
- camera branch: `requestCameraPermissionsAsync()` (`:95`) then
  **`ImagePicker.launchCameraAsync(opts)`** (`:97`).
- library branch: `requestMediaLibraryPermissionsAsync()` (`:99`) then
  **`ImagePicker.launchImageLibraryAsync(opts)`** (`:101`).
- `opts` = `{ mediaTypes: Images, quality: 0.7 }` (`:92`). Result URI saved via
  `saveProgressPhoto(uri)` (`:106`) then `refresh()`. Both capture and library import
  are fully wired. `onAdd()` (`:115`) is the `appAlert` action sheet offering
  "Take photo" / "Choose from library" (`:117-118`).

**Thumbnail grid.** `FlashList` (`:271`), 3 columns, `keyExtractor` = `item.name`
(`:274`), cell size computed at `:191`. Each cell renders an `Image` at `size×size`
with `radius.md` (`:304`). Selection overlay (edge + check) at `:305-312`.

**Tap action — DELETE-ONLY outside compare.** `onPress` at `:294`:
`selecting ? toggleSelect(item) : (readOnly ? undefined : onPressPhoto(item))`.
Outside selection and when Pro, a plain tap calls `onPressPhoto` (`:123`), whose only
action is a delete `appAlert` ("Remove this photo from your device?", `:124`). There
is **no full-screen single-photo viewer** — tapping a thumbnail can only delete it (or,
in selection mode, choose it). The delete handler re-checks live tier before deleting
(`:132`).

**Existing minimal Compare (enhancement B6).** State: `selecting`, `selected` (names,
max two, tap order), `compareOpen`, `compareLoadFailed` (`:60-63`). `toggleSelect`
(`:143-149`): tapping a chosen photo unchooses; a 3rd tap replaces the EARLIEST choice
(`return [prev[1], item.name]` at `:147`). Pair is sorted older-left/newer-right
regardless of tap order (`:161`). `openCompare` guards `pairReady` (`:174-178`). Modal
(`:322`) shows two `Image` panes, `resizeMode="contain"` + `resizeMethod="resize"`
with bounded `paneW/paneH` (`:196-197`, `:344-352`) — the named Android decode-memory
mitigation. Copy is **dates + neutral "Earlier"/"Later" labels ONLY** (`:335-355`);
no deltas/measurements/before-after. Failed loads log `ProgressPhotos.compare` and show
a calm fallback (`:185-188`, `:339-342`).

**Calm-mode / ED-flag handling — EXACT fail-closed read quoted** (`refresh`, `:65-81`):
```js
const [rows, mode] = await Promise.all([
  listProgressPhotos(),
  AsyncStorage.getItem(WELLBEING_KEY).then(v => v || 'unspecified').catch(() => 'read_failed'),
]);
setPhotos(rows);
setCalm(isCalm(mode) || mode === 'read_failed');
```
It reads the RAW `WELLBEING_KEY` (not the fail-open `getWellbeingMode()` helper) and
maps a genuine read error to the truthy sentinel `'read_failed'`, treated as calm
(`:73`, `:76`). Calm true swaps in the longer "Use these only if they help you, and
skip them if they do not." note (`:218-220`). Note: this screen reads the **wellbeing/
calm flag** only; it does NOT read the open-ED-pattern flag (`getOpenEdPatternFlag`),
unlike YearOfLifts — see GAP #G13.

**Read-only lapse (free-tier) view (E10).** `tier` from store (`:41`),
`readOnly = tier !== 'pro'` (`:42`). In read-only: add button hidden (`:208-214`);
plain tap disabled, `onPress` undefined, `accessibilityRole="image"` (`:294-296`);
note appends "View-only on the free plan. Your photos are safe and stay yours."
(`:221`); empty text becomes "No photos on this device." (`:268`). Compare stays fully
available (pure viewing). Owner marker is (re)stamped while a Pro user is on-screen:
`useEffect(() => { if (!readOnly && userId) markPhotosOwner(userId); }, ...)` (`:49-51`).
Write handlers additionally re-check `useAppStore.getState().tier !== 'pro'` at execution
time (`:88`, `:132`) to defeat a pro→free flip with an alert already open.

---

## 3. LOCKED INVARIANTS (tests are the contract; ED-safety flagged ⚠️)

**`src/lib/__tests__/progressPhotos.test.js`:**
- `timestampFromName` parses `<ms>.jpg`, rejects everything else (`:26-32`).
- `orderPhotos` newest-first, ignores foreign files, builds uri under photo dir (`:36-40`);
  empty/undefined → `[]` (`:41-44`).
- ⚠️ `photosViewableBy` (E10 read-only guard, **fail closed**): true only when photos
  exist AND marker names this user (`:54-57`); a DIFFERENT account refused (`:59-62`);
  missing/unreadable marker fails CLOSED (`:64-67`); no photos → false (`:69-73`);
  null userId refused without touching FS (`:75-78`); `markPhotosOwner` writes
  `owner.txt` (`:80-83`); owner sidecar never appears in gallery (`:85-87`).

**`src/screens/__tests__/ProgressPhotosScreen.compare.test.js`:**
- Compare affordance hidden with 0/1 photo, shown with ≥2 (`:150-154`); empty state
  still mounts (`:156-159`).
- Selection picks EXACTLY two; 3rd tap replaces earliest (pinned) (`:163-180`); tapping
  a chosen unchooses, compare can't open with <2 (`:182-193`); ⚠️ selection taps never
  open delete, normal taps still do (`:195-208`).
- ⚠️ Compare view renders older-left/newer-right with date labels and **nothing else** —
  strict ALLOWLIST `['Compare','Earlier',date,'Later',date]` (`:212-234`).
- ⚠️ No measurement/delta/before-after vocabulary anywhere in the modal — regex bans
  `before|after|change|gained|lost|weight|kg|lbs|cm|delta|leaner|bigger|smaller|%|—`
  (`:236-250`); ⚠️ the SELECTION BAR copy held to the same ban (`:252-270`).
- Panes decode at explicit bounded dims with `resizeMode="contain"` + `resizeMethod="resize"`,
  never unbounded — the named memory risk (`:272-293`).
- Failed load logs `ProgressPhotos.compare` + shows calm fallback, other pane survives
  (`:295-310`).
- Reduce motion → modal `animationType="none"` (`:312-317`).
- ⚠️ **Calm-mode wellbeing note byte-identical** to pre-compare wording, with Compare
  present (`:321-328`); normal-mode short note preserved (`:330-333`). "the gate around
  this screen must not be weakened by B6" (`:16-17`).
- E10 read-only (tier 'free'): add button hidden + "View-only on the free plan."
  (`:340-344`); plain tap can't reach delete, `onPress` undefined + disabled (`:346-353`);
  Compare still works (`:355-364`); Pro unchanged (`:366-371`).

**`src/__tests__/lapsedReadOnly.guard.test.js`** (source-regex guards):
- ⚠️ EXACTLY three routes use `withReadOnlyProGuard`: BodyMetrics, Diary, ProgressPhotos
  (`:30-34`); every food/cardio mutation route stays hard-locked (`:36-49`); the three
  screens derive `const readOnly = tier !== 'pro';` internally (`:51-59`); guard read
  fails CLOSED → ProLocked (`:61-68`); photos guard user-scoped via marker, failing
  closed (`:126-131`); guard races history read vs 4000ms fail-closed timeout (`:133-135`).

**`src/screens/__tests__/wellbeingFailClosed.guard.test.js`** ⚠️ (ED-safety fail-closed):
- ProgressPhotos (among 5 screens) must read raw `WELLBEING_KEY` with a `'read_failed'`
  sentinel on error (`:49-53`), must NOT import/call `getWellbeingMode()` (`:55-62`),
  must import `WELLBEING_KEY` + `AsyncStorage` (`:64-70`).

**`src/components/__tests__/ProGate.readOnlyGuard.test.js`** — pins `withReadOnlyProGuard`
including a "Progress photos" case (`:129`).

**`src/__tests__/e8FlashList.guard.test.js`** — pins ProgressPhotos grid uses FlashList (`:29`).

---

## 4. SYNC / CONSENT / PRIVACY — PROOF PHOTOS NEVER UPLOAD

**Sync exclusion (proven).**
- The sync registry `SYNC_REGISTRY` in `src/lib/sync/registry.js:22-230` enumerates
  EVERY syncable table (spec: "adding a table to sync is adding a row here", `:4-5`).
  The full list: weekly_checkins_v2, weight_log, food_entries, custom_foods,
  saved_meals, recipes, recipe_ingredients, food_favourites, daily_water,
  daily_intake_rollups, daily_steps, cardio_log, ed_pattern_flags, tier_history,
  body_composition_log, nutrition_targets, profiles, notification_preferences,
  partner_signals, meal_plans, plan_folders. **No photo table. No file/blob entry.**
- `grep -i 'photo' src/lib/sync/**` → **No matches found** (registry, transport,
  runner, tables/, sync.js). The sync engine has literally no photo code path.
- `saveProgressPhoto` (`src/lib/progressPhotos.js:51-58`) calls only
  `FileSystem.copyAsync` into the local private dir — no Supabase client, no upload,
  no `_scheduleSync()` (contrast `logBodyMetric` at `database.js:3643` which DOES call
  `_scheduleSync()`). Photos are the only body-data surface that never touches sync.
- Module header states the intent explicitly: "DEVICE-LOCAL only ... never synced to
  Supabase, never uploaded, never shared automatically, never gamified"
  (`src/lib/progressPhotos.js:1-9`).

**Cloud residue (dormant, NOT a live upload path).** A `progress_photos` Postgres table
appears only in STALE snapshots and defensive delete RPCs:
`supabase/schema.sql:261-272` (table + RLS), `supabase/setup_complete.sql:251/630`.
Every delete RPC guards it with `EXCEPTION WHEN undefined_table` /
`IF EXISTS ... pg_tables` (`migrate_003:17`, `migrate_005:168-173`, `migrate_006:44`,
`migrate_008:38`, `migrate_025:88`, `migrate_062:92`, `migrate_096:127`) — i.e. the
table may not even exist in EU-Dublin, and nothing in the app ever INSERTs to it (no
client code references the table; only `src/lib/progressPhotos.js` file APIs exist).
The delete-completeness coverage means *if* a legacy row ever existed, account deletion
purges it. Net: no code path uploads a body photo. ✅ Proven.

**Consent / privacy (Article 9).**
- Photos are special-category (body image) data; the design keeps them off every
  external service, satisfying data-minimisation (`progressPhotos.js:2-9`). No PII/photo
  to Sentry/analytics is possible because photos never leave the file system.
- The route is Pro-gated (§5); there is no separate per-photo Article 9 consent prompt —
  privacy is enforced structurally (device-local + private dir) rather than by a consent
  gate. (See GAP #G12 re: no explicit in-screen consent/first-use acknowledgement.)
- **Owner-marker fail-closed guard** (`photosViewableBy`, `progressPhotos.js:90-98`):
  ```js
  export async function photosViewableBy(userId) {
    if (!userId) return false;
    try {
      const photos = await listProgressPhotos();
      if (photos.length === 0) return false;
      const owner = await FileSystem.readAsStringAsync(OWNER_FILE);
      return String(owner).trim() === String(userId);
    } catch (_) { return false; }
  }
  ```
  On a shared device, the read-only lapse guard (RootNavigator, §5) only opens the
  view-only gallery when the marker matches the signed-in user. No marker, mismatch, or
  any read error → `false` (never the gallery). This stops account B seeing account A's
  body photos (`progressPhotos.js:64-73` rationale). ⚠️ Privacy-critical.

---

## 5. BODYWEIGHT DATA SEAM (for a later bodyweight-at-photo join)

**Where weigh-ins / bodyweight live locally (SQLite, `src/lib/database.js`):**
- `body_metric_log` — created `:276-282`; columns include `weight_kg REAL` (`:280`),
  body-fat, and circumference measurements (`:373-376`); indexed
  `idx_body_log_user (user_id, logged_at)` (`:320`); has `updated_at`/`deleted_at`
  for sync (`:683-684`). Accessors: `logBodyMetric` (`:3624`, writes + `_scheduleSync`),
  `getBodyMetricLog(userId, limitRows=90)` ordered `logged_at DESC` (`:3647-3654`).
- `morning_weights` — created `:458-465` (`weight_kg REAL NOT NULL`, `logged_at`),
  indexed `idx_morning_weights_user (user_id, logged_at)` (`:466`). Accessors:
  upsert-per-day (`:4358-4384`), `getMorningWeightsLast14Days` (`:4386`),
  `getMorningWeights(userId, limit=90)` (`:4396`), `getMorningWeightToday` (`:4405`).

**Nearest-weight-to-a-date query path.** The closest existing accessor is
`getLatestBodyWeight(userId)` — `src/lib/database.js:3656-3687`. It reads the MOST
RECENT non-null `weight_kg` from BOTH `body_metric_log` (`:3660-3663`) and
`morning_weights` (`:3665-3669`) in parallel and returns whichever has the greater
`logged_at` (`:3672-3676`), as `{ weightKg, loggedAt }`. **Caveat for the photo join:**
this returns *latest overall*, NOT nearest-to-an-arbitrary-date. **No "weight nearest to
timestamp T" query exists today** — a photo-at-date bodyweight join would need a new
accessor (e.g. `ORDER BY ABS(logged_at - T) LIMIT 1`, or nearest-on-or-before). Also
note the onboarding baseline weight is NOT in the DB — it lives in
`userProfile.weightKg` (AsyncStorage), and a prior `user_body_profile.weight_kg` fallback
never worked (`:3678-3686`). The photo screen is reached from BodyMetrics
(`BodyMetricsScreen.js:825` navigates to `ProgressPhotos`), so the two surfaces already
sit in the same domain/stack.

---

## 6. GAP ENUMERATION vs a best-in-class progress-photo feature

- **G1 — No pose/category tagging (front/side/back).** Model is filename-only; a photo
  has no angle/pose field. `src/lib/progressPhotos.js:8`, `:30`. Best-in-class groups by
  pose for like-for-like compare.
- **G2 — No true capture date; timestamp = import/copy time.** `nowMs`/`Date.now()`
  stamped at save (`progressPhotos.js:54`), never read from EXIF. Re-imported old photos
  mis-sort. No editable "date taken".
- **G3 — No bodyweight (or any metric) captured with a photo.** No join to
  `body_metric_log`/`morning_weights`; and no nearest-to-date accessor exists
  (§5; `database.js:3656`). Best-in-class shows weight beside each shot.
- **G4 — No full-screen single-photo viewer / zoom.** A non-selecting tap can ONLY
  delete (`ProgressPhotosScreen.js:294`, `:123-138`). No pinch-zoom, no swipe-through.
- **G5 — No metadata after capture (notes / tags / edit date).** No update/rename API in
  the lib (`progressPhotos.js` exports, §1). Delete is the only mutation.
- **G6 — No album/date grouping or timeline.** Flat newest-first grid only
  (`progressPhotos.js:32`; `ProgressPhotosScreen.js:271-318`). No month headers, no
  scrub-by-date.
- **G7 — Compare limited to exactly two, no alignment/overlay/slider.** `toggleSelect`
  caps at two (`ProgressPhotosScreen.js:143-149`); modal is static side-by-side
  (`:334-359`). No 3+ grid, no ghost-overlay, no drag-slider, no pose auto-match.
- **G8 — No export/share of any kind (by design, but a gap vs competitors).** No
  ShareCard entry (confirmed `research/connection-corpus/internal/A3-interaction-surfaces.md:276`);
  no save-to-camera-roll, no collage. Deliberate per ED-safety, but flagged.
- **G9 — No backup / cross-device continuity.** Photos are device-local and excluded
  from sync (§4); a new device / reinstall loses the entire gallery silently. No local
  encrypted export either.
- **G10 — No storage management / quota / thumbnail cache.** Full-res `.jpg` copied at
  `quality:0.7` (`ProgressPhotosScreen.js:92`, `progressPhotos.js:56`); grid decodes
  full files into `size×size` `Image`s (`:304`) with no thumbnail generation — memory
  risk noted only for compare panes (`:194-197`), not the grid.
- **G11 — Timestamp collision risk.** Filename key is `<epochMs>.jpg`
  (`progressPhotos.js:55`); two saves in the same millisecond overwrite (copyAsync to
  identical path). No uid/suffix disambiguation.
- **G12 — No explicit first-use privacy/consent acknowledgement.** Privacy is only a
  passive note (`ProgressPhotosScreen.js:217-222`); no one-time "these stay on your
  device, tap to acknowledge" gate despite special-category data (§4).
- **G13 — Screen reads calm flag but NOT the open-ED-pattern flag.** `refresh` reads
  only `WELLBEING_KEY` (`ProgressPhotosScreen.js:71-76`); unlike YearOfLifts it never
  consults `getOpenEdPatternFlag`. A best-in-class ED-safe design might soften/suppress
  the body-image surface under an open ED flag, not only under calm mode. (Flag for
  founder decision — do NOT change ED behaviour without approval.)
- **G14 — No empty/first-run guidance on consistency (lighting, same pose, cadence).**
  Empty state is a single line (`ProgressPhotosScreen.js:266-269`); no guidance to make
  photos comparable over time.
- **G15 — Owner marker is single-user per device; second Pro user overwrites it.**
  `markPhotosOwner` last-writer-wins (`progressPhotos.js:77-83`); on a genuinely shared
  device the gallery is shared storage — user B (Pro) sees user A's photos in the Pro
  screen (the marker only gates the *read-only lapse* view, not the Pro view). Noted in
  header (`:66-73`) but a real multi-user-device gap.
- **G16 — No filename hardening against stray/large files.** `orderPhotos` filters
  non-`<ms>.jpg` (`progressPhotos.js:31`), but there is no size cap, count cap, or
  cleanup of orphaned temp copies; `readDirectoryAsync` on a huge dir is unbounded
  (`:45`).
