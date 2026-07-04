export const REQUIRED_SCAN_POSES = ['front', 'back'];
export const OPTIONAL_SCAN_POSES = ['side'];
export const PHOTO_SCAN_SOURCE = 'photo_scan';
export const PROGRESS_SCAN_CONSENT_VERSION = 'progress_scan_v1_2026-07-04';
export const PROGRESS_SCAN_ESTIMATOR_VERSION = 'progress_scan_measured_outline_v1';
export const PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION = 'mediapipe_selfie_segmentation_general_2021_05_06';

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

function scanSignals(scan = {}) {
  return parseMaybeJson(scan.signals ?? scan.signalsJson, null) || {};
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

function scanPoseSet(scan = {}) {
  const signals = scanSignals(scan);
  const signalAssets = Array.isArray(signals.assets) ? signals.assets : [];
  const directAssets = Array.isArray(scan.assets) ? scan.assets : [];
  return new Set([...signalAssets, ...directAssets].map((asset) => normalisePose(asset?.pose)).filter(Boolean));
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
  return { comparable: true, status: 'comparable', reason: 'Like-for-like front and back scan.', comparableCount: 1 };
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
      coachSummary: 'Progress Scan has a baseline saved, but no like-for-like trend yet.',
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
      coachSummary: 'Progress Scan is saved, but I am not using it as a comparison because the scan setup was not like-for-like.',
    };
  }

  const lines = [];
  const trendVotes = [];

  const curWeight = scanWeightKg(currentScan);
  const prevWeight = scanWeightKg(previousScan);
  if (curWeight != null && prevWeight != null) {
    const delta = rounded1(curWeight - prevWeight);
    if (Math.abs(delta) >= 0.2) {
      lines.push(`Bodyweight snapshot is ${delta < 0 ? 'down' : 'up'} ${Math.abs(delta)} kg from the nearest logged weigh-in.`);
    } else {
      lines.push('Bodyweight snapshot is broadly level against the nearest logged weigh-in.');
    }
  }

  const curRatios = averagedSignalRatios(scanSignals(currentScan));
  const prevRatios = averagedSignalRatios(scanSignals(previousScan));
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
  if (ratioLines.some((line) => /lower/i.test(line))) trendVotes.push('down');
  if (ratioLines.some((line) => /higher/i.test(line))) trendVotes.push('up');

  if (lines.length === 0) {
    lines.push('Measured scan signals are broadly steady against the last comparable scan.');
  }
  const downVotes = trendVotes.filter((v) => v === 'down').length;
  const upVotes = trendVotes.filter((v) => v === 'up').length;
  const trendDirection = downVotes > upVotes ? 'down' : upVotes > downVotes ? 'up' : 'steady';
  const trendSummary = trendDirection === 'down'
    ? 'Measured scan signals point lower than the last like-for-like scan.'
    : trendDirection === 'up'
      ? 'Measured scan signals point higher than the last like-for-like scan.'
      : 'Measured scan signals are broadly steady against the last like-for-like scan.';

  return {
    measuredSignalsOnly: true,
    comparisonStatus: 'comparable',
    comparableCount: comparability.comparableCount,
    trendDirection,
    lines,
    summary: `${lines.slice(0, 3).join(' ')} This is measured trend context, not a body-fat estimate.`,
    trendSummary,
    coachSummary: `${trendSummary} I am treating it as low-confidence context only.`,
  };
}

export function explainProgressScan(scan) {
  if (!scan) return null;
  if (scan.analysisStatus === 'abstained') {
    return 'The scan was saved, but the estimate was withheld because the data was not reliable enough.';
  }
  if (scan.analysisStatus === 'measured') {
    const signals = scanSignals(scan);
    return signals.deltaExplanation?.trendSummary
      || scan.copySummary
      || 'The scan measured outline signals only. It is not a body-fat estimate.';
  }
  if (scan.estimateRangeLow != null && scan.estimateRangeHigh != null) {
    const trend = scan.trendDirection && scan.trendDirection !== 'uncertain'
      ? ` ${scan.copySummary || ''}`.trim()
      : 'Use this as a baseline unless you have a comparable earlier scan.';
    return `Estimate range ${scan.estimateRangeLow}-${scan.estimateRangeHigh}%. ${trend}`;
  }
  return 'The scan is saved. Body-composition analysis is not available for this scan.';
}

function signalForAsset(asset = {}) {
  return assetSignals(asset);
}

function averageFinite(values = []) {
  const nums = values.map(finiteNumber).filter((v) => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

export function estimateBodyFatFromScanAssets({ assets = [], sex = null, heightCm = null, weightKg = null } = {}) {
  void assets;
  void sex;
  void heightCm;
  void weightKg;
  return null;
}

function modelEstimateValue(modelEstimate) {
  if (modelEstimate && typeof modelEstimate === 'object') return finiteNumber(modelEstimate.value);
  return finiteNumber(modelEstimate);
}

export function measuredSignalsSummaryFromAssets(assets = [], estimate = null, extras = {}) {
  return {
    measuredSignalsOnly: true,
    modelBacked: (assets || []).some((a) => signalForAsset(a)?.modelBacked),
    modelVersion: estimate?.modelVersion ?? PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION,
    estimatorVersion: estimate?.estimatorVersion ?? PROGRESS_SCAN_ESTIMATOR_VERSION,
    estimatorInputs: estimate?.inputs ?? measuredInputsFromAssets(assets),
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
  void heightCm;
  void weightKg;
  const quality = aggregateQuality(assets);
  const reasons = abstentionReasonsForAssets(assets);
  const biasFlags = deriveBiasFlags({ sex, userFlags: userBiasFlags, modelValidated, quality });
  const resolvedModelEstimate = modelEstimate == null ? null : modelEstimate;
  const resolvedEstimateValue = modelEstimateValue(resolvedModelEstimate);

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

  if (resolvedEstimateValue == null) {
    if (hasModelBackedAssets(assets)) {
      return {
        analysisStatus: 'measured',
        qualityScore: quality.score,
        qualityLabel: quality.label,
        estimate: null,
        range: null,
        modelEstimate: null,
        trend: previousScan
          ? { direction: 'uncertain', magnitudePctPoints: null, explanation: 'This scan needs a like-for-like previous scan before a trend is shown.' }
          : { direction: 'uncertain', magnitudePctPoints: null, explanation: 'This is your baseline scan.' },
        abstentionReasons: [],
        biasFlags,
        copySummary: 'Scan measured and saved. This is not a body-fat estimate; use it as trend context across like-for-like scans.',
      };
    }
    return {
      analysisStatus: 'abstained',
      qualityScore: quality.score,
      qualityLabel: quality.label,
      estimate: null,
      range: null,
      trend: { direction: 'uncertain', magnitudePctPoints: null, explanation: 'The scan is saved as a baseline.' },
      abstentionReasons: ['model_unavailable'],
      biasFlags,
      copySummary: 'The guided photos are saved. Body-composition estimates are not available for this scan, so use it as visual trend context only.',
    };
  }

  const range = buildEstimateRange(resolvedEstimateValue, { quality, biasFlags });
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
    modelEstimate: resolvedModelEstimate,
    trend,
    abstentionReasons: [],
    biasFlags,
    copySummary: `${trend.explanation} The range is provisional and still calibrating for your body type.`,
  };
}

export function coachSummaryFromScan(scan, { suppressed = false } = {}) {
  if (suppressed || !scan || !['complete', 'measured'].includes(scan.analysisStatus)) return null;
  const signals = scanSignals(scan);
  const delta = signals.deltaExplanation ?? null;
  return {
    source: PHOTO_SCAN_SOURCE,
    capturedAt: scan.capturedAt,
    confidence: scan.estimateConfidence || 'low',
    qualityLabel: scan.qualityLabel || 'unknown',
    trendDirection: delta?.trendDirection || scan.trendDirection || 'uncertain',
    trendMagnitudePctPoints: scan.trendMagnitudePctPoints ?? null,
    comparisonStatus: delta?.comparisonStatus || 'baseline',
    comparableCount: delta?.comparableCount ?? 0,
    supportingSignals: Array.isArray(delta?.lines) ? delta.lines.slice(0, 3) : [],
    limitations: [
      'photo_scan_low_confidence',
      'measured_outline_context_only',
      'not_body_fat_estimate',
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
