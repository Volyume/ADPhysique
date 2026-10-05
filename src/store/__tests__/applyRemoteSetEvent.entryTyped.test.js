/**
 * D219 learner data path (register D219, "Founder answers on the learner
 * design, 2026-10-05"): a set logged by the watch bridge (applyRemoteSetEvent)
 * is a path that CANNOT know whether the person typed or kept what the watch
 * showed, because the phone never sees the watch's fill. The fact is therefore
 * left out of the createWorkoutSet call, which stores NULL = unknown (pinned
 * in src/lib/__tests__/database.entryTyped.test.js), and a payload that
 * happens to carry such a field is not trusted: unknown is never guessed.
 *
 * Fails on a store that passed a fact of its own through to the database.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../lib/database', () => ({
  getWorkoutById: jest.fn(),
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  wipeAllUserDataWithRetry: jest.fn().mockResolvedValue({ ok: true }),
  createWorkoutSet: jest.fn(async (d) => ({ id: `set-${d.setNumber}`, ...d })),
}));

const db = require('../../lib/database');
const useAppStore = require('../useAppStore').default;

beforeEach(() => {
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

describe('a set logged from the watch has no entry fact', () => {
  test('the createWorkoutSet call carries no entryTyped key at all', async () => {
    const r = await useAppStore.getState().applyRemoteSetEvent({
      eventId: 'evt-et-1', workoutId: 'w1', type: 'logSet', payload: { weight: 100, reps: 8 },
    });

    expect(r.applied).toBe(true);
    expect(db.createWorkoutSet).toHaveBeenCalledTimes(1);
    expect(db.createWorkoutSet.mock.calls[0][0]).not.toHaveProperty('entryTyped');
    expect(db.createWorkoutSet.mock.calls[0][0]).not.toHaveProperty('entry_typed');
  });

  test.each([
    ['entryTyped', { entryTyped: 1 }],
    ['entry_typed', { entry_typed: 0 }],
    ['typed', { typed: true }],
  ])('a payload field named %s is not trusted: the call still carries no fact', async (_name, extra) => {
    await useAppStore.getState().applyRemoteSetEvent({
      eventId: `evt-et-${_name}`, workoutId: 'w1', type: 'logSet', payload: { weight: 60, reps: 10, ...extra },
    });

    expect(db.createWorkoutSet).toHaveBeenCalledTimes(1);
    expect(db.createWorkoutSet.mock.calls[0][0]).not.toHaveProperty('entryTyped');
    expect(db.createWorkoutSet.mock.calls[0][0]).not.toHaveProperty('entry_typed');
  });

  test('the set is logged exactly as before: weight, reps and set number are unchanged', async () => {
    await useAppStore.getState().applyRemoteSetEvent({
      eventId: 'evt-et-same', workoutId: 'w1', type: 'logSet', payload: { weight: 100, reps: 8 },
    });

    expect(db.createWorkoutSet).toHaveBeenCalledWith(expect.objectContaining({
      workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 8, setNumber: 1,
    }));
  });
});
