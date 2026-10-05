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
 *  - the screens keep the reading they were last shown for the person: this process's
 *    memo while it runs and, ACROSS A RESTART, the stored copy one run that was not
 *    paused left in AsyncStorage (lead ruling 6.1, 2026-10-05: the founder's answer is
 *    that the learner does not move while paused, so it holds across a restart too;
 *    this suite first pinned a cold start under a pause as no reading, the state
 *    before that ruling). Written only by a run that is not paused, read back only
 *    while paused, per person, validated, cleared by AsyncStorage.clear; a copy that
 *    is missing or cannot be read is no reading (the card hidden, the map on the
 *    recovery answer alone, the safe direction);
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
  loadMuscleRecovery, loadPlanPersonalisation, readLearnerPause, learnerReadingKey, __resetPersonalMemoForTests,
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
const RAISED_FLAG = { id: 'f1', flag_state: 'raised' };
// The stored copy's key, spelled out here (not read from the loader) so that a rename is a test failure.
const KEY = (userId) => `@volyume_recovery_learner_reading_v1_${userId}`;
const stored = async (userId = 'u1') => {
  const raw = await AsyncStorage.getItem(KEY(userId));
  return raw === null ? null : JSON.parse(raw);
};
const writesOf = (userId = 'u1') => AsyncStorage.setItem.mock.calls.filter(([k]) => k === KEY(userId)).length;
const realGetItem = AsyncStorage.getItem.getMockImplementation();
const realSetItem = AsyncStorage.setItem.getMockImplementation();
// A restart: the process forgets the learner's memo; AsyncStorage keeps what it holds.
const restart = () => __resetPersonalMemoForTests();

afterEach(() => {
  AsyncStorage.getItem.mockImplementation(realGetItem);
  AsyncStorage.setItem.mockImplementation(realSetItem);
});

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
  // Re-pinned for lead ruling 6.1: these two cold starts are ones where no run was ever unpaused, so no
  // stored copy exists (before the ruling every cold start under a pause read as this); the cold starts
  // that DO have a stored copy are pinned in the stored-reading block below.
  test('calm mode on a cold start with no stored reading: the learner is not run, and the map reads on the recovery answer alone', async () => {
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

  test('an open ED flag on a cold start with no stored reading: the same', async () => {
    mockDb.getOpenEdPatternFlag.mockResolvedValue(RAISED_FLAG);
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

    // The app is restarted under the same pause (lead ruling 6.1, the cold start this test used to
    // pin as no reading): the stored copy holds the same reading, and the map reads the same speed,
    // slower than the same history read on the recovery answer alone.
    restart();
    const coldStart = await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(coldStart.personal).toEqual(ADJUSTED);
    expect(coldStart.map).toEqual(during.map);
    await AsyncStorage.removeItem(KEY('u1'));
    const withoutCopy = await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(withoutCopy.personal).toBeNull();
    expect(during.map.quads.recoveredPercent).toBeLessThan(withoutCopy.map.quads.recoveredPercent);

    // Calm mode off again (set to normal, so the stored copy is not cleared with it): the learner
    // runs again, on the history as it now is, and says LATER.
    await setWellbeing('normal');
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

describe('the stored reading (lead ruling 6.1): what the screens were shown holds across a restart', () => {
  const failReadOf = (key) => AsyncStorage.getItem.mockImplementation((k) => (
    k === key ? Promise.reject(new Error('storage down')) : realGetItem(k)
  ));
  // One run that is not paused: the learner gives ADJUSTED and the screens are shown it.
  const learnUnpaused = (userId = 'u1') => loadMuscleRecovery(userId, NOW);

  test('a run that is not paused keeps the reading it gives, for that person, in AsyncStorage', async () => {
    const result = await learnUnpaused();
    expect(result.learnerPaused).toBe(false);
    expect(result.personal).toEqual(ADJUSTED);
    expect(await stored()).toEqual({ version: 1, userId: 'u1', personal: ADJUSTED });
    expect(learnerReadingKey('u1')).toBe(KEY('u1'));
  });

  test('calm mode on a cold start: the stored reading is shown unchanged, the learner is not run, and the map reads its speed', async () => {
    const learned = await learnUnpaused();
    restart();
    personalRecovery.learnPersonalRecovery.mockClear();
    await setWellbeing('calm');
    const held = await loadMuscleRecovery('u1', NOW);
    expect(held.learnerPaused).toBe(true);
    expect(held.personal).toEqual(ADJUSTED);
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
    // The map reads the held speed, exactly as the run that learned it did.
    expect(held.map).toEqual(learned.map);
    await AsyncStorage.removeItem(KEY('u1'));
    const onAnswerAlone = await loadMuscleRecovery('u1', NOW);
    expect(onAnswerAlone.personal).toBeNull();
    expect(held.map.quads.recoveredPercent).toBeLessThan(onAnswerAlone.map.quads.recoveredPercent);
  });

  test('an open ED flag on a cold start: the same', async () => {
    const learned = await learnUnpaused();
    restart();
    personalRecovery.learnPersonalRecovery.mockClear();
    mockDb.getOpenEdPatternFlag.mockResolvedValue(RAISED_FLAG);
    const held = await loadMuscleRecovery('u1', NOW);
    expect(held.learnerPaused).toBe(true);
    expect(held.personal).toEqual(ADJUSTED);
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
    expect(held.map).toEqual(learned.map);
  });

  test('a flag read that fails is a pause (fail closed), and the stored reading is what it holds', async () => {
    await learnUnpaused();
    restart();
    mockDb.getOpenEdPatternFlag.mockRejectedValue(new Error('db down'));
    const held = await loadMuscleRecovery('u1', NOW);
    expect(held.learnerPaused).toBe(true);
    expect(held.personal).toEqual(ADJUSTED);
  });

  test('a failed read of the stored reading hides the card: no reading, the map on the recovery answer alone, nothing thrown', async () => {
    await learnUnpaused();
    restart();
    await setWellbeing('calm');
    failReadOf(KEY('u1'));
    const held = await loadMuscleRecovery('u1', NOW);
    expect(held.learnerPaused).toBe(true);
    expect(held.personal).toBeNull();
    expect(logError).toHaveBeenCalledWith('recovery.load.readStoredReading', expect.any(Error), { userId: 'u1' });
    // The same history, no copy at all: the same map (the recovery answer alone, the safe direction).
    AsyncStorage.getItem.mockImplementation(realGetItem);
    await AsyncStorage.removeItem(KEY('u1'));
    restart();
    const noCopy = await loadMuscleRecovery('u1', NOW);
    expect(held.map).toEqual(noCopy.map);
  });

  test('unpaused runs refresh the copy: the newest reading replaces the older one', async () => {
    await learnUnpaused();
    expect((await stored()).personal).toEqual(ADJUSTED);
    personalRecovery.learnPersonalRecovery.mockReturnValue(LATER);
    const nextDay = await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(nextDay.personal).toEqual(LATER);
    expect((await stored()).personal).toEqual(LATER);
    expect(writesOf()).toBe(2);
  });

  test('a run that changes nothing writes nothing: the same reading is not written again', async () => {
    await learnUnpaused();
    await learnUnpaused(); // the daily memo answers; the copy is compared, found equal and left
    restart();
    await learnUnpaused(); // a restart on the same day: the learner runs again, to the same reading
    expect(personalRecovery.learnPersonalRecovery).toHaveBeenCalledTimes(2);
    expect(writesOf()).toBe(1);
  });

  test('a run that gives no reading leaves the copy as it was (a failed learner never erases what was learned)', async () => {
    await learnUnpaused();
    personalRecovery.learnPersonalRecovery.mockImplementation(() => { throw new Error('learner broke'); });
    const next = await loadMuscleRecovery('u1', NOW + DAY_MS);
    expect(next.personal).toBeNull();
    expect((await stored()).personal).toEqual(ADJUSTED);
    // A core read that failed gives no reading either, and writes nothing.
    personalRecovery.learnPersonalRecovery.mockReturnValue(LATER);
    mockDb.getCompletedWorkoutsBetween.mockRejectedValue(new Error('db down'));
    const degraded = await loadMuscleRecovery('u1', NOW + 2 * DAY_MS);
    expect(degraded.degraded).toBe(true);
    expect(degraded.personal).toBeNull();
    expect((await stored()).personal).toEqual(ADJUSTED);
  });

  test('a failed write is not fatal and is tried again: the screens still get the reading, the next unpaused run writes it', async () => {
    AsyncStorage.setItem.mockImplementationOnce(() => Promise.reject(new Error('disk full')));
    const first = await learnUnpaused();
    expect(first.personal).toEqual(ADJUSTED);
    expect(logError).toHaveBeenCalledWith('recovery.load.storeReading', expect.any(Error), { userId: 'u1' });
    expect(await stored()).toBeNull();
    const second = await learnUnpaused(); // the memo answers; the copy is still missing, so it is written now
    expect(second.personal).toEqual(ADJUSTED);
    expect((await stored()).personal).toEqual(ADJUSTED);
  });

  test('a failed comparison read does not stop the write', async () => {
    failReadOf(KEY('u1'));
    const result = await learnUnpaused();
    expect(result.personal).toEqual(ADJUSTED);
    AsyncStorage.getItem.mockImplementation(realGetItem);
    expect((await stored()).personal).toEqual(ADJUSTED);
  });

  test('a pause never writes: the copy stays as it was, and the next run that is not paused moves it', async () => {
    await learnUnpaused();
    await setWellbeing('calm');
    AsyncStorage.setItem.mockClear();
    personalRecovery.learnPersonalRecovery.mockReturnValue(LATER);
    seed([workout('w1', 3), workout('w2', 1)]);
    for (const day of [1, 2, 3]) {
      // eslint-disable-next-line no-await-in-loop
      const held = await loadMuscleRecovery('u1', NOW + day * DAY_MS);
      expect(held.personal).toEqual(ADJUSTED);
    }
    restart();
    expect((await loadMuscleRecovery('u1', NOW + 4 * DAY_MS)).personal).toEqual(ADJUSTED);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect((await stored()).personal).toEqual(ADJUSTED);

    await setWellbeing('normal');
    const after = await loadMuscleRecovery('u1', NOW + 5 * DAY_MS);
    expect(after.personal).toEqual(LATER);
    expect((await stored()).personal).toEqual(LATER);
  });

  test('a pause does not repair a missing copy either: only a run that is not paused writes', async () => {
    AsyncStorage.setItem.mockImplementationOnce(() => Promise.reject(new Error('disk full')));
    await learnUnpaused(); // the screens are shown the reading, the write fails: no copy
    expect(await stored()).toBeNull();
    await setWellbeing('calm');
    AsyncStorage.setItem.mockClear();
    const held = await loadMuscleRecovery('u1', NOW); // paused: this process's reading is held, and nothing is written
    expect(held.personal).toEqual(ADJUSTED);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await stored()).toBeNull();
    await setWellbeing('normal');
    await loadMuscleRecovery('u1', NOW);
    expect((await stored()).personal).toEqual(ADJUSTED);
  });

  test('the copy is for one person: another person never reads it, and a copy that names another person is no reading', async () => {
    await learnUnpaused('u1');
    restart();
    await setWellbeing('calm');
    expect((await loadMuscleRecovery('u2', NOW)).personal).toBeNull();
    // u1's reading filed under u2's key (a copied or renamed entry): refused, the payload names u1.
    await AsyncStorage.setItem(KEY('u2'), await AsyncStorage.getItem(KEY('u1')));
    expect((await loadMuscleRecovery('u2', NOW)).personal).toBeNull();
    // And u1 still has its own.
    expect((await loadMuscleRecovery('u1', NOW)).personal).toEqual(ADJUSTED);
  });

  test('a person with no user id writes nothing', async () => {
    await loadMuscleRecovery(null, NOW);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('sign-out and delete clear AsyncStorage: the copy goes with it (the existing clear, no new path)', async () => {
    await learnUnpaused();
    expect(await stored()).not.toBeNull();
    await AsyncStorage.clear();
    restart();
    await setWellbeing('calm');
    expect((await loadMuscleRecovery('u1', NOW)).personal).toBeNull();
    expect(await stored()).toBeNull();
  });

  const COPY = (over) => JSON.stringify({ version: 1, userId: 'u1', personal: { ...ADJUSTED, ...over } });
  test.each([
    ['text that is not JSON (a write cut short)', '{"version":1,"userId":"u1","personal":{"factor":1.'],
    ['JSON null', 'null'],
    ['a number', '7'],
    ['another version', JSON.stringify({ version: 2, userId: 'u1', personal: ADJUSTED })],
    ['no version', JSON.stringify({ userId: 'u1', personal: ADJUSTED })],
    ['another person', JSON.stringify({ version: 1, userId: 'u2', personal: ADJUSTED })],
    ['no person', JSON.stringify({ version: 1, personal: ADJUSTED })],
    ['no reading', JSON.stringify({ version: 1, userId: 'u1' })],
    ['a reading that is a list', JSON.stringify({ version: 1, userId: 'u1', personal: [ADJUSTED] })],
    ['a speed above the range', COPY({ factor: 3 })],
    ['a speed below the range', COPY({ factor: 0.1 })],
    ['a speed that is text', COPY({ factor: '1.2' })],
    ['a first estimate that is null', COPY({ prior: null })],
    ['a reason the card has no words for', COPY({ reason: 'ready' })],
    ['no reason', COPY({ reason: undefined })],
    ['negative comparisons', COPY({ pairs: -1 })],
    ['comparisons that are text', COPY({ pairs: 'many' })],
    ['a muscle count that is text', COPY({ pairsByMuscle: { chest: 'ten' } })],
    ['a muscle count below zero', COPY({ pairsByMuscle: { chest: -2 } })],
    ['muscle counts that are a list', COPY({ pairsByMuscle: [1, 2] })],
    ['a pairing the learner never gives', COPY({ pairing: 'weekday' })],
  ])('a copy that cannot be vouched for is no reading: %s', async (_name, raw) => {
    await AsyncStorage.setItem(KEY('u1'), raw);
    await setWellbeing('calm');
    const held = await loadMuscleRecovery('u1', NOW);
    expect(held.learnerPaused).toBe(true);
    expect(held.personal).toBeNull();
    expect(personalRecovery.learnPersonalRecovery).not.toHaveBeenCalled();
  });

  test('the reading comes back as the learner gave it: only its own fields, the slot pairing kept, every reason the card knows', async () => {
    await AsyncStorage.setItem(KEY('u1'), JSON.stringify({
      version: 1, userId: 'u1', personal: { ...ADJUSTED, extra: 'x', pairing: 'slot' }, other: 1,
    }));
    await setWellbeing('calm');
    const held = await loadMuscleRecovery('u1', NOW);
    expect(held.personal).toEqual({ ...ADJUSTED, pairing: 'slot' });
    expect(Object.keys(held.personal).sort()).toEqual(['factor', 'pairing', 'pairs', 'pairsByMuscle', 'prior', 'reason']);

    for (const reason of ['adjusted', 'too_few', 'fixed_reps', 'no_spread', 'not_clear']) {
      // eslint-disable-next-line no-await-in-loop
      await AsyncStorage.setItem(KEY('u1'), COPY({ reason, factor: 1, pairs: 4, pairsByMuscle: {} }));
      // eslint-disable-next-line no-await-in-loop
      expect((await loadMuscleRecovery('u1', NOW)).personal).toEqual({
        factor: 1, prior: 1, pairs: 4, reason, pairsByMuscle: {},
      });
    }
  });

  test('every reading the learner can give survives the round trip exactly (slot pairing and a reading with no muscles included)', async () => {
    const readings = [
      ADJUSTED,
      { ...ADJUSTED, pairing: 'slot' },
      { factor: 1.15, prior: 1.15, pairs: 3, reason: 'too_few', pairsByMuscle: {} },
      { factor: 0.9, prior: 0.9, pairs: 7, reason: 'fixed_reps', pairsByMuscle: { chest: 4, back: 3 } },
      { factor: 1, prior: 1, pairs: 12, reason: 'no_spread', pairsByMuscle: { quads: 12 }, pairing: 'slot' },
      { factor: 0.75, prior: 1, pairs: 40, reason: 'adjusted', pairsByMuscle: { chest: 20, back: 20 } },
    ];
    for (const reading of readings) {
      // eslint-disable-next-line no-await-in-loop
      await AsyncStorage.clear();
      __resetPersonalMemoForTests();
      personalRecovery.learnPersonalRecovery.mockReturnValue(reading);
      // eslint-disable-next-line no-await-in-loop
      await learnUnpaused();
      __resetPersonalMemoForTests();
      // eslint-disable-next-line no-await-in-loop
      await setWellbeing('calm');
      // eslint-disable-next-line no-await-in-loop
      expect((await loadMuscleRecovery('u1', NOW)).personal).toEqual(reading);
    }
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

  // Agreed with the lead (ruling 6.1): only the learner's factor is paused. The person's own gaps are
  // their own session times, read as before; nothing here changes under a pause.
  test('the person\'s own gaps are not paused: calm mode and an open flag leave them as they were', async () => {
    seed([1, 4, 7, 10, 13, 16, 19, 22, 25, 28].map((d) => workout(`w${d}`, d)));
    const free = (await ask(null)).ownGaps;
    expect(free).toEqual([72, 72, 72, 72]);
    await setWellbeing('calm');
    expect((await ask(0.85)).ownGaps).toEqual(free);
    await setWellbeing('normal');
    mockDb.getOpenEdPatternFlag.mockResolvedValue(RAISED_FLAG);
    expect((await ask(0.85)).ownGaps).toEqual(free);
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
    // And the learner is run only past the pause (re-pinned for lead ruling 6.1: the held reading is
    // now read asynchronously, from the stored copy after a restart).
    expect(src).toMatch(/if \(learnerPaused\) personal = await heldReading\(userId\);\s*\n\s*else if \(!degraded\)/);
  });

  test('the stored copy has ONE writer, and it is called only from the branch that is not paused', () => {
    const src = code(read('load.js'));
    expect(src.match(/AsyncStorage\.setItem\(/g)).toHaveLength(1);
    expect(src.match(/refreshStoredReading\(userId, personal\)/g)).toHaveLength(2); // its definition and its one call
    const unpaused = src.slice(src.indexOf('else if (!degraded) {'), src.indexOf('const map = buildMuscleRecoveryMap'));
    expect(unpaused).toContain('refreshStoredReading(userId, personal)');
    // The reading is read back only from the paused branch (heldReading), and nothing else reads the key.
    expect(src.match(/readStoredReading\(userId\)/g)).toHaveLength(2); // its definition and its one call, in heldReading
    expect(src.match(/heldReading\(userId\)/g)).toHaveLength(2); // its definition and the paused branch
  });

  test('the five ED-safety modules do not import this domain (the isolation guard stands)', () => {
    for (const file of ['edPatternDetector.js', 'wellbeing.js', 'nutritionEngine.js', 'weeklyCoach.js', 'coachApply.js']) {
      expect(fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8')).not.toMatch(/\b(?:from|require)\b\s*\(?\s*['"][^'"]*\brecovery\/[^'"]*['"]/);
    }
  });
});
