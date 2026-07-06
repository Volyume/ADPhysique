export function enrichProgressPhotos(photos = [], metaMap = {}) {
  return (Array.isArray(photos) ? photos : []).map((photo) => {
    const meta = metaMap?.[photo.name];
    const takenAt = meta && Number.isFinite(meta.takenAt) ? meta.takenAt : photo.ts;
    return {
      name: photo.name,
      uri: photo.uri,
      ts: photo.ts,
      takenAt,
      pose: (meta && meta.pose) || null,
    };
  });
}

export function visibleCompletedScans(scans = []) {
  return (Array.isArray(scans) ? scans : [])
    .filter((scan) => scan?.status !== 'draft' && scan?.requiredPosesComplete);
}

export function scanShareItemsFromEntries(scans = [], nowMs = Date.now()) {
  return visibleCompletedScans(scans)
    .filter((scan) => Array.isArray(scan.assets))
    .map((scan) => {
      const asset = scan.assets.find((a) => a?.pose === 'front' && a?.uri)
        || scan.assets.find((a) => a?.uri);
      if (!asset?.uri) return null;
      return {
        name: asset.photoName || `${scan.id}-${asset.pose || 'scan'}`,
        uri: asset.uri,
        ts: Number.isFinite(scan.capturedAt) ? scan.capturedAt : (asset.takenAt ?? nowMs),
        scan,
      };
    })
    .filter(Boolean);
}

export function buildScanPhotoNameSet(scans = []) {
  return new Set(
    (Array.isArray(scans) ? scans : [])
      .flatMap((scan) => (scan.assets || []).map((asset) => asset?.photoName).filter(Boolean)),
  );
}

export function shouldGateProgressScanStart(scans = [], nowMs = Date.now(), minIntervalMs = 0) {
  const latestCompleted = (Array.isArray(scans) ? scans : [])
    .find((scan) => scan?.status === 'complete' && scan?.requiredPosesComplete) || null;
  const capturedAt = Number(latestCompleted?.capturedAt);
  const gated = Number.isFinite(capturedAt) && nowMs - capturedAt < minIntervalMs;
  return { gated, latestCompleted };
}

export function progressCheckInCadenceLabel(latestTakenAt, nowMs = Date.now(), minIntervalMs = 0) {
  if (latestTakenAt == null || latestTakenAt === '') return 'Capture baseline';
  const latest = Number(latestTakenAt);
  if (!Number.isFinite(latest)) return 'Capture baseline';
  const remainingMs = latest + minIntervalMs - nowMs;
  if (remainingMs <= 0) return 'Ready now';
  const days = Math.max(1, Math.ceil(remainingMs / 86400000));
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

const NEXT_ACTION_POSES = ['front', 'side', 'back'];
const NEXT_ACTION_POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

function checkInIsComplete(checkIn) {
  const poses = Array.isArray(checkIn?.poses) ? checkIn.poses : [];
  return NEXT_ACTION_POSES.every((pose) => poses.includes(pose));
}

export function buildPhysiqueStudioNextAction({
  checkIns = [],
  scans = [],
  suppressed = false,
  readOnly = false,
} = {}) {
  const source = Array.isArray(checkIns) ? checkIns.filter((item) => item?.type === 'checkin') : [];
  const ordered = [...source].sort((a, b) => (Number(b.takenAt) || 0) - (Number(a.takenAt) || 0));
  const latest = ordered[0] || null;
  const completed = ordered.filter(checkInIsComplete);
  const visibleScans = visibleCompletedScans(scans);

  if (latest && !checkInIsComplete(latest) && !readOnly) {
    const poses = Array.isArray(latest.poses) ? latest.poses : [];
    const pose = NEXT_ACTION_POSES.find((p) => !poses.includes(p));
    return {
      kind: 'complete_pose',
      title: 'Complete latest Check-In',
      body: 'Add the missing pose now so this Check-In is easier to compare later.',
      cta: `Complete with ${NEXT_ACTION_POSE_LABEL[pose]}`,
      pose,
      checkIn: latest,
    };
  }

  if (!suppressed && visibleScans.length >= 2) {
    return {
      kind: 'compare_scans',
      title: 'Review scan trend',
      body: 'Compare two completed Physique Scan entries with pose-matched photos and trend-only privacy controls.',
      cta: 'Compare scans',
    };
  }

  if (!suppressed && completed.length >= 2) {
    return {
      kind: 'compare_checkins',
      title: 'Compare matched Check-Ins',
      body: 'Use front, side or back photos from complete Check-Ins for a cleaner visual review.',
      cta: 'Compare Check-Ins',
    };
  }

  if (!readOnly) {
    return {
      kind: 'capture',
      title: latest ? 'Keep the setup consistent' : 'Build your baseline',
      body: latest
        ? 'Capture your next Check-In with the same room, lighting, distance and poses.'
        : 'Start with front, side and back photos under repeatable lighting.',
      cta: 'Capture Check-In',
    };
  }

  return null;
}

export function buildProgressScanFinishPayload(profile = {}, bodyProfile = null, userSex = null) {
  const safeProfile = profile || {};
  const safeBodyProfile = bodyProfile || {};
  return {
    sex: safeProfile.sex ?? safeBodyProfile.sex ?? userSex,
    heightCm: safeProfile.heightCm ?? safeBodyProfile.heightCm ?? null,
    weightKg: safeProfile.weightKg ?? safeProfile.bodyweightKg ?? safeProfile.bodyWeightKg ?? null,
    trainingGoal: safeProfile.trainingGoal ?? safeBodyProfile.primaryGoal ?? null,
    trainingPhase: safeProfile.trainingPhase ?? safeProfile.goal ?? null,
    darkerSkinOverestimationRisk: safeProfile.darkerSkinOverestimationRisk === true,
  };
}

export async function deleteViewerProgressPhoto({
  userId,
  name,
  photos = [],
  detachProgressScanPhoto,
  deletePhotoMeta,
  deleteProgressPhoto,
}) {
  const item = (Array.isArray(photos) ? photos : []).find((photo) => photo.name === name);
  const detached = await detachProgressScanPhoto(userId, name);
  if (!detached) throw new Error('progress_scan_detach_photo_failed');
  const metaDeleted = await deletePhotoMeta(userId, name);
  if (!metaDeleted) throw new Error('progress_photo_meta_delete_failed');
  if (item) {
    const fileDeleted = await deleteProgressPhoto(userId, item.uri);
    if (!fileDeleted) throw new Error('progress_photo_delete_failed');
  }
  return true;
}

export async function cleanupRetakenScanPose({
  userId,
  name,
  saved,
  deleteProgressPhoto,
  deletePhotoMeta,
}) {
  if (saved?.uri) {
    const fileDeleted = await deleteProgressPhoto(userId, saved.uri);
    if (!fileDeleted) throw new Error('progress_scan_retake_photo_delete_failed');
  }
  if (name) {
    const metaDeleted = await deletePhotoMeta(userId, name);
    if (!metaDeleted) throw new Error('progress_scan_retake_meta_delete_failed');
  }
  return true;
}

export async function cleanupUnattachedSavedScanPhoto({
  userId,
  name,
  saved,
  deleteProgressPhoto,
  deletePhotoMeta,
}) {
  let fileDeleted = true;
  let metaDeleted = true;
  try {
    if (userId && saved?.uri) fileDeleted = (await deleteProgressPhoto(userId, saved.uri)) !== false;
  } catch (_) {
    fileDeleted = false;
  }
  try {
    if (userId && name) metaDeleted = (await deletePhotoMeta(userId, name)) !== false;
  } catch (_) {
    metaDeleted = false;
  }
  return { fileDeleted, metaDeleted };
}
