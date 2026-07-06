import {
  analyseProgressScanPhoto,
  assetFieldsFromVisionResult,
  base64ToUint8Array,
  measureMaskSignals,
  resolveProgressScanModelSource,
  retakeCopyForVisionResult,
  unavailableVisionResult,
} from '../progressScanVision';

const mockDownloadAsync = jest.fn(async () => ({
  localUri: 'file:///cache/selfie_segmentation.tflite',
  uri: 'assets_ml_selfie_segmentation',
}));
const mockFromModule = jest.fn(() => ({
  localUri: null,
  uri: 'assets_ml_selfie_segmentation',
  downloadAsync: mockDownloadAsync,
}));
const mockExtractRgb = jest.fn();
const mockLoadTensorflowModel = jest.fn();

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: mockFromModule,
  },
}));
jest.mock('progress-scan-image', () => ({
  extractRgb: (...args) => mockExtractRgb(...args),
}));
jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: (...args) => mockLoadTensorflowModel(...args),
}));

function syntheticPersonMask({
  width = 256, height = 256, shiftX = 0, top = 26, bottom = 236,
} = {}) {
  const mask = new Float32Array(width * height).fill(0.04);
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

function bytesToBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += chars[(n >> 18) & 63];
    out += chars[(n >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? chars[n & 63] : '=';
  }
  return out;
}

describe('Progress Scan vision signal extraction', () => {
  beforeEach(() => {
    mockDownloadAsync.mockClear();
    mockFromModule.mockClear();
    mockExtractRgb.mockReset();
    mockLoadTensorflowModel.mockReset();
  });

  test('base64 decoder returns exact bytes without relying on Buffer', () => {
    expect(Array.from(base64ToUint8Array('AAECA/8='))).toEqual([0, 1, 2, 3, 255]);
  });

  test('resolves bundled TFLite model to a protocol URL before native loading', async () => {
    await expect(resolveProgressScanModelSource()).resolves.toEqual({
      url: 'file:///cache/selfie_segmentation.tflite',
    });
    expect(mockFromModule).toHaveBeenCalledWith(1);
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  test('does not pass bare Android asset keys to the native TFLite URL loader', async () => {
    mockDownloadAsync.mockResolvedValueOnce({
      localUri: null,
      uri: 'assets_ml_selfie_segmentation',
    });
    await expect(resolveProgressScanModelSource()).resolves.toBeNull();

    mockDownloadAsync.mockResolvedValueOnce({
      localUri: null,
      uri: 'assets_ml_selfie_segmentation',
    });
    mockExtractRgb.mockResolvedValueOnce({
      rgbBase64: bytesToBase64(new Uint8Array(256 * 256 * 3).fill(128)),
      lightingScore: 0.9,
      blurScore: 0.9,
    });
    const result = await analyseProgressScanPhoto({ uri: 'file:///scan.jpg', pose: 'front' });
    expect(result.modelBacked).toBe(false);
    expect(result.abstentionReasons).toContain('model_unavailable');
    expect(mockLoadTensorflowModel).not.toHaveBeenCalled();
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

  test('no-person and unreadable images ask for a new pose photo instead of silently saving as analysed', () => {
    const noPerson = measureMaskSignals(new Float32Array(256 * 256).fill(0.02), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });
    expect(noPerson.modelBacked).toBe(false);
    expect(noPerson.needsRetake).toBe(true);
    expect(retakeCopyForVisionResult(noPerson)).toMatch(/one clear person/i);

    const unreadable = unavailableVisionResult('native_preprocess_unavailable');
    expect(unreadable.needsRetake).toBe(true);
    expect(retakeCopyForVisionResult(unreadable)).toMatch(/new photo/i);
  });

  test('letterboxed preprocessing measures ratios inside the content rect, not padding', () => {
    const mask = syntheticPersonMask({ top: 82, bottom: 174 });
    const padded = measureMaskSignals(mask, {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });
    const contentMeasured = measureMaskSignals(mask, {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
      contentRect: { x: 0, y: 64, width: 256, height: 128 },
    });
    expect(contentMeasured.contentRect).toEqual({ x: 0, y: 64, width: 256, height: 128 });
    expect(contentMeasured.silhouetteRatios.bboxHeightRatio).toBeGreaterThan(padded.silhouetteRatios.bboxHeightRatio);
    expect(contentMeasured.bodyBox.y).toBeCloseTo((82 - 64) / 128, 2);
  });

  test('asset fields persist bounded metrics, not raw image data', () => {
    const result = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });
    const fields = assetFieldsFromVisionResult(result);
    expect(fields.qualityScore).toBeGreaterThan(0.7);
    expect(fields.landmarkConfidence).toBeGreaterThan(0.7);
    expect(fields.signals.modelBacked).toBe(true);
    expect(JSON.stringify(fields)).not.toMatch(/file:|base64|rgbBase64/i);
  });
});
