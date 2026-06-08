/**
 * nutritionConsistency.test.js
 *
 * Guards the fix for the onboarding vs Update-Your-Plan calorie discrepancy.
 *
 * Root cause that this locks down: the update flow used to omit bodyFatSource,
 * so calcBMR fell back to Mifflin-St Jeor while onboarding used Katch-McArdle,
 * producing materially different calories from an unchanged body. Both flows now
 * build engine inputs through the single buildNutritionEngineInputs helper.
 *
 * Fixture is the audit's Phase 4 case:
 *   Male, 42, 5ft10in (177.8 cm), 96 kg, 12% body fat (caliper),
 *   Build muscle (bulk), 4 training days, Men's Physique, advanced protein.
 */

import { calculateNutritionTargets } from '../nutritionEngine';
import { buildNutritionEngineInputs, daysToActivityLevel, phaseToNutritionKey } from '../coachingGoals';

const FIXTURE = {
  sex: 'male',
  age: 42,
  heightCm: 177.8,
  weightKg: 96,
  bodyFatPct: 12,
  bodyFatSource: 'caliper',
  daysPerWeek: 4,
  trainingPhase: 'bulk',
  trainingGoal: 'mens_physique',
  proteinApproach: 'advanced',
};

function macros(t) {
  return { kcal: t.targetKcal, protein: t.proteinG, carbs: t.carbsG, fat: t.fatG };
}

describe('buildNutritionEngineInputs', () => {
  test('maps a profile to the exact engine input shape', () => {
    const inputs = buildNutritionEngineInputs(FIXTURE);
    expect(inputs).toMatchObject({
      sex: 'male',
      ageYears: 42,
      heightCm: 177.8,
      weightKg: 96,
      bodyFatPercent: 12,
      bodyFatSource: 'caliper',
      activityLevel: daysToActivityLevel(4),     // 'moderate'
      goal: phaseToNutritionKey('bulk'),         // 'build'
      trainingGoal: 'mens_physique',
      proteinApproach: 'advanced',
      experienceLevel: 'intermediate',           // FIXTURE carries no experience
    });
  });

  test('passes experience through and defaults to intermediate', () => {
    expect(buildNutritionEngineInputs({ ...FIXTURE, experience: 'competitive' }).experienceLevel).toBe('competitive');
    expect(buildNutritionEngineInputs({ ...FIXTURE, experience: null }).experienceLevel).toBe('intermediate');
  });

  test('drops body-fat source when the percentage is missing or out of range', () => {
    expect(buildNutritionEngineInputs({ ...FIXTURE, bodyFatPct: null }).bodyFatSource).toBeNull();
    expect(buildNutritionEngineInputs({ ...FIXTURE, bodyFatPct: 0 }).bodyFatPercent).toBeNull();
    expect(buildNutritionEngineInputs({ ...FIXTURE, bodyFatPct: 80 }).bodyFatPercent).toBeNull();
  });
});

describe('onboarding vs Update Your Plan parity', () => {
  // Onboarding builds inputs from the values the wizard collected.
  const onboardingInputs = buildNutritionEngineInputs(FIXTURE);
  // Update reads the same values back from the stored profile. Same builder,
  // same stored fields -> identical input object.
  const updateInputs = buildNutritionEngineInputs({
    sex: FIXTURE.sex,
    age: FIXTURE.age,
    heightCm: FIXTURE.heightCm,
    weightKg: FIXTURE.weightKg,
    bodyFatPct: FIXTURE.bodyFatPct,
    bodyFatSource: FIXTURE.bodyFatSource,
    daysPerWeek: FIXTURE.daysPerWeek,
    trainingPhase: FIXTURE.trainingPhase,
    trainingGoal: FIXTURE.trainingGoal,
    proteinApproach: FIXTURE.proteinApproach,
  });

  test('both flows construct identical engine inputs', () => {
    expect(updateInputs).toEqual(onboardingInputs);
  });

  test('both flows produce identical calories and macros', () => {
    const a = calculateNutritionTargets(onboardingInputs);
    const b = calculateNutritionTargets(updateInputs);
    expect(macros(b)).toEqual(macros(a));
  });

  test('locks the Katch-McArdle output numbers for the fixture', () => {
    const t = calculateNutritionTargets(onboardingInputs);
    expect(t.formulaUsed).toBe('katch_mcardle');
    expect(macros(t)).toEqual({ kcal: 3980, protein: 253, carbs: 549, fat: 86 });
  });

  test('experience scales the surplus: beginner > intermediate > competitive on a bulk', () => {
    const kcalFor = (experience) =>
      calculateNutritionTargets(buildNutritionEngineInputs({ ...FIXTURE, experience })).targetKcal;
    const beginner = kcalFor('beginner');
    const intermediate = kcalFor('intermediate');
    const competitive = kcalFor('competitive');
    expect(intermediate).toBe(3980);          // unchanged baseline
    expect(beginner).toBeGreaterThan(intermediate);
    expect(competitive).toBeLessThan(intermediate);
  });

  test('experience does not affect a deficit phase', () => {
    const cut = (experience) =>
      calculateNutritionTargets(buildNutritionEngineInputs({ ...FIXTURE, trainingPhase: 'cut', experience })).targetKcal;
    expect(cut('competitive')).toBe(cut('beginner'));
  });

  test('regression: dropping body-fat source (the old update bug) diverges', () => {
    // Reproduces the pre-fix update path: BF% present but source missing -> Mifflin.
    const broken = calculateNutritionTargets({
      ...onboardingInputs,
      bodyFatSource: undefined,
    });
    expect(broken.formulaUsed).toBe('mifflin');
    // The very discrepancy the fix removes: hundreds of kcal lower, no body change.
    expect(broken.targetKcal).toBeLessThan(3980);
    expect(3980 - broken.targetKcal).toBeGreaterThan(400);
  });
});
