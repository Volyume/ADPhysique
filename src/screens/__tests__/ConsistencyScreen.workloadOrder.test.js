/**
 * ConsistencyScreen.workloadOrder.test.js
 *
 * Progress-tab audit 2026-09-24 (F5, D200 item 4), lane E ruling 4 put the
 * workload card directly beneath the plan card, so the picture (the sparkline)
 * and its explanation (the ratio card) were adjacent.
 *
 * RE-ANCHORED under D214 (Consistency elevation, lane 4; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3, CS-6): the sparkline, the plan card and the
 * ratio card are collapsed into the ONE block card and the ONE load card, so
 * "adjacent" is no longer a question. What this pins now is the plan's order,
 * with the load once, after the plan rows and before the sessions line, and the
 * load card withheld when there is nothing lifted to show:
 *   plan week, last 12 weeks (grid, milestone), block, plan rows, load,
 *   sessions line.
 * The child cards are stubbed to markers; their words are pinned in
 * ConsistencyScreen.d214.test.js and ProgressSections.workloadCopy.test.js.
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
    units: 'kg',
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
jest.mock('../../components/PlanWeekCard', () => {
  const { Text: RNText } = require('react-native');
  return () => <RNText>PLAN_WEEK_CARD</RNText>;
});
jest.mock('../../components/BlockProgressCard', () => {
  const { Text: RNText } = require('react-native');
  return () => <RNText>BLOCK_PROGRESS_CARD</RNText>;
});
jest.mock('../../components/ReadinessCards', () => {
  const { Text: RNText } = require('react-native');
  return () => <RNText>MILESTONE</RNText>;
});
jest.mock('../../components/ProgressSections', () => {
  const { Text: RNText } = require('react-native');
  return {
    BlockCard: () => <RNText>BLOCK_CARD</RNText>,
    LoadCard: ({ bars }) => (bars && bars.length ? <RNText>LOAD_CARD</RNText> : null),
    TrainingDaysSection: () => <RNText>GRID</RNText>,
    typicalSessionsLine: (m) => (m ? `Sessions usually last about ${m} minutes.` : null),
  };
});

import ConsistencyScreen from '../ConsistencyScreen';

const baseProgress = {
  activeMeso: { name: 'Push Pull Legs', durationWeeks: 6 },
  mesoTonnage: [{ value: 500, label: 'Now' }],
  workloadData: { acute: 500, chronic: 400, ratio: 1.25, weeksOfData: 2 },
  loadComparison: { current: 500, expected: 400, ratio: 1.25, comparison: 'in_line', weeksOfData: 2 },
  position: null,
  blockProgress: [{ muscle: 'chest', label: 'Chest', actual: 1, planned: 12 }],
  currentMesoWeek: { weekIndex: 2, plannedWeeks: 6, isDeload: false },
  deloadAlert: null,
  calValues: [],
  earliestWorkoutAt: null,
  typicalSessionMinutes: 57,
  allSets: [],
  refreshing: false,
  loading: false,
  loadError: false,
  hasData: true,
  handleRefresh: jest.fn(),
};

const WANTED = new Set([
  'PLAN_WEEK_CARD', 'GRID', 'MILESTONE', 'BLOCK_CARD', 'BLOCK_PROGRESS_CARD', 'LOAD_CARD',
  'Sessions usually last about 57 minutes.',
]);

function orderedMarkers(tree) {
  return tree.root
    .findAllByType(Text)
    .map((n) => [].concat(n.props.children).join(''))
    .filter((t) => WANTED.has(t));
}

function render() {
  let tree;
  act(() => {
    tree = create(<ConsistencyScreen navigation={{ navigate: jest.fn() }} />);
  });
  return tree;
}

describe('ConsistencyScreen render order (D214, 7.3)', () => {
  beforeEach(() => {
    mockProgressState = { ...baseProgress };
  });

  test('order is the plan week, the grid, the milestone, the block, the plan rows, the load, then the sessions line', () => {
    expect(orderedMarkers(render())).toEqual([
      'PLAN_WEEK_CARD', 'GRID', 'MILESTONE', 'BLOCK_CARD', 'BLOCK_PROGRESS_CARD', 'LOAD_CARD',
      'Sessions usually last about 57 minutes.',
    ]);
  });

  test('there is exactly ONE load card, and no ratio card beside it (CS-6)', () => {
    expect(orderedMarkers(render()).filter((m) => m === 'LOAD_CARD')).toHaveLength(1);
  });

  test('with nothing lifted in the four weeks the load card is withheld and the rest keeps its order', () => {
    mockProgressState = { ...baseProgress, mesoTonnage: [], workloadData: null, loadComparison: null };
    expect(orderedMarkers(render())).toEqual([
      'PLAN_WEEK_CARD', 'GRID', 'MILESTONE', 'BLOCK_CARD', 'BLOCK_PROGRESS_CARD',
      'Sessions usually last about 57 minutes.',
    ]);
  });

  test('with no planned rows the plan rows are withheld, with no typical session length that line is', () => {
    mockProgressState = { ...baseProgress, blockProgress: [], typicalSessionMinutes: null };
    expect(orderedMarkers(render())).toEqual(['PLAN_WEEK_CARD', 'GRID', 'MILESTONE', 'BLOCK_CARD', 'LOAD_CARD']);
  });
});
