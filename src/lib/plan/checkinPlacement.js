/**
 * checkinPlacement.js -- D219 lane A3: the weekly check-in's step for next
 * week, placed set by set (design 4.10 and 4.11, docs/audit/
 * plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md; register D219,
 * founder answer Q6).
 *
 * WHY. Today the coach's number is added to whatever the template says next
 * week, for one week, on every muscle row; each exercise is then scaled
 * proportionally and rounded up (a +3 served a 4-set bench press as 7), no
 * exercise is ever added, and the following week returns to the template
 * (design 1.2). The founder: "in check ins if the detail is to add 3 sets per
 * muscle group for example those 3 sets should be spread out on exercises and
 * if needed a new exercise and sets redistributed" (register D219).
 *
 * THE STEPS (design 4.10, CHECKIN_STEPS in science.js), each relative to THIS
 * week's level, because a step replaces the plan's own +2 climb for next week:
 *   +3 or +2   +3 sets for each muscle that can take them (strong)
 *   +1         the plan's own climb: nothing to apply
 *   hold       next week stays at this week's level (never above the plan's
 *              own next week), then the plan's own climb resumes from it
 *   withheld   a hold (the coordination rule, a safety note or the outcome
 *              memory withheld an increase): the same writes as a hold, so
 *              "Training volume stays the same" is exactly what Apply does
 *   pull back  2 fewer sets, never below maintenance
 * Muscles at their role's top, maintenance muscles, muscles with no exercise in
 * the plan and muscles the caller marks held (a capability limit or a soreness
 * answer, coachApplySafety.js) are not raised. Nothing is written until the
 * person taps Apply (D96): this module only computes.
 *
 * PLACEMENT. The weekly rows stay in DIRECT sets, the unit FQ-4 and every
 * reader use (design 9), and every week's sets per exercise come from
 * prescribe() (design 4.9). So a check-in's placement is not a second
 * algorithm: next week's rows go through prescribeWeek() exactly as the logger
 * will serve them, and "where every added set goes" is the difference between
 * this week's served sets and next week's, exercise by exercise. That keeps one
 * number everywhere (design 11 test 7): the card names what the logger serves.
 * prescribe() spreads a raise across a muscle's sessions by the plan's stored
 * shares (the heavy exposure, the one followed by the longer gap, takes the
 * larger share, design 4.5) and, inside a session, one set at a time to the
 * exercise with the most room under its cap, so a +3 lands on three exercises
 * when three have room and never on one.
 *
 * WHAT DOES NOT FIT. A raise that prescribe() would report as a shortfall is
 * handled in this order: (1) when every existing slot of the muscle in a
 * session is capped but the session still has room under the muscle's session
 * cap, the muscle's next catalogue exercise (the first that no exercise of the
 * muscle in the plan already is, for a role the muscle does not cover yet)
 * opens in the session with the longest gap after it (the plan stores each
 * session's gap rank, so the check-in never reads the recovery model), never
 * past the exercises-per-session limit or D45's 8 exercises and 25 working
 * sets; (2) otherwise the target stops at what can be placed and the rest is
 * reported (design 4.10 step 3), never forced onto an exercise. A new session
 * is only ever added at a block boundary.
 *
 * CARRYING FORWARD. The level the step sets carries forward: each later week
 * climbs the plan's own step for that week from it (the plan's stored rows give
 * the step), inside the role ceilings and what prescribe() can place, and the
 * block's recovery week is never above the week before it. A muscle a strong
 * step lifts past a standard muscle's 20 becomes "raised" (up to 24, design
 * 4.2): `raisedRoles` names them so the caller can record the role.
 *
 * Pure and deterministic: no I/O, no clock, no randomness, and the result does
 * not depend on the key order of any input. It imports only science.js and
 * prescribe.js, so coachApply.js (an ED-safety module) can reach it with no
 * route into the recovery model (edIsolation.guard.test.js, made transitive).
 */
import {
  CHECKIN_STEPS, ROLE_TARGETS, PER_SESSION, SESSION_CEILINGS, SETS_PER_EXERCISE, exercisesAllowed,
} from './science';
import { prescribeWeek } from './prescribe';

/** The five cards of design 4.10. */
export const CHECKIN_KIND = Object.freeze({
  INCREASE: 'increase',
  PLANNED_CLIMB: 'plannedClimb',
  HOLD: 'hold',
  WITHHELD: 'withheld',
  PULL_BACK: 'pullBack',
});

/**
 * The lowest a pull-back may take a muscle's weekly sets (fractional): the
 * maintenance target, the bottom of "4 to 6, flat" in design 4.2.
 */
export const PULL_BACK_FLOOR = ROLE_TARGETS.maintenance.target;

const EPS = 1e-9;
const NO_RANK = 99;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Which card the coach's volume signal makes. `withheld` only changes the words. */
export function checkinKind(signal, { withheld = false } = {}) {
  const s = Number(signal);
  if (!Number.isFinite(s) || s === 0) return withheld ? CHECKIN_KIND.WITHHELD : CHECKIN_KIND.HOLD;
  if (s >= 2) return CHECKIN_KIND.INCREASE;
  if (s > 0) return CHECKIN_KIND.PLANNED_CLIMB;
  return CHECKIN_KIND.PULL_BACK;
}

/** The step for a card, in sets a week, from CHECKIN_STEPS. */
export function checkinStep(kind) {
  switch (kind) {
    case CHECKIN_KIND.INCREASE: return CHECKIN_STEPS.strong;
    case CHECKIN_KIND.PLANNED_CLIMB: return CHECKIN_STEPS.plannedClimb;
    case CHECKIN_KIND.PULL_BACK: return CHECKIN_STEPS.pullBack;
    default: return CHECKIN_STEPS.hold;
  }
}

/**
 * The most weekly sets (fractional) a check-in may take a muscle to: a focus
 * muscle's planned ceiling (30), a standard or raised muscle's 24, a
 * maintenance muscle's 6 (design 4.2; ROLE_TARGETS).
 */
export function roleCeiling(role) {
  if (role === 'focus') return ROLE_TARGETS.focus.plannedCeiling;
  if (role === 'maintenance') return ROLE_TARGETS.maintenance.high;
  return ROLE_TARGETS.raised.high;
}

/**
 * The role's top (fractional) the session's own +1 keeps the week under
 * (design 4.11, the roles of 4.2): a standard muscle's 20, a raised muscle's
 * 24, a focus muscle's 24, a maintenance muscle's 6. Below roleCeiling, which
 * bounds a check-in, so a good session never carries a standard muscle into
 * the band the app words as above the normal growth range (review finding 8).
 */
export function roleTop(role) {
  if (role === 'focus') return ROLE_TARGETS.focus.high;
  if (role === 'maintenance') return ROLE_TARGETS.maintenance.high;
  if (role === 'raised') return ROLE_TARGETS.raised.high;
  return ROLE_TARGETS.standard.peakMax;
}

// ── small helpers ────────────────────────────────────────────────────────

function indexRows(rows) {
  const out = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const weekId = r?.mesocycle_week_id ?? r?.mesocycleWeekId;
    const muscle = r?.muscle;
    const planned = Number(r?.planned_sets ?? r?.plannedSets);
    if (weekId == null || !muscle || !Number.isFinite(planned)) continue;
    if (!out.has(weekId)) out.set(weekId, {});
    out.get(weekId)[muscle] = {
      planned,
      mev: r.mev ?? null,
      mav: r.mav ?? null,
      mrv: r.mrv ?? null,
    };
  }
  return out;
}

const plannedOf = (map) => Object.fromEntries(Object.entries(map).map(([m, r]) => [m, r.planned]));

function serve(sessions, targets, facts) {
  return prescribeWeek({
    sessions,
    weekTargets: targets,
    facts: { exposureShares: facts?.exposureShares, sessionCaps: facts?.sessionCaps },
  });
}

/** A muscle's sets across the whole served week: 'direct' or 'fractional'. */
function weekly(served, muscle, which) {
  let total = 0;
  for (const per of Object.values(served?.perSession || {})) total += per?.[which]?.[muscle] || 0;
  return total;
}

function sessionCapFor(facts, muscle, which) {
  const v = facts?.sessionCaps?.[muscle]?.[which];
  if (isNum(v) && v > 0) return v;
  return which === 'direct' ? PER_SESSION.directCap : PER_SESSION.fractionalCap;
}

function mrvCapOf(row) {
  if (isNum(row?.mrv)) return row.mrv;
  if (isNum(row?.mav)) return row.mav;
  return ROLE_TARGETS.focus.plannedCeiling;
}

/**
 * The most direct sets a week a check-in may take muscle m to: the row's band
 * top, and never past the recovery-safe weekly maximum the planner worked out
 * for the plan (design 4.14 step 4, facts.recoverySafeMax), so a check-in
 * cannot raise a muscle past what the readiness check found recovered.
 */
function hasSafeMax(facts) {
  const v = facts?.recoverySafeMax;
  return v != null && typeof v === 'object' && Object.values(v).some((n) => isNum(n));
}

function raiseCapOf(row, m, facts) {
  const band = mrvCapOf(row);
  const safe = facts?.recoverySafeMax?.[m];
  return isNum(safe) && safe >= 0 ? Math.min(band, safe) : band;
}

function modeOfPositive(values) {
  const counts = new Map();
  for (const v of values) if (v > 0) counts.set(v, (counts.get(v) || 0) + 1);
  let best = 0;
  let bestCount = 0;
  for (const [v, c] of Array.from(counts.entries()).sort((a, b) => a[0] - b[0])) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

function emptyPlan(kind, step) {
  return {
    kind,
    step,
    applies: false,
    reason: null,
    changes: [],
    muscles: [],
    opened: [],
    notRaised: [],
    unplaced: {},
    laterUnplaced: {},
    raisedRoles: [],
    plannedClimb: 0,
    sessions: [],
  };
}

// ── the planning ─────────────────────────────────────────────────────────

/**
 * Plan one check-in for a plan the new planner built.
 *
 * @param {object} args
 * @param {Array<{id: string, slots: Array<object>}>} args.sessions  prescribe's session shape, in rotation
 *        order; a slot may also carry `name` and `exerciseId` (the card names exercises, and an
 *        opened exercise is never one already in the plan for the muscle)
 * @param {object} args.facts  the plan's v2 facts: roles, exposureShares, sessionCaps, gapRanks, recoverySafeMax
 * @param {Array<{id: string, index?: number, deload?: boolean}>} args.weeks  the block's weeks from
 *        THIS week on, this week first, then next week and every later one
 * @param {Array<object>} args.rows  planned_muscle_volume rows (snake_case or camelCase) for those weeks
 * @param {number} args.signal  the coach's volume signal (+3, +2, +1, 0, -2)
 * @param {boolean} [args.withheld]  an increase was withheld: the card says so, the writes are a hold's
 * @param {Iterable<string>} [args.held]  muscles an increase may not reach (capability, soreness)
 * @param {Object<string, Array<object>>|function(string): Array<object>} [args.catalogue]
 *        per muscle, the standard exercises in catalogue order ({ name, exerciseId, role, kind, credits }),
 *        already filtered for the person's equipment and exclusions; omit to open nothing
 */
export function planCheckin({
  sessions, facts, weeks, rows, signal, withheld = false, held = [], catalogue = null,
} = {}) {
  const kind = checkinKind(signal, { withheld });
  const step = checkinStep(kind);
  const out = emptyPlan(kind, step);

  const baseSessions = (Array.isArray(sessions) ? sessions : []).map((s) => ({
    ...s,
    slots: (Array.isArray(s?.slots) ? s.slots : []).filter(Boolean).map((x) => ({ ...x })),
  }));
  const weekList = (Array.isArray(weeks) ? weeks : []).filter((w) => w && w.id != null);
  const cur = weekList[0];
  const next = weekList[1];
  out.sessions = baseSessions;
  if (!cur || !next) { out.reason = 'noNextWeek'; return out; }
  if (next.deload) { out.reason = 'recoveryWeek'; return out; }

  const byWeek = indexRows(rows);
  const curRows = byWeek.get(cur.id) || {};
  const nextRows = byWeek.get(next.id) || {};
  const roles = facts?.roles && typeof facts.roles === 'object' ? facts.roles : {};
  const roleOf = (m) => (typeof roles[m] === 'string' ? roles[m] : 'standard');
  const heldSet = held instanceof Set ? held : new Set(Array.isArray(held) ? held : Array.from(held || []));
  const rank = (s) => (isNum(facts?.gapRanks?.[s.id]) ? facts.gapRanks[s.id] : NO_RANK);

  const planMuscles = new Set();
  for (const s of baseSessions) for (const x of s.slots) if (x.muscle) planMuscles.add(x.muscle);

  const storedNext = plannedOf(nextRows);
  const curTargets = plannedOf(curRows);
  const before = serve(baseSessions, curTargets, facts);
  const muscles = Object.keys(storedNext).filter((m) => planMuscles.has(m) && curRows[m]).sort();

  out.plannedClimb = modeOfPositive(muscles.map((m) => storedNext[m] - curTargets[m]));
  if (kind === CHECKIN_KIND.PLANNED_CLIMB) return out;

  // ── what each muscle should have next week ──────────────────────────────
  const want = { ...storedNext };
  const eligible = [];
  for (const m of muscles) {
    const c = curTargets[m];
    const s = storedNext[m];
    if (kind === CHECKIN_KIND.HOLD || kind === CHECKIN_KIND.WITHHELD) {
      // A hold only ever takes the plan's climb off: where the plan's own
      // next week is already at or below this week's level it stands, so a
      // hold never adds a set to any muscle (held or not).
      want[m] = Math.min(s, c);
    } else if (kind === CHECKIN_KIND.PULL_BACK) {
      const credit = Math.max(0, weekly(before, m, 'fractional') - weekly(before, m, 'direct'));
      const floorDirect = Math.max(0, Math.ceil(PULL_BACK_FLOOR - credit - EPS));
      // Two fewer, not below maintenance, never above where the plan was going.
      want[m] = Math.min(s, Math.max(c + step, Math.min(c, floorDirect)));
    } else {
      if (heldSet.has(m)) { out.notRaised.push({ muscle: m, why: 'held' }); continue; }
      if (roleOf(m) === 'maintenance') { out.notRaised.push({ muscle: m, why: 'maintenance' }); continue; }
      const room = Math.floor(roleCeiling(roleOf(m)) - weekly(before, m, 'fractional') + EPS);
      const by = Math.min(step, room);
      if (by < 1) { out.notRaised.push({ muscle: m, why: 'top' }); continue; }
      want[m] = Math.max(s, Math.min(c + by, Math.max(s, raiseCapOf(nextRows[m], m, facts))));
      eligible.push(m);
    }
  }

  const resolveCatalogue = (m) => {
    try {
      const list = typeof catalogue === 'function' ? catalogue(m) : catalogue?.[m];
      return Array.isArray(list) ? list : [];
    } catch (_e) {
      // A catalogue that cannot be read opens nothing: the sets are reported.
      return [];
    }
  };

  // ── next week: place what fits, open an exercise only when every slot is capped ──
  const nextFit = settle({
    sessions: baseSessions,
    targets: want,
    base: storedNext,
    facts,
    // A plan with a recovery-safe maximum (design 4.14 step 4) is raised only
    // within its own exercises: the maximum already stops where they are full,
    // and an exercise opened here would place sets the readiness check never
    // read (review 2026-10-05: raised together, the quads' credit filled the
    // glutes' session cap and the check-in opened a glute exercise in another
    // session, so a plan that passed found the glutes short). What does not
    // fit is reported, as when the structure is full.
    allowOpen: kind === CHECKIN_KIND.INCREASE && !hasSafeMax(facts),
    resolveCatalogue,
    roleOf,
    rank,
    planMuscles,
  });
  const nextTargets = nextFit.targets;
  const finalSessions = nextFit.sessions;
  const opened = nextFit.opened;
  out.sessions = finalSessions;

  const pushChanges = (week, targets, rowsOfWeek) => {
    for (const m of Object.keys(rowsOfWeek).sort()) {
      if (!isNum(targets[m]) || targets[m] === rowsOfWeek[m].planned) continue;
      out.changes.push({
        mesocycleWeekId: week.id,
        weekIndex: isNum(week.index) ? week.index : weekList.indexOf(week),
        muscle: m,
        plannedSets: targets[m],
        mev: rowsOfWeek[m].mev,
        mav: rowsOfWeek[m].mav,
        mrv: rowsOfWeek[m].mrv,
      });
    }
  };
  pushChanges(next, nextTargets, nextRows);

  // ── later weeks: the new level carries forward ──────────────────────────
  const servedByWeek = [serve(finalSessions, nextTargets, facts)];
  let prevFinal = nextTargets;
  let prevStored = storedNext;
  for (let wi = 2; wi < weekList.length; wi++) {
    const week = weekList[wi];
    const rowsW = byWeek.get(week.id) || {};
    const storedW = plannedOf(rowsW);
    const tw = { ...storedW };
    for (const m of Object.keys(storedW).filter((k) => planMuscles.has(k)).sort()) {
      if (!isNum(prevFinal[m]) || !isNum(prevStored[m])) continue;
      if (prevFinal[m] === prevStored[m]) continue; // the path is unchanged: the plan's own row stands
      if (week.deload) {
        tw[m] = Math.min(storedW[m], prevFinal[m]);
        continue;
      }
      const climb = Math.max(0, storedW[m] - prevStored[m]);
      const climbed = prevFinal[m] + climb;
      tw[m] = climbed > storedW[m]
        ? Math.max(storedW[m], Math.min(climbed, Math.max(storedW[m], raiseCapOf(rowsW[m], m, facts))))
        : climbed;
    }
    const fit = settle({
      sessions: finalSessions,
      targets: tw,
      base: storedW,
      facts,
      allowOpen: false,
      resolveCatalogue,
      roleOf,
      rank,
      planMuscles,
    });
    pushChanges(week, fit.targets, rowsW);
    const lost = {};
    for (const m of Object.keys(storedW)) {
      if (tw[m] > storedW[m] && fit.targets[m] < tw[m]) lost[m] = tw[m] - fit.targets[m];
    }
    if (Object.keys(lost).length) out.laterUnplaced[isNum(week.index) ? week.index : wi] = lost;
    servedByWeek.push(serve(finalSessions, fit.targets, facts));
    prevFinal = fit.targets;
    prevStored = storedW;
  }

  // ── the card's detail: this week's served sets against next week's ──────
  const after = servedByWeek[0];
  const order = [];
  for (const s of finalSessions) for (const x of s.slots) if (x.muscle && !order.includes(x.muscle)) order.push(x.muscle);
  const shown = (kind === CHECKIN_KIND.INCREASE ? eligible : []).slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
  for (const m of shown) {
    const moves = [];
    const joined = [];
    for (const s of finalSessions) {
      for (const x of s.slots) {
        if (x.muscle !== m) continue;
        const now = after.sets[x.id] ?? 0;
        if (x.opened === true) {
          if (now > 0) joined.push({ slotId: x.id, sessionId: s.id, name: x.name ?? x.id, exerciseId: x.exerciseId ?? null, sets: now });
        } else {
          const was = before.sets[x.id] ?? 0;
          if (now !== was) moves.push({ slotId: x.id, sessionId: s.id, name: x.name ?? x.id, from: was, to: now });
        }
      }
    }
    // What the card claims is what prescribe() serves: the muscle's sets next
    // week against this week's, and whatever of the step that is not.
    const added = weekly(after, m, 'direct') - weekly(before, m, 'direct');
    const unplaced = Math.max(0, want[m] - curTargets[m] - added);
    if (unplaced > 0) out.unplaced[m] = unplaced;
    out.muscles.push({
      muscle: m,
      role: roleOf(m),
      from: curTargets[m],
      to: nextTargets[m],
      planned: storedNext[m],
      added,
      moves,
      opened: joined,
      unplaced,
    });
  }

  out.opened = opened.map((slot) => ({
    slotId: slot.id,
    sessionId: slot.sessionId,
    muscle: slot.muscle,
    exerciseId: slot.exerciseId ?? null,
    name: slot.name ?? null,
    kind: slot.kind,
    credits: slot.credits || {},
    role: slot.role ?? null,
    sets: after.sets[slot.id] ?? 0,
  }));

  // A standard muscle a strong step lifted past 20 is now "raised" (design 4.2).
  if (kind === CHECKIN_KIND.INCREASE) {
    for (const m of muscles) {
      if (roleOf(m) !== 'standard') continue;
      if (!out.changes.some((c) => c.muscle === m)) continue;
      const peak = servedByWeek.reduce((a, served) => Math.max(a, weekly(served, m, 'fractional')), 0);
      if (peak > ROLE_TARGETS.standard.peakMax + EPS) out.raisedRoles.push(m);
    }
  }

  out.applies = out.changes.length > 0 || out.opened.length > 0;
  return out;
}

// ── fitting a week's targets inside every cap ─────────────────────────────

/**
 * What a week's raised targets (above `base`) cannot do, in the order the
 * design reports it: sets prescribe() cannot place, a role ceiling, and a
 * session pushed past D45's working sets. Only muscles raised above `base`
 * are judged: what the plan already had is not the check-in's to change, so a
 * shortfall the plan's own base week already had is not charged to the raise
 * (the base is served on the same sessions as the raise, opened exercises
 * included), and a session is judged against the plan as it stood before any
 * exercise opened (`original`).
 */
function findProblem({ sessions, targets, base, facts, original, roleOf, planMuscles }) {
  const raised = Object.keys(targets)
    .filter((m) => planMuscles.has(m) && isNum(targets[m]) && isNum(base[m]) && targets[m] > base[m])
    .sort();
  if (raised.length === 0) return null;
  const served = serve(sessions, targets, facts);
  const baseNow = serve(sessions, base, facts);
  for (const m of raised) {
    const extra = (served.shortfall[m] || 0) - (baseNow.shortfall[m] || 0);
    if (extra > 0) return { type: 'shortfall', muscle: m, n: extra };
  }
  for (const m of raised) {
    if (weekly(served, m, 'fractional') > roleCeiling(roleOf(m)) + EPS) return { type: 'ceiling', muscle: m, n: 1 };
  }
  for (const s of sessions) {
    const now = served.perSession[s.id]?.workingSets || 0;
    const was = original.perSession[s.id]?.workingSets || 0;
    if (now <= SESSION_CEILINGS.workingSets || now <= was) continue;
    let best = null;
    for (const m of raised) {
      const d = (served.perSession[s.id]?.direct?.[m] || 0) - (original.perSession[s.id]?.direct?.[m] || 0);
      if (d > 0 && (!best || d > best.d)) best = { m, d };
    }
    if (best) return { type: 'session', muscle: best.m, n: 1 };
  }
  return null;
}

/**
 * Bring `targets` inside every cap. A shortfall first tries to open the
 * muscle's next catalogue exercise (when `allowOpen`); whatever still does not
 * fit lowers the target, never below `base`. An exercise opened for sets the
 * final targets no longer need is taken out again.
 */
function settle({ sessions, targets, base, facts, allowOpen, resolveCatalogue, roleOf, rank, planMuscles }) {
  let current = sessions;
  const t = { ...targets };
  const opened = [];
  const original = serve(sessions, base, facts);
  const ctx = { facts, original, roleOf, planMuscles };

  for (let guard = 0; guard < 400; guard++) {
    const problem = findProblem({ sessions: current, targets: t, base, ...ctx });
    if (!problem) break;
    if (problem.type === 'shortfall' && allowOpen) {
      const open = tryOpen({
        muscle: problem.muscle, current, targets: t, base, facts, original, resolveCatalogue, roleOf, rank, opened,
      });
      if (open) {
        current = open.sessions;
        opened.push(open.slot);
        continue;
      }
    }
    const cut = Math.min(problem.n, t[problem.muscle] - base[problem.muscle]);
    if (!(cut > 0)) break;
    t[problem.muscle] -= cut;
  }

  // Take out an opened exercise the final targets do not need.
  for (let k = opened.length - 1; k >= 0; k--) {
    const without = current.map((s) => ({ ...s, slots: s.slots.filter((x) => x.id !== opened[k].id) }));
    if (!findProblem({ sessions: without, targets: t, base, ...ctx })) {
      current = without;
      opened.splice(k, 1);
    }
  }
  return { sessions: current, targets: t, opened };
}

function capOfSlot(slot) {
  const isolation = slot?.kind === 'isolation';
  const base = isolation && slot?.focus !== true ? SETS_PER_EXERCISE.capIsolation : SETS_PER_EXERCISE.capCompound;
  return slot?.thinEquipment === true ? base + SETS_PER_EXERCISE.thinEquipmentBonus : base;
}

const sameExercise = (choice, x) => (choice.exerciseId && x.exerciseId && choice.exerciseId === x.exerciseId)
  || (choice.name && x.name && choice.name === x.name);

/**
 * The muscle's next catalogue exercise for this session: the first, in
 * catalogue order, that the session does not already have (whatever muscle it
 * is for) and whose role the muscle's exercises in the session do not cover
 * yet (design 4.10 step 2). One the muscle does not use anywhere in the plan
 * yet comes first; only when the catalogue has none left does a role the
 * muscle uses in another session stand in, so the sets are placed rather than
 * reported.
 */
function nextChoice(list, sessions, muscle, session) {
  const mineHere = session.slots.filter((x) => x.muscle === muscle);
  const coveredHere = new Set();
  for (const x of mineHere) {
    const match = list.find((choice) => sameExercise(choice, x));
    if (match?.role) coveredHere.add(match.role);
  }
  const usable = list.filter((choice) => choice && choice.name
    && !session.slots.some((x) => sameExercise(choice, x))
    && !(choice.role && coveredHere.has(choice.role)));
  const usedAnywhere = (choice) => sessions.some((s) => s.slots.some((x) => x.muscle === muscle && sameExercise(choice, x)));
  return usable.find((choice) => !usedAnywhere(choice)) ?? usable[0] ?? null;
}

/**
 * Open the muscle's next catalogue exercise in the session with the longest
 * gap after it (then the fewest sets of the muscle, then rotation order), when
 * the muscle's slots there are all capped but the session still has room under
 * the muscle's session cap (design 4.10 step 2). Accepted only if it places
 * more of the muscle's sets and keeps the session inside D45.
 */
function tryOpen({ muscle, current, targets, base, facts, original, resolveCatalogue, roleOf, rank, opened }) {
  const focus = roleOf(muscle) === 'focus';
  const allowed = exercisesAllowed(muscle, { focus });
  const directCap = sessionCapFor(facts, muscle, 'direct');
  const fractionalCap = sessionCapFor(facts, muscle, 'fractional');
  const list = resolveCatalogue(muscle);
  if (list.length === 0) return null;

  const served = serve(current, targets, facts);
  const baseNow = serve(current, base, facts);
  const extraNow = (served.shortfall[muscle] || 0) - (baseNow.shortfall[muscle] || 0);

  const candidates = current
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.slots.some((x) => x.muscle === muscle))
    .sort((a, b) => (rank(a.s) - rank(b.s))
      || ((served.perSession[a.s.id]?.direct?.[muscle] || 0) - (served.perSession[b.s.id]?.direct?.[muscle] || 0))
      || (a.i - b.i));

  for (const { s, i } of candidates) {
    const here = s.slots.filter((x) => x.muscle === muscle);
    if (here.length >= allowed) continue;
    if (s.slots.length >= SESSION_CEILINGS.exercises) continue;
    const per = served.perSession[s.id];
    if ((per?.direct?.[muscle] || 0) >= directCap) continue;
    if ((per?.fractional?.[muscle] || 0) >= fractionalCap - EPS) continue;
    // Every slot of the muscle in this session must be at its cap already.
    if (!here.every((x) => (served.sets[x.id] ?? 0) >= capOfSlot(x))) continue;
    const choice = nextChoice(list, current, muscle, s);
    if (!choice) continue;

    const slot = {
      id: `checkin:${s.id}:${muscle}:${opened.length}`,
      sessionId: s.id,
      muscle,
      kind: choice.kind,
      baseSets: SETS_PER_EXERCISE.floor,
      credits: choice.credits && typeof choice.credits === 'object' ? { ...choice.credits } : {},
      thinEquipment: false,
      focus,
      name: choice.name,
      exerciseId: choice.exerciseId ?? null,
      role: choice.role ?? null,
      opened: true,
    };
    const trial = current.map((x, k) => (k === i ? { ...x, slots: [...x.slots, slot] } : x));
    const after = serve(trial, targets, facts);
    const baseAfter = serve(trial, base, facts);
    const extraAfter = (after.shortfall[muscle] || 0) - (baseAfter.shortfall[muscle] || 0);
    if (extraAfter >= extraNow) continue;
    const wasWorking = original.perSession[s.id]?.workingSets || 0;
    if ((after.perSession[s.id]?.workingSets || 0) > Math.max(SESSION_CEILINGS.workingSets, wasWorking)) continue;
    return { sessions: trial, slot };
  }
  return null;
}

// ── the card ─────────────────────────────────────────────────────────────

const setWord = (n) => (n === 1 ? 'set' : 'sets');
const defaultLabel = (m) => String(m).replace(/_/g, ' ');
const upperFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function joinParts(parts) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const NOT_RAISED_WHY = Object.freeze({
  top: 'already at the top of its range',
  held: 'held by an Injuries & limitations entry or a soreness answer',
  maintenance: 'kept at maintenance',
});

/**
 * The words for the check-in card of a plan the new planner built (design
 * 4.10, 6): where every added set goes, set by set, what could not be placed,
 * whether Apply shows, and what happens if the card is left. Every line states
 * a fact about the plan and never tells anyone to train more or less (D204).
 * Returns null when there is no card to show (no next week, or next week is
 * the recovery week): the screen's own words for those stand.
 *
 * @param {object} plan  planCheckin's result
 * @param {object} [options]
 * @param {function(string): string} [options.labelOf]  a muscle's display name, lower case
 * @param {Object<string, string>} [options.sessionNames]  session id -> its name
 * @returns {null | {
 *   kind: string, showApply: boolean, heading: string, lines: string[],
 *   unplacedLines: string[], notRaisedLine: string|null, ifLeft: string|null
 * }}
 */
export function describeCheckin(plan, { labelOf = defaultLabel, sessionNames = {} } = {}) {
  if (!plan || plan.reason) return null;
  const label = (m) => {
    const v = labelOf(m);
    return typeof v === 'string' && v ? v : defaultLabel(m);
  };
  const climb = plan.plannedClimb || 0;
  const ifLeft = climb > 0
    ? `If you leave this, your plan's planned climb of ${climb} ${setWord(climb)} goes ahead.`
    : 'If you leave this, your plan carries on as planned.';
  const card = {
    kind: plan.kind,
    showApply: false,
    heading: '',
    lines: [],
    unplacedLines: [],
    notRaisedLine: null,
    ifLeft,
  };

  if (plan.kind === CHECKIN_KIND.PLANNED_CLIMB) {
    card.heading = 'Your plan\'s planned climb goes ahead.';
    card.ifLeft = null;
    return card;
  }

  if (plan.kind === CHECKIN_KIND.INCREASE) {
    if (plan.muscles.length === 0) {
      card.heading = 'No muscle can take more sets next week';
      card.lines.push('Your plan\'s planned climb goes ahead.');
      card.ifLeft = null;
    } else {
      card.heading = `Next week: ${plan.step} more sets for each muscle that can take them`;
      card.showApply = plan.applies;
      for (const m of plan.muscles) {
        const added = m.added;
        // A session is named only where the same exercise appears in two of them.
        const repeated = new Set(m.moves.map((x) => x.name).filter((n, i, all) => all.indexOf(n) !== i));
        const parts = m.moves.map((x) => {
          const where = repeated.has(x.name) && sessionNames[x.sessionId] ? ` in ${sessionNames[x.sessionId]}` : '';
          return `${x.name}${where} ${x.from} to ${x.to}`;
        });
        for (const o of m.opened) parts.push(`${o.name} joins with ${o.sets} ${setWord(o.sets)}`);
        const head = `${upperFirst(label(m.muscle))}, ${added} more ${setWord(added)} next week`;
        card.lines.push(parts.length ? `${head}: ${joinParts(parts)}.` : `${head}.`);
        if (m.unplaced > 0) {
          card.unplacedLines.push(`${m.unplaced} ${setWord(m.unplaced)} for ${label(m.muscle)} could not be placed without going over a limit.`);
        }
      }
    }
    if (plan.notRaised.length) {
      const items = plan.notRaised.map((x) => `${upperFirst(label(x.muscle))} (${NOT_RAISED_WHY[x.why] || NOT_RAISED_WHY.top})`);
      card.notRaisedLine = `Not raised: ${items.join(', ')}.`;
    }
    return card;
  }

  if (plan.kind === CHECKIN_KIND.PULL_BACK) {
    if (!plan.applies) {
      // Every muscle is already at maintenance, or below where the plan was going.
      card.heading = 'There is nothing to take off next week';
      card.lines.push('Every muscle is already at maintenance or at a lower level than your plan\'s climb.');
      card.ifLeft = null;
      return card;
    }
    card.heading = `Next week: ${Math.abs(plan.step)} fewer sets for each muscle`;
    card.lines.push('Each muscle goes down by up to 2 sets and stays at maintenance or above. The lower level carries forward, and your plan\'s climb resumes from it.');
    card.showApply = true;
    return card;
  }

  // A hold, or an increase that was withheld (the same writes).
  card.heading = 'Next week stays at this week\'s level';
  if (plan.applies) {
    card.showApply = true;
    card.lines.push(plan.kind === CHECKIN_KIND.WITHHELD
      ? 'Your coach is not adding sets this week, so this keeps next week at this week\'s level, then your plan\'s climb resumes from it.'
      : 'Your plan\'s climb pauses for a week, then carries on from this level.');
  } else {
    card.lines.push('Your plan already holds the same level next week.');
    card.ifLeft = null;
  }
  return card;
}
