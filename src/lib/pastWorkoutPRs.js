/**
 * pastWorkoutPRs.js: the personal records a finished workout set, worked out
 * again when the workout is opened from history.
 *
 * Founder, 2026-09-27, of a workout shared from history: "add back in PRs".
 * The finish flow hands the workout summary its list of records, but only on
 * the live path, so a workout opened from history had none: its share image
 * showed no records and offered no record card. This works them out with the
 * rules the logger applies as each set is logged (ActiveWorkoutScreen,
 * handleCompleteSet):
 *  - the canonical detector, detectPR, unchanged;
 *  - weight-and-reps exercises only (duration and distance reuse the weight
 *    field, so the detector would report nonsense);
 *  - a warm-up is never a record, nor part of the bar;
 *  - the bar is every working set on record before it: the exercise's sets
 *    from earlier workouts plus this workout's own earlier sets (founder
 *    ruling 2026-08-23);
 *  - the first set ever logged for an exercise beats nothing, so it is never
 *    a record;
 *  - one record per exercise, the most significant (bestPRPerExercise).
 * Pure, no I/O: the caller reads the sets.
 */
import { detectPR, bestPRPerExercise } from './algorithms';

const isWorkingSetRow = (s) => (s?.setType ?? s?.set_type ?? 'straight') !== 'warmup';
const idOf = (s) => s?.exerciseId ?? s?.exercise_id ?? null;
const timeOf = (s) => Number(s?.createdAt ?? s?.created_at) || 0;
const orderOf = (s) => Number(s?.setNumber ?? s?.set_number) || 0;

/**
 * @param {object} args
 * @param {Array<object>} args.sets  the workout's logged sets
 * @param {Object<string, Array<object>>} [args.priorSetsByExercise]  each
 *   exercise's sets from workouts before this one
 * @param {Object<string, object>} [args.exerciseById]  the exercise library
 * @param {'kg'|'lbs'} [args.units]
 * @param {number|null} [args.date]  when the workout happened, carried on
 *   each record so a record image shows that day rather than today
 * @returns {Array<object>} one record per exercise, shaped as the finish
 *   flow's list (detectPR's record plus exerciseId, exerciseName, units, setId)
 */
export function pastWorkoutPRs({
  sets, priorSetsByExercise = {}, exerciseById = {}, units = 'kg', date = null,
}) {
  // The order the sets were logged in, which is the order the logger judged
  // them in.
  const ordered = (Array.isArray(sets) ? sets : [])
    .filter(Boolean)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (timeOf(a.s) - timeOf(b.s)) || (orderOf(a.s) - orderOf(b.s)) || (a.i - b.i))
    .map(({ s }) => s);
  const earlier = new Map();
  const found = [];
  for (const set of ordered) {
    const id = idOf(set);
    if (!id) continue;
    const exercise = exerciseById[id] || null;
    const type = exercise?.exerciseType || exercise?.exercise_type || 'weight_reps';
    const isWeightReps = type === 'weight_reps' || type === 'weighted_bodyweight';
    const today = earlier.get(id) || [];
    if (isWeightReps && isWorkingSetRow(set)) {
      const bar = [...(priorSetsByExercise[id] || []), ...today].filter(isWorkingSetRow);
      if (bar.length > 0) {
        for (const pr of detectPR(set, bar, exercise, units)) {
          found.push({
            ...pr,
            exerciseId: id,
            exerciseName: exercise?.name ?? null,
            units,
            setId: set.id ?? null,
            ...(date ? { date } : {}),
          });
        }
      }
    }
    earlier.set(id, [...today, set]);
  }
  return bestPRPerExercise(found);
}
