/**
 * sense.js -- D222: the sense layer. Runs after the rulebook checks and fails
 * any plan an elite coach or the person training would look at and say
 * "this does not make sense".
 *
 * Authority: the founder's order (register D222 addendum, 2026-10-11): "Ensure
 * there's not complete dropouts of muscle, body parts ... no instance at all
 * where I or another end user or even a coach loads up a plan and says, okay,
 * this doesn't make sense. We're missing a muscle group. We're loading an area
 * too much day by day to cause injury ... There should be no instance where
 * recovery is not optimal. We also do not plan, have plans by forced days".
 * Recovery hours from 09 B5; the rest are coaching sense (grade D), each
 * named below.
 *
 * Pure, no I/O, deterministic.
 */
import {
  TIERS, OPT_IN_MUSCLES, LARGE_MUSCLES, TEMPLATES, RECOVERY_HOURS, PER_SESSION, LIGHT_DOSE,
} from './rulebook';
import { sessionLoad, isTrained, isLightDose, setsIn, rirIn, patternOf, PEAK_WEEK } from './measure';

const PUSH_MUSCLES = new Set(['chest', 'front_delts']);
const PULL_MUSCLES = new Set(['lats', 'upper_back']);
const HOURS_PER_SESSION_GAP = 24; // F5: the next session may be the next day.

const tierOf = (category, m) => (TIERS[m] ? TIERS[m][category] : 'I');
const directSetsByMuscle = (plan, week) => {
  const out = {};
  for (const s of plan.sessions) {
    for (const ex of s.exercises) {
      const p = patternOf(ex);
      if (p) out[p.muscle] = (out[p.muscle] || 0) + setsIn(ex, week);
    }
  }
  return out;
};

/** The dose class of a muscle in a session that week (09 s4). */
export function doseClass(session, muscle, week) {
  const load = sessionLoad(session, week)[muscle];
  if (!load) return null;
  if (isLightDose(session, muscle, week) && load.direct <= LIGHT_DOSE.maxDirectSets) return 'light';
  const compoundToFailure = session.exercises.some((ex) => {
    const p = patternOf(ex);
    return p && setsIn(ex, week) > 0 && p.kind === 'compound' && (p.muscle === muscle || p.credits.includes(muscle)) && rirIn(ex, week) === 0;
  });
  if (load.direct > PER_SESSION.directCap || load.fractional > PER_SESSION.fractionalCap || compoundToFailure) return 'heavy';
  return 'moderate';
}

/**
 * Sense-check a structure plan. Codes:
 *   S1 no dropout: every muscle the category trains has an exercise of its own;
 *   S2 recovery when every next session is the next day (09 B5 hours);
 *   S3 pulling at least matches pressing (shoulder health);
 *   S4 hamstrings at least half of quads;
 *   S5 every session is worth the trip: 3 exercises and 8 working sets
 *      (6 for a beginner) at the peak week;
 *   S6 every session's work is what its name covers;
 *   S7 every session trains what its name promises (its template `core`).
 * @param {object} plan  a structure plan (measure.js)
 * @returns {{ ok: boolean, failures: object[] }}
 */
export function senseCheck(plan) {
  const failures = [];
  const fail = (code, detail, extra = {}) => failures.push({ code, detail, ...extra });
  const n = plan.sessions.length;
  const week = PEAK_WEEK;
  const direct = directSetsByMuscle(plan, week);
  const untrainable = new Set(plan.untrainable || []);

  // S1: no muscle the category trains is left without an exercise of its own.
  for (const m of Object.keys(TIERS)) {
    const t = tierOf(plan.category, m);
    if (t === 'I' || OPT_IN_MUSCLES.includes(m) || untrainable.has(m)) continue;
    if ((direct[m] || 0) < 2) fail('S1', `${m} has no exercise of its own this week`, { muscle: m });
  }

  // S2: recovery with every session on consecutive days, through two
  // rotations, for every muscle trained, in every week of the block.
  const weeks = Math.max(...plan.sessions.flatMap((s) => s.exercises.map((ex) => (ex.weeks || []).length)), 1);
  for (let w = 1; w <= weeks; w += 1) {
    const loads = plan.sessions.map((s) => sessionLoad(s, w));
    for (let i = 0; i < n; i += 1) {
      for (const m of Object.keys(loads[i])) {
        if (!isTrained(loads[i], m)) continue;
        const dose = doseClass(plan.sessions[i], m, w);
        const need = RECOVERY_HOURS[LARGE_MUSCLES.includes(m) ? 'large' : 'other'][dose];
        for (let gap = 1; gap < n; gap += 1) {
          const j = (i + gap) % n;
          if (!isTrained(loads[j], m)) continue;
          if (gap * HOURS_PER_SESSION_GAP < need) {
            fail('S2', `${m}: a ${dose} dose in ${plan.sessions[i].key} needs ${need} h, the next session training it is ${gap * HOURS_PER_SESSION_GAP} h later`, { week: w, muscle: m, sessions: [plan.sessions[i].key, plan.sessions[j].key] });
          }
          break;
        }
        // In a single-session week the same session comes back after a day.
        if (n === 1 && HOURS_PER_SESSION_GAP < need) fail('S2', `${m}: one session a week repeated daily`, { week: w, muscle: m });
      }
    }
  }

  // S3: pulling at least matches pressing.
  const push = Object.entries(direct).filter(([m]) => PUSH_MUSCLES.has(m)).reduce((t, [, v]) => t + v, 0);
  const pull = Object.entries(direct).filter(([m]) => PULL_MUSCLES.has(m)).reduce((t, [, v]) => t + v, 0);
  if (pull < push) fail('S3', `${pull} pulling sets against ${push} pressing sets`);

  // S4: hamstrings at least half of quads when both are trained.
  const q = direct.quads || 0;
  const h = direct.hamstrings || 0;
  if (q > 0 && !untrainable.has('hamstrings') && h * 2 < q) fail('S4', `${h} hamstring sets against ${q} quad sets`);

  // S5 to S7: each session.
  const template = (TEMPLATES[plan.category] || {})[plan.days] || [];
  const overflow = plan.overflow || [];
  const minSets = plan.experience === 'beginner' ? 6 : 8;
  for (const s of plan.sessions) {
    const live = s.exercises.filter((ex) => setsIn(ex, week) > 0);
    const sets = live.reduce((t, ex) => t + setsIn(ex, week), 0);
    if (live.length < 3 || sets < minSets) fail('S5', `${s.key}: ${live.length} exercises, ${sets} sets`, { session: s.key });
    const t = template.find((x) => x.key === s.key);
    const allowed = new Set([...(t ? t.muscles : []), ...overflow.filter((o) => o.session === s.key).map((o) => o.muscle)]);
    for (const ex of live) {
      const p = patternOf(ex);
      if (p && !allowed.has(p.muscle)) fail('S6', `${ex.name} (${p.muscle}) in ${s.key}, which is not named for it`, { session: s.key, muscle: p.muscle });
    }
    if (t) {
      const own = {};
      for (const ex of live) { const p = patternOf(ex); if (p) own[p.muscle] = (own[p.muscle] || 0) + setsIn(ex, week); }
      for (const group of t.core || []) {
        const trainable = group.filter((m) => tierOf(plan.category, m) !== 'I' && !untrainable.has(m) && t.muscles.includes(m));
        if (!trainable.length) continue;
        if (!trainable.some((m) => (own[m] || 0) >= 2)) {
          fail('S7', `${s.name || s.key} has no ${trainable.join(' or ')} exercise`, { session: s.key, muscle: trainable[0] });
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}
