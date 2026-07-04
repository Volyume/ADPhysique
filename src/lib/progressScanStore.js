import { db } from './database';
import { generateUUID } from './uuid';
import { logError } from './errorLog';
import {
  PHOTO_SCAN_SOURCE,
  PROGRESS_SCAN_CONSENT_VERSION,
  PROGRESS_SCAN_ESTIMATOR_VERSION,
  PROGRESS_SCAN_SEGMENTATION_MODEL_VERSION,
  analyseProgressScan,
  coachSummaryFromScan,
  deriveProgressScanBiasFlagsFromProfile,
  measuredSignalsSummaryFromAssets,
  requiredPosesComplete,
  parseMaybeJson,
} from './progressScanAnalysis';

function nowMs() {
  return Date.now();
}

function asJson(value) {
  try { return JSON.stringify(value ?? null); } catch (_) { return null; }
}

function rowToScan(row) {
  if (!row) return null;
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
    signals: parseMaybeJson(row.signals_json, null),
    abstentionReasons: parseMaybeJson(row.abstention_reasons_json, []),
    biasFlags: parseMaybeJson(row.bias_flags_json, []),
    signalsJson: row.signals_json ?? null,
    abstentionReasonsJson: row.abstention_reasons_json ?? null,
    biasFlagsJson: row.bias_flags_json ?? null,
    copySummary: row.copy_summary ?? null,
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

export async function getPreviousAnalysedProgressScan(userId, beforeMs) {
  if (!userId) return null;
  const d = await db();
  const row = await d.getFirstAsync(
    `SELECT * FROM progress_scan_sessions
      WHERE user_id = ?
        AND analysis_status = 'complete'
        AND estimate_body_fat_percent IS NOT NULL
        AND captured_at < ?
      ORDER BY captured_at DESC
      LIMIT 1`,
    [userId, beforeMs ?? nowMs()],
  ).catch(() => null);
  return rowToScan(row);
}

export async function finishProgressScanSession(userId, scanId, opts = {}) {
  if (!userId || !scanId) return null;
  const d = await db();
  const session = await getProgressScanSession(userId, scanId);
  if (!session) return null;
  const assets = await getProgressScanAssets(userId, scanId);
  const previous = await getPreviousAnalysedProgressScan(userId, session.capturedAt);
  const profileBiasFlags = deriveProgressScanBiasFlagsFromProfile({
    trainingGoal: opts.trainingGoal ?? null,
    trainingPhase: opts.trainingPhase ?? opts.goalPhase ?? null,
    darkerSkinOverestimationRisk: opts.darkerSkinOverestimationRisk === true,
  });
  const analysis = analyseProgressScan({
    assets,
    previousScan: previous,
    modelEstimate: opts.modelEstimate ?? null,
    sex: opts.sex ?? null,
    heightCm: opts.heightCm ?? null,
    weightKg: opts.weightKg ?? null,
    userBiasFlags: [...profileBiasFlags, ...(opts.userBiasFlags ?? [])],
    modelValidated: false,
  });
  const signalsSummary = measuredSignalsSummaryFromAssets(assets, analysis.modelEstimate ?? null);
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
      analysis.estimate ?? null,
      analysis.range?.low ?? null,
      analysis.range?.high ?? null,
      analysis.analysisStatus === 'complete' ? 'low' : null,
      analysis.analysisStatus === 'complete' ? PHOTO_SCAN_SOURCE : null,
      analysis.trend?.direction ?? 'uncertain',
      analysis.trend?.magnitudePctPoints ?? null,
      analysis.qualityScore ?? null,
      analysis.qualityLabel ?? null,
      modelVersion,
      analysis.modelEstimate?.estimatorVersion ?? PROGRESS_SCAN_ESTIMATOR_VERSION,
      asJson(signalsSummary),
      asJson(analysis.abstentionReasons),
      asJson(analysis.biasFlags),
      analysis.copySummary ?? null,
      t,
      userId,
      scanId,
    ],
  );
  return getProgressScanSession(userId, scanId);
}

export async function getProgressScanCoachSummary(userId, { suppressed = false } = {}) {
  if (!userId || suppressed) return null;
  try {
    const d = await db();
    const row = await d.getFirstAsync(
      `SELECT * FROM progress_scan_sessions
        WHERE user_id = ?
          AND analysis_status = 'complete'
          AND estimate_source = ?
        ORDER BY captured_at DESC
        LIMIT 1`,
      [userId, PHOTO_SCAN_SOURCE],
    ).catch(() => null);
    return coachSummaryFromScan(rowToScan(row), { suppressed });
  } catch (e) {
    logError('progressScanStore.getCoachSummary', e, { userId });
    return null;
  }
}

export async function deleteProgressScanSession(userId, scanId) {
  if (!userId || !scanId) return false;
  try {
    const d = await db();
    await d.runAsync('DELETE FROM progress_scan_assets WHERE user_id = ? AND scan_id = ?', [userId, scanId]);
    await d.runAsync('DELETE FROM progress_scan_sessions WHERE user_id = ? AND id = ?', [userId, scanId]);
    return true;
  } catch (e) {
    logError('progressScanStore.delete', e, { userId, scanId });
    return false;
  }
}
