import { logError, logWarn } from './errorLog';

export const PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION = 'mediapipe_selfie_segmentation_general_2021_05_06';
export const PROGRESS_SCAN_NATIVE_SEGMENTATION_MODEL_VERSION = 'mlkit_selfie_segmentation_16.0.0-beta6';
export const PROGRESS_SCAN_MODEL_INPUT_SIZE = 256;

const MODEL_SOURCE = () => require('../../assets/ml/selfie_segmentation.tflite');
const MODEL_FILE_NAME = 'selfie_segmentation.tflite';
const RETAKE_REASONS = new Set([
  'too_dark',
  'too_blurry',
  'whole_body_not_visible',
  'multiple_people',
  'segmentation_low_confidence',
  'clothing_or_background_uncertain',
  'pose_not_clear',
  'camera_tilted',
]);
const UNAVAILABLE_RETAKE_REASONS = new Set([
  'no_person_detected',
  'native_preprocess_unavailable',
  'native_preprocess_shape_unusable',
  'mask_shape_unusable',
]);

let modelPromise = null;
let modelUnavailableReason = null;

function modelTensorShape(tensor = {}) {
  return Array.isArray(tensor.shape)
    ? tensor.shape.map((v) => finiteNumber(v)).filter((v) => v != null)
    : [];
}

function sameShape(actual = [], expected = []) {
  return actual.length === expected.length && actual.every((v, i) => v === expected[i]);
}

function outputShapeSupported(shape = []) {
  return sameShape(shape, [1, PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE, 1])
    || sameShape(shape, [1, PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE])
    || sameShape(shape, [PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE, 1])
    || sameShape(shape, [PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE]);
}

export function validateProgressScanModelContract(model) {
  if (!model || typeof model.run !== 'function') {
    return { ok: false, reason: 'model_missing_run' };
  }
  const input = Array.isArray(model.inputs) ? model.inputs[0] : null;
  const output = Array.isArray(model.outputs) ? model.outputs[0] : null;
  if (!input || !output) {
    return { ok: false, reason: 'model_tensor_metadata_missing' };
  }
  const inputShape = modelTensorShape(input);
  const outputShape = modelTensorShape(output);
  if (input.dataType && input.dataType !== 'float32') {
    return { ok: false, reason: 'model_input_type_unsupported', inputType: input.dataType, inputShape, outputShape };
  }
  if (output.dataType && output.dataType !== 'float32') {
    return { ok: false, reason: 'model_output_type_unsupported', outputType: output.dataType, inputShape, outputShape };
  }
  if (!sameShape(inputShape, [1, PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE, 3])) {
    return { ok: false, reason: 'model_input_shape_unsupported', inputShape, outputShape };
  }
  if (!outputShapeSupported(outputShape)) {
    return { ok: false, reason: 'model_output_shape_unsupported', inputShape, outputShape };
  }
  return { ok: true, inputShape, outputShape };
}

function normaliseFastTfliteUri(uri) {
  const value = String(uri || '').trim();
  if (!value) return null;
  if (/^(file|https?):\/\//i.test(value)) return value;
  if (/^[a-z]:[\\/]/i.test(value)) return `file:///${value.replace(/\\/g, '/')}`;
  if (value.startsWith('/')) return `file://${value}`;
  return null;
}

function sourceProtocolForLog(source) {
  const value = String(source?.url || '').trim();
  if (!value) return null;
  const match = value.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  return match ? match[1].toLowerCase() : 'none';
}

function safeModelDiagnosticForLog(diagnostic = null) {
  if (!diagnostic || typeof diagnostic !== 'object') return null;
  return {
    safeName: diagnostic.safeName || null,
    targetExists: diagnostic.targetExists === true,
    targetBytes: diagnosticNumber(diagnostic.targetBytes, 0),
    candidateCount: diagnosticNumber(diagnostic.candidateCount, 0),
    discoveredCount: diagnosticNumber(diagnostic.discoveredCount, 0),
    firstOpenableCandidate: String(diagnostic.firstOpenableCandidate || '').slice(0, 80) || null,
    firstOpenableBytes: diagnosticNumber(diagnostic.firstOpenableBytes, 0),
    errorCode: diagnostic.errorCode || null,
  };
}

function diagnosticNumber(value, places = 3) {
  const n = finiteNumber(value);
  return n == null ? null : round(n, places);
}

export function progressScanVisionDiagnostic(result = {}) {
  const quality = result?.quality || {};
  const mask = result?.mask || {};
  const box = result?.bodyBox || {};
  return {
    modelBacked: result?.modelBacked === true,
    heuristicBacked: result?.heuristicBacked === true,
    engine: result?.engine || null,
    modelVersion: result?.modelVersion || null,
    unavailableReason: result?.unavailableReason || result?.fallbackReason || null,
    pose: result?.pose || null,
    reasons: Array.isArray(result?.abstentionReasons) ? result.abstentionReasons.slice(0, 8) : [],
    quality: {
      segmentationConfidence: diagnosticNumber(quality.segmentationConfidence),
      framingScore: diagnosticNumber(quality.framingScore),
      blurScore: diagnosticNumber(quality.blurScore),
      lightingScore: diagnosticNumber(quality.lightingScore),
      poseConfidence: diagnosticNumber(quality.poseConfidence),
      backgroundSeparation: diagnosticNumber(quality.backgroundSeparation),
      cameraTiltDegrees: diagnosticNumber(quality.cameraTiltDegrees, 2),
      foregroundThreshold: diagnosticNumber(quality.foregroundThreshold),
      componentDominance: diagnosticNumber(quality.componentDominance),
      connectedComponents: diagnosticNumber(quality.connectedComponents, 0),
    },
    mask: {
      foregroundRatio: diagnosticNumber(mask.foregroundRatio, 4),
      foregroundMeanProbability: diagnosticNumber(mask.foregroundMeanProbability),
      backgroundMeanProbability: diagnosticNumber(mask.backgroundMeanProbability),
    },
    bodyBox: {
      width: diagnosticNumber(box.width, 4),
      height: diagnosticNumber(box.height, 4),
      centerX: diagnosticNumber(box.centerX, 4),
      centerY: diagnosticNumber(box.centerY, 4),
    },
  };
}

function logVisionDiagnosticIfNeeded(scope, result) {
  const reasons = Array.isArray(result?.abstentionReasons) ? result.abstentionReasons : [];
  const quality = result?.quality || {};
  const lowSignal = (finiteNumber(quality.segmentationConfidence) ?? 1) < 0.5
    || (finiteNumber(quality.framingScore) ?? 1) < 0.5
    || (finiteNumber(quality.poseConfidence) ?? 1) < 0.5;
  if (!reasons.length && !lowSignal) return;
  logWarn(scope, 'progress_scan_vision_diagnostic', progressScanVisionDiagnostic(result));
}

function safeFastTfliteSource(source) {
  const url = normaliseFastTfliteUri(source?.url);
  return url ? { url } : null;
}

export async function resolveProgressScanModelSource() {
  try {
    const imageModule = require('progress-scan-image');
    const nativeUri = await imageModule.resolveBundledModel?.(MODEL_FILE_NAME);
    const normalisedNativeUri = normaliseFastTfliteUri(nativeUri);
    if (normalisedNativeUri) return { url: normalisedNativeUri };
    const nativeDiagnostic = await imageModule.diagnoseBundledModel?.(MODEL_FILE_NAME).catch(() => null);
    if (nativeUri) {
      logWarn('progressScanVision.nativeModelSourceRejected', 'progress_scan_native_model_source_unusable', {
        modelSourceUrlProtocol: sourceProtocolForLog({ url: nativeUri }),
        nativeModelDiagnostic: safeModelDiagnosticForLog(nativeDiagnostic),
      });
    } else if (nativeDiagnostic) {
      logWarn('progressScanVision.nativeModelSourceMissing', 'progress_scan_native_model_source_missing', {
        nativeModelDiagnostic: safeModelDiagnosticForLog(nativeDiagnostic),
      });
    }
  } catch (_) { /* fall through to Expo Asset resolution */ }

  const source = MODEL_SOURCE();
  const { Asset } = require('expo-asset');
  const asset = Asset.fromModule(source);
  const downloaded = await asset.downloadAsync();
  const uri = [
    downloaded?.localUri,
    asset.localUri,
    downloaded?.uri,
    asset.uri,
  ].map(normaliseFastTfliteUri).find(Boolean);
  if (uri) return { url: uri };
  logWarn('progressScanVision.modelSourceUnavailable', 'progress_scan_model_source_unavailable', {
    downloadedLocalUriProtocol: sourceProtocolForLog({ url: downloaded?.localUri }),
    assetLocalUriProtocol: sourceProtocolForLog({ url: asset.localUri }),
    downloadedUriProtocol: sourceProtocolForLog({ url: downloaded?.uri }),
    assetUriProtocol: sourceProtocolForLog({ url: asset.uri }),
  });
  return null;
}

function finiteNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round(n, places = 3) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function normaliseContentRect(rect, width, height) {
  const x = Math.max(0, Math.floor(finiteNumber(rect?.x) ?? 0));
  const y = Math.max(0, Math.floor(finiteNumber(rect?.y) ?? 0));
  const w = Math.max(1, Math.floor(finiteNumber(rect?.width) ?? width));
  const h = Math.max(1, Math.floor(finiteNumber(rect?.height) ?? height));
  return {
    x: Math.min(width - 1, x),
    y: Math.min(height - 1, y),
    width: Math.max(1, Math.min(w, width - x)),
    height: Math.max(1, Math.min(h, height - y)),
  };
}

function exactBuffer(view) {
  if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) return view.buffer;
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

export function base64ToUint8Array(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const values = new Int16Array(128).fill(-1);
  for (let i = 0; i < chars.length; i += 1) values[chars.charCodeAt(i)] = i;
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < String(base64 || '').length; i += 1) {
    const code = base64.charCodeAt(i);
    if (code === 61) break;
    const value = code < values.length ? values[code] : -1;
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export function rgbBytesToFloat32(rgb) {
  const out = new Float32Array(rgb.length);
  for (let i = 0; i < rgb.length; i += 1) out[i] = rgb[i] / 255;
  return out;
}

export function base64ToFloat32Array(base64) {
  const bytes = base64ToUint8Array(base64);
  if (bytes.length % 4 !== 0) return new Float32Array();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength / 4);
  for (let i = 0; i < out.length; i += 1) {
    const v = view.getFloat32(i * 4, true);
    out[i] = Number.isFinite(v) ? clamp(v, 0, 1) : 0;
  }
  return out;
}

function nativeSegmentationMaskFromResult(result, expectedSize = PROGRESS_SCAN_MODEL_INPUT_SIZE) {
  if (!result?.maskBase64) return null;
  const width = finiteNumber(result.width) ?? expectedSize;
  const height = finiteNumber(result.height) ?? expectedSize;
  if (width <= 0 || height <= 0) return null;
  const mask = base64ToFloat32Array(result.maskBase64);
  if (mask.length !== width * height) return null;
  return { mask, width, height };
}

function outputToFloat32Array(outputs) {
  const first = Array.isArray(outputs) ? outputs[0] : outputs;
  if (first instanceof Float32Array) return first;
  if (first instanceof ArrayBuffer) return new Float32Array(first);
  if (ArrayBuffer.isView(first)) {
    return new Float32Array(first.buffer, first.byteOffset, Math.floor(first.byteLength / 4));
  }
  return new Float32Array(first || []);
}

function loadProgressScanModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      modelUnavailableReason = null;
      let modelSource = null;
      try {
        const { loadTensorflowModel } = require('react-native-fast-tflite');
        modelSource = await resolveProgressScanModelSource();
        if (!modelSource) {
          modelUnavailableReason = 'model_source_unavailable';
          return null;
        }
        const safeSource = safeFastTfliteSource(modelSource);
        if (!safeSource) {
          modelUnavailableReason = 'model_source_unusable';
          logError('progressScanVision.modelSourceRejected', new Error('progress_scan_model_source_unusable'), {
            hasModelSource: !!modelSource,
            modelSourceUrlProtocol: sourceProtocolForLog(modelSource),
          });
          return null;
        }
        const model = await loadTensorflowModel(safeSource, []);
        const contract = validateProgressScanModelContract(model);
        if (!contract.ok) {
          modelUnavailableReason = contract.reason || 'model_contract_mismatch';
          logError('progressScanVision.modelContract', new Error(modelUnavailableReason), {
            modelSourceUrlProtocol: sourceProtocolForLog(modelSource),
            inputShape: contract.inputShape || null,
            outputShape: contract.outputShape || null,
            inputType: contract.inputType || null,
            outputType: contract.outputType || null,
          });
          return null;
        }
        return model;
      } catch (e) {
        if (!modelUnavailableReason) modelUnavailableReason = 'model_load_failed';
        logError('progressScanVision.loadModel', e, {
          reason: modelUnavailableReason,
          hasModelSource: !!modelSource,
          modelSourceUrlProtocol: sourceProtocolForLog(modelSource),
        });
        return null;
      }
    })().then((model) => {
      if (!model) modelPromise = null;
      return model;
    });
  }
  return modelPromise;
}

export function resetProgressScanModelCacheForTests() {
  if (process.env.NODE_ENV !== 'test') return;
  modelPromise = null;
  modelUnavailableReason = null;
}

export function blurScoreFromRgb(rgb, width, height) {
  if (!rgb || width < 3 || height < 3) return null;
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const j = i * 3;
    lum[i] = 0.2126 * rgb[j] + 0.7152 * rgb[j + 1] + 0.0722 * rgb[j + 2];
  }
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const lap = (lum[i - 1] + lum[i + 1] + lum[i - width] + lum[i + width]) - (4 * lum[i]);
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }
  const mean = sum / Math.max(1, count);
  const variance = (sumSq / Math.max(1, count)) - (mean * mean);
  return round(clamp(Math.log10(Math.max(0, variance) + 1) / 3, 0, 1), 3);
}

function rowWidthAndCenter(binary, width, bbox, y) {
  const row = y * width;
  let minX = width;
  let maxX = -1;
  for (let x = bbox.minX; x <= bbox.maxX; x += 1) {
    if (binary[row + x]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  return maxX >= minX ? {
    width: maxX - minX + 1,
    center: (minX + maxX + 1) / 2,
  } : null;
}

function profileInRange(binary, width, height, bbox, startRatio, endRatio) {
  if (!bbox) return null;
  const yStart = Math.max(0, Math.round(bbox.minY + bbox.height * startRatio));
  const yEnd = Math.min(height - 1, Math.round(bbox.minY + bbox.height * endRatio));
  const samples = [];
  for (let y = yStart; y <= yEnd; y += 1) {
    const row = rowWidthAndCenter(binary, width, bbox, y);
    if (row) samples.push(row);
  }
  return samples.length ? samples : null;
}

function percentile(values = [], p = 0.5) {
  const nums = values.map(finiteNumber).filter((v) => v != null).sort((a, b) => a - b);
  if (!nums.length) return null;
  const idx = clamp(Math.round((nums.length - 1) * p), 0, nums.length - 1);
  return nums[idx];
}

function widthFromProfile(profile, p = 0.5) {
  return percentile((profile || []).map((row) => row.width), p);
}

function centerFromProfile(profile) {
  return percentile((profile || []).map((row) => row.center), 0.5);
}

function connectedComponents(binary, width, height) {
  const visited = new Uint8Array(binary.length);
  const queue = new Int32Array(binary.length);
  let count = 0;
  let largest = 0;

  for (let start = 0; start < binary.length; start += 1) {
    if (!binary[start] || visited[start]) continue;
    count += 1;
    let head = 0;
    let tail = 0;
    let size = 0;
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;
    while (head < tail) {
      const i = queue[head];
      head += 1;
      size += 1;
      const x = i % width;
      const y = Math.floor(i / width);
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && binary[n] && !visited[n]) {
          visited[n] = 1;
          queue[tail] = n;
          tail += 1;
        }
      }
    }
    if (size > largest) largest = size;
  }

  return { count, largest };
}

function adaptiveForegroundThreshold(mask, width, height, contentRect) {
  const bins = 64;
  const hist = new Int32Array(bins);
  let total = 0;
  let sumTotal = 0;

  for (let y = contentRect.y; y < contentRect.y + contentRect.height; y += 1) {
    const row = y * width;
    for (let x = contentRect.x; x < contentRect.x + contentRect.width; x += 1) {
      const p = clamp(Number(mask[row + x]) || 0, 0, 1);
      const bin = Math.min(bins - 1, Math.floor(p * bins));
      hist[bin] += 1;
      total += 1;
      sumTotal += p;
    }
  }

  if (total <= 0) return 0.5;

  let weightBg = 0;
  let sumBg = 0;
  let best = null;
  for (let i = 0; i < bins - 1; i += 1) {
    const centre = (i + 0.5) / bins;
    weightBg += hist[i];
    sumBg += hist[i] * centre;
    const weightFg = total - weightBg;
    if (weightBg < total * 0.01 || weightFg < total * 0.01) continue;
    const meanBg = sumBg / weightBg;
    const meanFg = (sumTotal - sumBg) / weightFg;
    const variance = weightBg * weightFg * ((meanBg - meanFg) ** 2);
    if (!best || variance > best.variance) {
      best = { variance, meanBg, meanFg };
    }
  }

  if (!best) return 0.5;
  const separation = best.meanFg - best.meanBg;
  if (best.meanFg < 0.28 || separation < 0.14) return 0.5;
  return round(clamp((best.meanBg + best.meanFg) / 2, 0.18, 0.62), 3);
}

export function measureMaskSignals(mask, opts = {}) {
  const width = opts.width || PROGRESS_SCAN_MODEL_INPUT_SIZE;
  const height = opts.height || PROGRESS_SCAN_MODEL_INPUT_SIZE;
  const total = width * height;
  if (!mask || mask.length < total) {
    return unavailableVisionResult('mask_shape_unusable');
  }
  const contentRect = normaliseContentRect(opts.contentRect, width, height);
  const contentArea = contentRect.width * contentRect.height;
  const foregroundThreshold = adaptiveForegroundThreshold(mask, width, height, contentRect);

  const binary = new Uint8Array(total);
  let foreground = 0;
  let fgProb = 0;
  let bgProb = 0;
  let bgCount = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = contentRect.y; y < contentRect.y + contentRect.height; y += 1) {
    const row = y * width;
    for (let x = contentRect.x; x < contentRect.x + contentRect.width; x += 1) {
      const i = row + x;
      const p = clamp(Number(mask[i]) || 0, 0, 1);
      if (p >= foregroundThreshold) {
        binary[i] = 1;
        foreground += 1;
        fgProb += p;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        bgProb += p;
        bgCount += 1;
      }
    }
  }

  if (foreground < contentArea * 0.045) return unavailableVisionResult('no_person_detected');

  const bbox = {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: ((minX + maxX + 1) / 2 - contentRect.x) / contentRect.width,
    centerY: ((minY + maxY + 1) / 2 - contentRect.y) / contentRect.height,
  };

  const components = connectedComponents(binary, width, height);
  const componentDominance = foreground > 0 ? components.largest / foreground : 0;
  const fgMean = foreground > 0 ? fgProb / foreground : 0;
  const bgMean = bgCount > 0 ? bgProb / bgCount : 0;
  const separation = clamp((fgMean - bgMean + 0.2) / 1.2, 0, 1);
  const segmentationConfidence = round(clamp(
    (fgMean * 0.45) + (componentDominance * 0.35) + (separation * 0.2),
    0,
    1,
  ), 3);

  const touchesTop = minY <= contentRect.y + 1;
  const touchesBottom = maxY >= contentRect.y + contentRect.height - 2;
  const touchesSide = minX <= contentRect.x + 1 || maxX >= contentRect.x + contentRect.width - 2;
  const heightRatio = bbox.height / contentRect.height;
  const widthRatio = bbox.width / contentRect.width;
  const centreScore = 1 - clamp(Math.abs(bbox.centerX - 0.5) / 0.35, 0, 1);
  const heightScore = 1 - clamp(Math.abs(heightRatio - 0.74) / 0.32, 0, 1);
  const cropPenalty = (touchesTop || touchesBottom ? 0.32 : 0) + (touchesSide ? 0.16 : 0);
  const framingScore = round(clamp((centreScore * 0.35) + (heightScore * 0.5) + 0.15 - cropPenalty, 0, 1), 3);

  const shoulderProfile = profileInRange(binary, width, height, bbox, 0.18, 0.31);
  const waistProfile = profileInRange(binary, width, height, bbox, 0.44, 0.58);
  const hipProfile = profileInRange(binary, width, height, bbox, 0.60, 0.72);
  const thighProfile = profileInRange(binary, width, height, bbox, 0.76, 0.84);
  const shoulderWidth = widthFromProfile(shoulderProfile, 0.85);
  const shoulderCenter = centerFromProfile(shoulderProfile);
  const waistWidth = widthFromProfile(waistProfile, 0.25);
  const hipWidth = widthFromProfile(hipProfile, 0.70);
  const hipCenter = centerFromProfile(hipProfile);
  const thighWidth = widthFromProfile(thighProfile, 0.60);
  const shoulderToHeight = shoulderWidth != null ? shoulderWidth / bbox.height : null;
  const waistToHeight = waistWidth != null ? waistWidth / bbox.height : null;
  const hipToHeight = hipWidth != null ? hipWidth / bbox.height : null;
  const waistToShoulder = waistWidth != null && shoulderWidth > 0 ? waistWidth / shoulderWidth : null;
  const waistToHip = waistWidth != null && hipWidth > 0 ? waistWidth / hipWidth : null;
  const hipToShoulder = hipWidth != null && shoulderWidth > 0 ? hipWidth / shoulderWidth : null;
  const bodyTiltDegrees = shoulderCenter != null && hipCenter != null
    ? round((Math.atan2(hipCenter - shoulderCenter, Math.max(1, bbox.height * 0.42)) * 180) / Math.PI, 2)
    : null;
  const uprightScore = bodyTiltDegrees == null
    ? 0.75
    : 1 - clamp(Math.abs(bodyTiltDegrees) / 18, 0, 1);
  const poseHeightScore = 1 - clamp(Math.abs(heightRatio - 0.74) / 0.32, 0, 1);
  const poseConfidence = round(clamp(
    (poseHeightScore * 0.45) + (centreScore * 0.25) + (uprightScore * 0.30),
    0,
    1,
  ), 3);
  const lightingScore = finiteNumber(opts.lightingScore);
  const blurScore = finiteNumber(opts.blurScore);

  const reasons = [];
  if (lightingScore != null && lightingScore < 0.25) reasons.push('too_dark');
  if (blurScore != null && blurScore < 0.18) reasons.push('too_blurry');
  if (framingScore < 0.25) reasons.push('whole_body_not_visible');
  if (segmentationConfidence < 0.30) reasons.push('segmentation_low_confidence');
  if (separation < 0.20) reasons.push('clothing_or_background_uncertain');
  if (poseConfidence < 0.22) reasons.push('pose_not_clear');
  if (bodyTiltDegrees != null && Math.abs(bodyTiltDegrees) > 20) reasons.push('camera_tilted');
  if (components.count > 1 && componentDominance < 0.78) reasons.push('multiple_people');

  return {
    modelBacked: opts.modelBacked !== false,
    heuristicBacked: !!opts.heuristicBacked,
    engine: opts.engine || null,
    modelVersion: opts.modelVersion || PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION,
    fallbackReason: opts.fallbackReason || null,
    inputSize: width,
    contentRect,
    pose: opts.pose || null,
    quality: {
      segmentationConfidence,
      framingScore,
      blurScore,
      lightingScore,
      poseConfidence,
      cameraTiltDegrees: bodyTiltDegrees,
      backgroundSeparation: round(separation, 3),
      foregroundThreshold,
      componentDominance: round(componentDominance, 3),
      connectedComponents: components.count,
    },
    mask: {
      foregroundRatio: round(foreground / contentArea, 4),
      foregroundMeanProbability: round(fgMean, 3),
      backgroundMeanProbability: round(bgMean, 3),
    },
    bodyBox: {
      x: round((minX - contentRect.x) / contentRect.width, 4),
      y: round((minY - contentRect.y) / contentRect.height, 4),
      width: round(widthRatio, 4),
      height: round(heightRatio, 4),
      centerX: round(bbox.centerX, 4),
      centerY: round(bbox.centerY, 4),
    },
    silhouetteRatios: {
      shoulderToHeight: shoulderToHeight == null ? null : round(shoulderToHeight, 4),
      waistToHeight: waistToHeight == null ? null : round(waistToHeight, 4),
      hipToHeight: hipToHeight == null ? null : round(hipToHeight, 4),
      waistToShoulder: waistToShoulder == null ? null : round(waistToShoulder, 4),
      waistToHip: waistToHip == null ? null : round(waistToHip, 4),
      hipToShoulder: hipToShoulder == null ? null : round(hipToShoulder, 4),
      thighToHeight: thighWidth == null ? null : round(thighWidth / bbox.height, 4),
      bodyAreaRatio: round(foreground / contentArea, 4),
      bboxHeightRatio: round(heightRatio, 4),
      bboxWidthRatio: round(widthRatio, 4),
    },
    abstentionReasons: reasons,
    needsRetake: reasons.some((r) => RETAKE_REASONS.has(r)),
  };
}

export function unavailableVisionResult(reason = 'model_unavailable') {
  return {
    modelBacked: false,
    engine: null,
    modelVersion: null,
    inputSize: PROGRESS_SCAN_MODEL_INPUT_SIZE,
    quality: {},
    mask: null,
    bodyBox: null,
    silhouetteRatios: null,
    abstentionReasons: [reason],
    needsRetake: UNAVAILABLE_RETAKE_REASONS.has(reason),
    unavailableReason: reason,
  };
}

export function assetFieldsFromVisionResult(result) {
  const quality = result?.quality || {};
  const values = [
    quality.segmentationConfidence,
    quality.framingScore,
    quality.blurScore,
    quality.lightingScore,
  ].map(finiteNumber).filter((v) => v != null);
  const qualityScore = values.length
    ? round(values.reduce((sum, v) => sum + v, 0) / values.length, 3)
    : null;
  return {
    qualityScore,
    landmarkConfidence: finiteNumber(quality.poseConfidence),
    segmentationConfidence: finiteNumber(quality.segmentationConfidence),
    blurScore: finiteNumber(quality.blurScore),
    lightingScore: finiteNumber(quality.lightingScore),
    framingScore: finiteNumber(quality.framingScore),
    cameraTiltDegrees: finiteNumber(quality.cameraTiltDegrees),
    signals: result || unavailableVisionResult(),
  };
}

export function retakeCopyForVisionResult(result) {
  const reasons = new Set(result?.abstentionReasons || []);
  const actionable = [...reasons].some((r) => RETAKE_REASONS.has(r) || UNAVAILABLE_RETAKE_REASONS.has(r));
  if (!actionable) return null;
  if (reasons.has('no_person_detected')) return 'I could not find one clear person in the photo. Step into the frame on your own and retake this pose.';
  if (reasons.has('native_preprocess_unavailable') || reasons.has('native_preprocess_shape_unusable') || reasons.has('mask_shape_unusable')) {
    return 'I could not read this image clearly enough for scan analysis. Try a new photo for this pose.';
  }
  if (reasons.has('too_dark')) return 'The photo is too dark for a reliable scan. Move into brighter, even light and take this pose again.';
  if (reasons.has('too_blurry')) return 'The photo is too blurred for a reliable scan. Keep the phone still and use the timer before retaking.';
  if (reasons.has('whole_body_not_visible')) return 'Your full outline is not clear enough in frame. Step back until your whole body is visible, then retake.';
  if (reasons.has('multiple_people')) return 'The scan can only read one person. Retake with only you in frame.';
  if (reasons.has('segmentation_low_confidence')) return 'Your outline was not clear enough for the scan. Try a plain background and brighter light.';
  if (reasons.has('clothing_or_background_uncertain')) return 'Your outline blends into the background or clothing too much for a reliable scan. Try plain fitted clothing against a plain background.';
  if (reasons.has('pose_not_clear')) return 'Your stance was not clear enough for the scan. Stand tall, face the camera squarely, and retake.';
  if (reasons.has('camera_tilted')) return 'The camera looks tilted for this scan. Keep the phone upright and retake.';
  return 'This photo is not reliable enough for analysis. Retake it now, or use the photo without analysis.';
}

export async function analyseProgressScanPhoto({ uri, pose } = {}) {
  try {
    const imageModule = require('progress-scan-image');
    const extracted = await imageModule.extractRgb?.(uri, PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE);
    if (!extracted?.rgbBase64) return unavailableVisionResult('native_preprocess_unavailable');

    const rgb = base64ToUint8Array(extracted.rgbBase64);
    if (rgb.length !== PROGRESS_SCAN_MODEL_INPUT_SIZE * PROGRESS_SCAN_MODEL_INPUT_SIZE * 3) {
      return unavailableVisionResult('native_preprocess_shape_unusable');
    }

    const common = {
      width: PROGRESS_SCAN_MODEL_INPUT_SIZE,
      height: PROGRESS_SCAN_MODEL_INPUT_SIZE,
      rgb,
      blurScore: blurScoreFromRgb(rgb, PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE),
      lightingScore: extracted.lightingScore,
      contentRect: extracted.contentRect,
      pose,
    };

    const model = await loadProgressScanModel();
    if (model) {
      let mask;
      try {
        const input = rgbBytesToFloat32(rgb);
        const outputs = await model.run([exactBuffer(input)]);
        mask = outputToFloat32Array(outputs);
      } catch (_) {
        modelUnavailableReason = 'model_run_failed';
        const result = unavailableVisionResult('model_run_failed');
        logVisionDiagnosticIfNeeded('progressScanVision.modelRunFailed', { ...result, pose });
      }
      if (mask) {
        const result = measureMaskSignals(mask, {
          ...common,
          modelBacked: true,
          engine: 'fast_tflite',
        });
        logVisionDiagnosticIfNeeded('progressScanVision.fastTflite', result);
        if (result?.modelBacked || !result?.abstentionReasons?.includes('no_person_detected')) return result;
      }
    }

    const nativeSegmentation = await imageModule.segmentPersonMask?.(
      uri,
      PROGRESS_SCAN_MODEL_INPUT_SIZE,
      PROGRESS_SCAN_MODEL_INPUT_SIZE,
    );
    const nativeMask = nativeSegmentationMaskFromResult(nativeSegmentation);
    if (nativeMask) {
      const result = measureMaskSignals(nativeMask.mask, {
        ...common,
        width: nativeMask.width,
        height: nativeMask.height,
        contentRect: nativeSegmentation.contentRect || extracted.contentRect,
        modelBacked: true,
        engine: nativeSegmentation.engine || 'mlkit_selfie_segmentation',
        modelVersion: PROGRESS_SCAN_NATIVE_SEGMENTATION_MODEL_VERSION,
      });
      logVisionDiagnosticIfNeeded('progressScanVision.nativeSegmentation', result);
      return result;
    }
    if (nativeSegmentation?.errorCode) {
      logWarn('progressScanVision.nativeSegmentationUnavailable', 'progress_scan_native_segmentation_unavailable', {
        pose,
        engine: nativeSegmentation.engine || 'mlkit_selfie_segmentation',
        errorCode: nativeSegmentation.errorCode,
      });
    }
    if (!model) {
      const result = unavailableVisionResult(modelUnavailableReason || 'model_unavailable');
      logVisionDiagnosticIfNeeded('progressScanVision.modelUnavailable', { ...result, pose });
      return result;
    }
    const result = unavailableVisionResult(modelUnavailableReason || 'mask_shape_unusable');
    logVisionDiagnosticIfNeeded('progressScanVision.modelMaskUnavailable', { ...result, pose });
    return result;
  } catch (e) {
    logError('progressScanVision.analysePhoto', e, { pose });
    return unavailableVisionResult('model_unavailable');
  }
}
