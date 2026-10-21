/**
 * mealPlanService — the pure bridge helpers (target mapping, prefs from
 * profile, schedule spread, snapshot). The async orchestration is thin
 * glue over already-tested engine + db modules; we test the pure core
 * that decides what the engine is fed.
 */
jest.mock('../db', () => ({
  getActiveMealPlan: jest.fn(),
  saveActiveMealPlan: jest.fn(),
  updateMealPlan: jest.fn(),
  listSavedMeals: jest.fn(),
  // Food data-layer audit 2026-10-16, item 14: a plan day is ONE batch
  // write (logFoodEntries, one id per entry) and the banked re-sync ONE
  // replace (replacePlannedFoodForDays).
  logFoodEntries: jest.fn((_u, entries) => Promise.resolve(entries.map((_, i) => `id${i}`))),
  getFoodEntriesForDay: jest.fn(() => Promise.resolve([])),
  clearPlannedDay: jest.fn(() => Promise.resolve()),
  replacePlannedFoodForDays: jest.fn(() => Promise.resolve({ cleared: 1, written: 1 })),
}));

import {
  storedTargetToEngineTarget,
  preferencesFromProfile,
  buildPlanSnapshot,
  buildDayPlanSnapshot,
  applyPlanDayToDiary,
  applyPlanWeekToDiary,
  applyPlanDayMerging,
  planDayMergePlan,
  describeDayMerge,
  describeWeekMerge,
  planNextWeek,
  resyncBankedPlannedFood,
  repeatPlanDay,
} from '../mealPlanService';
import { logFoodEntries } from '../db';

// Every entry a mocked batch write was handed, flattened across calls.
const batchedEntries = () => logFoodEntries.mock.calls.flatMap((c) => c[1]);
import { assembleWeekPlan } from '../mealPlanAssembler';
import { resolveComponent } from '../curatedFoods';
import { mealTotals } from '../curatedMeals';

function _meal(slot, components) {
  const items = components.map((c) => resolveComponent(c.food, c.g));
  return { slot, mealId: slot, name: slot, components, items, totals: mealTotals(items) };
}
function _day() {
  return {
    slots: [
      _meal('meal_1', [{ food: 'oats', g: 80 }, { food: 'whey', g: 40 }, { food: 'banana', g: 120 }]),
      _meal('meal_2', [{ food: 'chicken_breast', g: 180 }, { food: 'white_rice', g: 200 }, { food: 'broccoli', g: 100 }]),
    ],
  };
}

// Ultimate-Audit item 12 (raw/cooked basis toggle, founder ruling
// NA-nutrition-1: store the basis, no conversion). "Log this day" fans
// each plan item through the diary write; the per-item label the user set on
// the expanded plate (MealPlanScreen) must ride along, and an item nobody
// touched must default the same way manual logging does (logFoodEntry's own
// 'as_weighed' fallback), never a silently invented raw/cooked guess here.
describe('applyPlanDayToDiary: carries the per-item weight-state label (Ultimate-Audit item 12)', () => {
  beforeEach(() => { logFoodEntries.mockClear(); });

  test('an item with an explicit weightState passes it straight through to the diary write', async () => {
    const day = {
      slots: [{
        slot: 'meal_1',
        items: [{ foodRef: 'curated:oats', quantityG: 60, kcal: 227, proteinG: 8, carbsG: 40, fatG: 4, weightState: 'cooked' }],
      }],
    };
    await applyPlanDayToDiary('u1', day, { entryDate: '2026-07-05' });
    expect(batchedEntries()).toEqual([expect.objectContaining({ weightState: 'cooked' })]);
  });

  test('an untouched item (no weightState field) forwards undefined, not a guessed label', async () => {
    const day = {
      slots: [{
        slot: 'meal_1',
        items: [{ foodRef: 'curated:white_rice', quantityG: 180, kcal: 234, proteinG: 5, carbsG: 50, fatG: 1 }],
      }],
    };
    await applyPlanDayToDiary('u1', day, { entryDate: '2026-07-05' });
    const entry = batchedEntries().find((e) => e.foodRef === 'curated:white_rice');
    expect(entry.weightState).toBeUndefined();
  });

  // Founder ruling 2026-10-19 (cookYield.js), superseding NA-nutrition-1 for
  // paired foods: a plate shown raw logs its raw grams, with the plan's own
  // figures for the same amount of food.
  test('a paired item set to raw logs its raw grams, kitchen-rounded, with the same macros', async () => {
    const day = {
      slots: [{
        slot: 'meal_1',
        items: [{ foodRef: 'curated:chicken_breast', quantityG: 150, kcal: 248, proteinG: 46.5, carbsG: 0, fatG: 5.4, weightState: 'raw' }],
      }],
    };
    await applyPlanDayToDiary('u1', day, { entryDate: '2026-07-05' });
    const entry = batchedEntries().find((e) => e.foodRef === 'curated:chicken_breast');
    expect(entry.quantityG).toBe(200); // 150 g cooked = 200 g raw (CoFID protein 32 / 24)
    expect(entry.kcal).toBe(248);
    expect(entry.proteinG).toBe(46.5);
    expect(entry.weightState).toBe('raw');
  });

  test('an item without a CoFID pair keeps its grams whatever its label', async () => {
    const day = {
      slots: [{
        slot: 'meal_1',
        items: [{ foodRef: 'curated:oats', quantityG: 60, kcal: 227, proteinG: 8, carbsG: 40, fatG: 4, weightState: 'cooked' }],
      }],
    };
    await applyPlanDayToDiary('u1', day, { entryDate: '2026-07-05' });
    expect(batchedEntries()[0].quantityG).toBe(60);
  });
});

describe('storedTargetToEngineTarget', () => {
  test('maps a stored row to the engine shape with a ±10% band', () => {
    const t = storedTargetToEngineTarget({ target_kcal: 2600, protein_g: 180, carbs_g: 290, fat_g: 75 });
    expect(t.targetKcal).toBe(2600);
    expect(t.kcalMin).toBe(2340);
    expect(t.kcalMax).toBe(2860);
    expect(t.proteinG).toBe(180);
  });
  test('accepts camelCase rows too', () => {
    const t = storedTargetToEngineTarget({ targetKcal: 2000, proteinG: 150, carbsG: 200, fatG: 60 });
    expect(t.targetKcal).toBe(2000);
  });
  test('reconstructs floorApplied from persisted warnings', () => {
    const floored = storedTargetToEngineTarget({
      target_kcal: 1200, protein_g: 120, carbs_g: 90, fat_g: 35,
      warnings: ['Target calories (1130 kcal) below safe minimum (1200 kcal). Raising to floor.'],
    });
    expect(floored.floorApplied).toBe(true);
    const normal = storedTargetToEngineTarget({ target_kcal: 2600, protein_g: 180, carbs_g: 290, fat_g: 75, warnings: [] });
    expect(normal.floorApplied).toBe(false);
  });
  test('null / zero target yields null', () => {
    expect(storedTargetToEngineTarget(null)).toBeNull();
    expect(storedTargetToEngineTarget({ target_kcal: 0 })).toBeNull();
  });

  test('SAFETY: a floored target raises the band floor to the target itself', () => {
    // The engine's generic ±10% band is not floor-aware: on a floored
    // 1,200 target a 0.9x lower edge (1,080) would let the close-out and
    // any coach cut land 120 kcal below the sacred floor.
    const floored = storedTargetToEngineTarget({
      target_kcal: 1200, protein_g: 120, carbs_g: 90, fat_g: 35,
      warnings: ['Target calories (1130 kcal) below safe minimum (1200 kcal). Raising to floor.'],
    });
    expect(floored.kcalMin).toBe(1200); // never 1080
    expect(floored.kcalMax).toBeGreaterThanOrEqual(1200);
    // and an un-floored target keeps the normal band
    const normal = storedTargetToEngineTarget({ target_kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 60, warnings: [] });
    expect(normal.kcalMin).toBe(1800);
  });
});

describe('preferencesFromProfile', () => {
  test('reads the diet preference and normalises plan prefs', () => {
    const p = preferencesFromProfile({ dietPreference: 'vegan', mealPlanMealsPerDay: 5 });
    expect(p.diet).toBe('vegan');
    expect(p.mealsPerDay).toBe(5);
  });
  test('a NULL profile refuses (P0-7 D14 re-anchor); a sparse profile still defaults sensibly', () => {
    // Deliberate re-anchor (D92): profile-less generation used to default
    // to the least restrictive preference set (no exclusions, omnivore) -
    // allergen-blind planning. Null now refuses; {} still normalises.
    expect(preferencesFromProfile(null)).toBeNull();
    const p = preferencesFromProfile({});
    expect(p.diet).toBe('omnivore');
    expect(p.mealsPerDay).toBe(4);
  });
});

// ONE DAILY TRUTH (Campaign 17A, founder law). `defaultSchedule` spread N
// training days across a calendar week so the plan could give those days a
// different target. The founder retired the whole idea: the athlete trains
// whenever life allows, so the app must not assert which weekdays those are.
describe('ONE DAILY TRUTH: no training-schedule guesser exists', () => {
  test('the service exports no defaultSchedule and no answerDayTraining', () => {
    // eslint-disable-next-line global-require
    const mod = require('../mealPlanService');
    expect(mod.defaultSchedule).toBeUndefined();
    expect(mod.answerDayTraining).toBeUndefined();
    expect(mod.answerTrainingTodayOnActivePlan).toBeUndefined();
  });
});

describe('buildPlanSnapshot', () => {
  test('wraps the week with the snapshots needed to re-solve', () => {
    const week = { days: [{}], withinTolerance: true, seed: 9 };
    const engineTarget = { targetKcal: 2600, kcalMin: 2340, kcalMax: 2860, proteinG: 180 };
    const prefs = { diet: 'omnivore' };
    const snap = buildPlanSnapshot({ week, engineTarget, prefs });
    expect(snap.kind).toBe('week');
    expect(snap.targetSnapshot).toEqual(engineTarget);
    expect(snap.prefs).toEqual(prefs);
    expect(snap.days).toBe(week.days);
    expect(snap.schemaVersion).toBe(1);
    // ONE DAILY TRUTH: a stored plan carries no day-type machinery at all.
    expect(snap.schedule).toBeUndefined();
    expect(snap.variants).toBeUndefined();
    expect(snap.cycleDeltaKcal).toBeUndefined();
  });
});

describe('applyPlanWeekToDiary (Feature B — schedule the week, non-destructive)', () => {
  // eslint-disable-next-line global-require
  const db = require('../db');
  const itemDay = (ref) => ({ slots: [{ slot: 'meal_1', items: [{ foodRef: ref, quantityG: 100, kcal: 100, proteinG: 10, carbsG: 5, fatG: 2 }] }] });
  const plan = { days: [itemDay('curated:x'), itemDay('curated:y')] };

  beforeEach(() => { jest.clearAllMocks(); db.getFoodEntriesForDay.mockResolvedValue([]); });

  test('a day with eaten food gets only the meals whose diary meal is empty (item 24)', async () => {
    db.getFoodEntriesForDay
      .mockResolvedValueOnce([{ id: 'e1', meal_slot: 'meal_1' }]) // day 0: Meal 1 eaten -> skipped, named
      .mockResolvedValueOnce([]); // day 1 empty -> add
    const twoMeals = { slots: [
      { slot: 'meal_1', items: [{ foodRef: 'curated:x', quantityG: 100, kcal: 100, proteinG: 10, carbsG: 5, fatG: 2 }] },
      { slot: 'meal_2', items: [{ foodRef: 'curated:y', quantityG: 100, kcal: 100, proteinG: 10, carbsG: 5, fatG: 2 }] },
    ] };
    const res = await applyPlanWeekToDiary('u1', { days: [twoMeals, twoMeals] }, { startDate: '2026-06-15' });
    expect(res.addedDays).toBe(2);
    expect(res.loggedItems).toBe(3);
    expect(res.days[0]).toEqual({ date: '2026-06-15', addedSlots: ['meal_2'], skippedSlots: ['meal_1'], keptPlanned: false });
    expect(db.logFoodEntries).toHaveBeenCalledTimes(2);
    expect(db.clearPlannedDay).not.toHaveBeenCalled();
    expect(db.logFoodEntries.mock.calls[0][1].every((e) => e.isPlanned === true)).toBe(true);
  });

  test('a day whose every meal is eaten adds nothing and is counted as skipped', async () => {
    db.getFoodEntriesForDay.mockResolvedValue([{ id: 'e1', meal_slot: 'meal_1' }]);
    const res = await applyPlanWeekToDiary('u1', plan, { startDate: '2026-06-15' });
    expect(res.addedDays).toBe(0);
    expect(res.skippedDays).toBe(2);
    expect(db.logFoodEntries).not.toHaveBeenCalled();
  });

  test('planned rows: "leave" (default) skips the whole day, "replace" clears then adds', async () => {
    db.getFoodEntriesForDay.mockResolvedValue([{ id: 'p1', is_planned: 1, meal_slot: 'meal_1' }]);
    const left = await applyPlanWeekToDiary('u1', plan, { startDate: '2026-06-15' });
    expect(left.addedDays).toBe(0);
    expect(left.days.every((d) => d.keptPlanned)).toBe(true);
    expect(db.clearPlannedDay).not.toHaveBeenCalled();
    expect(db.logFoodEntries).not.toHaveBeenCalled();
    const replaced = await applyPlanWeekToDiary('u1', plan, { startDate: '2026-06-15', planned: 'replace' });
    expect(replaced.addedDays).toBe(2);
    expect(db.clearPlannedDay).toHaveBeenCalledTimes(2);
    expect(db.logFoodEntries).toHaveBeenCalledTimes(2);
  });

  test('an old-named Breakfast row blocks Meal 1 (it is drawn there)', () => {
    const r = planDayMergePlan(
      { slots: [{ slot: 'meal_1', items: [{ foodRef: 'curated:x', quantityG: 100 }] }, { slot: 'meal_2', items: [{ foodRef: 'curated:y', quantityG: 100 }] }] },
      [{ meal_slot: 'breakfast' }], '2026-06-15',
    );
    expect(r.skippedSlots).toEqual(['meal_1']);
    expect(r.addedSlots).toEqual(['meal_2']);
  });

  test('the fold uses the diary\'s own meal count: on a two-meal diary a logged Dinner blocks Meal 2', () => {
    // Lead review 2026-10-21: the diary draws Dinner inside Meal 2 when the
    // person has two meals a day, so the plan must treat Meal 2 as filled.
    const day = { slots: [{ slot: 'meal_1', items: [{ foodRef: 'curated:x', quantityG: 100 }] }, { slot: 'meal_2', items: [{ foodRef: 'curated:y', quantityG: 100 }] }] };
    const two = planDayMergePlan(day, [{ meal_slot: 'dinner' }], '2026-06-15', 2);
    expect(two.skippedSlots).toEqual(['meal_2']);
    expect(two.addedSlots).toEqual(['meal_1']);
    // Without the diary's count the plan's own (at least three) stands in.
    expect(planDayMergePlan(day, [{ meal_slot: 'dinner' }], '2026-06-15').skippedSlots).toEqual([]);
  });

  test('a snack row does not block a numbered meal', () => {
    const r = planDayMergePlan(
      { slots: [{ slot: 'meal_4', items: [{ foodRef: 'curated:x', quantityG: 100 }] }] },
      [{ meal_slot: 'snack' }], '2026-06-15',
    );
    expect(r.skippedSlots).toEqual([]);
  });

  test('a replace that has nothing to add clears nothing', async () => {
    db.getFoodEntriesForDay.mockResolvedValue([{ id: 'e1', meal_slot: 'meal_1' }, { id: 'p1', is_planned: 1, meal_slot: 'meal_2' }]);
    const res = await applyPlanDayMerging('u1', itemDay('curated:x'), { entryDate: '2026-06-15', replacePlanned: true });
    expect(res.logged).toBe(0);
    expect(db.clearPlannedDay).not.toHaveBeenCalled();
  });

  test('the toast sentences name what was added and skipped', () => {
    const label = (k) => ({ meal_1: 'Meal 1', meal_2: 'Meal 2', meal_3: 'Meal 3' }[k]);
    expect(describeDayMerge({ logged: 4, addedSlots: ['meal_2', 'meal_3'], skippedSlots: ['meal_1'] }, 'Tue 21 Oct', label))
      .toBe('Added Meal 2 and Meal 3 to Tue 21 Oct. Skipped Meal 1, already logged.');
    expect(describeDayMerge({ logged: 0, addedSlots: [], skippedSlots: ['meal_1'] }, 'Tue', label))
      .toBe('Nothing added. Meal 1 already has food logged.');
    expect(describeDayMerge({ logged: 3, addedSlots: ['meal_1'], skippedSlots: [] }, 'Tue', label, true))
      .toBe('Replaced the plan for Tue: Meal 1.');
    expect(describeWeekMerge({ addedDays: 2, days: [
      { date: '2026-06-15', addedSlots: ['meal_2'], skippedSlots: ['meal_1'], keptPlanned: false },
      { date: '2026-06-16', addedSlots: [], skippedSlots: [], keptPlanned: true },
    ] }, label)).toBe('2 days added to your diary. Skipped, already logged: Meal 1 on Mon. Left as planned: Tue.');
  });

  test('an empty plan does nothing', async () => {
    expect(await applyPlanWeekToDiary('u1', { days: [] })).toEqual({ addedDays: 0, skippedDays: 0, loggedItems: 0, days: [] });
    expect(db.logFoodEntries).not.toHaveBeenCalled();
  });
});

describe('resyncBankedPlannedFood (CB-1b — banking moves planned food)', () => {
  // eslint-disable-next-line global-require
  const db = require('../db');
  beforeEach(() => {
    jest.clearAllMocks();
    db.clearPlannedDay.mockResolvedValue();
    db.getActiveMealPlan.mockResolvedValue({ id: 'p1', plan: { kind: 'week', days: [_day(), _day()] } });
  });

  test('adjusts only the banked days that already have planned food', async () => {
    // 16th has planned food (adjust); 17th has none (skip, target-only).
    db.getFoodEntriesForDay.mockImplementation((_u, date) =>
      Promise.resolve(date === '2026-06-16' ? [{ is_planned: 1 }] : []));
    const res = await resyncBankedPlannedFood('u1', {
      perDayDeltaKcal: { '2026-06-16': 200, '2026-06-17': -200 },
      floorKcal: 1200,
      startDate: '2026-06-16',
    });
    // ONE atomic replace of the adjusted day (audit item 14), never a
    // separate clear then a separate write.
    expect(db.replacePlannedFoodForDays).toHaveBeenCalledTimes(1);
    const [uid, days, entries] = db.replacePlannedFoodForDays.mock.calls[0];
    expect(uid).toBe('u1');
    expect(days).toEqual(['2026-06-16']);
    expect(entries.length).toBeGreaterThan(0); // rewrote the adjusted day
    expect(entries.every((e) => e.entryDate === '2026-06-16' && e.isPlanned === true)).toBe(true);
    expect(db.clearPlannedDay).not.toHaveBeenCalled();
    expect(db.logFoodEntries).not.toHaveBeenCalled();
    expect(res.perDayChanges.map((c) => c.dayKey)).toEqual(['2026-06-16']);
  });

  test('a failed replace throws, so the caller\'s "Nothing has changed" is true (audit item 14)', async () => {
    db.getFoodEntriesForDay.mockResolvedValue([{ is_planned: 1 }]);
    db.replacePlannedFoodForDays.mockRejectedValueOnce(new Error('disk'));
    await expect(resyncBankedPlannedFood('u1', {
      perDayDeltaKcal: { '2026-06-16': 200, '2026-06-17': -200 }, floorKcal: 1200, startDate: '2026-06-16',
    })).rejects.toThrow('disk');
    // Both adjusted days went in the one replace: nothing was written before it.
    expect(db.replacePlannedFoodForDays.mock.calls[0][1]).toEqual(['2026-06-16', '2026-06-17']);
    expect(db.clearPlannedDay).not.toHaveBeenCalled();
    expect(db.logFoodEntries).not.toHaveBeenCalled();
  });

  test('no active plan → no-op', async () => {
    db.getActiveMealPlan.mockResolvedValue(null);
    const res = await resyncBankedPlannedFood('u1', { perDayDeltaKcal: { '2026-06-16': 200 }, floorKcal: 1200, startDate: '2026-06-16' });
    expect(res.perDayChanges).toEqual([]);
    expect(db.clearPlannedDay).not.toHaveBeenCalled();
    expect(db.replacePlannedFoodForDays).not.toHaveBeenCalled();
  });
});

describe('planNextWeek (seamless post-check-in setup)', () => {
  // eslint-disable-next-line global-require
  const db = require('../db');
  beforeEach(() => { jest.clearAllMocks(); });

  test('repeat reuses an existing week plan without regenerating', async () => {
    db.getActiveMealPlan.mockResolvedValue({ id: 'p1', plan: { kind: 'week', days: [] } });
    const res = await planNextWeek('u1', {}, { repeat: true });
    expect(res.repeated).toBe(true);
    expect(res.id).toBe('p1');
    expect(db.saveActiveMealPlan).not.toHaveBeenCalled(); // no regeneration
  });
});

describe('buildDayPlanSnapshot (Feature A — Plan my day)', () => {
  test('wraps a single day as a kind:day plan carrying no day-type machinery', () => {
    const day = { withinTolerance: true, seed: 5, slots: [], totals: { kcal: 2600 } };
    const engineTarget = { targetKcal: 2600, kcalMin: 2340, kcalMax: 2860, proteinG: 180 };
    const snap = buildDayPlanSnapshot({ day, engineTarget, prefs: { diet: 'omnivore' } });
    expect(snap.kind).toBe('day');
    expect(snap.days).toEqual([day]);
    expect(snap.days.length).toBe(1);
    expect(snap.targetSnapshot).toEqual(engineTarget);
    expect(snap.schedule).toBeUndefined();
    expect(snap.variants).toBeUndefined();
    expect(snap.cycleDeltaKcal).toBeUndefined();
  });
});

describe('repeatPlanDay (audit §15 item 6 — repeat a day onto another day)', () => {
  const engineTarget = {
    targetKcal: 2400, kcalMin: 2160, kcalMax: 2640,
    proteinG: 180, carbsG: 250, fatG: 70, warnings: [],
  };
  const makePlan = () => {
    const week = assembleWeekPlan({
      engineTarget,
      prefs: { diet: 'omnivore', mealsPerDay: 4 },
      seed: 7,
    });
    return buildPlanSnapshot({ week, engineTarget, prefs: { diet: 'omnivore', mealsPerDay: 4 } });
  };

  test('copies the source day\'s real slots+totals onto the target day, a real write not a label change', () => {
    const plan = makePlan();
    const { plan: next, changed } = repeatPlanDay({ plan, fromIndex: 0, toIndex: 1 });
    expect(changed).toBe(true);
    // The target day now holds the SAME slot data (names/items/totals) as the
    // source day, not merely "close" — this is a copy, not a re-generation.
    expect(next.days[1].slots.map((s) => s.name)).toEqual(plan.days[0].slots.map((s) => s.name));
    expect(next.days[1].totals).toEqual(plan.days[0].totals);
    expect(next.lastEditType).toBe('day_repeat');
  });

  test('other days are left untouched (same object references)', () => {
    const plan = makePlan();
    const { plan: next } = repeatPlanDay({ plan, fromIndex: 0, toIndex: 2 });
    plan.days.forEach((d, i) => {
      if (i !== 2) expect(next.days[i]).toBe(d);
    });
  });

  test('the copy is independent of the source: later edits to the target day do not mutate the source day', () => {
    const plan = makePlan();
    const { plan: next } = repeatPlanDay({ plan, fromIndex: 0, toIndex: 1 });
    next.days[1].slots[0].name = 'mutated for the test';
    expect(plan.days[0].slots[0].name).not.toBe('mutated for the test');
  });

  test('copying a day onto itself is a no-op', () => {
    const plan = makePlan();
    const { plan: next, changed } = repeatPlanDay({ plan, fromIndex: 2, toIndex: 2 });
    expect(changed).toBe(false);
    expect(next).toBe(plan);
  });

  test('invalid indices, a single-day plan, and malformed input never throw and never change anything', () => {
    const plan = makePlan();
    expect(repeatPlanDay({ plan, fromIndex: 9, toIndex: 0 }).changed).toBe(false);
    expect(repeatPlanDay({ plan, fromIndex: 0, toIndex: -1 }).changed).toBe(false);
    expect(repeatPlanDay({ plan: null, fromIndex: 0, toIndex: 1 }).changed).toBe(false);
    expect(repeatPlanDay({ plan: { days: [plan.days[0]] }, fromIndex: 0, toIndex: 0 }).changed).toBe(false);
    expect(repeatPlanDay().changed).toBe(false);
  });
});
