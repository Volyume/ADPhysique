/**
 * Workout session counters (growth telemetry, founder brief 2026-10-19).
 *
 * A tiny in-memory tally of what happened inside the workout being logged:
 * set edits, swaps, rest timer starts, warm-up sets added, sets deleted.
 * It exists so `workout_session_summary` can be sent when the workout ends
 * without touching the database or the store. Nothing is stored or sent
 * from here: the screen reads the totals at the finish and emits them as
 * buckets. Counts reset when a different workout id is seen, and on `take`.
 *
 * Pure (no I/O).
 */

export const SESSION_COUNTERS = Object.freeze(['edits', 'swaps', 'rest_timer_uses', 'warmups_added', 'discarded_sets']);

let state = { workoutId: null, counts: {} };

function fresh(workoutId) {
  state = { workoutId: workoutId ?? null, counts: {} };
}

/** Add `by` (default 1) to `name` for `workoutId`. Unknown names are ignored. */
export function bump(name, workoutId = null, by = 1) {
  if (!SESSION_COUNTERS.includes(name)) return;
  if (state.workoutId !== (workoutId ?? null)) fresh(workoutId);
  state.counts[name] = (state.counts[name] || 0) + by;
}

/** The counts so far for `workoutId` (all five names, zero when unseen). */
export function peek(workoutId = null) {
  const counts = state.workoutId === (workoutId ?? null) ? state.counts : {};
  return Object.fromEntries(SESSION_COUNTERS.map((n) => [n, counts[n] || 0]));
}

/** `peek`, then forget: the workout is over. */
export function take(workoutId = null) {
  const out = peek(workoutId);
  fresh(null);
  return out;
}

export const __test = { reset: () => fresh(null) };
