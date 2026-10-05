/**
 * explain.js -- D219 lane B5: every plan fact shown with its reason (design
 * section 6 and 1.7, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md; register D219: the founder wants people "to be able
 * to see the great work and intelligence the product has").
 *
 * Today "Why this plan" is static text, partly untrue. These lines are
 * computed from the plan's own facts (programmes.plan_facts, version 2, or
 * the planner's `v2` block, which has the same keys), so each line is true of
 * THIS person's plan, and each states a fact and its reason without telling
 * anyone what to do (D204: describe, never tell anyone to train more or less).
 *
 * The lines, in reading order, each only when the facts to state it are there:
 *   structure   how many sessions, which split, and why it was chosen
 *   spacing     the shortest gap between a muscle's own sessions, back to back
 *               and in a usual week
 *   focus:<m>   each focus muscle's sets now and at the peak, and where it is
 *               trained first
 *   cap         no exercise above 4 sets, and why (the thin-equipment and
 *               typed-count exceptions when the plan has them)
 *   length      the sessions' length at the peak against the person's length
 *   over        a session that runs over, what the plan did first, and why the
 *               focus sets were kept
 *   ceilings    a session past 8 exercises or 25 working sets, and why
 *   readiness   the promise (90% recovered at the usual spacing), or exactly
 *               where it is limited, in estimates, and why
 *   fixes       what the plan did to keep the promise
 *   ramp        the block opening near what the person logged
 *   ladder      the effort ladder and why
 *
 * Every line carries its source: an EVIDENCE key from science.js, the grade
 * science.js records for it, and a one-line source for a person to read on
 * tap. The one-line sources are authored here from EVIDENCE's own entries (no
 * internal reference, nothing cited that EVIDENCE does not cite; the suite
 * checks both), because EVIDENCE's text is written for the engineers.
 *
 * Facts that are NOT stored. programmes.plan_facts (plannerV2PlanFacts) keeps
 * the roles, targets, shares, caps, gap ranks, ladder, readiness, notes and
 * limitedBy; it does not keep sessionMinutesAtPeak, overTime or overCeilings,
 * which the planner's `v2` block carries. A line whose facts are missing is
 * left out, never guessed. The `length`, `over` and `ceilings` lines therefore
 * show wherever the planner's own block is given, and on a device once the
 * plan's facts store those three keys (keyed by routine id, as gapRanks is).
 *
 * Pure and deterministic: no I/O, no clock, no randomness; the facts are
 * read, never mutated.
 */
import { ROLE } from './bands';
import {
  EVIDENCE, BLOCK, ROLE_TARGETS, GROWTH_FLOOR, SETS_PER_EXERCISE, SESSION_CEILINGS,
  RAMP, ROTATION, READINESS, FREQUENCY,
} from './science';
import { TRIMMED_REST_SECONDS, TIME_TOLERANCE_MINUTES } from './allocate';
import { TYPICAL_WEEK_GAP_HOURS } from '../recovery/constants';
import { muscleDisplayName } from '../algorithms';

const PLAN_VERSION = 2;
const RECOVERED_PERCENT = Math.round(READINESS.recoveredFraction * 100);
const MAX_LIMITED_NAMED = 3;
// A muscle one session out: two slots back to back, less the session's own hour (47).
const KEPT_APART_HOURS = 2 * ROTATION.backToBackSlotHours - ROTATION.sessionHours;
const MAX_FIXES_NAMED = 4;

// The muscles whose names read as plurals ("glutes are your focus").
const PLURAL_MUSCLES = new Set([
  'glutes', 'quads', 'hamstrings', 'calves', 'abs', 'side_delts', 'rear_delts', 'front_delts',
  'traps', 'forearms', 'adductors', 'biceps', 'triceps',
]);

// ── what each split is, in a phrase (families.js keys) ───────────────────
const FAMILY_PHRASE = Object.freeze({
  full_body_ab: 'two full-body sessions, A and B',
  upper_lower: 'one upper-body and one lower-body session',
  ppl: 'push, pull and legs',
  full_body_abc: 'three full-body sessions that each emphasise different muscles',
  upper_lower_full: 'upper, lower and a full-body session',
  upper_lower_x2: 'alternating upper and lower',
  ppl_upper: 'push, pull and legs, then an upper-body session',
  ppl_arms: 'push, pull and legs, then arms and shoulders',
  ppl_upper_lower: 'push, pull and legs, then an upper and a lower session',
  upper_lower_x2_full: 'upper and lower twice, and a full-body session',
  upper_lower_x2_focus: 'upper and lower twice, and a session for your focus muscles',
  body_part: 'a few muscles in each session, a body-part week',
  ppl_x2: 'push, pull and legs, twice',
  upper_lower_x3: 'upper and lower, three times',
});

// ── the one-line sources a person reads on tap ───────────────────────────
const SOURCE_LINES = Object.freeze({
  'FREQUENCY.preferTwoExposuresFromWeekly':
    `At equal weekly sets, training frequency does not change growth; sharing ${FREQUENCY.preferTwoExposuresFromWeekly} or more weekly sets across two sessions spreads the load (Ochi 2018).`,
  'READINESS.clockBand':
    `No study gives the spread of recovery times in trained lifters, so every recovery time Volyume shows is an estimate, about ${Math.round(READINESS.clockBand * 100)}% either way.`,
  'READINESS.recoveredFraction':
    `Recovered means about ${RECOVERED_PERCENT}% of the last session's fatigue has cleared, the same meaning the Recovery screen uses.`,
  'ROLE_TARGETS.focus':
    `The top productive tier of weekly sets is ${ROLE_TARGETS.focus.low} to ${ROLE_TARGETS.focus.high}; the plan never goes above ${ROLE_TARGETS.focus.plannedCeiling}, and climbs ${ROLE_TARGETS.focus.climb} to ${ROLE_TARGETS.focus.maxClimb} sets a week, the step that was tested (Enes 2024).`,
  'SETS_PER_EXERCISE.capCompound':
    `A limit Volyume chose: no trial finds a ceiling at ${SETS_PER_EXERCISE.capIsolation} or ${SETS_PER_EXERCISE.capCompound} sets of one exercise, and 4 to 6 sets were not better than 2 to 3 (Krieger 2010).`,
  'SESSION_CEILINGS.exercises':
    `A limit Volyume chose: ${SESSION_CEILINGS.exercises} exercises and ${SESSION_CEILINGS.workingSets} working sets in a session.`,
  'GROWTH_FLOOR.standard':
    `The floor is the bottom of the range where weekly sets reliably grow a muscle, ${GROWTH_FLOOR.standard} for most muscles and ${GROWTH_FLOOR.focus} for a focus muscle; the recovery times it is weighed against are estimates.`,
  'BLOCK.rirLadder':
    'Stopping one rep short of failure in the heavy weeks keeps most of the growth; failure adds at most a small edge (Refalo 2023, Robinson 2024) for a larger recovery cost (Vieira 2022).',
  'RAMP.maxAboveLogged':
    'A block opens near what you did recently, with no jump larger than the tested steps (Scarpelli 2022, Enes 2024).',
});

// science.js's grades (03-SCIENCE.md section 0.1), said plainly.
const GRADE_LABEL = Object.freeze({
  A: 'Strong evidence',
  B: 'Good evidence',
  C: 'Limited evidence',
  D: 'Expert consensus',
  CONV: 'A convention Volyume chose',
  INF: 'An inference from the evidence',
});

function sourceFor(key) {
  const grade = EVIDENCE[key]?.grade ?? null;
  return { key, grade, gradeLabel: GRADE_LABEL[grade] ?? 'Source', line: SOURCE_LINES[key] ?? '' };
}

// ── small helpers ────────────────────────────────────────────────────────
const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

function joinList(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const label = (m) => muscleDisplayName(m);
const lowerLabel = (m) => label(m).toLowerCase();
const are = (m) => (PLURAL_MUSCLES.has(m) ? 'are' : 'is');

function sessionName(sessions, id) {
  const i = sessions.findIndex((s) => s.id === id);
  if (i < 0) return null;
  return sessions[i].name || `Session ${i + 1}`;
}

function clampWeek(week) {
  const w = Math.round(Number(week));
  if (!Number.isFinite(w)) return 1;
  return Math.min(BLOCK.weeks, Math.max(1, w));
}

function line(id, text, key) {
  return { id, text, source: sourceFor(key) };
}

// ── the lines ────────────────────────────────────────────────────────────

function structureLine(facts, sessions) {
  const n = sessions.length || (isObject(facts.gapRanks) ? Object.keys(facts.gapRanks).length : 0);
  if (n < 2) return null;
  const family = typeof facts.family === 'string' ? facts.family : '';
  const names = sessions.map((s, i) => s.name || `Session ${i + 1}`);
  let text;
  if (family.startsWith('division_')) {
    const list = sessions.length ? `: ${joinList(names)}` : '';
    text = `${n} sessions a week, following the split your goal keeps${list}. At the same weekly sets, studies find the split itself does not change growth, so the plan keeps your goal's own session list and spaces each muscle's sessions.`;
  } else {
    const phrase = FAMILY_PHRASE[family] ?? (sessions.length ? joinList(names) : null);
    if (!phrase) return null;
    text = `${n} sessions a week, ${phrase}. At the same weekly sets, studies find the split itself does not change growth, so this one is chosen for how well it fits your days, your session length and each muscle's recovery.`;
  }
  return line('structure', text, 'FREQUENCY.preferTwoExposuresFromWeekly');
}

/**
 * The shortest gap between two sessions that give the same muscle its own
 * exercises (the exposureShares keys), counted from one session's start to the
 * next one's start less the hour the session itself takes (the rotation's own
 * arithmetic): back to back (24 hours a slot) and in a usual week
 * (recovery/constants TYPICAL_WEEK_GAP_HOURS). A muscle trained in one session
 * has the whole cycle between its sessions, which is never the shortest.
 */
function spacingLine(facts, sessions) {
  const n = sessions.length;
  if (n < 2) return null;
  const typical = Array.isArray(TYPICAL_WEEK_GAP_HOURS[n]) && TYPICAL_WEEK_GAP_HOURS[n].length === n
    ? TYPICAL_WEEK_GAP_HOURS[n]
    : new Array(n).fill(168 / n);
  const cycleTypical = typical.reduce((a, b) => a + b, 0);
  let backToBack = n * ROTATION.backToBackSlotHours - ROTATION.sessionHours;
  let usual = cycleTypical - ROTATION.sessionHours;
  const position = new Map(sessions.map((s, i) => [s.id, i]));
  const shares = isObject(facts.exposureShares) ? facts.exposureShares : {};
  for (const bySession of Object.values(shares)) {
    if (!isObject(bySession)) continue;
    const at = Object.keys(bySession).filter((id) => position.has(id)).map((id) => position.get(id)).sort((a, b) => a - b);
    if (at.length < 2) continue;
    for (let i = 0; i < at.length; i++) {
      const from = at[i];
      const slots = ((at[(i + 1) % at.length] - from + n) % n) || n;
      let hours = 0;
      for (let k = 0; k < slots; k++) hours += typical[(from + k) % n];
      backToBack = Math.min(backToBack, slots * ROTATION.backToBackSlotHours - ROTATION.sessionHours);
      usual = Math.min(usual, hours - ROTATION.sessionHours);
    }
  }
  const text = backToBack >= KEPT_APART_HOURS
    ? `The order keeps each muscle's own sessions at least ${Math.round(backToBack)} hours apart even on consecutive training days, and at least ${Math.round(usual)} hours apart in a usual week. Recovery times are estimates, so the order is built to hold up whichever days you train.`
    : `Some muscles are trained in sessions that sit next to each other, so their closest sessions are ${Math.round(backToBack)} hours apart on consecutive training days and ${Math.round(usual)} hours apart in a usual week. Recovery times are estimates, so the plan also checks recovery at your usual spacing.`;
  return line('spacing', text, 'READINESS.clockBand');
}

function targetFor(facts, targetsByWeek, muscle, week) {
  const held = targetsByWeek?.[week]?.[muscle];
  if (isNumber(held)) return held;
  const planned = facts.weeklyTargets?.[muscle]?.[week - 1];
  return isNumber(planned) ? planned : null;
}

function focusLines(facts, sessions, week, targetsByWeek) {
  const out = [];
  const roles = isObject(facts.roles) ? facts.roles : {};
  for (const m of Object.keys(roles)) {
    if (roles[m] !== ROLE.FOCUS) continue;
    const now = targetFor(facts, targetsByWeek, m, week);
    const peak = targetFor(facts, targetsByWeek, m, BLOCK.peakWeek);
    if (now == null || peak == null) continue;
    let body;
    if (week < BLOCK.peakWeek) {
      body = now < peak
        ? `${now} direct sets a week now, climbing to ${peak} by week ${BLOCK.peakWeek}`
        : `${now} direct sets a week now, the same through week ${BLOCK.peakWeek}`;
    } else if (week === BLOCK.peakWeek) {
      body = `${now} direct sets a week, the peak of this block`;
    } else {
      body = `this is the recovery week, at ${now} direct sets after a peak of ${peak} in week ${BLOCK.peakWeek}`;
    }
    const trainedIn = sessions.filter((s) => Array.isArray(s.muscles) && s.muscles.includes(m));
    const first = trainedIn.filter((s) => s.muscles[0] === m);
    const where = first.length
      ? `, trained first in ${joinList(first.map((s) => sessionName(sessions, s.id)))}`
      : '';
    const limit = facts.limitedBy?.[m] === 'limits'
      ? ' The set caps and session limits are what hold it there.'
      : '';
    out.push(line(`focus:${m}`, `${label(m)} ${are(m)} your focus: ${body}${where}.${limit}`, 'ROLE_TARGETS.focus'));
  }
  return out;
}

function capLine(facts) {
  const cap = SETS_PER_EXERCISE.capCompound;
  let text = `No exercise goes above ${cap} sets. Past ${SETS_PER_EXERCISE.capIsolation} or ${cap} sets, each extra set of the same exercise gets fewer reps for more fatigue, and a second exercise trains parts of the muscle the first reaches less.`;
  const thin = isObject(facts.thin) && Object.values(facts.thin).some((list) => Array.isArray(list) && list.length > 0);
  if (thin) {
    text += ` Where your equipment gives a muscle a single exercise, it can take up to ${SETS_PER_EXERCISE.thinEquipmentBonus} more sets.`;
  }
  if (isObject(facts.typed) && Object.keys(facts.typed).length > 0) {
    text += ' Set counts you typed yourself are kept as typed.';
  }
  return line('cap', text, 'SETS_PER_EXERCISE.capCompound');
}

function lengthLine(facts, sessionLengthMinutes) {
  const raw = facts.sessionMinutesAtPeak;
  const values = (Array.isArray(raw) ? raw : (isObject(raw) ? Object.values(raw) : [])).filter(isNumber);
  if (values.length === 0) return null;
  const low = Math.round(Math.min(...values));
  const high = Math.round(Math.max(...values));
  const range = low === high ? `about ${high} minutes` : `about ${low} to ${high} minutes`;
  const set = isNumber(sessionLengthMinutes) && sessionLengthMinutes > 0 ? sessionLengthMinutes : null;
  let against = '';
  if (set != null) {
    if (Math.max(...values) <= set + 0.5) against = `, inside the ${set} you set`;
    else if (Math.max(...values) <= set + TIME_TOLERANCE_MINUTES) against = `, within ${TIME_TOLERANCE_MINUTES} minutes of the ${set} you set`;
    else against = `, against the ${set} you set`;
  }
  let text = `At the peak of the block, sessions run ${range}${against}.`;
  if (Array.isArray(facts.overCeilings) && facts.overCeilings.length === 0) {
    text += ` No session goes past ${SESSION_CEILINGS.exercises} exercises or ${SESSION_CEILINGS.workingSets} working sets.`;
  }
  return line('length', text, 'SESSION_CEILINGS.exercises');
}

function hasFocus(facts) {
  return isObject(facts.roles) && Object.values(facts.roles).includes(ROLE.FOCUS);
}

function overLine(facts, sessions, sessionLengthMinutes) {
  if (!isObject(facts.overTime)) return null;
  const items = sessions
    .filter((s) => isNumber(facts.overTime[s.id]) && facts.overTime[s.id] > 0)
    .map((s) => ({ name: sessionName(sessions, s.id), minutes: Math.round(facts.overTime[s.id]) }));
  if (items.length === 0) return null;
  const set = isNumber(sessionLengthMinutes) && sessionLengthMinutes > 0 ? sessionLengthMinutes : null;
  let head;
  if (items.length === 1) {
    head = set != null
      ? `At the peak, ${items[0].name} runs about ${items[0].minutes} minutes past the ${set} you set.`
      : `At the peak, ${items[0].name} runs about ${items[0].minutes} minutes over the session length you set.`;
  } else {
    const list = joinList(items.map((i) => `${i.name} (about ${i.minutes} minutes)`));
    head = set != null
      ? `At the peak, ${list} run past the ${set} you set.`
      : `At the peak, ${list} run over the session length you set.`;
  }
  let text = `${head} Before a session is allowed to run over, the plan shortens the rest between sets on the smaller muscles' isolation exercises to ${TRIMMED_REST_SECONDS} seconds.`;
  if (hasFocus(facts)) {
    text += ' Your focus muscles keep every set, because bringing them up is what you picked.';
  }
  return line('over', text, 'ROLE_TARGETS.focus');
}

function ceilingsLine(facts, sessions) {
  if (!Array.isArray(facts.overCeilings) || facts.overCeilings.length === 0) return null;
  const names = sessions
    .filter((s) => facts.overCeilings.includes(s.id))
    .map((s) => sessionName(sessions, s.id));
  if (names.length === 0) return null;
  const verb = names.length === 1 ? 'holds' : 'hold';
  const text = `At the peak, ${joinList(names)} ${verb} more than ${SESSION_CEILINGS.exercises} exercises or ${SESSION_CEILINGS.workingSets} working sets, because your focus sets are programmed in full and are never cut to fit.`;
  return line('ceilings', text, 'SESSION_CEILINGS.exercises');
}

function readingWhere(sessions, reading) {
  if (!isObject(reading)) return '';
  const name = Number.isInteger(reading.position) ? sessionName(sessions, sessions[reading.position]?.id) : null;
  const week = Number.isFinite(reading.week) ? ` in week ${reading.week}` : '';
  return name ? ` before ${name}${week}` : '';
}

function readinessLine(facts, sessions) {
  const readiness = isObject(facts.readiness) ? facts.readiness : null;
  if (!readiness || typeof readiness.passes !== 'boolean') return null;
  const lowest = isObject(readiness.lowest) ? readiness.lowest : {};
  if (readiness.passes) {
    const readings = Object.values(lowest).filter((r) => isObject(r) && isNumber(r.fraction));
    let text = `At a usual week's spacing, every muscle is estimated at least ${RECOVERED_PERCENT}% recovered when its next session starts, in every week of the block.`;
    if (readings.length) {
      const closest = readings.reduce((a, b) => (b.fraction < a.fraction ? b : a));
      text += ` The closest is ${label(closest.muscle)} at about ${Math.round(closest.fraction * 100)}%${readingWhere(sessions, closest)}.`;
    }
    return line('readiness', text, 'READINESS.recoveredFraction');
  }
  // Limited: exactly where, in estimates, and why.
  let limited = (Array.isArray(facts.notes) ? facts.notes : [])
    .filter((n) => isObject(n) && n.kind === 'promise_limited' && typeof n.muscle === 'string' && isNumber(n.lowest))
    .map((n) => ({ muscle: n.muscle, fraction: n.lowest }));
  if (limited.length === 0) {
    limited = Object.values(lowest)
      .filter((r) => isObject(r) && isNumber(r.fraction) && r.fraction < READINESS.recoveredFraction - 0.005)
      .map((r) => ({ muscle: r.muscle, fraction: r.fraction }))
      .sort((a, b) => a.fraction - b.fraction);
  }
  if (limited.length === 0) return null;
  const named = limited.slice(0, MAX_LIMITED_NAMED).map((l) => (
    `${label(l.muscle)} about ${Math.round(l.fraction * 100)}%${readingWhere(sessions, lowest[l.muscle])}`
  ));
  const more = limited.length > MAX_LIMITED_NAMED ? `; and ${limited.length - MAX_LIMITED_NAMED} more` : '';
  const heading = named.length === 1 && !more ? 'The exception' : 'The exceptions';
  const text = `At a usual week's spacing, the plan aims for every muscle to be estimated at least ${RECOVERED_PERCENT}% recovered when its next session starts. ${heading}: ${named.join('; ')}${more}. The plan tries a different order, a lighter and heavier split and another session first, and fewer sets last, never below a muscle's growth floor (${GROWTH_FLOOR.standard} sets a week, or ${GROWTH_FLOOR.focus} for a focus muscle), and shows the closest it found.`;
  return line('readiness', text, 'GROWTH_FLOOR.standard');
}

function fixesLine(facts) {
  const notes = Array.isArray(facts.notes) ? facts.notes : [];
  const seen = new Map();
  for (const n of notes) {
    if (!isObject(n) || typeof n.muscle !== 'string') continue;
    if (!['split', 'extra_session', 'fewer_sessions', 'peak_lowered'].includes(n.kind)) continue;
    seen.set(`${n.kind}:${n.muscle}`, n); // the last note of a kind for a muscle is the one that holds
  }
  const phrases = [];
  for (const n of seen.values()) {
    const m = lowerLabel(n.muscle);
    if (n.kind === 'split') phrases.push(`gave ${m} a lighter and a heavier session with the heavier one before the longer gap`);
    else if (n.kind === 'extra_session') phrases.push(`gave ${m} an extra session`);
    else if (n.kind === 'fewer_sessions') phrases.push(`trained ${m} in one session fewer`);
    else if (isNumber(n.peak)) phrases.push(`held ${m} at about ${n.peak} counted sets a week, not below the growth floor`);
  }
  if (phrases.length === 0) return null;
  const shown = phrases.slice(0, MAX_FIXES_NAMED);
  const more = phrases.length > shown.length ? `, and made ${phrases.length - shown.length} more changes like these` : '';
  return line('fixes', `To keep each session starting recovered, the plan ${joinList(shown)}${more}.`, 'READINESS.recoveredFraction');
}

function rampLine(facts) {
  const muscles = [];
  for (const n of Array.isArray(facts.notes) ? facts.notes : []) {
    if (isObject(n) && n.kind === 'ramped' && typeof n.muscle === 'string' && !muscles.includes(n.muscle)) muscles.push(n.muscle);
  }
  if (muscles.length === 0) return null;
  const text = `The plan opens the block with fewer ${joinList(muscles.map(lowerLabel))} exercises than at the peak, because it starts within ${RAMP.maxAboveLogged} sets of what you logged over the last ${RAMP.loggedWindowWeeks} weeks and climbs from there.`;
  return line('ramp', text, 'RAMP.maxAboveLogged');
}

function ladderLine(facts) {
  const ladder = Array.isArray(facts.rirLadder) ? facts.rirLadder.filter(isNumber) : [];
  if (ladder.length < 2) return null;
  const working = ladder.slice(0, -1);
  const recovery = ladder[ladder.length - 1];
  const text = `Weeks 1 to ${working.length} stop about ${joinList(working.map(String))} reps short of failure; week ${ladder.length} eases to about ${recovery}. Stopping short of failure keeps most of the growth for less fatigue to recover from.`;
  return line('ladder', text, 'BLOCK.rirLadder');
}

// ── the module's surface ─────────────────────────────────────────────────

/**
 * The lines that explain a plan, each with its source.
 *
 * @param {object} args
 * @param {object} args.facts  programmes.plan_facts (version 2), or the planner's `v2` block
 * @param {Array<{ id: string, name?: string, muscles?: Array<string|null> }>} [args.sessions]
 *        the plan's sessions in rotation order: the routine id the facts are keyed by, its
 *        name, and the muscle of each exercise in session order (sessionsFromRoutines)
 * @param {number} [args.week]  the block week "now" is (1 to 6; default 1)
 * @param {number|null} [args.sessionLengthMinutes]  the person's session length
 * @param {Object<number, Object<string, number>>|null} [args.targetsByWeek]  the direct sets each
 *        week holds today by block week then muscle (planned_muscle_volume, which check-ins
 *        change); a muscle or week it does not hold reads from the plan's own targets
 * @returns {null | { lines: Array<{ id: string, text: string,
 *          source: { key: string, grade: ?string, gradeLabel: string, line: string } }> }}
 *          null for a plan without version 2 facts: the surface renders as before
 */
export function explainPlan({
  facts, sessions = [], week = 1, sessionLengthMinutes = null, targetsByWeek = null,
} = {}) {
  if (!isObject(facts) || facts.version !== PLAN_VERSION) return null;
  const list = (Array.isArray(sessions) ? sessions : []).filter((s) => isObject(s) && s.id != null);
  const w = clampWeek(week);
  const lines = [
    structureLine(facts, list),
    spacingLine(facts, list),
    ...focusLines(facts, list, w, isObject(targetsByWeek) ? targetsByWeek : null),
    capLine(facts),
    lengthLine(facts, sessionLengthMinutes),
    overLine(facts, list, sessionLengthMinutes),
    ceilingsLine(facts, list),
    readinessLine(facts, list),
    fixesLine(facts),
    rampLine(facts),
    ladderLine(facts),
  ].filter(Boolean);
  return { lines };
}

/**
 * The sessions explainPlan reads, from a plan's routines and their exercise
 * rows (getRoutinesForPlan in rotation order; getRoutineExercisesWithDetails
 * per routine): each routine's id and name, and the planner's own muscle for
 * each exercise in session order (facts.slots), null where the plan does not
 * hold one for the exercise.
 *
 * @param {object} facts  the plan's facts
 * @param {Array<{ routine: { id: string, name?: string }, rows: Array<{ exercise?: { id: string } }> }>} routinesWithRows
 */
export function sessionsFromRoutines(facts, routinesWithRows) {
  const slots = isObject(facts?.slots) ? facts.slots : {};
  return (Array.isArray(routinesWithRows) ? routinesWithRows : []).map(({ routine, rows }) => ({
    id: routine?.id,
    name: routine?.name ?? null,
    muscles: (Array.isArray(rows) ? rows : []).map((row) => {
      const muscle = slots[routine?.id]?.[row?.exercise?.id]?.muscle;
      return typeof muscle === 'string' ? muscle : null;
    }),
  }));
}
