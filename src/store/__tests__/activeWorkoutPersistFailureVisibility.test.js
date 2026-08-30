/**
 * Release gate finding (final reliability audit, baseline 0480e6e4):
 * _persistActiveWorkout is the ONLY crash/kill recovery mechanism for an
 * in-progress workout (see activeWorkoutPersistence.test.js for the happy
 * path). A write failure there - AsyncStorage full, Android's CursorWindow
 * row-size limit on a long session, a stray non-serialisable value - was
 * swallowed with no logError call anywhere: both silently destructive (the
 * athlete's whole in-progress session is unrecoverable on the next
 * crash/kill) and invisible in Sentry (errorLog.logError forwards there).
 * This pins that a persist failure is now reported, without changing the
 * tolerate-and-continue behaviour itself (still best-effort; must never
 * block or fail the workout in progress).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../lib/database', () => ({
  uid: jest.fn(() => `uid-${Math.random().toString(36).slice(2)}`),
  getWorkoutById: jest.fn(),
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  wipeAllUserDataWithRetry: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('../../lib/errorLog', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const errorLog = require('../../lib/errorLog');
const useAppStore = require('../useAppStore').default;

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({
    user: { id: 'u1' }, activeWorkout: null, workoutExercises: [],
    currentExerciseIndex: 0, workoutStartTime: null,
  });
});

describe('a failed AsyncStorage.setItem on the crash-recovery snapshot is reported', () => {
  test('an async rejection from setItem is logged with the exercise count, not swallowed silently', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    useAppStore.getState().startWorkout(
      { id: 'w1' },
      [{ exercise: { id: 'e1' }, sets: [] }, { exercise: { id: 'e2' }, sets: [] }],
    );
    await flush();

    expect(errorLog.logError).toHaveBeenCalledWith(
      'activeWorkout.persistFailed',
      expect.any(Error),
      expect.objectContaining({ exerciseCount: 2 }),
    );
  });

  test('the workout still starts normally despite the persist failure (best-effort, never blocking)', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    useAppStore.getState().startWorkout({ id: 'w1' }, [{ exercise: { id: 'e1' }, sets: [] }]);
    await flush();

    expect(useAppStore.getState().activeWorkout).toEqual({ id: 'w1' });
  });

  test('a successful persist logs nothing (no noise on the happy path)', async () => {
    useAppStore.getState().startWorkout({ id: 'w1' }, [{ exercise: { id: 'e1' }, sets: [] }]);
    await flush();

    expect(errorLog.logError).not.toHaveBeenCalledWith(
      'activeWorkout.persistFailed', expect.anything(), expect.anything(),
    );
  });
});
