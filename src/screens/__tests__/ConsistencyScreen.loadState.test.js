/**
 * ConsistencyScreen load states.
 *
 * RE-ANCHORED under D214 (Consistency elevation, lane 4; plan section 7.3 item
 * 10, CS-4, CS-15): the empty state's sentence no longer promises "rhythm,
 * recovery signals and load trends" (Recovery has its own screen since D208);
 * it reads "Once you finish a session, this page shows how often you train,
 * where you are in your block and the sets you do each week." A block with no
 * completed session is no longer invisible: the plan week and the block card
 * are drawn above the empty state. The children are stubbed to the new names
 * (their own words are pinned in ConsistencyScreen.d214.test.js and
 * ProgressSections.workloadCopy.test.js).
 */
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
jest.mock('../../components/BlockProgressCard', () => () => null);
jest.mock('../../components/BlockShapeCard', () => () => null);
jest.mock('../../components/ReadinessCards', () => () => null);
jest.mock('../../components/PlanWeekCard', () => {
  const { Text } = require('react-native');
  return () => <Text>PLAN_WEEK_CARD</Text>;
});
jest.mock('../../components/ProgressSections', () => {
  const { Text } = require('react-native');
  return {
    BlockCard: () => <Text>BLOCK_CARD</Text>,
    LoadCard: () => <Text>LOAD_CARD</Text>,
    TrainingDaysSection: () => <Text>GRID</Text>,
    typicalSessionsLine: () => null,
  };
});

import ConsistencyScreen from '../ConsistencyScreen';

const baseProgress = {
  activeMeso: null,
  mesoTonnage: [],
  workloadData: null,
  loadComparison: null,
  position: null,
  blockProgress: [],
  currentMesoWeek: null,
  deloadAlert: null,
  calValues: [],
  earliestWorkoutAt: null,
  typicalSessionMinutes: null,
  allSets: [],
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
    expect(text).toContain('Once you finish a session, this page shows how often you train, where you are in your block and the sets you do each week.');
    expect(text).not.toContain('Start a workout');
    expect(text).not.toContain("Couldn't load consistency");
    // CS-4: the old sentence promised what moved to Recovery (D208).
    expect(text).not.toMatch(/recovery signals|load trends|rhythm|This page fills in/);
  });

  test('a block with no completed session still shows the plan week and the block card (CS-15)', () => {
    const text = flattenText(render().toJSON());
    expect(text).toContain('PLAN_WEEK_CARD');
    expect(text).toContain('BLOCK_CARD');
    // Nothing that needs a session to mean anything is drawn.
    expect(text).not.toMatch(/GRID|LOAD_CARD/);
  });

  test('a read failure draws neither the plan week nor the empty state', () => {
    mockProgressState = { ...baseProgress, loadError: true, handleRefresh: jest.fn() };
    const text = flattenText(render().toJSON());
    expect(text).not.toMatch(/PLAN_WEEK_CARD|BLOCK_CARD|No consistency data yet/);
  });
});
