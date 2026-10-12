/**
 * authoredCoach.js -- lane B of the AUTHORED plan (register D227 and addenda;
 * build spec docs/audit/offseason-allan-2026-10-12/01-SPEC.md sections D, E2,
 * E3 and H3/H4): the coach's weekly check-in, the stall rule and the
 * reduction-week triggers, aimed where the founder's document says, for a
 * plan whose facts are `kind: 'authored'` only. Every other plan never
 * reaches this module.
 *
 * Pure, no I/O, no clock, deterministic. The I/O lives in
 * ./authoredCoachIO.js and in checkinPlan.js; the facts shape is documented
 * in ./authored.js.
 *
 * THE CHECK-IN (spec D1 to D5, H3). The coach's signal is computed exactly as
 * for every plan (D1, weeklyCoach.autoregulationMatrix); this module decides
 * what it does to THIS plan, and the card and Apply both read the one result:
 *   raise (signal 2 or more), a Growth week going into a Growth week:
 *              1 more set a week to lats and 1 to side delts, each onto a
 *              prescribed exercise (side delts: the lateral raise with the
 *              fewest sets, Days 3 and 4 before Day 1, Day 2 last; lats: the
 *              single-arm and isolation pulldowns first, the main pulldowns
 *              last), inside the plan's ceilings (lats 20, side delts 22 a
 *              week, never more than 7 direct sets of either in a session),
 *              never onto a stalled exercise (E2), never onto a muscle a
 *              capability limit or a soreness answer holds
 *   raise or climb in the ramp, climb in Growth:
 *              the plan's own next week (the ladder); nothing to apply
 *   hold (and a withheld increase):
 *              next week repeats this week: in the ramp the schedule shifts
 *              one week (authored.run.phases), the reduction week stays at
 *              the end of the block; in Growth nothing changes
 *   pull back: the coach's pull-back, every muscle down by up to 2 sets from
 *              this week's level, never below the plan's Health numbers,
 *              carried for the rest of the block (authored.trims)
 *   legs (D4): when the person answered "Do your legs look flat in your
 *              shorts?" with yes, and next week is Growth: 1 more set to the
 *              Leg Extension and 1 to the Seated Leg Curl, once a block,
 *              never above 7 quads or 5 hamstrings a week. Added with a
 *              raise or a climb, never with a hold or a pull-back
 *   never opens an exercise (D5): every set goes onto a prescribed exercise.
 * The rows to write are the block's planned volume recomputed from the facts
 * after the change (B3), so the card, the rows and what the logger serves
 * are one number.
 *
 * Idempotent Apply: the facts record the check-in they applied
 * (authored.lastCheckin, with the state before it), so a retry recomputes
 * from the same starting point and never adds a set twice.
 */
import {
  isAuthoredFacts, appMuscleOf, authoredBlockPhases, authoredPhaseOf, authoredSlotSets,
  authoredWeeklyTargets, authoredRirLadder, authoredSwapOptions,
} from './authored';
import { checkinKind, CHECKIN_KIND } from '../plan/checkinPlacement';

const PULL_BACK_STEP = 2;
const WORKING = new Set(['ramp1', 'ramp2', 'growth']);

const clone = (v) => JSON.parse(JSON.stringify(v));
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** Every slot of the plan, in session order, with its session and session index. */
function slotsOf(facts) {
  const out = [];
  (facts?.authored?.sessions ?? []).forEach((session, si) => {
    for (const slot of Array.isArray(session?.exercises) ? session.exercises : []) out.push({ session, si, slot });
  });
  return out;
}

/** Each app muscle's direct sets in a phase (the planned row's unit). */
export function authoredMuscleTotals(facts, phase) {
  const out = {};
  for (const { slot } of slotsOf(facts)) {
    const m = slot.appMuscle || appMuscleOf(slot.muscle);
    if (!m) continue;
    out[m] = (out[m] || 0) + (authoredSlotSets(facts, slot, phase) || 0);
  }
  return out;
}

/** Each authored muscle's sets in a phase, across the week and per session key. */
function byAuthoredMuscle(facts, phase) {
  const week = {};
  const session = {};
  for (const { session: s, slot } of slotsOf(facts)) {
    const n = authoredSlotSets(facts, slot, phase) || 0;
    week[slot.muscle] = (week[slot.muscle] || 0) + n;
    session[s.key] = session[s.key] || {};
    session[s.key][slot.muscle] = (session[s.key][slot.muscle] || 0) + n;
  }
  return { week, session };
}

/** The Health sets a week per app muscle: the floor a pull-back never goes below (D3). */
function healthTotals(facts) {
  const out = {};
  for (const { slot } of slotsOf(facts)) {
    const m = slot.appMuscle || appMuscleOf(slot.muscle);
    const h = Number(slot?.sets?.health);
    if (m && Number.isFinite(h)) out[m] = (out[m] || 0) + h;
  }
  return out;
}

/** The facts as they stood before the check-in already applied this week (idempotent Apply). */
function baseFacts(facts, blockNumber, weekIndex) {
  const last = facts?.authored?.lastCheckin;
  if (!isObj(last) || last.block !== blockNumber || last.weekIndex !== weekIndex || !isObj(last.before)) return facts;
  const base = clone(facts);
  base.authored.raises = clone(last.before.raises ?? {});
  base.authored.trims = clone(last.before.trims ?? {});
  if (last.before.legs == null) delete base.authored.legs;
  else base.authored.legs = clone(last.before.legs);
  if (isObj(base.authored.run)) {
    if (Array.isArray(last.before.phases)) base.authored.run.phases = [...last.before.phases];
    else delete base.authored.run.phases;
  }
  delete base.authored.lastCheckin;
  return base;
}

const setsWord = (n) => (n === 1 ? 'set' : 'sets');

/**
 * D2: one more set onto the muscle's next prescribed exercise, or why not.
 * Returns { key } placed, or { why } ('held', 'top', 'full').
 */
function placeOne(facts, muscle, { held, stalled, order }) {
  const app = appMuscleOf(muscle);
  if (held.has(app)) return { why: 'held' };
  const weekly = facts.authored?.ceilings?.weekly?.[muscle];
  const perSession = facts.authored?.ceilings?.perSession?.[muscle];
  const { week, session } = byAuthoredMuscle(facts, 'growth');
  if (Number.isFinite(weekly) && (week[muscle] || 0) >= weekly) return { why: 'top' };
  const candidates = [];
  let skippedStalled = false;
  for (const { session: s, si, slot } of slotsOf(facts)) {
    if (slot.muscle !== muscle) continue;
    if (stalled.has(slot.key)) { skippedStalled = true; continue; }
    const now = authoredSlotSets(facts, slot, 'growth') || 0;
    const cap = Number(slot.cap);
    if (Number.isFinite(cap) && now + 1 > cap) continue;
    if (Number.isFinite(perSession) && ((session[s.key]?.[muscle] || 0) + 1) > perSession) continue;
    candidates.push({ slot, si, now, rank: order(slot, s, si) });
  }
  if (!candidates.length) return { why: skippedStalled ? 'stalled' : 'full' };
  candidates.sort((a, b) => (a.rank.group - b.rank.group) || (a.now - b.now) || (a.rank.tie - b.rank.tie));
  return { key: candidates[0].slot.key };
}

// D2's order for side delts: the fewest sets first, then Days 3 and 4 before
// Day 1, Day 2 last (Day 2 follows Day 1). For lats: the single-arm and
// isolation pulldowns first, the main pulldowns last.
const SIDE_DELT_DAYS = ['d3', 'd4', 'd1', 'd2'];
function raiseOrder(muscle) {
  if (muscle === 'side_delts') {
    return (slot, s, si) => {
      const i = SIDE_DELT_DAYS.indexOf(s.key);
      return { group: 0, tie: i >= 0 ? i : 10 + si };
    };
  }
  return (slot, s, si) => ({
    group: slot.kind === 'isolation' || slot.perArm === true ? 0 : 1,
    tie: si * 100 + (s.exercises?.indexOf(slot) ?? 0),
  });
}

/**
 * D3 pull-back: each app muscle down by up to 2 sets from this week's level
 * (never above where the plan was going, never below Health), one set at a
 * time off the slot with the most sets above its own Health sets (ties: the
 * last in plan order). Mutates `next` (its trims). Returns the muscles it
 * moved, { muscle: [from, to] } in next week's terms.
 */
function pullBack(next, { curPhase, nextPhase }) {
  const health = healthTotals(next);
  const cur = authoredMuscleTotals(next, curPhase);
  const nxt = authoredMuscleTotals(next, nextPhase);
  const moved = {};
  next.authored.trims = isObj(next.authored.trims) ? next.authored.trims : {};
  for (const m of Object.keys(nxt).sort()) {
    const c = cur[m] ?? 0;
    const s = nxt[m];
    const want = Math.min(s, Math.max(c - PULL_BACK_STEP, Math.min(c, health[m] ?? 0)));
    let cut = s - want;
    while (cut > 0) {
      let best = null;
      slotsOf(next).forEach(({ slot }, idx) => {
        const sm = slot.appMuscle || appMuscleOf(slot.muscle);
        if (sm !== m) return;
        const served = authoredSlotSets(next, slot, nextPhase) || 0;
        const room = served - (Number(slot.sets?.health) || 1);
        if (room <= 0) return;
        if (!best || room > best.room || (room === best.room && idx > best.idx)) best = { slot, room, idx };
      });
      if (!best) break;
      next.authored.trims[best.slot.key] = (next.authored.trims[best.slot.key] || 0) + 1;
      cut -= 1;
    }
    const after = authoredMuscleTotals(next, nextPhase)[m];
    if (after !== s) moved[m] = [s, after];
  }
  return moved;
}

/** Hold: next week repeats this week's phase; the later working weeks move back one. */
function holdSchedule(facts, blockNumber, weekIndex) {
  const phases = authoredBlockPhases(facts, blockNumber);
  if (phases.length < 2 || weekIndex < 1 || weekIndex >= phases.length) return null;
  const cur = phases[weekIndex - 1];
  const nxt = phases[weekIndex];
  if (!WORKING.has(cur) || !WORKING.has(nxt) || cur === nxt) return null;
  // The working weeks after this one, shifted one week later; the block's
  // reduction week (the last entry) stays where it is.
  const last = phases.length - 1;
  const out = [...phases];
  for (let i = last - 1; i > weekIndex; i -= 1) out[i] = phases[i - 1];
  out[weekIndex] = cur;
  if (phases[last] !== 'reduction') out[last] = phases[last - 1];
  return out;
}

const NOT_RAISED = Object.freeze({
  held: 'held by an Injuries & limitations entry or a soreness answer',
  top: 'already at the plan\'s weekly ceiling',
  full: 'every exercise for it is at its limit for a session',
  stalled: 'its open exercises have not progressed for 3 sessions',
});

/**
 * The check-in for an authored plan (spec D1 to D5). Returns null when the
 * facts are not authored or there is no next working week.
 *
 * @param {object} args
 * @param {object} args.facts          the plan's facts (authored)
 * @param {Array<{id: string, index: number, deload: boolean}>} args.weeks  this week first, then
 *        next week and every later week of the block
 * @param {Array<object>} args.rows    planned_muscle_volume rows for those weeks
 * @param {number} args.signal         the coach's volume signal
 * @param {boolean} [args.withheld]
 * @param {Iterable<string>} [args.held]     app muscles a raise may not reach
 * @param {Iterable<string>} [args.stalled]  slot keys of stalled exercises (E2)
 * @param {boolean} [args.legsFlat]    the person answered yes to the legs question
 * @param {function(string): string} [args.labelOf]  a muscle's display name, lower case
 * @param {Object<string, string>} [args.sessionNames]  routine id -> name
 */
export function authoredCheckin({
  facts: input, weeks, rows, signal, withheld = false, held = [], stalled = [], legsFlat = false,
  labelOf = (m) => String(m).replace(/_/g, ' '), sessionNames = {},
} = {}) {
  if (!isAuthoredFacts(input)) return null;
  const list = (Array.isArray(weeks) ? weeks : []).filter((w) => w && w.id != null);
  if (list.length < 2 || list[1].deload) return null;
  const blockNumber = Number(input.authored?.run?.block) || 1;
  const weekIndex = Number(list[0].index);
  const facts = baseFacts(input, blockNumber, weekIndex);
  const heldSet = held instanceof Set ? held : new Set(Array.from(held || []));
  const stalledSet = stalled instanceof Set ? stalled : new Set(Array.from(stalled || []));
  const kind = checkinKind(signal, { withheld });
  const curPhase = authoredPhaseOf(facts, { blockNumber, weekIndex, isDeload: list[0].deload });
  const nextPhase = authoredPhaseOf(facts, { blockNumber, weekIndex: list[1].index, isDeload: false });
  const next = clone(facts);
  next.authored.raises = isObj(next.authored.raises) ? next.authored.raises : {};
  const before = {
    raises: clone(facts.authored.raises ?? {}),
    trims: clone(facts.authored.trims ?? {}),
    legs: facts.authored.legs == null ? null : clone(facts.authored.legs),
    phases: Array.isArray(facts.authored?.run?.phases) ? [...facts.authored.run.phases] : null,
  };

  const lines = [];
  const notRaised = [];
  const unplacedLines = [];
  let heading;
  let step = 0;
  let changedFacts = false;
  const slotName = (key) => slotsOf(next).find((x) => x.slot.key === key);
  const named = (key) => {
    const hit = slotName(key);
    if (!hit) return key;
    const repeated = slotsOf(next).filter((x) => x.slot.name === hit.slot.name).length > 1;
    const where = repeated && sessionNames[hit.session.routineId] ? ` in ${sessionNames[hit.session.routineId]}` : '';
    return `${hit.slot.name}${where}`;
  };
  const moveLine = (key, from, to) => `${named(key)} ${from} to ${to}`;

  // ── D2: the raise ─────────────────────────────────────────────────────
  if (kind === CHECKIN_KIND.INCREASE && curPhase === 'growth' && nextPhase === 'growth') {
    heading = 'Next week: 1 more set for lats and for side delts';
    for (const muscle of ['lats', 'side_delts']) {
      const placed = placeOne(next, muscle, { held: heldSet, stalled: stalledSet, order: raiseOrder(muscle) });
      const label = labelOf(muscle);
      if (placed.key) {
        const slot = slotName(placed.key).slot;
        const from = authoredSlotSets(next, slot, 'growth');
        next.authored.raises[placed.key] = (Number(next.authored.raises[placed.key]) || 0) + 1;
        const to = authoredSlotSets(next, slot, 'growth');
        if (to !== from) {
          changedFacts = true;
          step = 1;
          lines.push(`${label.charAt(0).toUpperCase()}${label.slice(1)}, 1 more set a week: ${moveLine(placed.key, from, to)}.`);
        }
      } else {
        notRaised.push(`${label.charAt(0).toUpperCase()}${label.slice(1)} (${NOT_RAISED[placed.why] || NOT_RAISED.full})`);
      }
    }
    if (!changedFacts) heading = 'No muscle can take more sets next week';
  } else if (kind === CHECKIN_KIND.INCREASE || kind === CHECKIN_KIND.PLANNED_CLIMB) {
    if (curPhase === 'ramp1' || curPhase === 'ramp2') heading = 'Your plan\'s ramp carries on next week';
    else if (curPhase !== nextPhase) heading = 'Next week goes back to your plan\'s Growth level';
    else heading = 'Next week stays at your plan\'s level';
  }

  // ── D3: hold ──────────────────────────────────────────────────────────
  if (kind === CHECKIN_KIND.HOLD || kind === CHECKIN_KIND.WITHHELD) {
    heading = 'Next week stays at this week\'s level';
    const shifted = holdSchedule(next, blockNumber, weekIndex);
    if (shifted && isObj(next.authored.run)) {
      next.authored.run.phases = shifted;
      changedFacts = true;
      lines.push(kind === CHECKIN_KIND.WITHHELD
        ? 'Your coach is not adding sets this week, so next week repeats this week and your ramp carries on a week later.'
        : 'Your plan\'s ramp pauses for a week, then carries on from this level.');
    } else {
      lines.push('Your plan already holds the same level next week.');
    }
  }

  // ── D3: pull back ─────────────────────────────────────────────────────
  if (kind === CHECKIN_KIND.PULL_BACK) {
    const moved = pullBack(next, { curPhase, nextPhase });
    step = -PULL_BACK_STEP;
    if (Object.keys(moved).length) {
      changedFacts = true;
      heading = 'Next week: up to 2 fewer sets for each muscle';
      lines.push('Each muscle goes down by up to 2 sets from this week and never below your plan\'s starting level. The lower level carries on until this block ends.');
    } else {
      heading = 'There is nothing to take off next week';
      lines.push('Every muscle is already at your plan\'s starting level.');
    }
  }

  // ── D4: the legs ──────────────────────────────────────────────────────
  const legsKeys = next.authored?.legsCheck ?? { quads: 'd3.leg_extension', hamstrings: 'd3.seated_leg_curl' };
  const legsUsed = Number(next.authored?.legs?.block) === blockNumber;
  if (legsFlat && !legsUsed && nextPhase === 'growth'
    && (kind === CHECKIN_KIND.INCREASE || kind === CHECKIN_KIND.PLANNED_CLIMB)) {
    const moves = [];
    for (const muscle of ['quads', 'hamstrings']) {
      const key = legsKeys[muscle];
      const hit = slotName(key);
      if (!hit || heldSet.has(muscle) || stalledSet.has(key)) continue;
      const ceiling = next.authored?.ceilings?.weekly?.[muscle];
      const { week } = byAuthoredMuscle(next, 'growth');
      if (Number.isFinite(ceiling) && (week[muscle] || 0) >= ceiling) continue;
      const from = authoredSlotSets(next, hit.slot, 'growth');
      next.authored.raises[key] = (Number(next.authored.raises[key]) || 0) + 1;
      const to = authoredSlotSets(next, hit.slot, 'growth');
      if (to !== from) moves.push(moveLine(key, from, to));
      else next.authored.raises[key] -= 1;
    }
    if (moves.length) {
      next.authored.legs = { block: blockNumber };
      changedFacts = true;
      lines.push(`Legs look flat, so 1 more set each a week: ${moves.join(' and ')}.`);
    } else {
      unplacedLines.push('Your legs are already at the most this plan gives them, so nothing more was added.');
    }
  }

  if (notRaised.length) unplacedLines.push(`Not raised: ${notRaised.join(', ')}.`);

  // ── the rows (B3): the block's planned volume from the facts after the change ──
  const run = next.authored.run;
  next.weeklyTargets = authoredWeeklyTargets(next, blockNumber);
  next.rirLadder = authoredRirLadder(next, blockNumber);
  const byWeek = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const id = r?.mesocycle_week_id ?? r?.mesocycleWeekId;
    if (id == null || !r?.muscle) continue;
    if (!byWeek.has(id)) byWeek.set(id, {});
    byWeek.get(id)[r.muscle] = r;
  }
  const changes = [];
  for (const w of list.slice(1)) {
    const phase = authoredPhaseOf(next, { blockNumber, weekIndex: w.index, isDeload: w.deload });
    if (!phase) continue;
    const totals = authoredMuscleTotals(next, phase);
    const rowsW = byWeek.get(w.id) || {};
    for (const m of Object.keys(rowsW).sort()) {
      if (!Object.prototype.hasOwnProperty.call(totals, m)) continue;
      const planned = Number(rowsW[m].planned_sets ?? rowsW[m].plannedSets);
      if (planned === totals[m]) continue;
      // The capability lane's reintroduction ramp (lead ruling): a ramp row
      // keeps its level unless the plan's own week is now lower.
      if (rowsW[m].source === 'reintroduction' && totals[m] >= planned) continue;
      changes.push({
        mesocycleWeekId: w.id, weekIndex: w.index, muscle: m, plannedSets: totals[m],
        mev: rowsW[m].mev ?? null, mav: rowsW[m].mav ?? null, mrv: rowsW[m].mrv ?? null,
      });
    }
  }
  if (changedFacts) next.authored.lastCheckin = { block: blockNumber, weekIndex, before };
  if (!heading) heading = 'Next week stays at your plan\'s level';

  const applies = changedFacts || changes.length > 0;
  const nextServed = authoredMuscleTotals(next, nextPhase);
  const curServed = authoredMuscleTotals(facts, nextPhase);
  const nextTotal = Object.values(nextServed).reduce((a, b) => a + b, 0);
  const wasTotal = Object.values(curServed).reduce((a, b) => a + b, 0);
  if (!changedFacts && (kind === CHECKIN_KIND.INCREASE || kind === CHECKIN_KIND.PLANNED_CLIMB) && !lines.length) {
    lines.push(`Next week has ${nextTotal} ${setsWord(nextTotal)} in all, as your plan sets out.`);
  }
  const card = {
    kind,
    showApply: applies,
    heading,
    lines,
    unplacedLines,
    notRaisedLine: null,
    ifLeft: applies ? 'If you leave this, your plan carries on as written.' : null,
  };
  return {
    kind,
    step,
    applies,
    card,
    nextFacts: next,
    changes,
    blockNumber,
    weekIndex,
    phases: { current: curPhase, next: nextPhase },
    totals: { before: wasTotal, after: nextTotal },
    schedule: run?.phases ? [...run.phases] : authoredBlockPhases(next, blockNumber),
    // The v2 card's receipt reads these: an authored check-in never opens an
    // exercise (D5) and never changes a muscle's role.
    plan: { kind, step, opened: [], raisedRoles: [], changes, applies },
  };
}

// ── E2: the stall rule ────────────────────────────────────────────────────

function topOf(session) {
  const sets = (Array.isArray(session?.sets) ? session.sets : [])
    .filter((s) => (s?.setType ?? s?.set_type ?? 'straight') === 'straight' || (s?.setType ?? s?.set_type) === 'amrap')
    .map((s) => ({ weight: Number(s?.weight) || 0, reps: Number(s?.actualReps ?? s?.actual_reps ?? s?.reps) || 0 }))
    .filter((s) => s.reps > 0);
  if (!sets.length) return null;
  const W = sets.reduce((m, s) => Math.max(m, s.weight), 0);
  const atW = sets.filter((s) => s.weight === W);
  return { W, best: atW.reduce((m, s) => Math.max(m, s.reps), 0), total: atW.reduce((a, s) => a + s.reps, 0) };
}

/** A session beat the one before it: a heavier top load, or more reps at the same top load. */
function gained(newer, older) {
  if (!newer || !older) return false;
  if (newer.W > older.W) return true;
  if (newer.W < older.W) return false;
  return newer.best > older.best || newer.total > older.total;
}

/** A session that went worse than the one before it (E3 trigger 1). */
function dropped(newer, older) {
  if (!newer || !older) return false;
  if (newer.W < older.W) return true;
  if (newer.W > older.W) return false;
  return newer.best < older.best;
}

/** The listed options for an exercise (F1), by name, from the facts. */
function optionNames(facts, exerciseId, routineId) {
  const ids = authoredSwapOptions(facts, exerciseId, { routineId });
  if (!ids || !ids.size) return [];
  const names = new Map();
  for (const { slot } of slotsOf(facts)) {
    if (slot.exerciseId) names.set(slot.exerciseId, slot.name);
    for (const s of slot.subs ?? []) if (s?.exerciseId) names.set(s.exerciseId, s.name);
  }
  const out = [];
  for (const id of ids) {
    const n = names.get(id);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

const orJoin = (list) => (list.length <= 1 ? list.join('')
  : `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}`);

/**
 * E2: no gain in load or reps across 3 consecutive sessions of an exercise,
 * judged on Growth-week sessions only (the ramp holds loads by design), while
 * recovery was fine in each of them. Returns the plain message and the
 * exercise's listed options (F1), or null.
 *
 * @param {object} args
 * @param {object} args.facts
 * @param {string} args.exerciseId
 * @param {?string} [args.routineId]
 * @param {string} [args.name]        the exercise's name
 * @param {Array<{sets: Array, phase?: ?string, recoveryFine?: boolean}>} args.sessions  newest first
 */
export function authoredStall({ facts, exerciseId, routineId = null, name = null, sessions }) {
  if (!isAuthoredFacts(facts) || !exerciseId) return null;
  const list = (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && (s.phase == null || s.phase === 'growth'))
    .map((s) => ({ ...s, top: topOf(s) }))
    .filter((s) => s.top);
  if (list.length < 4) return null;
  const run = list.slice(0, 4);
  for (let i = 0; i < 3; i += 1) if (gained(run[i].top, run[i + 1].top)) return null;
  if (run.slice(0, 3).some((s) => s.recoveryFine === false)) return null;
  const subs = optionNames(facts, exerciseId, routineId);
  const hit = slotsOf(facts).find(({ session, slot }) => slot.exerciseId === exerciseId
    && (routineId == null || session.routineId === routineId))
    ?? slotsOf(facts).find(({ slot }) => (slot.subs ?? []).some((s) => s?.exerciseId === exerciseId));
  const shown = name || hit?.slot?.name || 'this exercise';
  const message = subs.length
    ? `No progress on ${shown} for 3 sessions. Check sleep and food first. If both are fine, swap to ${orJoin(subs)} for 4 to 6 weeks.`
    : `No progress on ${shown} for 3 sessions. Check sleep and food first.`;
  return { exerciseId, slotKey: hit?.slot?.key ?? null, name: shown, subs, message };
}

// ── E3: the reduction-week triggers ───────────────────────────────────────

export const REDUCTION_TRIGGER = Object.freeze({
  PERFORMANCE: 'performance',
  JOINTS: 'joints',
  SORENESS: 'soreness',
  WELLBEING: 'wellbeing',
  WEEKS: 'weeks',
});

const TRIGGER_LINE = Object.freeze({
  performance: (n) => `Your load or reps went down on ${n} in two sessions in a row.`,
  joints: () => 'Joint discomfort was rated moderate or more in two sessions this week.',
  soreness: () => 'You started a session feeling very sore and missed its rep minimums.',
  wellbeing: () => 'Your check-in showed low energy or poor sleep this week.',
  weeks: () => 'It has been 12 weeks or more since your last reduction week.',
});

/**
 * E3: the five triggers, read from what the app records. A reduction week is
 * suggested when two or more hold.
 *
 * @param {object} args
 * @param {Array<{name: string, sessions: Array<{sets: Array, difficulty: ?number}>}>} args.exercises
 *        the plan's exercises, each with its last sessions newest first (working weeks only)
 * @param {Array<{jointDiscomfort: ?number, sorenessBefore: ?number, missedRepMin: boolean}>} args.weekSessions
 *        this week's sessions
 * @param {?{energyScore: ?number, sleepHours: ?number}} args.checkin  this week's check-in
 * @param {?number} args.weeksSinceReduction
 * @returns {{ count: number, suggested: boolean, triggers: Array<{key: string, line: string}> }}
 */
export function authoredReductionTriggers({ exercises = [], weekSessions = [], checkin = null, weeksSinceReduction = null } = {}) {
  const triggers = [];
  // (1) the same exercise dropped in two consecutive sessions at the same effort
  for (const ex of Array.isArray(exercises) ? exercises : []) {
    const s = (ex?.sessions ?? []).slice(0, 3).map((x) => ({ ...x, top: topOf(x) }));
    if (s.length < 3 || s.some((x) => !x.top)) continue;
    const same = (a, b) => a.difficulty == null || b.difficulty == null || Number(a.difficulty) === Number(b.difficulty);
    if (dropped(s[0].top, s[1].top) && dropped(s[1].top, s[2].top) && same(s[0], s[1]) && same(s[1], s[2])) {
      triggers.push({ key: REDUCTION_TRIGGER.PERFORMANCE, line: TRIGGER_LINE.performance(ex.name ?? 'an exercise') });
      break;
    }
  }
  const week = Array.isArray(weekSessions) ? weekSessions : [];
  // (2) joint discomfort 2 or more (of 3) in two sessions in one week
  if (week.filter((w) => Number(w?.jointDiscomfort) >= 2).length >= 2) {
    triggers.push({ key: REDUCTION_TRIGGER.JOINTS, line: TRIGGER_LINE.joints() });
  }
  // (3) high soreness before a session and that session's rep minimums missed
  if (week.some((w) => Number(w?.sorenessBefore) >= 3 && w?.missedRepMin === true)) {
    triggers.push({ key: REDUCTION_TRIGGER.SORENESS, line: TRIGGER_LINE.soreness() });
  }
  // (4) a week of low energy and motivation, or poor sleep, in the check-in
  const energy = Number(checkin?.energyScore);
  const sleep = checkin?.sleepHours == null ? NaN : Number(checkin.sleepHours);
  if ((Number.isFinite(energy) && energy <= 2) || (Number.isFinite(sleep) && sleep < 6)) {
    triggers.push({ key: REDUCTION_TRIGGER.WELLBEING, line: TRIGGER_LINE.wellbeing() });
  }
  // (5) twelve or more weeks since the last reduction week
  if (Number.isFinite(weeksSinceReduction) && weeksSinceReduction >= 12) {
    triggers.push({ key: REDUCTION_TRIGGER.WEEKS, line: TRIGGER_LINE.weeks() });
  }
  return { count: triggers.length, suggested: triggers.length >= 2, triggers };
}

/** The coach's early-deload note for an authored plan (E3, H4). */
export function authoredReductionNote(result) {
  const reasons = (result?.triggers ?? []).map((t) => t.line).join(' ');
  return `A reduction week: about half the sets on the same exercises, each set stopping about 3 reps short. ${reasons}`.trim();
}

/**
 * E3 Apply: next week's rows for the reduction week (A5's Reduction column
 * per app muscle), and whether the block's planned reduction week is released
 * because it falls within 2 weeks of this one (taken already).
 *
 * @param {object} args
 * @param {object} args.facts
 * @param {Array<object>} args.rows           next week's planned rows
 * @param {number} args.weekIndex             the week becoming the reduction week
 * @param {?{id: string, index: number}} args.plannedWeek  the block's planned reduction week
 * @param {Array<object>} [args.plannedRows]  that week's planned rows
 */
export function authoredReductionApply({ facts, rows, weekIndex, plannedWeek = null, plannedRows = [] }) {
  if (!isAuthoredFacts(facts)) return null;
  const totals = authoredMuscleTotals(facts, 'reduction');
  const toChanges = (list, target) => (Array.isArray(list) ? list : [])
    .filter((r) => r?.muscle && Object.prototype.hasOwnProperty.call(target, r.muscle)
      && Number(r.planned_sets ?? r.plannedSets) !== target[r.muscle])
    .map((r) => ({ muscle: r.muscle, plannedSets: target[r.muscle], mev: r.mev ?? null, mav: r.mav ?? null, mrv: r.mrv ?? null }));
  const reductionRir = Number(facts.authored?.phases?.reduction?.weekRir);
  const out = {
    changes: toChanges(rows, totals),
    rirTarget: Number.isFinite(reductionRir) ? reductionRir : 3,
    release: null,
  };
  if (plannedWeek && Number.isFinite(plannedWeek.index) && plannedWeek.index > weekIndex
    && plannedWeek.index - weekIndex <= 2) {
    const growth = authoredMuscleTotals(facts, 'growth');
    const growthRir = Number(facts.authored?.phases?.growth?.weekRir);
    out.release = {
      weekId: plannedWeek.id,
      rirTarget: Number.isFinite(growthRir) ? growthRir : 1,
      changes: toChanges(plannedRows, growth),
    };
  }
  return out;
}
