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
jest.mock('../../lib/database', () => ({ getNutritionTargets: jest.fn() }));
jest.mock('../../lib/food/csvExport', () => ({ exportDiaryCsv: jest.fn() }));

import useAppStore from '../../store/useAppStore';
import { getRollupsForRange } from '../../lib/food/db';
import { getNutritionTargets } from '../../lib/database';
import { localDayKey } from '../../lib/dayKey';
import FoodInsightsScreen from '../FoodInsightsScreen';

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
function rollup(date, proteinHit) {
  return {
    entry_date: date,
    entries_count: 1,
    kcal_total: TARGETS.targetKcal,
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
    (node) => node.props?.accessibilityLabel === `Last ${n} days` && typeof node.props.onPress === 'function',
  )[0];
  await act(async () => { chip.props.onPress(); });
  await flush();
}

describe('FoodInsightsScreen — protein-consistency headline (ULTIMATE-NUT-04)', () => {
  afterEach(() => jest.clearAllMocks());

  test('reports days hit of days logged using the existing 10% band', async () => {
    const days = last7();
    // 5 logged days; protein hit on 3 of them.
    const rollups = [
      rollup(days[0], true), rollup(days[1], true), rollup(days[2], true),
      rollup(days[3], false), rollup(days[4], false),
    ];
    const text = await mountWith(rollups);
    expect(text).toContain('You hit your protein on 3 of 5 days you logged.');
    expect(text).toContain('Hit = within target range.');
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
    expect(text).toContain('Log a few days to see your last 7 days.');
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
    expect(text).toContain('LAST 7 DAYS · CALORIES');
    expect(barRowCount(tree)).toBe(7);
    expect(text).toContain('Bars within 10% turn green.');
    expect(text).not.toContain('weekly average'); // 7d stays per-day
  });

  test('switching to 30/90 days aggregates the chart into weekly bars', async () => {
    const tree = await render(lastN(90).map((d) => rollup(d, true)));

    await tapWindow(tree, 30);
    let text = flattenText(tree.toJSON());
    expect(text).toContain('LAST 30 DAYS · CALORIES');
    expect(barRowCount(tree)).toBe(5); // 30 days → 5 weekly bars, not 30 rows
    expect(text).toContain('Each bar is a weekly average');
    expect(text).not.toContain('Bars within 10% turn green.');

    await tapWindow(tree, 90);
    text = flattenText(tree.toJSON());
    expect(text).toContain('LAST 90 DAYS · CALORIES');
    expect(barRowCount(tree)).toBe(13); // 90 days → 13 weekly bars, not 90 rows
  });

  test('window-aware copy on the export button and empty state', async () => {
    const tree = await render([]); // nothing logged
    await tapWindow(tree, 90);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Export 90 days as CSV');
    expect(text).toContain('Log a few days to see your last 90 days.');
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
});
