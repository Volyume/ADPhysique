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
 *  - `getAcuteChronicWorkload` (`database.js:4136-4187`) is ALSO rolling,
 *    and sums `weight * reps` directly with no exercise-type map, so a
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
 * series, transplanting `getAcuteChronicWorkload`'s exact aggregation rule
 * so the sparkline's "Now" bar and the workload card's "this week" figure
 * are always the same number.
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
 * result, transplanting `getAcuteChronicWorkload`'s exact rule
 * (`database.js:4163-4186`) so the two can never disagree given the same
 * series -- except the one defect named in the NOTE below, corrected here:
 *   - acute = the CURRENT week's tonnage (the series' last entry);
 *   - chronic = the mean of the PREVIOUS weeks with tonnage > 0 (zero
 *     weeks dropped), taking at most the four most recent past entries;
 *   - fewer than two such populated past weeks -> not enough data (`null`);
 *   - acute/chronic are each `Math.round`ed; ratio is rounded to 2 dp.
 *
 * NOTE (lead ruling, defect, fixed HERE, `getAcuteChronicWorkload` left
 * untouched): `getAcuteChronicWorkload` computes `ratio = chronic > 0 ?
 * acute / chronic : null` and then returns `ratio ? Math.round(ratio *
 * 100) / 100 : null` -- a truthy check, not a null check, so a genuine
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
  // zero-tonnage weeks dropped -- same as getAcuteChronicWorkload's
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
