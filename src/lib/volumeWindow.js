/**
 * volumeWindow.js -- D200-1 (Progress-tab audit 2026-09-24, findings F1/F6;
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md).
 *
 * THE DEFECT (lead-verified, VolumeHeatmapScreen.js): the 1/2/4-week
 * selector summed every working set inside the window and compared that
 * TOTAL against the WEEKLY MEV/MAV/MRV bands (algorithms.js
 * VOLUME_LANDMARKS, getVolumeStatus), with nothing dividing by the number
 * of weeks in the window. So at 2 and 4 weeks every muscle drifted toward
 * "Getting close" and "Too much" even when the underlying weekly rate was
 * unchanged (the screenshots: Chest 12/32 green at 1 week, 19/32 at 2
 * weeks, 39/32 red at 4 weeks).
 *
 * THE RULING (D200-1): at 2 and 4 weeks the screen reads the AVERAGE
 * working sets per week over the window against the UNCHANGED weekly
 * bands, with the window total shown beside it. algorithms.js stays
 * weekly throughout and is not touched by this module (getVolumeStatus,
 * VOLUME_LANDMARKS and calculateWeeklyVolume are read-only in this build
 * lane) -- this module supplies only the divisor (weeksCounted) and the
 * division itself (perWeekVolume). The 1-week view needs neither: dividing
 * by a window that always counts as exactly one week returns the same
 * total, so it stays visibly identical.
 *
 * D214 AMENDMENT (Progress, recovery heatmap and Consistency elevation,
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.4 item 2): ruling 1's "the 1-week view is
 * unchanged" kept a rolling 7 x 24 h window, so the heatmap's "this week"
 * disagreed with the Progress strip and the plan, which read the
 * Monday-anchored local week. On ruling 3's own principle (one definition
 * per meaning) "This week" is now the Monday-anchored week SO FAR
 * (volumeWindowBounds below); the 2- and 4-week windows stay the rolling
 * weekly averages with the partial-history divisor exactly as built here.
 * The cost, accepted in the plan: every Monday the "This week" view starts
 * empty, which the "so far" line and "N sessions left" carry.
 *
 * Pure. No I/O, no randomness, no theme/React import -- the caller passes
 * every timestamp in.
 */

import { localWeekStartMs } from './dayKey';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The window length the heatmap reads, in weeks: 1 ("This week"), 2 or 4.
 * Anything else (undefined, a string, 3, 0, a negative, NaN) reads as 1, so a
 * stale or hand-built navigation param can never open an unsupported window.
 *
 * @param {*} value - a route param or a chip's weeks
 * @returns {1|2|4}
 */
export function normaliseWindowWeeks(value) {
  const n = Number(value);
  return n === 2 || n === 4 ? n : 1;
}

/**
 * The span of sets a window reads. "This week" (1) runs from the local Monday
 * 00:00 to now, so it agrees with the Progress strip and the plan week
 * (D214, section 7.4 item 2); 2 and 4 weeks are the rolling spans D200-1
 * built (now minus N x 7 days).
 *
 * Finite or nothing (lane 5 review N4): a "now" that is not a finite number
 * has no window, so this returns null rather than bounds with a NaN in them
 * (localWeekStartMs would quietly fall back to the wall clock for the start
 * while the end stayed NaN, a window that disagrees with itself). A caller
 * reads null as "no data".
 *
 * @param {object} args
 * @param {number} args.windowWeeks - 1, 2 or 4 (anything else reads as 1)
 * @param {number} args.nowMs - the caller's "now"
 * @returns {null | { weeks: 1|2|4, startMs: number, endMs: number, mondayAnchored: boolean }}
 *   startMs inclusive, endMs exclusive (now); both always finite
 */
export function volumeWindowBounds({ windowWeeks, nowMs } = {}) {
  const weeks = normaliseWindowWeeks(windowWeeks);
  if (!Number.isFinite(nowMs)) return null;
  const mondayAnchored = weeks === 1;
  const startMs = mondayAnchored ? localWeekStartMs(nowMs) : nowMs - weeks * WEEK_MS;
  if (!Number.isFinite(startMs)) return null;
  return { weeks, startMs, endMs: nowMs, mondayAnchored };
}

/**
 * How many of a window's weeks the account actually has data for, counted
 * from the account's EARLIEST completed set (across all of its history,
 * not just the window), so a young account divides by the weeks it truly
 * has rather than the weeks the window spans.
 *
 * weeks = ceil((windowEndMs - max(windowStartMs, earliestSetMs)) / 7 days),
 * clamped to [0, round((windowEndMs - windowStartMs) / 7 days)] -- the
 * upper clamp is the window's own week count, so this never divides by
 * more weeks than the window shows.
 *
 * Returns 0 when there is no data the window could possibly hold: no sets
 * at all (earliestSetMs null/undefined/non-finite), or the window's whole
 * span lies before the account's first set (earliestSetMs >= windowEndMs).
 * Callers use 0 to hide a bar entirely (the ghost "previous window" bar)
 * rather than divide by it.
 *
 * @param {object} args
 * @param {number} args.windowStartMs - window start, inclusive
 * @param {number} args.windowEndMs - window end, exclusive (e.g. "now" for
 *   the current window, or the current window's start for the previous one)
 * @param {number|null|undefined} args.earliestSetMs - epoch ms of the
 *   account's earliest completed set, or null/undefined if it has none
 * @returns {number} integer weeks, clamped to [0, the window's own span in weeks]
 */
export function weeksCounted({ windowStartMs, windowEndMs, earliestSetMs }) {
  const windowSpanWeeks = Math.max(0, Math.round((windowEndMs - windowStartMs) / WEEK_MS));
  if (earliestSetMs == null || !Number.isFinite(earliestSetMs)) return 0;
  if (earliestSetMs >= windowEndMs) return 0;
  const effectiveStart = Math.max(windowStartMs, earliestSetMs);
  const weeks = Math.ceil((windowEndMs - effectiveStart) / WEEK_MS);
  return Math.min(Math.max(weeks, 0), windowSpanWeeks);
}

/**
 * A copy of calculateWeeklyVolume's output (algorithms.js) with each
 * muscle's `workingSets` divided by `weeks`, so a weekly-banded read
 * (getVolumeStatus, a fill percentage against mrv, the displayed count)
 * stays correct however wide the window is. `reps` and `tonnage` are left
 * untouched: no consumer in this build lane reads them against a weekly
 * band, and D200-1 asked only for the working-set read to divide.
 *
 * weeks <= 0 (or not finite): there is no in-window data to average over,
 * so this returns the copy UNCHANGED (workingSets as given, always 0 in
 * every real case this module reaches -- see weeksCounted's own doc) with
 * `perWeek: false` recorded on each entry, rather than null or a
 * divide-by-zero. A caller that ignores the flag still gets a defined,
 * finite number instead of Infinity/NaN; every caller in this build lane
 * only reaches weeks <= 0 through weeksCounted's own 0 case, which they
 * already treat as "hide this" (the ghost bar).
 *
 * @param {object} volumeByMuscle - calculateWeeklyVolume's output,
 *   { [muscle]: { workingSets, reps, tonnage } }
 * @param {number} weeks - the divisor, typically weeksCounted's result
 * @returns {object} { [muscle]: { workingSets, reps, tonnage, perWeek } }
 */
export function perWeekVolume(volumeByMuscle, weeks) {
  const divide = Number.isFinite(weeks) && weeks > 0;
  const out = {};
  for (const [muscle, data] of Object.entries(volumeByMuscle || {})) {
    const workingSets = (data && data.workingSets) || 0;
    out[muscle] = {
      ...data,
      workingSets: divide ? workingSets / weeks : workingSets,
      perWeek: divide,
    };
  }
  return out;
}
