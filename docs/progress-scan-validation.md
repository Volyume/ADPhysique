# Progress Scan validation

Volyume Score is a photo-consistency and physique-progress read. It must feel fair across real physiques without pretending to be a lab body-fat test.

## Release gate

Run:

```bash
npm run progress-scan:calibration
```

For an optional external real-silhouette smoke test, run:

```bash
npm run progress-scan:bodym
```

This downloads a small sample from the public BodyM dataset at run time. It is intentionally not part of normal CI because it depends on network access and a third-party dataset.

To add non-committed real-photo cases from APK testing, save a JSON array outside Git and run the same gate with:

```bash
PROGRESS_SCAN_CALIBRATION_FILE=/path/to/real-progress-scan-cases.json npm run progress-scan:calibration
```

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

The BodyM smoke test uses public real-subject silhouette masks, height, weight, gender and body measurements to check that Volyume can extract finite silhouette ratios and bounded scores across varied body sizes. It is useful for shape robustness, PNG/mask decoding, and guarding against obvious score inversions across height and waist differences.

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

## Interpreting failures

A failure is not automatically a bad test. It means one of three things:

- the score logic is unfair and needs tuning
- the expected band is too inflated or too harsh
- the scan quality is too weak and should lower confidence rather than force a precise read

Release confidence comes from the corpus passing, on-device APK scans agreeing with the corpus direction, and no regressions in the Progress Scan focused tests.
