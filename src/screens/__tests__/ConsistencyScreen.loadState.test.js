import { create, act } from 'react-test-renderer';

let mockProgressState;

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' },
    tier: 'pro',
    userProfile: { scoffScore: 0 },
    accessibility: { reduceMotion: true },
  })),
}));
jest.mock('../../hooks/useProgressData', () => ({
  __esModule: true,
  default: jest.fn(() => mockProgressState),
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/AnimatedEntrance', () => ({ children }) => children);
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});
jest.mock('../../components/EmptyState', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ title, text, actionLabel, onAction }) => (
    <View>
      <Text>{title}</Text>
      <Text>{text}</Text>
      {actionLabel ? (
        <TouchableOpacity accessibilityLabel={actionLabel} onPress={onAction}>
          <Text>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});
jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/SectionLabel', () => {
  const { Text } = require('react-native');
  return ({ children }) => <Text>{children}</Text>;
});
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
jest.mock('../../components/FatigueTrendCard', () => () => null);
jest.mock('../../components/BlockProgressCard', () => () => null);
jest.mock('../../components/BlockShapeCard', () => () => null);
jest.mock('../../components/ReadinessCards', () => () => null);
jest.mock('../../components/StreakWeeksSection', () => () => null);
jest.mock('../../components/ProgressSections', () => ({
  MesocyclePulseCard: () => null,
  WorkloadCard: () => null,
  SessionDurationChart: () => null,
  MuscleFrequencyTable: () => null,
  TrainingCalendar: () => null,
}));

import ConsistencyScreen from '../ConsistencyScreen';

const baseProgress = {
  activeMeso: null,
  mesoTonnage: [],
  mesoProgress: () => 0,
  mesoCurrentWeek: () => 1,
  fatigueSessions: [],
  blockProgress: [],
  currentMesoWeek: null,
  deloadAlert: null,
  workloadData: null,
  durationBars: [],
  muscleFreq: [],
  showAllMuscles: false,
  setShowAllMuscles: jest.fn(),
  calValues: [],
  enoughForTrends: false,
  refreshing: false,
  loading: false,
  loadError: false,
  hasData: false,
  handleRefresh: jest.fn(),
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function render() {
  let tree;
  act(() => {
    tree = create(<ConsistencyScreen navigation={{ navigate: jest.fn() }} />);
  });
  return tree;
}

describe('ConsistencyScreen load states', () => {
  beforeEach(() => {
    mockProgressState = { ...baseProgress, handleRefresh: jest.fn() };
  });

  test('shows a retryable read-error state instead of the first-session empty state', () => {
    mockProgressState = { ...baseProgress, loadError: true, handleRefresh: jest.fn() };

    const tree = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load consistency");
    expect(text).toContain('Your training history is safe.');
    expect(text).not.toContain('No consistency data yet');

    const retry = tree.root.findByProps({ accessibilityLabel: 'Try again' });
    act(() => { retry.props.onPress(); });
    expect(mockProgressState.handleRefresh).toHaveBeenCalledTimes(1);
  });

  test('keeps the genuine empty state after a successful empty read without sending users to Train', () => {
    const tree = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('No consistency data yet');
    expect(text).toContain('This page fills in after completed sessions');
    expect(text).not.toContain('Start a workout');
    expect(text).not.toContain("Couldn't load consistency");
  });
});
