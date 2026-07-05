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
