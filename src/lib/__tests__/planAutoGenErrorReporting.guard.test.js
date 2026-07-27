/**
 * Regression pin for C1 (pre-release sweep 2026-07-27, LANE C — "raw error
 * messages reaching users"). Before this fix, a plan-engine throw in
 * generateAndSavePlan / generatePlanDryRun was turned into
 * `Plan engine failed: ${e?.message ?? 'unknown'}` and returned as `error`,
 * which PlanUpdateScreen then interpolated straight into a user-facing toast
 * during a failed "Adjust training" rebuild.
 *
 * This pins two things against the REAL functions (planEngine mocked to
 * throw a distinctive message, everything else stubbed):
 *   1. Both functions now return a FIXED calm code ('plan_engine_error'),
 *      never the raw exception text, when the engine throws.
 *   2. The diagnostic is NOT silently dropped: logError still receives the
 *      real Error object with the original message, so it survives in the
 *      on-device debug log / Sentry even though it is never shown.
 */
jest.mock('../database', () => ({
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(async () => []),
  activatePlanWithBlock: jest.fn(),
  archiveOtherUserPlans: jest.fn(),
  getAllProgrammes: jest.fn(async () => []),
  db: jest.fn(),
  runInTransaction: jest.fn(),
  deleteProgrammeCascade: jest.fn(),
  deleteProgrammeCascadeInTx: jest.fn(),
}));

const ENGINE_THROW_MESSAGE = 'SECRET-DIAGNOSTIC-TEXT: null pointer in pool selector';
jest.mock('../planEngine', () => ({
  generatePlan: jest.fn(() => { throw new Error('SECRET-DIAGNOSTIC-TEXT: null pointer in pool selector'); }),
}));
jest.mock('../errorLog', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

import { generateAndSavePlan, generatePlanDryRun } from '../planAutoGen';
import { logError } from '../errorLog';

const profile = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
  equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain',
  recoveryRating: 'average',
};

describe('planAutoGen engine-failure error reporting (C1 pin)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('generateAndSavePlan returns the fixed calm code, never the raw exception text', async () => {
    const result = await generateAndSavePlan('u1', profile);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('plan_engine_error');
    expect(result.error).not.toMatch(/SECRET-DIAGNOSTIC-TEXT/);
    expect(result.error).not.toMatch(/Plan engine failed/);
    // The diagnostic must survive in logError, this is not simply deleted.
    expect(logError).toHaveBeenCalledWith(
      'plan.generateAndSave.engineFailed',
      expect.objectContaining({ message: expect.stringContaining(ENGINE_THROW_MESSAGE) }),
      expect.anything(),
    );
  });

  test('generatePlanDryRun returns the same fixed calm code and also logs the real error', async () => {
    const result = await generatePlanDryRun('u1', profile);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('plan_engine_error');
    expect(result.error).not.toMatch(/SECRET-DIAGNOSTIC-TEXT/);
    expect(result.error).not.toMatch(/Plan engine failed/);
    expect(logError).toHaveBeenCalledWith(
      'plan.dryRun.engineFailed',
      expect.objectContaining({ message: expect.stringContaining(ENGINE_THROW_MESSAGE) }),
      expect.anything(),
    );
  });
});
