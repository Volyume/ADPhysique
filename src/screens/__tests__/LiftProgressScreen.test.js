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
// Campaign 23 (§20/§27): the relocated Weight Lifted hero (WeightLiftedHero)
// pulls in VolyumeChart, itself a react-native-svg wrapper (native-only);
// same stub pattern as Sparkline above.
jest.mock('../../components/VolyumeChart', () => () => null);
// PeekMenu pulls in expo-haptics (native-only). It's stubbed out for most of
// this suite, but the EP-23/UI-11 malformed-data tests below need to reach
// the "Share this PR" item's onPress (built in openLiftMenu, LiftProgress
// Screen.js), so the stub forwards a ref exposing `open`/`close` the same
// shape the real component does, capturing the last `open({ title, items })`
// call for those tests to inspect.
let capturedPeekMenuOpen = null;
jest.mock('../../components/PeekMenu', () => {
  const React = require('react');
  return React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      open: (args) => { capturedPeekMenuOpen = args; },
      close: () => {},
    }));
    return null;
  });
});
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
import { getWeeklyLoadWindow, DEFAULT_LOAD_WEEKS } from '../../lib/progressSeries';
import LiftProgressScreen from '../LiftProgressScreen';

const LIFT_PROGRESS_SOURCE = require('fs').readFileSync(
  require('path').resolve(__dirname, '../LiftProgressScreen.js'),
  'utf8',
);

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

describe('LiftProgressScreen loading state (Campaign 24 §1.4)', () => {
  test('shows skeleton placeholders during initial load, not a blank flash', async () => {
    const slowSets = deferred();
    getCompletedWorkoutSets.mockImplementationOnce(() => slowSets.promise);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    // Deliberately no `flush()` here -- the load is still in flight, so
    // `loading` is still true and this is the state that used to render
    // ListEmptyComponent={null} (a blank first-paint flash).

    expect(capturedListProps).toBeTruthy();
    expect(capturedListProps.data).toEqual([]);
    expect(capturedListProps.ListEmptyComponent).not.toBeNull();

    const { SkeletonRow } = require('../../components/Skeleton');
    let emptyTree;
    act(() => { emptyTree = create(capturedListProps.ListEmptyComponent); });
    expect(emptyTree.root.findAllByType(SkeletonRow).length).toBeGreaterThan(0);

    // Let the in-flight load settle so the test doesn't leak a dangling
    // promise into the next one.
    slowSets.resolve([]);
    await flush();
  });
});

function findMetricChip(headerTree, label) {
  return headerTree.root.findAll(
    n => n.props && n.props.accessibilityLabel === `Show ${label} trend` && typeof n.props.onPress === 'function',
  )[0];
}

describe('LiftProgressScreen — metric-switcher headline (item 7, campaign 2026-07-10)', () => {
  // A dedicated single-exercise, multi-session fixture with values chosen so
  // each metric's max is a distinct, non-colliding number (no digit-string
  // shared with any other number the row renders), so a plain substring
  // assertion against the flattened row text is unambiguous.
  const METRIC_EXERCISES = [{ id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' }];
  const METRIC_SETS = [
    set({ exerciseId: 'bench', workoutId: 'w1', weight: 60, reps: 8, at: 1000 }),
    set({ exerciseId: 'bench', workoutId: 'w2', weight: 97, reps: 3, at: 2000 }),
    set({ exerciseId: 'bench', workoutId: 'w3', weight: 73, reps: 11, at: 3000 }),
  ];

  beforeEach(() => {
    getCompletedWorkoutSets.mockResolvedValue(METRIC_SETS);
    getAllExercises.mockResolvedValue(METRIC_EXERCISES);
  });

  test('defaults to the e1RM headline ("Est. max") for the e1rm lens', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const s1 = calculate1RM(60, 8);
    const s2 = calculate1RM(97, 3);
    const s3 = calculate1RM(73, 11);
    const bestE1rm = Math.round(Math.max(s1, s2, s3) * 10) / 10;

    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    expect(text).toContain('Est. max');
    expect(text).toContain(`${bestE1rm}kg`);
  });

  test('switching to Heaviest tracks the headline numeral and label to the heaviest single weight', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const chip = findMetricChip(headerTree, 'Heaviest weight');
    expect(chip).toBeTruthy();
    act(() => { chip.props.onPress(); });

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    // Heaviest single working weight across all three sessions is 97kg.
    expect(text).toContain('97kg');
    expect(text).toContain('heaviest');
  });

  test('switching to Total reps tracks the headline to the best session\'s rep count, no unit suffix', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const chip = findMetricChip(headerTree, 'Total reps');
    act(() => { chip.props.onPress(); });

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    // Best single session's total reps is 11 (the third, latest session).
    expect(text).toContain('11');
    expect(text).toContain('most reps');
  });

  // T24/O20 (comprehension-trust-audit-2026-08-06): renamed from "Volume" to
  // "Total lifted" (the app already defines "Volume" elsewhere as weekly
  // hard sets; colliding the two names misled users), and the headline now
  // carries the kg unit + en-GB thousands separator instead of a bare
  // unitless number.
  test('switching to Total lifted tracks the headline to the best session\'s total, with unit and separator', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const chip = findMetricChip(headerTree, 'Total lifted');
    act(() => { chip.props.onPress(); });

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    // Session volumes: 60*8=480, 97*3=291, 73*11=803 -> best is 803.
    expect(text).toContain('803kg');
    expect(text).toContain('total lifted');
  });
});

describe('LiftProgressScreen — PR markers on the row sparkline (item 10, CP-5 residue)', () => {
  test('passes highlightIndices to Sparkline marking every new-best session on the current lens', async () => {
    // The file-level mock below replaces Sparkline with an anonymous
    // () => null; react-test-renderer still records the element and its
    // props even though it renders nothing, so its identity is enough to
    // find it and inspect the highlightIndices prop LiftProgressScreen
    // passed in.
    const Sparkline = require('../../components/Sparkline');

    const exercises = [{ id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' }];
    // Sessions oldest -> newest: 50 (not a PR, first) -> 60 (PR) -> 55 (dip) -> 70 (PR).
    // Four sessions so the row clears the >2-point threshold that swaps the
    // sparkline in for the "Building" placeholder text.
    const sets = [
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 50, reps: 5, at: 1000 }),
      set({ exerciseId: 'bench', workoutId: 'w2', weight: 60, reps: 5, at: 2000 }),
      set({ exerciseId: 'bench', workoutId: 'w3', weight: 55, reps: 5, at: 3000 }),
      set({ exerciseId: 'bench', workoutId: 'w4', weight: 70, reps: 5, at: 4000 }),
    ];
    getCompletedWorkoutSets.mockResolvedValue(sets);
    getAllExercises.mockResolvedValue(exercises);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    let rowTree;
    act(() => { rowTree = create(capturedListProps.renderItem({ item: row, index: 0 })); });
    const sparklineEl = rowTree.root.findAllByType(Sparkline)[0];
    expect(sparklineEl).toBeTruthy();
    // e1rm is monotonic with weight here (same reps every session), so the
    // PR sessions on the default e1rm lens are indices 1 and 3.
    expect(sparklineEl.props.highlightIndices).toEqual([1, 3]);
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

    // Copy sweep replaced the "e1RM" jargon with plain "Est. max" (D4-adjacent
    // no-jargon pass; capitalised under D93-2's Phase 2 terminology canon so
    // the label matches every other "Est. max" surface); the underlying
    // value is unchanged.
    const benchText = renderedText(capturedListProps.renderItem({ item: benchRow, index: 0 }));
    expect(benchText).toContain(`Last time: 60kg - Est. max ${benchE1rm}kg`);

    const squatText = renderedText(capturedListProps.renderItem({ item: squatRow, index: 0 }));
    expect(squatText).toContain(`Last time: 100kg - Est. max ${squatE1rm}kg`);
  });
});

describe('LiftProgressScreen — R2 (2026-07-11) design-cohesion census', () => {
  test('badges use the pill/badge radius (full)', () => {
    // levelBadge + prTag join the pill/chip/badge class (FOOD-DESIGN-STANDARD.md
    // section 4). Both were radius.sm.
    expect(LIFT_PROGRESS_SOURCE).toMatch(/levelBadge: \{[\s\S]*?borderRadius: radius\.full/);
    expect(LIFT_PROGRESS_SOURCE).toMatch(/prTag: \{[\s\S]*?borderRadius: radius\.full/);
  });

  test('badge/chip label text maps onto the exact captionStrong role', () => {
    // xs+semibold raw pairs -> type.captionStrong (frozen + live twin).
    expect(LIFT_PROGRESS_SOURCE).toMatch(/levelBadgeText: \{ \.\.\.type\.captionStrong \}/);
    expect(LIFT_PROGRESS_SOURCE).toMatch(/levelBadgeText: \{ \.\.\.t\.type\.captionStrong \}/);
    expect(LIFT_PROGRESS_SOURCE).toMatch(/metricChipText: \{ \.\.\.type\.captionStrong, color: colors\.textSecondary \}/);
    expect(LIFT_PROGRESS_SOURCE).toMatch(/metricChipText: \{ \.\.\.t\.type\.captionStrong, color: t\.colors\.textSecondary \}/);
  });

  test('the headline stat readout carries tabular figures (frozen + live twin)', () => {
    expect(LIFT_PROGRESS_SOURCE).toMatch(/statValue: \{[\s\S]*?fontVariant: \['tabular-nums'\]/);
    expect(LIFT_PROGRESS_SOURCE).toMatch(/statValue: \{ fontSize: t\.fontSize\.lg, color: t\.colors\.textPrimary, fontVariant: \['tabular-nums'\] \}/);
  });
});

describe('LiftProgressScreen malformed restored/legacy data (EP-23/UI-11)', () => {
  // liftProgress.js already coerces a set's createdAt via
  // `Number(s.createdAt ?? s.created_at) || 0`, so a non-numeric legacy
  // value (e.g. a corrupted string) is neutralised to epoch 0 before it
  // reaches the screen. The real crash vector this guards is a stored
  // value that survives that coercion as a NON-FINITE number (e.g.
  // Infinity from a bad migration/overflow) -- `Number(x) || 0` only
  // falls back on falsy results, and Infinity is truthy, so it passes
  // through as `lastTrainedAt: Infinity`. `new Date(Infinity)` is an
  // Invalid Date, which used to throw inside `format(...)` (row meta) and
  // `.toISOString()` (Share this PR) and can still equally be a huge but
  // finite out-of-range ms value; Infinity is the simplest reproduction.
  beforeEach(() => {
    jest.clearAllMocks();
    capturedListProps = null;
    capturedPeekMenuOpen = null;
    useAppStore.mockImplementation((selector) =>
      (typeof selector === 'function' ? selector(store) : store));
    getAllExercises.mockResolvedValue(EXERCISES);
    getLatestBodyWeight.mockResolvedValue(null);
  });

  test('a non-finite lastTrainedAt renders the row without throwing and without "NaN" or a date', async () => {
    getCompletedWorkoutSets.mockResolvedValue([
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 60, reps: 8, at: Infinity }),
    ]);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    expect(Number.isFinite(row.lastTrainedAt)).toBe(false);

    let text;
    expect(() => {
      text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    }).not.toThrow();
    expect(text).not.toMatch(/NaN/);
    // The "- last {date}" tail is omitted entirely rather than shown as a
    // fallback string, per this fix's per-site judgement (the row already
    // reads fine as "1 session" alone).
    expect(text).not.toContain('- last');
  });

  test('"Share this PR" with a non-finite lastTrainedAt still builds a valid ISO date and a finite weight, not a crash', async () => {
    getCompletedWorkoutSets.mockResolvedValue([
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 60, reps: 8, at: Infinity }),
    ]);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    expect(row.bestE1rm).toBeGreaterThan(0);

    let rowTree;
    act(() => { rowTree = create(capturedListProps.renderItem({ item: row, index: 0 })); });
    const pressable = rowTree.root.findAll(
      n => typeof n.props.onLongPressWithLayout === 'function',
    )[0];
    expect(pressable).toBeTruthy();

    expect(() => {
      act(() => { pressable.props.onLongPressWithLayout({ x: 0, y: 0, width: 10, height: 10 }); });
    }).not.toThrow();

    expect(capturedPeekMenuOpen).toBeTruthy();
    const shareItem = capturedPeekMenuOpen.items.find(i => i.label === 'Share this PR');
    expect(shareItem).toBeTruthy();

    expect(() => { shareItem.onPress(); }).not.toThrow();
    expect(nav.navigate).toHaveBeenCalledWith('ShareCard', expect.objectContaining({
      prData: expect.objectContaining({
        weight: expect.not.stringMatching(/NaN/),
        date: expect.any(String),
      }),
    }));
    const { date, weight } = nav.navigate.mock.calls[nav.navigate.mock.calls.length - 1][1].prData;
    expect(() => new Date(date).toISOString()).not.toThrow();
    expect(Number.isNaN(new Date(date).getTime())).toBe(false);
    expect(weight).not.toBe('NaN');
  });
});

// B1 (progress-tab audit 2026-09-24): the row badge used to always report
// the e1RM series's first-to-latest change beside whichever headline the
// metric switcher actually showed, so switching to "Total lifted" /
// "Heaviest weight" / "Total reps" left the 1RM-based percentage sitting
// under a headline it no longer describes.
describe('LiftProgressScreen -- badge follows the selected lens (B1, 2026-09-24)', () => {
  const METRIC_EXERCISES = [{ id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' }];
  const METRIC_SETS = [
    set({ exerciseId: 'bench', workoutId: 'w1', weight: 60, reps: 8, at: 1000 }),
    set({ exerciseId: 'bench', workoutId: 'w2', weight: 97, reps: 3, at: 2000 }),
    set({ exerciseId: 'bench', workoutId: 'w3', weight: 73, reps: 11, at: 3000 }),
  ];

  beforeEach(() => {
    getCompletedWorkoutSets.mockResolvedValue(METRIC_SETS);
    getAllExercises.mockResolvedValue(METRIC_EXERCISES);
  });

  test('the e1RM lens keeps its existing badge value (today\'s value, unchanged)', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    expect(row.deltaPct).not.toBeNull();
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    expect(text).toContain(`${row.deltaPct > 0 ? '+' : ''}${row.deltaPct}%`);
    expect(text).toContain('since first log');
  });

  test('Heaviest weight lens badge is that lens\'s own first-to-latest change (60kg -> 73kg = +22%), not the e1RM one', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const chip = findMetricChip(headerTree, 'Heaviest weight');
    act(() => { chip.props.onPress(); });

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    expect(text).toContain('+22%');
    expect(text).toContain('since first log');
    expect(text).not.toContain(`${row.deltaPct}%`);
  });

  test('Total reps lens badge is that lens\'s own first-to-latest change (8 -> 11 = +38%)', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const chip = findMetricChip(headerTree, 'Total reps');
    act(() => { chip.props.onPress(); });

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    expect(text).toContain('+38%');
    expect(text).toContain('since first log');
  });

  test('Total lifted lens badge is that lens\'s own first-to-latest change (480 -> 803 = +67%)', async () => {
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const chip = findMetricChip(headerTree, 'Total lifted');
    act(() => { chip.props.onPress(); });

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    expect(text).toContain('+67%');
    expect(text).toContain('since first log');
  });

  test('badge and caption are hidden when the selected lens has fewer than two points', async () => {
    getCompletedWorkoutSets.mockResolvedValue([
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 60, reps: 8, at: 1000 }),
    ]);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    let headerTree;
    act(() => { headerTree = create(capturedListProps.ListHeaderComponent); });
    const chip = findMetricChip(headerTree, 'Heaviest weight');
    act(() => { chip.props.onPress(); });

    const row = capturedListProps.data.find(r => r.name === 'Barbell Bench Press');
    const text = renderedText(capturedListProps.renderItem({ item: row, index: 0 }));
    expect(text).not.toContain('%');
    expect(text).not.toContain('since first log');
  });
});

// B2 (progress-tab audit 2026-09-24): the "Weight lifted" hero used to gate
// on distinct workouts over ALL loaded sets (all time) while its own chart
// only ever draws the last 8 Monday-anchored weeks, so a returning user with
// old sessions and nothing recent saw the hero appear with an empty
// "This week: 0" chart. Date.now() is pinned so the fixture's timestamps sit
// at a known, reproducible distance from "now".
describe('LiftProgressScreen -- Weight lifted hero gate matches its own chart window (B2, 2026-09-24)', () => {
  const FIXED_NOW = new Date(2026, 8, 24, 12, 0, 0).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  let nowSpy;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  test('three sessions older than eight weeks and none inside the window -> hero hidden', async () => {
    const win = getWeeklyLoadWindow(DEFAULT_LOAD_WEEKS, FIXED_NOW);
    const oldAt = win.startMs - 10 * DAY_MS; // safely before the window opens
    getCompletedWorkoutSets.mockResolvedValue([
      set({ exerciseId: 'bench', workoutId: 'old1', weight: 60, reps: 8, at: oldAt }),
      set({ exerciseId: 'bench', workoutId: 'old2', weight: 60, reps: 8, at: oldAt - DAY_MS }),
      set({ exerciseId: 'bench', workoutId: 'old3', weight: 60, reps: 8, at: oldAt - 2 * DAY_MS }),
    ]);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const text = renderedText(capturedListProps.ListHeaderComponent);
    expect(text).not.toContain('Weight lifted');
  });

  test('three sessions inside the window -> hero shown', async () => {
    const win = getWeeklyLoadWindow(DEFAULT_LOAD_WEEKS, FIXED_NOW);
    const recentAt = win.startMs + DAY_MS; // safely inside the window
    getCompletedWorkoutSets.mockResolvedValue([
      set({ exerciseId: 'bench', workoutId: 'r1', weight: 60, reps: 8, at: recentAt }),
      set({ exerciseId: 'bench', workoutId: 'r2', weight: 62, reps: 8, at: recentAt + DAY_MS }),
      set({ exerciseId: 'bench', workoutId: 'r3', weight: 64, reps: 8, at: recentAt + 2 * DAY_MS }),
    ]);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const text = renderedText(capturedListProps.ListHeaderComponent);
    expect(text).toContain('Weight lifted');
  });
});

// B3 (progress-tab audit 2026-09-24): a person WITH a body weight but no
// lift matching any tracked standard used to see nothing in the standing
// slot at all -- add the calm third-state line without disturbing the two
// existing branches.
describe('LiftProgressScreen -- standing card third state (B3, 2026-09-24)', () => {
  const THIRD_STATE_LINE = 'Your standing appears once you log a bench press, squat, deadlift, overhead press or barbell row.';

  test('bodyweight set, lifts logged, none match a tracked standard -> the calm one-line card renders', async () => {
    getLatestBodyWeight.mockResolvedValue({ weightKg: 80 });
    getCompletedWorkoutSets.mockResolvedValue([
      set({ exerciseId: 'curl', workoutId: 'w1', weight: 20, reps: 10, at: 1000 }),
    ]);
    getAllExercises.mockResolvedValue([{ id: 'curl', name: 'Bicep Curl', primaryMuscle: 'biceps' }]);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const text = renderedText(capturedListProps.ListHeaderComponent);
    expect(text).toContain(THIRD_STATE_LINE);
    // The other two branches did not also render.
    expect(text).not.toContain('Add your body weight');
    expect(text).not.toContain('overall across');
  });

  test('existing branch unchanged: a matching standard still renders the standing card, not the third state', async () => {
    getLatestBodyWeight.mockResolvedValue({ weightKg: 80 });
    // Default SETS/EXERCISES fixture (top of file) includes Barbell Bench Press.

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const text = renderedText(capturedListProps.ListHeaderComponent);
    expect(text).toContain('overall across');
    expect(text).not.toContain(THIRD_STATE_LINE);
  });

  test('existing branch unchanged: no body weight still renders the "Add your body weight" prompt, not the third state', async () => {
    // Default getLatestBodyWeight resolves null (top-level beforeEach).
    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const text = renderedText(capturedListProps.ListHeaderComponent);
    expect(text).toContain('Add your body weight');
    expect(text).not.toContain(THIRD_STATE_LINE);
  });
});

// B4 (progress-tab audit 2026-09-24): strengthLevels used to be keyed by the
// exercise's own name, so two variants of the same lift (both scored
// against the SAME standard) produced two rows and counted as two "main
// lifts" instead of one.
describe('LiftProgressScreen -- strength standing collapses by category, not exercise name (B4, 2026-09-24)', () => {
  test('two bench variants collapse to one row, naming the higher-ratio variant, and count as 1 main lift', async () => {
    getLatestBodyWeight.mockResolvedValue({ weightKg: 80 });
    getCompletedWorkoutSets.mockResolvedValue([
      // Barbell Bench Press: 90kg/80kg = 1.125 ratio (the better of the two).
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 90, reps: 5, at: 1000 }),
      // Close-Grip Bench Press: 70kg/80kg = 0.875 ratio.
      set({ exerciseId: 'cgbench', workoutId: 'w2', weight: 70, reps: 5, at: 2000 }),
    ]);
    getAllExercises.mockResolvedValue([
      { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' },
      { id: 'cgbench', name: 'Close-Grip Bench Press', primaryMuscle: 'chest' },
    ]);

    await act(async () => { create(<LiftProgressScreen navigation={nav} />); });
    await flush();

    const text = renderedText(capturedListProps.ListHeaderComponent);
    expect(text).toContain('overall across 1 main lift');
    expect(text).toContain('Barbell Bench Press');
    expect(text).not.toContain('Close-Grip Bench Press');
  });
});
