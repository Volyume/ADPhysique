/**
 * FoodSearchScreen, the food level-up's add path (D230 Wave 2, lane 2A;
 * docs/audit/food-levelup-2026-10-16/03-ASSESSMENT-AND-PLAN.md 4.4).
 *
 * Mounted against the real screen, with the same boundaries the other
 * FoodSearchScreen suites mock (the DB layer, the store, navigation, the
 * sheets). FlashList renders its header, its rows and its empty state in
 * order, so the position of a block on screen is what the test reads. FoodRow
 * is reduced to its name so the order is legible, and its props are captured
 * so a test can press its "+" exactly as a finger would.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - R7 "Around this time" renders on the Recent tab only when adding to
 *    TODAY, only when it has something to offer, ABOVE the slot recents, and
 *    never offers a food the slot recents already show. It reads the last 60
 *    days up to yesterday, and each row carries the portion last eaten. When
 *    it has rows, the search box does not grab the keyboard over them.
 *  - R5 the day line ("For Wednesday 14 October.") shows only when the add is
 *    not for today, in the add sheet's own words (diaryDates.entryDateLine).
 *  - R6 logging the plate shows ONE undo toast naming the meal ("2 foods added
 *    to Brekkie.", one food: "Oats added to Brekkie."), and its Undo deletes
 *    EVERY row the plate wrote, not just the first.
 *  - R4/R16 every tab is a 48 dp target by its own height with no hit slop,
 *    and the selected tab is drawn in ink (textPrimary label and rule), never
 *    amber.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();
const mockRowProps = {};
let mockListProps = null;

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn(), error: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => {
    mockListProps = props;
    const React = require('react');
    const { View } = require('react-native');
    const { data = [], renderItem, ListHeaderComponent, ListEmptyComponent } = props;
    return (
      <View>
        {ListHeaderComponent ?? null}
        {data.length
          ? data.map((item, index) => (
            <React.Fragment key={item.key ?? index}>{renderItem({ item, index })}</React.Fragment>
          ))
          : (ListEmptyComponent ?? null)}
      </View>
    );
  },
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null }));
jest.mock('../../components/food/CuratedMealSheet', () => () => null);
jest.mock('../../components/food/FoodDetailSheet', () => () => null);
jest.mock('../../components/food/QuickAddSheet', () => () => null);
jest.mock('../../components/food/FoodRow', () => (props) => {
  mockRowProps[props.food.name] = props;
  const { Text } = require('react-native');
  return <Text>{`row:${props.food.name}`}</Text>;
});
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })) },
}));

const mockGetSlotRecents = jest.fn(() => Promise.resolve([]));
const mockGetEntriesForClockWindow = jest.fn(() => Promise.resolve([]));
const mockLogFoodEntry = jest.fn();
const mockDeleteFoodEntry = jest.fn(() => Promise.resolve(true));
jest.mock('../../lib/food/db', () => ({
  logFoodEntry: (...a) => mockLogFoodEntry(...a),
  deleteFoodEntry: (...a) => mockDeleteFoodEntry(...a),
  getFavourites: jest.fn(() => Promise.resolve([])),
  getDislikes: jest.fn(() => Promise.resolve([])),
  cycleFoodPreference: jest.fn(),
  getAllCustomFoods: jest.fn(() => Promise.resolve([])),
  getFoodFrequents: jest.fn(() => Promise.resolve([])),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  getLoggedMealSlotsForDay: jest.fn(() => Promise.resolve([])),
  applyCuratedMealToDiary: jest.fn(),
  upsertSlotRecent: jest.fn(() => Promise.resolve()),
  getSlotRecents: (...a) => mockGetSlotRecents(...a),
  getSlotRecentQuantities: jest.fn(() => Promise.resolve(new Map())),
  resolveSlotRecentRefs: jest.fn((userId, refs) => Promise.resolve(new Map(refs.map((r) => [r, {
    food_ref: r, name: `Recent ${r}`, kcal_100g: 100, protein_100g: 10, carbs_100g: 10, fat_100g: 2,
  }])))),
  getEntriesForClockWindow: (...a) => mockGetEntriesForClockWindow(...a),
}));
jest.mock('../../lib/database', () => ({ getNutritionTargets: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../lib/food/curatedMeals', () => ({ getCuratedCandidates: jest.fn(() => []) }));
jest.mock('../../lib/food/mealSuggest', () => ({
  rankSuggestions: jest.fn(() => ({ suggestions: [], remaining: null, perMeal: null })),
  mealsLeftToday: jest.fn(() => 1),
}));
jest.mock('../../lib/food/frequents', () => ({ refreshFrequentsIfStale: jest.fn(() => Promise.resolve()) }));
jest.mock('../../lib/food/waterfall', () => ({ searchFoods: jest.fn(() => Promise.resolve([])) }));
const mockResolveFoodRefs = jest.fn((userId, refs) => Promise.resolve(new Map(refs.map((r) => [r, {
  food_ref: r, name: `Clock ${r}`, kcal_100g: 100, protein_100g: 10, carbs_100g: 10, fat_100g: 2,
}]))));
jest.mock('../../lib/food/sources/localCache', () => ({
  resolveFoodRefs: (...a) => mockResolveFoodRefs(...a),
}));

import useAppStore from '../../store/useAppStore';
import { todayLocalKey } from '../../lib/dayKey';
import { entryDateLine, shiftDate } from '../../lib/food/diaryDates';
import { setMealLabelOverrides } from '../../lib/food/mealSlots';
import { colors } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import FoodSearchScreen from '../FoodSearchScreen';

const store = { user: { id: 'u1' }, userProfile: {}, accessibility: { energyUnit: 'kcal' } };
const DAY_MS = 24 * 60 * 60 * 1000;

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve(); // eslint-disable-line no-await-in-loop
  });
}

async function mount(params) {
  let tree;
  const nav = makeNav();
  await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={{ params }} />); });
  await flush();
  return { tree, nav };
}

// Every visible string, in the order it is drawn.
function textsInOrder(tree) {
  return tree.root.findAll((n) => n.type === 'Text' && Array.isArray(n.children)
    && n.children.every((c) => typeof c === 'string'))
    .map((n) => n.children.join(''));
}

// The pressable tabs themselves (the composite TouchableOpacity, not the
// host view it draws, which repeats the same role).
function findTabs(tree) {
  return tree.root.findAll((n) => typeof n.type !== 'string'
    && n.props?.accessibilityRole === 'tab' && typeof n.props.onPress === 'function');
}

function flatStyle(style) {
  return Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockRowProps)) delete mockRowProps[k];
  mockListProps = null;
  setMealLabelOverrides({});
  useAppStore.mockImplementation((selector) => selector(store));
  mockGetSlotRecents.mockResolvedValue([]);
  mockGetEntriesForClockWindow.mockResolvedValue([]);
});

describe('R7: "Around this time" on the Recent tab', () => {
  // Eaten at this very clock time on earlier days, so the rows sit inside the
  // 90-minute window whatever time the suite runs.
  const sameTime = (daysAgo) => Date.now() - daysAgo * DAY_MS;

  test('renders above the slot recents when adding to today, without repeating a recent food', async () => {
    mockGetSlotRecents.mockResolvedValue([{ food_ref: 'off:oats', last_quantity_g: 60 }]);
    mockGetEntriesForClockWindow.mockResolvedValue([
      { food_ref: 'off:oats', eaten_at: sameTime(1), quantity_g: 60, entry_date: shiftDate(todayLocalKey(), -1) },
      { food_ref: 'off:banana', eaten_at: sameTime(2), quantity_g: 118, entry_date: shiftDate(todayLocalKey(), -2) },
      { food_ref: 'off:banana', eaten_at: sameTime(3), quantity_g: 120, entry_date: shiftDate(todayLocalKey(), -3) },
      { food_ref: 'off:coffee', eaten_at: sameTime(4), quantity_g: 250, entry_date: shiftDate(todayLocalKey(), -4) },
    ]);
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: todayLocalKey() });

    const today = todayLocalKey();
    expect(mockGetEntriesForClockWindow).toHaveBeenCalledWith('u1', {
      fromDate: shiftDate(today, -60), toDate: shiftDate(today, -1),
    });
    // ONE batched resolve for the ranked refs, the slot recent left out.
    const clockCall = mockResolveFoodRefs.mock.calls.find(([, refs]) => refs.includes('off:banana'));
    expect(clockCall[1]).toEqual(['off:banana', 'off:coffee']);

    const lines = textsInOrder(tree);
    const label = lines.indexOf('Around this time');
    const banana = lines.indexOf('row:Clock off:banana');
    const coffee = lines.indexOf('row:Clock off:coffee');
    const recentsLabel = lines.indexOf('Recent at Breakfast');
    const recentOats = lines.indexOf('row:Recent off:oats');
    expect(label).toBeGreaterThan(-1);
    expect(label).toBeLessThan(banana);
    expect(banana).toBeLessThan(coffee);
    expect(coffee).toBeLessThan(recentsLabel);
    expect(recentsLabel).toBeLessThan(recentOats);
    expect(lines).not.toContain('row:Clock off:oats');

    // The row carries the portion last eaten, which its "+" and its sheet use.
    expect(mockRowProps['Clock off:banana'].food.last_quantity_g).toBe(118);
    expect(typeof mockRowProps['Clock off:banana'].onAdd).toBe('function');
    expect(typeof mockRowProps['Clock off:banana'].onPress).toBe('function');
  });

  test('is absent, and never read, when the add is not for today', async () => {
    mockGetEntriesForClockWindow.mockResolvedValue([
      { food_ref: 'off:banana', eaten_at: sameTime(2), quantity_g: 118, entry_date: '2026-07-01' },
    ]);
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: shiftDate(todayLocalKey(), -2) });
    expect(mockGetEntriesForClockWindow).not.toHaveBeenCalled();
    expect(textsInOrder(tree)).not.toContain('Around this time');
    expect(mockListProps.ListHeaderComponent).toBeUndefined();
  });

  test('is absent when nothing was eaten around this time', async () => {
    mockGetSlotRecents.mockResolvedValue([{ food_ref: 'off:oats', last_quantity_g: 60 }]);
    mockGetEntriesForClockWindow.mockResolvedValue([
      // Twelve hours away from now on the clock.
      { food_ref: 'off:late', eaten_at: Date.now() - 2 * DAY_MS + 12 * 60 * 60 * 1000, quantity_g: 100, entry_date: '2026-07-01' },
    ]);
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: todayLocalKey() });
    expect(mockGetEntriesForClockWindow).toHaveBeenCalled();
    const lines = textsInOrder(tree);
    expect(lines).not.toContain('Around this time');
    expect(lines).not.toContain('Recent at Breakfast');
    expect(lines).toContain('row:Recent off:oats');
    expect(mockListProps.ListHeaderComponent).toBeUndefined();
  });

  test('a meal with no recents of its own still keeps the keyboard down when there is something here to tap', async () => {
    mockGetSlotRecents.mockResolvedValue([]);
    mockGetEntriesForClockWindow.mockResolvedValue([
      { food_ref: 'off:banana', eaten_at: sameTime(2), quantity_g: 118, entry_date: '2026-07-01' },
    ]);
    const { tree } = await mount({ mealSlot: 'meal_5', entryDate: todayLocalKey() });
    expect(textsInOrder(tree)).toContain('row:Clock off:banana');
    const input = tree.root.findByProps({ accessibilityLabel: 'Search foods or brands' });
    expect(input.props.autoFocus).toBe(false);
  });

  test('belongs to the Recent tab only', async () => {
    mockGetEntriesForClockWindow.mockResolvedValue([
      { food_ref: 'off:banana', eaten_at: sameTime(2), quantity_g: 118, entry_date: '2026-07-01' },
    ]);
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: todayLocalKey(), initialTab: 'favourites' });
    expect(textsInOrder(tree)).not.toContain('Around this time');
  });
});

describe('R5: the header names the meal', () => {
  test('reads "Add to <meal name>", the renamed name when the meal has one', async () => {
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: todayLocalKey() });
    expect(textsInOrder(tree)).toContain('Add to Breakfast');
    setMealLabelOverrides({ meal_1: 'Brekkie' });
    const renamed = await mount({ mealSlot: 'meal_1', entryDate: todayLocalKey() });
    expect(textsInOrder(renamed.tree)).toContain('Add to Brekkie');
    expect(textsInOrder(renamed.tree)).not.toContain('Add food');
  });
});

describe('R5: the day line', () => {
  test('a back-dated add says the day under the tabs, in the add sheet\'s words', async () => {
    const twoDaysAgo = shiftDate(todayLocalKey(), -2);
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: twoDaysAgo });
    const line = entryDateLine(twoDaysAgo);
    expect(line).toMatch(/^For (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} [A-Z][a-z]+( \d{4})?\.$/);
    const lines = textsInOrder(tree);
    expect(lines.filter((t) => t === line)).toHaveLength(1);
    // Under the tab strip: after the last tab label, before any list content.
    expect(lines.indexOf(line)).toBeGreaterThan(lines.indexOf('More'));
  });

  test('a fixed date reads in full', async () => {
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: '2026-10-14' });
    const expected = entryDateLine('2026-10-14');
    expect(expected).toMatch(/^For Wednesday 14 October( 2026)?\.$/);
    expect(textsInOrder(tree)).toContain(expected);
  });

  test('today carries no day line', async () => {
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: todayLocalKey() });
    expect(textsInOrder(tree).some((t) => /^For [A-Z][a-z]+day /.test(t))).toBe(false);
  });
});

describe('R6: the plate closes with one undo toast that removes every row it wrote', () => {
  const OATS = { food_ref: 'off:oats', name: 'Oats', serving_g: 40, kcal_100g: 375, protein_100g: 13, carbs_100g: 60, fat_100g: 7 };
  const MILK = { food_ref: 'off:milk', name: 'Milk', serving_g: 200, kcal_100g: 46, protein_100g: 3.5, carbs_100g: 4.8, fat_100g: 1.6 };

  async function plateOf(foods) {
    // A renamed meal: the toast names the person's own meal.
    setMealLabelOverrides({ meal_1: 'Brekkie' });
    mockGetSlotRecents.mockResolvedValue(foods.map((f) => ({ food_ref: f.food_ref, last_quantity_g: f.serving_g })));
    const byRef = new Map(foods.map((f) => [f.food_ref, f]));
    require('../../lib/food/db').resolveSlotRecentRefs.mockImplementation((userId, refs) => (
      Promise.resolve(new Map(refs.map((r) => [r, byRef.get(r)])))
    ));
    const mounted = await mount({ mealSlot: 'meal_1', entryDate: '2026-07-03' });
    for (const f of foods) {
      await act(async () => { mockRowProps[f.name].onAdd(); });
    }
    const n = foods.length;
    const logBtn = mounted.tree.root.findAll((node) => node.props?.accessibilityLabel === `Log ${n} foods to Brekkie`
      && typeof node.props.onPress === 'function')[0];
    await act(async () => { await logBtn.props.onPress(); });
    return mounted;
  }

  test('two foods: "2 foods added to Brekkie." and Undo deletes both rows', async () => {
    mockLogFoodEntry.mockResolvedValueOnce('entry-a').mockResolvedValueOnce('entry-b');
    const { nav } = await plateOf([OATS, MILK]);

    // The per-food write is unchanged: one logFoodEntry per food, in order.
    expect(mockLogFoodEntry).toHaveBeenCalledTimes(2);
    expect(mockLogFoodEntry.mock.calls.map(([, e]) => e.foodRef)).toEqual(['off:oats', 'off:milk']);
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    const [message, opts] = mockToastShow.mock.calls[0];
    expect(message).toBe('2 foods added to Brekkie.');
    expect(opts).toEqual(expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);

    await act(async () => { await opts.action.onPress(); });
    expect(mockDeleteFoodEntry).toHaveBeenCalledTimes(2);
    expect(mockDeleteFoodEntry).toHaveBeenNthCalledWith(1, 'entry-a', 'u1');
    expect(mockDeleteFoodEntry).toHaveBeenNthCalledWith(2, 'entry-b', 'u1');
    // One toast for the whole Undo, no toast per food.
    expect(mockToastShow).toHaveBeenCalledTimes(1);
  });

  test('one food names the food: "Oats added to Brekkie."', async () => {
    mockLogFoodEntry.mockResolvedValueOnce('entry-only');
    await plateOf([OATS]);
    const [message, opts] = mockToastShow.mock.calls[0];
    expect(message).toBe('Oats added to Brekkie.');
    await act(async () => { await opts.action.onPress(); });
    expect(mockDeleteFoodEntry).toHaveBeenCalledWith('entry-only', 'u1');
  });

  test('a failed write says what happened and what to do, and offers no Undo', async () => {
    mockLogFoodEntry.mockResolvedValueOnce('entry-a').mockRejectedValueOnce(new Error('disk'));
    const { nav } = await plateOf([OATS, MILK]);
    expect(nav.goBack).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      '1 of 2 foods were added to Brekkie. The rest were not. Try again in a moment.',
      expect.objectContaining({ variant: 'error' }),
    );
  });
});

describe('R4/R16: the tab strip', () => {
  test('every tab is a 48 dp target by its own height, with no hit slop', async () => {
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: '2026-07-03' });
    const tabs = findTabs(tree);
    expect(tabs.map((tab) => tab.props.accessibilityState?.selected)).toEqual([true, false, false, false, false]);
    for (const tab of tabs) {
      expect(flatStyle(tab.props.style).minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
      expect(tab.props.hitSlop).toBeUndefined();
    }
  });

  test('the selected tab is ink, not amber; the others are muted', async () => {
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: '2026-07-03' });
    const tabs = findTabs(tree);
    const parts = (tab) => {
      const label = tab.findAll((n) => n.type === 'Text')[0];
      const rule = tab.findAll((n) => n.type === 'View').pop();
      return { label: flatStyle(label.props.style), rule: flatStyle(rule.props.style), text: label.children.join('') };
    };
    expect(tabs.map((tab) => parts(tab).text)).toEqual(['Recent', 'Suggested', 'Favourites', 'Often', 'More']);
    const selected = parts(tabs[0]);
    expect(selected.label.color).toBe(colors.textPrimary);
    expect(selected.rule.backgroundColor).toBe(colors.textPrimary);
    expect(selected.rule.backgroundColor).not.toBe(colors.primary);
    for (const tab of tabs.slice(1)) {
      const p = parts(tab);
      expect(p.label.color).toBe(colors.textMuted);
      expect(p.rule.backgroundColor).toBe('transparent');
    }
  });
});
