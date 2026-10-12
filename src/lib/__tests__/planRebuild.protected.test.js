/**
 * planRebuild.protected.test.js -- D222 phase 6 (R67, founder standing order):
 * the founder's own plan, programme 31a3b33c-5548-4c54-9b9a-dd3a927b2c49, is
 * never rebuilt by the next-session rebuild, whatever its facts say.
 *
 * What this suite pins and why: run() answers `skipped` with the reason
 * `protected` for a protected active programme before it reads the plan's
 * facts, routines or rows, so no rebuild, no state record and no write can
 * follow (it fails on a planRebuild without the guard, which reads the facts
 * and goes on to rebuild a hand-built plan as MANUAL). Any other programme is
 * read as before. The guard is not behind the structure engine's switch: the
 * founder's order holds whichever planner is live.
 */
// Tests the older planner path, kept for style-pool plans and the switch-off state; the engine path is covered by the structure suites.
jest.mock('../structure/release', () => ({ ...jest.requireActual('../structure/release'), STRUCTURE_ENGINE: false }));
jest.mock('../database', () => ({
  getActivePlan: jest.fn(),
  getProgrammeById: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
  getAllExercises: jest.fn(),
  getActiveBlock: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getRecentlyUsedExerciseIds: jest.fn(),
  rebuildPlanKeepingBlockV2: jest.fn(),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
      setItem: jest.fn(async (k, v) => { store.set(k, String(v)); }),
      removeItem: jest.fn(async (k) => { store.delete(k); }),
    },
  };
});

const database = require('../database');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { ensureActivePlanRebuilt, __resetPlanRebuildForTests } = require('../planRebuild');
const { PROTECTED_PROGRAMME_IDS, STRUCTURE_ENGINE, isProtectedProgramme } = require('../structure/release');

const FOUNDER_PLAN = '31a3b33c-5548-4c54-9b9a-dd3a927b2c49';

beforeEach(() => {
  jest.clearAllMocks();
  __resetPlanRebuildForTests();
});

test('the founder\'s programme is the protected one, and the switch ships off', () => {
  expect(PROTECTED_PROGRAMME_IDS).toEqual([FOUNDER_PLAN]);
  expect(isProtectedProgramme(FOUNDER_PLAN)).toBe(true);
  expect(isProtectedProgramme('another')).toBe(false);
  expect(isProtectedProgramme(null)).toBe(false);
  expect(STRUCTURE_ENGINE).toBe(false);
});

test('a protected active programme is skipped before anything is read or written', async () => {
  database.getActivePlan.mockResolvedValue({ id: FOUNDER_PLAN, name: 'Mine' });
  const out = await ensureActivePlanRebuilt('user-1', { profile: { trainingGoal: 'general' } });
  expect(out).toEqual({ status: 'skipped', reason: 'protected', programmeId: FOUNDER_PLAN });
  expect(database.getProgrammePlanFacts).not.toHaveBeenCalled();
  expect(database.getRoutinesForPlan).not.toHaveBeenCalled();
  expect(database.rebuildPlanKeepingBlockV2).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('any other programme is read as before', async () => {
  database.getActivePlan.mockResolvedValue({ id: 'programme-other', name: 'Other' });
  database.getProgrammePlanFacts.mockResolvedValue({ version: 2 });
  const out = await ensureActivePlanRebuilt('user-1', { profile: { trainingGoal: 'general' } });
  expect(out).toEqual({ status: 'current', programmeId: 'programme-other' });
  expect(database.getProgrammePlanFacts).toHaveBeenCalledWith('programme-other');
});
