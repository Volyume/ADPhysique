import { create, act } from 'react-test-renderer';

jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/BackHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ title }) => React.createElement(Text, null, title);
});
jest.mock('../../components/PressableCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock('../../components/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock('../../components/Chip', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ label, onPress, accessibilityLabel, accessibilityRole }) => (
    React.createElement(
      TouchableOpacity,
      { onPress, accessibilityLabel, accessibilityRole },
      React.createElement(Text, null, label),
    )
  );
});
jest.mock('../../components/Button', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress, accessibilityLabel }) => (
    React.createElement(
      TouchableOpacity,
      { onPress, accessibilityLabel },
      React.createElement(Text, null, title),
    )
  );
});
jest.mock('../../components/Illustrations', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { EmptyWorkoutsIllustration: () => React.createElement(Text, null, 'empty illustration') };
});
jest.mock('../../components/Skeleton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { SkeletonRow: () => React.createElement(Text, null, 'loading row') };
});
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/AnimatedEntrance', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data = [], ListEmptyComponent, ListHeaderComponent, refreshControl }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(
      View,
      { refreshControl },
      ListHeaderComponent,
      data.length === 0 ? ListEmptyComponent : null,
    );
  },
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' },
    startWorkout: jest.fn(),
    session: null,
  })),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/database', () => ({
  getRecentCompletedWorkouts: jest.fn(),
  getWorkoutSetsForWorkoutIds: jest.fn(),
  getAllExercises: jest.fn(),
  createWorkout: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  deleteWorkoutAndSets: jest.fn(),
}));
jest.mock('../../lib/syncQueue', () => ({ enqueueSyncOp: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import WorkoutHistoryScreen, { formatHistoryExerciseSummary } from '../WorkoutHistoryScreen';
import { getRecentCompletedWorkouts, getWorkoutSetsForWorkoutIds, getAllExercises } from '../../lib/database';
import { logError } from '../../lib/errorLog';

const WORKOUT_HISTORY_SOURCE = require('fs').readFileSync(
  require('path').resolve(__dirname, '../WorkoutHistoryScreen.js'),
  'utf8',
);

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
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

describe('WorkoutHistoryScreen load states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows a retryable error instead of the empty state when workout history fails to load', async () => {
    getRecentCompletedWorkouts.mockRejectedValue(new Error('offline'));

    let tree;
    await act(async () => {
      tree = create(<WorkoutHistoryScreen navigation={{ navigate: jest.fn() }} />);
    });
    await flush();

    let text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load workout history");
    expect(text).toContain('Check your connection and try again.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('Your sessions will appear here');
    expect(logError).toHaveBeenCalledWith(
      'WorkoutHistoryScreen.loadWorkouts',
      expect.any(Error),
      { userId: 'u1' },
    );

    const retry = tree.root.findByProps({ accessibilityLabel: 'Try loading workout history again' });
    await act(async () => {
      retry.props.onPress();
    });
    await flush();

    expect(getRecentCompletedWorkouts).toHaveBeenCalledTimes(2);
    text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load workout history");
  });

  test('fetches sets for at most the 50 visible recent sessions', async () => {
    const workouts = Array.from({ length: 55 }, (_, index) => ({
      id: `w${index}`,
      userId: 'u1',
      startedAt: Date.now() - index * 3600000,
      endedAt: Date.now() - index * 3600000 + 1800000,
      isCompleted: true,
      name: `Session ${index}`,
    }));
    getRecentCompletedWorkouts.mockResolvedValue(workouts);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);

    await act(async () => {
      create(<WorkoutHistoryScreen navigation={{ navigate: jest.fn() }} />);
    });
    await flush();

    expect(getRecentCompletedWorkouts).toHaveBeenCalledWith('u1', 50);
    expect(getWorkoutSetsForWorkoutIds).toHaveBeenCalledWith(
      workouts.slice(0, 50).map(w => w.id),
    );
  });

  test('shows a filter-specific empty state when saved workouts are narrowed away', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([{
      id: 'leg-day',
      userId: 'u1',
      startedAt: Date.now(),
      endedAt: Date.now() + 1800000,
      isCompleted: true,
      name: 'Leg Day',
    }]);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);

    let tree;
    await act(async () => {
      tree = create(<WorkoutHistoryScreen navigation={{ navigate: jest.fn() }} />);
    });
    await flush();

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Filter: Upper' }).props.onPress();
    });

    let text = flattenText(tree.toJSON());
    expect(text).toContain('No upper sessions found');
    expect(text).toContain('Your workouts are still saved.');
    expect(text).toContain('Show all sessions');
    expect(text).not.toContain('Your sessions will appear here');

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Show all workout sessions' }).props.onPress();
    });

    text = flattenText(tree.toJSON());
    expect(text).toContain('1 session');
    expect(text).not.toContain('No upper sessions found');
  });

  test('ignores stale overlapping refresh results before fetching sets', async () => {
    const older = deferred();
    const newer = deferred();
    getRecentCompletedWorkouts
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    getAllExercises.mockResolvedValue([]);

    let tree;
    await act(async () => {
      tree = create(<WorkoutHistoryScreen navigation={{ navigate: jest.fn() }} />);
    });
    await flush();

    const list = tree.root.find((node) => node.props.refreshControl);
    let refreshPromise;
    await act(async () => {
      refreshPromise = list.props.refreshControl.props.onRefresh();
      await Promise.resolve();
    });
    expect(getRecentCompletedWorkouts).toHaveBeenCalledTimes(2);

    await act(async () => {
      older.resolve([{ id: 'old', userId: 'u1', startedAt: 1, endedAt: 2, isCompleted: true }]);
      await Promise.resolve();
    });
    await flush();

    expect(getWorkoutSetsForWorkoutIds).not.toHaveBeenCalled();
    expect(flattenText(tree.toJSON())).toContain('loading row');

    await act(async () => {
      newer.resolve([{ id: 'new', userId: 'u1', startedAt: 3, endedAt: 4, isCompleted: true }]);
      await refreshPromise;
    });
    await flush();

    expect(getWorkoutSetsForWorkoutIds).toHaveBeenCalledTimes(1);
    expect(getWorkoutSetsForWorkoutIds).toHaveBeenCalledWith(['new']);
  });
});

describe('WorkoutHistoryScreen summary polish', () => {
  test('expanded exercise summaries keep zero-load and bodyweight working sets readable', () => {
    expect(formatHistoryExerciseSummary([
      { setType: 'straight', weight: 0, actualReps: 10 },
      { setType: 'straight', weight: 0, actualReps: 8 },
    ])).toBe('2 × 0kg × 10, 8');

    expect(formatHistoryExerciseSummary([
      { setType: 'straight', weight: '', actualReps: 12 },
      { setType: 'straight', weight: null, actual_reps: 10 },
    ])).toBe('2 × bodyweight × 12, 10');
  });

  test('exercise-type summaries do not read distance or reps-only sets as kg lifts', () => {
    expect(formatHistoryExerciseSummary([
      { setType: 'straight', weight: 400, actualReps: 90 },
    ], 'distance')).toBe('1 working set - 400m · 1:30');

    expect(formatHistoryExerciseSummary([
      { setType: 'straight', weight: 0, actualReps: 12 },
    ], 'reps_only')).toBe('1 working set - 12 reps');
  });

  test('history cards expose expansion state and use one summary action label', () => {
    expect(WORKOUT_HISTORY_SOURCE).toContain('accessibilityState={{ expanded: isExpanded }}');
    expect(WORKOUT_HISTORY_SOURCE).toContain('Double-tap to show or hide the exercise breakdown');
    expect(WORKOUT_HISTORY_SOURCE).toContain('accessibilityLabel="View summary"');
    expect(WORKOUT_HISTORY_SOURCE).toContain('<Text style={styles.viewBtnText}>View summary</Text>');
    expect(WORKOUT_HISTORY_SOURCE).toContain('<Text style={styles.fullSummaryBtnText}>View summary</Text>');
    expect(WORKOUT_HISTORY_SOURCE).not.toContain('View Details');
    expect(WORKOUT_HISTORY_SOURCE).not.toContain('View full summary');
  });
});
