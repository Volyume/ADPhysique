/**
 * D219 lane R3 (design 4.14 and the lane brief, item 4): the forecast reads the
 * sets a plan with facts SERVES this week, not the week-1 sets stored on the
 * routine's rows.
 *
 * The recovery projections (Home's line under the next session, the Recovery
 * screen's "Next in your plan", the sequencer's readiness) turn each session's
 * planned sets into a forecast of how recovered its muscles will be. The only
 * recovery-side reader of a session's sets was load.primarySetsFromRoutineRows,
 * which read `recommended_sets`, the week-1 count (RECOMMENDED_SETS keeps that
 * meaning for the 16 files that read it). For a plan the new planner built,
 * week 5 serves up to twice that, so the forecast under-counted the very
 * sessions it was asked about.
 *
 * Pins (each fails on the code before this lane, which has no second argument):
 *  - primarySetsFromRoutineRows(rows, served) counts the served sets for every
 *    row the served map names and the stored sets for any other, and with no
 *    served map reads exactly as before (legacy plans unchanged);
 *  - loadPlannedSetsByRoutine(ids, resolver) hands each routine's rows to the
 *    caller's resolver and uses its numbers; a resolver that answers null,
 *    throws or is absent leaves the stored sets, one routine's failure never
 *    touching another's;
 *  - the numbers come from the caller: load.js imports neither sessionAdjustments
 *    nor coachApply (the recovery domain stays free of the ED-safety module and
 *    of a second database path), and Home and the Recovery cards pass
 *    servedSetsResolver into it;
 *  - servedSetsResolver returns the served sets for a plan with facts (the same
 *    numbers getCurrentWeekPlanSets gives the plan screens) and null for any
 *    other plan, so a legacy plan's forecast does not change.
 */
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
}));

const mockDb = {
  getCompletedWorkoutsBetween: jest.fn(async () => []),
  getWorkoutSetsForWorkoutIds: jest.fn(async () => []),
  getAllExercisesIncludingDeleted: jest.fn(async () => []),
  getMesocycleWeeks: jest.fn(async () => []),
  getRoutineExercisesWithDetails: jest.fn(async () => []),
  getCompletedWorkoutStartTimestamps: jest.fn(async () => []),
  getCapabilityConstraints: jest.fn(async () => []),
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
  getProgrammeById: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
};
jest.mock('../../database', () => mockDb);
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ userProfile: { recoveryRating: 'average' } }) },
}));

const fs = require('fs');
const path = require('path');
const { loadPlannedSetsByRoutine, primarySetsFromRoutineRows } = require('../load');
const { servedSetsResolver } = require('../../sessionAdjustments');
const { logError } = require('../../errorLog');

const SRC = path.join(__dirname, '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const exercise = (id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles = []) => (
  { id, name: id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles }
);
const bench = exercise('bench', 'chest', 'barbell', 'compound', ['triceps']);
const incline = exercise('incdb', 'chest', 'dumbbell', 'compound', ['triceps']);
const rows = () => [
  { routineExercise: { id: 're-bench', exerciseId: 'bench', recommendedSets: 3, groupKind: null }, exercise: bench },
  { routineExercise: { id: 're-incdb', exerciseId: 'incdb', recommendedSets: 3, groupKind: null }, exercise: incline },
];

describe('primarySetsFromRoutineRows reads the served sets where it is given them', () => {
  test('a served count replaces the stored week-1 count for the row it names, and any other row keeps its stored count', () => {
    expect(primarySetsFromRoutineRows(rows(), { 're-bench': 4, 're-incdb': 4 })).toEqual({ chest: 8 });
    expect(primarySetsFromRoutineRows(rows(), { 're-bench': 4 })).toEqual({ chest: 7 });
  });

  test('without a served map it reads exactly as before (legacy plans unchanged)', () => {
    expect(primarySetsFromRoutineRows(rows())).toEqual({ chest: 6 });
    expect(primarySetsFromRoutineRows(rows(), null)).toEqual({ chest: 6 });
    expect(primarySetsFromRoutineRows(rows(), {})).toEqual({ chest: 6 });
  });

  test('a served count that is not a number, or is below one, is not used', () => {
    expect(primarySetsFromRoutineRows(rows(), { 're-bench': NaN, 're-incdb': 'x' })).toEqual({ chest: 6 });
    expect(primarySetsFromRoutineRows(rows(), { 're-bench': 0, 're-incdb': 0 })).toEqual({ chest: 6 });
  });

  test('an unresolved exercise still makes the routine unknown (null), served counts or not', () => {
    const withGone = [...rows(), { routineExercise: { id: 're-x', recommendedSets: 3 }, exercise: { id: 'gone', primaryMuscle: null } }];
    expect(primarySetsFromRoutineRows(withGone, { 're-bench': 4 })).toBeNull();
  });
});

describe('loadPlannedSetsByRoutine hands each routine to the caller\'s resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getRoutineExercisesWithDetails.mockImplementation(async () => rows());
  });

  test('the resolver receives the routine id and its rows, and its numbers are the forecast', async () => {
    const resolver = jest.fn(async () => ({ 're-bench': 4, 're-incdb': 4 }));
    const result = await loadPlannedSetsByRoutine(['r-ua'], resolver);
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver.mock.calls[0][0]).toBe('r-ua');
    expect(resolver.mock.calls[0][1]).toHaveLength(2);
    expect(result['r-ua']).toEqual({ chest: 8 });
  });

  test('a resolver that answers null, or none at all, leaves the stored sets', async () => {
    expect((await loadPlannedSetsByRoutine(['r-ua'], async () => null))['r-ua']).toEqual({ chest: 6 });
    expect((await loadPlannedSetsByRoutine(['r-ua']))['r-ua']).toEqual({ chest: 6 });
  });

  test('a resolver that throws leaves the stored sets for that routine and is logged; another routine is untouched', async () => {
    const resolver = async (routineId) => {
      if (routineId === 'r-bad') throw new Error('resolver down');
      return { 're-bench': 4, 're-incdb': 4 };
    };
    const result = await loadPlannedSetsByRoutine(['r-bad', 'r-ok'], resolver);
    expect(result['r-bad']).toEqual({ chest: 6 });
    expect(result['r-ok']).toEqual({ chest: 8 });
    expect(logError).toHaveBeenCalledWith('recovery.load.servedSets', expect.any(Error), expect.objectContaining({ routineId: 'r-bad' }));
  });
});

describe('the numbers come from the caller', () => {
  test('load.js imports neither sessionAdjustments nor coachApply', () => {
    const src = read('lib/recovery/load.js');
    expect(src).not.toMatch(/(?:from|require\()\s*\(?\s*['"][^'"]*sessionAdjustments['"]/);
    expect(src).not.toMatch(/(?:from|require\()\s*\(?\s*['"][^'"]*coachApply['"]/);
  });

  test('Home and the Recovery cards pass the served-sets resolver into the loader', () => {
    expect(read('screens/HomeScreen.js')).toMatch(/loadPlannedSetsByRoutine\(outstandingIds, servedSetsResolver\(user\.id\)\)/);
    expect(read('components/ReadinessCards.js')).toMatch(/loadPlannedSetsByRoutine\(ids, servedSetsResolver\(userId\)\)/);
  });
});

// ── servedSetsResolver on a plan with facts ──────────────────────────────────

const ROUTINES = [{ id: 'r-ua', name: 'Upper A', programmeId: 'prog-1' }];
const CHEST_BY_WEEK = [4, 5, 6, 7, 8];
function wirePlan({ facts }) {
  mockDb.getCurrentMesocycleWeek.mockResolvedValue({ id: 'wk-5', mesocycleId: 'meso-1', weekIndex: 5 });
  mockDb.getMesocycleWeekById.mockImplementation(async (id) => {
    const m = /^wk-(\d)$/.exec(id);
    return m ? { id, mesocycle_id: 'meso-1', week_index: Number(m[1]) } : null;
  });
  mockDb.getPlannedMuscleVolumeForBlock.mockResolvedValue(CHEST_BY_WEEK.map((planned_sets, i) => (
    { mesocycle_week_id: `wk-${i + 1}`, week_index: i + 1, muscle: 'chest', planned_sets, source: 'template' }
  )));
  mockDb.getRoutineById.mockImplementation(async (id) => ROUTINES.find((r) => r.id === id) ?? null);
  mockDb.getProgrammePlanFacts.mockResolvedValue(facts);
  mockDb.getProgrammeById.mockResolvedValue({ id: 'prog-1', isActive: 1 });
  mockDb.getRoutinesForPlan.mockResolvedValue(ROUTINES);
  mockDb.getRoutineExercisesWithDetails.mockImplementation(async () => rows());
}

describe('servedSetsResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  test('on a plan with facts the forecast reads week 5\'s served 4 + 4 chest sets, not the stored 3 + 3', async () => {
    wirePlan({ facts: { version: 2, exposureShares: { chest: { 'r-ua': 1 } }, sessionCaps: {} } });
    const result = await loadPlannedSetsByRoutine(['r-ua'], servedSetsResolver('u1'));
    expect(result['r-ua']).toEqual({ chest: 8 });
  });

  test('on a plan without facts it answers null and the forecast is the stored sets, as before', async () => {
    wirePlan({ facts: null });
    expect(await servedSetsResolver('u1')('r-ua', rows())).toBeNull();
    const result = await loadPlannedSetsByRoutine(['r-ua'], servedSetsResolver('u1'));
    expect(result['r-ua']).toEqual({ chest: 6 });
  });

  test('it never throws: a failed read answers null', async () => {
    wirePlan({ facts: { version: 2, exposureShares: {}, sessionCaps: {} } });
    mockDb.getCurrentMesocycleWeek.mockRejectedValue(new Error('db down'));
    await expect(servedSetsResolver('u1')('r-ua', rows())).resolves.toBeNull();
  });
});
