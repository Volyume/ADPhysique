import { logError } from './errorLog';

export const PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION = 'mediapipe_selfie_segmentation_general_2021_05_06';
export const PROGRESS_SCAN_MODEL_INPUT_SIZE = 256;

const MODEL_SOURCE = () => require('../../assets/ml/selfie_segmentation.tflite');
const RETAKE_REASONS = new Set([
  'too_dark',
  'too_blurry',
  'whole_body_not_visible',
  'multiple_people_detected',
  'segmentation_low_confidence',
]);

let modelPromise = null;

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
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      return loadTensorflowModel(MODEL_SOURCE(), []);
    })();
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

  const binary = new Uint8Array(total);
  let foreground = 0;
  let fgProb = 0;
  let bgProb = 0;
  let bgCount = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < total; i += 1) {
    const p = clamp(Number(mask[i]) || 0, 0, 1);
    if (p >= 0.5) {
      binary[i] = 1;
      foreground += 1;
      fgProb += p;
      const x = i % width;
      const y = Math.floor(i / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      bgProb += p;
      bgCount += 1;
    }
  }

  if (foreground < total * 0.06) return unavailableVisionResult('no_person_detected');

  const bbox = {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX + 1) / (2 * width),
    centerY: (minY + maxY + 1) / (2 * height),
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

  const touchesTop = minY <= 1;
  const touchesBottom = maxY >= height - 2;
  const touchesSide = minX <= 1 || maxX >= width - 2;
  const heightRatio = bbox.height / height;
  const widthRatio = bbox.width / width;
  const centreScore = 1 - clamp(Math.abs(bbox.centerX - 0.5) / 0.35, 0, 1);
  const heightScore = 1 - clamp(Math.abs(heightRatio - 0.74) / 0.32, 0, 1);
  const cropPenalty = (touchesTop || touchesBottom ? 0.32 : 0) + (touchesSide ? 0.16 : 0);
  const framingScore = round(clamp((centreScore * 0.35) + (heightScore * 0.5) + 0.15 - cropPenalty, 0, 1), 3);

  const shoulderWidth = widthAtBand(binary, width, height, bbox, 0.24);
  const waistWidth = widthAtBand(binary, width, height, bbox, 0.52);
  const hipWidth = widthAtBand(binary, width, height, bbox, 0.66);
  const thighWidth = widthAtBand(binary, width, height, bbox, 0.80);
  const shoulderToHeight = shoulderWidth != null ? shoulderWidth / bbox.height : null;
  const waistToHeight = waistWidth != null ? waistWidth / bbox.height : null;
  const hipToHeight = hipWidth != null ? hipWidth / bbox.height : null;
  const waistToShoulder = waistWidth != null && shoulderWidth > 0 ? waistWidth / shoulderWidth : null;
  const waistToHip = waistWidth != null && hipWidth > 0 ? waistWidth / hipWidth : null;
  const hipToShoulder = hipWidth != null && shoulderWidth > 0 ? hipWidth / shoulderWidth : null;
  const verticality = widthRatio > 0 ? heightRatio / widthRatio : null;
  const poseConfidence = round(clamp(((verticality ?? 0) - 1.15) / 1.2, 0, 1), 3);
  const lightingScore = finiteNumber(opts.lightingScore);
  const blurScore = finiteNumber(opts.blurScore);

  const reasons = [];
  if (lightingScore != null && lightingScore < 0.45) reasons.push('too_dark');
  if (blurScore != null && blurScore < 0.45) reasons.push('too_blurry');
  if (framingScore < 0.55) reasons.push('whole_body_not_visible');
  if (segmentationConfidence < 0.55) reasons.push('segmentation_low_confidence');
  if (components.count > 1 && componentDominance < 0.78) reasons.push('multiple_people_detected');

  return {
    modelBacked: true,
    modelVersion: PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION,
    inputSize: width,
    pose: opts.pose || null,
    quality: {
      segmentationConfidence,
      framingScore,
      blurScore,
      lightingScore,
      poseConfidence,
      componentDominance: round(componentDominance, 3),
      connectedComponents: components.count,
    },
    mask: {
      foregroundRatio: round(foreground / total, 4),
      foregroundMeanProbability: round(fgMean, 3),
      backgroundMeanProbability: round(bgMean, 3),
    },
    bodyBox: {
      x: round(minX / width, 4),
      y: round(minY / height, 4),
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
      bodyAreaRatio: round(foreground / total, 4),
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
    needsRetake: false,
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
    landmarkConfidence: null,
    segmentationConfidence: finiteNumber(quality.segmentationConfidence),
    blurScore: finiteNumber(quality.blurScore),
    lightingScore: finiteNumber(quality.lightingScore),
    framingScore: finiteNumber(quality.framingScore),
    cameraTiltDegrees: null,
    signals: result || unavailableVisionResult(),
  };
}

export function retakeCopyForVisionResult(result) {
  const reasons = new Set(result?.abstentionReasons || []);
  if (!result?.modelBacked || ![...reasons].some((r) => RETAKE_REASONS.has(r))) return null;
  if (reasons.has('too_dark')) return 'The photo is too dark for a reliable scan. Move into brighter, even light and take this pose again.';
  if (reasons.has('too_blurry')) return 'The photo is too blurred for a reliable scan. Keep the phone still and use the timer before retaking.';
  if (reasons.has('whole_body_not_visible')) return 'Your full outline is not clear enough in frame. Step back until your whole body is visible, then retake.';
  if (reasons.has('multiple_people_detected')) return 'The scan can only read one person. Retake with only you in frame.';
  if (reasons.has('segmentation_low_confidence')) return 'Your outline was not clear enough for the scan. Try a plain background and brighter light.';
  return 'This photo is not reliable enough for analysis. Retake it now, or save the photo without an estimate.';
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

    const input = rgbBytesToFloat32(rgb);
    const model = await loadProgressScanModel();
    const outputs = await model.run([exactBuffer(input)]);
    const mask = outputToFloat32Array(outputs);
    return measureMaskSignals(mask, {
      width: PROGRESS_SCAN_MODEL_INPUT_SIZE,
      height: PROGRESS_SCAN_MODEL_INPUT_SIZE,
      rgb,
      blurScore: blurScoreFromRgb(rgb, PROGRESS_SCAN_MODEL_INPUT_SIZE, PROGRESS_SCAN_MODEL_INPUT_SIZE),
      lightingScore: extracted.lightingScore,
      pose,
    });
  } catch (e) {
    logError('progressScanVision.analysePhoto', e, { pose });
    return unavailableVisionResult('model_unavailable');
  }
}
