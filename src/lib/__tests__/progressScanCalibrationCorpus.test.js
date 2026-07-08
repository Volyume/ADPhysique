import fs from 'fs';
import path from 'path';
import {
  analyseProgressScan,
  estimateBodyFatFromScanAssets,
} from '../progressScanAnalysis';

function assetForCase(testCase, pose, overrides = {}) {
  const ratios = {
    ...testCase.ratios,
    ...(testCase.poseRatios?.[pose] || {}),
    ...(overrides.ratios || {}),
  };
  const quality = {
    segmentationConfidence: testCase.quality?.segmentationConfidence ?? 0.9,
    framingScore: testCase.quality?.framingScore ?? 0.9,
    blurScore: testCase.quality?.blurScore ?? 0.9,
    lightingScore: testCase.quality?.lightingScore ?? 0.9,
    poseConfidence: testCase.quality?.poseConfidence ?? 0.9,
    backgroundSeparation: testCase.quality?.backgroundSeparation ?? 0.9,
    cameraTiltDegrees: testCase.quality?.cameraTiltDegrees ?? 0,
  };
  return {
    pose,
    qualityScore: testCase.quality?.qualityScore ?? 0.9,
    segmentationConfidence: quality.segmentationConfidence,
    framingScore: quality.framingScore,
    blurScore: quality.blurScore,
    lightingScore: quality.lightingScore,
    landmarkConfidence: quality.poseConfidence,
    cameraTiltDegrees: quality.cameraTiltDegrees,
    signals: {
      modelBacked: true,
      engine: 'calibration_fixture',
      modelVersion: 'calibration_fixture_v1',
      quality,
      bodyBox: {
        width: ratios.bboxWidthRatio ?? 0.34,
        height: ratios.bboxHeightRatio ?? 0.74,
        centerX: 0.5,
        centerY: 0.5,
      },
      silhouetteRatios: ratios,
      abstentionReasons: [],
    },
  };
}

function assetsForCase(testCase) {
  const assets = [
    assetForCase(testCase, 'front'),
    assetForCase(testCase, 'back'),
  ];
  if (testCase.includeSide) assets.push(assetForCase(testCase, 'side'));
  return assets;
}

function scoreCase(testCase) {
  const assets = assetsForCase(testCase);
  const modelEstimate = estimateBodyFatFromScanAssets({
    assets,
    sex: testCase.sex,
    heightCm: testCase.heightCm,
    weightKg: testCase.weightKg,
  });
  return analyseProgressScan({
    assets,
    modelEstimate,
    sex: testCase.sex,
    heightCm: testCase.heightCm,
    weightKg: testCase.weightKg,
    userBiasFlags: testCase.userBiasFlags || [],
  });
}

const CALIBRATION_CASES = [
  {
    id: 'male_very_lean_muscular',
    label: 'Male, very lean and muscular',
    sex: 'male',
    heightCm: 178,
    weightKg: 82,
    ratios: {
      waistToShoulder: 0.58,
      waistToHip: 0.73,
      waistToHeight: 0.18,
      bodyAreaRatio: 0.29,
      frontBackWaistSpread: 0.01,
      bboxHeightRatio: 0.74,
      bboxWidthRatio: 0.32,
    },
    includeSide: true,
    expected: { min: 88, max: 100, bands: ['Lean', 'Very Lean', 'Peak Condition'], minConfidence: 'moderate' },
  },
  {
    id: 'male_lean_broad_frame',
    label: 'Male, lean broad-frame lifter',
    sex: 'male',
    heightCm: 180,
    weightKg: 91,
    ratios: {
      waistToShoulder: 0.63,
      waistToHip: 0.78,
      waistToHeight: 0.20,
      bodyAreaRatio: 0.31,
      frontBackWaistSpread: 0.012,
      bboxHeightRatio: 0.74,
      bboxWidthRatio: 0.36,
    },
    userBiasFlags: ['very_muscular'],
    expected: { min: 80, max: 94, bands: ['Lean', 'Very Lean'], minConfidence: 'moderate' },
  },
  {
    id: 'male_athletic_average_frame',
    label: 'Male, athletic average frame',
    sex: 'male',
    heightCm: 176,
    weightKg: 78,
    ratios: {
      waistToShoulder: 0.69,
      waistToHip: 0.87,
      waistToHeight: 0.245,
      bodyAreaRatio: 0.35,
      frontBackWaistSpread: 0.02,
      bboxHeightRatio: 0.74,
      bboxWidthRatio: 0.34,
    },
    expected: { min: 64, max: 80, bands: ['Athletic', 'Defined'], minConfidence: 'moderate' },
  },
  {
    id: 'male_softer_starting_point',
    label: 'Male, softer starting point',
    sex: 'male',
    heightCm: 178,
    weightKg: 96,
    ratios: {
      waistToShoulder: 0.78,
      waistToHip: 0.98,
      waistToHeight: 0.31,
      bodyAreaRatio: 0.40,
      frontBackWaistSpread: 0.05,
      bboxHeightRatio: 0.74,
      bboxWidthRatio: 0.43,
    },
    expected: { min: 40, max: 62, bands: ['Foundation', 'Active'], minConfidence: 'moderate' },
  },
  {
    id: 'female_athletic',
    label: 'Female, athletic physique',
    sex: 'female',
    heightCm: 166,
    weightKg: 63,
    ratios: {
      waistToShoulder: 0.68,
      waistToHip: 0.72,
      waistToHeight: 0.23,
      bodyAreaRatio: 0.33,
      frontBackWaistSpread: 0.012,
      bboxHeightRatio: 0.74,
      bboxWidthRatio: 0.34,
    },
    expected: { min: 74, max: 92, bands: ['Defined', 'Lean', 'Very Lean'], minConfidence: 'moderate' },
  },
  {
    id: 'tall_lean_narrow_frame',
    label: 'Tall, lean narrower-frame user',
    sex: 'male',
    heightCm: 193,
    weightKg: 84,
    ratios: {
      waistToShoulder: 0.67,
      waistToHip: 0.80,
      waistToHeight: 0.18,
      bodyAreaRatio: 0.28,
      frontBackWaistSpread: 0.01,
      bboxHeightRatio: 0.76,
      bboxWidthRatio: 0.30,
    },
    expected: { min: 80, max: 94, bands: ['Lean', 'Very Lean'], minConfidence: 'moderate' },
  },
  {
    id: 'short_muscular_stocky',
    label: 'Shorter, muscular stocky user',
    sex: 'male',
    heightCm: 165,
    weightKg: 82,
    ratios: {
      waistToShoulder: 0.65,
      waistToHip: 0.80,
      waistToHeight: 0.22,
      bodyAreaRatio: 0.36,
      frontBackWaistSpread: 0.012,
      bboxHeightRatio: 0.73,
      bboxWidthRatio: 0.40,
    },
    userBiasFlags: ['very_muscular'],
    expected: { min: 74, max: 90, bands: ['Defined', 'Lean', 'Very Lean'], minConfidence: 'moderate' },
  },
  {
    id: 'lean_photo_usable_not_ideal',
    label: 'Lean user with usable but weaker capture quality',
    sex: 'male',
    heightCm: 180,
    weightKg: 82,
    ratios: {
      waistToShoulder: 0.63,
      waistToHip: 0.78,
      waistToHeight: 0.19,
      bodyAreaRatio: 0.30,
      frontBackWaistSpread: 0.015,
      bboxHeightRatio: 0.73,
      bboxWidthRatio: 0.34,
    },
    quality: {
      qualityScore: 0.58,
      segmentationConfidence: 0.52,
      framingScore: 0.56,
      blurScore: 0.54,
      lightingScore: 0.58,
      poseConfidence: 0.62,
      backgroundSeparation: 0.52,
    },
    expected: { min: 78, max: 92, bands: ['Defined', 'Lean', 'Very Lean'], minConfidence: 'low' },
  },
];

const CONFIDENCE_RANK = {
  not_enough: 0,
  unknown: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

function loadExternalCalibrationCases() {
  const file = process.env.PROGRESS_SCAN_CALIBRATION_FILE;
  if (!file) return [];
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`PROGRESS_SCAN_CALIBRATION_FILE was set but does not exist: ${resolved}`);
  }
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(parsed)) {
    throw new Error('PROGRESS_SCAN_CALIBRATION_FILE must contain an array of calibration cases.');
  }
  return parsed.map((testCase, index) => ({
    ...testCase,
    id: testCase.id || `external_case_${index + 1}`,
    label: testCase.label || 'External real-photo scan case',
  }));
}

const ALL_CALIBRATION_CASES = [
  ...CALIBRATION_CASES,
  ...loadExternalCalibrationCases(),
];

describe('Progress Scan calibration corpus', () => {
  test.each(ALL_CALIBRATION_CASES)('$id: $label scores inside the release calibration band', (testCase) => {
    const out = scoreCase(testCase);
    const assessment = out.physiqueAssessment;
    const score = assessment?.visualLeannessScore;

    expect(out.analysisStatus).toBe('complete');
    expect(score).toBeGreaterThanOrEqual(testCase.expected.min);
    expect(score).toBeLessThanOrEqual(testCase.expected.max);
    expect(testCase.expected.bands).toContain(assessment.leannessBandLabel);
    expect(CONFIDENCE_RANK[assessment.scanConfidenceTier] ?? 0)
      .toBeGreaterThanOrEqual(CONFIDENCE_RANK[testCase.expected.minConfidence]);
    expect(out.estimate).toBeNull();
    expect(out.range).toBeNull();
  });

  test('a lean muscular user is never shown the raw low silhouette number when calibrated inputs exist', () => {
    const out = scoreCase(CALIBRATION_CASES.find((testCase) => testCase.id === 'male_lean_broad_frame'));
    expect(out.physiqueAssessment.indexInputs.rawSilhouetteScore).toBeLessThan(out.physiqueAssessment.visualLeannessScore);
    expect(out.physiqueAssessment.visualLeannessScore).toBeGreaterThanOrEqual(80);
  });
});
