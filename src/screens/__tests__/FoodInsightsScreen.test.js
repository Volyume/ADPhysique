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

async function mountWith(rollups) {
  useAppStore.mockImplementation((sel) => sel({ user: { id: 'u1' } }));
  getNutritionTargets.mockResolvedValue(TARGETS);
  getRollupsForRange.mockResolvedValue(rollups);
  let tree;
  await act(async () => { tree = create(<FoodInsightsScreen navigation={nav} />); });
  // Flush load() (Promise.all) and the resulting state updates.
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return flattenText(tree.toJSON());
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
    // The existing macro-block empty copy still shows.
    expect(text).toContain('Log a few days to see your macro adherence.');
  });

  test('carries no praise or streak language (locked voice)', async () => {
    const days = last7();
    const text = (await mountWith([rollup(days[0], true), rollup(days[1], true)])).toLowerCase();
    ['great', 'well done', 'amazing', 'crush', 'keep it up', 'streak', 'perfect', 'nailed', 'smashed']
      .forEach((w) => expect(text).not.toContain(w));
  });
});
