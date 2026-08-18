/**
 * Movement-pattern avoidance WRITES (D107-2 injury/constraint layer).
 *
 * Deliberately a separate module from intent.js: that module is the pinned
 * READ layer (campaign9.intent.test.js guards that it can never reach a
 * database write - exclusion is about future suggestions, never about
 * history), so the two functions that DO write live here instead. Both are
 * thin duration-mapping wrappers over the exact same setExerciseIntent /
 * clearExerciseIntent upsert every per-exercise intent already goes
 * through, against the family target key intent.js defines - no parallel
 * write path, no new table.
 */
import { setExerciseIntent, clearExerciseIntent, EXERCISE_INTENT } from '../database';
import { familyTargetKey, PATTERN_AVOID_DAYS } from './intent';

/**
 * Set movement-pattern avoidance. `duration` is one of PATTERN_AVOID_DAYS
 * (day-bound, the new PATTERN_AVOID kind), 'this_block' (reuses
 * AVOIDED_BLOCK against the CURRENT mesocycle) or 'indefinite' (reuses
 * EXCLUDED) - both against the SAME family target key, so every reader in
 * intent.js (isFamilyBlocked, listActiveMovementConstraints) needs no
 * branch per duration. Mirrors setExerciseIntent's "upsert on the target"
 * law: setting a new duration over an existing one simply replaces it.
 *
 * @returns {Promise<string|null>} the intent row id, or null if the call was
 *   invalid (no user, no family, or an unrecognised duration).
 */
export async function setMovementPatternAvoid(userId, family, duration, { activeMesocycleId = null, reason = null } = {}) {
  const target = familyTargetKey(family);
  if (!userId || !target) return null;
  if (duration === 'this_block') {
    return setExerciseIntent(userId, target, EXERCISE_INTENT.AVOIDED_BLOCK, {
      scopeMesocycleId: activeMesocycleId, reason,
    });
  }
  if (duration === 'indefinite') {
    return setExerciseIntent(userId, target, EXERCISE_INTENT.EXCLUDED, { reason });
  }
  const days = Number(duration);
  if (!PATTERN_AVOID_DAYS.includes(days)) return null;
  return setExerciseIntent(userId, target, EXERCISE_INTENT.PATTERN_AVOID, {
    expiresAtMs: Date.now() + days * 24 * 60 * 60 * 1000,
    reason,
  });
}

/** "Allow this movement pattern again" - the family-scoped mirror of clearExerciseIntent. */
export async function clearMovementPatternAvoid(userId, family) {
  const target = familyTargetKey(family);
  if (!userId || !target) return;
  return clearExerciseIntent(userId, target);
}
