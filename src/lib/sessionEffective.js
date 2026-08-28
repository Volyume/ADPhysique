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
  updateRoutineExerciseExercise, recordExerciseSwap,
} from './database';
import { loadCapabilityResolveState, blockingConflicts } from './capability/resolve';
import { computeEffectiveSession, EFFECTIVE_EFFECT, bestEligibleSubstitute } from './capability/effective';
import { loadExerciseIntentState, isEligibleExercise } from './exercise/intent';
import { SWAP_SCOPE } from './exercise/swapScope';

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
      // D112 R4 (CAP-2, closes audit T2-04): a row the user added to this
      // session themselves is served exactly as they added it - their
      // explicit choice outranks the effective view, whatever it resolves.
      if (rows[i]?._userAdded) {
        served.push(rows[i]);
        return;
      }
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

/**
 * D112 R1a/b (closes audit T1-03 and T2-01's rebuild half): the per-line
 * PLAN REWRITE proposal for capability rules against the ACTIVE plan.
 *
 * Permanent shapes the document. The episode overlay above is serve-time
 * and reversible ("everything returns when you end it"); a BASELINE rule
 * has no end to return from, so its conflicts are resolved by changing
 * the plan itself - through the user's explicit choice, never silently.
 * The same computation serves promotion: promoteEpisode returns the
 * minted baseline row ids, and those ids are this function's ruleIds.
 *
 * Exercises are resolved from the LIBRARY by id (the routine rows carry
 * partial exercise objects without demand columns, which would read as
 * unknown-conflicts). Substitutes come from bestEligibleSubstitute under
 * the injected senior question, exactly as serve-time substitution
 * chooses them - so the plan the user accepts is the plan they were
 * already being served. A line with no eligible substitute keeps its
 * exercise (never silently emptied) and reports itself unsolvable.
 *
 * @param {string} userId
 * @param {{ruleIds?: string[]|null}} opts limit to conflicts driven by
 *   these constraint ids (a just-created or just-promoted group); null
 *   judges every active BASELINE rule.
 * @returns {Promise<{lines: Array<{routineId: string, routineName: string|null,
 *   routineExerciseId: string, from: object, to: object|null,
 *   constraintIds: string[]}>, substitutable: number, unsolvable: number}>}
 */
export async function computeCapabilityPlanRewrite(userId, { ruleIds = null } = {}) {
  const out = { lines: [], substitutable: 0, unsolvable: 0 };
  try {
    if (!userId) return out;
    const plan = await getActivePlan(userId);
    if (!plan?.id) return out;
    const [capState, intentState, library, routines] = await Promise.all([
      loadCapabilityResolveState(userId, {}),
      loadExerciseIntentState(userId, {}),
      getAllExercises(),
      getRoutinesForPlan(plan.id),
    ]);
    if (capState.empty || capState.unavailable) return out;
    const byId = new Map((library ?? []).map((e) => [e.id, e]));
    const roleById = new Map((capState.restrictions ?? []).map((r) => [r.id, r.role]));
    const wanted = Array.isArray(ruleIds) && ruleIds.length ? new Set(ruleIds) : null;
    for (const routine of routines ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await getRoutineExercisesWithDetails(routine.id).catch(() => []);
      for (const row of rows ?? []) {
        const exercise = byId.get(row?.exercise?.id ?? row?.exerciseId) ?? null;
        if (!exercise) continue;
        let conflicts = blockingConflicts(capState, exercise);
        conflicts = wanted
          ? conflicts.filter((c) => wanted.has(c.constraintId))
          // No ids means the standing audit: BASELINE rules only - an
          // episode conflict is the overlay's business, not the document's.
          : conflicts.filter((c) => roleById.get(c.constraintId) === 'baseline');
        if (!conflicts.length) continue;
        const substitute = bestEligibleSubstitute(
          exercise, library, (ex) => isEligibleExercise(intentState, ex),
        );
        out.lines.push({
          routineId: routine.id,
          routineName: routine.name ?? null,
          routineExerciseId: row.id,
          from: exercise,
          to: substitute,
          constraintIds: conflicts.map((c) => c.constraintId),
        });
        if (substitute) out.substitutable += 1; else out.unsolvable += 1;
      }
    }
  } catch (_e) { /* read-only proposal; empty means nothing to offer */ }
  return out;
}

/**
 * Apply the accepted rewrite lines: each substitutable line's routine row
 * moves to its substitute through updateRoutineExerciseExercise (which
 * rebuilds the prescription for the new movement), and the swap is
 * recorded with PROGRAMME scope - cause derives centrally at write time,
 * so a capability-driven rewrite carries cause='constraint' and never
 * teaches the preference lane (CAP-13). Unsolvable lines are left
 * exactly as they are: the quiet baseline-conflict notice marks them.
 *
 * Best-effort per line; one failed write never abandons the rest.
 *
 * @returns {Promise<{applied: number, failed: number}>}
 */
export async function applyCapabilityPlanRewrite(userId, lines = []) {
  const out = { applied: 0, failed: 0 };
  for (const line of Array.isArray(lines) ? lines : []) {
    if (!line?.to?.id || !line?.routineExerciseId) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await updateRoutineExerciseExercise(line.routineExerciseId, line.to.id);
      // eslint-disable-next-line no-await-in-loop
      await recordExerciseSwap(userId, line.from?.id, line.to.id, {
        routineId: line.routineId ?? null,
        explicit: true,
        scope: SWAP_SCOPE.PROGRAMME,
      }).catch(() => { /* provenance is additive */ });
      out.applied += 1;
    } catch (_e) {
      out.failed += 1;
    }
  }
  return out;
}
