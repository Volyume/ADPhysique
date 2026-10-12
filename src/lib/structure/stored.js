/**
 * stored.js -- D222 phase 7: a saved structure plan, checked again after every
 * change made to it after the build.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/24-PHASE7-AFTER-BUILD-SPEC.md
 * (lead rulings R70 to R78; 09 s8 and s11, B10 C20: "every post-build path
 * re-runs C1 to C19"). Everything here applies only to plans whose facts carry
 * `structure.version === 3`; nothing reads any other plan.
 *
 *   planFromFacts(facts)        R70: the checker's plan, rebuilt from the
 *                               stored `structure` block
 *   recheck(plan)               R70: { hard, sense }, checkPlan's failures and
 *                               senseCheck's codes
 *   applyChange(plan, change)   R71: one gate for every change, with a verdict
 *                               ('ok' | 'confirm' | 'blocked') from the faults
 *                               the change ADDS (an already imperfect plan can
 *                               still be edited where the edit adds none)
 *   refreshStructureFacts(...)  R72: the facts after a change, the version 2
 *                               fields rebuilt by the build's own function
 *   structureCheckin(...)       R78: a check-in's raise, hold or reduce on the
 *                               ladder, from the next week on
 *
 * Pure, no I/O, deterministic.
 */
import { PROGRESSION, TEMPLATES, TIERS, PATTERNS, MUSCLES } from './rulebook';
import { checkPlan } from './checker';
import { senseCheck } from './sense';
import { weeklyLoad, sessionMinutes } from './measure';
import { weeklyTargets, weeksFor } from './engine';
import {
  structureCompat, structurePlanData, structureExercise, appMuscleOf,
} from './adapt';
import { isStructureFacts } from './serve';
import { structureExerciseFromRow } from './patterns';

export { isStructureFacts };

const PEAK = PROGRESSION.peakWeek;
const clone = (v) => JSON.parse(JSON.stringify(v));

// ── R70: the stored plan ───────────────────────────────────────────────────

/**
 * The checker's plan (measure.js shape) from a plan's facts, or null for any
 * plan the structure engine did not build. Each exercise carries `id` (its
 * exercise id, which C16 compares) and keeps its `routineExerciseId`; each
 * session keeps its `routineId`.
 * @param {object} facts
 * @returns {?object}
 */
export function planFromFacts(facts) {
  if (!isStructureFacts(facts)) return null;
  const s = facts.structure;
  const report = s.report || {};
  const offer = s.kitOffer || { names: {}, patterns: {} };
  return {
    category: s.category,
    days: s.days,
    equipment: s.equipment,
    experience: s.experience,
    lengthMinutes: s.lengthMinutes,
    focus: [...(s.focus || [])],
    needsLengthChoice: report.needsLengthChoice === true,
    reportedMinutes: Array.isArray(report.minutes) ? [...report.minutes] : undefined,
    untrainable: [...(s.untrainable || [])],
    kitLimited: [...(s.kitLimited || [])],
    overflow: (s.overflow || []).map((o) => ({ ...o })),
    focusTargets: { ...(s.focusTargets || {}) },
    focusUnmet: (s.focusUnmet || []).map((f) => ({ ...f })),
    kitOffer: { names: { ...(offer.names || {}) }, patterns: clone(offer.patterns || {}) },
    sessions: s.sessions.map((session) => ({
      key: session.key,
      name: session.name,
      routineId: session.routineId ?? null,
      exercises: (session.exercises || []).map((ex) => ({
        id: ex.exerciseId,
        routineExerciseId: ex.routineExerciseId ?? null,
        name: ex.name,
        pattern: ex.pattern,
        muscle: ex.muscle,
        kind: ex.kind,
        peak: ex.peak,
        weeks: (ex.weeks || []).map((w) => ({ sets: w.sets, rir: w.rir })),
        restSec: ex.restSec,
        repRange: Array.isArray(ex.repRange) ? [...ex.repRange] : ex.repRange,
        nextDayException: ex.nextDayException === true,
        solePattern: ex.solePattern === true,
        extraJoints: [...(ex.extraJoints || [])],
        ...(Array.isArray(ex.tags) ? { tags: [...ex.tags] } : {}),
      })),
    })),
  };
}

/**
 * R70: the checks of a structure plan, as the build ran them.
 * @param {object} plan
 * @returns {{ hard: object[], sense: string[] }}
 */
export function recheck(plan) {
  return {
    hard: checkPlan(plan).failures,
    sense: senseCheck(plan).failures.map((f) => f.code),
  };
}

// ── R71: the gate ──────────────────────────────────────────────────────────

// A fault's identity, without the figures in its words: the same fault with a
// different count ("chest 12 sets" then "chest 11 sets") is not a new fault.
const bare = (detail) => String(detail || '').replace(/[0-9]+(\.[0-9]+)?/g, '#');
const faultKey = (f, kind) => [kind, f.code, f.week ?? '', f.session ?? '', (f.sessions || []).join(','), f.muscle ?? '', bare(f.detail)].join('|');

/** Every fault of a plan, as the gate compares them (hand to applyChange's `before`). */
export function faultsOf(plan) {
  return allFaults(plan);
}

function allFaults(plan) {
  return [
    ...checkPlan(plan).failures.map((f) => ({ ...f, kind: 'hard', key: faultKey(f, 'hard') })),
    ...senseCheck(plan).failures.map((f) => ({ ...f, kind: 'sense', key: faultKey(f, 'sense') })),
  ];
}

// The faults of `after` that `before` did not have (as a multiset: a fault
// that happens once more than before is new). A fault tied to a week before
// `fromWeek` is history, not a new fault: the change only reaches the rest of
// the block (09 s11).
function addedFaults(before, after, fromWeek = 1) {
  const count = new Map();
  for (const f of before) count.set(f.key, (count.get(f.key) || 0) + 1);
  const out = [];
  for (const f of after) {
    if (Number.isFinite(f.week) && f.week < fromWeek) continue;
    const n = count.get(f.key) || 0;
    if (n > 0) count.set(f.key, n - 1);
    else out.push(f);
  }
  return out;
}

/** The minutes each session runs at the peak, as the build reports them. */
export function reportedMinutesOf(plan) {
  return plan.sessions.map((s) => Math.round(sessionMinutes(s, PEAK, plan.equipment) * 10) / 10);
}

/**
 * Find an exercise of a structure plan. `ref` is one of
 *   { routineExerciseId }, { routineId, exerciseId }, { sessionIndex, exerciseIndex }.
 * Returns { si, ei } or null.
 */
export function findExercise(plan, ref) {
  if (!plan || !ref) return null;
  const sessions = plan.sessions || [];
  if (ref.routineExerciseId != null) {
    for (let si = 0; si < sessions.length; si += 1) {
      const ei = sessions[si].exercises.findIndex((ex) => ex.routineExerciseId === ref.routineExerciseId);
      if (ei >= 0) return { si, ei };
    }
  }
  if (ref.routineId != null && ref.exerciseId != null) {
    const si = sessions.findIndex((s) => s.routineId === ref.routineId);
    if (si >= 0) {
      const ei = sessions[si].exercises.findIndex((ex) => ex.id === ref.exerciseId && (ref.routineExerciseId == null || ex.routineExerciseId == null));
      if (ei >= 0) return { si, ei };
    }
  }
  if (Number.isInteger(ref.sessionIndex) && Number.isInteger(ref.exerciseIndex)) {
    const s = sessions[ref.sessionIndex];
    if (s && s.exercises[ref.exerciseIndex]) return { si: ref.sessionIndex, ei: ref.exerciseIndex };
  }
  return null;
}

function sessionIndexOf(plan, ref) {
  if (Number.isInteger(ref?.sessionIndex) && plan.sessions[ref.sessionIndex]) return ref.sessionIndex;
  if (ref?.routineId != null) {
    const si = plan.sessions.findIndex((s) => s.routineId === ref.routineId);
    return si >= 0 ? si : null;
  }
  return null;
}

/**
 * The weeks of an exercise from `fromWeek` on with a fixed count: the count in
 * every loading week, half of it (never below 1) in the recovery week; the
 * weeks before `fromWeek` are kept. `onlyWeek` changes that one week alone.
 */
function weeksWithCount(weeks, count, fromWeek, onlyWeek) {
  return weeks.map((w, i) => {
    const week = i + 1;
    if (onlyWeek ? week !== fromWeek : week < fromWeek) return { ...w };
    const sets = week === PROGRESSION.deloadWeek && !onlyWeek ? Math.max(1, Math.round(count * PROGRESSION.deloadFraction)) : count;
    return { sets, rir: w.rir };
  });
}

/**
 * The weeks of an exercise from `fromWeek` on with `delta` sets more (or
 * fewer) in each loading week; the recovery week stays half the new peak.
 */
export function weeksWithDelta(weeks, delta, fromWeek) {
  const loading = weeks.map((w, i) => ((i + 1) >= fromWeek && (i + 1) !== PROGRESSION.deloadWeek ? w.sets + delta : w.sets));
  const peak = loading[PEAK - 1];
  return weeks.map((w, i) => {
    const week = i + 1;
    if (week < fromWeek) return { ...w };
    if (week === PROGRESSION.deloadWeek) return { sets: Math.max(1, Math.round(PROGRESSION.deloadFraction * peak)), rir: w.rir };
    return { sets: loading[i], rir: w.rir };
  });
}

const peakOf = (ex) => (ex.weeks[PEAK - 1] ? ex.weeks[PEAK - 1].sets : ex.peak);

/**
 * R71: one gate for every change to a structure plan. Pure: `plan` is not
 * changed; the plan after the change comes back.
 *
 * Kinds (`change.kind`):
 *   setSets          { ref, fromWeek = 1, count?, ladder?, onlyWeek? }: one
 *                    exercise from a week on, a fixed count (count) or its own
 *                    ladder (ladder: one { sets, rir } per block week), or one
 *                    week alone (onlyWeek: the session's own plus or minus one)
 *   addExercise      { routineId | sessionIndex, exercise, sets | weeks, fromWeek = 1, position? }:
 *                    a new exercise (structureExerciseFromRow's shape plus any
 *                    routineExerciseId), the ladder weeksFor(sets) unless
 *                    `weeks` is given, at `position` (the end by default)
 *   removeExercise   { ref, fromWeek = 1 }
 *   replaceExercise  { ref, exercise, fromWeek = 1 }: the new exercise keeps the
 *                    ladder; it takes its own pattern, kind, joints, rest and reps
 *
 * The verdict compares the faults after the change with those before it: no
 * new fault is 'ok'; a new fault is 'blocked' for an automatic change
 * (`auto: true`: a session's plus one, a check-in, the injury ramp, a rebuild)
 * and 'confirm' for a change the person makes by hand, who sees the reason and
 * may keep it (it is their plan). `faults` are the new faults.
 *
 * @param {object} plan  a structure plan (planFromFacts)
 * @param {object} change
 * @param {{ auto?: boolean }} [opts]
 * @returns {{ plan: object, verdict: 'ok'|'confirm'|'blocked', faults: object[] }}
 */
export function applyChange(plan, change, { auto = false, before: known = null } = {}) {
  const before = Array.isArray(known) ? known : allFaults(plan);
  const next = clone(plan);
  const fromWeek = Number.isInteger(change?.fromWeek) && change.fromWeek >= 1 ? change.fromWeek : 1;
  const invalid = (why) => ({ plan, verdict: 'blocked', faults: [{ code: 'change', kind: 'change', detail: why }] });

  switch (change?.kind) {
    case 'setSets': {
      const at = findExercise(next, change.ref);
      if (!at) return invalid('no such exercise');
      const ex = next.sessions[at.si].exercises[at.ei];
      if (Array.isArray(change.ladder)) {
        ex.weeks = ex.weeks.map((w, i) => ((i + 1) >= fromWeek && change.ladder[i] ? { sets: change.ladder[i].sets, rir: change.ladder[i].rir ?? w.rir } : { ...w }));
      } else if (Number.isFinite(change.count) && change.count >= 1) {
        ex.weeks = weeksWithCount(ex.weeks, Math.round(change.count), fromWeek, change.onlyWeek === true);
      } else if (Number.isFinite(change.delta)) {
        ex.weeks = weeksWithDelta(ex.weeks, Math.round(change.delta), fromWeek);
      } else return invalid('no count');
      ex.peak = peakOf(ex);
      break;
    }
    case 'addExercise': {
      const si = sessionIndexOf(next, change);
      const e = change.exercise;
      if (si == null || !e || e.exerciseId == null || !e.pattern) return invalid('no session or exercise');
      const weeks = Array.isArray(change.weeks) ? change.weeks.map((w) => ({ sets: w.sets, rir: w.rir }))
        : weeksFor(Math.max(1, Math.round(change.sets || 2)));
      const ex = {
        id: e.exerciseId,
        routineExerciseId: e.routineExerciseId ?? null,
        name: e.name,
        pattern: e.pattern,
        muscle: e.muscle ?? (PATTERNS[e.pattern] || {}).muscle,
        kind: e.kind,
        weeks,
        restSec: e.restSec,
        repRange: Array.isArray(e.repRange) ? [...e.repRange] : [8, 12],
        nextDayException: false,
        solePattern: (next.kitLimited || []).includes((PATTERNS[e.pattern] || {}).muscle) && e.solePattern === true,
        extraJoints: [...(e.extraJoints || [])],
      };
      ex.peak = peakOf(ex);
      const list = next.sessions[si].exercises;
      const pos = Number.isInteger(change.position) ? Math.max(0, Math.min(change.position, list.length)) : list.length;
      list.splice(pos, 0, ex);
      break;
    }
    case 'removeExercise': {
      const at = findExercise(next, change.ref);
      if (!at) return invalid('no such exercise');
      next.sessions[at.si].exercises.splice(at.ei, 1);
      break;
    }
    case 'replaceExercise': {
      const at = findExercise(next, change.ref);
      const e = change.exercise;
      if (!at || !e || e.exerciseId == null || !e.pattern) return invalid('no such exercise');
      const ex = next.sessions[at.si].exercises[at.ei];
      Object.assign(ex, {
        id: e.exerciseId,
        name: e.name,
        pattern: e.pattern,
        muscle: e.muscle ?? (PATTERNS[e.pattern] || {}).muscle,
        kind: e.kind,
        restSec: e.restSec,
        repRange: Array.isArray(e.repRange) ? [...e.repRange] : ex.repRange,
        extraJoints: [...(e.extraJoints || [])],
        solePattern: false,
      });
      delete ex.tags;
      break;
    }
    default:
      return invalid('unknown change');
  }

  // The length is measured again; the person's answer to the length question
  // (asked when the plan was saved) stands.
  next.reportedMinutes = reportedMinutesOf(next);
  const faults = addedFaults(before, allFaults(next), fromWeek);
  return { plan: next, verdict: faults.length === 0 ? 'ok' : auto ? 'blocked' : 'confirm', faults };
}

// ── R79: the next block ────────────────────────────────────────────────────

/**
 * R79: the next block of the same plan ("repeat" and "continue"): every
 * exercise starts a fresh ladder from its peak as it stands (09 s11: the
 * peak from the previous block, with its check-in changes), checked as an
 * automatic change. Returns { plan, verdict, faults }; a ladder that would
 * add a fault is 'blocked' and the caller keeps the old one.
 */
export function freshLadder(plan) {
  const before = allFaults(plan);
  const next = clone(plan);
  for (const s of next.sessions) {
    for (const ex of s.exercises) {
      ex.weeks = weeksFor(Math.max(1, peakOf(ex)), { nextDayException: ex.nextDayException === true });
      ex.peak = peakOf(ex);
    }
  }
  next.reportedMinutes = reportedMinutesOf(next);
  const faults = addedFaults(before, allFaults(next));
  return { plan: next, verdict: faults.length ? 'blocked' : 'ok', faults };
}

// ── R79: library, kit and hand-built plans ─────────────────────────────────

// The checks that apply to any plan (R79): neighbouring sessions (C2, C9,
// C12, C15, C16), per-session and per-exercise limits (C3, C6, C13, C14) and
// joints (C8, C10). Never the category template (C1), the category minimums
// and maximums (C4), the order (C17) or the length (C18), which only an
// engine plan is built to.
const FIXED_PLAN_CODES = new Set(['C2', 'C3', 'C6', 'C8', 'C9', 'C10', 'C12', 'C13', 'C14', 'C15', 'C16']);

/**
 * R79: a fixed programme (a library, kit or hand-built plan) checked with the
 * checks that apply to any plan. It is never changed. Each row is read as a
 * structure exercise (patterns.structureExerciseFromRow) at its stored sets in
 * every loading week (half in the recovery week) and the block's effort
 * ladder; an exercise the rulebook has no pattern for cannot be checked and is
 * left out, as is a circuit's station (served as rounds); rest is not judged
 * here (the authored rest stands).
 * @param {Array<{ key: string, name?: string, rows: Array<{ exercise: object, routineExercise: object }> }>} sessions
 * @returns {object[]} the hard faults (checkPlan's failures), possibly none
 */
export function checkFixedPlan(sessions) {
  const plan = {
    // A category the checks can read; the category checks themselves are
    // left out below.
    category: 'general', days: (sessions || []).length, equipment: null, experience: 'intermediate', focus: [],
    sessions: (sessions || []).map((s, i) => ({
      key: s.key ?? `s${i}`,
      name: s.name ?? null,
      // A circuit's stations are one group, served as rounds, not sets.
      exercises: (s.rows || []).filter((row) => row?.routineExercise?.groupKind !== 'circuit').map((row) => {
        const e = structureExerciseFromRow(row?.exercise);
        if (!e) return null;
        const sets = Math.max(1, Math.round(Number(row?.routineExercise?.recommendedSets) || 3));
        return {
          id: e.exerciseId, name: e.name, pattern: e.pattern, muscle: e.muscle, kind: e.kind,
          extraJoints: e.extraJoints, repRange: e.repRange,
          restSec: e.restSec,
          weeks: PROGRESSION.rirLadder.map((rir, w) => ({
            sets: (w + 1) === PROGRESSION.deloadWeek ? Math.max(1, Math.round(sets * PROGRESSION.deloadFraction)) : sets,
            rir,
          })),
        };
      }).filter(Boolean),
    })),
  };
  return checkPlan(plan).failures.filter((f) => FIXED_PLAN_CODES.has(f.code));
}

// ── R75: swaps ─────────────────────────────────────────────────────────────

/**
 * R75: whether an exercise (a library row) may take the place of the
 * structure exercise at `ref`: it must be one the rulebook can check, and the
 * replacement may add no fault (a one-off swap and a permanent swap alike;
 * a blocked option is not offered). The exercise already there is always
 * allowed. `before` is faultsOf(plan), computed once for a whole list.
 */
export function swapAllowed(plan, ref, row, before = null) {
  const at = findExercise(plan, ref);
  if (!at) return true;
  if (row && row.id != null && plan.sessions[at.si].exercises[at.ei].id === row.id) return true;
  const e = structureExerciseFromRow(row);
  if (!e) return false;
  const r = applyChange(plan, { kind: 'replaceExercise', ref: { sessionIndex: at.si, exerciseIndex: at.ei }, exercise: e }, { auto: true, before });
  return r.verdict === 'ok';
}

// ── R72: the facts after a change ─────────────────────────────────────────

/**
 * Each engine muscle's counted sets at the peak with its targets, the shape of
 * the engine's report.weekly, measured on the plan as it stands.
 */
export function weeklyOf(plan) {
  const targets = weeklyTargets(plan.category, plan.days, plan.experience, plan.focus || []);
  const load = weeklyLoad(plan, PEAK);
  return Object.fromEntries(Object.entries(targets).map(([m, t]) => [m, { sets: (load[m] || {}).fractional || 0, ...t }]));
}

/**
 * R72: the plan's facts after a change to its structure plan. The structure
 * block takes the plan's sessions and its checks and minutes as measured now;
 * the version 2 fields are rebuilt from it by the build's own function
 * (adapt.structureCompat), so every older reader stays consistent with what
 * is served. Every other fact (typed counts, kind, a check-in's record) is kept.
 * @param {object} facts  the plan's facts before the change
 * @param {object} plan   the structure plan after it
 */
export function refreshStructureFacts(facts, plan) {
  const minutes = reportedMinutesOf(plan);
  const weekly = weeklyOf(plan);
  const compat = structureCompat(plan, {
    weekly, minutes, lengthMinutes: plan.lengthMinutes, routineIdOf: (i) => plan.sessions[i].routineId,
  });
  const c = checkPlan(plan);
  const sc = senseCheck(plan);
  const s = facts.structure;
  return {
    ...facts,
    ...compat,
    structure: {
      ...s,
      ...structurePlanData(plan),
      sessions: plan.sessions.map((session) => ({
        routineId: session.routineId ?? null,
        key: session.key,
        name: session.name,
        exercises: session.exercises.map((ex) => structureExercise(ex)),
      })),
      checks: {
        ok: c.ok && sc.ok,
        faults: c.failures.map((f) => ({ code: f.code, detail: f.detail })),
        sense: sc.failures.map((f) => f.code),
      },
      report: {
        ...(s.report || {}),
        minutes,
        longestMinutes: Math.max(0, ...minutes),
      },
    },
  };
}

// ── R78: check-ins ─────────────────────────────────────────────────────────

const tierOf = (category, m) => (TIERS[m] ? TIERS[m][category] : 'I');

/**
 * The muscles a raise may go to, in the order it tries them: the person's
 * focus picks in pick order, then the priority and standard muscles (tiers P
 * and S) furthest below their normal volume, then the rulebook's muscle order.
 * A maintenance muscle (tier M) is kept where it is, as on every other plan,
 * and a muscle `held` (a capability limit or a soreness answer, in the app's
 * keys) is never raised. 09 s8: at most two muscles take a raise.
 */
export function raiseOrder(plan, held = new Set()) {
  const weekly = weeklyOf(plan);
  const focus = plan.focus || [];
  const trained = new Set();
  for (const s of plan.sessions) for (const ex of s.exercises) trained.add((PATTERNS[ex.pattern] || {}).muscle);
  const out = { order: [], notRaised: [] };
  const list = Object.keys(weekly).filter((m) => trained.has(m));
  for (const m of list) {
    const app = appMuscleOf(m);
    if (app && held.has(app)) { out.notRaised.push({ muscle: m, why: 'held' }); continue; }
    const t = tierOf(plan.category, m);
    if (!focus.includes(m) && t !== 'P' && t !== 'S') continue;
    out.order.push(m);
  }
  const gap = (m) => (weekly[m].target - weekly[m].sets);
  out.order.sort((a, b) => {
    const fa = focus.indexOf(a);
    const fb = focus.indexOf(b);
    if (fa >= 0 || fb >= 0) return (fa < 0 ? 99 : fa) - (fb < 0 ? 99 : fb);
    return (gap(b) - gap(a)) || (MUSCLES.indexOf(a) - MUSCLES.indexOf(b));
  });
  return out;
}

// The sessions whose template lists a muscle (a check-in opens an exercise
// only where the plan's week trains that muscle).
function sessionsListing(plan, m) {
  const template = (TEMPLATES[plan.category] || {})[plan.days] || [];
  return plan.sessions.map((s, i) => ({ s, i })).filter(({ s }) => {
    const t = template.find((x) => x.key === s.key);
    return t && t.muscles.includes(m);
  }).map(({ i }) => i);
}

/** At most this many muscles take a raise (09 s8). */
export const RAISE_MUSCLES = 2;
/** A reduce takes about a fifth of each muscle's own sets (09 s8). */
export const REDUCE_FRACTION = 0.2;

/**
 * R78: a check-in on a structure plan, applied to the ladder from `fromWeek`
 * (the next week) on. Every step goes through applyChange as an automatic
 * change, so a check-in never opens or raises what the checks reject:
 *   raise   up to two muscles (raiseOrder); each takes one set for each of
 *           its exercises, given to the exercise with the fewest sets first;
 *           a new exercise of two sets opens (the first candidate, in the
 *           first session listing the muscle, that passes) only where no
 *           exercise of the muscle can take a set; a set no step can place is
 *           reported, never forced;
 *   hold    nothing changes (09 s8);
 *   reduce  each muscle with sets of its own gives about a fifth of them,
 *           one set at a time from its exercise with the most sets; a step
 *           the checks reject (a muscle going below its minimum) is not taken.
 *
 * @param {object} plan  a structure plan (planFromFacts)
 * @param {object} args
 * @param {'raise'|'hold'|'reduce'} args.kind
 * @param {number} args.fromWeek  the block week the change starts (next week)
 * @param {Set<string>} [args.held]  app muscle keys a raise may not reach
 * @param {function(string): object[]} [args.candidates]  per engine muscle, the
 *        exercises the person's kit and choices allow, as
 *        patterns.structureExerciseFromRow gives them; omit to open nothing
 * @returns {{ plan: object, kind: string, muscles: object[], opened: object[],
 *   unplaced: string[], notRaised: object[], changed: boolean }}
 */
export function structureCheckin(plan, { kind, fromWeek, held = new Set(), candidates = null }) {
  let current = plan;
  const out = { kind, muscles: [], opened: [], unplaced: [], notRaised: [], changed: false };
  const tryChange = (change) => {
    const r = applyChange(current, { ...change, fromWeek }, { auto: true });
    if (r.verdict !== 'ok') return false;
    current = r.plan;
    return true;
  };
  const exercisesOf = (m) => {
    const list = [];
    current.sessions.forEach((s, si) => s.exercises.forEach((ex, ei) => {
      if ((PATTERNS[ex.pattern] || {}).muscle === m) list.push({ si, ei, ex });
    }));
    return list;
  };

  if (kind === 'raise') {
    const { order, notRaised } = raiseOrder(current, held);
    out.notRaised = notRaised;
    for (const m of order) {
      if (out.muscles.length >= RAISE_MUSCLES) break;
      const moves = [];
      const given = new Set();
      const want = exercisesOf(m).length;
      for (let n = 0; n < want; n += 1) {
        const list = exercisesOf(m)
          .filter(({ si, ei }) => !given.has(`${si}:${ei}`))
          .sort((a, b) => (peakOf(a.ex) - peakOf(b.ex)) || (a.si - b.si) || (a.ei - b.ei));
        let placed = false;
        for (const { si, ei, ex } of list) {
          const from = ex.weeks[fromWeek - 1] ? ex.weeks[fromWeek - 1].sets : peakOf(ex);
          if (tryChange({ kind: 'setSets', ref: { sessionIndex: si, exerciseIndex: ei }, delta: 1 })) {
            given.add(`${si}:${ei}`);
            moves.push({ session: si, routineId: current.sessions[si].routineId, routineExerciseId: ex.routineExerciseId, exerciseId: ex.id, name: ex.name, from, to: from + 1 });
            placed = true;
            break;
          }
          given.add(`${si}:${ei}`);
        }
        if (!placed) break;
      }
      let opened = null;
      if (moves.length === 0 && typeof candidates === 'function') {
        const have = new Set(exercisesOf(m).map(({ ex }) => ex.id));
        const list = (candidates(m) || []).filter((c) => c && c.exerciseId != null && !have.has(c.exerciseId));
        outer: for (const si of sessionsListing(current, m)) {
          for (const c of list) {
            // Before the session's abs, which stay last (S9).
            const exs = current.sessions[si].exercises;
            const firstAbs = exs.findIndex((ex, i) => (PATTERNS[ex.pattern] || {}).muscle === 'abs' && exs.slice(i).every((x) => (PATTERNS[x.pattern] || {}).muscle === 'abs'));
            const position = firstAbs >= 0 ? firstAbs : exs.length;
            if (tryChange({ kind: 'addExercise', sessionIndex: si, exercise: c, sets: 2, position })) {
              const ex = current.sessions[si].exercises[position];
              opened = { session: si, routineId: current.sessions[si].routineId, position, exerciseId: c.exerciseId, name: c.name, sets: ex.weeks[fromWeek - 1] ? ex.weeks[fromWeek - 1].sets : 2, exercise: c, muscle: m };
              break outer;
            }
          }
        }
      }
      if (moves.length || opened) {
        out.muscles.push({ muscle: m, moves, opened, added: moves.length + (opened ? opened.sets : 0) });
        if (opened) out.opened.push(opened);
        out.changed = true;
      } else {
        out.unplaced.push(m);
      }
    }
  } else if (kind === 'reduce') {
    const weekly = weeklyOf(current);
    for (const m of Object.keys(weekly)) {
      const own = exercisesOf(m);
      if (!own.length) continue;
      const direct = own.reduce((t, { ex }) => t + peakOf(ex), 0);
      const take = Math.max(1, Math.round(REDUCE_FRACTION * direct));
      const moves = [];
      for (let n = 0; n < take; n += 1) {
        const list = exercisesOf(m).sort((a, b) => (peakOf(b.ex) - peakOf(a.ex)) || (a.si - b.si) || (a.ei - b.ei));
        let placed = false;
        for (const { si, ei, ex } of list) {
          const from = ex.weeks[fromWeek - 1] ? ex.weeks[fromWeek - 1].sets : peakOf(ex);
          if (tryChange({ kind: 'setSets', ref: { sessionIndex: si, exerciseIndex: ei }, delta: -1 })) {
            moves.push({ session: si, routineId: current.sessions[si].routineId, routineExerciseId: ex.routineExerciseId, exerciseId: ex.id, name: ex.name, from, to: from - 1 });
            placed = true;
            break;
          }
        }
        if (!placed) break;
      }
      if (moves.length) {
        out.muscles.push({ muscle: m, moves, opened: null, added: -moves.length });
        out.changed = true;
      }
    }
  }
  return { ...out, plan: current };
}
