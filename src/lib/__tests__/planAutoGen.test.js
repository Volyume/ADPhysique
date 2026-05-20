/**
 * Verifies the goal-change input-builder produces the right plan inputs
 * even when the user's profile is missing optional fields. This is the
 * exact path the Hub wizard hits when a user switches from "build muscle"
 * to "wellness" mid-mesocycle — the bug surfaced in commit c1dabca was
 * that this used to bail entirely on older profiles.
 */
jest.mock('../database', () => ({
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(),
  activatePlanWithBlock: jest.fn(),
}));

import { buildPlanInputs } from '../planAutoGen';

describe('buildPlanInputs', () => {
  test('returns null when trainingGoal is missing', () => {
    expect(buildPlanInputs({ trainingPhase: 'maint' })).toBeNull();
    expect(buildPlanInputs({ trainingGoal: 'build_muscle' })).toBeNull();
    expect(buildPlanInputs(null)).toBeNull();
    expect(buildPlanInputs(undefined)).toBeNull();
  });

  test('returns inputs with all the user-supplied fields', () => {
    const inputs = buildPlanInputs({
      experience: 'advanced',
      daysPerWeek: 5,
      sessionLengthMinutes: 75,
      equipment: 'home_gym',
      trainingGoal: 'physique',
      trainingPhase: 'mild_bulk',
      planWeakPoints: ['shoulders', 'back'],
      recoveryRating: 'good',
    });
    expect(inputs).toMatchObject({
      experience: 'advanced',
      daysPerWeek: 5,
      sessionLengthMinutes: 75,
      equipment: 'home_gym',
      goal: 'physique',
      phase: 'mild_bulk',
      weakPoints: ['shoulders', 'back'],
      recoveryRating: 'good',
    });
    expect(inputs.nutritionPhase).toBeDefined();
  });

  test('back-fills sensible defaults for older profiles missing optional fields', () => {
    // The minimum needed is just goal + phase. Everything else has a default
    // so older profiles still trigger a fresh plan generation.
    const inputs = buildPlanInputs({
      trainingGoal: 'wellness',
      trainingPhase: 'maint',
    });
    expect(inputs).not.toBeNull();
    expect(inputs.experience).toBe('intermediate');
    expect(inputs.equipment).toBe('full_gym');
    expect(inputs.daysPerWeek).toBeGreaterThan(0);
    expect(inputs.sessionLengthMinutes).toBeGreaterThan(0);
    expect(inputs.recoveryRating).toBe('average');
    expect(inputs.weakPoints).toEqual([]);
  });

  test('passes weakPoints through unchanged when supplied', () => {
    const inputs = buildPlanInputs({
      trainingGoal: 'build_muscle',
      trainingPhase: 'recomp',
      planWeakPoints: ['rear_delts'],
    });
    expect(inputs.weakPoints).toEqual(['rear_delts']);
  });

  test('preserves nullish recoveryRating with the "average" default', () => {
    const inputs = buildPlanInputs({
      trainingGoal: 'build_muscle',
      trainingPhase: 'maint',
      recoveryRating: null,
    });
    expect(inputs.recoveryRating).toBe('average');
  });

  test('switching goal from build_muscle to wellness still produces valid inputs', () => {
    // Same profile shape that flowed through ProGoalSetupScreen.
    // Phase values come from TRAINING_PHASES (coachingGoals.js): cut, bulk,
    // maintain, lean_gain, recomp.
    const before = buildPlanInputs({
      experience: 'intermediate',
      daysPerWeek: 4,
      sessionLengthMinutes: 60,
      equipment: 'full_gym',
      trainingGoal: 'build_muscle',
      trainingPhase: 'cut',
      recoveryRating: 'average',
    });
    const after = buildPlanInputs({
      experience: 'intermediate',
      daysPerWeek: 4,
      sessionLengthMinutes: 60,
      equipment: 'full_gym',
      trainingGoal: 'wellness',
      trainingPhase: 'maintain',
      recoveryRating: 'average',
    });
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after.goal).toBe('wellness');
    expect(after.phase).toBe('maintain');
    expect(after.nutritionPhase).not.toBe(before.nutritionPhase);
  });

  test('unknown phase falls back to the maintain nutrition key (not a crash)', () => {
    const inputs = buildPlanInputs({
      trainingGoal: 'build_muscle',
      trainingPhase: 'something_weird',
    });
    expect(inputs).not.toBeNull();
    expect(inputs.nutritionPhase).toBe('maintain');
  });
});
