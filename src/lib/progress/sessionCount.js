/**
 * sessionCount.js - the ONE definition of "a logged session" for every count
 * the Progress surfaces print (register D214 addendum 9, census 6.11).
 *
 * A session counts when its workout is COMPLETED and it carries at least one
 * set: either a cached set count above zero on the workout row, or set rows
 * that name it. That is the Consistency milestone's own rule ("53 sessions
 * logged since 26 June"), moved here from ReadinessCards.js so the three
 * places that count sessions can no longer disagree:
 *
 *   - the Progress root's Recaps door and recap banner ("7 sessions to go");
 *   - the Consistency milestone line;
 *   - the Training row's gate ("No sessions logged yet").
 *
 * Before this module they read three different things (distinct workout ids
 * among set rows; completed workouts with a cached count or set rows; every
 * completed workout with a start time, sets or not), so on one journey a
 * person could be told two different totals, or read "No strength training
 * logged" on the Training row while the Recaps door counted ten sessions.
 *
 * Pure. No I/O, no store, no clock: the caller passes the workouts and the set
 * rows it has already loaded. Rows may arrive camelCased (`isCompleted`,
 * `setCount`, `workoutId`) or snake_cased (`is_completed`, `set_count`,
 * `workout_id`); both are read.
 */

function isCompleted(workout) {
  return !!(workout?.isCompleted ?? workout?.is_completed);
}

/**
 * The completed workouts that count as a logged session, in the order given.
 * ReadinessCards also reads the workouts themselves (the ratings gauges, the
 * first session's date), so the list is exported beside the count.
 *
 * @param {Array<object>} workouts - workout rows (any state)
 * @param {Array<object>} sets - set rows of completed workouts
 * @returns {Array<object>}
 */
export function loggedSessionWorkouts(workouts, sets) {
  const setsPerWorkout = new Map();
  for (const s of Array.isArray(sets) ? sets : []) {
    const workoutId = s?.workoutId ?? s?.workout_id;
    if (!workoutId) continue;
    setsPerWorkout.set(workoutId, (setsPerWorkout.get(workoutId) ?? 0) + 1);
  }
  return (Array.isArray(workouts) ? workouts : []).filter((w) => {
    if (!isCompleted(w)) return false;
    const cachedCount = w.setCount ?? w.set_count;
    const liveCount = setsPerWorkout.get(w.id) ?? 0;
    return (cachedCount != null && cachedCount > 0) || liveCount > 0;
  });
}

/**
 * How many sessions are logged: the number every Progress count prints.
 *
 * @param {Array<object>} workouts
 * @param {Array<object>} sets
 * @returns {number}
 */
export function countLoggedSessions(workouts, sets) {
  return loggedSessionWorkouts(workouts, sets).length;
}
