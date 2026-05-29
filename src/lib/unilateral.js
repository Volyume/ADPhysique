/**
 * unilateral.js
 *
 * Per-side (unilateral) logging for movements trained one side at a time
 * (single-leg press, one-arm row, split squat). A per-side exercise logs
 * ONE weight and ONE reps value, understood as per side and done on both
 * sides at the same weight: that is how lifters and every major logger
 * (Hevy, Strong, Fitbod) handle it. We do not ask for separate left and
 * right weights or reps; the muscle still gets one working set per logged
 * set, so volume, PR detection and progression read actual_reps unchanged.
 *
 * Whether an exercise is per-side is a per-exercise preference remembered
 * on the device (not core data), so it sticks across sessions without a
 * schema change on the exercise library.
 *
 * `lowerSideReps` and `formatPerSide` are legacy: an earlier version
 * stored separate left_reps / right_reps. They remain only to read and
 * display sets logged under that old model; new sets do not write them.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const UNILATERAL_KEY = '@volyume_unilateral_exercises';

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
 * is no per-side data (a normal bilateral set).
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
