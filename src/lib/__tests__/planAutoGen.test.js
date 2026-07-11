/**
 * Verifies the goal-change input-builder produces the right plan inputs
 * even when the user's profile is missing optional fields. This is the
 * exact path the Hub wizard hits when a user switches from "build muscle"
 * to "wellness" mid-mesocycle, the bug surfaced in commit c1dabca was
 * that this used to bail entirely on older profiles.
 */
jest.mock('../database', () => ({
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(),
  activatePlanWithBlock: jest.fn(),
  archiveOtherUserPlans: jest.fn(),
  getAllProgrammes: jest.fn(),
  db: jest.fn(),
  runInTransaction: jest.fn(),
  deleteProgrammeCascade: jest.fn(),
  deleteProgrammeCascadeInTx: jest.fn(),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import { buildPlanInputs, generateAndSavePlan, generatePlanDryRun } from '../planAutoGen';
import { POOL } from '../planEngine';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, archiveOtherUserPlans, getAllProgrammes,
  db, runInTransaction, deleteProgrammeCascade, deleteProgrammeCascadeInTx,
} from '../database';

// A library that contains every name the engine can pick, so the match loop
// resolves (mirrors a fully-seeded device).
const FULL_LIBRARY = Object.values(POOL).flat().map((e) => ({ name: e.n }));

describe('buildPlanInputs', () => {
  test('returns null when trainingGoal is missing', () => {
    expect(buildPlanInputs({ trainingPhase: 'maint' })).toBeNull();
    expect(buildPlanInputs(null)).toBeNull();
    expect(buildPlanInputs(undefined)).toBeNull();
  });

  test('falls back to maintain phase for legacy profiles missing trainingPhase', () => {
    // Legacy users with only trainingGoal (general_hypertrophy etc.)
    // used to be stuck, buildPlanInputs returned null and they couldn't
    // regenerate. Now we migrate the goal ID and back-fill phase=maintain
    // so they can refresh their plan without re-onboarding.
    const inputs = buildPlanInputs({ trainingGoal: 'build_muscle' });
    expect(inputs).not.toBeNull();
    expect(inputs.phase).toBe('maintain');
    expect(inputs.nutritionPhase).toBe('maintain');
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

describe('generateAndSavePlan atomic persistence', () => {
  const profile = {
    experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
    equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain',
    recoveryRating: 'average',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAllProgrammes.mockResolvedValue([]);
    getAllExercises.mockResolvedValue(FULL_LIBRARY.map((exercise, index) => ({
      ...exercise,
      id: `exercise-${index}`,
    })));
    db.mockResolvedValue({});
    runInTransaction.mockImplementation(async (_connection, task) => task());
    createProgramme.mockResolvedValue({ id: 'programme-1' });
    let routineIndex = 0;
    createRoutine.mockImplementation(async () => ({ id: `routine-${routineIndex++}` }));
    addExerciseToRoutine.mockResolvedValue({ id: 'routine-exercise-1' });
    activatePlanWithBlock.mockResolvedValue('mesocycle-1');
    archiveOtherUserPlans.mockResolvedValue(undefined);
    deleteProgrammeCascade.mockResolvedValue(undefined);
    deleteProgrammeCascadeInTx.mockResolvedValue(undefined);
  });

  test('writes the plan in one transaction and suppresses intermediate sync', async () => {
    const result = await generateAndSavePlan('u1', profile);

    expect(result.ok).toBe(true);
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(createProgramme).toHaveBeenCalledWith(
      'u1', expect.any(String), expect.any(String), 0, null, null, null, false,
    );
    for (const call of createRoutine.mock.calls) expect(call.at(-1)).toBe(false);
    for (const call of addExerciseToRoutine.mock.calls) expect(call.at(-1)).toBe(false);
    expect(deleteProgrammeCascade).not.toHaveBeenCalled();
  });

  test('zero library matches remove the empty programme without scheduling sync', async () => {
    getAllExercises.mockResolvedValue([]);

    const result = await generateAndSavePlan('u1', profile);

    expect(result).toEqual({
      ok: false,
      error: 'Plan created but no exercises matched the library',
    });
    // The zero-match rollback runs INSIDE the write transaction, so it must
    // use the raw InTx variant - a nested runInTransaction call would
    // deadlock the queue (contract tightened 2026-07-11).
    expect(deleteProgrammeCascadeInTx).toHaveBeenCalledWith(
      expect.anything(),
      'programme-1',
    );
    expect(deleteProgrammeCascade).not.toHaveBeenCalled();
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
  });

  test.each([
    ['programme insert', createProgramme],
    ['routine insert', createRoutine],
    ['exercise insert', addExerciseToRoutine],
  ])('%s failure returns an error and cleans any allocated programme', async (_label, failingWrite) => {
    failingWrite.mockRejectedValueOnce(new Error('injected write failure'));

    const result = await generateAndSavePlan('u1', profile);

    expect(result).toEqual({ ok: false, error: 'injected write failure' });
    if (failingWrite === createProgramme) {
      expect(deleteProgrammeCascade).not.toHaveBeenCalled();
    } else {
      expect(deleteProgrammeCascade).toHaveBeenCalledWith(
        'programme-1',
        { scheduleSync: false },
      );
    }
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
  });
});

// ULTIMATE-PLANDIFF-01: the dry-run is the read-only twin of generateAndSavePlan.
describe('generatePlanDryRun', () => {
  const profile = {
    experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
    equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain',
    recoveryRating: 'average',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    getAllExercises.mockResolvedValue(FULL_LIBRARY);
  });

  const expectNoWrites = () => {
    expect(createProgramme).not.toHaveBeenCalled();
    expect(createRoutine).not.toHaveBeenCalled();
    expect(addExerciseToRoutine).not.toHaveBeenCalled();
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
  };

  test('produces a prospective plan WITHOUT writing or activating anything', async () => {
    const res = await generatePlanDryRun('u1', profile);
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.plan.workouts)).toBe(true);
    expect(res.plan.workouts.length).toBeGreaterThan(0);
    expect(res.sessionLengthMinutes).toBe(75);
    expectNoWrites(); // the whole point: no persistence side effects
  });

  test('mirrors the commit zero-match guard: no resolvable moves → ok:false, no writes', async () => {
    getAllExercises.mockResolvedValue([]); // nothing resolves → commit would bail too
    const res = await generatePlanDryRun('u1', profile);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/matched/i);
    expectNoWrites();
  });

  test('bails like the commit on a missing user / incomplete profile', async () => {
    expect(await generatePlanDryRun(null, profile)).toEqual({ ok: false, error: 'No user' });
    expect((await generatePlanDryRun('u1', {})).ok).toBe(false);
    expect((await generatePlanDryRun('u1', {})).error).toBe('Profile incomplete');
    expectNoWrites();
  });
});
