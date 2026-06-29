/**
 * ADVERSARIAL probes for calculateTonnage exercise_type exclusion.
 * Attacks the resolution paths the shipped suite skims: snake_case exercise_id,
 * mixed id casing, large-metre distance leakage, and the no-map legacy identity.
 */
import { calculateTonnage } from '../algorithms';

describe('calculateTonnage — adversarial exercise_type exclusion', () => {
  test('a distance set keyed by snake_case exercise_id is still excluded', () => {
    // The set carries exercise_id (DB row), not exerciseId. isLoadBearingSet
    // resolves `set.exerciseId ?? set.exercise_id`, so the snake_case key must
    // map into the type table.
    const sets = [
      { exercise_id: 'bench', weight: 100, actual_reps: 8 },   // 800
      { exercise_id: 'run', weight: 5000, actual_reps: 1200 }, // garbage, must drop
    ];
    const typeMap = { bench: 'weight_reps', run: 'distance' };
    expect(calculateTonnage(sets, typeMap)).toBe(800);
  });

  test('a HUGE-metre distance set never leaks into the sum', () => {
    const sets = [
      { exerciseId: 'sled', weight: 99999, actualReps: 9999 }, // distance garbage
    ];
    expect(calculateTonnage(sets, { sled: 'distance' })).toBe(0);
  });

  test('weighted_bodyweight is real load and IS counted', () => {
    const sets = [{ exerciseId: 'dip', weight: 25, actualReps: 8 }]; // 200
    expect(calculateTonnage(sets, { dip: 'weighted_bodyweight' })).toBe(200);
  });

  test('no-map call is byte-identical to a map where every id is weight_reps', () => {
    const sets = [
      { exerciseId: 'a', weight: 100, actualReps: 5 },
      { exerciseId: 'b', weight: 60, actual_reps: 10 },
      { setType: 'warmup', exerciseId: 'a', weight: 40, actualReps: 10 },
    ];
    const noMap = calculateTonnage(sets);
    const allWR = calculateTonnage(sets, { a: 'weight_reps', b: 'weight_reps' });
    expect(noMap).toBe(allWR);
    expect(noMap).toBe(100 * 5 + 60 * 10); // 1100, warm-up excluded
  });

  test('an id present in the set but ABSENT from the map defaults to counted', () => {
    const sets = [{ exerciseId: 'mystery', weight: 50, actualReps: 10 }];
    expect(calculateTonnage(sets, { other: 'distance' })).toBe(500);
  });

  test('a distance set mixed with weight_reps under one map: only load counts', () => {
    const sets = [
      { exerciseId: 'squat', weight: 140, actualReps: 5 }, // 700
      { exerciseId: 'row1k', weight: 1000, actualReps: 240 }, // distance: drop
      { exerciseId: 'plank', weight: 0, actualReps: 120 }, // duration: 0 anyway
    ];
    const map = { squat: 'weight_reps', row1k: 'distance', plank: 'duration' };
    expect(calculateTonnage(sets, map)).toBe(700);
  });
});
