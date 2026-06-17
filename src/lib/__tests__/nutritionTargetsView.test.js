/**
 * nutritionTargetsView — view-layer helpers for the Nutrition Targets screen.
 * These shape already-computed targets for display; they are NOT the engine
 * and NOT the calorie floors. The tests lock the breakdown-backfill no-op
 * guarantee and the per-meal MPS split.
 */
import {
  hydrateLoadedTargets,
  getRecommendedMeals,
  KCAL_PER_KG_TISSUE,
} from '../nutritionTargetsView';

describe('hydrateLoadedTargets', () => {
  test('passes null/undefined straight through', () => {
    expect(hydrateLoadedTargets(null, 80)).toBeNull();
    expect(hydrateLoadedTargets(undefined, 80)).toBeUndefined();
  });

  test('is a no-op for a freshly computed record that already has every field', () => {
    const fresh = {
      targetKcal: 2500,
      maintenanceKcal: 2800,
      bmrKcal: 1800,
      bmrFormula: 'Lean mass-adjusted formula',
      targetRateKgPerWeek: -0.27,
      proteinGPerKg: 2.2,
      proteinG: 176,
      proteinBasis: 'lean_mass',
    };
    expect(hydrateLoadedTargets(fresh, 80)).toEqual(fresh);
  });

  test('backfills maintenance and bmr from the persisted column names', () => {
    const raw = { targetKcal: 2000, tdee: 2400, bmr: 1700, bmrMethod: 'mifflin', proteinG: 160 };
    const out = hydrateLoadedTargets(raw, 80);
    expect(out.maintenanceKcal).toBe(2400);
    expect(out.bmrKcal).toBe(1700);
    expect(out.bmrFormula).toBe('Standard calorie formula');
    expect(out.proteinBasis).toBe('bodyweight');
  });

  test('maps lean-mass bmr methods to the lean-mass formula label', () => {
    expect(hydrateLoadedTargets({ targetKcal: 2000, bmrMethod: 'katch' }, 80).bmrFormula)
      .toBe('Lean mass-adjusted formula');
    expect(hydrateLoadedTargets({ targetKcal: 2000, bmrMethod: 'lbm' }, 80).bmrFormula)
      .toBe('Lean mass-adjusted formula');
  });

  test('derives weekly rate of change from the calorie gap (7700 kcal/kg)', () => {
    // 500 kcal/day deficit over 7 days / 7700 ≈ -0.45 kg/week.
    const out = hydrateLoadedTargets({ targetKcal: 2300, tdee: 2800, proteinG: 160 }, 80);
    const expected = Math.round(((2300 - 2800) * 7 / KCAL_PER_KG_TISSUE) * 100) / 100;
    expect(out.targetRateKgPerWeek).toBe(expected);
    expect(out.targetRateKgPerWeek).toBeLessThan(0);
  });

  test('derives protein-per-kg from stored protein grams and bodyweight', () => {
    const out = hydrateLoadedTargets({ targetKcal: 2500, proteinG: 176 }, 80);
    expect(out.proteinGPerKg).toBe(2.2);
  });

  test('leaves derived fields null when there is nothing to derive from', () => {
    const out = hydrateLoadedTargets({ targetKcal: 0 }, 0);
    expect(out.targetRateKgPerWeek).toBeUndefined();
    expect(out.proteinGPerKg).toBeUndefined();
  });
});

describe('getRecommendedMeals', () => {
  test('falls back to 4 when protein or bodyweight is missing', () => {
    expect(getRecommendedMeals(0, 80)).toBe(4);
    expect(getRecommendedMeals(160, 0)).toBe(4);
    expect(getRecommendedMeals(undefined, undefined)).toBe(4);
  });

  test('never recommends fewer than 3 meals even on a low target', () => {
    // 80kg → 44g per-meal ceiling; 60g needs ceil(60/44)=2, clamped up to 3.
    expect(getRecommendedMeals(60, 80)).toBe(3);
  });

  test('never recommends more than 6 meals on a very high target', () => {
    // 80kg → 44g ceiling; 400g needs ceil(400/44)=10, clamped down to 6.
    expect(getRecommendedMeals(400, 80)).toBe(6);
  });

  test('splits a high protein target so per-meal protein stays within the ceiling', () => {
    // 90kg → 49.5g per-meal ceiling; 200g needs ceil(200/49.5)=5 meals.
    const meals = getRecommendedMeals(200, 90);
    expect(meals).toBe(5);
    expect(200 / meals).toBeLessThanOrEqual(90 * 0.55);
  });
});
