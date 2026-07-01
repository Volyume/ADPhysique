/**
 * cyclePhase.js — U4 cycle-phase weight-trend annotation
 * (founder 2026-07-01, from the male/female athlete tailoring audit).
 *
 * A short-term weight rise in the luteal / pre-menstrual phase is usually water
 * retention, not fat gain. This module is a PURE, ADDITIVE annotation: given the
 * user's biological sex, their own menstrual note flag (parsed from the weekly
 * check-in notes), and the already-computed weekly weight trend, it returns a
 * reassuring note — or null.
 *
 * SAFETY (deliberate, do not weaken):
 *  - It changes NO calorie target, floor, threshold, or coaching decision. The
 *    engine maths and every ED-safety gate are computed exactly as before; this
 *    only adds an explanatory line for the user.
 *  - It fires ONLY on a RISE. It never annotates a loss, so a rapid-loss signal
 *    can never be softened, hidden, or explained away by cycle context.
 *  - It stands down above an upper bound: a large one-week jump is NOT
 *    responsibly attributable to water, so we say nothing rather than falsely
 *    reassure. Normal coaching handles those.
 */

// A rise smaller than this (percent of bodyweight per week) is not worth a note.
export const CYCLE_WATER_LOWER_PCT = 0.2;
// A rise larger than this is too big to attribute to water; do not reassure.
export const CYCLE_WATER_UPPER_PCT = 2.5;

/**
 * @param {object} args
 * @param {string|null} args.sex               'male' | 'female' | null
 * @param {boolean}     args.menstrual         the parsed menstrual note flag
 * @param {number}      args.trendPctPerWeek   weekly trend, percent of bodyweight
 *                                             (positive = gain, negative = loss)
 * @returns {{ likelyWater: true, trendPctPerWeek: number, note: string } | null}
 */
export function cycleTrendAnnotation({ sex, menstrual, trendPctPerWeek } = {}) {
  // Sex-specific: the annotation only makes sense for a menstrual cycle.
  if (sex !== 'female') return null;
  // The user has to have told us they're around their period this week.
  if (!menstrual) return null;
  const pct = Number(trendPctPerWeek);
  if (!Number.isFinite(pct)) return null;
  // Rise only, within a plausible-water band. Below the lower bound: nothing to
  // say. A loss (pct <= 0) or a jump above the upper bound: say nothing, so we
  // never mask a loss or falsely explain away a real gain.
  if (pct < CYCLE_WATER_LOWER_PCT || pct > CYCLE_WATER_UPPER_PCT) return null;
  return {
    likelyWater: true,
    trendPctPerWeek: pct,
    note: 'A small rise around your period is usually water, not fat. Your coach '
      + 'reads the longer trend, so one week like this won\'t knock things off course.',
  };
}
