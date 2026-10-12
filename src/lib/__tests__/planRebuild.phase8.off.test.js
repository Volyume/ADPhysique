/**
 * planRebuild.phase8.off.test.js -- D222 phase 8: with STRUCTURE_ENGINE off
 * (as shipped) nothing of phase 8 runs. Pins that the switch ships off, that
 * Today's choice card is never offered, and that an old-planner `done` record
 * still counts as current (the older suites pin the rest unchanged).
 */
jest.mock('../database', () => ({
  getActivePlan: jest.fn(), getProgrammeById: jest.fn(), getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(), getProgrammePlanFacts: jest.fn(), getAllExercises: jest.fn(),
  getActiveBlock: jest.fn(), getCurrentMesocycleWeek: jest.fn(), getPlannedMuscleVolumeForBlock: jest.fn(),
  getRecentlyUsedExerciseIds: jest.fn(), rebuildPlanKeepingBlockV2: jest.fn(),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return { __esModule: true, default: {
    getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItem: jest.fn(async (k, v) => { store.set(k, String(v)); }),
    removeItem: jest.fn(async (k) => { store.delete(k); }),
  } };
});
jest.mock('../planAutoGen', () => ({ planGeneratedRebuildV2: jest.fn(), planFixedRebuildV2: jest.fn(), plannerV2PlanFacts: jest.fn() }));

const database = require('../database');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const autogen = require('../planAutoGen');
const { ensureActivePlanRebuilt, getPlanRebuildChoice, __resetPlanRebuildForTests } = require('../planRebuild');
const { STRUCTURE_ENGINE } = require('../structure/release');

beforeEach(() => { jest.clearAllMocks(); __resetPlanRebuildForTests(); });

test('the switch ships off and the choice card is never offered', async () => {
  expect(STRUCTURE_ENGINE).toBe(false);
  AsyncStorage.setItem('@volyume_plan_rebuild_state_u', JSON.stringify({ p: { status: 'skipped', reason: 'needs_choice' } }));
  expect(await getPlanRebuildChoice('u', 'p')).toBe(false);
});

test('facts version 2 is current and an older done record counts, as before', async () => {
  database.getActivePlan.mockResolvedValue({ id: 'p1' });
  database.getProgrammePlanFacts.mockResolvedValue({ version: 2 });
  expect((await ensureActivePlanRebuilt('u', {})).status).toBe('current');
  __resetPlanRebuildForTests();
  database.getProgrammePlanFacts.mockResolvedValue(null);
  database.getRoutinesForPlan.mockResolvedValue([]);
  AsyncStorage.setItem('@volyume_plan_rebuild_state_u', JSON.stringify({ p1: { status: 'done' } }));
  expect((await ensureActivePlanRebuilt('u', {})).status).toBe('current');
  expect(autogen.planGeneratedRebuildV2).not.toHaveBeenCalled();
  expect(database.rebuildPlanKeepingBlockV2).not.toHaveBeenCalled();
});
