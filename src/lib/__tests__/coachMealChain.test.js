/**
 * coachMealChain.test.js — Campaign 18 jobs 13 and 19.
 *
 * JOB 13. Trace the whole real chain, end to end:
 *
 *   authoritative daily target -> weekly coach adjustment -> persisted target
 *   -> meal-plan target -> continuity solver -> portion/food changes
 *   -> saved plan -> rendered Meal Plan -> diary -> change receipt
 *
 * "If this chain is already correct: prove it through the production consumer
 * and do not rewrite it." Campaign 17A built the continuity ladder; this
 * suite proves the CHAIN rather than the ladder, through the real service
 * function the Apply tap calls, with the database mocked at the boundary so
 * the persisted object is inspectable.
 *
 * JOB 19. Whether Campaign 18 creates any genuinely new attention-worthy
 * state. It does not, and that is pinned rather than asserted in prose.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

const mockPlanStore = { active: null, saved: null };
jest.mock('../food/db', () => ({
  getActiveMealPlan: jest.fn(async () => mockPlanStore.active),
  updateMealPlan: jest.fn(async (_u, _id, plan) => { mockPlanStore.saved = plan; }),
  saveActiveMealPlan: jest.fn(async () => 'plan-1'),
  listSavedMeals: jest.fn(async () => []),
  listRecipesForPlanning: jest.fn(async () => []),
  logFoodEntry: jest.fn(async () => 'entry-1'),
  getFoodEntriesForDay: jest.fn(async () => []),
  clearPlannedDay: jest.fn(async () => {}),
  getDislikes: jest.fn(async () => []),
}));
jest.mock('../database', () => ({ getNutritionTargets: jest.fn(async () => null) }));
jest.mock('../engineTelemetry', () => ({ track: jest.fn() }));

// eslint-disable-next-line import/first
import { applyCoachAdjustmentToActivePlan } from '../food/mealPlanService';
// eslint-disable-next-line import/first
import { resolveComponent } from '../food/curatedFoods';
// eslint-disable-next-line import/first
import { mealTotals } from '../food/curatedMeals';

const buildSlot = (slot, components) => {
  const items = components.map((c) => resolveComponent(c.food, c.g)).filter(Boolean);
  return { slot, components, items, totals: mealTotals(items) };
};

const dayTotals = (day) => day.slots.reduce((a, s) => ({
  kcal: a.kcal + s.totals.kcal,
  protein: a.protein + s.totals.protein,
}), { kcal: 0, protein: 0 });

/** A real assembled week: four meals a day, seven identical days. */
function makePlan({ floored = false, pinnedMealIds = [] } = {}) {
  const day = () => ({
    slots: [
      buildSlot('meal_1', [{ food: 'oats', g: 90 }, { food: 'whey', g: 30 }]),
      buildSlot('meal_2', [{ food: 'chicken_breast', g: 180 }, { food: 'white_rice', g: 280 }]),
      buildSlot('meal_3', [{ food: 'salmon', g: 150 }, { food: 'white_potato', g: 300 }]),
      buildSlot('meal_4', [{ food: 'greek_yogurt_0', g: 200 }, { food: 'granola', g: 60 }]),
    ],
  });
  // Real assembled days carry a day-level `totals`; the service reads it as
  // the base the adjustment applies to.
  const days = Array.from({ length: 7 }, () => {
    const d = day();
    return { ...d, totals: dayTotals(d) };
  });
  const kcal = days[0].totals.kcal;
  return {
    id: 'plan-1',
    plan: {
      schemaVersion: 1,
      kind: 'week',
      days,
      prefs: { diet: 'omnivore', mealsPerDay: 4, pinnedMealIds },
      targetSnapshot: floored
        ? { targetKcal: kcal, kcalMin: kcal, warnings: ['calorie_floor_applied'] }
        : { targetKcal: kcal, kcalMin: Math.round(kcal * 0.9), kcalMax: Math.round(kcal * 1.1) },
    },
  };
}

beforeEach(() => {
  mockPlanStore.active = makePlan();
  mockPlanStore.saved = null;
});

describe('JOB 13: a target change reaches the actual food', () => {
  test('CASE A: +250 kcal lands on the plate, on EVERY day', async () => {
    const before = dayTotals(mockPlanStore.active.plan.days[0]).kcal;
    const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: 250 });
    expect(res.plan).toBeTruthy();
    for (const day of res.plan.days) {
      expect(dayTotals(day).kcal).toBeGreaterThan(before);
    }
  });

  test('and the change is PERSISTED, not just returned', async () => {
    await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: 250 });
    expect(mockPlanStore.saved).toBeTruthy();
    expect(dayTotals(mockPlanStore.saved.days[0]).kcal)
      .toBeGreaterThan(dayTotals(makePlan().plan.days[0]).kcal);
  });

  test('the authoritative target wins when the meal-plan snapshot is stale', async () => {
    const authoritative = {
      targetKcal: 2600, proteinG: 180, carbsG: 320, fatG: 75, warnings: [],
    };
    const res = await applyCoachAdjustmentToActivePlan('u1', {
      adjustmentKcal: 50,
      targetSnapshot: authoritative,
      minimumKcal: 1500,
    });
    expect(res.plan.targetSnapshot).toMatchObject(authoritative);
    expect(mockPlanStore.saved.targetSnapshot).toMatchObject(authoritative);
    expect(res.receipt.afterKcal).toBeCloseTo(2600, -1);
  });

  test('CASE B: -250 kcal comes off the plate', async () => {
    const before = dayTotals(mockPlanStore.active.plan.days[0]).kcal;
    const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: -250 });
    expect(dayTotals(res.plan.days[0]).kcal).toBeLessThan(before);
  });

  test('CASE C: PROTEIN IS PROTECTED - not one protein staple is touched', async () => {
    // The real invariant, and a stronger claim than "protein barely moved":
    // the solver spends the calorie change on CARBS and FAT, and never
    // reaches for a protein source to hit a number. Total protein does drift
    // a few grams, because rice, oats and potatoes carry protein of their
    // own - that is incidental, not the coach spending protein.
    const PROTEIN_FOODS = ['chicken_breast', 'salmon', 'whey', 'greek_yogurt_0'];
    const gramsOf = (plan, food) => plan.days[0].slots
      .flatMap((sl) => sl.components).filter((c) => c.food === food)
      .reduce((a, c) => a + c.g, 0);

    for (const delta of [250, -250]) {
      mockPlanStore.active = makePlan();
      const before = mockPlanStore.active.plan;
      // eslint-disable-next-line no-await-in-loop
      const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: delta });
      for (const food of PROTEIN_FOODS) {
        expect(gramsOf(res.plan, food)).toBe(gramsOf(before, food));
      }
      // And the calorie change genuinely happened.
      expect(dayTotals(res.plan.days[0]).kcal).not.toBe(dayTotals(before.days[0]).kcal);
    }
  });

  test('CASE D: a FLOORED target refuses to cut below itself', async () => {
    mockPlanStore.active = makePlan({ floored: true });
    const floor = mockPlanStore.active.plan.targetSnapshot.targetKcal;
    const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: -400 });
    for (const day of res.plan.days) {
      expect(dayTotals(day).kcal).toBeGreaterThanOrEqual(floor);
    }
  });

  test('CASE E: a PINNED meal keeps its FOODS; only portions move', async () => {
    mockPlanStore.active = makePlan();
    mockPlanStore.active.plan.days = mockPlanStore.active.plan.days.map((d) => ({
      ...d,
      slots: d.slots.map((s, i) => (i === 1 ? { ...s, mealId: 'pinned-1' } : s)),
    }));
    mockPlanStore.active.plan.prefs.pinnedMealIds = ['pinned-1'];
    const beforeFoods = mockPlanStore.active.plan.days[0].slots[1].components.map((c) => c.food);
    const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: 250 });
    const after = res.plan.days[0].slots[1];
    // The pin means KEEP THIS MEAL: it is not swapped for another meal and
    // its foods are the same foods. Grams may move, because that is how a
    // target is met without rebuilding anyone's week.
    expect(after.mealId).toBe('pinned-1');
    expect(after.components.map((c) => c.food)).toEqual(beforeFoods);
  });

  test('CASE H: a mature plan is ADJUSTED, not rebuilt', async () => {
    // Continuity: the same foods are still on the plate afterwards. Only the
    // grams moved. This is the whole 17A law, proved through the C18 chain.
    const foodsBefore = mockPlanStore.active.plan.days[0].slots
      .flatMap((s) => s.components.map((c) => c.food)).sort();
    const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: 200 });
    const foodsAfter = res.plan.days[0].slots
      .flatMap((s) => s.components.map((c) => c.food)).sort();
    expect(foodsAfter).toEqual(foodsBefore);
  });

  test('THE RECEIPT names what actually moved', async () => {
    const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: 250 });
    expect(res.change).toBeTruthy();
    expect(res.change.adjustmentKcalRequested).toBe(250);
    expect(Math.abs(res.change.adjustmentKcalApplied)).toBeGreaterThan(0);
    expect(res.change.edits.length).toBeGreaterThan(0);
    for (const e of res.change.edits) {
      expect(Number.isInteger(e.gramsAfter)).toBe(true);
    }
  });

  test('no plan means no pretence: nothing is invented to adjust', async () => {
    mockPlanStore.active = null;
    const res = await applyCoachAdjustmentToActivePlan('u1', { adjustmentKcal: 250 });
    expect(res.change).toBeNull();
  });
});

describe('JOB 13: the chain is wired to the real Apply tap', () => {
  const SCREEN = read('../../screens/CoachOutputScreen.js');

  test('applying calories saves the target AND pushes it into the meal plan', () => {
    expect(SCREEN).toMatch(/await saveNutritionTargets\(user\.id, computed\.targets\)/);
    expect(SCREEN).toMatch(/const appliedChange = computed\.newKcal - Number\(current\.targetKcal\)/);
    expect(SCREEN).toMatch(/applyCoachAdjustmentToActivePlan\(user\.id, \{[\s\S]{0,200}?adjustmentKcal: appliedChange,[\s\S]{0,200}?targetSnapshot: computed\.targets/);
  });

  test('a floor clamp records the change that landed, not the larger request', () => {
    expect(SCREEN).toMatch(/direction: Math\.sign\(appliedChange\)/);
    expect(SCREEN).toMatch(/magnitude: Math\.abs\(appliedChange\)/);
    expect(SCREEN).toMatch(/minimumKcal: check\.floorKcal/);
  });

  test('and the food change is narrated to the user, not left silent', () => {
    expect(SCREEN).toMatch(/buildPlanEditNarration\(planChange/);
    expect(SCREEN).toMatch(/setPlanEditNote\(narration\)/);
  });

  test('THE DAY LAW SURVIVES THE CHAIN: the delta applies to every day equally', () => {
    const svc = read('../food/mealPlanService.js');
    const start = svc.indexOf('export async function applyCoachAdjustmentToActivePlan');
    const body = svc.slice(start, start + 3500);
    expect(body).toMatch(/reconcilePlanToTarget/);
    expect(body).not.toMatch(/trainingDay|restDay|weekday|getDay\(/i);
  });

  test('CASE G: the calorie bank remains the ONLY per-date redistribution', () => {
    const svc = read('../food/mealPlanService.js');
    // Banking has its own named path; nothing else writes per-day deltas.
    expect(svc).toMatch(/bankedPlanDayEdits/);
    const code = svc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/perDayTarget|dayVariantTargets|macroCycle/);
  });

  test('CASE F: restriction changes are a REBUILD reason, not a portion tweak', () => {
    const cont = read('../food/planContinuity.js');
    expect(cont).toMatch(/REBUILD_REASON/);
    expect(cont).toMatch(/PREFERENCES_CHANGED|preferences_changed|EXCLUSION/i);
  });
});

describe('JOB 19: Campaign 18 needs no new notification', () => {
  const categories = read('../notifications/categories.js');
  const scheduler = read('../notifications/scheduler.js');

  test('the two attention-worthy states already have a category, and SHARE it', () => {
    expect(categories).toMatch(/WEEKLY_COACH_READY: 'weekly_coach_ready'/);
    // A block ready to review maps to the same coaching category rather than
    // minting a second one.
    expect(categories).toMatch(/case 'block_ready_to_review': return CATEGORY\.WEEKLY_COACH_READY/);
  });

  test('NO NEW CATEGORY WAS ADDED BY CAMPAIGN 18', () => {
    expect(categories).not.toMatch(/COACH_CONTEXT|INTERVENTION_OUTCOME|LIMITER_|STORY_READY/i);
  });

  test('and nothing Campaign 18 built schedules a notification at all', () => {
    for (const rel of ['../coachContext.js', '../coachPrecedence.js', '../coachStory.js', '../coachIntervention.js']) {
      const code = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/scheduleNotification|CATEGORY\.|expo-notifications|requestEventPushSlot/i);
    }
  });

  test('the existing coach notification still respects every opt-out gate', () => {
    expect(scheduler).toMatch(/isCategoryEnabled\(CATEGORY\.WEEKLY_COACH_READY\)/);
    expect(scheduler).toMatch(/requestEventPushSlot\(\{ category: CATEGORY\.WEEKLY_COACH_READY/);
  });

  test('a hold, an outcome line and a context fact are NOT attention-worthy', () => {
    // The outcome and the story ride on the weekly review the user already
    // gets told about. Nothing in Campaign 18 pushes on its own.
    for (const rel of ['../coachStory.js', '../coachIntervention.js']) {
      expect(read(rel)).not.toMatch(/scheduleNotification|requestEventPushSlot|expo-notifications/i);
    }
  });
});
