import bfEstimatorAsset from '../../assets/ml/progress_scan_bf_estimator_v1.json';

export const REQUIRED_SCAN_POSES = ['front', 'back'];
export const OPTIONAL_SCAN_POSES = ['side'];
export const PHOTO_SCAN_SOURCE = 'photo_scan';
export const PROGRESS_SCAN_CONSENT_VERSION = 'progress_scan_v1_2026-07-04';
export const PROGRESS_SCAN_ESTIMATOR_VERSION = bfEstimatorAsset.id;
export const PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION = 'mediapipe_selfie_segmentation_general_2021_05_06';
export const PROGRESS_SCAN_SCORE_VERSION = 'volyume_physique_scan_score_v1';

export const PROGRESS_SCAN_LEANNESS_BANDS = [
  { key: 'foundation', label: 'Foundation', min: 0, max: 19 },
  { key: 'active', label: 'Active', min: 20, max: 34 },
  { key: 'athletic', label: 'Athletic', min: 35, max: 49 },
  { key: 'defined', label: 'Defined', min: 50, max: 64 },
  { key: 'lean', label: 'Lean', min: 65, max: 79 },
  { key: 'very_lean', label: 'Very Lean', min: 80, max: 89 },
  { key: 'peak_condition', label: 'Peak Condition', min: 90, max: 100 },
];

const PROGRESS_SIGNAL_COPY = {
  baseline: 'Baseline scan',
  clear_positive: 'Clear positive trend',
  slight_positive: 'Slight positive trend',
  holding_steady: 'Holding steady',
  slight_drift: 'Slight drift',
  clear_drift: 'Clear drift',
  inconclusive: 'Inconclusive',
};

const SCAN_CONFIDENCE_COPY = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  not_enough: 'Not enough confidence',
  unknown: 'Unknown',
};

const SCAN_CONFIDENCE_RANK = {
  high: 3,
  moderate: 2,
  low: 1,
  not_enough: 0,
  unknown: 0,
};

const COMPETITION_GOALS = new Set([
  'mens_physique',
  'classic_physique',
  'bodybuilding',
  'bikini',
  'wellness',
  'figure',
  'womens_physique',
  'womens_bodybuilding',
]);

const QUALITY_KEYS = [
  'landmarkConfidence',
  'segmentationConfidence',
  'blurScore',
  'lightingScore',
  'framingScore',
];

function finiteNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rounded1(n) {
  return Math.round(n * 10) / 10;
}

function rounded2(n) {
  return Math.round(n * 100) / 100;
}

function rounded0(n) {
  return Math.round(n);
}

function clamp01(n) {
  return clamp(n, 0, 1);
}

export function normalisePose(pose) {
  return ['front', 'back', 'side'].includes(pose) ? pose : null;
}

export function requiredPosesComplete(assets = []) {
  const poses = new Set((assets || []).map((a) => normalisePose(a.pose)).filter(Boolean));
  return REQUIRED_SCAN_POSES.every((pose) => poses.has(pose));
}

function canonicalReason(reason) {
  if (reason === 'multiple_people_detected') return 'multiple_people';
  return reason;
}

function assetSignals(asset = {}) {
  return parseMaybeJson(asset.signals ?? asset.signalsJson, null);
}

function hasModelBackedAssets(assets = []) {
  return (assets || []).some((asset) => assetSignals(asset)?.modelBacked);
}

export function requiredModelBackedPosesComplete(assets = []) {
  const poses = new Set(
    (assets || [])
      .filter((asset) => assetSignals(asset)?.modelBacked)
      .map((asset) => normalisePose(asset.pose))
      .filter(Boolean),
  );
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
  const rawScore = scores.reduce((sum, v) => sum + v, 0) / scores.length;
  const label = rawScore >= 0.82 ? 'good' : rawScore >= 0.64 ? 'usable' : 'poor';
  return { score: rounded1(rawScore), label };
}

export function abstentionReasonsForAssets(assets = []) {
  const reasons = new Set();
  if (!requiredPosesComplete(assets)) reasons.add('missing_required_pose');
  else if (!requiredModelBackedPosesComplete(assets)) reasons.add('model_unavailable');
  for (const asset of assets || []) {
    const signals = assetSignals(asset);
    for (const reason of signals?.abstentionReasons || []) {
      const canonical = canonicalReason(reason);
      if (canonical && canonical !== 'model_unavailable') reasons.add(canonical);
    }
    const lighting = finiteNumber(asset.lightingScore);
    const blur = finiteNumber(asset.blurScore);
    const framing = finiteNumber(asset.framingScore);
    const landmarks = finiteNumber(asset.landmarkConfidence ?? signals?.quality?.poseConfidence);
    const segmentation = finiteNumber(asset.segmentationConfidence);
    const tilt = finiteNumber(asset.cameraTiltDegrees ?? signals?.quality?.cameraTiltDegrees);
    const separation = finiteNumber(signals?.quality?.backgroundSeparation);
    if (lighting != null && lighting < 0.45) reasons.add('too_dark');
    if (blur != null && blur < 0.45) reasons.add('too_blurry');
    if (framing != null && framing < 0.55) reasons.add('whole_body_not_visible');
    if (landmarks != null && landmarks < 0.55) reasons.add('pose_not_clear');
    if (segmentation != null && segmentation < 0.55) reasons.add('segmentation_low_confidence');
    if (tilt != null && Math.abs(tilt) > 6) reasons.add('camera_tilted');
    if (separation != null && separation < 0.45) reasons.add('clothing_or_background_uncertain');
  }
  return [...reasons];
}

export function deriveProgressScanBiasFlagsFromProfile(profile = {}) {
  const flags = [];
  const goal = profile.trainingGoal ?? profile.primaryGoal ?? null;
  const phase = profile.trainingPhase ?? profile.goalPhase ?? profile.goal ?? null;
  if (COMPETITION_GOALS.has(goal)) flags.push('physique_competition_context');
  if (COMPETITION_GOALS.has(goal) && !['bikini', 'figure'].includes(goal)) flags.push('very_muscular');
  if (/(cut|prep|lean)/i.test(String(phase || ''))) flags.push('stage_lean_or_prep');
  if (profile.darkerSkinOverestimationRisk === true) flags.push('darker_skin_overestimation_risk');
  return flags;
}

export function deriveBiasFlags({ sex = null, userFlags = [], modelValidated = false, quality = {} } = {}) {
  const flags = new Set(Array.isArray(userFlags) ? userFlags.filter(Boolean) : []);
  if (sex === 'female') flags.add('female_overestimation_risk');
  if (!modelValidated) flags.add('physique_athlete_validation_pending');
  if (!modelValidated) flags.add('skin_tone_not_collected_validation_gap');
  if (quality?.label === 'poor' || quality?.label === 'unknown') flags.add('quality_limited');
  if (quality?.label === 'usable') flags.add('model_signal_limited');
  return [...flags];
}

export function uncertaintyMarginPctPoints({ quality = {}, biasFlags = [], baseMargin = 3.5 } = {}) {
  let margin = Number.isFinite(baseMargin) ? baseMargin : 3.5;
  if (quality?.label === 'usable') margin += 1.0;
  if (quality?.label === 'poor' || quality?.label === 'unknown') margin += 2.0;
  const flags = new Set(biasFlags || []);
  if (flags.has('female_overestimation_risk')) margin += 1.0;
  if (flags.has('darker_skin_overestimation_risk')) margin += 1.2;
  if (flags.has('skin_tone_not_collected_validation_gap')) margin += 0.8;
  if (flags.has('very_muscular')) margin += 1.0;
  if (flags.has('large_body')) margin += 0.8;
  if (flags.has('stage_lean_or_prep')) margin += 1.4;
  if (flags.has('physique_competition_context')) margin += 0.8;
  if (flags.has('model_signal_limited')) margin += 0.8;
  if (flags.has('physique_athlete_validation_pending')) margin += 1.0;
  if (flags.has('anthropometric_limited')) margin += 0.8;
  if (flags.has('side_pose_missing')) margin += 0.5;
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
  const curLow = finiteNumber(current.estimateRangeLow);
  const curHigh = finiteNumber(current.estimateRangeHigh);
  const prevLow = finiteNumber(previous.estimateRangeLow);
  const prevHigh = finiteNumber(previous.estimateRangeHigh);
  const hasRanges = [curLow, curHigh, prevLow, prevHigh].every((v) => v != null)
    && curLow <= curHigh
    && prevLow <= prevHigh;

  if (hasRanges && curLow <= prevHigh && prevLow <= curHigh) {
    return {
      direction: 'steady',
      magnitudePctPoints: Math.abs(delta),
      explanation: 'The legacy uncertainty bands overlap, so treat this as steady rather than a clear directional change.',
    };
  }
  if (!hasRanges) {
    const curMargin = Math.abs((finiteNumber(current.estimateRangeHigh) ?? cur) - cur);
    const prevMargin = Math.abs((finiteNumber(previous.estimateRangeHigh) ?? prev) - prev);
    const noise = Math.max(1.5, Math.min(6, (curMargin + prevMargin) / 2));
    if (Math.abs(delta) <= noise) {
      return {
        direction: 'steady',
        magnitudePctPoints: Math.abs(delta),
        explanation: 'The legacy estimate moved, but it is still inside the uncertainty band. Treat this as steady.',
      };
    }
  }
  return {
    direction: delta < 0 ? 'down' : 'up',
    magnitudePctPoints: Math.abs(delta),
    explanation: delta < 0
      ? 'The legacy uncertainty bands do not overlap and support a lower visual trend.'
      : 'The legacy uncertainty bands do not overlap and support a higher visual trend.',
  };
}

function scanSignals(scan = {}) {
  const safeScan = scan || {};
  return parseMaybeJson(safeScan.signals ?? safeScan.signalsJson, null) || {};
}

function averagedSignalRatios(signals = {}) {
  if (signals.estimatorInputs) {
    return {
      waistToShoulder: finiteNumber(signals.estimatorInputs.waistToShoulder),
      waistToHip: finiteNumber(signals.estimatorInputs.waistToHip),
      waistToHeight: finiteNumber(signals.estimatorInputs.waistToHeight),
      bodyAreaRatio: finiteNumber(signals.estimatorInputs.bodyAreaRatio),
    };
  }
  const assets = Array.isArray(signals.assets) ? signals.assets : [];
  const avg = (key) => averageFinite(assets.map((a) => a?.silhouetteRatios?.[key]));
  return {
    waistToShoulder: avg('waistToShoulder'),
    waistToHip: avg('waistToHip'),
    waistToHeight: avg('waistToHeight'),
    bodyAreaRatio: avg('bodyAreaRatio'),
  };
}

function roundedRatio(value) {
  const n = finiteNumber(value);
  return n == null ? null : Math.round(n * 1000) / 1000;
}

function measuredInputsFromAssets(assets = []) {
  const signals = (assets || []).map((asset) => assetSignals(asset)).filter(Boolean);
  const avg = (key) => averageFinite(signals.map((signal) => signal?.silhouetteRatios?.[key]));
  return {
    waistToShoulder: roundedRatio(avg('waistToShoulder')),
    waistToHip: roundedRatio(avg('waistToHip')),
    waistToHeight: roundedRatio(avg('waistToHeight')),
    bodyAreaRatio: roundedRatio(avg('bodyAreaRatio')),
  };
}

function qualityMetricForAsset(asset = {}, assetKey, signalKey = assetKey) {
  const signals = assetSignals(asset);
  return finiteNumber(asset?.[assetKey]) ?? finiteNumber(signals?.quality?.[signalKey]);
}

function averageQualityMetric(assets = [], assetKey, signalKey = assetKey, fallback = null) {
  const value = averageFinite((assets || []).map((asset) => qualityMetricForAsset(asset, assetKey, signalKey)));
  return value == null ? fallback : clamp01(value);
}

function clothingAndOcclusionScore(assets = []) {
  const scores = (assets || []).map((asset) => {
    const signals = assetSignals(asset);
    const reasons = new Set((signals?.abstentionReasons || []).map(canonicalReason));
    if (reasons.has('clothing_or_background_uncertain') || reasons.has('whole_body_not_visible')) return 0.35;
    const separation = finiteNumber(signals?.quality?.backgroundSeparation);
    return separation == null ? 0.75 : clamp01(separation);
  });
  const score = averageFinite(scores);
  return score == null ? 0.75 : clamp01(score);
}

function viewCompletenessScore(assets = []) {
  const poses = new Set((assets || []).map((asset) => normalisePose(asset?.pose)).filter(Boolean));
  const hasRequired = REQUIRED_SCAN_POSES.every((pose) => poses.has(pose));
  if (!hasRequired) return 0.25;
  return poses.has('side') ? 1 : 0.88;
}

function biasConfidencePenalty(biasFlags = []) {
  const flags = new Set(biasFlags || []);
  let penalty = 0;
  if (flags.has('female_overestimation_risk')) penalty += 0.04;
  if (flags.has('darker_skin_overestimation_risk')) penalty += 0.06;
  if (flags.has('skin_tone_not_collected_validation_gap')) penalty += 0.03;
  if (flags.has('very_muscular')) penalty += 0.04;
  if (flags.has('large_body')) penalty += 0.03;
  if (flags.has('stage_lean_or_prep')) penalty += 0.05;
  if (flags.has('physique_competition_context')) penalty += 0.03;
  if (flags.has('model_signal_limited')) penalty += 0.03;
  if (flags.has('physique_athlete_validation_pending')) penalty += 0.04;
  if (flags.has('side_pose_missing')) penalty += 0.02;
  return clamp(penalty, 0, 0.22);
}

function confidenceTier(score) {
  const n = finiteNumber(score);
  if (n == null) return 'unknown';
  if (n >= 0.85) return 'high';
  if (n >= 0.70) return 'moderate';
  if (n >= 0.55) return 'low';
  return 'not_enough';
}

export function scanConfidenceLabel(tier) {
  return SCAN_CONFIDENCE_COPY[tier] || SCAN_CONFIDENCE_COPY.unknown;
}

export function computeScanConfidenceScore({ assets = [], quality = {}, biasFlags = [], previousScan = null } = {}) {
  const qualityFallback = finiteNumber(quality?.score) ?? 0.7;
  const segmentation = averageQualityMetric(assets, 'segmentationConfidence', 'segmentationConfidence', qualityFallback);
  const pose = averageQualityMetric(assets, 'landmarkConfidence', 'poseConfidence', qualityFallback);
  const framing = averageQualityMetric(assets, 'framingScore', 'framingScore', qualityFallback);
  const lighting = averageQualityMetric(assets, 'lightingScore', 'lightingScore', qualityFallback);
  const clothing = clothingAndOcclusionScore(assets);
  const completeness = viewCompletenessScore(assets);
  const stability = averageQualityMetric(assets, 'blurScore', 'blurScore', qualityFallback);
  const setupConsistency = previousScan ? 0.8 : 0.75;

  const base =
    segmentation * 0.22
    + pose * 0.18
    + framing * 0.14
    + lighting * 0.12
    + clothing * 0.14
    + completeness * 0.10
    + stability * 0.05
    + setupConsistency * 0.05;
  return rounded2(clamp01(base - biasConfidencePenalty(biasFlags)));
}

function inverseRatioScore(value, leanAt, softAt) {
  const n = finiteNumber(value);
  if (n == null) return null;
  return clamp01((softAt - n) / (softAt - leanAt));
}

function consistencyScoreFromSpread(value) {
  const spread = finiteNumber(value);
  if (spread == null) return 0.65;
  return clamp01(1 - (Math.abs(spread) / 0.08));
}

function scoreComponent(value, leanAt, softAt, fallback = 0.5) {
  const score = inverseRatioScore(value, leanAt, softAt);
  return score == null ? fallback : score;
}

function physiqueInputsFromAssets(assets = []) {
  const frontRatios = ratiosForPose(assets, 'front');
  const backRatios = ratiosForPose(assets, 'back');
  if (!frontRatios || !backRatios) return measuredInputsFromAssets(assets);
  const sideRatios = ratiosForPose(assets, 'side');
  const waistToHeight = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'waistToHeight');
  const waistToShoulder = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'waistToShoulder');
  const waistToHip = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'waistToHip');
  const bodyAreaRatio = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'bodyAreaRatio');
  return {
    waistToShoulder: roundedRatio(waistToShoulder),
    waistToHip: roundedRatio(waistToHip),
    waistToHeight: roundedRatio(waistToHeight),
    bodyAreaRatio: roundedRatio(bodyAreaRatio),
    frontBackWaistSpread: roundedRatio(Math.abs((finiteNumber(frontRatios.waistToHeight) ?? waistToHeight) - (finiteNumber(backRatios.waistToHeight) ?? waistToHeight))),
    sideWaistToHeight: roundedRatio(sideRatios?.waistToHeight),
  };
}

export function computeVisualLeannessScore(inputs = {}) {
  if (!inputs || [
    inputs.waistToShoulder,
    inputs.waistToHip,
    inputs.waistToHeight,
    inputs.bodyAreaRatio,
  ].some((value) => finiteNumber(value) == null)) return null;

  const components = [
    { score: scoreComponent(inputs.waistToShoulder, 0.45, 0.75), weight: 0.30 },
    { score: scoreComponent(inputs.waistToHip, 0.68, 1.00), weight: 0.20 },
    { score: scoreComponent(inputs.waistToHeight, 0.18, 0.34), weight: 0.15 },
    { score: scoreComponent(inputs.bodyAreaRatio, 0.26, 0.42), weight: 0.15 },
    { score: consistencyScoreFromSpread(inputs.frontBackWaistSpread), weight: 0.10 },
  ];
  if (finiteNumber(inputs.sideWaistToHeight) != null) {
    components.push({ score: scoreComponent(inputs.sideWaistToHeight, 0.18, 0.34), weight: 0.10 });
  }
  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  const weighted = components.reduce((sum, item) => sum + item.score * item.weight, 0);
  return rounded0(clamp((weighted / totalWeight) * 100, 0, 100));
}

export function leannessBandForScore(score) {
  const n = finiteNumber(score);
  if (n == null) return null;
  return PROGRESS_SCAN_LEANNESS_BANDS.find((band) => n >= band.min && n <= band.max) || null;
}

export function progressSignalLabel(signal) {
  return PROGRESS_SIGNAL_COPY[signal] || PROGRESS_SIGNAL_COPY.inconclusive;
}

function progressSignalFromDelta(delta, confidence = 'low') {
  const n = finiteNumber(delta);
  if (confidence === 'not_enough' || confidence === 'unknown') {
    return { signal: 'inconclusive', direction: 'uncertain', label: progressSignalLabel('inconclusive') };
  }
  if (n == null) return { signal: 'baseline', direction: 'baseline', label: progressSignalLabel('baseline') };
  const slightThreshold = confidence === 'high' ? 4 : confidence === 'moderate' ? 5 : 7;
  const clearThreshold = confidence === 'high' ? 9 : confidence === 'moderate' ? 11 : Infinity;
  if (n >= clearThreshold) return { signal: 'clear_positive', direction: 'positive', label: progressSignalLabel('clear_positive') };
  if (n >= slightThreshold) return { signal: 'slight_positive', direction: 'positive', label: progressSignalLabel('slight_positive') };
  if (n <= -clearThreshold) return { signal: 'clear_drift', direction: 'drift', label: progressSignalLabel('clear_drift') };
  if (n <= -slightThreshold) return { signal: 'slight_drift', direction: 'drift', label: progressSignalLabel('slight_drift') };
  return { signal: 'holding_steady', direction: 'steady', label: progressSignalLabel('holding_steady') };
}

function previousPhysiqueAssessment(scan = null) {
  return scanSignals(scan)?.physiqueAssessment ?? null;
}

export function buildPhysiqueAssessment({
  assets = [],
  quality = {},
  biasFlags = [],
  modelEstimate = null,
  previousScan = null,
} = {}) {
  const inputs = modelEstimate?.inputs ?? physiqueInputsFromAssets(assets);
  const scanConfidenceScore = computeScanConfidenceScore({
    assets,
    quality,
    biasFlags,
    previousScan,
  });
  const scanConfidenceTier = confidenceTier(scanConfidenceScore);
  const score = scanConfidenceTier === 'not_enough' ? null : computeVisualLeannessScore(inputs);
  const band = leannessBandForScore(score);
  const previousAssessment = previousPhysiqueAssessment(previousScan);
  const previousScore = finiteNumber(previousAssessment?.visualLeannessScore);
  const delta = score != null && previousScore != null ? rounded0(score - previousScore) : null;
  const signal = progressSignalFromDelta(delta, scanConfidenceTier);
  const measuredSignalsUsed = ['waist_to_shoulder', 'waist_to_hip', 'waist_to_height', 'body_area'];
  if (finiteNumber(inputs?.sideWaistToHeight) != null) measuredSignalsUsed.push('side_depth');

  return {
    source: PHOTO_SCAN_SOURCE,
    assessmentVersion: PROGRESS_SCAN_SCORE_VERSION,
    analysisType: 'visual_physique_score',
    visualLeannessScore: score,
    leannessBand: band?.key ?? null,
    leannessBandLabel: band?.label ?? null,
    scanConfidenceScore,
    scanConfidenceTier,
    scanConfidenceLabel: scanConfidenceLabel(scanConfidenceTier),
    progressSignal: signal.signal,
    progressSignalLabel: signal.label,
    progressDirection: signal.direction,
    progressDeltaScore: delta,
    previousLeannessScore: previousScore,
    inputs,
    measuredSignalsUsed,
    biasFlags,
    calibrationStatus: 'still_calibrating_for_your_body_type',
    limitations: [
      'not_body_fat_estimate',
      'not_dexa_equivalent',
      'photo_context_only',
      'never_authoritative_for_safety_floors',
      'bias_confidence_penalty_applied',
    ],
  };
}

function progressScanAssessmentCopy(assessment = null) {
  if (!assessment) return 'Physique Scan saved. I could not read enough from the photos for a useful scan result.';
  if (assessment.scanConfidenceTier === 'not_enough' || assessment.visualLeannessScore == null) {
    return 'Physique Scan saved, but the photo read did not have enough confidence for a score. Retake with clearer lighting, full body in frame, and the same setup next time.';
  }
  const score = `${assessment.visualLeannessScore}/100`;
  const band = assessment.leannessBandLabel ? `${assessment.leannessBandLabel} band` : 'No band';
  const progress = assessment.progressSignalLabel || progressSignalLabel('baseline');
  const confidence = assessment.scanConfidenceLabel || scanConfidenceLabel(assessment.scanConfidenceTier);
  return `Volyume Leanness Score ${score}. ${band}. Scan Confidence: ${confidence}. Progress Signal: ${progress}. This is a visual progress score, not a body-fat percentage.`;
}

function scanPoseSet(scan = {}) {
  const signals = scanSignals(scan);
  const signalAssets = Array.isArray(signals.assets) ? signals.assets : [];
  const directAssets = Array.isArray(scan.assets) ? scan.assets : [];
  return new Set([...signalAssets, ...directAssets].map((asset) => normalisePose(asset?.pose)).filter(Boolean));
}

function scanAssetsForComparison(scan = {}) {
  const signals = scanSignals(scan);
  const signalAssets = Array.isArray(signals.assets) ? signals.assets : [];
  const directAssets = Array.isArray(scan.assets) ? scan.assets : [];
  const byPose = new Map();
  for (const asset of signalAssets) {
    const pose = normalisePose(asset?.pose);
    if (pose) byPose.set(pose, asset);
  }
  for (const asset of directAssets) {
    const pose = normalisePose(asset?.pose);
    if (pose) byPose.set(pose, { ...(byPose.get(pose) || {}), ...asset });
  }
  return [...byPose.values()];
}

function scanAssetForPose(scan = {}, pose) {
  return scanAssetsForComparison(scan).find((asset) => normalisePose(asset?.pose) === pose) || null;
}

function scanComparisonConfidenceTier(scan = {}) {
  const tier = scanSignals(scan)?.physiqueAssessment?.scanConfidenceTier;
  if (Object.prototype.hasOwnProperty.call(SCAN_CONFIDENCE_RANK, tier)) return tier;
  if (['good', 'usable'].includes(scan?.qualityLabel ?? scan?.quality_label)) return 'low';
  return 'unknown';
}

function lowerConfidenceTier(a, b) {
  const left = Object.prototype.hasOwnProperty.call(SCAN_CONFIDENCE_RANK, a) ? a : 'unknown';
  const right = Object.prototype.hasOwnProperty.call(SCAN_CONFIDENCE_RANK, b) ? b : 'unknown';
  return SCAN_CONFIDENCE_RANK[left] <= SCAN_CONFIDENCE_RANK[right] ? left : right;
}

function metricFromAsset(asset = {}, key) {
  const signals = assetSignals(asset);
  if (key === 'lightingScore') return finiteNumber(asset?.lightingScore ?? asset?.quality?.lightingScore ?? signals?.quality?.lightingScore);
  if (key === 'framingScore') return finiteNumber(asset?.framingScore ?? asset?.quality?.framingScore ?? signals?.quality?.framingScore);
  if (key === 'segmentationConfidence') return finiteNumber(asset?.segmentationConfidence ?? asset?.quality?.segmentationConfidence ?? signals?.quality?.segmentationConfidence);
  if (key === 'cameraTiltDegrees') return finiteNumber(asset?.cameraTiltDegrees ?? asset?.quality?.cameraTiltDegrees ?? signals?.quality?.cameraTiltDegrees);
  return finiteNumber(asset?.[key] ?? asset?.quality?.[key] ?? signals?.quality?.[key]);
}

function bodyBoxFromAsset(asset = {}) {
  return asset?.bodyBox ?? assetSignals(asset)?.bodyBox ?? null;
}

function compareSetupMetric({ current, previous, key, threshold, reason, absolute = false }) {
  const cur = absolute ? Math.abs(metricFromAsset(current, key)) : metricFromAsset(current, key);
  const prev = absolute ? Math.abs(metricFromAsset(previous, key)) : metricFromAsset(previous, key);
  if (cur == null || prev == null) return { compared: false, issue: null };
  return { compared: true, issue: Math.abs(cur - prev) > threshold ? reason : null };
}

function compareBodyBoxMetric({ current, previous, key, threshold, reason }) {
  const cur = finiteNumber(bodyBoxFromAsset(current)?.[key]);
  const prev = finiteNumber(bodyBoxFromAsset(previous)?.[key]);
  if (cur == null || prev == null) return { compared: false, issue: null };
  return { compared: true, issue: Math.abs(cur - prev) > threshold ? reason : null };
}

export function scanSetupStability(currentScan = null, previousScan = null) {
  if (!currentScan || !previousScan) {
    return { stable: false, issues: ['missing_scan'], comparedSignalCount: 0 };
  }
  const currentPoses = scanPoseSet(currentScan);
  const previousPoses = scanPoseSet(previousScan);
  const issues = [];
  let comparedSignalCount = 0;

  if (currentPoses.has('side') !== previousPoses.has('side')) {
    issues.push('side_pose_set_changed');
  }

  for (const pose of REQUIRED_SCAN_POSES) {
    const current = scanAssetForPose(currentScan, pose);
    const previous = scanAssetForPose(previousScan, pose);
    if (!current || !previous) continue;
    const metricIssues = [
      compareSetupMetric({
        current, previous, key: 'lightingScore', threshold: 0.24, reason: 'lighting_changed',
      }),
      compareSetupMetric({
        current, previous, key: 'framingScore', threshold: 0.22, reason: 'framing_changed',
      }),
      compareSetupMetric({
        current, previous, key: 'segmentationConfidence', threshold: 0.22, reason: 'outline_confidence_changed',
      }),
      compareSetupMetric({
        current, previous, key: 'cameraTiltDegrees', threshold: 4, reason: 'camera_angle_changed',
      }),
      compareBodyBoxMetric({
        current, previous, key: 'height', threshold: 0.09, reason: 'camera_distance_changed',
      }),
      compareBodyBoxMetric({
        current, previous, key: 'width', threshold: 0.10, reason: 'camera_distance_changed',
      }),
      compareBodyBoxMetric({
        current, previous, key: 'centerX', threshold: 0.11, reason: 'body_position_changed',
      }),
      compareBodyBoxMetric({
        current, previous, key: 'centerY', threshold: 0.11, reason: 'camera_height_changed',
      }),
    ];
    for (const metric of metricIssues) {
      if (!metric.compared) continue;
      comparedSignalCount += 1;
      if (metric.issue) issues.push(`${pose}_${metric.issue}`);
    }
  }

  return {
    stable: issues.length === 0,
    issues: [...new Set(issues)],
    comparedSignalCount,
  };
}

function hasRequiredPoseSet(scan = {}) {
  const poses = scanPoseSet(scan);
  return REQUIRED_SCAN_POSES.every((pose) => poses.has(pose));
}

export function scanComparability(currentScan = null, previousScan = null) {
  if (!currentScan) {
    return { comparable: false, status: 'missing_current', reason: 'Current scan is missing.', comparableCount: 0 };
  }
  if (!previousScan) {
    return { comparable: false, status: 'baseline', reason: 'This is the first scan in the comparison set.', comparableCount: 0 };
  }
  const currentStatus = currentScan.analysisStatus ?? currentScan.analysis_status ?? 'measured';
  const previousStatus = previousScan.analysisStatus ?? previousScan.analysis_status ?? 'measured';
  if (!['complete', 'measured'].includes(currentStatus) || !['complete', 'measured'].includes(previousStatus)) {
    return { comparable: false, status: 'not_comparable', reason: 'One scan was withheld by the quality gate.', comparableCount: 0 };
  }
  if (!hasRequiredPoseSet(currentScan) || !hasRequiredPoseSet(previousScan)) {
    return { comparable: false, status: 'not_comparable', reason: 'Front and back photos are needed on both scans.', comparableCount: 0 };
  }
  const currentQuality = currentScan.qualityLabel ?? 'unknown';
  const previousQuality = previousScan.qualityLabel ?? 'unknown';
  if (['poor', 'unknown'].includes(currentQuality) || ['poor', 'unknown'].includes(previousQuality)) {
    return { comparable: false, status: 'not_comparable', reason: 'Scan quality was not strong enough for a like-for-like comparison.', comparableCount: 0 };
  }
  const currentConfidence = scanComparisonConfidenceTier(currentScan);
  const previousConfidence = scanComparisonConfidenceTier(previousScan);
  if (SCAN_CONFIDENCE_RANK[currentConfidence] <= 0 || SCAN_CONFIDENCE_RANK[previousConfidence] <= 0) {
    return { comparable: false, status: 'not_comparable', reason: 'One scan did not have enough confidence for a fair comparison.', comparableCount: 0 };
  }
  const setup = scanSetupStability(currentScan, previousScan);
  if (!setup.stable) {
    return {
      comparable: false,
      status: 'not_comparable',
      reason: 'The photo setup changed too much for a fair comparison.',
      comparableCount: 0,
      setupIssues: setup.issues,
      setupComparedSignalCount: setup.comparedSignalCount,
    };
  }
  return {
    comparable: true,
    status: 'comparable',
    reason: 'Like-for-like front and back scan.',
    comparableCount: REQUIRED_SCAN_POSES.length,
    scanConfidenceTier: lowerConfidenceTier(currentConfidence, previousConfidence),
    setupComparedSignalCount: setup.comparedSignalCount,
  };
}

function scanWeightKg(scan = {}) {
  const signals = scanSignals(scan);
  return finiteNumber(signals.stats?.weightKg ?? scan.stats?.weightKg);
}

function ratioDeltaLine({ current, previous, key, label, threshold = 0.015, lowerText, higherText }) {
  const cur = finiteNumber(current?.[key]);
  const prev = finiteNumber(previous?.[key]);
  if (cur == null || prev == null) return null;
  const delta = cur - prev;
  if (Math.abs(delta) < threshold) return null;
  return `${label} ${delta < 0 ? lowerText : higherText}.`;
}

export function explainMeasuredScanDelta({ currentScan = null, previousScan = null } = {}) {
  if (!currentScan) return null;
  const comparability = scanComparability(currentScan, previousScan);
  if (!previousScan) {
    return {
      measuredSignalsOnly: true,
      comparisonStatus: 'baseline',
      comparableCount: 0,
      trendDirection: 'uncertain',
      lines: ['This is your baseline scan.'],
      summary: 'This is your baseline scan. Future scans will compare only measured changes from stored scan signals.',
      trendSummary: 'Baseline scan saved.',
      coachSummary: 'Physique Scan has a baseline saved, but no like-for-like trend yet.',
    };
  }
  if (!comparability.comparable) {
    return {
      measuredSignalsOnly: true,
      comparisonStatus: comparability.status,
      comparableCount: 0,
      trendDirection: 'uncertain',
      lines: [comparability.reason],
      summary: `This scan is saved, but I am not comparing it yet. ${comparability.reason}`,
      trendSummary: 'Not enough like-for-like scan data yet.',
      coachSummary: 'Physique Scan is saved, but I am not using it as a comparison because the scan setup was not like-for-like.',
    };
  }

  const lines = [];
  const trendVotes = [];
  let comparedSignalCount = 0;
  let trendMagnitudePctPoints = null;
  let progressDeltaScore = null;
  let progressSignal = null;
  const pairConfidenceTier = comparability.scanConfidenceTier || 'low';

  const curAssessment = scanSignals(currentScan)?.physiqueAssessment ?? null;
  const prevAssessment = scanSignals(previousScan)?.physiqueAssessment ?? null;
  const curScore = finiteNumber(curAssessment?.visualLeannessScore);
  const prevScore = finiteNumber(prevAssessment?.visualLeannessScore);
  if (curScore != null && prevScore != null) {
    comparedSignalCount += 1;
    const delta = rounded0(curScore - prevScore);
    progressDeltaScore = delta;
    progressSignal = progressSignalFromDelta(delta, pairConfidenceTier);
    trendMagnitudePctPoints = Math.abs(delta);
    if (progressSignal.signal === 'holding_steady') {
      lines.push('Volyume Leanness Score is broadly level against the last like-for-like scan.');
    } else {
      lines.push(`Volyume Leanness Score is ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} points from the last like-for-like scan.`);
      trendVotes.push(delta > 0 ? 'leaner' : 'softer');
    }
  }

  const curWeight = scanWeightKg(currentScan);
  const prevWeight = scanWeightKg(previousScan);
  if (curWeight != null && prevWeight != null) {
    comparedSignalCount += 1;
    const delta = rounded1(curWeight - prevWeight);
    if (Math.abs(delta) >= 0.2) {
      lines.push(`Bodyweight snapshot is ${delta < 0 ? 'down' : 'up'} ${Math.abs(delta)} kg from the nearest logged weigh-in.`);
    } else {
      lines.push('Bodyweight snapshot is broadly level against the nearest logged weigh-in.');
    }
  }

  const curRatios = averagedSignalRatios(scanSignals(currentScan));
  const prevRatios = averagedSignalRatios(scanSignals(previousScan));
  const ratioComparisonCount = ['waistToHeight', 'waistToShoulder']
    .filter((key) => finiteNumber(curRatios?.[key]) != null && finiteNumber(prevRatios?.[key]) != null)
    .length;
  const ratioLines = [
    ratioDeltaLine({
      current: curRatios,
      previous: prevRatios,
      key: 'waistToHeight',
      label: 'Measured waist-to-height signal is',
      threshold: 0.01,
      lowerText: 'lower',
      higherText: 'higher',
    }),
    ratioDeltaLine({
      current: curRatios,
      previous: prevRatios,
      key: 'waistToShoulder',
      label: 'Measured waist-to-shoulder signal is',
      threshold: 0.015,
      lowerText: 'lower',
      higherText: 'higher',
    }),
  ].filter(Boolean);
  lines.push(...ratioLines.slice(0, 2));
  comparedSignalCount += ratioComparisonCount;
  if (ratioLines.some((line) => /lower/i.test(line))) trendVotes.push('leaner');
  if (ratioLines.some((line) => /higher/i.test(line))) trendVotes.push('softer');

  if (comparedSignalCount === 0) {
    return {
      measuredSignalsOnly: true,
      comparisonStatus: 'not_comparable',
      comparableCount: 0,
      trendDirection: 'uncertain',
      lines: ['There are not enough measured scan signals to compare these photos yet.'],
      summary: 'This scan is saved, but I am not comparing it yet. There are not enough measured scan signals to make a like-for-like comparison.',
      trendSummary: 'Not enough measured scan data yet.',
      coachSummary: 'Physique Scan is saved, but I am not using it as a comparison because the measured scan signals are incomplete.',
    };
  }

  if (lines.length === 0) {
    lines.push('Measured scan signals are broadly steady against the last comparable scan.');
  }
  const leanerVotes = trendVotes.filter((v) => v === 'leaner').length;
  const softerVotes = trendVotes.filter((v) => v === 'softer').length;
  const visualTrendDirection = leanerVotes > softerVotes ? 'leaner' : softerVotes > leanerVotes ? 'softer' : 'steady';
  const trendDirection = visualTrendDirection === 'leaner' ? 'down' : visualTrendDirection === 'softer' ? 'up' : 'steady';
  const trendSummary = visualTrendDirection === 'leaner'
    ? 'Visual progress signal is positive against the last like-for-like scan.'
    : visualTrendDirection === 'softer'
      ? 'Visual progress signal shows a drift to watch against the last like-for-like scan.'
      : 'Visual progress signal is holding steady against the last like-for-like scan.';

  return {
    measuredSignalsOnly: true,
    comparisonStatus: 'comparable',
    comparableCount: comparability.comparableCount,
    pairConfidenceTier,
    trendDirection,
    visualTrendDirection,
    trendMagnitudePctPoints,
    progressDeltaScore,
    previousLeannessScore: prevScore,
    progressSignal: progressSignal?.signal ?? null,
    progressSignalLabel: progressSignal?.label ?? null,
    progressDirection: progressSignal?.direction ?? null,
    lines,
    summary: `${lines.slice(0, 3).join(' ')} This is a visual physique signal, not a body-fat estimate or target-setting input.`,
    trendSummary,
    coachSummary: `${trendSummary} I am treating it as photo context only.`,
  };
}

export function explainProgressScan(scan) {
  if (!scan) return null;
  if (scan.analysisStatus === 'abstained') {
    return 'The scan was saved, but the photo read was withheld because the data was not reliable enough.';
  }
  const signals = scanSignals(scan);
  if (signals.physiqueAssessment) {
    return signals.deltaExplanation?.trendSummary
      ? `${progressScanAssessmentCopy(signals.physiqueAssessment)} ${signals.deltaExplanation.trendSummary}`
      : progressScanAssessmentCopy(signals.physiqueAssessment);
  }
  if (scan.analysisStatus === 'measured') {
    return signals.deltaExplanation?.trendSummary
      || scan.copySummary
      || 'The scan measured outline signals only. It is not a body-fat estimate.';
  }
  return 'The scan is saved. Physique scan analysis is not available for this scan.';
}

function signalForAsset(asset = {}) {
  return assetSignals(asset);
}

function averageFinite(values = []) {
  const nums = values.map(finiteNumber).filter((v) => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function normalisedSex(sex) {
  return sex === 'female' || sex === 'male' ? sex : null;
}

function bmiFrom(heightCm, weightKg) {
  const h = finiteNumber(heightCm);
  const w = finiteNumber(weightKg);
  if (h == null || w == null || h < 120 || h > 230 || w < 30 || w > 250) return null;
  const metres = h / 100;
  return w / (metres * metres);
}

function ratiosForPose(assets = [], pose) {
  const signal = (assets || [])
    .map((asset) => ({ asset, signal: assetSignals(asset) }))
    .find(({ asset, signal }) => normalisePose(asset?.pose) === pose && signal?.modelBacked);
  return signal?.signal?.silhouetteRatios ?? null;
}

function averageRatioFromRequiredPoseSignals(frontRatios = {}, backRatios = {}, key) {
  return averageFinite([frontRatios?.[key], backRatios?.[key]]);
}

function estimatorInputsFromAssets({ assets = [], sex = null, heightCm = null, weightKg = null } = {}) {
  const frontRatios = ratiosForPose(assets, 'front');
  const backRatios = ratiosForPose(assets, 'back');
  if (!frontRatios || !backRatios) return null;
  const sideRatios = ratiosForPose(assets, 'side');
  const inputSex = normalisedSex(sex);
  if (!inputSex) return null;
  const bmi = bmiFrom(heightCm, weightKg);
  if (bmi == null) return null;
  const waistToHeight = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'waistToHeight');
  const waistToShoulder = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'waistToShoulder');
  const waistToHip = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'waistToHip');
  const bodyAreaRatio = averageRatioFromRequiredPoseSignals(frontRatios, backRatios, 'bodyAreaRatio');
  if ([waistToHeight, waistToShoulder, waistToHip, bodyAreaRatio].some((v) => finiteNumber(v) == null)) return null;

  return {
    sex: inputSex,
    bmi: bmi == null ? null : rounded1(bmi),
    waistToHeight: roundedRatio(waistToHeight),
    waistToShoulder: roundedRatio(waistToShoulder),
    waistToHip: roundedRatio(waistToHip),
    bodyAreaRatio: roundedRatio(bodyAreaRatio),
    frontBackWaistSpread: roundedRatio(Math.abs((finiteNumber(frontRatios.waistToHeight) ?? waistToHeight) - (finiteNumber(backRatios.waistToHeight) ?? waistToHeight))),
    sideWaistToHeight: roundedRatio(sideRatios?.waistToHeight),
  };
}

function estimatorTerm(inputs, key) {
  const value = finiteNumber(inputs?.[key]);
  const centre = finiteNumber(bfEstimatorAsset.centres?.[key]);
  const coefficient = finiteNumber(bfEstimatorAsset.coefficients?.[key]);
  if (value == null || centre == null || coefficient == null) return 0;
  return (value - centre) * coefficient;
}

export function estimateBodyFatFromScanAssets({ assets = [], sex = null, heightCm = null, weightKg = null } = {}) {
  if (!requiredModelBackedPosesComplete(assets)) return null;
  const inputs = estimatorInputsFromAssets({ assets, sex, heightCm, weightKg });
  if (!inputs) return null;

  const coefficients = bfEstimatorAsset.coefficients || {};
  let value = finiteNumber(coefficients.intercept) ?? 18;
  if (inputs.sex === 'female') value += finiteNumber(coefficients.sexFemale) ?? 0;
  value += estimatorTerm(inputs, 'bmi');
  value += estimatorTerm(inputs, 'waistToHeight');
  value += estimatorTerm(inputs, 'waistToShoulder');
  value += estimatorTerm(inputs, 'waistToHip');
  value += estimatorTerm(inputs, 'bodyAreaRatio');
  value += estimatorTerm(inputs, 'frontBackWaistSpread');
  value += estimatorTerm(inputs, 'sideWaistToHeight');

  const clampMin = finiteNumber(bfEstimatorAsset.output?.clampMin) ?? 4;
  const clampMax = finiteNumber(bfEstimatorAsset.output?.clampMax) ?? 55;
  const biasFlags = [];
  if (inputs.bmi >= 30) biasFlags.push('large_body');
  if (inputs.sideWaistToHeight == null) biasFlags.push('side_pose_missing');

  return {
    value: rounded1(clamp(value, clampMin, clampMax)),
    confidence: 'low',
    source: PHOTO_SCAN_SOURCE,
    provisional: true,
    validationStatus: bfEstimatorAsset.status,
    assetId: bfEstimatorAsset.id,
    estimatorVersion: bfEstimatorAsset.id,
    modelVersion: bfEstimatorAsset.segmentationModelVersion ?? PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION,
    baseMarginPctPoints: finiteNumber(bfEstimatorAsset.output?.baseMarginPctPoints) ?? 4.5,
    inputs,
    biasFlags,
    limitations: bfEstimatorAsset.limitations || [],
  };
}

function estimatorUnavailableCopy({ assets = [], sex = null, heightCm = null, weightKg = null } = {}) {
  if (!requiredModelBackedPosesComplete(assets)) {
    return 'Scan measured and saved. Volyume needs model-backed front and back photos for a useful scan score.';
  }
  if (!normalisedSex(sex)) {
    return 'Scan measured and saved. The visual score can still be used as photo context; body-fat percentages are not shown from photos.';
  }
  if (bmiFrom(heightCm, weightKg) == null) {
    return 'Scan measured and saved. The visual score can still be used as photo context; body-fat percentages are not shown from photos.';
  }
  return 'Scan measured and saved. The measured signals were not complete enough for a useful score.';
}

function modelEstimateValue(modelEstimate) {
  if (!modelEstimate || typeof modelEstimate !== 'object') return null;
  if (modelEstimate.source !== PHOTO_SCAN_SOURCE) return null;
  if (modelEstimate.estimatorVersion !== PROGRESS_SCAN_ESTIMATOR_VERSION) return null;
  return finiteNumber(modelEstimate.value);
}

export function measuredSignalsSummaryFromAssets(assets = [], estimate = null, extras = {}) {
  return {
    measuredSignalsOnly: true,
    modelBacked: (assets || []).some((a) => signalForAsset(a)?.modelBacked),
    modelVersion: estimate?.modelVersion ?? PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION,
    estimatorVersion: estimate?.estimatorVersion ?? PROGRESS_SCAN_ESTIMATOR_VERSION,
    physiqueScoreVersion: PROGRESS_SCAN_SCORE_VERSION,
    estimatorAssetId: estimate?.assetId ?? null,
    estimatorProvisional: estimate?.provisional ?? null,
    estimatorLimitations: estimate?.limitations ?? [],
    estimatorInputs: estimate?.inputs ?? measuredInputsFromAssets(assets),
    physiqueAssessment: extras.physiqueAssessment ?? null,
    stats: extras.stats ?? null,
    deltaExplanation: extras.deltaExplanation ?? null,
    assets: (assets || []).map((a) => {
      const signals = signalForAsset(a);
      return {
        pose: a.pose,
        qualityScore: a.qualityScore ?? null,
        segmentationConfidence: a.segmentationConfidence ?? signals?.quality?.segmentationConfidence ?? null,
        framingScore: a.framingScore ?? signals?.quality?.framingScore ?? null,
        blurScore: a.blurScore ?? signals?.quality?.blurScore ?? null,
        lightingScore: a.lightingScore ?? signals?.quality?.lightingScore ?? null,
        cameraTiltDegrees: a.cameraTiltDegrees ?? signals?.quality?.cameraTiltDegrees ?? null,
        bodyBox: signals?.bodyBox ?? null,
        mask: signals?.mask ? {
          foregroundRatio: signals.mask.foregroundRatio ?? null,
        } : null,
        silhouetteRatios: signals?.silhouetteRatios ?? null,
        abstentionReasons: signals?.abstentionReasons ?? [],
      };
    }),
  };
}

export function analyseProgressScan({
  assets = [],
  modelEstimate = null,
  previousScan = null,
  sex = null,
  heightCm = null,
  weightKg = null,
  userBiasFlags = [],
  modelValidated = false,
} = {}) {
  const quality = aggregateQuality(assets);
  const reasons = abstentionReasonsForAssets(assets);
  const resolvedModelEstimate = modelEstimate == null ? null : modelEstimate;
  const estimateBiasFlags = Array.isArray(resolvedModelEstimate?.biasFlags) ? resolvedModelEstimate.biasFlags : [];
  const biasFlags = deriveBiasFlags({ sex, userFlags: [...userBiasFlags, ...estimateBiasFlags], modelValidated, quality });
  const resolvedEstimateValue = modelEstimateValue(resolvedModelEstimate);
  const physiqueAssessment = buildPhysiqueAssessment({
    assets,
    quality,
    biasFlags,
    modelEstimate: resolvedModelEstimate,
    previousScan,
  });

  if (reasons.length > 0) {
    const modelUnavailable = reasons.includes('model_unavailable');
    return {
      analysisStatus: 'abstained',
      qualityScore: quality.score,
      qualityLabel: quality.label,
      estimate: null,
      range: null,
      modelEstimate: null,
      physiqueAssessment: {
        ...physiqueAssessment,
        visualLeannessScore: null,
        leannessBand: null,
        leannessBandLabel: null,
        progressSignal: 'inconclusive',
        progressSignalLabel: progressSignalLabel('inconclusive'),
        progressDirection: 'uncertain',
      },
      trend: {
        direction: 'uncertain',
        magnitudePctPoints: null,
        explanation: modelUnavailable
          ? 'On-device scan analysis was not available for the required photos.'
          : 'The scan quality was not strong enough for a useful measured trend.',
      },
      abstentionReasons: reasons,
      biasFlags,
      copySummary: modelUnavailable
        ? 'The scan was saved, but on-device analysis was not available for the required photos.'
        : 'The scan was saved, but measured analysis was withheld because the data was not reliable enough.',
    };
  }

  if (resolvedEstimateValue == null) {
    if (hasModelBackedAssets(assets) && requiredModelBackedPosesComplete(assets)) {
      const hasScore = physiqueAssessment.visualLeannessScore != null;
      return {
        analysisStatus: hasScore ? 'complete' : 'measured',
        qualityScore: quality.score,
        qualityLabel: quality.label,
        estimate: null,
        range: null,
        modelEstimate: null,
        physiqueAssessment,
        trend: previousScan
          ? { direction: 'uncertain', magnitudePctPoints: null, explanation: 'This scan needs a like-for-like previous scan before a trend is shown.' }
          : { direction: 'uncertain', magnitudePctPoints: null, explanation: 'This is your baseline scan.' },
        abstentionReasons: [],
        biasFlags,
        copySummary: hasScore ? progressScanAssessmentCopy(physiqueAssessment) : estimatorUnavailableCopy({
          assets, sex, heightCm, weightKg,
        }),
      };
    }
    return {
      analysisStatus: 'abstained',
      qualityScore: quality.score,
      qualityLabel: quality.label,
      estimate: null,
      range: null,
      modelEstimate: null,
      physiqueAssessment: null,
      trend: { direction: 'uncertain', magnitudePctPoints: null, explanation: 'The scan is saved as a baseline.' },
      abstentionReasons: ['model_unavailable'],
      biasFlags,
      copySummary: 'The guided photos are saved. Physique scan analysis is not available for this scan, so use it as visual trend context only.',
    };
  }

  const range = buildEstimateRange(resolvedEstimateValue, {
    quality,
    biasFlags,
    baseMargin: resolvedModelEstimate?.baseMarginPctPoints,
  });
  if (!range) {
    return {
      analysisStatus: 'abstained',
      qualityScore: quality.score,
      qualityLabel: quality.label,
      estimate: null,
      range: null,
      modelEstimate: null,
      physiqueAssessment: null,
      trend: { direction: 'uncertain', magnitudePctPoints: null, explanation: 'The model estimate was outside a usable range.' },
      abstentionReasons: ['estimate_out_of_range'],
      biasFlags,
      copySummary: 'The photo read was withheld because it fell outside a usable range.',
    };
  }

  const trend = {
    direction: physiqueAssessment.progressDirection === 'positive'
      ? 'down'
      : physiqueAssessment.progressDirection === 'drift'
        ? 'up'
        : physiqueAssessment.progressDirection === 'steady'
          ? 'steady'
          : 'uncertain',
    magnitudePctPoints: physiqueAssessment.progressDeltaScore == null ? null : Math.abs(physiqueAssessment.progressDeltaScore),
    explanation: progressScanAssessmentCopy(physiqueAssessment),
  };
  return {
    analysisStatus: 'complete',
    qualityScore: quality.score,
    qualityLabel: quality.label,
    estimate: null,
    range: null,
    modelEstimate: resolvedModelEstimate,
    hiddenLegacyRange: range,
    physiqueAssessment,
    trend,
    abstentionReasons: [],
    biasFlags,
    copySummary: progressScanAssessmentCopy(physiqueAssessment),
  };
}

export function coachSummaryFromScan(scan, { suppressed = false } = {}) {
  if (suppressed || !scan || !['complete', 'measured'].includes(scan.analysisStatus)) return null;
  const signals = scanSignals(scan);
  const delta = signals.deltaExplanation ?? null;
  const assessment = signals.physiqueAssessment ?? null;
  return {
    source: PHOTO_SCAN_SOURCE,
    capturedAt: scan.capturedAt,
    confidence: assessment?.scanConfidenceTier || 'low',
    scanConfidenceScore: assessment?.scanConfidenceScore ?? null,
    qualityLabel: scan.qualityLabel || 'unknown',
    visualLeannessScore: assessment?.visualLeannessScore ?? null,
    leannessBand: assessment?.leannessBand ?? null,
    leannessBandLabel: assessment?.leannessBandLabel ?? null,
    progressSignal: assessment?.progressSignal ?? null,
    progressSignalLabel: assessment?.progressSignalLabel ?? null,
    progressDirection: assessment?.progressDirection ?? null,
    rangeLow: null,
    rangeHigh: null,
    trendDirection: delta?.trendDirection || scan.trendDirection || 'uncertain',
    trendMagnitudePctPoints: scan.trendMagnitudePctPoints ?? null,
    comparisonStatus: delta?.comparisonStatus || 'baseline',
    comparableCount: delta?.comparableCount ?? 0,
    supportingSignals: delta?.trendSummary ? [delta.trendSummary] : [],
    limitations: [
      'photo_scan_visual_context_only',
      'not_body_fat_estimate',
      'not_dexa_equivalent',
      'not_target_setting_input',
      'never_authoritative_for_safety_floors',
      ...parseMaybeJson(scan.biasFlagsJson),
    ],
    copy: explainProgressScan(scan),
    deltaSummary: delta?.coachSummary ?? null,
  };
}

export function parseMaybeJson(value, fallback = []) {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}
