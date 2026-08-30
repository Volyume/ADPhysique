/**
 * The session's records last as long as the session does.
 *
 * Founder device report 2026-08-23: "it's oddly saying I only had 1 PR
 * when I had about 10". The list of records set this session used to be
 * useState on ActiveWorkoutScreen. That screen is built to be left and
 * come back to (ActiveSessionMiniBar navigates straight back into it),
 * and it is rebuilt from scratch after a process kill, which WK-1
 * recovery is designed to survive. Every other part of the session
 * survived that already: the workout row, the logged sets, the elapsed
 * time, the computed adjustments. The records did not, so stepping out
 * of the logger once emptied the list and the summary counted only what
 * happened after it.
 *
 * This suite pins the records to the same lifetime as the workout: held
 * in the store, written into the WK-1 snapshot, rehydrated on restore,
 * and cleared only when a session actually starts or ends.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../lib/database', () => ({
  uid: jest.fn(() => `uid-${Math.random().toString(36).slice(2)}`),
  getWorkoutById: jest.fn(),
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  wipeAllUserDataWithRetry: jest.fn().mockResolvedValue({ ok: true }),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const db = require('../../lib/database');
const useAppStore = require('../useAppStore').default;

const KEY = '@volyume_active_workout';
const flush = () => new Promise((r) => setTimeout(r, 0));

const pr = (exerciseId, type, value) => ({
  exerciseId, exerciseName: exerciseId, type, value, units: 'kg',
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({
    user: { id: 'u1' },
    activeWorkout: null,
    workoutExercises: [],
    currentExerciseIndex: 0,
    workoutStartTime: null,
    sessionPRs: [],
  });
});

describe('records accumulate across the whole session', () => {
  test('a record from every exercise is still there at the end', () => {
    const s = useAppStore.getState();
    s.startWorkout({ id: 'w1' }, [{ exercise: { id: 'e1' }, sets: [] }]);
    for (const id of ['e1', 'e2', 'e3', 'e4', 'e5', 'e6']) {
      useAppStore.getState().setSessionPRs(prev => [...prev, pr(id, 'heaviest_weight', 100)]);
    }
    expect(useAppStore.getState().sessionPRs).toHaveLength(6);
  });

  test('it takes a plain value as well as an updater', () => {
    useAppStore.getState().setSessionPRs([pr('e1', '1rm_estimate', 140)]);
    expect(useAppStore.getState().sessionPRs).toHaveLength(1);
    useAppStore.getState().setSessionPRs([]);
    expect(useAppStore.getState().sessionPRs).toEqual([]);
  });
});

describe('records survive what the session survives', () => {
  test('they are written into the crash-recovery snapshot', async () => {
    useAppStore.getState().startWorkout({ id: 'w1' }, [{ exercise: { id: 'e1' }, sets: [] }]);
    useAppStore.getState().setSessionPRs([pr('e1', '1rm_estimate', 140), pr('e2', 'heaviest_weight', 100)]);
    await flush();
    const snap = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(snap.sessionPRs).toHaveLength(2);
    expect(snap.sessionPRs[0].exerciseId).toBe('e1');
  });

  test('a kill mid-session restores them, not an empty list', async () => {
    useAppStore.getState().startWorkout({ id: 'w1' }, [{ exercise: { id: 'e1' }, sets: [] }]);
    useAppStore.getState().setSessionPRs([
      pr('e1', '1rm_estimate', 140), pr('e2', 'heaviest_weight', 100), pr('e3', 'most_reps_at_weight', 12),
    ]);
    await flush();

    // The process dies and the app relaunches: memory is gone, the
    // snapshot is not.
    useAppStore.setState({ activeWorkout: null, workoutExercises: [], sessionPRs: [] });
    db.getWorkoutById.mockResolvedValue({ id: 'w1', isCompleted: 0 });

    const restored = await useAppStore.getState().restoreActiveWorkout('u1');
    expect(restored).not.toBe(false);
    expect(useAppStore.getState().sessionPRs).toHaveLength(3);
  });

  test('an older snapshot with no records restores cleanly as none', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({
      userId: 'u1', workout: { id: 'w1' }, workoutExercises: [], currentExerciseIndex: 0,
      workoutStartTime: Date.now(), savedAt: Date.now(),
    }));
    db.getWorkoutById.mockResolvedValue({ id: 'w1', isCompleted: 0 });
    await useAppStore.getState().restoreActiveWorkout('u1');
    expect(useAppStore.getState().sessionPRs).toEqual([]);
  });
});

describe('records are cleared only by a session boundary', () => {
  test('starting a workout begins with none', () => {
    useAppStore.setState({ sessionPRs: [pr('old', 'heaviest_weight', 100)] });
    useAppStore.getState().startWorkout({ id: 'w2' }, []);
    expect(useAppStore.getState().sessionPRs).toEqual([]);
  });

  test('ending a workout clears them', () => {
    useAppStore.getState().startWorkout({ id: 'w1' }, []);
    useAppStore.getState().setSessionPRs([pr('e1', 'heaviest_weight', 100)]);
    useAppStore.getState().endWorkout();
    expect(useAppStore.getState().sessionPRs).toEqual([]);
  });
});

describe('the screen no longer owns this state', () => {
  const SRC = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'screens', 'ActiveWorkoutScreen.js'), 'utf8',
  );

  test('ActiveWorkoutScreen reads the list from the store', () => {
    expect(SRC).toMatch(/const detectedPRs = useAppStore\(s => s\.sessionPRs\)/);
    expect(SRC).toMatch(/const setDetectedPRs = useAppStore\(s => s\.setSessionPRs\)/);
    expect(SRC).not.toMatch(/useState\(\[\]\);?\s*\/\/.*detectedPRs/);
    expect(SRC).not.toMatch(/\[detectedPRs, setDetectedPRs\] = useState/);
  });

  test('the finish handler captures the list before endWorkout clears it', () => {
    const finish = SRC.match(/async function handleFinishWorkout\(\)[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(finish).toContain('const finishedPRs = detectedPRs;');
    expect(finish.indexOf('const finishedPRs = detectedPRs;'))
      .toBeLessThan(finish.indexOf('endWorkout();'));
    expect(finish).toContain('detectedPRs: finishedPRs,');
  });
});
