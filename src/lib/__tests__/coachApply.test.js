import {
  KCAL_FLOOR,
  computeCalorieTargets,
  markApplied,
  isApplied,
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
