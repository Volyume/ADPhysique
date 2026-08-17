# Progress Scan Production-Chain Trace

Campaign 23, Phase 1 (Progress audit), Step 12 + photo→coach chain. Tracing
agent output. Evidence-first; every claim carries a `file:line`. No
recommendations — classification verdicts and facts only.

---

## 1. CAPTURE

**Screen and flow.** `src/screens/ProgressPhotosScreen.js`. Photo capture
uses `expo-image-picker`, lazily required so the screen still imports on a
device where the native module is unavailable:

```
109: // expo-image-picker is a native module; lazy-require so the screen imports in
111: let ImagePicker;
112: try { ImagePicker = require('expo-image-picker'); } catch (_) { ImagePicker = null; }
```
(`src/screens/ProgressPhotosScreen.js:109-112`)

Camera vs. library entry:
```
335: if (!ImagePicker) { toast.show("Photo library isn't available on this device.", { variant: 'warning' }); return; }
338: const opts = { mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images', quality: 0.7 };
341:   perm = await ImagePicker.requestCameraPermissionsAsync();
343:   result = await ImagePicker.launchCameraAsync(opts);
345:   result = await ImagePicker.launchImageLibraryAsync(opts);
```
(`src/screens/ProgressPhotosScreen.js:335-345`)

**Quality/retake gates.** Computed in `src/lib/progressScanVision.js` from
the native module's per-pose signals (lighting, blur, framing, segmentation
confidence, pose confidence, tilt, multi-person). The reason codes and
thresholds:

```
46: const RETAKE_REASONS = new Set([
47:   'too_dark',
48:   'too_blurry',
49:   'whole_body_not_visible',
50:   'multiple_people',
51:   'segmentation_low_confidence',
52:   'clothing_or_background_uncertain',
53:   'pose_not_clear',
54:   'camera_tilted',
55:   'silhouette_implausible',
56: ]);
57: const UNAVAILABLE_RETAKE_REASONS = new Set([
58:   'no_person_detected',
59:   'native_preprocess_unavailable',
60:   'native_preprocess_shape_unusable',
61:   'mask_shape_unusable',
62: ]);
```
(`src/lib/progressScanVision.js:46-62`)

Exact numeric gates:
```
795: if (lightingScore != null && lightingScore < 0.25) reasons.push('too_dark');
796: if (blurScore != null && blurScore < 0.18) reasons.push('too_blurry');
797: if (framingScore < 0.25) reasons.push('whole_body_not_visible');
798: if (segmentationConfidence < 0.30) reasons.push('segmentation_low_confidence');
799: if (separation < 0.20) reasons.push('clothing_or_background_uncertain');
800: if (poseConfidence < 0.22) reasons.push('pose_not_clear');
805: if (bodyTiltDegrees != null && Math.abs(bodyTiltDegrees) > 10) reasons.push('camera_tilted');
806: if (components.count > 1 && componentDominance < 0.78) reasons.push('multiple_people');
```
(`src/lib/progressScanVision.js:795-806`; tilt gate comment at 801-805 cites
a founder real-device evidence tightening from 20° to 10°.)

The retake UI: `retakeCopyForVisionResult` (`src/lib/progressScanVision.js:912-930`)
maps each reason to calm, specific retake copy, wired at
`src/screens/ProgressPhotosScreen.js:903-906` (`appAlert('Retake this photo?', ...)`).

**Raw-image storage: local only.** Progress photos live under the app's
document directory, never a cloud path:
```
32: const BASE_DIR = `${FileSystem.documentDirectory}progress_photos/`;
```
(`src/lib/progressPhotos.js:32`)

Scan sessions/assets rows point at local `uri` values, stored in
`progress_scan_assets.uri` (schema quoted in §3).

**Metadata kept.** Two tables, both local-only (proven in §3):
- `progress_photo_meta`: `name` (PK), `taken_at`, `pose`, `weight_kg`, `note`,
  `created_at`, `updated_at`, plus a `user_id` column added in the v55
  user-scoping migration (`src/lib/database.js:1633-1641`, `2570-2580`).
- `progress_scan_assets`: `id`, `scan_id`, `user_id`, `pose`, `photo_name`,
  `uri`, `taken_at`, `quality_score`, `landmark_confidence`,
  `segmentation_confidence`, `blur_score`, `lighting_score`,
  `framing_score`, `camera_tilt_degrees`, `signals_json`, `created_at`
  (`src/lib/database.js:1724-1740`, `signals_json` added `1749`).

---

## 2. ON-DEVICE PROCESSING

**Native module.** `modules/progress-scan-image` (Expo config-plugin native
module; Kotlin at
`modules/progress-scan-image/android/src/main/java/expo/modules/progressscanimage/ProgressScanImageModule.kt`,
Swift at `modules/progress-scan-image/ios/ProgressScanImageModule.swift`).
JS surface (`modules/progress-scan-image/index.ts:35-41`):
```
35: type NativeShape = {
36:   extractRgb(uri: string, width: number, height: number): Promise<ExtractRgbResult>;
37:   segmentPersonMask?(uri: string, width: number, height: number): Promise<SegmentPersonMaskResult | null>;
38:   resolveBundledModel?(fileName: string): Promise<string | null>;
39:   diagnoseBundledModel?(fileName: string): Promise<BundledModelDiagnostic | null>;
40:   setExcludedFromBackup?(path: string): Promise<boolean>;
41: };
```
`extractRgb` decodes/crops/lights-scores the photo; `segmentPersonMask` runs
an on-device TFLite selfie-segmentation model (bundled asset
`selfie_segmentation_v2.tflite`, referenced at
`src/lib/progressScanVision.js:44-45`) to produce a person mask. No network
call exists in the native module (`grep` for
`network|http|Https|URLSession|OkHttp|fetch` over both native source files
returned no matches) or in the JS pipeline (`grep` for
`fetch(|supabase|axios|XMLHttpRequest` over
`progressScanAnalysis.js`, `progressScanVision.js`, `progressScanStore.js`
and `modules/progress-scan-image/index.ts` returned no matches). Processing
is confirmed on-device only.

**JS pipeline / derived fields.** `src/lib/progressScanAnalysis.js` computes,
from the mask + silhouette ratios:
- `visualLeannessScore` — the "Volyume Score", 0-100
  (`computeVisualLeannessScore`, `progressScanAnalysis.js:551-582`, blended
  with an internal estimator in `blendedVisualLeannessDetails:710-796`).
- `leannessBand` / `leannessBandLabel` — one of `PROGRESS_SCAN_LEANNESS_BANDS`
  (`progressScanAnalysis.js:50` onward), resolved via `leannessBandForScore`
  (`:797-806`).
- `confidence` tier — `'high'|'moderate'|'low'|'not_enough'|'unknown'`
  (`confidenceTier`, `progressScanAnalysis.js:452-461`; label mapper
  `scanConfidenceLabel:465-471`).
- `progressSignal` / `progressSignalLabel` / `progressDirection` — the
  "why it changed" trend read, derived in `explainMeasuredScanDelta`
  (`progressScanAnalysis.js:1307-1463`) and `progressSignalFromDelta`
  (`:870-887`).
- `biasFlags` — `deriveBiasFlags` (`:280-289`), e.g. `large_body`
  (BMI ≥ 30), `side_pose_missing`.
- An internal-only body-fat-percent estimate, `estimateBodyFatFromScanAssets`
  (`progressScanAnalysis.js:1556-1592`), returned as `{ value, confidence:
  'low', source: 'photo_scan', provisional: true, ... }`. This value feeds
  the internal blend of the Volyume Score only (via
  `blendedVisualLeannessDetails`) and is never itself surfaced: `grep` for
  `bodyFatPercent|estimatedBodyFat` over `ProgressPhotosScreen.js` returns no
  match, and the results-contract copy states explicitly: `"It is not a
  body fat measurement, a medical assessment, or a comparison with anyone
  else."` (`src/lib/progressScanResultsContract.js:306`). The display layer
  (`src/lib/progressScanDisplay.js:21-29`) only ever exposes
  `progressScanScoreForDisplay` (a clamped 0-100 integer) and
  `formatVolyumeScore` (`"N/100"` string) — no percentage field.

**Bounds.** Volyume Score display is re-clamped to `[0, 100]` independent of
storage (`src/lib/progressScanDisplay.js:14-19`, "Display re-clamps ... the
display layer never trusts storage"). `estimateBodyFatFromScanAssets`
clamps its internal value to `[clampMin, clampMax]` from the bundled
estimator asset (default 4-55, `progressScanAnalysis.js:1572-1573,1579`).

---

## 3. PERSISTENCE

**Tables and header intent.** `src/lib/database.js` v56 migration comment:
```
1688: // v56, Progress Scan foundation. Local-only, no cloud counterpart:
1689: //   1) rebuild progress_photo_meta as user-scoped so one account cannot read
1690: //      another account's photo metadata on a shared device;
1691: //   2) create scan-session tables for the flagship Progress Scan flow.
1692: // Raw photos, assets and analysis stay on-device and are deliberately NOT in
1693: // SYNC_REGISTRY.
```
(`src/lib/database.js:1688-1693`)

`progress_scan_sessions` schema (columns include the estimator/derived
fields — `estimate_body_fat_percent`, `estimate_range_low/high`,
`estimate_confidence`, `estimate_source`, `trend_direction`,
`trend_magnitude_pct_points`, `quality_score`, `quality_label`,
`model_version`, `estimator_version`, `signals_json`,
`abstention_reasons_json`, `bias_flags_json`, `copy_summary`):
`src/lib/database.js:1696-1723`.

v57 migration comment reiterates: "Still local-only and deliberately absent
from SYNC_REGISTRY." (`src/lib/database.js:1745-1749`).

**Proof of no-sync (source):** `SYNC_REGISTRY` (`src/lib/sync/registry.js:22`)
has no `progress_scan_*` or `progress_photo_meta` entry; `grep` for
`progress_scan|progress_photo` across `src/lib/sync/registry.js`,
`src/lib/sync.js` and every file in `src/lib/sync/tables/` returns only two
non-table matches (AsyncStorage-key exclusion regexes for two device-local
scan preference keys, `src/lib/sync.js:1692-1693`) — zero table rows.

**Proof of no-sync (guard test):**
```
14: test('SYNC_REGISTRY has no progress photo or scan entries', () => {
15:   const tables = SYNC_REGISTRY.map((e) => e.table);
16:   expect(tables).not.toContain('progress_photo_meta');
17:   expect(tables).not.toContain('progress_scan_sessions');
18:   expect(tables).not.toContain('progress_scan_assets');
19: });
21: test('SYNC_REGISTRY has no photo-related table at all', () => {
22:   const tables = SYNC_REGISTRY.map((e) => e.table);
23:   expect(tables.some((t) => /photo|scan/i.test(t))).toBe(false);
24: });
```
(`src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js:14-24`)

**Sign-out / wipe.** `progress_photo_meta`, `progress_scan_sessions`,
`progress_scan_assets` are user-scoped wipe tables
(`src/lib/database.js:6017`) and are also in `FATAL_LOCAL_WIPE_TABLES`
(`src/lib/database.js:6031-6041`) — deleted on sign-out/account-delete,
never orphaned to a next account on a shared device.
`progress_scan_classification_history` (see §5) is separately listed as a
wipe table with its own comment: "local-only progress-scan classification
log. Wiped on every user boundary" (`src/lib/database.js:6018-6021`).

Verdict for this section: raw photos and every derived scan field
(session + asset rows) confirmed local-only, never synced to Supabase.

---

## 4. PRESENTATION

Surfaces that render scan-derived intelligence today:

1. **`ProgressPhotosScreen.js`** (2,643 lines) — the flagship scan flow:
   capture, quality/retake, the Volyume Score result screen, comparison
   entry. Tier-gated: `canWrite = tier === 'pro'`
   (`src/screens/ProgressPhotosScreen.js:167`); non-Pro users reach the
   screen only via a read-only lapse guard and see a view-only timeline
   (`:157-163`, "E10 read-only lapse views ... they have photos... renders
   view-only: the timeline and Compare stay; add, delete and the editable
   viewer are hidden").
2. **`ProgressScanCompare.js` / `ProgressPhotoCompare.js`** (`src/components/`)
   — comparison/side-by-side, gated by `usePhotoSuppression()`
   (`src/components/ProgressScanCompare.js:114`,
   `src/components/ProgressPhotoCompare.js:343`).
3. **`ProgressScanTrend.js`** (`src/components/`) — trend chip, also
   suppression-gated (`:53`).
4. **`AthleteProfileScreen.js`** — the "Volyume Score" stat tile:
   ```
   406: // unscored placeholder, same as `shouldShowPhysiqueScore` already does when
   408: const showPhysiqueScore = !photoSuppressed && shouldShowPhysiqueScore({
   413: const physiqueTile = showPhysiqueScore ? {
   414:   label: 'Volyume Score',
   ```
   (`src/screens/AthleteProfileScreen.js:406-414`), `photoSuppressed` from
   `usePhotoSuppression(user?.id)` (`:275`).
5. **`WeeklyCheckInScreen.js`** — an optional "progress-scan evidence"
   read shown alongside the check-in form (display only; see §5 for proof
   nothing here is submitted with the check-in). Under
   `photoScanSuppressed` the packet is nulled outright
   (`src/screens/WeeklyCheckInScreen.js:657-663`, "Under photo suppression
   the packet is null, so every scan surface on this screen is entirely
   absent, not a neutral placeholder").
6. **`CoachOutputScreen.js`** — a "Progress photos" card folded into the
   coach's narrative text (see §5); render-gated by
   `canShowProgressScanCoachContext = !!progressScanCoachContext &&
   !isPhotoSuppressed(calmMode, edPatternOpen)`
   (`src/screens/CoachOutputScreen.js:2388`).
7. **`BeforeAfterShareSheet.js`** — the founder-approved before/after share
   card. Header states the exact GDPR posture:
   ```
   12: * SAFETY (fail-closed, ahead of everything):
   13: *   - WITHHELD ENTIRELY when usePhotoSuppression() is true (open ED-pattern flag
   14: *     OR calm mode). The suppression check sits BEFORE compose/encode/share, so
   15: *     a suppressed user never reaches the two-photo export at all (§3.8, PART 2).
   16: *     The whole card is withheld, not merely weight-stripped.
   17: *   - Pro-gated: generation re-checks tier live (a pro-to-free flip mid-flow
   18: *     must not generate), and the sheet renders nothing for a non-Pro user.
   19: *   - Weight-on-card is a FOUNDER-APPROVED override of the locked "share cards
   20: *     never include bodyweight" rule (DECISIONS #2). It is an explicit opt-in
   21: *     toggle per export and is bounded by the suppression withhold above;
   22: *     name/measurements/private notes stay banned.
   ```
   (`src/components/BeforeAfterShareSheet.js:12-23`)

**Progress landing tile.** `AnalyticsScreen.js` places `ProgressPhotos` as a
plain, Pro-locked `NavTile` in the same `navGrid` row as `Partners`,
confirmed:
```
495: <View style={styles.section}>
496:   <View style={styles.navGrid}>
497:     <NavTile icon="people" ... label="Partners" pro={tier !== 'pro'} .../>
512:     <NavTile icon="camera" ... label="Progress photos" pro={tier !== 'pro'}
517:       onPress={() => navigation.navigate('ProgressPhotos')} />
```
(`src/screens/AnalyticsScreen.js:495-518`)

---

## 5. COACH INTAKE — THE CORE QUESTION

### 5a. The authoritative decision run is scan-free

`runWeeklyCoach` is called exactly once per screen load, at
`src/screens/CoachOutputScreen.js:1825-1913`. That call object contains no
`photoCorroboration`, `progressScan`, `photo_scan`, `estimateBodyFatPercent`,
`rangeLow` or `rangeHigh` key — confirmed by direct read of the call body
and pinned by a source-guard test:
```
58: test('runWeeklyCoach inputs do not include Progress Scan context', () => {
59:   const body = callBody(SCREEN, 'runWeeklyCoach');
60:   expect(body).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
61: });
```
(`src/screens/__tests__/progressScanCoachIsolation.guard.test.js:58-61`)

The resulting `result` (all calorie/macro/training adjustments, held
decisions, floors) is therefore computed with `photoCorroboration` at its
declared default, `null` (`src/lib/weeklyCoach.js:679`).

### 5b. A real, named engine seam exists — `photoCorroboration` — but is never fed at the decision call site

`runWeeklyCoach`'s destructured parameters include, with JSDoc:
```
672: // D18 (founder decision 2026-07-09, plan-F §4.4): optional caller-supplied
673: // photo-corroboration signal, { eligible: boolean, direction: 'supports' |
674: // 'conflicts' | null }. Defaults null so every existing caller is
675: // byte-identical. It can ONLY raise the EMITTED data-confidence caption by
676: // one bounded step (see the PHOTO CORROBORATION block before the return);
677: // it never reaches any calorie/macro/training/floor path. The engine never
678: // reads a scan itself — the caller derives this from the v2 evidence packet.
679: photoCorroboration = null,
```
(`src/lib/weeklyCoach.js:672-679`)

The engine's own bounded rule, `corroborateConfidenceLevel`
(`src/lib/weeklyCoach.js:282-289`):
```
282: export function corroborateConfidenceLevel(baseLevel, photoCorroboration, { suppressed = false } = {}) {
283:   if (suppressed) return baseLevel;
284:   if (!photoCorroboration || photoCorroboration.eligible !== true) return baseLevel;
285:   if (photoCorroboration.direction !== 'supports') return baseLevel; // never lowers, never originates
286:   const idx = PHOTO_CORROBORATION_CONFIDENCE_LADDER.indexOf(baseLevel);
287:   if (idx < 0) return baseLevel; // 'data_hold' or unknown: never moved
288:   return PHOTO_CORROBORATION_CONFIDENCE_LADDER[Math.min(idx + 1, PHOTO_CORROBORATION_CONFIDENCE_LADDER.length - 1)];
289: }
```
Ladder: `['low', 'medium', 'high']` (`:249`) — never touches `'data_hold'`.

Inside `runWeeklyCoach` this is invoked a second time at the very end of the
run, on the caller-supplied `photoCorroboration` (still `null` in
production, since §5a proved the call site never sets it):
```
2344: const photoCorroborationBlocked = !!(
2345:   edPatternHeld || ffmFloorHeld || rapidWeightLossFlag || safetyHold || scoffPositive || calmMode
2346: );
2352: const emittedConfidenceLevel = corroborateConfidenceLevel(
2353:   confidence.level,
2354:   photoCorroboration,
2355:   { suppressed: photoCorroborationBlocked },
2356: );
2357: const photoCorroborationApplied = emittedConfidenceLevel !== confidence.level;
```
(`src/lib/weeklyCoach.js:2344-2357`) — with `photoCorroboration` null here,
`corroborateConfidenceLevel` short-circuits at line 284 and
`photoCorroborationApplied` is always `false` for this (the persisted) run.
Explicit isolation comment immediately above:
```
2328: // It moves ONLY the emitted `confidence` field. The pre-corroboration
2329: // `confidence.level` is what fed offTargetWeeksRequired and therefore every
2330: // calorie/macro/training/floor decision earlier in this run, so adjustments,
2331: // heldDecisions and all floors stay byte-identical whether or not a scan
2332: // corroborates — the narrowed bounded-delta safety-floor isolation guard
2333: // (D18) pins exactly that.
```
(`src/lib/weeklyCoach.js:2328-2333`)

### 5c. Where the seam IS actually used: a second, render-time-only invocation on CoachOutputScreen

After `runWeeklyCoach` returns and is saved, the screen separately builds a
v2 scan-evidence packet from the engine's OWN already-computed outputs
(`result.trend`, `result.goalPhase`, `result.heldDecisions`), never a re-run:
```
1959: const scanCalorieChange = result.adjustments?.calories?.change;
1960: const scanTargetsChanged = Number.isFinite(scanCalorieChange) && scanCalorieChange !== 0;
1961: const scanEvidencePacket = scanNote ? composeScanEvidencePacket({
1962:   scan: scanCoachSummary,
1963:   note: scanNote,
1964:   weightTrend: result.trend,
1965:   goalPhase: result.goalPhase,
1966:   targetsChanged: scanTargetsChanged,
1967:   heldDecisions: result.heldDecisions,
1968:   loadSignal: result.loadSignal,
1969:   nowMs: Date.now(),
1970: }) : null;
1971: setProgressScanCoachContext(scanNote ? { ...scanNote, packet: scanEvidencePacket } : null);
```
(`src/screens/CoachOutputScreen.js:1959-1971`)

At render time, a SECOND `corroborateConfidenceLevel` call transforms a
DISPLAY-ONLY variable, `displayConfidence`, never re-entering the engine
and never rewritten into `output`/`saveCoachOutput`:
```
2399: // D18 lead ruling (2026-07-09 resume session; docs/ux-world-class-audit-
2400: // 2026-07-09/DECISIONS-2026-07-09.md D18; plan-F §4.4 fork, delegated to
2401: // the lead): a RENDER-TIME-ONLY confidence-caption transform. This never
2402: // writes back to `output`, `saveCoachOutput`, or any synced field --
2403: // runWeeklyCoach above is still ALWAYS called with photoCorroboration
2404: // absent/null, so the persisted/synced coach output stays byte-identical.
2411: const photoCorroborationSignal = derivePhotoCorroborationSignal(scanAssessmentPacket);
2417: const photoCorroborationRenderSuppressed = output.photoCorroborationBlocked !== false;
2418: const displayConfidence = corroborateConfidenceLevel(
2419:   confidence,
2420:   photoCorroborationSignal,
2421:   { suppressed: photoCorroborationRenderSuppressed },
2422: );
```
(`src/screens/CoachOutputScreen.js:2399-2422`)

`displayConfidence` has exactly one consumer, a caption string lookup for
render:
```
2962: {CONFIDENCE_CAPTIONS[displayConfidence] ? (
2964:   {CONFIDENCE_CAPTIONS[displayConfidence]}
```
(`src/screens/CoachOutputScreen.js:2962-2964`) — never re-enters
`runWeeklyCoach`, `coachApply`, or any target/macro/floor path.

### 5d. A second fold: scan text into `coachResponse.interpretation`

`applyProgressScanCoachContext` (`src/lib/progressScanCoachResolver.js:150-163`)
appends the resolved scan note's `coachLine` text onto
`coachResponse.interpretation` (a narrative string, not a decision value):
```
150: export function applyProgressScanCoachContext(coachResponse = {}, scanNote = null) {
151:   if (!scanNote?.coachLine) return coachResponse;
152:   const interpretation = [coachResponse.interpretation, scanNote.coachLine]
153:     .filter(Boolean)
154:     .join(' ');
155:   return {
156:     ...coachResponse,
157:     interpretation: interpretation || null,
158:     progressScanContext: { usedFor: scanNote.usedFor, affectsTargets: false },
159:   };
160: }
```
Call site: `coachResponse = applyProgressScanCoachContext(baseCoachResponse,
canShowProgressScanCoachContext ? progressScanCoachContext : null)`
(`src/screens/CoachOutputScreen.js:2485`). `baseCoachResponse` is itself
built from the already-saved `output`
(`buildRegisteredCoachResponse({ output, ... })`,
`src/screens/CoachOutputScreen.js:2466-2484`) — this folding happens AFTER
`runWeeklyCoach`/`saveCoachOutput` and only changes render-time narrative
text, never the underlying `output` object.

### 5e. `coachApply.js` — zero scan/photo tokens

```
grep -n "scan\|photo\|leanness\|Volyume Score\|photoCorroboration" src/lib/coachApply.js
```
returns no matches. `coachApply.js` never reads scan/photo state.

### 5f. Check-in submission and persisted coach output stay scan-free (source-guarded)

```
96:  // Guard test 7 (integration blueprint §9): check-in persistence stays
97:  // scan-free. saveWeeklyCheckin's COLS map is the only thing that can land
98:  // in the weekly_checkins table; if a future edit ever adds a scan/photo
99:  // column here, this must fail loudly.
100: test('weekly_checkins COLS map carries no scan/photo tokens', () => {
...
106:   expect(saveWeeklyCheckinBody).not.toMatch(/progressScan|progress_scan|photo_scan|scanId|physique/i);
107: });
```
(`src/screens/__tests__/progressScanCoachIsolation.guard.test.js:96-107`)

```
63: test('local Progress Scan context is not persisted into coach_outputs', () => {
64:   const bodies = callBlocks(SCREEN, 'saveCoachOutput');
65:   expect(bodies.length).toBeGreaterThan(0);
66:   for (const body of bodies) {
67:     expect(body).not.toMatch(/progressScan|photo_scan|estimateBodyFatPercent|rangeLow|rangeHigh/i);
68:   }
69: });
```
(`src/screens/__tests__/progressScanCoachIsolation.guard.test.js:63-69`)

**One nuance found and recorded as fact (not a violation):** `runWeeklyCoach`'s
own return object always includes `photoCorroborationApplied` (boolean) and
`photoCorroborationBlocked` (boolean) — see the return blocks at
`src/lib/weeklyCoach.js:887-888` (data-hold branch, hard-coded
`false`/`true`) and `:2394,2398` (main branch). `persistedResult = { ...result,
consecutiveOffTargetWeeks, lastCalAdjustmentWeekStart }`
(`src/screens/CoachOutputScreen.js:2084`) therefore spreads those two
booleans into what `saveCoachOutput` writes
(`src/screens/CoachOutputScreen.js:2092`), and `coach_outputs` DOES sync to
Supabase as a JSON blob (`sync.js:1140-1160`, `output_json: o.outputJson`
at `:1147`). The two booleans carry no scan/photo content: `photoCorroborationApplied`
is always `false` in production (§5b/5c above — `photoCorroboration` is
never non-null at the `runWeeklyCoach` call site), and
`photoCorroborationBlocked` is a pure function of engine-internal safety
states (`edPatternHeld`, `ffmFloorHeld`, `rapidWeightLossFlag`, `safetyHold`,
`scoffPositive`, `calmMode` — `weeklyCoach.js:2344-2346`), none of them
scan-derived. The guard-test regex (`/progressScan|photo_scan|
estimateBodyFatPercent|rangeLow|rangeHigh/i`) does not match the token
`photoCorroboration`, so this pair of always-inert flag names is not
independently pinned by that specific test, though the isolation it depends
on (photoCorroboration always null at the call site) is pinned by the test
quoted in §5a.

### 5g. Reverse direction — does the scan pipeline read coach state?

No. `grep` for `weeklyCoach|coachApply|runWeeklyCoach|getLatestCoachOutput|
coach_outputs` over `src/lib/progressScanAnalysis.js` returns no matches.
Import lists for every scan-side lib module confirm no engine import:
```
progressScanCheckInEvidence.js:84  import { buildProgressScanCoachEvidence } from './progressScanCoachEvidence';
progressScanCoachResolver.js:9     import { PHOTO_SCAN_SOURCE } from './progressScanAnalysis';
progressScanCoachResolver.js:10    import { checkJargon } from './whyThisTemplates';
progressScanCoachEvidence.js:40    import { PHOTO_SCAN_SOURCE } from './progressScanAnalysis';
progressScanAnalysis.js:1-2        import bfEstimatorAsset ...; import { localDayKey, parseLocalDay } from './dayKey';
progressScanVision.js:1            import { logError, logWarn, logInfo } from './errorLog';
progressScanStore.js:1-24          FileSystem, Crypto, db, generateUUID, logError, progressScanAnalysis exports, progressPhotoMeta, progressPhotos, progressScanCalibrationExport
```
No file in that list imports `weeklyCoach.js`, `coachApply.js`,
`nutritionEngine.js` or `planEngine.js`. This direction is a hard no.

### 5h. A dedicated, never-called v1/v2 evidence-builder pair exists, explicitly marked unused in code

`buildProgressScanCoachEvidence` (`src/lib/progressScanCoachEvidence.js:87-129`)
carries this header:
```
12: * This module adds NO new data reads, NO new consumers, and NO behaviour
13: * change: nothing in the app calls `buildProgressScanCoachEvidence` yet. It
14: * exists so that whenever premium-later work is founder-approved, it reads
15: * from ONE named, tested shape instead of reaching back into the resolver's
16: * internals.
```
(`src/lib/progressScanCoachEvidence.js:12-16`) — however this is now
superseded by fact: `composeScanEvidencePacket`
(`src/lib/progressScanCheckInEvidence.js:508-523`) DOES call
`buildProgressScanCoachEvidence` (`:519`), and IS called in production from
both `CoachOutputScreen.js:1961` and `WeeklyCheckInScreen.js:680`. The
module-header claim "nothing in the app calls
`buildProgressScanCoachEvidence` yet" is stale relative to the current
production wiring (see §6 GAP FACTS for how this reconciles with the
classification verdict).

---

## 6. VERDICT: **B — PARTIALLY CONNECTED**

**One-sentence proof:** derived scan outputs (the v1/v2 evidence packets)
reach exactly one authoritative-coach surface — the render-time-only
`corroborateConfidenceLevel` call inside `CoachOutputScreen.js`
(`:2411-2422`) that can raise the DISPLAYED confidence caption by one
bounded step — while the actual decision-producing `runWeeklyCoach` call
(`CoachOutputScreen.js:1825-1913`) is proven, by direct read and by a
dedicated source-guard test (`progressScanCoachIsolation.guard.test.js:58-61`),
to never receive any scan-derived input, so every calorie/macro/training/
floor/held-decision output is byte-identical with or without a scan present.

Supporting evidence summary:
- The engine (`weeklyCoach.js`) DOES have a named, documented intake
  parameter for scan evidence (`photoCorroboration`, `:679`) — this is a
  real seam, not a hypothetical one.
- Production never supplies it at the decision call site (§5a, §5b).
- Production DOES supply it a second time, at render time only, against
  the SAME run's own already-decided output, to move a display caption
  (§5c) — this is the one named seam that is genuinely "live" in the app
  today.
- A second, narrative-only fold exists: scan copy appended to
  `coachResponse.interpretation` for display (§5d).
- `coachApply.js` (the actual apply/write path for calorie/macro changes)
  has zero scan/photo awareness (§5e).
- Check-in payload and persisted `coach_outputs` are proven scan-free by
  source-guard test, aside from two always-inert boolean flag names that
  carry no scan content (§5f/5g nuance).
- The reverse direction (scan reads coach state) is proven absent (§5g).
- A fully-built, tested v1/v2 evidence-packet layer exists
  (`progressScanCoachEvidence.js`, `progressScanCheckInEvidence.js`,
  `progressScanCoachResolver.js`) with richer classification
  (`supports`/`conflicts`/`visual_change_weight_stable`/`inconclusive`) that
  is consumed for DISPLAY (the Coach card, the check-in card, the render-time
  confidence caption, and a local classification-history log) but never for
  any target/macro/floor decision.

This is not classification A (no target/macro/floor path is scan-influenced)
and not classification C (a real, if narrow, seam does reach the
authoritative coach's emitted confidence caption at render time — not
merely the photo screens) and not classification D (the seam is wired,
called every load, and its output renders in production, not dead/
unreachable code).

---

## 7. GAP FACTS (facts only, no design)

**Derived outputs that exist and are bounded/validated today:**
- `visualLeannessScore` (0-100, re-clamped at display —
  `progressScanDisplay.js:14-19`) and `leannessBand`/`leannessBandLabel`
  (`PROGRESS_SCAN_LEANNESS_BANDS`, `progressScanAnalysis.js:50` onward).
- `confidence` tier: `'high'|'moderate'|'low'|'not_enough'|'unknown'`
  (`SCAN_CONFIDENCE_RANK`, referenced in
  `progressScanCheckInEvidence.js:47-52`; only `'high'`/`'moderate'` are
  eligible for the v2 packet's `eligibleForAssessment` gate,
  `progressScanCheckInEvidence.js:423-429`).
- `trendDirection`: `'down'|'up'|'steady'|'uncertain'`
  (`progressScanCheckInEvidence.js:54-59`, `'down'`=leaner,
  `'up'`=softer/fuller).
- v2 packet `status` enum (7 values) and `assessment` enum (6 values):
  ```
  88: export const PROGRESS_SCAN_EVIDENCE_STATUS = Object.freeze([
  89:   'no_scan_ever', 'no_recent_scan', 'valid', 'low_confidence',
  90:   'withheld', 'not_comparable', 'baseline',
  91: ]);
  98: export const PROGRESS_SCAN_ASSESSMENT = Object.freeze([
  99:   'supports', 'conflicts', 'visual_change_weight_stable',
  100:   'inconclusive', 'not_used', 'insufficient_data',
  101: ]);
  ```
  (`src/lib/progressScanCheckInEvidence.js:88-105`)
- `eligibleForAssessment`: gated on scored + High/Moderate tier + comparable
  + in-window + ≥3 comparable points (`progressScanCheckInEvidence.js:440-458`).
- `photoCorroborationSignal` derived shape:
  `{ eligible: boolean, direction: 'supports'|'conflicts'|null }`
  (`derivePhotoCorroborationSignal`, `progressScanCheckInEvidence.js:556-562`).
- An internal, never-surfaced body-fat-percent estimate
  (`estimateBodyFatFromScanAssets`, clamp `[4,55]` default,
  `progressScanAnalysis.js:1556-1592`) — bounded but explicitly
  non-authoritative: `photoScan.source` resolves to `'fallback'` in
  `computeFFMFloor`, proven in
  `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js:44-59`
  (`isAuthoritativeBodyFatSource('photo_scan')` is `false`; a `photo_scan`
  bodyFatPercent cannot lower the FFM calorie floor).

**What legally CANNOT be a scan input, per Section 2, already enforced in
code today (not merely policy):**
- No calorie/macro/target value may derive from the scan — `affectsTargets`
  is a hard-coded literal `false` in three places
  (`progressScanCoachResolver.js:146`, `progressScanCoachEvidence.js:127`,
  `progressScanCheckInEvidence.js:478`), each with a comment stating it is
  "never a variable and never derived" (`progressScanCoachEvidence.js:18-19`).
- No Katch-McArdle / FFM-floor authority — proven by
  `progressScanSafetyFloorIsolation.test.js:44-60` (quoted above) and by
  `isAuthoritativeBodyFatSource`'s explicit allowlist test:
  `expect(NUTRITION).not.toMatch(/bodyFatSource !== 'visual'/)`
  (`progressScanCoachIsolation.guard.test.js:88-93`).
- No body-fat-percentage claim reaches the user (§2 above).

**Provenance/confidence fields that already exist in the v1/v2 evidence
shapes** (so a future contract does not need to invent new plumbing to
GET this data, only to decide whether/how a coach surface may consume it):
`scanId` (always `null` today — "the bounded summary this reshapes carries
no scan id", `progressScanCoachEvidence.js:28-29,92-93`), `capturedAt`,
`validityStatus` (`'scored'|'baseline'|'not_comparable'`, never
`'withheld'` via the real producer chain — documented unreachable state,
`progressScanCoachEvidence.js:32-38`), `withholdReasons` (always `[]` today
— "non-null evidence means, by construction, the resolver did NOT withhold
this scan", `:102-106`), `captureQuality` (all six sub-fields — lighting,
blur, framing, pose, segmentation, tiltDegrees — always `null`; "the
resolver never receives per-asset capture-quality data ... those fields are
therefore always null here; populating them would need new data plumbing,
which is out of this wave's guarded-groundwork scope",
`progressScanCoachEvidence.js:26-31,107-114`), `baselineScanId` (always
`null`, `:115`), `trendWindow.{count,spanDays,direction,magnitudePoints,
comparableOnly}` (`spanDays` always `null`, `:117-122`), `setupFindings`
(non-static limitation codes, e.g. `large_body`, `side_pose_missing`,
`:123-125`), `conflictSource` (v2 packet: `'scale'|null` only — "Performance
conflictSource ... is deliberately NOT implemented ... always returns
conflictSource 'scale' or null, never 'performance'",
`progressScanCheckInEvidence.js:199-209`).

**Data-quality corroboration (already legal, already coded, currently
render-time-only):** the `corroborateConfidenceLevel` one-step confidence
raise (§5b/5c) is the one place existing law has already been applied to
let a strong, agreeing photo trend "corroborate" — never originate or set —
a reading otherwise derived purely from logs/weight-trend. It is scoped
narrowly to the emitted confidence caption and explicitly barred from
`offTargetWeeksRequired` or any downstream calorie/macro/training/floor
computation (`weeklyCoach.js:2328-2333`).

---

## 8. Additional recorded facts

**Scan cadence / comparison-pairing logic** (`scanComparability`,
`src/lib/progressScanAnalysis.js:1213-1291`) — full ordered gate chain,
quoted:
- No current scan → `{ comparable: false, status: 'missing_current' }`.
- No previous scan → `{ comparable: false, status: 'baseline', reason:
  'This is the first scan in the comparison set.' }` (`:1217-1219`).
- Either scan's `analysisStatus` not in `['complete','measured']` →
  not comparable, `"One scan didn't pass the quality check."` (`:1220-1224`).
- Missing required pose set on either scan → not comparable,
  `"Front and back photos are needed on both scans."` (`:1225-1227`).
- Missing `capturedAt` on either → fails closed, `"One scan is missing its
  capture time, so a fair comparison window cannot be confirmed."`
  (`:1228-1240`, "audit D-F3").
- **Civil-day gate, not raw elapsed ms**: `localCivilDayDifference(...) < 7`
  → not comparable, `"Photo sets are too close together for a fair progress
  comparison."` (`:1241-1250`; comment: "a legitimate weekly retake across
  the UK spring-forward is 167 elapsed hours and was falsely blocked" —
  audit D-F4 fix).
- `qualityLabel` of either scan in `['poor','unknown']` → not comparable,
  `"Scan quality was not strong enough for a fair comparison."`
  (`:1251-1255`).
- Confidence tier of either ≤ 0 (`SCAN_CONFIDENCE_RANK`) → not comparable,
  `"One scan did not have enough confidence for a fair comparison."`
  (`:1256-1260`).
- Cross measurement-version pairs fail CLOSED: `"The scan measuring method
  was updated between these two photo sets, so they cannot be fairly
  compared. Your next two scans will compare normally."` (`:1261-1271`).
- Setup-stability check (`scanSetupStability`) → `"The photo setup changed
  too much for a fair comparison."` (`:1272-1282`).
- Otherwise: `{ comparable: true, status: 'comparable', comparableCount:
  REQUIRED_SCAN_POSES.length, scanConfidenceTier: lowerConfidenceTier(...) }`
  (`:1283-1290`).

Note: `PROGRESS_SCAN_MIN_COMPARISON_INTERVAL_MS = 7 * 86400000`
(`src/lib/progressScanAnalysis.js:13`) is defined but **not** what enforces
the 7-day gate above — the live gate is
`localCivilDayDifference(...) < 7` (`:1243`), a civil-day count, not this
millisecond constant. `grep` for
`PROGRESS_SCAN_MIN_COMPARISON_INTERVAL_MS` across `src` outside test files
returns only its own definition line — **unused/dead constant**.

**Other dead-code / unused-field facts:**
- `buildProgressScanCoachEvidence`'s own module header
  (`progressScanCoachEvidence.js:12-14`) states "nothing in the app calls
  `buildProgressScanCoachEvidence` yet" — this is now stale: it IS called
  in production via `composeScanEvidencePacket`
  (`progressScanCheckInEvidence.js:519`), itself called from
  `CoachOutputScreen.js:1961` and `WeeklyCheckInScreen.js:680` (§5c, §5h).
- v1 evidence's `captureQuality` object (six sub-fields), `scanId`,
  `baselineScanId`, `trendWindow.spanDays` and `withholdReasons` are always
  `null`/`[]` by construction today (quoted in §7) — populated fields with
  no live producer yet, documented as such in the module's own header
  rather than silently absent.
- `resolveBundledModel` / `diagnoseBundledModel` /
  `setExcludedFromBackup` (`modules/progress-scan-image/index.ts:64-86`) are
  diagnostic/support native calls; not traced further in this pass (out of
  scope — capture/processing/persistence/coach-intake was the brief).

---

## FINAL SUMMARY FOR THE LEAD

1. **File written:**
   `docs/progress-audit-campaign-23-2026-08-17/PHOTO-SCAN-CHAIN-TRACE.md`
   (this file).
2. **Chain verdict: B — PARTIALLY CONNECTED.** One-sentence proof: the
   authoritative decision-making `runWeeklyCoach` call
   (`CoachOutputScreen.js:1825-1913`) never receives scan-derived input
   (pinned by `progressScanCoachIsolation.guard.test.js:58-61`), but a
   second, render-time-only invocation of the engine's own
   `corroborateConfidenceLevel` rule (`CoachOutputScreen.js:2418-2422`)
   consumes the v2 scan-evidence packet to raise the DISPLAYED confidence
   caption by one bounded step, and a narrative-only fold appends scan copy
   to `coachResponse.interpretation` (`CoachOutputScreen.js:2485`) — both
   display-only, neither reaching any calorie/macro/training/floor/
   held-decision value.
3. **Derived-output inventory (field names + bounds):** `visualLeannessScore`
   (0-100), `leannessBand`/`leannessBandLabel` (band enum), `confidence`
   tier (`high|moderate|low|not_enough|unknown`), `trendDirection`
   (`down|up|steady|uncertain`), v2 `status` (7-value enum), v2 `assessment`
   (6-value enum), `eligibleForAssessment` (boolean, gated ≥3 comparable
   points + High/Moderate tier), `photoCorroborationSignal`
   (`{eligible, direction}`), internal non-surfaced body-fat estimate
   (clamp 4-55, `source:'fallback'` for FFM-floor purposes, never
   authoritative) — full detail in §7.
4. **Senior-constraint violations found: none.** No body-fat percentage is
   ever displayed to a user (§2, confirmed via display-layer read and the
   results-contract disclaimer quoted verbatim). No calorie recommendation
   derives from the scan (`affectsTargets` hard-coded `false` in three
   places, §7). No Katch-McArdle authority (§7, safety-floor isolation test
   quoted). No cloud inference on raw photos (§2, no network calls found in
   the native or JS scan pipeline). Raw photos and every derived scan row
   are local-only, proven by source, migration comments and a dedicated
   guard test (§3). Share-card GDPR law (name/measurements/private-notes
   ban, bodyweight only under the single founder-approved before/after
   exception, withheld under calm/ED) is quoted verbatim from the
   component's own header and matches the constraint exactly (§4). The one
   nuance recorded (§5f) — two always-inert boolean flags riding inside the
   synced `coach_outputs.output_json` blob — carries no scan/photo content
   and is not itself a violation, but is flagged because it sits outside
   the exact guard-test regex.
5. **Untraceable / out of scope for this pass:** the Android/iOS native
   module internals (Kotlin/Swift source) were read only for network-call
   absence, not for a full algorithmic trace of the TFLite
   segmentation/silhouette math — that computation is asserted from the JS
   call sites and the calibration/validation doc
   (`docs/progress-scan-validation.md`), not re-derived line-by-line from
   the native code. `resolveBundledModel`/`diagnoseBundledModel`/
   `setExcludedFromBackup` native support calls were identified but not
   traced further (diagnostic/support paths, not part of the
   capture→process→persist→coach-intake chain the brief scoped).
