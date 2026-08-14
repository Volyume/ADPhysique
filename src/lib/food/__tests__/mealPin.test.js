/**
 * mealPin.test.js — Campaign 17A closeout, founder order.
 *
 * FOUNDER LAW: "A pin is a narrow explicit instruction: KEEP THIS MEAL. It is
 * not: GIVE ME A NEW WEEK OF FOOD... Pinning alone may not manufacture
 * novelty."
 *
 * Required hierarchy:
 *   1. preserve the newly pinned meal
 *   2. preserve every other still-valid existing meal
 *   3. re-solve portions around the pin where sufficient
 *   4. modify other meals only where necessary to reconcile the target
 *   5. rebuild broader structure only if the pinned choice genuinely makes the
 *      existing structure impossible
 *
 * WHAT WAS WRONG. The only writer of the pin preference was the meal-plan
 * screen's generic preference handler, which regenerates the whole plan for
 * ANY preference change - so the one instruction that means "keep" would have
 * thrown the week away. And in practice no control wrote it at all: the
 * assembler honoured `pinnedMealIds` at generation and the store allowed the
 * field, but nothing set it. The pin existed as a mechanism, not as a product.
 *
 * WHAT THIS SUITE PINS. The service behaviour against the REAL assembler and
 * the REAL curated library, plus a source check that the live control does not
 * route through the regenerating handler - because that routing IS the defect,
 * and it is invisible to a behavioural test of the service alone.
 */
import { assembleDayPlanBestOf } from '../mealPlanAssembler';
import { CURATED_MEALS, mealItems, mealTotals } from '../curatedMeals';
import { mealAllowed } from '../planPreferences';

const TARGET = {
  targetKcal: 2400, kcalMin: 2160, kcalMax: 2640,
  proteinG: 180, carbsG: 250, fatG: 70, warnings: [],
};
const PREFS = { diet: 'omnivore', mealsPerDay: 4 };
const PROFILE = {
  dietPreference: 'omnivore', mealPlanMealsPerDay: 4, mealPlanPinnedMeals: [],
};

// The service reads and writes through the food db, so it is mocked at that
// seam only - every engine below it is the real one.
let mockStored = null;
let mockWritten = null;
jest.mock('../db', () => ({
  getActiveMealPlan: jest.fn(async () => mockStored),
  updateMealPlan: jest.fn(async (_u, _id, plan) => { mockWritten = plan; }),
  saveActiveMealPlan: jest.fn(async () => 'plan-1'),
  listSavedMeals: jest.fn(async () => []),
  getFoodEntriesForDay: jest.fn(async () => []),
  logFoodEntry: jest.fn(async () => 'e1'),
  clearPlannedDay: jest.fn(async () => 0),
  recordFoodSwap: jest.fn(async () => 'sw1'),
  getFoodSwaps: jest.fn(async () => []),
  getFavourites: jest.fn(async () => []),
  getDislikes: jest.fn(async () => []),
  getFoodFrequents: jest.fn(async () => []),
}));
jest.mock('../../database', () => ({ getNutritionTargets: jest.fn(async () => null) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const { setMealPinOnActivePlan } = require('../mealPlanService');

function realDay(seed = 7) {
  return assembleDayPlanBestOf({
    target: {
      kcal: TARGET.targetKcal, proteinG: TARGET.proteinG,
      carbsG: TARGET.carbsG, fatG: TARGET.fatG,
    },
    band: { kcalMin: TARGET.kcalMin, kcalMax: TARGET.kcalMax },
    prefs: PREFS,
    seed,
  });
}

function setPlan(day) {
  mockStored = {
    id: 'plan-1',
    plan: {
      kind: 'week',
      days: Array.from({ length: 7 }, () => day),
      prefs: PREFS,
      targetSnapshot: TARGET,
    },
  };
  mockWritten = null;
  return mockStored.plan;
}

/** A real curated meal that is NOT on the given day. */
function offPlanMeal(day, { allowed = true } = {}) {
  const onDay = new Set(day.slots.map((s) => s.mealId));
  const m = CURATED_MEALS.find((x) => !onDay.has(x.id)
    && mealAllowed(x, PREFS) === allowed
    && Array.isArray(x.components));
  if (!m) return null;
  const items = mealItems(m);
  return {
    mealId: m.id, name: m.name, components: m.components, diet: m.diet,
    items, totals: mealTotals(items),
  };
}

describe('pinning a meal already on the plan changes NOTHING', () => {
  test('the week is preserved: same object, no write', async () => {
    const day = realDay();
    const plan = setPlan(day);
    const target = day.slots[1];
    const res = await setMealPinOnActivePlan(
      'u1', { ...PROFILE, mealPlanPinnedMeals: [target.mealId] },
      { mealId: target.mealId, pinned: true },
    );
    expect(res.changed).toBe(false);
    expect(res.conflict).toBeNull();
    expect(res.plan).toBe(plan);
    expect(mockWritten).toBeNull(); // nothing persisted, nothing regenerated
  });

  test('every unrelated meal keeps its identity', async () => {
    const day = realDay();
    setPlan(day);
    const target = day.slots[0];
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: target.mealId, pinned: true },
    );
    for (const d of res.plan.days) {
      expect(d.slots.map((s) => s.mealId)).toEqual(day.slots.map((s) => s.mealId));
      expect(d.slots.map((s) => s.name)).toEqual(day.slots.map((s) => s.name));
    }
  });

  test('the target is untouched, because nothing moved', async () => {
    const day = realDay();
    setPlan(day);
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: day.slots[2].mealId, pinned: true },
    );
    for (const d of res.plan.days) expect(d.totals).toEqual(day.totals);
  });
});

describe('UNPIN does not arbitrarily regenerate the week', () => {
  test('unpinning preserves the plan exactly and writes nothing', async () => {
    const day = realDay();
    const plan = setPlan(day);
    const res = await setMealPinOnActivePlan(
      'u1', { ...PROFILE, mealPlanPinnedMeals: [] },
      { mealId: day.slots[1].mealId, pinned: false },
    );
    expect(res.changed).toBe(false);
    expect(res.plan).toBe(plan);
    expect(mockWritten).toBeNull();
  });

  test('unpinning something that was never on the plan is still a no-op', async () => {
    const day = realDay();
    const plan = setPlan(day);
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: 'some_meal_not_here', pinned: false },
    );
    expect(res.plan).toBe(plan);
    expect(mockWritten).toBeNull();
  });
});

describe('pinning a meal that is NOT on the plan: one slot moves, the rest stay', () => {
  test('the pinned meal is placed and every other meal keeps its identity', async () => {
    const day = realDay();
    setPlan(day);
    const meal = offPlanMeal(day);
    expect(meal).toBeTruthy();
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: meal.mealId, pinned: true, meal },
    );
    expect(res.changed).toBe(true);
    const out = res.plan.days[0];
    // Rung 1: the pinned meal is there.
    expect(out.slots.map((s) => s.mealId)).toContain(meal.mealId);
    // Rung 2: exactly ONE slot changed identity.
    const before = day.slots.map((s) => s.mealId);
    const after = out.slots.map((s) => s.mealId);
    const differing = after.filter((id, i) => id !== before[i]);
    expect(differing.length).toBe(1);
  });

  test('the target still reconciles after the pin', async () => {
    const day = realDay();
    setPlan(day);
    const meal = offPlanMeal(day);
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: meal.mealId, pinned: true, meal },
    );
    // eslint-disable-next-line global-require
    const { dayOnTarget } = require('../planContinuity');
    for (const d of res.plan.days) {
      expect(dayOnTarget(d, { kcal: TARGET.targetKcal })).toBe(true);
    }
  });

  test('the pinned meal itself is never rescaled: a pin means keep it', async () => {
    const day = realDay();
    setPlan(day);
    const meal = offPlanMeal(day);
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: meal.mealId, pinned: true, meal },
    );
    const placed = res.plan.days[0].slots.find((s) => s.mealId === meal.mealId);
    expect(placed.totals.kcal).toBe(meal.totals.kcal);
    expect(placed.components.map((c) => c.g)).toEqual(meal.components.map((c) => c.g));
  });

  test('the whole week is written, not one day', async () => {
    const day = realDay();
    setPlan(day);
    const meal = offPlanMeal(day);
    await setMealPinOnActivePlan('u1', PROFILE, { mealId: meal.mealId, pinned: true, meal });
    expect(mockWritten).toBeTruthy();
    expect(mockWritten.days.length).toBe(7);
    expect(mockWritten.lastEditType).toBe('meal_pin');
  });
});

describe('ALLERGEN AND DIET RULES STILL OUTRANK THE PIN', () => {
  test('an impossible pin returns a truthful conflict and changes nothing', async () => {
    const day = realDay();
    const plan = setPlan(day);
    const meal = offPlanMeal(day);
    // The user's own rule now forbids a food in the meal they asked to keep.
    const forbidding = {
      ...PROFILE,
      mealPlanExcludeFoods: meal.components.map((c) => c.food),
    };
    const res = await setMealPinOnActivePlan(
      'u1', forbidding, { mealId: meal.mealId, pinned: true, meal },
    );
    expect(res.conflict).toBe('not_allowed');
    expect(res.changed).toBe(false);
    expect(res.plan).toBe(plan);
    expect(mockWritten).toBeNull();
  });

  test('a diet conflict is refused too, and no forbidden food is placed', async () => {
    const day = realDay();
    setPlan(day);
    const meal = offPlanMeal(day);
    const vegan = { ...PROFILE, dietPreference: 'vegan' };
    const res = await setMealPinOnActivePlan(
      'u1', vegan, { mealId: meal.mealId, pinned: true, meal },
    );
    if (res.conflict) {
      expect(res.conflict).toBe('not_allowed');
      expect(res.plan.days[0].slots.map((s) => s.mealId)).not.toContain(meal.mealId);
    } else {
      // If the meal happens to be vegan, it may legitimately be placed.
      expect(mealAllowed({ ...meal, components: meal.components }, { diet: 'vegan' })).toBe(true);
    }
  });

  test('a pin with no meal body to place reports a conflict, not a silent no-op', async () => {
    const day = realDay();
    setPlan(day);
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: 'not_on_plan_and_no_body', pinned: true },
    );
    expect(res.conflict).toBe('no_slot');
    expect(mockWritten).toBeNull();
  });
});

describe('a SAVED MEAL pin follows the same continuity law', () => {
  const savedMeal = {
    mealId: 'saved-1', name: 'My usual breakfast',
    items: [{ foodRef: 'curated:oats', name: 'Porridge oats' }],
    totals: { kcal: 520, protein: 30, carbs: 70, fat: 12 },
  };

  test('it is placed, the rest of the week stays, and the target reconciles', async () => {
    const day = realDay();
    setPlan(day);
    const res = await setMealPinOnActivePlan(
      'u1', PROFILE, { mealId: savedMeal.mealId, pinned: true, meal: savedMeal },
    );
    expect(res.changed).toBe(true);
    const out = res.plan.days[0];
    expect(out.slots.map((s) => s.mealId)).toContain(savedMeal.mealId);
    const before = day.slots.map((s) => s.mealId);
    const differing = out.slots.map((s) => s.mealId).filter((id, i) => id !== before[i]);
    expect(differing.length).toBe(1);
  });

  test('a saved meal the exclusions forbid is refused, exactly like a curated one', async () => {
    const day = realDay();
    const plan = setPlan(day);
    const res = await setMealPinOnActivePlan(
      'u1', { ...PROFILE, mealPlanExcludeFoods: ['oats'] },
      { mealId: savedMeal.mealId, pinned: true, meal: savedMeal },
    );
    expect(res.conflict).toBe('not_allowed');
    expect(res.plan).toBe(plan);
  });
});

describe('the LIVE control does not route through the regenerating handler', () => {
  // The defect was routing, not arithmetic, so it is invisible to a
  // behavioural test of the service. This is the pin that catches it.
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../../screens/MealPlanScreen.js'), 'utf8',
  );

  test('a live "Keep" control exists at all', () => {
    // Before the closeout, nothing in the app ever wrote mealPlanPinnedMeals:
    // the preference was a mechanism with no product behind it.
    expect(SCREEN).toMatch(/handleTogglePin/);
    expect(SCREEN).toMatch(/mealPlanPinnedMeals: next/);
    expect(SCREEN).toMatch(/title=\{pinnedMealIds\.includes\(slot\.mealId\) \? 'Kept' : 'Keep'\}/);
  });

  test('it calls the continuity-preserving service, never regenerateActiveMealPlan', () => {
    const start = SCREEN.indexOf('const handleTogglePin');
    expect(start).toBeGreaterThan(-1);
    const body = SCREEN.slice(start, SCREEN.indexOf('\n  // Energy DISPLAY unit', start));
    expect(body).toMatch(/setMealPinOnActivePlan\(/);
    expect(body).not.toMatch(/regenerateActiveMealPlan|generateAndSaveMealPlan|generateAndSaveDayPlan/);
  });

  test('it does not go through handleSetPref, which regenerates on any change', () => {
    const start = SCREEN.indexOf('const handleTogglePin');
    const body = SCREEN.slice(start, SCREEN.indexOf('\n  // Energy DISPLAY unit', start));
    expect(body).not.toMatch(/handleSetPref/);
  });

  test('handleSetPref still regenerates for the STRUCTURAL preferences, which is correct', () => {
    // Meals per day, diet and exclusions are structural: a rebuild is the
    // honest answer there, and this fix must not have removed it.
    const start = SCREEN.indexOf('const handleSetPref');
    const body = SCREEN.slice(start, SCREEN.indexOf('\n  // Campaign 17A closeout', start));
    expect(body).toMatch(/regenerateActiveMealPlan/);
  });
});
