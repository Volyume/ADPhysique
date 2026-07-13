/**
 * Anonymous scan calibration telemetry (D81, founder order 2026-07-13).
 *
 * After a scan completes, ONE anonymous row of measurement numbers goes to
 * the scan_calibration_events cloud table so scoring can be fine-tuned
 * against the real user population as it grows. Anonymous BY CONSTRUCTION:
 * no user id, no photo, no uri, no note, no exact timestamp (the table
 * defaults to the day), height/weight in 5-unit bands. The stored data is
 * not personal data (GDPR recital 26); the Article 9 consent screen names
 * the purpose. Photos and per-user scan records remain device-only -- this
 * is one-way fire-and-forget telemetry, never sync, and a failed or offline
 * send is simply dropped (no queue, no retry, no error surfaced).
 */
import { Platform } from 'react-native';

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// 5-unit band string, e.g. 175 -> '175-180'. Coarse on purpose: bands plus
// day-resolution timing keep rows unlinkable to a person.
export function fiveUnitBand(value) {
  const n = finiteNumber(value);
  if (n == null || n <= 0) return null;
  const low = Math.floor(n / 5) * 5;
  return `${low}-${low + 5}`;
}

function parseMaybeJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function assetSignal(asset = {}) {
  return parseMaybeJson(asset.signals ?? asset.signalsJson, null) || {};
}

const RATIO_KEYS = [
  'shoulderToHeight', 'waistToHeight', 'hipToHeight', 'waistToShoulder',
  'waistToHip', 'hipToShoulder', 'thighToHeight', 'bodyAreaRatio',
  'bboxHeightRatio', 'bboxWidthRatio',
];

function numbersOnly(source = {}, keys) {
  const out = {};
  for (const key of keys) {
    const n = finiteNumber(source?.[key]);
    if (n != null) out[key] = n;
  }
  return out;
}

/**
 * Pure builder. Returns the anonymous row, or null when the scan produced
 * no score (nothing to calibrate against). Never includes strings from
 * user content: every field is either a bounded number, a known enum
 * string from the engine, or a version identifier.
 */
export function buildScanCalibrationRow({
  assets = [],
  physiqueAssessment = null,
  estimatorInputs = null,
  sex = null,
  heightCm = null,
  weightKg = null,
  appVersion = null,
} = {}) {
  const score = finiteNumber(physiqueAssessment?.visualLeannessScore);
  if (score == null) return null;
  const poseRatios = {};
  const quality = {};
  let engine = null;
  let modelVersion = null;
  let measurementVersion = null;
  for (const asset of assets) {
    const pose = asset?.pose;
    if (!pose) continue;
    const signal = assetSignal(asset);
    if (signal.silhouetteRatios) {
      poseRatios[pose] = numbersOnly(signal.silhouetteRatios, RATIO_KEYS);
    }
    if (signal.quality) {
      quality[pose] = numbersOnly(signal.quality, [
        'segmentationConfidence', 'framingScore', 'blurScore', 'lightingScore',
        'poseConfidence', 'backgroundSeparation', 'cameraTiltDegrees',
        'componentDominance', 'connectedComponents', 'foregroundThreshold',
      ]);
    }
    engine = engine ?? signal.engine ?? null;
    modelVersion = modelVersion ?? signal.modelVersion ?? null;
    measurementVersion = measurementVersion ?? signal.measurementVersion ?? null;
  }
  let resolvedAppVersion = typeof appVersion === 'string' ? appVersion : null;
  if (resolvedAppVersion == null) {
    try {
      // Same source observability.js uses for its build tag.
      // eslint-disable-next-line global-require
      resolvedAppVersion = require('expo-constants').default?.expoConfig?.version ?? null;
    } catch (_) { resolvedAppVersion = null; }
  }
  return {
    app_version: resolvedAppVersion,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    sex: sex === 'male' || sex === 'female' ? sex : null,
    height_band: fiveUnitBand(heightCm),
    weight_band: fiveUnitBand(weightKg),
    score,
    band: typeof physiqueAssessment?.leannessBandLabel === 'string' ? physiqueAssessment.leannessBandLabel : null,
    confidence: typeof physiqueAssessment?.scanConfidenceTier === 'string' ? physiqueAssessment.scanConfidenceTier : null,
    ratios: numbersOnly(estimatorInputs, [
      'waistToShoulder', 'waistToHip', 'waistToHeight', 'bodyAreaRatio',
      'frontBackWaistSpread', 'sideWaistToHeight', 'bmi',
    ]),
    pose_ratios: poseRatios,
    quality,
    engine,
    model_version: modelVersion,
    measurement_version: measurementVersion,
  };
}

/**
 * Fire-and-forget send. Missing client, missing table, offline, RLS refusal:
 * all silently dropped -- calibration telemetry must never affect the scan
 * experience or surface an error.
 */
export async function submitScanCalibrationRow(row) {
  if (!row) return;
  try {
    // eslint-disable-next-line global-require
    const { getSupabaseClient } = require('./supabase');
    const c = getSupabaseClient();
    if (!c) return;
    await c.from('scan_calibration_events').insert(row);
  } catch (_) { /* best effort by design */ }
}
