/**
 * How many movements the person has set aside (the count the Plans tab shows
 * on its "Avoided movements" row). Best effort: a read failure is 0, which
 * only hides the "Review avoided movements" step (D109-2, fail open).
 */
import { getActiveBlock } from './database';
import { loadExerciseIntentState, listActiveMovementConstraints } from './exercise/intent';

export async function loadAvoidedMovementsCount(userId) {
  if (!userId) return 0;
  try {
    const block = await getActiveBlock(userId).catch(() => null);
    const state = await loadExerciseIntentState(userId, { activeMesocycleId: block?.id ?? null });
    return listActiveMovementConstraints(state).length;
  } catch (_) {
    return 0;
  }
}
