/**
 * sessionReport.js: what the app reports about one finished workout, built
 * from its logged set rows (register D218; founder order 2026-10-03: "I need
 * you to check across the board and ensure all exercises are logged and
 * reported correct after the workout ends").
 *
 * One builder for every surface that describes a session after it ends: the
 * live summary at the finish, the same summary reopened from History, the
 * History card, the Progress "Recent sessions" entries and "Rate your last
 * session". Before it there were four hand-copied derivations: the live
 * summary listed the in-memory logger list (an exercise swapped out after its
 * sets were logged vanished from the list while its sets still counted), the
 * history view skipped any exercise the filtered library could not resolve,
 * and the cards printed "Unknown" or nothing (audit
 * docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md,
 * F-1, F-2, F-7).
 *
 * The rules:
 *  - every exercise with at least one logged set is listed, in the order it
 *    was first logged, named through the shared lookup (never skipped, never
 *    blank); sets on a retired id and on its survivor are one exercise;
 *  - Working sets are every set that is not a warm-up (an untyped set is a
 *    working set), the definition the summary tile states;
 *  - Total lifted is calculateTonnage with each set's own exercise type and
 *    load semantics (per hand x2, assistance excluded, distance and duration
 *    excluded), so the stored total, the summary, History and the 4-week
 *    comparison read one basis.
 *
 * Pure: no I/O. `lookup` is the shared exercise lookup
 * (database.getExerciseLookup, src/lib/exercise/lookup.js) or, for a caller
 * that has only one, a plain `{ [exerciseId]: row }` map.
 */
import { summariseWorkoutSets, allocateExerciseVolume } from './algorithms';
import {
  exerciseNameFor, resolveExerciseFor, exerciseTypeOf, loadSemanticsOf,
} from './exercise/lookup';

/** How many names a History card or a route param carries. */
export const SESSION_CARD_NAME_COUNT = 4;

function setExerciseId(s) {
  return s?.exerciseId ?? s?.exercise_id ?? null;
}

function setTime(s) {
  const n = Number(s?.createdAt ?? s?.created_at);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function setNumber(s) {
  const n = Number(s?.setNumber ?? s?.set_number);
  return Number.isFinite(n) ? n : 0;
}

function setTypeOf(s) {
  return s?.setType ?? s?.set_type ?? 'straight';
}

function primaryMuscleOf(row) {
  if (!row) return null;
  const primary = allocateExerciseVolume(row).find((a) => a.role === 'primary');
  return primary?.muscle || null;
}

/**
 * Each set's own exercise type and load semantics, keyed by the id the set
 * carries, so calculateTonnage reads the lookup's answer (a retired id's
 * survivor and an unknown id's snapshot match included).
 *
 * @param {Array<object>} sets
 * @param {object|null} lookup
 * @returns {{ exerciseTypeById: Object<string,string>, loadSemanticsById: Object<string,string> }}
 */
export function setMapsFor(sets, lookup) {
  const exerciseTypeById = {};
  const loadSemanticsById = {};
  for (const s of Array.isArray(sets) ? sets : []) {
    const id = setExerciseId(s);
    if (id == null || Object.prototype.hasOwnProperty.call(exerciseTypeById, id)) continue;
    const row = resolveExerciseFor(lookup, s);
    exerciseTypeById[id] = exerciseTypeOf(row);
    loadSemanticsById[id] = loadSemanticsOf(row);
  }
  return { exerciseTypeById, loadSemanticsById };
}

/**
 * The session's exercises in the order they were first logged, each with its
 * sets in logged order (time, then set number; rows with no time keep the
 * order they arrived in, which is the logger's own order).
 *
 * @param {Array<object>} sets - workout_sets rows or in-memory logged sets
 * @param {object|null} lookup
 * @returns {Array<{ exerciseId: string, name: string, exerciseType: string,
 *   loadSemantics: string, primaryMuscle: string|null, workingSetCount: number,
 *   loggedSets: Array<{ id: string|null, weight: number, reps: number,
 *   setType: string, evidenceClass: string|null, exerciseType: string }>,
 *   rows: Array<object> }>} `rows` are the input rows themselves, in the
 *   same order, for a caller that formats raw set rows.
 */
export function groupSessionExercises(sets, lookup) {
  const indexed = (Array.isArray(sets) ? sets : [])
    .filter((s) => s && setExerciseId(s) != null)
    .map((s, i) => ({ s, i, t: setTime(s) }));
  indexed.sort((a, b) => {
    if (a.t != null && b.t != null) {
      if (a.t !== b.t) return a.t - b.t;
      const byNumber = setNumber(a.s) - setNumber(b.s);
      if (byNumber) return byNumber;
    }
    return a.i - b.i;
  });

  const groups = new Map();
  for (const { s } of indexed) {
    const row = resolveExerciseFor(lookup, s);
    const key = row?.id != null ? `row:${row.id}` : `raw:${setExerciseId(s)}`;
    let group = groups.get(key);
    if (!group) {
      const exerciseType = exerciseTypeOf(row);
      group = {
        exerciseId: row?.id ?? setExerciseId(s),
        name: exerciseNameFor(lookup, s),
        exerciseType,
        loadSemantics: loadSemanticsOf(row),
        primaryMuscle: primaryMuscleOf(row),
        workingSetCount: 0,
        loggedSets: [],
        rows: [],
      };
      groups.set(key, group);
    }
    const setType = setTypeOf(s);
    group.loggedSets.push({
      id: s.id ?? null,
      weight: s.weight,
      reps: s.actualReps ?? s.actual_reps ?? s.reps,
      setType,
      evidenceClass: s.evidenceClass ?? s.evidence_class ?? null,
      exerciseType: group.exerciseType,
    });
    group.rows.push(s);
    if (setType !== 'warmup') group.workingSetCount += 1;
  }
  return [...groups.values()];
}

/**
 * Everything a surface reports about one session, from its set rows.
 *
 * @param {Array<object>} sets
 * @param {object|null} lookup
 * @returns {{ exercises: Array<object>, exerciseCount: number, setCount: number,
 *   workingSetCount: number, tonnage: number, allExerciseNames: string[],
 *   exerciseNames: string[], primaryMuscles: string[] }}
 */
export function buildSessionReport(sets, lookup) {
  const list = Array.isArray(sets) ? sets.filter(Boolean) : [];
  const exercises = groupSessionExercises(list, lookup);
  const { totalSets, workingSetCount, tonnage } = summariseWorkoutSets(list, setMapsFor(list, lookup));
  const allExerciseNames = exercises.map((e) => e.name);
  return {
    exercises,
    exerciseCount: exercises.length,
    setCount: totalSets,
    workingSetCount,
    tonnage,
    allExerciseNames,
    exerciseNames: allExerciseNames.slice(0, SESSION_CARD_NAME_COUNT),
    primaryMuscles: [...new Set(exercises.map((e) => e.primaryMuscle).filter(Boolean))],
  };
}

/**
 * The WorkoutSummary route params for a finished workout opened after the
 * fact (History, the Progress "Recent sessions" entries, "Rate your last
 * session"), so all three open the same summary for the same workout.
 *
 * @param {object} workout - a workouts row (camelCase)
 * @param {Array<object>} sets - that workout's set rows
 * @param {object|null} lookup
 * @returns {object}
 */
export function sessionSummaryParams(workout, sets, lookup) {
  const report = buildSessionReport(sets, lookup);
  return {
    workoutId: workout?.id,
    durationMinutes: workout?.durationMinutes,
    exerciseCount: report.exerciseCount,
    setCount: report.setCount,
    workingSetCount: report.workingSetCount,
    tonnage: report.tonnage,
    exerciseNames: report.exerciseNames,
    startedAt: workout?.startedAt,
    endedAt: workout?.endedAt,
    routineId: workout?.routineId ?? null,
    routineName: workout?.routineName ?? null,
    readOnly: true,
  };
}
