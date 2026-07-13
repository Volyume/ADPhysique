/**
 * D81 anonymity contract: the calibration telemetry row must be anonymous
 * BY CONSTRUCTION -- no user id, no photo uri or name, no note text, no
 * exact timestamp, height/weight only as 5-unit bands. These tests are the
 * lock on that construction: if a future edit adds an identifying field,
 * the JSON sweep here fails before it ships.
 */
import { buildScanCalibrationRow, fiveUnitBand } from '../progressScanCalibrationTelemetry';

const assets = [
  {
    pose: 'front',
    uri: 'file:///photos/secret-name.jpg',
    fileName: 'IMG_1234.jpg',
    signals: {
      engine: 'fast_tflite',
      modelVersion: 'mediapipe_selfie_segmentation_general_builtin_ops_v2',
      measurementVersion: 'silhouette_bands_anatomical_v3',
      silhouetteRatios: { waistToShoulder: 0.55, waistToHip: 0.72, waistToHeight: 0.17, bodyAreaRatio: 0.18, bboxHeightRatio: 0.82, bboxWidthRatio: 0.43 },
      quality: { segmentationConfidence: 0.97, framingScore: 0.68, cameraTiltDegrees: 0.5 },
    },
  },
  {
    pose: 'back',
    uri: 'file:///photos/secret-name-2.jpg',
    signals: {
      engine: 'fast_tflite',
      silhouetteRatios: { waistToShoulder: 0.56, waistToHip: 0.77 },
      quality: { segmentationConfidence: 0.96 },
    },
  },
];

const physiqueAssessment = {
  visualLeannessScore: 88,
  leannessBandLabel: 'Lean',
  scanConfidenceTier: 'high',
};

function build(overrides = {}) {
  return buildScanCalibrationRow({
    assets,
    physiqueAssessment,
    estimatorInputs: { waistToShoulder: 0.55, waistToHip: 0.72, waistToHeight: 0.177, bodyAreaRatio: 0.175, bmi: 28.1 },
    sex: 'male',
    heightCm: 177.9,
    weightKg: 88.9,
    appVersion: '1.2.0',
    userId: 'user-abc-123',
    ...overrides,
  });
}

describe('scan calibration telemetry row', () => {
  test('carries the calibration numbers, provenance and banded stats', () => {
    const row = build();
    expect(row.score).toBe(88);
    expect(row.band).toBe('Lean');
    expect(row.confidence).toBe('high');
    expect(row.sex).toBe('male');
    expect(row.height_band).toBe('175-180');
    expect(row.weight_band).toBe('85-90');
    expect(row.engine).toBe('fast_tflite');
    expect(row.measurement_version).toBe('silhouette_bands_anatomical_v3');
    expect(row.pose_ratios.front.waistToShoulder).toBe(0.55);
    expect(row.quality.front.segmentationConfidence).toBe(0.97);
    expect(row.ratios.bmi).toBe(28.1);
  });

  test('is anonymous by construction: no user id, uri, file name, exact height/weight or timestamp survives', () => {
    const json = JSON.stringify(build());
    expect(json).not.toMatch(/user|uid|uri|file|photo|name|note|177\.9|88\.9/i);
    expect(json).not.toMatch(/secret|IMG_/);
    expect(json).not.toMatch(/\d{13}/); // no epoch-ms timestamps
  });

  test('returns null when the scan produced no score', () => {
    expect(build({ physiqueAssessment: { visualLeannessScore: null } })).toBeNull();
    expect(build({ physiqueAssessment: null })).toBeNull();
  });

  test('five-unit bands are coarse and never leak the exact value', () => {
    expect(fiveUnitBand(177.9)).toBe('175-180');
    expect(fiveUnitBand(180)).toBe('180-185');
    expect(fiveUnitBand(null)).toBeNull();
    expect(fiveUnitBand(-3)).toBeNull();
  });
});
