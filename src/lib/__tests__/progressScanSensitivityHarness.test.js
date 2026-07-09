/**
 * Tier 1 single-factor sensitivity harness (scoring-accuracy-and-validation-
 * blueprint.md §10 Tier 1 item 3), wave 5.
 *
 * The founder-run cross-condition sensitivity sweep varies one factor at a
 * time (lighting, distance/framing, clothing/background, camera tilt)
 * against the SAME subject and confirms "the gates catch what they claim to
 * catch" (blueprint §10.3: each degraded condition must trigger the
 * matching reason code or a confidence drop). This harness scores a
 * baseline capture and each single-factor variant with the REAL engine
 * (`analyseProgressScan` / `estimateBodyFatFromScanAssets`, never
 * re-implemented) and reports which reason codes fired and whether
 * confidence dropped.
 *
 * The built-in fixture below is a SMOKE fixture (synthetic, deliberately
 * degraded past the engine's own published quality gates in
 * progressScanAnalysis.js's FINAL_SCAN_QUALITY_GATES) — it proves the
 * harness correctly detects when a reason code fires or confidence drops.
 * Real cross-condition photos (via PROGRESS_SCAN_SENSITIVITY_FILE) are what
 * actually validates the product claim on real capture conditions; see
 * scripts/run-progress-scan-sensitivity-report.cjs and
 * docs/progress-scan-validation.md.
 *
 * Fixture format (also documented in docs/progress-scan-validation.md):
 * [
 *   {
 *     "subjectId": "s1",
 *     "label": "free text",
 *     "sex": "male" | "female", "heightCm": number, "weightKg": number,
 *     "baseline": { "ratios": {...}, "quality": {...} },
 *     "variants": [
 *       { "factor": "lighting" | "distance" | "clothing" | "tilt", "label": "...",
 *         "ratios": {...} (optional overrides), "quality": {...} (optional overrides) }
 *     ]
 *   }
 * ]
 */
import fs from 'fs';
import path from 'path';
import {
  analyseProgressScan,
  estimateBodyFatFromScanAssets,
} from '../progressScanAnalysis';

function assetForCapture(ratios, quality, pose) {
  const q = {
    segmentationConfidence: quality.segmentationConfidence ?? 0.9,
    framingScore: quality.framingScore ?? 0.9,
    blurScore: quality.blurScore ?? 0.9,
    lightingScore: quality.lightingScore ?? 0.9,
    poseConfidence: quality.poseConfidence ?? 0.9,
    backgroundSeparation: quality.backgroundSeparation ?? 0.9,
    cameraTiltDegrees: quality.cameraTiltDegrees ?? 0,
  };
  return {
    pose,
    qualityScore: quality.qualityScore ?? 0.9,
    segmentationConfidence: q.segmentationConfidence,
    framingScore: q.framingScore,
    blurScore: q.blurScore,
    lightingScore: q.lightingScore,
    landmarkConfidence: q.poseConfidence,
    cameraTiltDegrees: q.cameraTiltDegrees,
    signals: {
      modelBacked: true,
      engine: 'sensitivity_harness_fixture',
      modelVersion: 'sensitivity_harness_fixture_v1',
      quality: q,
      bodyBox: {
        width: ratios.bboxWidthRatio ?? 0.34, height: ratios.bboxHeightRatio ?? 0.74, centerX: 0.5, centerY: 0.5,
      },
      silhouetteRatios: ratios,
      abstentionReasons: [],
    },
  };
}

function scoreCapture(sweep, ratios, quality) {
  const assets = [
    assetForCapture(ratios, quality, 'front'),
    assetForCapture(ratios, quality, 'back'),
  ];
  const modelEstimate = estimateBodyFatFromScanAssets({
    assets, sex: sweep.sex, heightCm: sweep.heightCm, weightKg: sweep.weightKg,
  });
  const out = analyseProgressScan({
    assets, modelEstimate, sex: sweep.sex, heightCm: sweep.heightCm, weightKg: sweep.weightKg,
  });
  const reasons = [
    ...(out.abstentionReasons || []),
    ...(out.qualityWarnings || []),
  ];
  return {
    analysisStatus: out.analysisStatus,
    withheld: out.analysisStatus === 'abstained',
    score: out.physiqueAssessment?.visualLeannessScore ?? null,
    confidenceTier: out.physiqueAssessment?.scanConfidenceTier ?? null,
    reasons,
  };
}

const CONFIDENCE_RANK = {
  not_enough: 0, unknown: 0, low: 1, moderate: 2, high: 3,
};

// A degraded condition "catches" per blueprint §10.3 if either its expected
// reason code fired, OR confidence dropped relative to the baseline (the
// harness never assumes which one a given engine version will choose).
function variantCatches(baselineResult, variantResult, expectedReasonCode) {
  const reasonFired = expectedReasonCode ? variantResult.reasons.includes(expectedReasonCode) : false;
  const baselineRank = CONFIDENCE_RANK[baselineResult.confidenceTier] ?? 0;
  const variantRank = CONFIDENCE_RANK[variantResult.confidenceTier] ?? 0;
  const confidenceDropped = variantRank < baselineRank || variantResult.withheld;
  return { reasonFired, confidenceDropped, caught: reasonFired || confidenceDropped };
}

function scoreSweep(sweep) {
  const baselineRatios = sweep.baseline.ratios;
  const baselineQuality = sweep.baseline.quality || {};
  const baselineResult = scoreCapture(sweep, baselineRatios, baselineQuality);
  const variantResults = (sweep.variants || []).map((variant) => {
    const ratios = { ...baselineRatios, ...(variant.ratios || {}) };
    const quality = { ...baselineQuality, ...(variant.quality || {}) };
    const result = scoreCapture(sweep, ratios, quality);
    const expectedReasonCode = EXPECTED_REASON_BY_FACTOR[variant.factor] || null;
    return {
      factor: variant.factor ?? null,
      label: variant.label ?? null,
      expectedReasonCode,
      ...result,
      ...variantCatches(baselineResult, result, expectedReasonCode),
    };
  });
  return {
    subjectId: sweep.subjectId ?? null,
    label: sweep.label ?? null,
    baseline: baselineResult,
    variants: variantResults,
  };
}

// The reason code each factor is expected to be able to trigger, per the
// scoring-accuracy-and-validation-blueprint.md §11 test matrix. This is a
// CLAIM the harness checks against the real engine's own reason vocabulary
// (abstentionReasonsForAssets in progressScanAnalysis.js); it is not
// re-implemented scoring logic, just the expected label for reporting.
const EXPECTED_REASON_BY_FACTOR = {
  lighting: 'too_dark',
  distance: 'whole_body_not_visible',
  clothing: 'clothing_or_background_uncertain',
  tilt: 'camera_tilted',
};

function loadExternalSweeps(envVarName = 'PROGRESS_SCAN_SENSITIVITY_FILE') {
  const file = process.env[envVarName];
  if (!file) return [];
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${envVarName} was set but does not exist: ${resolved}`);
  }
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^﻿/, ''));
  if (!Array.isArray(parsed)) {
    throw new Error(`${envVarName} must contain an array of sensitivity sweeps.`);
  }
  return parsed;
}

// Smoke fixture: one baseline (clean, well-lit, well-framed capture) plus
// one variant per factor, each degraded clearly past the engine's own
// published gates (progressScanAnalysis.js FINAL_SCAN_QUALITY_GATES:
// lighting 0.25, framing 0.25, separation 0.20, tiltDegrees 20) so the
// smoke test can assert deterministically that the reason code fires.
const BUILTIN_SWEEPS = [
  {
    subjectId: 'smoke_sweep_1',
    label: 'Smoke fixture, athletic male baseline',
    sex: 'male',
    heightCm: 176,
    weightKg: 78,
    baseline: {
      ratios: {
        waistToShoulder: 0.69, waistToHip: 0.87, waistToHeight: 0.245, bodyAreaRatio: 0.35, frontBackWaistSpread: 0.02, bboxHeightRatio: 0.74, bboxWidthRatio: 0.34,
      },
      quality: {
        qualityScore: 0.9, segmentationConfidence: 0.9, framingScore: 0.9, blurScore: 0.9, lightingScore: 0.9, poseConfidence: 0.9, backgroundSeparation: 0.9, cameraTiltDegrees: 0,
      },
    },
    variants: [
      { factor: 'lighting', label: 'Backlit / very dark room', quality: { lightingScore: 0.12 } },
      { factor: 'distance', label: 'Too close, whole body not in frame', quality: { framingScore: 0.15 } },
      { factor: 'clothing', label: 'Baggy dark clothing, low background separation', quality: { backgroundSeparation: 0.08 } },
      { factor: 'tilt', label: 'Phone propped at a steep angle', quality: { cameraTiltDegrees: 32 } },
    ],
  },
];

const SHOULD_REPORT = process.env.PROGRESS_SCAN_SENSITIVITY_REPORT === '1';
const ALL_SWEEPS = [...BUILTIN_SWEEPS, ...loadExternalSweeps()];

describe('Progress Scan single-factor sensitivity harness (Tier 1 item 3)', () => {
  const sweepResults = ALL_SWEEPS.map(scoreSweep);

  afterAll(() => {
    if (!SHOULD_REPORT) return;
    // eslint-disable-next-line no-console
    console.info(JSON.stringify({
      generatedAt: new Date().toISOString(),
      sweepCount: sweepResults.length,
      sweeps: sweepResults,
    }, null, 2));
  });

  test('the baseline capture in the built-in sweep scores cleanly (not withheld)', () => {
    for (const sweep of sweepResults) {
      expect(sweep.baseline.withheld).toBe(false);
      expect(sweep.baseline.score).not.toBeNull();
    }
  });

  test('each single-factor variant triggers its matching reason code (or a confidence drop)', () => {
    for (const sweep of sweepResults) {
      for (const variant of sweep.variants) {
        expect(variant.caught).toBe(true);
      }
    }
  });

  test('the lighting/distance/clothing/tilt variants specifically fire their own named reason code', () => {
    for (const sweep of sweepResults) {
      for (const variant of sweep.variants) {
        expect(variant.reasonFired).toBe(true);
        expect(variant.reasons).toContain(variant.expectedReasonCode);
      }
    }
  });

  test('an external PROGRESS_SCAN_SENSITIVITY_FILE fixture is parsed and merged in (loader smoke test)', () => {
    const tmpFile = path.join(require('os').tmpdir(), `progress-scan-sensitivity-smoke-${Date.now()}.json`);
    const externalSweep = [{
      subjectId: 'external_smoke',
      label: 'External loader smoke test',
      sex: 'female',
      heightCm: 166,
      weightKg: 63,
      baseline: {
        ratios: {
          waistToShoulder: 0.68, waistToHip: 0.72, waistToHeight: 0.23, bodyAreaRatio: 0.33, frontBackWaistSpread: 0.012, bboxHeightRatio: 0.74, bboxWidthRatio: 0.34,
        },
        quality: {
          qualityScore: 0.9, segmentationConfidence: 0.9, framingScore: 0.9, blurScore: 0.9, lightingScore: 0.9, poseConfidence: 0.9, backgroundSeparation: 0.9,
        },
      },
      variants: [
        { factor: 'lighting', label: 'External dim room', quality: { lightingScore: 0.1 } },
      ],
    }];
    fs.writeFileSync(tmpFile, JSON.stringify(externalSweep));
    try {
      process.env.PROGRESS_SCAN_SENSITIVITY_FILE = tmpFile;
      const loaded = loadExternalSweeps();
      expect(loaded).toHaveLength(1);
      const scored = scoreSweep(loaded[0]);
      expect(scored.variants[0].reasonFired).toBe(true);
    } finally {
      delete process.env.PROGRESS_SCAN_SENSITIVITY_FILE;
      fs.unlinkSync(tmpFile);
    }
  });

  test('a missing PROGRESS_SCAN_SENSITIVITY_FILE path throws a clear error rather than silently skipping data', () => {
    process.env.PROGRESS_SCAN_SENSITIVITY_FILE = '/definitely/not/a/real/path.json';
    try {
      expect(() => loadExternalSweeps()).toThrow(/does not exist/);
    } finally {
      delete process.env.PROGRESS_SCAN_SENSITIVITY_FILE;
    }
  });
});
