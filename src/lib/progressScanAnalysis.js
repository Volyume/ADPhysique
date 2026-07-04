export const REQUIRED_SCAN_POSES = ['front', 'back'];
export const OPTIONAL_SCAN_POSES = ['side'];
export const PHOTO_SCAN_SOURCE = 'photo_scan';
export const PROGRESS_SCAN_CONSENT_VERSION = 'progress_scan_v1_2026-07-04';
export const PROGRESS_SCAN_ESTIMATOR_VERSION = 'progress_scan_rules_v1';

const QUALITY_KEYS = [
  'landmarkConfidence',
  'segmentationConfidence',
  'blurScore',
  'lightingScore',
  'framingScore',
];

function finiteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rounded1(n) {
  return Math.round(n * 10) / 10;
}

export function normalisePose(pose) {
  return ['front', 'back', 'side'].includes(pose) ? pose : null;
}

export function requiredPosesComplete(assets = []) {
  const poses = new Set((assets || []).map((a) => normalisePose(a.pose)).filter(Boolean));
  return REQUIRED_SCAN_POSES.every((pose) => poses.has(pose));
}

export function qualityScoreForAsset(asset = {}) {
  const values = QUALITY_KEYS
    .map((key) => finiteNumber(asset[key]))
    .filter((v) => v != null)
    .map((v) => clamp(v, 0, 1));
  if (values.length === 0) return null;
  return rounded1(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function aggregateQuality(assets = []) {
  const scores = (assets || []).map((a) => finiteNumber(a.qualityScore) ?? qualityScoreForAsset(a)).filter((v) => v != null);
  if (scores.length === 0) return { score: null, label: 'unknown' };
  const score = rounded1(scores.reduce((sum, v) => sum + v, 0) / scores.length);
  const label = score >= 0.82 ? 'good' : score >= 0.64 ? 'usable' : 'poor';
  return { score, label };
}

export function abstentionReasonsForAssets(assets = []) {
  const reasons = new Set();
  if (!requiredPosesComplete(assets)) reasons.add('missing_required_pose');
  for (const asset of assets || []) {
    const lighting = finiteNumber(asset.lightingScore);
    const blur = finiteNumber(asset.blurScore);
    const framing = finiteNumber(asset.framingScore);
    const landmarks = finiteNumber(asset.landmarkConfidence);
    const segmentation = finiteNumber(asset.segmentationConfidence);
    const tilt = finiteNumber(asset.cameraTiltDegrees);
    if (lighting != null && lighting < 0.45) reasons.add('too_dark');
    if (blur != null && blur < 0.45) reasons.add('too_blurry');
    if (framing != null && framing < 0.55) reasons.add('whole_body_not_visible');
    if (landmarks != null && landmarks < 0.55) reasons.add('pose_not_clear');
    if (segmentation != null && segmentation < 0.55) reasons.add('segmentation_low_confidence');
    if (tilt != null && Math.abs(tilt) > 6) reasons.add('camera_tilted');
  }
  return [...reasons];
}

export function deriveBiasFlags({ sex = null, userFlags = [], modelValidated = false, quality = {} } = {}) {
  const flags = new Set(Array.isArray(userFlags) ? userFlags.filter(Boolean) : []);
  if (sex === 'female') flags.add('female_overestimation_risk');
  if (!modelValidated) flags.add('physique_athlete_validation_pending');
  if (quality?.label === 'poor' || quality?.label === 'unknown') flags.add('quality_limited');
  return [...flags];
}

export function uncertaintyMarginPctPoints({ quality = {}, biasFlags = [], baseMargin = 3.5 } = {}) {
  let margin = Number.isFinite(baseMargin) ? baseMargin : 3.5;
  if (quality?.label === 'usable') margin += 1.0;
  if (quality?.label === 'poor' || quality?.label === 'unknown') margin += 2.0;
  const flags = new Set(biasFlags || []);
  if (flags.has('female_overestimation_risk')) margin += 1.0;
  if (flags.has('darker_skin_overestimation_risk')) margin += 1.2;
  if (flags.has('very_muscular')) margin += 1.0;
  if (flags.has('large_body')) margin += 0.8;
  if (flags.has('stage_lean_or_prep')) margin += 1.4;
  if (flags.has('physique_athlete_validation_pending')) margin += 1.0;
  return rounded1(clamp(margin, 3.5, 9));
}

export function buildEstimateRange(estimate, opts = {}) {
  const n = finiteNumber(estimate);
  if (n == null || n <= 0 || n >= 60) return null;
  const margin = uncertaintyMarginPctPoints(opts);
  return {
    midpoint: rounded1(n),
    low: rounded1(clamp(n - margin, 1, 60)),
    high: rounded1(clamp(n + margin, 1, 60)),
    margin,
  };
}

export function compareScanEstimates(current, previous) {
  if (!current || !previous) {
    return { direction: 'uncertain', magnitudePctPoints: null, explanation: 'This is your baseline scan.' };
  }
  const cur = finiteNumber(current.estimateBodyFatPercent);
  const prev = finiteNumber(previous.estimateBodyFatPercent);
  if (cur == null || prev == null) {
    return { direction: 'uncertain', magnitudePctPoints: null, explanation: 'There is not enough scan data for a trend yet.' };
  }
  const delta = rounded1(cur - prev);
  const curMargin = Math.abs((finiteNumber(current.estimateRangeHigh) ?? cur) - cur);
  const prevMargin = Math.abs((finiteNumber(previous.estimateRangeHigh) ?? prev) - prev);
  const noise = Math.max(1.5, Math.min(6, (curMargin + prevMargin) / 2));
  if (Math.abs(delta) <= noise) {
    return {
      direction: 'steady',
      magnitudePctPoints: Math.abs(delta),
      explanation: 'The estimate moved, but it is still inside the scan range. Treat this as steady.',
    };
  }
  return {
    direction: delta < 0 ? 'down' : 'up',
    magnitudePctPoints: Math.abs(delta),
    explanation: delta < 0
      ? 'The scan range supports a downward body-fat trend.'
      : 'The scan range supports an upward body-fat trend.',
  };
}

export function explainProgressScan(scan) {
  if (!scan) return null;
  if (scan.analysisStatus === 'abstained') {
    return 'The scan was saved, but the estimate was withheld because the data was not reliable enough.';
  }
  if (scan.estimateRangeLow != null && scan.estimateRangeHigh != null) {
    const trend = scan.trendDirection && scan.trendDirection !== 'uncertain'
      ? ` ${scan.copySummary || ''}`.trim()
      : 'Use this as a baseline unless you have a comparable earlier scan.';
    return `Estimate range ${scan.estimateRangeLow}-${scan.estimateRangeHigh}%. ${trend}`;
  }
  return 'The scan is saved. Body-composition analysis is not available for this scan.';
}

export function analyseProgressScan({ assets = [], modelEstimate = null, previousScan = null, sex = null, userBiasFlags = [], modelValidated = false } = {}) {
  const quality = aggregateQuality(assets);
  const reasons = abstentionReasonsForAssets(assets);
  const biasFlags = deriveBiasFlags({ sex, userFlags: userBiasFlags, modelValidated, quality });

  if (reasons.length > 0) {
    return {
      analysisStatus: 'abstained',
      qualityScore: quality.score,
      qualityLabel: quality.label,
      estimate: null,
      range: null,
      trend: { direction: 'uncertain', magnitudePctPoints: null, explanation: 'The scan quality was not strong enough for a useful estimate.' },
      abstentionReasons: reasons,
      biasFlags,
      copySummary: 'The scan was saved, but the estimate was withheld because the data was not reliable enough.',
    };
  }

  if (modelEstimate == null) {
    return {
      analysisStatus: 'abstained',
      qualityScore: quality.score,
      qualityLabel: quality.label,
      estimate: null,
      range: null,
      trend: { direction: 'uncertain', magnitudePctPoints: null, explanation: 'The scan is saved as a baseline.' },
      abstentionReasons: ['model_unavailable'],
      biasFlags,
      copySummary: 'The guided photos are saved. Body-composition estimates are not available yet, so use this as visual trend context only.',
    };
  }

  const range = buildEstimateRange(modelEstimate, { quality, biasFlags });
  if (!range) {
    return {
      analysisStatus: 'abstained',
      qualityScore: quality.score,
      qualityLabel: quality.label,
      estimate: null,
      range: null,
      trend: { direction: 'uncertain', magnitudePctPoints: null, explanation: 'The model estimate was outside a usable range.' },
      abstentionReasons: ['estimate_out_of_range'],
      biasFlags,
      copySummary: 'The estimate was withheld because it fell outside a usable range.',
    };
  }

  const currentForTrend = {
    estimateBodyFatPercent: range.midpoint,
    estimateRangeHigh: range.high,
    estimateRangeLow: range.low,
  };
  const trend = compareScanEstimates(currentForTrend, previousScan);
  return {
    analysisStatus: 'complete',
    qualityScore: quality.score,
    qualityLabel: quality.label,
    estimate: range.midpoint,
    range,
    trend,
    abstentionReasons: [],
    biasFlags,
    copySummary: trend.explanation,
  };
}

export function coachSummaryFromScan(scan, { suppressed = false } = {}) {
  if (suppressed || !scan || scan.analysisStatus !== 'complete') return null;
  if (scan.estimateBodyFatPercent == null || scan.estimateRangeLow == null || scan.estimateRangeHigh == null) return null;
  return {
    source: PHOTO_SCAN_SOURCE,
    capturedAt: scan.capturedAt,
    estimateBodyFatPercent: scan.estimateBodyFatPercent,
    rangeLow: scan.estimateRangeLow,
    rangeHigh: scan.estimateRangeHigh,
    confidence: scan.estimateConfidence || 'low',
    qualityLabel: scan.qualityLabel || 'unknown',
    trendDirection: scan.trendDirection || 'uncertain',
    trendMagnitudePctPoints: scan.trendMagnitudePctPoints ?? null,
    supportingSignals: [],
    limitations: [
      'photo_scan_low_confidence',
      ...parseMaybeJson(scan.biasFlagsJson),
    ],
    copy: explainProgressScan(scan),
  };
}

export function parseMaybeJson(value, fallback = []) {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}
