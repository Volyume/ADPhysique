import { logError } from './errorLog';

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

function normaliseFastTfliteUri(uri) {
  const value = String(uri || '').trim();
  if (!value) return null;
  if (/^(file|https?):\/\//i.test(value)) return value;
  if (/^[a-z]:[\\/]/i.test(value)) return `file:///${value.replace(/\\/g, '/')}`;
  if (value.startsWith('/')) return `file://${value}`;
  return null;
}

export async function resolveProgressScanModelSource() {
  try {
    const imageModule = require('progress-scan-image');
    const nativeUri = await imageModule.resolveBundledModel?.(MODEL_FILE_NAME);
    const normalisedNativeUri = normaliseFastTfliteUri(nativeUri);
    if (normalisedNativeUri) return { url: normalisedNativeUri };
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
  return uri ? { url: uri } : null;
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
  if (modelUnavailableReason) return Promise.resolve(null);
  if (!modelPromise) {
    modelPromise = (async () => {
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      const modelSource = await resolveProgressScanModelSource();
      if (!modelSource) {
        modelUnavailableReason = 'model_source_unavailable';
        return null;
      }
      try {
        return await loadTensorflowModel(modelSource, []);
      } catch (_) {
        modelUnavailableReason = 'model_load_failed';
        return null;
      }
    });
  }
  return modelPromise;
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

function widthAtBand(binary, width, height, bbox, ratio) {
  if (!bbox) return null;
  const yCentre = Math.round(bbox.minY + bbox.height * ratio);
  const band = Math.max(1, Math.round(bbox.height * 0.018));
  let minX = width;
  let maxX = -1;
  for (let y = Math.max(0, yCentre - band); y <= Math.min(height - 1, yCentre + band); y += 1) {
    const row = y * width;
    for (let x = bbox.minX; x <= bbox.maxX; x += 1) {
      if (binary[row + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return maxX >= minX ? maxX - minX + 1 : null;
}

function centerAtBand(binary, width, height, bbox, ratio) {
  if (!bbox) return null;
  const yCentre = Math.round(bbox.minY + bbox.height * ratio);
  const band = Math.max(1, Math.round(bbox.height * 0.018));
  let minX = width;
  let maxX = -1;
  for (let y = Math.max(0, yCentre - band); y <= Math.min(height - 1, yCentre + band); y += 1) {
    const row = y * width;
    for (let x = bbox.minX; x <= bbox.maxX; x += 1) {
      if (binary[row + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return maxX >= minX ? (minX + maxX + 1) / 2 : null;
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

export function measureMaskSignals(mask, opts = {}) {
  const width = opts.width || PROGRESS_SCAN_MODEL_INPUT_SIZE;
  const height = opts.height || PROGRESS_SCAN_MODEL_INPUT_SIZE;
  const total = width * height;
  if (!mask || mask.length < total) {
    return unavailableVisionResult('mask_shape_unusable');
  }
  const contentRect = normaliseContentRect(opts.contentRect, width, height);
  const contentArea = contentRect.width * contentRect.height;

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
      if (p >= 0.5) {
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

  const shoulderWidth = widthAtBand(binary, width, height, bbox, 0.24);
  const shoulderCenter = centerAtBand(binary, width, height, bbox, 0.24);
  const waistWidth = widthAtBand(binary, width, height, bbox, 0.52);
  const hipWidth = widthAtBand(binary, width, height, bbox, 0.66);
  const hipCenter = centerAtBand(binary, width, height, bbox, 0.66);
  const thighWidth = widthAtBand(binary, width, height, bbox, 0.80);
  const shoulderToHeight = shoulderWidth != null ? shoulderWidth / bbox.height : null;
  const waistToHeight = waistWidth != null ? waistWidth / bbox.height : null;
  const hipToHeight = hipWidth != null ? hipWidth / bbox.height : null;
  const waistToShoulder = waistWidth != null && shoulderWidth > 0 ? waistWidth / shoulderWidth : null;
  const waistToHip = waistWidth != null && hipWidth > 0 ? waistWidth / hipWidth : null;
  const hipToShoulder = hipWidth != null && shoulderWidth > 0 ? hipWidth / shoulderWidth : null;
  const verticality = widthRatio > 0 ? heightRatio / widthRatio : null;
  const poseConfidence = round(clamp(((verticality ?? 0) - 1.15) / 1.2, 0, 1), 3);
  const bodyTiltDegrees = shoulderCenter != null && hipCenter != null
    ? round((Math.atan2(hipCenter - shoulderCenter, Math.max(1, bbox.height * 0.42)) * 180) / Math.PI, 2)
    : null;
  const lightingScore = finiteNumber(opts.lightingScore);
  const blurScore = finiteNumber(opts.blurScore);

  const reasons = [];
  if (lightingScore != null && lightingScore < 0.3) reasons.push('too_dark');
  if (blurScore != null && blurScore < 0.3) reasons.push('too_blurry');
  if (framingScore < 0.32) reasons.push('whole_body_not_visible');
  if (segmentationConfidence < 0.38) reasons.push('segmentation_low_confidence');
  if (separation < 0.28) reasons.push('clothing_or_background_uncertain');
  if (poseConfidence < 0.28) reasons.push('pose_not_clear');
  if (bodyTiltDegrees != null && Math.abs(bodyTiltDegrees) > 16) reasons.push('camera_tilted');
  if (components.count > 1 && componentDominance < 0.78) reasons.push('multiple_people');

  return {
    modelBacked: opts.modelBacked !== false,
    heuristicBacked: !!opts.heuristicBacked,
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
    const nativeSegmentation = await imageModule.segmentPersonMask?.(
      uri,
      PROGRESS_SCAN_MODEL_INPUT_SIZE,
      PROGRESS_SCAN_MODEL_INPUT_SIZE,
    );
    const nativeMask = nativeSegmentationMaskFromResult(nativeSegmentation);
    if (nativeMask) {
      return measureMaskSignals(nativeMask.mask, {
        ...common,
        width: nativeMask.width,
        height: nativeMask.height,
        contentRect: nativeSegmentation.contentRect || extracted.contentRect,
        modelBacked: true,
        modelVersion: PROGRESS_SCAN_NATIVE_SEGMENTATION_MODEL_VERSION,
      });
    }
    const model = await loadProgressScanModel();
    if (!model) return unavailableVisionResult(modelUnavailableReason || 'model_unavailable');
    let mask;
    try {
      const input = rgbBytesToFloat32(rgb);
      const outputs = await model.run([exactBuffer(input)]);
      mask = outputToFloat32Array(outputs);
    } catch (_) {
      modelUnavailableReason = 'model_run_failed';
      return unavailableVisionResult('model_run_failed');
    }
    return measureMaskSignals(mask, {
      ...common,
      modelBacked: true,
    });
  } catch (e) {
    logError('progressScanVision.analysePhoto', e, { pose });
    return unavailableVisionResult('model_unavailable');
  }
}
