/**
 * Progress-scan formula invariants (5-agent accuracy audit, 2026-07-12).
 *
 * Property tests that pin what the Volyume Score engine must ALWAYS do,
 * independent of any specific fixture: never throw on garbage, never emit an
 * out-of-range or band-less score, and never score a capture whose withhold
 * reasons say the data was unreliable. These run against the REAL engine.
 *
 * Deliberately absent: the global leaner-never-scores-lower monotonicity
 * property. It is VIOLATED today by the blend-weight step and the in-score
 * spread component (audit A-F1/A-F2, decisions D1/D2) and the fix is deferred
 * to the device-validated corpus retune on the founder's launch-stability
 * direction -- add the property test in that fast-follow, not before.
 */
import {
  analyseProgressScan,
  computeVisualLeannessScore,
  calibrateVolyumeScore,
  leannessBandForScore,
  estimateBodyFatFromScanAssets,
  PROGRESS_SCAN_LEANNESS_BANDS,
} from '../progressScanAnalysis';

function measuredAsset(pose, ratios, quality = {}) {
  return {
    pose,
    qualityScore: 0.9,
    segmentationConfidence: quality.segmentationConfidence ?? 0.9,
    framingScore: 0.9,
    blurScore: 0.9,
    lightingScore: 0.9,
    landmarkConfidence: 0.9,
    signals: {
      modelBacked: true,
      quality: { poseConfidence: 0.9, backgroundSeparation: 0.9, cameraTiltDegrees: 0, ...quality },
      silhouetteRatios: ratios,
      abstentionReasons: [],
    },
  };
}

const GARBAGE_INPUTS = [
  null,
  undefined,
  {},
  { assets: null },
  { assets: [null] },
  { assets: [undefined, null, {}] },
  { assets: [{ pose: 'front' }, null, { pose: 'back', signals: 'not-json{{{' }] },
  { assets: [{ pose: 'weird' }], modelEstimate: NaN },
  { assets: [{ pose: 'front', qualityScore: 'NaN', signals: { silhouetteRatios: { waistToShoulder: Infinity } } }] },
  {
    assets: [
      measuredAsset('front', { waistToShoulder: NaN, waistToHip: 'x', waistToHeight: null, bodyAreaRatio: -Infinity }),
      measuredAsset('back', {}),
    ],
    sex: 'neither',
    heightCm: -5,
    weightKg: 1e9,
  },
];

describe('progress-scan invariants: garbage in never throws', () => {
  test.each(GARBAGE_INPUTS.map((input, i) => [i, input]))('garbage case %#', (_i, input) => {
    expect(() => {
      const out = analyseProgressScan(input ?? undefined);
      // Whatever comes back, the score slot is null or a bounded integer.
      const score = out?.physiqueAssessment?.visualLeannessScore;
      if (score != null) {
        expect(Number.isFinite(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }).not.toThrow();
  });
});

describe('progress-scan invariants: bounds and bands', () => {
  test('every integer score 0..100 maps to exactly one leanness band', () => {
    for (let s = 0; s <= 100; s += 1) {
      const bands = PROGRESS_SCAN_LEANNESS_BANDS.filter((b) => s >= b.min && s <= b.max);
      expect(bands).toHaveLength(1);
      expect(leannessBandForScore(s)).toBe(bands[0]);
    }
  });

  test('fractional and out-of-range scores still resolve to a band or null, never a gap', () => {
    expect(leannessBandForScore(96.5)).not.toBeNull(); // the old (96,97) gap
    expect(leannessBandForScore(-3)).toBe(PROGRESS_SCAN_LEANNESS_BANDS[0]);
    expect(leannessBandForScore(900)).toBe(PROGRESS_SCAN_LEANNESS_BANDS[PROGRESS_SCAN_LEANNESS_BANDS.length - 1]);
    expect(leannessBandForScore(null)).toBeNull();
    expect(leannessBandForScore(NaN)).toBeNull();
  });

  test('silhouette and calibrated scores stay inside [0,100] across an input grid', () => {
    for (let w2s = 0.3; w2s <= 1.1; w2s += 0.1) {
      for (let w2h = 0.1; w2h <= 0.5; w2h += 0.05) {
        const raw = computeVisualLeannessScore({
          waistToShoulder: w2s,
          waistToHip: 0.6 + w2s * 0.3,
          waistToHeight: w2h,
          bodyAreaRatio: 0.2 + w2h * 0.5,
          frontBackWaistSpread: 0.02,
        });
        expect(raw).toBeGreaterThanOrEqual(0);
        expect(raw).toBeLessThanOrEqual(100);
        const calibrated = calibrateVolyumeScore(raw);
        expect(calibrated).toBeGreaterThanOrEqual(0);
        expect(calibrated).toBeLessThanOrEqual(100);
      }
    }
  });

  test('a full analysis of a plausible scan emits an integer score with a band and a confidence tier', () => {
    const ratios = {
      waistToShoulder: 0.65, waistToHip: 0.8, waistToHeight: 0.21, bodyAreaRatio: 0.33, frontBackWaistSpread: 0.012,
    };
    const assets = [measuredAsset('front', ratios), measuredAsset('back', ratios)];
    const out = analyseProgressScan({
      assets,
      modelEstimate: estimateBodyFatFromScanAssets({ assets, sex: 'male', heightCm: 178, weightKg: 80 }),
      sex: 'male',
      heightCm: 178,
      weightKg: 80,
    });
    const score = out.physiqueAssessment.visualLeannessScore;
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(out.physiqueAssessment.leannessBand).toBeTruthy();
    expect(['high', 'moderate', 'low', 'not_enough']).toContain(out.physiqueAssessment.scanConfidenceTier);
  });
});

describe('progress-scan invariants: withhold reasons withhold', () => {
  test('a scan whose asset carries a withhold reason never shows a score', () => {
    const ratios = {
      waistToShoulder: 0.65, waistToHip: 0.8, waistToHeight: 0.21, bodyAreaRatio: 0.33, frontBackWaistSpread: 0.012,
    };
    const withheldReasons = ['no_person_detected', 'multiple_people', 'too_dark', 'too_blurry', 'pose_not_clear'];
    for (const reason of withheldReasons) {
      const front = measuredAsset('front', ratios);
      front.signals.abstentionReasons = [reason];
      const out = analyseProgressScan({ assets: [front, measuredAsset('back', ratios)] });
      expect(out.analysisStatus).toBe('abstained');
      expect(out.physiqueAssessment?.visualLeannessScore ?? null).toBeNull();
      expect(out.abstentionReasons).toContain(reason);
    }
  });
});
