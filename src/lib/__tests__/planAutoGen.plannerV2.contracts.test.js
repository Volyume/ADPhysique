/**
 * planAutoGen.plannerV2.contracts.test.js -- D219 lane B8 (lead rulings 1 to 4),
 * the release switch ON (plan/release.js is mocked to true, so this suite does
 * not depend on the shipped value).
 *
 * What this suite pins and why. Every one of these fails on the build before
 * this lane, where the switch turned on broke the plan contracts that the
 * generator's own suites (campaign16.*, planAutoGen.test) hold:
 *
 *  - THE WEEKLY SUMMARY IN THE LEGACY SHAPE (ruling 1). The planner keys its
 *    summary by muscle (side_delts, rear_delts, adductors, ...); every reader of
 *    `plan.weeklyVolumeSummary`, and the audit that recounts a plan from its
 *    exercises (exercise/volumeAudit), keys it by external bucket, the three
 *    delt heads being one `shoulders`. Read by a planner key, a delt head
 *    delivered 0. plannerV2LegacySummary hands the planner's own numbers over in
 *    the shape the readers have, and an independent recount of the previewed
 *    plan agrees with its claim for every kit, not only the full gym.
 *  - ONE WRITE TRANSACTION, SYNC SUPPRESSED (ruling 4). The programme, its
 *    routines and exercises, and the plan's facts are written in one transaction
 *    with every intermediate sync suppressed (the facts used to be written after
 *    it, scheduling a sync of their own), and a library the catalogue cannot
 *    plan from falls back before anything is written.
 *  - CONTINUITY ON THE NEW PATH (rulings 2 and 3). The receipt (decisions) is
 *    produced for a rebuild and is the same in the preview and the save; a
 *    reviewed replacement changes the real exercise; a reviewed prescription
 *    change reaches the saved row; an exercise the person trains is never
 *    dropped in silence.
 */
jest.mock('../plan/release', () => ({ PLANNER_V2: true }));
// The real planner, wrapped so a test can see whether it was called at all.
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
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block', PATTERN_AVOID: 'pattern_avoid' },
}));

import { generateAndSavePlan, generatePlanDryRun, plannerV2LegacySummary } from '../planAutoGen';
import { buildPlan } from '../plan/planner';
import { auditPlanVolume } from '../exercise/volumeAudit';
import { SLOT_VERDICT, SLOT_REASON } from '../programmeEpoch';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, activatePlanKeepingBlock, archiveOtherUserPlans, getAllProgrammes,
  db, runInTransaction, deleteProgrammeCascade, deleteProgrammeCascadeInTx,
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails, upsertPlannedMuscleVolume,
  getMesocycleWeeks, getCurrentMesocycleWeek, getRecentlyUsedExerciseIds, getAllMesocycles,
  setProgrammePlanFacts,
} from '../database';

const { LIBRARY, BY_NAME } = require('./campaign16.helpers');

// The rig's id is the exercise name, so the audit's catalogue is the library by name.
const CATALOGUE_ROWS = new Map(LIBRARY.map((e) => [e.name, e]));

const profile = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
  equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'maintain',
  recoveryRating: 'average',
};

const weeks = () => [1, 2, 3, 4, 5, 6].map((i) => ({ id: `week-${i}`, week_index: i, is_deload: i === 6 ? 1 : 0 }));

// The person's current plan, as getRoutineExercisesWithDetails hands it back.
function givenCurrentPlan(namesByRoutine, extraRows = []) {
  const rowOf = (entry) => (typeof entry === 'string'
    ? (BY_NAME.get(entry) ?? extraRows.find((e) => e.name === entry))
    : entry);
  getActivePlan.mockResolvedValue({ id: 'old-plan', tags: null });
  getRoutinesForPlan.mockResolvedValue(Object.keys(namesByRoutine).map((id) => ({ id })));
  getRoutineExercisesWithDetails.mockImplementation(async (routineId) => (namesByRoutine[routineId] || []).map((entry, i) => {
    const exercise = rowOf(entry);
    return { routineExercise: { id: `old-${routineId}-${i}`, exerciseId: exercise.id, recommendedSets: 3, groupKind: null }, exercise };
  }));
}

// What the save wrote: the exercise ids, in order, with their rep ranges.
const savedRows = () => addExerciseToRoutine.mock.calls.map((c) => ({
  routineId: c[0], exerciseId: c[1], repMin: c[3], repMax: c[4], sets: c[6],
}));
const previewedExercises = (preview) => preview.plan.workouts.flatMap((w) => w.exercises);

let inTransaction = false;
beforeEach(() => {
  jest.clearAllMocks();
  inTransaction = false;
  getAllProgrammes.mockResolvedValue([]);
  getAllExercises.mockResolvedValue(LIBRARY);
  getActivePlan.mockResolvedValue(null);
  getRoutinesForPlan.mockResolvedValue([]);
  getRoutineExercisesWithDetails.mockResolvedValue([]);
  getRecentlyUsedExerciseIds.mockResolvedValue([]);
  getAllMesocycles.mockResolvedValue([]);
  getMesocycleWeeks.mockResolvedValue(weeks());
  getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 1 });
  db.mockResolvedValue({});
  runInTransaction.mockImplementation(async (_connection, task) => {
    inTransaction = true;
    try { return await task(); } finally { inTransaction = false; }
  });
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

// ── ruling 1: the weekly summary ─────────────────────────────────────────────

describe('plannerV2LegacySummary: the planner\'s numbers in the shape every reader of the summary has', () => {
  const planner = {
    side_delts: { direct: 8, fractional: 9, plannedSets: 4 },
    rear_delts: { direct: 6, fractional: 7, plannedSets: 2 },
    front_delts: { direct: 0, fractional: 4 },
    quads: { direct: 12, fractional: 12, plannedSets: 6 },
    adductors: { direct: 2, fractional: 6, plannedSets: 2 },
    forearms: { direct: 0, fractional: 2 },
  };

  test('the three delt heads are one shoulders bucket, with the heads nested; no planner key is left at the top', () => {
    const out = plannerV2LegacySummary(planner, []);
    expect(out.shoulders).toMatchObject({ plannedSets: 6, direct: 14, fractional: 20 });
    expect(out.shoulders.heads).toEqual({ side_delts: 4, rear_delts: 2, front_delts: 0 });
    for (const key of ['side_delts', 'rear_delts', 'front_delts', 'adductors', 'forearms']) expect(out).not.toHaveProperty(key);
    expect(out.quads.plannedSets).toBe(6);
  });

  test('it has every bucket the generator\'s summary has, each with a plannedSets number', () => {
    const out = plannerV2LegacySummary(planner, []);
    expect(Object.keys(out)).toEqual(
      ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'traps'],
    );
    for (const v of Object.values(out)) expect(Number.isFinite(v.plannedSets)).toBe(true);
    expect(out.chest.plannedSets).toBe(0);
    // Nothing planned still has the shape.
    expect(Object.keys(plannerV2LegacySummary(undefined))).toHaveLength(11);
  });

  test('a weak point marks the bucket of its muscle, as the generator\'s summary does', () => {
    const out = plannerV2LegacySummary(planner, ['rear_delts', 'glutes']);
    expect(out.shoulders.isWeakPoint).toBe(true);
    expect(out.glutes.isWeakPoint).toBe(true);
    expect(out.quads.isWeakPoint).toBe(false);
  });
});

describe('the previewed plan delivers the volume it claims, for every kit (an independent recount from its exercises)', () => {
  test.each([
    ['full gym, 3 days, bikini', { daysPerWeek: 3, trainingGoal: 'bikini' }],
    ['full gym, 4 days, general', {}],
    ['full gym, 6 days, advanced', { daysPerWeek: 6, experience: 'advanced' }],
    ['machines and cables, 4 days', { equipment: 'machines_cables' }],
    ['dumbbells only, 4 days', { equipment: 'dumbbells_only' }],
    ['a home gym, 3 days', { equipment: 'home_gym', daysPerWeek: 3 }],
    ['barbell and plates, 4 days', { equipment: 'barbell_plates' }],
    ['bodyweight, 3 days', { equipment: 'bodyweight', daysPerWeek: 3 }],
  ])('%s', async (_label, over) => {
    const preview = await generatePlanDryRun('u1', { ...profile, ...over });
    expect(preview.ok).toBe(true);
    expect(preview.plan.v2).toBeDefined();
    const audit = auditPlanVolume(preview.plan, CATALOGUE_ROWS);
    expect(audit.unresolved).toEqual([]);
    expect(audit.mismatches).toEqual([]);
    // And the claim is a real one: the plan trains something.
    expect(Object.values(preview.plan.weeklyVolumeSummary).some((v) => v.plannedSets > 0)).toBe(true);
  });

  test('the saved rows are the previewed exercises with the previewed sets, so the claim holds for what is written too', async () => {
    const preview = await generatePlanDryRun('u1', { ...profile, equipment: 'dumbbells_only' });
    await generateAndSavePlan('u1', { ...profile, equipment: 'dumbbells_only' });
    expect(savedRows().map((r) => [r.exerciseId, r.sets]))
      .toEqual(previewedExercises(preview).map((x) => [x.exerciseId, x.sets]));
  });
});

// ── ruling 4: one transaction, sync suppressed ──────────────────────────────

describe('the plan is written in one transaction, with its facts, and every intermediate sync suppressed', () => {
  test('the facts are written inside the plan\'s transaction, after its last exercise, with sync suppressed', async () => {
    let factsInTransaction = null;
    setProgrammePlanFacts.mockImplementation(async () => { factsInTransaction = inTransaction; });
    const result = await generateAndSavePlan('u1', profile);

    expect(result.ok).toBe(true);
    expect(factsInTransaction).toBe(true);
    expect(setProgrammePlanFacts).toHaveBeenCalledTimes(1);
    expect(setProgrammePlanFacts.mock.calls[0][0]).toBe('programme-1');
    expect(setProgrammePlanFacts.mock.calls[0][2]).toEqual({ scheduleSync: false });
    const lastExercise = Math.max(...addExerciseToRoutine.mock.invocationCallOrder);
    expect(setProgrammePlanFacts.mock.invocationCallOrder[0]).toBeGreaterThan(lastExercise);
    expect(setProgrammePlanFacts.mock.invocationCallOrder[0]).toBeLessThan(activatePlanWithBlock.mock.invocationCallOrder[0]);
  });

  test('before activation there is exactly one transaction, and it holds the programme, every routine and every exercise', async () => {
    await generateAndSavePlan('u1', profile);

    const beforeActivation = runInTransaction.mock.invocationCallOrder
      .filter((order) => order < activatePlanWithBlock.mock.invocationCallOrder[0]);
    expect(beforeActivation).toHaveLength(1);
    const [txStart] = beforeActivation;
    const writes = [createProgramme, createRoutine, addExerciseToRoutine, setProgrammePlanFacts]
      .flatMap((fn) => fn.mock.invocationCallOrder);
    expect(writes.length).toBeGreaterThan(10);
    for (const order of writes) expect(order).toBeGreaterThan(txStart);
    // Nothing the plan write does schedules a sync of its own.
    for (const call of createRoutine.mock.calls) expect(call.at(-1)).toBe(false);
    for (const call of addExerciseToRoutine.mock.calls) expect(call[10]).toBe(false);
    expect(createProgramme.mock.calls[0].at(-1)).toBe(false);
  });

  test('the weekly rows come after activation, all in one transaction of their own (they need the block\'s weeks)', async () => {
    await generateAndSavePlan('u1', profile);

    const activation = activatePlanWithBlock.mock.invocationCallOrder[0];
    const afterActivation = runInTransaction.mock.invocationCallOrder.filter((order) => order > activation);
    expect(afterActivation).toHaveLength(1);
    expect(upsertPlannedMuscleVolume.mock.calls.length).toBeGreaterThan(0);
    for (const order of upsertPlannedMuscleVolume.mock.invocationCallOrder) expect(order).toBeGreaterThan(afterActivation[0]);
  });

  test('a failure writing the facts rolls the transaction back: the save reports it and activates nothing', async () => {
    setProgrammePlanFacts.mockRejectedValueOnce(new Error('injected facts failure'));
    const result = await generateAndSavePlan('u1', profile);

    expect(result).toEqual({ ok: false, error: 'injected facts failure' });
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
    expect(upsertPlannedMuscleVolume).not.toHaveBeenCalled();
    expect(deleteProgrammeCascade).toHaveBeenCalledWith('programme-1', { scheduleSync: false });
  });
});

describe('a library the catalogue cannot plan from falls back before the new planner or any write', () => {
  // Rows that carry no equipment profile: nothing of the catalogue fits any kit.
  const bare = () => LIBRARY.map((e) => ({ ...e, equipmentProfiles: [] }));

  test('no catalogue exercise for the kit: the planner is not run, no fact is written and no programme is created for it', async () => {
    getAllExercises.mockResolvedValue(bare());
    await generateAndSavePlan('u1', profile);

    expect(buildPlan).not.toHaveBeenCalled();
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
    expect(upsertPlannedMuscleVolume).not.toHaveBeenCalled();
    const preview = await generatePlanDryRun('u1', profile);
    expect(buildPlan).not.toHaveBeenCalled();
    expect(preview.plan?.v2).toBeUndefined();
  });

  test('the person\'s own exercises alone do not make a plan: a kept exercise cannot stand in for the catalogue', async () => {
    getAllExercises.mockResolvedValue(bare());
    givenCurrentPlan({ 'old-1': ['Dumbbell Bench Press'] });
    await generateAndSavePlan('u1', profile);

    expect(buildPlan).not.toHaveBeenCalled();
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
  });
});

// ── rulings 2 and 3: continuity on the new path ─────────────────────────────

describe('continuity on the new path: the receipt, the reviewed proposal and the reviewed rep ranges', () => {
  test('a first plan has nothing to be continuous with: no rebuild, no decisions, in the preview and the save', async () => {
    const preview = await generatePlanDryRun('u1', profile);
    const saved = await generateAndSavePlan('u1', profile);

    for (const result of [preview, saved]) {
      expect(result.continuity.isRebuild).toBe(false);
      expect(result.continuity.decisions).toEqual([]);
    }
  });

  test('a rebuild reports its decisions, and the preview and the save report the same ones', async () => {
    // A flat and an incline press the person trains, and a plank (a duration row
    // the planner cannot prescribe sets and reps for, so it cannot place).
    givenCurrentPlan({ 'old-1': ['Dumbbell Bench Press', 'Incline Machine Press', 'Plank'] });
    const preview = await generatePlanDryRun('u1', profile);
    const saved = await generateAndSavePlan('u1', profile);

    expect(preview.continuity.isRebuild).toBe(true);
    expect(saved.continuity.isRebuild).toBe(true);
    expect(saved.continuity.decisions).toEqual(preview.continuity.decisions);
    expect(saved.continuity.summary).toEqual(preview.continuity.summary);

    const { decisions, summary } = preview.continuity;
    const kept = decisions.filter((d) => d.outcome === 'retained').map((d) => d.exerciseId);
    expect(kept).toContain('Dumbbell Bench Press');
    expect(kept).toContain('Incline Machine Press');
    expect(decisions.filter((d) => d.outcome === 'no_longer_in').map((d) => d.previousExerciseId)).toEqual(['Plank']);
    // The receipt's counts are its own decisions, and the plan is what the decisions say.
    expect(summary.total).toBe(decisions.length);
    expect(summary.retained).toBe(decisions.filter((d) => d.outcome === 'retained').length);
    const written = savedRows().map((r) => r.exerciseId);
    expect(written).toEqual(previewedExercises(preview).map((x) => x.exerciseId));
    for (const id of kept) expect(written).toContain(id);
  });

  test('a reviewed replacement changes the real exercise, in the preview and in the save, and the receipt says so', async () => {
    givenCurrentPlan({ 'old-1': ['Barbell Bench Press'] });
    const proposal = {
      slots: [{ exerciseId: 'Barbell Bench Press', verdict: SLOT_VERDICT.REPLACE, reason: SLOT_REASON.SYSTEMATIC_VARIATION }],
    };
    const preview = await generatePlanDryRun('u1', profile, { continuityProposal: proposal });
    const saved = await generateAndSavePlan('u1', profile, { continuityProposal: proposal });

    // Without the review the first flat press is the barbell bench press.
    const plain = await generatePlanDryRun('u1', profile);
    expect(previewedExercises(plain).map((x) => x.exerciseId)).toContain('Barbell Bench Press');

    for (const names of [previewedExercises(preview).map((x) => x.exerciseId), savedRows().map((r) => r.exerciseId)]) {
      expect(names).not.toContain('Barbell Bench Press');
      expect(names).toContain('Dumbbell Bench Press');
    }
    const decision = preview.continuity.decisions.find((d) => d.previousExerciseId === 'Barbell Bench Press');
    expect(decision).toMatchObject({
      outcome: 'replaced', reason: SLOT_REASON.SYSTEMATIC_VARIATION, exerciseId: 'Dumbbell Bench Press',
    });
    expect(saved.continuity.decisions).toEqual(preview.continuity.decisions);
  });

  test('a reviewed prescription change reaches the saved rows and the preview, and the receipt carries it', async () => {
    givenCurrentPlan({ 'old-1': ['Barbell Bench Press'] });
    const proposal = {
      slots: [{
        exerciseId: 'Barbell Bench Press',
        verdict: SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE,
        reason: SLOT_REASON.PLATEAU,
        prescriptionChange: { repMin: 15, repMax: 20 },
      }],
    };
    const preview = await generatePlanDryRun('u1', profile, { continuityProposal: proposal });
    await generateAndSavePlan('u1', profile, { continuityProposal: proposal });

    const decision = preview.continuity.decisions.find((d) => d.exerciseId === 'Barbell Bench Press');
    expect(decision).toMatchObject({ outcome: 'retained', prescriptionChange: { repMin: 15, repMax: 20 } });
    const previewed = previewedExercises(preview).filter((x) => x.exerciseId === 'Barbell Bench Press');
    expect(previewed.length).toBeGreaterThan(0);
    for (const x of previewed) expect(x).toMatchObject({ repMin: 15, repMax: 20 });
    const saved = savedRows().filter((r) => r.exerciseId === 'Barbell Bench Press');
    expect(saved.length).toBe(previewed.length);
    for (const r of saved) expect(r).toMatchObject({ repMin: 15, repMax: 20 });
    // Every other exercise keeps the planner's own rep range.
    const others = savedRows().filter((r) => r.exerciseId !== 'Barbell Bench Press');
    expect(others.some((r) => r.repMin === 15 && r.repMax === 20)).toBe(false);
  });

  test('an exercise the person trains that no catalogue family names is never dropped in silence: it is in the plan, or the receipt says it is no longer in it', async () => {
    // A custom chest lift with no stored subregion (creation never records one).
    const custom = {
      ...BY_NAME.get('Dumbbell Bench Press'), id: 'custom-weird-lift', name: 'My Weird Chest Thing',
      subregion: null, isCustom: 1,
    };
    getAllExercises.mockResolvedValue([...LIBRARY, custom]);
    givenCurrentPlan({ 'old-1': ['My Weird Chest Thing'] }, [custom]);
    const preview = await generatePlanDryRun('u1', profile);
    await generateAndSavePlan('u1', profile);

    const inPlan = previewedExercises(preview).some((x) => x.exerciseId === 'custom-weird-lift');
    const reported = preview.continuity.decisions.some(
      (d) => d.previousExerciseId === 'custom-weird-lift' && d.outcome === 'no_longer_in',
    );
    expect(inPlan || reported).toBe(true);
    // And what the preview said is what was written.
    expect(savedRows().some((r) => r.exerciseId === 'custom-weird-lift')).toBe(inPlan);
  });
});
