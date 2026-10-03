/**
 * sessionReport (register D218): the one builder for what the app reports
 * about a finished workout. These tests are the contract that failed before
 * it existed (audit docs/audit/exercise-logging-reporting-audit-2026-10-03,
 * F-1, F-2, F-7, F-8):
 *   - an exercise the filtered library cannot see (a soft-deleted custom
 *     exercise, an unknown id with a name snapshot, a retired id) is still
 *     listed, named and counted;
 *   - sets on a retired id and on its survivor are one exercise;
 *   - the exercise order is the order first logged, sets in logged order;
 *   - Working sets exclude only warm-ups (an untyped set counts);
 *   - Total lifted uses each set's type and load semantics (per hand x2,
 *     assistance excluded, distance excluded), for an unknown id too when its
 *     snapshot names a known exercise;
 *   - the counts, the names and the list can never disagree;
 *   - the read-only summary route params are the same from every caller.
 */
import {
  buildSessionReport, groupSessionExercises, sessionSummaryParams, setMapsFor,
} from '../sessionReport';
import { buildExerciseLookup } from '../exercise/lookup';
import { canonicalExerciseId } from '../exercise/canonicalId';

const RETIRED = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR = canonicalExerciseId('Machine Lateral Raise');

const LIBRARY = [
  { id: 'bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], exerciseType: 'weight_reps', loadSemantics: 'total' },
  { id: 'db-press', name: 'Dumbbell Shoulder Press', primaryMuscle: 'front_delts', exerciseType: 'weight_reps', loadSemantics: 'per_hand' },
  { id: 'assist-pull', name: 'Assisted Pull-up Machine', primaryMuscle: 'back', exerciseType: 'weight_reps', loadSemantics: 'assisted' },
  { id: 'heel-walk', name: 'Heel Walk', primaryMuscle: 'tibialis', exerciseType: 'distance' },
  { id: SURVIVOR, name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', exerciseType: 'weight_reps' },
  { id: 'garage', name: 'Garage Press', primaryMuscle: 'chest', isCustom: 1, deletedAt: 1700000000000 },
  { id: 'legacy-shoulders', name: 'Old Shoulder Thing', primaryMuscle: 'shoulders' },
];
const lookup = buildExerciseLookup(LIBRARY);

let t = 1_000_000;
function set(exerciseId, extra = {}) {
  t += 1000;
  return {
    id: `s${t}`, exerciseId, weight: 50, actualReps: 10, setType: 'straight', createdAt: t, setNumber: 1, ...extra,
  };
}

describe('groupSessionExercises', () => {
  test('lists every exercise with a set, in the order first logged, never skipping one', () => {
    const rows = [
      set('bench'),
      set('garage'), // soft-deleted custom exercise
      set('ghost', { exerciseName: 'Cable Thing' }), // unknown here, snapshot only
      set(RETIRED), // retired id, no snapshot (the D217 lateral raise rows)
      set('ghost-2'), // unknown and nameless
    ];
    const names = groupSessionExercises(rows, lookup).map((e) => e.name);
    expect(names).toEqual(['Bench Press', 'Garage Press', 'Cable Thing', 'Machine Lateral Raise', 'Exercise']);
  });

  test('a retired id and its survivor in one session are one exercise', () => {
    const rows = [set(RETIRED), set(SURVIVOR), set(RETIRED)];
    const groups = groupSessionExercises(rows, lookup);
    expect(groups).toHaveLength(1);
    expect(groups[0].exerciseId).toBe(SURVIVOR);
    expect(groups[0].loggedSets).toHaveLength(3);
  });

  test('order follows time, not the set_number order the database read returns', () => {
    const a1 = set('bench', { setNumber: 1 });
    const b1 = set('db-press', { setNumber: 1 });
    const a2 = set('bench', { setNumber: 2 });
    // getWorkoutSetsForWorkout orders by set_number, which interleaves exercises.
    const dbOrder = [b1, a1, a2];
    const groups = groupSessionExercises(dbOrder, lookup);
    expect(groups.map((g) => g.name)).toEqual(['Bench Press', 'Dumbbell Shoulder Press']);
    expect(groups[0].loggedSets.map((s) => s.id)).toEqual([a1.id, a2.id]);
  });

  test('rows with no time (the in-memory fallback) keep the order they arrived in', () => {
    const rows = [
      { exerciseId: 'db-press', weight: 20, actualReps: 10, setType: 'straight' },
      { exerciseId: 'bench', weight: 60, actualReps: 8, setType: 'straight' },
    ];
    expect(groupSessionExercises(rows, lookup).map((g) => g.name)).toEqual(['Dumbbell Shoulder Press', 'Bench Press']);
  });

  test('every logged set carries its type, evidence class and exercise type', () => {
    const [g] = groupSessionExercises([set('heel-walk', { evidence_class: 'ballistic', set_type: 'warmup', setType: undefined })], lookup);
    expect(g.loggedSets[0]).toEqual(expect.objectContaining({ setType: 'warmup', evidenceClass: 'ballistic', exerciseType: 'distance' }));
    expect(g.workingSetCount).toBe(0);
  });

  test('a legacy "shoulders" primary muscle reads as the muscle the allocator credits', () => {
    const [g] = groupSessionExercises([set('legacy-shoulders')], lookup);
    expect(g.primaryMuscle).toBe('side_delts');
  });
});

describe('buildSessionReport', () => {
  test('counts, names and list agree; working sets exclude only warm-ups', () => {
    const rows = [
      set('bench', { setType: 'warmup' }),
      set('bench'),
      set('bench', { setType: null }), // untyped counts as a working set
      set('garage'),
      set('ghost', { exerciseName: 'Cable Thing' }),
    ];
    const r = buildSessionReport(rows, lookup);
    expect(r.exerciseCount).toBe(3);
    expect(r.exerciseCount).toBe(r.exercises.length);
    expect(r.allExerciseNames).toEqual(['Bench Press', 'Garage Press', 'Cable Thing']);
    expect(r.setCount).toBe(5);
    expect(r.workingSetCount).toBe(4);
  });

  test('a warm-up-only exercise is still an exercise of the session', () => {
    const r = buildSessionReport([set('bench', { setType: 'warmup' })], lookup);
    expect(r.exerciseCount).toBe(1);
    expect(r.workingSetCount).toBe(0);
  });

  test('Total lifted: per hand x2, assistance and distance excluded, warm-ups out', () => {
    const rows = [
      set('bench', { weight: 100, actualReps: 5 }), // 500
      set('bench', { weight: 40, actualReps: 10, setType: 'warmup' }), // 0
      set('db-press', { weight: 20, actualReps: 10 }), // 20 x 2 x 10 = 400
      set('assist-pull', { weight: 30, actualReps: 8 }), // 0
      set('heel-walk', { weight: 400, actualReps: 90 }), // 0
    ];
    expect(buildSessionReport(rows, lookup).tonnage).toBe(900);
  });

  test('an unknown id whose snapshot names a known exercise takes that exercise\'s semantics', () => {
    const rows = [set('other-device-id', { exerciseName: 'Dumbbell Shoulder Press', weight: 20, actualReps: 10 })];
    expect(buildSessionReport(rows, lookup).tonnage).toBe(400);
    expect(setMapsFor(rows, lookup).loadSemanticsById['other-device-id']).toBe('per_hand');
  });

  test('card names are capped at four, the full list is kept for search', () => {
    const ids = ['bench', 'db-press', 'assist-pull', 'heel-walk', SURVIVOR];
    const r = buildSessionReport(ids.map((id) => set(id)), lookup);
    expect(r.exerciseNames).toHaveLength(4);
    expect(r.allExerciseNames).toHaveLength(5);
  });

  test('primary muscles come from every resolved exercise, deleted custom included', () => {
    const r = buildSessionReport([set('garage'), set('heel-walk')], lookup);
    expect(r.primaryMuscles.sort()).toEqual(['chest', 'tibialis']);
  });

  test('with no lookup at all it still counts and lists every set', () => {
    const r = buildSessionReport([set('a', { exerciseName: 'A move' }), set('b')], null);
    expect(r.allExerciseNames).toEqual(['A move', 'Exercise']);
    expect(r.tonnage).toBe(1000);
  });

  test('empty and junk input', () => {
    expect(buildSessionReport(null, lookup)).toEqual(expect.objectContaining({ exerciseCount: 0, setCount: 0, tonnage: 0 }));
    expect(buildSessionReport([null, undefined], lookup).exerciseCount).toBe(0);
  });
});

describe('sessionSummaryParams', () => {
  test('the read-only summary route carries the report and the workout\'s own fields', () => {
    const workout = { id: 'w1', durationMinutes: 52, startedAt: 10, endedAt: 20, routineId: 'r1', routineName: 'Push A' };
    const rows = [set('bench'), set(RETIRED)];
    expect(sessionSummaryParams(workout, rows, lookup)).toEqual({
      workoutId: 'w1',
      durationMinutes: 52,
      exerciseCount: 2,
      setCount: 2,
      workingSetCount: 2,
      tonnage: 1000,
      exerciseNames: ['Bench Press', 'Machine Lateral Raise'],
      startedAt: 10,
      endedAt: 20,
      routineId: 'r1',
      routineName: 'Push A',
      readOnly: true,
    });
  });
});
