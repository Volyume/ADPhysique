import { create, act } from 'react-test-renderer';
import useProgressData, { computePRsPerWeek } from '../useProgressData';
import useAppStore from '../../store/useAppStore';
import * as database from '../../lib/database';

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
  getAcuteChronicWorkload: jest.fn(),
  getRecentWorkoutFeedback: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getPlannedMuscleVolume: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
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
  database.getAcuteChronicWorkload.mockResolvedValue(null);
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

  test('a single best today lands in the most recent week slot', () => {
    const sets = [{ exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW }];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 1]);
  });

  test('a best set entirely outside the window is not counted', () => {
    const sets = [{ exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW - 40 * DAY }];
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
    expect(database.getAcuteChronicWorkload).not.toHaveBeenCalled();

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
