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

import { STEADY_RATE_KG_PER_WEEK, DIRECTION_MIN_POINTS, DIRECTION_MIN_SPAN_DAYS } from './weightTrend';

const DAY_MS = 86400000;

// Line charts (weight, e1RM): month-scale windows. Volume: week-scale.
export const TREND_WINDOWS = Object.freeze([
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: 'Y',  label: 'Y',  days: 365 },
]);

// D214 addendum 4 (Body metrics, lane 7; spec section 3 item 4): the weight
// chart's chips read in words ("1 month", "3 months", "6 months", "1 year"),
// not "1M 3M 6M Y". Same keys and day counts as TREND_WINDOWS (which the lift
// charts keep unchanged); only the labels differ.
export const WEIGHT_WINDOWS = Object.freeze([
  { key: '1M', label: '1 month', days: 30 },
  { key: '3M', label: '3 months', days: 90 },
  { key: '6M', label: '6 months', days: 180 },
  { key: 'Y',  label: '1 year',  days: 365 },
]);

// D214 addendum 9 (census H4, 6.3): the volume trend card's chips read in words,
// "4 weeks" "8 weeks" "3 months" "6 months", the way the weight chart's do
// (WEIGHT_WINDOWS above). The KEYS are unchanged: the person's chosen window is
// persisted under them (@volyume_chart_window_volume), so only the labels moved.
export const VOLUME_WINDOWS = Object.freeze([
  { key: '4W', label: '4 weeks',  days: 28,  weeks: 4 },
  { key: '8W', label: '8 weeks',  days: 56,  weeks: 8 },
  { key: '3M', label: '3 months', days: 90,  weeks: 13 },
  { key: '6M', label: '6 months', days: 180, weeks: 26 },
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
 * The weight takeaway under the Trend card, rebuilt under D214 addendum 4
 * (Body metrics, lane 7; spec `docs/audit/
 * progress-recovery-consistency-audit-2026-10-01/04-BODY-METRICS-AUDIT-AND-SPEC.md`
 * section 3 item 4, BM-5 to BM-8, BM-23).
 *
 * It used to print "3 months: average 82.4 kg, down 1.8 kg." where "average"
 * was the mean of the SMOOTHED series (BM-7), the window label could say "3
 * months" over two weeks of data (BM-23), a direction was read from two
 * weigh-ins (BM-6), and a dead-band of 0.1 kg stood beside four other
 * definitions of flat (BM-31). Now:
 *  - the sentence names the dates it covers, and says "Everything you have
 *    logged" when the log is shorter than the window;
 *  - "averaged" is the plain average of the weigh-ins (the caller passes it);
 *  - a direction is read only from DIRECTION_MIN_POINTS weigh-ins that span
 *    DIRECTION_MIN_SPAN_DAYS days (the same 7-weigh-in rule as the This week
 *    card), with its denominator when there is too little;
 *  - "steady" is the ONE steady rule, weightTrend.STEADY_RATE_KG_PER_WEEK, on
 *    the trend's rate over the window, so the word means the same here as in
 *    the verdict line and on the Progress root.
 * The caller holds the withhold: under calm mode or an open flag the sentence
 * is not rendered (bodyMetricsPolicy `takeaway`), so this carries no flag.
 * Every figure arrives formatted for the person's units by the caller's
 * formatters, so nothing here assumes kilograms.
 *
 * @param {object} p
 * @param {boolean} p.coversAll   the log starts inside the window
 * @param {string} p.from         day key of the first weigh-in shown
 * @param {string} p.to           day key of the last weigh-in shown
 * @param {number} p.count        weigh-ins in the window
 * @param {number} p.averageKg    plain average of those weigh-ins
 * @param {number} p.trendStartKg first smoothed point of the window
 * @param {number} p.trendEndKg   last smoothed point of the window
 * @param {number} p.spanDays     days from the first weigh-in to the last
 * @param {(kg:number)=>string} p.formatWeight  "82.3 kg"
 * @param {(kg:number)=>string} p.formatAmount  "0.1 kg"
 * @param {(kgPerWeek:number)=>string} p.formatRate  "0.05 kg a week"
 * @param {(dayKey:string)=>string} p.formatDate  "4 Sep"
 * @returns {string} e.g. "4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg; the trend held steady, about 0.05 kg a week."
 */
// "Held steady" needs BOTH a rate inside the steady rule and a total movement
// under this amount (D214 addendum 7, lane 7 open question 6): over a year,
// 2 kg is 0.04 kg a week, and "held steady" would be untrue of it.
export const STEADY_AMOUNT_KG = 0.5;

export function weightTakeaway({
  coversAll, from, to, count, averageKg, trendStartKg, trendEndKg, spanDays,
  formatWeight, formatAmount, formatRate, formatDate, steadyAmountKg = STEADY_AMOUNT_KG,
  edFlagOpen = false,
}) {
  // Under an open ED flag the takeaway is withheld here as well as by the
  // screen's policy gate (defence in depth, lane 7 review N3).
  if (edFlagOpen) return '';
  if (!(count >= 2) || !Number.isFinite(averageKg)) return '';
  const prefix = `${coversAll ? 'Everything you have logged, ' : ''}${formatDate(from)} to ${formatDate(to)}: `;
  const head = `${prefix}your weigh-ins averaged ${formatWeight(averageKg)}`;
  if (count < DIRECTION_MIN_POINTS) {
    return `${head}; not enough weigh-ins yet to show which way your weight is going: ${count} of ${DIRECTION_MIN_POINTS}.`;
  }
  if (!(spanDays >= DIRECTION_MIN_SPAN_DAYS)) {
    return `${head}; not enough time yet to show which way your weight is going: your weigh-ins cover ${Math.max(0, Math.floor(spanDays))} of ${DIRECTION_MIN_SPAN_DAYS} days.`;
  }
  const delta = trendEndKg - trendStartKg;
  const ratePerWeek = (delta / spanDays) * 7;
  if (Math.abs(ratePerWeek) < STEADY_RATE_KG_PER_WEEK && Math.abs(delta) < steadyAmountKg) {
    return `${head}; the trend held steady, about ${formatRate(Math.abs(ratePerWeek))}.`;
  }
  return `${head}; the trend moved ${delta < 0 ? 'down' : 'up'} ${formatAmount(Math.abs(delta))}, about ${formatRate(Math.abs(ratePerWeek))}.`;
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
 * Weekly-volume takeaway: this week so far, then the average of the full
 * weeks before it, in LOGGED sets.
 *
 * D200-3 last clause (progress-tab audit 2026-09-24, lane E): the volume
 * heatmap's trend anchors its window on the Monday-ending local week
 * (VolumeHeatmapScreen.js), so its last bucket is a PARTIAL current week.
 * `weeklySets` must already exclude that bucket (the caller passes only the
 * full weeks) so the average here is never diluted by a partial week;
 * `phraseOverride` lets the caller say "Last N full weeks" instead of the
 * window's generic label, and `currentWeekTotal` (optional) prepends a
 * separate "This week so far" sentence for the excluded bucket's own total.
 * `phraseOverride` is used verbatim (this function does not itself
 * capitalise it) -- the caller decides the exact wording.
 *
 * D214 (register; `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.4 item 6, VH-9 and VH-16): the old line
 * ended "average 111 sets a week, down 57" -- a delta with no unit, over
 * totals that summed per-muscle credits, so eight logged sets printed as 16.
 * The caller now passes LOGGED working-set rows per Monday week (never the
 * credits), the sentence says "logged", and the first-to-last delta is gone.
 *
 * D214 addendum 9 (census 0.22 and H5): the average always names its unit, "sets
 * a week" (it used to lean on the first sentence and say "about 60 a week"),
 * and it says how many weeks it rests on. A full week with no logged set is
 * left out of `weeklySets`, so "Last 3 full weeks" over two populated weeks
 * was an average over two; `fullWeeks` (the full weeks the window holds, which
 * the caller knows and `weeklySets` does not) lets the label say "(2 with sets
 * logged)" whenever the two differ.
 *
 * @param {number} [fullWeeks] full weeks the window holds, counting those with
 *   no logged set; when it exceeds `weeklySets.length` the label says how many
 *   of them had sets
 * @returns {string} e.g. "This week so far: 42 sets logged. Last 3 full
 *   weeks: about 60 sets a week.", with a week away "This week so far: 42 sets
 *   logged. Last 3 full weeks (2 with sets logged): about 60 sets a week." or,
 *   standing alone, "8 weeks: about 13 sets a week."
 */
export function volumeTakeaway({
  windowKey, coversAll, spanDays, weeklySets, phraseOverride, currentWeekTotal, fullWeeks,
}) {
  const hasCurrent = Number.isFinite(currentWeekTotal);
  const currentR = hasCurrent ? Math.round(currentWeekTotal) : 0;
  const currentText = hasCurrent ? `This week so far: ${currentR} set${currentR === 1 ? '' : 's'} logged.` : '';
  if (!weeklySets || weeklySets.length < 2) return currentText;
  const basePhrase = phraseOverride ?? windowPhrase(windowKey, coversAll, spanDays);
  const phrase = Number.isFinite(fullWeeks) && fullWeeks > weeklySets.length
    ? `${basePhrase} (${weeklySets.length} with sets logged)`
    : basePhrase;
  const avg = weeklySets.reduce((t, v) => t + v, 0) / weeklySets.length;
  const avgR = Math.round(avg);
  const tail = `${phrase}: about ${avgR} set${avgR === 1 ? '' : 's'} a week.`;
  return currentText ? `${currentText} ${tail}` : tail;
}

/**
 * Training-load takeaway, rewritten under D214 (Consistency elevation, lane 4;
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3 item 6, CS-1, CS-6, B10).
 *
 * It used to print "This week so far: 12,450 kg against a 4-week average of
 * 10,200 kg." under the ratio card, which hard-coded "kg" for a pounds user
 * (CS-1) and repeated two figures the card already showed (CS-6). The
 * comparison now arrives already worked out, like for like (Monday to now
 * against the same weekday-and-time span of the previous weeks,
 * `trainingLoad.likeForLikeLoad`), so the one D204 sentence says only how the
 * week sits at this point, with no number and so no unit to get wrong. It
 * describes; it never tells the athlete to change a session (D204).
 *
 * @param {'above'|'in_line'|'below'|null|undefined} comparison -
 *   `likeForLikeLoad`'s own key; null when there is nothing to compare against
 * @returns {string} "Above recent weeks at this point", "In line with recent
 *   weeks at this point", "Below recent weeks at this point", or '' for no
 *   comparison
 */
export function workloadTakeaway(comparison) {
  if (comparison === 'above') return 'Above recent weeks at this point';
  if (comparison === 'in_line') return 'In line with recent weeks at this point';
  if (comparison === 'below') return 'Below recent weeks at this point';
  return '';
}
