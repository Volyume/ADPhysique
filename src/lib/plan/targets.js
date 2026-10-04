/**
 * targets.js -- D219: a muscle's direct-set target for every week of a block
 * (design 4.2 and 4.4, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md).
 *
 *   week 1   max(the exercise floors, peak - 8): the floors are 2 sets for
 *            every exercise of the muscle, so a list sized for the peak
 *            opens at half of it at most
 *   weeks 1 to 5   an even climb to the peak, never more than the tested
 *            weekly step (+2, +3 at most; Enes 2024 [B])
 *   week 6   the recovery week: max(maintenance, round(0.5 x peak)), load kept
 *            (Coleman 2024 [B]: scheduled deloads are not a growth lever)
 *
 * A block after the first may open from the ledger's seeded start (what the
 * person actually did, Scarpelli 2022 [B]); the result is clamped to the same
 * rules. Targets are in DIRECT sets, the unit planned_muscle_volume stores.
 *
 * Pure: no I/O, no clock, no randomness.
 */
import { BLOCK, CHECKIN_STEPS, ROLE_TARGETS } from './science';

/**
 * @param {object} args
 * @param {number} args.peak            the muscle's direct sets at the block's peak week
 * @param {number} args.floors          2 sets for every exercise of the muscle in the plan
 * @param {number} [args.seededStart]   a ledger-seeded opening (blocks after the first)
 * @param {number} [args.maintenance]   the muscle's maintenance target in direct sets
 * @returns {number[]} six weekly direct-set targets, week 1 first
 */
export function blockTargets({ peak, floors, seededStart = null, maintenance = 0 }) {
  const p = Math.max(0, Math.round(peak || 0));
  const f = Math.max(0, Math.round(floors || 0));
  const top = Math.max(p, f);
  let start = Math.max(f, top - BLOCK.week1BelowPeak);
  if (Number.isFinite(seededStart) && seededStart > 0) {
    start = Math.min(top, Math.max(f, Math.round(seededStart), top - BLOCK.week1BelowPeak));
  }
  const climbWeeks = BLOCK.peakWeek - 1;
  const weeks = [];
  for (let i = 0; i < BLOCK.peakWeek; i++) {
    weeks.push(start + Math.round(((top - start) * i) / climbWeeks));
  }
  // The even climb never needs more than +2 a week from a start within 8 of
  // the peak; this guard keeps any rounding inside the tested step.
  for (let i = 1; i < weeks.length; i++) {
    const step = weeks[i] - weeks[i - 1];
    if (step > ROLE_TARGETS.focus.maxClimb) weeks[i] = weeks[i - 1] + ROLE_TARGETS.focus.maxClimb;
  }
  const recovery = Math.max(Math.round(maintenance || 0), Math.round(top * BLOCK.recoveryWeekShare));
  weeks.push(Math.min(top, recovery));
  return weeks;
}

/** The planned weekly step at a week (0 once the peak is reached), for the check-in card. */
export function plannedStep(weeks, weekIndex) {
  if (!Array.isArray(weeks) || weekIndex < 1 || weekIndex >= BLOCK.peakWeek) return 0;
  return Math.max(0, Math.min(CHECKIN_STEPS.plannedClimb + 1, weeks[weekIndex] - weeks[weekIndex - 1]));
}
