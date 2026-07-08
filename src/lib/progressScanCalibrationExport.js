function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, places = 3) {
  const n = finiteNumber(value);
  if (n == null) return null;
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseMaybeJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function signalForAsset(asset = {}) {
  return parseMaybeJson(asset.signals ?? asset.signalsJson, null) || {};
}

function signalAssets(scan = {}) {
  const fromSignals = Array.isArray(scan?.signals?.assets) ? scan.signals.assets : [];
  const fromAssets = Array.isArray(scan?.assets) ? scan.assets : [];
  const byPose = new Map();
  for (const asset of [...fromSignals, ...fromAssets]) {
    const pose = asset?.pose;
    if (!pose) continue;
    byPose.set(pose, { ...(byPose.get(pose) || {}), ...asset });
  }
  return [...byPose.values()];
}

function average(values = []) {
  const nums = values.map(finiteNumber).filter((value) => value != null);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function ratiosForAsset(asset = {}) {
  return asset.silhouetteRatios || signalForAsset(asset).silhouetteRatios || null;
}

function averageRatios(assets = []) {
  const keys = [
    'waistToShoulder',
    'waistToHip',
    'waistToHeight',
    'bodyAreaRatio',
    'frontBackWaistSpread',
    'sideWaistToHeight',
    'bboxHeightRatio',
    'bboxWidthRatio',
  ];
  const out = {};
  for (const key of keys) {
    const value = average(assets.map((asset) => ratiosForAsset(asset)?.[key]));
    if (value != null) out[key] = round(value, 4);
  }
  return out;
}

function poseRatios(assets = []) {
  const out = {};
  for (const asset of assets) {
    const pose = asset?.pose;
    const ratios = ratiosForAsset(asset);
    if (!pose || !ratios) continue;
    out[pose] = {};
    for (const [key, value] of Object.entries(ratios)) {
      const n = round(value, 4);
      if (n != null) out[pose][key] = n;
    }
  }
  return out;
}

function qualityForAsset(asset = {}) {
  const signal = signalForAsset(asset);
  const quality = signal.quality || asset.quality || {};
  return {
    qualityScore: finiteNumber(asset.qualityScore ?? asset.quality_score),
    segmentationConfidence: finiteNumber(asset.segmentationConfidence ?? asset.segmentation_confidence ?? quality.segmentationConfidence),
    framingScore: finiteNumber(asset.framingScore ?? asset.framing_score ?? quality.framingScore),
    blurScore: finiteNumber(asset.blurScore ?? asset.blur_score ?? quality.blurScore),
    lightingScore: finiteNumber(asset.lightingScore ?? asset.lighting_score ?? quality.lightingScore),
    poseConfidence: finiteNumber(asset.landmarkConfidence ?? asset.landmark_confidence ?? quality.poseConfidence),
    backgroundSeparation: finiteNumber(quality.backgroundSeparation),
    cameraTiltDegrees: finiteNumber(asset.cameraTiltDegrees ?? asset.camera_tilt_degrees ?? quality.cameraTiltDegrees),
  };
}

function averageQuality(assets = []) {
  const qualities = assets.map(qualityForAsset);
  const keys = [
    'qualityScore',
    'segmentationConfidence',
    'framingScore',
    'blurScore',
    'lightingScore',
    'poseConfidence',
    'backgroundSeparation',
    'cameraTiltDegrees',
  ];
  const out = {};
  for (const key of keys) {
    const value = average(qualities.map((quality) => quality[key]));
    if (value != null) out[key] = round(value, key === 'cameraTiltDegrees' ? 2 : 3);
  }
  return out;
}

function deriveHeightFromBmi(weightKg, bmi) {
  const weight = finiteNumber(weightKg);
  const bodyMassIndex = finiteNumber(bmi);
  if (weight == null || bodyMassIndex == null || weight <= 0 || bodyMassIndex <= 0) return null;
  return round(Math.sqrt(weight / bodyMassIndex) * 100, 1);
}

function defaultExpectedFromAssessment(assessment = {}) {
  const score = finiteNumber(assessment.visualLeannessScore);
  const band = assessment.leannessBandLabel;
  return {
    min: score == null ? 0 : clamp(Math.round(score - 4), 0, 100),
    max: score == null ? 100 : clamp(Math.round(score + 4), 0, 100),
    bands: band ? [band] : [],
    minConfidence: assessment.scanConfidenceTier || 'low',
  };
}

function caseIdFromScan(scan = {}) {
  const capturedAt = finiteNumber(scan.capturedAt ?? scan.captured_at);
  if (!capturedAt) return 'real_progress_scan_case';
  const iso = new Date(capturedAt).toISOString().slice(0, 10).replace(/-/g, '');
  return `real_progress_scan_${iso}`;
}

export function buildProgressScanCalibrationCase(scan = {}, opts = {}) {
  const assets = signalAssets(scan);
  const frontBackAssets = assets.filter((asset) => ['front', 'back'].includes(asset.pose));
  const allScoringAssets = frontBackAssets.length ? frontBackAssets : assets;
  const signals = scan.signals || parseMaybeJson(scan.signalsJson, null) || {};
  const assessment = signals.physiqueAssessment || {};
  const estimatorInputs = signals.estimatorInputs || assessment.inputs || {};
  const stats = scan.stats || signals.stats || {};
  const weightKg = finiteNumber(opts.weightKg ?? stats.weightKg);
  const heightCm = finiteNumber(opts.heightCm)
    ?? finiteNumber(stats.heightCm)
    ?? deriveHeightFromBmi(weightKg, estimatorInputs.bmi);
  const expected = opts.expected || defaultExpectedFromAssessment(assessment);

  return {
    id: opts.id || caseIdFromScan(scan),
    label: opts.label || 'Real APK Progress Scan signal case',
    sex: opts.sex || estimatorInputs.sex || null,
    heightCm,
    weightKg,
    ratios: averageRatios(allScoringAssets),
    poseRatios: poseRatios(assets),
    includeSide: assets.some((asset) => asset.pose === 'side'),
    quality: averageQuality(allScoringAssets),
    userBiasFlags: Array.isArray(opts.userBiasFlags) ? opts.userBiasFlags : undefined,
    expected,
    notes: opts.notes || undefined,
  };
}

export function buildProgressScanCalibrationJson(scan = {}, opts = {}) {
  return JSON.stringify([buildProgressScanCalibrationCase(scan, opts)], null, 2);
}
