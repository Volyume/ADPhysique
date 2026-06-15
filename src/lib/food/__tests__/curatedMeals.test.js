/**
 * curatedMeals.test.js
 *
 * The curated clean-meal library + its diet/slot filters. Meals are now
 * defined as foods + grams; macros are COMPUTED from the staple-food table
 * (curatedFoods.js), so the tests resolve each meal and assert on the
 * computed result. Locks data integrity, food-key validity, the
 * lean/balanced fat spread, and the diet-inheritance + slot filtering.
 */
import {
  CURATED_MEALS, CURATED_FOODS, DIETS, dietAllows, mealItems, mealTotals, getCuratedCandidates,
} from '../curatedMeals';

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack', 'preworkout', 'postworkout'];

describe('library data integrity', () => {
  test('every meal is well-formed and references real foods', () => {
    for (const meal of CURATED_MEALS) {
      expect(meal.id).toMatch(/^curated_/);
      expect(typeof meal.name).toBe('string');
      expect(DIETS).toContain(meal.diet);
      expect(meal.slots.length).toBeGreaterThan(0);
      meal.slots.forEach(s => expect([...SLOTS, 'any']).toContain(s));
      expect(meal.components.length).toBeGreaterThan(0);
      for (const c of meal.components) {
        expect(CURATED_FOODS[c.food]).toBeTruthy(); // no typo'd / missing food keys
        expect(c.g).toBeGreaterThan(0);
      }
    }
  });

  test('ids are unique', () => {
    const ids = CURATED_MEALS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // UK bodybuilder research report (2026-06-15) + founder note: a meal named
  // after a protein must actually contain it (no "tuna" meal made with cod, and
  // vice versa), and tinned tuna is never a UK breakfast.
  const has = (meal, key) => meal.components.some(c => c.food === key);
  test('a meal named "tuna" uses tuna not cod, and a "cod" meal uses cod not tuna', () => {
    for (const meal of CURATED_MEALS) {
      const n = meal.name.toLowerCase();
      if (/\btuna\b/.test(n)) {
        expect(has(meal, 'tuna_water')).toBe(true);
        expect(has(meal, 'cod')).toBe(false);
      }
      if (/\bcod\b/.test(n)) {
        expect(has(meal, 'cod')).toBe(true);
        expect(has(meal, 'tuna_water')).toBe(false);
      }
    }
  });

  test('no breakfast meal contains tinned tuna (not a UK bodybuilder breakfast)', () => {
    for (const meal of CURATED_MEALS) {
      if (meal.slots.includes('breakfast')) expect(has(meal, 'tuna_water')).toBe(false);
    }
  });

  test('every meal resolves to items with computed macros', () => {
    for (const meal of CURATED_MEALS) {
      const items = mealItems(meal);
      expect(items.length).toBe(meal.components.length);
      for (const it of items) {
        expect(it.foodRef).toMatch(/^curated:/);
        expect(it.quantityG).toBeGreaterThan(0);
        expect(it.kcal).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('meals are protein-forward (>= ~15g per meal)', () => {
    for (const meal of CURATED_MEALS) {
      expect(mealTotals(mealItems(meal)).protein).toBeGreaterThanOrEqual(15);
    }
  });

  test('fat is a deliberate spread: lean options AND balanced fat-carrying meals', () => {
    const fats = CURATED_MEALS.map(meal => mealTotals(mealItems(meal)).fat);
    expect(fats.some(f => f <= 10)).toBe(true);
    expect(fats.some(f => f >= 15)).toBe(true);
    expect(Math.min(...fats)).toBeLessThanOrEqual(6);
  });

  test('vegan main meals anchor on tofu/legumes/soya, not seitan/tempeh', () => {
    // Published vegan competitor days of eating centre on tofu, legumes and
    // soya products; seitan appears rarely and tempeh barely at all
    // (2026-06-12 primary-source research, src-f-vegan-competitor-days.md).
    // The library must reflect that weighting, not over-index on seitan/tempeh.
    const has = (meal, food) => meal.components.some(c => c.food === food);
    const veganMains = CURATED_MEALS.filter(
      m => m.diet === 'vegan' && m.slots.some(s => s === 'lunch' || s === 'dinner'),
    );
    const seitanTempeh = veganMains.filter(m => has(m, 'seitan') || has(m, 'tempeh'));
    const tofuLegumeSoya = veganMains.filter(
      m => has(m, 'tofu_firm') || has(m, 'tvp_dry') || has(m, 'edamame')
        || has(m, 'lentils') || has(m, 'lentil_dahl') || has(m, 'chickpeas')
        || has(m, 'black_beans') || has(m, 'kidney_beans') || has(m, 'lentil_pasta'),
    );
    // Tofu/legume/soya anchored mains must clearly outnumber seitan/tempeh ones.
    expect(tofuLegumeSoya.length).toBeGreaterThan(seitanTempeh.length);
    // Seitan (once across published days) and tempeh (in none) each stay capped
    // as occasional options, so neither can creep back to over-weighting.
    expect(veganMains.filter(m => has(m, 'seitan')).length).toBeLessThanOrEqual(2);
    expect(veganMains.filter(m => has(m, 'tempeh')).length).toBeLessThanOrEqual(2);
  });

  test('covers every slot and all three diets', () => {
    const slotsCovered = new Set();
    const dietsCovered = new Set();
    for (const meal of CURATED_MEALS) {
      meal.slots.forEach(s => slotsCovered.add(s));
      dietsCovered.add(meal.diet);
    }
    SLOTS.forEach(s => expect(slotsCovered.has(s)).toBe(true));
    expect([...dietsCovered].sort()).toEqual(['omnivore', 'vegan', 'vegetarian']);
  });
});

describe('resolveComponent macros (computed, not hand-typed)', () => {
  test('scales per-100g by grams', () => {
    const [it] = mealItems({ components: [{ food: 'chicken_breast', g: 200 }] });
    // chicken_breast = 165/31/0/3.6 per 100g -> x2
    expect(it.kcal).toBe(330);
    expect(it.proteinG).toBe(62);
  });
});

describe('dietAllows (vegan ⊂ vegetarian ⊂ omnivore)', () => {
  test('omnivore eats anything', () => {
    expect(dietAllows('omnivore', 'vegan')).toBe(true);
    expect(dietAllows('omnivore', 'omnivore')).toBe(true);
  });
  test('vegetarian gets vegetarian + vegan, not omnivore', () => {
    expect(dietAllows('vegetarian', 'omnivore')).toBe(false);
    expect(dietAllows('vegetarian', 'vegan')).toBe(true);
  });
  test('vegan gets vegan only', () => {
    expect(dietAllows('vegan', 'vegetarian')).toBe(false);
    expect(dietAllows('vegan', 'vegan')).toBe(true);
  });
});

describe('getCuratedCandidates', () => {
  test('vegan user only ever gets vegan meals', () => {
    const c = getCuratedCandidates({ diet: 'vegan' });
    expect(c.length).toBeGreaterThan(0);
    c.forEach(meal => expect(meal.diet).toBe('vegan'));
  });

  test('slot filter only returns meals tagged for that slot', () => {
    const dinner = getCuratedCandidates({ diet: 'omnivore', slot: 'dinner' });
    expect(dinner.map(meal => meal.id)).not.toContain('curated_om_oats_whey_banana');
    dinner.forEach(meal => expect(meal.slots.includes('dinner') || meal.slots.includes('any')).toBe(true));
  });

  test('numbered meals (meal_N) get the whole diet-filtered library, not an empty list', () => {
    // The diary logs into 'meal_1', 'meal_2', ... which carry no time-of-day
    // character, so every curated meal should be a candidate (the regression
    // that left the Suggested tab empty after the slot model changed).
    const all = getCuratedCandidates({ diet: 'omnivore' });
    const meal1 = getCuratedCandidates({ diet: 'omnivore', slot: 'meal_1' });
    const meal3 = getCuratedCandidates({ diet: 'omnivore', slot: 'meal_3' });
    expect(meal1.length).toBe(all.length);
    expect(meal3.length).toBe(all.length);
    // A breakfast-tagged meal is available against a numbered slot.
    expect(meal1.map(m => m.id)).toContain('curated_om_oats_whey_banana');
    // Diet still applies on numbered slots.
    const veganMeal2 = getCuratedCandidates({ diet: 'vegan', slot: 'meal_2' });
    veganMeal2.forEach(meal => expect(meal.diet).toBe('vegan'));
  });

  test('candidates are engine-ready (computed totals + items)', () => {
    const [c] = getCuratedCandidates({ diet: 'omnivore', slot: 'lunch' });
    expect(c.totals.protein).toBeGreaterThan(0);
    expect(c.itemCount).toBe(c.items.length);
  });
});
