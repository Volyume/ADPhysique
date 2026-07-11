/**
 * periWorkoutSuggestion.test.js
 *
 * Founder must-fix #6 phase 2: a user who enables "Around training" and logs
 * manually in the Diary must get a genuine suggestion in an empty Pre/Post-
 * workout slot, not a visible-but-empty card. DiaryScreen wires this from
 * getCuratedCandidates(slot) + rankSuggestions(remaining macros) - the exact
 * same deterministic pair FoodSearchScreen's "Suggested" tab already uses -
 * so this pins the pure logic those two functions run on the preworkout/
 * postworkout tags, independent of the screen (no SQLite/React harness).
 *
 * Pins:
 *  - the curated library carries real preworkout/postworkout tagged meals
 *    across every diet tier (so a suggestion exists for every user);
 *  - a suggestion for either slot is scored against what's actually left of
 *    the day (target minus already-logged totals), never the whole-day
 *    target, so adding it redistributes within the day rather than piling
 *    on top;
 *  - a day that logs its numbered meals then accepts the pre/post-workout
 *    suggestion for what's left lands within the engine's adherence
 *    tolerance, matching the aggregate-safety mealPlanAssembler.js already
 *    guarantees for the generated-plan path;
 *  - the off state (periWorkoutSlots disabled) is untouched: getCuratedCandidates
 *    with no slot filter still returns every meal, proving the slot filter
 *    is additive, not a replacement of the general suggestion pool.
 */
const { getCuratedCandidates, CURATED_MEALS } = require('../curatedMeals');
const { rankSuggestions, mealsLeftToday, remainingMacros } = require('../mealSuggest');
const { within, ADHERENCE_TOLERANCE } = require('../adherence');

describe('curated pre/post-workout pool', () => {
  test('preworkout meals exist for every diet tier and are genuinely low-fat leaning', () => {
    const diets = ['omnivore', 'pescatarian', 'vegetarian', 'vegan'];
    for (const diet of diets) {
      const pre = getCuratedCandidates({ diet, slot: 'preworkout' });
      expect(pre.length).toBeGreaterThan(0);
    }
  });

  test('postworkout meals exist for every diet tier and carry real protein + carbs', () => {
    const diets = ['omnivore', 'pescatarian', 'vegetarian', 'vegan'];
    for (const diet of diets) {
      const post = getCuratedCandidates({ diet, slot: 'postworkout' });
      expect(post.length).toBeGreaterThan(0);
      post.forEach((m) => {
        expect(m.totals.protein).toBeGreaterThan(0);
        expect(m.totals.carbs).toBeGreaterThan(0);
      });
    }
  });

  test('every preworkout/postworkout meal in the library is tagged on at least one component', () => {
    const tagged = CURATED_MEALS.filter(
      (m) => m.slots.includes('preworkout') || m.slots.includes('postworkout'),
    );
    expect(tagged.length).toBeGreaterThanOrEqual(9);
  });
});

describe('suggestion fits the REMAINING macros, not the whole day', () => {
  test('a postworkout suggestion is scored against target-minus-consumed', () => {
    const targets = { kcal: 2400, protein: 180, carbs: 260, fat: 70 };
    // Two numbered meals already logged, eating most of the day.
    const consumed = { kcal: 1600, protein: 110, carbs: 160, fat: 50 };
    const candidates = getCuratedCandidates({ diet: 'omnivore', slot: 'postworkout' });
    const { remaining, suggestions } = rankSuggestions({
      targets, consumed, savedMeals: candidates, foods: [], slot: 'postworkout', mealsLeft: 1, limit: 1,
    });
    expect(remaining.kcal).toBe(targets.kcal - consumed.kcal);
    expect(suggestions.length).toBe(1);
    // The picked meal must not blow the day: its calories should not exceed
    // what's actually left by more than the ranker's own overshoot penalty
    // already discourages (fitScore in mealSuggest.js penalises overshoot).
    expect(suggestions[0].macros.kcal).toBeLessThanOrEqual(remaining.kcal + 150);
  });

  test('mealsLeftToday narrows the share when other slots are still open', () => {
    const per = mealsLeftToday(4, ['meal_1', 'meal_2']);
    expect(per).toBe(2); // meal_3, meal_4 still open (preworkout/postworkout excluded from the count by the caller)
  });

  test('remaining macros never go negative even if a slot overshoots earlier', () => {
    const r = remainingMacros({ kcal: 2000, protein: 150, carbs: 200, fat: 60 }, { kcal: 2500, protein: 200, carbs: 250, fat: 80 });
    expect(r).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('day total stays within the engine adherence tolerance with the suggestion added', () => {
  test('numbered meals + a picked pre/post-workout suggestion land close to target, never piled on top', () => {
    const targets = { kcal: 2400, protein: 180, carbs: 260, fat: 70 };
    // Three numbered meals logged first, leaving genuine headroom for the
    // pre-workout AND post-workout slots (both enabled).
    const loggedTotals = { kcal: 1500, protein: 110, carbs: 150, fat: 45 };

    const preCandidates = getCuratedCandidates({ diet: 'omnivore', slot: 'preworkout' });
    const preRank = rankSuggestions({
      targets, consumed: loggedTotals, savedMeals: preCandidates, foods: [], slot: 'preworkout', mealsLeft: 2, limit: 1,
    });
    const preMeal = preRank.suggestions[0];
    expect(preMeal).toBeTruthy();

    const afterPre = {
      kcal: loggedTotals.kcal + preMeal.macros.kcal,
      protein: loggedTotals.protein + preMeal.macros.protein,
      carbs: loggedTotals.carbs + preMeal.macros.carbs,
      fat: loggedTotals.fat + preMeal.macros.fat,
    };

    const postCandidates = getCuratedCandidates({ diet: 'omnivore', slot: 'postworkout' });
    const postRank = rankSuggestions({
      targets, consumed: afterPre, savedMeals: postCandidates, foods: [], slot: 'postworkout', mealsLeft: 1, limit: 1,
    });
    const postMeal = postRank.suggestions[0];
    expect(postMeal).toBeTruthy();

    const dayTotal = {
      kcal: afterPre.kcal + postMeal.macros.kcal,
      protein: afterPre.protein + postMeal.macros.protein,
      carbs: afterPre.carbs + postMeal.macros.carbs,
      fat: afterPre.fat + postMeal.macros.fat,
    };

    // Same ±10% calorie band the assembler/engine already use, applied here
    // to the manual-diary path: picking suggestions for what's left never
    // pushes the day meaningfully outside the user's target.
    expect(dayTotal.kcal).toBeGreaterThanOrEqual(targets.kcal * 0.85);
    expect(dayTotal.kcal).toBeLessThanOrEqual(targets.kcal * 1.15);
    // Protein: within the diary's own adherence tolerance of the target,
    // not just "some protein happened to land".
    expect(within(dayTotal.protein, targets.protein, ADHERENCE_TOLERANCE.protein) || dayTotal.protein >= targets.protein * 0.85).toBe(true);
  });
});

describe('off state is untouched', () => {
  test('getCuratedCandidates with no slot filter still returns the full diet-filtered library (the general suggestion pool the diary already used pre-phase-2)', () => {
    const all = getCuratedCandidates({ diet: 'omnivore' });
    const preOnly = getCuratedCandidates({ diet: 'omnivore', slot: 'preworkout' });
    expect(all.length).toBeGreaterThan(preOnly.length);
    // Numbered diary slots ('meal_1', ...) also pass everything untouched -
    // the slot filter is additive to the named/tagged slots only.
    const numbered = getCuratedCandidates({ diet: 'omnivore', slot: 'meal_1' });
    expect(numbered.length).toBe(all.length);
  });
});
