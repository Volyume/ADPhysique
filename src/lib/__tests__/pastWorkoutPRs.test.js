/**
 * A workout opened from history works its personal records out again, with
 * the logger's own rules (founder, 2026-09-27, of a workout shared from
 * history: "add back in PRs"). Pinned against the real detector: a set is a
 * record only when it beats every working set on record before it, earlier
 * workouts and this workout's own earlier sets alike; warm-ups, timed
 * exercises and an exercise's first-ever set never are; one per exercise.
 */
import { pastWorkoutPRs } from '../pastWorkoutPRs';

const EX = {
  bench: { id: 'bench', name: 'Bench Press', exerciseType: 'weight_reps' },
  row: { id: 'row', name: 'Seated Row', exerciseType: 'weight_reps' },
  plank: { id: 'plank', name: 'Plank', exerciseType: 'duration' },
};
const set = (exerciseId, weight, reps, createdAt, extra = {}) => ({
  id: `${exerciseId}-${createdAt}`, exerciseId, weight, actualReps: reps, setType: 'straight', createdAt, ...extra,
});

describe('pastWorkoutPRs', () => {
  test('a set that beats everything logged before it is a record, named and dated', () => {
    const prs = pastWorkoutPRs({
      sets: [set('bench', 105, 5, 1000)],
      priorSetsByExercise: { bench: [set('bench', 100, 5, 10)] },
      exerciseById: EX,
      date: 900,
    });
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ exerciseId: 'bench', exerciseName: 'Bench Press', weight: 105, reps: 5, units: 'kg', date: 900 });
  });

  test('a set that does not beat the best before it is not', () => {
    expect(pastWorkoutPRs({
      sets: [set('bench', 95, 5, 1000)],
      priorSetsByExercise: { bench: [set('bench', 100, 5, 10)] },
      exerciseById: EX,
    })).toEqual([]);
  });

  test("the workout's own earlier sets are part of the bar, as when logging", () => {
    // 110 x 5 then 105 x 5: only the first beats what came before it.
    const prs = pastWorkoutPRs({
      sets: [set('bench', 105, 5, 2000), set('bench', 110, 5, 1000)],
      priorSetsByExercise: { bench: [set('bench', 100, 5, 10)] },
      exerciseById: EX,
    });
    expect(prs).toHaveLength(1);
    expect(prs[0].weight).toBe(110);
  });

  test("an exercise's first-ever set beats nothing; a later set that day can", () => {
    expect(pastWorkoutPRs({ sets: [set('row', 60, 10, 1000)], exerciseById: EX })).toEqual([]);
    const prs = pastWorkoutPRs({ sets: [set('row', 60, 10, 1000), set('row', 70, 10, 2000)], exerciseById: EX });
    expect(prs).toHaveLength(1);
    expect(prs[0].weight).toBe(70);
  });

  test('a warm-up is never a record, nor part of the bar', () => {
    expect(pastWorkoutPRs({
      sets: [set('bench', 120, 5, 1000, { setType: 'warmup' })],
      priorSetsByExercise: { bench: [set('bench', 100, 5, 10)] },
      exerciseById: EX,
    })).toEqual([]);
    const prs = pastWorkoutPRs({
      sets: [set('bench', 105, 5, 1000)],
      priorSetsByExercise: { bench: [set('bench', 100, 5, 10), set('bench', 140, 5, 20, { setType: 'warmup' })] },
      exerciseById: EX,
    });
    expect(prs).toHaveLength(1);
  });

  test('a timed exercise is never judged as weight and reps', () => {
    expect(pastWorkoutPRs({
      sets: [set('plank', 90, 1, 1000)],
      priorSetsByExercise: { plank: [set('plank', 60, 1, 10)] },
      exerciseById: EX,
    })).toEqual([]);
  });

  test('one record per exercise, across several exercises', () => {
    const prs = pastWorkoutPRs({
      sets: [set('bench', 105, 5, 1000), set('bench', 107.5, 5, 1100), set('row', 80, 10, 1200)],
      priorSetsByExercise: { bench: [set('bench', 100, 5, 10)], row: [set('row', 70, 10, 10)] },
      exerciseById: EX,
    });
    expect(prs.map((p) => p.exerciseId)).toEqual(['bench', 'row']);
  });

  test('no history read means no record claimed', () => {
    expect(pastWorkoutPRs({ sets: [set('bench', 105, 5, 1000)], exerciseById: EX })).toEqual([]);
    expect(pastWorkoutPRs({ sets: null })).toEqual([]);
  });
});
