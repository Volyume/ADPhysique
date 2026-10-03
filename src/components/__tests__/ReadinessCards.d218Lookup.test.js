/**
 * ReadinessCards.d218Lookup.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), audit finding F-2 and the P5 row of its path table
 * (docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md).
 *
 * "Rate your last session" opens the WorkoutSummary of the latest completed
 * workout. Its route params were a third hand-copied builder that named
 * exercises through the FILTERED library (`getAllExercises`, which drops a
 * soft-deleted custom exercise), so a session whose exercises did not resolve
 * opened a summary that listed fewer names than History's card for the same
 * workout; the Recovery breakdown's per-session split read the same filtered
 * library, so a counted session on a deleted custom exercise could not be
 * split (the model counted it, the library could not name it). Pins, against
 * the REAL component:
 *  - the params it hands to onRateLastSession are exactly the shared session
 *    report's (`sessionSummaryParams`, the object History's "View summary"
 *    carries) plus `allowRating: true`, over the unfiltered, survivor-aware
 *    lookup (`getExerciseLookup`), never the filtered library;
 *  - the button still appears under exactly the conditions it did (no
 *    completed workout, or both post-session ratings already given: no
 *    button);
 *  - the breakdown's per-session split reads `lookup.rows`, the unfiltered
 *    population the recovery model counts, so a deleted custom exercise's
 *    sets are split into main and helper sets like any other.
 * Each test fails against the filtered-library code it replaces.
 */
import { create, act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily', WEEKLY: 'weekly', YEARLY: 'yearly', DATE: 'date', TIME_INTERVAL: 'timeInterval', CALENDAR: 'calendar',
  },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ accessibility: { reduceMotion: true } })),
}));
jest.mock('../AnimatedEntrance', () => ({ children }) => children);
jest.mock('../InfoTooltip', () => () => null);
jest.mock('../SectionLabel', () => {
  const { Text: RNText } = require('react-native');
  return ({ children }) => <RNText>{children}</RNText>;
});
jest.mock('../Button', () => {
  const { TouchableOpacity, Text: RNText } = require('react-native');
  return ({ title, onPress, accessibilityLabel }) => (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} onPress={onPress}>
      <RNText>{title}</RNText>
    </TouchableOpacity>
  );
});
jest.mock('../BodyDiagramHeatmap', () => () => null);
jest.mock('../FatigueTrendCard', () => () => null);
// The list is stubbed so the test can read the `sessionSplits` prop the
// component computes (buildMuscleSessionSplits stays real).
const mockListProps = { current: null };
jest.mock('../MuscleRecoveryList', () => {
  const actual = jest.requireActual('../MuscleRecoveryList');
  return {
    __esModule: true,
    ...actual,
    default: (props) => { mockListProps.current = props; return null; },
  };
});
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getLastTrainedPerMuscle: jest.fn(),
  getRecentCheckins: jest.fn(),
  getRecentCompletedWorkouts: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseLookup: jest.fn(),
}));
jest.mock('../../lib/programmePosition', () => ({ resolveProgrammePosition: jest.fn() }));
jest.mock('../../lib/recovery/load', () => ({
  loadMuscleRecovery: jest.fn(),
  loadPlannedSetsByRoutine: jest.fn(),
}));

import ReadinessCards from '../ReadinessCards';
import * as database from '../../lib/database';
import { resolveProgrammePosition } from '../../lib/programmePosition';
import { loadMuscleRecovery, loadPlannedSetsByRoutine } from '../../lib/recovery/load';
import { buildExerciseLookup } from '../../lib/exercise/lookup';
import { sessionSummaryParams } from '../../lib/sessionReport';
import { canonicalExerciseId } from '../../lib/exercise/canonicalId';

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;
const RETIRED_ID = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR_ID = canonicalExerciseId('Machine Lateral Raise');

const BENCH = {
  id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: [], exerciseType: 'weight_reps', loadSemantics: 'total',
};
const SURVIVOR = {
  id: SURVIVOR_ID, name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', secondaryMuscles: [], exerciseType: 'weight_reps', loadSemantics: 'total',
};
// A custom exercise the person deleted: the row stays (deleted_at set), the
// filtered library does not return it.
const DELETED_CUSTOM = {
  id: 'ex-custom-gone', name: 'Cable Crunch Pro', primaryMuscle: 'quads', secondaryMuscles: [],
  exerciseType: 'weight_reps', loadSemantics: 'total', isCustom: 1, deletedAt: 1700000000000,
};
const UNFILTERED = [BENCH, SURVIVOR, DELETED_CUSTOM];
const FILTERED = [BENCH, SURVIVOR];

async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<ReadinessCards userId="u1" {...props} />);
  });
  await flush();
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListProps.current = null;
  database.getAllWorkouts.mockResolvedValue([]);
  database.getCompletedWorkoutSets.mockResolvedValue([]);
  database.getLastTrainedPerMuscle.mockResolvedValue({});
  database.getRecentCheckins.mockResolvedValue([]);
  database.getRecentCompletedWorkouts.mockResolvedValue([]);
  database.getWorkoutSetsForWorkout.mockResolvedValue([]);
  database.getAllExercises.mockResolvedValue(FILTERED);
  database.getExerciseLookup.mockResolvedValue(buildExerciseLookup(UNFILTERED));
  resolveProgrammePosition.mockResolvedValue(null);
  loadMuscleRecovery.mockResolvedValue({ map: {}, nowMs: NOW, habitualWeekdays: null, typicalStartMinute: 1080 });
  loadPlannedSetsByRoutine.mockResolvedValue({});
});

describe('"Rate your last session" opens the shared session report (D218, F-2)', () => {
  const LAST_WORKOUT = {
    id: 'w-last', durationMinutes: 42, startedAt: NOW - 3600000, endedAt: NOW - 3000000,
    routineId: 'r1', routineName: 'Push Day', fatigueLevel: null, jointDiscomfort: 1,
  };
  // Logged order; the database returns the sets of one workout by set number.
  const LAST_SETS = [
    { id: 's1', workoutId: 'w-last', exerciseId: 'ex-bench', weight: 100, actualReps: 8, setType: 'straight', createdAt: NOW - 3500000 },
    { id: 's2', workoutId: 'w-last', exerciseId: 'ex-custom-gone', weight: 40, actualReps: 12, setType: 'straight', createdAt: NOW - 3400000 },
    { id: 's3', workoutId: 'w-last', exerciseId: RETIRED_ID, weight: 20, actualReps: 15, setType: 'straight', createdAt: NOW - 3300000 },
    { id: 's4', workoutId: 'w-last', exerciseId: SURVIVOR_ID, weight: 25, actualReps: 12, setType: 'warmup', createdAt: NOW - 3200000 },
    { id: 's5', workoutId: 'w-last', exerciseId: 'ex-unknown', exerciseName: 'Landmine Press', weight: 30, actualReps: 10, setType: 'straight', createdAt: NOW - 3100000 },
    { id: 's6', workoutId: 'w-last', exerciseId: 'ex-ghost', weight: 10, actualReps: 10, setType: 'straight', createdAt: NOW - 3000000 },
  ];

  test('the params are exactly sessionSummaryParams over the lookup, plus allowRating', async () => {
    database.getRecentCompletedWorkouts.mockResolvedValue([LAST_WORKOUT]);
    database.getWorkoutSetsForWorkout.mockResolvedValue(LAST_SETS);
    const onRateLastSession = jest.fn();
    const tree = await render({ onRateLastSession });
    const button = tree.root.findByProps({ accessibilityLabel: 'Rate your last session' });
    act(() => { button.props.onPress(); });

    const expected = { ...sessionSummaryParams(LAST_WORKOUT, LAST_SETS, buildExerciseLookup(UNFILTERED)), allowRating: true };
    // The deleted custom exercise and the retired id (with its survivor) and
    // the snapshot-only set are all named; the retired id and its survivor
    // are one exercise (5 in all).
    expect(expected.exerciseCount).toBe(5);
    expect(expected.exerciseNames).toEqual(['Bench Press', 'Cable Crunch Pro', 'Machine Lateral Raise', 'Landmine Press']);
    expect(onRateLastSession).toHaveBeenCalledTimes(1);
    expect(onRateLastSession.mock.calls[0][0]).toEqual(expected);
    // Read through the lookup, not the filtered library.
    expect(database.getExerciseLookup).toHaveBeenCalled();
    expect(database.getAllExercises).not.toHaveBeenCalled();
  });

  test('still no button when there is no completed workout, or both post-session ratings are already given', async () => {
    database.getRecentCompletedWorkouts.mockResolvedValue([]);
    let tree = await render();
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Rate your last session' })).toThrow();

    database.getRecentCompletedWorkouts.mockResolvedValue([{ ...LAST_WORKOUT, fatigueLevel: 2, jointDiscomfort: 1 }]);
    tree = await render();
    expect(() => tree.root.findByProps({ accessibilityLabel: 'Rate your last session' })).toThrow();
  });
});

describe('the Recovery breakdown split reads the unfiltered library rows (D218, F-2)', () => {
  const WORKOUT_ID = 'w-custom';
  const MAP = {
    quads: {
      muscle: 'quads', recoveredPercent: 64, status: 'recovering', readyAtMs: NOW + 2 * DAY_MS,
      lastSessionEndMs: NOW - 2 * DAY_MS, lastSessionSets: 3, basis: 'time_and_volume',
      // The model counted this session: 3 sets on the deleted custom exercise.
      contributingSessions: [{ workoutId: WORKOUT_ID, endMs: NOW - 2 * DAY_MS, sets: 3 }],
    },
  };
  const SETS = [1, 2, 3].map((n) => ({
    id: `c${n}`, workoutId: WORKOUT_ID, exerciseId: 'ex-custom-gone', weight: 40, actualReps: 12,
    setType: 'straight', createdAt: NOW - 2 * DAY_MS + n,
  }));

  beforeEach(() => {
    database.getCompletedWorkoutSets.mockResolvedValue(SETS);
    loadMuscleRecovery.mockResolvedValue({
      map: MAP, nowMs: NOW, recoveryRating: 'average', habitualWeekdays: null, typicalStartMinute: 1080,
    });
  });

  test('a counted session on a deleted custom exercise is split (3 main-mover sets), with no rate-last-session read before it', async () => {
    await render();
    expect(mockListProps.current).not.toBeNull();
    expect(mockListProps.current.sessionSplits).toEqual({ quads: { [WORKOUT_ID]: { main: 3, helped: 0 } } });
    expect(database.getAllExercises).not.toHaveBeenCalled();
  });

  test('the same split when the rate-last-session read already loaded the lookup', async () => {
    database.getRecentCompletedWorkouts.mockResolvedValue([{
      id: WORKOUT_ID, durationMinutes: 40, startedAt: NOW - 2 * DAY_MS, endedAt: NOW - 2 * DAY_MS + 2400000,
      fatigueLevel: 3, jointDiscomfort: 1,
    }]);
    database.getWorkoutSetsForWorkout.mockResolvedValue(SETS);
    await render();
    expect(mockListProps.current.sessionSplits).toEqual({ quads: { [WORKOUT_ID]: { main: 3, helped: 0 } } });
    expect(database.getAllExercises).not.toHaveBeenCalled();
    // One lookup read serves both uses.
    expect(database.getExerciseLookup).toHaveBeenCalledTimes(1);
  });
});
