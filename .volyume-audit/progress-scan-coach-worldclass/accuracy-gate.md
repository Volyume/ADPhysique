# Progress Scan Accuracy Gate

Run: 2026-07-09. Lead: Fable. Audit agent: Opus (read-only re-audit of the current tree after
the five progress-photos implementation waves).

## 1. Current branch and commit

- Branch: `claude/codebase-audit-docs-pv6mjd`
- Commit at audit: `44272de` (log commit `1e51d7e` added during this run, docs only)
- Working tree: clean at audit time

## 2. Files inspected

`src/lib/progressScanAnalysis.js`, `src/lib/progressScanResultsContract.js`,
`src/lib/progressScanTrendViewModel.js`, `src/lib/progressScanStore.js`,
`src/lib/progressPhotosController.js`, `src/lib/progressCaptureGuide.js`,
`src/lib/progressPhotoMeta.js`, `src/lib/progressScanDisplay.js`,
`src/screens/ProgressPhotosScreen.js`, `src/components/ProgressScanCompare.js`,
`src/components/ProgressScanTrend.js`, `src/components/ProgressScanMeaningMoment.js`,
plus their `__tests__` suites (46 progress suites run).

## 3. Current scoring model

On-device MediaPipe/TFLite segmentation feeding a deterministic silhouette-derived 0-100
"Volyume Score". An internal provisional body-fat regressor acts only as a bounded anchor
(±8 points, `PROVISIONAL_ANCHOR_MAX_POINTS`, `progressScanAnalysis.js:566,674-684`); when the
anchor shifts the score by more than 4 points, confidence is capped at Moderate and the
calibration-honesty line is shown (`buildPhysiqueAssessment` 815-819). Body-fat values are
written null to storage (`progressScanStore.js:395-399`) and never surfaced. Layered quality
gates produce enumerated withhold/soft-warning reasons; comparability gating and an
adjacent-pair trend model protect repeatability.

## 4. Score meaning verdict

The score is presented solely as confidence-gated visual progress evidence ("Volyume Score
X/100"). The meaning-moment copy states explicitly it is "not a body fat measurement"
(`progressScanResultsContract.js:303-304`). No body-fat number, range, or claim reaches any
user surface (test-pinned: `progressScanAnalysis.test.js:967`). Framing is correct; no
reframing needed.

## 5. Accuracy/trust gate checklist

| # | Gate item | Verdict | Evidence | Risk | Fix needed |
|---|-----------|---------|----------|------|------------|
| 1 | Score meaning clear, no overclaim | PASS | `progressScanDisplay.js:19-23`; BF nulled `progressScanStore.js:395-399`; ±8 anchor clamp + Moderate cap `progressScanAnalysis.js:566,674-684,815-819`; disclaimer `resultsContract.js:303-304` | Low | None |
| 2 | Inputs quality-controlled | PASS | Gates + enumerated abstentions `progressScanAnalysis.js:211-239,1477-1519`; quick-add/guided-single permanent `unscored` tag `ProgressPhotosScreen.js:464-468`, `progressPhotoMeta.js:156-157`; check-in score-lend fence `progressPhotosController.js:91-92`; SHA-256 duplicate withhold `progressScanStore.js:192-210` | Low | None |
| 3 | Confidence real and visible | PASS | Tiers high/moderate/low/not_enough `progressScanAnalysis.js:424-431`; rendered contract `resultsContract.js:52-157` (not_enough hides score, low needs explicit reveal); chip on every score surface (`ProgressPhotosScreen.js:1196-1208`, `ProgressScanCompare.js:58-72`, trend markers) | Low | None |
| 4 | Withhold logic strong | PASS | `SCORE_WITHHOLD_REASONS` enumerated `progressScanAnalysis.js:23-38`; calm condition-blaming copy `162-180`; withheld → `progressSignal:'inconclusive'`, never drift `1495-1497` | Low | None |
| 5 | Repeatability protected | PASS | `scanComparability` (poses, ≥7-day interval, quality, tier, setup stability) `1025-1083`; adjacent-pair-only trend `trendViewModel.js:40-73`; 3 comparable points before trend language `78-84`; baseline → trend_pending | Low | None |
| 6 | Receipts exist | PASS | `buildScanReceipt` covers scored / scored_downgraded / withheld / baseline / not_comparable `resultsContract.js:238-285`; Why? affordance `ProgressPhotosScreen.js:1227-1230,1295-1299`; recalibration note surfaced | Low | None |
| 7 | Tests exist | PASS | Full inventory below; 554 tests green | Low | None |

## 6. Tests found

- Score volatility/sensitivity: `progressScanSensitivityHarness`, `progressScanRetestHarness`
  (Tier 1 test-retest + sensitivity script modes)
- Confidence tiers + reveal affordance: `progressScanResultsContract.test.js` (35 assertions),
  `.toneContract`
- Withhold, duplicate, low-quality input: `progressScanAnalysis.test.js`,
  `progressScanStore.contentHash.test.js`
- Result receipts: within `progressScanResultsContract.test.js`
- Trend/comparability: `progressScanTrendViewModel.test.js`, `progressScanCompareViewModel`
- Coach/safety isolation: `progressScanSafetyFloorIsolation`,
  `progressScanCoachIsolation.guard`, `progressScanCoachEvidence`
- Privacy: `progressPhotoExif`, `progressScanStore.delete` (per-user wipe)

Run result: `Test Suites: 1 skipped, 46 passed, 46 of 47 total; Tests: 4 skipped, 554 passed,
558 total`. Lint clean (`eslint . --max-warnings 0`). The one skipped suite is
`progressScanVision.test.js` — known pre-existing sandbox-only failure (missing
`react-native-fast-tflite` native build artifact), present on the base branch.

## 7. Tests missing

None in the required categories. (The only untestable-in-Jest item remains the iOS
backup-exclusion attribute, which is on the manual device checklist per wave 5.)

## 8. Fable verdict

**PASS** — scoring is world-class enough to proceed to Coach/check-in evidence integration.
The score's meaning is honest and enforced, inputs are fenced, confidence is rendered and
test-pinned, withhold and comparability logic are deterministic and receipted, and the full
targeted suite is green.

## 9. Required fixes before integration

None.
