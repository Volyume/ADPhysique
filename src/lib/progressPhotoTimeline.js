import { formatProgressPhotoMonth } from './progressPhotoDates';

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
