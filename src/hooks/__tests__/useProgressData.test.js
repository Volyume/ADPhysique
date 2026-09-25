import { create, act } from 'react-test-renderer';
import useProgressData, { computePRsPerWeek } from '../useProgressData';
import useAppStore from '../../store/useAppStore';
import * as database from '../../lib/database';
import { localWeekStartMs } from '../../lib/dayKey';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));

jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllWorkouts: jest.fn(),
  getAllExercises: jest.fn(),
  getAllMesocycles: jest.fn(),
  dismissInsight: jest.fn(),
  runInsightsEngine: jest.fn(),
  getActivePlan: jest.fn(),
  getRecentWorkoutFeedback: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getPlannedMuscleVolume: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const NOW = Date.UTC(2026, 0, 31); // fixed reference so week binning is stable

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function renderProgressHook() {
  const ref = { current: null };
  function Probe() {
    ref.current = useProgressData();
    return null;
  }
  let tree;
  await act(async () => { tree = create(<Probe />); });
  await flush();
  return { ref, tree };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ user: null });
  database.getAllWorkouts.mockResolvedValue([]);
  database.getCompletedWorkoutSets.mockResolvedValue([]);
  database.getAllExercises.mockResolvedValue([]);
  database.getAllMesocycles.mockResolvedValue([]);
  database.dismissInsight.mockResolvedValue(undefined);
  database.runInsightsEngine.mockResolvedValue([]);
  database.getActivePlan.mockResolvedValue(null);
  database.getRecentWorkoutFeedback.mockResolvedValue([]);
  database.getCurrentMesocycleWeek.mockResolvedValue(null);
  database.getPlannedMuscleVolume.mockResolvedValue([]);
});

// computePRsPerWeek bins "new running-max estimated 1RM" events into weekly
// slots inside the window. It was extracted verbatim from AnalyticsScreen when
// the Progress data layer moved into useProgressData; these lock its behaviour.
describe('computePRsPerWeek', () => {
  test('no sets gives a zero-filled week array sized to the window', () => {
    expect(computePRsPerWeek([], {}, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
    expect(computePRsPerWeek([], {}, 7, NOW)).toEqual([0]);
  });

  // C6 P11-2 (D97-18) re-anchor, CORRECTED meaning: the old pin asserted
  // that a single (first-ever) set counts as a record - the exact claim
  // FQ-7 exists to prevent. The first qualifying exposure is a BASELINE;
  // only a later set that beats it is a record.
  test('a first-ever set is a baseline, never a record (FQ-7)', () => {
    const sets = [{ exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW }];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
  });

  test('a later set beating the baseline lands in the most recent week slot', () => {
    const sets = [
      { exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW - 10 * DAY },
      { exerciseId: 'e1', weight: 105, actualReps: 5, createdAt: NOW },
    ];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 1]);
  });

  test('warm-ups, cluster rows and non-weight exercises never produce record events', () => {
    const sets = [
      { exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW - 10 * DAY },
      { exerciseId: 'e1', weight: 120, actualReps: 5, createdAt: NOW, setType: 'warmup' },
      { exerciseId: 'e1', weight: 60, actualReps: 27, createdAt: NOW, setType: 'myo_reps' },
      { exerciseId: 'run', weight: 5000, actualReps: 1, createdAt: NOW },
      { exerciseId: 'run', weight: 6000, actualReps: 1, createdAt: NOW },
    ];
    const map = { run: { type: 'distance' } };
    expect(computePRsPerWeek(sets, map, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
  });

  test('a best set entirely outside the window is not counted', () => {
    const sets = [
      { exerciseId: 'e1', weight: 90, actualReps: 5, createdAt: NOW - 50 * DAY },
      { exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW - 40 * DAY },
    ];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
  });

  test('only sets that beat the running max count, and old maxes still carry forward', () => {
    const sets = [
      // Pre-window heavy set sets the running max but is not itself recorded.
      { exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW - 40 * DAY },
      // In-window set that does NOT beat it: no new PR.
      { exerciseId: 'e1', weight: 90, actualReps: 5, createdAt: NOW - 10 * DAY },
      // In-window set that beats it: one PR, this week.
      { exerciseId: 'e1', weight: 110, actualReps: 5, createdAt: NOW },
    ];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 1]);
  });

  test('zero-weight or zero-rep sets are ignored', () => {
    const sets = [
      { exerciseId: 'e1', weight: 0, actualReps: 5, createdAt: NOW },
      { exerciseId: 'e1', weight: 100, actualReps: 0, createdAt: NOW },
    ];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('useProgressData auth boundary', () => {
  test('no signed-in user exits loading without touching progress loaders', async () => {
    const { ref, tree } = await renderProgressHook();

    expect(ref.current.loading).toBe(false);
    expect(ref.current.hasData).toBe(false);
    expect(ref.current.completedWorkoutCount).toBe(0);
    expect(database.getAllWorkouts).not.toHaveBeenCalled();

    act(() => { tree.unmount(); });
  });

  test('signing out clears user-scoped progress state from an already-loaded hook', async () => {
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([
      { id: 'w1', isCompleted: true, startedAt: NOW },
    ]);
    database.getCompletedWorkoutSets.mockResolvedValue([
      { id: 's1', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW },
    ]);
    database.getAllExercises.mockResolvedValue([
      { id: 'e1', primaryMuscle: 'chest' },
    ]);

    const { ref, tree } = await renderProgressHook();
    expect(ref.current.hasData).toBe(true);
    expect(ref.current.completedWorkoutCount).toBe(1);

    await act(async () => { useAppStore.setState({ user: null }); });
    await flush();

    expect(ref.current.loading).toBe(false);
    expect(ref.current.hasData).toBe(false);
    expect(ref.current.allSets).toEqual([]);
    expect(ref.current.exerciseMap).toEqual({});
    expect(ref.current.completedWorkoutCount).toBe(0);
    expect(database.getAllWorkouts).toHaveBeenCalledTimes(1);

    act(() => { tree.unmount(); });
  });

  test('a delayed signed-in load cannot repopulate progress data after sign-out', async () => {
    const workouts = deferred();
    const sets = deferred();
    const exercises = deferred();
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockReturnValueOnce(workouts.promise);
    database.getCompletedWorkoutSets.mockReturnValueOnce(sets.promise);
    database.getAllExercises.mockReturnValueOnce(exercises.promise);

    const { ref, tree } = await renderProgressHook();
    expect(ref.current.loading).toBe(true);
    expect(database.getAllWorkouts).toHaveBeenCalledWith('u1');

    await act(async () => { useAppStore.setState({ user: null }); });
    await flush();
    expect(ref.current.loading).toBe(false);
    expect(ref.current.hasData).toBe(false);

    await act(async () => {
      workouts.resolve([{ id: 'w1', isCompleted: true, startedAt: NOW }]);
      sets.resolve([{ id: 's1', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW }]);
      exercises.resolve([{ id: 'e1', primaryMuscle: 'chest' }]);
    });
    await flush();

    expect(ref.current.loading).toBe(false);
    expect(ref.current.hasData).toBe(false);
    expect(ref.current.allSets).toEqual([]);
    expect(ref.current.exerciseMap).toEqual({});
    expect(ref.current.completedWorkoutCount).toBe(0);

    act(() => { tree.unmount(); });
  });

  test('a primary progress read failure surfaces loadError instead of empty data', async () => {
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockRejectedValueOnce(new Error('offline'));

    const { ref, tree } = await renderProgressHook();

    expect(ref.current.loading).toBe(false);
    expect(ref.current.loadError).toBe(true);
    expect(ref.current.hasData).toBe(false);
    expect(ref.current.allSets).toEqual([]);
    expect(ref.current.completedWorkoutCount).toBe(0);

    act(() => { tree.unmount(); });
  });
});

// Progress-tab audit 2026-09-24 (F4/F5, D200 item 3, S6-5), lane E. The plan
// card's sparkline and the workload (ACWR) card now read ONE Monday-anchored
// weekly tonnage series (src/lib/trainingLoad.js) instead of two disagreeing
// rolling-7-day bucketings, and that series threads the real exercise-type
// map through calculateTonnage so a distance/duration set's metres/seconds
// never enter the kg totals.
describe('useProgressData: shared Monday-anchored load series (F4/F5/S6-5)', () => {
  const EXERCISES = [
    { id: 'e1', primaryMuscle: 'chest', exerciseType: 'weight_reps' },
    { id: 'run', primaryMuscle: 'legs', exerciseType: 'distance' },
  ];

  // Unlike computePRsPerWeek (which takes `now` as an explicit parameter),
  // the hook's own week-bucketing (trainingLoad.js's mondayWeekLoadSeries,
  // loadSessionDurationTrend) reads the real wall clock. Pin it to the
  // file's fixed NOW so "this week" in the fixtures below means the same
  // thing here as it does everywhere else in this file.
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(NOW);
  });
  afterEach(() => { jest.useRealTimers(); });

  function setUp(sets) {
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([{ id: 'w1', isCompleted: true, startedAt: NOW }]);
    database.getCompletedWorkoutSets.mockResolvedValue(sets);
    database.getAllExercises.mockResolvedValue(EXERCISES);
  }

  test('the sparkline\'s last bar and the workload card\'s acute figure are the identical number', async () => {
    const weekStart = localWeekStartMs(NOW);
    setUp([
      { id: 's0', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart + DAY }, // this week
      { id: 's1', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart - WEEK + DAY }, // 1 week ago
      { id: 's2', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart - 2 * WEEK + DAY }, // 2 weeks ago
    ]);

    const { ref, tree } = await renderProgressHook();

    expect(ref.current.mesoTonnage).toHaveLength(4);
    expect(ref.current.mesoTonnage.map((b) => b.label)).toEqual(['-3w', '-2w', '-1w', 'Now']);
    const lastBar = ref.current.mesoTonnage[3];
    expect(lastBar.value).toBe(500); // 100kg x 5

    expect(ref.current.workloadData).toEqual({ acute: 500, chronic: 500, ratio: 1, weeksOfData: 2 });
    // The invariant F5 exists to guarantee: the sparkline's "Now" bar and
    // the workload card's acute figure are the same number, not two
    // independently-derived ones.
    expect(ref.current.workloadData.acute).toBe(lastBar.value);

    act(() => { tree.unmount(); });
  });

  test('Monday anchoring: a set one millisecond before Monday 00:00 lands in the PRIOR week, not "Now"', async () => {
    const weekStart = localWeekStartMs(NOW);
    setUp([
      { id: 'sBefore', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart - 1 },
    ]);

    const { ref, tree } = await renderProgressHook();

    const lastBar = ref.current.mesoTonnage[3];
    expect(lastBar.label).toBe('Now');
    expect(lastBar.value).toBe(0);

    act(() => { tree.unmount(); });
  });

  test('S6-5: a distance exercise\'s metres/seconds never enter the sparkline or workload kg totals', async () => {
    const weekStart = localWeekStartMs(NOW);
    setUp([
      { id: 'sRun', workoutId: 'w1', exerciseId: 'run', weight: 5000, actualReps: 1, createdAt: weekStart + DAY }, // a 5km run
      { id: 'sLift', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart + DAY },
    ]);

    const { ref, tree } = await renderProgressHook();

    const lastBar = ref.current.mesoTonnage[3];
    // Only the real lift's tonnage (500 kg) counts; the run's 5000 "kg"
    // (really 5000 metres) must not be summed in.
    expect(lastBar.value).toBe(500);

    act(() => { tree.unmount(); });
  });

  test('the session length trend buckets on six Monday-anchored weeks (W1..W5, Now)', async () => {
    const weekStart = localWeekStartMs(NOW);
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([
      { id: 'w1', isCompleted: true, startedAt: weekStart + DAY, durationMinutes: 40 },
      { id: 'w2', isCompleted: true, startedAt: weekStart - WEEK + DAY, durationMinutes: 50 },
      { id: 'w3', isCompleted: true, startedAt: weekStart - 4 * WEEK + DAY, durationMinutes: 60 },
    ]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getAllExercises.mockResolvedValue([]);

    const { ref, tree } = await renderProgressHook();

    expect(ref.current.durationBars).toHaveLength(6);
    expect(ref.current.durationBars.map((b) => b.weekLabel)).toEqual(['W1', 'W2', 'W3', 'W4', 'W5', 'Now']);
    expect(ref.current.durationBars[5]).toMatchObject({ avgMin: 40, sessionCount: 1 }); // Now
    expect(ref.current.durationBars[4]).toMatchObject({ avgMin: 50, sessionCount: 1 }); // W5, 1 week ago
    expect(ref.current.durationBars[1]).toMatchObject({ avgMin: 60, sessionCount: 1 }); // W2, 4 weeks ago

    act(() => { tree.unmount(); });
  });
});
