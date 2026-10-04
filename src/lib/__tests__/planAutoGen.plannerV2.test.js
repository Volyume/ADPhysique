/**
 * planAutoGen.plannerV2.test.js -- D219 lane B6: the new planner's save path,
 * with the release switch ON (plan/release.js is mocked to true; it ships
 * false, and planAutoGen.plannerV2.off.test.js pins that the switch off leaves
 * today's save untouched).
 *
 * What this suite pins and why:
 *
 * With PLANNER_V2 on, generateAndSavePlan builds the plan with the new planner
 * (plan/planner.buildPlan over plan/catalogue.resolveCatalogue) and writes it
 * through the existing writers, so everything downstream sees an ordinary
 * programme. The expected plan is built here with the same two pure functions
 * and the same inputs; the saved plan must BE that plan:
 *   - routines in the planner's rotation order (plan.v2.order), which is the
 *     routine position, each with its exercises in the planner's order;
 *   - each exercise's recommended sets are week 1's sets, its reps and rest
 *     come from the plan, its id is the catalogue's own, and its selection
 *     reason is an EXISTING code (planRationale renders those, nothing else);
 *   - planned_muscle_volume gets the planner's direct-set target for every
 *     week of the block, through the existing upsert (mev, mav and mrv stay as
 *     today's block writer set them), after activation; a kept block takes
 *     only its current and later weeks;
 *   - the plan's facts are written once, before activation, with every session
 *     key (s0, s1, ...) replaced by the saved routine's id, and the exercises
 *     on thin equipment listed by routine;
 *   - a style-tagged plan, a planner that builds nothing, and a library that
 *     resolves nothing all fall back to today's generator, so nobody is left
 *     without a plan; a failure while saving tears the programme down.
 * Every one of these fails on a build without the switch's save path.
 */
jest.mock('../plan/release', () => ({ PLANNER_V2: true }));
// The real planner, wrapped so a test can read exactly what it was handed.
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

import {
  buildPlanInputs, generateAndSavePlan, plannerV2PlanFacts, plannerV2SelectionReason,
  plannerV2WorkoutsForWrite,
} from '../planAutoGen';
import { buildPlan } from '../plan/planner';
import { resolveCatalogue } from '../plan/catalogue';
import { DIVISION_MATRIX, SELECTION_REASON } from '../planEngine';
import { VOLUME_LANDMARKS } from '../algorithms';
import { STYLE_POOL_KEYS } from '../exercise/stylePools';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, activatePlanKeepingBlock, archiveOtherUserPlans, getAllProgrammes,
  db, runInTransaction, deleteProgrammeCascade, deleteProgrammeCascadeInTx,
  getActivePlan, upsertPlannedMuscleVolume, getMesocycleWeeks, getCurrentMesocycleWeek,
  getRecentlyUsedExerciseIds, getAllMesocycles, setProgrammePlanFacts,
} from '../database';

const { LIBRARY } = require('./campaign16.helpers');

const VALID_REASONS = new Set(Object.values(SELECTION_REASON));

// The profile of the brief's case: a general plan, 4 days a week, 75 minutes.
const profile = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
  equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'maintain',
  recoveryRating: 'average',
};

// The plan the planner builds for a profile, by the same two pure calls the
// save path makes (no focus picks, a first block).
function expectedFor(over = {}, loggedExerciseNames = []) {
  const inputs = buildPlanInputs({ ...profile, ...over });
  const choices = resolveCatalogue({ library: LIBRARY, profile: inputs.equipment, loggedExerciseNames });
  const plan = buildPlan({
    daysPerWeek: inputs.daysPerWeek,
    sessionLengthMinutes: inputs.sessionLengthMinutes,
    equipment: inputs.equipment,
    goal: inputs.goal,
    experience: inputs.experience,
    nutritionPhase: inputs.nutritionPhase,
    recoveryRating: inputs.recoveryRating,
    focusMuscles: [],
    addedMuscles: [],
    firstBlock: true,
    choices,
    divisionMatrix: DIVISION_MATRIX,
    isStrength: false,
  });
  return { plan, choices };
}

const weeks = () => [1, 2, 3, 4, 5, 6].map((i) => ({ id: `week-${i}`, week_index: i, is_deload: i === 6 ? 1 : 0 }));

// Every key of an object, at any depth.
function allKeys(value, out = []) {
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) { out.push(k); allKeys(v, out); }
  }
  return out;
}

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
  addExerciseToRoutine.mockResolvedValue({ id: 'routine-exercise-1' });
  activatePlanWithBlock.mockResolvedValue('mesocycle-1');
  activatePlanKeepingBlock.mockResolvedValue(null);
  archiveOtherUserPlans.mockResolvedValue(undefined);
  deleteProgrammeCascade.mockResolvedValue(undefined);
  deleteProgrammeCascadeInTx.mockResolvedValue(undefined);
  setProgrammePlanFacts.mockResolvedValue(undefined);
  upsertPlannedMuscleVolume.mockResolvedValue(undefined);
});

describe('PLANNER_V2 on: a 4-day, 75-minute general plan is saved as the planner built it', () => {
  test('the routines, their order, their exercises, sets, reps, rest and reasons are the planner\'s', async () => {
    const { plan } = expectedFor();
    const result = await generateAndSavePlan('u1', profile);

    expect(result.ok).toBe(true);
    expect(result.programmeId).toBe('programme-1');
    expect(result.blockKept).toBe(false);

    // Routines in plan.v2.order: the routine's position is the rotation position.
    const orderedWorkouts = plan.v2.order.map((key) => plan.workouts.find((w) => w.sessionKey === key));
    expect(plan.workouts.map((w) => w.sessionKey)).toEqual(plan.v2.order);
    expect(createRoutine.mock.calls.map((c) => c[1])).toEqual(orderedWorkouts.map((w) => w.name));
    expect(createProgramme).toHaveBeenCalledWith('u1', plan.name, '', 0, null, null, null, false);
    for (const call of createRoutine.mock.calls) {
      expect(call[3]).toBe(plan.splitType);
      expect(call.at(-1)).toBe(false); // no intermediate sync
    }

    // Each routine's exercises, in the planner's order, with week 1's sets.
    const written = {};
    for (const call of addExerciseToRoutine.mock.calls) (written[call[0]] = written[call[0]] || []).push(call);
    orderedWorkouts.forEach((workout, k) => {
      const calls = written[`routine-${k}`] || [];
      expect(calls).toHaveLength(workout.exercises.length);
      workout.exercises.forEach((x, i) => {
        const [routineId, exerciseId, position, repMin, repMax, notes, sets, startingWeight, restSec, group, sync, reason] = calls[i];
        expect(routineId).toBe(`routine-${k}`);
        expect(exerciseId).toBe(x.name); // the shared corpus rig uses the name as the id
        expect(position).toBe(i);
        expect(sets).toBe(x.sets);
        expect(repMin).toBe(x.repMin);
        expect(repMax).toBe(x.repMax);
        expect(restSec).toBe(x.restSec);
        expect(notes).toBeNull();
        expect(startingWeight).toBeNull();
        expect(group).toBeNull();
        expect(sync).toBe(false);
        expect(reason).toBe(SELECTION_REASON.REQUIRED_ROLE);
        expect(VALID_REASONS.has(reason)).toBe(true);
      });
    });
    expect(deleteProgrammeCascade).not.toHaveBeenCalled();
  });

  test('the plan\'s facts are written once, before activation, keyed by the saved routine ids', async () => {
    const { plan } = expectedFor();
    await generateAndSavePlan('u1', profile);

    expect(setProgrammePlanFacts).toHaveBeenCalledTimes(1);
    const [programmeId, facts] = setProgrammePlanFacts.mock.calls[0];
    expect(programmeId).toBe('programme-1');
    expect(setProgrammePlanFacts.mock.invocationCallOrder[0])
      .toBeLessThan(activatePlanWithBlock.mock.invocationCallOrder[0]);

    const idOf = (key) => `routine-${plan.v2.order.indexOf(key)}`;
    const routineIds = plan.v2.order.map(idOf);
    expect(facts.version).toBe(2);
    expect(facts.family).toBe(plan.v2.family);
    expect(facts.roles).toEqual(plan.v2.roles);
    expect(facts.weeklyTargets).toEqual(plan.v2.weeklyTargets);
    expect(facts.sessionCaps).toEqual(plan.v2.sessionCaps);
    expect(facts.builtFactor).toBe(plan.v2.builtFactor);
    expect(facts.rirLadder).toEqual(plan.v2.rirLadder);
    expect(facts.readiness).toEqual(plan.v2.readiness);
    expect(facts.notes).toEqual(plan.v2.notes);
    expect(facts.limitedBy).toEqual(plan.v2.limitedBy);

    // Every session key is now a routine id.
    expect(Object.keys(facts.gapRanks).sort()).toEqual([...routineIds].sort());
    for (const [key, rank] of Object.entries(plan.v2.gapRanks)) expect(facts.gapRanks[idOf(key)]).toBe(rank);
    for (const [muscle, shares] of Object.entries(plan.v2.exposureShares)) {
      expect(Object.keys(facts.exposureShares[muscle]).sort())
        .toEqual(Object.keys(shares).map(idOf).sort());
      for (const [key, share] of Object.entries(shares)) expect(facts.exposureShares[muscle][idOf(key)]).toBe(share);
    }
    for (const [muscle, caps] of Object.entries(plan.v2.lightCaps)) {
      for (const [key, cap] of Object.entries(caps)) expect(facts.lightCaps[muscle][idOf(key)]).toBe(cap);
    }
    expect(allKeys(facts).filter((k) => /^s\d+$/.test(k))).toEqual([]);
    expect(Object.keys(facts.thin).every((id) => routineIds.includes(id))).toBe(true);
    // It is plain data a column can hold.
    expect(JSON.parse(JSON.stringify(facts))).toEqual(facts);
  });

  test('on a thin kit, the exercises with thin equipment are listed by routine id', async () => {
    const { plan } = expectedFor({ equipment: 'dumbbells_only' });
    await generateAndSavePlan('u1', { ...profile, equipment: 'dumbbells_only' });

    const facts = setProgrammePlanFacts.mock.calls[0][1];
    const expectedThin = {};
    plan.v2.order.forEach((key, k) => {
      const workout = plan.workouts.find((w) => w.sessionKey === key);
      for (const x of workout.exercises) {
        if (x.thinEquipment) (expectedThin[`routine-${k}`] = expectedThin[`routine-${k}`] || []).push(x.name);
      }
    });
    expect(Object.keys(expectedThin).length).toBeGreaterThan(0);
    expect(facts.thin).toEqual(expectedThin);
  });

  test('every week of the block gets the planner\'s direct-set target, after activation', async () => {
    const { plan } = expectedFor();
    await generateAndSavePlan('u1', profile);

    const rows = upsertPlannedMuscleVolume.mock.calls.map((c) => c[0]);
    const muscles = Object.keys(plan.v2.weeklyTargets);
    expect(muscles.length).toBeGreaterThan(0);
    expect(rows).toHaveLength(6 * muscles.length);
    let n = 0;
    for (let week = 1; week <= 6; week++) {
      for (const muscle of muscles) {
        const row = rows[n++];
        expect(row.mesocycleWeekId).toBe(`week-${week}`);
        expect(row.muscle).toBe(muscle);
        expect(row.plannedSets).toBe(plan.v2.weeklyTargets[muscle][week - 1]);
        expect(row.source).toBe('template');
        // mev, mav and mrv as today's block writer sets them.
        expect(row.mev).toBe(VOLUME_LANDMARKS[muscle].mev);
        expect(row.mav).toBe(VOLUME_LANDMARKS[muscle].mav);
        expect(row.mrv).toBe(VOLUME_LANDMARKS[muscle].mrv);
      }
    }
    expect(getMesocycleWeeks).toHaveBeenCalledWith('mesocycle-1');
    expect(upsertPlannedMuscleVolume.mock.invocationCallOrder[0])
      .toBeGreaterThan(activatePlanWithBlock.mock.invocationCallOrder[0]);
    expect(activatePlanWithBlock).toHaveBeenCalledWith('u1', 'programme-1', plan.name, { ledger: null, allowLearnedCarry: true });
    expect(archiveOtherUserPlans).toHaveBeenCalledWith('u1', 'programme-1');
  });

  test('a kept block keeps its past weeks: only the current and later weeks take the new targets', async () => {
    activatePlanKeepingBlock.mockResolvedValue('mesocycle-kept');
    getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 3 });
    const result = await generateAndSavePlan('u1', profile, { keepBlock: true });

    expect(result.ok).toBe(true);
    expect(result.blockKept).toBe(true);
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
    expect(getMesocycleWeeks).toHaveBeenCalledWith('mesocycle-kept');
    const weeksWritten = new Set(upsertPlannedMuscleVolume.mock.calls.map((c) => c[0].mesocycleWeekId));
    expect([...weeksWritten].sort()).toEqual(['week-3', 'week-4', 'week-5', 'week-6']);
  });

  test('a kept block whose current week cannot be read keeps every row as it is', async () => {
    activatePlanKeepingBlock.mockResolvedValue('mesocycle-kept');
    getCurrentMesocycleWeek.mockResolvedValue(null);
    const result = await generateAndSavePlan('u1', profile, { keepBlock: true });

    expect(result.ok).toBe(true);
    expect(upsertPlannedMuscleVolume).not.toHaveBeenCalled();
  });

  test('a failure writing the weekly rows is logged and leaves the saved, active plan alone', async () => {
    upsertPlannedMuscleVolume.mockRejectedValue(new Error('injected row failure'));
    const result = await generateAndSavePlan('u1', profile);

    expect(result.ok).toBe(true);
    expect(deleteProgrammeCascade).not.toHaveBeenCalled();
    expect(activatePlanWithBlock).toHaveBeenCalledTimes(1);
  });

  test('a history the app cannot read gives the catalogue\'s own order, never a failed plan', async () => {
    getRecentlyUsedExerciseIds.mockRejectedValue(new Error('injected history failure'));
    getAllMesocycles.mockRejectedValue(new Error('injected blocks failure'));
    const { plan } = expectedFor();
    const result = await generateAndSavePlan('u1', profile);

    expect(result.ok).toBe(true);
    const expectedNames = plan.v2.order
      .flatMap((key) => plan.workouts.find((w) => w.sessionKey === key).exercises.map((x) => x.name));
    expect(addExerciseToRoutine.mock.calls.map((c) => c[1])).toEqual(expectedNames);
  });
});

// What the new planner is handed, read from the wrapped buildPlan, so these
// hold whatever plan the planner makes of them.
describe('PLANNER_V2 on: the planner is handed the person\'s inputs, read as the generator reads them', () => {
  const handedTo = () => buildPlan.mock.calls.at(-1)[0];

  test('the profile, the catalogue for the kit, and the division matrix', async () => {
    await generateAndSavePlan('u1', profile);

    const handed = handedTo();
    expect(handed).toMatchObject({
      daysPerWeek: 4, sessionLengthMinutes: 75, equipment: 'full_gym', goal: 'general',
      experience: 'intermediate', nutritionPhase: 'maintain', recoveryRating: 'average',
      focusMuscles: [], addedMuscles: [], firstBlock: true, isStrength: false,
    });
    expect(handed.divisionMatrix).toBe(DIVISION_MATRIX);
    expect(handed.choices).toEqual(resolveCatalogue({ library: LIBRARY, profile: 'full_gym', loggedExerciseNames: [] }));
    // The generator does not read the last four weeks per muscle: nothing is invented.
    expect(handed).not.toHaveProperty('loggedWeekly');
  });

  test('the catalogue is resolved for the person\'s own kit', async () => {
    await generateAndSavePlan('u1', { ...profile, equipment: 'home_gym' });

    const handed = handedTo();
    expect(handed.equipment).toBe('home_gym');
    expect(handed.choices).toEqual(resolveCatalogue({ library: LIBRARY, profile: 'home_gym', loggedExerciseNames: [] }));
  });

  test('the person\'s own logged exercise is the catalogue\'s pick for its role (S Q5)', async () => {
    // The seated cable row is the first row in the catalogue; the person rows
    // with a dumbbell row, so the catalogue the planner gets names that.
    getRecentlyUsedExerciseIds.mockResolvedValue(['Dumbbell Row']);
    await generateAndSavePlan('u1', profile);

    const handed = handedTo();
    expect(getRecentlyUsedExerciseIds).toHaveBeenCalledWith('u1', expect.any(Number));
    expect(handed.choices.back.map((c) => c.name)).toContain('Dumbbell Row');
    expect(handed.choices.back.map((c) => c.name)).not.toContain('Seated Cable Row');
    expect(handed.choices).toEqual(resolveCatalogue({ library: LIBRARY, profile: 'full_gym', loggedExerciseNames: ['Dumbbell Row'] }));
  });

  test('the focus picks are the weak points as the generator reads them: muscle keys, at most three', async () => {
    await generateAndSavePlan('u1', {
      ...profile, planWeakPoints: ['Side Delts', 'Upper Chest', 'Rear Delts', 'Biceps'],
    });

    expect(handedTo().focusMuscles).toEqual(['side_delts', 'chest', 'rear_delts']);
  });

  test('a first block is one with no completed block behind it', async () => {
    getAllMesocycles.mockResolvedValue([
      { startDate: '2026-01-05', plannedWeeks: 6, endDate: '2026-02-20' },
    ]);
    await generateAndSavePlan('u1', profile);
    expect(handedTo().firstBlock).toBe(false);

    // A block the person left early is not a completed one.
    getAllMesocycles.mockResolvedValue([
      { startDate: '2026-01-05', plannedWeeks: 6, endDate: '2026-01-12' },
    ]);
    await generateAndSavePlan('u1', profile);
    expect(handedTo().firstBlock).toBe(true);
  });

  test('the strength phase asks for strength reps and rest, as generatePlan does', async () => {
    await generateAndSavePlan('u1', { ...profile, trainingPhase: 'strength_size' });

    expect(handedTo().isStrength).toBe(true);
  });
});

describe('PLANNER_V2 on: the save path\'s pure pieces', () => {
  test('a thin-kit fallback is saved with the coverage-fallback reason, every other pick with the required-role reason', () => {
    expect(plannerV2SelectionReason({ thinKit: true })).toBe(SELECTION_REASON.COVERAGE_FALLBACK);
    expect(plannerV2SelectionReason({ thinKit: false })).toBe(SELECTION_REASON.REQUIRED_ROLE);
    expect(plannerV2SelectionReason(null)).toBe(SELECTION_REASON.REQUIRED_ROLE);
    expect(VALID_REASONS.has(plannerV2SelectionReason({ thinKit: true }))).toBe(true);
  });

  test('the workouts are shaped for the writers in plan.v2.order, whatever order the planner listed them', () => {
    const plan = {
      workouts: [
        { name: 'B', sessionKey: 's1', exercises: [{ name: 'Leg Press', muscle: 'quads', sets: 3, repMin: 8, repMax: 12, restSec: 120, thinEquipment: false }] },
        { name: 'A', sessionKey: 's0', exercises: [{ name: 'Cable Crunch', muscle: 'abs', sets: 2, repMin: 10, repMax: 15, restSec: 60, thinEquipment: true }] },
      ],
      v2: { order: ['s0', 's1'] },
    };
    const choices = {
      quads: [{ name: 'Leg Press', exerciseId: 'id-lp', thinKit: false }],
      abs: [{ name: 'Cable Crunch', exerciseId: 'id-cc', thinKit: true }],
    };
    const out = plannerV2WorkoutsForWrite(plan, choices);
    expect(out.map((w) => w.sessionKey)).toEqual(['s0', 's1']);
    expect(out[0].exercises[0]).toEqual({
      exerciseName: 'Cable Crunch', exerciseId: 'id-cc', muscle: 'abs', sets: 2, repMin: 10, repMax: 15, restSec: 60,
      notes: null, selectionReason: SELECTION_REASON.COVERAGE_FALLBACK, thinEquipment: true,
    });
    expect(out[1].exercises[0].exerciseId).toBe('id-lp');
  });

  test('the facts re-key every session key and leave every muscle key alone', () => {
    const v2 = {
      version: 2, family: 'upper_lower', roles: { chest: 'standard' }, weeklyTargets: { chest: [8, 9, 10, 11, 12, 6] },
      exposureShares: { chest: { s0: 0.4, s2: 0.6 } }, sessionCaps: { chest: { direct: 8, fractional: 12 } },
      lightCaps: { chest: { s2: 4 } }, gapRanks: { s0: 1, s1: 0, s2: 2 },
      builtFactor: null, rirLadder: [3, 2, 2, 1, 1, 4], readiness: { passes: true, lowest: {} }, notes: [], limitedBy: {},
    };
    const facts = plannerV2PlanFacts(v2, { s0: 'r-a', s1: 'r-b', s2: 'r-c' }, { 'r-b': ['ex-1'] });
    expect(facts.exposureShares).toEqual({ chest: { 'r-a': 0.4, 'r-c': 0.6 } });
    expect(facts.lightCaps).toEqual({ chest: { 'r-c': 4 } });
    expect(facts.gapRanks).toEqual({ 'r-a': 1, 'r-b': 0, 'r-c': 2 });
    expect(facts.sessionCaps).toEqual({ chest: { direct: 8, fractional: 12 } });
    expect(facts.thin).toEqual({ 'r-b': ['ex-1'] });
    expect(facts.weeklyTargets).toBe(v2.weeklyTargets);
    expect(plannerV2PlanFacts(v2, {}, undefined).thin).toEqual({});
  });
});

describe('PLANNER_V2 on: when the new planner cannot build, today\'s generator carries on', () => {
  test('a style-tagged current plan keeps its style pool: the new planner is not used', async () => {
    getActivePlan.mockResolvedValue({ tags: `style:${STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS}` });
    await generateAndSavePlan('u1', profile);

    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
    expect(upsertPlannedMuscleVolume).not.toHaveBeenCalled();
    expect(getRecentlyUsedExerciseIds).not.toHaveBeenCalled();
  });

  test('a library that resolves nothing falls back to today\'s generator and the same zero-match answer', async () => {
    getAllExercises.mockResolvedValue([]);
    const result = await generateAndSavePlan('u1', profile);

    expect(result).toEqual({ ok: false, error: 'Plan created but no exercises matched the library' });
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
    expect(upsertPlannedMuscleVolume).not.toHaveBeenCalled();
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
  });

  test('a failure writing the facts tears the programme down and reports it, never leaving a plan without them', async () => {
    setProgrammePlanFacts.mockRejectedValueOnce(new Error('injected facts failure'));
    const result = await generateAndSavePlan('u1', profile);

    expect(result).toEqual({ ok: false, error: 'injected facts failure' });
    expect(deleteProgrammeCascade).toHaveBeenCalledWith('programme-1', { scheduleSync: false });
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
    expect(upsertPlannedMuscleVolume).not.toHaveBeenCalled();
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
      expect(deleteProgrammeCascade).toHaveBeenCalledWith('programme-1', { scheduleSync: false });
    }
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
  });
});
