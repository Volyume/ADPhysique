# Scout report: Current system map

## Files inspected
- `src/lib/database.js` (schema, lines ~1540-1730, ~4110-4330)
- `src/lib/progressPhotos.js`, `progressPhotosController.js`, `progressPhotoMeta.js`,
  `progressPhotoDates.js`, `progressPhotoTimeline.js`, `progressCaptureGuide.js`
- `src/lib/progressScanAnalysis.js` (1584 lines, read 1-1122), `progressScanStore.js`,
  `progressScanVision.js`, `progressScanPreferences.js`, `progressScanDisplay.js`,
  `progressScanCopy.js`, `progressScanCompareViewModel.js`, `progressScanCoachResolver.js`,
  `progressScanCalibrationAccess.js`, `progressScanCalibrationExport.js`
- `src/lib/nutritionEngine.js` (grep + lines 695-730), `weeklyCoach.js` (grep, no hits),
  `coachApply.js` (grep, no hits)
- `src/screens/CoachOutputScreen.js` (grep + lines 1350-1450), `ProgressPhotosScreen.js`,
  `AthleteProfileScreen.js` (grep, lines 60-580 excerpted), `YouScreen.js` (grep),
  `SettingsDataScreen.js` (grep), `Article9ConsentScreen.js` (grep)
- `src/navigation/RootNavigator.js` (grep + lines 180-225)
- `src/store/useAppStore.js` (grep — no matches)
- `src/components/ProgressGhostCapture.js`, `ProgressPhotoCompare.js`, `ProgressPhotoPrompt.js`,
  `ProgressPhotoViewer.js`, `ProgressScanCompare.js`, `ProgressScanHistoryCard.js`,
  `BeforeAfterShareSheet.js`, `PhotoDateRangeSheet.js`, `PhotoDetailsSheet.js`, `PhotoDatePicker.js`
- `src/lib/shareCard/beforeAfterParams.js`, `drawShareCard.js`
- `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js`, `src/lib/sync/tables/partners.js` (grep)
- `modules/progress-scan-image/index.ts`, `.../ios/ProgressScanImageModule.swift`,
  `.../android/.../ProgressScanImageModule.kt` (index.ts read; native files located, not fully read)
- `assets/ml/README.md`, `assets/ml/progress_scan_bf_estimator_v1.json` (README read)
- `supabase/migrate_104_photo_prompt_telemetry.sql`
- `package.json` (camera/image-picker dependency check)

## Search terms used
progress photo / progressPhoto, progress scan / progressScan, physique score / physiqueScore,
body score / bodyScore, visual score / visualScore, scan result / scanResult, image analysis,
transformation, progress media, photo comparison, scan history, before/after / beforeAfter,
photo, camera, image picker, expo-camera, expo-image-picker, VisionCamera, pose, silhouette
(all case-insensitive; combined regex sweep first, then targeted per-file greps).

## Current-state evidence

**Feature names used in the code itself:**
- "Progress photos" — the raw on-device photo gallery (`src/lib/progressPhotos.js`, `ProgressPhotosScreen.js`).
- "Progress Scan" — the guided, pose-based capture + on-device analysis flow
  (`progressScanStore.js`, `progressScanAnalysis.js`, `progress_scan_sessions`/`progress_scan_assets` tables).
- "Volyume Score" (internally `visualLeannessScore`, `assessmentVersion: 'volyume_physique_scan_score_v2'`,
  constant `PROGRESS_SCAN_SCORE_VERSION`) — the 0-100 leanness score with a band
  (`PROGRESS_SCAN_LEANNESS_BANDS`: Foundation → Peak Condition), a Scan Confidence tier
  (high/moderate/low/not_enough), and a Progress Signal (baseline/clear_positive/…/inconclusive).
  `src/lib/progressScanAnalysis.js:9,39-74,729-813`.
- The Progress Photos / Progress Scan gate label shown to users is literally
  `'Progress photos and Volyume Score'` — `RootNavigator.js:189`.

**Routes/screens** (`src/navigation/RootNavigator.js:189,432,478`):
- `ProgressPhotos` → `ProgressPhotosScreen.js`, gated by `withReadOnlyProGuard` keyed on
  `photosViewableBy(userId)` (free users with existing photos get read-only view; no photos → hard Pro lock).
  Registered twice (two stacks, `RootNavigator.js:432,478`).
- No separate "Progress Scan" route — Progress Scan lives inside `ProgressPhotosScreen.js`
  (imports `addProgressScanAsset`, `createProgressScanSession`, `finishProgressScanSession`,
  `listProgressScanEntries`, etc. — `ProgressPhotosScreen.js:26-34`).
- `AthleteProfileScreen.js` shows a "Physique Score" stat tile fed from the latest scan
  (`shouldShowPhysiqueScore`, `physiqueScoreTileValue/Sub`, lines 107-133, 372-394) and a
  freshness tile linking to `ProgressTab → ProgressPhotos` (line 510).
- `YouScreen.js`: only one incidental mention, a static sub-copy string referencing
  "progress photos" (line 369) — no functional wiring found there.

**Components:**
- `ProgressGhostCapture.js` — live `expo-camera` preview with a semi-transparent overlay of a
  previous same-pose photo for alignment ("AlignShot"-style), rule-of-thirds grid, optional
  horizon level via `expo-sensors` if present. Writes through the existing `saveProgressPhoto` path.
- `ProgressPhotoCompare.js`, `ProgressScanCompare.js` — before/after viewers.
- `ProgressPhotoViewer.js`, `ProgressPhotoPrompt.js` (milestone-adjacent capture invitation, see
  telemetry below), `ProgressScanHistoryCard.js`, `BeforeAfterShareSheet.js` (share-card flow),
  `PhotoDateRangeSheet.js`, `PhotoDetailsSheet.js`, `PhotoDatePicker.js` (editable date/pose/weight/note
  metadata UI).

**Services/lib modules** (`src/lib/`):
- `progressPhotos.js` — raw file storage: private per-user dir
  `documentDirectory/progress_photos/users/<safeUserId>/`, filename `<epochMs>.jpg`, timestamp
  parsed from filename. Header comment: "device-local only... never synced to Supabase, never
  uploaded, never shared automatically, never gamified" (lines 1-13).
- `progressPhotoMeta.js` — editable per-photo metadata (date taken, pose, bodyweight snapshot, note).
- `progressPhotoDates.js`, `progressPhotoTimeline.js`, `progressCaptureGuide.js` — date/pose helpers
  and capture guidance copy.
- `progressScanAnalysis.js` (1584 lines) — the scoring engine: quality gates
  (`FINAL_SCAN_QUALITY_GATES`), abstention reasons, bias-flag derivation (sex, skin tone,
  competition/lean-stage context), uncertainty margins, silhouette-ratio scoring
  (`computeVisualLeannessScore`), a legacy body-fat-estimator blend
  (`blendedVisualLeannessScore`) anchored/bounded against the silhouette score, calibration curve
  (`calibrateVolyumeScore`), leanness-band mapping, scan-to-scan comparability gating
  (`scanComparability`, min 7-day interval, setup-stability checks), and copy generation. Exports
  `PHOTO_SCAN_SOURCE = 'photo_scan'`.
- `progressScanStore.js` — SQLite CRUD for scan sessions/assets, row mapping, legacy score
  migration on read (`normaliseStoredProgressScanSignals`).
- `progressScanVision.js` — on-device TFLite selfie-segmentation model loader
  (`selfie_segmentation.tflite`, 256x256), retake-reason taxonomy.
- `progressScanPreferences.js` — e.g. "hide exact scan ranges" preference (trend-only display).
- `progressScanDisplay.js`, `progressScanCopy.js`, `progressScanCompareViewModel.js` — display/copy
  view-models.
- `progressScanCoachResolver.js` — **out-of-engine** adapter that turns a scan summary into a
  UI-only "Progress photo context" note shown beside (not inside) the weekly coach read; see
  Contradiction note below.
- `progressScanCalibrationAccess.js` — hardcoded allow-list of 3 founder emails (plus `__DEV__`)
  gating a calibration-data export tool (`progressScanCalibrationAccess.js:1-14`).
- `shareCard/beforeAfterParams.js`, `shareCard/drawShareCard.js` — before/after share-card
  rendering (separate from the Pro before/after progress-card exception noted in CLAUDE.md).

**Native module:** `modules/progress-scan-image/` (Expo config-plugin native module) — exposes
`extractRgb`, `segmentPersonMask`, `resolveBundledModel`, `diagnoseBundledModel` to JS
(`index.ts`); Swift (iOS) and Kotlin (Android) implementations exist but were not read in full.

**Stores/state:** `src/store/useAppStore.js` — **zero matches** for photo/scan/physique (grep,
case-insensitive). Progress Photos/Scan state is NOT in the Zustand store; it is read directly
from SQLite via the lib modules per-screen.

**Data model** (`src/lib/database.js`):
- `progress_photo_meta` (name PK, taken_at, pose, weight_kg, note, created_at, updated_at) —
  rebuilt user-scoped at v56 (`migrateProgressPhotoMetaUserScope`, lines 1608-1615).
- `progress_scan_sessions` (id, user_id, captured_at, status, analysis_status, consent_version,
  camera_facing, timer_seconds, required_poses_complete, estimate_body_fat_percent/range/confidence/
  source, trend_direction/magnitude, quality_score/label, model_version, estimator_version,
  signals_json, abstention_reasons_json, bias_flags_json, copy_summary, timestamps) — v56.
- `progress_scan_assets` (id, scan_id, user_id, pose, photo_name, uri, taken_at, quality_score,
  landmark_confidence, segmentation_confidence, blur/lighting/framing scores, camera_tilt_degrees,
  signals_json added at v57) — v56/v57.
- Explicit header comments at each migration: "Local-only, no cloud counterpart... deliberately
  NOT in SYNC_REGISTRY" (`database.js:1546-1548,1608-1613`).
- All three tables appear in `wipeAllUserData` / backup-table lists (`database.js:4116-4122,4326-4328`).
- `supabase/migrate_104_photo_prompt_telemetry.sql` — the ONLY supabase migration touching
  "photo": it adds two **telemetry event names** (`photo_prompt_shown`, `photo_prompt_accepted`,
  no payload) to the `record_engine_telemetry` allow-list for the `ProgressPhotoPrompt` invitation
  funnel. No photo data, no scan data, no scores are stored in Supabase anywhere.

**Sync layer:** `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js` is a dedicated
regression guard asserting `SYNC_REGISTRY` contains no `progress_photo_meta`,
`progress_scan_sessions`, `progress_scan_assets`, or any table matching `/photo|scan/i`. The only
other sync-adjacent hit is a comment in `src/lib/sync/tables/partners.js:220` explicitly listing
"photos" among data partner win-cards must NEVER include.

**Gating (Free/Pro):** `ProgressPhotosScreen` is gated Pro via `withReadOnlyProGuard` keyed on
`photosViewableBy(userId)` (`RootNavigator.js:189`); a free user with existing photos gets
read-only view, a free user with none gets the hard Pro-lock screen. `AthleteProfileScreen.js`
gates the "Physique Score" tile display with a race-guard (`shouldShowPhysiqueScore`, lines
91-114) so a stale scan can't outrank a newer manually-logged body-fat entry, or vice versa,
based on timestamp comparison (scan wins exact ties).

**Consent/privacy copy** (`Article9ConsentScreen.js:189-210`): explicitly lists progress photos,
photo quality/confidence/leanness band/Volyume Score/progress change as processed data; states
Volyume Score "is a simple progress read, not a medical measure, DEXA scan, diagnosis, or medical
advice"; states photo files "stay on this device unless you choose to share or export them."
`SettingsDataScreen.js:161,171,245,282` — JSON backup/export includes photo *metadata* rows
(dates/pose/analysis) but never the image files themselves.

## What is evidenced
- A fully-built local-only "Progress Scan" pipeline: guided capture (front/back required, side
  optional) → on-device MediaPipe/TFLite person-segmentation → silhouette-ratio scoring → a
  calibrated "Volyume Score" (0-100) with band, confidence tier, and progress signal.
- A separate, older/simpler "Progress photos" raw gallery (filename-timestamp based, no scoring)
  that Progress Scan builds on top of (shares the same photo files and `progress_photo_meta` rows).
- Native module (`modules/progress-scan-image`) for RGB extraction and person-mask segmentation.
- Explicit, tested, hard architectural guarantee that photos/scans/scores never leave the device
  (no Supabase table, no SYNC_REGISTRY entry, guard test enforces this).
- A UI-only, explicitly out-of-engine note shown on `CoachOutputScreen` summarising the latest
  scan trend beside (not feeding) the weekly coach output — see Contradiction below.
- `nutritionEngine.js` treats `bodyFatSource === 'photo_scan'` as a recognised but low-confidence
  body-fat source input (`calcConfidence`, line 715) — i.e., if a user manually chooses to log a
  scan-derived body-fat % as their body-fat source, the engine's confidence-tiering function
  already has a slot for that value. Whether anything currently sets `bodyFatSource` to
  `'photo_scan'` automatically was NOT traced further (see below).
- A milestone-triggered `ProgressPhotoPrompt` invitation (shown after a PB/streak, feature-key-only
  telemetry, no payload) — `supabase/migrate_104...sql` comments, `ProgressPhotoPrompt.js`.
- A founder-only (hardcoded email allow-list) calibration-data export tool
  (`progressScanCalibrationAccess.js`).

## What is not evidenced
- Whether any current code path actually **writes** `bodyFatSource: 'photo_scan'` into a stored
  body-metric log automatically from a scan result (only the confidence-tiering function's
  awareness of the string was found; the write path was not traced within this pass).
- Full contents of the native Swift/Kotlin module implementations (only the TS bridge was read).
- Full contents of `progressScanCompareViewModel.js`, `progressScanCopy.js`,
  `progressScanDisplay.js`, `progressScanCalibrationExport.js` (found and named, not read in full).
- Any pose-estimation library beyond MediaPipe/MLKit selfie-segmentation — no separate "pose"
  library (e.g. no BlazePose/MoveNet) was found; "pose" in this codebase means the camera-facing
  label (front/back/side), not skeletal pose estimation.
- `react-native-vision-camera` is a dependency but grep evidence ties it to barcode/label
  scanning (`ScanBarcodeScreen`), not to Progress Scan capture, which uses `expo-camera`
  (`ProgressGhostCapture.js:11`) — not fully confirmed by reading `ProgressPhotosScreen.js`'s own
  camera-capture code path (not read in full).
- Exact navigation entry points into Progress Scan from onboarding/home dashboards beyond
  `AthleteProfileScreen`'s freshness tile.

## What already works well
- Strong, load-bearing safety posture: photos/scans are architecturally incapable of leaving the
  device (no cloud table, regression-guarded), and the score is explicitly documented everywhere
  ("not a medical measure... may abstain") as photo-context-only.
- The scoring engine already has extensive bias/quality machinery: sex-based overestimation
  flags, skin-tone-related uncertainty widening, competition/lean-stage anchor protection,
  multi-signal quality gates with named abstention reasons, and scan-to-scan comparability
  checks (setup-stability, minimum interval) before ever calling a "trend."
- The coach-adjacent note is carefully firewalled: a dedicated guard test
  (`progressScanCoachIsolation.guard.test.js`) pins that `runWeeklyCoach` inputs and persisted
  `coach_outputs` never contain scan data, and that the UI note is suppressed under an open ED
  flag or calm mode.
- `nutritionEngine.js` keeps an explicit allowlist (`isAuthoritativeBodyFatSource`) that visual/
  photo_scan sources are never authoritative for safety floors (confirmed by
  `progressScanCoachIsolation.guard.test.js:61-66`).

## Accuracy/trust risks
- The score blends a silhouette-ratio calculation with a legacy on-device body-fat-percent
  regressor (`progress_scan_bf_estimator_v1.json`), whose own README says its "percent output is
  not shown to users and is not persisted as a body-fat result for new Progress Scans" — i.e. the
  legacy estimator is retained purely as an internal anchor/blend input, which is a nuanced,
  easy-to-misstate detail for any future copy/UX work.
- Confidence can be "not_enough" (score withheld) or "low" for several common cases (self-reported,
  manual, visual, photo_scan sources) — worth surfacing precisely.
- Comparability gating is intricate (7-day minimum interval + setup-stability across 8 metrics);
  a user could easily be confused about why two scans "aren't comparable."

## UX/safety risks
- `ProgressPhotoPrompt` is a milestone-triggered (PB/streak) invitation to add a progress photo —
  this is adjacent to body-checking behaviour patterns; it is gated (ED-safety-adjacent per the
  migration comment) but its suppression/frequency logic was not read in full this pass.
- The Pro before/after progress card (per CLAUDE.md, a single founder-approved exception showing
  bodyweight beside photos) is a separate, more sensitive surface layered on top of this system —
  confirm its withholding-under-calm/ED-flag logic is intact if touched.

## Tests found
Representative list (all colocated `__tests__`, not exhaustive-read but names indicate coverage):
- `src/screens/__tests__/AthleteProfileScreen.physiqueScoreRace.test.js`,
  `AthleteProfileScreen.physiqueTile.guard.test.js`
- `src/screens/__tests__/ProgressPhotosScreen.addFlow.test.js`, `.compare.test.js`,
  `.progressScan.guard.test.js`
- `src/screens/__tests__/progressScanCoachIsolation.guard.test.js` (read in full — see above)
- `src/screens/__tests__/AnalyticsScreen.progressEmptyState.guard.test.js`, `privacyTruth.guard.test.js`
- `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js` (read in full)
- `src/lib/__tests__/progressScanAnalysis.test.js`, `progressScanBodyMExternal.test.js`,
  `progressScanCalibrationAccess.test.js`, `progressScanCalibrationCorpus.test.js`,
  `progressScanCalibrationExport.test.js`, `progressScanCoachResolver.test.js`,
  `progressScanCompareViewModel.test.js`, `progressScanCopy.test.js`, `progressScanModel.guard.test.js`,
  `progressScanPreferences.test.js`, `progressScanSafetyFloorIsolation.test.js`,
  `progressScanStore.delete.test.js`, `progressScanVision.test.js`
- `src/lib/__tests__/progressPhotoDates.test.js`, `progressPhotoMeta.test.js`, `progressPhotos.test.js`,
  `progressPhotosController.test.js`, `progressPhotoTimeline.test.js`, `progressCaptureGuide.test.js`
- `src/lib/__tests__/wipeAllUserData.test.js`, `backupTables.guard.test.js` (include the three tables)
- `src/components/__tests__/BeforeAfterShareSheet.test.js`, `.backfill.test.js`,
  `PhotoDateRangeSheet.test.js`, `PhotoDetailsSheet.test.js`, `ProgressGhostCapture.test.js`,
  `ProgressPhotoCompare.test.js`, `ProgressPhotoPrompt.test.js`, `ProgressPhotoViewer.test.js`,
  `ProgressScanCompare.test.js`, `ProgressScanHistoryCard.test.js`
- Scripts (not Jest, standalone): `scripts/run-progress-scan-bodym.cjs`,
  `run-progress-scan-bodym-report.cjs`, `run-progress-scan-calibration-report.cjs`,
  `run-progress-scan-full-audit.cjs`, `run-progress-scan-replay.cjs`,
  `scripts/ci/run-progress-scan-replay.test.mjs` — model-replay/calibration harnesses against the
  scoring engine, separate from the Jest suite.
- A dedicated safety-isolation test exists: `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js`
  (name strongly implies it pins that scan data cannot reach FFM/calorie floors; not read in full).

## Launch-critical opportunities
(None assessed — out of scope for this read-only mapping pass; a synthesis/strategy pass should
follow this evidence, not this report.)

## Premium later opportunities
- The founder-only calibration export tool (`progressScanCalibrationAccess.js`) and the replay/
  calibration scripts suggest an internal accuracy-improvement loop already exists; formalising it
  is a "Premium later opportunity," not evidenced as a current user-facing feature.
- The legacy body-fat-estimator blend and the newer silhouette-score calibration curve
  (`calibrateVolyumeScore`) suggest the scoring model is still being actively tuned
  (`assessmentVersion` migration/backfill logic exists for both v1→v2) — a "Premium later
  opportunity" would be exposing model-version/confidence provenance to users, not evidenced as
  currently shipped.

## Things not to rebuild
- Do not rebuild the device-local storage guarantee, the SYNC_REGISTRY exclusion, or the guard
  tests around it (`progressPhotoMetaNoSync.guard.test.js`) — this is a deliberate, tested,
  founder-relevant architectural choice (special-category data, GDPR Article 9).
- Do not rebuild the coach-isolation firewall (`progressScanCoachResolver.js` +
  `progressScanCoachIsolation.guard.test.js`) — it is a carefully tested pattern for exposing
  scan context in the UI without letting it touch engine inputs or persisted coach_outputs.
- Do not rebuild the quality-gate/abstention/bias-flag machinery in `progressScanAnalysis.js` —
  it already covers sex, skin tone, competition context, and setup-stability comparability with
  named, testable reason codes.

## Questions for Fable
- Given `progressScanCoachResolver.js` and `CoachOutputScreen.js` DO show a Progress-Scan-derived
  note beside the weekly coach output today (see Contradiction below), does the founder consider
  this "linked to Coach" for the purposes of the current audit's premise, or is the existing
  UI-only/non-persisted/gated firewall the intended and acceptable current state?
- Is `bodyFatSource === 'photo_scan'` in `nutritionEngine.js:715` a currently-reachable path (i.e.
  can a user's stored body-fat log actually carry that source value today), or is it dead/future
  code the engine was pre-wired for? This needs a targeted trace of body-fat-log write sites
  before any redesign work assumes it is (or isn't) live.

---

### CONTRADICTION / hidden dependency to investigate

The founder fact for this audit states progress photos/scans are **not** currently linked to
Coach or check-ins. Code evidence shows a real, if carefully firewalled, integration:

- `src/screens/CoachOutputScreen.js` imports `getProgressScanCoachSummary` (from
  `progressScanStore.js`) and `resolveProgressScanCoachNote` / `applyProgressScanCoachContext`
  (from `progressScanCoachResolver.js`), lines 38-42.
- On every coach run it fetches the latest scan summary (line 1365), calls the deterministic
  `runWeeklyCoach` WITHOUT any scan fields (confirmed absent from the call body, lines 1381-1440),
  then AFTER the engine returns, separately resolves a "Progress photo context" note
  (`resolveProgressScanCoachNote`, lines 1444-1449) and folds only its `coachLine` string into
  `coachResponse.interpretation` via `applyProgressScanCoachContext` (line 1769), gated by
  `!edPatternOpen && !calmMode` (line 1725) and rendered as a separate UI block titled
  "Progress photo context" (lines 2042-2046).
- `src/lib/progressScanCoachResolver.js` header comment (lines 1-8) states this is "deliberately
  NOT part of weeklyCoach or nutritionEngine" and every returned object carries
  `affectsTargets: false` / `usedFor: 'visual_trend_context_only'`.
- A dedicated regression suite,
  `src/screens/__tests__/progressScanCoachIsolation.guard.test.js`, pins exactly this shape:
  `runWeeklyCoach` inputs never mention progressScan/photo_scan; `saveCoachOutput` calls never
  persist it; the note is gated by ED/calm state; and it is folded in only through the
  out-of-engine adapter.

**Read:** this is a real, tested, and deliberately-isolated presentation-layer linkage (a coach
screen shows scan-derived commentary next to, never inside, the deterministic engine's targets),
not an engine-level or check-in-level dependency. It should still be treated as a flagged finding
rather than assumed away, since it does connect Progress Scan output to something the user sees
labelled as coach output, and any redesign of Progress Photos/Scan must account for
`CoachOutputScreen.js`, `progressScanCoachResolver.js`, and `progressScanStore.getProgressScanCoachSummary`
as dependents.
