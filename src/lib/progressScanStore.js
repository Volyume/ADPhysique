import { db } from './database';
import { generateUUID } from './uuid';
import { logError } from './errorLog';
import {
  PROGRESS_SCAN_CONSENT_VERSION,
  PROGRESS_SCAN_ESTIMATOR_VERSION,
  PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION,
  analyseProgressScan,
  coachSummaryFromScan,
  deriveProgressScanBiasFlagsFromProfile,
  explainMeasuredScanDelta,
  estimateBodyFatFromScanAssets,
  measuredSignalsSummaryFromAssets,
  normaliseStoredProgressScanSignals,
  progressScanAssessmentCopy,
  requiredPosesComplete,
  scanComparability,
  parseMaybeJson,
} from './progressScanAnalysis';
import { getPhotoMetaMap, deletePhotoMeta } from './progressPhotoMeta';
import { deleteProgressPhoto } from './progressPhotos';
import { buildProgressScanCalibrationJson } from './progressScanCalibrationExport';

function nowMs() {
  return Date.now();
}

function asJson(value) {
  try { return JSON.stringify(value ?? null); } catch (_) { return null; }
}

function rowToScan(row) {
  if (!row) return null;
  const signals = normaliseStoredProgressScanSignals(parseMaybeJson(row.signals_json, null));
  const copySummary = signals?.physiqueAssessment?.legacyAssessmentVersion
    ? progressScanAssessmentCopy(signals.physiqueAssessment)
    : row.copy_summary ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    capturedAt: row.captured_at,
    status: row.status,
    analysisStatus: row.analysis_status,
    consentVersion: row.consent_version,
    cameraFacing: row.camera_facing,
    timerSeconds: row.timer_seconds,
    requiredPosesComplete: !!row.required_poses_complete,
    estimateBodyFatPercent: row.estimate_body_fat_percent ?? null,
    estimateRangeLow: row.estimate_range_low ?? null,
    estimateRangeHigh: row.estimate_range_high ?? null,
    estimateConfidence: row.estimate_confidence ?? null,
    estimateSource: row.estimate_source ?? null,
    trendDirection: row.trend_direction ?? null,
    trendMagnitudePctPoints: row.trend_magnitude_pct_points ?? null,
    qualityScore: row.quality_score ?? null,
    qualityLabel: row.quality_label ?? null,
    modelVersion: row.model_version ?? null,
    estimatorVersion: row.estimator_version ?? null,
    signals,
    abstentionReasons: parseMaybeJson(row.abstention_reasons_json, []),
    biasFlags: parseMaybeJson(row.bias_flags_json, []),
    signalsJson: row.signals_json ?? null,
    abstentionReasonsJson: row.abstention_reasons_json ?? null,
    biasFlagsJson: row.bias_flags_json ?? null,
    copySummary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToAsset(row) {
  if (!row) return null;
  return {
    id: row.id,
    scanId: row.scan_id,
    userId: row.user_id,
    pose: row.pose,
    photoName: row.photo_name,
    uri: row.uri,
    takenAt: row.taken_at,
    qualityScore: row.quality_score ?? null,
    landmarkConfidence: row.landmark_confidence ?? null,
    segmentationConfidence: row.segmentation_confidence ?? null,
    blurScore: row.blur_score ?? null,
    lightingScore: row.lighting_score ?? null,
    framingScore: row.framing_score ?? null,
    cameraTiltDegrees: row.camera_tilt_degrees ?? null,
    signals: parseMaybeJson(row.signals_json, null),
    signalsJson: row.signals_json ?? null,
    createdAt: row.created_at,
  };
}

function finiteNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function averageFinite(values = []) {
  const nums = values.map(finiteNumber).filter((v) => v != null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, v) => sum + v, 0) / nums.length) * 10) / 10;
}

async function statsForAssets(userId, assets = []) {
  const names = (assets || []).map((a) => a.photoName).filter(Boolean);
  const metaMap = await getPhotoMetaMap(names, userId).catch(() => ({}));
  const weights = names.map((name) => metaMap?.[name]?.weightKg).filter((v) => finiteNumber(v) != null);
  const poses = [...new Set((assets || []).map((a) => a.pose).filter(Boolean))];
  return {
    weightKg: averageFinite(weights),
    photoCount: assets.length,
    poses,
    requiredPosesComplete: requiredPosesComplete(assets),
  };
}

async function deleteScanAssetFiles(userId, assets = []) {
  let ok = true;
  for (const asset of assets || []) {
    if (asset?.photoName) {
      // eslint-disable-next-line no-await-in-loop
      const metaDeleted = await deletePhotoMeta(userId, asset.photoName);
      if (!metaDeleted) {
        ok = false;
        continue;
      }
    }
    if (asset?.uri) {
      // eslint-disable-next-line no-await-in-loop
      const fileDeleted = await deleteProgressPhoto(userId, asset.uri);
      if (!fileDeleted) ok = false;
    }
  }
  return ok;
}

async function scanEntry(userId, scan) {
  if (!userId || !scan?.id) return scan;
  const assets = await getProgressScanAssets(userId, scan.id);
  const stats = await statsForAssets(userId, assets);
  const signals = scan.signals || parseMaybeJson(scan.signalsJson, null) || {};
  return {
    ...scan,
    assets,
    stats: signals.stats ?? stats,
    deltaExplanation: signals.deltaExplanation ?? null,
  };
}

export async function createProgressScanSession(userId, opts = {}) {
  if (!userId) return null;
  const d = await db();
  const id = generateUUID();
  const t = nowMs();
  await d.runAsync(
    `INSERT INTO progress_scan_sessions
      (id, user_id, captured_at, status, analysis_status, consent_version,
       camera_facing, timer_seconds, required_poses_complete,
       estimator_version, created_at, updated_at)
     VALUES (?, ?, ?, 'draft', 'none', ?, ?, ?, 0, ?, ?, ?)`,
    [
      id, userId, opts.capturedAt ?? t, opts.consentVersion ?? PROGRESS_SCAN_CONSENT_VERSION,
      opts.cameraFacing ?? null, Number(opts.timerSeconds) || 0,
      PROGRESS_SCAN_ESTIMATOR_VERSION, t, t,
    ],
  );
  return getProgressScanSession(userId, id);
}

export async function getProgressScanSession(userId, scanId) {
  if (!userId || !scanId) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM progress_scan_sessions WHERE user_id = ? AND id = ? LIMIT 1',
    [userId, scanId],
  ).catch(() => null);
  return rowToScan(row);
}

export async function addProgressScanAsset(userId, scanId, asset = {}) {
  if (!userId || !scanId || !asset.photoName || !asset.uri || !asset.pose) return null;
  const d = await db();
  const id = generateUUID();
  const t = nowMs();
  await d.runAsync(
    `INSERT INTO progress_scan_assets
      (id, scan_id, user_id, pose, photo_name, uri, taken_at, quality_score,
       landmark_confidence, segmentation_confidence, blur_score, lighting_score,
       framing_score, camera_tilt_degrees, signals_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, scanId, userId, asset.pose, asset.photoName, asset.uri,
      asset.takenAt ?? t, asset.qualityScore ?? null, asset.landmarkConfidence ?? null,
      asset.segmentationConfidence ?? null, asset.blurScore ?? null,
      asset.lightingScore ?? null, asset.framingScore ?? null,
      asset.cameraTiltDegrees ?? null, asJson(asset.signals ?? null), t,
    ],
  );
  return getProgressScanAsset(userId, id);
}

export async function getProgressScanAsset(userId, assetId) {
  if (!userId || !assetId) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT * FROM progress_scan_assets WHERE user_id = ? AND id = ? LIMIT 1',
    [userId, assetId],
  ).catch(() => null);
  return rowToAsset(row);
}

export async function getProgressScanAssets(userId, scanId) {
  if (!userId || !scanId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM progress_scan_assets WHERE user_id = ? AND scan_id = ? ORDER BY created_at ASC',
    [userId, scanId],
  ).catch(() => []);
  return (rows || []).map(rowToAsset).filter(Boolean);
}

export async function listProgressScans(userId, limit = 20) {
  if (!userId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM progress_scan_sessions
      WHERE user_id = ?
      ORDER BY captured_at DESC
      LIMIT ?`,
    [userId, Math.max(1, Math.min(100, Number(limit) || 20))],
  ).catch(() => []);
  return (rows || []).map(rowToScan).filter(Boolean);
}

export async function getPreviousAnalysedProgressScans(userId, beforeMs, limit = 10) {
  if (!userId) return [];
  const d = await db();
  const rows = await d.getAllAsync(
    `SELECT * FROM progress_scan_sessions
      WHERE user_id = ?
        AND status = 'complete'
        AND required_poses_complete = 1
        AND analysis_status IN ('complete', 'measured')
        AND captured_at < ?
      ORDER BY captured_at DESC
      LIMIT ?`,
    [userId, beforeMs ?? nowMs(), Math.max(1, Math.min(20, Number(limit) || 10))],
  ).catch(() => []);
  return (rows || []).map(rowToScan).filter(Boolean);
}

export async function getPreviousAnalysedProgressScan(userId, beforeMs) {
  return (await getPreviousAnalysedProgressScans(userId, beforeMs, 10))[0] ?? null;
}

export async function finishProgressScanSession(userId, scanId, opts = {}) {
  if (!userId || !scanId) return null;
  const d = await db();
  const session = await getProgressScanSession(userId, scanId);
  if (!session) return null;
  const assets = await getProgressScanAssets(userId, scanId);
  const scanStats = await statsForAssets(userId, assets);
  const previousCandidates = await getPreviousAnalysedProgressScans(userId, session.capturedAt, 10);
  const latestPrevious = previousCandidates[0] ?? null;
  const profileBiasFlags = deriveProgressScanBiasFlagsFromProfile({
    trainingGoal: opts.trainingGoal ?? null,
    trainingPhase: opts.trainingPhase ?? opts.goalPhase ?? null,
    darkerSkinOverestimationRisk: opts.darkerSkinOverestimationRisk === true,
  });
  const estimatorInput = opts.modelEstimate ?? estimateBodyFatFromScanAssets({
    assets,
    sex: opts.sex ?? null,
    heightCm: opts.heightCm ?? null,
    weightKg: scanStats.weightKg ?? opts.weightKg ?? null,
  });
  const analysis = analyseProgressScan({
    assets,
    previousScan: latestPrevious,
    modelEstimate: estimatorInput,
    sex: opts.sex ?? null,
    heightCm: opts.heightCm ?? null,
    weightKg: scanStats.weightKg ?? opts.weightKg ?? null,
    userBiasFlags: [...profileBiasFlags, ...(opts.userBiasFlags ?? [])],
    modelValidated: false,
  });
  const baseSignalsSummary = measuredSignalsSummaryFromAssets(assets, analysis.modelEstimate ?? null, {
    stats: scanStats,
    physiqueAssessment: analysis.physiqueAssessment ?? null,
  });
  const currentForDelta = {
    capturedAt: session.capturedAt,
    analysisStatus: analysis.analysisStatus,
    qualityLabel: analysis.qualityLabel,
    assets,
    estimateBodyFatPercent: null,
    estimateRangeLow: null,
    estimateRangeHigh: null,
    trendDirection: analysis.trend?.direction ?? 'uncertain',
    signals: baseSignalsSummary,
    stats: scanStats,
  };
  const comparablePrevious = previousCandidates.find((candidate) => (
    scanComparability(currentForDelta, candidate).comparable
  )) ?? latestPrevious;
  const deltaExplanation = ['complete', 'measured'].includes(analysis.analysisStatus)
    ? explainMeasuredScanDelta({ currentScan: currentForDelta, previousScan: comparablePrevious })
    : null;
  const scoreReady = analysis.physiqueAssessment?.visualLeannessScore != null;
  const comparisonReady = deltaExplanation?.comparisonStatus === 'comparable';
  const baselineComparison = deltaExplanation?.comparisonStatus === 'baseline';
  const physiqueAssessment = analysis.physiqueAssessment
    ? {
        ...analysis.physiqueAssessment,
        progressSignal: comparisonReady
          ? (deltaExplanation.progressSignal ?? analysis.physiqueAssessment.progressSignal)
          : (baselineComparison ? 'baseline' : (scoreReady ? 'trend_pending' : 'inconclusive')),
        progressSignalLabel: comparisonReady
          ? (deltaExplanation.progressSignalLabel ?? analysis.physiqueAssessment.progressSignalLabel)
          : (baselineComparison ? 'Baseline set' : (scoreReady ? 'Trend not ready' : 'Inconclusive')),
        progressDirection: comparisonReady
          ? (deltaExplanation.progressDirection ?? analysis.physiqueAssessment.progressDirection)
          : (baselineComparison ? 'baseline' : 'uncertain'),
        progressDeltaScore: comparisonReady
          ? (deltaExplanation.progressDeltaScore ?? analysis.physiqueAssessment.progressDeltaScore)
          : null,
        previousLeannessScore: comparisonReady
          ? (deltaExplanation.previousLeannessScore ?? analysis.physiqueAssessment.previousLeannessScore)
          : null,
        visualTrendDirection: comparisonReady
          ? (deltaExplanation.visualTrendDirection ?? null)
          : (baselineComparison ? 'baseline' : 'uncertain'),
      }
    : null;
  const signalsSummary = measuredSignalsSummaryFromAssets(assets, analysis.modelEstimate ?? null, {
    stats: scanStats,
    deltaExplanation,
    physiqueAssessment,
  });
  const modelVersion = analysis.modelEstimate?.modelVersion
    ?? (signalsSummary.modelBacked ? PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION : opts.modelVersion ?? null);
  const complete = requiredPosesComplete(assets);
  const t = nowMs();
  await d.runAsync(
    `UPDATE progress_scan_sessions SET
       status = ?,
       analysis_status = ?,
       required_poses_complete = ?,
       estimate_body_fat_percent = ?,
       estimate_range_low = ?,
       estimate_range_high = ?,
       estimate_confidence = ?,
       estimate_source = ?,
       trend_direction = ?,
       trend_magnitude_pct_points = ?,
       quality_score = ?,
       quality_label = ?,
       model_version = ?,
       estimator_version = ?,
       signals_json = ?,
       abstention_reasons_json = ?,
       bias_flags_json = ?,
       copy_summary = ?,
       updated_at = ?
     WHERE user_id = ? AND id = ?`,
    [
      complete ? 'complete' : 'failed',
      analysis.analysisStatus,
      complete ? 1 : 0,
      null,
      null,
      null,
      null,
      null,
      deltaExplanation?.trendDirection ?? analysis.trend?.direction ?? 'uncertain',
      deltaExplanation?.trendMagnitudePctPoints ?? analysis.trend?.magnitudePctPoints ?? null,
      analysis.qualityScore ?? null,
      analysis.qualityLabel ?? null,
      modelVersion,
      analysis.modelEstimate?.estimatorVersion ?? PROGRESS_SCAN_ESTIMATOR_VERSION,
      asJson(signalsSummary),
      asJson(analysis.abstentionReasons),
      asJson(analysis.biasFlags),
      deltaExplanation?.summary ?? analysis.copySummary ?? null,
      t,
      userId,
      scanId,
    ],
  );
  return getProgressScanSession(userId, scanId);
}

export async function listProgressScanEntries(userId, limit = 20) {
  const scans = await listProgressScans(userId, limit);
  return Promise.all(scans.map((scan) => scanEntry(userId, scan)));
}

export async function getProgressScanCalibrationJson(userId, scanId, opts = {}) {
  const scan = await getProgressScanSession(userId, scanId);
  if (!scan) return null;
  return buildProgressScanCalibrationJson(await scanEntry(userId, scan), opts);
}

export async function getProgressScanCoachSummary(userId, { suppressed = false } = {}) {
  if (!userId || suppressed) return null;
  try {
    const d = await db();
    const row = await d.getFirstAsync(
      `SELECT * FROM progress_scan_sessions
        WHERE user_id = ?
          AND status = 'complete'
          AND required_poses_complete = 1
          AND analysis_status IN ('complete', 'measured')
        ORDER BY captured_at DESC
        LIMIT 1`,
      [userId],
    ).catch(() => null);
    return coachSummaryFromScan(rowToScan(row), { suppressed });
  } catch (e) {
    logError('progressScanStore.getCoachSummary', e, { userId });
    return null;
  }
}

export async function deleteProgressScanSession(userId, scanId, opts = {}) {
  if (!userId || !scanId) return false;
  try {
    const assets = await getProgressScanAssets(userId, scanId);
    const d = await db();
    await d.runAsync('DELETE FROM progress_scan_assets WHERE user_id = ? AND scan_id = ?', [userId, scanId]);
    await d.runAsync('DELETE FROM progress_scan_sessions WHERE user_id = ? AND id = ?', [userId, scanId]);
    if (opts.deleteFiles) {
      const filesDeleted = await deleteScanAssetFiles(userId, assets);
      if (!filesDeleted) {
        logError('progressScanStore.delete.files', new Error('progress_scan_file_cleanup_failed'), { userId, scanId });
      }
    }
    return true;
  } catch (e) {
    logError('progressScanStore.delete', e, { userId, scanId });
    return false;
  }
}

export async function detachProgressScanPhoto(userId, photoName) {
  if (!userId || !photoName) return false;
  try {
    const d = await db();
    const rows = await d.getAllAsync(
      'SELECT DISTINCT scan_id FROM progress_scan_assets WHERE user_id = ? AND photo_name = ?',
      [userId, photoName],
    ).catch(() => []);
    await d.runAsync('DELETE FROM progress_scan_assets WHERE user_id = ? AND photo_name = ?', [userId, photoName]);
    const scanIds = (rows || []).map((row) => row.scan_id).filter(Boolean);
    const t = nowMs();
    for (const scanId of scanIds) {
      // eslint-disable-next-line no-await-in-loop
      await d.runAsync(
        `UPDATE progress_scan_sessions SET
           status = 'failed',
           analysis_status = 'abstained',
           required_poses_complete = 0,
           estimate_body_fat_percent = NULL,
           estimate_range_low = NULL,
           estimate_range_high = NULL,
           estimate_confidence = NULL,
           estimate_source = NULL,
           trend_direction = 'uncertain',
           trend_magnitude_pct_points = NULL,
           quality_score = NULL,
           quality_label = NULL,
           model_version = NULL,
           signals_json = NULL,
           bias_flags_json = NULL,
           abstention_reasons_json = ?,
           copy_summary = ?,
           updated_at = ?
         WHERE user_id = ? AND id = ?`,
        [
          asJson(['scan_photo_deleted']),
          'A photo from this scan was deleted, so the scan analysis has been removed.',
          t,
          userId,
          scanId,
        ],
      );
    }
    return true;
  } catch (e) {
    logError('progressScanStore.detachPhoto', e, { userId, photoName });
    return false;
  }
}
