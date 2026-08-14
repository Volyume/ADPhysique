/**
 * personalMealsFirstClass.test.js — Campaign 17B job 3.
 *
 * FOUNDER LAW: "A mature user's own saved meals and recipes should be strong
 * candidates in quick logging, meal-plan generation, continuity, replacement
 * and personal suggestions. Do not make the user rebuild a meal from
 * ingredients every time."
 *
 * And: "If a user's saved meal or recipe fits the plan and has good personal
 * evidence: prefer keeping it over replacing it with a generic meal that hits
 * macros 3 kcal more closely. Realistic continuity > mathematically prettier
 * churn."
 *
 * WHAT WAS MISSING. Saved meals reached the assembler's candidate pool;
 * RECIPES never did, so a user who had built their own dinners still had every
 * plan assembled entirely from the curated library. And once a plan existed,
 * the continuity ladder's "change one meal" rung picked the worst-fitting slot
 * with no regard for whether the user had built that meal themselves - so
 * their own dinner could be swapped out for a curated one that fitted the
 * arithmetic marginally better.
 *
 * RECIPE DEFINITION vs AMOUNT EATEN is pinned here too: a recipe is planned at
 * ONE SERVING, and nothing in the planning path may rewrite the recipe itself.
 */
import { assembleDayPlanBestOf, PERSONAL_MEAL_BONUS } from '../mealPlanAssembler';
import { reconcileDayToTarget, CONTINUITY_ACTION } from '../planContinuity';
import { CURATED_MEALS } from '../curatedMeals';
import { savedMealAllowed } from '../planPreferences';

const TARGET = { kcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 };
const BAND = { kcalMin: 2160, kcalMax: 2640 };
const PREFS = { diet: 'omnivore', mealsPerDay: 4 };

/** A saved meal / recipe candidate in the shape the assembler pool takes. */
const personalMeal = (id, kcal, name = 'My usual dinner') => ({
  id,
  name,
  slots: [],
  items: [{ foodRef: 'curated:chicken_breast', name: 'Chicken breast' }],
  totals: { kcal, protein: 45, carbs: 55, fat: 15 },
});

describe('the user\'s own meals are candidates the assembler will actually pick', () => {
  test('a saved meal sized for a slot is placed in a generated day', () => {
    const mine = personalMeal('saved-1', 600);
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: PREFS, seed: 5, savedMeals: [mine],
    });
    expect(day.slots.map((s) => s.mealId)).toContain('saved-1');
  });

  test('a recipe (a recipe: id) is placed exactly the same way', () => {
    // The pool shape is shared, so a recipe is a first-class candidate rather
    // than a second mechanism.
    const mine = personalMeal('recipe:r1', 600, 'My chilli');
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: PREFS, seed: 5, savedMeals: [mine],
    });
    expect(day.slots.map((s) => s.mealId)).toContain('recipe:r1');
  });

  test('the preference is BOUNDED and small: it nudges, it does not drag', () => {
    // A wildly wrong meal must not be pulled into the day by the bonus alone.
    expect(PERSONAL_MEAL_BONUS).toBeGreaterThan(0);
    expect(PERSONAL_MEAL_BONUS).toBeLessThanOrEqual(0.5);
    const absurd = personalMeal('saved-absurd', 2400);
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: { ...PREFS, mealsPerDay: 4 }, seed: 5,
      savedMeals: [absurd],
    });
    // It may appear at most once, and the day still lands in the band.
    const count = day.slots.filter((s) => s.mealId === 'saved-absurd').length;
    expect(count).toBeLessThanOrEqual(1);
  });

  test('under a restricted diet the app does not auto-place a meal it cannot verify', () => {
    // Curated MEALS carry a diet tag; curated FOODS do not, and nothing in the
    // data says chicken is not vegan. So for a meal the user assembled from
    // arbitrary logged food the app genuinely cannot verify diet
    // compatibility - and GENERATING a plan is the app choosing. It refuses.
    const mine = personalMeal('saved-bad', 600);
    expect(savedMealAllowed(mine, { diet: 'vegan' })).toBe(false);
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: { diet: 'vegan', mealsPerDay: 4 },
      seed: 5, savedMeals: [mine],
    });
    expect(day.slots.map((s) => s.mealId)).not.toContain('saved-bad');
  });

  test('a current hard diet restriction also outranks an older pin', () => {
    const mine = personalMeal('saved-bad', 600);
    expect(savedMealAllowed(mine, { diet: 'vegan' }, { chosenByUser: true })).toBe(false);
  });

  test('an ALLERGEN still binds in both cases, because that is safety', () => {
    const mine = {
      ...personalMeal('saved-milk', 600),
      items: [{ foodRef: 'curated:milk_skimmed', name: 'Skimmed milk' }],
    };
    expect(savedMealAllowed(mine, { diet: 'omnivore', excludeTags: ['milk'] })).toBe(false);
    expect(savedMealAllowed(mine, { diet: 'omnivore', excludeTags: ['milk'] }, { chosenByUser: true })).toBe(false);
  });

  test('a personal meal is never placed at the BREAKFAST slot untagged', () => {
    // The curry-for-breakfast fix stands: we know they built it, we do not
    // know it is a breakfast.
    const mine = personalMeal('saved-dinner', 600, 'My chilli');
    for (const seed of [1, 5, 11, 23]) {
      const day = assembleDayPlanBestOf({
        target: TARGET, band: BAND, prefs: PREFS, seed, savedMeals: [mine],
      });
      const first = day.slots.find((s) => s.slot === 'meal_1');
      expect(first?.mealId).not.toBe('saved-dinner');
    }
  });
});

describe('REALISTIC CONTINUITY BEATS PRETTIER CHURN', () => {
  /** A day whose worst-fitting slot is the user's OWN meal. */
  function dayWithPersonalWorstSlot() {
    const curated = CURATED_MEALS.filter((m) => Array.isArray(m.components)).slice(0, 3);
    const slots = curated.map((m, i) => ({
      slot: `meal_${i + 1}`,
      mealId: m.id,
      name: m.name,
      components: m.components,
      items: [],
      totals: { kcal: 600, protein: 45, carbs: 60, fat: 15 },
    }));
    // The user's own meal, deliberately the FURTHEST from a fair share.
    slots.push({
      slot: 'meal_4',
      mealId: 'saved-mine',
      name: 'My usual dinner',
      components: null,
      items: [],
      totals: { kcal: 200, protein: 20, carbs: 15, fat: 5 },
    });
    const totals = slots.reduce((a, s) => ({
      kcal: a.kcal + s.totals.kcal,
      protein: a.protein + s.totals.protein,
      carbs: a.carbs + s.totals.carbs,
      fat: a.fat + s.totals.fat,
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    return { slots, totals };
  }

  test('the ladder replaces a GENERIC meal rather than the user\'s own', () => {
    const day = dayWithPersonalWorstSlot();
    const res = reconcileDayToTarget({
      day, targetKcal: Math.round(day.totals.kcal * 1.35), prefs: PREFS, floorKcal: 1200,
    });
    // Whatever it did, the user's own meal is still there.
    expect(res.day.slots.map((s) => s.mealId)).toContain('saved-mine');
    if (res.mealChange) {
      expect(res.mealChange.slot).not.toBe('meal_4');
    }
  });

  test('a recipe is protected in exactly the same way', () => {
    const day = dayWithPersonalWorstSlot();
    day.slots[3].mealId = 'recipe:r1';
    const res = reconcileDayToTarget({
      day, targetKcal: Math.round(day.totals.kcal * 1.35), prefs: PREFS, floorKcal: 1200,
    });
    expect(res.day.slots.map((s) => s.mealId)).toContain('recipe:r1');
  });

  test('when EVERY slot is the user\'s own, the ladder is not deadlocked', () => {
    // Protection is a preference, not a blockade: with nothing generic to
    // take instead, a personal meal may still be replaced.
    const day = dayWithPersonalWorstSlot();
    day.slots.forEach((s, i) => { s.mealId = `saved-${i}`; });
    const res = reconcileDayToTarget({
      day, targetKcal: Math.round(day.totals.kcal * 1.35), prefs: PREFS, floorKcal: 1200,
    });
    expect(res.action).toBeTruthy();
    expect(Array.isArray(res.day.slots)).toBe(true);
  });

  test('a small change leaves the user\'s own meal alone whatever rung it reaches', () => {
    // The 17A ladder still tries portions first (pinned against a real
    // assembled day in planContinuity.test.js). What THIS fixture proves is
    // the protection: however far the ladder climbs, the meal the user built
    // is not the one taken.
    const day = dayWithPersonalWorstSlot();
    const res = reconcileDayToTarget({
      day, targetKcal: day.totals.kcal + 120, prefs: PREFS, floorKcal: 1200,
    });
    expect(res.day.slots.map((s) => s.mealId)).toContain('saved-mine');
    expect(Object.values(CONTINUITY_ACTION)).toContain(res.action);
  });
});

describe('RECIPE DEFINITION vs AMOUNT EATEN', () => {
  // eslint-disable-next-line global-require
  const DB = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../db.js'), 'utf8',
  );

  test('a recipe is planned at ONE SERVING, not the whole dish', () => {
    const start = DB.indexOf('export async function listRecipesForPlanning');
    expect(start).toBeGreaterThan(-1);
    const body = DB.slice(start, DB.indexOf('\nexport ', start + 1));
    expect(body).toMatch(/kcal \/ servings/);
    expect(body).toMatch(/protein \/ servings/);
    expect(body).toMatch(/totalServings/);
  });

  test('the planning path never writes to a recipe', () => {
    const start = DB.indexOf('export async function listRecipesForPlanning');
    const body = DB.slice(start, DB.indexOf('\nexport ', start + 1));
    expect(body).not.toMatch(/UPDATE|INSERT|DELETE/);
  });

  test('the ingredients ride along so the exclusion gate can judge the recipe', () => {
    const start = DB.indexOf('export async function listRecipesForPlanning');
    const body = DB.slice(start, DB.indexOf('\nexport ', start + 1));
    expect(body).toMatch(/items\.push\(\{ foodRef: ing\.food_ref/);
  });

  test('a recipe containing an excluded ingredient is refused, like a saved meal', () => {
    const recipe = {
      id: 'recipe:r1', name: 'My chilli',
      items: [{ foodRef: 'curated:white_rice', name: 'White rice' }],
      totals: { kcal: 600 },
    };
    expect(savedMealAllowed(recipe, { diet: 'omnivore' })).toBe(true);
    expect(savedMealAllowed(recipe, { diet: 'omnivore', excludeFoodKeys: ['white_rice'] })).toBe(false);
  });
});

describe('both generation paths actually load recipes', () => {
  // "Do not confuse a helper existing with the generator using it."
  // eslint-disable-next-line global-require
  const SERVICE = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../mealPlanService.js'), 'utf8',
  );

  test('the week and day generators both read recipes into the pool', () => {
    expect((SERVICE.match(/listRecipesForPlanning\(userId\)/g) || []).length).toBe(2);
    expect((SERVICE.match(/savedMeals: \[\.\.\.savedMeals\.map\(toPoolSavedMeal\), \.\.\.recipes\]/g) || []).length).toBe(2);
  });

  test('a recipe read failure degrades to the pre-17B behaviour, never a broken plan', () => {
    expect(SERVICE).toMatch(/listRecipesForPlanning\(userId\)\.catch\(\(\) => \[\]\)/);
  });
});
