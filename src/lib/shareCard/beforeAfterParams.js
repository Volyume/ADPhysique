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
 * Default pair for a photo list: earliest vs latest by timestamp. Returns up to
 * two names; fewer than two photos yields whatever exists.
 */
export function defaultPair(photos) {
  const sorted = (Array.isArray(photos) ? photos : [])
    .filter((p) => p && p.name && Number.isFinite(p.ts))
    .sort((x, y) => x.ts - y.ts);
  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [sorted[0].name];
  return [sorted[0].name, sorted[sorted.length - 1].name];
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
