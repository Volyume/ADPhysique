/**
 * mealRationaleFood.test.js — Campaign 17B job 5, the half that was missing.
 *
 * FOUNDER LAW: a user should be able to understand "why these meals, why did
 * you keep this, WHY DID YOU USE THIS FOOD, and WHY ISN'T THAT FOOD
 * APPEARING?" - from actual structured truth, never reverse-engineered from a
 * meal name. And: "If explanation helpers exist without a screen consumer,
 * that is NOT delivered."
 *
 * WHAT WAS MISSING. `FOOD_REASON` and `explainAbsence` existed and nothing in
 * the app produced or rendered either: two of the founder's four questions had
 * a vocabulary and no answer. The meal-level half (explainMeal / explainDay)
 * was already live and is pinned in mealRationale.test.js.
 *
 * WHAT THIS SUITE PINS. That the REAL engines stamp the code at the moment the
 * reason is genuinely known, that the absence reasons come from the same
 * predicates that did the excluding, and that both reach the screen.
 */
import { applyStandingReplacements, excludedRoleAlternatives } from '../mealSwap';
import { applyMacroDeltaToPlan } from '../planEdit';
import { FOOD_REASON, explainFood, explainAbsence } from '../mealRationale';
import { resolveComponent } from '../curatedFoods';
import { mealTotals } from '../curatedMeals';

const PREFS = { diet: 'omnivore', mealsPerDay: 4 };

const buildSlot = (slot, components) => {
  const items = components.map((c) => resolveComponent(c.food, c.g)).filter(Boolean);
  return { slot, components, items, totals: mealTotals(items) };
};
const DAY = () => ({
  slots: [
    buildSlot('meal_1', [{ food: 'chicken_breast', g: 150 }, { food: 'white_rice', g: 250 }]),
    buildSlot('meal_2', [{ food: 'oats', g: 80 }, { food: 'whey', g: 30 }]),
  ],
});

describe('WHY DID YOU USE THIS FOOD: the code is stamped where the reason is known', () => {
  test('a standing replacement stamps itself on the food it put there', () => {
    const { day, changed } = applyStandingReplacements(DAY(), {
      replacements: { chicken_breast: 'turkey_breast' }, prefs: PREFS,
    });
    expect(changed.length).toBe(1);
    const swapped = day.slots[0].components.find((c) => c.food === 'turkey_breast');
    expect(swapped.foodReason).toBe(FOOD_REASON.PERSISTENT_REPLACEMENT);
  });

  test('and stamps NOTHING on the foods it did not touch', () => {
    const { day } = applyStandingReplacements(DAY(), {
      replacements: { chicken_breast: 'turkey_breast' }, prefs: PREFS,
    });
    expect(day.slots[0].components.find((c) => c.food === 'white_rice').foodReason).toBeUndefined();
    for (const c of day.slots[1].components) expect(c.foodReason).toBeUndefined();
  });

  test('a portion moved for a changed target says exactly that', () => {
    const { plan, change } = applyMacroDeltaToPlan({ plan: DAY(), adjustmentKcal: 250, floorKcal: 1200 });
    expect(change.edits.length).toBeGreaterThan(0);
    const stamped = plan.slots
      .flatMap((s) => s.components)
      .filter((c) => c.foodReason === FOOD_REASON.TARGET_CHANGE);
    expect(stamped.length).toBe(change.edits.length);
  });

  test('THE LAW: the reason is a CODE, never a sentence, and never a name', () => {
    const { day } = applyStandingReplacements(DAY(), {
      replacements: { white_rice: 'pasta' }, prefs: PREFS,
    });
    const c = day.slots[0].components.find((x) => x.foodReason);
    expect(Object.values(FOOD_REASON)).toContain(c.foodReason);
    expect(c.foodReason).not.toMatch(/\s/);
  });

  test('an unrecorded reason renders nothing at all', () => {
    expect(explainFood(undefined)).toBeNull();
    expect(explainFood('invented_code')).toBeNull();
  });

  test('a refused replacement stamps nothing: no reason for a thing that did not happen', () => {
    // A rule pointing at a food the preferences forbid is refused outright
    // (17A job 3), so there is no swap and therefore no reason to record.
    const { day, changed } = applyStandingReplacements(DAY(), {
      replacements: { chicken_breast: 'turkey_breast' },
      prefs: { ...PREFS, excludeFoodKeys: ['turkey_breast'] },
    });
    expect(changed).toEqual([]);
    for (const s of day.slots) for (const c of s.components) expect(c.foodReason).toBeUndefined();
  });
});

describe('WHY ISN\'T THAT FOOD APPEARING', () => {
  test('a food the user asked us not to suggest is named, with their own reason', () => {
    const out = excludedRoleAlternatives('white_rice', { ...PREFS, excludeFoodKeys: ['pasta'] });
    const hit = out.find((x) => x.foodKey === 'pasta');
    expect(hit).toBeTruthy();
    expect(hit.excludedByUser).toBe(true);
    expect(explainAbsence(hit)).toBe('You asked us not to suggest this food.');
  });

  test('an allergen exclusion is reported as an allergen, not as a preference', () => {
    const out = excludedRoleAlternatives('white_rice', { ...PREFS, excludeTags: ['cereals_gluten'] });
    expect(out.length).toBeGreaterThan(0);
    for (const x of out) {
      expect(x.excludedByUser).toBe(false);
      expect(x.excludedByAllergen).toBe(true);
      expect(explainAbsence(x)).toMatch(/allergens you avoid/i);
    }
  });

  test('the user\'s own instruction outranks the allergen wording when both apply', () => {
    const out = excludedRoleAlternatives('white_rice', {
      ...PREFS, excludeFoodKeys: ['pasta'], excludeTags: ['cereals_gluten'],
    });
    const pasta = out.find((x) => x.foodKey === 'pasta');
    expect(explainAbsence(pasta)).toMatch(/You asked us not to suggest/);
  });

  test('NO REASON IS INVENTED: a food dropped on macro fit is simply not listed', () => {
    // With no exclusions at all there is nothing honest to say, so nothing is
    // said - rather than explaining every food the ranker did not choose.
    expect(excludedRoleAlternatives('white_rice', PREFS)).toEqual([]);
  });

  test('NO DIET REASON, because food-level diet is not knowable from the data', () => {
    // Curated MEALS carry a diet tag; curated FOODS do not. Claiming a diet
    // reason here would be a claim the data cannot support.
    const out = excludedRoleAlternatives('white_rice', { ...PREFS, diet: 'vegan', excludeFoodKeys: ['pasta'] });
    for (const x of out) expect(x.excludedByDiet).toBeUndefined();
  });

  test('an unknown food asks nothing and answers nothing', () => {
    expect(excludedRoleAlternatives('not_a_food', PREFS)).toEqual([]);
    expect(excludedRoleAlternatives(null, PREFS)).toEqual([]);
  });
});

describe('the user actually SEES both of them', () => {
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../../screens/MealPlanScreen.js'), 'utf8',
  );

  test('the food-level reason is rendered from the component\'s own code', () => {
    expect(SCREEN).toMatch(/const foodWhy = explainFood\(slot\.components\?\.\[i\]\?\.foodReason\)/);
    expect(SCREEN).toMatch(/\{foodWhy \? \(/);
    expect(SCREEN).toMatch(/\{foodWhy\}<\/Text>/);
  });

  test('the swap sheet computes and renders the absences', () => {
    expect(SCREEN).toMatch(/excludedRoleAlternatives\(foodKey, plan\.prefs\)/);
    expect(SCREEN).toMatch(/\.map\(\(x\) => \(\{ \.\.\.x, why: explainAbsence\(x\) \}\)\)/);
    expect(SCREEN).toMatch(/foodSwapSheet\.absent\.map\(\(a\) =>/);
  });

  test('and only ever when there is something to say', () => {
    expect(SCREEN).toMatch(/\.filter\(\(x\) => x\.why\)/);
    expect(SCREEN).toMatch(/\{\(foodSwapSheet\.absent \|\| \[\]\)\.length \? \(/);
  });
});
