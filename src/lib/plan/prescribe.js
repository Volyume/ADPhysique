/**
 * prescribe.js -- D219: every week's sets per exercise come from this one
 * pure function (design 4.9, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md). It replaces the FQ-4 multiplier
 * (round(recommended_sets x weekPlanned / week1Planned), coachApply.js) for
 * plans the new planner built, so that no exercise ever goes past its cap as
 * the block climbs: the founder's "I've seen instances where I have 6 sets in
 * an exercise as we progress" (register D219).
 *
 * The method, per muscle m, for one plan week:
 *   1. D(m) = this week's direct-set target (the plan's per-muscle row, in
 *      direct sets as today; the indirect credit was accounted for when the
 *      plan was built, so nothing is subtracted here), less any set counts
 *      the person typed themselves, which are served as typed.
 *   2. D(m) is shared across m's sessions: by the shares the planner stored
 *      for a heavy and a light exposure, otherwise by the slot weights (each
 *      routine exercise's stored week-1 sets), never above the session cap
 *      (8 direct, or what the plan allows a focus muscle) or the sum of the
 *      session's exercise caps. A share that does not fit moves to m's other
 *      sessions with room.
 *   3. Inside a session every exercise of m starts at its floor (2; 1 in a
 *      week whose target is below every exercise's 2; a session the shares
 *      leave short of its exercises' floors in any other week takes the sets
 *      from m's session with the most to spare) and one set at a time goes to the
 *      exercise with the most room under its cap, the first choice first on
 *      a tie (4 sets for a compound, 3 for an isolation movement, plus the
 *      thin-equipment bonus where the plan allowed it).
 *   4. A session whose FRACTIONAL total for a muscle (direct sets plus half
 *      credit from other exercises) passes its cap (11, or 12 for a focus
 *      muscle the plan allows it) gives the excess direct sets to m's other
 *      sessions with room.
 *   5. Whatever still does not fit is a shortfall, reported, never forced
 *      onto an exercise and never dropped in silence.
 *
 * Pure and deterministic: no I/O, no clock, no randomness, and the result
 * does not depend on the key order of any object passed in. It imports only
 * science.js, so the check-in path (coachApply.js) can reach it without any
 * route into src/lib/recovery/ (edIsolation.guard.test.js).
 */
import { PER_SESSION, SETS_PER_EXERCISE, exerciseCap } from './science';

/**
 * @typedef {object} Slot
 * @property {string} id                 the routine exercise id (the slot)
 * @property {string} muscle             the exercise's primary muscle
 * @property {string} [kind]             'isolation', or anything else for a compound
 * @property {number} [baseSets]         the stored week-1 sets (recommended_sets): the slot's weight
 * @property {number|null} [typedSets]   a set count the person typed themselves, served as typed
 * @property {boolean} [thinEquipment]   the plan gave this slot the thin-equipment bonus
 * @property {boolean} [focus]           the slot's muscle is a focus muscle of the plan: an isolation
 *                                       exercise may take 4 sets (founder answer 2026-10-04)
 * @property {Object<string, number>} [credits]  synergist credit one set gives each other muscle, e.g. { biceps: 0.5 }
 *
 * @typedef {object} Session
 * @property {string} id       the routine id
 * @property {Slot[]} slots    in the session's exercise order, first choice first
 *
 * @typedef {object} PlanFacts
 * @property {Object<string, Object<string, number>>} [exposureShares]
 *           per muscle, the share of its weekly sets each session takes (session id -> fraction),
 *           written by the planner for a heavy and a light exposure
 * @property {Object<string, {direct?: number, fractional?: number}>} [sessionCaps]
 *           per muscle, the session cap the plan allows (default 8 direct, 11 fractional)
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function isTyped(slot) {
  return isNum(slot?.typedSets) && slot.typedSets >= 0;
}

function capOf(slot) {
  return exerciseCap(slot?.kind, slot?.thinEquipment === true, { focus: slot?.focus === true });
}

function directCapFor(muscle, facts) {
  const v = facts?.sessionCaps?.[muscle]?.direct;
  return isNum(v) && v > 0 ? v : PER_SESSION.directCap;
}

function fractionalCapFor(muscle, facts) {
  const v = facts?.sessionCaps?.[muscle]?.fractional;
  return isNum(v) && v > 0 ? v : PER_SESSION.fractionalCap;
}

/**
 * Split `total` whole sets by `weights` with the largest-remainder method;
 * ties go to the earlier index. All-zero weights split evenly.
 */
export function splitByWeights(total, weights) {
  const n = weights.length;
  if (n === 0 || !(total > 0)) return new Array(n).fill(0);
  const w = weights.map((x) => (isNum(x) && x > 0 ? x : 0));
  const sum = w.reduce((a, b) => a + b, 0);
  const basis = sum > 0 ? w : new Array(n).fill(1);
  const basisSum = sum > 0 ? sum : n;
  const exact = basis.map((x) => (total * x) / basisSum);
  const out = exact.map((x) => Math.floor(x));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => (b.r - a.r) || (a.i - b.i));
  for (let k = 0; left > 0 && k < order.length; k++, left--) out[order[k].i] += 1;
  return out;
}

/**
 * Sets for each exercise of one muscle inside one session (design 4.9 step
 * 3): floors first, then one set at a time to the exercise with the most
 * room under its cap, the first choice first on a tie. Never above a cap.
 * Returns { sets, unplaced }.
 */
export function fillSession(total, caps) {
  const count = caps.length;
  if (count === 0) return { sets: [], unplaced: Math.max(0, total) };
  const floor = total >= SETS_PER_EXERCISE.floor * count
    ? SETS_PER_EXERCISE.floor
    : SETS_PER_EXERCISE.floorInLowWeek;
  const sets = caps.map((c) => Math.min(floor, c));
  let left = total - sets.reduce((a, b) => a + b, 0);
  while (left > 0) {
    let best = -1;
    let bestRoom = 0;
    for (let i = 0; i < count; i++) {
      const room = caps[i] - sets[i];
      if (room > bestRoom) { best = i; bestRoom = room; }
    }
    if (best < 0) break;
    sets[best] += 1;
    left -= 1;
  }
  return { sets, unplaced: Math.max(0, left) };
}

/**
 * Prescribe one plan week.
 *
 * @param {object} args
 * @param {Session[]} args.sessions      the plan's sessions in rotation order
 * @param {Object<string, number>} args.weekTargets  this week's direct-set target per muscle
 * @param {PlanFacts} [args.facts]
 * @returns {{
 *   sets: Object<string, number>,
 *   shortfall: Object<string, number>,
 *   aboveTarget: Object<string, number>,
 *   perSession: Object<string, { direct: Object<string, number>, fractional: Object<string, number>, workingSets: number }>,
 * }}
 */
export function prescribeWeek({ sessions, weekTargets, facts = {} } = {}) {
  const list = Array.isArray(sessions) ? sessions : [];
  const targets = weekTargets && typeof weekTargets === 'object' ? weekTargets : {};
  const sets = {};
  const shortfall = {};
  const aboveTarget = {};

  // Index every slot by its primary muscle, in rotation order.
  const byMuscle = new Map();
  list.forEach((session, si) => {
    (Array.isArray(session?.slots) ? session.slots : []).forEach((slot, xi) => {
      if (!slot || slot.id == null) return;
      if (isTyped(slot)) sets[slot.id] = Math.round(slot.typedSets);
      const m = slot.muscle;
      if (!m) {
        if (!isTyped(slot)) sets[slot.id] = clampBase(slot);
        return;
      }
      if (!byMuscle.has(m)) byMuscle.set(m, []);
      byMuscle.get(m).push({ session, si, slot, xi });
    });
  });

  const muscles = Array.from(new Set([...byMuscle.keys(), ...Object.keys(targets)])).sort();

  for (const m of muscles) {
    const entries = byMuscle.get(m) || [];
    const free = entries.filter((e) => !isTyped(e.slot));
    const typedTotal = entries
      .filter((e) => isTyped(e.slot))
      .reduce((a, e) => a + Math.round(e.slot.typedSets), 0);
    // No row for this muscle: the stored counts are the week's target, and
    // they go through the same caps as any other week.
    const target = isNum(targets[m])
      ? Math.round(targets[m])
      : typedTotal + free.reduce((a, e) => a + clampBase(e.slot), 0);
    const D = Math.max(0, target - typedTotal);
    if (free.length === 0) {
      if (D > 0) shortfall[m] = D;
      continue;
    }

    // m's sessions with a free slot, in rotation order.
    const sessionOrder = [];
    const slotsIn = new Map();
    for (const e of free) {
      if (!slotsIn.has(e.si)) { slotsIn.set(e.si, []); sessionOrder.push(e.si); }
      slotsIn.get(e.si).push(e);
    }
    const directCap = directCapFor(m, facts);
    const caps = sessionOrder.map((si) => {
      const typedHere = entries
        .filter((e) => e.si === si && isTyped(e.slot))
        .reduce((a, e) => a + Math.round(e.slot.typedSets), 0);
      const exerciseRoom = slotsIn.get(si).reduce((a, e) => a + capOf(e.slot), 0);
      return Math.max(0, Math.min(directCap - typedHere, exerciseRoom));
    });

    const weights = sessionWeights(m, sessionOrder, slotsIn, list, facts);
    const shares = splitByWeights(D, weights);

    // Cap each session's share; what does not fit moves to m's other sessions
    // with room, the heaviest weight first, then rotation order.
    const placed = shares.map((s, k) => Math.min(s, caps[k]));
    let excess = shares.reduce((a, s, k) => a + (s - placed[k]), 0);
    const roomOrder = sessionOrder
      .map((si, k) => ({ k, w: weights[k] }))
      .sort((a, b) => (b.w - a.w) || (a.k - b.k));
    while (excess > 0) {
      const next = roomOrder.find(({ k }) => placed[k] < caps[k]);
      if (!next) break;
      placed[next.k] += 1;
      excess -= 1;
    }
    if (excess > 0) shortfall[m] = (shortfall[m] || 0) + excess;

    // In a week whose sets cover every exercise's floor, every exercise gets
    // it (step 3): a session the shares left below its exercises' floors
    // takes the sets it is missing from m's session with the most above its
    // own floors, the later session on a tie, so no exercise is served one
    // set in a normal week. The week's total does not change.
    const floors = sessionOrder.map((si, k) => Math.min(caps[k], SETS_PER_EXERCISE.floor * slotsIn.get(si).length));
    if (placed.reduce((a, b) => a + b, 0) >= floors.reduce((a, b) => a + b, 0)) {
      for (let k = 0; k < placed.length; k++) {
        while (placed[k] < floors[k]) {
          let donor = -1;
          for (let j = 0; j < placed.length; j++) {
            if (j !== k && placed[j] > floors[j] && (donor < 0 || placed[j] - floors[j] >= placed[donor] - floors[donor])) donor = j;
          }
          if (donor < 0) break;
          placed[donor] -= 1;
          placed[k] += 1;
        }
      }
    }

    let over = 0;
    sessionOrder.forEach((si, k) => {
      const here = slotsIn.get(si);
      const { sets: perSlot } = fillSession(placed[k], here.map((e) => capOf(e.slot)));
      here.forEach((e, idx) => { sets[e.slot.id] = perSlot[idx]; });
      over += Math.max(0, perSlot.reduce((a, b) => a + b, 0) - placed[k]);
    });
    if (over > 0) aboveTarget[m] = over;
  }

  keepCreditedCaps(list, byMuscle, sets, facts);
  rebalanceFractional(list, byMuscle, sets, shortfall, facts);

  return { sets, shortfall, aboveTarget, perSession: sessionTotals(list, sets) };
}

/**
 * The fill above puts a muscle's sets on its compounds first. Where that
 * lifts a credited muscle past its fractional cap in the session (the
 * Romanian deadlift's half set for the glutes, with the glutes at their
 * cap), the sets move within the same session from the crediting exercise
 * to the muscle's exercises that do not credit it, under their caps, so the
 * week's total for the muscle is kept and the credited muscle is not cut.
 * Deterministic: muscles in sorted order, slots in session order.
 */
function keepCreditedCaps(list, byMuscle, sets, facts) {
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    const totals = sessionTotals(list, sets);
    for (const m of Array.from(byMuscle.keys()).sort()) {
      const free = (byMuscle.get(m) || []).filter((e) => !isTyped(e.slot));
      for (const si of Array.from(new Set(free.map((e) => e.si)))) {
        const sid = list[si]?.id;
        const here = free.filter((e) => e.si === si);
        const creditedOver = (j) => (totals[sid]?.fractional?.[j] || 0) > fractionalCapFor(j, facts) + 1e-9;
        const crediting = here.filter((e) => Object.entries(e.slot?.credits || {}).some(([j, c]) => j !== m && c > 0 && creditedOver(j)));
        if (crediting.length === 0) continue;
        const plain = here.filter((e) => !Object.entries(e.slot?.credits || {}).some(([j, c]) => j !== m && c > 0 && creditedOver(j)));
        for (const from of crediting) {
          while ((sets[from.slot.id] || 0) > SETS_PER_EXERCISE.floor
            && Object.entries(from.slot.credits || {}).some(([j, c]) => j !== m && c > 0 && creditedOver(j))) {
            const to = plain.find((e) => (sets[e.slot.id] || 0) < capOf(e.slot));
            if (!to) break;
            sets[from.slot.id] -= 1;
            sets[to.slot.id] += 1;
            moved = true;
            const fresh = sessionTotals(list, sets);
            totals[sid] = fresh[sid];
          }
        }
      }
    }
    if (!moved) break;
  }
}

/** A slot served without a weekly row: its stored count, at least one set, never above its cap. */
function clampBase(slot) {
  const base = isNum(slot?.baseSets) ? Math.round(slot.baseSets) : SETS_PER_EXERCISE.floor;
  return Math.max(SETS_PER_EXERCISE.floorInLowWeek, Math.min(base, capOf(slot)));
}

/**
 * The share of m's weekly sets each of its sessions takes: the planner's
 * stored shares (a heavy and a light exposure) when they name these
 * sessions, otherwise the slots' stored week-1 sets.
 */
function sessionWeights(m, sessionOrder, slotsIn, list, facts) {
  const stored = facts?.exposureShares?.[m];
  if (stored && typeof stored === 'object') {
    const w = sessionOrder.map((si) => {
      const v = stored[list[si]?.id];
      return isNum(v) && v > 0 ? v : 0;
    });
    if (w.some((x) => x > 0)) return w;
  }
  return sessionOrder.map((si) => slotsIn.get(si).reduce((a, e) => {
    const b = isNum(e.slot.baseSets) && e.slot.baseSets > 0 ? e.slot.baseSets : 1;
    return a + b;
  }, 0));
}

/** Direct and fractional sets per muscle per session, and each session's working sets. */
function sessionTotals(list, sets) {
  const out = {};
  for (const session of list) {
    const direct = {};
    const fractional = {};
    let workingSets = 0;
    for (const slot of Array.isArray(session?.slots) ? session.slots : []) {
      const n = sets[slot?.id] || 0;
      workingSets += n;
      if (slot?.muscle) {
        direct[slot.muscle] = (direct[slot.muscle] || 0) + n;
        fractional[slot.muscle] = (fractional[slot.muscle] || 0) + n;
      }
      const credits = slot?.credits && typeof slot.credits === 'object' ? slot.credits : {};
      for (const other of Object.keys(credits).sort()) {
        const c = credits[other];
        if (!isNum(c) || c <= 0 || other === slot.muscle) continue;
        fractional[other] = (fractional[other] || 0) + c * n;
      }
    }
    out[session?.id] = { direct, fractional, workingSets };
  }
  return out;
}

/**
 * Design 4.9 step 4: where a session's fractional total for a muscle passes
 * its cap, move the excess direct sets of that muscle to its other sessions
 * that have direct and fractional room; whatever cannot move is a shortfall.
 * Floors are kept. Bounded passes, deterministic order.
 */
function rebalanceFractional(list, byMuscle, sets, shortfall, facts) {
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    const totals = sessionTotals(list, sets);
    const muscles = Array.from(byMuscle.keys()).sort();
    for (const m of muscles) {
      const free = (byMuscle.get(m) || []).filter((e) => !isTyped(e.slot));
      if (free.length === 0) continue;
      const fCap = fractionalCapFor(m, facts);
      const dCap = directCapFor(m, facts);
      const sessionIds = Array.from(new Set(free.map((e) => e.si)));
      for (const si of sessionIds) {
        const sid = list[si]?.id;
        const frac = totals[sid]?.fractional?.[m] || 0;
        if (frac <= fCap + 1e-9) continue;
        const here = free.filter((e) => e.si === si);
        let toMove = Math.ceil(frac - fCap - 1e-9);
        while (toMove > 0) {
          // Take from the exercise with the most sets above its floor, the
          // last choice first on a tie.
          let pick = null;
          for (let i = here.length - 1; i >= 0; i--) {
            const e = here[i];
            const n = sets[e.slot.id] || 0;
            if (n <= SETS_PER_EXERCISE.floor) continue;
            if (!pick || n > (sets[pick.slot.id] || 0)) pick = e;
          }
          if (!pick) {
            // Founder order 2026-10-10 (the standard floor): the excess may
            // come from a crediting muscle's set in this session, moved to
            // that muscle's other session when every cap there still holds.
            if (moveCreditingSet(list, byMuscle, sets, facts, si, m)) { toMove -= 1; moved = true; continue; }
            break;
          }
          sets[pick.slot.id] -= 1;
          toMove -= 1;
          moved = true;
          // Find another session of m with direct and fractional room.
          const fresh = sessionTotals(list, sets);
          const dest = sessionIds
            .filter((sj) => sj !== si)
            .map((sj) => ({ sj, entries: free.filter((e) => e.si === sj) }))
            .find(({ sj, entries }) => {
              const tid = list[sj]?.id;
              const d = fresh[tid]?.direct?.[m] || 0;
              const f = fresh[tid]?.fractional?.[m] || 0;
              return d + 1 <= dCap && f + 1 <= fCap + 1e-9 && entries.some((e) => (sets[e.slot.id] || 0) < capOf(e.slot));
            });
          if (dest) {
            let target = null;
            for (const e of dest.entries) {
              const room = capOf(e.slot) - (sets[e.slot.id] || 0);
              if (room > 0 && (!target || room > capOf(target.slot) - (sets[target.slot.id] || 0))) target = e;
            }
            sets[target.slot.id] += 1;
          } else {
            shortfall[m] = (shortfall[m] || 0) + 1;
          }
        }
      }
    }
    if (!moved) break;
  }
}

/**
 * Moves one set of a muscle that credits m (a slot in session `si` whose
 * credits[m] > 0, above its own floor) to another session of that muscle with
 * direct and fractional room, only when every cap holds in the destination
 * session afterwards. Sorted slot ids, so the order is deterministic.
 * Returns whether a set moved.
 */
function moveCreditingSet(list, byMuscle, sets, facts, si, m) {
  const session = list[si];
  const slots = (Array.isArray(session?.slots) ? session.slots : []).slice()
    .sort((a, b) => (String(a?.id) < String(b?.id) ? -1 : String(a?.id) > String(b?.id) ? 1 : 0));
  for (const slot of slots) {
    const c = slot?.muscle;
    if (!c || c === m || isTyped(slot)) continue;
    const credit = slot?.credits && typeof slot.credits === 'object' ? slot.credits[m] : 0;
    if (!isNum(credit) || credit <= 0) continue;
    if ((sets[slot.id] || 0) <= SETS_PER_EXERCISE.floor) continue;
    const mine = (byMuscle.get(c) || []).filter((e) => !isTyped(e.slot));
    const dCap = directCapFor(c, facts);
    const fCap = fractionalCapFor(c, facts);
    const otherSessions = Array.from(new Set(mine.map((e) => e.si))).filter((sj) => sj !== si).sort((a, b) => a - b);
    for (const sj of otherSessions) {
      const entries = mine.filter((e) => e.si === sj);
      let target = null;
      for (const e of entries) {
        const room = capOf(e.slot) - (sets[e.slot.id] || 0);
        if (room > 0 && (!target || room > capOf(target.slot) - (sets[target.slot.id] || 0))) target = e;
      }
      if (!target) continue;
      const tid = list[sj]?.id;
      const before = sessionTotals(list, sets)[tid];
      sets[slot.id] -= 1;
      sets[target.slot.id] += 1;
      const after = sessionTotals(list, sets)[tid];
      // c has room, and no muscle passes its cap in the destination session
      // because of the move.
      let ok = (after?.direct?.[c] || 0) <= dCap && (after?.fractional?.[c] || 0) <= fCap + 1e-9;
      if (ok) {
        for (const x of Object.keys(after?.fractional || {})) {
          const a = after.fractional[x] || 0;
          if (a > fractionalCapFor(x, facts) + 1e-9 && a > (before?.fractional?.[x] || 0) + 1e-9) { ok = false; break; }
        }
      }
      if (ok) return true;
      sets[slot.id] += 1;
      sets[target.slot.id] -= 1;
    }
  }
  return false;
}
