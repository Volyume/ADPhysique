import {
  KCAL_FLOOR,
  computeCalorieTargets,
  markApplied,
  isApplied,
  computeVolumeApply,
} from '../coachApply';

describe('computeCalorieTargets', () => {
  const base = { targetKcal: 2400, proteinG: 180, fatG: 70, carbsG: 250, maintenanceKcal: 2600 };

  test('returns null when there is no change', () => {
    expect(computeCalorieTargets(base, 0)).toBeNull();
    expect(computeCalorieTargets(base, null)).toBeNull();
    expect(computeCalorieTargets(base, undefined)).toBeNull();
  });

  test('returns null when there is no current target to scale from', () => {
    expect(computeCalorieTargets(null, -150)).toBeNull();
    expect(computeCalorieTargets({}, -150)).toBeNull();
    expect(computeCalorieTargets({ targetKcal: 0 }, -150)).toBeNull();
  });

  test('lowers calories and scales fat + carbs, holds protein', () => {
    const result = computeCalorieTargets(base, -240);
    expect(result.newKcal).toBe(2160); // 2400 - 240
    const ratio = 2160 / 2400; // 0.9
    expect(result.targets.targetKcal).toBe(2160);
    expect(result.targets.proteinG).toBe(180); // held
    expect(result.targets.fatG).toBe(Math.round(70 * ratio));   // 63
    expect(result.targets.carbsG).toBe(Math.round(250 * ratio)); // 225
    expect(result.targets.maintenanceKcal).toBe(2600);
  });

  test('raises calories and scales fat + carbs up', () => {
    const result = computeCalorieTargets(base, 150);
    expect(result.newKcal).toBe(2550);
    const ratio = 2550 / 2400;
    expect(result.targets.fatG).toBe(Math.round(70 * ratio));
    expect(result.targets.carbsG).toBe(Math.round(250 * ratio));
    expect(result.targets.proteinG).toBe(180);
  });

  test('clamps at the kcal floor and returns null if the floor makes it a no-op', () => {
    const low = { targetKcal: KCAL_FLOOR, proteinG: 150, fatG: 40, carbsG: 100 };
    // A cut from the floor would go below 1200, clamps back to 1200 = no change.
    expect(computeCalorieTargets(low, -300)).toBeNull();
  });

  test('clamps a large cut to the floor when it lands below it', () => {
    const result = computeCalorieTargets({ targetKcal: 1300, proteinG: 150, fatG: 40, carbsG: 100 }, -400);
    expect(result.newKcal).toBe(KCAL_FLOOR); // 1300 - 400 = 900 → clamped to 1200
  });

  test('tolerates missing macro fields', () => {
    const result = computeCalorieTargets({ targetKcal: 2000 }, -200);
    expect(result.newKcal).toBe(1800);
    expect(result.targets.proteinG).toBeNull();
    expect(result.targets.fatG).toBeNull();
    expect(result.targets.carbsG).toBeNull();
  });
});

describe('markApplied', () => {
  const output = {
    weekStart: 100,
    adjustments: {
      calories: { change: -150, note: 'cut a little' },
      steps: { target: 9000 },
    },
  };

  test('records appliedAdjustments and the legacy flag without mutating the input', () => {
    const before = JSON.stringify(output);
    const next = markApplied(output, 'calories', { newKcal: 2250 });

    expect(next).not.toBe(output);
    expect(JSON.stringify(output)).toBe(before); // input untouched

    expect(next.appliedAdjustments.calories.newKcal).toBe(2250);
    expect(typeof next.appliedAdjustments.calories.appliedAt).toBe('number');
    expect(next.adjustments.calories.applied).toBe(true);
    expect(next.adjustments.calories.newKcal).toBe(2250);
    // unrelated adjustments untouched
    expect(next.adjustments.steps).toEqual({ target: 9000 });
  });

  test('handles an adjustment key with no matching adjustments entry', () => {
    const next = markApplied(output, 'deload', {});
    expect(next.appliedAdjustments.deload).toBeTruthy();
    // no adjustments.deload to flag, and existing ones are untouched
    expect(next.adjustments.calories.applied).toBeUndefined();
  });

  test('returns the input unchanged for nullish args', () => {
    expect(markApplied(null, 'calories')).toBeNull();
    expect(markApplied(output, null)).toBe(output);
  });
});

describe('computeVolumeApply', () => {
  // Raw planned_muscle_volume rows (snake_case, as getPlannedMuscleVolume returns)
  const rows = [
    { muscle: 'chest', planned_sets: 12, mev: 6, mav: 14, mrv: 22 },
    { muscle: 'back', planned_sets: 16, mev: 10, mav: 16, mrv: 25 },
    { muscle: 'biceps', planned_sets: 21, mev: 6, mav: 14, mrv: 22 },
  ];

  test('returns [] for no delta or non-array', () => {
    expect(computeVolumeApply(rows, 0)).toEqual([]);
    expect(computeVolumeApply(rows, null)).toEqual([]);
    expect(computeVolumeApply(null, 2)).toEqual([]);
  });

  test('adds the delta to every muscle on a push', () => {
    const out = computeVolumeApply(rows, 2);
    const byMuscle = Object.fromEntries(out.map(c => [c.muscle, c.plannedSets]));
    expect(byMuscle.chest).toBe(14); // 12 + 2
    expect(byMuscle.back).toBe(18);  // 16 + 2
    expect(byMuscle.biceps).toBe(22); // 21 + 2 = 23 → clamped to mrv 22
  });

  test('clamps a push at each muscle mrv and drops no-op muscles', () => {
    // biceps already at mrv 22 → no change, excluded from output
    const out = computeVolumeApply([{ muscle: 'biceps', planned_sets: 22, mev: 6, mav: 14, mrv: 22 }], 3);
    expect(out).toEqual([]);
  });

  test('pulls back on a negative delta, clamped to mev', () => {
    const out = computeVolumeApply(rows, -2);
    const byMuscle = Object.fromEntries(out.map(c => [c.muscle, c.plannedSets]));
    expect(byMuscle.chest).toBe(10);  // 12 - 2
    expect(byMuscle.back).toBe(14);   // 16 - 2
    expect(byMuscle.biceps).toBe(19); // 21 - 2
  });

  test('pull-back never drops below mev', () => {
    const out = computeVolumeApply([{ muscle: 'chest', planned_sets: 7, mev: 6, mav: 14, mrv: 22 }], -3);
    expect(out[0].plannedSets).toBe(6); // 7 - 3 = 4 → clamped to mev 6
  });

  test('carries mev/mav/mrv through for the upsert', () => {
    const out = computeVolumeApply(rows, 1);
    const chest = out.find(c => c.muscle === 'chest');
    expect(chest).toMatchObject({ muscle: 'chest', plannedSets: 13, mev: 6, mav: 14, mrv: 22 });
  });
});

describe('isApplied', () => {
  test('false on a fresh output', () => {
    expect(isApplied({ adjustments: { calories: { change: -150 } } }, 'calories')).toBe(false);
  });

  test('true via appliedAdjustments map', () => {
    const next = markApplied({ adjustments: { calories: { change: -150 } } }, 'calories', { newKcal: 2250 });
    expect(isApplied(next, 'calories')).toBe(true);
  });

  test('true via the legacy adjustments[key].applied flag', () => {
    expect(isApplied({ adjustments: { calories: { applied: true } } }, 'calories')).toBe(true);
  });

  test('false for nullish input', () => {
    expect(isApplied(null, 'calories')).toBe(false);
    expect(isApplied({}, 'calories')).toBe(false);
  });
});
