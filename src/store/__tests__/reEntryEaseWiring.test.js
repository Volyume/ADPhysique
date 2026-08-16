/**
 * C18 re-entry amendment (Task 1) — store wiring.
 *
 * startWorkout and restoreActiveWorkout both match a fresh/restored
 * activeWorkout against any pending re-entry-ease decision
 * (lib/reEntryEaseState.js) and, on an identity match, stamp
 * activeWorkout.reEntryEaseApplied - the same pattern as the existing
 * readinessDismissed flag, so it rides the WK-1 AsyncStorage snapshot for
 * free across a remount, background/foreground, or crash/kill restore.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../lib/database', () => ({
  getWorkoutById: jest.fn(),
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  wipeAllUserDataWithRetry: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('../../lib/reEntryEaseState', () => ({
  getPendingReEntryEase: jest.fn(),
  reEntryEaseMatches: jest.requireActual('../../lib/reEntryEaseState').reEntryEaseMatches,
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const db = require('../../lib/database');
const reEntryEaseState = require('../../lib/reEntryEaseState');
const useAppStore = require('../useAppStore').default;

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({
    user: { id: 'u1' },
    activeWorkout: null,
    workoutExercises: [],
    currentExerciseIndex: 0,
    workoutStartTime: null,
  });
});

describe('applyReEntryEaseIfPending via startWorkout', () => {
  test('a matching pending decision stamps reEntryEaseApplied on the new workout', async () => {
    reEntryEaseState.getPendingReEntryEase.mockResolvedValue({ mesocycleWeekId: 'w1', routineId: 'r1' });

    useAppStore.getState().startWorkout({ id: 'wk1', mesocycleWeekId: 'w1', routineId: 'r1' }, []);
    await flush();

    expect(useAppStore.getState().activeWorkout.reEntryEaseApplied).toBe(true);
  });

  test('a mismatched routine leaves the workout untouched (does not consume it)', async () => {
    reEntryEaseState.getPendingReEntryEase.mockResolvedValue({ mesocycleWeekId: 'w1', routineId: 'r1' });

    useAppStore.getState().startWorkout({ id: 'wk1', mesocycleWeekId: 'w1', routineId: 'r-other' }, []);
    await flush();

    expect(useAppStore.getState().activeWorkout.reEntryEaseApplied).toBeUndefined();
  });

  test('a mismatched week leaves the workout untouched', async () => {
    reEntryEaseState.getPendingReEntryEase.mockResolvedValue({ mesocycleWeekId: 'w1', routineId: 'r1' });

    useAppStore.getState().startWorkout({ id: 'wk1', mesocycleWeekId: 'w-other', routineId: 'r1' }, []);
    await flush();

    expect(useAppStore.getState().activeWorkout.reEntryEaseApplied).toBeUndefined();
  });

  test('no pending decision at all leaves the workout untouched, no crash', async () => {
    reEntryEaseState.getPendingReEntryEase.mockResolvedValue(null);

    useAppStore.getState().startWorkout({ id: 'wk1', mesocycleWeekId: 'w1', routineId: 'r1' }, []);
    await flush();

    expect(useAppStore.getState().activeWorkout.reEntryEaseApplied).toBeUndefined();
  });

  test('an ad-hoc session with no mesocycleWeekId/routineId never applies the ease', async () => {
    reEntryEaseState.getPendingReEntryEase.mockResolvedValue({ mesocycleWeekId: 'w1', routineId: 'r1' });

    useAppStore.getState().startWorkout({ id: 'wk1' }, []);
    await flush();

    expect(reEntryEaseState.getPendingReEntryEase).not.toHaveBeenCalled();
    expect(useAppStore.getState().activeWorkout.reEntryEaseApplied).toBeUndefined();
  });

  test('a fast finish during the async lookup does not resurrect the flag onto a gone session', async () => {
    let resolveLookup;
    reEntryEaseState.getPendingReEntryEase.mockImplementation(
      () => new Promise((res) => { resolveLookup = res; }),
    );

    useAppStore.getState().startWorkout({ id: 'wk1', mesocycleWeekId: 'w1', routineId: 'r1' }, []);
    // Session ends (or a different one starts) before the lookup resolves.
    useAppStore.getState().endWorkout();
    resolveLookup({ mesocycleWeekId: 'w1', routineId: 'r1' });
    await flush();

    expect(useAppStore.getState().activeWorkout).toBeNull();
  });
});

describe('applyReEntryEaseIfPending via restoreActiveWorkout', () => {
  test('a crash before the async match landed re-applies it on restore', async () => {
    await AsyncStorage.setItem(
      '@volyume_active_workout',
      JSON.stringify({
        userId: 'u1',
        workout: { id: 'wk1', mesocycleWeekId: 'w1', routineId: 'r1' }, // no reEntryEaseApplied yet
        workoutExercises: [],
        currentExerciseIndex: 0,
        workoutStartTime: 1000,
      }),
    );
    db.getWorkoutById.mockResolvedValue({ id: 'wk1', isCompleted: false });
    reEntryEaseState.getPendingReEntryEase.mockResolvedValue({ mesocycleWeekId: 'w1', routineId: 'r1' });

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');
    await flush();

    expect(ok).toBe(true);
    expect(useAppStore.getState().activeWorkout.reEntryEaseApplied).toBe(true);
  });

  test('a snapshot that already carries the flag keeps it without re-matching (still correct if it does)', async () => {
    await AsyncStorage.setItem(
      '@volyume_active_workout',
      JSON.stringify({
        userId: 'u1',
        workout: { id: 'wk1', mesocycleWeekId: 'w1', routineId: 'r1', reEntryEaseApplied: true },
        workoutExercises: [],
        currentExerciseIndex: 0,
        workoutStartTime: 1000,
      }),
    );
    db.getWorkoutById.mockResolvedValue({ id: 'wk1', isCompleted: false });
    reEntryEaseState.getPendingReEntryEase.mockResolvedValue(null);

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');
    await flush();

    expect(ok).toBe(true);
    expect(useAppStore.getState().activeWorkout.reEntryEaseApplied).toBe(true);
  });
});
