/**
 * campaign16.planFitResolver.test.js — the shared schedule-fit resolver.
 *
 * `assessScheduleFit` is the single entry point onboarding and Update Your
 * Plan both use. The suite beside this one pins the fit MODEL; this one pins
 * the resolver's contract with the rest of the app:
 *
 *   - it answers from the athlete's real profile, through buildPlanInputs,
 *     so the fit answer and the plan can never be computed from different
 *     inputs;
 *   - it writes NOTHING, so asking "would 45 minutes work?" cannot disturb
 *     the plan the athlete already has;
 *   - it degrades quietly, because a fit answer is guidance and losing it
 *     must never block a build.
 */

jest.mock('../database', () => ({
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(async () => []),
  activatePlanWithBlock: jest.fn(),
  archiveOtherUserPlans: jest.fn(),
  getAllProgrammes: jest.fn(),
  db: jest.fn(),
  runInTransaction: jest.fn(),
  deleteProgrammeCascade: jest.fn(),
  deleteProgrammeCascadeInTx: jest.fn(),
  getActiveBlock: jest.fn(async () => null),
  getActivePlan: jest.fn(async () => null),
  getRoutinesForPlan: jest.fn(async () => []),
  getRoutineExercisesWithDetails: jest.fn(async () => []),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import { assessScheduleFit } from '../planAutoGen';
import { PLAN_FIT } from '../planFit';
import * as database from '../database';

const { LIBRARY } = require('./campaign16.helpers');

const PROFILE = {
  trainingGoal: 'general',
  trainingPhase: 'lean_gain',
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionLengthMinutes: 60,
  equipment: 'full_gym',
  planWeakPoints: [],
  recoveryRating: 'average',
};

beforeEach(() => {
  jest.clearAllMocks();
  database.getAllExercises.mockResolvedValue(LIBRARY);
});

describe('C16-FIT assessScheduleFit', () => {
  test('answers from the athlete\'s profile, with alternatives it verified', async () => {
    const fit = await assessScheduleFit(PROFILE);
    expect(fit.ok).toBe(true);
    expect(fit.state).toBe(PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN);
    expect(fit.daysPerWeek).toBe(4);
    expect(fit.sessionLengthMinutes).toBe(60);
    for (const alt of fit.alternatives) {
      expect([PLAN_FIT.FULL_TARGET_FIT, PLAN_FIT.EXTRA_HEADROOM]).toContain(alt.state);
    }
    // Every length the UI offers comes back decorated.
    expect(fit.durations.map(d => d.minutes)).toEqual([45, 60, 75, 90]);
  });

  test('a schedule that carries the plan needs no alternatives', async () => {
    const fit = await assessScheduleFit({ ...PROFILE, sessionLengthMinutes: 75 });
    expect(fit.state).toBe(PLAN_FIT.FULL_TARGET_FIT);
    expect(fit.alternatives).toEqual([]);
  });

  test('two sessions a week is answered, not clamped', async () => {
    const fit = await assessScheduleFit({ ...PROFILE, daysPerWeek: 2, sessionLengthMinutes: 90 });
    expect(fit.ok).toBe(true);
    expect(fit.daysPerWeek).toBe(2);
  });

  test('it writes nothing', async () => {
    await assessScheduleFit(PROFILE, { userId: 'u1' });
    for (const write of [
      'createProgramme', 'createRoutine', 'addExerciseToRoutine',
      'activatePlanWithBlock', 'archiveOtherUserPlans', 'runInTransaction',
      'deleteProgrammeCascade',
    ]) {
      expect(database[write]).not.toHaveBeenCalled();
    }
  });

  test('an incomplete profile is refused rather than guessed at', async () => {
    const fit = await assessScheduleFit({ ...PROFILE, trainingGoal: null });
    expect(fit).toEqual({ ok: false, error: 'Profile incomplete' });
  });

  test('a catalogue read failure does not take the answer down with it', async () => {
    database.getAllExercises.mockRejectedValue(new Error('db gone'));
    const fit = await assessScheduleFit(PROFILE);
    // The engine falls back to its own pool, exactly as generation does.
    expect(fit.ok).toBe(true);
    expect(Object.values(PLAN_FIT)).toContain(fit.state);
  });

  test('the same question twice gives the same answer', async () => {
    const a = await assessScheduleFit(PROFILE);
    const b = await assessScheduleFit(PROFILE);
    expect(b).toEqual(a);
  });
});
