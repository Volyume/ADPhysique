/**
 * planAutoGen.plannerV2.preview.off.test.js -- D219 lane B7: the release switch
 * OFF, for the dry-run twin and the rebuild's kept exercises.
 *
 * What this suite pins and why:
 *
 * plan/release.js ships PLANNER_V2 = false (the lead turns it on after the core
 * lanes are reviewed). Lane B7 gave the dry run a new-planner path
 * (previewWithPlannerV2) and gave the new planner's save the person's kept
 * exercises; with the switch off none of it may run. generatePlanDryRun must
 * preview with today's generator exactly as before: the new planner is never
 * called, no history is read for the catalogue, no kept-exercise pass reads the
 * person's current plan for it, nothing is written, and the plan it returns is
 * today's generator's (it carries no new-planner facts). Turning the switch on
 * is a deliberate edit of the constant and of the first test, never an accident
 * (planAutoGen.plannerV2.off.test.js pins the same for the save).
 */
jest.mock('../plan/planner', () => {
  const actual = jest.requireActual('../plan/planner');
  return { ...actual, buildPlan: jest.fn(actual.buildPlan) };
});
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
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import { generatePlanDryRun } from '../planAutoGen';
import { PLANNER_V2 } from '../plan/release';

// The switch ships on (lead, 2026-10-04): this suite holds it off with a
// module mock and pins that the old path is unchanged.
jest.mock('../plan/release', () => ({ PLANNER_V2: false }));
import { buildPlan } from '../plan/planner';
import { POOL } from '../planEngine';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine, activatePlanWithBlock,
  getAllProgrammes, getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails,
  getRecentlyUsedExerciseIds, setProgrammePlanFacts, upsertPlannedMuscleVolume,
} from '../database';

const FULL_LIBRARY = Object.values(POOL).flat().map((e) => ({ name: e.n }));

describe('the release switch ships off: the dry run is today\'s', () => {
  test('the switch is held off here', () => {
    expect(PLANNER_V2).toBe(false);
  });

  test('generatePlanDryRun previews with today\'s generator and touches nothing the new planner adds', async () => {
    jest.clearAllMocks();
    getAllProgrammes.mockResolvedValue([]);
    getAllExercises.mockResolvedValue(FULL_LIBRARY.map((exercise, index) => ({ ...exercise, id: `exercise-${index}` })));
    getActivePlan.mockResolvedValue(null);

    const preview = await generatePlanDryRun('u1', {
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
      equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain',
      recoveryRating: 'average',
    });

    expect(preview.ok).toBe(true);
    expect(preview.plan.workouts.length).toBeGreaterThan(0);
    // Today's generator's plan: none of the new planner's facts, today's receipt.
    expect(preview.plan.v2).toBeUndefined();
    expect(preview.continuity.isRebuild).toBe(false);
    expect(buildPlan).not.toHaveBeenCalled();
    expect(getRecentlyUsedExerciseIds).not.toHaveBeenCalled();
    // The kept-exercise pass reads the person's current plan; today's continuity
    // pass reads the active plan itself, but the routines and rows only when it has one.
    expect(getRoutinesForPlan).not.toHaveBeenCalled();
    expect(getRoutineExercisesWithDetails).not.toHaveBeenCalled();
    for (const write of [
      createProgramme, createRoutine, addExerciseToRoutine, activatePlanWithBlock, setProgrammePlanFacts,
      upsertPlannedMuscleVolume,
    ]) expect(write).not.toHaveBeenCalled();
  });
});
