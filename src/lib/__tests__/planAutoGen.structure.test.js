/**
 * planAutoGen.structure.test.js -- D222 phase 6: plan creation routed to the
 * structure engine, with the release switch ON (structure/release.js is
 * mocked to true; it ships false, and every existing suite runs with it off).
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md
 * (R60, R63, R65, R66, R68). What this suite pins and why:
 *   - R66 saving: generateAndSavePlan writes one routine per engine session in
 *     the engine's order, each exercise at week 1's sets, and the plan's facts
 *     in the same transaction: version 2 kept, the structure block (version 3)
 *     present with the routine and routine exercise ids just written, and the
 *     block's weekly rows from the compat weeklyTargets (today's keys);
 *   - R63 routes: the old planners are never called with the switch on, not
 *     even when the engine refuses or throws; a refusal saves nothing and
 *     comes back to the caller, and an engine exception is logged as
 *     'structure.build' and comes back as a calm failure code;
 *   - R63: the rebuild of a generated plan is the engine's week at the
 *     person's days, with facts keyed by the routines the writer creates; a
 *     refused week, or one that would ask the person a question, is not
 *     rebuilt (an automatic rebuild has nobody to ask);
 *   - R65: the dry run returns `{ ok: true, plan, structure }` or
 *     `{ ok: false, refusal }`, and assessScheduleFit returns the engine's
 *     refusal in the fit review's shape.
 * Every one of these fails on a build without the structure route.
 */
jest.mock('../structure/release', () => ({
  ...jest.requireActual('../structure/release'),
  STRUCTURE_ENGINE: true,
}));
jest.mock('../structure/engine', () => {
  const actual = jest.requireActual('../structure/engine');
  return { ...actual, buildStructurePlan: jest.fn(actual.buildStructurePlan) };
});
// The old planners: any call is a fallback the spec forbids (R63).
jest.mock('../plan/planner', () => ({
  ...jest.requireActual('../plan/planner'),
  buildPlan: jest.fn(() => { throw new Error('the new planner must not run with the structure engine on'); }),
}));
jest.mock('../planEngine', () => ({
  ...jest.requireActual('../planEngine'),
  generatePlan: jest.fn(() => { throw new Error('the old generator must not run with the structure engine on'); }),
}));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));
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
  getWeeklyVolumeByMuscle: jest.fn(async () => []),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import {
  generateAndSavePlan, generatePlanDryRun, assessScheduleFit, planGeneratedRebuildV2,
} from '../planAutoGen';
import { buildStructurePlan } from '../structure/engine';
import { buildPlan } from '../plan/planner';
import { generatePlan } from '../planEngine';
import { logError } from '../errorLog';
import { PLAN_FIT } from '../planFit';
import { VOLUME_LANDMARKS } from '../algorithms';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, archiveOtherUserPlans, getAllProgrammes, db, runInTransaction,
  getActivePlan, upsertPlannedMuscleVolume, getMesocycleWeeks, getCurrentMesocycleWeek,
  getRecentlyUsedExerciseIds, getAllMesocycles, setProgrammePlanFacts,
} from '../database';

const { LIBRARY } = require('./campaign16.helpers');

jest.setTimeout(180000);

// Men's physique, 3 days, 60 minutes, full gym: the engine builds it.
const BUILT = {
  experience: 'intermediate', daysPerWeek: 3, sessionLengthMinutes: 60,
  equipment: 'full_gym', trainingGoal: 'mens_physique', trainingPhase: 'maintain', recoveryRating: 'average',
};
// Bodybuilding, 2 days: the engine refuses it (12-STRUCTURE-PLANS-RENDERED.md).
const REFUSED = { ...BUILT, trainingGoal: 'bodybuilding', daysPerWeek: 2 };

const weeks = () => [1, 2, 3, 4, 5, 6].map((i) => ({ id: `week-${i}`, week_index: i, is_deload: i === 6 ? 1 : 0 }));

beforeEach(() => {
  jest.clearAllMocks();
  getAllProgrammes.mockResolvedValue([]);
  getAllExercises.mockResolvedValue(LIBRARY);
  getActivePlan.mockResolvedValue(null);
  getRecentlyUsedExerciseIds.mockResolvedValue([]);
  getAllMesocycles.mockResolvedValue([]);
  getMesocycleWeeks.mockResolvedValue(weeks());
  getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 1 });
  db.mockResolvedValue({});
  runInTransaction.mockImplementation(async (_connection, task) => task());
  createProgramme.mockResolvedValue({ id: 'programme-1' });
  let routineIndex = 0;
  createRoutine.mockImplementation(async () => ({ id: `routine-${routineIndex++}` }));
  let rowIndex = 0;
  addExerciseToRoutine.mockImplementation(async () => ({ id: `re-${rowIndex++}` }));
  activatePlanWithBlock.mockResolvedValue('mesocycle-1');
});

const engineArgs = (p) => ({
  goal: p.trainingGoal, days: p.daysPerWeek, lengthMinutes: p.sessionLengthMinutes,
  equipment: p.equipment, experience: p.experience, focus: [], library: LIBRARY, loggedExerciseNames: [],
});

describe('R66: saving an engine plan', () => {
  let result;
  let expected;
  beforeAll(async () => {
    expected = jest.requireActual('../structure/engine').buildStructurePlan(engineArgs(BUILT));
  });
  beforeEach(async () => {
    result = await generateAndSavePlan('user-1', BUILT);
  });

  test('saves the engine week as built, and no old planner runs', () => {
    expect(result.ok).toBe(true);
    expect(result.programmeId).toBe('programme-1');
    expect(buildPlan).not.toHaveBeenCalled();
    expect(generatePlan).not.toHaveBeenCalled();
    expect(buildStructurePlan).toHaveBeenCalledTimes(1);
    expect(createRoutine.mock.calls.map((c) => c[1])).toEqual(expected.plan.sessions.map((s) => s.name));
    const written = addExerciseToRoutine.mock.calls;
    const flat = expected.plan.sessions.flatMap((s) => s.exercises);
    expect(written).toHaveLength(flat.length);
    written.forEach((call, i) => {
      expect(call[1]).toBe(flat[i].id);
      expect(call[6]).toBe(flat[i].weeks[0].sets);
      expect([call[3], call[4]]).toEqual(flat[i].repRange);
    });
  });

  test('the facts carry version 2, the structure block and the ids just written', () => {
    expect(setProgrammePlanFacts).toHaveBeenCalledTimes(1);
    const [programmeId, facts, opts] = setProgrammePlanFacts.mock.calls[0];
    expect(programmeId).toBe('programme-1');
    expect(opts).toEqual({ scheduleSync: false });
    expect(facts.version).toBe(2);
    expect(facts.structure.version).toBe(3);
    expect(facts.structure.sessions.map((s) => s.routineId)).toEqual(expected.plan.sessions.map((_, i) => `routine-${i}`));
    expect(facts.structure.sessions.flatMap((s) => s.exercises.map((x) => x.routineExerciseId)))
      .toEqual(addExerciseToRoutine.mock.calls.map((_, i) => `re-${i}`));
    for (const k of Object.keys(facts.weeklyTargets)) expect(VOLUME_LANDMARKS[k]).toBeDefined();
    // Facts first, then activation, then the weekly rows.
    expect(setProgrammePlanFacts.mock.invocationCallOrder[0]).toBeLessThan(activatePlanWithBlock.mock.invocationCallOrder[0]);
    expect(archiveOtherUserPlans).toHaveBeenCalledWith('user-1', 'programme-1');
  });

  test('the block\'s weekly rows are the compat weeklyTargets, source template', () => {
    const facts = setProgrammePlanFacts.mock.calls[0][1];
    const rows = upsertPlannedMuscleVolume.mock.calls.map((c) => c[0]);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const w = Number(row.mesocycleWeekId.replace('week-', ''));
      expect(row.plannedSets).toBe(facts.weeklyTargets[row.muscle][w - 1]);
      expect(row.source).toBe('template');
    }
  });
});

describe('R63: a refusal or an exception is returned, never an old-style plan', () => {
  test('a refusal saves nothing and carries its words', async () => {
    const out = await generateAndSavePlan('user-1', REFUSED);
    expect(out.ok).toBe(false);
    expect(out.error).toBe('structure_refused');
    expect(out.refusal.text).not.toMatch(/^Not built: /);
    expect(out.refusal.text.length).toBeGreaterThan(0);
    expect(createProgramme).not.toHaveBeenCalled();
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
    expect(buildPlan).not.toHaveBeenCalled();
    expect(generatePlan).not.toHaveBeenCalled();
  });

  test('an engine exception is logged as structure.build and fails calmly', async () => {
    buildStructurePlan.mockImplementationOnce(() => { throw new Error('boom'); });
    const out = await generateAndSavePlan('user-1', BUILT);
    expect(out).toEqual({ ok: false, error: 'plan_engine_error' });
    expect(logError).toHaveBeenCalledWith('structure.build', expect.any(Error), expect.objectContaining({ goal: 'mens_physique', days: 3 }));
    expect(createProgramme).not.toHaveBeenCalled();
    expect(buildPlan).not.toHaveBeenCalled();
    expect(generatePlan).not.toHaveBeenCalled();
  });

  test('an exercise with no library row fails the build and saves nothing', async () => {
    // The engine names a pick by its name when the row it chose has no id.
    buildStructurePlan.mockImplementationOnce((args) => {
      const r = jest.requireActual('../structure/engine').buildStructurePlan(args);
      if (r.ok) r.plan.sessions[0].exercises[0].id = 'A Name Not An Id';
      return r;
    });
    const out = await generateAndSavePlan('user-1', BUILT);
    expect(out).toEqual({ ok: false, error: 'plan_engine_error' });
    expect(logError).toHaveBeenCalledWith('structure.build', expect.any(Error), expect.any(Object));
    expect(createProgramme).not.toHaveBeenCalled();
  });
});

describe('R65: the preview and the schedule fit', () => {
  test('the dry run returns the plan and the structure block, and writes nothing', async () => {
    const dry = await generatePlanDryRun('user-1', BUILT);
    expect(dry.ok).toBe(true);
    expect(dry.plan.workouts.length).toBe(3);
    expect(dry.structure).toEqual(expect.objectContaining({
      needsLengthChoice: expect.any(Boolean), messages: expect.any(Array), longestMinutes: expect.any(Number),
    }));
    expect(dry.structure.messages.length).toBeGreaterThan(0);
    // One rounding (nearest whole minute) for the plan's estimate and the real length.
    expect(dry.plan.estimatedSessionMinutes).toBe(dry.structure.longestMinutes);
    expect(createProgramme).not.toHaveBeenCalled();
    expect(buildPlan).not.toHaveBeenCalled();
    expect(generatePlan).not.toHaveBeenCalled();
  });

  test('the dry run of a refused week returns the refusal', async () => {
    const dry = await generatePlanDryRun('user-1', REFUSED);
    expect(dry.ok).toBe(false);
    expect(dry.refusal).toEqual(expect.objectContaining({
      reason: expect.any(String), text: expect.not.stringMatching(/^Not built: /),
    }));
    expect(generatePlan).not.toHaveBeenCalled();
  });

  test('assessScheduleFit gives the engine\'s refusal in the fit review\'s shape', async () => {
    const fit = await assessScheduleFit(REFUSED, { userId: 'user-1', durationOptions: [60], dayOptions: [2, 3, 4, 5, 6] });
    expect(fit.ok).toBe(true);
    expect(fit.state).toBe(PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN);
    expect(fit.refusal.text).not.toMatch(/^Not built: /);
    expect(fit.durations).toEqual([expect.objectContaining({ minutes: 60, state: PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN })]);
    expect(generatePlan).not.toHaveBeenCalled();
  });
});

describe('R63: the rebuild of a generated plan', () => {
  test('is the engine week at the person\'s days, with facts for the writer', async () => {
    // At 75 minutes the week fits without a question.
    const out = await planGeneratedRebuildV2({ userId: 'user-1', profile: { ...BUILT, sessionLengthMinutes: 75 }, daysPerWeek: 3 });
    expect(out.ok).toBe(true);
    expect(out.resolved.workouts).toHaveLength(3);
    expect(out.resolved.continuity.decisions).toEqual([]);
    const keys = out.resolved.workouts.map((w) => w.sessionKey);
    const ids = Object.fromEntries(keys.map((k, i) => [k, `routine-${i}`]));
    const facts = out.structureFacts(ids);
    expect(facts.version).toBe(2);
    expect(facts.structure.version).toBe(3);
    expect(facts.structure.sessions.map((x) => x.routineId)).toEqual(['routine-0', 'routine-1', 'routine-2']);
    expect(out.plan.v2.weeklyTargets).toEqual(facts.weeklyTargets);
    expect(buildPlan).not.toHaveBeenCalled();
    expect(generatePlan).not.toHaveBeenCalled();
  });

  test('a week that asks a question (here the length) is not rebuilt', async () => {
    const out = await planGeneratedRebuildV2({ userId: 'user-1', profile: BUILT, daysPerWeek: 3 });
    expect(out).toEqual({ ok: false, reason: 'structure_needs_choice' });
  });

  test('a refused week is not rebuilt', async () => {
    const out = await planGeneratedRebuildV2({ userId: 'user-1', profile: REFUSED, daysPerWeek: 2 });
    expect(out).toEqual({ ok: false, reason: 'structure_refused' });
    expect(buildPlan).not.toHaveBeenCalled();
  });
});
