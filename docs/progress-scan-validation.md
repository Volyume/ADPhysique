# Progress Scan validation

Volyume Score is a photo-consistency and physique-progress read. It must feel fair across real physiques without pretending to be a lab body-fat test.

## Release gate

Run:

```bash
npm run progress-scan:calibration
```

For a diagnostic table of the same cases, run:

```bash
npm run progress-scan:calibration-report
```

For an optional external real-silhouette smoke test, run:

```bash
npm run progress-scan:bodym
```

This downloads a small sample from the public BodyM dataset at run time. It is intentionally not part of normal CI because it depends on network access and a third-party dataset.

For a deeper external diagnostic pass across every usable public BodyM subject,
run:

```bash
npm run progress-scan:bodym-report
```

That full report is slower. It prints score distribution, sex split, lean-vs-large
reference averages and any large/high-waist subjects that still land in a lean
band. Treat those rows as tuning evidence, not as a body-fat accuracy claim.

To run the calibration corpus report and the full BodyM report back to back,
use:

```bash
npm run progress-scan:full-audit
```

That is the quickest way to regenerate the current external evidence bundle
before a release discussion.

To add non-committed real-photo cases from APK testing, save a JSON array outside Git and run the same gate with:

```bash
PROGRESS_SCAN_CALIBRATION_FILE=/path/to/real-progress-scan-cases.json npm run progress-scan:calibration
```

To inspect those real APK cases without waiting for a failing assertion to tell
you what moved, run:

```bash
npm run progress-scan:calibration-report -- /path/to/real-progress-scan-cases.json
```

The report prints each case's displayed score, band, confidence, measured
inputs, score internals and pass/fail state. Use it for tuning discussion; use
`npm run progress-scan:calibration` as the release gate.

If you have a JSON export produced by `getProgressScanCalibrationJson` from the
app, you can replay it directly with:

```bash
npm run progress-scan:replay -- /path/to/export.json
```

That is the simplest path for real APK photos or on-device scan exports when
you want to inspect the exact measured ratios and score internals again.

On a release APK signed in as a founder test account, open Progress Photos and
long-press the privacy note at the top of the page. Volyume writes a sanitized
`volyume_progress_scan_signals_*.json` file and opens the native share sheet.
This file is intended for calibration only. It contains ratios, quality metrics
and score expectations; it must not contain photo names, file paths, user ids,
emails or image data.

The calibration corpus checks representative score bands for:

- lean and very lean muscular users
- broad-frame and stockier lifters
- average athletic users
- softer starting points
- female athletic users
- tall/narrow and shorter/stockier body shapes
- weaker but still usable capture quality

The test must keep these cases inside motivating, defensible bands while keeping exact body-fat estimate fields hidden.

## Real-photo expansion

Do not commit user photos, downloaded comparison photos, or copyrighted guide images. For real APK testing, capture or import photos on-device, then add only the non-image scan signals to the corpus:

- sex, height, weight
- front/back/side silhouette ratios
- scan quality scores
- confidence tier
- expected Volyume Score range and allowed band labels
- notes about the test condition, such as bright room, darker clothing, tall frame, stocky frame, lean muscular, or softer starting point

The app can then be tuned against real measured signals without storing private photos in Git.

Use `getProgressScanCalibrationJson(userId, scanId, opts)` from `src/lib/progressScanStore.js` when you need a saved local scan converted into the corpus shape. It exports ratios, quality metrics, expected score band and confidence only; it must not include photo names, file paths, user ids, emails or image data.

## External shape-smoke checks

The BodyM smoke test uses public real-subject silhouette masks, height, weight, gender and body measurements to check that Volyume can extract finite silhouette ratios and bounded scores across varied body sizes. It is useful for shape robustness, PNG/mask decoding, guarding against obvious score inversions across height and waist differences, and checking that camera-distance changes inside usable framing do not swing the Volyume Score by more than a few points.

Current coverage:

- thirteen bucketed public BodyM subjects spanning male and female users,
  underweight through obese BMI ranges, and measured waist-to-height extremes
- finite front/back/side silhouette ratios and bounded scores
- high-BMI or high-waist subjects must not remain in a "Defined" or leaner
  band simply because the silhouette ratios look deceptively narrow
- lower-waist reference subjects must score clearly above the large/high-waist
  reference group
- scaling the same silhouette within usable framing must keep the displayed
  score within five points
- a too-close/cropped silhouette must be withheld instead of forced into a score
- weaker-but-usable quality must reduce confidence without materially changing
  the body read
- optional full-audit mode scores every usable BodyM subject and reports any
  large/high-waist subject that still lands too lean

It is not body-fat ground truth. BodyM does not provide DXA or validated body-fat labels, so it must not be used to claim exact body-fat accuracy. Treat it as one layer beneath real APK scan exports and controlled validation photos.

Example real-case shape:

```json
[
  {
    "id": "real_lean_male_s23_bright_room",
    "label": "Real APK scan, lean male, S23, bright room",
    "sex": "male",
    "heightCm": 180,
    "weightKg": 82,
    "ratios": {
      "waistToShoulder": 0.63,
      "waistToHip": 0.78,
      "waistToHeight": 0.19,
      "bodyAreaRatio": 0.30,
      "frontBackWaistSpread": 0.01,
      "bboxHeightRatio": 0.74,
      "bboxWidthRatio": 0.34
    },
    "quality": {
      "qualityScore": 0.9,
      "segmentationConfidence": 0.9,
      "framingScore": 0.88,
      "blurScore": 0.86,
      "lightingScore": 0.92,
      "poseConfidence": 0.9,
      "backgroundSeparation": 0.9
    },
    "expected": {
      "min": 80,
      "max": 94,
      "bands": ["Lean", "Very Lean"],
      "minConfidence": "moderate"
    }
  }
]
```

## Tier 1 test-retest and sensitivity harnesses

Two more Tier 1 gaps (scoring-accuracy-and-validation-blueprint.md §10 Tier 1
items 2 and 3) have harness support alongside the calibration corpus and
BodyM smoke checks above:

```bash
npm run progress-scan:retest-report
npm run progress-scan:sensitivity-report
```

Both print a JSON report from the real scoring engine (never a re-implementation of it) and, like the replay commands above, accept an external, non-committed fixture file:

```bash
PROGRESS_SCAN_RETEST_FILE=/path/to/retest-sessions.json npm run progress-scan:retest-report
PROGRESS_SCAN_SENSITIVITY_FILE=/path/to/sensitivity-sweeps.json npm run progress-scan:sensitivity-report
```

**Test-retest** (`src/lib/__tests__/progressScanRetestHarness.test.js`) scores
every repeated capture in a session and reports the score spread, plus a
"noise floor per confidence tier" summary across every subject. This is the
harness for the founder-run study in the blueprint (>= 10 volunteers, 3
repeats each, >= 3 phone models): the acceptance line — high-tier repeats
within +/-3 points, else retune the tiers/thresholds — is judged against
that REAL data via `PROGRESS_SCAN_RETEST_FILE`, never against the built-in
smoke fixture, which only proves the harness's own parsing and maths are
correct.

**Sensitivity** (`src/lib/__tests__/progressScanSensitivityHarness.test.js`)
scores one baseline capture plus single-factor variants (lighting, distance/
framing, clothing/background, camera tilt) and reports which reason code
fired, or whether confidence dropped, for each. The built-in smoke fixture
degrades each factor clearly past the engine's own published quality gates
so the harness can assert deterministically that the matching reason code
fires; real cross-condition photos are what actually proves the gates catch
what they claim to on real capture conditions.

Fixture shapes for both are documented in each harness test file's header
comment, reusing the same `ratios`/`quality` shape as the calibration corpus
cases above.

### Reconciliation with the scoring-accuracy-and-validation-blueprint

No contradictions found between this doc and the blueprint. This doc already
matches the blueprint's Tier 1 item 1 (internal consistency corpus,
maintained with every threshold change) and its stance that the BodyM smoke
test is shape/robustness evidence only, never a body-fat ground-truth claim
— consistent with the blueprint §10 Tier 2 note that full ground-truth
validation is a founder-commissioned programme, not a code task. This doc
did not yet cover Tier 1 items 2 (test-retest) and 3 (sensitivity sweep)
before this wave; the two harnesses above fill exactly that gap and nothing
more. Item 4 (anchor audit) is already covered by the existing calibration
corpus's anchor-clamp tests in `progressScanAnalysis.test.js` (wave 1); no
harness change was needed there.

## Interpreting failures

A failure is not automatically a bad test. It means one of three things:

- the score logic is unfair and needs tuning
- the expected band is too inflated or too harsh
- the scan quality is too weak and should lower confidence rather than force a precise read

Release confidence comes from the corpus passing, on-device APK scans agreeing with the corpus direction, and no regressions in the Progress Scan focused tests.
