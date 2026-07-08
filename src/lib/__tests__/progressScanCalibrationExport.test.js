import {
  buildProgressScanCalibrationCase,
  buildProgressScanCalibrationJson,
} from '../progressScanCalibrationExport';
import {
  analyseProgressScan,
  estimateBodyFatFromScanAssets,
} from '../progressScanAnalysis';

function scanAssetFromCalibrationCase(testCase, pose) {
  const ratios = {
    ...(testCase.ratios || {}),
    ...(testCase.poseRatios?.[pose] || {}),
  };
  const quality = testCase.quality || {};
  return {
    pose,
    qualityScore: quality.qualityScore ?? 0.9,
    segmentationConfidence: quality.segmentationConfidence ?? 0.9,
    framingScore: quality.framingScore ?? 0.9,
    blurScore: quality.blurScore ?? 0.9,
    lightingScore: quality.lightingScore ?? 0.9,
    landmarkConfidence: quality.poseConfidence ?? 0.9,
    cameraTiltDegrees: quality.cameraTiltDegrees ?? 0,
    signals: {
      modelBacked: true,
      engine: 'calibration_export_test',
      modelVersion: 'calibration_export_test_v1',
      quality: {
        segmentationConfidence: quality.segmentationConfidence ?? 0.9,
        framingScore: quality.framingScore ?? 0.9,
        blurScore: quality.blurScore ?? 0.9,
        lightingScore: quality.lightingScore ?? 0.9,
        poseConfidence: quality.poseConfidence ?? 0.9,
        backgroundSeparation: quality.backgroundSeparation ?? 0.9,
        cameraTiltDegrees: quality.cameraTiltDegrees ?? 0,
      },
      silhouetteRatios: ratios,
      abstentionReasons: [],
    },
  };
}

const savedScan = {
  id: 'scan-1',
  userId: 'user-1',
  capturedAt: Date.UTC(2026, 6, 8),
  stats: { weightKg: 82 },
  signals: {
    estimatorInputs: { sex: 'male', bmi: 25.3 },
    physiqueAssessment: {
      visualLeannessScore: 83,
      leannessBandLabel: 'Lean',
      scanConfidenceTier: 'moderate',
    },
    assets: [
      {
        pose: 'front',
        photoName: 'front.jpg',
        uri: 'file:///private/progress_photos/user-1/front.jpg',
        qualityScore: 0.9,
        segmentationConfidence: 0.91,
        framingScore: 0.88,
        blurScore: 0.87,
        lightingScore: 0.92,
        quality: { backgroundSeparation: 0.9, poseConfidence: 0.89 },
        silhouetteRatios: {
          waistToShoulder: 0.64,
          waistToHip: 0.79,
          waistToHeight: 0.19,
          bodyAreaRatio: 0.3,
          bboxHeightRatio: 0.74,
          bboxWidthRatio: 0.34,
        },
      },
      {
        pose: 'back',
        photoName: 'back.jpg',
        uri: 'file:///private/progress_photos/user-1/back.jpg',
        qualityScore: 0.89,
        segmentationConfidence: 0.9,
        framingScore: 0.89,
        blurScore: 0.86,
        lightingScore: 0.91,
        quality: { backgroundSeparation: 0.88, poseConfidence: 0.9 },
        silhouetteRatios: {
          waistToShoulder: 0.62,
          waistToHip: 0.77,
          waistToHeight: 0.18,
          bodyAreaRatio: 0.29,
          bboxHeightRatio: 0.74,
          bboxWidthRatio: 0.33,
        },
      },
    ],
  },
};

describe('progress scan calibration export', () => {
  test('builds a corpus-ready case without leaking image paths or identifiers', () => {
    const testCase = buildProgressScanCalibrationCase(savedScan, {
      label: 'Real APK scan smoke case',
      notes: 'bright room, S23 rear camera',
    });

    expect(testCase).toMatchObject({
      id: 'real_progress_scan_20260708',
      label: 'Real APK scan smoke case',
      sex: 'male',
      weightKg: 82,
      expected: {
        min: 79,
        max: 87,
        bands: ['Lean'],
        minConfidence: 'moderate',
      },
    });
    expect(testCase.heightCm).toBeCloseTo(180, 0);
    expect(testCase.ratios.waistToShoulder).toBeCloseTo(0.63);
    expect(testCase.poseRatios.front.waistToHeight).toBe(0.19);
    expect(testCase.quality.segmentationConfidence).toBeCloseTo(0.905);

    const json = buildProgressScanCalibrationJson(savedScan);
    expect(json).not.toMatch(/file:|front\.jpg|back\.jpg|photoName|uri|user-1|progress_photos/i);
  });

  test('exported case can be replayed through the calibration scorer', () => {
    const testCase = buildProgressScanCalibrationCase(savedScan);
    const assets = [
      scanAssetFromCalibrationCase(testCase, 'front'),
      scanAssetFromCalibrationCase(testCase, 'back'),
    ];
    const modelEstimate = estimateBodyFatFromScanAssets({
      assets,
      sex: testCase.sex,
      heightCm: testCase.heightCm,
      weightKg: testCase.weightKg,
    });
    const out = analyseProgressScan({
      assets,
      modelEstimate,
      sex: testCase.sex,
      heightCm: testCase.heightCm,
      weightKg: testCase.weightKg,
    });

    expect(out.analysisStatus).toBe('complete');
    expect(out.physiqueAssessment.visualLeannessScore)
      .toBeGreaterThanOrEqual(testCase.expected.min);
    expect(out.physiqueAssessment.visualLeannessScore)
      .toBeLessThanOrEqual(testCase.expected.max);
  });
});
