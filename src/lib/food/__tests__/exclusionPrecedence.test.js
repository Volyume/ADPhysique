/**
 * exclusionPrecedence.test.js — Campaign 17A job 6.
 *
 * FOUNDER LAW: "Allergens and explicit dietary exclusions outrank favourites,
 * frequent use, continuity, saved meals, recipes, macro fit, generic meal
 * quality, persistent replacement, personal preference. A previously loved
 * food that becomes excluded disappears from future suggestions/plans
 * immediately. Historical diary remains historical."
 *
 * And on fallbacks: "No fallback may quietly restore an allergen, explicit
 * exclusion, incompatible diet item or Don't Suggest because the preferred
 * candidate pool is exhausted. If no valid replacement exists: say so. Do not
 * break the user's rule."
 *
 * WHAT THIS SUITE PINS
 *
 * The precedence itself, against every ranked signal 17A introduced (a
 * favourite, a frequent food, a standing replacement, continuity) and against
 * the REAL curated library and the REAL engines. Then every fallback seam that
 * meal generation and replacement actually touch, each asked the same
 * question: when the preferred pool empties, does the rule survive?
 *
 * The two leaks it was written to catch, both live before 17A:
 *
 *   1. Saved meals entered the assembler's candidate pool UNFILTERED, so a
 *      meal the user built months ago could be placed into a fresh plan after
 *      they added the allergen it contains.
 *   2. The diary's Suggested tab built its single-food list from the user's
 *      favourites, frequents, recents and custom foods, honouring dislikes but
 *      NOT the standing exclusions - so a food they had loved and then
 *      excluded kept being suggested.
 */
import { CURATED_MEALS } from '../curatedMeals';
import { CURATED_FOODS } from '../curatedFoods';
import { ALLERGEN_TAGS, foodExcluded, foodRefExcluded, tagsOf, roleOf } from '../foodRoles';
import {
  foodAllowed, mealAllowed, savedMealAllowed,
  filterMealsByPreferences, filterSavedMealsByPreferences,
} from '../planPreferences';
import { assembleDayPlanBestOf } from '../mealPlanAssembler';
import { swapFoodInMeal, swapMealInPlan, findRoleAlternatives, applyStandingReplacements } from '../mealSwap';
import { reconcileDayToTarget } from '../planContinuity';

const TARGET = { kcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 };
const BAND = { kcalMin: 2160, kcalMax: 2640 };

const everyFoodKey = () => Object.keys(CURATED_FOODS);

describe('the one exclusion predicate answers at both levels', () => {
  test('a named food key is excluded', () => {
    expect(foodExcluded('white_rice', { excludeFoodKeys: ['white_rice'] })).toBe(true);
    expect(foodExcluded('white_rice', { excludeFoodKeys: ['pasta'] })).toBe(false);
  });

  test('an allergen tag excludes every food that carries it', () => {
    for (const tag of ALLERGEN_TAGS) {
      const bearers = everyFoodKey().filter((k) => tagsOf(k).includes(tag));
      for (const k of bearers) {
        expect(foodExcluded(k, { excludeTags: [tag] })).toBe(true);
        expect(foodAllowed(k, { excludeTags: [tag] })).toBe(false);
      }
    }
  });

  test('the ref-level predicate honours "never show me this" whatever kind of food it is', () => {
    // Campaign 17A job 6: a long-pressed exclusion is a statement about that
    // food, not about the catalogue it came from.
    for (const ref of ['curated:white_rice', 'off:501234567890', 'custom:abc-123']) {
      expect(foodRefExcluded(ref, { excludeFoodKeys: [ref] })).toBe(true);
    }
  });

  test('the ref-level predicate judges allergen tags on curated refs', () => {
    const milkFood = everyFoodKey().find((k) => tagsOf(k).includes('milk'));
    expect(milkFood).toBeTruthy();
    expect(foodRefExcluded(`curated:${milkFood}`, { excludeTags: ['milk'] })).toBe(true);
  });

  test('it does NOT claim to have judged a barcode or custom food', () => {
    // Honest limitation, stated rather than papered over: those refs carry no
    // tag data. The surfaces that must be stricter apply their own rule.
    expect(foodRefExcluded('off:501234567890', { excludeTags: ['milk'] })).toBe(false);
    expect(foodRefExcluded('custom:abc', { excludeTags: ['milk'] })).toBe(false);
  });

  test('an empty exclusion set excludes nothing', () => {
    for (const k of everyFoodKey()) expect(foodExcluded(k, {})).toBe(false);
  });
});

describe('an exclusion outranks EVERY preference signal 17A introduced', () => {
  // Each of these is a signal that legitimately steers a plan, and each must
  // lose to a rule about the user's safety.
  const excludedKey = 'white_rice';
  const prefs = { diet: 'omnivore', mealsPerDay: 4, excludeFoodKeys: [excludedKey] };

  test('a standing replacement pointing at an excluded food is refused', () => {
    const day = {
      slots: [{
        slot: 'meal_1', name: 'Test',
        components: [{ food: 'pasta', g: 120 }],
        totals: { kcal: 420, protein: 15, carbs: 85, fat: 2 },
      }],
      totals: { kcal: 420, protein: 15, carbs: 85, fat: 2 },
    };
    const res = applyStandingReplacements(day, {
      replacements: { pasta: excludedKey }, prefs,
    });
    expect(res.changed).toEqual([]);
    expect(res.day.slots[0].components.map((c) => c.food)).not.toContain(excludedKey);
  });

  test('a food swap can never bring an excluded food back in', () => {
    const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs, seed: 3 });
    for (const slot of day.slots) {
      if (!slot.components) continue;
      for (const c of slot.components) {
        for (const alt of findRoleAlternatives(c.food, prefs)) {
          expect(alt).not.toBe(excludedKey);
        }
        const res = swapFoodInMeal({
          components: slot.components, foodKeyOut: c.food, prefs, preferKey: excludedKey,
        });
        // Asking for it BY NAME still cannot produce it.
        if (res) expect(res.swap.foodIn).not.toBe(excludedKey);
      }
    }
  });

  test('a meal swap can never bring an excluded food back in', () => {
    const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs, seed: 4 });
    for (const slot of day.slots) {
      const res = swapMealInPlan({ day, slotKey: slot.slot, prefs });
      if (!res) continue;
      for (const cand of [res.replacement, ...(res.alternatives || [])]) {
        for (const c of cand.components || []) {
          expect(c.food).not.toBe(excludedKey);
        }
      }
    }
  });

  test('the continuity ladder can never bring an excluded food back in', () => {
    // Rung 3 swaps foods to reach a target. Reaching a number is not a reason
    // to break a rule.
    const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs, seed: 5 });
    const res = reconcileDayToTarget({
      day, targetKcal: Math.round(day.totals.kcal * 1.2), prefs, floorKcal: 1500,
    });
    for (const slot of res.day.slots) {
      for (const c of slot.components || []) expect(c.food).not.toBe(excludedKey);
    }
  });
});

describe('the ASSEMBLER honours every rule, on every seed, for every allergen', () => {
  test('no generated day ever contains an excluded food', () => {
    for (const key of ['white_rice', 'chicken_breast', 'oats']) {
      const prefs = { diet: 'omnivore', mealsPerDay: 4, excludeFoodKeys: [key] };
      for (const seed of [1, 7, 19, 33]) {
        const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs, seed });
        for (const slot of day.slots) {
          for (const c of slot.components || []) expect(c.food).not.toBe(key);
        }
      }
    }
  });

  test('no generated day ever contains a food carrying an excluded allergen', () => {
    for (const tag of ALLERGEN_TAGS) {
      const prefs = { diet: 'omnivore', mealsPerDay: 4, excludeTags: [tag] };
      for (const seed of [2, 11]) {
        const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs, seed });
        for (const slot of day.slots) {
          for (const c of slot.components || []) {
            expect(tagsOf(c.food)).not.toContain(tag);
          }
        }
      }
    }
  });

  test('THE FALLBACK SEAM: a starved pool leaves the slot EMPTY rather than breaking the rule', () => {
    // The assembler relaxes slot CHARACTER when a slot cannot be filled ("a
    // plan with a hole is worse than a plan with an off-character meal"). That
    // relaxation must never reach the exclusions: the pool it picks from is
    // already filtered, so an empty pool means an empty slot, never a
    // forbidden meal. Exclude enough to starve it and check.
    const prefs = {
      diet: 'vegan', mealsPerDay: 6,
      excludeTags: ['soya', 'gluten', 'nuts', 'sesame'],
    };
    const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs, seed: 8 });
    for (const slot of day.slots) {
      for (const c of slot.components || []) {
        expect(foodAllowed(c.food, prefs)).toBe(true);
        for (const tag of prefs.excludeTags) expect(tagsOf(c.food)).not.toContain(tag);
      }
    }
    // And when it cannot fill everything it SAYS so, rather than going quiet.
    if (day.unfilledSlots?.length) {
      expect(day.diagnosis?.hint).toBeTruthy();
      expect(day.withinTolerance).toBe(false);
    }
  });

  test('every meal the filter passes really is allowed, for every diet', () => {
    for (const diet of ['omnivore', 'vegetarian', 'pescatarian', 'vegan']) {
      const prefs = { diet };
      for (const m of filterMealsByPreferences(prefs, CURATED_MEALS)) {
        expect(mealAllowed(m, prefs)).toBe(true);
      }
    }
  });
});

describe('SAVED MEALS: a user-built meal is not a way around a rule', () => {
  const withItems = (refs) => ({
    id: 'sm1', name: 'My meal',
    items: refs.map((foodRef) => ({ foodRef, name: foodRef })),
    totals: { kcal: 600, protein: 40, carbs: 60, fat: 15 },
  });

  test('a saved meal containing a newly excluded food is kept out of generation', () => {
    // The founder's exact case: "If a saved meal/recipe contains a newly
    // excluded ingredient: do not silently serve it unchanged in a generated
    // future plan."
    const meal = withItems(['curated:white_rice', 'curated:chicken_breast']);
    expect(savedMealAllowed(meal, { diet: 'omnivore' })).toBe(true);
    expect(savedMealAllowed(meal, { diet: 'omnivore', excludeFoodKeys: ['white_rice'] })).toBe(false);
  });

  test('a saved meal containing an excluded ALLERGEN is kept out too', () => {
    const milkFood = everyFoodKey().find((k) => tagsOf(k).includes('milk'));
    const meal = withItems([`curated:${milkFood}`]);
    expect(savedMealAllowed(meal, { diet: 'omnivore' })).toBe(true);
    expect(savedMealAllowed(meal, { diet: 'omnivore', excludeTags: ['milk'] })).toBe(false);
  });

  test('a saved meal the app CANNOT see inside is kept out whenever a safety rule is live', () => {
    // A barcode item carries no tag data. With an allergen named, placing a
    // meal we cannot inspect would be the app taking a risk on the user's
    // behalf, in a plan they did not choose meal by meal.
    const opaque = withItems(['off:501234567890']);
    expect(savedMealAllowed(opaque, { diet: 'omnivore' })).toBe(true);
    expect(savedMealAllowed(opaque, { diet: 'omnivore', excludeTags: ['milk'] })).toBe(false);
    expect(savedMealAllowed(opaque, { diet: 'vegan' })).toBe(false);
  });

  test('a plain taste exclusion does NOT cost the user their opaque saved meals', () => {
    // Not a safety question, so the stricter rule does not apply: refusing
    // here would quietly remove meals they like for no safety reason.
    const opaque = withItems(['off:501234567890']);
    expect(savedMealAllowed(opaque, { diet: 'omnivore', excludeFoodKeys: ['white_rice'] })).toBe(true);
  });

  test('the filter is what the assembler pool actually uses', () => {
    const ok = withItems(['curated:chicken_breast']);
    const bad = { ...withItems(['curated:white_rice']), id: 'sm2' };
    const kept = filterSavedMealsByPreferences(
      { diet: 'omnivore', excludeFoodKeys: ['white_rice'] }, [ok, bad],
    );
    expect(kept.map((m) => m.id)).toEqual(['sm1']);
  });

  test('a saved meal never reaches a generated day when it breaks a rule', () => {
    // End to end against the REAL assembler: the forbidden saved meal is
    // offered to the pool and must not be placed.
    const prefs = { diet: 'omnivore', mealsPerDay: 4, excludeFoodKeys: ['white_rice'] };
    const bad = withItems(['curated:white_rice']);
    for (const seed of [1, 9, 21]) {
      const day = assembleDayPlanBestOf({
        target: TARGET, band: BAND, prefs, seed, savedMeals: [bad],
      });
      expect(day.slots.map((s) => s.mealId)).not.toContain('sm1');
    }
  });

  test('NOTHING IS DELETED: the gate is about generation, not the saved list', () => {
    // The founder is explicit: "Do not delete the user's historical saved
    // object without explicit product law." This module only ever ANSWERS a
    // question - it is pure, it imports no database and it calls nothing that
    // could remove a row.
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../planPreferences.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/require\(|from '\.\.\/database'|from '\.\/db'/);
    expect(code).not.toMatch(/delete|remove|DELETE/i);
  });
});

describe('SAY SO: when no valid replacement exists, the app does not invent one', () => {
  test('a food swap with the whole role excluded returns null rather than a forbidden food', () => {
    // THE FALLBACK SEAM. findRoleAlternatives offers the curated coach-style
    // switches FIRST and then falls back to every other same-role staple. That
    // fallback is exactly where a rule could quietly be lost, so: exclude the
    // entire role and confirm the swap refuses rather than reaching for
    // something forbidden.
    const day = assembleDayPlanBestOf({
      target: TARGET, band: BAND, prefs: { diet: 'omnivore', mealsPerDay: 4 }, seed: 6,
    });
    const slot = day.slots.find((s) => s.components?.length);
    const key = slot.components[0].food;
    const role = roleOf(key);
    const prefs = {
      diet: 'omnivore',
      excludeFoodKeys: everyFoodKey().filter((k) => roleOf(k) === role),
    };
    expect(findRoleAlternatives(key, prefs)).toEqual([]);
    expect(swapFoodInMeal({ components: slot.components, foodKeyOut: key, prefs })).toBeNull();
  });

  test('the role fallback itself never offers an excluded food', () => {
    // Every candidate the fallback can reach passes the same predicate.
    const prefs = { diet: 'omnivore', excludeFoodKeys: ['white_rice', 'pasta'] };
    for (const key of everyFoodKey()) {
      for (const alt of findRoleAlternatives(key, prefs)) {
        expect(foodAllowed(alt, prefs)).toBe(true);
      }
    }
  });

  test('a meal swap with the pool starved returns null rather than a forbidden meal', () => {
    const prefs = { diet: 'omnivore', mealsPerDay: 4 };
    const day = assembleDayPlanBestOf({ target: TARGET, band: BAND, prefs, seed: 6 });
    const starved = { diet: 'vegan', excludeTags: [...ALLERGEN_TAGS] };
    const res = swapMealInPlan({ day, slotKey: day.slots[0].slot, prefs: starved });
    if (res) {
      for (const c of res.replacement.components || []) {
        expect(foodAllowed(c.food, starved)).toBe(true);
      }
    } else {
      expect(res).toBeNull();
    }
  });

  test('the screens that call those swaps have a "no match" message to show', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const screen = fs.readFileSync(path.resolve(__dirname, '../../../screens/MealPlanScreen.js'), 'utf8');
    expect(screen).toMatch(/No close match for that food with your preferences/);
    expect(screen).toMatch(/No good alternative for this one with your preferences/);
  });
});

describe('the diary suggestion list honours the same rules', () => {
  test('the Suggested tab filters its OWN-FOOD list through the exclusion predicate', () => {
    // Campaign 17A job 6, leak 2: this list is built from the user's
    // favourites, frequents, recents and custom foods. It honoured dislikes
    // but not the standing exclusions, so "a previously loved food that
    // becomes excluded" kept being suggested.
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const screen = fs.readFileSync(path.resolve(__dirname, '../../../screens/FoodSearchScreen.js'), 'utf8');
    expect(screen).toMatch(/foodRefExcluded\(ref, suggestExclusions\)/);
    expect(screen).toMatch(/excludeFoodKeys: userProfile\?\.mealPlanExcludeFoods/);
    expect(screen).toMatch(/excludeTags: userProfile\?\.mealPlanExcludeTags/);
  });

  test('a favourite that becomes excluded is excluded, favourite or not', () => {
    // The predicate itself carries the precedence: there is no "unless it is
    // a favourite" branch anywhere in it.
    expect(foodRefExcluded('curated:white_rice', { excludeFoodKeys: ['white_rice'] })).toBe(true);
  });
});

describe('HISTORY IS UNTOUCHED: an exclusion is about the future only', () => {
  test('no exclusion path writes to food_entries or a rollup', () => {
    // Comments in these modules SAY they never touch history; this checks the
    // code rather than taking the comment's word for it.
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    for (const rel of ['../foodRoles.js', '../planPreferences.js', '../intent.js']) {
      const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/food_entries|daily_intake_rollups|recomputeRollup/);
      expect(code).not.toMatch(/INSERT|UPDATE|DELETE/);
    }
  });
});
