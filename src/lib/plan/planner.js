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
 */
export function buildPlan(inputs) {
  const n = clampDays(inputs);
  const focusMuscles = (inputs.focusMuscles || []).filter((m) => PLAN_MUSCLES.includes(m));
  const division = divisionFamily(inputs.divisionMatrix, inputs.goal, n);
  const families = division ? [division] : familiesFor(n, { focusMuscles });
  const roles = assignRoles({
    goal: inputs.goal,
    focusMuscles,
    addedMuscles: inputs.addedMuscles,
    experience: inputs.experience,
    firstBlock: inputs.firstBlock !== false,
    nutritionPhase: inputs.nutritionPhase,
    trainedMuscles: division ? Array.from(new Set(division.sessions.flatMap((s) => s.muscles))) : null,
  });
  const factor = Number.isFinite(inputs.learnedFactor)
    ? Math.min(LEARNED_FACTOR.max, Math.max(LEARNED_FACTOR.min, inputs.learnedFactor))
    : null;
  const ctx = {
    n,
    roles,
    choices: inputs.choices || {},
    equipment: inputs.equipment || 'full_gym',
    sessionLengthMinutes: inputs.sessionLengthMinutes > 0 ? inputs.sessionLengthMinutes : 60,
    typical: TYPICAL_WEEK_GAP_HOURS[n],
    ownGaps: Array.isArray(inputs.ownGaps) && inputs.ownGaps.length === n ? inputs.ownGaps : null,
    loggedWeekly: inputs.loggedWeekly || null,
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
  return toPlan(ctx.personal ? personalise(chosen, ctx) : chosen, ctx, inputs, factor);
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
  if (!best || readinessDeficit(best.sim) >= readinessDeficit(current) - 1e-9) {
    return { ...chosen, sim: current, readinessPasses: current.passes };
  }
  return { ...chosen, order: best.order, sim: best.sim, readinessPasses: best.sim.passes };
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

// ── one family ──────────────────────────────────────────────────────────

function evaluateFamily(family, ctx) {
  const n = family.sessions.length;
  const roles = { ...ctx.roles };
  const allowedBy = {};
  for (const m of Object.keys(roles)) {
    if (!roles[m].direct) continue;
    allowedBy[m] = sessionsAllowing(family, m, { focus: roles[m].role === ROLE.FOCUS });
  }
  const trainable = Object.keys(allowedBy).filter((m) => allowedBy[m].length > 0 && (ctx.choices[m] || []).length > 0)
    .sort((a, b) => muscleIndex(a) - muscleIndex(b));


  // How many sessions a week each muscle gets (design 4.4): the fewest that
  // keep every session under its cap. Start at one (two when the muscle's
  // peak is 12 or more and there are 4 or more sessions, Ochi 2018), and add
  // one only while a session cap binds and the muscle is below its peak.
  const k = {};
  for (const m of trainable) {
    const two = roles[m].peak >= FREQUENCY.preferTwoExposuresFromWeekly && n >= FREQUENCY.preferTwoExposuresMinSessions;
    k[m] = Math.min(allowedBy[m].length, two ? 2 : 1);
  }
  const state = {
    k, lightCaps: {}, forcedSplit: {}, maxSlots: {}, sessionCaps: {}, roles, placementOrder: family.sessions.map((_, i) => i),
  };

  // Each muscle's sessions, spaced as evenly as the current cycle order allows.
  const exposuresNow = () => {
    const out = {};
    trainable.forEach((m, i) => { out[m] = placeInOrder(allowedBy[m], state.k[m], state.placementOrder, i); });
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
    state.sessionCaps = caps;
    const exposures = exposuresNow();
    const alloc = allocatePeakWeek({
      sessionCount: n,
      roles: state.roles,
      exposures,
      choices: ctx.choices,
      lightCaps: state.lightCaps,
      maxSlots: state.maxSlots,
      sessionCaps: state.sessionCaps,
      sessionLengthMinutes: unlimited ? Infinity : ctx.sessionLengthMinutes,
      equipment: ctx.equipment,
      gapAfter: gapAfterSessions(state.placementOrder, ctx.ownGaps || ctx.typical),
    });
    balanceSlots(alloc, state.roles);
    // An exposure that took no sets (it did not fit) is not one: the split
    // and the order read the sessions the muscle is really trained in.
    for (const m of Object.keys(exposures)) {
      exposures[m] = exposures[m].filter((si) => alloc.sessions[si].slots.some((x) => x.muscle === m));
    }
    return { exposures, alloc };
  };

  const sessionRoom = (m) => {
    const direct = state.sessionCaps?.[m]?.direct ?? PER_SESSION.directCap;
    const list = ctx.choices[m] || [];
    const slots = Math.min(exercisesAllowed(m, { focus: state.roles[m]?.role === ROLE.FOCUS }), Number.isFinite(state.maxSlots[m]) ? state.maxSlots[m] : Infinity, list.length);
    const room = list.slice(0, slots).reduce((a, c) => a + exerciseCap(c.kind, list.length === 1), 0);
    return Math.min(direct, room);
  };
  const sessionCapOf = (m, s) => {
    const light = state.lightCaps?.[m]?.[s];
    return Math.min(Number.isFinite(light) ? light : Infinity, sessionRoom(m));
  };
  // A light session never takes a focus muscle below its programmed sets
  // (founder rule 2026-10-04: a focus muscle's volume is never cut): where
  // its light caps would, it keeps full sessions and the readiness check
  // reports the tighter recovery instead.
  const keepsFocusFloor = (m, caps) => {
    if (state.roles[m]?.role !== ROLE.FOCUS || !caps) return true;
    const room = (exposures[m] || []).reduce((a, si) => a + Math.min(Number.isFinite(caps[si]) ? caps[si] : Infinity, sessionRoom(m)), 0);
    return room + 1e-9 >= (state.roles[m].growthFloor || 0);
  };
  const sparingFocus = (caps) => Object.fromEntries(Object.entries(caps || {}).filter(([m, c]) => keepsFocusFloor(m, c)));

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
  for (let iter = 0; iter < 4 * trainable.length; iter++) {
    const W = (m) => alloc.weekly[m]?.fractional || 0;
    const raises = trainable.filter((m) => {
      if (state.k[m] >= allowedBy[m].length || W(m) + 1 > state.roles[m].peak + 1e-9) return false;
      const capped = (exposures[m] || []).some((si) => directIn(alloc, si, m) >= sessionCapOf(m, si));
      const blocked = W(m) + 1e-9 < floorOf(m) && alloc.limitedBy[m] === 'limits';
      return capped || blocked;
    }).sort((a, b) => ((floorOf(b) - W(b)) - (floorOf(a) - W(a))) || (muscleIndex(a) - muscleIndex(b)));
    const crowded = crowdedSessions(alloc, exposures, trainable, state.roles, ctx.choices, state.maxSlots);
    const lowers = trainable.filter((m) => state.k[m] >= 2
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
  const settle = () => {
    block = buildBlock(alloc, exposures, n, ctx, state.sessionCaps);
    const best = readinessOrder(block, alloc, layouts, usual, hoursPeak, ctx.hoursVolume, loadsOf, holds)
      || readinessOrder(block, alloc, layouts, usual, hoursPeak, ctx.hoursVolume, loadsOf);
    order = best.order;
    sim = best.sim;
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
      if (!tried.extra[m] && state.k[m] < allowedBy[m].length) attempts.push('extra_session');
      attempts.push('fewer_sessions', 'peak_lowered');
      for (const kind of attempts) {
        const before = snapshot();
        const deficit = readinessDeficit(sim);
        const floor = state.roles[m].growthFloor || 0;
        let acted = false;
        if (kind === 'split') {
          tried.split[m] = true;
          const mine = lightCapsForMuscle(m, exposures, order, usual, hoursPeak, true);
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
            if (tried.fewer[m] || state.k[m] <= 1) continue;
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
        const keepsFloor = (alloc.weekly[m]?.fractional || 0) + 1e-9 >= Math.min(floor, before.alloc.weekly[m]?.fractional || 0);
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
  // person logged opens with fewer exercises for that muscle.
  if (ctx.loggedWeekly) {
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
function placeInOrder(allowedSessions, k, cycle, rotate) {
  const positions = allowedSessions.map((si) => cycle.indexOf(si)).filter((p) => p >= 0);
  const chosen = placeExposures(positions, k, cycle.length, rotate);
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
  let standard = 0;
  for (const m of muscles) {
    const r = roles[m];
    if (!r || r.role === ROLE.MAINTENANCE) continue;
    const W = weekly[m]?.fractional || 0;
    const floor = Math.min(r.growthFloor || 0, r.peak);
    maintenance += Math.max(0, Math.min(ROLE_TARGETS.maintenance.low, floor) - W);
    const short = Math.max(0, floor - W);
    if (r.role === ROLE.FOCUS) focus += short;
    else standard += (r.weight || 1) * short;
  }
  return [maintenance, focus, standard];
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
 */
function balanceSlots(alloc, roles) {
  for (const sess of alloc.sessions) {
    sess.slots = orderSession(sess.slots, roles);
    const byMuscle = new Map();
    for (const slot of sess.slots) {
      if (!byMuscle.has(slot.muscle)) byMuscle.set(slot.muscle, []);
      byMuscle.get(slot.muscle).push(slot);
    }
    for (const list of byMuscle.values()) {
      const total = list.reduce((a, x) => a + x.sets, 0);
      const { sets } = fillSession(total, list.map((x) => x.cap));
      list.forEach((x, i) => { x.sets = sets[i]; });
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

function buildBlock(alloc, exposures, n, ctx, sessionCaps = {}) {
  const sessions = alloc.sessions.map((sess, si) => ({
    id: `s${si}`,
    slots: sess.slots.map((x, xi) => ({
      id: `s${si}x${xi}`,
      muscle: x.muscle,
      kind: x.kind,
      baseSets: SETS_PER_EXERCISE.floor,
      credits: x.credits,
      thinEquipment: x.thinEquipment,
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
  const weekLoads = [];
  const weekSets = [];
  for (let w = 0; w < BLOCK.weeks; w++) {
    const weekTargets = Object.fromEntries(Object.entries(targets).map(([m, list]) => [m, list[w]]));
    const out = prescribeWeek({ sessions, weekTargets, facts: { exposureShares, sessionCaps } });
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

function toPlan(chosen, ctx, inputs, factor) {
  const { family, alloc, order, block, sim, notes, state } = chosen;
  const sessionKey = (si) => `s${si}`;
  const workouts = order.map((si) => {
    const sess = alloc.sessions[si];
    const slots = sess.slots; // already in their final order (balanceSlots)
    return {
      name: family.sessions[si].name,
      sessionKey: sessionKey(si),
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
          selectionReason: 'catalogue',
          reason: x.choice?.reason ?? null,
          thinEquipment: x.thinEquipment === true,
          slotKey: blockSlot.id,
        };
      }),
    };
  });

  // Gap rank: 0 for the session followed by the longest gap at the usual spacing.
  const usual = ctx.ownGaps || ctx.typical;
  const gapAfter = order.map((si, p) => ({ si, h: usual[p % usual.length] }));
  const ranked = [...gapAfter].sort((a, b) => (b.h - a.h) || (order.indexOf(a.si) - order.indexOf(b.si)));
  const gapRanks = Object.fromEntries(ranked.map((g, r) => [sessionKey(g.si), r]));

  const weekly = {};
  for (const [m, v] of Object.entries(alloc.weekly)) weekly[m] = { direct: v.direct, fractional: v.fractional };
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
      sessionMinutesAtPeak: alloc.sessions.map((s) => s.minutes),
      overTime: Object.fromEntries(alloc.sessions.map((s, si) => [sessionKey(si), s.overMinutes || 0]).filter(([, v]) => v > 5)),
    },
  };
}
