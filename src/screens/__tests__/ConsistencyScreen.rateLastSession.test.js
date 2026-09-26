/**
 * ConsistencyScreen.rateLastSession.test.js
 *
 * Progress-tab audit 2026-09-24, F3 / P3(a) (D200-2). ReadinessCards stays
 * navigation-agnostic and calls back through `onRateLastSession(params)`;
 * this pins that ConsistencyScreen wires that callback to
 * `navigation.navigate('WorkoutSummary', params)`, passing the params
 * object through unchanged (the exact shape is ReadinessCards' own
 * contract, pinned separately in ReadinessCards.rateLastSession.test.js).
 * ReadinessCards itself is mocked to a stub that invokes the callback, in
 * the same style as ConsistencyScreen.loadState.test.js.
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
jest.mock('../../components/EmptyState', () => () => null);
jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/SectionLabel', () => {
  const { Text } = require('react-native');
  return ({ children }) => <Text>{children}</Text>;
});
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
jest.mock('../../components/FatigueTrendCard', () => () => null);
jest.mock('../../components/BlockProgressCard', () => () => null);
jest.mock('../../components/BlockShapeCard', () => () => null);
jest.mock('../../components/ProgressSections', () => ({
  MesocyclePulseCard: () => null,
  WorkloadCard: () => null,
  SessionDurationChart: () => null,
  MuscleFrequencyTable: () => null,
  TrainingCalendar: () => null,
}));
// Deliberately a stub, not `() => null`: it must expose the
// onRateLastSession callback ConsistencyScreen passes it, so this suite
// can press it and see where the screen navigates. Not the component
// under test here (that is ReadinessCards.rateLastSession.test.js).
// RE-ANCHORED 2026-09-26 (register D208, founder question "a place in
// Progress exclusively for recovery"): the Recovery section, and with it the
// rate-last-session control, moved to RecoveryScreen (its wiring is pinned in
// RecoveryScreen.rateLastSession.test.js). Consistency now mounts the
// milestone-only card, with no callback. The stub records its props.
let mockCardsProps = null;
jest.mock('../../components/ReadinessCards', () => {
  const { Text } = require('react-native');
  return function MockReadinessCards(props) {
    mockCardsProps = props;
    return <Text accessibilityLabel="mock-readiness-cards">mock ReadinessCards</Text>;
  };
});

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
  hasData: true,
  handleRefresh: jest.fn(),
};

function render(navigation) {
  let tree;
  act(() => { tree = create(<ConsistencyScreen navigation={navigation} />); });
  return tree;
}

describe('ConsistencyScreen mounts the milestone only (D208: the Recovery section moved)', () => {
  beforeEach(() => {
    mockProgressState = { ...baseProgress };
    mockCardsProps = null;
  });

  test('ReadinessCards is mounted for the milestone, with no rate-last-session callback', () => {
    const tree = render({ navigate: jest.fn() });
    tree.root.findByProps({ accessibilityLabel: 'mock-readiness-cards' });
    expect(mockCardsProps.sections).toBe('milestone');
    expect(mockCardsProps.onRateLastSession).toBeUndefined();
  });

  test('ReadinessCards is not mounted while the screen has no data yet', () => {
    mockProgressState = { ...baseProgress, hasData: false };
    const tree = render({ navigate: jest.fn() });
    expect(() => tree.root.findByProps({ accessibilityLabel: 'mock-readiness-cards' })).toThrow();
  });
});
