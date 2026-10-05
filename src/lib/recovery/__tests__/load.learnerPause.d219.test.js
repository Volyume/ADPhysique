/**
 * load.learnerPause.d219.test.js -- register D219, learner design
 * docs/audit/plan-builder-science-2026-10-04/06-LEARNER-SIGNAL-DESIGN.md
 * section 2.5, founder answer 2026-10-05: "Pause it then (Recommended)". While
 * calm mode is on or an ED flag is open, the learner does not move (fail closed).
 * Recon 05-LEARNER-RECON.md F8: the learner and its card read neither before this.
 *
 * What "does not move" is, stated for what each reader can see (load.js, THE PAUSE):
 *  - nothing is learned: the learner is not run, and the reading it gave before is
 *    not replaced, whatever the history now says;
 *  - the screens keep the reading this process holds for the person (or, on a cold
 *    start under a pause, read on the recovery answer alone, the safe direction);
 *  - the planner keeps the factor its current plan was built on (the plan's own
 *    stored `builtFactor`), so a block boundary under a pause neither learns a factor
 *    nor loses one;
 *  - a read that fails counts as a pause (fail closed), the same two reads and the same
 *    rule as blockLedgerRunner.readSuppression;
 *  - the read is in load.js, where the learner is run: the learner (personalRecovery.js)
 *    stays pure and no ED module imports this domain (edIsolation.guard.test.js).
 *
 * Every case below fails on the code before this lane, which reads neither.
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
  getOpenEdPatternFlag: jest.fn(async () => null),
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

const fs = require('fs');
const path = require('path');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { WELLBEING_KEY } = require('../../wellbeing');
const {
  loadMuscleRecovery, loadPlanPersonalisation, readLearnerPause, __resetPersonalMemoForTests,
} = require('../load');
const personalRecovery = require('../personalRecovery');
const { logError } = require('../../errorLog');

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date(2026, 9, 5, 12, 0, 0).getTime();
const QUADS = [{ id: 'ex1', primaryMuscle: 'quads', secondaryMuscles: [] }];
const ADJUSTED = {
  factor: 1.4, prior: 1, pairs: 30, reason: 'adjusted', pairsByMuscle: { chest: 10, back: 10, quads: 10 },
};
const LATER = { ...ADJUSTED, factor: 0.8 };

const workout = (id, daysAgo) => {
  const startedAt = NOW - daysAgo * DAY_MS;
  return {
    id, userId: 'u1', isCompleted: 1, deletedAt: null, startedAt, endedAt: startedAt + HOUR_MS, mesocycleId: null, mesocycleWeekId: null,
  };
};
const seed = (workouts) => {
  mockDb.getCompletedWorkoutsBetween.mockResolvedValue(workouts);
  mockDb.getAllExercisesIncludingDeleted.mockResolvedValue(QUADS);
  mockDb.getWorkoutSetsForWorkoutIds.mockResolvedValue(workouts.flatMap((w) => [1, 2].map((n) => ({
    id: `${w.id}-s${n}`, workoutId: w.id, exerciseId: 'ex1', setType: 'straight', actualReps: 8, weight: 100, setNumber: n,
  }))));
};
const setWellbeing = (mode) => AsyncStorage.setItem(WELLBEING_KEY, mode);

beforeEach(async () => {
  jest.clearAllMocks();
  __resetPersonalMemoForTests();
  await AsyncStorage.clear();
  mockDb.getOpenEdPatternFlag.mockReset();
  mockDb.getOpenEdPatternFlag.mockResolvedValue(null);
  personalRecovery.learnPersonalRecovery.mockReset();
  personalRecovery.learnPersonalRecovery.mockReturnValue(ADJUSTED);
  seed([workout('w1', 1)]);
  mockDb.getCompletedWorkoutStartTimestamps.mockResolvedValue([NOW - 100 * DAY_MS, NOW - DAY_MS]);
});

describe('readLearnerPause: calm mode or an open ED flag, and a read that fails counts as on', () => {
  test('not calm (normal, unspecified or never set) and no open flag: not paused', async () => {
    expect(await readLearnerPause('u1')).toBe(false);
    await setWellbeing('normal');
    expect(await readLearnerPause('u1')).toBe(false);
    await setWellbeing('unspecified');
    expect(await readLearnerPause('u1')).toBe(false);
  });

  test('calm mode: paused', async () => {
    await setWellbeing('calm');
    expect(await readLearnerPause('u1')).toBe(true);
  });

  test('an open ED-pattern flag: paused, whatever the wellbeing setting', async () => {
    mockDb.getOpenEdPatternFlag.mockResolvedValue({ id: 'f1', flag_state: 'raised' });
    expect(await readLearnerPause('u1')).toBe(true);
    await setWellbeing('normal');
    expect(await readLearnerPause('u1')).toBe(true);
    expect(mockDb.getOpenEdPatternFlag).toHaveBeenCalledWith('u1');
  });

  test('a flag read that rejects, a wellbeing read that rejects, and a read that throws before it can reject: all paused (fail closed)', async () => {
    mockDb.getOpenEdPatternFlag.mockRejectedValueOnce(new Error('db down'));
    expect(await readLearnerPause('u1')).toBe(true);

    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage down'));
    expect(await readLearnerPause('u1')).toBe(true);

    mockDb.getOpenEdPatternFlag.mockImplementationOnce(() => { throw new Error('no such function'); });
    expect(await readLearnerPause('u1')).toBe(true);
    expect(logError).toHaveBeenCalled();
  });
});

describe('the screens: under a pause the learner is not run and its reading does not move', () => {
  test('calm mode on a cold start: the learner is not run, and the map reads on the recovery answer alone', async () => {
    await setWellbeing('calm');
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.learnerPaused).toBe(true);
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
    expect(result.personal).toBeNull();

    // The same history with the pause off: the learner runs and, adjusted, moves the map.
    await AsyncStorage.clear();
    const running = await loadMuscleRecovery('u1', NOW);
    expect(running.learnerPaused).toBe(false);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(1);
    expect(running.map.quads.recoveredPercent).toBeLessThan(result.map.quads.recoveredPercent);
  });

  test('an open ED flag: the same', async () => {
    mockDb.getOpenEdPatternFlag.mockResolvedValue({ id: 'f1', flag_state: 'raised' });
    const result = await loadMuscleRecovery('u1', NOW);
    expect(result.learnerPaused).toBe(true);
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
    expect(result.personal).toBeNull();
  });

  test('a failed read of the flag or of the wellbeing setting is a pause: the learner is not run', async () => {
    mockDb.getOpenEdPatternFlag.mockRejectedValueOnce(new Error('db down'));
    expect((await loadMuscleRecovery('u1', NOW)).learnerPaused).toBe(true);
    __resetPersonalMemoForTests();
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('storage down'));
    expect((await loadMuscleRecovery('u1', NOW)).learnerPaused).toBe(true);
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
  });

  test('a reading learned before the pause stays as it was: not replaced by one learned during it, whatever the history says', async () => {
    const before = await loadMuscleRecovery('u1', NOW);
    expect(before.personal).toEqual(ADJUSTED);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(1);

    // Calm mode is switched on; the history changes (a new session) and so does the day; the
    // learner would now say something else.
    await setWellbeing('calm');
    personalRecovery.learnPersonalRecovery.mockReturnValue(LATER);
    seed([workout('w1', 3), workout('w2', 1)]);
    const during = await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(during.learnerPaused).toBe(true);
    expect(during.personal).toEqual(ADJUSTED);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(1);
    // The held factor is still the one the map reads: slower than the same history read on the answer alone.
    __resetPersonalMemoForTests();
    const coldStart = await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(coldStart.personal).toBeNull();
    expect(during.map.quads.recoveredPercent).toBeLessThan(coldStart.map.quads.recoveredPercent);
    // Calm mode off again (the memo was cleared for the cold start above): the learner now says LATER.
    await AsyncStorage.clear();
    personalRecovery.learnPersonalRecovery.mockReturnValue(LATER);

    // Calm mode is off: the learner runs again, on the history as it now is.
    const after = await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(after.learnerPaused).toBe(false);
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(2);
    expect(after.personal).toEqual(LATER);
  });

  test('a reading is held for the person it was learned for, and for no one else', async () => {
    await loadMuscleRecovery('u1', NOW);
    await setWellbeing('calm');
    const other = await loadMuscleRecovery('u2', NOW);
    expect(other.learnerPaused).toBe(true);
    expect(other.personal).toBeNull();
  });

  test('a person with no user id is never paused and never has a reading', async () => {
    await setWellbeing('calm');
    const result = await loadMuscleRecovery(null, NOW);
    expect(result.learnerPaused).toBe(false);
    expect(result.personal).toBeNull();
    expect(mockDb.getOpenEdPatternFlag).not.toHaveBeenCalled();
  });
});

describe('the planner: under a pause the plan keeps the factor it was built on', () => {
  const ask = (builtOnFactor, over = {}) => loadPlanPersonalisation('u1', {
    sessionsPerWeek: 4, routineIdsInOrder: [], builtOnFactor, nowMs: NOW, ...over,
  });

  test('not paused: the learner\'s factor is the planner\'s input, as it was', async () => {
    expect((await ask(null)).learnedFactor).toBe(1.4);
  });

  test('calm mode: the factor the plan was built on, never the learner\'s, and the learner is not run', async () => {
    await setWellbeing('calm');
    expect((await ask(0.85)).learnedFactor).toBe(0.85);
    expect((await ask(null)).learnedFactor).toBeNull();
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
  });

  test('an open ED flag: the same', async () => {
    mockDb.getOpenEdPatternFlag.mockResolvedValue({ id: 'f1', flag_state: 'raised' });
    expect((await ask(1.2)).learnedFactor).toBe(1.2);
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
  });

  test('a failed read of either counts as a pause: the plan keeps what it had', async () => {
    mockDb.getOpenEdPatternFlag.mockRejectedValueOnce(new Error('db down'));
    expect((await ask(0.9)).learnedFactor).toBe(0.9);
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
  });

  test('a pause with a failed core read keeps the plan\'s factor too (nothing is lost because a read failed)', async () => {
    await setWellbeing('calm');
    mockDb.getCompletedWorkoutsBetween.mockRejectedValue(new Error('db down'));
    expect((await ask(0.85)).learnedFactor).toBe(0.85);
  });

  test('a factor that is not a number is no factor: the planner is handed a number or null', async () => {
    await setWellbeing('calm');
    for (const bad of [undefined, NaN, 'x', {}]) expect((await ask(bad)).learnedFactor).toBeNull();
  });
});

describe('where the read lives', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  test('the learner stays pure: it reads neither calm mode, nor an ED flag, nor storage', () => {
    const src = code(read('personalRecovery.js'));
    for (const needle of ['wellbeing', 'getOpenEdPatternFlag', 'async-storage', 'AsyncStorage', 'edPatternDetector']) {
      expect(src).not.toContain(needle);
    }
  });

  test('load.js, where the learner is run, reads both the way blockLedgerRunner.readSuppression does', () => {
    const src = code(read('load.js'));
    expect(src).toMatch(/getOpenEdPatternFlag\(userId\)/);
    expect(src).toMatch(/AsyncStorage\.getItem\(WELLBEING_KEY\)/);
    expect(src).toMatch(/isCalm\(wellbeing\)/);
    expect(src).toMatch(/'read_failed'/);
    // And the learner is run only past the pause.
    expect(src).toMatch(/if \(learnerPaused\) personal = heldReading\(userId\);\s*\n\s*else if \(!degraded\)/);
  });

  test('the five ED-safety modules do not import this domain (the isolation guard stands)', () => {
    for (const file of ['edPatternDetector.js', 'wellbeing.js', 'nutritionEngine.js', 'weeklyCoach.js', 'coachApply.js']) {
      expect(fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8')).not.toMatch(/\b(?:from|require)\b\s*\(?\s*['"][^'"]*\brecovery\/[^'"]*['"]/);
    }
  });
});
