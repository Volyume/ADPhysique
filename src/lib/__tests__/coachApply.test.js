import {
  KCAL_FLOOR,
  computeCalorieTargets,
  computeDietBreakTargets,
  computeDeloadVolume,
  computeMacroCycle,
  MACRO_CYCLE_REST_DAY_CARB_CUT,
  computeRefeedDay,
  markApplied,
  isApplied,
  computeVolumeApply,
  ABSOLUTE_WEEKLY_SET_CEILING,
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

  // audit 2026-07-01 CRITICAL: the Apply path must enforce the SEX-AWARE ED
  // floor (1500 male / 1200 female), matching nutritionEngine. Previously it
  // floored everyone at 1200, so a male cut could be written below 1500.
  test('floors a male target at 1500, never below', () => {
    const male = { targetKcal: 1700, proteinG: 170, fatG: 50, carbsG: 120 };
    // A 300 cut would land at 1400 (below the male floor) → clamp to 1500.
    const result = computeCalorieTargets(male, -300, 'male');
    expect(result.newKcal).toBe(1500);
    // A cut from exactly the male floor is a no-op (cannot go lower).
    expect(computeCalorieTargets({ targetKcal: 1500, proteinG: 170 }, -200, 'male')).toBeNull();
  });

  test('female / unknown sex keeps the 1200 floor', () => {
    expect(computeCalorieTargets({ targetKcal: 1300, proteinG: 150 }, -400, 'female').newKcal).toBe(1200);
    expect(computeCalorieTargets({ targetKcal: 1300, proteinG: 150 }, -400).newKcal).toBe(1200);
  });

  test('diet break also respects the sex-aware floor', () => {
    // Raising a male deficit to maintenance is always >= floor, but a broken
    // maintenance below 1500 must still not write a male target under 1500.
    const male = { targetKcal: 1400, tdee: 1450, proteinG: 170 };
    const result = computeDietBreakTargets(male, 'male');
    expect(result.newKcal).toBeGreaterThanOrEqual(1500);
  });

  test('tolerates missing macro fields', () => {
    const result = computeCalorieTargets({ targetKcal: 2000 }, -200);
    expect(result.newKcal).toBe(1800);
    expect(result.targets.proteinG).toBeNull();
    expect(result.targets.fatG).toBeNull();
    expect(result.targets.carbsG).toBeNull();
  });

  test('preserves untouched row fields so the full-row save does not null them', () => {
    // saveNutritionTargets writes every column; a targets object that
    // dropped tdee/bmr/phase would wipe the user's maintenance figure.
    const full = {
      targetKcal: 2400, proteinG: 180, fatG: 70, carbsG: 250,
      tdee: 2600, bmr: 1800, phase: 'cut', bmrMethod: 'mifflin',
      activityLevel: 'moderate', confidence: 'high',
    };
    const result = computeCalorieTargets(full, -240);
    expect(result.targets.tdee).toBe(2600);
    expect(result.targets.bmr).toBe(1800);
    expect(result.targets.phase).toBe('cut');
    expect(result.targets.bmrMethod).toBe('mifflin');
    expect(result.targets.activityLevel).toBe('moderate');
  });
});

describe('computeDietBreakTargets', () => {
  test('raises a deficit up to maintenance, holding protein', () => {
    const nutrition = { targetKcal: 2000, proteinG: 180, fatG: 60, carbsG: 200, tdee: 2600 };
    const result = computeDietBreakTargets(nutrition);
    expect(result.newKcal).toBe(2600); // raised to tdee
    expect(result.targets.targetKcal).toBe(2600);
    expect(result.targets.proteinG).toBe(180); // held
    const ratio = 2600 / 2000;
    expect(result.targets.fatG).toBe(Math.round(60 * ratio));
    expect(result.targets.carbsG).toBe(Math.round(200 * ratio));
    expect(result.targets.tdee).toBe(2600); // preserved
  });

  test('returns null when already at or above maintenance', () => {
    expect(computeDietBreakTargets({ targetKcal: 2600, tdee: 2600 })).toBeNull();
    expect(computeDietBreakTargets({ targetKcal: 2800, tdee: 2600 })).toBeNull();
  });

  test('returns null when maintenance or current is missing', () => {
    expect(computeDietBreakTargets({ targetKcal: 2000 })).toBeNull(); // no tdee
    expect(computeDietBreakTargets({ tdee: 2600 })).toBeNull(); // no current
    expect(computeDietBreakTargets(null)).toBeNull();
  });
});

describe('computeDeloadVolume', () => {
  const rows = [
    { muscle: 'chest', planned_sets: 14, mev: 6, mav: 14, mrv: 22 },
    { muscle: 'back', planned_sets: 16, mev: 10, mav: 16, mrv: 25 },
    { muscle: 'biceps', planned_sets: 6, mev: 6, mav: 14, mrv: 22 }, // already at floor
  ];

  test('cuts every muscle above its floor down to mev', () => {
    const out = computeDeloadVolume(rows);
    const byMuscle = Object.fromEntries(out.map(c => [c.muscle, c.plannedSets]));
    expect(byMuscle.chest).toBe(6);
    expect(byMuscle.back).toBe(10);
    expect('biceps' in byMuscle).toBe(false); // already at floor, no-op dropped
  });

  test('carries mev/mav/mrv through for the upsert', () => {
    const out = computeDeloadVolume(rows);
    const chest = out.find(c => c.muscle === 'chest');
    expect(chest).toMatchObject({ muscle: 'chest', plannedSets: 6, mev: 6, mav: 14, mrv: 22 });
  });

  test('returns [] for a non-array', () => {
    expect(computeDeloadVolume(null)).toEqual([]);
    expect(computeDeloadVolume(undefined)).toEqual([]);
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

  // PROG-1 (audit §2): a row with a null mrv must NOT let a push run away to
  // +Infinity. It must fall back to mav, then to the absolute backstop.
  test('PROG-1: null mrv falls back to mav as the push ceiling', () => {
    const out = computeVolumeApply([{ muscle: 'chest', planned_sets: 13, mev: 6, mav: 14, mrv: null }], 5);
    // 13 + 5 = 18 → clamped to mav 14, never uncapped
    expect(out[0].plannedSets).toBe(14);
  });

  test('PROG-1: null mrv AND null mav falls back to the absolute ceiling, never +Infinity', () => {
    const out = computeVolumeApply([{ muscle: 'chest', planned_sets: 28, mev: 6, mav: null, mrv: null }], 10);
    // 28 + 10 = 38 → clamped to ABSOLUTE_WEEKLY_SET_CEILING (30), finite
    expect(out[0].plannedSets).toBe(ABSOLUTE_WEEKLY_SET_CEILING);
    expect(Number.isFinite(out[0].plannedSets)).toBe(true);
  });

  test('PROG-1: a present mrv still binds even when below mav (mrv wins)', () => {
    // mrv must take precedence over the mav fallback when it is present.
    const out = computeVolumeApply([{ muscle: 'chest', planned_sets: 10, mev: 6, mav: 20, mrv: 12 }], 5);
    expect(out[0].plannedSets).toBe(12);
  });
});

describe('computeMacroCycle', () => {
  const base = { targetKcal: 2400, proteinG: 200, carbsG: 280, fatG: 70 };

  test('returns null without a target or carbs to split', () => {
    expect(computeMacroCycle(null, 4)).toBeNull();
    expect(computeMacroCycle({}, 4)).toBeNull();
    expect(computeMacroCycle({ targetKcal: 2400 }, 4)).toBeNull();
    expect(computeMacroCycle({ carbsG: 280 }, 4)).toBeNull();
  });

  test('returns null outside 1..6 training days (need both day types)', () => {
    expect(computeMacroCycle(base, 0)).toBeNull();
    expect(computeMacroCycle(base, 7)).toBeNull();
    expect(computeMacroCycle(base, -2)).toBeNull();
  });

  test('holds protein and fat on both day types', () => {
    const out = computeMacroCycle(base, 4);
    expect(out.trainingDay.proteinG).toBe(200);
    expect(out.restDay.proteinG).toBe(200);
    expect(out.trainingDay.fatG).toBe(70);
    expect(out.restDay.fatG).toBe(70);
  });

  test('training days carry more carbs (and kcal) than rest days', () => {
    const out = computeMacroCycle(base, 4);
    expect(out.trainingDay.carbsG).toBeGreaterThan(out.restDay.carbsG);
    expect(out.trainingDay.kcal).toBeGreaterThan(out.restDay.kcal);
    expect(out.trainingDaysPerWeek).toBe(4);
  });

  test('rest-day carbs are cut by the configured fraction of baseline', () => {
    const out = computeMacroCycle(base, 4);
    expect(out.restDay.carbsG).toBe(Math.round(280 * (1 - MACRO_CYCLE_REST_DAY_CARB_CUT)));
  });

  test('weekly average kcal stays at the current target', () => {
    for (const T of [1, 2, 3, 4, 5, 6]) {
      const out = computeMacroCycle(base, T);
      const weeklyKcal = T * out.trainingDay.kcal + (7 - T) * out.restDay.kcal;
      // Per-day gram rounding drifts the weekly average by at most a
      // couple of kcal; it must stay within that noise of the target.
      expect(Math.abs(weeklyKcal / 7 - base.targetKcal)).toBeLessThanOrEqual(5);
    }
  });

  test('weekly carb total is preserved (carbs only cycle, never created)', () => {
    for (const T of [1, 3, 5, 6]) {
      const out = computeMacroCycle(base, T);
      const weeklyCarbs = T * out.trainingDay.carbsG + (7 - T) * out.restDay.carbsG;
      expect(Math.round(weeklyCarbs / 7)).toBe(base.carbsG);
    }
  });

  test('day kcal tracks the carb delta at 4 kcal/g', () => {
    const out = computeMacroCycle(base, 4);
    expect(out.trainingDay.kcal).toBe(2400 + (out.trainingDay.carbsG - 280) * 4);
    expect(out.restDay.kcal).toBe(2400 + (out.restDay.carbsG - 280) * 4);
  });

  test('rest-day carbs never go below zero even with six training days', () => {
    const out = computeMacroCycle(base, 6);
    expect(out.restDay.carbsG).toBeGreaterThanOrEqual(0);
    expect(out.trainingDay.carbsG).toBeGreaterThan(out.restDay.carbsG);
  });

  test('passes protein and fat through as null when not set', () => {
    const out = computeMacroCycle({ targetKcal: 2000, carbsG: 200 }, 3);
    expect(out.trainingDay.proteinG).toBeNull();
    expect(out.trainingDay.fatG).toBeNull();
    expect(out.restDay.proteinG).toBeNull();
  });
});

describe('computeRefeedDay', () => {
  const base = { targetKcal: 2000, tdee: 2600, proteinG: 200, fatG: 60 };

  test('returns null without a target or maintenance', () => {
    expect(computeRefeedDay(null)).toBeNull();
    expect(computeRefeedDay({})).toBeNull();
    expect(computeRefeedDay({ targetKcal: 2000 })).toBeNull();
    expect(computeRefeedDay({ tdee: 2600 })).toBeNull();
  });

  test('returns null when already at or above maintenance (not cutting)', () => {
    expect(computeRefeedDay({ targetKcal: 2600, tdee: 2600, proteinG: 200, fatG: 60 })).toBeNull();
    expect(computeRefeedDay({ targetKcal: 2700, tdee: 2600, proteinG: 200, fatG: 60 })).toBeNull();
  });

  test('raises kcal to maintenance and holds protein + fat', () => {
    const out = computeRefeedDay(base);
    expect(out.kcal).toBe(2600);
    expect(out.proteinG).toBe(200); // held
    expect(out.fatG).toBe(60);      // held
  });

  test('carbs fill the gap to maintenance after protein and fat', () => {
    const out = computeRefeedDay(base);
    // (2600 - 200*4 - 60*9) / 4 = (2600 - 800 - 540) / 4 = 1260 / 4 = 315
    expect(out.carbsG).toBe(315);
    // and the macros add back up to maintenance
    expect(out.proteinG * 4 + out.carbsG * 4 + out.fatG * 9).toBeCloseTo(2600, 0);
  });

  test('passes protein and fat through as null when unset, still hits maintenance via carbs', () => {
    const out = computeRefeedDay({ targetKcal: 1800, tdee: 2400 });
    expect(out.kcal).toBe(2400);
    expect(out.proteinG).toBeNull();
    expect(out.fatG).toBeNull();
    expect(out.carbsG).toBe(Math.round(2400 / 4)); // 600
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
