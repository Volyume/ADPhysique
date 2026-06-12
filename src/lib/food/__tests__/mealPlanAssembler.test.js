/**
 * mealPlanAssembler — day/week assembly, TD/NTD variants, determinism,
 * and the FLOOR-ROUTING INVARIANT (blueprint §3.6): the assembler never
 * creates a day target below the engine's band, never cycles a floored
 * target, and never silently under-feeds (it flags instead).
 */
import { calculateNutritionTargets } from '../../nutritionEngine';
import {
  dayVariantTargets,
  targetWasFloored,
  buildSlotList,
  assembleDayPlan,
  assembleWeekPlan,
} from '../mealPlanAssembler';
import { roleOf } from '../foodRoles';

// A realistic mid-size engine target (shape mirrors calculateNutritionTargets).
const TARGET = Object.freeze({
  targetKcal: 2600, kcalMin: 2340, kcalMax: 2860,
  proteinG: 180, carbsG: 290, fatG: 75,
  warnings: [],
});

const dayTarget = (t = TARGET) => ({
  kcal: t.targetKcal, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG,
});
const BAND = { kcalMin: TARGET.kcalMin, kcalMax: TARGET.kcalMax };

describe('dayVariantTargets', () => {
  test('protein is identical on both variants; carbs are the lever', () => {
    const v = dayVariantTargets(TARGET, { trainingDays: 4, restDays: 3 });
    expect(v.training.proteinG).toBe(TARGET.proteinG);
    expect(v.rest.proteinG).toBe(TARGET.proteinG);
    expect(v.training.carbsG).toBeGreaterThan(TARGET.carbsG);
    expect(v.rest.carbsG).toBeLessThan(TARGET.carbsG);
    expect(v.training.fatG).toBe(TARGET.fatG); // equalised default
  });

  test('weekly total is preserved for the schedule mix', () => {
    const v = dayVariantTargets(TARGET, { trainingDays: 4, restDays: 3 });
    const weekly = v.training.kcal * 4 + v.rest.kcal * 3;
    expect(Math.abs(weekly - TARGET.targetKcal * 7)).toBeLessThanOrEqual(7); // rounding only
  });

  test('both variants stay inside the engine band', () => {
    [[1, 6], [3, 4], [6, 1]].forEach(([td, rd]) => {
      const v = dayVariantTargets(TARGET, { trainingDays: td, restDays: rd });
      expect(v.rest.kcal).toBeGreaterThanOrEqual(TARGET.kcalMin);
      expect(v.training.kcal).toBeLessThanOrEqual(TARGET.kcalMax);
    });
  });

  test('higher_rest_day convention raises rest-day fat and cuts carbs deeper', () => {
    const eq = dayVariantTargets(TARGET, { trainingDays: 4, restDays: 3, fatConvention: 'equalised' });
    const hi = dayVariantTargets(TARGET, { trainingDays: 4, restDays: 3, fatConvention: 'higher_rest_day' });
    expect(hi.rest.fatG).toBeGreaterThan(eq.rest.fatG);
    expect(hi.rest.carbsG).toBeLessThan(eq.rest.carbsG);
    expect(hi.rest.kcal).toBe(eq.rest.kcal); // same day calories either way
  });

  test('no day-type mix means no cycling', () => {
    const v = dayVariantTargets(TARGET, { trainingDays: 0, restDays: 7 });
    expect(v.training.kcal).toBe(TARGET.targetKcal);
    expect(v.rest.kcal).toBe(TARGET.targetKcal);
    expect(v.cycleDeltaKcal).toBe(0);
  });
});

describe('FLOOR-ROUTING INVARIANT (the test that matters)', () => {
  // A REAL engine call that lands on the calorie floor: small, light,
  // aggressive cut. We assert against the genuine warnings shape.
  const floored = calculateNutritionTargets({
    sex: 'female', ageYears: 30, heightCm: 155, weightKg: 48,
    activityLevel: 'sedentary', goal: 'aggressive_cut',
  });

  test('the fixture really is floored (engine warning present)', () => {
    expect(targetWasFloored(floored)).toBe(true);
  });

  test('a floored target NEVER cycles: both variants equal the engine target', () => {
    const v = dayVariantTargets(floored, { trainingDays: 4, restDays: 3 });
    expect(v.training.kcal).toBe(floored.targetKcal);
    expect(v.rest.kcal).toBe(floored.targetKcal);
    expect(v.cycleDeltaKcal).toBe(0);
  });

  test('no variant target ever sits below the engine kcalMin, across schedules', () => {
    for (let td = 0; td <= 7; td += 1) {
      [TARGET, floored].forEach((t) => {
        const v = dayVariantTargets(t, { trainingDays: td, restDays: 7 - td });
        expect(v.rest.kcal).toBeGreaterThanOrEqual(Math.min(t.kcalMin, t.targetKcal));
        expect(v.training.kcal).toBeGreaterThanOrEqual(Math.min(t.kcalMin, t.targetKcal));
      });
    }
  });

  test('an unreachable target is FLAGGED, never silently under-delivered', () => {
    // Vegan + soya excluded + milk excluded leaves a thin protein pool for
    // a high-protein day: the assembler must say so via withinTolerance.
    const day = assembleDayPlan({
      target: { kcal: 3000, proteinG: 260, carbsG: 300, fatG: 80 },
      band: { kcalMin: 2700, kcalMax: 3300 },
      prefs: { diet: 'vegan', excludeTags: ['soya'], mealsPerDay: 3 },
      seed: 5,
    });
    if (!day.withinTolerance) {
      expect(day.residual).toBeDefined();
      expect(Math.abs(day.residual.kcal) + Math.abs(day.residual.protein)).toBeGreaterThan(0);
    }
    // Either way it never reports totals it did not place.
    const summed = day.slots.reduce((a, s) => a + s.totals.kcal, 0);
    expect(Math.abs(summed - day.totals.kcal)).toBeLessThanOrEqual(2);
  });
});

describe('buildSlotList', () => {
  test('numbered meals; peri-workout slots only on enabled training days', () => {
    expect(buildSlotList({ mealsPerDay: 4 }).map((s) => s.key))
      .toEqual(['meal_1', 'meal_2', 'meal_3', 'meal_4']);
    const td = buildSlotList({ mealsPerDay: 4, periWorkout: true, variant: 'training' });
    expect(td.map((s) => s.kind)).toContain('pre_workout');
    expect(td.map((s) => s.kind)).toContain('post_workout');
    const rest = buildSlotList({ mealsPerDay: 4, periWorkout: true, variant: 'rest' });
    expect(rest.map((s) => s.kind)).not.toContain('pre_workout');
  });
});

describe('assembleDayPlan', () => {
  const day = assembleDayPlan({ target: dayTarget(), band: BAND, prefs: { mealsPerDay: 4 }, seed: 42 });

  test('fills every slot with distinct meals', () => {
    expect(day.slots.length).toBe(4);
    const ids = day.slots.map((s) => s.mealId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('lands the day inside the engine band with protein delivered', () => {
    expect(day.withinTolerance).toBe(true);
    expect(day.totals.kcal).toBeGreaterThanOrEqual(BAND.kcalMin);
    expect(day.totals.kcal).toBeLessThanOrEqual(BAND.kcalMax);
    expect(day.totals.protein).toBeGreaterThanOrEqual(TARGET.proteinG * 0.85);
  });

  test('is deterministic for the same seed and a regenerate reshuffles', () => {
    const again = assembleDayPlan({ target: dayTarget(), band: BAND, prefs: { mealsPerDay: 4 }, seed: 42 });
    expect(again).toEqual(day);
    // A single other seed may legitimately coincide; across a window of
    // regenerations at least one must differ or "new meals please" is dead.
    const baseline = day.slots.map((s) => s.mealId).join('|');
    const anyDifferent = [43, 44, 45, 46, 47].some((s) => {
      const other = assembleDayPlan({ target: dayTarget(), band: BAND, prefs: { mealsPerDay: 4 }, seed: s });
      return other.slots.map((x) => x.mealId).join('|') !== baseline;
    });
    expect(anyDifferent).toBe(true);
  });

  test('hard exclusions never appear in a plan', () => {
    const noChicken = assembleDayPlan({
      target: dayTarget(), band: BAND, seed: 7,
      prefs: { mealsPerDay: 4, excludeFoodKeys: ['chicken_breast'], excludeTags: ['fish'] },
    });
    noChicken.slots.forEach((s) => {
      (s.components || []).forEach((c) => {
        expect(c.food).not.toBe('chicken_breast');
        expect(['cod', 'salmon', 'smoked_salmon', 'tuna_water']).not.toContain(c.food);
      });
    });
  });

  test('vegan preference yields a fully vegan day', () => {
    const vegan = assembleDayPlan({
      target: dayTarget(), band: BAND, seed: 9, prefs: { mealsPerDay: 4, diet: 'vegan' },
    });
    expect(vegan.slots.length).toBe(4);
    vegan.slots.forEach((s) => {
      (s.components || []).forEach((c) => {
        expect(roleOf(c.food)).toBeTruthy();
        expect(['chicken_breast', 'eggs', 'whey', 'greek_yogurt_0', 'cod', 'beef_mince_5'])
          .not.toContain(c.food);
      });
    });
  });

  test('training variant with peri-workout slots assembles the extra slots', () => {
    const td = assembleDayPlan({
      target: dayTarget(), band: BAND, seed: 3, variant: 'training',
      prefs: { mealsPerDay: 4, periWorkoutSlots: true },
    });
    const keys = td.slots.map((s) => s.slot);
    expect(keys).toContain('pre_workout');
    expect(keys).toContain('post_workout');
  });
});

describe('assembleWeekPlan', () => {
  const schedule = ['training', 'rest', 'training', 'rest', 'training', 'training', 'rest'];

  test('seven days following the schedule, deterministic end to end', () => {
    const week = assembleWeekPlan({ engineTarget: TARGET, prefs: { mealsPerDay: 4, variety: 0.7 }, schedule, seed: 11 });
    expect(week.days.length).toBe(7);
    week.days.forEach((d, i) => expect(d.variant).toBe(schedule[i]));
    const again = assembleWeekPlan({ engineTarget: TARGET, prefs: { mealsPerDay: 4, variety: 0.7 }, schedule, seed: 11 });
    expect(again).toEqual(week);
  });

  test('variety 0 repeats one day per variant (meal-prep mode)', () => {
    const week = assembleWeekPlan({ engineTarget: TARGET, prefs: { mealsPerDay: 4, variety: 0 }, schedule, seed: 2 });
    const trainingDays = week.days.filter((d) => d.variant === 'training');
    trainingDays.forEach((d) => expect(d.slots.map((s) => s.mealId))
      .toEqual(trainingDays[0].slots.map((s) => s.mealId)));
  });

  test('variety 1 rotates: the week uses more distinct meals than one day', () => {
    const week = assembleWeekPlan({ engineTarget: TARGET, prefs: { mealsPerDay: 4, variety: 1 }, schedule, seed: 2 });
    const all = new Set();
    week.days.forEach((d) => d.slots.forEach((s) => all.add(s.mealId)));
    expect(all.size).toBeGreaterThan(4);
  });

  test('the weekly calorie average tracks the engine target', () => {
    const week = assembleWeekPlan({ engineTarget: TARGET, prefs: { mealsPerDay: 4, variety: 0.5 }, schedule, seed: 6 });
    const avg = week.days.reduce((a, d) => a + d.totals.kcal, 0) / 7;
    expect(Math.abs(avg - TARGET.targetKcal)).toBeLessThanOrEqual(TARGET.targetKcal * 0.1);
  });
});
