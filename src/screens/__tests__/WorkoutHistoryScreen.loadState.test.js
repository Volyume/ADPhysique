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
  const { Text } = require('react-native');
  return ({ label }) => React.createElement(Text, null, label);
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
  FlashList: ({ data = [], ListEmptyComponent }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null, data.length === 0 ? ListEmptyComponent : null);
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
  getAllWorkouts: jest.fn(),
  getWorkoutSetsForWorkoutIds: jest.fn(),
  getAllExercises: jest.fn(),
  createWorkout: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  deleteWorkoutAndSets: jest.fn(),
}));
jest.mock('../../lib/syncQueue', () => ({ enqueueSyncOp: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import WorkoutHistoryScreen from '../WorkoutHistoryScreen';
import { getAllWorkouts } from '../../lib/database';
import { logError } from '../../lib/errorLog';

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

describe('WorkoutHistoryScreen load states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows a retryable error instead of the empty state when workout history fails to load', async () => {
    getAllWorkouts.mockRejectedValue(new Error('offline'));

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

    expect(getAllWorkouts).toHaveBeenCalledTimes(2);
    text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load workout history");
  });
});
