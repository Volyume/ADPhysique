import {
  analyseProgressScanPhoto,
  assetFieldsFromVisionResult,
  base64ToFloat32Array,
  base64ToUint8Array,
  measureMaskSignals,
  progressScanVisionDiagnostic,
  resolveProgressScanModelSource,
  resetProgressScanModelCacheForTests,
  retakeCopyForVisionResult,
  unavailableVisionResult,
  validateProgressScanModelContract,
} from '../progressScanVision';

const mockDownloadAsync = jest.fn(async () => ({
  localUri: 'file:///cache/selfie_segmentation_v2.tflite',
  uri: 'assets_ml_selfie_segmentation_v2',
}));
const mockFromModule = jest.fn(() => ({
  localUri: null,
  uri: 'assets_ml_selfie_segmentation_v2',
  downloadAsync: mockDownloadAsync,
}));
const mockExtractRgb = jest.fn();
const mockSegmentPersonMask = jest.fn();
const mockResolveBundledModel = jest.fn(async () => null);
const mockDiagnoseBundledModel = jest.fn(async () => null);
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
  diagnoseBundledModel: (...args) => mockDiagnoseBundledModel(...args),
}));
jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: (...args) => mockLoadTensorflowModel(...args),
}));

// Anatomically-placed synthetic body (measurement v2, 2026-07-13): shoulder
// bulge ~0.22 of body height, natural-waist dip ~0.40, hip/glute bulge ~0.50.
// The old generator put the waist dip at 0.52 and the hip bulge at 0.66 --
// matching the v1 bands' misplacement rather than a human body.
function syntheticPersonMask({
  width = 256, height = 256, shiftX = 0, top = 26, bottom = 236, widthScale = 1,
  foregroundProbability = 0.96, backgroundProbability = 0.04,
} = {}) {
  const mask = new Float32Array(width * height).fill(backgroundProbability);
  const bodyHeight = bottom - top;
  for (let y = top; y <= bottom; y += 1) {
    const rel = (y - top) / bodyHeight;
    const halfWidth = (18
      + 24 * Math.exp(-((rel - 0.22) ** 2) / 0.012)
      + 13 * Math.exp(-((rel - 0.50) ** 2) / 0.018)
      - 6 * Math.exp(-((rel - 0.40) ** 2) / 0.014)) * widthScale;
    const cx = Math.round(width / 2 + shiftX);
    for (let x = Math.max(0, Math.round(cx - halfWidth)); x <= Math.min(width - 1, Math.round(cx + halfWidth)); x += 1) {
      mask[y * width + x] = foregroundProbability;
    }
  }
  return mask;
}

// A body whose legs are visible as two separate mask runs below the crotch
// (feet shoulder-width apart), with a merged-legs twin of identical tissue
// width for the stability regression: torso to 0.55 of body height, then
// either two 16px-wide legs with a 16px gap, or one 32px joined column.
function syntheticLeggedPersonMask({
  width = 256, height = 256, top = 26, bottom = 236, legsApart = true,
  foregroundProbability = 0.96, backgroundProbability = 0.04,
} = {}) {
  const mask = new Float32Array(width * height).fill(backgroundProbability);
  const bodyHeight = bottom - top;
  const cx = width / 2;
  for (let y = top; y <= bottom; y += 1) {
    const rel = (y - top) / bodyHeight;
    if (rel <= 0.55) {
      const halfWidth = 18
        + 24 * Math.exp(-((rel - 0.22) ** 2) / 0.012)
        + 13 * Math.exp(-((rel - 0.50) ** 2) / 0.018)
        - 6 * Math.exp(-((rel - 0.40) ** 2) / 0.014);
      for (let x = Math.round(cx - halfWidth); x <= Math.round(cx + halfWidth); x += 1) {
        mask[y * width + x] = foregroundProbability;
      }
    } else if (legsApart) {
      for (let x = Math.round(cx - 24); x <= Math.round(cx - 9); x += 1) mask[y * width + x] = foregroundProbability;
      for (let x = Math.round(cx + 9); x <= Math.round(cx + 24); x += 1) mask[y * width + x] = foregroundProbability;
    } else {
      for (let x = Math.round(cx - 16); x <= Math.round(cx + 15); x += 1) mask[y * width + x] = foregroundProbability;
    }
  }
  return mask;
}

// Drops a detached foreground blob (a shadow, furniture, a curtain edge the
// model half-kept) away from the body.
function addBackgroundBlob(mask, {
  width = 256, x = 8, y = 200, size = 18, foregroundProbability = 0.96,
} = {}) {
  const out = new Float32Array(mask);
  for (let by = y; by < y + size; by += 1) {
    for (let bx = x; bx < x + size; bx += 1) {
      out[by * width + bx] = foregroundProbability;
    }
  }
  return out;
}

function widenMaskRows(mask, {
  width = 256, centerX = 128, yStart, yEnd, halfWidth, foregroundProbability = 0.96,
} = {}) {
  const out = new Float32Array(mask);
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = Math.max(0, centerX - halfWidth); x <= Math.min(width - 1, centerX + halfWidth); x += 1) {
      out[y * width + x] = foregroundProbability;
    }
  }
  return out;
}

function addSeparateArmRows(mask, {
  width = 256, yStart = 112, yEnd = 152, leftStart = 56, leftEnd = 72, rightStart = 184, rightEnd = 200,
  foregroundProbability = 0.96,
} = {}) {
  const out = new Float32Array(mask);
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = leftStart; x <= leftEnd; x += 1) out[y * width + x] = foregroundProbability;
    for (let x = rightStart; x <= rightEnd; x += 1) out[y * width + x] = foregroundProbability;
  }
  return out;
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

function tfliteModel(run) {
  return {
    inputs: [{ name: 'input_1', dataType: 'float32', shape: [1, 256, 256, 3] }],
    outputs: [{ name: 'segmentation_masks', dataType: 'float32', shape: [1, 256, 256, 1] }],
    run: jest.fn(run),
  };
}

describe('Progress Scan vision signal extraction', () => {
  beforeEach(() => {
    mockDownloadAsync.mockClear();
    mockFromModule.mockClear();
    mockExtractRgb.mockReset();
    mockSegmentPersonMask.mockReset();
    mockResolveBundledModel.mockReset();
    mockResolveBundledModel.mockResolvedValue(null);
    mockDiagnoseBundledModel.mockReset();
    mockDiagnoseBundledModel.mockResolvedValue(null);
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
    mockResolveBundledModel.mockResolvedValueOnce('file:///data/user/0/app/cache/progress_scan_models/selfie_segmentation_v2.tflite');

    await expect(resolveProgressScanModelSource()).resolves.toEqual({
      url: 'file:///data/user/0/app/cache/progress_scan_models/selfie_segmentation_v2.tflite',
    });

    expect(mockResolveBundledModel).toHaveBeenCalledWith('selfie_segmentation_v2.tflite');
    expect(mockFromModule).not.toHaveBeenCalled();
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  test('validates the bundled TFLite tensor contract before scoring photos', () => {
    expect(validateProgressScanModelContract(tfliteModel(async () => []))).toMatchObject({
      ok: true,
      inputShape: [1, 256, 256, 3],
      outputShape: [1, 256, 256, 1],
    });
    expect(validateProgressScanModelContract({
      inputs: [{ name: 'wrong', dataType: 'float32', shape: [1, 224, 224, 3] }],
      outputs: [{ name: 'mask', dataType: 'float32', shape: [1, 224, 224, 1] }],
      run: jest.fn(),
    })).toMatchObject({
      ok: false,
      reason: 'model_input_shape_unsupported',
    });
  });

  test('rejects a loaded model with missing tensor metadata instead of running a weak unknown contract', async () => {
    const rgb = new Uint8Array(256 * 256 * 3).fill(128);
    mockResolveBundledModel.mockResolvedValueOnce('file:///cache/selfie_segmentation_v2.tflite');
    mockExtractRgb.mockResolvedValueOnce({
      rgbBase64: bytesToBase64(rgb),
      lightingScore: 0.9,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
    });
    mockLoadTensorflowModel.mockResolvedValueOnce({ run: jest.fn(async () => [syntheticPersonMask()]) });
    mockSegmentPersonMask.mockResolvedValueOnce(null);

    const result = await analyseProgressScanPhoto({ uri: 'file:///scan.jpg', pose: 'front' });

    expect(result.modelBacked).toBe(false);
    expect(result.abstentionReasons).toContain('model_tensor_metadata_missing');
  });

  test('resolves bundled TFLite model to a protocol URL before native loading', async () => {
    await expect(resolveProgressScanModelSource()).resolves.toEqual({
      url: 'file:///cache/selfie_segmentation_v2.tflite',
    });
    expect(mockFromModule).toHaveBeenCalledWith(1);
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  test('does not pass bare Android asset keys to the native TFLite URL loader', async () => {
    mockResolveBundledModel.mockResolvedValueOnce('assets_ml_selfie_segmentation_v2');
    await expect(resolveProgressScanModelSource()).resolves.toEqual({
      url: 'file:///cache/selfie_segmentation_v2.tflite',
    });
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);

    mockDownloadAsync.mockResolvedValueOnce({
      localUri: null,
      uri: 'assets_ml_selfie_segmentation_v2',
    });
    await expect(resolveProgressScanModelSource()).resolves.toBeNull();

    mockDownloadAsync.mockResolvedValueOnce({
      localUri: null,
      uri: 'assets_ml_selfie_segmentation_v2',
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
      expect(source).not.toEqual({ url: 'assets_ml_selfie_segmentation_v2' });
    }
  });

  test('retries TFLite loading after a transient native load failure', async () => {
    const rgb = new Uint8Array(256 * 256 * 3).fill(128);
    const model = tfliteModel(async () => [syntheticPersonMask()]);
    mockResolveBundledModel.mockResolvedValue('file:///cache/selfie_segmentation_v2.tflite');
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

  test('uses the bundled TFLite model before falling back to native ML Kit masks', async () => {
    const rgb = new Uint8Array(256 * 256 * 3).fill(128);
    const mask = syntheticPersonMask();
    const model = tfliteModel(async () => [mask]);
    mockResolveBundledModel.mockResolvedValueOnce('file:///cache/selfie_segmentation_v2.tflite');
    mockExtractRgb.mockResolvedValueOnce({
      rgbBase64: bytesToBase64(rgb),
      lightingScore: 0.9,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
    });
    mockSegmentPersonMask.mockResolvedValue({
      width: 256,
      height: 256,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
      maskBase64: float32ToBase64(mask),
      engine: 'mlkit_selfie_segmentation',
    });
    mockLoadTensorflowModel.mockResolvedValueOnce(model);

    const result = await analyseProgressScanPhoto({ uri: 'file:///scan.jpg', pose: 'front' });

    expect(mockLoadTensorflowModel).toHaveBeenCalledWith({ url: 'file:///cache/selfie_segmentation_v2.tflite' }, []);
    expect(mockSegmentPersonMask).not.toHaveBeenCalled();
    expect(result.modelBacked).toBe(true);
    expect(result.engine).toBe('fast_tflite');
    expect(result.modelVersion).toBe('mediapipe_selfie_segmentation_general_builtin_ops_v2');
    expect(result.quality.segmentationConfidence).toBeGreaterThan(0.75);
    expect(result.silhouetteRatios.waistToShoulder).toBeGreaterThan(0);
  });

  test('falls back to native ML Kit when TFLite cannot produce a usable person mask', async () => {
    const rgb = new Uint8Array(256 * 256 * 3).fill(128);
    const nativeMask = syntheticPersonMask();
    const model = tfliteModel(async () => [new Float32Array(256 * 256).fill(0.02)]);
    mockResolveBundledModel.mockResolvedValueOnce('file:///cache/selfie_segmentation_v2.tflite');
    mockLoadTensorflowModel.mockResolvedValueOnce(model);
    mockExtractRgb.mockResolvedValueOnce({
      rgbBase64: bytesToBase64(rgb),
      lightingScore: 0.9,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
    });
    mockSegmentPersonMask.mockResolvedValueOnce({
      width: 256,
      height: 256,
      contentRect: { x: 0, y: 0, width: 256, height: 256 },
      maskBase64: float32ToBase64(nativeMask),
      engine: 'mlkit_selfie_segmentation',
    });

    const result = await analyseProgressScanPhoto({ uri: 'file:///scan.jpg', pose: 'front' });

    expect(model.run).toHaveBeenCalledTimes(1);
    expect(mockSegmentPersonMask).toHaveBeenCalledWith('file:///scan.jpg', 256, 256);
    expect(result.modelBacked).toBe(true);
    expect(result.engine).toBe('mlkit_selfie_segmentation');
    expect(result.modelVersion).toBe('mlkit_selfie_segmentation_16.0.0-beta6');
    expect(result.abstentionReasons).not.toContain('no_person_detected');
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

  test('zone measurements resist a narrow waist-row artefact', () => {
    const base = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });
    const noisy = measureMaskSignals(widenMaskRows(syntheticPersonMask(), {
      yStart: 110,
      yEnd: 112,
      halfWidth: 82,
    }), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });

    expect(noisy.abstentionReasons).toEqual([]);
    expect(Math.abs(
      noisy.silhouetteRatios.waistToShoulder - base.silhouetteRatios.waistToShoulder,
    )).toBeLessThan(0.03);
  });

  test('waist measurement ignores separate arms beside the torso', () => {
    const base = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });
    const armsDown = measureMaskSignals(addSeparateArmRows(syntheticPersonMask()), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
    });

    expect(armsDown.abstentionReasons).toEqual([]);
    expect(Math.abs(
      armsDown.silhouetteRatios.waistToShoulder - base.silhouetteRatios.waistToShoulder,
    )).toBeLessThan(0.05);
    expect(armsDown.silhouetteRatios.waistToShoulder).toBeLessThan(0.8);
  });

  test('a legs-apart stance measures the same hips and thighs as legs-together (founder cross-device defect 2026-07-13)', () => {
    // The v1 nearest-centre row read returned ONE leg on a crisp split mask
    // and both-legs-plus-gap on a merged mask: the same body measured
    // hipToHeight 0.08 on one device and 0.30 on the other, and waistToHip
    // reached an anatomically impossible 3.1. The central segment sum makes
    // the two stances agree.
    const apart = measureMaskSignals(syntheticLeggedPersonMask({ legsApart: true }), {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    const together = measureMaskSignals(syntheticLeggedPersonMask({ legsApart: false }), {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    expect(apart.silhouetteRatios.hipToHeight).toBeGreaterThan(0.1);
    expect(Math.abs(apart.silhouetteRatios.hipToHeight - together.silhouetteRatios.hipToHeight)).toBeLessThan(0.03);
    expect(Math.abs(apart.silhouetteRatios.thighToHeight - together.silhouetteRatios.thighToHeight)).toBeLessThan(0.03);
    expect(apart.silhouetteRatios.waistToHip).toBeLessThan(1.6);
    expect(together.silhouetteRatios.waistToHip).toBeLessThan(1.6);
  });

  test('hands hanging beside the hips are not summed into the hip width (founder ruling 2026-07-13, measurement v3)', () => {
    // Narrow hand-width runs beside the hips sit inside the central band and
    // were summed into the hip read, flattering waist-to-hip on the founder's
    // real scan (front hips measured ~0.34 of height, about two hand-widths
    // over truth). Hand runs are far narrower than the torso run in the same
    // rows, so they must be dropped while legs (near-equal widths) are kept.
    const base = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    // Hip band rows for the synthetic body (top 26, height 210, bbox rows):
    // hip station ~0.46-0.58 of the body box. Hands: two 6px-wide runs just
    // outside the torso but inside the central 60% of the (unchanged) bbox.
    const withHands = (() => {
      const mask = new Float32Array(syntheticPersonMask());
      const width = 256;
      for (let y = 130; y <= 150; y += 1) {
        for (let x = 74; x <= 80; x += 1) mask[y * width + x] = 0.96;
        for (let x = 176; x <= 182; x += 1) mask[y * width + x] = 0.96;
      }
      // Connect the hand runs to the body via thin arms so they join the
      // dominant component (a detached blob is already excluded by the
      // component filter; this pins the harder merged case).
      for (let x = 80; x <= 128; x += 1) mask[129 * width + x] = 0.96;
      for (let x = 128; x <= 176; x += 1) mask[129 * width + x] = 0.96;
      return mask;
    })();
    const measured = measureMaskSignals(withHands, {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    expect(Math.abs(measured.silhouetteRatios.hipToHeight - base.silhouetteRatios.hipToHeight)).toBeLessThan(0.02);
    expect(Math.abs(measured.silhouetteRatios.waistToHip - base.silhouetteRatios.waistToHip)).toBeLessThan(0.06);
  });

  test('a detached background blob cannot stretch the body box or inflate the body area', () => {
    const base = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    const noisy = measureMaskSignals(addBackgroundBlob(syntheticPersonMask()), {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    expect(noisy.quality.connectedComponents).toBeGreaterThan(1);
    expect(noisy.silhouetteRatios.bboxWidthRatio).toBeCloseTo(base.silhouetteRatios.bboxWidthRatio, 3);
    expect(noisy.silhouetteRatios.bboxHeightRatio).toBeCloseTo(base.silhouetteRatios.bboxHeightRatio, 3);
    expect(noisy.silhouetteRatios.bodyAreaRatio).toBeCloseTo(base.silhouetteRatios.bodyAreaRatio, 3);
    expect(noisy.silhouetteRatios.waistToShoulder).toBeCloseTo(base.silhouetteRatios.waistToShoulder, 3);
  });

  test('results carry the measurement-method version so cross-version scans are never compared as physique change', () => {
    const result = measureMaskSignals(syntheticPersonMask(), {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    expect(result.measurementVersion).toBe('silhouette_bands_anatomical_v3');
  });

  test('anatomically impossible ratios abstain with a retake prompt instead of scoring (founder tilted-phone scan, 2026-07-13)', () => {
    // The founder's 11-degree propped-phone iOS scan measured
    // waistToShoulder 1.79 -- no human body -- and still scored (69).
    // A capture whose shoulder read collapses must abstain, never score.
    // Synthetic: a body whose "shoulders" are a narrow neck-width column
    // while the lower body is wide.
    const width = 256;
    const mask = new Float32Array(width * 256).fill(0.04);
    for (let y = 26; y <= 236; y += 1) {
      const rel = (y - 26) / 210;
      const halfWidth = rel < 0.34 ? 7 : 40;
      for (let x = 128 - halfWidth; x <= 128 + halfWidth; x += 1) {
        mask[y * width + x] = 0.96;
      }
    }
    const result = measureMaskSignals(mask, {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    expect(result.silhouetteRatios.waistToShoulder).toBeGreaterThan(1.3);
    expect(result.abstentionReasons).toContain('silhouette_implausible');
    expect(result.needsRetake).toBe(true);
    expect(retakeCopyForVisionResult(result)).toMatch(/distorted/i);
  });

  test('a tilt above 10 degrees asks for a retake (gate lowered from 20, founder evidence 2026-07-13)', () => {
    // Shift the lower body sideways so the shoulder->hip centre line leans
    // ~12 degrees, the geometry an 11-degree propped phone produces.
    const width = 256;
    const mask = new Float32Array(width * 256).fill(0.04);
    for (let y = 26; y <= 236; y += 1) {
      const rel = (y - 26) / 210;
      const lean = Math.round(rel * 70);
      const halfWidth = 24;
      const cx = 96 + lean;
      for (let x = cx - halfWidth; x <= cx + halfWidth; x += 1) {
        mask[y * width + x] = 0.96;
      }
    }
    const result = measureMaskSignals(mask, {
      lightingScore: 0.9, blurScore: 0.88, pose: 'front',
    });
    expect(Math.abs(result.quality.cameraTiltDegrees)).toBeGreaterThan(10);
    expect(result.abstentionReasons).toContain('camera_tilted');
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

  test('moderate phone-photo softness lowers confidence without forcing a retake when the model measures a silhouette', () => {
    const result = measureMaskSignals(syntheticPersonMask({
      foregroundProbability: 0.38,
      backgroundProbability: 0.18,
    }), {
      lightingScore: 0.42,
      blurScore: 0.22,
      pose: 'front',
      engine: 'fast_tflite',
    });

    expect(result.modelBacked).toBe(true);
    expect(result.quality.segmentationConfidence).toBeGreaterThan(0.30);
    expect(result.quality.backgroundSeparation).toBeGreaterThan(0.20);
    expect(result.abstentionReasons).not.toContain('too_blurry');
    expect(result.abstentionReasons).not.toContain('clothing_or_background_uncertain');
    expect(result.needsRetake).toBe(false);
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
      engine: 'fast_tflite',
    });
    const fields = assetFieldsFromVisionResult(result);
    expect(fields.qualityScore).toBeGreaterThan(0.7);
    expect(fields.landmarkConfidence).toBeGreaterThan(0.7);
    expect(fields.signals.modelBacked).toBe(true);
    expect(JSON.stringify(fields)).not.toMatch(/file:|base64|rgbBase64/i);
  });

  test('diagnostics expose scan gates without image data or file paths', () => {
    const result = measureMaskSignals(syntheticPersonMask({
      foregroundProbability: 0.43,
      backgroundProbability: 0.08,
    }), {
      lightingScore: 0.9,
      blurScore: 0.88,
      pose: 'front',
      engine: 'mlkit_selfie_segmentation',
    });

    const diagnostic = progressScanVisionDiagnostic(result);

    expect(diagnostic).toMatchObject({
      modelBacked: true,
      engine: 'mlkit_selfie_segmentation',
      pose: 'front',
    });
    expect(diagnostic.quality.foregroundThreshold).toBeLessThan(0.5);
    expect(diagnostic.mask.foregroundRatio).toBeGreaterThan(0);
    expect(JSON.stringify(diagnostic)).not.toMatch(/file:|base64|rgbBase64|cache|progress_photos/i);
  });
});
