/**
 * src/lib/trainingLoad.js
 *
 * Progress-tab audit 2026-09-24 (docs/audit/progress-tab-audit-2026-09-24/
 * 00-FINDINGS-AND-PROPOSALS.md, F4/F5; D200 item 3; report section 7,
 * S6-5), lane E, ruling 1. Pure module -- no I/O, no React, no theme,
 * deterministic -- so it can be shared by the Consistency screen's plan-card
 * sparkline and its workload (ACWR) card without either surface running its
 * own week-bucketing.
 *
 * THE DEFECTS THIS REPLACES:
 *  - the sparkline (`useProgressData.js` ~196-226, pre-fix) and the session
 *    length trend bucketed on ROLLING 7-day windows from the wall clock, so
 *    "this week" on a Sunday meant something different from the
 *    Monday-anchored "this week" the muscle-frequency table already used
 *    (F4);
 *  - the old database read `getAcuteChronicWorkload` (retired 2026-09-25
 *    once nothing called it) was ALSO rolling, and summed `weight * reps`
 *    directly with no exercise-type map, so a
 *    distance/duration set's metres/seconds were summed as kilograms
 *    (S6-5) -- a second, disagreeing kg figure for the same fact (F5);
 *  - `weekWindowsEndingAt` (`weekWindows.js`) and the old sparkline loop
 *    both stepped by a FIXED 7*24h multiple, which drifts an hour off a
 *    real calendar week across the UK's BST/GMT change.
 *
 * `mondayWeekLoadSeries` is the one place that buckets logged sets into
 * Monday-anchored local weeks (via dayKey.js's own calendar-aware
 * `localWeekStartMs`/`localWeekEndMs`, stepped with `Date#setDate`, never a
 * fixed millisecond multiple) and sums each week's tonnage through
 * `calculateTonnage` WITH the caller's exercise-type map and load
 * semantics, so a distance/duration set never enters the kg total.
 * `acuteChronicFromSeries` then reads the acute:chronic ratio off that same
 * series, transplanting that retired read's exact aggregation rule so the
 * sparkline's "Now" bar and the workload card's "this week" figure are
 * always the same number.
 *
 * D214 (Consistency elevation, lane 4; `docs/audit/progress-recovery-
 * consistency-audit-2026-10-01/00-AUDIT-AND-PLAN.md` section 7.3 item 6, CS-6):
 * `acuteChronicFromSeries` divides a PART week by FULL ones, so early in any
 * week its ratio read "below your average" by construction. The screen no
 * longer prints that ratio. `likeForLikeLoad` below is the comparison it
 * prints instead: Monday to now against the same weekday-and-time span of each
 * of the previous weeks, so a part week is never set against a full one.
 */
import { localWeekStartMs, localWeekEndMs } from './dayKey';
import { calculateTonnage } from './algorithms';

/**
 * `weeks` Monday-anchored weekly tonnage entries, oldest to newest. The
 * LAST entry is the CURRENT local week so far: `[localWeekStartMs(now),
 * now)`, `isCurrent: true`. Every earlier entry is a FULL Monday-anchored
 * week, `[weekStartMs, weekStartMs + 7 local days)` -- each start is
 * stepped back from the next one with `Date#setDate(date - 7)`, calendar
 * arithmetic rather than a fixed `7 * 86400000` subtraction, so a week
 * either side of a UK clock change still measures a real calendar week
 * (the same technique `dayKey.js`'s own `localWeekEndMs` uses).
 *
 * Attribution is by SET time (`createdAt ?? created_at`), matching what the
 * sparkline already did -- sets are what carry load, not the workout they
 * belong to.
 *
 * @param {Array} sets - workout_sets rows (camelCase or snake_case)
 * @param {object} [opts]
 * @param {number} [opts.weeks=5] - how many weekly entries to return
 * @param {number} [opts.now] - epoch ms "now" (test seam; defaults to the
 *   real clock)
 * @param {object|null} [opts.exerciseTypeById] - exerciseId -> exercise_type,
 *   threaded into `calculateTonnage` so a distance/duration set's
 *   metres/seconds never enters the kg sum (S6-5).
 * @param {object|null} [opts.loadSemanticsById] - exerciseId -> load_semantics,
 *   threaded into `calculateTonnage` (per-hand x2, assisted excluded).
 * @returns {Array<{weekStartMs:number, weekEndMs:number, isCurrent:boolean, tonnage:number}>}
 */
export function mondayWeekLoadSeries(sets, {
  weeks = 5,
  now = Date.now(),
  exerciseTypeById = null,
  loadSemanticsById = null,
} = {}) {
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const n = Number.isFinite(weeks) && weeks > 0 ? Math.trunc(weeks) : 1;
  const list = Array.isArray(sets) ? sets : [];

  // Oldest -> newest Monday-local-midnight starts, the last being the
  // CURRENT week. Each earlier start steps back exactly one calendar week
  // via Date#setDate (calendar-aware, like dayKey.js's own localWeekEndMs),
  // never a fixed 7*24h subtraction.
  const starts = [localWeekStartMs(nowMs)];
  for (let i = 1; i < n; i++) {
    const d = new Date(starts[0]);
    d.setDate(d.getDate() - 7);
    starts.unshift(d.getTime());
  }

  return starts.map((weekStartMs, idx) => {
    const isCurrent = idx === starts.length - 1;
    const weekEndMs = isCurrent ? nowMs : localWeekEndMs(weekStartMs);
    const weekSets = list.filter((s) => {
      const at = s.createdAt ?? s.created_at ?? 0;
      return at >= weekStartMs && at < weekEndMs;
    });
    return {
      weekStartMs,
      weekEndMs,
      isCurrent,
      tonnage: calculateTonnage(weekSets, exerciseTypeById, loadSemanticsById),
    };
  });
}

/**
 * Reads the Acute:Chronic Workload Ratio off a `mondayWeekLoadSeries`
 * result, transplanting the exact rule of the database read it replaced
 * (`getAcuteChronicWorkload`, retired 2026-09-25 once nothing called it)
 * so the two could never disagree given the same series -- except the one
 * defect named in the NOTE below, corrected here:
 *   - acute = the CURRENT week's tonnage (the series' last entry);
 *   - chronic = the mean of the PREVIOUS weeks with tonnage > 0 (zero
 *     weeks dropped), taking at most the four most recent past entries;
 *   - fewer than two such populated past weeks -> not enough data (`null`);
 *   - acute/chronic are each `Math.round`ed; ratio is rounded to 2 dp.
 *
 * NOTE (lead ruling, defect, fixed HERE): the retired read computed
 * `ratio = chronic > 0 ? acute / chronic : null` and then returned
 * `ratio ? Math.round(ratio * 100) / 100 : null` -- a truthy check, not a
 * null check, so a genuine
 * `ratio === 0` (acute is exactly 0 with a populated chronic average, e.g.
 * a rest-day Monday morning) collapsed to `null` ("not enough data") and
 * hid the whole card instead of reading 0.00.
 * That truthy check was the defect. This function checks for `null`
 * explicitly instead, so a zero-tonnage current week reads a real 0.00
 * against the chronic average rather than vanishing.
 *
 * @param {Array<{isCurrent:boolean, tonnage:number}>} series - oldest to
 *   newest, as returned by `mondayWeekLoadSeries`.
 * @returns {{acute:number, chronic:number, ratio:number|null, weeksOfData:number}|null}
 */
export function acuteChronicFromSeries(series) {
  const list = Array.isArray(series) ? series : [];
  if (list.length === 0) return null;

  const acute = list[list.length - 1]?.tonnage ?? 0;
  // Up to the four most recent PAST weeks (the current entry excluded),
  // zero-tonnage weeks dropped -- the retired read's own
  // `weeklyTonnage.slice(1, 5).filter(t => t > 0)`.
  const pastWeeks = list
    .slice(0, -1)
    .slice(-4)
    .map((w) => w.tonnage)
    .filter((t) => t > 0);
  if (pastWeeks.length < 2) return null; // not enough data

  const chronic = pastWeeks.reduce((s, t) => s + t, 0) / pastWeeks.length;
  const ratio = chronic > 0 ? acute / chronic : null;

  return {
    acute: Math.round(acute),
    chronic: Math.round(chronic),
    ratio: ratio == null ? null : Math.round(ratio * 100) / 100,
    weeksOfData: pastWeeks.length,
  };
}

/**
 * The ratio bounds the comparison words are cut at, unchanged from the ratio
 * card they replace (D204): below LOAD_IN_LINE_MIN reads "Below", from
 * LOAD_ABOVE_MIN reads "Above", between them "In line". Exported so the
 * explanation behind the (i) quotes the same numbers the words are cut at.
 */
export const LOAD_IN_LINE_MIN = 0.8;
export const LOAD_ABOVE_MIN = 1.3;

/**
 * The load comparison, like for like (D214, CS-6, B10).
 *
 * The current Monday-anchored local week so far -- `[localWeekStartMs(now),
 * now)`, the very span `mondayWeekLoadSeries` calls current, so the figure is
 * the identical number -- against the SAME weekday-and-time span of each of the
 * previous `weeks` weeks. On a Wednesday at 10:23 each previous week is read
 * from its Monday 00:00 up to its own Wednesday 10:23, never a full week: a
 * part week is never compared against full ones.
 *
 * The cut-off of a previous week is `now` stepped back whole weeks with
 * `Date#setDate` (local wall-clock arithmetic, never a fixed 7 * 24 h step),
 * so a week either side of a UK clock change still ends at the same local
 * time of day. Attribution is by set time (`createdAt ?? created_at`) and the
 * kg sum goes through `calculateTonnage` with the caller's exercise-type map
 * and load semantics, exactly as `mondayWeekLoadSeries` does.
 *
 * Which previous weeks count: a week with no sets at all in the FULL week was
 * a break, not a pace, and is left out (the rule `acuteChronicFromSeries`
 * already applies to its average); a populated week counts even when nothing
 * was logged by this point of it, because that is the true like-for-like
 * reading. Fewer than two such weeks is not enough to compare against
 * (`comparison: null`), and when those weeks logged nothing by this point
 * there is nothing to divide by, so the comparison is withheld rather than
 * claimed ("Above" a zero is no statement).
 *
 * @param {Array} sets - workout_sets rows (camelCase or snake_case)
 * @param {object} [opts]
 * @param {number} [opts.weeks=3] - how many PREVIOUS weeks to compare against
 * @param {number} [opts.now] - epoch ms "now" (test seam; defaults to the clock)
 * @param {object|null} [opts.exerciseTypeById]
 * @param {object|null} [opts.loadSemanticsById]
 * @returns {{
 *   current: number,
 *   expected: number|null,
 *   ratio: number|null,
 *   comparison: 'above'|'in_line'|'below'|null,
 *   weeksOfData: number,
 *   weeks: Array<{weekStartMs:number, cutoffMs:number, isCurrent:boolean, byNowTonnage:number, fullTonnage:number}>
 * }} `weeks` runs oldest to newest and ends with the current week (whose
 *   `byNowTonnage` and `fullTonnage` are both the week so far).
 */
export function likeForLikeLoad(sets, {
  weeks = 3,
  now = Date.now(),
  exerciseTypeById = null,
  loadSemanticsById = null,
} = {}) {
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const n = Number.isFinite(weeks) && weeks > 0 ? Math.trunc(weeks) : 3;
  const list = Array.isArray(sets) ? sets : [];

  const tonnageBetween = (fromMs, toMs) => calculateTonnage(
    list.filter((s) => {
      const at = s.createdAt ?? s.created_at ?? 0;
      return at >= fromMs && at < toMs;
    }),
    exerciseTypeById,
    loadSemanticsById,
  );

  const rows = [];
  for (let k = n; k >= 0; k--) {
    const isCurrent = k === 0;
    const cut = new Date(nowMs);
    cut.setDate(cut.getDate() - 7 * k);
    const cutoffMs = isCurrent ? nowMs : cut.getTime();
    const weekStartMs = localWeekStartMs(cutoffMs);
    const byNowTonnage = tonnageBetween(weekStartMs, cutoffMs);
    rows.push({
      weekStartMs,
      cutoffMs,
      isCurrent,
      byNowTonnage,
      fullTonnage: isCurrent ? byNowTonnage : tonnageBetween(weekStartMs, localWeekEndMs(weekStartMs)),
    });
  }

  const current = rows[rows.length - 1].byNowTonnage;
  const populated = rows.filter((r) => !r.isCurrent && r.fullTonnage > 0);
  const out = {
    current: Math.round(current),
    expected: null,
    ratio: null,
    comparison: null,
    weeksOfData: populated.length,
    weeks: rows,
  };
  if (populated.length < 2) return out;

  const expected = populated.reduce((sum, r) => sum + r.byNowTonnage, 0) / populated.length;
  out.expected = Math.round(expected);
  if (!(expected > 0)) return out;

  const ratio = current / expected;
  out.ratio = Math.round(ratio * 100) / 100;
  if (ratio >= LOAD_ABOVE_MIN) out.comparison = 'above';
  else if (ratio >= LOAD_IN_LINE_MIN) out.comparison = 'in_line';
  else out.comparison = 'below';
  return out;
}
