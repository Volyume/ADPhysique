/**
 * coherence.test.js — Campaign 17B job 8.
 *
 * FOUNDER LAW: "Trace the touched surfaces: Diary, Food Search, Saved Meals,
 * Recipes, Meal Plan, Food Insights, Calorie Bank. Ensure terminology and
 * behaviour agree."
 *
 * The worked example, which is the whole shape of this job:
 *
 *   "if a food is 'Don't suggest': search/history may still show the
 *    historical food where appropriate, but generated suggestions/plans must
 *    not recommend it. Do not hide history to make the UI look consistent."
 *
 * WHAT WAS ACTUALLY WRONG. Volyume had TWO ways to say "don't suggest this"
 * and obeyed one of them. The profile avoid list (set from a meal plan)
 * reached generation; the same instruction given on a food's own row in Food
 * Search did not, so the meal plan carried on suggesting it. And the intent
 * layer's own predicate compared a stored REF against a bare KEY, so a
 * curated dislike never matched at all.
 *
 * WHAT THIS SUITE PINS. Both halves, in both directions: one instruction is
 * obeyed by every choosing path, and no reading path hides anything.
 */
import { isFoodExcluded, loadFoodIntentState } from '../intent';
import { withDoNotSuggest, preferencesFromProfile } from '../mealPlanService';
import { getCuratedCandidates, CURATED_MEALS } from '../curatedMeals';
import { foodExcluded, foodRefExcluded } from '../foodRoles';

const state = ({ excluded = [], dislikes = [] } = {}) => ({
  swaps: [],
  favourites: new Set(),
  dislikes: new Set(dislikes),
  frequents: new Map(),
  excludedFoodKeys: new Set(excluded),
  excludedTags: new Set(),
});

describe('ONE INSTRUCTION, ONE NAME', () => {
  test('THE BUG: a curated dislike is stored as a REF and asked about as a KEY', () => {
    // getDislikes returns rows of food_ref ('curated:oats'); every selecting
    // surface asks about the bare curated key. This silently never matched.
    expect(isFoodExcluded(state({ dislikes: ['curated:oats'] }), 'oats')).toBe(true);
  });

  test('the profile avoid list still works, unchanged', () => {
    expect(isFoodExcluded(state({ excluded: ['oats'] }), 'oats')).toBe(true);
  });

  test('a non-curated dislike matches on its own ref', () => {
    expect(isFoodExcluded(state({ dislikes: ['off:50084517'] }), 'off:50084517')).toBe(true);
  });

  test('and nothing else becomes excluded by accident', () => {
    const s = state({ dislikes: ['curated:oats'] });
    expect(isFoodExcluded(s, 'white_rice')).toBe(false);
    expect(isFoodExcluded(s, 'curated')).toBe(false);
    expect(isFoodExcluded(s, '')).toBe(false);
    expect(isFoodExcluded(null, 'oats')).toBe(false);
  });
});

describe('every CHOOSING path obeys it', () => {
  test('the dislike reaches the generation preference set, in both currencies', () => {
    const prefs = withDoNotSuggest(
      preferencesFromProfile({ dietPreference: 'omnivore', mealPlanExcludeFoods: ['peanut_butter'] }),
      [{ food_ref: 'curated:oats' }],
    );
    // Both, because foodExcluded takes a key and foodRefExcluded takes a ref.
    expect(prefs.excludeFoodKeys).toContain('oats');
    expect(prefs.excludeFoodKeys).toContain('curated:oats');
    // And the profile's own entry survives.
    expect(prefs.excludeFoodKeys).toContain('peanut_butter');
  });

  test('the two exclusion predicates both agree once it is there', () => {
    const prefs = withDoNotSuggest(
      preferencesFromProfile({ dietPreference: 'omnivore' }),
      ['curated:oats'],
    );
    expect(foodExcluded('oats', prefs)).toBe(true);
    expect(foodRefExcluded('curated:oats', prefs)).toBe(true);
  });

  test('THE PRODUCT RESULT: no curated meal containing it can be suggested', () => {
    const withOats = CURATED_MEALS.filter((m) => m.components.some((c) => c.food === 'oats'));
    expect(withOats.length).toBeGreaterThan(0); // the fixture is meaningful
    const prefs = withDoNotSuggest(
      preferencesFromProfile({ dietPreference: 'omnivore' }),
      ['curated:oats'],
    );
    const candidates = getCuratedCandidates({ diet: 'omnivore', ...prefs });
    for (const m of candidates) {
      expect(m.items.some((i) => i.foodRef === 'curated:oats')).toBe(false);
    }
    // And it genuinely removed something, rather than passing vacuously.
    const unfiltered = getCuratedCandidates({ diet: 'omnivore' });
    expect(candidates.length).toBeLessThan(unfiltered.length);
  });

  test('no dislikes changes nothing at all', () => {
    const base = preferencesFromProfile({ dietPreference: 'vegan' });
    expect(withDoNotSuggest(base, [])).toBe(base);
    expect(withDoNotSuggest(base, null)).toBe(base);
  });

  test('a null profile still refuses to plan: this never softens that', () => {
    // Campaign 1 P0-7 D14. Adding exclusions must not manufacture a
    // permissive preference set where there was none.
    expect(withDoNotSuggest(preferencesFromProfile(null), ['curated:oats'])).toBeNull();
  });

  test('rubbish rows are ignored rather than poisoning the exclusion list', () => {
    const prefs = withDoNotSuggest(
      preferencesFromProfile({ dietPreference: 'omnivore' }),
      [null, {}, { food_ref: '' }, 42, { food_ref: 'curated:oats' }],
    );
    expect(prefs.excludeFoodKeys).toEqual(expect.arrayContaining(['oats', 'curated:oats']));
    expect(prefs.excludeFoodKeys.filter(Boolean).length).toBe(prefs.excludeFoodKeys.length);
  });
});

describe('DO NOT HIDE HISTORY TO MAKE THE UI LOOK CONSISTENT', () => {
  // eslint-disable-next-line global-require
  const read = (p) => require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, p), 'utf8',
  );

  test('the diary reader has no exclusion filter of any kind', () => {
    const db = read('../db.js');
    const start = db.indexOf('export async function getFoodEntriesForRange');
    const body = db.slice(start, start + 1400);
    expect(body).not.toMatch(/exclude|dislike/i);
  });

  test('search results are not filtered by it either', () => {
    const screen = read('../../../screens/FoodSearchScreen.js');
    // The ONLY places the dislike set narrows anything are the two
    // suggestion candidate builders, never the browse/search result lists.
    const guarded = screen.match(/if \(dislikeRefs\.has\(ref\)\) continue;/g) || [];
    expect(guarded.length).toBe(2);
    expect(screen).not.toMatch(/results\.filter\([^)]*dislike/);
  });

  test('a food told "don\'t suggest" is still re-loggable from history', () => {
    // The row keeps its normal press behaviour; only its suggestion standing
    // changes. Pinned as a comment-free source fact.
    const row = read('../../../components/food/FoodRow.js');
    expect(row).toMatch(/the user can deliberately log a disliked food/);
  });

  test('Insights counts what was eaten, whatever its suggestion standing', () => {
    const insights = read('../insights.js');
    expect(insights).not.toMatch(/exclude|dislike|suggest/i);
  });
});

describe('the words agree across the surfaces', () => {
  // eslint-disable-next-line global-require
  const read = (p) => require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, p), 'utf8',
  );
  const MEAL_PLAN = read('../../../screens/MealPlanScreen.js');
  const SEARCH = read('../../../screens/FoodSearchScreen.js');
  const EDITOR = read('../../../components/food/DietaryPreferencesEditor.js');
  const FAQ = read('../../../screens/SettingsFaqScreen.js');

  test('the meal plan asks in the same language the search row answers in', () => {
    expect(MEAL_PLAN).toContain("'Stop suggesting this?'");
    expect(MEAL_PLAN).toContain('"Don\'t suggest it"');
    expect(SEARCH).toContain('We will not suggest this.');
  });

  test('and every one of them says the history is kept', () => {
    expect(MEAL_PLAN).toMatch(/You can still search for it and log it whenever you like/);
    expect(SEARCH).toMatch(/It stays in your search and diary/);
    expect(EDITOR).toMatch(/You can still search for them and log them whenever you like/);
    expect(FAQ).toMatch(/The food stays in your search and your diary/);
  });

  test('the old, contradictory wording is gone', () => {
    for (const src of [MEAL_PLAN, SEARCH, EDITOR, FAQ]) {
      expect(src).not.toMatch(/Never show this again/);
      expect(src).not.toMatch(/Hidden from suggestions/);
      expect(src).not.toMatch(/your avoid list/);
    }
  });

  test('ALLERGENS keep their own, stronger word: they are not a preference', () => {
    // "Avoid" stays reserved for the safety list. Collapsing the two would
    // make a taste choice and an allergen read as the same kind of thing.
    expect(EDITOR).toContain('Allergens to avoid');
    expect(EDITOR).toContain('Foods we will not suggest');
  });

  test('no em dash reaches any of this copy', () => {
    const lines = [
      ...(MEAL_PLAN.match(/'[^']{20,}'/g) || []),
      ...(EDITOR.match(/>[^<>{}]{20,}</g) || []),
    ];
    for (const line of lines) expect(line).not.toContain('—');
  });
});

describe('the live wiring', () => {
  // eslint-disable-next-line global-require
  const read = (p) => require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, p), 'utf8',
  );

  test('EVERY plan generator in the service folds it in', () => {
    const svc = read('../mealPlanService.js');
    const generators = svc.match(/const prefs = withDoNotSuggest\(preferencesFromProfile\(profile\), await doNotSuggestRefs\(userId\)\)/g) || [];
    const bare = svc.match(/const prefs = preferencesFromProfile\(profile\)/g) || [];
    expect(generators.length).toBe(4);
    expect(bare.length).toBe(0);
  });

  test('the diary and search suggestion surfaces fold it in too', () => {
    expect(read('../../../screens/DiaryScreen.js')).toMatch(/\.\.\.withDoNotSuggest\(/);
    expect(read('../../../screens/FoodSearchScreen.js')).toMatch(/\.\.\.withDoNotSuggest\(/);
  });

  test('a read failure never invents an exclusion', async () => {
    // Best-effort by design: no dislikes means the profile's own list alone,
    // which is the pre-17B behaviour, not a refusal and not a silent block.
    expect(await require('../mealPlanService').doNotSuggestRefs(null)).toEqual([]);
  });

  test('the intent loader is the one place dislikes are read for selection', async () => {
    const s = await loadFoodIntentState(null, { excludeFoodKeys: ['oats'] });
    expect(s.dislikes.size).toBe(0);
    expect(isFoodExcluded(s, 'oats')).toBe(true);
  });
});
