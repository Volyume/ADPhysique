/**
 * planAutoGen.plannerV2.off.test.js -- D219 lane B6: the release switch OFF.
 *
 * What this suite pins and why:
 *
 * plan/release.js ships PLANNER_V2 = false, and the lead turns it on after the
 * core lanes are reviewed (register D219, sequencing ruling). Until then the
 * save path must be today's: generateAndSavePlan builds with planEngine,
 * writes no plan facts, writes no weekly rows of its own, and reads no history
 * for the catalogue. Turning the switch on is a deliberate edit of the
 * constant and of the first test below, never an accident. The rest of the
 * off-path behaviour is pinned by planAutoGen.test.js, which is unedited.
 */
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
  upsertPlannedMuscleVolume: jest.fn(),
  getMesocycleWeeks: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getRecentlyUsedExerciseIds: jest.fn(),
  getAllMesocycles: jest.fn(),
  setProgrammePlanFacts: jest.fn(),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import { generateAndSavePlan } from '../planAutoGen';
import { PLANNER_V2 } from '../plan/release';

// The switch ships on (lead, 2026-10-04): this suite holds it off with a
// module mock and pins that the old path is unchanged.
jest.mock('../plan/release', () => ({ PLANNER_V2: false }));
import { POOL } from '../planEngine';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, activatePlanKeepingBlock, archiveOtherUserPlans, getAllProgrammes,
  db, runInTransaction, deleteProgrammeCascadeInTx, upsertPlannedMuscleVolume,
  getMesocycleWeeks, getCurrentMesocycleWeek, getRecentlyUsedExerciseIds, setProgrammePlanFacts,
} from '../database';

const FULL_LIBRARY = Object.values(POOL).flat().map((e) => ({ name: e.n }));

describe('the release switch ships off', () => {
  test('the switch is held off here', () => {
    expect(PLANNER_V2).toBe(false);
  });

  test('generateAndSavePlan builds with today\'s generator and writes nothing the new planner adds', async () => {
    jest.clearAllMocks();
    getAllProgrammes.mockResolvedValue([]);
    getAllExercises.mockResolvedValue(FULL_LIBRARY.map((exercise, index) => ({ ...exercise, id: `exercise-${index}` })));
    db.mockResolvedValue({});
    runInTransaction.mockImplementation(async (_connection, task) => task());
    createProgramme.mockResolvedValue({ id: 'programme-1' });
    let routineIndex = 0;
    createRoutine.mockImplementation(async () => ({ id: `routine-${routineIndex++}` }));
    addExerciseToRoutine.mockResolvedValue({ id: 'routine-exercise-1' });
    activatePlanWithBlock.mockResolvedValue('mesocycle-1');
    activatePlanKeepingBlock.mockResolvedValue(null);
    archiveOtherUserPlans.mockResolvedValue(undefined);
    deleteProgrammeCascadeInTx.mockResolvedValue(undefined);

    const result = await generateAndSavePlan('u1', {
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
      equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain',
      recoveryRating: 'average',
    });

    expect(result.ok).toBe(true);
    expect(createRoutine).toHaveBeenCalled();
    expect(activatePlanWithBlock).toHaveBeenCalledWith('u1', 'programme-1', expect.any(String), { ledger: null, allowLearnedCarry: true });
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
    expect(upsertPlannedMuscleVolume).not.toHaveBeenCalled();
    expect(getMesocycleWeeks).not.toHaveBeenCalled();
    expect(getCurrentMesocycleWeek).not.toHaveBeenCalled();
    expect(getRecentlyUsedExerciseIds).not.toHaveBeenCalled();
  });
});
