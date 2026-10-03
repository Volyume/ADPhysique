/**
 * WorkoutHistoryScreen.d218Reporting.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), audit finding F-2
 * (docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md).
 *
 * History named every exercise through `getAllExercises()`, which FILTERS a
 * soft-deleted custom exercise (EL-18), so a session whose exercises the map
 * could not resolve read "27 sets" beside "No exercises logged" on the card,
 * "Unknown" on the expanded row, could not be found by exercise name or by
 * the Upper / Lower / Full body chips, and "Repeat as-is" with no routine
 * silently left the exercise out. This suite pins, against the REAL screen,
 * that all three row builders (the first page, "Show more", the calendar
 * month) and the expanded card and the repeat now read the shared unfiltered,
 * survivor-aware lookup (`getExerciseLookup`) and the shared session report
 * (`src/lib/sessionReport.js`):
 *  - every exercise with a logged set is named on the collapsed card, in
 *    search and on the expanded rows: a soft-deleted custom exercise, a
 *    retired id (named as its survivor) and a set known only by its own
 *    name snapshot; an exercise nothing resolves is "Exercise", never
 *    "Unknown"; "No exercises logged" shows only for a session with no sets;
 *  - the Upper / Lower chips classify from the resolved rows' muscles;
 *  - both "View summary" routes carry the report's counts;
 *  - "Repeat as-is" with no routine keeps a soft-deleted custom exercise, a
 *    retired id and a snapshot match, still leaves out an exercise that
 *    resolves to no row, and now SAYS so (info toast, exact copy).
 *
 * Each test is written to fail against the filtered-library code it replaces.
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
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/AnimatedEntrance', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
// Renders every row (and the footer), so a card's own text and buttons are
// reachable, as WorkoutHistoryScreen.progressAudit20260924.test.js does.
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data = [], renderItem, keyExtractor, ListEmptyComponent, ListHeaderComponent, ListFooterComponent, refreshControl,
  }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(
      View,
      { refreshControl },
      ListHeaderComponent,
      data.length === 0
        ? ListEmptyComponent
        : data.map((item, index) => React.createElement(
          View,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem({ item, index }),
        )),
      ListFooterComponent,
    );
  },
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
const mockStartWorkout = jest.fn();
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' }, startWorkout: mockStartWorkout, session: null, units: 'kg',
  })),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/database', () => ({
  getRecentCompletedWorkouts: jest.fn(),
  getCompletedWorkoutCount: jest.fn(),
  getCompletedWorkoutsBetween: jest.fn(),
  getWorkoutSetsForWorkoutIds: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseLookup: jest.fn(),
  createWorkout: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  deleteWorkoutAndSets: jest.fn(),
  uid: jest.fn(() => `uid-${global.__uidCounterD218 = (global.__uidCounterD218 ?? 0) + 1}`),
}));
jest.mock('../../lib/syncQueue', () => ({ enqueueSyncOp: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import { create, act } from 'react-test-renderer';
import WorkoutHistoryScreen from '../WorkoutHistoryScreen';
import PressableCard from '../../components/PressableCard';
import SearchBar from '../../components/SearchBar';
import { navigateCrossTab } from '../../navigation/navigateCrossTab';
import {
  getRecentCompletedWorkouts, getCompletedWorkoutCount, getCompletedWorkoutsBetween,
  getWorkoutSetsForWorkoutIds, getAllExercises, getExerciseLookup,
  createWorkout, getWorkoutSetsForWorkout,
} from '../../lib/database';
import { buildExerciseLookup } from '../../lib/exercise/lookup';
import { canonicalExerciseId } from '../../lib/exercise/canonicalId';
import { survivorExerciseId } from '../../lib/exercise/retiredIds';

// "Lateral Raise Machine" was retired into "Machine Lateral Raise" (EL-21);
// the founder's 2 October session logged six sets on the retired id.
const RETIRED_ID = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR_ID = canonicalExerciseId('Machine Lateral Raise');

const BENCH = {
  id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', exerciseType: 'weight_reps', loadSemantics: 'total',
};
const ROW = {
  id: 'ex-row', name: 'Barbell Row', primaryMuscle: 'back', exerciseType: 'weight_reps', loadSemantics: 'total',
};
const SURVIVOR = {
  id: SURVIVOR_ID, name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', exerciseType: 'weight_reps', loadSemantics: 'total',
};
// A custom exercise the person deleted (EL-18 soft delete): the row stays in
// the table with deleted_at set, getAllExercises() filters it out.
const DELETED_CUSTOM = {
  id: 'ex-custom-gone', name: 'Cable Crunch Pro', primaryMuscle: 'quads', exerciseType: 'weight_reps',
  loadSemantics: 'total', isCustom: 1, deletedAt: 1700000000000,
};

// Every row the table holds (the unfiltered lookup) and the filtered library.
const UNFILTERED_ROWS = [BENCH, ROW, SURVIVOR, DELETED_CUSTOM];
const FILTERED_ROWS = [BENCH, ROW, SURVIVOR];

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
    await Promise.resolve();
  });
}

function workout(id, overrides = {}) {
  return {
    id, userId: 'u1', startedAt: Date.now() - 1000, endedAt: Date.now(),
    isCompleted: true, name: `Session ${id}`, durationMinutes: 42, routineId: null, routineName: null,
    ...overrides,
  };
}

function setRow(id, workoutId, exerciseId, at, overrides = {}) {
  return {
    id, workoutId, exerciseId, setType: 'straight', weight: 50, actualReps: 10, createdAt: at, setNumber: 1,
    ...overrides,
  };
}

// The founder's shape: one session, five exercises, in this logged order.
//   bench (row), the deleted custom exercise (row, filtered out of the
//   library), a set on the RETIRED id (its survivor's row), a set on an id no
//   row carries but with a name snapshot, and a set on an id nothing resolves.
const MIXED_SETS_LOGGED_ORDER = [
  setRow('s1', 'w1', 'ex-bench', 1000),
  setRow('s2', 'w1', 'ex-custom-gone', 2000),
  setRow('s3', 'w1', RETIRED_ID, 3000),
  setRow('s4', 'w1', 'ex-unknown', 4000, { exerciseName: 'Landmine Press' }),
  setRow('s5', 'w1', 'ex-ghost', 5000),
];
// getWorkoutSetsForWorkoutIds returns newest first (ORDER BY created_at DESC).
const MIXED_SETS_DB_ORDER = [...MIXED_SETS_LOGGED_ORDER].reverse();

async function mount() {
  let tree;
  await act(async () => { tree = create(<WorkoutHistoryScreen navigation={{ navigate: jest.fn() }} />); });
  await flush();
  return tree;
}

// The expanded card's exercise rows, outermost match only (a touchable and
// the host node under it both carry the label).
function progressRows(tree) {
  return tree.root.findAll(
    (n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('See progress for ')
      && typeof n.props.onPress === 'function',
    { deep: false },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  global.__uidCounterD218 = 0;
  getRecentCompletedWorkouts.mockResolvedValue([workout('w1')]);
  getCompletedWorkoutCount.mockResolvedValue(1);
  getCompletedWorkoutsBetween.mockResolvedValue([]);
  getWorkoutSetsForWorkoutIds.mockResolvedValue(MIXED_SETS_DB_ORDER);
  getWorkoutSetsForWorkout.mockResolvedValue(MIXED_SETS_LOGGED_ORDER);
  getAllExercises.mockResolvedValue(FILTERED_ROWS);
  getExerciseLookup.mockResolvedValue(buildExerciseLookup(UNFILTERED_ROWS));
  createWorkout.mockResolvedValue({ id: 'new-w1', userId: 'u1' });
});

test('fixture sanity: the retired id really resolves to its survivor', () => {
  expect(survivorExerciseId(RETIRED_ID)).toBe(SURVIVOR_ID);
  expect(RETIRED_ID).not.toBe(SURVIVOR_ID);
});

describe('F-2: the collapsed card names every exercise that has a logged set', () => {
  test('a deleted custom exercise, a retired id and a snapshot-only exercise are all named, in first-logged order', async () => {
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    // First four, first-logged order (the DB list arrives newest first).
    expect(text).toContain('Bench Press, Cable Crunch Pro, Machine Lateral Raise, Landmine Press');
    expect(text).not.toContain('No exercises logged');
    expect(text).not.toContain('Unknown');
    // The page was read through the lookup, never the filtered library.
    expect(getExerciseLookup).toHaveBeenCalled();
    expect(getAllExercises).not.toHaveBeenCalled();
  });

  test('"No exercises logged" shows only for a session with no sets at all', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([workout('w-empty')]);
    getWorkoutSetsForWorkoutIds.mockResolvedValue([]);
    const tree = await mount();
    expect(flattenText(tree.toJSON())).toContain('No exercises logged');
  });

  test('an exercise nothing resolves is "Exercise" on the card, never blank or "Unknown"', async () => {
    getWorkoutSetsForWorkoutIds.mockResolvedValue([setRow('g1', 'w1', 'ex-ghost', 1000)]);
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Exercise');
    expect(text).not.toContain('No exercises logged');
    expect(text).not.toContain('Unknown');
  });
});

describe('F-2: search and the Upper / Lower chips read the same names and muscles', () => {
  async function search(tree, q) {
    await act(async () => { tree.root.findByType(SearchBar).props.onChangeText(q); });
  }

  test('search finds the session by a deleted custom exercise, a survivor name and a snapshot name', async () => {
    const tree = await mount();
    for (const q of ['crunch pro', 'machine lateral', 'landmine']) {
      await search(tree, q);
      expect(tree.root.findAllByType(PressableCard).length).toBe(1);
    }
    await search(tree, 'no such exercise');
    expect(tree.root.findAllByType(PressableCard).length).toBe(0);
  });

  test('the Lower chip finds a session made only of a deleted custom exercise (muscle from its row)', async () => {
    getWorkoutSetsForWorkoutIds.mockResolvedValue([setRow('d1', 'w1', 'ex-custom-gone', 1000)]);
    const tree = await mount();
    await act(async () => { tree.root.findByProps({ accessibilityLabel: 'Filter: Lower' }).props.onPress(); });
    expect(tree.root.findAllByType(PressableCard).length).toBe(1);
    await act(async () => { tree.root.findByProps({ accessibilityLabel: 'Filter: Upper' }).props.onPress(); });
    expect(tree.root.findAllByType(PressableCard).length).toBe(0);
  });
});

describe('F-2: the expanded card names every row, never "Unknown", and each row opens Exercise Detail', () => {
  test('rows are named, in logged order, and tapping each opens its Exercise Detail (the resolved id)', async () => {
    const tree = await mount();
    await act(async () => { tree.root.findByType(PressableCard).props.onPress(); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Unknown');
    const rows = progressRows(tree);
    expect(rows.map((r) => r.props.accessibilityLabel)).toEqual([
      'See progress for Bench Press',
      'See progress for Cable Crunch Pro',
      'See progress for Machine Lateral Raise',
      'See progress for Landmine Press',
      'See progress for Exercise',
    ]);
    // The retired row opens its SURVIVOR (so Exercise Detail finds its sets),
    // the deleted custom exercise opens its own id, and the exercise nothing
    // resolves opens the id the sets carry.
    const opened = [];
    for (const r of rows) {
      navigateCrossTab.mockClear();
      await act(async () => { r.props.onPress(); });
      opened.push(navigateCrossTab.mock.calls[0][3].exerciseId);
    }
    expect(opened).toEqual(['ex-bench', 'ex-custom-gone', SURVIVOR_ID, 'ex-unknown', 'ex-ghost']);
    expect(navigateCrossTab.mock.calls[0].slice(1, 3)).toEqual(['ProgressTab', 'ExerciseDetail']);
  });

  test('the expanded read goes through the lookup, not the filtered library', async () => {
    const tree = await mount();
    getExerciseLookup.mockClear();
    await act(async () => { tree.root.findByType(PressableCard).props.onPress(); });
    await flush();
    expect(getExerciseLookup).toHaveBeenCalledTimes(1);
    expect(getAllExercises).not.toHaveBeenCalled();
  });

  test('a retired id and its survivor are ONE row, with both ids\' sets in it', async () => {
    const sets = [
      setRow('r1', 'w1', RETIRED_ID, 1000, { weight: 20, actualReps: 15 }),
      setRow('r2', 'w1', SURVIVOR_ID, 2000, { weight: 25, actualReps: 12 }),
    ];
    getWorkoutSetsForWorkoutIds.mockResolvedValue([...sets].reverse());
    getWorkoutSetsForWorkout.mockResolvedValue(sets);
    const tree = await mount();
    await act(async () => { tree.root.findByType(PressableCard).props.onPress(); });
    await flush();
    const rows = progressRows(tree);
    expect(rows.map((r) => r.props.accessibilityLabel)).toEqual(['See progress for Machine Lateral Raise']);
    expect(flattenText(tree.toJSON())).toContain('2 × 20kg/25kg × 15, 12');
  });
});

describe('F-2: "View summary" carries the report\'s counts (both buttons)', () => {
  test('exercise count, working sets and names come from the resolved report', async () => {
    // Two ids for ONE exercise (retired + survivor) plus a warm-up: 2 exercises, 3 sets, 2 working.
    getWorkoutSetsForWorkoutIds.mockResolvedValue([
      setRow('a1', 'w1', RETIRED_ID, 1000, { setType: 'warmup' }),
      setRow('a2', 'w1', SURVIVOR_ID, 2000),
      setRow('a3', 'w1', 'ex-custom-gone', 3000),
    ].reverse());
    const navigate = jest.fn();
    let tree;
    await act(async () => { tree = create(<WorkoutHistoryScreen navigation={{ navigate }} />); });
    await flush();

    const summaryButtons = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'View summary' && typeof n.props.onPress === 'function',
    );
    expect(summaryButtons.length).toBeGreaterThan(0);
    await act(async () => { summaryButtons[0].props.onPress(); });
    expect(navigate).toHaveBeenCalledWith('WorkoutSummary', expect.objectContaining({
      workoutId: 'w1',
      exerciseCount: 2,
      setCount: 3,
      workingSetCount: 2,
      exerciseNames: ['Machine Lateral Raise', 'Cable Crunch Pro'],
      readOnly: true,
    }));
  });
});

describe('F-2: every row builder reads the lookup ("Show more" and the calendar month, not just the first page)', () => {
  test('"Show more" names a deleted custom exercise on the older page', async () => {
    const firstPage = Array.from({ length: 50 }, (_, i) => workout(`w${i}`, {
      startedAt: Date.now() - i * 3600000, endedAt: Date.now() - i * 3600000 + 60000,
    }));
    const older = workout('w-older', {
      startedAt: Date.now() - 999 * 3600000, endedAt: Date.now() - 999 * 3600000 + 60000,
    });
    getRecentCompletedWorkouts.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([older]);
    getCompletedWorkoutCount.mockResolvedValue(51);
    getWorkoutSetsForWorkoutIds
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([setRow('o1', 'w-older', 'ex-custom-gone', 1000)]);
    const tree = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Cable Crunch Pro');

    await act(async () => { tree.root.findByProps({ accessibilityLabel: 'Show more sessions' }).props.onPress(); });
    await flush();
    expect(flattenText(tree.toJSON())).toContain('Cable Crunch Pro');
    expect(getAllExercises).not.toHaveBeenCalled();
  });

  test('the calendar month view names a deleted custom exercise', async () => {
    getRecentCompletedWorkouts.mockResolvedValue([workout('w-loaded')]);
    getWorkoutSetsForWorkoutIds.mockImplementation(async (ids) => (
      ids.includes('w-month') ? [setRow('m1', 'w-month', 'ex-custom-gone', 1000)] : []
    ));
    getCompletedWorkoutsBetween.mockImplementation(async (userId, startMs) => {
      const d = new Date(startMs);
      d.setDate(5);
      return [workout('w-month', { startedAt: d.getTime(), endedAt: d.getTime(), durationMinutes: 77 })];
    });
    const tree = await mount();
    await act(async () => { tree.root.findByProps({ accessibilityLabel: 'Switch to calendar view' }).props.onPress(); });
    await flush();
    await act(async () => { tree.root.findByProps({ accessibilityLabel: 'Previous month' }).props.onPress(); });
    await flush();
    expect(flattenText(tree.toJSON())).toContain('Cable Crunch Pro');
    expect(getAllExercises).not.toHaveBeenCalled();
  });
});

describe('F-2: "Repeat as-is" with no routine keeps what resolves and says what it left out', () => {
  async function openRepeatAsIs(tree) {
    const repeatBtn = tree.root.findByProps({ accessibilityLabel: 'Repeat workout' });
    await act(async () => { repeatBtn.props.onPress(); });
    const config = mockPeekOpen.mock.calls[mockPeekOpen.mock.calls.length - 1][0];
    const item = config.items.find((i) => i.label === 'Repeat as-is');
    await act(async () => { await item.onPress(); });
    await flush();
  }

  test('a deleted custom exercise, a retired id and a snapshot match are kept; the one that resolves to no row is left out, with the one-exercise toast', async () => {
    getWorkoutSetsForWorkout.mockResolvedValue([
      setRow('s1', 'w1', 'ex-bench', 1000),
      setRow('s2', 'w1', 'ex-custom-gone', 2000),
      setRow('s3', 'w1', RETIRED_ID, 3000),
      // An id no row carries, but its name snapshot matches the library's Barbell Row.
      setRow('s4', 'w1', 'ex-from-another-device', 4000, { exerciseName: 'Barbell Row' }),
      setRow('s5', 'w1', 'ex-ghost', 5000),
    ]);
    const tree = await mount();
    await openRepeatAsIs(tree);

    expect(mockStartWorkout).toHaveBeenCalledTimes(1);
    const [, initialExercises] = mockStartWorkout.mock.calls[0];
    expect(initialExercises.map((e) => e.exercise.id)).toEqual(['ex-bench', 'ex-custom-gone', SURVIVOR_ID, 'ex-row']);
    expect(initialExercises.map((e) => e.exercise.name)).toEqual([
      'Bench Press', 'Cable Crunch Pro', 'Machine Lateral Raise', 'Barbell Row',
    ]);
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith(
      'One exercise from that session is not on this device, so it was left out.',
      { variant: 'info' },
    );
    expect(navigateCrossTab).toHaveBeenCalledWith(expect.anything(), 'HomeTab', 'ActiveWorkout');
    expect(getAllExercises).not.toHaveBeenCalled();
  });

  test('more than one left out says how many, in the plural', async () => {
    getWorkoutSetsForWorkout.mockResolvedValue([
      setRow('s1', 'w1', 'ex-bench', 1000),
      setRow('s2', 'w1', 'ex-ghost', 2000),
      setRow('s3', 'w1', 'ex-ghost-2', 3000),
      setRow('s4', 'w1', 'ex-ghost-3', 4000),
    ]);
    const tree = await mount();
    await openRepeatAsIs(tree);
    expect(mockStartWorkout).toHaveBeenCalledTimes(1);
    expect(mockStartWorkout.mock.calls[0][1].map((e) => e.exercise.id)).toEqual(['ex-bench']);
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith(
      '3 exercises from that session are not on this device, so they were left out.',
      { variant: 'info' },
    );
  });

  test('a lookup that could not be read is a failed repeat, never "every exercise is missing"', async () => {
    getExerciseLookup.mockResolvedValue(null);
    const tree = await mount();
    await openRepeatAsIs(tree);
    expect(mockStartWorkout).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't repeat workout. Try again.", { variant: 'error' });
  });

  test('nothing left out: no toast, and a retired id and its survivor are ONE entry with every working set counted', async () => {
    getWorkoutSetsForWorkout.mockResolvedValue([
      setRow('s1', 'w1', RETIRED_ID, 1000),
      setRow('s2', 'w1', RETIRED_ID, 1500, { setType: 'warmup' }),
      setRow('s3', 'w1', SURVIVOR_ID, 2000),
      setRow('s4', 'w1', 'ex-bench', 3000),
    ]);
    const tree = await mount();
    await openRepeatAsIs(tree);
    expect(mockToastShow).not.toHaveBeenCalled();
    const [, initialExercises] = mockStartWorkout.mock.calls[0];
    expect(initialExercises.map((e) => e.exercise.id)).toEqual([SURVIVOR_ID, 'ex-bench']);
    // Two working sets on the survivor (the warm-up is not a target set).
    expect(initialExercises[0].routineExercise.recommendedSets).toBe(2);
    expect(initialExercises[1].routineExercise.recommendedSets).toBe(1);
  });
});
