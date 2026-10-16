/**
 * Invariant tests for the protein-consistency headline in Food Insights
 * (ULTIMATE-NUT-04). It must:
 *   - report the honest figure: days protein was hit (within 10% of target) of
 *     days logged, re-using the existing adherence band (NA-nutrition-8);
 *   - read in correct British singular/plural ("1 day" / "5 days");
 *   - stay hidden until at least one day is logged;
 *   - carry no praise / streak language (locked coaching voice).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../components/Card', () => ({ children }) => children);
// VolyumeChart pulls in react-native-svg / gesture-handler (native-only), so
// stub it to a host string like the other screen tests do (ExerciseDetail).
jest.mock('../../components/VolyumeChart', () => 'VolyumeChart');
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../lib/food/db', () => ({
  getRollupsForRange: jest.fn(),
  getFoodEntriesForRange: jest.fn(),
}));
jest.mock('../../lib/database', () => ({ getNutritionTargets: jest.fn(), getOpenEdPatternFlag: jest.fn() }));
jest.mock('../../lib/food/csvExport', () => ({ exportDiaryCsv: jest.fn() }));
// D228 item 2 (tier c): the screen reads the safety state through the hook.
// Most tests drive it with a state the real pure derivation produced; one
// block below runs the real hook end to end over mocked reads.
const mockSafety = { current: null, real: false };
jest.mock('../../hooks/useSafetyState', () => {
  const actual = jest.requireActual('../../hooks/useSafetyState');
  return { __esModule: true, default: (...a) => (mockSafety.real ? actual.default(...a) : mockSafety.current) };
});

import useAppStore from '../../store/useAppStore';
import { getRollupsForRange } from '../../lib/food/db';
import { getNutritionTargets, getOpenEdPatternFlag } from '../../lib/database';
import { localDayKey } from '../../lib/dayKey';
import { deriveSafetyState, SAFETY_STATE_UNKNOWN } from '../../lib/safetyState';
import FoodInsightsScreen from '../FoodInsightsScreen';

// The safety states the screen can meet, each from the real derivation.
const STATES = {
  normal: deriveSafetyState({ mode: 'normal', edFlag: null }),
  calm: deriveSafetyState({ mode: 'calm', edFlag: null }),
  flag: deriveSafetyState({ mode: 'normal', edFlag: { id: 'f1' } }),
  flagReadFailed: deriveSafetyState({ mode: 'normal', edFlag: 'read_failed' }),
  wellbeingReadFailed: deriveSafetyState({ mode: 'read_failed', edFlag: null }),
  unknown: SAFETY_STATE_UNKNOWN,
};
beforeEach(() => { mockSafety.real = false; mockSafety.current = STATES.normal; });

const nav = { goBack: jest.fn(), navigate: jest.fn() };
const TARGETS = { targetKcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 };

// The same seven local day keys the screen derives from today.
function last7() {
  const out = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(localDayKey(d.getTime()));
  }
  return out;
}

// A logged day; protein either on-target (hit) or far off (miss).
function rollup(date, proteinHit, kcal = TARGETS.targetKcal) {
  return {
    entry_date: date,
    entries_count: 1,
    kcal_total: kcal,
    protein_g: proteinHit ? TARGETS.proteinG : 100, // 100/180 = 44% off → miss
    carbs_g: TARGETS.carbsG,
    fat_g: TARGETS.fatG,
  };
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

// The most recent N local day keys, exactly as the screen derives them.
function lastN(n) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(localDayKey(d.getTime()));
  }
  return out;
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Mount and return the renderer. The rollup mock ignores its range args, so the
// screen's own window filter (`days`) is what selects rows — provide a superset.
async function render(rollups) {
  useAppStore.mockImplementation((sel) => sel({ user: { id: 'u1' } }));
  getNutritionTargets.mockResolvedValue(TARGETS);
  getRollupsForRange.mockResolvedValue(rollups);
  let tree;
  await act(async () => { tree = create(<FoodInsightsScreen navigation={nav} />); });
  await flush(); // load() (Promise.all) + resulting state updates
  return tree;
}

async function mountWith(rollups) {
  return flattenText((await render(rollups)).toJSON());
}

// Calories bar rows are the only nodes whose accessibilityLabel mentions kcal.
function barRowCount(tree) {
  return tree.root.findAll(
    (n) => typeof n.type === 'string' // host instances only; an accessible View also yields a composite
      && typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.includes(' kcal'),
  ).length;
}

// Tap a window chip by its accessibility label and flush the refetch.
async function tapWindow(tree, n) {
  const chip = tree.root.findAll(
    (node) => node.props?.accessibilityLabel === `Nutrition window: ${n} days` && typeof node.props.onPress === 'function',
  )[0];
  await act(async () => { chip.props.onPress(); });
  await flush();
}

describe('FoodInsightsScreen — protein-consistency headline (ULTIMATE-NUT-04)', () => {
  afterEach(() => jest.clearAllMocks());

  test('shows a retry state when nutrition insights fail to load', async () => {
    useAppStore.mockImplementation((sel) => sel({ user: { id: 'u1' } }));
    getNutritionTargets.mockResolvedValue(TARGETS);
    getRollupsForRange.mockRejectedValueOnce(new Error('offline'));
    let tree;
    await act(async () => { tree = create(<FoodInsightsScreen navigation={nav} />); });
    await flush();
    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load nutrition insights");
    // L05-MM2 (2026-07-09 design audit): this is a local SQLite read failure,
    // not a network failure, so "check your connection" was misleading —
    // "Check your connection and try again." -> "Something went wrong loading these. Try again."
    expect(text).toContain('Something went wrong loading these. Try again.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('Log food on a few days to see this view fill out.');
  });

  test('reports days hit of days logged using the existing 10% band', async () => {
    const days = last7();
    // 5 logged days; protein hit on 3 of them.
    const rollups = [
      rollup(days[0], true), rollup(days[1], true), rollup(days[2], true),
      rollup(days[3], false), rollup(days[4], false),
    ];
    const text = await mountWith(rollups);
    expect(text).toContain('You hit your protein on 3 of 5 days you logged.');
    // D230 (4.8): the rule is stated once, so the footnote that restated it is gone.
    expect(text).not.toContain('Hit = within target range.');
  });

  test('reads in the singular for a single logged day', async () => {
    const days = last7();
    const text = await mountWith([rollup(days[0], true)]);
    expect(text).toContain('You hit your protein on 1 of 1 day you logged.');
    expect(text).not.toContain('1 day you logged.s'); // guard against bad pluralisation
  });

  test('is hidden until at least one day is logged', async () => {
    const text = await mountWith([]);
    expect(text).not.toContain('You hit your protein on');
    // The macro-block empty copy still shows (window-aware since NUT-05; default 7).
    expect(text).toContain('Log food on a few days to see this view fill out.');
  });

  test('carries no praise or streak language (locked voice)', async () => {
    const days = last7();
    const text = (await mountWith([rollup(days[0], true), rollup(days[1], true)])).toLowerCase();
    ['great', 'well done', 'amazing', 'crush', 'keep it up', 'streak', 'perfect', 'nailed', 'smashed']
      .forEach((w) => expect(text).not.toContain(w));
  });
});

describe('FoodInsightsScreen — analytics windows 14/30/90d (ULTIMATE-NUT-05)', () => {
  afterEach(() => jest.clearAllMocks());

  test('defaults to the 7-day window with one bar per day', async () => {
    const tree = await render(lastN(90).map((d) => rollup(d, true)));
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Calories');
    expect(barRowCount(tree)).toBe(7);
    expect(text).not.toContain('Bars within 10% turn green.');
    expect(text).not.toContain('weekly average'); // 7d stays per-day
  });

  test('switching to 30/90 days aggregates the chart into weekly bars', async () => {
    const tree = await render(lastN(90).map((d) => rollup(d, true)));

    await tapWindow(tree, 30);
    let text = flattenText(tree.toJSON());
    expect(text).toContain('Last 30 days');
    expect(barRowCount(tree)).toBe(5); // 30 days → 5 weekly bars, not 30 rows
    expect(text).toContain('Each bar is a weekly average');
    expect(text).not.toContain('Bars within 10% turn green.');

    await tapWindow(tree, 90);
    text = flattenText(tree.toJSON());
    expect(text).toContain('Last 90 days');
    expect(barRowCount(tree)).toBe(13); // 90 days → 13 weekly bars, not 90 rows
  });

  test('window-aware copy on the export button and empty state', async () => {
    const tree = await render([]); // nothing logged
    await tapWindow(tree, 90);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Export 90 days as CSV');
    expect(text).toContain('Log food on a few days to see this view fill out.');
    expect(text).toContain('Open diary');
    const openDiary = tree.root.findByProps({ accessibilityLabel: 'Open diary' });
    await act(async () => { openDiary.props.onPress(); });
    expect(nav.goBack).toHaveBeenCalled();
  });

  test('a weekly bar averages only the logged days, never calendar zeros', async () => {
    const days = lastN(30);
    // First week: two logged days (2000 + 2200), the rest of the week unlogged.
    const rollups = [
      { entry_date: days[0], entries_count: 1, kcal_total: 2000, protein_g: 180, carbs_g: 250, fat_g: 70 },
      { entry_date: days[1], entries_count: 1, kcal_total: 2200, protein_g: 180, carbs_g: 250, fat_g: 70 },
    ];
    const tree = await render(rollups);
    await tapWindow(tree, 30);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('2100');       // honest mean of the two LOGGED days
    expect(text).not.toContain('1400');   // NOT the calendar mean (incl. 5 zero days)
  });

  test('ignores stale rollup responses when the selected window changes quickly', async () => {
    const oldLoad = deferred();
    const newLoad = deferred();
    useAppStore.mockImplementation((sel) => sel({ user: { id: 'u1' } }));
    getNutritionTargets.mockResolvedValue(TARGETS);
    getRollupsForRange
      .mockImplementationOnce(() => oldLoad.promise)
      .mockImplementationOnce(() => newLoad.promise);

    let tree;
    await act(async () => { tree = create(<FoodInsightsScreen navigation={nav} />); });
    await flush();
    await tapWindow(tree, 30);
    expect(getRollupsForRange).toHaveBeenCalledTimes(2);

    await act(async () => { oldLoad.resolve(lastN(7).map((d) => rollup(d, true, 1111))); });
    await flush();
    let text = flattenText(tree.toJSON());
    expect(text).not.toContain('1111');

    await act(async () => { newLoad.resolve(lastN(30).map((d) => rollup(d, true, 2222))); });
    await flush();
    text = flattenText(tree.toJSON());
    expect(text).toContain('Last 30 days');
    expect(text).toContain('2222');
    expect(text).not.toContain('1111');
  });
});

// ---------------------------------------------------------------------------
// D228 item 2, tier c (founder 2026-10-15, "Go as recommended"): under calm,
// an open flag, a failed read or the unknown state, Food Insights keeps every
// total and average and drops the VALENCE: the on-target colouring and labels,
// the protein hit count, the macro adherence block, the "vs the period before"
// comparison and the "close to target on N of M days" insights. Nothing new is
// said in their place. Nobody who is not calm and not flagged sees any
// difference.
// ---------------------------------------------------------------------------
describe('FoodInsightsScreen - quiet valence under the safety state (D228 item 2, tier c)', () => {
  afterEach(() => jest.clearAllMocks());

  // 14 logged days at target, so the week-before comparison, the adherence
  // counts and both insights all have something to say.
  const fortnight = () => lastN(14).map((d) => rollup(d, true));

  // The colour each per-day bar is drawn in (the bar fill carries height 100%).
  function barFillColours(tree) {
    const { StyleSheet } = require('react-native');
    const rows = tree.root.findAll(
      (n) => typeof n.type === 'string' && typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes(' kcal'),
    );
    const fills = rows.flatMap((row) => row.findAll(
      (n) => typeof n.type === 'string' && n.type === 'View' && StyleSheet.flatten(n.props.style)?.height === '100%',
    ));
    return [...new Set(fills.map((n) => StyleSheet.flatten(n.props.style).backgroundColor))];
  }

  const VALENCE = [
    'You hit your protein on',
    'Macro balance',
    'on target',
    'Hit = within target range',
    'Out of 7 days logged',
    'vs the week before',
    'Same as the week before',
    'No logged days before that to compare',
    'close to target',
    'turn green',
    'turns green',
    'to see target colours',
  ];

  test('not calm and not flagged: every valence element is there, exactly as before', async () => {
    const tree = await render(fortnight());
    const text = flattenText(tree.toJSON());
    expect(text).toContain('You hit your protein on 7 of 7 days you logged.');
    expect(text).toContain('Macro balance');
    expect(text).toContain('Out of 7 days logged.');
    expect(text).not.toContain('Hit = within target range');
    expect(text).toContain('Same as the week before.');
    expect(text).toContain('Protein was close to target on 7 of your last 7 logged days.');
    expect(text).toContain('Calories were close to target on 7 of your last 7 logged days.');
    expect(text).not.toContain('Bars within 10% turn green.');
    expect(text).toContain('on target'); // D230: the cue is text as well as colour
    expect(tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes(', on target')).length).toBeGreaterThan(0);
    expect(barFillColours(tree)).toHaveLength(1); // every day on target: all drawn in the success colour
  });

  test.each([
    ['calm only', 'calm'],
    ['an open flag', 'flag'],
    ['a failed flag read', 'flagReadFailed'],
    ['a failed wellbeing read', 'wellbeingReadFailed'],
    ['the unknown state, before any read', 'unknown'],
  ])('%s: totals and averages stay, the valence goes, and nothing replaces it', async (_label, key) => {
    mockSafety.current = STATES[key];
    const tree = await render(fortnight());
    const text = flattenText(tree.toJSON());
    for (const phrase of VALENCE) expect(text).not.toContain(phrase);
    expect(tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes(', on target'))).toHaveLength(0);
    // The totals and averages stay.
    expect(text).toContain('This week');
    expect(text).toMatch(/2,?400 kcal\/day/);
    expect(text).toContain('Average over 7 days logged this week.');
    expect(text).toContain('Calories');
    expect(barRowCount(tree)).toBe(7);
    expect(text).toContain('Target: 2400 kcal.'); // the target line stays
    expect(text).toContain('Faint line is your 2,400 kcal target.');
    expect(text).toContain('Averages');
    expect(text).toContain('You have logged 7 of the last 7 days.'); // what the diary covers is a fact about the diary
    // The bars are drawn plain: one colour, and not the one an on-target bar wears.
    const quiet = barFillColours(tree);
    expect(quiet).toHaveLength(1);
    mockSafety.current = STATES.normal;
    expect(quiet[0]).not.toBe(barFillColours(await render(fortnight()))[0]);
  });

  test('the protein chart stays (grams over time), without its hit count, under the quiet state', async () => {
    mockSafety.current = STATES.calm;
    const tree = await render(fortnight());
    expect(flattenText(tree.toJSON())).toContain('Protein');
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Daily protein trend in grams').length).toBeGreaterThan(0);
  });

  test('30 and 90 day windows quiet the weekly bars the same way', async () => {
    mockSafety.current = STATES.flag;
    const tree = await render(lastN(90).map((d) => rollup(d, true)));
    await tapWindow(tree, 30);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Each bar is a weekly average.');
    expect(text).not.toContain('turns green');
    expect(text).not.toContain('vs the 30 days before');
    expect(text).not.toContain('Macro balance');
    expect(barRowCount(tree)).toBe(5);
  });

  test('with no calorie target set the colours hint is not offered (there are none to see)', async () => {
    getNutritionTargets.mockResolvedValue(null);
    mockSafety.current = STATES.calm;
    useAppStore.mockImplementation((sel) => sel({ user: { id: 'u1' } }));
    getRollupsForRange.mockResolvedValue(fortnight());
    let tree;
    await act(async () => { tree = create(<FoodInsightsScreen navigation={nav} />); });
    await flush();
    expect(flattenText(tree.toJSON())).not.toContain('to see target colours');
  });

  test('the real hook, end to end: an unreadable flag store reads as quiet; clean reads read as normal', async () => {
    mockSafety.real = true;
    getOpenEdPatternFlag.mockRejectedValue(new Error('sqlite'));
    let text = flattenText((await render(fortnight())).toJSON());
    expect(text).not.toContain('Macro balance');
    expect(text).not.toContain('You hit your protein on');

    getOpenEdPatternFlag.mockResolvedValue(null);
    text = flattenText((await render(fortnight())).toJSON());
    expect(text).toContain('Macro balance');
    expect(text).toContain('You hit your protein on 7 of 7 days you logged.');

    getOpenEdPatternFlag.mockResolvedValue({ id: 'f1' });
    text = flattenText((await render(fortnight())).toJSON());
    expect(text).not.toContain('Macro balance');
  });
});


// ---------------------------------------------------------------------------
// D230 (4.8, R4, R16): the house chrome. The window is the house WindowChips,
// every block title is a heading in sentence case, the footnotes that restated
// a rule are gone, and "on target" is text beside the colour. Nothing is added.
// ---------------------------------------------------------------------------
describe('FoodInsightsScreen - house chrome (D230 4.8)', () => {
  afterEach(() => jest.clearAllMocks());

  test('the window selector is the house WindowChips, labelled, with the active window selected', async () => {
    const tree = await render(lastN(14).map((d) => rollup(d, true)));
    const WindowChips = require('../../components/WindowChips').default;
    const chips = tree.root.findByType(WindowChips);
    expect(chips.props.windows.map((w) => w.key)).toEqual([7, 14, 30, 90]);
    expect(chips.props.selectedKey).toBe(7);
    expect(chips.props.inkSelected).toBe(true);
    expect(chips.props.accessibilityPrefix).toBe('Nutrition window');
    const group = tree.root.findAll((n) => n.props?.accessibilityRole === 'tablist');
    expect(group.length).toBeGreaterThan(0);
  });

  test('block titles are headers in sentence case, with no literal capitals', async () => {
    const tree = await render(lastN(14).map((d) => rollup(d, true)));
    const headers = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header')
      .map((n) => flattenText(n)).filter(Boolean);
    const titles = [...new Set(headers)];
    for (const want of ['What we can see', 'This week', 'Calorie trend', 'Calories', 'Protein', 'Macro balance', 'Averages', 'Vitamins and minerals']) {
      expect(titles).toContain(want);
    }
    for (const title of titles) expect(title).not.toMatch(/[A-Z]{3,}/);
  });

  test('the footnotes that restate a rule are retired', async () => {
    const tree = await render(lastN(14).map((d) => rollup(d, true)));
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Hit = within target range');
    expect(text).not.toMatch(/turns? green/);
  });

  test('"on target" is visible text beside the green bar, not only colour and speech', async () => {
    const tree = await render(lastN(7).map((d) => rollup(d, true)));
    const cues = tree.root.findAll((n) => typeof n.type === 'string' && n.children?.length === 1 && n.children[0] === 'on target');
    expect(cues.length).toBe(7);
  });
});
