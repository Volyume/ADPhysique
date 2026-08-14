/**
 * Campaign 17C: compact adversarial proof over the real nutrition seams.
 *
 * This deliberately favours pairwise matrices and synthetic histories over
 * string fuzzing. Each case is tied to a product law from the 17C brief.
 */
import fs from 'fs';
import path from 'path';
import {
  rankByPersonalHistory,
  mergePersonalMatches,
  foodNameMatchesQuery,
} from '../searchTabs';
import {
  FOOD_SWAP_SCOPE,
  FOOD_EVIDENCE_MATURITY,
  foodEvidence,
  persistentReplacementFor,
  preferenceBonus,
} from '../intent';
import { savedMealAllowed } from '../planPreferences';
import { withDoNotSuggest } from '../mealPlanService';
import {
  planCalorieBank,
  applyBankToTarget,
  deltaSum,
  bankHeadline,
} from '../calorieBank';
import { resolveEffectiveTargets } from '../effectiveTargets';
import {
  loggingCoverage,
  buildInsights,
} from '../insights';
import {
  observedMealCount,
  mealCountObservation,
  commonMealsBySlot,
} from '../habits';
import {
  computeWeeklyMicronutrientAverages,
  scaleMicronutrients,
} from '../micronutrientCoverage';
import {
  MEAL_REASON,
  explainMeal,
  explainAbsence,
} from '../mealRationale';
import {
  CONTINUITY_ACTION,
  dayOnTarget,
  reconcilePlanToTarget,
} from '../planContinuity';
import { assembleDayPlanBestOf } from '../mealPlanAssembler';

const ROOT = path.resolve(__dirname, '../../../..');
const source = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const row = (food_ref, name, extra = {}) => ({ food_ref, name, ...extra });

const TARGET = {
  targetKcal: 2400, kcalMin: 2160, kcalMax: 2640,
  proteinG: 180, carbsG: 250, fatG: 70, warnings: [],
};
const PREFS = { diet: 'omnivore', mealsPerDay: 4 };

function realDay(seed = 17) {
  return assembleDayPlanBestOf({
    target: {
      kcal: TARGET.targetKcal,
      proteinG: TARGET.proteinG,
      carbsG: TARGET.carbsG,
      fatG: TARGET.fatG,
    },
    band: { kcalMin: TARGET.kcalMin, kcalMax: TARGET.kcalMax },
    prefs: PREFS,
    seed,
  });
}

const completeDay = (date, mealCount, foodRef = 'curated:oats') => ({
  date,
  targetKcal: 2400,
  slots: Array.from({ length: mealCount }, (_, i) => ({
    slot: `meal_${i + 1}`,
    kcal: 2400 / mealCount,
    foodRef,
    name: foodRef,
  })),
});

describe('WORK 1: search and canonical food identity matrix', () => {
  const generic = row('global:generic-yoghurt', 'Greek yoghurt');
  const branded = row('global:fage-0', 'Fage Total 0% Greek yoghurt', { brand: 'Fage' });
  const custom = row('custom:my-yoghurt', 'Greek yoghurt');
  const cooked = row('global:rice-cooked', 'White rice cooked');
  const raw = row('global:rice-raw', 'White rice raw');

  test.each([
    ['exact favourite beats generic', { favouriteRefs: new Set([branded.food_ref]) }, [generic, branded], branded.food_ref],
    ['exact frequent beats generic', { frequentRefs: new Set([branded.food_ref]) }, [generic, branded], branded.food_ref],
    ['exact recent beats generic', { recentRefs: new Set([branded.food_ref]) }, [generic, branded], branded.food_ref],
    ['custom beats generic without borrowing another identity', {}, [generic, custom], custom.food_ref],
  ])('%s', (_name, evidence, rows, expected) => {
    expect(rankByPersonalHistory(rows, evidence)[0].food_ref).toBe(expected);
  });

  test.each([
    ["Kellogg's Corn Flakes", 'kelloggs corn'],
    ['Porridge oats', 'oat'],
    ['Oat milk', 'oats'],
    ['Greek-style yoghurt', 'greek yoghurt'],
  ])('punctuation/singular pair: %s <- %s', (name, query) => {
    expect(foodNameMatchesQuery(name, query)).toBe(true);
  });

  test('duplicate-looking foods, brand/generic, custom/reference and raw/cooked stay distinct', () => {
    const rows = mergePersonalMatches([generic, raw], {
      personal: [branded, custom, cooked],
      query: 'yoghurt rice',
    });
    // The combined query intentionally matches none: relevance matching is
    // not identity matching, and the merge must not invent a relationship.
    expect(rows.map((r) => r.food_ref)).toEqual([generic.food_ref, raw.food_ref]);

    const sameName = mergePersonalMatches([generic], {
      personal: [row('global:other-yoghurt', 'Greek yoghurt'), custom],
      query: 'greek yoghurt',
    });
    expect(new Set(sameName.map((r) => r.food_ref)).size).toBe(3);
  });

  test('evidence for food A never promotes same-name food B', () => {
    const a = row('global:a', 'Chicken breast');
    const b = row('global:b', 'Chicken breast');
    const c = row('global:c', 'Chicken breast');
    const ranked = rankByPersonalHistory([b, c, a], { frequentRefs: new Set([a.food_ref]) });
    expect(ranked.map((r) => r.food_ref)).toEqual(['global:a', 'global:b', 'global:c']);
  });

  test("Don't Suggest remains a search result but is excluded from suggestion injection", () => {
    const disliked = row('global:disliked', 'Chicken breast');
    const waterfall = [disliked];
    const personalPool = [disliked].filter((f) => f.food_ref !== disliked.food_ref);
    const merged = mergePersonalMatches(waterfall, { personal: personalPool, query: 'chicken' });
    expect(merged).toEqual([disliked]);
  });

  test('a stale remote lookalike cannot displace an established local identity', () => {
    const local = row('global:local-established', 'Greek yoghurt');
    const remote = row('off:remote-lookalike', 'Greek yoghurt');
    const ranked = rankByPersonalHistory([remote, local], {
      favouriteRefs: new Set([local.food_ref]),
    });
    expect(ranked.map((r) => r.food_ref)).toEqual([local.food_ref, remote.food_ref]);
  });
});

describe('WORK 2: repeat logging and serving confirmation contracts', () => {
  const screen = source('src/screens/FoodSearchScreen.js');
  const diary = source('src/screens/DiaryScreen.js');
  const meals = source('src/screens/MyMealsScreen.js');

  test('serving memory is keyed by exact food_ref at the live picker', () => {
    expect(screen).toMatch(/getSlotRecentQuantities\(userId, mealSlot\)/);
    expect(screen).toMatch(/slotPortions\.get\(picker\.food\.food_ref\)/);
  });

  test('Recent, Frequent, Favourite, Custom and Recipe rows open a confirmation sheet, never auto-log', () => {
    expect(screen).not.toMatch(/function quickLogRelog\(/);
    expect(screen).toMatch(/onPress=\{\(\) => openPicker\(food\)\}/);
    expect(screen).toMatch(/<FoodDetailSheet[\s\S]*onSave=\{confirmLog\}/);
  });

  test('a repeated saved meal also requires an explicit confirmation', () => {
    expect(screen).not.toMatch(/function quickLogRelogMeal\(/);
    expect(screen).toMatch(/confirmMealId: food\.savedMealId/);
    expect(meals).toMatch(/visible=\{!!confirming\}/);
    expect(meals).toMatch(/title="Add meal"[\s\S]*onPress=\{confirmLog\}/);
  });

  test('diary usuals carry remembered grams into the picker rather than silently logging', () => {
    const start = diary.indexOf('const onLogUsual');
    const usual = diary.slice(start, diary.indexOf('// Founder must-fix', start));
    expect(usual).not.toMatch(/logFoodEntry/);
    expect(usual).toMatch(/preselectedFood: food/);
  });

  test('planned-only rows cannot become serving-memory evidence', () => {
    const service = source('src/lib/food/mealPlanService.js');
    const plannedWriter = service.slice(
      service.indexOf('export async function applyPlanDayToDiary'),
      service.indexOf('export async function applyPlanWeekToDiary'),
    );
    expect(plannedWriter).toMatch(/isPlanned: true/);
    expect(plannedWriter).not.toMatch(/upsertSlotRecent/);
  });

  test('copy-previous-day reads and writes the requested dates, not today by accident', () => {
    const db = source('src/lib/food/db.js');
    expect(db).toMatch(/getRecentLoggedDays\(userId, asOfDate/);
    expect(db).toMatch(/entry_date < \?/);
    expect(diary).toMatch(/getFoodEntriesForDay\(userId, sourceDate\)/);
    expect(diary).toMatch(/entryDate: selectedDate/);
  });

  test('repeated barcode identity is canonicalised before serving memory sees it', () => {
    const waterfall = source('src/lib/food/waterfall.js');
    expect(waterfall).toMatch(/return \{ \.\.\.row, food_ref: `global:\$\{existing\.id\}` \}/);
    expect(screen).toMatch(/foodRef: food\.food_ref/);
  });
});

describe('WORK 3: saved meals, recipes and hard-restriction precedence', () => {
  const saved = {
    id: 'saved-1',
    name: 'Old favourite',
    items: [{ foodRef: 'global:branded-milk', name: 'Branded shake' }],
  };

  test("Don't Suggest on an opaque/branded ingredient blocks future generation", () => {
    const prefs = withDoNotSuggest(PREFS, ['global:branded-milk']);
    expect(savedMealAllowed(saved, prefs)).toBe(false);
  });

  test('a changed restricted diet outranks a pin when compatibility cannot be proved', () => {
    expect(savedMealAllowed(saved, { ...PREFS, diet: 'vegan' }, { chosenByUser: true })).toBe(false);
  });

  test('an allergen introduced after saving blocks both generation and pinning', () => {
    const dairyMeal = {
      ...saved,
      items: [{ foodRef: 'curated:greek_yogurt_0', name: 'Greek yoghurt' }],
    };
    const prefs = { ...PREFS, excludeTags: ['milk'] };
    expect(savedMealAllowed(dairyMeal, prefs)).toBe(false);
    expect(savedMealAllowed(dairyMeal, prefs, { chosenByUser: true })).toBe(false);
  });

  test('ineligibility is a generation filter, never destructive deletion', () => {
    const prefsSource = source('src/lib/food/planPreferences.js');
    const body = prefsSource.slice(
      prefsSource.indexOf('export function savedMealAllowed'),
      prefsSource.indexOf('export function filterSavedMealsByPreferences'),
    );
    expect(body).not.toMatch(/delete|UPDATE|INSERT|remove/i);
  });

  test('today\'s recipe serving path never rewrites the recipe definition', () => {
    const db = source('src/lib/food/db.js');
    const body = db.slice(
      db.indexOf('export async function applyRecipeToDiary'),
      db.indexOf('export async function getLoggedMealSlotsForDay'),
    );
    expect(body).toMatch(/const quantityG =/);
    expect(body).toMatch(/logFoodEntry/);
    expect(body).not.toMatch(/updateRecipe|UPDATE recipes|setRecipeIngredients/);
  });

  test('impossible reconciliation says so rather than deleting a personal meal', () => {
    const day = realDay();
    const personal = {
      slot: 'meal_personal', mealId: 'saved-1', name: 'My meal',
      components: null, items: [], totals: { kcal: 500, protein: 40, carbs: 50, fat: 15 },
    };
    const withPersonal = {
      ...day,
      slots: [personal, ...day.slots.slice(1)],
    };
    withPersonal.totals = withPersonal.slots.reduce((a, s) => ({
      kcal: a.kcal + (s.totals?.kcal || 0),
      protein: a.protein + (s.totals?.protein || 0),
      carbs: a.carbs + (s.totals?.carbs || 0),
      fat: a.fat + (s.totals?.fat || 0),
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    const result = reconcilePlanToTarget({
      plan: { days: [withPersonal], prefs: PREFS, targetSnapshot: TARGET },
      newTarget: { targetKcal: 9000 }, prefs: PREFS, floorKcal: 1500,
    });
    expect(result.cannotReach).toBe(true);
    expect(result.plan.days[0].slots.some((s) => s.mealId === 'saved-1')).toBe(true);
  });
});

describe('WORK 4: compact longitudinal histories', () => {
  test('A new user: no history creates no evidence or preference bonus', () => {
    const state = { swaps: [], favourites: new Set(), dislikes: new Set(), frequents: new Map() };
    expect(foodEvidence(state, 'curated:oats').maturity).toBe(FOOD_EVIDENCE_MATURITY.NONE);
    expect(preferenceBonus(state, 'curated:oats')).toBe(0);
  });

  test('B stable user: repeated exact food can become a usual without name bleed', () => {
    const history = Array.from({ length: 6 }, (_, i) => completeDay(`2026-08-0${i + 1}`, 1, 'global:stable'));
    const usual = commonMealsBySlot(history).usual.get('meal_1');
    expect(usual.ref).toBe('global:stable');
  });

  test('C incomplete logger: many partial days never become meal-count evidence', () => {
    const partial = Array.from({ length: 30 }, (_, i) => ({
      date: `p${i}`, targetKcal: 2400,
      slots: [{ slot: 'meal_1', kcal: 120, foodRef: 'global:coffee' }],
    }));
    expect(observedMealCount(partial)).toBeNull();
  });

  test('D temporary-swap user: repeated one-offs still never become a standing dislike/replacement', () => {
    const state = {
      swaps: Array.from({ length: 12 }, (_, i) => ({
        fromFoodKey: 'chicken_breast', toFoodKey: 'turkey_breast',
        scope: FOOD_SWAP_SCOPE.JUST_THIS_TIME, createdAt: i,
      })),
      favourites: new Set(), dislikes: new Set(), frequents: new Map(),
    };
    expect(persistentReplacementFor(state, 'chicken_breast')).toBeNull();
    expect(foodEvidence(state, 'turkey_breast').maturity).toBe(FOOD_EVIDENCE_MATURITY.NONE);
  });

  test('E persistent-preference user: explicit intent may teach, but only that exact identity', () => {
    const state = {
      swaps: [{
        fromFoodKey: 'chicken_breast', toFoodKey: 'turkey_breast',
        scope: FOOD_SWAP_SCOPE.PERSISTENT, createdAt: 1,
      }],
      favourites: new Set(['global:favourite']), dislikes: new Set(), frequents: new Map(),
    };
    expect(persistentReplacementFor(state, 'chicken_breast')).toBe('turkey_breast');
    expect(foodEvidence(state, 'global:favourite').maturity).toBe(FOOD_EVIDENCE_MATURITY.ESTABLISHED);
    expect(foodEvidence(state, 'global:same-name-other').maturity).toBe(FOOD_EVIDENCE_MATURITY.NONE);
  });

  test('F calorie-bank user: a bank is temporary and cannot create a weekday target', () => {
    const base = { targetKcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 };
    const banked = resolveEffectiveTargets(base, { bankedDelta: 200 });
    expect(banked).not.toBe(base);
    expect(base.targetKcal).toBe(2400);
    expect(resolveEffectiveTargets(base, { bankedDelta: 0 })).toBe(base);
  });

  test('G diet-change user: a former favourite cannot outrank the new restriction', () => {
    const oldFavourite = {
      id: 'saved-old', items: [{ foodRef: 'curated:greek_yogurt_0', name: 'Yoghurt' }],
    };
    expect(savedMealAllowed(oldFavourite, { ...PREFS, excludeTags: ['milk'] })).toBe(false);
  });

  test('H target-change user: ordinary accepted changes keep meal identity and move real food', () => {
    const day = realDay();
    const beforeIds = day.slots.map((s) => s.mealId);
    const want = day.totals.kcal + 120;
    const result = reconcilePlanToTarget({
      plan: { days: [day], prefs: PREFS, targetSnapshot: TARGET },
      newTarget: { targetKcal: want }, prefs: PREFS, floorKcal: 1500,
    });
    expect(result.action).toBe(CONTINUITY_ACTION.ADJUST_PORTIONS);
    expect(result.plan.days[0].slots.map((s) => s.mealId)).toEqual(beforeIds);
    expect(dayOnTarget(result.plan.days[0], { kcal: want })).toBe(true);
  });

  test('I restore shape: food intent sync carries scope and does not infer it from names', () => {
    const sync = source('src/lib/sync.js');
    expect(sync).toMatch(/food_swaps/);
    expect(sync).toMatch(/scope/);
    expect(sync).not.toMatch(/includes\(['"]chicken|match\(.*food.*name/i);
  });

  test('stated meal preference is only changed after explicit acceptance', () => {
    const days = Array.from({ length: 6 }, (_, i) => completeDay(`d${i}`, 3));
    const ask = mealCountObservation({ statedMealsPerDay: 4, days });
    expect(ask?.observedCount).toBe(3);
    const screen = source('src/screens/MealPlanScreen.js');
    expect(screen).toMatch(/handleAcceptMealCount[\s\S]*handleSetPref/);
  });
});

describe('WORK 5: calorie-bank arithmetic over the real display target', () => {
  const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  test.each([50, 51, 137, 251, 499, 500])('weekly total remains exact after whole-gram macro display (%i kcal request)', (request) => {
    const base = Object.fromEntries(keys.map((k) => [k, 2600]));
    const plan = planCalorieBank({
      perDayBaseKcal: base,
      bigDayKey: 'sat',
      requestedBumpKcal: request,
      floorKcal: 1500,
      bandMaxKcal: 3200,
    });
    expect(plan.ok).toBe(true);
    expect(deltaSum(plan.perDayDeltaKcal)).toBe(0);
    const target = { targetKcal: 2600, proteinG: 180, carbsG: 290, fatG: 75 };
    const before = keys.length * target.targetKcal;
    const after = keys.reduce(
      (sum, key) => sum + applyBankToTarget(target, plan.perDayDeltaKcal[key]).targetKcal,
      0,
    );
    expect(after).toBe(before);
  });

  test('every day, including the big day, must start at or above its floor', () => {
    const unsafe = { mon: 1700, tue: 1700, sat: 1400 };
    const result = planCalorieBank({
      perDayBaseKcal: unsafe, bigDayKey: 'sat', requestedBumpKcal: 50,
      floorKcal: 1500, bandMaxKcal: 2000,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('floor');
  });

  test('copy reports the applied amount, not the larger request', () => {
    const base = Object.fromEntries(keys.map((k) => [k, 1520]));
    const result = planCalorieBank({
      perDayBaseKcal: base, bigDayKey: 'sat', requestedBumpKcal: 500,
      floorKcal: 1500, bandMaxKcal: 3000,
    });
    expect(result.appliedBumpKcal).toBeLessThan(500);
    expect(bankHeadline({ deltaKcal: result.appliedBumpKcal, dayLabel: 'Saturday', otherDays: 6 }))
      .toContain(`${result.appliedBumpKcal} calories`);
  });

  test('bank persistence cannot succeed while the planned food rewrite failed', () => {
    const diary = source('src/screens/DiaryScreen.js');
    const applyStart = diary.indexOf('const applyBank');
    const clearStart = diary.indexOf('const clearBank', applyStart);
    const apply = diary.slice(applyStart, clearStart);
    const clear = diary.slice(clearStart, diary.indexOf('// BUG-1', clearStart));
    expect(apply.indexOf('resyncBankedPlannedFood')).toBeLessThan(apply.indexOf('setCalorieBank(bank)'));
    expect(apply).toMatch(/catch[\s\S]*Couldn't adjust the planned food[\s\S]*return/);
    expect(clear.indexOf('restoreUnbankedPlannedFood')).toBeLessThan(clear.indexOf('setCalorieBank(null)'));
    expect(clear).toMatch(/catch[\s\S]*Couldn't restore the planned food[\s\S]*return/);
  });
});

describe('WORK 6: ZERO, UNKNOWN and NOT LOGGED remain distinct', () => {
  test('a known zero is numeric zero; a missing micronutrient stays null', () => {
    const scaled = scaleMicronutrients({ iron_100g: 0 }, 100);
    expect(scaled.iron).toBe(0);
    expect(scaled.vitC).toBeNull();
  });

  test('not logged has no denominator and produces no nutrient average', () => {
    const average = computeWeeklyMicronutrientAverages([], 0);
    expect(average.iron.included).toBe(false);
    expect(average.iron.avgPerDay).toBeNull();
  });

  test('low diary coverage suppresses calorie and protein conclusions', () => {
    const days = Array.from({ length: 14 }, (_, i) => `d${i}`);
    const rollups = new Map(days.slice(0, 4).map((d) => [d, {
      entries_count: 3, kcal_total: 2400, protein_g: 180,
    }]));
    const coverage = loggingCoverage(days, rollups);
    expect(coverage.enoughToSayAnything).toBe(true);
    expect(coverage.reliable).toBe(false);
    expect(buildInsights({
      coverage,
      rollups: [...rollups.values()],
      targets: TARGET,
    }).map((x) => x.key)).toEqual(['coverage']);
  });

  test('the logged-day denominator is the actual four days, never the fourteen-day window', () => {
    const days = Array.from({ length: 14 }, (_, i) => `d${i}`);
    const rollups = new Map(days.slice(0, 4).map((d) => [d, { entries_count: 1 }]));
    const coverage = loggingCoverage(days, rollups);
    expect(coverage.loggedDays).toBe(4);
    expect(coverage.windowDays).toBe(14);
  });

  test('planned food cannot inflate insight coverage', () => {
    const db = source('src/lib/food/db.js');
    const rangeRead = db.slice(
      db.indexOf('export async function getFoodEntriesForRange'),
      db.indexOf('export async function replaceFoodFrequents'),
    );
    expect(rangeRead).toMatch(/is_planned = 0/);
  });
});

describe('WORK 7: product-critical helpers have live consumers', () => {
  test.each([
    ['personal ranking', 'src/screens/FoodSearchScreen.js', /rankByPersonalHistory\([\s\S]*mergePersonalMatches/],
    ['serving memory', 'src/screens/FoodSearchScreen.js', /getSlotRecentQuantities\(userId, mealSlot\)/],
    ['food intent', 'src/lib/food/mealPlanService.js', /loadFoodIntentState[\s\S]*persistentReplacements/],
    ['continuity', 'src/lib/food/mealPlanService.js', /reconcilePlanToTarget\(/],
    ['target reconciliation', 'src/screens/NutritionTargetsScreen.js', /reviewTargetChangeAgainstActivePlan\(/],
    ['plan explanations', 'src/screens/MealPlanScreen.js', /explainMeal\(slot\.reason\)/],
    ['habit suggestion', 'src/screens/MealPlanScreen.js', /mealCountObservation\(\{/],
    ['calorie-bank explanation', 'src/screens/DiaryScreen.js', /bankHeadline\(\{/],
    ['Food Insights', 'src/screens/FoodInsightsScreen.js', /buildInsights\(\{/],
  ])('%s is consumed', (_name, file, pattern) => {
    expect(source(file)).toMatch(pattern);
  });

  test('unknown rationale codes render silence and names cannot manufacture provenance', () => {
    expect(explainMeal('because_the_name_sounds_healthy')).toBeNull();
    expect(explainMeal(MEAL_REASON.PINNED)).toBe('You asked us to keep this one.');
  });

  test('when restrictions overlap, safety provenance outranks taste provenance', () => {
    expect(explainAbsence({
      excludedByUser: true,
      excludedByAllergen: true,
      excludedByDiet: true,
    })).toMatch(/allergen/i);
  });

  test('retired weekday offsets are data-retention only and have no target consumer', () => {
    const refs = source('src/lib/food/perDayTargets.js');
    expect(refs).toMatch(/STORAGE ONLY/);
    expect(source('src/lib/food/effectiveTargets.js')).not.toMatch(/offsetForDate|perDayTargets/);
  });
});

describe('WORK 8: migration claims stay inside available evidence', () => {
  const taskboard = source('docs/TASKBOARD.md');
  const readme = source('supabase/README.md');

  test('137 and 138 are UNKNOWN here, never inferred from file comments', () => {
    expect(taskboard).toMatch(/MIGRATIONS 137 \/ 138 - STATUS UNKNOWN/);
    expect(taskboard).toMatch(/production state is \*\*UNKNOWN\*\*/);
  });

  test('049 remains held', () => {
    expect(readme).toMatch(/HELD: 049 only/);
  });
});
