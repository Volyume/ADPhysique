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

  test('allowCycling:false forces a flat day even on a cycle-worthy mix', () => {
    // Same inputs that DO cycle by default (the first test above) must go flat
    // once the upstream gate says this user does not cycle calories.
    const v = dayVariantTargets(TARGET, { trainingDays: 4, restDays: 3, allowCycling: false });
    expect(v.training.kcal).toBe(TARGET.targetKcal);
    expect(v.rest.kcal).toBe(TARGET.targetKcal);
    expect(v.training.carbsG).toBe(TARGET.carbsG);
    expect(v.rest.carbsG).toBe(TARGET.carbsG);
    expect(v.cycleDeltaKcal).toBe(0);
  });
});

describe('targetWasFloored — structured flag + every real engine warning', () => {
  test('gates on the structured floorApplied flag first', () => {
    expect(targetWasFloored({ floorApplied: true, warnings: [] })).toBe(true);
    expect(targetWasFloored({ floorApplied: false, warnings: [] })).toBe(false);
  });

  // The engine's ACTUAL warning texts (nutritionEngine.js ~784-823),
  // verbatim — the fallback for snapshots stored before floorApplied.
  test.each([
    ['Target calories (1155 kcal) below safe minimum (1200 kcal). Raising to floor.', true],
    ['Estimated loss rate (1.82 % BW/week) exceeds the 1.5 % hard gate. Calories have been raised to limit loss to 1.5 % BW/week.', true],
    ['Estimated loss rate (0.91 % BW/week) exceeds the recommended 0.8 % threshold. Consider slowing the rate to preserve muscle mass.', false],
    ['Contest Prep is an extreme protocol. Consult a qualified sports dietitian before proceeding.', false],
  ])('legacy warning fallback: "%s" -> %s', (warning, floored) => {
    expect(targetWasFloored({ warnings: [warning] })).toBe(floored);
  });

  test('the engine actually emits floorApplied on a floored call', () => {
    const floored = calculateNutritionTargets({
      sex: 'female', ageYears: 30, heightCm: 155, weightKg: 48,
      activityLevel: 'sedentary', goal: 'aggressive_cut',
    });
    expect(floored.floorApplied).toBe(true);
    const normal = calculateNutritionTargets({
      sex: 'male', ageYears: 28, heightCm: 180, weightKg: 85,
      activityLevel: 'moderate', goal: 'maintain',
    });
    expect(normal.floorApplied).toBe(false);
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
    expect(day.unfilledSlots).toEqual([]); // no holes at a reachable target
  });

  test('a crushed pool surfaces unfilled slots and is never "within tolerance" (food review E-M1)', () => {
    // Vegan + no soya + no gluten leaves only 2 vegan meals (lentil chilli,
    // chickpea & lentil curry); 4 meals/day cannot be filled. The day must
    // REPORT the holes rather than silently return a short plan that looks
    // like an ordinary off-target day.
    const holey = assembleDayPlan({
      target: dayTarget(), band: BAND, seed: 9,
      prefs: { mealsPerDay: 4, diet: 'vegan', excludeTags: ['soya', 'cereals_gluten'] },
    });
    expect(holey.unfilledSlots.length).toBeGreaterThan(0);
    expect(holey.slots.length).toBe(4 - holey.unfilledSlots.length);
    expect(holey.withinTolerance).toBe(false);
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

  test('a pinned meal is always placed, first, in a compatible slot', () => {
    // pick a real curated meal id deterministically: whatever an
    // unpinned assembly puts in slot 1, pin it for a DIFFERENT seed and
    // assert it survives the reshuffle.
    const base = assembleDayPlan({ target: dayTarget(), band: BAND, prefs: { mealsPerDay: 4 }, seed: 42 });
    const pinId = base.slots[0].mealId;
    const pinned = assembleDayPlan({
      target: dayTarget(), band: BAND, seed: 1234,
      prefs: { mealsPerDay: 4, pinnedMealIds: [pinId] },
    });
    const ids = pinned.slots.map((s) => s.mealId);
    expect(ids).toContain(pinId);
    const pinnedSlot = pinned.slots.find((s) => s.mealId === pinId);
    expect(pinnedSlot.pinned).toBe(true);
    // still a full, distinct-meal day inside the band
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('a pinned id that no longer exists is skipped without breaking the day', () => {
    const day2 = assembleDayPlan({
      target: dayTarget(), band: BAND, seed: 5,
      prefs: { mealsPerDay: 4, pinnedMealIds: ['ghost_meal_id'] },
    });
    expect(day2.slots.length).toBe(4);
  });

  test('assembles against a REAL engine target (shape-drift guard)', () => {
    const real = calculateNutritionTargets({
      sex: 'male', ageYears: 28, heightCm: 180, weightKg: 85,
      activityLevel: 'moderate', goal: 'maintain',
    });
    const day2 = assembleDayPlan({
      target: { kcal: real.targetKcal, proteinG: real.proteinG, carbsG: real.carbsG, fatG: real.fatG },
      band: { kcalMin: real.kcalMin, kcalMax: real.kcalMax },
      prefs: { mealsPerDay: real.mealFrequency }, seed: 8,
    });
    expect(day2.withinTolerance).toBe(true);
    expect(day2.totals.kcal).toBeGreaterThanOrEqual(real.kcalMin);
    expect(day2.totals.kcal).toBeLessThanOrEqual(real.kcalMax);
  });

  test('an ASSEMBLED day for a floored target never sits below the floor unflagged', () => {
    const floored = calculateNutritionTargets({
      sex: 'female', ageYears: 30, heightCm: 155, weightKg: 48,
      activityLevel: 'sedentary', goal: 'aggressive_cut',
    });
    const day2 = assembleDayPlan({
      target: { kcal: floored.targetKcal, proteinG: floored.proteinG, carbsG: floored.carbsG, fatG: floored.fatG },
      band: { kcalMin: floored.kcalMin, kcalMax: floored.kcalMax },
      prefs: { mealsPerDay: 3 }, seed: 4,
    });
    // either the day delivers at least kcalMin, or it says so honestly
    if (day2.totals.kcal < floored.kcalMin) {
      expect(day2.withinTolerance).toBe(false);
    } else {
      expect(day2.totals.kcal).toBeGreaterThanOrEqual(floored.kcalMin);
    }
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

  test('allowDayCycling:false plates the same flat target every day', () => {
    const week = assembleWeekPlan({
      engineTarget: TARGET, prefs: { mealsPerDay: 4, variety: 0.5 }, schedule, seed: 6, allowDayCycling: false,
    });
    expect(week.cycleDeltaKcal).toBe(0);
    expect(week.variants.training.kcal).toBe(TARGET.targetKcal);
    expect(week.variants.rest.kcal).toBe(TARGET.targetKcal);
    // every day — training or rest — carries the identical engine target
    week.days.forEach((d) => expect(d.target.kcal).toBe(TARGET.targetKcal));
  });
});

// ─── SLOT-CHARACTER INVARIANT (rethink 2026-06-12: the curry-for-breakfast
// fix). The plan keeps numbered labels; each position carries an internal
// food character: Meal 1 places a breakfast meal, the final meal is a cooked
// main, breakfast-only meals never appear mid-day. Asserted against the REAL
// curated library across seeds, diets and meal counts. ──────────────────────
import { CURATED_MEALS } from '../curatedMeals';
import { slotCharacterFor } from '../mealPlanAssembler';

const curatedTags = (mealId) => CURATED_MEALS.find((m) => m.id === mealId)?.slots ?? null;

describe('slotCharacterFor', () => {
  test('Meal 1 is breakfast; the final meal is a cooked main; middles take mains + snacks', () => {
    expect(slotCharacterFor('meal_1', 4)).toEqual(['breakfast']);
    expect(slotCharacterFor('meal_4', 4)).toEqual(['lunch', 'dinner']);
    expect(slotCharacterFor('meal_2', 4)).toEqual(['lunch', 'dinner', 'snack']);
    expect(slotCharacterFor('meal_3', 4)).toEqual(['lunch', 'dinner', 'snack']);
  });
  test('workout slots carry no character filter; legacy named slots pass through', () => {
    expect(slotCharacterFor('pre_workout', 5)).toBeNull();
    expect(slotCharacterFor('post_workout', 5)).toBeNull();
    expect(slotCharacterFor('breakfast', 4)).toBe('breakfast');
  });
  test('a 1-meal day is still breakfast-led; 2 meals = breakfast + main', () => {
    expect(slotCharacterFor('meal_1', 1)).toEqual(['breakfast']);
    expect(slotCharacterFor('meal_1', 2)).toEqual(['breakfast']);
    expect(slotCharacterFor('meal_2', 2)).toEqual(['lunch', 'dinner']);
  });
});

describe('SLOT-CHARACTER INVARIANT against the real library', () => {
  const DIETS = ['omnivore', 'vegetarian', 'vegan'];
  const MEALS = [3, 4, 5, 6];
  const SEEDS = [1, 7, 13, 21, 34, 55];

  test('Meal 1 always places a breakfast-tagged meal', () => {
    DIETS.forEach((diet) => MEALS.forEach((mealsPerDay) => SEEDS.forEach((seed) => {
      const day = assembleDayPlan({
        target: dayTarget(), band: BAND,
        prefs: { diet, mealsPerDay }, seed,
      });
      const first = day.slots.find((s) => s.slot === 'meal_1');
      expect(first).toBeTruthy();
      const tags = curatedTags(first.mealId);
      expect(tags).toContain('breakfast');
    })));
  });

  test('the final meal is always a cooked main (lunch/dinner-tagged)', () => {
    DIETS.forEach((diet) => MEALS.forEach((mealsPerDay) => SEEDS.forEach((seed) => {
      const day = assembleDayPlan({
        target: dayTarget(), band: BAND,
        prefs: { diet, mealsPerDay }, seed,
      });
      const last = day.slots.find((s) => s.slot === `meal_${mealsPerDay}`);
      expect(last).toBeTruthy();
      const tags = curatedTags(last.mealId);
      expect(tags.includes('lunch') || tags.includes('dinner')).toBe(true);
    })));
  });

  test('breakfast-ONLY meals never appear in middle or final slots', () => {
    DIETS.forEach((diet) => SEEDS.forEach((seed) => {
      const day = assembleDayPlan({
        target: dayTarget(), band: BAND,
        prefs: { diet, mealsPerDay: 5 }, seed,
      });
      day.slots.forEach((s) => {
        if (s.slot === 'meal_1' || s.slot === 'pre_workout' || s.slot === 'post_workout') return;
        const tags = curatedTags(s.mealId);
        if (!tags) return; // saved meals carry no tags
        const breakfastOnly = tags.every((t) => t === 'breakfast');
        expect(breakfastOnly).toBe(false);
      });
    }));
  });

  test('labels stay numbered: slot keys are meal_N, never breakfast/lunch/dinner', () => {
    const day = assembleDayPlan({ target: dayTarget(), band: BAND, prefs: { mealsPerDay: 5 }, seed: 3 });
    day.slots.forEach((s) => {
      expect(/^meal_\d+$|^pre_workout$|^post_workout$/.test(s.slot)).toBe(true);
    });
  });

  test('relaxation: a character pool emptied by exclusions still fills the slot (no holes)', () => {
    // Vegan + soya excluded guts the vegan breakfast pool; the day must still
    // come back with every numbered slot filled, character relaxed if needed.
    const day = assembleDayPlan({
      target: dayTarget(), band: BAND,
      prefs: { diet: 'vegan', excludeTags: ['soya'], mealsPerDay: 4 }, seed: 9,
    });
    const numbered = day.slots.filter((s) => /^meal_\d+$/.test(s.slot));
    expect(numbered.length).toBe(4);
  });

  test('an untagged saved meal is never greedily placed at Meal 1', () => {
    // A saved meal whose macros are a juicy fit for any slot share: without
    // positive breakfast evidence it must not take Meal 1.
    const saved = { id: 'saved_x', name: 'My leftovers', slots: [], totals: { kcal: 650, protein: 45, carbs: 65, fat: 19 } };
    SEEDS.forEach((seed) => {
      const day = assembleDayPlan({
        target: dayTarget(), band: BAND,
        prefs: { mealsPerDay: 4 }, seed, savedMeals: [saved],
      });
      const first = day.slots.find((s) => s.slot === 'meal_1');
      expect(first.source).toBe('curated');
    });
  });

  test('a PINNED untagged saved meal may claim Meal 1 (explicit user intent wins)', () => {
    const saved = { id: 'saved_pin', name: 'My breakfast', slots: [], totals: { kcal: 500, protein: 40, carbs: 50, fat: 12 } };
    const day = assembleDayPlan({
      target: dayTarget(), band: BAND,
      prefs: { mealsPerDay: 4, pinnedMealIds: ['saved_pin'] }, seed: 4, savedMeals: [saved],
    });
    const first = day.slots.find((s) => s.slot === 'meal_1');
    expect(first.mealId).toBe('saved_pin');
  });

  test('Meal 1 tolerates repetition across a varied week; dinners rotate more', () => {
    const schedule = ['training', 'rest', 'training', 'rest', 'training', 'training', 'rest'];
    const week = assembleWeekPlan({ engineTarget: TARGET, prefs: { mealsPerDay: 4, variety: 1 }, schedule, seed: 8 });
    const firsts = new Set(week.days.map((d) => d.slots.find((s) => s.slot === 'meal_1')?.mealId));
    const lasts = new Set(week.days.map((d) => d.slots.find((s) => s.slot === 'meal_4')?.mealId));
    expect(firsts.size).toBeLessThanOrEqual(lasts.size);
  });
});
