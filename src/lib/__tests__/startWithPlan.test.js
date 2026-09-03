/**
 * startWithPlan (D139): the two-step behind every "Volyume builds you a plan"
 * moment outside Adjust training.
 *
 * The contract this pins, written to fail if the preview ever becomes a
 * formality:
 *   1. prepare WRITES NOTHING. It runs the capability pre-flight, then the
 *      read-only dry run, and returns the preview plus the number of plans
 *      the commit would archive. generateAndSavePlan must not be reachable
 *      from it.
 *   2. a pre-flight hold, or a failed dry run, returns ok:false with a reason
 *      and no preview, so a caller cannot open a sheet over nothing.
 *   3. commit delegates to the engine's own generateAndSavePlan, unchanged.
 *      The deterministic engine is not touched by any of this.
 */

jest.mock('../database', () => ({
  getActivePlan: jest.fn(async () => null),
  getRoutinesForPlan: jest.fn(async () => []),
  getRoutineExercisesWithDetails: jest.fn(async () => []),
  getAllPlansForUser: jest.fn(async () => []),
  getActiveBlock: jest.fn(async () => null),
}));

jest.mock('../planAutoGen', () => ({
  generatePlanDryRun: jest.fn(),
  generateAndSavePlan: jest.fn(),
  thinSessionReport: jest.fn(() => []),
}));

jest.mock('../capability/preflight', () => ({
  capabilityPreflight: jest.fn(async () => ({ proceed: true })),
  offerCapabilityPreflightChoice: jest.fn(),
}));

jest.mock('../planRationale', () => ({
  buildChangeReceipt: jest.fn(() => ({ headline: 'receipt', stays: [], changes: [], added: [], noLongerIn: [] })),
}));

jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const {
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails, getAllPlansForUser, getActiveBlock,
} = require('../database');
const { generatePlanDryRun, generateAndSavePlan } = require('../planAutoGen');
const { capabilityPreflight, offerCapabilityPreflightChoice } = require('../capability/preflight');
const { prepareStartWithPlan, commitStartWithPlan, readActivePlanSummary } = require('../startWithPlan');

const DRY_OK = {
  ok: true,
  plan: { splitType: 'upper_lower', workouts: [{ name: 'Upper A', exercises: [{ exerciseName: 'Back Squat' }] }] },
  sessionLengthMinutes: 60,
  structureMemory: null,
  continuity: { isRebuild: false, decisions: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  capabilityPreflight.mockResolvedValue({ proceed: true });
  generatePlanDryRun.mockResolvedValue(DRY_OK);
  getActivePlan.mockResolvedValue(null);
  getAllPlansForUser.mockResolvedValue([]);
  getActiveBlock.mockResolvedValue(null);
});

describe('prepareStartWithPlan', () => {
  test('returns the preview and never reaches the committing generator', async () => {
    getAllPlansForUser.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const res = await prepareStartWithPlan('u1', { daysPerWeek: 4 });
    expect(res.ok).toBe(true);
    expect(res.preview.mode).toBe('first');
    expect(res.preview.plan).toBe(DRY_OK.plan);
    expect(res.otherPlansCount).toBe(2);
    expect(generatePlanDryRun).toHaveBeenCalledWith('u1', { daysPerWeek: 4 });
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  test('carries the block position so the sheet and the confirm dialogue agree', async () => {
    getActiveBlock.mockResolvedValue({ startDate: Date.now() - (14 * 86400000), plannedWeeks: 6 });
    const res = await prepareStartWithPlan('u1', {});
    expect(res.preview.blockStatus.currentWeek).toBe(3);
    expect(res.preview.blockStatus.totalWeeks).toBe(6);
  });

  test('diffs against the current plan when there is one, and against nothing when there is not', async () => {
    const res = await prepareStartWithPlan('u1', {});
    expect(res.preview.diff).toBeNull();

    getActivePlan.mockResolvedValue({ id: 'plan1' });
    getRoutinesForPlan.mockResolvedValue([{ id: 'r1', splitType: 'full_body' }]);
    getRoutineExercisesWithDetails.mockResolvedValue([{ exercise: { name: 'Deadlift' } }]);
    const res2 = await prepareStartWithPlan('u1', {}, { mode: 'goal', currentSessionLengthMinutes: 45 });
    expect(res2.preview.mode).toBe('goal');
    expect(res2.preview.diff.sessionLength.now).toBe(45);
    expect(res2.preview.diff.sessionLength.after).toBe(60);
    expect(res2.preview.diff.movesDropped).toContain('Deadlift');
  });

  test('a pre-flight hold writes nothing and never runs the dry run', async () => {
    capabilityPreflight.mockResolvedValue({ proceed: false });
    offerCapabilityPreflightChoice.mockImplementation(({ onHold }) => onHold());
    const res = await prepareStartWithPlan('u1', {});
    expect(res).toEqual({ ok: false, reason: 'preflight_hold', preview: null, otherPlansCount: 0 });
    expect(generatePlanDryRun).not.toHaveBeenCalled();
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  test('continuing past the pre-flight proceeds to the dry run', async () => {
    capabilityPreflight.mockResolvedValue({ proceed: false });
    offerCapabilityPreflightChoice.mockImplementation(({ onContinue }) => onContinue());
    const res = await prepareStartWithPlan('u1', {});
    expect(res.ok).toBe(true);
    expect(generatePlanDryRun).toHaveBeenCalled();
  });

  test('a failed dry run returns the reason with no preview to show', async () => {
    generatePlanDryRun.mockResolvedValue({ ok: false, error: 'plan_engine_error' });
    const res = await prepareStartWithPlan('u1', {});
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('dry_run_failed');
    expect(res.error).toBe('plan_engine_error');
    expect(res.preview).toBeNull();
  });

  test('a thrown dry run is caught, logged and reported, never crashed through', async () => {
    generatePlanDryRun.mockRejectedValue(new Error('boom'));
    const res = await prepareStartWithPlan('u1', {});
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('dry_run_failed');
    expect(require('../errorLog').logError).toHaveBeenCalledWith('startWithPlan.prepare', expect.any(Error), { userId: 'u1' });
  });

  test('no user is refused before anything is read', async () => {
    const res = await prepareStartWithPlan(null, {});
    expect(res).toEqual({ ok: false, reason: 'no_user', preview: null, otherPlansCount: 0 });
    expect(capabilityPreflight).not.toHaveBeenCalled();
  });
});

describe('commitStartWithPlan', () => {
  test('delegates to generateAndSavePlan and returns its result untouched', async () => {
    const result = { ok: true, programmeId: 'prog1', capabilityBlockedCount: 2 };
    generateAndSavePlan.mockResolvedValue(result);
    await expect(commitStartWithPlan('u1', { daysPerWeek: 5 })).resolves.toBe(result);
    expect(generateAndSavePlan).toHaveBeenCalledWith('u1', { daysPerWeek: 5 });
  });
});

describe('readActivePlanSummary', () => {
  test('returns null when there is no active plan or the read fails', async () => {
    await expect(readActivePlanSummary('u1', 60)).resolves.toBeNull();
    getActivePlan.mockRejectedValue(new Error('db down'));
    await expect(readActivePlanSummary('u1', 60)).resolves.toBeNull();
  });
});
