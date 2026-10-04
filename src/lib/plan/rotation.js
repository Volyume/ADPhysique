/**
 * rotation.js -- D219: the order of a plan's sessions, fixed when the plan is
 * built and good whatever the spacing (design 4.6,
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md; S F7).
 *
 * There are no scheduled training days, so the order is scored against
 * several spacings at once: back to back (24 hours a slot), the typical week
 * for the number of sessions, an even week (168 / N), and, once known, the
 * person's own gaps. For every muscle and every session that trains it (2 or
 * more direct sets, or 6 or more fractional), the hours until the muscle's
 * next session in CYCLIC order (the wrap from the last session to the first
 * included) are compared with the hours the model says the muscle needs to
 * read 90% recovered (0.895 of its clock, the screens' meaning of
 * "recovered"), at the block's peak dose and lowest effort target:
 *
 *   shortfall = max(0, 1 - H / T90)
 *   recovery  = sum of w x (a_B2B s_B2B^2 + a_TYP s_TYP^2 + a_EVEN s_EVEN^2 + a_OWN s_OWN^2)
 *   w         = clamp(F_next / 6, 0.25, 2), the size of the next exposure
 *   clash     = the C16 law 5 term (no two near-identical sessions next to
 *               each other), now including the wrap pair
 *
 * Every order is searched with any session leading (at most 720 for six
 * sessions); ties keep the authored order. The clock function is passed in,
 * so this module never reads the recovery model itself and stays pure.
 */
import { EXPOSURE, ROTATION } from './science';

const CLASH_BASE = 1000;
const TIE = 1e-9;
// The model reads "recovered" at 89.5% of the residual cleared
// (muscleRecoveryModel READY_FRACTION): on a linear decay that is 0.895 of
// the clock.
export const RECOVERED_SHARE_OF_CLOCK = 0.895;

/** Does a session's load train a muscle (one definition everywhere, design 4.6)? */
export function trains(load, muscle) {
  const d = load?.direct?.[muscle] || 0;
  const f = load?.fractional?.[muscle] || 0;
  return d >= EXPOSURE.minDirect || f >= EXPOSURE.minFractional;
}

/**
 * The gap layouts an order is scored against. `layout[p]` is the hours from
 * the session in position p to the one in position p + 1 (cyclic).
 *
 * @param {number} n               sessions in the rotation
 * @param {number[]} typical       the typical week for n (recovery/constants TYPICAL_WEEK_GAP_HOURS[n])
 * @param {number[]|null} [own]    the person's own median gap after each position, when known
 */
export function spacingLayouts(n, typical, own = null) {
  const layouts = {
    backToBack: new Array(n).fill(ROTATION.backToBackSlotHours),
    typical: Array.isArray(typical) && typical.length === n ? [...typical] : new Array(n).fill(168 / n),
    even: new Array(n).fill(168 / n),
  };
  if (Array.isArray(own) && own.length === n && own.every((h) => Number.isFinite(h) && h > 0)) {
    layouts.own = [...own];
  }
  return layouts;
}

/** The scenario weights: with the person's own gaps 0.25 / 0.15 / 0.10 / 0.5, otherwise 0.5 / 0.35 / 0.15. */
export function scenarioWeights(layouts) {
  return layouts.own ? ROTATION.weightsWithOwnGaps : ROTATION.weights;
}

const exposureWeight = (fractional) => Math.min(
  ROTATION.exposureWeightMax,
  Math.max(ROTATION.exposureWeightMin, (fractional || 0) / ROTATION.exposureWeightDivisor),
);

/** The C16 law 5 clash between two neighbouring sessions (sequenceSessions.adjacencyTerm, rescaled). */
function clashBetween(a, b) {
  const qa = {};
  const qb = {};
  for (const [m, s] of Object.entries(a?.direct || {})) if (s >= EXPOSURE.minDirect) qa[m] = s;
  for (const [m, s] of Object.entries(b?.direct || {})) if (s >= EXPOSURE.minDirect) qb[m] = s;
  const ta = Object.values(qa).reduce((x, y) => x + y, 0);
  const tb = Object.values(qb).reduce((x, y) => x + y, 0);
  const smaller = Math.min(ta, tb);
  if (smaller <= 0) return 0;
  let shared = 0;
  for (const [m, s] of Object.entries(qa)) if (qb[m] != null) shared += Math.min(s, qb[m]);
  const overlap = shared / smaller;
  return overlap > 0.5 ? CLASH_BASE * (1 + (overlap - 0.5)) : 0;
}

/**
 * Prepare a fast scorer for one set of session loads: every muscle's clock,
 * exposure weight and the clash between every pair of sessions depend on
 * the loads, not on the order, so they are worked out once here and each
 * order then costs only its gap arithmetic.
 *
 * @param {object} args
 * @param {Array<{direct: object, fractional: object}>} args.loads  each session's peak-week load, by session index
 * @param {object} args.layouts          spacingLayouts output
 * @param {(muscle: string, fractionalSets: number) => number} args.hoursFor  the muscle's recovery clock in hours
 * @param {string[]} [args.muscles]      the muscles to score (default: every muscle in the loads)
 * @returns {(order: number[]) => { recovery: number, clash: number, total: number, perMuscle: object }}
 */
export function prepareRotation({ loads, layouts, hoursFor, muscles = null }) {
  const n = loads.length;
  const weights = scenarioWeights(layouts);
  const scenarios = Object.keys(layouts).filter((k) => (weights[k] ?? 0) > 0).map((k) => ({ a: weights[k], layout: layouts[k] }));
  const list = muscles || Array.from(new Set(loads.flatMap((l) => [
    ...Object.keys(l?.direct || {}), ...Object.keys(l?.fractional || {}),
  ]))).sort();
  // Per muscle, per session: does it train it, its T90, and its weight as a "next" exposure.
  const per = list.map((m) => {
    const trainsIn = new Array(n).fill(false);
    const t90 = new Array(n).fill(0);
    const w = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (!trains(loads[i], m)) continue;
      trainsIn[i] = true;
      const dose = loads[i]?.fractional?.[m] || loads[i]?.direct?.[m] || 0;
      t90[i] = RECOVERED_SHARE_OF_CLOCK * hoursFor(m, dose);
      w[i] = exposureWeight(dose);
    }
    return { m, trainsIn, t90, w };
  });
  const clash = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 0 : clashBetween(loads[i], loads[j]))));
  // Hours from position p over d slots, per scenario (cumulative sums).
  const spans = scenarios.map(({ layout }) => {
    const table = [];
    for (let p = 0; p < n; p++) {
      const row = [0];
      for (let d = 1; d <= n; d++) row.push(row[d - 1] + layout[(p + d - 1) % n]);
      table.push(row);
    }
    return table;
  });
  return (order) => {
    let recovery = 0;
    const perMuscle = {};
    for (const { m, trainsIn, t90, w } of per) {
      const positions = [];
      for (let p = 0; p < n; p++) if (trainsIn[order[p]]) positions.push(p);
      if (positions.length === 0) continue;
      let mine = 0;
      for (let e = 0; e < positions.length; e++) {
        const p = positions[e];
        const next = positions[(e + 1) % positions.length];
        const distance = positions.length === 1 ? n : ((next - p + n) % n) || n;
        const T90 = t90[order[p]];
        if (!(T90 > 0)) continue;
        let term = 0;
        for (let k = 0; k < scenarios.length; k++) {
          const H = spans[k][p][distance] - ROTATION.sessionHours;
          const short = Math.max(0, 1 - H / T90);
          term += scenarios[k].a * short * short;
        }
        mine += w[order[next]] * term;
      }
      perMuscle[m] = mine;
      recovery += mine;
    }
    let clashTotal = 0;
    if (n > 1) {
      for (let p = 0; p < n; p++) {
        if (n === 2 && p === 1) break; // two sessions have one neighbour pair, counted once
        clashTotal += clash[order[p]][order[(p + 1) % n]];
      }
    }
    return { recovery, clash: clashTotal, total: recovery + clashTotal, perMuscle };
  };
}

/** Score one order (prepareRotation for a single use). */
export function rotationPenalty({ loads, order, layouts, hoursFor, muscles = null }) {
  return prepareRotation({ loads, layouts, hoursFor, muscles })(order);
}

/** Every permutation of 0..n-1 in lexicographic order (the identity, the authored order, first). Memoised per n; treat as read-only. */
const PERMUTATIONS = new Map();
export function permutations(n) {
  if (PERMUTATIONS.has(n)) return PERMUTATIONS.get(n);
  const out = [];
  const a = Array.from({ length: n }, (_, i) => i);
  const used = new Array(n).fill(false);
  const cur = [];
  const rec = () => {
    if (cur.length === n) { out.push([...cur]); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(a[i]); rec(); cur.pop(); used[i] = false;
    }
  };
  rec();
  PERMUTATIONS.set(n, out);
  return out;
}

/**
 * The best order: the lowest total penalty among the orders `accept` allows
 * (all of them by default), the authored order winning a tie.
 *
 * @returns {{ order: number[], recovery: number, clash: number, total: number, perMuscle: object, accepted: boolean }}
 */
export function bestOrder({ loads, layouts, hoursFor, muscles = null, accept = null }) {
  const n = loads.length;
  const score = prepareRotation({ loads, layouts, hoursFor, muscles });
  let best = null;
  let fallback = null;
  for (const order of permutations(n)) {
    const candidate = { order, ...score(order) };
    if (!fallback || candidate.total < fallback.total - TIE) fallback = candidate;
    if (accept && !accept(order)) continue;
    if (!best || candidate.total < best.total - TIE) best = candidate;
  }
  if (best) return { ...best, accepted: true };
  return { ...fallback, accepted: false };
}
