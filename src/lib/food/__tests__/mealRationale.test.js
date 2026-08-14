/**
 * mealRationale.test.js — Campaign 17B job 5.
 *
 * FOUNDER LAW: a user should be able to answer "Why these meals? Why did you
 * keep this? Why did you use this food? Why isn't that food appearing?" - from
 * ACTUAL STRUCTURED REASONS. "Do not reverse-engineer reasons from the meal
 * name."
 *
 * So the assembler stamps a CODE as it places each meal, and the copy is
 * rendered at read time. This suite pins both ends: that the real assembler
 * records the right code against the real curated library, and that the
 * wording stays plain.
 */
import { assembleDayPlanBestOf } from '../mealPlanAssembler';
import {
  MEAL_REASON, FOOD_REASON,
  explainMeal, explainFood, explainAbsence, explainDay,
} from '../mealRationale';

const TARGET = { kcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 };
const BAND = { kcalMin: 2160, kcalMax: 2640 };
const PREFS = { diet: 'omnivore', mealsPerDay: 4 };

const personalMeal = (id, name = 'My usual dinner') => ({
  id, name, slots: [],
  items: [{ foodRef: 'curated:chicken_breast', name: 'Chicken breast' }],
  totals: { kcal: 600, protein: 45, carbs: 55, fat: 15 },
});

describe('the REAL assembler records a reason for every meal it places', () => {
  test('a user with no history gets the honest "starting choice" code', () => {
    const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs: PREFS, seed: 5 });
    expect(day.slots.length).toBeGreaterThan(0);
    for (const s of day.slots) {
      expect(s.reason).toBe(MEAL_REASON.GENERIC_START);
    }
  });

  test('a saved meal is explained as a saved meal, not as a macro fit', () => {
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: PREFS, seed: 5, savedMeals: [personalMeal('saved-1')],
    });
    const mine = day.slots.find((s) => s.mealId === 'saved-1');
    expect(mine?.reason).toBe(MEAL_REASON.SAVED_MEAL);
  });

  test('a recipe is explained as a recipe', () => {
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: PREFS, seed: 5, savedMeals: [personalMeal('recipe:r1', 'My chilli')],
    });
    const mine = day.slots.find((s) => s.mealId === 'recipe:r1');
    expect(mine?.reason).toBe(MEAL_REASON.RECIPE);
  });

  test('once the user HAS history, curated picks read as a macro fit, not inexperience', () => {
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: PREFS, seed: 5, savedMeals: [personalMeal('saved-1')],
    });
    const curated = day.slots.filter((s) => s.source !== 'saved');
    expect(curated.length).toBeGreaterThan(0);
    for (const s of curated) expect(s.reason).toBe(MEAL_REASON.MACRO_FIT);
  });

  test('a pinned meal says so, and that beats every other reason', () => {
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, seed: 5,
      prefs: { ...PREFS, pinnedMealIds: ['saved-1'] },
      savedMeals: [personalMeal('saved-1')],
    });
    const mine = day.slots.find((s) => s.mealId === 'saved-1');
    expect(mine?.reason).toBe(MEAL_REASON.PINNED);
  });

  test('the reason is a CODE, never a sentence', () => {
    const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs: PREFS, seed: 9 });
    for (const s of day.slots) {
      expect(Object.values(MEAL_REASON)).toContain(s.reason);
      expect(s.reason).not.toMatch(/\s/);
    }
  });
});

describe('the copy answers the founder\'s four questions', () => {
  test('why did you keep this', () => {
    expect(explainMeal(MEAL_REASON.PINNED)).toBe('You asked us to keep this one.');
  });

  test('why these meals: their own meals lead the summary', () => {
    const slots = [
      { reason: MEAL_REASON.SAVED_MEAL }, { reason: MEAL_REASON.MACRO_FIT },
      { reason: MEAL_REASON.MACRO_FIT }, { reason: MEAL_REASON.MACRO_FIT },
    ];
    expect(explainDay(slots)).toMatch(/one of your own meals/i);
  });

  test('why these meals, with nothing to go on: it says so plainly', () => {
    const slots = Array.from({ length: 4 }, () => ({ reason: MEAL_REASON.GENERIC_START }));
    expect(explainDay(slots)).toMatch(/do not have enough history yet/i);
  });

  test('why did you use this food', () => {
    expect(explainFood(FOOD_REASON.PERSISTENT_REPLACEMENT)).toBe('You asked us to use this instead.');
    expect(explainFood(FOOD_REASON.TARGET_CHANGE)).toMatch(/match your new target/i);
  });

  test('why is that food not appearing', () => {
    expect(explainAbsence({ excludedByUser: true })).toBe('You asked us not to suggest this food.');
    expect(explainAbsence({ excludedByAllergen: true })).toMatch(/allergens you avoid/i);
    expect(explainAbsence({ excludedByDiet: true })).toMatch(/diet you have chosen/i);
    expect(explainAbsence({})).toBeNull();
  });

  test('an unrecorded reason renders NOTHING, rather than a guess', () => {
    expect(explainMeal(null)).toBeNull();
    expect(explainMeal('made_up_code')).toBeNull();
    expect(explainFood(undefined)).toBeNull();
    expect(explainDay([])).toBeNull();
  });
});

describe('plain English', () => {
  const all = [
    ...Object.values(MEAL_REASON).map(explainMeal),
    ...Object.values(FOOD_REASON).map(explainFood),
    explainAbsence({ excludedByUser: true }),
    explainAbsence({ excludedByAllergen: true }),
    explainAbsence({ excludedByDiet: true }),
    explainDay([{ reason: MEAL_REASON.PINNED }]),
    explainDay([{ reason: MEAL_REASON.GENERIC_START }]),
  ].filter(Boolean);

  test('none of the banned vocabulary reaches the user', () => {
    for (const line of all) {
      expect(line).not.toMatch(/preference confidence|nutrition provenance|macro optimisation|adherence phenotype|adaptive TDEE|energy availability/i);
    }
  });

  test('no em dash, and no food is called best or clean', () => {
    for (const line of all) {
      expect(line).not.toContain('—');
      expect(line).not.toMatch(/\bbest\b|\bclean\b|\boptimal\b/i);
    }
  });
});

describe('the user actually SEES it', () => {
  // "Do not confuse an explanation function existing with the user seeing it."
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../../screens/MealPlanScreen.js'), 'utf8',
  );

  test('the day-level line is rendered', () => {
    expect(SCREEN).toMatch(/const dayReason = useMemo\(\(\) => explainDay\(day\?\.slots\)/);
    expect(SCREEN).toMatch(/\{dayReason \? <Text style=\{\[styles\.dayReason/);
  });

  test('the per-meal line is rendered from the slot\'s own code', () => {
    expect(SCREEN).toMatch(/explainMeal\(slot\.reason\)/);
  });

  test('and only when a reason was recorded', () => {
    expect(SCREEN).toMatch(/\{explainMeal\(slot\.reason\) \? \(/);
  });
});
