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
} from '../mealPlanService';

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
