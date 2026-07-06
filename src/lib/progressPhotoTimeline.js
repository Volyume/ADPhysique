import { formatProgressPhotoDay, formatProgressPhotoMonth } from './progressPhotoDates';

export const PROGRESS_PHOTO_TIMELINE_COLS = 3;

// Group a sorted photo list into month headers and fixed-width rows. The
// caller owns the sort direction, so this stays neutral and transformation-free.
export function buildTimeline(list = []) {
  const out = [];
  let curKey = null;
  let bucket = [];
  const flushBucket = () => {
    for (let i = 0; i < bucket.length; i += PROGRESS_PHOTO_TIMELINE_COLS) {
      const chunk = bucket.slice(i, i + PROGRESS_PHOTO_TIMELINE_COLS);
      out.push({ type: 'row', key: `row-${chunk[0].name}`, photos: chunk });
    }
    bucket = [];
  };
  for (const p of Array.isArray(list) ? list : []) {
    const d = new Date(p.takenAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== curKey) {
      flushBucket();
      curKey = key;
      out.push({ type: 'header', key: `h-${key}`, label: formatProgressPhotoMonth(p.takenAt) });
    }
    bucket.push(p);
  }
  flushBucket();
  return out;
}

function localDayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function poseOrder(pose) {
  if (pose === 'front') return 0;
  if (pose === 'side') return 1;
  if (pose === 'back') return 2;
  return 3;
}

function setupQualityForPoses(poses = []) {
  if (poses.includes('front') && poses.includes('side') && poses.includes('back')) {
    return {
      key: 'complete',
      label: 'Strong setup',
      helper: 'Front, side and back are saved for like-for-like comparison.',
    };
  }
  if (poses.length >= 2) {
    return {
      key: 'usable',
      label: 'Usable setup',
      helper: 'Add the missing pose to make this Check-In stronger.',
    };
  }
  return {
    key: 'partial',
    label: 'Partial setup',
    helper: 'Add the other poses before relying on comparisons.',
  };
}

export function buildCheckInTimeline(list = []) {
  const out = [];
  const source = Array.isArray(list) ? list : [];
  let curMonthKey = null;
  let curDayKey = null;
  let bucket = [];

  const flushBucket = () => {
    if (bucket.length === 0) return;
    const sortedPhotos = [...bucket].sort((a, b) => poseOrder(a.pose) - poseOrder(b.pose));
    const cover = sortedPhotos.find((p) => p.pose === 'front') || sortedPhotos[0];
    const poses = [...new Set(sortedPhotos.map((p) => p.pose).filter(Boolean))];
    const note = sortedPhotos.find((p) => p.note)?.note || null;
    const weightKg = sortedPhotos.find((p) => Number.isFinite(p.weightKg))?.weightKg ?? null;
    const setupQuality = setupQualityForPoses(poses);
    out.push({
      type: 'checkin',
      key: `checkin-${curDayKey}`,
      dayKey: curDayKey,
      label: formatProgressPhotoDay(cover.takenAt),
      takenAt: cover.takenAt,
      cover,
      photos: sortedPhotos,
      poses,
      note,
      weightKg,
      setupQuality,
    });
    bucket = [];
  };

  for (const p of source) {
    const d = new Date(p.takenAt);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    const dayKey = localDayKey(p.takenAt);
    if (monthKey !== curMonthKey) {
      flushBucket();
      curMonthKey = monthKey;
      curDayKey = null;
      out.push({ type: 'header', key: `h-${monthKey}`, label: formatProgressPhotoMonth(p.takenAt) });
    }
    if (dayKey !== curDayKey) {
      flushBucket();
      curDayKey = dayKey;
    }
    bucket.push(p);
  }
  flushBucket();
  return out;
}

// Compose the pose filter, inclusive date-range bounds and sort order. This is
// pure viewing of the user's own photos; it never ranks or forces comparison.
export function filterAndSort(list = [], {
  poseFilter = 'all', sortOrder = 'newest', rangeFrom = null, rangeTo = null,
} = {}) {
  const source = Array.isArray(list) ? list : [];
  let out = poseFilter === 'all' ? source : source.filter((p) => p.pose === poseFilter);
  if (Number.isFinite(rangeFrom)) out = out.filter((p) => p.takenAt >= rangeFrom);
  if (Number.isFinite(rangeTo)) out = out.filter((p) => p.takenAt <= rangeTo);
  const dir = sortOrder === 'oldest' ? 1 : -1;
  return [...out].sort((a, b) => (a.takenAt - b.takenAt) * dir);
}
