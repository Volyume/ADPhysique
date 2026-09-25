import { formatProgressPhotoDay } from '../progressPhotoDates';
import { formatVolyumeScore, progressScanAssessmentForDisplay } from '../progressScanDisplay';
import { formatBodyWeight } from '../units';

const DAY_MS = 86400000;

/** British short date, e.g. "3 Mar 2026". Empty string for a bad timestamp. */
export function formatCardDate(ts) {
  return formatProgressPhotoDay(ts);
}

/**
 * Neutral elapsed-time label between two timestamps, e.g. "14 weeks", "6 months".
 * Time stated plainly, never framed as a transformation. Empty for bad input.
 */
export function elapsedLabel(fromMs, toMs) {
  const a = Number(fromMs); const b = Number(toMs);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  const days = Math.max(0, Math.round(Math.abs(b - a) / DAY_MS));
  if (days <= 0) return 'Same day';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 182) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30.44);
    return months === 1 ? '1 month' : `${months} months`;
  }
  const years = Math.floor(days / 365);
  const remMonths = Math.round((days - years * 365) / 30.44);
  const yStr = years === 1 ? '1 year' : `${years} years`;
  if (remMonths <= 0) return yStr;
  const mStr = remMonths === 1 ? '1 month' : `${remMonths} months`;
  return `${yStr} ${mStr}`;
}

/**
 * Order two photo items (each `{ name, ts }`) as [older, newer] by timestamp,
 * so the card is always older-left / newer-right whatever the tap order was.
 */
export function orderPair(a, b) {
  if (!a) return [b, null];
  if (!b) return [a, null];
  return a.ts <= b.ts ? [a, b] : [b, a];
}

/**
 * Pose-aware default-pair preference (S7-6, progress-tab audit second pass,
 * 2026-09-25, register D200 item 7, report §8): prefers the latest item's
 * own pose when an earlier item shares it, so a mixed front/back/side
 * library defaults to two matched-pose photos rather than whichever two
 * happen to be oldest/newest overall; falls back to the oldest/newest of the
 * whole list when no pose data is present, or nothing earlier shares the
 * latest's pose (identical to the pre-fix, pose-blind behaviour). Shared
 * with ProgressPhotoCompare.js's own default-pair selection, which applied
 * this same preference locally before this extraction; `getTime` reads each
 * item's timestamp field (`ts` here, `takenAt` there).
 *
 * @param {Array<{pose?: (string|null)}>} items - at least one item; each
 *   item optionally carries a `pose`.
 * @param {{getTime?: (item: object) => number}} [opts]
 * @returns {[object, object]} [older, newer] by timestamp, from the
 *   preferred pool.
 */
export function preferPoseAwarePair(items, { getTime = (p) => p.ts } = {}) {
  const asc = [...items].sort((a, b) => getTime(a) - getTime(b));
  const latest = asc[asc.length - 1];
  const samePose = latest?.pose ? asc.filter((p) => p.pose === latest.pose) : asc;
  const pool = samePose.length >= 2 ? samePose : asc;
  return [pool[0], pool[pool.length - 1]];
}

/**
 * Default pair for a photo list: earliest vs latest by timestamp, preferring
 * two photos of the SAME pose when the latest photo has one (see
 * `preferPoseAwarePair` above). Returns up to two names; fewer than two
 * photos yields whatever exists. Items with no `pose` field behave exactly
 * as before this fix (earliest vs latest overall).
 */
export function defaultPair(photos) {
  const sorted = (Array.isArray(photos) ? photos : [])
    .filter((p) => p && p.name && Number.isFinite(p.ts))
    .sort((x, y) => x.ts - y.ts);
  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [sorted[0].name];
  const [older, newer] = preferPoseAwarePair(sorted);
  return [older.name, newer.name];
}

export function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatShareScanRange(scan) {
  const assessment = progressScanAssessmentForDisplay(scan);
  if (assessment?.visualLeannessScore != null) {
    return `${assessment.leannessBandLabel || 'Scan'} ${formatVolyumeScore(assessment.visualLeannessScore)}`;
  }
  return '';
}

/**
 * Build the drawShareCard params for the beforeAfter card. Pure: takes resolved
 * takenAt/weight values so it is trivially testable. `weight` is included only
 * when `showWeight` is on AND a weight exists; suppressed callers never reach
 * here (the whole card is withheld), so this is only the user toggle.
 */
export function buildBeforeAfterParams({
  olderTakenAt, newerTakenAt, olderWeightKg, newerWeightKg,
  olderScan = null, newerScan = null,
  showWeight, showScanRange = true, showScanWeight = true, aspect = 'square', bodyWeightUnits = 'kg',
}) {
  const asp = (aspect === 'portrait' || aspect === 'story') ? aspect : 'square';
  const wt = (kg) => (showWeight && kg != null && Number.isFinite(kg)
    ? formatBodyWeight(kg, bodyWeightUnits)
    : '');
  const before = { date: formatCardDate(olderTakenAt), weight: olderScan && !showScanWeight ? '' : wt(olderWeightKg) };
  const after = { date: formatCardDate(newerTakenAt), weight: newerScan && !showScanWeight ? '' : wt(newerWeightKg) };
  const olderRange = showScanRange ? formatShareScanRange(olderScan) : '';
  const newerRange = showScanRange ? formatShareScanRange(newerScan) : '';
  if (olderRange) before.scanRange = olderRange;
  if (newerRange) after.scanRange = newerRange;
  return {
    cardType: 'beforeAfter',
    aspect: asp,
    isSquare: asp !== 'story',
    elapsedLabel: elapsedLabel(olderTakenAt, newerTakenAt),
    before,
    after,
    showWeight: !!showWeight,
  };
}
