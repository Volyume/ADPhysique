/**
 * D215 deed hooks (founder order 2026-10-02: "ensure there's no repeat
 * notifications when the requirement has already been satisfied"), fired by
 * the REAL writes in database.js and food/db.js on an in-memory SQLite, with
 * only the stand-down module and the scheduler mocked so the suite can see
 * what each write asked for.
 *
 * Pins, written to FAIL on the opposite:
 *   - logMorningWeight hands the logged instant to standDownWeighIn (the
 *     module decides whether that day is today); a rejected stand-down never
 *     reaches the caller;
 *   - completing a workout (updateWorkout with isCompleted) hands the
 *     session's own START instant to standDownTraining; an update that does
 *     not complete the session stands nothing down;
 *   - saveWeeklyCheckin stands down only for a real check-in (energy score);
 *     a workout's sleep-only row does not;
 *   - logFoodEntry stands down the slot for its day for a real row only
 *     (planned scaffolding never), and does not touch the confirm nudge;
 *   - the planned-meal confirms (per slot, whole day, per entry) stand the
 *     slot down ONCE per deed and re-check the confirm nudge once; a confirm
 *     that changes no row does neither.
 */

jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({
  scheduleSync: () => {},
  syncAll: () => Promise.resolve(),
  syncMorningWeight: () => Promise.resolve(),
}));
jest.mock('../engineTelemetry', () => ({ track: () => Promise.resolve() }));
jest.mock('../telemetry/firsts', () => ({ trackFirst: () => Promise.resolve() }));

const mockStandDown = {
  standDownWeighIn: jest.fn(() => Promise.resolve(0)),
  standDownTraining: jest.fn(() => Promise.resolve(0)),
  standDownCheckin: jest.fn(() => Promise.resolve(0)),
  standDownMeal: jest.fn(() => Promise.resolve(true)),
};
jest.mock('../notifications/standDown', () => mockStandDown);

const mockSchedulePlannedMealConfirm = jest.fn(() => Promise.resolve());
jest.mock('../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: (...a) => mockSchedulePlannedMealConfirm(...a),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const dbm = require('../database');
const food = require('../food/db');
const { localDayKey, localWeekStartMs } = require('../dayKey');

// The hooks are fire-and-forget; let their microtasks settle.
const flush = async () => {
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setImmediate(resolve));
  }
};

let userSeq = 0;
const freshUser = () => `user-d215-${++userSeq}`;
const TODAY = localDayKey(Date.now());
const ENTRY = (slot, extra = {}) => ({
  entryDate: TODAY, mealSlot: slot, foodRef: 'quick:test', quantityG: 0,
  kcal: 400, proteinG: 30, carbsG: 40, fatG: 10, ...extra,
});

beforeAll(async () => {
  await dbm.db();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStandDown.standDownWeighIn.mockImplementation(() => Promise.resolve(0));
  mockStandDown.standDownTraining.mockImplementation(() => Promise.resolve(0));
  mockStandDown.standDownCheckin.mockImplementation(() => Promise.resolve(0));
  mockStandDown.standDownMeal.mockImplementation(() => Promise.resolve(true));
});

describe('the weigh-in write', () => {
  test('logMorningWeight hands the logged instant to the weigh-in stand-down', async () => {
    const u = freshUser();
    const loggedAt = Date.now() - 60e3;
    const id = await dbm.logMorningWeight(u, { weightKg: 80.4, loggedAt });
    expect(id).toBeTruthy();
    await flush();
    expect(mockStandDown.standDownWeighIn).toHaveBeenCalledTimes(1);
    expect(mockStandDown.standDownWeighIn).toHaveBeenCalledWith(loggedAt);
  });

  test('a weigh-in entered for a past day passes that day\'s instant through (the module stands nothing down for it)', async () => {
    const u = freshUser();
    const loggedAt = Date.now() - 3 * 86400e3;
    await dbm.logMorningWeight(u, { weightKg: 79.9, loggedAt });
    await flush();
    expect(mockStandDown.standDownWeighIn).toHaveBeenCalledWith(loggedAt);
  });

  test('a rejected stand-down never reaches the caller; the weigh-in is still saved', async () => {
    const u = freshUser();
    mockStandDown.standDownWeighIn.mockImplementation(() => Promise.reject(new Error('os')));
    const id = await dbm.logMorningWeight(u, { weightKg: 81.0 });
    expect(id).toBeTruthy();
    await flush();
    const row = await dbm.getMorningWeightToday(u);
    expect(row?.weightKg).toBe(81.0);
  });
});

describe('the workout completion write', () => {
  test('updateWorkout with isCompleted hands the session\'s own start instant to the training stand-down', async () => {
    const u = freshUser();
    const w = await dbm.createWorkout(u, null);
    await dbm.updateWorkout(w.id, { isCompleted: true, endedAt: Date.now(), durationMinutes: 40 });
    await flush();
    expect(mockStandDown.standDownTraining).toHaveBeenCalledTimes(1);
    expect(mockStandDown.standDownTraining).toHaveBeenCalledWith(w.startedAt);
  });

  test('an update that does not complete the session stands nothing down', async () => {
    const u = freshUser();
    const w = await dbm.createWorkout(u, null);
    await dbm.updateWorkout(w.id, { notes: 'felt good', lastActivityAt: Date.now() });
    await dbm.updateWorkout(w.id, { isCompleted: false });
    await flush();
    expect(mockStandDown.standDownTraining).not.toHaveBeenCalled();
  });

  test('a rejected stand-down never reaches the caller; the completion is still written', async () => {
    const u = freshUser();
    mockStandDown.standDownTraining.mockImplementation(() => Promise.reject(new Error('os')));
    const w = await dbm.createWorkout(u, null);
    await expect(dbm.updateWorkout(w.id, { isCompleted: true, endedAt: Date.now() })).resolves.toBeUndefined();
    await flush();
    const row = await dbm.getWorkoutById(w.id);
    expect(row.isCompleted).toBe(1);
  });
});

describe('the weekly check-in write', () => {
  test('a workout\'s sleep-only row is not a check-in: nothing stands down', async () => {
    const u = freshUser();
    await dbm.saveWeeklyCheckin(u, { weekStart: localWeekStartMs(Date.now()), sleepQuality: 4 });
    await flush();
    expect(mockStandDown.standDownCheckin).not.toHaveBeenCalled();
  });

  test('a real check-in (energy score) stands the check-in down', async () => {
    const u = freshUser();
    await dbm.saveWeeklyCheckin(u, {
      weekStart: localWeekStartMs(Date.now()), energyScore: 3, sorenessScore: 2, stressScore: 2, sleepHours: 7,
    });
    await flush();
    expect(mockStandDown.standDownCheckin).toHaveBeenCalledTimes(1);
  });
});

describe('the food writes', () => {
  test('logFoodEntry: a real row stands down its slot for its day and leaves the confirm nudge alone', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, ENTRY('lunch'));
    await flush();
    expect(mockStandDown.standDownMeal).toHaveBeenCalledTimes(1);
    expect(mockStandDown.standDownMeal).toHaveBeenCalledWith('lunch', TODAY);
    expect(mockSchedulePlannedMealConfirm).not.toHaveBeenCalled();
  });

  test('planned scaffolding stands nothing down', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, ENTRY('dinner', { isPlanned: true }));
    await flush();
    expect(mockStandDown.standDownMeal).not.toHaveBeenCalled();
    expect(mockSchedulePlannedMealConfirm).not.toHaveBeenCalled();
  });

  test('confirmPlannedDay for one slot: that slot stands down once and the confirm nudge is re-checked once', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, ENTRY('dinner', { isPlanned: true }));
    await food.logFoodEntry(u, ENTRY('dinner', { isPlanned: true, foodRef: 'quick:second' }));
    jest.clearAllMocks();
    expect(await food.confirmPlannedDay(u, TODAY, 'dinner')).toBe(2);
    await flush();
    expect(mockStandDown.standDownMeal).toHaveBeenCalledTimes(1);
    expect(mockStandDown.standDownMeal).toHaveBeenCalledWith('dinner', TODAY);
    expect(mockSchedulePlannedMealConfirm).toHaveBeenCalledTimes(1);
    expect(mockSchedulePlannedMealConfirm).toHaveBeenCalledWith(u);
  });

  test('confirmPlannedDay for the whole day: one re-lay and one nudge re-check whatever the number of slots', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, ENTRY('breakfast', { isPlanned: true }));
    await food.logFoodEntry(u, ENTRY('dinner', { isPlanned: true }));
    jest.clearAllMocks();
    expect(await food.confirmPlannedDay(u, TODAY)).toBe(2);
    await flush();
    expect(mockStandDown.standDownMeal).toHaveBeenCalledTimes(1);
    expect(['breakfast', 'dinner']).toContain(mockStandDown.standDownMeal.mock.calls[0][0]);
    expect(mockStandDown.standDownMeal.mock.calls[0][1]).toBe(TODAY);
    expect(mockSchedulePlannedMealConfirm).toHaveBeenCalledTimes(1);
  });

  test('confirmPlannedEntry: the one row\'s slot and day; a second confirm of the same row does nothing', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, ENTRY('breakfast', { isPlanned: true }));
    jest.clearAllMocks();
    expect(await food.confirmPlannedEntry(u, id)).toBe(1);
    await flush();
    expect(mockStandDown.standDownMeal).toHaveBeenCalledWith('breakfast', TODAY);
    expect(mockSchedulePlannedMealConfirm).toHaveBeenCalledWith(u);
    jest.clearAllMocks();
    expect(await food.confirmPlannedEntry(u, id)).toBe(0);
    await flush();
    expect(mockStandDown.standDownMeal).not.toHaveBeenCalled();
    expect(mockSchedulePlannedMealConfirm).not.toHaveBeenCalled();
  });

  test('a confirm with nothing planned stands nothing down and re-checks nothing', async () => {
    const u = freshUser();
    expect(await food.confirmPlannedDay(u, TODAY)).toBe(0);
    await flush();
    expect(mockStandDown.standDownMeal).not.toHaveBeenCalled();
    expect(mockSchedulePlannedMealConfirm).not.toHaveBeenCalled();
  });
});
