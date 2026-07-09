/**
 * unilateral.js
 *
 * D9 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, plus its
 * two amendments): per-side (unilateral) logging is a real two-phase flow -
 * side one, a rest-class-governed pause, side two - not the single-tap
 * "log it once, understood as done on both sides" shortcut this module
 * originally implemented (that shortcut was dead: `setUnilateralExercise`
 * was never called from any screen, see docs/exercise-planning-2026-07-09/
 * plan-C-unilateral-logging.md). The pair still commits as ONE
 * `workout_sets` row: `actual_reps` is the LOWER of the two sides
 * (conservative - the engine sees the honest stimulus, never inflated by
 * the stronger side), mirroring the clusterSet.js pattern (one working set,
 * breakdown rides in `notes`) rather than reviving the legacy
 * `left_reps`/`right_reps` columns (migration 054, superseded).
 *
 * Which exercises log per side is a per-exercise preference the user
 * confirms once and which sticks on the device (not core data, no schema
 * change):
 *   - `loadUnilateralExercises` / `setUnilateralExercise` - whether per-side
 *     mode is ON for an exercise.
 *   - `loadUnilateralAsked` / `markUnilateralAsked` - whether the user has
 *     already been asked about that exercise (whatever they answered), so
 *     D9's "suggest, user confirms" prompt never repeats for it.
 *
 * `lowerSideReps` is the storage-invariant maths: whatever the two side rep
 * counts are, the engine (volume, PR, progression) only ever sees the lower
 * one, so a per-side set still counts as exactly one working set.
 *
 * `formatPerSide` remains the read path for the legacy `left_reps`/
 * `right_reps` columns: older sets logged under the original design still
 * display correctly. New sets never write those columns; the per-side
 * breakdown for a newly logged set rides in `notes` instead, reusing this
 * exact same "L 10 / R 9" string (ActiveWorkoutScreen's `finishPerSide`),
 * exactly as the myo-rep/rest-pause cluster's breakdown rides in `notes`
 * (see clusterSet.js).
 *
 * `perSideRestPlan` / `halfRestSeconds` are D9 amendment 2's rest-class
 * rule: rest between (and, for a compound, after) the two sides is derived
 * from the exercise's existing `compound_isolation` field and its normal
 * configured rest, never a separate user setting.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const UNILATERAL_KEY = '@volyume_unilateral_exercises';
export const UNILATERAL_ASKED_KEY = '@volyume_unilateral_asked_exercises';

/**
 * The rep count the engine sees for a per-side set: the lower of the two
 * sides. Falls back to whichever side is present, or 0 if neither is.
 */
export function lowerSideReps(leftReps, rightReps) {
  const l = parseInt(leftReps, 10);
  const r = parseInt(rightReps, 10);
  const lOk = Number.isFinite(l) && l > 0;
  const rOk = Number.isFinite(r) && r > 0;
  if (lOk && rOk) return Math.min(l, r);
  if (lOk) return l;
  if (rOk) return r;
  return 0;
}

/**
 * Display string for a per-side set ("L 10 / R 9"), or null when there
 * is no per-side data (a normal bilateral set). Used both to read the
 * legacy left_reps/right_reps columns on old sets, and to build the
 * `notes` breakdown for a newly logged per-side set (no schema change).
 */
export function formatPerSide(leftReps, rightReps) {
  const has = (v) => v != null && v !== '';
  if (!has(leftReps) && !has(rightReps)) return null;
  return `L ${has(leftReps) ? leftReps : '-'} / R ${has(rightReps) ? rightReps : '-'}`;
}

/**
 * Load the set of exercise IDs the user logs per-side. Never throws.
 */
export async function loadUnilateralExercises() {
  try {
    const raw = await AsyncStorage.getItem(UNILATERAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Turn per-side logging on or off for one exercise and persist it.
 * Returns the updated set. Never throws.
 */
export async function setUnilateralExercise(exerciseId, on) {
  if (!exerciseId) return loadUnilateralExercises();
  try {
    const set = await loadUnilateralExercises();
    if (on) set.add(exerciseId); else set.delete(exerciseId);
    await AsyncStorage.setItem(UNILATERAL_KEY, JSON.stringify([...set]));
    return set;
  } catch {
    return new Set();
  }
}

/**
 * Load the set of exercise IDs the user has already been asked about
 * (accepted OR declined per-side logging), so D9's one-time suggestion
 * never re-fires for that exercise. Never throws.
 */
export async function loadUnilateralAsked() {
  try {
    const raw = await AsyncStorage.getItem(UNILATERAL_ASKED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Record that the user has been asked about one exercise, whatever they
 * answered. Returns the updated set. Never throws.
 */
export async function markUnilateralAsked(exerciseId) {
  if (!exerciseId) return loadUnilateralAsked();
  try {
    const set = await loadUnilateralAsked();
    set.add(exerciseId);
    await AsyncStorage.setItem(UNILATERAL_ASKED_KEY, JSON.stringify([...set]));
    return set;
  } catch {
    return new Set();
  }
}

/**
 * D9 amendment 2: half of a rest duration, rounded UP to a whole second
 * (ceil) so a half rest is never accidentally rounded down to less
 * recovery than intended. 0/invalid input returns 0.
 */
export function halfRestSeconds(restSeconds) {
  const r = Number(restSeconds);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return Math.ceil(r / 2);
}

/**
 * D9 amendment 2 (supersedes amendment 1's uniform "always half" rule):
 * the rest between side one and side two, and the rest once both sides are
 * done, are set BY EXERCISE CLASS via the existing `compound_isolation`
 * field, never a separate user setting:
 *
 *   - COMPOUND (split squats, single-arm rows): HALF the exercise's normal
 *     rest between every pause - between sides AND after the second side
 *     (120s -> side one, 60s, side two, 60s, side one of the next set...).
 *     Each side still gets close to a full normal recovery because it
 *     rests while the other side works.
 *   - ISOLATION (curls, raises, extensions): no forced timer between
 *     sides - a plain "switch sides" prompt, swap when ready - then the
 *     FULL normal rest once both sides are done (systemic fatigue only
 *     matters for compounds; the resting arm recovers regardless).
 *
 * @param {string} compoundIsolation  exercise.compoundIsolation ('compound' | 'isolation')
 * @param {number} restSeconds        the exercise's normal configured rest
 * @returns {{ betweenSeconds: number|null, afterSeconds: number, switchPrompt: boolean }}
 *   betweenSeconds is null when there is no forced timer between sides
 *   (isolation - switchPrompt is true instead). afterSeconds is the rest to
 *   start once both sides have been logged, before the next set.
 */
export function perSideRestPlan(compoundIsolation, restSeconds) {
  const full = Number.isFinite(Number(restSeconds)) ? Number(restSeconds) : 0;
  if (compoundIsolation === 'compound') {
    const half = halfRestSeconds(full);
    return { betweenSeconds: half, afterSeconds: half, switchPrompt: false };
  }
  return { betweenSeconds: null, afterSeconds: full, switchPrompt: true };
}
