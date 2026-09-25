/**
 * ConsistencyScreen.blockProgress.test.js
 *
 * End-to-end pin for progress-tab audit 2026-09-24 finding F2 (register
 * D199): the coverage gap the audit named as WHY the defect survived two
 * months was that no test ever drove real `getPlannedMuscleVolume` rows
 * through the real `useProgressData` hook into the real `BlockProgressCard`.
 * `BlockProgressCard.test.js` only ever fed the card hand-built
 * `{planned, actual}` fixtures; `ConsistencyScreen.loadState.test.js` mocks
 * `useProgressData` wholesale and never returns a planned row. This suite
 * mocks only the database layer (following that same file's mocking
 * pattern) and lets the real hook and the real card run, so the mapping
 * from RAW `planned_muscle_volume` rows to "<actual>/<planned>" is proven
 * for real, not by construction.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));
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
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllWorkouts: jest.fn(),
  getAllExercises: jest.fn(),
  getAllMesocycles: jest.fn(),
  getActivePlan: jest.fn(),
  getRecentWorkoutFeedback: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getPlannedMuscleVolume: jest.fn(),
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
jest.mock('../../components/FatigueTrendCard', () => () => null);
jest.mock('../../components/BlockShapeCard', () => () => null);
jest.mock('../../components/ReadinessCards', () => () => null);
jest.mock('../../components/ProgressSections', () => ({
  MesocyclePulseCard: () => null,
  WorkloadCard: () => null,
  SessionDurationChart: () => null,
  MuscleFrequencyTable: () => null,
  TrainingCalendar: () => null,
}));
// Deliberately NOT mocked: '../../components/BlockProgressCard'. It is the
// component under test end-to-end.

import ConsistencyScreen from '../ConsistencyScreen';
import * as database from '../../lib/database';

// Wed 7 Jan 2026, local midnight -- block week 1 spans [7 Jan 00:00, 14 Jan 00:00) local.
const BLOCK_START = new Date(2026, 0, 7).getTime();
const INSIDE_WEEK = new Date(2026, 0, 8, 10, 0, 0).getTime(); // Thu 8 Jan, inside week 1
const BEFORE_BLOCK = new Date(2026, 0, 5, 10, 0, 0).getTime(); // Mon 5 Jan, before the block started

const WEEK = {
  id: 'week-1', weekRowId: 'week-1', mesocycleId: 'meso-1', blockId: 'meso-1',
  weekIndex: 1, awaitingDecision: false, isDeload: false, deloadWeek: 6,
  recoveryState: null, rirTarget: 2, mesoName: 'Test Block',
  blockType: 'offseason_hypertrophy', plannedWeeks: 6, deloadProtocol: 'rp_classic',
  blockStartMs: BLOCK_START,
};

// RAW planned_muscle_volume rows, exactly as `SELECT * FROM
// planned_muscle_volume` returns them (database.js:6248-6259) -- no
// `planned`, `actual` or `label` field, which is the F2 contract mismatch.
const PLANNED_ROWS = [
  { id: 'pmv1', mesocycle_week_id: 'week-1', muscle: 'chest', planned_sets: 12, mev: 8, mav: 14, mrv: 20, source: 'template', created_at: 1, updated_at: 1 },
  { id: 'pmv2', mesocycle_week_id: 'week-1', muscle: 'back', planned_sets: 10, mev: 8, mav: 14, mrv: 20, source: 'template', created_at: 1, updated_at: 1 },
];

const EXERCISES = [{ id: 'ex1', primaryMuscle: 'chest', secondaryMuscles: [] }];

const SETS = [
  // Inside the block week: this one set must be counted for chest.
  { id: 's1', workoutId: 'w1', exerciseId: 'ex1', weight: 100, actualReps: 10, createdAt: INSIDE_WEEK },
  // Before the block started: must NOT be counted. If it leaked in, chest
  // would render "2/12" instead of "1/12".
  { id: 's2', workoutId: 'w0', exerciseId: 'ex1', weight: 100, actualReps: 10, createdAt: BEFORE_BLOCK },
];

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function render() {
  let tree;
  await act(async () => {
    tree = create(<ConsistencyScreen navigation={{ navigate: jest.fn() }} />);
  });
  await flush();
  return tree;
}

describe('ConsistencyScreen "This week\'s plan" card, real hook + real card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    database.getCompletedWorkoutSets.mockResolvedValue(SETS);
    database.getAllWorkouts.mockResolvedValue([]);
    database.getAllExercises.mockResolvedValue(EXERCISES);
    database.getAllMesocycles.mockResolvedValue([]);
    database.getActivePlan.mockResolvedValue(null);
    database.getRecentWorkoutFeedback.mockResolvedValue([]);
    database.getCurrentMesocycleWeek.mockResolvedValue(WEEK);
    database.getPlannedMuscleVolume.mockResolvedValue(PLANNED_ROWS);
  });

  test('renders the muscle label and "<actual>/<planned>" from raw planned rows, never a bare "/"', async () => {
    const tree = await render();
    const all = texts(tree);

    // The label and the correctly-mapped ratio for the muscle with a
    // logged, in-window set.
    expect(all).toContain('Chest');
    expect(all).toContain('1/12');

    // The set logged BEFORE the block started must not be counted.
    expect(all).not.toContain('2/12');

    // A muscle with a planned target but nothing logged this block week
    // still renders real numbers on both sides of the slash, not a blank.
    expect(all).toContain('0/10');

    // Source-level proof the old defect (BlockProgressCard.js:79's
    // `{p.actual}/{p.planned}` rendering `undefined` as nothing around the
    // slash) cannot recur. That row is JSX with three sibling children
    // (the actual value, the literal '/', the planned value), which
    // react-test-renderer keeps as a 3-element `props.children` array --
    // distinct from an ordinary single-string Text (e.g. the header's
    // "Effort 3/5"). Every such row must carry a real number on both sides.
    const setsRows = tree.root
      .findAllByType(Text)
      .filter((n) => Array.isArray(n.props.children) && n.props.children[1] === '/');
    expect(setsRows.length).toBe(2); // chest + back
    for (const row of setsRows) {
      const [actualValue, , plannedValue] = row.props.children;
      expect(String(actualValue)).toMatch(/^\d+$/);
      expect(String(plannedValue)).toMatch(/^\d+$/);
    }
  });
});
