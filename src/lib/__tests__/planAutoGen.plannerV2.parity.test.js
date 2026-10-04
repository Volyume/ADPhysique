/**
 * planAutoGen.plannerV2.parity.test.js -- D219 lane B7 (lead rulings 2, 3 and
 * 4), the release switch ON (plan/release.js is mocked to true; it ships
 * false, and planAutoGen.plannerV2.preview.off.test.js pins that off leaves
 * today's dry run untouched).
 *
 * What this suite pins and why:
 *
 *  - SLOT FACTS (ruling 2). The saved plan's facts carry
 *    slots[routineId][exerciseId] = { muscle, kind, credits } taken from the
 *    planner's own exercises, so the reader serves a slot with the planner's
 *    model rather than the corpus's (the Walking Lunge is planned under
 *    glutes). End to end: the facts the save writes, read back through
 *    buildPlanSessions and prescribe, serve every muscle's weekly target in
 *    every week, and serve week 1 exactly as the planner built it.
 *  - THE PREVIEW IS THE PLAN THAT IS SAVED (ruling 3). generatePlanDryRun
 *    builds with the new planner from the same inputs through the same two
 *    steps as the save, writes nothing, and answers with the same workouts, the
 *    same sets, reps and rest, in the same order, falling back to today's
 *    generator in exactly the cases the save does.
 *  - CONTINUITY (ruling 4). The person's own exercises that continuity keeps
 *    go to the planner first: each at the front of choices[its primary muscle]
 *    (deduped, kind from the generator's key, credits by the curated rule
 *    where the name is in the catalogue, else none), so a kept exercise
 *    appears in the rebuilt plan, in the preview and in the save alike. One
 *    continuity would replace, one the planner cannot place and one with no
 *    load prescription are never handed over.
 * Every one of these fails on a build without this lane's code.
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
  // What exercise/intent.js reads to judge an exercise the person set aside (the
  // real constant, database.js EXERCISE_INTENT); the intent reads themselves are
  // absent, so the intent state is the empty one a person with no exclusions has.
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block', PATTERN_AVOID: 'pattern_avoid' },
}));

import {
  buildPlanInputs, generateAndSavePlan, generatePlanDryRun, plannerV2KeptChoices,
} from '../planAutoGen';
import { buildPlan } from '../plan/planner';
import { resolveCatalogue, catalogueCredits } from '../plan/catalogue';
import { DIVISION_MATRIX } from '../planEngine';
import { deriveParamKey } from '../poolGenerator';
import { STYLE_POOL_KEYS } from '../exercise/stylePools';
import { prescribeWeek } from '../plan/prescribe';
import { buildPlanSessions } from '../sessionAdjustments';
import { computeWeeklySessionAllocation } from '../coachApply';
import {
  getAllExercises, createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, activatePlanKeepingBlock, archiveOtherUserPlans, getAllProgrammes,
  db, runInTransaction, deleteProgrammeCascade, deleteProgrammeCascadeInTx,
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails, upsertPlannedMuscleVolume,
  getMesocycleWeeks, getCurrentMesocycleWeek, getRecentlyUsedExerciseIds, getAllMesocycles,
  setProgrammePlanFacts,
} from '../database';

const { LIBRARY, BY_NAME } = require('./campaign16.helpers');

// The profile of the brief's case: a general plan, 4 days a week, 75 minutes.
const profile = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
  equipment: 'full_gym', trainingGoal: 'general', trainingPhase: 'maintain',
  recoveryRating: 'average',
};

const weeks = () => [1, 2, 3, 4, 5, 6].map((i) => ({ id: `week-${i}`, week_index: i, is_deload: i === 6 ? 1 : 0 }));

// The planner's plan for a profile, by the same two pure calls the save makes.
function expectedFor(over = {}, mutateChoices = (c) => c) {
  const inputs = buildPlanInputs({ ...profile, ...over });
  const choices = mutateChoices(resolveCatalogue({ library: LIBRARY, profile: inputs.equipment, loggedExerciseNames: [] }));
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

// What the save wrote, per routine in rotation order.
function writtenRoutines() {
  const byRoutine = {};
  for (const c of addExerciseToRoutine.mock.calls) {
    (byRoutine[c[0]] = byRoutine[c[0]] || []).push({
      exerciseId: c[1], sets: c[6], repMin: c[3], repMax: c[4], restSec: c[8],
    });
  }
  return createRoutine.mock.calls.map((c, k) => ({
    id: `routine-${k}`, name: c[1], splitType: c[3], exercises: byRoutine[`routine-${k}`] || [],
  }));
}

// The person's current plan, as getRoutineExercisesWithDetails hands it back.
function givenCurrentPlan(namesByRoutine) {
  getActivePlan.mockResolvedValue({ id: 'old-plan', tags: null });
  getRoutinesForPlan.mockResolvedValue(Object.keys(namesByRoutine).map((id) => ({ id })));
  getRoutineExercisesWithDetails.mockImplementation(async (routineId) => (namesByRoutine[routineId] || []).map((entry, i) => {
    const exercise = typeof entry === 'string' ? BY_NAME.get(entry) : entry;
    return { routineExercise: { id: `old-${routineId}-${i}`, exerciseId: exercise.id, recommendedSets: 3, groupKind: null }, exercise };
  }));
}

const handedTo = () => buildPlan.mock.calls.at(-1)[0];

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

// ── ruling 2: slot facts ─────────────────────────────────────────────────────

describe('slot facts: the saved plan carries the planner\'s own muscle, kind and credits for every exercise', () => {
  test('facts.slots[routineId][exerciseId] is { muscle, kind, credits } from the planner\'s exercises', async () => {
    const { plan, choices } = expectedFor();
    await generateAndSavePlan('u1', profile);
    const facts = setProgrammePlanFacts.mock.calls[0][1];

    expect(Object.keys(facts.slots).sort()).toEqual(plan.v2.order.map((_, k) => `routine-${k}`).sort());
    let entries = 0;
    plan.v2.order.forEach((key, k) => {
      const workout = plan.workouts.find((w) => w.sessionKey === key);
      const held = facts.slots[`routine-${k}`];
      expect(Object.keys(held).sort()).toEqual(workout.exercises.map((x) => x.name).sort()); // the rig's id is the name
      for (const x of workout.exercises) {
        const choice = choices[x.muscle].find((c) => c.name === x.name);
        expect(held[x.name]).toEqual({ muscle: x.muscle, kind: x.kind, credits: choice.credits });
        entries += 1;
      }
    });
    expect(entries).toBeGreaterThan(15);
    // Plain data a column can hold.
    expect(JSON.parse(JSON.stringify(facts.slots))).toEqual(facts.slots);
  });

  test('the Walking Lunge the planner puts under glutes is stored under glutes, with the curated credit', async () => {
    // The 4-day full-gym plan holds the lunge as the glutes' third choice (probed
    // 2026-10-04: so does every 3 to 6 day plan); if the planner stops placing
    // it here, this test names the case that needs another profile.
    await generateAndSavePlan('u1', profile);
    const facts = setProgrammePlanFacts.mock.calls[0][1];
    const holders = Object.values(facts.slots).filter((held) => held['Walking Lunge']);
    expect(holders.length).toBeGreaterThan(0);
    for (const held of holders) {
      expect(held['Walking Lunge']).toEqual({ muscle: 'glutes', kind: 'mod_compound', credits: { quads: 0.5 } });
    }
    // The corpus's own word for it is the quads: the fact is what differs.
    expect(BY_NAME.get('Walking Lunge').primaryMuscle).toBe('quads');
  });

  test('read back through the reader, the lunge is a glutes slot and every week serves every muscle\'s target', async () => {
    await generateAndSavePlan('u1', profile);
    const facts = setProgrammePlanFacts.mock.calls[0][1];
    const routines = writtenRoutines();
    const withRows = routines.map((r) => ({
      routine: { id: r.id },
      rows: r.exercises.map((x, i) => ({
        routineExercise: { id: `${r.id}-re${i}`, recommendedSets: x.sets, groupKind: null },
        exercise: BY_NAME.get(x.exerciseId),
      })),
    }));
    const sessions = buildPlanSessions(withRows, facts);
    const rowBySlot = new Map(withRows.flatMap((r) => r.rows).map((x) => [x.routineExercise.id, x]));
    const lunge = sessions.flatMap((s) => s.slots).filter((slot) => rowBySlot.get(slot.id).exercise.name === 'Walking Lunge');
    expect(lunge.length).toBeGreaterThan(0);
    for (const slot of lunge) expect(slot.muscle).toBe('glutes');

    for (let w = 1; w <= 6; w += 1) {
      const weekTargets = Object.fromEntries(Object.entries(facts.weeklyTargets).map(([m, list]) => [m, list[w - 1]]));
      const { sets } = prescribeWeek({
        sessions, weekTargets, facts: { exposureShares: facts.exposureShares, sessionCaps: facts.sessionCaps },
      });
      const servedByMuscle = {};
      for (const s of sessions) for (const slot of s.slots) servedByMuscle[slot.muscle] = (servedByMuscle[slot.muscle] || 0) + sets[slot.id];
      for (const [muscle, target] of Object.entries(weekTargets)) expect(servedByMuscle[muscle]).toBe(target);
    }
  });

  test('week 1 is served exactly as the planner built it, exercise by exercise, through the logger\'s own allocator', async () => {
    await generateAndSavePlan('u1', profile);
    const facts = setProgrammePlanFacts.mock.calls[0][1];
    const routines = writtenRoutines();
    const withRows = routines.map((r) => ({
      routine: { id: r.id },
      rows: r.exercises.map((x, i) => ({
        routineExercise: { id: `${r.id}-re${i}`, recommendedSets: x.sets, groupKind: null },
        exercise: BY_NAME.get(x.exerciseId),
      })),
    }));
    const ctx = { facts, sessions: buildPlanSessions(withRows, facts) };
    const week1 = Object.fromEntries(Object.entries(facts.weeklyTargets).map(([m, list]) => [m, list[0]]));
    for (const { routine, rows } of withRows) {
      const todays = rows.map((r) => ({
        exerciseId: r.exercise.id, primaryMuscle: r.exercise.primaryMuscle,
        recommendedSets: r.routineExercise.recommendedSets, slotId: r.routineExercise.id,
      }));
      const served = computeWeeklySessionAllocation(todays, week1, week1, ctx);
      expect(served).toEqual(Object.fromEntries(rows.map((r) => [r.exercise.id, r.routineExercise.recommendedSets])));
      expect(routine.id).toMatch(/^routine-/);
    }
  });
});

// ── ruling 3: the preview ────────────────────────────────────────────────────

describe('the preview is the plan that is saved', () => {
  const asPreview = (result) => result.plan.workouts.map((w) => ({
    name: w.name,
    exercises: w.exercises.map((x) => ({
      exerciseId: x.exerciseId, sets: x.sets, repMin: x.repMin, repMax: x.repMax, restSec: x.restSec,
    })),
  }));

  test.each([
    ['a 4-day general plan', {}],
    ['a 3-day plan on machines and cables', { daysPerWeek: 3, equipment: 'machines_cables' }],
    ['a 6-day plan on dumbbells only', { daysPerWeek: 6, equipment: 'dumbbells_only', sessionLengthMinutes: 60 }],
    ['a 5-day strength plan', { daysPerWeek: 5, trainingPhase: 'strength_size' }],
  ])('%s: the same workouts, exercises, sets, reps and rest, in the same order', async (_label, over) => {
    const p = { ...profile, ...over };
    const preview = await generatePlanDryRun('u1', p);
    expect(preview.ok).toBe(true);
    const previewed = asPreview(preview);
    expect(previewed.length).toBe(p.daysPerWeek);

    await generateAndSavePlan('u1', p);
    const saved = writtenRoutines();
    expect(saved.map((r) => r.name)).toEqual(previewed.map((w) => w.name));
    expect(saved.map((r) => r.exercises)).toEqual(previewed.map((w) => w.exercises));
    expect(saved[0].splitType).toBe(preview.plan.splitType);
  });

  test('the preview shows the new planner\'s plan: it carries the planner\'s facts, and its session length is the person\'s', async () => {
    const { plan } = expectedFor();
    const preview = await generatePlanDryRun('u1', profile);

    expect(preview.plan.v2).toEqual(plan.v2);
    expect(preview.plan.name).toBe(plan.name);
    expect(preview.plan.splitType).toBe(plan.splitType);
    expect(preview.sessionLengthMinutes).toBe(75);
    expect(preview.structureMemory).toBeNull();
    expect(preview.continuity).toMatchObject({ isRebuild: false, decisions: [] });
    expect(preview).not.toHaveProperty('partial');
    expect(preview.plan.workouts.flatMap((w) => w.exercises).every((x) => typeof x.exerciseName === 'string' && x.exerciseName.length > 0)).toBe(true);
  });

  test('the dry run writes nothing: no programme, routine, exercise, fact, row, activation or archive', async () => {
    await generatePlanDryRun('u1', profile);

    for (const write of [
      createProgramme, createRoutine, addExerciseToRoutine, setProgrammePlanFacts, upsertPlannedMuscleVolume,
      activatePlanWithBlock, activatePlanKeepingBlock, archiveOtherUserPlans, deleteProgrammeCascade, runInTransaction,
    ]) expect(write).not.toHaveBeenCalled();
  });

  test('it is handed the planner exactly as the save is: the same inputs, history and catalogue', async () => {
    getRecentlyUsedExerciseIds.mockResolvedValue(['Dumbbell Row']);
    getAllMesocycles.mockResolvedValue([{ startDate: '2026-01-05', plannedWeeks: 6, endDate: '2026-02-20' }]);
    await generatePlanDryRun('u1', { ...profile, planWeakPoints: ['Side Delts'] });
    const fromPreview = handedTo();
    await generateAndSavePlan('u1', { ...profile, planWeakPoints: ['Side Delts'] });
    expect(handedTo()).toEqual(fromPreview);
    expect(fromPreview.firstBlock).toBe(false);
    expect(fromPreview.focusMuscles).toEqual(['side_delts']);
    expect(fromPreview.choices.back.map((c) => c.name)).toContain('Dumbbell Row');
  });

  test('a style-tagged current plan keeps its style pool: the preview does not use the new planner, as the save does not', async () => {
    getActivePlan.mockResolvedValue({ tags: `style:${STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS}` });
    const preview = await generatePlanDryRun('u1', profile);

    expect(buildPlan).not.toHaveBeenCalled();
    expect(getRecentlyUsedExerciseIds).not.toHaveBeenCalled();
    expect(preview.plan?.v2).toBeUndefined();
  });

  test('a planner that fails falls back to today\'s generator, with nothing thrown, as the save does', async () => {
    buildPlan.mockImplementationOnce(() => { throw new Error('injected planner failure'); });
    const preview = await generatePlanDryRun('u1', profile);
    expect(preview.ok).toBe(true);
    expect(preview.plan.v2).toBeUndefined();
    expect(preview.plan.workouts.length).toBeGreaterThan(0);

    buildPlan.mockImplementationOnce(() => { throw new Error('injected planner failure'); });
    const saved = await generateAndSavePlan('u1', profile);
    expect(saved.ok).toBe(true);
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
  });

  test('a planner that builds nothing falls back to today\'s generator in both', async () => {
    buildPlan.mockImplementationOnce(() => ({ workouts: [] }));
    const preview = await generatePlanDryRun('u1', profile);
    expect(preview.ok).toBe(true);
    expect(preview.plan.v2).toBeUndefined();
  });

  test('a library that resolves nothing gives today\'s own zero-match answer, never a plan', async () => {
    getAllExercises.mockResolvedValue([]);
    const preview = await generatePlanDryRun('u1', profile);
    expect(preview).toEqual({ ok: false, error: 'No exercises matched your equipment' });
    expect(setProgrammePlanFacts).not.toHaveBeenCalled();
  });

  test('a profile without a goal is refused as before, and no user is refused as before', async () => {
    expect(await generatePlanDryRun('u1', { ...profile, trainingGoal: undefined })).toEqual({ ok: false, error: 'Profile incomplete' });
    expect(await generatePlanDryRun(null, profile)).toEqual({ ok: false, error: 'No user' });
  });
});

// ── ruling 4: continuity ─────────────────────────────────────────────────────
//
// Re-ruled by the lead after the first report (D33, lane B7 follow-up): a kept
// exercise takes the place of the catalogue choice in its OWN FAMILY
// (muscle::family, continuity's own key, slotKey(muscle, movementFamily(...))),
// keeping that role's position; only a kept exercise with no family match in
// the catalogue goes at the front. The first version put every kept exercise at
// the front and deduped by name only, which pushed the catalogue's own choice
// for the same job down a place (a kept Smith Machine Bench Press made the chest
// two flat presses and dropped the incline press).

describe('plannerV2KeptChoices: a kept exercise takes its family\'s place, else goes first (pure)', () => {
  const choices = resolveCatalogue({ library: LIBRARY, profile: 'full_gym' });
  const rowOf = (choice) => BY_NAME.get(choice.name);
  const keep = (...names) => plannerV2KeptChoices(choices, names.map((n) => BY_NAME.get(n)), rowOf);
  const namesOf = (c, muscle) => c[muscle].map((x) => x.name);

  // The full gym's lists: chest Barbell Bench Press (flat), Incline Dumbbell
  // Press (incline), Pec Deck (flat); quads Barbell Back Squat (squat_press),
  // Leg Extension (knee_extension), Leg Press (squat_press).
  test('a kept Smith Machine Bench Press replaces the Barbell Bench Press role, so the incline press stays', () => {
    const out = keep('Smith Machine Bench Press');
    expect(namesOf(out, 'chest')).toEqual(['Smith Machine Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)']);
    // It keeps that role's position, rank and role.
    expect(out.chest[0]).toMatchObject({
      name: 'Smith Machine Bench Press', exerciseId: 'Smith Machine Bench Press', role: 'flat_press', rank: 1,
      thinKit: false, logged: true, kept: true, direct: 1, primaryMuscle: 'chest',
    });
    // Every other muscle is the catalogue's own list, untouched.
    for (const muscle of Object.keys(choices)) if (muscle !== 'chest') expect(out[muscle]).toBe(choices[muscle]);
  });

  test('a kept exercise of another family takes that family\'s place, wherever it sits in the list', () => {
    const incline = keep('Incline Barbell Bench Press');
    expect(namesOf(incline, 'chest')).toEqual(['Barbell Bench Press', 'Incline Barbell Bench Press', 'Pec Deck (Machine Fly)']);
    expect(incline.chest[1]).toMatchObject({ role: 'incline_press', rank: 2, kept: true });
    // Family is the key, not the name: a custom row tagged incline takes the incline place.
    const custom = plannerV2KeptChoices(
      choices, [{ ...BY_NAME.get('Dumbbell Bench Press'), id: 'custom-1', name: 'My Press', subregion: 'incline' }], rowOf,
    );
    expect(namesOf(custom, 'chest')).toEqual(['Barbell Bench Press', 'My Press', 'Pec Deck (Machine Fly)']);
  });

  test('the exercise the catalogue already lists keeps its own place: it is not moved, and it is not listed twice', () => {
    const incline = keep('Incline Dumbbell Press');
    expect(namesOf(incline, 'chest')).toEqual(namesOf(choices, 'chest'));
    expect(incline.chest[1].kept).toBe(true);
    expect(incline.chest[0].kept).toBeUndefined();
    // The leg press is in the squat family, as is the squat above it: it stays third, the squat stays first.
    const press = keep('Leg Press');
    expect(namesOf(press, 'quads')).toEqual(['Barbell Back Squat', 'Leg Extension', 'Leg Press']);
    expect(press.quads[2]).toMatchObject({ kept: true, role: 'other_squat' });
    expect(press.quads[0].kept).toBeUndefined();
    // Handed over twice (it is in two of the person's sessions) it is still one entry.
    expect(namesOf(keep('Smith Machine Bench Press', 'Smith Machine Bench Press'), 'chest').filter((n) => n === 'Smith Machine Bench Press')).toHaveLength(1);
  });

  test('only a kept exercise with no family match in the catalogue goes at the front', () => {
    const out = keep('Decline Barbell Bench Press');
    expect(BY_NAME.get('Decline Barbell Bench Press').subregion).toBe('decline');
    expect(namesOf(out, 'chest')).toEqual(['Decline Barbell Bench Press', ...namesOf(choices, 'chest')]);
    expect(out.chest[0]).toMatchObject({ role: null, rank: 1, kept: true, thinKit: false });
  });

  test('several kept exercises: each takes the next unclaimed place of its family; an extra stays beside its family, never ahead', () => {
    // The chest's flat family has two places (the press and the pec deck). The
    // ruling is silent on a third: it stays right after the family's last place,
    // so it never outranks the exercises that took the places.
    const out = keep('Smith Machine Bench Press', 'Machine Chest Press', 'Dumbbell Bench Press');
    expect(namesOf(out, 'chest')).toEqual([
      'Smith Machine Bench Press', 'Incline Dumbbell Press', 'Machine Chest Press', 'Dumbbell Bench Press',
    ]);
    expect(out.chest[3]).toMatchObject({ kept: true, role: null });
    // Nothing the person kept is listed twice, and the incline press still stands.
    expect(new Set(namesOf(out, 'chest')).size).toBe(out.chest.length);
    expect(namesOf(out, 'chest')).toContain('Incline Dumbbell Press');
    // One with no family in the catalogue is the only kind that goes first.
    const mixed = keep('Smith Machine Bench Press', 'Machine Chest Press', 'Dumbbell Bench Press', 'Decline Barbell Bench Press');
    expect(namesOf(mixed, 'chest')).toEqual([
      'Decline Barbell Bench Press', 'Smith Machine Bench Press', 'Incline Dumbbell Press', 'Machine Chest Press', 'Dumbbell Bench Press',
    ]);
  });

  test('families are per muscle: a kept exercise is matched only within the muscle it is primary for', () => {
    // The Walking Lunge is a quads row in the library, so it is a quads exercise
    // here, in the squat family: it takes the squat's place. The catalogue's own
    // glutes list, which names the same lunge as the glutes' third choice, is not touched.
    const out = keep('Walking Lunge');
    expect(namesOf(out, 'quads')).toEqual(['Walking Lunge', 'Leg Extension', 'Leg Press']);
    expect(out.glutes).toBe(choices.glutes);
  });

  test('kind is the generator\'s key for the row, whatever the catalogue would say', () => {
    for (const name of ['Dumbbell Bench Press', 'Machine Chest Press', 'Barbell Bench Press', 'Pec Deck (Machine Fly)']) {
      const row = BY_NAME.get(name);
      const out = keep(name);
      expect(out.chest.find((x) => x.kept).kind).toBe(deriveParamKey(row.equipmentCategory, row.compoundIsolation));
    }
  });

  test('credits are the curated rule where the name is in the muscle\'s catalogue, and none where it is not', () => {
    const inCatalogue = keep('Machine Chest Press').chest[0];
    expect(inCatalogue.credits).toEqual({ triceps: 0.5, front_delts: 0.5 });
    expect(inCatalogue.credits).toEqual(catalogueCredits('chest', 'Machine Chest Press'));
    const outside = keep('Smith Machine Bench Press').chest[0];
    expect(outside.name).toBe('Smith Machine Bench Press');
    expect(outside.credits).toEqual({});
    // A lunge kept under quads is not credited by the glutes' rule.
    expect(keep('Walking Lunge').quads[0].credits).toEqual({});
    // The close-grip bench press, in the triceps' catalogue, takes the press credit.
    expect(keep('Close-Grip Bench Press').triceps.find((x) => x.kept).credits).toEqual({ chest: 0.5, front_delts: 0.5 });
  });

  test('a muscle the planner has no choices for, or a row with no load prescription, is not handed over', () => {
    const odd = [
      { ...BY_NAME.get('Dumbbell Bench Press'), name: 'Mystery Move', primaryMuscle: 'lower_back' },
      { ...BY_NAME.get('Cable Crunch'), name: 'Timed Hold', exerciseType: 'duration' },
      { ...BY_NAME.get('Cable Crunch'), name: 'Distance Carry', exerciseType: 'distance' },
      { primaryMuscle: 'chest' },
      null,
    ];
    const out = plannerV2KeptChoices(choices, odd, rowOf);
    expect(out).toEqual(choices);
    expect(Object.keys(out)).not.toContain('lower_back');
  });

  test('a legacy "shoulders" row is a side delts exercise, as the volume counter reads it', () => {
    const out = plannerV2KeptChoices(
      choices, [{ ...BY_NAME.get('Dumbbell Lateral Raise'), id: 'old-raise', name: 'Old Raise', primaryMuscle: 'shoulders' }], rowOf,
    );
    expect(out.side_delts.find((x) => x.kept)).toMatchObject({ name: 'Old Raise', primaryMuscle: 'side_delts' });
  });

  test('database rows (snake_case) are read as well as app rows', () => {
    const row = BY_NAME.get('Machine Chest Press');
    const snake = {
      id: row.id, name: row.name, primary_muscle: 'chest', equipment_category: row.equipmentCategory,
      compound_isolation: row.compoundIsolation, exercise_type: 'weight_reps', subregion: 'flat',
    };
    const out = plannerV2KeptChoices(choices, [snake], rowOf);
    expect(out.chest.find((x) => x.kept)).toMatchObject({
      name: 'Machine Chest Press', kind: deriveParamKey(row.equipmentCategory, row.compoundIsolation), role: 'flat_press',
    });
  });

  test('where the catalogue\'s own rows cannot be read, an exercise already listed keeps its place and any other goes first', () => {
    const noRows = plannerV2KeptChoices(choices, [BY_NAME.get('Smith Machine Bench Press'), BY_NAME.get('Incline Dumbbell Press')]);
    expect(namesOf(noRows, 'chest')).toEqual(['Smith Machine Bench Press', ...namesOf(choices, 'chest')]);
    expect(noRows.chest.find((x) => x.name === 'Incline Dumbbell Press').kept).toBe(true);
  });

  test('inputs are never mutated, and nothing kept returns the catalogue\'s own object', () => {
    const before = JSON.stringify(choices);
    keep('Dumbbell Bench Press', 'Walking Lunge');
    expect(JSON.stringify(choices)).toBe(before);
    expect(plannerV2KeptChoices(choices, [], rowOf)).toBe(choices);
    expect(plannerV2KeptChoices(choices, undefined)).toBe(choices);
  });
});

describe('continuity: a kept exercise appears in the rebuilt plan, in the preview and in the save', () => {
  // The person trains a dumbbell bench press (a flat press that is not the
  // catalogue's first choice, the barbell bench press) and a Smith machine one
  // the catalogue does not list.
  const CURRENT = { 'old-1': ['Dumbbell Bench Press', 'Incline Machine Press'], 'old-2': ['Dumbbell Bench Press'] };
  const chestOf = (handed) => handed.choices.chest.map((c) => c.name);
  const savedChest = () => addExerciseToRoutine.mock.calls.map((c) => c[1]).filter((id) => BY_NAME.get(id).primaryMuscle === 'chest');

  test('the planner is handed each kept exercise in its family\'s place, once each', async () => {
    givenCurrentPlan(CURRENT);
    await generateAndSavePlan('u1', profile);

    const handed = handedTo();
    // The flat press and the incline press the person trains take the catalogue's flat and incline places.
    expect(chestOf(handed)).toEqual(['Dumbbell Bench Press', 'Incline Machine Press', 'Pec Deck (Machine Fly)']);
    expect(handed.choices.chest.slice(0, 2).every((c) => c.kept === true)).toBe(true);
    expect(handed.choices.chest.filter((c) => c.name === 'Dumbbell Bench Press')).toHaveLength(1);
    // Every muscle the person has no exercise for is the catalogue's own.
    const plain = resolveCatalogue({ library: LIBRARY, profile: 'full_gym', loggedExerciseNames: [] });
    expect(handed.choices.back).toEqual(plain.back);
    expect(handed.choices.quads).toEqual(plain.quads);
  });

  test('a kept Smith Machine Bench Press replaces the Barbell Bench Press role, so the incline press stays in the plan', async () => {
    givenCurrentPlan({ 'old-1': ['Smith Machine Bench Press'] });
    const preview = await generatePlanDryRun('u1', profile);
    await generateAndSavePlan('u1', profile);

    expect(chestOf(handedTo())).toEqual(['Smith Machine Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)']);
    const previewed = preview.plan.workouts.flatMap((w) => w.exercises.map((x) => x.exerciseName));
    for (const names of [previewed, addExerciseToRoutine.mock.calls.map((c) => c[1])]) {
      expect(names).toContain('Smith Machine Bench Press');
      expect(names).toContain('Incline Dumbbell Press');
      expect(names).not.toContain('Barbell Bench Press');
    }
    // The person's own press, not the catalogue's, is the flat press of the plan.
    expect(new Set(savedChest())).toEqual(new Set(['Smith Machine Bench Press', 'Incline Dumbbell Press']));
  });

  test('a kept exercise is in the saved routines, in the plan\'s facts, and in the preview', async () => {
    givenCurrentPlan(CURRENT);
    const preview = await generatePlanDryRun('u1', profile);
    const previewed = preview.plan.workouts.flatMap((w) => w.exercises.map((x) => x.exerciseName));
    expect(previewed).toContain('Dumbbell Bench Press');

    await generateAndSavePlan('u1', profile);
    const savedIds = addExerciseToRoutine.mock.calls.map((c) => c[1]);
    expect(savedIds).toContain('Dumbbell Bench Press');
    const facts = setProgrammePlanFacts.mock.calls[0][1];
    const held = Object.values(facts.slots).find((slots) => slots['Dumbbell Bench Press']);
    expect(held['Dumbbell Bench Press']).toEqual({
      muscle: 'chest', kind: deriveParamKey(BY_NAME.get('Dumbbell Bench Press').equipmentCategory, BY_NAME.get('Dumbbell Bench Press').compoundIsolation),
      credits: { triceps: 0.5, front_delts: 0.5 },
    });
    // The preview and the save still agree.
    expect(writtenRoutines().map((r) => r.exercises.map((x) => x.exerciseId)))
      .toEqual(preview.plan.workouts.map((w) => w.exercises.map((x) => x.exerciseId)));
  });

  test('without the person\'s plan the catalogue\'s first choice leads, as before', async () => {
    await generateAndSavePlan('u1', profile);
    expect(handedTo().choices.chest[0].name).toBe('Barbell Bench Press');
    expect(handedTo().choices.chest.some((c) => c.kept)).toBe(false);
  });

  test('an exercise outside the catalogue that the person trains is kept in its family\'s place, credited nothing', async () => {
    givenCurrentPlan({ 'old-1': ['Smith Machine Bench Press'] });
    await generateAndSavePlan('u1', profile);
    const first = handedTo().choices.chest[0];
    expect(first).toMatchObject({ name: 'Smith Machine Bench Press', kept: true, credits: {}, role: 'flat_press' });
    const facts = setProgrammePlanFacts.mock.calls[0][1];
    const held = Object.values(facts.slots).find((slots) => slots['Smith Machine Bench Press']);
    expect(held['Smith Machine Bench Press']).toMatchObject({ muscle: 'chest', credits: {} });
  });

  test('an exercise with no family in the catalogue goes first, ahead of the catalogue\'s own choices', async () => {
    givenCurrentPlan({ 'old-1': ['Decline Barbell Bench Press'] });
    await generateAndSavePlan('u1', profile);
    expect(chestOf(handedTo())).toEqual(['Decline Barbell Bench Press', 'Barbell Bench Press', 'Incline Dumbbell Press', 'Pec Deck (Machine Fly)']);
  });

  test('an exercise continuity would replace is not handed over: the equipment the person has changed', async () => {
    // A barbell exercise the person no longer has kit for.
    givenCurrentPlan({ 'old-1': ['Barbell Bench Press', 'Machine Chest Press'] });
    await generateAndSavePlan('u1', { ...profile, equipment: 'machines_cables' });
    const kept = handedTo().choices.chest.filter((c) => c.kept).map((c) => c.name);
    expect(kept).toEqual(['Machine Chest Press']);
  });

  test('a read failure of the current plan gives the catalogue\'s own choices, never a failed plan', async () => {
    getActivePlan.mockRejectedValue(new Error('injected read failure'));
    const result = await generateAndSavePlan('u1', profile);
    expect(result.ok).toBe(true);
    expect(handedTo().choices.chest.some((c) => c.kept)).toBe(false);
  });

  test('every kept exercise the planner could place is placed; one it has no slot for is simply not in the plan', async () => {
    const MANY = ['Dumbbell Bench Press', 'Machine Chest Press', 'Incline Machine Press', 'Decline Barbell Bench Press', 'Smith Machine Bench Press'];
    givenCurrentPlan({ 'old-1': MANY });
    await generateAndSavePlan('u1', profile);
    const placed = addExerciseToRoutine.mock.calls.map((c) => c[1]).filter((id) => MANY.includes(id));
    expect(placed).toContain('Dumbbell Bench Press');
    expect(placed.length).toBeLessThanOrEqual(MANY.length);
    // The chest never holds more than the planner's limit per session.
    for (const r of writtenRoutines()) {
      expect(r.exercises.filter((x) => BY_NAME.get(x.exerciseId).primaryMuscle === 'chest').length).toBeLessThanOrEqual(3);
    }
  });
});
