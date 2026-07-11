/**
 * COMP-020: applyRemoteSetEvent — the headless, idempotent set-commit path the
 * Apple Watch bridge calls. Locks the never-lose-a-set / never-double-log
 * guarantees: a fresh event logs one set + starts rest; a replayed eventId is a
 * no-op; an event for no active workout is rejected; set numbers recompute
 * phone-side.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../lib/database', () => ({
  getWorkoutById: jest.fn(),
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  createWorkoutSet: jest.fn(async (d) => ({ id: `set-${d.setNumber}`, ...d })),
}));

const db = require('../../lib/database');
const useAppStore = require('../useAppStore').default;

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  jest.clearAllMocks();
  useAppStore.setState({
    user: { id: 'u1' },
    activeWorkout: { id: 'w1' },
    workoutExercises: [{ exercise: { id: 'e1' }, routineExercise: { restSeconds: 120 }, sets: [] }],
    currentExerciseIndex: 0,
    appliedRemoteEventIds: [],
    restTimerActive: false,
    restTimerEndsAt: null,
  });
});

describe('applyRemoteSetEvent', () => {
  test('a fresh event logs one set and starts the rest timer', async () => {
    const r = await useAppStore.getState().applyRemoteSetEvent({
      eventId: 'evt-1', workoutId: 'w1', type: 'logSet',
      payload: { weight: 100, reps: 8 },
    });
    expect(r.applied).toBe(true);
    expect(r.setNumber).toBe(1);
    expect(db.createWorkoutSet).toHaveBeenCalledTimes(1);
    expect(db.createWorkoutSet).toHaveBeenCalledWith(expect.objectContaining({
      workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 8, setNumber: 1,
    }));
    const s = useAppStore.getState();
    expect(s.workoutExercises[0].sets).toHaveLength(1);
    expect(s.restTimerActive).toBe(true);
    expect(s.appliedRemoteEventIds).toContain('evt-1');
  });

  test('replaying the same eventId is a no-op (idempotent)', async () => {
    const evt = { eventId: 'evt-2', workoutId: 'w1', payload: { weight: 60, reps: 10 } };
    await useAppStore.getState().applyRemoteSetEvent(evt);
    const second = await useAppStore.getState().applyRemoteSetEvent(evt);
    expect(second).toEqual({ applied: false, reason: 'duplicate' });
    expect(db.createWorkoutSet).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().workoutExercises[0].sets).toHaveLength(1);
  });

  test('set numbers recompute phone-side across two events', async () => {
    await useAppStore.getState().applyRemoteSetEvent({ eventId: 'a', workoutId: 'w1', payload: { weight: 100, reps: 8 } });
    const r2 = await useAppStore.getState().applyRemoteSetEvent({ eventId: 'b', workoutId: 'w1', payload: { weight: 100, reps: 7 } });
    expect(r2.setNumber).toBe(2);
    expect(useAppStore.getState().workoutExercises[0].sets).toHaveLength(2);
  });

  test('rejects an event for no active workout', async () => {
    useAppStore.setState({ activeWorkout: null });
    const r = await useAppStore.getState().applyRemoteSetEvent({ eventId: 'x', payload: { weight: 1, reps: 1 } });
    expect(r).toEqual({ applied: false, reason: 'no_active_workout' });
  });

  test('rejects an event whose workoutId does not match', async () => {
    const r = await useAppStore.getState().applyRemoteSetEvent({ eventId: 'y', workoutId: 'OTHER', payload: { weight: 1, reps: 1 } });
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('no_active_workout');
  });

  test('the applied id persists onto the WK-1 snapshot for crash-safe replay', async () => {
    await useAppStore.getState().applyRemoteSetEvent({ eventId: 'persist-me', workoutId: 'w1', payload: { weight: 50, reps: 5 } });
    await flush();
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
      ?? require('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem('@volyume_active_workout');
    expect(JSON.parse(raw).appliedRemoteEventIds).toContain('persist-me');
  });

  test('SD-11: a concurrent replay of the same eventId cannot double-log while the first apply is still awaiting the DB', async () => {
    // Hold the DB write open so the second call arrives mid-await. Before
    // the SD-11 fix, the duplicate check ran before the await but the id was
    // only recorded after it, so both calls passed and the set logged twice.
    let release;
    db.createWorkoutSet.mockImplementationOnce(
      (d) => new Promise((resolve) => { release = () => resolve({ id: 'set-1', ...d }); }),
    );
    const evt = { eventId: 'evt-race', workoutId: 'w1', payload: { weight: 80, reps: 6 } };
    const first = useAppStore.getState().applyRemoteSetEvent(evt);   // parked on the await
    const second = await useAppStore.getState().applyRemoteSetEvent(evt); // arrives mid-flight
    expect(second).toEqual({ applied: false, reason: 'duplicate' });
    release();
    const r1 = await first;
    expect(r1.applied).toBe(true);
    expect(db.createWorkoutSet).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().workoutExercises[0].sets).toHaveLength(1);
  });

  test('SD-11: a failed apply releases its reservation so the event stays retryable', async () => {
    db.createWorkoutSet.mockRejectedValueOnce(new Error('disk full'));
    const evt = { eventId: 'evt-retry', workoutId: 'w1', payload: { weight: 40, reps: 12 } };
    const failed = await useAppStore.getState().applyRemoteSetEvent(evt);
    expect(failed).toEqual({ applied: false, reason: 'error' });
    expect(useAppStore.getState().appliedRemoteEventIds).not.toContain('evt-retry');
    const retried = await useAppStore.getState().applyRemoteSetEvent(evt);
    expect(retried.applied).toBe(true);
    expect(useAppStore.getState().workoutExercises[0].sets).toHaveLength(1);
  });
});
