import { create, act } from 'react-test-renderer';

jest.mock('../../components/VolyumeChart', () => 'VolyumeChart');
jest.mock('../../components/WindowChips', () => 'WindowChips');
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: 'SkeletonCard' }));
jest.mock('../../components/AnimatedEntrance', () => 'AnimatedEntrance');
jest.mock('../../components/InfoTooltip', () => 'InfoTooltip');
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' },
    units: 'kg',
    accessibility: { reduceMotion: true },
  })),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/database', () => ({
  getExerciseById: jest.fn(),
  getWorkoutSetsForExercise: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseGoal: jest.fn(),
  saveExerciseGoal: jest.fn(),
  markGoalAchieved: jest.fn(),
  deleteExerciseGoal: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn() }));
jest.mock('../../lib/swapEngine', () => ({ rankSwaps: jest.fn(() => []) }));

import ExerciseDetailScreen from '../ExerciseDetailScreen';
import { getExerciseById } from '../../lib/database';

const EXERCISE_DETAIL_SOURCE = require('fs').readFileSync(
  require('path').resolve(__dirname, '../ExerciseDetailScreen.js'),
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

describe('ExerciseDetailScreen load states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows a retryable error when exercise details fail to load', async () => {
    getExerciseById.mockRejectedValueOnce(new Error('offline'));

    let tree;
    await act(async () => {
      tree = create(
        <ExerciseDetailScreen
          navigation={{ goBack: jest.fn(), push: jest.fn() }}
          route={{ params: { exerciseId: 'e1' } }}
        />,
      );
    });
    await flush();

    let text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load exercise details");
    expect(text).toContain('Check your connection and try again.');
    expect(text).toContain('Try again');

    getExerciseById.mockRejectedValueOnce(new Error('still offline'));
    const retry = tree.root.findByProps({ accessibilityLabel: 'Try loading exercise details again' });
    await act(async () => {
      retry.props.onPress();
    });
    await flush();

    expect(getExerciseById).toHaveBeenCalledTimes(2);
    text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load exercise details");
  });
});

describe('ExerciseDetailScreen polish guards', () => {
  // old -> new (design-usability-audit-2026-07-09 Batch 2 wave B, Button adoption):
  // "Set a target weight" / "Remove goal" were hand-rolled TouchableOpacity pills
  // (goalSetLink/removeGoalLink, contained neutral, not underlined links). They
  // now render through the shared Button primitive (variant="outline", which is
  // itself a contained neutral control: colors.surface fill, colors.border edge,
  // no underline) with the same icon/title/onPress. This guard is re-pointed at
  // the Button call sites to keep pinning "contained neutral, never underlined".
  test('goal actions use the shared Button (contained neutral) instead of underlined links', () => {
    expect(EXERCISE_DETAIL_SOURCE).toContain('title="Set a target weight"');
    expect(EXERCISE_DETAIL_SOURCE).toContain('title="Remove goal"');
    expect(EXERCISE_DETAIL_SOURCE).toMatch(/title="Set a target weight"[\s\S]*?icon="flag-outline"[\s\S]*?variant="outline"/);
    expect(EXERCISE_DETAIL_SOURCE).toMatch(/title="Remove goal"[\s\S]*?icon="trash-outline"[\s\S]*?variant="outline"/);
    expect(EXERCISE_DETAIL_SOURCE).not.toMatch(/goalSetLinkText|removeGoalLinkText/);
    expect(EXERCISE_DETAIL_SOURCE).not.toMatch(/textDecorationLine: 'underline'/);
  });
});
