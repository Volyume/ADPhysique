# Scout report: Results UI, history, and comparison

## Files inspected
- `src/screens/ProgressPhotosScreen.js` (full, 2193 lines) — main gallery/timeline/hub screen
- `src/screens/CoachOutputScreen.js` (targeted sections: imports, state, render) — weekly coach output screen
- `src/components/ProgressPhotoViewer.js` — full-size single-photo viewer
- `src/components/ProgressPhotoCompare.js` — side-by-side / slider / overlay comparison
- `src/components/ProgressScanCompare.js` — scored-scan-pair comparison ("Compare photo sets")
- `src/components/ProgressScanHistoryCard.js` — per-scan history card (score/band/change/weight grid)
- `src/components/BeforeAfterShareSheet.js` — before/after share card sheet
- `src/hooks/usePhotoSuppression.js` — shared ED-safety suppression gate
- `src/lib/progressScanDisplay.js` — score formatting helpers (`formatVolyumeScore`, etc.)
- `src/lib/progressScanCompareViewModel.js` — pure compare-pair selection/model logic
- `src/lib/progressScanAnalysis.js` (full, 1584 lines) — scoring engine, confidence, bias flags, delta/trend explanation, `coachSummaryFromScan`
- `src/lib/progressScanCoachResolver.js` (full) — out-of-engine resolver that turns a scan into Coach-screen copy
- `src/lib/progressPhotosController.js` (full) — pure helpers: visible/scored scan filters, delete flows, completeness model
- `src/lib/shareCard/beforeAfterParams.js` (full) — share-card param builder (dates, elapsed, weight, scan range)
- `src/lib/__tests__/progressScanCoachResolver.test.js` (partial) — resolver invariants
- Directory listing of `src/lib/__tests__/progress*` and `src/screens/__tests__/ProgressPhotosScreen.*` for test inventory

## Search terms used
`progressPhoto|ProgressPhoto|physiqueScan|PhysiqueScan|scanResult|ScanResult` (repo-wide grep, 47 files)
`score|Score|confidence|Confidence|precision|percentile` (in `progressScanStore.js`)
`coachSummary|weeklyCoach|runWeeklyCoach|CoachOutputScreen|WeeklyCheckIn` (repo-wide, to trace any Coach linkage)
`coachSummaryFromScan|progressScanCoachResolver` (repo-wide, to confirm actual wiring)
`progressScanCoachContext|ProgressScanCoachContext` (in `CoachOutputScreen.js`, with context lines)
`measurements` (in progress-photo screen/components, to check measurements relationship)

## Current-state evidence

**Gallery / timeline.** `ProgressPhotosScreen.js` renders a single dated "check-in card" timeline (`renderCheckInCard`, `src/screens/ProgressPhotosScreen.js:1047-1144`) grouped by month header, built by `buildCheckInTimeline`/`filterAndSort` (`src/lib/progressPhotoTimeline.js`). Controls: pose filter chips (All/Front/Back/Side), sort (Newest/Oldest), and a date-range filter (`PhotoDateRangeSheet`). Each card shows a cover photo, a photo-count badge, date, weight ("- " joined with pose summary), pose chips (done/not-done), an optional note, and, only if a same-day scan exists, a 3-cell score row (`libraryScoreRow`: Score / Leanness / Change) built by `libraryScanSummary()` (`ProgressPhotosScreen.js:1032-1046`).

**Scan/score display.** The score is the "Volyume Score", 0-100, formatted `formatVolyumeScore()` → `"NN/100"` (`src/lib/progressScanDisplay.js:19-23`). Band labels come from `PROGRESS_SCAN_LEANNESS_BANDS` (Foundation/Active/Athletic/Defined/Lean/Very Lean/Peak Condition, `src/lib/progressScanAnalysis.js:39-47`). Confidence tiers (High/Moderate/Low/Not enough confidence/Unknown) are shown as a "Read quality" pill on `ProgressScanHistoryCard` (`src/components/ProgressScanHistoryCard.js:152-157`) and as "Scan Confidence" text in `progressScanAssessmentCopy()` (`src/lib/progressScanAnalysis.js:815-832`).

**Withheld/failed scan display.** `unscoredState()` in `ProgressScanHistoryCard.js:45-54` maps abstention reasons to labels: "Analysis unavailable", "Retake needed", "Not enough confidence", "Measured only", "Not scored" — each with matching explanatory body copy (`whyLabel`, lines 105-125). The engine itself withholds a score for reasons like `too_dark`, `too_blurry`, `whole_body_not_visible`, `multiple_people`, `pose_not_clear`, `estimate_out_of_range` (`SCORE_WITHHOLD_REASONS`, `progressScanAnalysis.js:23-37`), and a scan review step ("Check {pose} photo") lets the user retake before committing (`ProgressPhotosScreen.js:1664-1720`, "Retake this photo?" prompt at `ProgressPhotosScreen.js:784-799`).

**Comparison surfaces (two distinct ones).**
1. `ProgressPhotoCompare` (`src/components/ProgressPhotoCompare.js`) — plain-photo compare with three modes (Side by side / Slider / Overlay). This surface is contractually banned from any score/weight/before-after language: "before, after, change, gained, lost, weight, kg, lbs, cm, delta, leaner, bigger, smaller, %, em dash" (component header comment, lines 14-19), enforced by a colocated regex test. Labels are strictly "Earlier"/"Later" + date.
2. `ProgressScanCompare` (`src/components/ProgressScanCompare.js`) — scored-scan compare ("Compare photo sets"). This one DOES show score, band, weight, and a free-text delta explanation ("Why this looks different") — i.e., the neutral-copy ban applies only to the plain-photo compare, not the scan compare.

**Deltas.** `explainMeasuredScanDelta()` (`progressScanAnalysis.js:1035-1190`) produces `trendSummary`/`summary`/`coachSummary` strings such as "Volyume Score is up/down N points from the last comparable photo set", gated by `scanComparability()` (`progressScanAnalysis.js:961-1019`), which refuses to compare scans that are too close in time (<7 days), of differing quality, low confidence, or whose camera setup shifted too much (lighting/framing/tilt/distance thresholds, `scanSetupStability`, lines 901-950).

**Confidence/uncertainty.** A numeric confidence score (0-1) and tier (`computeScanConfidenceScore`, lines 412-435) drive both what is shown and whether a trend is "called" at all (`progressSignalFromDelta`, lines 707-723, uses different thresholds per confidence tier and returns "inconclusive" below "low"). `uncertaintyMarginPctPoints`/`buildEstimateRange` exist (lines 233-262) but the legacy numeric body-fat range is explicitly NOT surfaced: `hiddenLegacyRange` in the returned object (`progressScanAnalysis.js:1526`) and `rangeLow: null, rangeHigh: null` hard-coded in both `coachSummaryFromScan` (line 1553-1554) and `resolveProgressScanCoachNote` (line 121-122), with a dedicated test asserting body-fat ranges never leak into Coach copy (`progressScanCoachResolver.test.js:24-46`).

**Bodyweight relationship.** `ProgressPhotoViewer` shows the nearest-logged bodyweight beside a single photo, gated: `showWeight = !suppressed && !hideWeight && currentMeta?.weightKg != null` (`ProgressPhotoViewer.js:339`). `ProgressScanHistoryCard` shows a "Weight" cell per scan (`weightLabel()`, lines 99-103). The plain-photo `ProgressPhotoCompare` never shows weight (banned word). The `BeforeAfterShareSheet` shows weight only via an explicit per-export opt-in toggle ("Include weight on this export", lines 511-521), which is the founder-approved exception documented in CLAUDE.md.

**Measurements relationship.** No screen or component in this audit surfaces body measurements (waist/hip/etc. in cm) to the user — the underlying engine computes silhouette ratios (waist-to-shoulder, waist-to-hip, waist-to-height, body-area) purely as scoring inputs, never displayed as numbers. `BeforeAfterShareSheet.js` explicitly states measurements are "kept private" / "never included" (lines 443, 536, 541) — not evidenced anywhere as a user-facing measurement display.

**Share card.** `BeforeAfterShareSheet` composites two photos into ONE PNG via Skia (`drawShareCard`), including dates, elapsed time, and (per toggle) weight and Volyume Score band ("Included"/"Kept private" receipt UI, lines 523-543). Withheld entirely under `usePhotoSuppression()` (fail-closed) and Pro-gated (`active = visible && !suppressed && tier === 'pro'`, line 162). One-time confirm dialog before first export (lines 317-335).

**Empty/loading/error states.** Content-shaped skeleton (`SkeletonCard` x3) while loading (`ProgressPhotosScreen.js:1327-1339`); a distinct "Couldn't load progress photos" error state with "Try again" when a refresh fails and no photos exist yet (lines 1340-1357), and a persistent-but-non-blocking "Couldn't refresh photos" banner when photos exist but a refresh failed (lines 1209-1228); a plain "No saved photos yet" / "No photos on this device" (read-only) empty state (lines 1358-1373); and pose/date-filtered empty copy ("No photos with this pose yet.", etc., lines 1375-1386). `ProgressScanCompare` and `ProgressPhotoCompare` each have their own "Two [scored] photo sets are needed" placeholder.

**CONTRADICTION vs. founder fact ("photos/scans are NOT linked to Coach/check-ins").** `CoachOutputScreen.js` imports `getProgressScanCoachSummary` (from `progressScanStore.js`) and `resolveProgressScanCoachNote`/`applyProgressScanCoachContext` (from `progressScanCoachResolver.js`), and:
- calls `resolveProgressScanCoachNote({ scan: scanCoachSummary, output: result, suppressed: ..., trendOnly: ... })` (`CoachOutputScreen.js:1444-1449`);
- gates display on `canShowProgressScanCoachContext = !!progressScanCoachContext && !edPatternOpen && !calmMode` (line 1725);
- renders a visible card titled `progressScanCoachContext.title` ("Progress photo context") with `progressScanCoachContext.body` directly in the Coach output UI (`CoachOutputScreen.js:2042-2049`: `<Text style={styles.planEditHead}>{progressScanCoachContext.title}</Text> <Text style={styles.planEditBody}>{progressScanCoachContext.body}</Text>`);
- also splices `scanNote.coachLine` into `coachResponse.interpretation` via `applyProgressScanCoachContext` (line 1769), so the scan-derived sentence can appear inside the coach's own written interpretation text, not just in a separate card.
This is a genuine UI-level link between progress scans and the Coach screen. The code is careful that it `affectsTargets: false` and never changes calorie/macro targets or engine outputs (confirmed by `progressScanCoachResolver.test.js` asserting no leakage of `floorKcal|ffm|katch|deeper cut` etc. into the note), and the resolver file's own header states it is "deliberately NOT part of weeklyCoach or nutritionEngine" (`progressScanCoachResolver.js:1-8`). So the ENGINE is isolated, but the **screen-level UI is linked**: a user viewing the weekly Coach output does see photo-scan-derived text on that screen. Given the founder's stated fact is that photos/scans are NOT linked to Coach/check-ins, this UI wiring should be flagged and reconciled — either the founder fact needs updating, or this card is a scope item that should not exist / should be reviewed for removal.

## What is evidenced
- A single, well-integrated dated timeline mixing plain photos and scored scan sets (`ProgressPhotosScreen.js`).
- A 0-100 "Volyume Score" with named leanness bands and a confidence tier, formatted consistently (`progressScanDisplay.js`, `progressScanAnalysis.js`).
- Two structurally different comparison surfaces with different content rules (photo-only "neutral" compare vs. scored "Compare photo sets").
- A quality/comparability gate that withholds scoring and/or trend-calling when photos are low quality, mismatched setup, or too close in time.
- Fail-closed ED-safety suppression (`usePhotoSuppression`) applied consistently across Compare, Scan Compare, Viewer's weight line, and the Share sheet.
- A share card mechanism that composites one PNG, with an explicit "included/kept private" receipt shown to the user before sharing.
- A direct UI-level link from progress scans into the weekly Coach output screen (see CONTRADICTION above), even though the coaching engine's numeric outputs are untouched.

## What is not evidenced
- No user-facing numeric body measurements (cm) display anywhere in the reviewed files — not evidenced.
- No percentile / population comparison ("better than X% of users") — not evidenced anywhere in these files.
- No visible body-fat-percentage range shown to the user; `rangeLow`/`rangeHigh` are explicitly nulled at every display boundary — not evidenced as user-facing.
- No in-app trend chart/line graph of the Volyume Score over time (the "Compare photo sets" surface is pairwise, two scans at a time, not a chart) — not evidenced.
- No onboarding/explainer screen dedicated to how the Volyume Score is computed was found in this file set (only inline copy strings) — not fully evidenced; a `MethodologyScreen.js` exists in `src/screens/` but was not opened in this pass, so its content re: scoring is not evidenced either way.

## What already works well
- The comparability/quality gate (`scanComparability`, `progressScanAnalysis.js:961-1019`) is a genuinely calm design: it refuses to call a trend rather than guessing, with specific, legible reasons ("Photo sets are too close together for a fair progress comparison.", "The photo setup changed too much for a fair comparison.").
- The neutral-copy contract on the plain photo Compare (`ProgressPhotoCompare.js` header comment + banned-word test) is a strong, testable anti-score-chasing guardrail for the surface most likely to be used casually.
- Confidence tiers gate the progress signal itself, not just its display: "inconclusive" is returned rather than a directional claim when confidence is low (`progressSignalFromDelta`, lines 707-723).
- The Share sheet's "Included / Kept private" receipt (`BeforeAfterShareSheet.js:523-543`) is an unusually clear, honest UI pattern for what leaves the device.
- Failure/abstention states have specific, actionable copy (e.g., "Retake with clearer lighting, your full body in frame, and a similar camera setup next time", `progressScanAnalysis.js:818`), rather than a generic error.

## Accuracy/trust risks
- The score is a blend of a silhouette-ratio computation and a provisional, `status: 'still_calibrating_for_your_body_type'` body-fat estimator (`calibrationStatus`, `progressScanAnalysis.js:804`), with an "anchor" mechanism that can pull the silhouette score up to 20 points and down 8-26 points depending on bias flags (`ESTIMATOR_ANCHOR_MAX_UPWARD_POINTS`/`_DOWNWARD_POINTS`/`_LARGE_BODY_DOWNWARD_POINTS`, lines 525-528). This complexity is invisible to the user; only the final "NN/100" and band appear. A precision-overclaim risk exists if a user reads "NN/100" as an exact, stable measurement rather than a calibrating estimate, since no uncertainty band is ever shown alongside the number itself (only a separate confidence-tier word).
- `normaliseStoredPhysiqueAssessment()` (lines 644-689) silently recalibrates historically-stored scores under certain conditions (score version migration), which could shift a previously-seen number for the same photo set on a later view; not itself a bug, but a latent "the number moved without the photo changing" surprise if a user compares screenshots across app versions.
- Bias flags (`female_overestimation_risk`, `darker_skin_overestimation_risk`, `very_muscular`, etc., lines 212-231) directly widen the uncertainty margin and shift score weighting, but none of these flags or their effect are disclosed to the user anywhere in the reviewed UI — the user sees only a confidence tier word, not why.

## UX/safety risks
- The CONTRADICTION above (scan context surfaced on `CoachOutputScreen`) is the primary safety-relevant finding: even though `affectsTargets: false` is enforced, a user in a vulnerable state seeing photo-derived body language on the Coach screen is a different exposure surface than the Progress Photos screen itself, and is only suppressed there via `!edPatternOpen && !calmMode` (screen-local flags), not via the shared `usePhotoSuppression()` hook used everywhere else in the progress-photo surfaces. That is a second, differently-implemented suppression path for the same category of high-risk content, which is worth reconciling for consistency (same intent, different mechanism from the rest of this audit's evidence).
- `ProgressScanHistoryCard`/`ProgressScanCompare`/`libraryScanSummary` are NOT covered by the plain-photo-compare's banned-word contract, so words like "leaner", "progress", "drift", "positive" do appear in scan-adjacent copy ("Clear positive trend", "Slight drift", "Progress photos also show positive change", `PROGRESS_SIGNAL_COPY`, `progressScanAnalysis.js:49-58`; `coachLine()`, `progressScanCoachResolver.js:67-80`). This is presumably an intentional scope boundary (scored scans are explicitly about visual change, plain photos are not), but it means the ED-safety copy guarantee is narrower than "all progress-photo surfaces."
- The 7-day minimum interval gate on starting a new scan is soft — the user can override it ("Save photos anyway", `ProgressPhotosScreen.js:538-541`), with a warning that the score "may be less useful" rather than blocking. This is reasonable but is a place where score-chasing behavior (re-scanning frequently to see movement) is only discouraged, not prevented.

## Tests found
- `src/screens/__tests__/ProgressPhotosScreen.addFlow.test.js`, `ProgressPhotosScreen.compare.test.js`, `ProgressPhotosScreen.progressScan.guard.test.js`
- `src/lib/sync/__tests__/progressPhotoMetaNoSync.guard.test.js` (photo metadata never syncs)
- `src/lib/__tests__/progressScanModel.guard.test.js`, `progressScanStore.delete.test.js`, `progressPhotoDates.test.js`, `progressPhotoMeta.test.js`, `progressPhotos.test.js`, `progressPhotosController.test.js`, `progressPhotoTimeline.test.js`
- `src/lib/__tests__/progressScanAnalysis.test.js` (includes `coachSummaryFromScan` suppression/no-body-fat-leak assertions, lines ~1052-1064)
- `src/lib/__tests__/progressScanCoachResolver.test.js` (asserts: suppressed/non-photo-source → null; never exposes body-fat range; `affectsTargets: false`; no engine-jargon leak like `floorKcal|ffm|katch`)
- `src/lib/__tests__/progressScanCompareViewModel.test.js`, `progressScanCalibrationAccess.test.js`, `progressScanCalibrationCorpus.test.js`, `progressScanCalibrationExport.test.js`, `progressScanCopy.test.js`, `progressScanPreferences.test.js`, `progressScanSafetyFloorIsolation.test.js`, `progressScanVision.test.js`, `progressScanBodyMExternal.test.js`
- `src/components/__tests__/BeforeAfterShareSheet.test.js`, `BeforeAfterShareSheet.backfill.test.js`, `ProgressGhostCapture.test.js`, `ProgressPhotoCompare.test.js` (holds the neutral-copy banned-word regex), `ProgressPhotoPrompt.test.js`, `ProgressPhotoViewer.test.js`
- `src/__tests__/e8FlashList.guard.test.js`, `iaNavigation.guard.test.js`, `lapsedReadOnly.guard.test.js`, `proScreenGating.guard.test.js` (progress-photos-adjacent gating guards)
- `src/screens/__tests__/wellbeingFailClosed.guard.test.js` (pins the raw wellbeing read byte-exact, referenced from `usePhotoSuppression.js` comments)

## Launch-critical opportunities
- Reconcile the CoachOutputScreen scan-context card against the founder fact "photos/scans are NOT linked to Coach/check-ins" — either the fact is stale (this feature already shipped and is intended), or this is unreviewed scope that should be pulled/gated before further Coach-adjacent work proceeds. This needs a founder decision per CLAUDE.md's "no silent corner-cutting" workflow rule, since it is a direct factual conflict, not a judgement call.
- Align the suppression mechanism used on `CoachOutputScreen` (local `edPatternOpen`/`calmMode` state) with the shared `usePhotoSuppression()` hook used everywhere else in the progress-photo surfaces, so there is one fail-closed suppression path for this content category rather than two independently-maintained ones.

## Premium later opportunities
- A dedicated score-over-time chart (multiple points, not just pairwise compare) could make long-run trend legible without behaving like a percentile/competitive display — would need the same comparability gating applied per-point rather than per-pair.
- Surfacing (in general terms, not raw numbers) why a bias flag widened the confidence margin, e.g. "confidence is lower for this pair because lighting changed" is already computed (`scanSetupStability` issues) but not shown to the user; exposing a plain-English version could increase trust without adding numeric precision.
- A shared word-ban/tone contract for the scored-scan copy (`ProgressScanCompare`, `ProgressScanHistoryCard`, `progressScanCoachResolver`) equivalent to the one already enforced on `ProgressPhotoCompare`, if the product intent is for score commentary to be as calm as the neutral photo compare.

## Things not to rebuild
- The photo-only Compare's neutral-copy contract and its colocated banned-word test (`ProgressPhotoCompare.js` + test) is a deliberate, hard-won ED-safety design; do not weaken or bypass it.
- The comparability/quality gating in `progressScanAnalysis.js` (`scanComparability`, `abstentionReasonsForAssets`, `SCORE_WITHHOLD_REASONS`) already encodes a large amount of careful threshold tuning; treat as a black box to extend, not replace.
- `usePhotoSuppression()`'s fail-closed pattern (start suppressed, only lift after both reads confirm) is the correct shape for any new high-risk surface in this domain; reuse it rather than re-deriving suppression logic locally (as `CoachOutputScreen` currently does).
- The Share sheet's single-composited-PNG mechanism (`drawShareCard`) and its "Included / Kept private" receipt UI already satisfy the GDPR/share-card rule; do not introduce a second share path that could diverge from it.

## Questions for Fable
1. Is the "Progress photo context" card on `CoachOutputScreen` (`src/screens/CoachOutputScreen.js:2042-2049`) intentional, already-reviewed scope, or does it contradict the stated founder fact that photos/scans are not linked to Coach/check-ins? If intentional, should its suppression be migrated onto the shared `usePhotoSuppression()` hook for consistency with every other high-risk progress-photo surface?
2. Is there a deliberate reason the ED-safety neutral-copy word ban applies only to the plain-photo `ProgressPhotoCompare` and not to the scored-scan surfaces (`ProgressScanCompare`, `ProgressScanHistoryCard`, `progressScanCoachResolver`), which do use words like "leaner", "positive", "drift"?
3. Was a Volyume-Score-over-time chart ever scoped, or is pairwise "Compare photo sets" the intended permanent ceiling for how trend is shown?
