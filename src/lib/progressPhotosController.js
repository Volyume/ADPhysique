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
      weightKg: meta && Number.isFinite(meta.weightKg) ? meta.weightKg : null,
      note: meta && meta.note ? meta.note : null,
    };
  });
}

export function visibleCompletedScans(scans = []) {
  return (Array.isArray(scans) ? scans : [])
    .filter((scan) => scan?.status !== 'draft' && scan?.requiredPosesComplete);
}

export function visibleScoredScans(scans = []) {
  return visibleCompletedScans(scans)
    .filter((scan) => Number.isFinite(Number(scan?.signals?.physiqueAssessment?.visualLeannessScore)));
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

export function findScanForPhotoName(scans = [], photoName) {
  if (!photoName) return null;
  return (Array.isArray(scans) ? scans : []).find((scan) => (
    Array.isArray(scan?.assets)
    && scan.assets.some((asset) => asset?.photoName === photoName)
  )) || null;
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

export function buildCheckInCompletenessModel(checkIn = {}) {
  const poses = Array.isArray(checkIn?.poses) ? checkIn.poses : [];
  const present = NEXT_ACTION_POSES.filter((pose) => poses.includes(pose));
  const missing = NEXT_ACTION_POSES.filter((pose) => !poses.includes(pose));
  const complete = missing.length === 0;
  const percent = Math.round((present.length / NEXT_ACTION_POSES.length) * 100);
  return {
    complete,
    present,
    missing,
    percent,
    label: complete ? 'Front, side and back saved' : `${present.length} of ${NEXT_ACTION_POSES.length} photos added`,
    detail: complete
      ? 'Front, side and back are saved together.'
      : `Add ${missing.map((pose) => `${NEXT_ACTION_POSE_LABEL[pose].toLowerCase()} photo`).join(', ')} for this date.`,
    nextPose: missing[0] || null,
    nextPoseLabel: missing[0] ? NEXT_ACTION_POSE_LABEL[missing[0]] : null,
  };
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
  const scoredScans = visibleScoredScans(scans);

  if (latest && !checkInIsComplete(latest) && !readOnly) {
    const poses = Array.isArray(latest.poses) ? latest.poses : [];
    const pose = NEXT_ACTION_POSES.find((p) => !poses.includes(p));
    return {
      kind: 'complete_pose',
      title: `Add ${NEXT_ACTION_POSE_LABEL[pose].toLowerCase()} photo`,
      body: `Your latest date is missing the ${NEXT_ACTION_POSE_LABEL[pose].toLowerCase()} photo.`,
      reason: 'Add it to keep front, side and back together for that date.',
      detailItems: [
        'Use similar lighting, distance and camera height.',
        'If the photo is not clear enough, keep it as a normal progress photo.',
      ],
      cta: `Add ${NEXT_ACTION_POSE_LABEL[pose]} photo`,
      pose,
      checkIn: latest,
    };
  }

  if (!suppressed && scoredScans.length >= 2) {
    return {
      kind: 'compare_scans',
      title: 'Compare Volyume Scores',
      body: 'Compare two scored photo sets using photos taken in the same poses.',
      reason: `${scoredScans.length} scored photo sets are ready.`,
      detailItems: [
        'The Volyume Score shows broad change, not an exact number.',
        'This is not an exact body fat percentage.',
      ],
      cta: 'Compare scans',
    };
  }

  if (!suppressed && completed.length >= 2) {
    return {
      kind: 'compare_checkins',
      title: 'Compare matched photo sets',
      body: 'Compare front, side or back photos from complete photo sets.',
      reason: `${completed.length} complete photo sets are ready.`,
      detailItems: [
        'Matching angles and lighting makes changes easier to see.',
        'Choose the same angle on both dates.',
      ],
      cta: 'Compare photos',
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

export async function deleteViewerProgressPhotoSet({
  userId,
  names = [],
  photos = [],
  detachProgressScanPhoto,
  deletePhotoMeta,
  deleteProgressPhoto,
}) {
  const uniqueNames = [...new Set((Array.isArray(names) ? names : []).filter(Boolean))];
  if (uniqueNames.length === 0) return true;
  for (const name of uniqueNames) {
    await deleteViewerProgressPhoto({
      userId,
      name,
      photos,
      detachProgressScanPhoto,
      deletePhotoMeta,
      deleteProgressPhoto,
    });
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
