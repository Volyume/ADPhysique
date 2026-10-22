/**
 * repeatSession.js - what "Repeat" on a finished session starts again.
 *
 * Moved out of HomeScreen.js (handleRepeatLastSession) under D231 (app layout
 * rework, batch 2): the Repeat button left the Today last-session row for the
 * newest card in Train's Recent sessions, so the assembly it does lives here
 * once. The behaviour is the handler's, unchanged:
 *
 *  - a session with a routine repeats the FULL routine (not just what was done
 *    last time);
 *  - a session with no routine falls back to the exercises of its own sets, in
 *    the order they were first logged, each carrying the previous session's
 *    working-set count (3 when that session had only warm-ups), with a minted
 *    slot id so the per-slot machinery never degrades (R13-1);
 *  - D218 (founder order 2026-10-03, audit F-2, P7): an exercise whose id
 *    getExerciseById cannot find (an id never seeded here, another device's
 *    custom exercise before its pull) is no longer dropped in silence. It is
 *    tried against the shared lookup by its own logged name snapshot first, and
 *    when one is still left out the person is told, calmly, how many. The repeat
 *    proceeds either way. Review of D218 (NIT 11): "not on this device" is said
 *    only when both reads worked and neither found it; when a read failed, the
 *    exercise "could not be loaded", which is what happened.
 *
 * The caller owns what comes next (the readiness ask, createWorkout, the
 * navigation); this only builds the rows and the note to tell the person.
 */
import {
  getRoutineExercisesWithDetails, getWorkoutSetsForWorkout, getExerciseById,
  getExerciseLookup, uid,
} from './database';

/**
 * @param {{ id: string, routineId?: string|null, routine_id?: string|null }} session
 *   a finished workout row (getAllWorkouts' shape)
 * @returns {Promise<{ routineId: string|null, initialExercises: Array<object>, leftOutNote: string|null }>}
 *   `leftOutNote` is the one calm sentence for the exercises that could not be
 *   repeated, or null when nothing was left out. Throws when a read the repeat
 *   cannot do without fails (the caller shows its own calm error).
 */
export async function prepareRepeatSession(session) {
  const routineId = session.routineId || session.routine_id || null;
  let initialExercises;
  let leftOutNote = null;

  if (routineId) {
    // Load the FULL routine, not just what was done last time
    const withExercises = await getRoutineExercisesWithDetails(routineId);
    initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise, routineExercise, sets: [],
      supersetGroupId: routineExercise?.supersetGroupId ?? null,
      // EL-9 (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md):
      // hydrate the circuit stamp + round rest alongside the superset id.
      groupKind: routineExercise?.groupKind ?? null,
      roundRestSeconds: routineExercise?.roundRestSeconds ?? null,
    }));
  } else {
    // No routine linked, fall back to exercises from the session's sets
    const prevSets = await getWorkoutSetsForWorkout(session.id);
    const seenIds = [];
    const orderedExerciseIds = [];
    const setCounts = {};
    for (const s of prevSets) {
      if (!s.exerciseId) continue;
      if (!seenIds.includes(s.exerciseId)) {
        seenIds.push(s.exerciseId);
        orderedExerciseIds.push(s.exerciseId);
      }
      if ((s.setType ?? s.set_type ?? 'straight') !== 'warmup') {
        setCounts[s.exerciseId] = (setCounts[s.exerciseId] || 0) + 1;
      }
    }
    // Round 13 (R13-1): this was the FOURTH keyless slot construction - the
    // session effects record keys per slot (rowId = routineExercise.id), and
    // rounds 11-12 minted ids at the other three ad-hoc entry points while the
    // repeat built routineExercise: null, so the whole per-slot machinery
    // (conversion on removal included) silently degraded on exactly these
    // sessions. Adapted from WorkoutHistoryScreen's repeat-as-is shape (minted
    // id + the previous session's working-set count, so the target line stays
    // honest) - the one deliberate difference: an all-warm-up previous session
    // falls to 3 here rather than the warm-up count.
    const READ_FAILED = Symbol('readFailed');
    const foundById = await Promise.all(
      orderedExerciseIds.map(id => getExerciseById(id).catch(() => READ_FAILED)),
    );
    let lookup;
    const repeatable = [];
    const repeatedIds = new Set();
    let leftOut = 0;
    let leftOutUnread = 0;
    for (let i = 0; i < orderedExerciseIds.length; i += 1) {
      const loggedId = orderedExerciseIds[i];
      const byIdFailed = foundById[i] === READ_FAILED;
      let exercise = byIdFailed ? null : foundById[i];
      if (!exercise) {
        if (lookup === undefined) lookup = await getExerciseLookup().catch(() => null);
        exercise = lookup?.resolve(prevSets.find(s => s.exerciseId === loggedId)) ?? null;
        if (!exercise && (byIdFailed || lookup == null)) leftOutUnread += 1;
      }
      // Two logged ids that are one exercise (a retired id and the exercise it
      // became) are repeated once.
      if (exercise && repeatedIds.has(exercise.id)) continue;
      if (exercise) {
        repeatedIds.add(exercise.id);
        // The target count follows the exercise: one found under another id (a
        // name match, a survivor) carries the working-set count of the id its
        // sets were logged under.
        if (setCounts[exercise.id] === undefined && setCounts[loggedId] !== undefined) {
          setCounts[exercise.id] = setCounts[loggedId];
        }
        repeatable.push(exercise);
      } else {
        leftOut += 1;
      }
    }
    initialExercises = repeatable.map(exercise => ({
      exercise,
      routineExercise: { id: uid(), recommendedSets: setCounts[exercise.id] || 3 },
      sets: [],
    }));
    const leftOutMissing = leftOut - leftOutUnread;
    const leftOutLines = [];
    if (leftOutMissing > 0) {
      leftOutLines.push(leftOutMissing === 1
        ? 'One exercise from that session is not on this device, so it was left out.'
        : `${leftOutMissing} exercises from that session are not on this device, so they were left out.`);
    }
    if (leftOutUnread > 0) {
      leftOutLines.push(leftOutUnread === 1
        ? 'One exercise from that session could not be loaded, so it was left out.'
        : `${leftOutUnread} exercises from that session could not be loaded, so they were left out.`);
    }
    if (leftOutLines.length > 0) leftOutNote = leftOutLines.join(' ');
  }

  return { routineId, initialExercises, leftOutNote };
}
