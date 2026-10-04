/**
 * readiness.js -- D219: the readiness check (design 4.14,
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md).
 *
 * The promise, stated so it can be tested: at the person's usual spacing
 * (their own gaps once known, otherwise the typical week for their number of
 * days), every session in every week of the block, the heaviest weeks
 * included, starts with every muscle it trains estimated recovered (the
 * model's 90%, the screens' meaning of the word).
 *
 * This module simulates a block with the recovery model's own decay curve
 * (muscleRecoveryModel.recoveredFractionAt): each week's per-session loads,
 * that week's effort target, the spacing. It reports every reading at the
 * start of every session for every muscle the session trains, and which
 * fail. What to do about a failure (re-order, split heavy and light, another
 * session, and only then fewer sets, never below the growth floor) is the
 * planner's job. Pure: no I/O, no clock, no randomness; times are hours from
 * the block's first session.
 */
import { recoveredFractionAt } from '../recovery/muscleRecoveryModel';
import { LOOKBACK_DAYS } from '../recovery/constants';
import { ROTATION } from './science';
import { trains, RECOVERED_SHARE_OF_CLOCK } from './rotation';

const MS_PER_HOUR = 60 * 60 * 1000;
const LOOKBACK_HOURS = LOOKBACK_DAYS * 24;
// A reading counts as recovered at the model's own threshold: 89.5% of the
// residual cleared, which rounds to the screens' 90% (muscleRecoveryModel
// READY_FRACTION).
export const RECOVERED_FRACTION = RECOVERED_SHARE_OF_CLOCK;

/**
 * @param {object} args
 * @param {number[]} args.order                    session indexes in rotation order
 * @param {Array<Array<{direct: object, fractional: object}>>} args.weekLoads  per week, each session's load by session index
 * @param {number[]} args.rirLadder                the block's effort target per week
 * @param {number[]} args.layout                   hours from each position's session start to the next one's
 * @param {(muscle: string, fractionalSets: number, rirTarget: number) => number} args.hoursFor
 * @returns {{ readings: Array<{ week: number, position: number, session: number, muscle: string, fraction: number, recovered: boolean }>,
 *             failures: Array<object>, passes: boolean }}
 */
export function simulateBlock({ order, weekLoads, rirLadder, layout, hoursFor }) {
  const n = order.length;
  const history = {}; // muscle -> [{ endMs, sets, hoursT }]
  const readings = [];
  let startHours = 0;
  for (let w = 0; w < weekLoads.length; w++) {
    const loads = weekLoads[w] || [];
    const rir = Array.isArray(rirLadder) ? rirLadder[Math.min(w, rirLadder.length - 1)] : null;
    for (let p = 0; p < n; p++) {
      const session = order[p];
      const load = loads[session] || { direct: {}, fractional: {} };
      const atMs = startHours * MS_PER_HOUR;
      // Read every muscle this session trains at its start.
      for (const m of Object.keys(load.fractional || {}).sort()) {
        if (!trains(load, m)) continue;
        const past = (history[m] || []).filter((h) => h.endMs <= atMs && atMs - h.endMs <= LOOKBACK_HOURS * MS_PER_HOUR);
        const fraction = past.length ? recoveredFractionAt(past, atMs) : 1;
        readings.push({ week: w + 1, position: p, session, muscle: m, fraction, recovered: fraction >= RECOVERED_FRACTION - 1e-9 });
      }
      // Then add this session's fatigue for every muscle it loads.
      const endMs = (startHours + ROTATION.sessionHours) * MS_PER_HOUR;
      for (const m of Object.keys(load.fractional || {}).sort()) {
        const sets = load.fractional[m];
        if (!(sets > 0)) continue;
        const hoursT = hoursFor(m, sets, rir);
        (history[m] = history[m] || []).push({ endMs, sets, hoursT });
      }
      startHours += layout[p % layout.length];
    }
  }
  const failures = readings.filter((r) => !r.recovered);
  return { readings, failures, passes: failures.length === 0 };
}

/**
 * The lowest reading per muscle across the block (for "Quads: estimated about
 * 85% recovered at the start of Lower B in your usual week").
 */
export function lowestByMuscle(readings) {
  const out = {};
  for (const r of readings) {
    if (!out[r.muscle] || r.fraction < out[r.muscle].fraction) out[r.muscle] = r;
  }
  return out;
}
