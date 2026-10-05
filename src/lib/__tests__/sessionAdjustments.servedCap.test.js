/**
 * D219 lane A4, review finding 1 (design 4.12: "The swapped-in exercise is
 * checked against the caps like any other"): the cap each exercise carries into
 * the one resolver the logger, the mini bar and the plan screens share.
 *
 * What this suite pins and why. The week's sets come from the SLOT, keyed by the
 * routine exercise row, so an isolation exercise a person puts in a slot that
 * serves a compound's 4 sets was served 4, past its cap of 3, whenever the week
 * was read again. Each of today's rows now carries its own cap (servedSetsCap)
 * and computeWeeklySessionAllocation serves min(served, cap). Each fails on the
 * code before this fix (no servedSetsCap, no cap in the allocator):
 *  - the slot's own planned exercise: the cap the planner served it under, the
 *    thin-equipment bonus and a focus muscle's allowance included, so serving it
 *    is unchanged (the min() is then a no-op);
 *  - any other exercise in the slot: exerciseCap of ITS OWN kind, no thin bonus
 *    (that was the planned exercise's), 4 for a focus muscle's isolation exercise
 *    per facts.roles, the muscle being the plan's own fact for it else its primary;
 *  - a slot the person typed a count for, a row with no slot and a plan the new
 *    planner did not build carry no cap: a typed count is served as typed (design
 *    4.3), and every other plan is served exactly as before;
 *  - the serve context names each slot's planned exercise (plannedExerciseBySlot),
 *    which is how "its own planned exercise" is known without changing the slot
 *    shape prescribe reads.
 */

jest.mock('../database', () => ({
  getSessionAdjustmentSignals: jest.fn(),
  getLatestCoachOutput: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getAdaptiveLandmarkHistory: jest.fn(),
  getWeeklyVolumeByMuscle: jest.fn(),
  getRecentAdaptationEvents: jest.fn(),
  createAdaptationEvent: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getMesocycleWeekById: jest.fn(),
  getRoutineById: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getProgrammeById: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const database = require('../database');
const { computeWeeklySessionAllocation } = require('../coachApply');
const { SETS_PER_EXERCISE } = require('../plan/science');
const { buildPlanSessions, servedSetsCap, getPlanServeContextForRoutine } = require('../sessionAdjustments');

const exercise = (id, primaryMuscle, equipmentCategory, compoundIsolation) => (
  { id, name: id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles: [] }
);
const row = (reId, ex, extra = {}) => ({
  routineExercise: { id: reId, exerciseId: ex.id, recommendedSets: 2, groupKind: null, ...extra },
  exercise: ex,
});

const LAT = exercise('lat-wide', 'back', 'cable', 'compound');
const ROW_ISO = exercise('straight-arm', 'back', 'cable', 'isolation');
const LEG_PRESS = exercise('leg-press', 'quads', 'machine_plate_loaded', 'compound');
const HACK = exercise('hack-squat', 'quads', 'machine_plate_loaded', 'compound');
const CURL = exercise('curl', 'biceps', 'dumbbell', 'isolation');
const HAMMER = exercise('hammer', 'biceps', 'dumbbell', 'isolation');
const ABDUCT = exercise('abduct', 'glutes', 'machine_selectorised', 'isolation');

const ROUTINES = [
  { routine: { id: 'r-upper' }, rows: [row('re-lat', LAT), row('re-curl', CURL)] },
  { routine: { id: 'r-lower' }, rows: [row('re-press', LEG_PRESS)] },
];
const FACTS = {
  version: 2,
  roles: { back: 'standard', biceps: 'focus', quads: 'standard', glutes: 'focus' },
  thin: { 'r-lower': ['leg-press'] },
  slots: {
    'r-upper': {
      'lat-wide': { muscle: 'back', kind: 'mod_compound', credits: {} },
      curl: { muscle: 'biceps', kind: 'isolation', credits: {} },
    },
    'r-lower': { 'leg-press': { muscle: 'quads', kind: 'machine', credits: {} } },
  },
};
const context = (facts = FACTS, routines = ROUTINES) => ({
  facts,
  sessions: buildPlanSessions(routines, facts),
  planned: Object.fromEntries(routines.flatMap((r) => r.rows).map((x) => [x.routineExercise.id, x.exercise.id])),
});
const todayRow = (reId, ex) => ({ routineExercise: { id: reId }, exercise: ex });

describe('the slot\'s own planned exercise is held to the cap the planner served it under', () => {
  test('a compound is 4, an isolation exercise 3, and a focus muscle\'s isolation exercise 4', () => {
    const ctx = context();
    expect(servedSetsCap(todayRow('re-lat', LAT), ctx)).toBe(SETS_PER_EXERCISE.capCompound);
    // The curl is an isolation exercise of a FOCUS muscle: 4.
    expect(servedSetsCap(todayRow('re-curl', CURL), ctx)).toBe(SETS_PER_EXERCISE.capCompound);
    const standard = context({ ...FACTS, roles: { ...FACTS.roles, biceps: 'standard' } });
    expect(servedSetsCap(todayRow('re-curl', CURL), standard)).toBe(SETS_PER_EXERCISE.capIsolation);
  });

  test('the thin-equipment bonus is the planned exercise\'s own', () => {
    const ctx = context();
    expect(servedSetsCap(todayRow('re-press', LEG_PRESS), ctx))
      .toBe(SETS_PER_EXERCISE.capCompound + SETS_PER_EXERCISE.thinEquipmentBonus);
  });
});

describe('any other exercise in the slot is held to its own cap', () => {
  test('an isolation exercise in a compound\'s slot is 3', () => {
    expect(servedSetsCap(todayRow('re-lat', ROW_ISO), context())).toBe(SETS_PER_EXERCISE.capIsolation);
  });

  test('a compound in a compound\'s slot keeps 4, and does not inherit a thin slot\'s bonus', () => {
    const ctx = context();
    expect(servedSetsCap(todayRow('re-lat', exercise('lat-close', 'back', 'cable', 'compound')), ctx)).toBe(SETS_PER_EXERCISE.capCompound);
    expect(servedSetsCap(todayRow('re-press', HACK), ctx)).toBe(SETS_PER_EXERCISE.capCompound);
  });

  test('a focus muscle\'s isolation exercise is 4, by the plan\'s own fact for the exercise or else its primary muscle', () => {
    const ctx = context();
    expect(servedSetsCap(todayRow('re-curl', HAMMER), ctx)).toBe(SETS_PER_EXERCISE.capCompound);
    // A swap into the focus muscle from another slot: the exercise's own muscle decides, not the slot's.
    expect(servedSetsCap(todayRow('re-lat', ABDUCT), ctx)).toBe(SETS_PER_EXERCISE.capCompound);
    const withFact = context({ ...FACTS, roles: { ...FACTS.roles, glutes: 'standard', quads: 'focus' }, slots: { ...FACTS.slots, 'r-upper': { ...FACTS.slots['r-upper'], abduct: { muscle: 'quads', kind: 'isolation', credits: {} } } } });
    expect(servedSetsCap(todayRow('re-lat', ABDUCT), withFact)).toBe(SETS_PER_EXERCISE.capCompound);
    const notFocus = context({ ...FACTS, roles: { ...FACTS.roles, glutes: 'standard' } });
    expect(servedSetsCap(todayRow('re-lat', ABDUCT), notFocus)).toBe(SETS_PER_EXERCISE.capIsolation);
  });

  test('a context with no planned-exercise map is held to the stricter reading: its own kind, no bonus', () => {
    const ctx = { ...context(), planned: undefined };
    expect(servedSetsCap(todayRow('re-press', LEG_PRESS), ctx)).toBe(SETS_PER_EXERCISE.capCompound);
  });
});

describe('no cap where none belongs', () => {
  test('a slot the person typed a count for, a row with no slot, and a plan that is not the new planner\'s', () => {
    const typed = context({ ...FACTS, typed: { 're-lat': 5 } });
    expect(servedSetsCap(todayRow('re-lat', ROW_ISO), typed)).toBeUndefined();
    expect(servedSetsCap({ exercise: ROW_ISO, routineExercise: { id: 'no-such-slot' } }, context())).toBeUndefined();
    expect(servedSetsCap({ exercise: ROW_ISO, routineExercise: null }, context())).toBeUndefined();
    expect(servedSetsCap({ exercise: null, routineExercise: { id: 're-lat' } }, context())).toBeUndefined();
    expect(servedSetsCap(todayRow('re-lat', ROW_ISO), null)).toBeUndefined();
    expect(servedSetsCap(todayRow('re-lat', ROW_ISO), { facts: { version: 1 }, sessions: [] })).toBeUndefined();
  });
});

describe('the allocator serves min(the slot\'s sets, the exercise\'s cap)', () => {
  // A back target high enough that the one back slot is served a compound's 4.
  const week = { back: 12, biceps: 4, quads: 4 };
  const todays = (cap) => [{ exerciseId: 'straight-arm', primaryMuscle: 'back', recommendedSets: 2, slotId: 're-lat', ...(cap === undefined ? {} : { cap }) }];

  test('the premise: the slot serves its planned compound 4', () => {
    expect(computeWeeklySessionAllocation([{ exerciseId: 'lat-wide', primaryMuscle: 'back', recommendedSets: 2, slotId: 're-lat' }], week, week, context()))
      .toEqual({ 'lat-wide': 4 });
  });

  test('a cap of 3 serves 3; no cap, and a cap above the slot\'s sets, serve the slot\'s 4', () => {
    const ctx = context();
    expect(computeWeeklySessionAllocation(todays(3), week, week, ctx)).toEqual({ 'straight-arm': 3 });
    expect(computeWeeklySessionAllocation(todays(undefined), week, week, ctx)).toEqual({ 'straight-arm': 4 });
    expect(computeWeeklySessionAllocation(todays(6), week, week, ctx)).toEqual({ 'straight-arm': 4 });
    expect(computeWeeklySessionAllocation(todays(0), week, week, ctx)).toEqual({ 'straight-arm': 4 });
    expect(computeWeeklySessionAllocation(todays(NaN), week, week, ctx)).toEqual({ 'straight-arm': 4 });
  });

  test('a plan that is not the new planner\'s ignores a cap: the multiplier runs as it always has', () => {
    const legacy = computeWeeklySessionAllocation(
      [{ exerciseId: 'a', primaryMuscle: 'back', recommendedSets: 4, cap: 1 }], { back: 8 }, { back: 4 }, null,
    );
    expect(legacy).toEqual({ a: 8 });
  });
});

describe('the serve context names each slot\'s planned exercise', () => {
  test('getPlanServeContextForRoutine carries { routine exercise id: exercise id }, and the sessions are unchanged', async () => {
    database.getRoutineById.mockResolvedValue({ id: 'r-upper', programmeId: 'prog-1' });
    database.getProgrammePlanFacts.mockResolvedValue(FACTS);
    database.getProgrammeById.mockResolvedValue({ id: 'prog-1', isActive: 1 });
    database.getRoutinesForPlan.mockResolvedValue(ROUTINES.map((r) => r.routine));
    database.getRoutineExercisesWithDetails.mockImplementation(async (id) => ROUTINES.find((r) => r.routine.id === id).rows);
    const ctx = await getPlanServeContextForRoutine('r-upper');
    expect(ctx.planned).toEqual({ 're-lat': 'lat-wide', 're-curl': 'curl', 're-press': 'leg-press' });
    expect(ctx.sessions).toEqual(buildPlanSessions(ROUTINES, FACTS));
  });
});
