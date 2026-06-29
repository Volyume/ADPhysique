/**
 * buildExerciseMetricSeries — distance/duration must not plot weight-based
 * series (they reuse the weight column for metres / reps for seconds). The
 * optional exerciseTypeById map skips those exercises; without it, behaviour is
 * the legacy all-weight_reps path.
 */
import { buildExerciseMetricSeries } from '../liftProgress';

const set = (over = {}) => ({
  exerciseId: 'lift', setType: 'straight', weight: 100, actualReps: 5,
  createdAt: 1000, workoutId: 'w1', ...over,
});

describe('buildExerciseMetricSeries — exercise_type awareness', () => {
  test('without a type map, every load-bearing set is plotted (legacy)', () => {
    const out = buildExerciseMetricSeries([set()]);
    expect(out.get('lift')).toEqual({ e1rm: expect.any(Array), heaviest: [100], reps: [5], volume: [500] });
  });

  test('a distance exercise (metres in weight, seconds in reps) is skipped', () => {
    const sets = [
      set({ exerciseId: 'run', weight: 5000, actualReps: 1500 }),
      set({ exerciseId: 'squat', weight: 140, actualReps: 5 }),
    ];
    const types = new Map([['run', 'distance'], ['squat', 'weight_reps']]);
    const out = buildExerciseMetricSeries(sets, types);
    expect(out.has('run')).toBe(false);
    expect(out.get('squat').volume).toEqual([700]);
  });

  test('a duration exercise is skipped by type', () => {
    const sets = [set({ exerciseId: 'plank', weight: 30, actualReps: 90 })];
    const types = new Map([['plank', 'duration']]);
    expect(buildExerciseMetricSeries(sets, types).has('plank')).toBe(false);
  });

  test('an unknown / unmatched exercise defaults to weight_reps (counted)', () => {
    const types = new Map([['other', 'distance']]);
    const out = buildExerciseMetricSeries([set({ exerciseId: 'lift' })], types);
    expect(out.get('lift').volume).toEqual([500]);
  });

  test('weighted_bodyweight still plots its load', () => {
    const types = new Map([['dip', 'weighted_bodyweight']]);
    const out = buildExerciseMetricSeries([set({ exerciseId: 'dip', weight: 20, actualReps: 6 })], types);
    expect(out.get('dip').volume).toEqual([120]);
  });
});
