# Scout report: Scoring code pipeline

## Files inspected
- `src/lib/progressScanAnalysis.js` (1584 lines) — score math, bias flags, confidence, comparability, withhold gates
- `src/lib/progressScanVision.js` (825 lines) — on-device pixel/segmentation analysis
- `src/lib/progressScanStore.js` — SQLite persistence, `getProgressScanCoachSummary`
- `src/lib/progressScanCoachResolver.js` — out-of-engine Coach-screen note builder
- `src/lib/progressScanDisplay.js`, `src/lib/progressScanCopy.js` — UI copy/formatting
- `src/lib/progressPhotosController.js` — non-scoring helpers (photo enrichment, next-action, delete flows)
- `src/lib/progressScanCalibrationAccess.js`, `src/lib/progressScanCalibrationExport.js` — founder-only calibration export tool
- `src/lib/progressScanPreferences.js` — "hide exact score" preference
- `src/lib/database.js` (lines ~1610-1670, 4116-4328) — schema for `progress_scan_sessions`/`progress_scan_assets`, backup-table/wipe lists
- `src/screens/AthleteProfileScreen.js` (lines 230-465) — physique tile show/withhold logic
- `src/screens/CoachOutputScreen.js` (lines 1238, 1365-1449, 1725, 1769, 2042) — Coach-screen wiring of scan context
- `src/components/ProgressScanHistoryCard.js` — history/compare UI copy
- `assets/ml/README.md`, `assets/ml/progress_scan_bf_estimator_v1.json` (JSON regressor asset), `assets/ml/selfie_segmentation.tflite` (binary model, not opened)
- Tests read for evidence (not executed): `progressScanAnalysis.test.js`, `progressScanVision.test.js`, `progressScanModel.guard.test.js`, `progressScanSafetyFloorIsolation.test.js`, `progressScanCoachResolver.test.js`, `progressScanCoachIsolation.guard.test.js`, `AthleteProfileScreen.physiqueTile.guard.test.js`, `AthleteProfileScreen.physiqueScoreRace.test.js`, `progressScanCalibrationCorpus.test.js`, `progressPhotoMetaNoSync.guard.test.js`, `progressScanPreferences.test.js`, `progressScanStore.delete.test.js`

## Search terms used
progress scan, physique score, body score, visual score, scan score, body fat/bodyFat, estimate, confidence, quality, withhold, reason, model/ML/tflite/tensorflow/onnx/coreml/mediapipe, vision, image analysis, landmarks, segmentation, pose detection, prediction, classifier, inference, measurement, timestamp/metadata/exif, mock/fixture/fake/stub/placeholder/TODO, random/Math.random, hardcoded — run as grep across `src/` and `assets/ml/`, both literal and camelCase.

## Current-state evidence
A score exists and is called the **Volyume Score** in all user-facing copy (`src/lib/progressScanCopy.js:20,26`; `src/components/ProgressScanHistoryCard.js:181`; `src/screens/AthleteProfileScreen.js:378`). Internally it is `visualLeannessScore` (`assessmentVersion: 'volyume_physique_scan_score_v2'`, `progressScanAnalysis.js:9,776`), 0-100, mapped to a `leannessBand` (`PROGRESS_SCAN_LEANNESS_BANDS`, lines 39-47: Foundation/Active/Athletic/Defined/Lean/Very Lean/Peak Condition).

Pipeline, in order:
1. **Real on-device pixel analysis.** `progressScanVision.js:analyseProgressScanPhoto` extracts RGB via the native module `progress-scan-image` (`extractRgb`), runs a bundled MediaPipe Selfie Segmentation TFLite model (`assets/ml/selfie_segmentation.tflite`, 256x256, via `react-native-fast-tflite`), with an ML Kit native segmentation fallback (`segmentPersonMask`). `measureMaskSignals` (lines 517-682) computes a real foreground mask, connected components, adaptive Otsu-style threshold, body bounding box, blur (Laplacian variance, `blurScoreFromRgb`), lighting, framing, pose/tilt, and silhouette width ratios (waist/shoulder/hip/height/body-area) by sampling mask rows at fixed body-height bands. This is genuine pixel-level image processing, not mocked — confirmed by contract validation (`validateProgressScanModelContract`) checking real tensor shapes/dtypes.
2. **Deterministic silhouette-to-score formula.** `computeVisualLeannessScore` (`progressScanAnalysis.js:473-494`) is a fixed weighted formula over the measured ratios (no ML/AI), then `calibrateVolyumeScore` (line 530) applies a hand-authored lookup-table calibration curve.
2b. **A separate deterministic linear regressor** (`estimateBodyFatFromScanAssets`, lines 1284-1320) reads coefficients/centres from `assets/ml/progress_scan_bf_estimator_v1.json` (a plain JSON of a linear model: intercept, sexFemale, bmi, waistToHeight, waistToShoulder, waistToHip, bodyAreaRatio, frontBackWaistSpread, sideWaistToHeight) and computes a body-fat-percent value from silhouette ratios + profile-derived BMI. Its `status` field is literally `"provisional_validation_pending"` (JSON, confirmed) and its output percent is explicitly "not shown to users and not persisted as a body-fat result" (`assets/ml/README.md:18-20`) — it is only used internally to *anchor/blend* the visible Volyume Score (`blendedVisualLeannessScore`, lines 595-636).
3. **Confidence** is a real weighted computation (`computeScanConfidenceScore`, lines 412-435) over segmentation/pose/framing/lighting/clothing/completeness/stability/setup-consistency, penalised by `biasConfidencePenalty` for known bias flags (female, darker-skin, very-muscular, large-body, prep/competition context, missing side pose, validation-pending). Mapped to a confidence tier (`confidenceTier`, lines 395-402: high/moderate/low/not_enough).
4. **Withholding** is real and enforced in two layers: `abstentionReasonsForAssets` derives reasons (too_dark, too_blurry, whole_body_not_visible, pose_not_clear, segmentation_low_confidence, clothing_or_background_uncertain, camera_tilted, multiple_people, no_person_detected, model_unavailable, etc., lines 183-210 and vision-side thresholds `progressScanVision.js:623-631`), and `reasonsThatWithholdScore`/`SCORE_WITHHOLD_REASONS` (lines 23-37, 404-406) decide which reasons null out the score entirely (`analyseProgressScan`, lines 1389-1534, returns `analysisStatus: 'abstained'` with `visualLeannessScore: null`).
5. **Weight/measurements/profile feed the score.** `estimatorInputsFromAssets` (lines 1249-1274) requires `sex` and computes `bmi` from `heightCm`/`weightKg` (`bmiFrom`, lines 1225-1231); this BMI and sex feed the linear regressor terms and also gate `estimatorAnchorDownwardLimit`'s large-body/BMI branches (lines 558-584). Logged bodyweight nearest to the photo date is snapshotted per-photo (`src/lib/progressPhotoMeta.js:144-167`, via `getBodyWeightNearestTo`) and surfaced in scan comparisons/history (`explainMeasuredScanDelta`, lines 1092-1102; `ProgressScanHistoryCard.js:99-103` "Weight ... kg").

## What is evidenced
- Real, non-trivial on-device image analysis (segmentation mask, silhouette ratios, blur/lighting/framing/pose/tilt metrics) — `progressScanVision.js`.
- A deterministic (non-AI, non-random) scoring formula and a deterministic linear-regression body-fat anchor, both auditable in source — `progressScanAnalysis.js:473-636, 1276-1320`.
- Confidence is genuinely calculated from measured signals and bias flags, not hard-coded — `computeScanConfidenceScore`.
- Low-quality/incomplete scans are genuinely withheld (score set to `null`, `analysisStatus: 'abstained'`) both at the vision layer (per-asset abstention reasons) and the analysis layer (aggregate withhold gate) — `progressScanAnalysis.js:1416-1447`.
- The estimator/body-fat value is explicitly *not* authoritative: a dedicated isolation test (`progressScanSafetyFloorIsolation.test.js`) proves `photo_scan` can never lower the FFM calorie floor or authorise a deeper cut in `runWeeklyCoach`, and `nutritionEngine.isAuthoritativeBodyFatSource('photo_scan') === false`.
- Data never leaves the device: `progress_scan_sessions`/`progress_scan_assets`/`progress_photo_meta` are absent from `SYNC_REGISTRY`, pinned by `progressPhotoMetaNoSync.guard.test.js`.
- UI copy for the score is calm and appropriately hedged ("photo context only", "Volyume Score ... Scan Confidence ... Score from photos taken in similar conditions", `progressScanAssessmentCopy`, lines 815-832) and does not claim body-fat accuracy, DEXA-equivalence, or medical validity; `assets/ml/README.md` explicitly disclaims medical-device/DEXA/body-fat-model status.
- Timestamps: `taken_at`/`captured_at` come from filename-derived timestamp or editable user input (`progressPhotoMeta.js:timestampFromName`), not from image EXIF parsing — no EXIF library found in the codebase for this feature.

## CONTRADICTION — Coach/check-in link (flagged per instructions)
The founder-stated fact for this audit is "progress photos/scans are NOT currently linked to Coach/check-ins." **Code evidence contradicts this as a blanket statement**, though the actual wiring is narrow and deliberately isolated:
- `src/lib/progressScanCoachResolver.js` is an explicit "Out-of-engine progress photo coaching resolver" whose header states it is "deliberately NOT part of weeklyCoach or nutritionEngine."
- `src/screens/CoachOutputScreen.js:1365-1449` fetches `getProgressScanCoachSummary(user.id, ...)` (from `progressScanStore.js:405-424`, which reads the latest complete scan) and builds a `progressScanCoachContext` note (`resolveProgressScanCoachNote`), suppressed when an ED-pattern flag is open or calm mode is active (`suppressed: resultEdPatternOpen || calmNow`, line 1447).
- `CoachOutputScreen.js:1725,1769` folds that note into the visible `interpretation` text via `applyProgressScanCoachContext(baseCoachResponse, ...)` and renders a "Progress photo context" card (line ~2042).
- `AthleteProfileScreen.js:274` also calls `getProgressScanCoachSummary(user.id)` to build the profile summary (feeds `physiqueTile`, not Coach interpretation).
- This is a **UI-only, out-of-engine annotation** — a locked-down regression suite (`progressScanCoachIsolation.guard.test.js`) proves: (a) `runWeeklyCoach`'s actual input object never contains scan/photo_scan/estimateBodyFatPercent/range fields; (b) `saveCoachOutput` calls never persist scan data into `coach_outputs`; (c) the rendered note is gated by `!edPatternOpen && !calmMode`. So it does not feed the deterministic engine, is not a "check-in" integration, and is not persisted — but it IS a real, tested, live link between Progress Scan output and the Coach output screen, contradicting a strict "not linked at all" framing.
- **Recommend surfacing to the founder**: confirm whether this out-of-engine Coach-screen note was a previously-approved, deliberately isolated feature (it reads as a mature, guarded, intentional build, not an accident) or whether it needs founder review given the stated "not linked" assumption for this audit.

## What already works well
- Genuine on-device computer vision with real thresholds/contract validation, not a stub.
- Deterministic math throughout (formula + linear regressor), matching the project's "no AI in coaching" posture even though this sits outside the coaching engine.
- Multi-layer abstention/withholding is thorough and conservative (quality gates, comparability gates, confidence-tier gates, bias-aware margin widening).
- Explicit, tested non-authority over safety floors (FFM floor, calorie floor) — this is the single most safety-critical property and it is well covered by `progressScanSafetyFloorIsolation.test.js`.
- Privacy posture is strict and tested: fully local, never synced.
- UI copy consistently under-claims rather than over-claims (repeatedly says "photo context only," never asserts body-fat accuracy).
- The Coach-screen link (contradiction above) is itself carefully engineered with isolation guards rather than being a careless integration.

## Accuracy/trust risks
- The linear body-fat regressor's own asset metadata says `"status": "provisional_validation_pending"` and bias flags include `physique_athlete_validation_pending` and `skin_tone_not_collected_validation_gap" — i.e., the model is self-disclosed as not yet validated against a real ground-truth corpus for physique athletes or across skin tones. A founder-only calibration export tool exists (`progressScanCalibrationAccess.js`, `progressScanCalibrationExport.js`) suggesting validation work is in progress but not complete.
- The MediaPipe selfie-segmentation model is a general-purpose person/background segmenter, not trained for body-composition estimation; the silhouette-ratio-to-score formula and the regressor coefficients are therefore heuristic/hand-authored rather than trained on a labelled physique dataset (no training/eval pipeline or dataset found in-repo for either).
- `blendedVisualLeannessScore` allows the unvalidated regressor to shift the visible score by 20 points upward / up to 24-26 points downward from the silhouette-only score for large-body cases (`ESTIMATOR_ANCHOR_MAX_UPWARD_POINTS`, `ESTIMATOR_ANCHOR_LARGE_BODY_DOWNWARD_POINTS`), meaning a provisional/unvalidated component can materially move the visible Volyume Score.
- No independent ground-truth corpus/labelled test set was found for score accuracy in the app repo itself — `progressScanCalibrationCorpus.test.js` tests internal consistency/regression properties of the formula (e.g., "framing does not create a fake progress jump"), not accuracy against real body-composition measurements.

## UX/safety risks
- None beyond what's already gated: ED-safety and calm-mode suppression are present and tested for both the profile tile withholding pathway (via `bodyFat`/`bodyFatLoggedAt` fallback logic) and the Coach-screen note (`suppressed: resultEdPatternOpen || calmNow`). No weakening observed.
- The Coach-screen contradiction above is a process/communication risk (a feature exists that the audit's founder-fact says doesn't) rather than a code-safety risk, since the isolation guards prevent it from affecting targets.

## Tests found
- `src/lib/__tests__/progressScanAnalysis.test.js` — score/withhold/comparability logic
- `src/lib/__tests__/progressScanVision.test.js` — vision pipeline, model loading fallbacks, mocked native modules (`progress-scan-image`, `react-native-fast-tflite`, `expo-asset`) — mocks are test-only, not production fallbacks
- `src/lib/__tests__/progressScanModel.guard.test.js` — source-level regex guard on estimator wiring
- `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js` — proves photo_scan cannot influence FFM/calorie floors or weekly-coach cuts
- `src/lib/__tests__/progressScanCoachResolver.test.js` + `src/screens/__tests__/progressScanCoachIsolation.guard.test.js` — proves the Coach-screen note is out-of-engine, unpersisted, and ED/calm-gated
- `src/lib/__tests__/progressScanCalibrationCorpus.test.js`, `progressScanCalibrationExport.test.js` — internal consistency checks on the calibration/export tooling, founder-gated
- `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js` — proves no progress-photo/scan table is ever added to `SYNC_REGISTRY`
- `src/screens/__tests__/AthleteProfileScreen.physiqueTile.guard.test.js`, `AthleteProfileScreen.physiqueScoreRace.test.js` — profile tile show/withhold and race-condition coverage
- `src/lib/__tests__/progressScanStore.delete.test.js`, `progressScanPreferences.test.js`, `progressScanBodyMExternal.test.js` — persistence/deletion/preferences coverage

## Launch-critical opportunities
(Evidence-only scout; no new design proposed. Flagging gaps observed, not recommending solutions.)
- The provisional/unvalidated status of the body-fat regressor component is currently disclosed only in code comments/JSON metadata and internal bias-flag plumbing (e.g., `physique_athlete_validation_pending`), not obviously in any user-facing copy reviewed — worth a founder decision on whether/how that should be user-visible.
- No evidence of a labelled accuracy-validation dataset/process beyond the founder-only calibration export tool; whether that process is complete enough for launch is a founder call, not something evidenced in code.

## Premium later opportunities
- N/A — evidence-only scope; no proposals made.

## Things not to rebuild
- The on-device segmentation pipeline (`progressScanVision.js`) — real, tested, with native + fallback engines and contract validation; do not treat as mocked.
- The deterministic scoring formula and withholding/confidence system (`progressScanAnalysis.js`) — extensive, already tested, and deliberately isolated from the coaching engine and safety floors.
- The safety-floor isolation guarantees — do not weaken; explicitly protected by dedicated tests per CLAUDE.md's ED-safety mandate.

## Questions for Fable
1. The out-of-engine Coach-screen "Progress photo context" note (`progressScanCoachResolver.js`, wired in `CoachOutputScreen.js`) is a real, tested, guarded link between Progress Scan and the weekly Coach output screen. This appears to contradict this audit's stated founder fact that scans are "NOT currently linked to Coach/check-ins." Was this link previously founder-approved and simply out of scope for the audit's framing, or does it need review?
2. The visible Volyume Score can be shifted materially (up to +20/-24 to -26 points) by an internal linear body-fat regressor whose own metadata marks it `"provisional_validation_pending"`. Is there a labelled/ground-truth validation process beyond the founder-only calibration export tool, and is its current validation state acceptable for the score to be user-facing as-is?
3. `progress_scan_bf_estimator_v1.json`'s raw body-fat percent is described as "not shown to users" — please confirm no UI surface (including the calibration export, share cards, or debug/dev builds) leaks that raw percent, since this scout did not exhaustively check every screen for it.
