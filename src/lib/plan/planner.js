/**
 * planner.js -- D219: the plan builder, rebuilt on the evidence (design
 * sections 3 to 4.14, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md; register D219 and the founder's six answers).
 *
 * For each candidate week structure (families.js; a physique division keeps
 * its own session list) the planner:
 *   1. gives every muscle its role and peak (roles.js);
 *   2. decides how many sessions a week each muscle needs: the fewest that
 *      keep every session under its caps, two when the week is 12 sets or
 *      more and there are 4 or more sessions (design 4.4), spaced as evenly
 *      as the cycle allows (families.placeExposures);
 *   3. places the peak week's sets where they add the most expected growth,
 *      inside every cap, the D45 ceilings and the person's session length
 *      (allocate.js);
 *   4. orders the rotation for any spacing, back-to-back days and the wrap
 *      included (rotation.js), and gives a muscle trained twice a light and a
 *      heavy session, the heavy one followed by the longer gap, when it
 *      cannot clear its full dose before its next session (design 4.5 step 2);
 *   5. builds every week of the block (targets.js, prescribe.js) and checks
 *      the readiness promise at the person's usual spacing (readiness.js),
 *      fixing a failure by structure first (the order, the light and heavy
 *      split, another session) and by volume only last, never below the
 *      muscle's growth floor, with the population clocks so that what the
 *      app learns about a person never changes their weekly sets.
 * Then it chooses: feasible first (every standard muscle at or above its
 * growth floor where any structure can reach it), then the readiness promise,
 * then the rotation penalty within 0.05 of the best, then the expected
 * growth, then the most recognisable structure, then the authored order.
 *
 * Fixed-structure mode (`inputs.fixedSessions`, register D219 build ruling 5):
 * a library or kit plan keeps its authored sessions and exercises. The only
 * family is those sessions, in that order (key 'fixed'); a muscle's sessions
 * are exactly the sessions whose exercises train it, so the session-count
 * search and the readiness fixes that add or remove a session do not run
 * (nor does the ramp, which would drop an exercise); every authored exercise
 * is kept in its session and its order, opened at its 2-set floor at least;
 * the sets above the floors, the climb, the light and heavy split, the
 * rotation order and the readiness check run as for any plan.
 *
 * The output keeps planEngine.generatePlan's shape (so the existing save and
 * activation paths can write it) and adds `v2`: the facts the plan carries
 * (roles, every week's targets, the session shares, the session caps, the
 * gap ranks, the factor it was built on, the readiness found).
 *
 * Pure and deterministic: no I/O, no clock, no randomness. It reads the
 * recovery model (allowed for the planner; the check-in path never imports
 * this file).
 */
import { ROLE } from './bands';
import { assignRoles, PLAN_MUSCLES } from './roles';
import { familiesFor, divisionFamily, sessionsAllowing, placeExposures } from './families';
import { allocatePeakWeek } from './allocate';
import { bestOrder, prepareRotation, rotationPenalty, permutations, spacingLayouts, RECOVERED_SHARE_OF_CLOCK } from './rotation';
import { simulateBlock, lowestByMuscle } from './readiness';
import { blockTargets } from './targets';
import { prescribeWeek, fillSession } from './prescribe';
import { orderSession } from './sessionOrder';
import {
  BLOCK, PER_SESSION, HEAVY_LIGHT, FREQUENCY, RAMP, ROLE_TARGETS, OBJECTIVE, SETS_PER_EXERCISE,
  SESSION_CEILINGS, LEARNED_FACTOR, ROTATION, exerciseCap, exercisesAllowed,
} from './science';
import { recoveryHours, TYPICAL_WEEK_GAP_HOURS } from '../recovery/constants';
import { repRangeFor, restFor } from '../exercise/prescription';

export const PLANNER_VERSION = 2;
const FULL_BODY_TWICE = new Set(['quads', 'hamstrings', 'glutes', 'chest', 'back']);
// Founder answer 2026-10-05, "Big muscles first": when time is short, chest,
// back, quads, hamstrings and glutes reach their growth floor before a smaller
// muscle gets another session (register D219).
const BIG_MUSCLES = FULL_BODY_TWICE;
const MAX_FIX_ROUNDS = 8;

const muscleIndex = (m) => {
  const i = PLAN_MUSCLES.indexOf(m);
  return i < 0 ? PLAN_MUSCLES.length : i;
};

/**
 * @param {object} inputs
 * @param {number} inputs.daysPerWeek
 * @param {number} [inputs.sessionLengthMinutes]
 * @param {string} [inputs.equipment]
 * @param {string} [inputs.goal]
 * @param {string} [inputs.experience]
 * @param {string} [inputs.nutritionPhase]
 * @param {string} [inputs.recoveryRating]
 * @param {string[]} [inputs.focusMuscles]          muscle keys, the person's order
 * @param {string[]} [inputs.addedMuscles]
 * @param {boolean} [inputs.firstBlock]
 * @param {Object<string, number>} [inputs.loggedWeekly]  fractional sets a week logged over the last 4 weeks
 * @param {Object<string, Array<object>>} inputs.choices   per muscle, the catalogue's exercises for the person's kit
 * @param {object} [inputs.divisionMatrix]          planEngine DIVISION_MATRIX
 * @param {number[]|null} [inputs.ownGaps]          the person's own median gap after each position
 * @param {number|null} [inputs.learnedFactor]      already through the learner's gate and S F14's safeguards
 * @param {boolean} [inputs.isStrength]
 * @param {Array<{ name: string, routineId?: string|null, exercises: Array<{ exerciseId?: string|null, name: string, muscle: string, kind?: string, credits?: Object<string, number> }> }>} [inputs.fixedSessions]
 *        fixed-structure mode (register D219, build ruling 5), for a library or kit plan that keeps its authored
 *        sessions and exercises: 2 to 6 sessions, in the person's order, each with its exercises in their order.
 *        The only family is those sessions (key 'fixed'); a muscle's sessions are exactly the sessions whose
 *        exercises train it; every exercise is kept, in its session and its order, opened at its 2-set floor at
 *        least; the planner sets the sets, the climb, the light and heavy split and the rotation order around
 *        them. `choices` and `daysPerWeek` are not read. Throws a RangeError for fewer than 2 or more than 6
 *        sessions and a TypeError for a session without an exercise list or an exercise without a muscle: a plan
 *        is never built over a different structure than the person's. Absent or empty: the planner is unchanged.
 */
export function buildPlan(inputs) {
  const fixed = prepareFixed(inputs.fixedSessions);
  const n = fixed ? fixed.family.sessions.length : clampDays(inputs);
  const focusMuscles = (inputs.focusMuscles || []).filter((m) => PLAN_MUSCLES.includes(m));
  const division = fixed ? null : divisionFamily(inputs.divisionMatrix, inputs.goal, n);
  const families = fixed ? [fixed.family] : (division ? [division] : familiesFor(n, { focusMuscles }));
  const assigned = assignRoles({
    goal: inputs.goal,
    focusMuscles,
    addedMuscles: inputs.addedMuscles,
    experience: inputs.experience,
    firstBlock: inputs.firstBlock !== false,
    nutritionPhase: inputs.nutritionPhase,
    // A division's session list no longer limits which muscles are trained
    // (founder order 2026-10-10, the standard floor): a muscle it leaves out
    // trains in its half's sessions (families.sessionsAllowing).
    trainedMuscles: fixed ? fixed.muscles : null,
  });
  const roles = fixed ? heldWhereAuthored(assigned, fixed) : assigned;
  const factor = Number.isFinite(inputs.learnedFactor)
    ? Math.min(LEARNED_FACTOR.max, Math.max(LEARNED_FACTOR.min, inputs.learnedFactor))
    : null;
  const ctx = {
    n,
    roles,
    fixed,
    choices: inputs.choices || {},
    equipment: inputs.equipment || 'full_gym',
    sessionLengthMinutes: inputs.sessionLengthMinutes > 0 ? inputs.sessionLengthMinutes : 60,
    typical: TYPICAL_WEEK_GAP_HOURS[n],
    ownGaps: Array.isArray(inputs.ownGaps) && inputs.ownGaps.length === n ? inputs.ownGaps : null,
    loggedWeekly: inputs.loggedWeekly || null,
    factor,
    lowestRir: Math.min(...BLOCK.rirLadder.slice(0, BLOCK.peakWeek)),
    hoursPerson: (m, sets, rir) => recoveryHours(m, {
      sets, rirTarget: rir, recoveryRating: inputs.recoveryRating || 'average', personalFactor: factor,
    }),
    hoursPopulation: (m, sets, rir) => recoveryHours(m, { sets, rirTarget: rir, recoveryRating: 'average', personalFactor: null }),
  };
  // Every decision that sets a weekly target (the structure, the sessions per
  // muscle, the light and heavy split, the readiness check's fixes) runs on the
  // population clocks, so what the app learns about a person, and their own
  // recovery answer, never changes a weekly target (design 4.13: the factor
  // "never changes a weekly target"; 4.2: the recovery answer moves the clock,
  // not the volume). The person's own clocks then choose the order (below).
  ctx.hoursVolume = ctx.hoursPopulation;
  ctx.personal = factor !== null || (inputs.recoveryRating && inputs.recoveryRating !== 'average');

  const evaluated = families.map((family, index) => ({ index, family, ...evaluateFamily(family, ctx) }));
  const chosen = chooseFamily(evaluated);
  const final = ctx.personal ? personalise(chosen, ctx) : chosen;
  return toPlan({ ...final, recoverySafeMax: recoverySafeMax(final, ctx) }, ctx, inputs, factor);
}

/**
 * Design 4.14 step 4: each muscle's recovery-safe weekly maximum, in direct
 * sets, which the save writes into the plan's weekly rows (`mrv`) so a
 * check-in can never raise a muscle past it (checkinPlacement.js clamps to
 * the rows' `mrv`). It is the most direct sets a week the muscle can take in
 * every training week of the block, the heaviest effort included, with the
 * readiness check still finding every muscle that passed it recovered at the
 * start of each session in the usual week, read in the saved order on the
 * population clocks (the volume step's clocks, 4.13), with every other
 * muscle at its own maximum too, since a check-in raises them together. A
 * muscle the check already finds short of recovered (the growth floor won, or
 * back-to-back days), or a maintenance muscle (a check-in never raises one),
 * keeps its planned peak. It stops where the sessions have no room for
 * another set.
 */
const SAFE_MAX_SEARCH = 12;
function recoverySafeMax(chosen, ctx) {
  const { block, order, state } = chosen;
  const n = order.length;
  const layouts = spacingLayouts(n, ctx.typical, ctx.ownGaps);
  const usual = layouts.own || layouts.typical;
  const served = order.map((si) => block.sessions[si]);
  const facts = { exposureShares: block.exposureShares, sessionCaps: state.sessionCaps };
  const trainingWeeks = BLOCK.peakWeek;
  const readOf = (weekLoads) => simulateBlock({ order, weekLoads, rirLadder: BLOCK.rirLadder, layout: usual, hoursFor: ctx.hoursVolume });
  const failingAtPlan = new Set(readOf(block.weekLoads).failures.map((f) => f.muscle));
  const placedOf = (sets, m) => block.sessions.reduce((a, sess) => a + sess.slots.filter((x) => x.muscle === m).reduce((b, x) => b + (sets[x.id] || 0), 0), 0);
  const out = {};
  for (const m of Object.keys(block.targets).sort()) {
    const peak = Math.max(...block.targets[m].slice(0, trainingWeeks));
    out[m] = peak;
    if (failingAtPlan.has(m) || state.roles[m]?.role === ROLE.MAINTENANCE) continue;
    let placedBefore = placedOf(block.weekSets[trainingWeeks - 1], m);
    for (let X = peak + 1; X <= peak + SAFE_MAX_SEARCH; X++) {
      let placed = 0;
      const weekLoads = block.weekLoads.map((loads, w) => {
        if (w >= trainingWeeks) return loads;
        const weekTargets = Object.fromEntries(Object.entries(block.targets).map(([j, list]) => [j, j === m ? Math.max(list[w], X) : list[w]]));
        const res = prescribeWeek({ sessions: served, weekTargets, facts });
        if (w === trainingWeeks - 1) placed = placedOf(res.sets, m);
        return block.sessions.map((sess) => ({ direct: res.perSession[sess.id]?.direct || {}, fractional: res.perSession[sess.id]?.fractional || {} }));
      });
      if (placed <= placedBefore) break;
      if (readOf(weekLoads).failures.some((f) => !failingAtPlan.has(f.muscle))) break;
      placedBefore = placed;
      out[m] = X;
    }
  }
  // A check-in raises every muscle that can take it at once, and one muscle's
  // sets credit another (a squat's half set for the glutes), so the maxima
  // must hold together: while serving every muscle at its maximum finds a
  // muscle short that the plan found recovered, that muscle and the muscles
  // whose exercises credit it each give back a set above their peaks. If that
  // cannot settle it, every muscle stays at its planned peak.
  const peakOf = (m) => Math.max(...block.targets[m].slice(0, trainingWeeks));
  const providers = {};
  for (const sess of block.sessions) {
    for (const x of sess.slots) {
      for (const [j, c] of Object.entries(x.credits || {})) {
        if (j !== x.muscle && c > 0) (providers[j] = providers[j] || new Set()).add(x.muscle);
      }
    }
  }
  // Raised together, a muscle's maximum must also still fit the plan's own
  // exercises (another muscle's credit can fill its session's cap), or the
  // check-in would open an exercise the readiness check never read.
  const joint = () => {
    const short = new Set();
    const weekLoads = block.weekLoads.map((loads, w) => {
      if (w >= trainingWeeks) return loads;
      const weekTargets = Object.fromEntries(Object.entries(block.targets).map(([j, list]) => [j, Math.max(list[w], out[j] ?? list[w])]));
      const res = prescribeWeek({ sessions: served, weekTargets, facts });
      for (const [j, n] of Object.entries(res.shortfall || {})) if (n > 0 && out[j] > block.targets[j][w]) short.add(j);
      return block.sessions.map((sess) => ({ direct: res.perSession[sess.id]?.direct || {}, fractional: res.perSession[sess.id]?.fractional || {} }));
    });
    return { weekLoads, short };
  };
  for (let guard = 0; ; guard++) {
    if (!Object.keys(out).some((m) => out[m] > peakOf(m))) break;
    const { weekLoads, short } = joint();
    const fresh = Array.from(new Set(readOf(weekLoads).failures.map((f) => f.muscle).filter((m) => !failingAtPlan.has(m)))).sort();
    if (fresh.length === 0 && short.size === 0) break;
    const give = new Set();
    for (const m of short) if (out[m] > peakOf(m)) give.add(m);
    for (const f of fresh) for (const m of [f, ...(providers[f] || [])]) if (out[m] > peakOf(m)) give.add(m);
    if (give.size === 0 || guard >= SAFE_MAX_SEARCH * 4) {
      for (const m of Object.keys(out)) out[m] = peakOf(m);
      break;
    }
    for (const m of give) out[m] -= 1;
  }
  return out;
}

/**
 * The person's own clocks (their recovery answer and the learned factor,
 * design 4.13) choose the order among the orders that keep every split
 * muscle's heavy session before its longest gap, and the readiness the plan
 * reports is read with them. No set count changes here.
 */
function personalise(chosen, ctx) {
  const { family, alloc, block, exposures, state } = chosen;
  const n = family.sessions.length;
  const layouts = spacingLayouts(n, ctx.typical, ctx.ownGaps);
  const usual = layouts.own || layouts.typical;
  const loadsOf = (a) => a.sessions.map((sess) => sessionLoad(sess.slots));
  const hoursPeakPerson = (m, sets) => ctx.hoursPerson(m, sets, ctx.lowestRir);
  const split = Object.keys(state.lightCaps || {});
  const heavyHolds = (order) => split.every((m) => heavyBeforeLongestGap(m, exposures, state.lightCaps[m], order, usual));
  const current = simulate(block, chosen.order, usual, ctx.hoursPerson);
  const best = readinessOrder(block, alloc, layouts, usual, hoursPeakPerson, ctx.hoursPerson, loadsOf, heavyHolds);
  if (!best || best.order.join() === chosen.order.join()) {
    return { ...chosen, sim: current, readinessPasses: current.passes };
  }
  // The new order's block, prescribed in that order (as the logger serves it),
  // is the one read and kept.
  const moved = buildBlock(alloc, exposures, n, ctx, state.sessionCaps, best.order);
  const sim = simulate(moved, best.order, usual, ctx.hoursPerson);
  if (readinessDeficit(sim) >= readinessDeficit(current) - 1e-9) {
    return { ...chosen, sim: current, readinessPasses: current.passes };
  }
  return { ...chosen, order: best.order, block: moved, sim, readinessPasses: sim.passes };
}

/**
 * In this order, is the muscle's longest gap after a heavy (uncapped)
 * exposure? Equal gaps count as equal: a light exposure may share the longest
 * gap with a heavy one, never have it alone.
 */
function heavyBeforeLongestGap(m, exposures, lightCaps, order, usual) {
  const list = exposures[m] || [];
  if (list.length < 2 || !lightCaps) return true;
  const n = order.length;
  const pos = list.map((x) => order.indexOf(x)).filter((p) => p >= 0).sort((a, b) => a - b);
  let heavy = -Infinity;
  let light = -Infinity;
  for (let i = 0; i < pos.length; i++) {
    const p = pos[i];
    const q = pos[(i + 1) % pos.length];
    const d = ((q - p + n) % n) || n;
    let h = 0;
    for (let j = 0; j < d; j++) h += usual[(p + j) % n];
    if (Number.isFinite(lightCaps[order[p]])) light = Math.max(light, h);
    else heavy = Math.max(heavy, h);
  }
  return light === -Infinity || heavy + 1e-9 >= light;
}

function clampDays(inputs) {
  let n = Math.max(2, Math.min(6, Math.round(inputs.daysPerWeek || 3)));
  // The generator's existing rule: a beginner trains at most 4 days.
  if (inputs.experience === 'beginner') n = Math.min(n, 4);
  return n;
}

// ── fixed-structure mode (register D219, build ruling 5) ────────────────

// The week's rotation search is exhaustive and built for 2 to 6 sessions
// (design 4.6), the same range every generated plan has (clampDays).
const FIXED_SESSIONS = Object.freeze({ min: 2, max: 6 });

/**
 * The person's own structure, checked and indexed: a library or kit plan's
 * sessions and exercises, which the planner sets sets, climb and order around
 * and never adds to, removes from or reorders inside. Null when there is none
 * (the planner builds as ever). Throws, rather than build over a different
 * structure than the person's, when the list cannot be one.
 *
 * @returns {null|{ family: object, sessionChoices: Array<Object<string, object[]>>, muscles: string[],
 *   sessionsFor: (m: string) => number[], floorSum: (m: string, si: number) => number, floorNeed: (m: string) => number }}
 */
function prepareFixed(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (list.length < FIXED_SESSIONS.min || list.length > FIXED_SESSIONS.max) {
    throw new RangeError(`buildPlan: fixedSessions needs ${FIXED_SESSIONS.min} to ${FIXED_SESSIONS.max} sessions, got ${list.length}`);
  }
  const sessionChoices = [];
  const sessions = [];
  const muscles = [];
  list.forEach((sess, si) => {
    if (!sess || !Array.isArray(sess.exercises)) throw new TypeError(`buildPlan: fixedSessions[${si}] needs an exercises list`);
    const byMuscle = {};
    sess.exercises.forEach((e, i) => {
      if (!e || typeof e.muscle !== 'string' || e.muscle === '' || typeof e.name !== 'string') {
        throw new TypeError(`buildPlan: fixedSessions[${si}].exercises[${i}] needs a name and a muscle`);
      }
      // authoredIndex: the exercise's place in its session, so the session's
      // own order can be put back after the sets are placed.
      (byMuscle[e.muscle] = byMuscle[e.muscle] || []).push({ ...e, authoredIndex: i });
      if (!muscles.includes(e.muscle)) muscles.push(e.muscle);
    });
    sessionChoices.push(byMuscle);
    sessions.push({
      name: typeof sess.name === 'string' && sess.name ? sess.name : `Session ${si + 1}`,
      routineId: sess.routineId ?? null,
      muscles: Object.keys(byMuscle),
    });
  });
  const floorSum = (m, si) => SETS_PER_EXERCISE.floor * (sessionChoices[si]?.[m]?.length || 0);
  return {
    family: { key: 'fixed', label: 'Your own sessions', recognisable: 0, fixed: true, sessions },
    sessionChoices,
    muscles,
    // Exactly the sessions whose exercises train the muscle, in session order.
    sessionsFor: (m) => sessionChoices.map((by, si) => (by[m] ? si : -1)).filter((si) => si >= 0),
    floorSum,
    // The most sets the person's own exercises for a muscle hold at their floors in one session.
    floorNeed: (m) => Math.max(0, ...sessionChoices.map((_by, si) => floorSum(m, si))),
  };
}

/**
 * An authored exercise is always kept, so every authored muscle needs a role
 * that trains it directly. A muscle the goal would only hold on other work
 * (traps, forearms, front delts, adductors), an opt-in muscle the person has
 * not added (neck, tibialis) or a key outside the plan's muscles is held at
 * maintenance on its own exercise: kept at its floors, never grown (design
 * 4.2: the person's own exercise is the person's choice to train it).
 */
function heldWhereAuthored(roles, fixed) {
  const out = { ...roles };
  for (const m of fixed.muscles) {
    if (out[m]?.direct) continue;
    out[m] = {
      role: ROLE.MAINTENANCE,
      weight: 0,
      peak: out[m]?.peak ?? ROLE_TARGETS.maintenance.target,
      growthFloor: 0,
      direct: true,
    };
  }
  return out;
}

// ── one family ──────────────────────────────────────────────────────────

function evaluateFamily(family, ctx) {
  const n = family.sessions.length;
  const roles = { ...ctx.roles };
  // Fixed-structure mode: the person's own sessions and exercises (see
  // buildPlan). A muscle's sessions are exactly the sessions whose exercises
  // train it, its exercises are the ones authored, and nothing below adds a
  // session, removes one or drops an exercise.
  const fixed = ctx.fixed || null;
  const allowedBy = {};
  for (const m of Object.keys(roles)) {
    if (!roles[m].direct) continue;
    // The sessions a muscle's standard needs (design 4.4: two from 12 weekly
    // sets with 4 or more sessions); a division list naming fewer opens the
    // muscle's half of the body to it (founder order 2026-10-10).
    // One session holds at most the muscle's allowed exercises at the
    // isolation cap, under the direct cap; a standard that does not fit in
    // one session needs two (biceps, triceps and calves at 8 with two
    // exercises of 3 sets; back at 12 under the cap of 8).
    const oneSessionRoom = Math.min(PER_SESSION.directCap, exercisesAllowed(m) * SETS_PER_EXERCISE.capIsolation);
    const standardNeeds = roles[m].role !== ROLE.MAINTENANCE
      && ((roles[m].peak >= FREQUENCY.preferTwoExposuresFromWeekly && n >= FREQUENCY.preferTwoExposuresMinSessions)
        || (BIG_MUSCLES.has(m) && n >= 3)
        || (roles[m].directFloor || 0) > oneSessionRoom) ? 2 : 1;
    allowedBy[m] = fixed ? fixed.sessionsFor(m) : sessionsAllowing(family, m, { focus: roles[m].role === ROLE.FOCUS, atLeast: standardNeeds });
  }
  const trainable = Object.keys(allowedBy).filter((m) => allowedBy[m].length > 0 && (fixed || (ctx.choices[m] || []).length > 0))
    .sort((a, b) => muscleIndex(a) - muscleIndex(b));


  // How many sessions a week each muscle gets (design 4.4): the fewest that
  // keep every session under its cap. Start at one (two when the muscle's
  // peak is 12 or more and there are 4 or more sessions, Ochi 2018), and add
  // one only while a session cap binds and the muscle is below its peak.
  const k = {};
  for (const m of trainable) {
    const two = roles[m].peak >= FREQUENCY.preferTwoExposuresFromWeekly && n >= FREQUENCY.preferTwoExposuresMinSessions;
    // Lead ruling (D219 build, the founder's "in line with what elite coaches
    // would do"): a full-body week trains the big five (quads, hamstrings,
    // glutes, chest, back) in at least two sessions, as full-body programming
    // does; design 4.4's preference for two starts only at four sessions.
    const fullBodyBig = family.key.startsWith('full_body') && FULL_BODY_TWICE.has(m);
    // Founder order 2026-10-10 (the standard floor; 05-DIVISION-STANDARDS.md
    // section 2): the big muscles train twice a week at three or more
    // sessions in every structure, a division's included.
    const bigTwice = BIG_MUSCLES.has(m) && n >= 3 && roles[m].role !== ROLE.MAINTENANCE;
    const floorNeedsTwo = roles[m].role !== ROLE.MAINTENANCE
      && (roles[m].directFloor || 0) > Math.min(PER_SESSION.directCap, exercisesAllowed(m) * SETS_PER_EXERCISE.capIsolation);
    k[m] = fixed ? allowedBy[m].length : Math.min(allowedBy[m].length, two || fullBodyBig || bigTwice || floorNeedsTwo ? 2 : 1);
  }
  // The two sessions are kept: the search and the readiness fixes never take
  // a big-five muscle of a full-body week below them (the search runs without
  // the clock, so it once traded the quads' second session for a second
  // rear-delt exercise, and the clock then left the quads one squat a week;
  // review 2026-10-05, finding 6).
  const twiceAtLeast = (m) => !fixed && roles[m].role !== ROLE.MAINTENANCE && allowedBy[m].length >= 2
    && ((BIG_MUSCLES.has(m) && n >= 3)
      || (roles[m].directFloor || 0) > Math.min(PER_SESSION.directCap, exercisesAllowed(m) * SETS_PER_EXERCISE.capIsolation));
  const lowestK = (m) => (twiceAtLeast(m) ? 2 : 1);
  const state = {
    k, lightCaps: {}, forcedSplit: {}, maxSlots: {}, sessionCaps: {}, slowerCaps: {}, standardCaps: {}, roles, placementOrder: family.sessions.map((_, i) => i),
  };

  // Each muscle's sessions, spaced as evenly as the current cycle order allows.
  const exposuresNow = () => {
    const out = {};
    const cost = family.sessions.map((sess) => sess.muscles.length);
    trainable.forEach((m, i) => { out[m] = placeInOrder(allowedBy[m], state.k[m], state.placementOrder, i, cost); });
    return out;
  };

  // `unlimited`: the session-count search below sizes each muscle's sessions
  // for its targets inside the caps and the D45 ceilings, without the
  // person's session length (design 4.4's formula reads the targets and the
  // caps, never the clock); the plan itself is then built with it.
  const run = ({ unlimited = false } = {}) => {
    // A focus muscle that cannot get another session may take 10 direct and
    // 12 fractional sets in one (design 4.3).
    const caps = { ...state.sessionCaps };
    for (const m of trainable) {
      if (state.roles[m].role === ROLE.FOCUS && state.k[m] >= allowedBy[m].length) {
        caps[m] = { direct: PER_SESSION.focusDirectCap, fractional: PER_SESSION.focusFractionalCap };
      } else {
        delete caps[m];
      }
    }
    // Fixed structure: a session whose authored exercises for a muscle hold
    // more than the session cap at their 2-set floors (5 or more exercises of
    // one muscle in a session) keeps them all, so the plan's own cap for the
    // muscle is raised to what they hold: prescribe() reads it, and so serves
    // the very sets the planner placed.
    if (fixed) {
      for (const m of trainable) {
        const need = fixed.floorNeed(m);
        if (need > (caps[m]?.direct ?? PER_SESSION.directCap)) {
          caps[m] = { direct: need, fractional: caps[m]?.fractional ?? PER_SESSION.fractionalCap };
        }
      }
    }
    // A slower recoverer's lower direct cap (design 4.4), where it was found
    // to keep every weekly total (below).
    // A muscle whose standard in its own sets the fractional session cap
    // would deny (another muscle's credited sets fill it, a glute focus's hip
    // thrusts on the hamstrings) takes a higher fractional cap in the plan's
    // own facts (founder order 2026-10-10: the standard is never cut; the cap
    // marks where extra benefit stops being detectable, not a harm). The
    // plan's rows carry it, so the week server places the same sets.
    for (const [m, f] of Object.entries(state.standardCaps || {})) {
      caps[m] = { direct: caps[m]?.direct ?? PER_SESSION.directCap, fractional: Math.max(caps[m]?.fractional ?? PER_SESSION.fractionalCap, f) };
    }
    for (const [m, cap] of Object.entries(state.slowerCaps || {})) {
      caps[m] = { direct: Math.min(caps[m]?.direct ?? PER_SESSION.directCap, cap), fractional: caps[m]?.fractional ?? PER_SESSION.fractionalCap };
    }
    state.sessionCaps = caps;
    const exposures = exposuresNow();
    const alloc = allocatePeakWeek({
      sessionCount: n,
      roles: state.roles,
      exposures,
      choices: ctx.choices,
      sessionChoices: fixed ? fixed.sessionChoices : null,
      lightCaps: state.lightCaps,
      maxSlots: state.maxSlots,
      sessionCaps: state.sessionCaps,
      sessionLengthMinutes: unlimited ? Infinity : ctx.sessionLengthMinutes,
      equipment: ctx.equipment,
      gapAfter: gapAfterSessions(state.placementOrder, ctx.ownGaps || ctx.typical),
      twiceFirst: fixed || !family.key.startsWith('full_body') ? [] : [...FULL_BODY_TWICE],
      bigFirst: [...BIG_MUSCLES],
    });
    balanceSlots(alloc, state.roles, fixed !== null, state.sessionCaps);
    // An exposure that took no sets (it did not fit) is not one: the split
    // and the order read the sessions the muscle is really trained in.
    for (const m of Object.keys(exposures)) {
      exposures[m] = exposures[m].filter((si) => alloc.sessions[si].slots.some((x) => x.muscle === m));
    }
    return { exposures, alloc };
  };

  const sessionRoom = (m, si) => {
    const direct = state.sessionCaps?.[m]?.direct ?? PER_SESSION.directCap;
    if (fixed) {
      // The person's own exercises for m in session si, never thin-equipment.
      const own = fixed.sessionChoices[si]?.[m] || [];
      const focus = state.roles[m]?.role === ROLE.FOCUS;
      return Math.min(direct, own.reduce((a, c) => a + exerciseCap(c.kind, false, { focus }), 0));
    }
    const list = ctx.choices[m] || [];
    const slots = Math.min(exercisesAllowed(m, { focus: state.roles[m]?.role === ROLE.FOCUS }), Number.isFinite(state.maxSlots[m]) ? state.maxSlots[m] : Infinity, list.length);
    const room = list.slice(0, slots).reduce((a, c) => a + exerciseCap(c.kind, list.length === 1, { focus: state.roles[m]?.role === ROLE.FOCUS }), 0);
    return Math.min(direct, room);
  };
  const sessionCapOf = (m, s) => {
    const light = state.lightCaps?.[m]?.[s];
    return Math.min(Number.isFinite(light) ? light : Infinity, sessionRoom(m, s));
  };
  // A light session never takes a focus muscle below its programmed sets
  // (founder rule 2026-10-04: a focus muscle's volume is never cut): where
  // its light caps would, it keeps full sessions and the readiness check
  // reports the tighter recovery instead.
  // Nor does a light session take any growing muscle below its standard in
  // its own sets (founder order 2026-10-10, the standard floor): the split
  // is dropped and the readiness check reports the tighter recovery.
  const keepsFocusFloor = (m, caps) => {
    const r = state.roles[m];
    if (!r || r.role === ROLE.MAINTENANCE || !caps) return true;
    const room = (exposures[m] || []).reduce((a, si) => a + Math.min(Number.isFinite(caps[si]) ? caps[si] : Infinity, sessionRoom(m, si)), 0);
    if (room + 1e-9 < (r.directFloor || 0)) return false;
    if (r.role !== ROLE.FOCUS) return true;
    return room + 1e-9 >= (r.growthFloor || 0);
  };
  // Fixed structure: a light session never holds fewer sets than the person's
  // own exercises for the muscle do at their 2-set floors (every authored
  // exercise is kept), so its cap is raised to them; a cap that then no
  // longer limits the session is no split at all. The readiness check reports
  // the tighter recovery instead, as it does for a focus muscle (below).
  const withAuthoredFloors = (m, caps) => {
    if (!fixed || !caps) return caps;
    const top = state.sessionCaps?.[m]?.direct ?? PER_SESSION.directCap;
    const out = {};
    for (const [si, cap] of Object.entries(caps)) {
      const floored = Math.max(cap, fixed.floorSum(m, Number(si)));
      if (floored < top - 1e-9) out[si] = floored;
    }
    return Object.keys(out).length ? out : null;
  };
  const sparingFocus = (caps) => Object.fromEntries(Object.entries(caps || {})
    .map(([m, c]) => [m, withAuthoredFloors(m, c)])
    .filter(([m, c]) => c && keepsFocusFloor(m, c)));

  // Then search from that start (design 4.4: frequency is the fewest
  // sessions that keep every session under its caps, never raised for its
  // own sake). One session more for a muscle below its peak whose sessions
  // are at their cap, or below its growth floor with no room left in them.
  // One session fewer for a muscle that holds one of the 8 exercises (D45)
  // of a full session where a growing muscle below its floor needs another
  // exercise: a second session for a muscle the presses and pulls already
  // credit (the triceps, the biceps) can cost another muscle the exercise it
  // needs. The search runs inside the caps and the D45 ceilings without the
  // person's session length: with the clock in it, a structure that spends
  // the minutes on cheap isolation sets would beat one with the compound
  // lifts (design 3: time is a limit, never part of the ranking). A move is
  // kept only when every muscle still has an exercise and the plan
  // improves: fewer sets below the floors first (the most important first,
  // floorShortfall), then more expected growth. The plan is then built with
  // the person's session length.
  let { exposures, alloc } = run({ unlimited: true });
  const covered = (a) => trainable.every((m) => a.sessions.some((sess) => sess.slots.some((x) => x.muscle === m)));
  const objectiveOf = (a) => trainable.reduce((sum, m) => {
    const r = state.roles[m];
    if (r.role === ROLE.MAINTENANCE) return sum;
    return sum + (r.weight || 1) * Math.sqrt(Math.max(0, a.weekly[m]?.fractional || 0));
  }, 0);
  const floorOf = (m) => Math.min(state.roles[m].growthFloor || 0, state.roles[m].peak);
  const improves = (a, b) => {
    const fa = floorShortfall(state.roles, a.weekly, trainable);
    const fb = floorShortfall(state.roles, b.weekly, trainable);
    if (!sameVector(fa, fb)) return vectorLess(fa, fb);
    return objectiveOf(a) > objectiveOf(b) + 1e-9;
  };
  const rejected = new Set();
  // Fixed structure: no search; the person's sessions are the sessions.
  for (let iter = 0; iter < (fixed ? 0 : 4 * trainable.length); iter++) {
    const W = (m) => alloc.weekly[m]?.fractional || 0;
    const raises = trainable.filter((m) => {
      if (state.k[m] >= allowedBy[m].length || W(m) + 1 > state.roles[m].peak + 1e-9) return false;
      const capped = (exposures[m] || []).some((si) => directIn(alloc, si, m) >= sessionCapOf(m, si));
      const blocked = W(m) + 1e-9 < floorOf(m) && alloc.limitedBy[m] === 'limits';
      // Short of its standard in its own sets (founder order 2026-10-10):
      // another session is tried whatever the fractional count says.
      const shortOfStandard = (alloc.weekly[m]?.direct || 0) + 1e-9 < (state.roles[m].directFloor || 0);
      return capped || blocked || shortOfStandard;
    }).sort((a, b) => ((floorOf(b) - W(b)) - (floorOf(a) - W(a))) || (muscleIndex(a) - muscleIndex(b)));
    const crowded = crowdedSessions(alloc, exposures, trainable, state.roles, ctx.choices, state.maxSlots);
    const lowers = trainable.filter((m) => state.k[m] > lowestK(m)
      && (exposures[m] || []).some((si) => crowded.has(si) && alloc.sessions[si].slots.some((x) => x.muscle === m))).sort((a, b) => ((W(b) - floorOf(b)) - (W(a) - floorOf(a))) || (muscleIndex(a) - muscleIndex(b)));
    const moves = [...raises.map((m) => [m, 1]), ...lowers.map((m) => [m, -1])]
      .filter(([m, d]) => !rejected.has(`${m}:${state.k[m]}:${d}`));
    let moved = false;
    for (const [m, d] of moves) {
      const savedCaps = state.sessionCaps;
      state.k[m] += d;
      const trial = run({ unlimited: true });
      if (covered(trial.alloc) && improves(trial.alloc, alloc)) {
        ({ exposures, alloc } = trial);
        rejected.clear();
        moved = true;
        break;
      }
      state.k[m] -= d;
      state.sessionCaps = savedCaps;
      rejected.add(`${m}:${state.k[m]}:${d}`);
    }
    if (!moved) break;
  }
  // The standard in each muscle's own sets, where the search left it short
  // (its sessions hold the sets but their fractional cap is filled by the
  // other muscles' credits): the plan's fractional cap for that muscle rises
  // a set at a time until the standard is placed.
  for (let guard = 0; guard < 8 && !fixed; guard++) {
    const short = trainable.filter((m) => state.roles[m].role !== ROLE.MAINTENANCE
      && (alloc.weekly[m]?.direct || 0) + 1e-9 < (state.roles[m].directFloor || 0));
    if (short.length === 0) break;
    const raise = (j) => {
      state.standardCaps[j] = (state.standardCaps[j] ?? (state.sessionCaps?.[j]?.fractional ?? PER_SESSION.fractionalCap)) + 1;
    };
    for (const m of short) {
      raise(m);
      // The muscles its exercises credit, whose filled cap refuses the set
      // (a glute focus at its cap refuses the hamstrings' hinge).
      for (const c of ctx.choices[m] || []) {
        for (const j of Object.keys(c.credits || {})) if (j !== m && state.roles[j]?.direct) raise(j);
      }
    }
    ({ exposures, alloc } = run({ unlimited: true }));
  }
  ({ exposures, alloc } = run());

  const layouts = spacingLayouts(n, ctx.typical, ctx.ownGaps);
  const usual = layouts.own || layouts.typical;
  const loadsOf = (a) => a.sessions.map((sess) => sessionLoad(sess.slots));
  const hoursPeak = (m, sets) => ctx.hoursVolume(m, sets, ctx.lowestRir);
  // Once a muscle has a light and a heavy session, only the orders that keep
  // its longest gap after the heavy one are considered (design 4.5 step 2).
  // The split is always worked out for an order the search can choose, so
  // there is always one.
  const holds = (o) => Object.keys(state.lightCaps).every((m) => heavyBeforeLongestGap(m, exposures, state.lightCaps[m], o, usual));
  const orderFor = (a) => bestOrder({ loads: loadsOf(a), layouts, hoursFor: hoursPeak, accept: holds }).order;

  // The order; then each muscle's sessions re-spaced evenly in that cycle
  // (design 4.5 step 2 spaces them in the rotation, which the order search
  // has just changed), then a light and heavy split where a full dose cannot
  // clear before the muscle's next session.
  let order = orderFor(alloc);
  for (let pass = 0; pass < 2; pass++) {
    if (order.join() === state.placementOrder.join()) break;
    state.placementOrder = order;
    ({ exposures, alloc } = run());
    order = orderFor(alloc);
  }
  for (let pass = 0; pass < 2; pass++) {
    const split = sparingFocus(lightCapsFor(exposures, order, usual, hoursPeak, trainable));
    if (sameCaps(split, state.lightCaps)) break;
    state.lightCaps = split;
    ({ exposures, alloc } = run());
    order = orderFor(alloc);
  }

  // The block, and the readiness promise at the usual spacing (design 4.14).
  let block;
  let sim;
  // The block is built in the order it is read in: when the readiness check
  // moves the order, the block is prescribed again in the new order and read
  // again, so the plan's sets and its readiness are those of the order saved.
  const settle = () => {
    for (let i = 0; i < SETTLE_TRIES; i++) {
      block = buildBlock(alloc, exposures, n, ctx, state.sessionCaps, order);
      const best = readinessOrder(block, alloc, layouts, usual, hoursPeak, ctx.hoursVolume, loadsOf, holds)
        || readinessOrder(block, alloc, layouts, usual, hoursPeak, ctx.hoursVolume, loadsOf);
      const same = best.order.join() === order.join();
      order = best.order;
      sim = best.sim;
      if (same) return;
    }
    block = buildBlock(alloc, exposures, n, ctx, state.sessionCaps, order);
    sim = simulate(block, order, usual, ctx.hoursVolume);
  };
  // When a muscle's number of sessions changes, its light and heavy split is
  // worked out again for its new sessions in the current order.
  const resplit = (m) => {
    const mine = lightCapsForMuscle(m, exposuresNow(), order, usual, hoursPeak, state.forcedSplit[m] === true);
    const next = { ...state.lightCaps };
    if (mine && keepsFocusFloor(m, mine)) next[m] = mine; else delete next[m];
    state.lightCaps = next;
  };
  const rebuild = () => {
    ({ exposures, alloc } = run());
    settle();
  };
  settle();
  const notes = [];

  // Snapshot and restore, so a fix that does not help is undone.
  const snapshot = () => ({
    k: { ...state.k }, lightCaps: JSON.parse(JSON.stringify(state.lightCaps)), forcedSplit: { ...state.forcedSplit },
    maxSlots: { ...state.maxSlots }, roles: { ...state.roles }, sessionCaps: { ...state.sessionCaps },
    exposures, alloc, order, block, sim,
  });
  const restore = (snap) => {
    state.k = snap.k; state.lightCaps = snap.lightCaps; state.forcedSplit = snap.forcedSplit; state.maxSlots = snap.maxSlots;
    state.roles = snap.roles; state.sessionCaps = snap.sessionCaps;
    ({ exposures, alloc, order, block, sim } = snap);
  };

  // Fix a failure by structure first, by volume last (design 4.14 step 3):
  // (b) a light and heavy split; (c) another session a week; (d) fewer sets,
  // never below the growth floor, and only where the population clocks fail
  // too, so a learned factor never changes a weekly target: first one
  // session fewer (frequency does not change growth at equal volume, [A]),
  // then one set fewer. A fix is kept only when it brings the block closer
  // to the promise.
  const tried = { split: {}, extra: {}, fewer: {} };
  for (let round = 0; round < MAX_FIX_ROUNDS && !sim.passes; round++) {
    const worst = worstByMuscle(sim.failures).filter((f) => trainable.includes(f.muscle)).slice(0, 2);
    let improved = false;
    for (const { muscle: m } of worst) {
      const attempts = [];
      if (!tried.split[m] && state.k[m] >= 2) attempts.push('split');
      // Fixed structure: no fix adds a session for a muscle or removes one.
      if (!fixed && !tried.extra[m] && state.k[m] < allowedBy[m].length) attempts.push('extra_session');
      if (!fixed) attempts.push('fewer_sessions');
      attempts.push('peak_lowered');
      for (const kind of attempts) {
        const before = snapshot();
        const deficit = readinessDeficit(sim);
        const floor = state.roles[m].growthFloor || 0;
        let acted = false;
        if (kind === 'split') {
          tried.split[m] = true;
          const mine = withAuthoredFloors(m, lightCapsForMuscle(m, exposures, order, usual, hoursPeak, true));
          if (mine && keepsFocusFloor(m, mine)) {
            state.lightCaps = { ...state.lightCaps, [m]: mine };
            state.forcedSplit = { ...state.forcedSplit, [m]: true };
            acted = true;
          }
        } else if (kind === 'extra_session') {
          tried.extra[m] = true;
          state.k[m] += 1;
          resplit(m);
          acted = true;
        } else {
          // The volume steps act only where the population clocks fail,
          // which is what `sim` reads (see buildPlan).
          if (!sim.failures.some((f) => f.muscle === m)) continue;
          if (kind === 'fewer_sessions') {
            if (tried.fewer[m] || state.k[m] <= lowestK(m)) continue;
            tried.fewer[m] = true;
            state.k[m] -= 1;
            resplit(m);
            acted = true;
          } else {
            const W = alloc.weekly[m]?.fractional || 0;
            if (Math.floor(W) - 1 < floor) continue;
            state.roles = { ...state.roles, [m]: { ...state.roles[m], peak: Math.floor(W) - 1 } };
            acted = true;
          }
        }
        if (!acted) continue;
        rebuild();
        // A fix is kept only if the muscle stays at its growth floor and, in
        // its own sets, at its standard (founder order 2026-10-10): a
        // readiness gain never costs the standard, nor any other muscle its own.
        const keepsFloor = (alloc.weekly[m]?.fractional || 0) + 1e-9 >= Math.min(floor, before.alloc.weekly[m]?.fractional || 0)
          && trainable.every((j) => (alloc.weekly[j]?.direct || 0) + 1e-9
            >= Math.min(state.roles[j].directFloor || 0, before.alloc.weekly[j]?.direct || 0));
        if (keepsFloor && readinessDeficit(sim) < deficit - 1e-9) {
          notes.push({ muscle: m, kind, peak: Math.round((alloc.weekly[m]?.fractional || 0) * 10) / 10 });
          improved = true;
          break;
        }
        restore(before);
      }
      if (improved) break;
    }
    if (!improved) break;
  }
  if (!sim.passes) {
    for (const { muscle: m, fraction } of worstByMuscle(sim.failures)) {
      notes.push({ muscle: m, kind: 'promise_limited', lowest: Math.round(fraction * 100) / 100 });
    }
  }

  // Ramp, do not jump (design 4.4): a week 1 more than 3 sets above what the
  // person logged opens with fewer exercises for that muscle. Not in fixed
  // structure: every authored exercise is kept, so none can be dropped to ramp.
  if (ctx.loggedWeekly && !fixed) {
    for (let pass = 0; pass < 3; pass++) {
      const jumps = trainable.filter((m) => {
        const logged = ctx.loggedWeekly[m];
        const week1 = block.week1Fractional[m] || 0;
        const limit = Number.isFinite(logged)
          ? logged + RAMP.maxAboveLogged
          : (ROLE_TARGETS.standard.peakMax - BLOCK.week1BelowPeak) + RAMP.maxAboveStandardStartNoHistory;
        return week1 > limit + 1e-9 && maxSlotsPerSession(alloc, m) > 1;
      });
      if (jumps.length === 0) break;
      for (const m of jumps) state.maxSlots[m] = Math.max(1, maxSlotsPerSession(alloc, m) - 1);
      rebuild();
      for (const m of jumps) notes.push({ muscle: m, kind: 'ramped' });
    }
  }

  // Design 4.4 and 4.13: a slower recoverer (a learned factor above 1) gets a
  // lower direct cap a session, max(6, floor(8 / factor)), so a session's
  // load for a muscle is lighter, but only where the sets can move to the
  // muscle's other sessions: a cap is kept only if every muscle keeps its
  // weekly sets and its number of exercises, so the learned factor never
  // changes a weekly target. All muscles at once, else one at a time.
  if (!fixed && Number.isFinite(ctx.factor) && ctx.factor > 1 + 1e-9) {
    const cap = Math.max(LEARNED_FACTOR.slowerDirectCapFloor, Math.floor(PER_SESSION.directCap * Math.min(1, 1 / ctx.factor)));
    const candidates = trainable.filter((m) => (exposures[m] || []).length >= 2).sort();
    if (cap < PER_SESSION.directCap && candidates.length > 0) {
      const slotsOf = (a, m) => a.sessions.reduce((t, sess) => t + sess.slots.filter((x) => x.muscle === m).length, 0);
      const base = Object.fromEntries(trainable.map((m) => [m, { w: alloc.weekly[m]?.fractional || 0, slots: slotsOf(alloc, m) }]));
      const keeps = (a) => trainable.every((m) => (a.weekly[m]?.fractional || 0) + 1e-9 >= base[m].w && slotsOf(a, m) === base[m].slots);
      const before = snapshot();
      const beforeSlower = state.slowerCaps;
      state.slowerCaps = Object.fromEntries(candidates.map((m) => [m, cap]));
      let trial = run();
      if (!keeps(trial.alloc)) {
        state.slowerCaps = {};
        for (const m of candidates) {
          const kept = state.slowerCaps;
          state.slowerCaps = { ...kept, [m]: cap };
          if (!keeps(run().alloc)) state.slowerCaps = kept;
        }
        trial = run();
      }
      if (Object.keys(state.slowerCaps).length > 0 && keeps(trial.alloc)) {
        ({ exposures, alloc } = trial);
        settle();
      } else {
        state.slowerCaps = beforeSlower;
        restore(before);
      }
    }
  }

  // The standard, last (founder order 2026-10-10): whatever the readiness
  // fixes, the ramp and the slower cap did, a growing muscle short of its
  // standard in its own sets gets it back. A light split that left it short
  // is dropped (the readiness check reports the tighter recovery, as it does
  // for a focus muscle); else its fractional cap, and its credited muscles',
  // rise a set at a time, the plan rebuilt after each change.
  for (let guard = 0; guard < 8 && !fixed; guard++) {
    const short = trainable.filter((m) => state.roles[m].role !== ROLE.MAINTENANCE
      && (alloc.weekly[m]?.direct || 0) + 1e-9 < (state.roles[m].directFloor || 0));
    if (short.length === 0) break;
    for (const m of short) {
      if (state.lightCaps[m]) {
        const next = { ...state.lightCaps };
        delete next[m];
        state.lightCaps = next;
        const forced = { ...state.forcedSplit };
        delete forced[m];
        state.forcedSplit = forced;
        continue;
      }
      state.standardCaps[m] = (state.standardCaps[m] ?? (state.sessionCaps?.[m]?.fractional ?? PER_SESSION.fractionalCap)) + 1;
      for (const c of ctx.choices[m] || []) {
        for (const j of Object.keys(c.credits || {})) {
          if (j === m || !state.roles[j]?.direct) continue;
          state.standardCaps[j] = (state.standardCaps[j] ?? (state.sessionCaps?.[j]?.fractional ?? PER_SESSION.fractionalCap)) + 1;
        }
      }
    }
    rebuild();
  }

  const finalScore = rotationPenalty({ loads: loadsOf(alloc), order, layouts, hoursFor: hoursPeak });
  const objective = trainable.reduce((sum, m) => {
    const r = state.roles[m];
    if (r.role === ROLE.MAINTENANCE) return sum;
    return sum + (r.weight || 1) * OBJECTIVE.growthCoefficient * Math.sqrt(Math.max(0, alloc.weekly[m]?.fractional || 0));
  }, 0);
  // The structure is judged on what its sessions can hold (the caps and the
  // D45 ceilings), not on what the person's session length lets the clock
  // fit: with the clock in it, a week with an arms day would beat one with
  // the compound lifts on cheap isolation sets (design 3). The readiness
  // and the rotation penalty are read from the plan as built.
  const structural = run({ unlimited: true }).alloc;
  const structuralObjective = trainable.reduce((sum, m) => {
    const r = state.roles[m];
    if (r.role === ROLE.MAINTENANCE) return sum;
    return sum + (r.weight || 1) * OBJECTIVE.growthCoefficient * Math.sqrt(Math.max(0, structural.weekly[m]?.fractional || 0));
  }, 0);
  return {
    alloc, exposures, order, block, sim, notes, state, trainable,
    penalty: finalScore.recovery,
    objective: structuralObjective,
    builtObjective: objective,
    floorShortfall: floorShortfall(ctx.roles, structural.weekly, trainable),
    readinessPasses: sim.passes,
    readinessDeficit: readinessDeficit(sim),
  };
}

/**
 * Place k of a muscle's allowed sessions evenly in a given cycle order
 * (families.placeExposures works on cycle positions). Returns session indexes.
 */
function placeInOrder(allowedSessions, k, cycle, rotate, cost = null) {
  const positions = allowedSessions.map((si) => cycle.indexOf(si)).filter((p) => p >= 0);
  const positionCost = Array.isArray(cost) ? cycle.map((si) => cost[si] || 0) : null;
  const chosen = placeExposures(positions, k, cycle.length, rotate, positionCost);
  return chosen.map((p) => cycle[p]).sort((a, b) => a - b);
}

/** Hours after each session (by session index) when the sessions run in `order` at `layout`'s spacing. */
function gapAfterSessions(order, layout) {
  const out = new Array(order.length).fill(0);
  order.forEach((si, p) => { out[si] = Array.isArray(layout) ? (layout[p % layout.length] || 0) : 0; });
  return out;
}

/**
 * How far a plan's week falls below its floors, the most important first
 * (design 4.5 steps 4 and 6): sets below the maintenance range (under 2 a
 * week) for any growing muscle; sets below a focus muscle's growth floor (20); sets below a
 * standard muscle's growth floor (10), weighted by its priority. Compared
 * in that order, so lower-priority muscles are held at maintenance before a
 * focus muscle is cut.
 */
function floorShortfall(roles, weekly, muscles) {
  let maintenance = 0;
  let focus = 0;
  let direct = 0;
  let big = 0;
  let standard = 0;
  for (const m of muscles) {
    const r = roles[m];
    if (!r || r.role === ROLE.MAINTENANCE) continue;
    const W = weekly[m]?.fractional || 0;
    const floor = Math.min(r.growthFloor || 0, r.peak);
    maintenance += Math.max(0, Math.min(ROLE_TARGETS.maintenance.low, floor) - W);
    // The standard in the muscle's own sets (founder order 2026-10-10): a
    // structure that leaves a muscle short of it loses to one that does not,
    // before the fractional floors are compared.
    direct += Math.max(0, (r.directFloor || 0) - (weekly[m]?.direct || 0));
    const short = Math.max(0, floor - W);
    if (r.role === ROLE.FOCUS) focus += short;
    // Founder answer 2026-10-05 ("Big muscles first"): the big five's
    // shortfall below their growth floor is judged before a smaller muscle's.
    else if (BIG_MUSCLES.has(m)) big += (r.weight || 1) * short;
    else standard += (r.weight || 1) * short;
  }
  return [maintenance, focus, direct, big, standard];
}

const sameVector = (a, b) => a.every((x, i) => Math.abs(x - b[i]) <= 1e-9);
const vectorLess = (a, b) => {
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-9) return a[i] < b[i];
  return false;
};

/**
 * The sessions at the D45 exercise ceiling where a growing muscle below its
 * growth floor trains and could take another exercise if one were free.
 */
function crowdedSessions(alloc, exposures, muscles, roles, choices, maxSlots) {
  const out = new Set();
  alloc.sessions.forEach((sess, si) => {
    if (sess.slots.length < SESSION_CEILINGS.exercises) return;
    const needs = muscles.some((m) => {
      const r = roles[m];
      if (!r || r.role === ROLE.MAINTENANCE || !(exposures[m] || []).includes(si)) return false;
      if ((alloc.weekly[m]?.fractional || 0) + 1e-9 >= Math.min(r.growthFloor || 0, r.peak)) return false;
      const allowed = Math.min(exercisesAllowed(m, { focus: r.role === ROLE.FOCUS }), Number.isFinite(maxSlots[m]) ? maxSlots[m] : Infinity, (choices[m] || []).length);
      return sess.slots.filter((x) => x.muscle === m).length < allowed;
    });
    if (needs) out.add(si);
  });
  return out;
}

/** Direct sets of muscle m in session si. */
function directIn(alloc, si, m) {
  return (alloc.sessions[si]?.slots || []).filter((x) => x.muscle === m).reduce((a, x) => a + x.sets, 0);
}

/** How far the block falls short of the promise: the summed shortfall below 90% over every failing reading. */
function readinessDeficit(sim) {
  return sim.failures.reduce((a, f) => a + Math.max(0, RECOVERED_SHARE_OF_CLOCK - f.fraction), 0);
}

/** Each failing muscle once, with its lowest reading, the worst first. */
function worstByMuscle(failures) {
  const worst = {};
  for (const f of failures) if (!worst[f.muscle] || f.fraction < worst[f.muscle].fraction) worst[f.muscle] = f;
  return Object.values(worst).sort((a, b) => (a.fraction - b.fraction) || (muscleIndex(a.muscle) - muscleIndex(b.muscle)));
}

/**
 * The order for a block: of the orders with the lowest rotation penalty
 * (cheapest first, at most READINESS_ORDER_TRIES), the first that passes the
 * readiness check, else the one closest to passing. Ties keep the authored
 * order.
 */
const READINESS_ORDER_TRIES = 8;
// How many times the block is prescribed again for a moved order before the
// last order found is kept and its own block read.
const SETTLE_TRIES = 3;
function readinessOrder(block, alloc, layouts, usual, hoursPeak, hoursPerson, loadsOf, accept = null) {
  const loads = loadsOf(alloc);
  const score = prepareRotation({ loads, layouts, hoursFor: hoursPeak });
  const scored = permutations(loads.length)
    .filter((o) => !accept || accept(o))
    .map((o, i) => ({ o, i, p: score(o).total }))
    .sort((a, b) => (a.p - b.p) || (a.i - b.i));
  if (scored.length === 0) return null;
  let best = null;
  for (let i = 0; i < Math.min(READINESS_ORDER_TRIES, scored.length); i++) {
    const sim = simulate(block, scored[i].o, usual, hoursPerson);
    const d = readinessDeficit(sim);
    if (!best || d < best.d - 1e-9) best = { order: scored[i].o, sim, d };
    if (sim.passes) break;
  }
  return best;
}

/**
 * Put each session's exercises in their final order (design 4.8) and re-split
 * each muscle's sets inside the session the way prescribe() will serve them
 * over that order (floors first, then the most room, the earlier exercise on
 * a tie), so the planner's peak and every week prescribe() serves are one
 * number.
 *
 * `keepAuthored` (fixed structure): the session keeps the order its exercises
 * were authored in, not design 4.8's. The caller writes the targets onto the
 * person's own rows, which stay where they are, and prescribe() serves a
 * session over its stored order, so the sets are split over that very order.
 */
function balanceSlots(alloc, roles, keepAuthored = false, sessionCaps = {}) {
  for (const sess of alloc.sessions) {
    sess.slots = keepAuthored
      ? [...sess.slots].sort((a, b) => a.choice.authoredIndex - b.choice.authoredIndex)
      : orderSession(sess.slots, roles);
    const byMuscle = new Map();
    for (const slot of sess.slots) {
      if (!byMuscle.has(slot.muscle)) byMuscle.set(slot.muscle, []);
      byMuscle.get(slot.muscle).push(slot);
    }
    // The compounds take the sets first, as the week server fills a session,
    // unless that lifts a credited muscle's fractional total past its cap in
    // this session (a set moved onto the Romanian deadlift credits the
    // glutes): then the allocator's own split, which the caps were checked
    // against, is kept, so the plan's sets are the sets served.
    const capOf = (j) => sessionCaps?.[j]?.fractional ?? PER_SESSION.fractionalCap;
    for (const list of byMuscle.values()) {
      const total = list.reduce((a, x) => a + x.sets, 0);
      const { sets } = fillSession(total, list.map((x) => x.cap));
      const before = list.map((x) => x.sets);
      list.forEach((x, i) => { x.sets = sets[i]; });
      const after = sessionLoad(sess.slots).fractional;
      list.forEach((x, i) => { x.sets = before[i]; });
      const was = sessionLoad(sess.slots).fractional;
      const breaks = Object.keys(after).some((j) => roles[j]?.direct && after[j] > capOf(j) + 1e-9 && after[j] > (was[j] || 0) + 1e-9);
      if (!breaks) list.forEach((x, i) => { x.sets = sets[i]; });
    }
    sess.workingSets = sess.slots.reduce((a, x) => a + x.sets, 0);
  }
}

function sessionLoad(slots) {
  const direct = {};
  const fractional = {};
  for (const x of slots) {
    direct[x.muscle] = (direct[x.muscle] || 0) + x.sets;
    fractional[x.muscle] = (fractional[x.muscle] || 0) + x.sets;
    for (const j of Object.keys(x.credits || {}).sort()) {
      const c = x.credits[j];
      if (c > 0 && j !== x.muscle) fractional[j] = (fractional[j] || 0) + c * x.sets;
    }
  }
  return { direct, fractional };
}

function maxSlotsPerSession(alloc, m) {
  return Math.max(0, ...alloc.sessions.map((s) => s.slots.filter((x) => x.muscle === m).length));
}

/**
 * Light caps (design 4.5 step 2): for a muscle trained twice or more, the
 * exposure followed by the LONGEST gap is its heavy one; every other
 * exposure whose following gap is too short for a full dose (8 sets) to
 * clear is light, capped at the largest dose (2 to 4 direct sets) that does
 * clear within that gap. `force` marks the light exposures even when a full
 * dose would clear (the readiness check's split step).
 */
function lightCapsForMuscle(m, exposures, order, usual, hoursPeak, force = false) {
  const list = exposures[m] || [];
  if (list.length < 2) return null;
  const n = order.length;
  const pos = list.map((x) => order.indexOf(x)).filter((p) => p >= 0).sort((a, b) => a - b);
  if (pos.length < 2) return null;
  const gaps = pos.map((p, i) => {
    const q = pos[(i + 1) % pos.length];
    const d = ((q - p + n) % n) || n;
    let h = -ROTATION.sessionHours;
    for (let j = 0; j < d; j++) h += usual[(p + j) % n];
    return { session: order[p], h, p };
  });
  let longest = gaps[0];
  for (const g of gaps) if (g.h > longest.h + 1e-9) longest = g;
  const heavyT90 = RECOVERED_SHARE_OF_CLOCK * hoursPeak(m, HEAVY_LIGHT.heavyDirectHigh);
  const mine = {};
  for (const g of gaps) {
    if (g === longest) continue;
    if (!force && g.h >= heavyT90) continue;
    let cap = HEAVY_LIGHT.lightDirectLow;
    for (let d = HEAVY_LIGHT.lightDirectHigh; d >= HEAVY_LIGHT.lightDirectLow; d--) {
      if (RECOVERED_SHARE_OF_CLOCK * hoursPeak(m, d) <= g.h) { cap = d; break; }
    }
    mine[g.session] = cap;
  }
  return Object.keys(mine).length ? mine : null;
}

function lightCapsFor(exposures, order, usual, hoursPeak, trainable) {
  const caps = {};
  for (const m of trainable) {
    const mine = lightCapsForMuscle(m, exposures, order, usual, hoursPeak, false);
    if (mine) caps[m] = mine;
  }
  return caps;
}

function sameCaps(a, b) {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(o) {
  if (!o || typeof o !== 'object') return o;
  return Object.keys(o).sort().reduce((acc, k) => { acc[k] = sortKeys(o[k]); return acc; }, {});
}

// ── the block: targets, shares and every week's loads ──────────────────

function buildBlock(alloc, exposures, n, ctx, sessionCaps = {}, order = null) {
  const sessions = alloc.sessions.map((sess, si) => ({
    id: `s${si}`,
    slots: sess.slots.map((x, xi) => ({
      id: `s${si}x${xi}`,
      muscle: x.muscle,
      kind: x.kind,
      baseSets: SETS_PER_EXERCISE.floor,
      credits: x.credits,
      thinEquipment: x.thinEquipment,
      focus: x.focus === true,
    })),
  }));
  const peakByMuscle = {};
  const perSession = {};
  alloc.sessions.forEach((sess, si) => {
    for (const x of sess.slots) {
      peakByMuscle[x.muscle] = (peakByMuscle[x.muscle] || 0) + x.sets;
      perSession[x.muscle] = perSession[x.muscle] || {};
      perSession[x.muscle][`s${si}`] = (perSession[x.muscle][`s${si}`] || 0) + x.sets;
    }
  });
  const exposureShares = {};
  for (const [m, bySession] of Object.entries(perSession)) {
    const total = Object.values(bySession).reduce((a, b) => a + b, 0);
    if (Object.keys(bySession).length > 1 && total > 0) {
      exposureShares[m] = Object.fromEntries(Object.entries(bySession).map(([sid, v]) => [sid, v / total]));
    }
  }
  const targets = {};
  for (const [m, peak] of Object.entries(peakByMuscle)) {
    const slots = sessions.reduce((a, s) => a + s.slots.filter((x) => x.muscle === m).length, 0);
    targets[m] = blockTargets({ peak, floors: SETS_PER_EXERCISE.floor * slots, maintenance: 0 });
  }
  // Prescribed in the rotation order the plan is saved in, the order the
  // logger serves it in, so a tie breaks the same way in both and the plan's
  // sets are the sets served (prescribe() breaks a tie by rotation order).
  // The loads stay indexed by session.
  const served = Array.isArray(order) && order.length === sessions.length ? order.map((si) => sessions[si]) : sessions;
  const weekLoads = [];
  const weekSets = [];
  for (let w = 0; w < BLOCK.weeks; w++) {
    const weekTargets = Object.fromEntries(Object.entries(targets).map(([m, list]) => [m, list[w]]));
    const out = prescribeWeek({ sessions: served, weekTargets, facts: { exposureShares, sessionCaps } });
    weekSets.push(out.sets);
    weekLoads.push(sessions.map((s) => ({
      direct: out.perSession[s.id]?.direct || {},
      fractional: out.perSession[s.id]?.fractional || {},
    })));
  }
  const week1Fractional = {};
  for (const load of weekLoads[0]) {
    for (const [m, v] of Object.entries(load.fractional)) week1Fractional[m] = (week1Fractional[m] || 0) + v;
  }
  return { sessions, targets, exposureShares, weekLoads, weekSets, week1Fractional };
}

function simulate(block, order, usual, hoursFor) {
  return simulateBlock({ order, weekLoads: block.weekLoads, rirLadder: BLOCK.rirLadder, layout: usual, hoursFor });
}

// ── choosing ─────────────────────────────────────────────────────────────

function chooseFamily(evaluated) {
  const feasible = evaluated.filter((e) => e.floorShortfall.every((v) => v <= 1e-9));
  // No family fits every floor (design 4.5 step 6): the one with the
  // smallest shortfall, the most important part first.
  let pool = feasible.length ? feasible
    : [...evaluated].sort((a, b) => (sameVector(a.floorShortfall, b.floorShortfall) ? a.index - b.index
      : (vectorLess(a.floorShortfall, b.floorShortfall) ? -1 : 1))).slice(0, 1);
  const passing = pool.filter((e) => e.readinessPasses);
  if (passing.length) {
    pool = passing;
  } else {
    const least = Math.min(...pool.map((e) => e.readinessDeficit));
    pool = pool.filter((e) => e.readinessDeficit <= least + ROTATION.familyPenaltyTolerance + 1e-12);
  }
  const bestPenalty = Math.min(...pool.map((e) => e.penalty));
  pool = pool.filter((e) => e.penalty <= bestPenalty + ROTATION.familyPenaltyTolerance + 1e-12);
  pool.sort((a, b) => (b.objective - a.objective) || (a.family.recognisable - b.family.recognisable) || (a.index - b.index));
  return pool[0];
}

// ── the output ───────────────────────────────────────────────────────────

/**
 * The sessions' names in the order they are trained: where a kind of session
 * comes more than once ("Upper A", "Upper B"), its letters follow the
 * rotation, so the plan reads Upper A before Upper B however the order search
 * placed them. Other names are kept.
 */
function letteredInOrder(list) {
  const lettered = (name) => /^(.+) ([A-Z])$/.exec(name);
  const count = {};
  for (const name of list) {
    const m = lettered(name);
    if (m) count[m[1]] = (count[m[1]] || 0) + 1;
  }
  const next = {};
  return list.map((name) => {
    const m = lettered(name);
    if (!m || count[m[1]] < 2) return name;
    const i = next[m[1]] || 0;
    next[m[1]] = i + 1;
    return `${m[1]} ${String.fromCharCode(65 + i)}`;
  });
}

function toPlan(chosen, ctx, inputs, factor) {
  const { family, alloc, order, block, sim, notes, state } = chosen;
  const sessionKey = (si) => `s${si}`;
  // Fixed structure: each session carries its routineId and each exercise its
  // exerciseId, so the caller can write the targets and facts onto the
  // person's own rows. Without it the output is exactly what it always was.
  const fixedMode = family.fixed === true;
  const names = fixedMode ? order.map((si) => family.sessions[si].name) : letteredInOrder(order.map((si) => family.sessions[si].name));
  const workouts = order.map((si, p) => {
    const sess = alloc.sessions[si];
    const slots = sess.slots; // already in their final order (balanceSlots)
    return {
      name: names[p],
      sessionKey: sessionKey(si),
      ...(fixedMode ? { routineId: family.sessions[si].routineId ?? null } : {}),
      exercises: slots.map((x) => {
        const reps = repRangeFor(x.name, x.kind, inputs.isStrength === true);
        const blockSlot = block.sessions[si].slots[sess.slots.indexOf(x)];
        return {
          name: x.name,
          muscle: x.muscle,
          kind: x.kind,
          sets: block.weekSets[0][blockSlot.id],
          peakSets: x.sets,
          repMin: reps.repMin,
          repMax: reps.repMax,
          restSec: x.restTrimmed ? x.restSec : restFor(x.kind, inputs.isStrength === true),
          selectionReason: fixedMode ? 'authored' : 'catalogue',
          reason: x.choice?.reason ?? null,
          thinEquipment: x.thinEquipment === true,
          slotKey: blockSlot.id,
          ...(fixedMode ? { exerciseId: x.choice?.exerciseId ?? null } : {}),
        };
      }),
    };
  });

  // Gap rank: 0 for the session followed by the longest gap at the usual spacing.
  const usual = ctx.ownGaps || ctx.typical;
  const gapAfter = order.map((si, p) => ({ si, h: usual[p % usual.length] }));
  const ranked = [...gapAfter].sort((a, b) => (b.h - a.h) || (order.indexOf(a.si) - order.indexOf(b.si)));
  const gapRanks = Object.fromEntries(ranked.map((g, r) => [sessionKey(g.si), r]));

  // plannedSets: week 1's direct sets, the number the saved routines carry
  // (the generator's contract: what a plan claims is what reaches the
  // database, campaign16.volumeIntegrity); direct and fractional are the peak.
  const weekOne = {};
  for (const w of workouts) for (const e of w.exercises) weekOne[e.muscle] = (weekOne[e.muscle] || 0) + e.sets;
  const weekly = {};
  for (const [m, v] of Object.entries(alloc.weekly)) {
    weekly[m] = { direct: v.direct, fractional: v.fractional, ...(weekOne[m] ? { plannedSets: weekOne[m] } : {}) };
  }
  const roles = Object.fromEntries(Object.entries(state.roles).map(([m, r]) => [m, r.role]));

  return {
    name: `${family.label} ${ctx.n}×/week`,
    goal: inputs.goal,
    splitType: family.key,
    daysPerWeek: ctx.n,
    // The longest session's real length: above the person's length only when
    // focus sets took it there (they are never cut), so the plan says so.
    estimatedSessionMinutes: Math.max(ctx.sessionLengthMinutes, Math.ceil(Math.max(0, ...alloc.sessions.map((s) => s.minutes)))),
    workouts,
    weeklyVolumeSummary: weekly,
    v2: {
      version: PLANNER_VERSION,
      family: family.key,
      order: order.map(sessionKey),
      roles,
      weeklyTargets: block.targets,
      exposureShares: block.exposureShares,
      sessionCaps: state.sessionCaps,
      lightCaps: Object.fromEntries(Object.entries(state.lightCaps || {}).map(([m, bySession]) => [m, Object.fromEntries(Object.entries(bySession).map(([si, cap]) => [sessionKey(Number(si)), cap]))])),
      gapRanks,
      builtFactor: factor,
      rirLadder: [...BLOCK.rirLadder],
      readiness: {
        passes: sim.passes,
        lowest: lowestByMuscle(sim.readings),
      },
      notes,
      limitedBy: alloc.limitedBy,
      // Design 4.14 step 4: written into the weekly rows' mrv at the save.
      recoverySafeMax: chosen.recoverySafeMax || {},
      sessionMinutesAtPeak: alloc.sessions.map((s) => s.minutes),
      overTime: Object.fromEntries(alloc.sessions.map((s, si) => [sessionKey(si), s.overMinutes || 0]).filter(([, v]) => v > 5)),
      // Sessions the focus sets take past 8 exercises or 25 working sets (D45).
      overCeilings: alloc.sessions.map((s, si) => (s.overCeilings ? sessionKey(si) : null)).filter(Boolean),
    },
  };
}
