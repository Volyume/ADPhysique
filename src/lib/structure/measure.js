/**
 * measure.js -- D222: the measurements the structure checker and engine share.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/09-RESEARCH-FINDINGS.md
 * as corrected in 10-RESEARCH-VERIFICATION.md and register D222. Pure, no
 * I/O, deterministic.
 *
 * The plan shape both read (a "structure plan"):
 *   { category, days, equipment, lengthMinutes, experience, focus: [muscle],
 *     sessions: [{ key, name, exercises: [Exercise] }] }
 *   Exercise: { id, name, pattern, kind, restSec, repRange: [lo, hi],
 *     weeks: [{ sets, rir }] (one per block week), extraJoints?: [tag],
 *     tags?: [tag], solePattern?: boolean, nextDayException?: boolean }
 * `pattern` is a rulebook pattern key (muscle, credits, joints); `kind` is
 * the catalogue kind that sets rest and time (heavy_compound, mod_compound,
 * machine, isolation).
 */
import {
  PATTERNS, CREDIT_FRACTION, TRAINED, LIGHT_DOSE, TIME_MODEL, PROGRESSION,
} from './rulebook';

const COMPOUND_KINDS = new Set(['heavy_compound', 'mod_compound']);

/** The rulebook pattern behind an exercise, or null when it has none. */
export function patternOf(ex) {
  return (ex && PATTERNS[ex.pattern]) || null;
}

/** Sets of an exercise in a block week (1-based); 0 when absent. */
export function setsIn(ex, week) {
  const w = ex && ex.weeks ? ex.weeks[week - 1] : null;
  return w && Number.isFinite(w.sets) ? Math.max(0, w.sets) : 0;
}

/** RIR of an exercise in a block week (1-based); null when absent. */
export function rirIn(ex, week) {
  const w = ex && ex.weeks ? ex.weeks[week - 1] : null;
  return w && Number.isFinite(w.rir) ? w.rir : null;
}

/** Joint tags of an exercise: its pattern's plus any it adds. */
export function jointsOf(ex) {
  const p = patternOf(ex);
  return [...new Set([...(p ? p.joints : []), ...((ex && ex.extraJoints) || [])])];
}

/**
 * Per muscle, one session's load in a week: direct sets, credited sets
 * (sets of other exercises whose pattern credits the muscle), and the
 * fractional total (direct + 0.5 x credited).
 * @returns {Object<string, { direct: number, credited: number, fractional: number }>}
 */
export function sessionLoad(session, week) {
  const load = {};
  const add = (m) => {
    if (!load[m]) load[m] = { direct: 0, credited: 0, fractional: 0 };
    return load[m];
  };
  for (const ex of (session && session.exercises) || []) {
    const p = patternOf(ex);
    const sets = setsIn(ex, week);
    if (!p || sets <= 0) continue;
    add(p.muscle).direct += sets;
    for (const c of p.credits) add(c).credited += sets;
  }
  for (const v of Object.values(load)) v.fractional = v.direct + CREDIT_FRACTION * v.credited;
  return load;
}

/** True when a muscle counts as trained in a session that week (09 s4). */
export function isTrained(load, muscle) {
  const l = load[muscle];
  if (!l) return false;
  return l.direct >= TRAINED.directSets || CREDIT_FRACTION * l.credited >= TRAINED.indirectFractional;
}

/**
 * True when a session's dose of a muscle is light that week (09 s4, R1): at
 * most 4 direct sets, every direct exercise an isolation, every set at RIR 2
 * or more.
 */
export function isLightDose(session, muscle, week) {
  let direct = 0;
  for (const ex of (session && session.exercises) || []) {
    const p = patternOf(ex);
    const sets = setsIn(ex, week);
    if (!p || p.muscle !== muscle || sets <= 0) continue;
    direct += sets;
    if (LIGHT_DOSE.isolationOnly && p.kind !== 'isolation') return false;
    const rir = rirIn(ex, week);
    if (rir == null || rir < LIGHT_DOSE.minRir) return false;
  }
  return direct <= LIGHT_DOSE.maxDirectSets;
}

/** Weekly fractional totals per muscle across the plan's sessions. */
export function weeklyLoad(plan, week) {
  const total = {};
  for (const s of (plan && plan.sessions) || []) {
    for (const [m, v] of Object.entries(sessionLoad(s, week))) {
      if (!total[m]) total[m] = { direct: 0, credited: 0, fractional: 0 };
      total[m].direct += v.direct;
      total[m].credited += v.credited;
      total[m].fractional += v.fractional;
    }
  }
  return total;
}

/** Working sets in a session that week. */
export function sessionSets(session, week) {
  return ((session && session.exercises) || []).reduce((n, ex) => n + setsIn(ex, week), 0);
}

/**
 * Estimated minutes for a session in a week (the map's time model, kept by
 * 09 s5): 7.5 minutes of overhead plus a minute for each compound after the
 * first, 60 seconds a set, the rest between sets, and a transition between
 * exercises that depends on the kit.
 */
export function sessionMinutes(session, week, equipment) {
  const live = ((session && session.exercises) || []).filter((ex) => setsIn(ex, week) > 0);
  if (live.length === 0) return 0;
  const compounds = live.filter((ex) => COMPOUND_KINDS.has(ex.kind)).length;
  let sec = (TIME_MODEL.overheadMinutes + TIME_MODEL.perCompoundAfterFirstMinutes * Math.max(0, compounds - 1)) * 60;
  for (const ex of live) {
    const sets = setsIn(ex, week);
    sec += sets * TIME_MODEL.setSeconds + (sets - 1) * (Number.isFinite(ex.restSec) ? ex.restSec : 0);
  }
  const transition = TIME_MODEL.transitionSeconds[equipment] ?? TIME_MODEL.defaultTransitionSeconds;
  sec += (live.length - 1) * transition;
  return sec / 60;
}

/** The block week with the most working sets (the peak, 09 s8). */
export const PEAK_WEEK = PROGRESSION.peakWeek;
