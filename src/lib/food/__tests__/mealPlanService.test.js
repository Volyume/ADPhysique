/**
 * mealPlanService — the pure bridge helpers (target mapping, prefs from
 * profile, schedule spread, snapshot). The async orchestration is thin
 * glue over already-tested engine + db modules; we test the pure core
 * that decides what the engine is fed.
 */
import {
  storedTargetToEngineTarget,
  preferencesFromProfile,
  defaultSchedule,
  buildPlanSnapshot,
  buildDayPlanSnapshot,
  answerDayTraining,
} from '../mealPlanService';
import { assembleWeekPlan } from '../mealPlanAssembler';

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
  test('defaults sensibly for an empty profile', () => {
    const p = preferencesFromProfile(null);
    expect(p.diet).toBe('omnivore');
    expect(p.mealsPerDay).toBe(4);
  });
});

describe('defaultSchedule', () => {
  test('spreads N training days across the week', () => {
    const four = defaultSchedule(4);
    expect(four.filter((d) => d === 'training').length).toBe(4);
    expect(four.length).toBe(7);
  });
  test('0 and 7 extremes', () => {
    expect(defaultSchedule(0).every((d) => d === 'rest')).toBe(true);
    expect(defaultSchedule(7).every((d) => d === 'training')).toBe(true);
  });
  test('is deterministic', () => {
    expect(defaultSchedule(3)).toEqual(defaultSchedule(3));
  });
});

describe('buildPlanSnapshot', () => {
  test('wraps the week with the snapshots needed to re-solve', () => {
    const week = { days: [{ variant: 'training' }], schedule: ['training'], variants: {}, cycleDeltaKcal: 0, withinTolerance: true, seed: 9 };
    const engineTarget = { targetKcal: 2600, kcalMin: 2340, kcalMax: 2860, proteinG: 180 };
    const prefs = { diet: 'omnivore' };
    const snap = buildPlanSnapshot({ week, engineTarget, prefs, schedule: ['training'] });
    expect(snap.kind).toBe('week');
    expect(snap.targetSnapshot).toEqual(engineTarget);
    expect(snap.prefs).toEqual(prefs);
    expect(snap.days).toBe(week.days);
    expect(snap.schemaVersion).toBe(1);
  });
});

describe('buildDayPlanSnapshot (Feature A — Plan my day)', () => {
  test('wraps a single day as a kind:day plan with no cycling', () => {
    const day = { variant: 'rest', withinTolerance: true, seed: 5, slots: [], totals: { kcal: 2600 } };
    const engineTarget = { targetKcal: 2600, kcalMin: 2340, kcalMax: 2860, proteinG: 180 };
    const snap = buildDayPlanSnapshot({ day, engineTarget, prefs: { diet: 'omnivore' } });
    expect(snap.kind).toBe('day');
    expect(snap.days).toEqual([day]);
    expect(snap.days.length).toBe(1);
    expect(snap.cycleDeltaKcal).toBe(0);
    expect(snap.variants).toBeNull();
    expect(snap.targetSnapshot).toEqual(engineTarget);
  });
});

describe('answerDayTraining (rethink §3.2 — per-day "Training today?")', () => {
  const engineTarget = {
    targetKcal: 2400, kcalMin: 2160, kcalMax: 2640,
    proteinG: 180, carbsG: 250, fatG: 70, warnings: [],
  };
  const makePlan = () => {
    const week = assembleWeekPlan({
      engineTarget,
      prefs: { diet: 'omnivore', mealsPerDay: 4 },
      schedule: ['training', 'rest', 'training', 'rest', 'training', 'rest', 'rest'],
      seed: 7,
    });
    return buildPlanSnapshot({ week, engineTarget, prefs: week.prefs ?? { diet: 'omnivore', mealsPerDay: 4 }, schedule: week.schedule });
  };

  test('flips a rest day to training: day re-assembled on the TRAINING variant, schedule updated', () => {
    const plan = makePlan();
    const restKcal = plan.days[1].totals.kcal;
    const { plan: next, changed } = answerDayTraining({ plan, dayIndex: 1, training: true, seed: 11 });
    expect(changed).toBe(true);
    expect(next.schedule[1]).toBe('training');
    expect(next.days[1].variant).toBe('training');
    // The day now targets the stored TRAINING variant, not the rest one.
    expect(Math.abs(next.days[1].totals.kcal - plan.variants.training.kcal))
      .toBeLessThan(Math.abs(restKcal - plan.variants.training.kcal) + 1);
    expect(next.lastEditType).toBe('day_training_answer');
  });

  test('answer matching the existing variant is a no-op', () => {
    const plan = makePlan();
    const { plan: next, changed } = answerDayTraining({ plan, dayIndex: 0, training: true });
    expect(changed).toBe(false);
    expect(next).toBe(plan);
  });

  test('only the answered day changes — the week is never reshuffled', () => {
    const plan = makePlan();
    const { plan: next } = answerDayTraining({ plan, dayIndex: 3, training: true, seed: 5 });
    next.days.forEach((d, i) => {
      if (i !== 3) expect(d).toBe(plan.days[i]);
    });
    next.schedule.forEach((v, i) => {
      if (i !== 3) expect(v).toBe(plan.schedule[i]);
    });
  });

  test('SAFETY: on a floored target the re-varianted day never drops below the floor', () => {
    const floored = storedTargetToEngineTarget({
      target_kcal: 1200, protein_g: 120, carbs_g: 100, fat_g: 35,
      warnings: ['Target calories (1130 kcal) below safe minimum (1200 kcal). Raising to floor.'],
    });
    expect(floored.floorApplied).toBe(true);
    expect(floored.kcalMin).toBe(1200); // raised to the floor at mapping time
    const week = assembleWeekPlan({
      engineTarget: floored,
      prefs: { diet: 'omnivore', mealsPerDay: 4 },
      schedule: ['training', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'],
      seed: 3,
    });
    const plan = buildPlanSnapshot({ week, engineTarget: floored, prefs: { diet: 'omnivore', mealsPerDay: 4 }, schedule: week.schedule });
    const { plan: next, changed } = answerDayTraining({ plan, dayIndex: 6, training: true, seed: 9 });
    expect(changed).toBe(true);
    expect(next.days[6].totals.kcal).toBeGreaterThanOrEqual(1200 * 0.97); // assembler tolerance, never sub-floor by design band
    // The band handed to the assembler had kcalMin AT the floor:
    expect(plan.targetSnapshot.kcalMin).toBe(1200);
  });

  test('invalid input never throws and never mutates', () => {
    const plan = makePlan();
    expect(answerDayTraining({ plan, dayIndex: 9, training: true }).changed).toBe(false);
    expect(answerDayTraining({ plan: null, dayIndex: 0, training: true }).changed).toBe(false);
    expect(answerDayTraining({ plan, dayIndex: -1, training: false }).changed).toBe(false);
  });
});
