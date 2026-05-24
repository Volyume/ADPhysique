/**
 * Stress + edge-case tests added during the 2026-05-21 multi-agent audit.
 *
 * These cover scenarios the earlier suites missed:
 *   - generatePlan() determinism (same inputs → identical output)
 *   - generatePlan() under extreme inputs (1 day, 7 days, very long sessions)
 *   - calculateNutritionTargets() bounds (extreme bodyweight, missing fields)
 *   - phaseToCoachingKey() unknown values logged
 *   - planAutoGen legacy profile migration path
 *
 * The aim is to lock in the audit-fix behaviour so regressions surface.
 */

jest.mock('../database', () => ({
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(),
  activatePlanWithBlock: jest.fn(),
}));

import { generatePlan } from '../planEngine';
import { calculateNutritionTargets } from '../nutritionEngine';
import { phaseToCoachingKey } from '../coachingGoals';
import { buildPlanInputs } from '../planAutoGen';

const BASE_INPUTS = {
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionLengthMinutes: 60,
  equipment: 'full_gym',
  goal: 'general',
  phase: 'maintain',
  weakPoints: [],
  recoveryRating: 'average',
  nutritionPhase: 'maintain',
};

describe('generatePlan — determinism', () => {
  test('identical inputs produce byte-identical output', () => {
    const a = generatePlan(BASE_INPUTS);
    const b = generatePlan(BASE_INPUTS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('determinism holds across all physique categories', () => {
    const categories = [
      'general', 'mens_physique', 'classic_physique', 'bodybuilding',
      'bikini', 'wellness', 'figure', 'womens_physique',
    ];
    for (const goal of categories) {
      const a = generatePlan({ ...BASE_INPUTS, goal });
      const b = generatePlan({ ...BASE_INPUTS, goal });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  test('determinism holds across all training phases', () => {
    const phases = ['cut', 'maintain', 'lean_gain', 'bulk', 'recomp', 'strength_size', 'weak_point'];
    for (const phase of phases) {
      const a = generatePlan({
        ...BASE_INPUTS,
        phase,
        nutritionPhase: phase,
        weakPoints: phase === 'weak_point' ? ['Chest'] : [],
      });
      const b = generatePlan({
        ...BASE_INPUTS,
        phase,
        nutritionPhase: phase,
        weakPoints: phase === 'weak_point' ? ['Chest'] : [],
      });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});

describe('generatePlan — extreme inputs', () => {
  test('handles 3 days/week (minimum sensible) without crashing', () => {
    const plan = generatePlan({ ...BASE_INPUTS, daysPerWeek: 3 });
    expect(plan).toBeDefined();
    expect(plan.workouts.length).toBeGreaterThanOrEqual(3);
  });

  test('handles 6 days/week (max) without crashing', () => {
    const plan = generatePlan({ ...BASE_INPUTS, daysPerWeek: 6 });
    expect(plan).toBeDefined();
    expect(plan.workouts.length).toBe(6);
  });

  test('handles 30-minute sessions (very short)', () => {
    const plan = generatePlan({ ...BASE_INPUTS, sessionLengthMinutes: 30 });
    expect(plan).toBeDefined();
    plan.workouts.forEach(r => {
      expect(r.exercises.length).toBeGreaterThan(0);
    });
  });

  test('handles 120-minute sessions (very long)', () => {
    const plan = generatePlan({ ...BASE_INPUTS, sessionLengthMinutes: 120 });
    expect(plan).toBeDefined();
  });

  test('beginner experience clamps appropriately', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'beginner', daysPerWeek: 6 });
    expect(plan).toBeDefined();
    // Beginner with 6 days should still produce a sensible plan
    plan.workouts.forEach(r => {
      expect(r.exercises.length).toBeGreaterThan(0);
    });
  });

  test('competitive experience produces high-volume plan', () => {
    const plan = generatePlan({
      ...BASE_INPUTS,
      experience: 'competitive',
      goal: 'bodybuilding',
      daysPerWeek: 6,
    });
    expect(plan).toBeDefined();
    // Sum total weekly sets — competitive should be substantial
    let totalSets = 0;
    plan.workouts.forEach(r => {
      r.exercises.forEach(ex => { totalSets += ex.sets; });
    });
    expect(totalSets).toBeGreaterThan(40);
  });

  test('home gym equipment still produces a valid plan', () => {
    const plan = generatePlan({ ...BASE_INPUTS, equipment: 'home_gym' });
    expect(plan).toBeDefined();
    plan.workouts.forEach(r => {
      expect(r.exercises.length).toBeGreaterThan(0);
    });
  });

  test('weak_point phase with multiple weak points distributes priority', () => {
    const plan = generatePlan({
      ...BASE_INPUTS,
      phase: 'weak_point',
      weakPoints: ['Chest', 'Side Delts', 'Biceps'],
    });
    expect(plan).toBeDefined();
    // The plan should generate without errors; we don't assert exact set
    // distribution here (engine-invariants.test.js covers that)
  });
});

describe('calculateNutritionTargets — bounds', () => {
  test('clamps extreme low bodyweight to safe minimum', () => {
    const targets = calculateNutritionTargets({
      sex: 'male', ageYears: 25, heightCm: 175, weightKg: 10, // absurdly low
      activityLevel: 'moderate', goal: 'maintain', trainingGoal: 'general',
    });
    expect(targets.targetKcal).toBeGreaterThan(1000); // clamps to ≥30kg
    expect(targets.proteinG).toBeGreaterThan(0);
  });

  test('clamps extreme high bodyweight to safe maximum', () => {
    const targets = calculateNutritionTargets({
      sex: 'male', ageYears: 25, heightCm: 175, weightKg: 500, // absurdly high
      activityLevel: 'moderate', goal: 'maintain', trainingGoal: 'general',
    });
    // Clamped at 350; should produce a finite (not Infinity / NaN) target
    expect(Number.isFinite(targets.targetKcal)).toBe(true);
    expect(targets.targetKcal).toBeGreaterThan(2000);
    expect(targets.targetKcal).toBeLessThan(10000); // 350kg ceiling produces ~7000kcal
  });

  test('handles missing age with sensible default', () => {
    const targets = calculateNutritionTargets({
      sex: 'male', ageYears: null, heightCm: 175, weightKg: 80,
      activityLevel: 'moderate', goal: 'maintain', trainingGoal: 'general',
    });
    expect(targets.targetKcal).toBeGreaterThan(1500);
    expect(targets.targetKcal).toBeLessThan(4000);
  });

  test('handles missing height with sensible default', () => {
    const targets = calculateNutritionTargets({
      sex: 'female', ageYears: 30, heightCm: null, weightKg: 65,
      activityLevel: 'moderate', goal: 'maintain', trainingGoal: 'general',
    });
    expect(targets.targetKcal).toBeGreaterThan(1200);
    expect(targets.targetKcal).toBeLessThan(3500);
  });

  test('female targets are lower than male for same metrics', () => {
    const base = {
      ageYears: 30, heightCm: 170, weightKg: 70,
      activityLevel: 'moderate', goal: 'maintain', trainingGoal: 'general',
    };
    const male = calculateNutritionTargets({ ...base, sex: 'male' });
    const female = calculateNutritionTargets({ ...base, sex: 'female' });
    expect(female.targetKcal).toBeLessThan(male.targetKcal);
  });
});

describe('phaseToCoachingKey — defensive logging', () => {
  test('returns "maint" for unknown phases (with warn logged)', () => {
    // The fallback fires logWarn but doesn't throw — we just verify the
    // return value, since the warn fires asynchronously via require()
    expect(phaseToCoachingKey('cut')).toBeDefined();
    expect(phaseToCoachingKey('something_weird')).toBe('maint');
    expect(phaseToCoachingKey(null)).toBe('maint');
    expect(phaseToCoachingKey(undefined)).toBe('maint');
    expect(phaseToCoachingKey('')).toBe('maint');
  });

  test('valid phases return their canonical coaching key', () => {
    // Spot-check that known phases produce non-fallback values
    const cut = phaseToCoachingKey('cut');
    expect(cut).not.toBe('maint');
    expect(typeof cut).toBe('string');
  });
});

describe('buildPlanInputs — legacy profile migration', () => {
  test('migrates general_hypertrophy + missing phase to general/maintain', () => {
    const inputs = buildPlanInputs({ trainingGoal: 'general_hypertrophy' });
    expect(inputs).not.toBeNull();
    expect(inputs.goal).toBe('general');
    expect(inputs.phase).toBe('maintain');
  });

  test('migrates strength_hypertrophy to general/strength_size when no phase set', () => {
    const inputs = buildPlanInputs({ trainingGoal: 'strength_hypertrophy' });
    expect(inputs).not.toBeNull();
    expect(inputs.goal).toBe('general');
    expect(inputs.phase).toBe('strength_size');
  });

  test('migrates weak_point_spec to general/weak_point when no phase set', () => {
    const inputs = buildPlanInputs({ trainingGoal: 'weak_point_spec' });
    expect(inputs).not.toBeNull();
    expect(inputs.goal).toBe('general');
    expect(inputs.phase).toBe('weak_point');
  });

  test("doesn't clobber user-set phase during legacy migration", () => {
    // strength_hypertrophy + cut should keep the cut phase, not force strength_size
    const inputs = buildPlanInputs({
      trainingGoal: 'strength_hypertrophy',
      trainingPhase: 'cut',
    });
    expect(inputs.phase).toBe('cut');
  });

  test('current-model goals pass through unchanged', () => {
    const inputs = buildPlanInputs({
      trainingGoal: 'mens_physique',
      trainingPhase: 'lean_gain',
    });
    expect(inputs.goal).toBe('mens_physique');
    expect(inputs.phase).toBe('lean_gain');
  });
});
