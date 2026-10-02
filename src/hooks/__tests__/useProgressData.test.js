import { create, act } from 'react-test-renderer';
import useProgressData, { computePRsPerWeek } from '../useProgressData';
import useAppStore from '../../store/useAppStore';
import * as database from '../../lib/database';
import { localWeekStartMs } from '../../lib/dayKey';
import { resolveProgrammePosition } from '../../lib/programmePosition';

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
  getMesocycleWeekById: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
// D214 (lane 4): the hook now reads the programme position with the other
// loaders; its own tests live in programmePosition's suites, so it is stubbed.
jest.mock('../../lib/programmePosition', () => ({ resolveProgrammePosition: jest.fn() }));

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
  database.getMesocycleWeekById.mockResolvedValue(null);
  resolveProgrammePosition.mockResolvedValue(null);
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

  // RE-ANCHORED under D214 (Consistency elevation, lane 4; plan section 7.3
  // item 7, CS-11): the six-bar session length chart and its "getting shorter,
  // which might mean fatigue" line are gone (a state the person had not
  // reported was inferred from minutes), so the hook keeps ONE number, the
  // middle session length of the last six Monday weeks, which the screen prints
  // as "Sessions usually last about 57 minutes." The window is the chart's own
  // (five full weeks and this week so far), still on calendar weeks.
  test('typicalSessionMinutes is the median of the last six Monday weeks\' sessions (CS-11)', async () => {
    const weekStart = localWeekStartMs(NOW);
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([
      { id: 'w1', isCompleted: true, startedAt: weekStart + DAY, durationMinutes: 40 },
      { id: 'w2', isCompleted: true, startedAt: weekStart - WEEK + DAY, durationMinutes: 50 },
      { id: 'w3', isCompleted: true, startedAt: weekStart - 4 * WEEK + DAY, durationMinutes: 60 },
      // Outside the window (six weeks back is the seventh Monday week): ignored.
      { id: 'w4', isCompleted: true, startedAt: weekStart - 6 * WEEK + DAY, durationMinutes: 240 },
      // Not completed, or no recorded duration: ignored.
      { id: 'w5', isCompleted: false, startedAt: weekStart + DAY, durationMinutes: 300 },
      { id: 'w6', isCompleted: true, startedAt: weekStart - WEEK + 2 * DAY, durationMinutes: 0 },
    ]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getAllExercises.mockResolvedValue([]);

    const { ref, tree } = await renderProgressHook();

    expect(ref.current.typicalSessionMinutes).toBe(50); // median of 40, 50, 60
    expect(ref.current.durationBars).toBeUndefined();
    expect(ref.current.muscleFreq).toBeUndefined();
    expect(ref.current.fatigueSessions).toBeUndefined();

    act(() => { tree.unmount(); });
  });

  test('one session left running for hours does not drag the typical length (median, not mean)', async () => {
    const weekStart = localWeekStartMs(NOW);
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([
      { id: 'a', isCompleted: true, startedAt: weekStart + DAY, durationMinutes: 55 },
      { id: 'b', isCompleted: true, startedAt: weekStart - WEEK + DAY, durationMinutes: 57 },
      { id: 'c', isCompleted: true, startedAt: weekStart - 2 * WEEK + DAY, durationMinutes: 58 },
      { id: 'd', isCompleted: true, startedAt: weekStart - 3 * WEEK + DAY, durationMinutes: 59 },
      { id: 'e', isCompleted: true, startedAt: weekStart - 4 * WEEK + DAY, durationMinutes: 600 },
    ]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getAllExercises.mockResolvedValue([]);
    const { ref, tree } = await renderProgressHook();
    expect(ref.current.typicalSessionMinutes).toBe(58);
    act(() => { tree.unmount(); });
  });

  test('fewer than three sessions with a duration states nothing', async () => {
    const weekStart = localWeekStartMs(NOW);
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([
      { id: 'a', isCompleted: true, startedAt: weekStart + DAY, durationMinutes: 55 },
      { id: 'b', isCompleted: true, startedAt: weekStart - WEEK + DAY, durationMinutes: 57 },
    ]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getAllExercises.mockResolvedValue([]);
    const { ref, tree } = await renderProgressHook();
    expect(ref.current.typicalSessionMinutes).toBeNull();
    act(() => { tree.unmount(); });
  });

  // D214 (CS-6, B10): the load card's headline, its "this week so far" bar and
  // its comparison read ONE instant and one set of rows, so they are the same
  // number; the comparison is like for like, never a part week against full ones.
  test('the headline figure, the last bar and the comparison\'s current are the identical number (CS-6)', async () => {
    const weekStart = localWeekStartMs(NOW);
    setUp([
      { id: 's0', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart + 60 * 1000 },
      { id: 's1', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart - WEEK + 60 * 1000 },
      { id: 's2', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart - 2 * WEEK + 60 * 1000 },
      { id: 's3', workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: weekStart - 2 * WEEK + 5 * DAY },
    ]);
    const { ref, tree } = await renderProgressHook();
    const lastBar = ref.current.mesoTonnage[3];
    expect(lastBar.value).toBe(500);
    expect(ref.current.workloadData.acute).toBe(500);
    expect(ref.current.loadComparison.current).toBe(500);
    expect(ref.current.loadComparison.weeksOfData).toBe(2);
    // The bars carry no colour of their own any more (CS-19: amber on a fact).
    expect(ref.current.mesoTonnage.every((b) => b.color === undefined)).toBe(true);
    act(() => { tree.unmount(); });
  });

  test('a Wednesday-morning read compares Monday to Wednesday-morning of each previous week, never a full week (B10)', async () => {
    // Wed 10 Jun 2026, 10:00 local.
    const wed = new Date(2026, 5, 10, 10, 0, 0).getTime();
    jest.setSystemTime(wed);
    const monday = new Date(localWeekStartMs(wed));
    const at = (weeksBack, day, hour) => {
      const d = new Date(monday);
      d.setDate(d.getDate() - 7 * weeksBack + day);
      d.setHours(hour, 0, 0, 0);
      return d.getTime();
    };
    const lift = (id, when, reps) => ({ id, workoutId: 'w1', exerciseId: 'e1', weight: 100, actualReps: reps, createdAt: when });
    setUp([
      lift('c0', at(0, 0, 9), 10),                       // this week: Monday 09:00, 1,000 kg
      ...[1, 2, 3].flatMap((w) => [
        lift(`m${w}`, at(w, 0, 9), 10),                  // each previous week: 1,000 kg by Wednesday 10:00 ...
        lift(`s${w}`, at(w, 5, 11), 30),                 // ... and 3,000 kg more on its Saturday
      ]),
    ]);
    const { ref, tree } = await renderProgressHook();
    // The ratio card's arithmetic would read 1,000 against a 4,000 kg average: "below", by construction.
    expect(ref.current.workloadData.ratio).toBe(0.25);
    // The comparison the screen prints is like for like: 1,000 against 1,000.
    expect(ref.current.loadComparison).toMatchObject({ current: 1000, expected: 1000, ratio: 1, comparison: 'in_line', weeksOfData: 3 });
    act(() => { tree.unmount(); });
  });
});

// D214 (lane 4): the plan-week card and the block card read the programme
// position, so the hook reads it with the other loaders: `loading` covers it (the
// card never paints "no plan" and flips), a refresh reads it again, and a failed
// read is "no plan", never a guess.
describe('useProgressData: the programme position (D214, plan 7.3 item 2)', () => {
  const POSITION = { activeWeekIndex: 2, sessions: [{ state: 'completed' }], recoveryState: null };

  function setUpUser() {
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getAllExercises.mockResolvedValue([]);
  }

  test('the position is read for the signed-in user and returned with the rest', async () => {
    setUpUser();
    resolveProgrammePosition.mockResolvedValue(POSITION);
    const { ref, tree } = await renderProgressHook();
    expect(resolveProgrammePosition).toHaveBeenCalledWith('u1');
    expect(ref.current.position).toEqual(POSITION);
    expect(ref.current.loading).toBe(false);
    act(() => { tree.unmount(); });
  });

  test('a refresh reads it again', async () => {
    setUpUser();
    resolveProgrammePosition.mockResolvedValueOnce(POSITION).mockResolvedValueOnce({ ...POSITION, activeWeekIndex: 3 });
    const { ref, tree } = await renderProgressHook();
    expect(ref.current.position.activeWeekIndex).toBe(2);
    await act(async () => { await ref.current.handleRefresh(); });
    await flush();
    expect(resolveProgrammePosition).toHaveBeenCalledTimes(2);
    expect(ref.current.position.activeWeekIndex).toBe(3);
    act(() => { tree.unmount(); });
  });

  test('no block (null) and a thrown read both come back as null, with the screen still loaded', async () => {
    setUpUser();
    resolveProgrammePosition.mockResolvedValue(null);
    let r = await renderProgressHook();
    expect(r.ref.current.position).toBeNull();
    act(() => { r.tree.unmount(); });

    resolveProgrammePosition.mockRejectedValue(new Error('read failed'));
    r = await renderProgressHook();
    expect(r.ref.current.position).toBeNull();
    expect(r.ref.current.loadError).toBe(false);
    act(() => { r.tree.unmount(); });
  });

  test('signing out clears it', async () => {
    setUpUser();
    resolveProgrammePosition.mockResolvedValue(POSITION);
    const { ref, tree } = await renderProgressHook();
    expect(ref.current.position).toEqual(POSITION);
    await act(async () => { useAppStore.setState({ user: null }); });
    await flush();
    expect(ref.current.position).toBeNull();
    act(() => { tree.unmount(); });
  });

  test('lane 3\'s fields keep their names and shapes (add, never rename or remove)', async () => {
    setUpUser();
    const { ref, tree } = await renderProgressHook();
    for (const key of [
      'loading', 'refreshing', 'loadError', 'weeklyVolume', 'recentSessions', 'allSets', 'exerciseMap',
      'earliestWorkoutAt', 'completedWorkoutCount', 'currentMesoWeek', 'hasData', 'handleRefresh',
    ]) {
      expect(Object.keys(ref.current)).toContain(key);
    }
    expect(typeof ref.current.handleRefresh).toBe('function');
    expect(Array.isArray(ref.current.allSets)).toBe(true);
    act(() => { tree.unmount(); });
  });
});

// D214 addendum 6 (lane 4 review S1): the block week the screen prints its
// effort and plan rows for is the PROGRAMME's week when the position names
// one (the week the plan-week card and the block card name), with that
// week's own rep target and planned volume; the calendar row is the fallback.
describe('blockWeek: one week for the whole block card', () => {
  const calendarWeek = {
    id: 'cal6', weekRowId: 'cal6', weekIndex: 6, plannedWeeks: 6, isDeload: true, awaitingDecision: false,
    rirTarget: 4, blockStartMs: Date.now() - 36 * 86400000, deloadWeek: 6,
  };
  beforeEach(() => {
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue([{ id: 'w1', isCompleted: true, startedAt: Date.now() }]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    database.getAllExercises.mockResolvedValue([]);
    database.getCurrentMesocycleWeek.mockResolvedValue(calendarWeek);
    database.getPlannedMuscleVolume.mockResolvedValue([{ muscle: 'chest', planned_sets: 12 }]);
  });
  test('the programme holds week 5 while the calendar says the recovery week 6: the rows and the rep target are week 5\'s', async () => {
    resolveProgrammePosition.mockResolvedValue({
      activeWeekIndex: 5, activeWeekId: 'wk5', plannedWeeks: 6, sessions: [], nextSession: null, weekResolved: false,
      recoveryState: { state: 'normal_accumulation' },
    });
    database.getMesocycleWeekById.mockResolvedValue({ id: 'wk5', week_index: 5, rir_target: 1 });
    const { ref, tree } = await renderProgressHook();
    expect(ref.current.blockWeek).toEqual({ weekIndex: 5, weekId: 'wk5', rirTarget: 1, source: 'programme' });
    expect(database.getPlannedMuscleVolume).toHaveBeenCalledWith('wk5');
    expect(database.getPlannedMuscleVolume).not.toHaveBeenCalledWith('cal6');
    expect(database.getMesocycleWeekById).toHaveBeenCalledWith('wk5');
    // The calendar row still reaches the screen for what it owns (the finished state).
    expect(ref.current.currentMesoWeek.weekIndex).toBe(6);
    act(() => { tree.unmount(); });
  });
  test('the programme and the calendar agree: no second week-row read', async () => {
    resolveProgrammePosition.mockResolvedValue({
      activeWeekIndex: 6, activeWeekId: 'cal6', plannedWeeks: 6, sessions: [], nextSession: null, weekResolved: false,
      recoveryState: { state: 'planned_block_recovery' },
    });
    const { ref, tree } = await renderProgressHook();
    expect(ref.current.blockWeek).toEqual({ weekIndex: 6, weekId: 'cal6', rirTarget: 4, source: 'programme' });
    expect(database.getMesocycleWeekById).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });
  test('no position: the calendar row stands, named as such', async () => {
    resolveProgrammePosition.mockResolvedValue(null);
    const { ref, tree } = await renderProgressHook();
    expect(ref.current.blockWeek).toEqual({ weekIndex: 6, weekId: 'cal6', rirTarget: 4, source: 'calendar' });
    expect(database.getPlannedMuscleVolume).toHaveBeenCalledWith('cal6');
    act(() => { tree.unmount(); });
  });
});

// D214 addendum 9 (census 6.11): the hook's two session numbers, the Recaps
// count (`sessionCount`) and the Training row's gate (`completedWorkoutCount`),
// read ONE rule (src/lib/progress/sessionCount.js): a completed workout with a
// cached set count above zero or with set rows. They used to be the distinct
// workout ids among set rows and every completed workout with a start time.
describe('useProgressData: one session count (census 6.11)', () => {
  const wk = (id, over = {}) => ({ id, isCompleted: true, startedAt: NOW, ...over });
  const st = (id, workoutId) => ({ id, workoutId, exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW });

  async function counts(workouts, sets) {
    useAppStore.setState({ user: { id: 'u1' } });
    database.getAllWorkouts.mockResolvedValue(workouts);
    database.getCompletedWorkoutSets.mockResolvedValue(sets);
    database.getAllExercises.mockResolvedValue([{ id: 'e1', primaryMuscle: 'chest' }]);
    const { ref, tree } = await renderProgressHook();
    const out = { completed: ref.current.completedWorkoutCount, sessions: ref.current.sessionCount, enough: ref.current.enoughForTrends };
    act(() => { tree.unmount(); });
    return out;
  }

  test('a completed workout with sets: both numbers say 1', async () => {
    expect(await counts([wk('w1')], [st('s1', 'w1'), st('s2', 'w1')])).toMatchObject({ completed: 1, sessions: 1 });
  });

  test('(a) a cached set count with no set rows is a session in both numbers', async () => {
    expect(await counts([wk('w1', { setCount: 4 })], [])).toMatchObject({ completed: 1, sessions: 1 });
  });

  test('(b) a completed workout with no sets is no session in either number (the Training gate used to count it)', async () => {
    expect(await counts([wk('w1')], [])).toMatchObject({ completed: 0, sessions: 0 });
  });

  test('(c) set rows of a workout that is not in the list count for neither (the Recaps number used to count them)', async () => {
    expect(await counts([wk('w1')], [st('s1', 'w1'), st('s2', 'ghost')])).toMatchObject({ completed: 1, sessions: 1 });
  });

  test('the two numbers are always the same number, and trends open at three', async () => {
    const out = await counts(
      [wk('w1'), wk('w2'), wk('w3', { setCount: 2 }), wk('w4', { isCompleted: false })],
      [st('s1', 'w1'), st('s2', 'w2'), st('s3', 'w4')],
    );
    expect(out.completed).toBe(3);
    expect(out.sessions).toBe(out.completed);
    expect(out.enough).toBe(true);
  });
});
