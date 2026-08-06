/**
 * WorkoutHistoryScreen.repeatAsIs.test.js
 *
 * T3 (docs/audit/comprehension-trust-audit-2026-08-06.md): "Repeat as-is"
 * on a workout with no routineId used to open an EMPTY session - the
 * routine branch built initialExercises, but the freeform branch the
 * screen's own comment promised was never implemented. Pins the fix: a
 * routine-less repeat rebuilds initialExercises from the ORIGINAL
 * session's logged sets, grouped by exercise in first-seen order, each
 * entry carrying the working-set count as routineExercise.recommendedSets
 * (the same field ActiveWorkoutScreen's target-sets chain reads,
 * database.js's getRoutineExercisesWithDetails / useAppStore.js's
 * startWorkout->withSetsArrays contract).
 */
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
const mockPeekOpen = jest.fn();
jest.mock('../../components/PeekMenu', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ open: mockPeekOpen }));
    return null;
  });
});
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
// No local @shopify/flash-list mock: the global moduleNameMapper mock
// (__mocks__/shopify-flash-list.js) maps FlashList to react-native's real
// FlatList, which DOES render renderItem for each data row - needed here
// since the "Repeat workout" button lives inside a row. Matches
// screen-mount.test.js's convention for this same screen.
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
const mockStartWorkout = jest.fn();
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' },
    startWorkout: mockStartWorkout,
    session: null,
    units: 'kg',
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

import { create, act } from 'react-test-renderer';
import { FlatList } from 'react-native';
import WorkoutHistoryScreen from '../WorkoutHistoryScreen';
import {
  getRecentCompletedWorkouts, getWorkoutSetsForWorkoutIds, getAllExercises,
  createWorkout, getWorkoutSetsForWorkout,
} from '../../lib/database';
import { navigateCrossTab } from '../../navigation/navigateCrossTab';

const EXERCISES = [
  { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest' },
  { id: 'ex-row', name: 'Barbell Row', primaryMuscle: 'back' },
];

const FREEFORM_WORKOUT = {
  id: 'w1', userId: 'u1', startedAt: Date.now() - 3600000, endedAt: Date.now(),
  isCompleted: true, name: 'Freeform Session',
  // No routineId: this is the fallback branch under test.
};

// First-seen order: ex-bench, then ex-row. ex-bench has 1 warmup + 2 working
// sets (recommendedSets should be 2, warmup excluded); ex-row has 1 working
// set (recommendedSets 1).
const ORIGINAL_SETS = [
  { id: 's1', workoutId: 'w1', exerciseId: 'ex-bench', setType: 'warmup', weight: 40, actualReps: 10 },
  { id: 's2', workoutId: 'w1', exerciseId: 'ex-bench', setType: 'straight', weight: 80, actualReps: 8 },
  { id: 's3', workoutId: 'w1', exerciseId: 'ex-bench', setType: 'straight', weight: 82.5, actualReps: 6 },
  { id: 's4', workoutId: 'w1', exerciseId: 'ex-row', setType: 'straight', weight: 60, actualReps: 10 },
];

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('WorkoutHistoryScreen repeat-as-is on a routine-less session (T3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRecentCompletedWorkouts.mockResolvedValue([FREEFORM_WORKOUT]);
    getWorkoutSetsForWorkoutIds.mockResolvedValue(ORIGINAL_SETS);
    getAllExercises.mockResolvedValue(EXERCISES);
    getWorkoutSetsForWorkout.mockResolvedValue(ORIGINAL_SETS);
    createWorkout.mockResolvedValue({ id: 'new-w1', userId: 'u1' });
  });

  test('passes a non-empty initialExercises built from the logged sets, grouped by exercise in first-seen order, with recommendedSets set from the working-set count', async () => {
    let tree;
    await act(async () => {
      tree = create(<WorkoutHistoryScreen navigation={{ navigate: jest.fn() }} />);
    });
    await flush();

    // The global @shopify/flash-list mock maps FlashList -> react-native's
    // real FlatList, which in this test renderer does not render its rows
    // (virtualization never measures layout), so the "Repeat workout"
    // button is never in the mounted tree to find directly. Pull the
    // screen's own renderItem straight off the FlatList element instead
    // (same real closure the list would have called) and mount its output
    // standalone - the row's handlers are the real ones either way.
    const list = tree.root.findByType(FlatList);
    expect(list.props.data.length).toBe(1);
    const rowElement = list.props.renderItem({ item: list.props.data[0], index: 0 });
    let rowTree;
    await act(async () => { rowTree = create(rowElement); });

    // Open the repeat menu (PeekMenu is mocked; capture what it was asked
    // to open with) then invoke the "Repeat as-is" item's onPress directly,
    // the same as a real tap through the peek sheet would.
    const repeatBtn = rowTree.root.findByProps({ accessibilityLabel: 'Repeat workout' });
    await act(async () => { repeatBtn.props.onPress(); });

    expect(mockPeekOpen).toHaveBeenCalledTimes(1);
    const config = mockPeekOpen.mock.calls[0][0];
    const repeatAsIsItem = config.items.find((i) => i.label === 'Repeat as-is');
    expect(repeatAsIsItem).toBeTruthy();

    await act(async () => { await repeatAsIsItem.onPress(); });
    await flush();

    expect(createWorkout).toHaveBeenCalledWith('u1', null);
    expect(getWorkoutSetsForWorkout).toHaveBeenCalledWith('w1');

    expect(mockStartWorkout).toHaveBeenCalledTimes(1);
    const [newWorkoutArg, initialExercises] = mockStartWorkout.mock.calls[0];
    expect(newWorkoutArg).toEqual({ id: 'new-w1', userId: 'u1' });

    // The empty-session regression: this must be non-empty.
    expect(initialExercises.length).toBe(2);
    expect(initialExercises).toEqual([
      {
        exercise: EXERCISES[0],
        routineExercise: { recommendedSets: 2 },
        sets: [],
      },
      {
        exercise: EXERCISES[1],
        routineExercise: { recommendedSets: 1 },
        sets: [],
      },
    ]);

    expect(navigateCrossTab).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: expect.any(Function) }),
      'HomeTab',
      'ActiveWorkout',
    );
  });
});
