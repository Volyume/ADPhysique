/**
 * D219 lane R3 (design 4.13 and 4.6, S F14, the lane brief item 3): the one I/O
 * seam that tells the planner about this person. loadPlanPersonalisation reads
 * the personal learner's answer and the person's own training rhythm and hands
 * the planner two plain inputs, `learnedFactor` and `ownGaps`, through the pure
 * safeguards in planPersonalisation.js.
 *
 * Pins (each fails on the code before this lane, which has no such loader):
 *  - the learner's factor reaches the planner when its gate has passed and the
 *    person has 12 weeks of history and 3 muscles; the history is read from the
 *    person's FIRST completed workout, not from the learner's 84-day window;
 *  - the factor the current plan was built on is the hysteresis reference;
 *  - a degraded read (a core read failed) or a failed learner never gives a
 *    factor, and nothing here throws: a failed read leaves the planner on the
 *    start, which is where it stood before;
 *  - the person's own gaps are read per slot from the workouts' routines in the
 *    old rotation's order, and only when that rotation has as many sessions as
 *    the new plan; otherwise the overall median stands for every slot;
 *  - every pure input is a number or null: the planner is never handed a
 *    function, a promise or a store.
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
};
jest.mock('../../database', () => mockDb);
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../personalRecovery', () => {
  const actual = jest.requireActual('../personalRecovery');
  return { ...actual, learnPersonalRecovery: jest.fn() };
});
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ userProfile: { recoveryRating: 'average' } }) },
}));

const { loadPlanPersonalisation, __resetPersonalMemoForTests } = require('../load');
const personalRecovery = require('../personalRecovery');

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 5, 12);

const ADJUSTED = {
  factor: 0.8, prior: 1.0, pairs: 24, reason: 'adjusted', pairsByMuscle: { chest: 8, back: 8, quads: 8 },
};
const ROUTINES = ['r-a', 'r-b', 'r-c', 'r-d'];

/** `weeks` weeks of a 4-session rotation: gaps of 24, 48, 24 and 72 hours after slots 0 to 3. */
function workouts(weeks) {
  const out = [];
  let i = 0;
  for (let w = weeks; w >= 1; w -= 1) {
    for (const [back, routineId] of [[0, 'r-a'], [1, 'r-b'], [3, 'r-c'], [4, 'r-d']]) {
      const startedAt = NOW - (w * 7 - back) * DAY_MS + 6 * HOUR_MS;
      out.push({ id: `w${i}`, startedAt, endedAt: startedAt + HOUR_MS, isCompleted: 1, deletedAt: null, routineId, mesocycleWeekId: null });
      i += 1;
    }
  }
  return out;
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetPersonalMemoForTests();
  personalRecovery.learnPersonalRecovery.mockReturnValue(ADJUSTED);
  mockDb.getCompletedWorkoutsBetween.mockImplementation(async () => workouts(6));
  mockDb.getCompletedWorkoutStartTimestamps.mockImplementation(async () => [NOW - 100 * DAY_MS, ...workouts(6).map((w) => w.startedAt)]);
});

const ask = (over = {}) => loadPlanPersonalisation('u1', {
  sessionsPerWeek: 4, routineIdsInOrder: ROUTINES, builtOnFactor: null, nowMs: NOW, ...over,
});

describe('the learned factor', () => {
  test('a gate that has passed, 100 days of history and 3 muscles: the learner\'s factor is the planner\'s input', async () => {
    expect((await ask()).learnedFactor).toBe(0.8);
  });

  test('history is read from the first completed workout, so 70 days is too few and 84 is enough', async () => {
    mockDb.getCompletedWorkoutStartTimestamps.mockImplementation(async () => [NOW - 70 * DAY_MS, NOW - DAY_MS]);
    expect((await ask()).learnedFactor).toBeNull();
    mockDb.getCompletedWorkoutStartTimestamps.mockImplementation(async () => [NOW - 84 * DAY_MS, NOW - DAY_MS]);
    expect((await ask()).learnedFactor).toBe(0.8);
  });

  test('the factor the current plan was built on is the reference: a move of under 0.10 keeps it', async () => {
    personalRecovery.learnPersonalRecovery.mockReturnValue({ ...ADJUSTED, factor: 0.9 });
    expect((await ask({ builtOnFactor: 0.85 })).learnedFactor).toBe(0.85);
  });

  test('a learner that has not passed its gate gives the start (null), so a plan built on a learned factor reverts', async () => {
    personalRecovery.learnPersonalRecovery.mockReturnValue({ ...ADJUSTED, reason: 'not_clear', factor: 1.0 });
    expect((await ask({ builtOnFactor: 0.8 })).learnedFactor).toBeNull();
  });

  test('a degraded read (a core read failed) never gives a factor, and nothing throws', async () => {
    mockDb.getCompletedWorkoutsBetween.mockRejectedValue(new Error('db down'));
    const out = await ask();
    expect(out.learnedFactor).toBeNull();
    expect(out.ownGaps).toBeNull();
  });

  test('a learner that throws gives no factor, and the person\'s own gaps are still read', async () => {
    personalRecovery.learnPersonalRecovery.mockImplementation(() => { throw new Error('learner broke'); });
    const out = await ask();
    expect(out.learnedFactor).toBeNull();
    expect(out.ownGaps).toEqual([24, 48, 24, 72]);
  });

  test('no user: nothing to tell the planner', async () => {
    expect(await loadPlanPersonalisation(null, { sessionsPerWeek: 4 })).toEqual({ learnedFactor: null, ownGaps: null });
  });
});

describe('the person\'s own gaps', () => {
  test('read per slot from the routines of the old rotation, in its order', async () => {
    expect((await ask()).ownGaps).toEqual([24, 48, 24, 72]);
  });

  test('the old rotation has a different number of sessions from the new plan: the overall median stands for every slot', async () => {
    const out = (await ask({ sessionsPerWeek: 3 })).ownGaps;
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(1);
  });

  test('no old plan (no routines): the overall median for every slot, once the person has 8 sessions in 8 weeks', async () => {
    const out = (await ask({ routineIdsInOrder: [] })).ownGaps;
    expect(out).toHaveLength(4);
    expect(new Set(out).size).toBe(1);
  });

  test('fewer than 8 sessions in the last 8 weeks: not known', async () => {
    mockDb.getCompletedWorkoutsBetween.mockImplementation(async () => workouts(1));
    expect((await ask()).ownGaps).toBeNull();
  });

  test('a deleted or incomplete workout is not read', async () => {
    mockDb.getCompletedWorkoutsBetween.mockImplementation(async () => workouts(1).map((w) => ({ ...w, deletedAt: 1 })));
    expect((await ask()).ownGaps).toBeNull();
    mockDb.getCompletedWorkoutsBetween.mockImplementation(async () => workouts(6).map((w) => ({ ...w, isCompleted: 0 })));
    expect((await ask()).ownGaps).toBeNull();
  });

  test('the planner is handed numbers or null, nothing else', async () => {
    const out = await ask();
    expect(Object.keys(out).sort()).toEqual(['learnedFactor', 'ownGaps']);
    for (const h of out.ownGaps) expect(typeof h).toBe('number');
    expect(typeof out.learnedFactor).toBe('number');
  });
});
