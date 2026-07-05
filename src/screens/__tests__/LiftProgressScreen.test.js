/**
 * Wave A C1 (2026-07-03): LiftProgressScreen had no way to find a lift in a
 * long list, and liftProgress.js already computed latestWeight/latestE1rm
 * per exercise (src/lib/liftProgress.js:88-89) without the screen ever
 * rendering them. Pins two invariants against the REAL screen (the data
 * layer is un-mocked, so the real buildLiftProgressRows drives what's on
 * screen):
 *   1. the search box filters the list by exercise name, case-insensitive,
 *      substring match, and clearing it restores the full (still
 *      most-recent-first) list;
 *   2. each row shows a "Last time" line built from the row's own
 *      latestWeight/latestE1rm (no rep count, because liftProgress.js does
 *      not compute one per session).
 *
 * FlashList is captured rather than rendered (same idiom as
 * MyMealsScreen.test.js): the header element (which owns the search
 * TextInput) and a row element (from renderItem) are each mounted
 * separately so they can be interacted with / inspected directly.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
// Sparkline pulls in react-native-svg (native-only); stub it like the other
// screen tests do for chart components (FoodInsightsScreen -> VolyumeChart).
jest.mock('../../components/Sparkline', () => () => null);
// PeekMenu pulls in expo-haptics (native-only) and is never opened in this
// suite (no long-press), so stub it out.
jest.mock('../../components/PeekMenu', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

// FlashList: captured, not rendered. The header (search box lives there) and
// each row are mounted separately from the captured props, the same idiom
// MyMealsScreen.test.js uses for its FlashList-backed row.
let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));

jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  getLatestBodyWeight: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import {
  getCompletedWorkoutSets, getAllExercises, getLatestBodyWeight,
} from '../../lib/database';
import { calculate1RM } from '../../lib/algorithms';
import LiftProgressScreen from '../LiftProgressScreen';

const store = { user: { id: 'user-1' }, units: 'kg' };
const nav = { navigate: jest.fn() };

const EXERCISES = [
  { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' },
  { id: 'squat', name: 'Back Squat', primaryMuscle: 'quads' },
];

// Completed workout sets in the camelCase shape getCompletedWorkoutSets
// returns (mirrors src/lib/__tests__/liftProgress.test.js's set() helper).
function set({ exerciseId, workoutId, weight, reps, at }) {
  return {
    exerciseId, workoutId, weight, actualReps: reps, createdAt: at, setType: 'straight',
  };
}

const SETS = [
  // bench: single session, 60kg x 8
  set({ exerciseId: 'bench', workoutId: 'w1', weight: 60, reps: 8, at: 1000 }),
  // squat: single session, trained later so it sorts first, 100kg x 5
  set({ exerciseId: 'squat', workoutId: 'w2', weight: 100, reps: 5, at: 2000 }),
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

// Mount a captured element (header or a row) in its own tree and flatten
// every string/number leaf into one blob, so assertions don't need to know
// exactly how RN splits a JSX text's children.
function renderedText(element) {
  let tree;
  act(() => { tree = create(element); });
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out.join('');
}

function findSearchInput(headerTree) {
  return headerTree.root.findAll(
    n => n.props && n.props.accessibilityLabel === 'Search lifts' && typeof n.props.onChangeText === 'function',
  )[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  useAppStore.mockImplementation((selector) =>
    (typeof selector === 'function' ? selector(store) : store));
  getCompletedWorkoutSets.mockResolvedValue(SETS);
  getAllExercises.mockResolvedValue(EXERCISES);
  getLatestBodyWeight.mockResolvedValue(null);
});

describe('LiftProgressScreen — search (C1)', () => {
  test('typing a query filters to matching exercise names, case-insensitive substring', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    expect(capturedListProps).toBeTruthy();
    expect(capturedListProps.data.map(r => r.name)).toEqual(['Back Squat', 'Barbell Bench Press']);

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const input = findSearchInput(headerTree);
    expect(input).toBeTruthy();

    // Case-insensitive substring: "SQUAT" still matches "Back Squat".
    act(() => { input.props.onChangeText('SQUAT'); });

    expect(capturedListProps.data.map(r => r.name)).toEqual(['Back Squat']);
  });

  test('clearing the query restores the full, most-recently-trained-first list', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const input = findSearchInput(headerTree);

    act(() => { input.props.onChangeText('squat'); });
    expect(capturedListProps.data.map(r => r.name)).toEqual(['Back Squat']);

    act(() => { input.props.onChangeText(''); });
    // Unchanged sort: squat was trained later (at: 2000 vs 1000), still first.
    expect(capturedListProps.data.map(r => r.name)).toEqual(['Back Squat', 'Barbell Bench Press']);
  });
});

describe('LiftProgressScreen load safety', () => {
  test('shows a retryable read-error state instead of an empty lifts state', async () => {
    getCompletedWorkoutSets.mockRejectedValueOnce(new Error('database unavailable'));

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    expect(capturedListProps.data).toEqual([]);
    const emptyText = renderedText(capturedListProps.ListEmptyComponent);
    expect(emptyText).toContain("Couldn't load lifts");
    expect(emptyText).toContain('Your workout history is safe.');
    expect(emptyText).toContain('Try again');
  });

  test('ignores a slower refresh result after a newer refresh has completed', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const slowSets = deferred();
    getCompletedWorkoutSets
      .mockImplementationOnce(() => slowSets.promise)
      .mockResolvedValueOnce([
        set({ exerciseId: 'bench', workoutId: 'fresh', weight: 80, reps: 5, at: 4000 }),
      ]);

    let firstRefresh;
    let secondRefresh;
    await act(async () => {
      firstRefresh = capturedListProps.refreshControl.props.onRefresh();
      secondRefresh = capturedListProps.refreshControl.props.onRefresh();
      await Promise.resolve();
    });
    await act(async () => { await secondRefresh; });
    await flush();

    expect(capturedListProps.data.map(r => r.name)).toEqual(['Barbell Bench Press']);

    slowSets.resolve([
      set({ exerciseId: 'squat', workoutId: 'stale', weight: 140, reps: 3, at: 5000 }),
    ]);
    await act(async () => { await firstRefresh; });
    await flush();

    expect(capturedListProps.data.map(r => r.name)).toEqual(['Barbell Bench Press']);
  });
});

describe('LiftProgressScreen — last-time line (C1)', () => {
  test('renders "Last time" from the row\'s own latestWeight/latestE1rm, in the user\'s units', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const benchRow = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const squatRow = capturedListProps.data.find(r => r.name === 'Back Squat');
    const benchE1rm = Math.round(calculate1RM(60, 8) * 10) / 10;
    const squatE1rm = Math.round(calculate1RM(100, 5) * 10) / 10;
    expect(benchRow.latestWeight).toBe(60);
    expect(squatRow.latestWeight).toBe(100);

    const benchText = renderedText(capturedListProps.renderItem({ item: benchRow, index: 0 }));
    expect(benchText).toContain(`Last time: 60kg · e1RM ${benchE1rm}kg`);

    const squatText = renderedText(capturedListProps.renderItem({ item: squatRow, index: 0 }));
    expect(squatText).toContain(`Last time: 100kg · e1RM ${squatE1rm}kg`);
  });
});
