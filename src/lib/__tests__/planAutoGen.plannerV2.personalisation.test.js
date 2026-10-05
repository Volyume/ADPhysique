/**
 * planAutoGen.plannerV2.personalisation.test.js -- D219 lane R3 (design 4.13 and
 * 4.6, S F14, the lane brief item 3): the learner's gated factor and the
 * person's own gaps reach the new planner at a build, a rebuild and a block
 * boundary, which is every route into buildPlanWithPlannerV2, and nowhere else.
 *
 * Pins (each fails on the code before this lane, which passes the planner
 * neither input):
 *  - a new plan is built with the `learnedFactor` and `ownGaps` that
 *    recovery/load.loadPlanPersonalisation answers (the preview and the saved
 *    plan are built with the same two, so the plan the person previews is the
 *    plan that is written);
 *  - a rebuild hands the loader the OLD plan's routines in rotation order and
 *    the factor it was built on (the plan facts' builtFactor, the hysteresis
 *    reference), and the new plan's number of sessions (clamped as the planner
 *    clamps it, a beginner at 4 at most);
 *  - nothing here can stop a plan from being built: a loader that throws, or
 *    one that answers nothing, builds the plan with neither input (the start);
 *  - the learned factor never changes a weekly target (design 4.13: "it never
 *    changes a weekly target"): the same profile built with a learned factor
 *    carries exactly the weekly targets it carries without one;
 *  - planAutoGen does not import src/lib/recovery statically (the check-in path
 *    reaches this file for equipmentReachable and must never reach the recovery
 *    model); the loader is required lazily, as the planner is.
 */
jest.mock('../plan/release', () => ({ PLANNER_V2: true }));
jest.mock('../plan/planner', () => {
  const actual = jest.requireActual('../plan/planner');
  return { ...actual, buildPlan: jest.fn(actual.buildPlan) };
});
jest.mock('../recovery/load', () => ({ loadPlanPersonalisation: jest.fn() }));
jest.mock('../database', () => ({
  createProgramme: jest.fn(),
  createRoutine: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  getAllExercises: jest.fn(),
  activatePlanWithBlock: jest.fn(),
  activatePlanKeepingBlock: jest.fn(),
  archiveOtherUserPlans: jest.fn(),
  getAllProgrammes: jest.fn(),
  db: jest.fn(),
  runInTransaction: jest.fn(),
  deleteProgrammeCascade: jest.fn(),
  deleteProgrammeCascadeInTx: jest.fn(),
  getActiveBlock: jest.fn(),
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  upsertPlannedMuscleVolume: jest.fn(),
  getMesocycleWeeks: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getRecentlyUsedExerciseIds: jest.fn(),
  getAllMesocycles: jest.fn(),
  setProgrammePlanFacts: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block', PATTERN_AVOID: 'pattern_avoid' },
}));

import fs from 'fs';
import path from 'path';
import { generateAndSavePlan, generatePlanDryRun } from '../planAutoGen';
import { buildPlan } from '../plan/planner';
import { loadPlanPersonalisation } from '../recovery/load';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, activatePlanKeepingBlock, archiveOtherUserPlans, getAllProgrammes,
  db, runInTransaction, deleteProgrammeCascade, deleteProgrammeCascadeInTx,
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails, upsertPlannedMuscleVolume,
  getMesocycleWeeks, getCurrentMesocycleWeek, getRecentlyUsedExerciseIds, getAllMesocycles,
  setProgrammePlanFacts, getProgrammePlanFacts,
} from '../database';

const { LIBRARY } = require('./campaign16.helpers');

const profile = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
  equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'maintain',
  recoveryRating: 'average',
};
const OWN_GAPS = [24, 48, 24, 72];
const weeks = () => [1, 2, 3, 4, 5, 6].map((i) => ({ id: `week-${i}`, week_index: i, is_deload: i === 6 ? 1 : 0 }));
const builtWith = () => buildPlan.mock.calls[buildPlan.mock.calls.length - 1][0];

beforeEach(() => {
  jest.clearAllMocks();
  getAllProgrammes.mockResolvedValue([]);
  getAllExercises.mockResolvedValue(LIBRARY);
  getActivePlan.mockResolvedValue(null);
  getRoutinesForPlan.mockResolvedValue([]);
  getRoutineExercisesWithDetails.mockResolvedValue([]);
  getRecentlyUsedExerciseIds.mockResolvedValue([]);
  getAllMesocycles.mockResolvedValue([]);
  getMesocycleWeeks.mockResolvedValue(weeks());
  getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 1 });
  getProgrammePlanFacts.mockResolvedValue(null);
  db.mockResolvedValue({});
  runInTransaction.mockImplementation(async (_connection, task) => task());
  createProgramme.mockResolvedValue({ id: 'programme-1' });
  let routineIndex = 0;
  createRoutine.mockImplementation(async () => ({ id: `routine-${routineIndex++}` }));
  addExerciseToRoutine.mockResolvedValue({ id: 'routine-exercise-1' });
  activatePlanWithBlock.mockResolvedValue('mesocycle-1');
  activatePlanKeepingBlock.mockResolvedValue(null);
  archiveOtherUserPlans.mockResolvedValue(undefined);
  deleteProgrammeCascade.mockResolvedValue(undefined);
  deleteProgrammeCascadeInTx.mockResolvedValue(undefined);
  setProgrammePlanFacts.mockResolvedValue(undefined);
  upsertPlannedMuscleVolume.mockResolvedValue(undefined);
  loadPlanPersonalisation.mockResolvedValue({ learnedFactor: 0.8, ownGaps: OWN_GAPS });
});

describe('the planner is told what the person\'s own history says', () => {
  test('a new plan is built with the learner\'s factor and the person\'s own gaps', async () => {
    const preview = await generatePlanDryRun('u1', profile);
    expect(preview.ok).toBe(true);
    expect(builtWith()).toMatchObject({ learnedFactor: 0.8, ownGaps: OWN_GAPS, daysPerWeek: 4 });
    expect(preview.plan.v2.builtFactor).toBe(0.8);
  });

  test('the preview and the saved plan are built with the same two inputs', async () => {
    await generatePlanDryRun('u1', profile);
    const previewed = builtWith();
    buildPlan.mockClear();
    await generateAndSavePlan('u1', profile);
    const saved = builtWith();
    expect(previewed).toMatchObject({ learnedFactor: 0.8, ownGaps: OWN_GAPS });
    expect(saved.learnedFactor).toBe(previewed.learnedFactor);
    expect(saved.ownGaps).toEqual(previewed.ownGaps);
  });

  test('a rebuild hands the loader the old plan\'s routines in rotation order, the factor it was built on and the new session count', async () => {
    getActivePlan.mockResolvedValue({ id: 'old-plan', tags: null });
    getRoutinesForPlan.mockResolvedValue([{ id: 'old-a' }, { id: 'old-b' }, { id: 'old-c' }, { id: 'old-d' }]);
    getProgrammePlanFacts.mockResolvedValue({ version: 2, builtFactor: 0.85 });
    await generatePlanDryRun('u1', profile);
    expect(getProgrammePlanFacts).toHaveBeenCalledWith('old-plan');
    expect(loadPlanPersonalisation).toHaveBeenCalledWith('u1', expect.objectContaining({
      sessionsPerWeek: 4, routineIdsInOrder: ['old-a', 'old-b', 'old-c', 'old-d'], builtOnFactor: 0.85,
    }));
  });

  test('a plan built on the start (no builtFactor), or a plan with no facts, is the start as the reference', async () => {
    getActivePlan.mockResolvedValue({ id: 'old-plan', tags: null });
    getRoutinesForPlan.mockResolvedValue([{ id: 'old-a' }]);
    getProgrammePlanFacts.mockResolvedValue({ version: 2, builtFactor: null });
    await generatePlanDryRun('u1', profile);
    expect(loadPlanPersonalisation.mock.calls[0][1].builtOnFactor).toBeNull();
    loadPlanPersonalisation.mockClear();
    getProgrammePlanFacts.mockResolvedValue(null);
    await generatePlanDryRun('u1', profile);
    expect(loadPlanPersonalisation.mock.calls[0][1].builtOnFactor).toBeNull();
  });

  test('the number of sessions is the planner\'s own clamp: 2 to 6, and a beginner at 4 at most', async () => {
    await generatePlanDryRun('u1', { ...profile, daysPerWeek: 7 });
    expect(loadPlanPersonalisation.mock.calls[0][1].sessionsPerWeek).toBe(6);
    loadPlanPersonalisation.mockClear();
    await generatePlanDryRun('u1', { ...profile, daysPerWeek: 6, experience: 'beginner' });
    expect(loadPlanPersonalisation.mock.calls[0][1].sessionsPerWeek).toBe(4);
    loadPlanPersonalisation.mockClear();
    await generatePlanDryRun('u1', { ...profile, daysPerWeek: 1 });
    expect(loadPlanPersonalisation.mock.calls[0][1].sessionsPerWeek).toBe(2);
  });
});

describe('nothing here can stop a plan from being built', () => {
  test('a loader that throws builds the plan with neither input', async () => {
    loadPlanPersonalisation.mockRejectedValue(new Error('recovery read failed'));
    const preview = await generatePlanDryRun('u1', profile);
    expect(preview.ok).toBe(true);
    expect(builtWith().learnedFactor ?? null).toBeNull();
    expect(builtWith().ownGaps ?? null).toBeNull();
  });

  test('a loader that answers nothing builds the plan with neither input', async () => {
    loadPlanPersonalisation.mockResolvedValue(undefined);
    const preview = await generatePlanDryRun('u1', profile);
    expect(preview.ok).toBe(true);
    expect(builtWith().learnedFactor ?? null).toBeNull();
  });

  test('a plan whose facts cannot be read is still a rebuild: the start is the reference', async () => {
    getActivePlan.mockResolvedValue({ id: 'old-plan', tags: null });
    getProgrammePlanFacts.mockRejectedValue(new Error('facts read failed'));
    const preview = await generatePlanDryRun('u1', profile);
    expect(preview.ok).toBe(true);
    expect(loadPlanPersonalisation.mock.calls[0][1].builtOnFactor).toBeNull();
  });
});

describe('the learned factor never changes a weekly target', () => {
  test('the same profile built with and without a learned factor carries the same weekly targets for every muscle and week', async () => {
    const withFactor = await generatePlanDryRun('u1', profile);
    loadPlanPersonalisation.mockResolvedValue({ learnedFactor: null, ownGaps: null });
    const without = await generatePlanDryRun('u1', profile);
    expect(withFactor.plan.v2.weeklyTargets).toEqual(without.plan.v2.weeklyTargets);
    expect(Object.keys(withFactor.plan.v2.weeklyTargets).length).toBeGreaterThan(5);
  });
});

describe('the recovery model stays off the check-in path', () => {
  test('planAutoGen requires the loader lazily and imports nothing from src/lib/recovery statically', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'planAutoGen.js'), 'utf8');
    expect(src).not.toMatch(/^import[^;]*from\s+['"][^'"]*recovery\/[^'"]*['"]/m);
    expect(src).toMatch(/require\('\.\/recovery\/load'\)/);
  });
});
