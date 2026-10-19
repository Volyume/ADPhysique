/**
 * The entrant's weekly training target for a challenge (SPEC 3): the active
 * plan's sessions per week (its routine count, the same read
 * `community/trainingConsistency.loadConsistency` makes), clamped to 2..6.
 * With no plan yet (the join screen can open before setup) it is 3.
 */
import { getActivePlan, getRoutinesForPlan } from '../database';
import { logError } from '../errorLog';

export const DEFAULT_PLANNED_PER_WEEK = 3;

export function clampPlannedPerWeek(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_PLANNED_PER_WEEK;
  return Math.min(6, Math.max(2, v));
}

export async function readPlannedPerWeek(userId) {
  try {
    const plan = userId ? await getActivePlan(userId) : null;
    if (!plan?.id) return DEFAULT_PLANNED_PER_WEEK;
    const routines = await getRoutinesForPlan(plan.id);
    const count = Array.isArray(routines) ? routines.length : 0;
    return count > 0 ? clampPlannedPerWeek(count) : DEFAULT_PLANNED_PER_WEEK;
  } catch (e) {
    logError('Challenges.readPlannedPerWeek', e);
    return DEFAULT_PLANNED_PER_WEEK;
  }
}
