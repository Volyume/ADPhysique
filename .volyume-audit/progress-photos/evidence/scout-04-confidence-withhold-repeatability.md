# Scout report: Confidence, withhold, repeatability

## Files inspected
- `src/lib/progressScanAnalysis.js` (1584 lines, core engine: quality gates, withhold, confidence, comparability)
- `src/lib/progressScanStore.js` (SQLite CRUD, session/asset lifecycle, delete/detach)
- `src/lib/progressScanCoachResolver.js` (out-of-engine Coach-screen adapter)
- `src/lib/progressPhotoMeta.js` (device-local per-photo metadata: takenAt, pose, weightKg, note)
- `src/lib/progressPhotos.js` (filename-as-timestamp storage, collision guard)
- `src/lib/progressPhotoTimeline.js`, `src/lib/progressPhotoDates.js` (grouping/formatting)
- `src/lib/progressPhotosController.js` (pure helpers: cadence gate, next-action, delete/cleanup orchestration)
- `src/lib/progressCaptureGuide.js` (capture copy/guidance)
- `src/components/ProgressGhostCapture.js` (camera capture UI, alignment overlay)
- `src/screens/ProgressPhotosScreen.js` (scan flow orchestration, cadence alert, double-open guard)
- `src/screens/CoachOutputScreen.js` (progress-scan-context wiring, lines 38-43, 824, 1365, 1444, 1725, 1769, 2044-2046)
- `src/lib/database.js` (schema for `progress_scan_sessions`, `progress_scan_assets`, `progress_photo_meta`, migrations v56-v57, wipe/backup table lists)
- Tests: `src/lib/__tests__/progressScanAnalysis.test.js`, `progressScanVision.test.js`, `progressScanModel.guard.test.js`, `progressScanCoachResolver.test.js`, `progressScanStore.delete.test.js`, `progressScanCalibrationExport.test.js`, `progressPhotos.test.js`, `progressPhotoMeta.test.js`, `progressPhotoTimeline.test.js`; `src/screens/__tests__/progressScanCoachIsolation.guard.test.js`, `ProgressPhotosScreen.progressScan.guard.test.js`, `ProgressPhotosScreen.addFlow.test.js`, `ProgressPhotosScreen.compare.test.js`

## Search terms used
`progress.?photo|progressPhoto|bodyScan|body.?scan`, `resolveProgressScanCoachNote|applyProgressScanCoachContext`, `dayKey|localDayKey|timezone`, `shouldGateProgressScanStart|MIN_COMPARISON_INTERVAL|collision|isSaving|debounce`, `pickScanPoseFromLibrary|duplicate`, `progress_scan_sessions|progress_scan_assets|progress_photo_meta` (in database.js).

## Current-state evidence

**Quality gates** (`progressScanAnalysis.js:13-21`, `FINAL_SCAN_QUALITY_GATES`): per-asset thresholds for `lighting` (0.25), `blur` (0.18), `framing` (0.25), `pose` (0.22), `segmentation` (0.30), `separation` (0.20), `tiltDegrees` (20). Breaches map to reasons (`too_dark`, `too_blurry`, `whole_body_not_visible`, `pose_not_clear`, `segmentation_low_confidence`, `camera_tilted`, `clothing_or_background_uncertain`) in `abstentionReasonsForAssets` (lines 183-210).

**Withhold set** (`SCORE_WITHHOLD_REASONS`, lines 23-37): `missing_required_pose`, `model_unavailable`, `measured_signals_incomplete`, `no_person_detected`, native-preprocess failures, `mask_shape_unusable`, `too_dark`, `too_blurry`, `whole_body_not_visible`, `multiple_people`, `pose_not_clear`, `estimate_out_of_range`. `reasonsThatWithholdScore` (line 404) filters against this set; anything not in the set becomes a soft `qualityWarnings` entry rather than a hard withhold. `analyseProgressScan` (line 1389) returns `analysisStatus: 'abstained'` with `visualLeannessScore: null` when withholding reasons exist.

**Confidence tiers**: `confidenceTier()` (line 395) → `high` (≥0.85), `moderate` (≥0.64/0.70 depending on measured-score readiness), `low` (≥0.28/0.40), else `not_enough`. Score computed by `computeScanConfidenceScore` (line 412) as a weighted blend of segmentation/pose/framing/lighting/clothing/completeness/stability/setup-consistency, minus a `biasConfidencePenalty` (lines 379-393) for flags like `female_overestimation_risk`, `darker_skin_overestimation_risk`, `very_muscular`, `stage_lean_or_prep`.

**Uncertainty margin**: `uncertaintyMarginPctPoints` (line 233) — base 3.5pp, widened to up to 9pp for quality/bias flags; `buildEstimateRange` (line 252) builds low/high band. Note: `analyseProgressScan`'s final branch (line 1519-1533) sets `estimate: null, range: null` and stores the computed range only as `hiddenLegacyRange` — the numeric body-fat estimate/range is deliberately never surfaced; only the 0-100 "Volyume Score" + band + confidence + trend are shown.

**Repeatability / setup-drift protection**: `scanSetupStability` (line 901) compares lighting/framing/segmentation/tilt/body-box height-width-center between current and previous scan per pose, with named thresholds (e.g. `lighting_changed` at Δ0.24, `camera_tilted` at Δ4°, `camera_distance_changed` at Δ0.09-0.10 body-box height/width, `body_position_changed`/`camera_height_changed` at Δ0.11 center-x/y). `scanComparability` (line 961) refuses a comparison (`not_comparable`) when: either scan was withheld, required poses missing, captured <7 days apart (`PROGRESS_SCAN_MIN_COMPARISON_INTERVAL_MS = 7*86400000`, line 10), quality label `poor`/`unknown`, confidence tier `not_enough`/`unknown`, or setup drifted (`scanSetupStability` unstable).

**Confidence-gated trend calling**: `explainMeasuredScanDelta` (line 1035) only calls a directional trend (`canCallPairTrend`) when the pair's lower confidence tier is `moderate` or above (line 1070); otherwise reports a delta magnitude but withholds direction ("scan confidence was low, so Volyume is not calling a progress trend").

**Timestamps**: photo files are named `<epochMs>.jpg` (`progressPhotos.js:31-34`), the only stored metadata is the epoch-ms timestamp parsed back for ordering/display. `progress_scan_sessions.captured_at` and `progress_scan_assets.taken_at` are epoch-ms INTEGER columns (`database.js` v56 migration). Grouping/local-day keys use `new Date(ms).getFullYear()/getMonth()/getDate()` (`progressPhotoTimeline.js:32-35`, device-local timezone, not UTC) — consistent with the rest of the app's local-day convention (`src/lib/dayKey.js` is used elsewhere but progress-photo timeline rolls its own local-day grouping rather than importing `dayKey.js`).

**Duplicate-filename collision guard** (`progressPhotos.js:69-90`, comment "gap #11"): `saveProgressPhoto` walks `ts` forward millisecond-by-millisecond until an unused path is found, so two saves landing on the identical millisecond never silently overwrite each other. Covered by `progressPhotos.test.js:104-134` (`describe('saveProgressPhoto collision guard (gap #11)')`).

**Double-tap / race protections found**:
- `ProgressGhostCapture.js`: `capturing` state disables the shutter (`disabled={capturing || countdown != null}`, line 608) during `takePictureAsync`; `savingCapture` disables both Retake and Use-photo buttons during `saveProgressPhoto`/`upsertPhotoMeta` (lines 447-463).
- `ProgressPhotosScreen.js`: `progressScanOpeningRef` (line 516, 544-565) is a ref-based lock preventing a second `openProgressScan` call while one scan-session-creation is in flight.
- Live tier re-check inside the capture/confirm callbacks (`ProgressGhostCapture.js:241,248,260,268,274`) re-reads `useAppStore.getState().tier` at each async boundary so a Pro→free flip mid-capture cannot save a photo (mirrors the "write-guard" pattern used elsewhere).
- No equivalent explicit busy-guard was found around the terminal `finishScan` call itself (`ProgressPhotosScreen.js:584-614`) beyond the fact it is only reached from disabled-while-saving UI paths (continuation after a pose-confirm), not from a repeatedly-tappable "Finish" button.

**Duplicate-photo-content gap (not evidenced as guarded)**: `pickScanPoseFromLibrary` (`ProgressPhotosScreen.js:281-354`) lets a user pick literally the same source image from their library for two different poses (e.g. front and back) — each pick calls `saveProgressPhoto`, producing a new filename/photo id and pose tag, with no perceptual/hash check that the same image content was already used elsewhere in this scan. Nothing in `progressScanAnalysis.js` (`requiredPosesComplete`, `physiqueInputsFromAssets`) detects or flags a front/back pair with identical pixel content; a duplicate front=back submission would drive `frontBackWaistSpread` to ~0, which `consistencyScoreFromSpread` (line 443) rewards as a *high*-consistency signal.

**Coach linkage — apparent CONTRADICTION to founder fact ("scans are NOT linked to Coach/check-ins")**: `progressScanCoachResolver.js` exports `resolveProgressScanCoachNote` and `applyProgressScanCoachContext`, both wired directly into `CoachOutputScreen.js` (imports at lines 38-43; state at 824; populated at 1365/1444; rendering gate `canShowProgressScanCoachContext` at 1725; folded into `coachResponse.interpretation` via `applyProgressScanCoachContext(baseCoachResponse, ...)` at 1769; rendered UI text at 2044-2046). `progressCaptureGuide.js:222` also states in user-facing copy: "The coach may use broad trend direction as low-confidence context." This is a real, intentional, and heavily-guarded UI-level link (see Tests below) — the engine itself (`runWeeklyCoach`) is proven isolated from scan data, and the note explicitly declares `affectsTargets: false` and is captioned as a non-target-setting cross-check — but it IS visually surfaced beside/inside the Coach output screen, which contradicts a literal "not linked" framing. Flagging per instructions.

## What is evidenced
- Quality gates on images/scans: lighting, blur, framing, pose confidence, segmentation confidence, camera tilt, background separation — all in `FINAL_SCAN_QUALITY_GATES`.
- Confidence tiers: `high/moderate/low/not_enough/unknown`, ranked and used to gate both a single score display and pairwise trend-calling.
- Withhold reasons: explicit named set, mapped to calm user copy (`progressScanAssessmentCopy`, `estimatorUnavailableCopy`), always keeping the photo saved even when score is withheld (`QUALITY_FIRST_CAPTURE_NOTE`).
- Poor lighting / poor pose / clothing-framing / camera-angle handling: all present as named gates and named comparison-drift reasons.
- Repeatability handling: `scanSetupStability` + `scanComparability` (7-day minimum interval, setup-drift refusal).
- Timestamp behaviour: epoch-ms filename + `captured_at`/`taken_at` INTEGER columns, device-local day/month grouping (no explicit UTC normalisation call, but consistent with local-device convention).
- Duplicate-filename collision handling (same millisecond).
- Baseline comparison logic: `compareScanEstimates`, `scanComparability` returning `status: 'baseline'` for the first scan.
- Trend vs single-score behaviour: `progressSignalFromDelta` thresholds by confidence tier; `canCallPairTrend` gate.
- Calibration: `calibrateVolyumeScore` (silhouette-score → display-score curve), `PROGRESS_SCAN_SCORE_VERSION`/`legacyAssessmentVersion` migration in `normaliseStoredPhysiqueAssessment`, and a dedicated `progressScanCalibrationExport.js` module + test.
- Device-specific handling: none found beyond generic quality gates (no camera-model/resolution-specific branching).
- Tests: extensive (see below).

## What is not evidenced
- A perceptual/hash check to catch the identical photo being reused across two poses in one scan (see gap above).
- An explicit busy/disabled guard directly on the `finishScan` call path distinct from the upstream capture-confirm disabling.
- Explicit UTC-vs-local timezone conversion/normalisation code for progress-photo timestamps (relies on `Date` local getters — fine for on-device display, but no dayKey.js reuse for this feature specifically).
- Any device-model-specific camera calibration or lens-distortion handling.
- A user-facing "confidence interval" or numeric error-bar shown in the UI for the Volyume Score itself (the internal `hiddenLegacyRange`/`estimateRangeLow/High` fields are computed but deliberately not surfaced — see Accuracy risk below for the flip side of this).

## What already works well
- The withhold/abstain path is exercised extensively against a real vision pipeline in `progressScanVision.test.js` (blur, darkness, no-person, multi-person is implied by `multiple_people` reason, arms-down/noisy backgrounds not forcing false retakes).
- `scanComparability` composing multiple independent gates (pose completeness, min interval, quality label, confidence tier, setup stability) before allowing a trend — this is a genuinely layered defence against misleading progress claims.
- Confidence-gated trend-calling (`canCallPairTrend`) prevents a low-confidence pair from asserting a direction at all, only a "not calling a trend" message.
- The photo is always retained even when analysis is withheld (`QUALITY_FIRST_CAPTURE_NOTE`), so a bad-quality scan never means lost user data.
- `progressScanCoachIsolation.guard.test.js` is a strong regression guard proving the Coach-screen scan note never enters `runWeeklyCoach` inputs or `coach_outputs` persistence, and is suppressed under ED-pattern-open or calm mode.
- Bias-flag system (`deriveBiasFlags`, `deriveProgressScanBiasFlagsFromProfile`) widening uncertainty for demographic/physique-context risk (female overestimation, darker-skin overestimation, competition/lean-stage context) rather than silently applying a flat model.

## Accuracy/trust risks
- Copy quotes: `progressScanAssessmentCopy` shows a precise integer, e.g. `"Volyume Score 74/100"` alongside a confidence label and band — the numeric score itself carries no visible ± range in the UI, even though the engine computes `uncertaintyMarginPctPoints` and a range internally (now deliberately hidden as `hiddenLegacyRange`). A user sees a single precise-looking number plus a qualitative confidence word, not a range — classic overconfidence-by-omission risk if the qualitative confidence word is not prominent in the actual UI layout (this scout did not verify screen layout prominence, only data flow).
- The Coach-screen surfacing of scan trend (`progressScanCoachResolver.js`), while target-isolated, still risks a user reading "the coach used my photo" as authoritative even though `usedFor: 'visual_trend_context_only'` and `affectsTargets: false` are asserted only in code, not necessarily emphasised equally in the rendered UI (not verified visually by this scout).
- Duplicate front/back photo content is not detected and would be scored as if genuinely different, and would in fact score as *more* consistent (`consistencyScoreFromSpread`) — a subtle path to a falsely "well-supported" measured score from degenerate input.

## UX/safety risks
- No explicit guard directly on `finishScan` beyond upstream capture-button disabling — if some future entry point calls `finishScan` without going through the capture-confirm gating, a double-invocation risk exists (not currently observed in the reviewed call sites).
- `hasExplicitLeanAnchorProtection`/anchor-limit logic (lines 552-593) is dense, bias-flag-dependent asymmetric clamping logic; correctness depends on many interacting thresholds (BMI cutoffs at 28/29.25/30/34, ratio cutoffs) that are not obviously traceable to a single external spec in this codebase — flagging density/complexity as a maintainability-adjacent trust risk, not a bug found.

## Tests found
- `src/lib/__tests__/progressScanAnalysis.test.js` — largest suite (~1000+ lines implied by test names): abstention gates, uncertainty widening, model-unavailable handling, bias flags, calibration, comparability (7-day interval, setup drift, side-photo drift), coach-summary suppression under calm/ED.
- `src/lib/__tests__/progressScanVision.test.js` (511 lines) — vision-pipeline-level: mask decoding, blur/lighting/pose thresholds, no-person detection, moderate-softness tolerance.
- `src/lib/__tests__/progressScanModel.guard.test.js` (124 lines), `progressScanCalibrationExport.test.js` (153 lines), `progressScanCoachResolver.test.js` (85 lines), `progressScanStore.delete.test.js` (381 lines, deletion/detach lifecycle).
- `src/screens/__tests__/progressScanCoachIsolation.guard.test.js` — source-level regression guard proving engine/UI isolation (quoted above).
- `src/screens/__tests__/ProgressPhotosScreen.progressScan.guard.test.js`, `ProgressPhotosScreen.addFlow.test.js`, `ProgressPhotosScreen.compare.test.js` — screen-level flow and compare-UI tests.
- `src/lib/__tests__/progressPhotos.test.js` — includes the collision-guard test quoted above.
- `src/lib/__tests__/progressPhotoMeta.test.js`, `progressPhotoTimeline.test.js`, `progressPhotoDates.test.js`, `progressPhotosController.test.js`.

**Critical tests missing**:
- No test found for duplicate-photo-content reuse across poses (front == back same file).
- No test found asserting a UI-visible uncertainty range/confidence-interval actually renders (tests cover the data model, not what's on screen).
- No explicit test for double-tap on the terminal finish action itself (tests cover capture-button disabling, not a direct `finishScan` re-entrancy case).
- No test found for cross-timezone / DST edge cases specific to progress-photo local-day grouping (contrast with `mesocycle.f10.dst.test.js` which exists for a different domain).

## Launch-critical opportunities
- Add a lightweight perceptual-duplicate check (e.g., simple pixel-diff or file-hash compare) across poses within one scan session to block/flag a degenerate front=back submission before scoring.
- Add a source-level regression test asserting the rendered Volyume Score UI always displays the confidence label with at least equal visual weight to the numeric score (prevents future refactors from dropping the qualitative label silently).
- Add an explicit `finishScan` re-entrancy guard (ref/flag) independent of upstream button-disable state, since it is the point that mutates `progress_scan_sessions` and is reached via multiple code paths (`continueScanAfterPose`, direct call after side-photo, "Finish without side").

## Premium later opportunities
- Device/camera-model-aware calibration (e.g., adjusting thresholds by known lens distortion or sensor characteristics) — not evidenced today, likely not worth the complexity pre-launch.
- Exposing the internally-computed uncertainty range in the UI as an explicit "likely range" chip (data already exists as `hiddenLegacyRange`/margin) if the founder decides more transparency is worth the added complexity — currently deliberately hidden per code naming, so this is a design decision, not a bug.

## Things not to rebuild
- The `scanComparability`/`scanSetupStability` layered-gate design is thorough and already tested; do not simplify or collapse these thresholds without dedicated review.
- The withhold/soft-warning split (`SCORE_WITHHOLD_REASONS` vs. other reasons) and the confidence-tier/trend-calling gate are well-factored pure functions — reuse, don't reimplement.
- The engine/UI isolation pattern in `progressScanCoachResolver.js` plus its guard test is a good template if the founder wants MORE surfaces to safely reference the scan as read-only context — extend this pattern rather than adding new direct wiring into `weeklyCoach.js`/`nutritionEngine.js`.

## Questions for Fable
1. The Coach-output screen visibly renders progress-scan trend context (title/body at `CoachOutputScreen.js:2044-2046`) even though it never affects targets. Given the founder fact that photos/scans are "NOT linked to Coach/check-ins," is this UI-level, non-target-affecting surfacing intentional and approved, or does it need to be removed/hidden to match that stated invariant?
2. Should a duplicate-photo-content check (same image reused for two poses) be added before launch, given it can silently produce a falsely "consistent" measured score?
3. Should the internally-computed uncertainty range (`hiddenLegacyRange`) be exposed to users, or is hiding it and showing only the qualitative confidence label + band the deliberate, approved design?
