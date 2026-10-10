/**
 * allocate.js -- D219: where every set of a plan's peak week goes (design 3,
 * 4.3 and 4.4, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md).
 *
 * The objective is the evidence's dose-response curve (Pelland 2026, square
 * root form): growth(m) = 1.68 x sqrt(W(m)) over a block, so the value of a
 * muscle's next set is p(m) x 0.84 / sqrt(W(m)), with p the role weight
 * (focus 1.5, standard 1.0 or the division's priority). The allocator places
 * one set at a time where that value is highest, counting the half credit a
 * set gives each synergist, until a limit stops it:
 *   - 4 sets an exercise (compound), 3 (isolation), plus the thin-equipment
 *     bonus when a muscle has only one exercise for the person's kit (D8)
 *   - at most the allowed exercises per muscle per session (design 4.3)
 *   - 8 direct and 11 fractional sets per muscle per session, or the light
 *     cap of a light exposure (design 4.5 step 2)
 *   - the role's peak (standard 20, focus 22; maintenance is held, not grown)
 *   - 8 exercises and 25 working sets a session (D45)
 *   - the person's session length, at the peak week
 * Session time is a constraint, never part of the ranking (ranking per
 * minute would favour cheap isolation sets, design 3). For a separable
 * concave objective with unit steps and box limits this greedy order is
 * optimal; ties break by role, then muscle order, then session order.
 *
 * Inputs are already resolved: which sessions train each muscle (its
 * exposures) and, per muscle, the ordered exercises the catalogue chose for
 * the person's equipment. Pure: no I/O, no clock, no randomness.
 *
 * Fixed-structure mode (register D219, build ruling 5): with `sessionChoices`
 * the sessions and exercises are the person's own (a library or kit plan).
 * Each session's exercises for a muscle are that session's choices for it, in
 * place of the catalogue list; every authored exercise is kept and opened at
 * its floor in step 1 whatever the session ceilings, the session's length or
 * the per-muscle allowance say (the structure is the person's, so those limits
 * bind only the sets above the floors); no exercise is ever opened after
 * step 1; and nothing is thin-equipment (the person's list is not the kit's
 * limit). Steps 2 to 4 then place the sets inside every cap as ever.
 */
import { ROLE } from './bands';
import {
  SETS_PER_EXERCISE, PER_SESSION, SESSION_CEILINGS, OBJECTIVE, ROLE_TARGETS, exerciseCap, exercisesAllowed,
} from './science';
import { PLAN_MUSCLES } from './roles';

/** Rest between sets by kind, seconds (exercise/prescription.js REST_SEC). */
export const REST_BY_KIND = Object.freeze({
  heavy_compound: 180,
  mod_compound: 150,
  machine: 120,
  isolation: 75,
});
const SET_SECONDS = 60;
const TRANSITION_SECONDS = Object.freeze({
  full_gym: 120, machines_cables: 90, home_gym: 60, dumbbells_only: 45, barbell_plates: 75, bodyweight: 30,
});
export const TIME_TOLERANCE_MINUTES = 5;
// The rest a smaller muscle's isolation sets drop to when a session runs over.
export const TRIMMED_REST_SECONDS = 60;
const SMALL_MUSCLES = new Set(['side_delts', 'rear_delts', 'front_delts', 'traps', 'biceps', 'triceps', 'forearms', 'calves', 'abs', 'neck', 'tibialis']);
// A muscle's progress to a floor is read in tenths of it (1 set of a standard
// muscle's 10), so the floor steps stay level to within a tenth.
const FLOOR_BANDS = 10;
const EPS = 1e-9;

/**
 * Minutes for a session's exercises, the way the generator estimates them
 * (planEngine estimateSessionMinutes): 7.5 minutes of overhead plus a
 * minute for each compound after the first, 60 seconds a set, the rest
 * between sets, and a transition between exercises.
 */
export function sessionMinutes(slots, equipment = 'full_gym') {
  const live = slots.filter((x) => x.sets > 0);
  if (live.length === 0) return 0;
  const compounds = live.filter((x) => (x.restSec ?? REST_BY_KIND[x.kind] ?? 120) >= 150).length;
  let sec = (7.5 + Math.max(0, compounds - 1)) * 60;
  for (const x of live) {
    const rest = x.restSec ?? REST_BY_KIND[x.kind] ?? 120;
    sec += x.sets * SET_SECONDS + (x.sets - 1) * rest;
  }
  sec += (live.length - 1) * (TRANSITION_SECONDS[equipment] ?? 90);
  return sec / 60;
}

const muscleOrder = (m) => {
  const i = PLAN_MUSCLES.indexOf(m);
  return i < 0 ? PLAN_MUSCLES.length : i;
};

const roleRank = (role) => (role === ROLE.FOCUS ? 0 : role === ROLE.STANDARD ? 1 : 2);

/**
 * @param {object} args
 * @param {number} args.sessionCount
 * @param {Object<string, object>} args.roles        assignRoles output
 * @param {Object<string, number[]>} args.exposures  per muscle, the session indexes that train it
 * @param {Object<string, Array<{ name: string, kind: string, credits?: Object<string, number>, restSec?: number }>>} args.choices
 *        per muscle, the exercises for its direct slots in catalogue order (credited roles excluded)
 * @param {Array<Object<string, Array<{ name: string, kind: string, credits?: Object<string, number>, restSec?: number }>>>|null} [args.sessionChoices]
 *        fixed-structure mode: by session index, then muscle, the person's own exercises in their order
 *        (see the header); `choices` is not read when this is given
 * @param {Object<string, Object<number, number>>} [args.lightCaps]  per muscle, per session, a lower direct cap
 * @param {Object<string, number>} [args.maxSlots]   per muscle, a lower limit on its exercises a session
 * @param {Object<string, {direct?: number, fractional?: number}>} [args.sessionCaps]
 * @param {number} [args.sessionLengthMinutes]
 * @param {string} [args.equipment]
 * @param {number[]} [args.gapAfter]  hours after each session in the rotation (by session index); a tie between
 *        two of a muscle's sessions goes to the one followed by the longer gap, so the heavier one has more
 *        time to clear (design 4.5 step 2)
 * @param {string[]} [args.twiceFirst]  a full-body week's big muscles: their further sessions open once every
 *        muscle has its first exercise, before any set is added (the planner's big five)
 * @param {string[]} [args.bigFirst]  the big muscles: their further sessions and growth sets come before a smaller
 *        muscle's (founder answer 2026-10-05, "Big muscles first")
 * @returns {{
 *   sessions: Array<{ slots: Array<{ muscle: string, name: string, kind: string, credits: object, restSec: number, sets: number, cap: number, thinEquipment: boolean }>, minutes: number, workingSets: number }>,
 *   weekly: Object<string, { direct: number, fractional: number }>,
 *   limitedBy: Object<string, string>,
 * }}
 */
export function allocatePeakWeek({
  sessionCount, roles, exposures, choices, lightCaps = {}, maxSlots = {}, sessionCaps = {},
  sessionLengthMinutes = 60, equipment = 'full_gym', gapAfter = null, sessionChoices = null, twiceFirst = [],
  bigFirst = [],
}) {
  const n = Math.max(1, sessionCount | 0);
  const sessions = Array.from({ length: n }, () => ({ slots: [] }));
  const muscles = Object.keys(roles).filter((m) => roles[m]?.direct && (exposures[m] || []).length > 0)
    .sort((a, b) => muscleOrder(a) - muscleOrder(b));
  const timeLimit = (sessionLengthMinutes > 0 ? sessionLengthMinutes : 60) + TIME_TOLERANCE_MINUTES;

  // Fixed-structure mode: the person's own exercises, by session and muscle.
  const fixed = Array.isArray(sessionChoices);
  const authored = (m, s) => (fixed && Array.isArray(sessionChoices[s]?.[m]) ? sessionChoices[s][m] : []);

  const choiceList = (m) => (Array.isArray(choices?.[m]) ? choices[m] : []);
  const thin = (m) => !fixed && choiceList(m).length === 1;
  // How many exercises of m session s may hold. In fixed mode it is exactly
  // the person's own, whatever the per-muscle allowance or maxSlots say.
  const slotsAllowed = (m, s) => (fixed ? authored(m, s).length : Math.min(
    exercisesAllowed(m, { focus: roles[m]?.role === ROLE.FOCUS }),
    Number.isFinite(maxSlots[m]) ? maxSlots[m] : Infinity,
    choiceList(m).length,
  ));
  const directCap = (m, s) => {
    const light = lightCaps?.[m]?.[s];
    const cap = sessionCaps?.[m]?.direct ?? PER_SESSION.directCap;
    return Number.isFinite(light) ? Math.min(cap, light) : cap;
  };
  const fractionalCap = (m) => sessionCaps?.[m]?.fractional ?? PER_SESSION.fractionalCap;

  // Which exercise of m a session's next slot uses. A muscle's sessions take
  // its first two catalogue choices in turn (design 4.7 puts the Romanian
  // deadlift in a different session from the seated leg curl; lead ruling,
  // D219 build, for every muscle): a session with one exercise for the
  // muscle uses the first choice in the muscle's first session and the
  // second in its next, so the week has both; a session with two has both;
  // the third only when a session needs it.
  const slotChoice = (m, s, slotIndex) => {
    if (fixed) {
      // The person's own list for this muscle in this session, in order.
      const own = authored(m, s);
      return own[slotIndex] ? { choice: own[slotIndex], index: slotIndex } : null;
    }
    const list = choiceList(m);
    if (list.length === 0) return null;
    const pair = Math.min(2, list.length);
    const order = Math.max(0, (exposures[m] || []).indexOf(s));
    let index = slotIndex < pair ? (order + slotIndex) % pair : slotIndex;
    // A muscle whose first choice is a compound opens every session with a
    // compound: where the rotation would open its second session with the
    // isolation movement (the quads' leg extension alone on day B), the
    // session opens with the next compound on the list (the leg press), then
    // the isolation, then the first choice.
    const compound = (c) => c != null && c.kind !== 'isolation';
    if (pair === 2 && order % 2 === 1 && compound(list[0]) && !compound(list[1])) {
      const alt = list.findIndex((c, i) => i >= 2 && compound(c));
      if (alt >= 0) {
        const seq = [alt, 1, 0, ...list.map((_, i) => i).filter((i) => i >= 2 && i !== alt)];
        index = seq[slotIndex] ?? slotIndex;
      }
    }
    return list[index] ? { choice: list[index], index } : null;
  };

  // ── running totals ──
  const weekly = {};
  const sessionFrac = sessions.map(() => ({}));
  const sessionDirect = sessions.map(() => ({}));
  const addCredit = (s, slot, delta) => {
    const m = slot.muscle;
    weekly[m] = weekly[m] || { direct: 0, fractional: 0 };
    weekly[m].direct += delta;
    weekly[m].fractional += delta;
    sessionDirect[s][m] = (sessionDirect[s][m] || 0) + delta;
    sessionFrac[s][m] = (sessionFrac[s][m] || 0) + delta;
    for (const j of Object.keys(slot.credits || {}).sort()) {
      const c = slot.credits[j];
      if (!(c > 0) || j === m) continue;
      weekly[j] = weekly[j] || { direct: 0, fractional: 0 };
      weekly[j].fractional += c * delta;
      sessionFrac[s][j] = (sessionFrac[s][j] || 0) + c * delta;
    }
  };
  // Each session's running time, kept incrementally with sessionMinutes'
  // formula, so a candidate set is checked without rebuilding the session.
  const transition = TRANSITION_SECONDS[equipment] ?? 90;
  const clock = sessions.map(() => ({ setSec: 0, restSec: 0, compounds: 0, exercises: 0, workingSets: 0 }));
  const minutesOf = (c) => (c.exercises === 0 ? 0
    : (7.5 + Math.max(0, c.compounds - 1)) + (c.setSec + c.restSec + Math.max(0, c.exercises - 1) * transition) / 60);
  const withStep = (c, slot, delta, opening) => {
    const rest = slot.restSec ?? REST_BY_KIND[slot.kind] ?? 120;
    return {
      setSec: c.setSec + SET_SECONDS * delta,
      restSec: c.restSec + rest * (opening ? delta - 1 : delta),
      compounds: c.compounds + (opening && rest >= 150 ? 1 : 0),
      exercises: c.exercises + (opening ? 1 : 0),
      workingSets: c.workingSets + delta,
    };
  };

  // Would adding `delta` sets of `slot` (existing, or new when `opening`) to
  // session s break a limit?
  const fits = (s, slot, delta, opening, ignoreTime = false) => {
    const m = slot.muscle;
    if ((sessionDirect[s][m] || 0) + delta > directCap(m, s) + EPS) return false;
    if ((sessionFrac[s][m] || 0) + delta > fractionalCap(m) + EPS) return false;
    for (const j of Object.keys(slot.credits || {})) {
      const c = slot.credits[j];
      if (!(c > 0) || j === m) continue;
      if ((sessionFrac[s][j] || 0) + c * delta > fractionalCap(j) + EPS && roles[j]?.direct) return false;
    }
    const next = withStep(clock[s], slot, delta, opening);
    // `ignoreTime`: a focus muscle's programmed sets, which the session's
    // length and its D45 ceilings give way to (founder rules 2026-10-04:
    // the session runs longer and the person is told).
    if (!ignoreTime && next.workingSets > SESSION_CEILINGS.workingSets) return false;
    if (!ignoreTime && next.exercises > SESSION_CEILINGS.exercises) return false;
    if (!ignoreTime && minutesOf(next) > timeLimit + EPS) return false;
    return true;
  };

  // Commit a placement: the slot, the credits and the session clock.
  const apply = (step) => {
    clock[step.session] = withStep(clock[step.session], step.slot, step.delta, step.opening);
    if (step.opening) {
      step.slot.sets = step.delta;
      sessions[step.session].slots.push(step.slot);
    } else {
      step.slot.sets += step.delta;
    }
    addCredit(step.session, step.slot, step.delta);
  };

  const openSlot = (s, m) => {
    const index = sessions[s].slots.filter((x) => x.muscle === m).length;
    const picked = slotChoice(m, s, index);
    if (!picked) return null;
    const c = picked.choice;
    return {
      muscle: m,
      name: c.name,
      kind: c.kind,
      credits: c.credits || {},
      restSec: c.restSec ?? REST_BY_KIND[c.kind] ?? 120,
      sets: 0,
      cap: exerciseCap(c.kind, thin(m), { focus: roles[m]?.role === ROLE.FOCUS }),
      focus: roles[m]?.role === ROLE.FOCUS,
      thinEquipment: thin(m),
      choiceIndex: picked.index,
      choice: c,
    };
  };

  const limitedBy = {};

  // ── 1. floors: each exposure opens its first exercise at two sets, round
  // by round, so every muscle's first session is placed before any muscle's
  // second (with 8 exercises a session, D45, the last muscles in the list
  // would otherwise be shut out by the first ones' extra sessions) ──
  // Round 0 gives each muscle its least-loaded session first; later rounds
  // place its remaining sessions in order: a focus muscle's at once, the
  // others' only after the focus muscles have their sets (step 3), so the
  // session's exercises go to the muscle being brought up first (design 4.5
  // step 6; founder rule 2026-10-04).
  const queue = {};
  for (const m of muscles) queue[m] = fixed ? [] : [...(exposures[m] || [])];
  const placeRound = (list, round, ignoreTime = false) => {
    for (const m of list) {
      if (queue[m].length === 0) continue;
      let pickIndex = 0;
      if (round === 0) {
        for (let i = 1; i < queue[m].length; i++) {
          const a = clock[queue[m][i]];
          const b = clock[queue[m][pickIndex]];
          if (a.exercises < b.exercises || (a.exercises === b.exercises && a.workingSets < b.workingSets)) pickIndex = i;
        }
      }
      const s = queue[m].splice(pickIndex, 1)[0];
      const slot = openSlot(s, m);
      if (!slot) continue;
      if (fits(s, slot, SETS_PER_EXERCISE.floor, true, ignoreTime)) {
        apply({ muscle: m, session: s, slot, delta: SETS_PER_EXERCISE.floor, opening: true });
      } else {
        limitedBy[m] = limitedBy[m] || 'floor_did_not_fit';
      }
    }
  };
  // Each round goes to the muscle furthest below its growth floor first (the
  // plan's muscle order on a tie), so a short session's time reaches the
  // quads' second session before a muscle the rows already credit.
  const behind = (m) => {
    const floor = Math.max(1, Math.min(roles[m].growthFloor || 0, roles[m].peak) || 1);
    return (weekly[m]?.fractional || 0) / floor;
  };
  const placeRemaining = (list, ignoreTime = false) => {
    for (let round = 1; list.some((m) => queue[m].length > 0); round++) {
      const ordered = [...list].sort((a, b) => (behind(a) - behind(b)) || (muscleOrder(a) - muscleOrder(b)));
      placeRound(ordered, round, ignoreTime);
    }
  };
  if (fixed) {
    // Fixed structure: every authored exercise is kept and opened at its floor,
    // whatever the session's ceilings, its length or the per-muscle allowance
    // say (the structure is the person's). The caller puts a session's
    // exercises back in their authored order. Nothing opens after this.
    for (const m of muscles) {
      for (const s of exposures[m] || []) {
        for (let i = 0; i < authored(m, s).length; i++) {
          const slot = openSlot(s, m);
          if (!slot) break;
          apply({ muscle: m, session: s, slot, delta: SETS_PER_EXERCISE.floor, opening: true });
        }
      }
    }
  } else {
    // Every muscle's first exercise is placed whatever the session's length
    // (the standard floor, founder order 2026-10-10).
    placeRound(muscles, 0, true);
    // A full-body week (`twiceFirst`, the planner's big five): once every
    // muscle has its first exercise, those muscles' further sessions open
    // before any set is added, so the week's time goes to training the big
    // muscles twice, as a coach programmes a full-body week, before the
    // smaller muscles' sets (review 2026-10-05, finding 6).
    placeRemaining(muscles.filter((m) => twiceFirst.includes(m) && roles[m].role !== ROLE.FOCUS), true);
    placeRemaining(muscles.filter((m) => roles[m].role === ROLE.FOCUS), true);
  }

  // ── 2. maintenance muscles trained directly: up to their target, no further ──
  for (const m of muscles.filter((x) => roles[x].role === ROLE.MAINTENANCE)) {
    let guard = 64;
    while ((weekly[m]?.fractional || 0) + 1 <= roles[m].peak + EPS && guard-- > 0) {
      const step = bestStepFor(m, { exposures, sessions, fits, openSlot, slotsAllowed, gapAfter });
      if (!step) break;
      apply(step);
    }
  }

  // ── 3. growth floors, by priority (design 4.5 steps 4 and 6): every growing
  // muscle first to maintenance (4 sets a week) on the exercises it already
  // has, then the focus muscles to their growth floor (20), then the
  // standard muscles to theirs (10). So when the week cannot fit every
  // floor, the muscles held at maintenance are the lower-priority ones, and
  // a muscle the person picked to bring up is not cut to keep the others
  // level.
  // Inside a floor step the muscle furthest below its level goes first, so
  // no muscle is left behind the rest (design 4.5 step 4: a structure must
  // not win by starving a muscle); among muscles within a tenth of their
  // level of each other, the set that closes the most of the shortfall the
  // plan is judged on (planner.js floorShortfall) goes first, counting the
  // half credit a press gives the triceps or a row the biceps. A set on an
  // exercise already in the session comes before a new exercise: it costs
  // none of the session's 8 exercises (D45), and the credit the other
  // muscles' sets bring arrives before a muscle is judged to need another
  // exercise. ──
  const growers = muscles.filter((m) => roles[m].role !== ROLE.MAINTENANCE);
  const floorOf = (m) => Math.min(roles[m].growthFloor || 0, roles[m].peak);
  const closes = (step) => {
    let focus = 0;
    let standard = 0;
    const add = (j, c) => {
      const r = roles[j];
      if (!r || r.role === ROLE.MAINTENANCE) return;
      const gap = Math.max(0, floorOf(j) - (weekly[j]?.fractional || 0));
      const part = Math.min(c, gap);
      if (r.role === ROLE.FOCUS) focus += part;
      else standard += part * (r.weight || 1);
    };
    add(step.muscle, 1);
    for (const j of Object.keys(step.slot.credits || {}).sort()) {
      const c = step.slot.credits[j];
      if (c > 0 && j !== step.muscle) add(j, c);
    }
    return [focus, standard];
  };
  const floorSteps = [
    { members: growers, level: (m) => Math.min(ROLE_TARGETS.maintenance.target, floorOf(m)), openings: false, valued: false },
    // Founder rule (2026-10-04): a focus muscle's sets are programmed in full,
    // never cut to fit the session length; a session that runs over says so
    // (and first shortens the smaller muscles' rest, below).
    { members: growers.filter((m) => roles[m].role === ROLE.FOCUS), level: floorOf, openings: true, valued: true, ignoreTime: true },
    // Founder order 2026-10-10 (register D219 addendum, the standard floor):
    // no muscle's standard is cut to fit the session length or the day count.
    // The growth floor of every standard muscle is placed the way a focus
    // muscle's sets are: past the session's length and the D45 ceilings when
    // it must be, with the session's real length reported (`overMinutes`,
    // `overCeilings`). Time and the ceilings bind only the growth above the
    // floors (step 4).
    // Founder answer 2026-10-05, "Big muscles first": the big muscles
    // (`bigFirst`) open their further sessions and reach their growth floor
    // before a smaller muscle gets another session or its growth sets, so a
    // short week's time goes to them first, as coaches programme short weeks.
    {
      members: growers.filter((m) => roles[m].role !== ROLE.FOCUS && bigFirst.includes(m)),
      opens: muscles.filter((m) => roles[m].role !== ROLE.FOCUS && bigFirst.includes(m)),
      level: floorOf, openings: true, valued: true, ignoreTime: true,
    },
    {
      members: growers.filter((m) => roles[m].role !== ROLE.FOCUS && !bigFirst.includes(m)),
      opens: muscles.filter((m) => roles[m].role !== ROLE.FOCUS && !bigFirst.includes(m)),
      level: floorOf, openings: true, valued: true, ignoreTime: true,
    },
  ];
  // The standard in the muscle's own sets (founder order 2026-10-10, the
  // standard floor; science.js STANDARD_DIRECT_FLOOR): after the fractional
  // floors, every growing muscle is brought to its direct floor on its own
  // exercises, whatever credit the other muscles' sets gave it, past the
  // session's length and ceilings when it must be. A focus muscle and a
  // standard one keep the same standard; the focus adds on top of it.
  floorSteps.push({
    members: growers, level: (m) => Math.min(roles[m].directFloor || 0, roles[m].peak), openings: true, valued: true, ignoreTime: true, measure: 'direct',
  });
  for (const { members, level, openings, valued, ignoreTime = false, opens = null, measure = 'fractional' } of floorSteps) {
    // The other muscles' further sessions open once the focus muscles have
    // their sets (step 1): the big muscles' first, then the rest.
    if (opens) placeRemaining(opens, ignoreTime);
    let floorGuard = 2000;
    while (floorGuard-- > 0) {
      let best = null;
      for (const allowOpening of openings ? [false, true] : [false]) {
        for (const m of members) {
          const target = level(m);
          const W = weekly[m]?.[measure] || 0;
          // Up to the level, the last set allowed to carry it just past. The
          // direct floor is a standard the peak never caps (a muscle's own
          // sets are the standard; the fractional peak binds the growth above).
          if (W + EPS >= target || (measure === 'fractional' && W + 1 > roles[m].peak + EPS)) continue;
          const step = bestStepFor(m, { exposures, sessions, fits, openSlot, slotsAllowed, gapAfter, allowOpening, ignoreTime });
          if (!step) continue;
          const [focus, standard] = valued ? closes(step) : [0, 0];
          const ratio = W / Math.max(target, 1);
          const key = [Math.floor(ratio * FLOOR_BANDS + EPS), -focus, -standard, ratio, roleRank(roles[m].role), muscleOrder(m), step.session];
          if (!best || lexLess(key, best.key)) best = { key, step };
        }
        if (best) break;
      }
      if (!best) break;
      apply(best.step);
    }
  }

  // ── 4. the greedy: one set at a time where it adds the most ──
  let guard = 2000;
  while (guard-- > 0) {
    let best = null;
    for (const m of growers) {
      const W = weekly[m]?.fractional || 0;
      if (W + 1 > roles[m].peak + EPS) continue;
      const step = bestStepFor(m, { exposures, sessions, fits, openSlot, slotsAllowed, gapAfter });
      if (!step) continue;
      const value = stepValue(step, roles, weekly);
      const key = [-value, roleRank(roles[m].role), muscleOrder(m), step.session, step.opening ? 1 : 0];
      if (!best || lexLess(key, best.key)) best = { key, step };
    }
    if (!best) break;
    apply(best.step);
  }

  // Why each growing muscle stopped below its peak (for the explanations).
  for (const m of growers) {
    const W = weekly[m]?.fractional || 0;
    if (W + 1 <= roles[m].peak + EPS && !limitedBy[m]) limitedBy[m] = 'limits';
  }

  // A session the focus sets take past the person's length first shortens
  // the rest on the smaller muscles' isolation exercises (founder rule
  // 2026-10-04: trim rest, never volume); what is still over is reported,
  // so the person sees the session's real length.
  const limit = sessionLengthMinutes > 0 ? sessionLengthMinutes : 60;
  for (const sess of sessions) {
    if (!Number.isFinite(limit) || sessionMinutes(sess.slots, equipment) <= limit + TIME_TOLERANCE_MINUTES + EPS) continue;
    for (const x of sess.slots) {
      if (x.kind === 'isolation' && SMALL_MUSCLES.has(x.muscle) && roles[x.muscle]?.role !== ROLE.FOCUS
        && (x.restSec ?? REST_BY_KIND.isolation) > TRIMMED_REST_SECONDS) {
        x.restSec = TRIMMED_REST_SECONDS;
        x.restTrimmed = true;
      }
    }
  }

  return {
    sessions: sessions.map((sess) => {
      const minutes = Math.round(sessionMinutes(sess.slots, equipment) * 10) / 10;
      return {
        slots: sess.slots.filter((x) => x.sets > 0),
        minutes,
        overMinutes: Number.isFinite(limit) ? Math.max(0, Math.round((minutes - limit) * 10) / 10) : 0,
        overCeilings: sess.slots.filter((x) => x.sets > 0).length > SESSION_CEILINGS.exercises
          || sess.slots.reduce((a, x) => a + x.sets, 0) > SESSION_CEILINGS.workingSets,
        workingSets: sess.slots.reduce((a, x) => a + x.sets, 0),
      };
    }),
    weekly,
    limitedBy,
  };
}

/**
 * The best single placement for muscle m: a set on an existing exercise, else
 * (when `allowOpening`) a new exercise at its floor.
 */
function bestStepFor(m, {
  exposures, sessions, fits, openSlot, slotsAllowed, gapAfter = null, allowOpening = true, ignoreTime = false,
}) {
  let best = null;
  for (const s of exposures[m] || []) {
    const mine = sessions[s].slots.filter((x) => x.muscle === m);
    // The existing exercise with the most room under its cap, first choice on a tie.
    let target = null;
    for (const x of mine) {
      const room = x.cap - x.sets;
      if (room > 0 && (!target || room > target.cap - target.sets)) target = x;
    }
    let step = null;
    if (target && fits(s, target, 1, false, ignoreTime)) {
      step = { muscle: m, session: s, slot: target, delta: 1, opening: false };
    } else if (allowOpening && mine.length < slotsAllowed(m, s)) {
      const fresh = openSlot(s, m);
      if (fresh && fits(s, fresh, SETS_PER_EXERCISE.floor, true, ignoreTime)) {
        step = { muscle: m, session: s, slot: fresh, delta: SETS_PER_EXERCISE.floor, opening: true };
      }
    }
    if (!step) continue;
    // Prefer the session with fewer of m's sets (spreads load), then the one
    // followed by the longer gap, then the earlier one.
    const here = mine.reduce((a, x) => a + x.sets, 0);
    // A new exercise goes to the muscle's session with fewer exercises
    // already (founder order 2026-10-10: the standard's exercises are spread
    // over the week's sessions, not piled into one past the D45 ceiling while
    // its twin has room).
    const crowd = step.opening ? sessions[s].slots.filter((x) => x.sets > 0).length : 0;
    const key = [here, step.opening ? 1 : 0, crowd, -(Array.isArray(gapAfter) ? (gapAfter[s] || 0) : 0), s];
    if (!best || lexLess(key, best.key)) best = { key, step };
  }
  return best ? best.step : null;
}

/** Value per set of a placement: the marginal growth of the muscle and of every synergist it credits. */
function stepValue(step, roles, weekly) {
  const marginal = (j, credit) => {
    const r = roles[j];
    if (!r || r.role === ROLE.MAINTENANCE || !(r.weight > 0)) return 0;
    const W = weekly[j]?.fractional || 0;
    if (W + credit > r.peak + EPS) return 0;
    return credit * r.weight * OBJECTIVE.marginalCoefficient / Math.sqrt(Math.max(W, 1));
  };
  let v = marginal(step.muscle, 1);
  for (const j of Object.keys(step.slot.credits || {}).sort()) {
    const c = step.slot.credits[j];
    if (c > 0 && j !== step.muscle) v += marginal(j, c);
  }
  return v;
}

function lexLess(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (Math.abs(x - y) > 1e-12) return x < y;
  }
  return false;
}
