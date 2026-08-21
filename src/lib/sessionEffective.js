/**
 * sessionEffective.js - the CC29 cross-lane composition seam (sections 14,
 * 17). Lives OUTSIDE both lanes on purpose: the capability lane may not
 * import the preference lane (CAP-4 wall) and vice versa, and the
 * effective view needs BOTH answers (capability compatibility AND the
 * senior eligibility question for substitutes). planAutoGen composes the
 * lanes the same way for generation; this module does it for sessions.
 */
import {
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails,
  getAllExercises, setConstraintEffectiveChoice, appendSessionConstraintEffects,
} from './database';
import { loadCapabilityResolveState } from './capability/resolve';
import { computeEffectiveSession, EFFECTIVE_EFFECT } from './capability/effective';
import { loadExerciseIntentState, isEligibleExercise } from './exercise/intent';

export { setConstraintEffectiveChoice };

/**
 * The choice write. Its aggregate counter was RETIRED under the Q4
 * ruling (2026-08-21): no capability-derived event leaves the device,
 * because even a content-free event in a per-user table reveals that
 * the user has capability rules.
 */
export async function recordEffectiveChoice(userId, constraintId, choice) {
  return setConstraintEffectiveChoice(userId, constraintId, choice);
}

/**
 * Section 14 step 1: the proposed diff summary for a NEW episode against
 * the active plan. Counts affected lines whose driving rules include the
 * just-created ones. Read-only.
 *
 * @returns {Promise<{affected: number, substituted: number, omitted: number}>}
 */
export async function computePlanEffectiveSummary(userId, createdIds = []) {
  const out = { affected: 0, substituted: 0, omitted: 0 };
  try {
    const plan = await getActivePlan(userId);
    if (!plan?.id) return out;
    const [capState, intentState, library, routines] = await Promise.all([
      loadCapabilityResolveState(userId, {}),
      loadExerciseIntentState(userId, {}),
      getAllExercises(),
      getRoutinesForPlan(plan.id),
    ]);
    if (capState.empty || capState.unavailable) return out;
    for (const routine of routines ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(routine.id).catch(() => []);
      const baseRows = (rows ?? []).map((r) => ({ exercise: r.exercise })).filter((r) => r.exercise);
      const view = computeEffectiveSession(
        baseRows, library, capState, (ex) => isEligibleExercise(intentState, ex),
      );
      for (const line of view.lines) {
        if (line.effect === EFFECTIVE_EFFECT.UNCHANGED) continue;
        if (!line.constraintIds.some((id) => createdIds.includes(id))) continue;
        out.affected += 1;
        if (line.effect === EFFECTIVE_EFFECT.OMITTED) out.omitted += 1;
        else out.substituted += 1; // substituted or conflicted-pending
      }
    }
  } catch (_e) { /* read-only summary; zero means no proposal */ }
  return out;
}

/**
 * Section 14 step 3 (serve time): the effective view of a session's rows
 * under APPLIED episode rules. Substituted rows carry a quiet temporary
 * marker (_capabilityTemp) naming the original; omitted rows are dropped
 * AND written to the session's effects record so adherence and history
 * stay honest. Rows return UNTOUCHED (same array) when nothing applies -
 * declined/undecided rules leave their rows in place (the section 17
 * conflicted notice handles those), and baseline rules never appear here
 * at all (RT2-1).
 *
 * @param {string} userId
 * @param {string|null} workoutId for the omission effects record
 * @param {Array} rows the session's exercise rows (full library rows)
 * @returns {Promise<Array>} the rows to serve
 */
export async function applyEffectiveViewToSession(userId, workoutId, rows) {
  try {
    if (!userId || !Array.isArray(rows) || !rows.length) return rows;
    const capState = await loadCapabilityResolveState(userId, {});
    const hasApplied = !capState.empty && !capState.unavailable
      && (capState.restrictions ?? []).some((r) => r.role === 'episode' && r.effectiveChoice === 'applied');
    if (!hasApplied) return rows;
    const [intentState, library] = await Promise.all([
      loadExerciseIntentState(userId, {}),
      getAllExercises(),
    ]);
    const view = computeEffectiveSession(
      rows.map((e) => ({ exercise: e })), library, capState,
      (ex) => isEligibleExercise(intentState, ex),
    );
    if (!view.anyEffect) return rows;
    const served = [];
    const omissions = [];
    view.lines.forEach((line, i) => {
      if (line.effect === EFFECTIVE_EFFECT.SUBSTITUTED && line.exerciseTo) {
        served.push({
          ...line.exerciseTo,
          // The quiet temporary marker (section 17): the substitute is
          // ordinary loggable content; only the marker line frames it.
          _capabilityTemp: { fromId: line.exerciseFrom.id, fromName: line.exerciseFrom.name, constraintIds: line.constraintIds },
          sets: rows[i]?.sets ?? [],
        });
      } else if (line.effect === EFFECTIVE_EFFECT.OMITTED) {
        omissions.push({
          slot: i, exerciseFrom: line.exerciseFrom.id, effect: 'omitted', constraintIds: line.constraintIds,
        });
      } else {
        served.push(rows[i]);
      }
    });
    if (omissions.length && workoutId) {
      await appendSessionConstraintEffects(userId, workoutId, omissions).catch(() => {});
    }
    return served.length ? served : rows;
  } catch (_e) {
    return rows; // the base session always stands
  }
}
