import {
  assetFieldsFromVisionResult,
  base64ToUint8Array,
  measureMaskSignals,
  retakeCopyForVisionResult,
} from '../progressScanVision';

function syntheticPersonMask({ width = 256, height = 256, shiftX = 0 } = {}) {
  const mask = new Float32Array(width * height).fill(0.04);
  const top = 26;
  const bottom = 236;
  const bodyHeight = bottom - top;
  for (let y = top; y <= bottom; y += 1) {
    const rel = (y - top) / bodyHeight;
    const halfWidth = 18
      + 24 * Math.exp(-((rel - 0.24) ** 2) / 0.012)
      + 13 * Math.exp(-((rel - 0.66) ** 2) / 0.018)
      - 6 * Math.exp(-((rel - 0.52) ** 2) / 0.014);
    const cx = Math.round(width / 2 + shiftX);
    for (let x = Math.max(0, Math.round(cx - halfWidth)); x <= Math.min(width - 1, Math.round(cx + halfWidth)); x += 1) {
      mask[y * width + x] = 0.96;
    }
  }
  return mask;
}

describe('Progress Scan vision signal extraction', () => {
  test('base64 decoder returns exact bytes without relying on Buffer', () => {
    expect(Array.from(base64ToUint8Array('AAECA/8='))).toEqual([0, 1, 2, 3, 255]);
  });

  test('TFLite mask measurements produce quality and silhouette signals', () => {
    const result = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });
    expect(result.modelBacked).toBe(true);
    expect(result.quality.segmentationConfidence).toBeGreaterThan(0.75);
    expect(result.quality.framingScore).toBeGreaterThan(0.55);
    expect(result.silhouetteRatios.waistToShoulder).toBeGreaterThan(0);
    expect(result.silhouetteRatios.waistToHip).toBeGreaterThan(0);
    expect(result.abstentionReasons).toEqual([]);
    expect(retakeCopyForVisionResult(result)).toBeNull();
  });

  test('poor capture quality creates a retake reason instead of a forced estimate', () => {
    const result = measureMaskSignals(syntheticPersonMask({ shiftX: 70 }), {
      lightingScore: 0.2,
      blurScore: 0.9,
      pose: 'front',
    });
    expect(result.needsRetake).toBe(true);
    expect(result.abstentionReasons).toContain('too_dark');
    expect(retakeCopyForVisionResult(result)).toMatch(/too dark/i);
  });

  test('asset fields persist bounded metrics, not raw image data', () => {
    const result = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });
    const fields = assetFieldsFromVisionResult(result);
    expect(fields.qualityScore).toBeGreaterThan(0.7);
    expect(fields.landmarkConfidence).toBeNull();
    expect(fields.signals.modelBacked).toBe(true);
    expect(JSON.stringify(fields)).not.toMatch(/file:|base64|rgbBase64/i);
  });
});
