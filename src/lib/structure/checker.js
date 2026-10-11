/**
 * checker.js -- D222: the structure checker, 09 B10 C1 to C18, run on every
 * plan the app can produce.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/09-RESEARCH-FINDINGS.md
 * B10 and B6, as corrected in 10-RESEARCH-VERIFICATION.md and register D222
 * (R1 light doses per week, R4 24 sets, R7 the per-session cap, Q1 = C the
 * length rule). C19 (same inputs, same plan) and C20 (every path after the
 * build re-runs these checks) are properties of the engine and the paths,
 * tested there; checkFocusAgainstBaseline is C5.
 *
 * Pure, no I/O, deterministic. A plan that fails any check here is never
 * saved (09 s10 S9). Failures carry a code, the week (1-based) where it
 * applies, the session key or keys, the muscle, and a plain detail line.
 */
import {
  TEMPLATES, TIERS, VOLUME, FOCUS, PER_SESSION, FAST_MUSCLES, LARGE_MUSCLES,
  SESSION_LIMITS, REST_SECONDS, JOINT_RULES, TIME_MODEL, PROGRESSION,
  OHP_PATTERNS, KNEE_COMPOUND_PATTERNS, ELBOW_ISOLATION_PATTERNS,
  SKULL_OVERHEAD_PATTERNS, REAR_DELT_HEALTH_PATTERNS,
} from './rulebook';
import {
  patternOf, setsIn, rirIn, jointsOf, sessionLoad, isTrained, isLightDose,
  weeklyLoad, sessionSets, sessionMinutes,
} from './measure';

const KIND_RANK = Object.freeze({ heavy_compound: 0, mod_compound: 1, machine: 2, isolation: 3 });
const FORBIDDEN_TAGS = Object.freeze(['high_elbow_upright_row', 'lateral_above_90']);

/** The neighbouring session pairs of a rotation, the last neighbouring the first. */
export function adjacentPairs(n) {
  if (n < 2) return [];
  const pairs = [];
  for (let i = 0; i < n; i += 1) pairs.push([i, (i + 1) % n]);
  return pairs;
}

function blockWeeks(plan) {
  let n = 0;
  for (const s of plan.sessions || []) for (const ex of s.exercises || []) n = Math.max(n, (ex.weeks || []).length);
  return Math.max(1, Math.min(n, PROGRESSION.weeks));
}

const isLoadingWeek = (w) => w !== PROGRESSION.deloadWeek;
const tierOf = (category, muscle) => (TIERS[muscle] ? TIERS[muscle][category] : 'I');
const usesPattern = (ex, keys, week) => keys.includes(ex.pattern) && setsIn(ex, week) > 0;

/** The weekly maximum for a muscle, with the focus allowance (09 s3, B4). */
export function weeklyMax(category, muscle, focus) {
  const t = tierOf(category, muscle);
  if (t === 'I') return null;
  const base = VOLUME[t].max;
  return (focus || []).includes(muscle) ? Math.min(base + FOCUS.addFractional, FOCUS.cap) : base;
}

/**
 * Check a structure plan (see measure.js for the shape).
 * @returns {{ ok: boolean, failures: object[], warnings: object[], minutes: number[], weekly: object }}
 */
export function checkPlan(plan) {
  const failures = [];
  const warnings = [];
  const fail = (code, detail, extra = {}) => failures.push({ code, detail, ...extra });
  const sessions = plan.sessions || [];
  const n = sessions.length;
  const weeks = blockWeeks(plan);
  const pairs = adjacentPairs(n);
  const beginner = plan.experience === 'beginner';

  // C1: the session list is the template, up to a cyclic shift.
  const template = ((TEMPLATES[plan.category] || {})[plan.days] || []).map((s) => s.key);
  const keys = sessions.map((s) => s.key);
  const shiftOk = template.length === keys.length && template.some((_, k) => template.every((t, i) => t === keys[(i + k) % keys.length]));
  if (!shiftOk) fail('C1', `sessions ${keys.join(',')} are not the ${plan.category} ${plan.days}-day template ${template.join(',')}`);

  for (let w = 1; w <= weeks; w += 1) {
    const loads = sessions.map((s) => sessionLoad(s, w));

    // C2: no muscle trained in two neighbouring sessions, unless it is a
    // next-day muscle whose earlier dose is light that week (R1).
    for (const [a, b] of pairs) {
      const muscles = new Set([...Object.keys(loads[a]), ...Object.keys(loads[b])]);
      for (const m of muscles) {
        if (!isTrained(loads[a], m) || !isTrained(loads[b], m)) continue;
        if (FAST_MUSCLES.includes(m) && isLightDose(sessions[a], m, w)) continue;
        fail('C2', `${m} trained in ${sessions[a].key} then ${sessions[b].key}`, { week: w, sessions: [sessions[a].key, sessions[b].key], muscle: m });
      }
      // J2 (C9): front-delt load in both of a neighbouring pair.
      const fa = (loads[a].front_delts || {}).fractional || 0;
      const fb = (loads[b].front_delts || {}).fractional || 0;
      if (fa >= JOINT_RULES.frontDeltAdjacentFractional && fb >= JOINT_RULES.frontDeltAdjacentFractional) {
        fail('C9', `front delts loaded ${fa} then ${fb} in neighbouring sessions`, { week: w, sessions: [sessions[a].key, sessions[b].key] });
      }
      // J5 (C12): heavy spinal loading in both of a neighbouring pair.
      const spinal = (s) => (s.exercises || []).some((ex) => setsIn(ex, w) > 0 && jointsOf(ex).includes('spinal_axial'));
      if (spinal(sessions[a]) && spinal(sessions[b])) {
        fail('C12', 'spinal-loading exercises in neighbouring sessions', { week: w, sessions: [sessions[a].key, sessions[b].key] });
      }
      // J8 (C15): knee-dominant compound sets in both of a neighbouring pair.
      const knee = (s) => (s.exercises || []).reduce((t, ex) => t + (usesPattern(ex, KNEE_COMPOUND_PATTERNS, w) ? setsIn(ex, w) : 0), 0);
      if (knee(sessions[a]) >= JOINT_RULES.kneeCompoundAdjacentSets && knee(sessions[b]) >= JOINT_RULES.kneeCompoundAdjacentSets) {
        fail('C15', 'knee-dominant compounds in neighbouring sessions', { week: w, sessions: [sessions[a].key, sessions[b].key] });
      }
    }

    sessions.forEach((s, i) => {
      const exs = (s.exercises || []).filter((ex) => setsIn(ex, w) > 0);
      // C3: per muscle per session caps; no compound set at RIR 0.
      for (const [m, l] of Object.entries(loads[i])) {
        if (l.direct > PER_SESSION.directCap) fail('C3', `${m} ${l.direct} direct sets (cap ${PER_SESSION.directCap})`, { week: w, session: s.key, muscle: m });
        if (l.fractional > PER_SESSION.fractionalCap) fail('C3', `${m} ${l.fractional} fractional sets (cap ${PER_SESSION.fractionalCap})`, { week: w, session: s.key, muscle: m });
      }
      for (const ex of exs) {
        const p = patternOf(ex);
        const rir = rirIn(ex, w);
        if (p && p.kind === 'compound' && rir != null && rir < PROGRESSION.compoundMinRir) {
          fail('C3', `${ex.name} compound at RIR ${rir}`, { week: w, session: s.key });
        }
        if (!p) fail('C3', `${ex.name} has no rulebook pattern`, { week: w, session: s.key });
      }
      // C6: session limits.
      const maxEx = beginner ? SESSION_LIMITS.beginnerExercises : SESSION_LIMITS.exercisesHard;
      if (exs.length > maxEx) fail('C6', `${exs.length} exercises (limit ${maxEx})`, { week: w, session: s.key });
      const sets = sessionSets(s, w);
      if (sets > SESSION_LIMITS.workingSetsHard) fail('C6', `${sets} working sets (limit ${SESSION_LIMITS.workingSetsHard})`, { week: w, session: s.key });
      for (const ex of exs) {
        const k = setsIn(ex, w);
        const hi = beginner ? SESSION_LIMITS.beginnerSetsPerExercise
          : (ex.solePattern ? SESSION_LIMITS.setsPerExerciseSolePattern : SESSION_LIMITS.setsPerExerciseMax);
        const lo = isLoadingWeek(w) ? SESSION_LIMITS.setsPerExerciseMin : 1;
        if (k > hi || k < lo) fail('C6', `${ex.name} ${k} sets (allowed ${lo} to ${hi})`, { week: w, session: s.key });
      }
      const perMuscle = {};
      for (const ex of exs) {
        const p = patternOf(ex);
        if (p) perMuscle[p.muscle] = (perMuscle[p.muscle] || 0) + 1;
      }
      for (const [m, k] of Object.entries(perMuscle)) {
        const lim = m === 'front_delts' ? SESSION_LIMITS.exercisesPerMuscleFrontDelts
          : LARGE_MUSCLES.includes(m) ? SESSION_LIMITS.exercisesPerMuscleLarge : SESSION_LIMITS.exercisesPerMuscleOther;
        if (k > lim) fail('C6', `${m} ${k} exercises (limit ${lim})`, { week: w, session: s.key, muscle: m });
      }
      // J6 (C13): spinal-loading exercises per session.
      const spinalCount = exs.filter((ex) => jointsOf(ex).includes('spinal_axial')).length;
      if (spinalCount > JOINT_RULES.spinalAxialPerSession) fail('C13', `${spinalCount} spinal-loading exercises (limit ${JOINT_RULES.spinalAxialPerSession})`, { week: w, session: s.key });
      // J7 (C14): elbow isolation sets.
      const elbow = exs.reduce((t, ex) => t + (usesPattern(ex, ELBOW_ISOLATION_PATTERNS, w) ? setsIn(ex, w) : 0), 0);
      if (elbow > JOINT_RULES.elbowIsolationSetsPerSession) fail('C14', `${elbow} elbow isolation sets (limit ${JOINT_RULES.elbowIsolationSetsPerSession})`, { week: w, session: s.key });
      const skull = exs.reduce((t, ex) => t + (usesPattern(ex, SKULL_OVERHEAD_PATTERNS, w) ? setsIn(ex, w) : 0), 0);
      if (skull > JOINT_RULES.skullOverheadSetsPerSession) fail('C14', `${skull} skull-crusher or overhead extension sets (limit ${JOINT_RULES.skullOverheadSetsPerSession})`, { week: w, session: s.key });
    });

    // J1 (C8) and J6 (C13): sessions a week with overhead pressing, and heavy hinges.
    const ohpSessions = sessions.filter((s) => (s.exercises || []).some((ex) => usesPattern(ex, OHP_PATTERNS, w))).length;
    const ohpMax = JOINT_RULES.ohpSessionsMaxByCategory[plan.category] ?? JOINT_RULES.ohpSessionsMax;
    if (ohpSessions > ohpMax) fail('C8', `overhead pressing in ${ohpSessions} sessions (limit ${ohpMax})`, { week: w });
    const hingeSessions = sessions.filter((s) => (s.exercises || []).some((ex) => usesPattern(ex, ['hinge'], w) && jointsOf(ex).includes('spinal_axial'))).length;
    if (hingeSessions > JOINT_RULES.heavyHingeSessionsPerWeek) fail('C13', `heavy hinges in ${hingeSessions} sessions (limit ${JOINT_RULES.heavyHingeSessionsPerWeek})`, { week: w });
  }

  // C4: weekly totals at the peak week inside the category's range.
  const peak = Math.min(PROGRESSION.peakWeek, weeks);
  const weekly = weeklyLoad(plan, peak);
  for (const m of Object.keys(TIERS)) {
    const t = tierOf(plan.category, m);
    const v = weekly[m] || { direct: 0, credited: 0, fractional: 0 };
    if (t === 'I') {
      if (v.direct > VOLUME.I.maxDirect) fail('C4', `${m} ${v.direct} direct sets on an indirect-only muscle (limit ${VOLUME.I.maxDirect})`, { week: peak, muscle: m });
      continue;
    }
    const lo = VOLUME[t].min[plan.days];
    const hi = weeklyMax(plan.category, m, plan.focus);
    // 09 s7 (R17): a muscle the kit has no pattern for is reported, not
    // failed; it is trained only through other exercises' credits.
    if ((plan.untrainable || []).includes(m)) {
      if (v.fractional < lo) warnings.push({ code: 'C4', muscle: m, detail: `${m} cannot be trained directly with this equipment; ${v.fractional} sets a week through other exercises` });
    } else if (v.fractional < lo) fail('C4', `${m} ${v.fractional} sets a week, below the minimum ${lo}`, { week: peak, muscle: m });
    if (v.fractional > hi) fail('C4', `${m} ${v.fractional} sets a week, above the maximum ${hi}`, { week: peak, muscle: m });
  }

  // C7: every rest at or above its floor.
  for (const s of sessions) {
    for (const ex of s.exercises || []) {
      const r = REST_SECONDS[ex.kind];
      if (!r) fail('C7', `${ex.name} has no rest kind`, { session: s.key });
      else if (!Number.isFinite(ex.restSec) || ex.restSec < r.floor) fail('C7', `${ex.name} rests ${ex.restSec} s (floor ${r.floor})`, { session: s.key });
    }
  }

  // J3 (C10): no lateral raise above 90 degrees, no high-elbow upright row.
  for (const s of sessions) {
    for (const ex of s.exercises || []) {
      const bad = (ex.tags || []).filter((t) => FORBIDDEN_TAGS.includes(t));
      if (bad.length) fail('C10', `${ex.name} is ${bad.join(', ')}`, { session: s.key });
    }
  }

  // J4 (C11, soft): rear-delt and external-rotator work each week.
  const rearHealth = sessions.reduce((t, s) => t + (s.exercises || []).reduce((u, ex) => u + (REAR_DELT_HEALTH_PATTERNS.includes(ex.pattern) ? setsIn(ex, peak) : 0), 0), 0);
  if (rearHealth < JOINT_RULES.rearDeltHealthWeeklySets) warnings.push({ code: 'C11', detail: `${rearHealth} rear-fly or face-pull sets a week (aim ${JOINT_RULES.rearDeltHealthWeeklySets})` });

  // C16: no exercise in two neighbouring sessions; no two identical sessions.
  for (const [a, b] of pairs) {
    const ids = new Set((sessions[a].exercises || []).filter((ex) => setsIn(ex, peak) > 0).map((ex) => ex.id));
    for (const ex of sessions[b].exercises || []) {
      if (setsIn(ex, peak) > 0 && ids.has(ex.id)) fail('C16', `${ex.name} in neighbouring sessions`, { sessions: [sessions[a].key, sessions[b].key] });
    }
  }
  const signatures = sessions.map((s) => (s.exercises || []).map((ex) => ex.id).sort().join('|'));
  signatures.forEach((sig, i) => {
    if (sig && signatures.indexOf(sig) !== i) fail('C16', `${sessions[i].key} repeats ${sessions[signatures.indexOf(sig)].key}`, { session: sessions[i].key });
  });

  // C17: compound tiers first (heavy, moderate, machine, isolation).
  for (const s of sessions) {
    const ranks = (s.exercises || []).map((ex) => KIND_RANK[ex.kind] ?? 3);
    for (let i = 1; i < ranks.length; i += 1) {
      if (ranks[i] < ranks[i - 1]) { fail('C17', `${s.exercises[i].name} after a lighter exercise`, { session: s.key }); break; }
    }
  }

  // C18: honest length (Q1 = C). Over the chosen length by more than the
  // tolerance, the plan must ask for a longer session or more days.
  const minutes = sessions.map((s) => sessionMinutes(s, peak, plan.equipment));
  if (Number.isFinite(plan.lengthMinutes)) {
    const over = minutes.some((m) => m > plan.lengthMinutes + TIME_MODEL.toleranceMinutes);
    if (over && !plan.needsLengthChoice) fail('C18', `a session runs ${Math.max(...minutes).toFixed(0)} minutes against ${plan.lengthMinutes} chosen, without asking`);
    if (Array.isArray(plan.reportedMinutes)) {
      plan.reportedMinutes.forEach((r, i) => {
        if (Math.abs(r - minutes[i]) > 0.5) fail('C18', `${sessions[i].key} reports ${r} minutes, measures ${minutes[i].toFixed(1)}`, { session: sessions[i].key });
      });
    }
  }

  return { ok: failures.length === 0, failures, warnings, minutes, weekly };
}

/**
 * C5: adding focus never takes sets from another muscle. Compares the focus
 * plan's peak weekly direct sets for every other muscle with the same plan
 * built without focus.
 */
export function checkFocusAgainstBaseline(plan, baseline) {
  const failures = [];
  const peak = PROGRESSION.peakWeek;
  const withFocus = weeklyLoad(plan, peak);
  const without = weeklyLoad(baseline, peak);
  for (const [m, v] of Object.entries(without)) {
    if ((plan.focus || []).includes(m)) continue;
    const now = (withFocus[m] || { direct: 0 }).direct;
    if (now < v.direct) failures.push({ code: 'C5', muscle: m, detail: `${m} ${v.direct} to ${now} direct sets when focus was added` });
  }
  return { ok: failures.length === 0, failures };
}
