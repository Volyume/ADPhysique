/**
 * WK-1: crash/kill recovery for an in-progress workout.
 *
 * The store holds the active session (activeWorkout + workoutExercises,
 * which carries the logged sets) in memory only. Before this fix an app
 * kill lost the session and left the workouts row is_completed=0 forever,
 * invisible to every history query. The store now snapshots the slice to
 * AsyncStorage on each mutation and rehydrates it on launch.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// DB is consulted by restoreActiveWorkout to confirm the workout is still
// incomplete. Mock just that surface.
jest.mock('../../lib/database', () => ({
  getWorkoutById: jest.fn(),
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const db = require('../../lib/database');
const useAppStore = require('../useAppStore').default;

const KEY = '@volyume_active_workout';
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({
    user: { id: 'u1' },
    activeWorkout: null,
    workoutExercises: [],
    currentExerciseIndex: 0,
    workoutStartTime: null,
  });
});

describe('snapshot on mutation', () => {
  test('startWorkout writes a snapshot tagged with the user id', async () => {
    useAppStore.getState().startWorkout({ id: 'w1' }, [{ exercise: { id: 'e1' }, sets: [] }]);
    await flush();

    const snap = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(snap.userId).toBe('u1');
    expect(snap.workout.id).toBe('w1');
    expect(snap.workoutExercises).toHaveLength(1);
  });

  test('addSetToCurrentExercise persists the logged set into the snapshot', async () => {
    useAppStore.getState().startWorkout({ id: 'w1' }, [{ exercise: { id: 'e1' }, sets: [] }]);
    useAppStore.getState().addSetToCurrentExercise({ id: 's1', actualReps: 8, weight: 100 });
    await flush();

    const snap = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(snap.workoutExercises[0].sets).toHaveLength(1);
    expect(snap.workoutExercises[0].sets[0].id).toBe('s1');
  });

  test('endWorkout clears the snapshot so a finished session is not resurrected', async () => {
    useAppStore.getState().startWorkout({ id: 'w1' }, []);
    await flush();
    expect(await AsyncStorage.getItem(KEY)).not.toBeNull();

    useAppStore.getState().endWorkout();
    await flush();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });
});

describe('restoreActiveWorkout', () => {
  async function seedSnapshot(snap) {
    await AsyncStorage.setItem(KEY, JSON.stringify(snap));
  }

  const validSnap = {
    userId: 'u1',
    workout: { id: 'w1' },
    workoutExercises: [{ exercise: { id: 'e1' }, sets: [{ id: 's1' }] }],
    currentExerciseIndex: 0,
    workoutStartTime: 1000,
    savedAt: 2000,
  };

  test('restores the session when the snapshot matches the user and the workout is incomplete', async () => {
    await seedSnapshot(validSnap);
    db.getWorkoutById.mockResolvedValue({ id: 'w1', isCompleted: false });

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');

    expect(ok).toBe(true);
    expect(useAppStore.getState().activeWorkout).toEqual({ id: 'w1' });
    expect(useAppStore.getState().workoutExercises[0].sets[0].id).toBe('s1');
  });

  test('discards a snapshot belonging to a different user', async () => {
    await seedSnapshot({ ...validSnap, userId: 'other' });

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');

    expect(ok).toBe(false);
    expect(useAppStore.getState().activeWorkout).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(db.getWorkoutById).not.toHaveBeenCalled();
  });

  test('discards a snapshot whose workout is already completed', async () => {
    await seedSnapshot(validSnap);
    db.getWorkoutById.mockResolvedValue({ id: 'w1', isCompleted: true });

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');

    expect(ok).toBe(false);
    expect(useAppStore.getState().activeWorkout).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  test('discards a snapshot whose workout no longer exists', async () => {
    await seedSnapshot(validSnap);
    db.getWorkoutById.mockResolvedValue(null);

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');

    expect(ok).toBe(false);
    expect(useAppStore.getState().activeWorkout).toBeNull();
  });

  test('does not clobber a live in-memory session', async () => {
    await seedSnapshot(validSnap);
    useAppStore.setState({ activeWorkout: { id: 'live' } });

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');

    expect(ok).toBe(false);
    expect(useAppStore.getState().activeWorkout).toEqual({ id: 'live' });
    expect(db.getWorkoutById).not.toHaveBeenCalled();
  });

  test('does not clobber a session started DURING the async reads (race)', async () => {
    await seedSnapshot(validSnap);
    // Simulate the user tapping "Start workout" while restore is awaiting the
    // DB read: getWorkoutById resolves a valid incomplete row, but by then a
    // live session exists. The post-await re-check must bail without clobbering.
    db.getWorkoutById.mockImplementation(async () => {
      useAppStore.setState({ activeWorkout: { id: 'live' } });
      return { id: 'w1', isCompleted: false };
    });

    const ok = await useAppStore.getState().restoreActiveWorkout('u1');

    expect(ok).toBe(false);
    expect(useAppStore.getState().activeWorkout).toEqual({ id: 'live' });
  });

  test('returns false when there is no snapshot', async () => {
    const ok = await useAppStore.getState().restoreActiveWorkout('u1');
    expect(ok).toBe(false);
  });
});
