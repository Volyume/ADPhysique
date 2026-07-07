import {
  analyseProgressScanPhoto,
  assetFieldsFromVisionResult,
  base64ToFloat32Array,
  base64ToUint8Array,
  measureMaskSignals,
  resolveProgressScanModelSource,
  resetProgressScanModelCacheForTests,
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
const mockSegmentPersonMask = jest.fn();
const mockResolveBundledModel = jest.fn(async () => null);
const mockLoadTensorflowModel = jest.fn();

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: mockFromModule,
  },
}));
jest.mock('progress-scan-image', () => ({
  extractRgb: (...args) => mockExtractRgb(...args),
  segmentPersonMask: (...args) => mockSegmentPersonMask(...args),
  resolveBundledModel: (...args) => mockResolveBundledModel(...args),
}));
jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: (...args) => mockLoadTensorflowModel(...args),
}));

function syntheticPersonMask({
  width = 256, height = 256, shiftX = 0, top = 26, bottom = 236, widthScale = 1,
  foregroundProbability = 0.96, backgroundProbability = 0.04,
} = {}) {
  const mask = new Float32Array(width * height).fill(backgroundProbability);
  const bodyHeight = bottom - top;
  for (let y = top; y <= bottom; y += 1) {
    const rel = (y - top) / bodyHeight;
    const halfWidth = (18
      + 24 * Math.exp(-((rel - 0.24) ** 2) / 0.012)
      + 13 * Math.exp(-((rel - 0.66) ** 2) / 0.018)
      - 6 * Math.exp(-((rel - 0.52) ** 2) / 0.014)) * widthScale;
    const cx = Math.round(width / 2 + shiftX);
    for (let x = Math.max(0, Math.round(cx - halfWidth)); x <= Math.min(width - 1, Math.round(cx + halfWidth)); x += 1) {
      mask[y * width + x] = foregroundProbability;
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

function float32ToBase64(values) {
  const bytes = new Uint8Array(values.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < values.length; i += 1) view.setFloat32(i * 4, values[i], true);
  return bytesToBase64(bytes);
}

describe('Progress Scan vision signal extraction', () => {
  beforeEach(() => {
    mockDownloadAsync.mockClear();
    mockFromModule.mockClear();
    mockExtractRgb.mockReset();
    mockSegmentPersonMask.mockReset();
    mockResolveBundledModel.mockReset();
    mockResolveBundledModel.mockResolvedValue(null);
    mockLoadTensorflowModel.mockReset();
    resetProgressScanModelCacheForTests();
  });

  test('base64 decoder returns exact bytes without relying on Buffer', () => {
    expect(Array.from(base64ToUint8Array('AAECA/8='))).toEqual([0, 1, 2, 3, 255]);
  });

  test('float32 mask decoder reads little-endian ML Kit confidence masks', () => {
    const values = new Float32Array([0, 0.25, 0.75, 1]);
    expect(Array.from(base64ToFloat32Array(float32ToBase64(values)))).toEqual([0, 0.25, 0.75, 1]);
  });

  test('prefers native cache-copied bundled model files in release builds', async () => {
    mockResolveBundledModel.mockResolvedValueOnce('file:///data/user/0/app/cache/progress_scan_models/selfie_segmentation.tflite');

    await expect(resolveProgressScanModelSource()).resolves.toEqual({
      url: 'file:///data/user/0/app/cache/progress_scan_models/selfie_segmentation.tflite',
    });

    expect(mockResolveBundledModel).toHaveBeenCalledWith('selfie_segmentation.tflite');
    expect(mockFromModule).not.toHaveBeenCalled();
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  test('resolves bundled TFLite model to a protocol URL before native loading', async () => {
    await expect(resolveProgressScanModelSource()).resolves.toEqual({
      url: 'file:///cache/selfie_segmentation.tflite',
    });
    expect(mockFromModule).toHaveBeenCalledWith(1);
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  test('does not pass bare Android asset keys to the native TFLite URL loader', async () => {
    mockResolveBundledModel.mockResolvedValueOnce('assets_ml_selfie_segmentation');
    await expect(resolveProgressScanModelSource()).resolves.toEqual({
      url: 'file:///cache/selfie_segmentation.tflite',
    });
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);

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
    expect(result.abstentionReasons.some((reason) => ['model_unavailable', 'model_source_unavailable', 'model_run_failed'].includes(reason))).toBe(true);
    expect(mockLoadTensorflowModel).not.toHaveBeenCalled();
    for (const [source] of mockLoadTensorflowModel.mock.calls) {
      expect(source).not.toEqual({ url: 'assets_ml_selfie_segmentation' });
    }
  });

  test('retries TFLite loading after a transient native load failure', async () => {
    const rgb = new Uint8Array(256 * 256 * 3).fill(128);
    const model = { run: jest.fn(async () => [syntheticPersonMask()]) };
    mockResolveBundledModel.mockResolvedValue('file:///cache/selfie_segmentation.tflite');
    mockExtractRgb.mockResolvedValue({
      rgbBase64: bytesToBase64(rgb),
      lightingScore: 0.9,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
    });
    mockSegmentPersonMask.mockResolvedValue(null);
    mockLoadTensorflowModel
      .mockRejectedValueOnce(new Error('native asset loader failed once'))
      .mockResolvedValueOnce(model);

    const first = await analyseProgressScanPhoto({ uri: 'file:///scan.jpg', pose: 'front' });
    const second = await analyseProgressScanPhoto({ uri: 'file:///scan.jpg', pose: 'front' });

    expect(first.modelBacked).toBe(false);
    expect(first.abstentionReasons).toContain('model_load_failed');
    expect(second.modelBacked).toBe(true);
    expect(second.quality.segmentationConfidence).toBeGreaterThan(0.75);
    expect(mockLoadTensorflowModel).toHaveBeenCalledTimes(2);
    expect(model.run).toHaveBeenCalledTimes(1);
  });

  test('uses native ML Kit segmentation masks before direct TFLite loading', async () => {
    const rgb = new Uint8Array(256 * 256 * 3).fill(128);
    const mask = syntheticPersonMask();
    mockExtractRgb.mockResolvedValueOnce({
      rgbBase64: bytesToBase64(rgb),
      lightingScore: 0.9,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
    });
    mockSegmentPersonMask.mockResolvedValueOnce({
      width: 256,
      height: 256,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
      maskBase64: float32ToBase64(mask),
      engine: 'mlkit_selfie_segmentation',
    });

    const result = await analyseProgressScanPhoto({ uri: 'file:///scan.jpg', pose: 'front' });

    expect(mockSegmentPersonMask).toHaveBeenCalledWith('file:///scan.jpg', 256, 256);
    expect(mockLoadTensorflowModel).not.toHaveBeenCalled();
    expect(result.modelBacked).toBe(true);
    expect(result.modelVersion).toBe('mlkit_selfie_segmentation_16.0.0-beta6');
    expect(result.quality.segmentationConfidence).toBeGreaterThan(0.75);
    expect(result.silhouetteRatios.waistToShoulder).toBeGreaterThan(0);
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

  test('adaptive threshold accepts lower-probability ML Kit silhouettes from real photos', () => {
    const result = measureMaskSignals(syntheticPersonMask({
      foregroundProbability: 0.43,
      backgroundProbability: 0.08,
    }), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });

    expect(result.modelBacked).toBe(true);
    expect(result.quality.foregroundThreshold).toBeLessThan(0.5);
    expect(result.quality.segmentationConfidence).toBeGreaterThan(0.38);
    expect(result.silhouetteRatios.waistToShoulder).toBeGreaterThan(0);
    expect(result.abstentionReasons).not.toContain('no_person_detected');
    expect(retakeCopyForVisionResult(result)).toBeNull();
  });

  test('adaptive threshold does not turn flat uncertain masks into a scored silhouette', () => {
    const flat = new Float32Array(256 * 256).fill(0.22);
    const result = measureMaskSignals(flat, {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });

    expect(result.modelBacked).toBe(false);
    expect(result.abstentionReasons).toContain('no_person_detected');
  });

  test('broad full-body silhouettes are not mistaken for unclear poses', () => {
    const result = measureMaskSignals(syntheticPersonMask({ widthScale: 1.8 }), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });

    expect(result.bodyBox.height).toBeGreaterThan(0.75);
    expect(result.bodyBox.width).toBeGreaterThan(0.5);
    expect(result.quality.poseConfidence).toBeGreaterThan(0.65);
    expect(result.abstentionReasons).not.toContain('pose_not_clear');
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
