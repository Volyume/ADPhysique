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
// D36a (item 17 modal tails, 2026-07-10): the goal modal now renders
// through the shared BottomSheet, which calls useSafeAreaInsets itself --
// this override previously provided only SafeAreaView, matching the
// pre-migration screen's imports, so useSafeAreaInsets is added here to
// match the root __mocks__/react-native-safe-area-context.js shape.
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
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
import {
  getExerciseById, getWorkoutSetsForExercise, getExerciseGoal, getAllExercises,
} from '../../lib/database';

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

  // EP-20/UI-10 (Codex end-user-polish audit): getExerciseById/getWorkoutSets
  // ForExercise/getAllExercises are LOCAL SQLite reads (src/lib/database.js),
  // never a network call, so a failure here must never claim a connection
  // problem.
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
    expect(text).toContain("Couldn't load this on your device. Try again.");
    expect(text).not.toContain('Check your connection');
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

describe('ExerciseDetailScreen goal sheet reachability (D36a item 17 modal tails)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // The goal-setting modal migrated off a hand-rolled Modal onto the shared
  // BottomSheet (src/components/BottomSheet.js) as part of the D36a build.
  // This pins that the sheet is still reachable end to end after the
  // migration: tapping "Set a target weight" opens it, and its content
  // (title copy the old Modal also showed) actually renders.
  test('tapping "Set a target weight" opens the migrated goal sheet', async () => {
    getExerciseById.mockResolvedValueOnce({
      id: 'e1',
      name: 'Barbell squat',
      primaryMuscle: 'quads',
      secondaryMuscles: [],
      defaultRepMin: 6,
      defaultRepMax: 12,
    });
    getWorkoutSetsForExercise.mockResolvedValueOnce([]);
    getExerciseGoal.mockResolvedValueOnce(null);
    getAllExercises.mockResolvedValueOnce([]);

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

    const openBtn = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Set a target weight' && typeof n.props.onPress === 'function',
    )[0];
    expect(openBtn).toBeTruthy();
    await act(async () => {
      openBtn.props.onPress();
    });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Based on your estimated max. Progress will be shown each time you open this exercise.');
    expect(text).toContain(`Target weight (kg)`);
  });
});

describe('ExerciseDetailScreen goal sheet migration (D36a item 17 modal tails)', () => {
  // Item 17's surface 6 gave a choice: patch the inset on the raw Modal, or
  // migrate to BottomSheet, whichever is the better product result for THIS
  // modal's content. RULING (recorded in this suite as the source-level
  // pin): migrate, because this modal has the same content class as item 4
  // (RoutineDetail's edit-exercise sheet, several TextFields) -- same
  // gesture-dismiss and consistency gains apply, and it fixes the same
  // genuine inset bug (modalSheet had no safe-area padding) in one motion.
  test('the goal modal is built on the shared BottomSheet, not a hand-rolled Modal', () => {
    expect(EXERCISE_DETAIL_SOURCE).toContain("import BottomSheet from '../components/BottomSheet';");
    const goalWindow = EXERCISE_DETAIL_SOURCE.match(/\{\/\* Goal-setting bottom sheet\.[\s\S]*?<\/BottomSheet>/)?.[0] ?? '';
    expect(goalWindow).toContain('<BottomSheet');
    expect(goalWindow).toContain('visible={goalModalVisible}');
    expect(goalWindow).toContain('onClose={() => setGoalModalVisible(false)}');
    expect(goalWindow).toContain('keyboardAvoiding');
    expect(goalWindow).not.toContain('<KeyboardAvoidingView');
    expect(goalWindow).not.toContain('styles.modalBackdrop');
    expect(goalWindow).not.toContain('styles.modalOverlay');
  });
});

describe('ExerciseDetailScreen malformed restored/legacy data (EP-23/UI-11)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // A bad restore/import/sync can leave a workout set's createdAt (which
  // becomes a PR's achieved_date) or a saved goal's targetDate/targetWeight
  // unparseable. Every one of these used to reach a raw
  // `format(new Date(value), fmt)` (throws RangeError: Invalid time value)
  // or `parseFloat(value).toFixed(n)` (silently renders the string "NaN").
  // This proves the whole screen still renders, with calm fallbacks instead
  // of a crash or "NaNkg".
  test('a malformed set date and a malformed goal render without throwing and without "NaN"', async () => {
    getExerciseById.mockResolvedValueOnce({
      id: 'e1',
      name: 'Barbell bench press',
      primaryMuscle: 'chest',
      secondaryMuscles: [],
      defaultRepMin: 6,
      defaultRepMax: 12,
    });
    getWorkoutSetsForExercise.mockResolvedValueOnce([
      {
        workoutId: 'w1', weight: 100, actualReps: 5, setType: 'straight',
        createdAt: 'not-a-real-date',
      },
    ]);
    getExerciseGoal.mockResolvedValueOnce({
      id: 'g1', targetWeight: 'corrupt', targetDate: 'not-a-real-date', achievedAt: null,
    });
    getAllExercises.mockResolvedValueOnce([]);

    let tree;
    await expect(act(async () => {
      tree = create(
        <ExerciseDetailScreen
          navigation={{ goBack: jest.fn(), push: jest.fn() }}
          route={{ params: { exerciseId: 'e1' } }}
        />,
      );
    })).resolves.not.toThrow();
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).not.toMatch(/NaN/);
    // The PR highlight card, the all-time-bests list and the session
    // history row all fall back to the same calm copy for the malformed
    // achieved_date/createdAt instead of crashing.
    expect(text).toContain('Date unavailable');
    // The malformed goal.targetWeight renders as the existing "-"
    // placeholder (the same fallback already used for "no 1RM yet"),
    // never "NaNkg", and the invalid targetDate omits the "- by ..." tail
    // rather than crashing the goal card.
    expect(text).toContain('Target');
    expect(text).not.toContain('by not-a-real-date');
  });

  // Opening the goal-edit sheet used to call format(new Date(goal.
  // targetDate), 'MMM yyyy') unconditionally when targetDate was truthy;
  // pin that a malformed value no longer crashes opening the sheet.
  test('opening the goal sheet with a malformed saved targetDate does not throw', async () => {
    getExerciseById.mockResolvedValueOnce({
      id: 'e1', name: 'Barbell squat', primaryMuscle: 'quads', secondaryMuscles: [],
      defaultRepMin: 6, defaultRepMax: 12,
    });
    getWorkoutSetsForExercise.mockResolvedValueOnce([]);
    getExerciseGoal.mockResolvedValueOnce({
      id: 'g1', targetWeight: 80, targetDate: 'not-a-real-date', achievedAt: null,
    });
    getAllExercises.mockResolvedValueOnce([]);

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

    const editBtn = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Edit target' && typeof n.props.onPress === 'function',
    )[0];
    expect(editBtn).toBeTruthy();
    await expect(act(async () => {
      editBtn.props.onPress();
    })).resolves.not.toThrow();
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).not.toMatch(/NaN/);
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
