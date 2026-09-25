/**
 * ConsistencyScreen.workloadOrder.test.js
 *
 * Progress-tab audit 2026-09-24 (F5, D200 item 4), lane E ruling 4:
 * WorkloadCard now renders directly beneath the plan card (MesocyclePulseCard),
 * before FatigueTrendCard, so the picture (the sparkline) and its explanation
 * (this card) are adjacent. Everything else keeps its existing order --
 * ReadinessCards (Recovery signals, landed by lane D) stays where it was,
 * after the whole training-block group.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

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
  const { Text: RNText } = require('react-native');
  return ({ children }) => <RNText>{children}</RNText>;
});
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
jest.mock('../../components/BlockShapeCard', () => () => null);
jest.mock('../../components/BlockProgressCard', () => {
  const { Text: RNText } = require('react-native');
  return () => <RNText>BLOCK_PROGRESS_CARD</RNText>;
});
jest.mock('../../components/FatigueTrendCard', () => {
  const { Text: RNText } = require('react-native');
  return () => <RNText>FATIGUE_CARD</RNText>;
});
jest.mock('../../components/ReadinessCards', () => {
  const { Text: RNText } = require('react-native');
  return () => <RNText>READINESS_CARD</RNText>;
});
jest.mock('../../components/ProgressSections', () => {
  const { Text: RNText } = require('react-native');
  return {
    MesocyclePulseCard: () => <RNText>MESO_CARD</RNText>,
    WorkloadCard: ({ data }) => (data ? <RNText>WORKLOAD_CARD</RNText> : null),
    SessionDurationChart: () => <RNText>DURATION_CARD</RNText>,
    MuscleFrequencyTable: () => <RNText>FREQ_TABLE</RNText>,
    TrainingCalendar: () => <RNText>CALENDAR</RNText>,
  };
});

import ConsistencyScreen from '../ConsistencyScreen';

const baseProgress = {
  activeMeso: { name: 'Push Pull Legs', durationWeeks: 6 },
  mesoTonnage: [{ value: 500, label: 'Now', color: '#f00' }],
  mesoProgress: () => 0.3,
  mesoCurrentWeek: () => 2,
  fatigueSessions: [],
  blockProgress: [],
  currentMesoWeek: { weekIndex: 2, plannedWeeks: 6, isDeload: false },
  deloadAlert: null,
  workloadData: { acute: 500, chronic: 400, ratio: 1.25, weeksOfData: 2 },
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

function orderedMarkers(tree) {
  const wanted = new Set(['MESO_CARD', 'WORKLOAD_CARD', 'FATIGUE_CARD', 'BLOCK_PROGRESS_CARD', 'READINESS_CARD']);
  return tree.root
    .findAllByType(Text)
    .map((n) => [].concat(n.props.children).join(''))
    .filter((t) => wanted.has(t));
}

function render() {
  let tree;
  act(() => {
    tree = create(<ConsistencyScreen navigation={{ navigate: jest.fn() }} />);
  });
  return tree;
}

describe('ConsistencyScreen render order: WorkloadCard sits directly after MesocyclePulseCard', () => {
  beforeEach(() => {
    mockProgressState = { ...baseProgress };
  });

  test('order is MESO_CARD, WORKLOAD_CARD, FATIGUE_CARD, BLOCK_PROGRESS_CARD, then READINESS_CARD', () => {
    const tree = render();
    expect(orderedMarkers(tree)).toEqual([
      'MESO_CARD', 'WORKLOAD_CARD', 'FATIGUE_CARD', 'BLOCK_PROGRESS_CARD', 'READINESS_CARD',
    ]);
  });

  test('with no workload data yet, the order simply skips it (still MESO_CARD then FATIGUE_CARD)', () => {
    mockProgressState = { ...baseProgress, workloadData: null };
    const tree = render();
    expect(orderedMarkers(tree)).toEqual(['MESO_CARD', 'FATIGUE_CARD', 'BLOCK_PROGRESS_CARD', 'READINESS_CARD']);
  });

  test('with a null ratio (not enough weeks of data yet), WorkloadCard is withheld the same way', () => {
    mockProgressState = { ...baseProgress, workloadData: { acute: 0, chronic: 100, ratio: null, weeksOfData: 2 } };
    const tree = render();
    // WorkloadCard itself would return null for this shape too (belt and
    // braces: the screen's own gate already excludes it before the card
    // ever gets to decide).
    expect(orderedMarkers(tree)).not.toContain('WORKLOAD_CARD');
    expect(orderedMarkers(tree)).toEqual(['MESO_CARD', 'FATIGUE_CARD', 'BLOCK_PROGRESS_CARD', 'READINESS_CARD']);
  });
});
