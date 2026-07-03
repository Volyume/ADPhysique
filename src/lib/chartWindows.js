/**
 * COMP-019 Stage 1a — chart windowing + recomputed takeaway.
 *
 * Pure, dependency-free helpers (no React, no DB, no drawing) so the windowing
 * and takeaway maths can be unit-tested and shared by the three hero charts
 * (weight trend, e1RM, weekly volume). This is data work, not drawing work —
 * it replaces the charts' count-based `slice(-N)` with real date windows and
 * computes the one-sentence takeaway (average + first-to-last delta) that the
 * user reads instead of point values off an axis.
 *
 * House voice: plain, terse, no jargon, full stops, numerals the hero, BrE.
 */

const DAY_MS = 86400000;

// Line charts (weight, e1RM): month-scale windows. Volume: week-scale.
export const TREND_WINDOWS = Object.freeze([
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: 'Y',  label: 'Y',  days: 365 },
]);

export const VOLUME_WINDOWS = Object.freeze([
  { key: '4W', label: '4W', days: 28,  weeks: 4 },
  { key: '8W', label: '8W', days: 56,  weeks: 8 },
  { key: '3M', label: '3M', days: 90,  weeks: 13 },
  { key: '6M', label: '6M', days: 180, weeks: 26 },
]);

export const DEFAULT_WINDOW_KEY = '3M';

// Canonical spoken phrase per window key, for the takeaway prefix.
const WINDOW_PHRASE = {
  '1M': '1 month',
  '3M': '3 months',
  '6M': '6 months',
  'Y': '1 year',
  '4W': '4 weeks',
  '8W': '8 weeks',
};

export function windowByKey(windows, key) {
  return windows.find(w => w.key === key) ?? null;
}

/**
 * Filter chronological points to a date window.
 * @param {Array} points
 * @param {(p:any)=>number} dateOf - epoch ms for a point
 * @param {number} windowDays
 * @param {number} [now]
 */
export function filterByWindow(points, dateOf, windowDays, now = Date.now()) {
  const cutoff = now - windowDays * DAY_MS;
  return (points || []).filter(p => dateOf(p) >= cutoff);
}

/**
 * Choose the window to show on load: the preferred key if it holds ≥2 points,
 * otherwise the WIDEST window that does (never a dead default). Falls back to
 * the widest window when nothing reaches 2 points (the caller then shows the
 * empty hint).
 * @returns {string} a window key
 */
export function pickInitialWindowKey(points, dateOf, windows, preferredKey, now = Date.now()) {
  const has2 = (days) => filterByWindow(points, dateOf, days, now).length >= 2;
  const preferred = windowByKey(windows, preferredKey);
  if (preferred && has2(preferred.days)) return preferredKey;
  // widen: walk windows from narrowest to widest, take the first with ≥2.
  const widest = windows[windows.length - 1];
  const firstOk = [...windows].sort((a, b) => a.days - b.days).find(w => has2(w.days));
  return (firstOk ?? widest).key;
}

/**
 * The takeaway prefix. When the window reaches back past the user's earliest
 * datum, it shows everything — say "All N weeks/months" with the real span,
 * not the (misleading) window label.
 * @param {string} windowKey
 * @param {boolean} coversAll - earliest available point is inside the window
 * @param {number} spanDays - days between first and last point shown
 */
export function windowPhrase(windowKey, coversAll, spanDays) {
  if (!coversAll) return WINDOW_PHRASE[windowKey] ?? '';
  const weeks = Math.max(1, Math.round(spanDays / 7));
  if (spanDays < 56) return `All ${weeks} week${weeks === 1 ? '' : 's'}`;
  const months = Math.max(1, Math.round(spanDays / 30));
  return `All ${months} month${months === 1 ? '' : 's'}`;
}

// Round to one decimal, dropping a trailing .0 so "82" not "82.0".
function num1(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// Direction word for a signed delta, with a dead-band so noise reads "level".
function directionWord(delta, deadband) {
  if (delta > deadband) return 'up';
  if (delta < -deadband) return 'down';
  return 'level';
}

function spanDaysOf(points, dateOf) {
  if (!points.length) return 0;
  const times = points.map(dateOf);
  return (Math.max(...times) - Math.min(...times)) / DAY_MS;
}

/**
 * Weight takeaway from EWMA endpoints (raw is faded behind the trend in the
 * house style). Under an open ED flag the rate-of-change is suppressed —
 * average only, no direction or delta (COMP-004's safety behaviour).
 *
 * @returns {string} e.g. "3 months: average 82.4 kg, down 1.8 kg."
 */
export function weightTakeaway({ windowKey, coversAll, points, dateOf, ewma, unit = 'kg', edFlagOpen = false }) {
  if (!ewma || ewma.length < 2) return '';
  const phrase = windowPhrase(windowKey, coversAll, spanDaysOf(points, dateOf));
  const avg = ewma.reduce((t, v) => t + v, 0) / ewma.length;
  if (edFlagOpen) {
    return `${phrase}: average ${num1(avg)} ${unit}.`;
  }
  const delta = ewma[ewma.length - 1] - ewma[0];
  const dir = directionWord(delta, 0.1);
  if (dir === 'level') return `${phrase}: average ${num1(avg)} ${unit}, holding steady.`;
  return `${phrase}: average ${num1(avg)} ${unit}, ${dir} ${num1(Math.abs(delta))} ${unit}.`;
}

/**
 * e1RM takeaway: best in window + first-to-last delta.
 * @returns {string} e.g. "6 months: best 142 kg, up 7.5 kg."
 */
export function e1rmTakeaway({ windowKey, coversAll, points, dateOf, values, unit = 'kg' }) {
  if (!values || values.length < 2) return '';
  const phrase = windowPhrase(windowKey, coversAll, spanDaysOf(points, dateOf));
  const best = Math.max(...values);
  const delta = values[values.length - 1] - values[0];
  const dir = directionWord(delta, 0.1);
  if (dir === 'level') return `${phrase}: best ${num1(best)} ${unit}, holding steady.`;
  return `${phrase}: best ${num1(best)} ${unit}, ${dir} ${num1(Math.abs(delta))} ${unit}.`;
}

/**
 * Weekly-volume takeaway: average weekly sets + first-to-last delta in sets.
 * @returns {string} e.g. "8 weeks: average 14 sets a week, up 3."
 */
export function volumeTakeaway({ windowKey, coversAll, spanDays, weeklySets }) {
  if (!weeklySets || weeklySets.length < 2) return '';
  const phrase = windowPhrase(windowKey, coversAll, spanDays);
  const avg = weeklySets.reduce((t, v) => t + v, 0) / weeklySets.length;
  const avgR = Math.round(avg);
  const delta = Math.round(weeklySets[weeklySets.length - 1] - weeklySets[0]);
  const dir = directionWord(delta, 0);
  const base = `${phrase}: average ${avgR} set${avgR === 1 ? '' : 's'} a week`;
  if (dir === 'level') return `${base}, holding steady.`;
  return `${base}, ${dir} ${Math.abs(delta)}.`;
}

/**
 * Training-load takeaway: this week's tonnage against the 4-week average
 * that feeds the Acute:Chronic Workload Ratio shown on the Workload card
 * (WorkloadCard in src/components/ProgressSections.js). That card's banded
 * statusText (which names the safe ranges) stays untouched — this is the
 * one-line takeaway in the same register as the takeaways above.
 *
 * @param {number|null} ratio - acute/chronic ratio, or null/undefined when
 *   there isn't enough history to compute one (getAcuteChronicWorkload's
 *   own gate, database.js: needs >=2 past weeks with tonnage > 0).
 * @param {number} acute - this week's tonnage in kg
 * @param {number} chronic - 4-week average tonnage in kg
 * @returns {string} e.g. "This week: 12,450 kg against a 4-week average of 10,200 kg."
 */
export function workloadTakeaway(ratio, acute, chronic) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '';
  if (!Number.isFinite(acute) || !Number.isFinite(chronic) || chronic <= 0) return '';
  const acuteR = Math.round(acute).toLocaleString('en-GB');
  const chronicR = Math.round(chronic).toLocaleString('en-GB');
  return `This week: ${acuteR} kg against a 4-week average of ${chronicR} kg.`;
}
