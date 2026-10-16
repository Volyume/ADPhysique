/**
 * FoodSearchScreen, the typed food line (D230 R13, lane 3C).
 *
 * Mounted against the real screen and the real FoodLineReviewSheet, with the
 * same boundaries the other FoodSearchScreen suites mock (the DB layer, the
 * store, navigation, the search itself). FoodDetailSheet is reduced to a
 * capture of its props so a test can save a new amount exactly as the sheet
 * would.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - The offer ("Add these 3 as separate foods") appears only when the box
 *    holds two or more foods; one food, or an empty box, offers nothing.
 *  - Opening the review searches each part's name once (the existing search),
 *    lists each match with its portion in words and its energy and macros,
 *    and writes NOTHING.
 *  - A part with no match says so, and tapping it closes the review and puts
 *    the part's name in the search box.
 *  - A row can be removed; a row's amount can be changed in the food's own
 *    sheet and the review then shows the new amount.
 *  - The one button writes every remaining matched row in ONE logFoodEntries
 *    call (the plate's own write), shows the plate's undo toast, whose Undo
 *    is ONE deleteFoodEntries call, and clears the box.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();
let mockDetailProps = null;

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn(), error: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => {
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
jest.mock('../../components/food/QuickAddSheet', () => () => null);
jest.mock('../../components/food/FoodDetailSheet', () => (props) => {
  if (props.visible) mockDetailProps = props;
  return null;
});
jest.mock('../../components/food/FoodRow', () => (props) => {
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

const mockLogFoodEntries = jest.fn();
const mockDeleteFoodEntries = jest.fn(() => Promise.resolve(2));
jest.mock('../../lib/food/db', () => ({
  logFoodEntry: jest.fn(),
  logFoodEntries: (...a) => mockLogFoodEntries(...a),
  deleteFoodEntry: jest.fn(),
  deleteFoodEntries: (...a) => mockDeleteFoodEntries(...a),
  getFavourites: jest.fn(() => Promise.resolve([])),
  getDislikes: jest.fn(() => Promise.resolve([])),
  cycleFoodPreference: jest.fn(),
  getAllCustomFoods: jest.fn(() => Promise.resolve([])),
  getFoodFrequents: jest.fn(() => Promise.resolve([])),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  getLoggedMealSlotsForDay: jest.fn(() => Promise.resolve([])),
  applyCuratedMealToDiary: jest.fn(),
  upsertSlotRecent: jest.fn(() => Promise.resolve()),
  getSlotRecents: jest.fn(() => Promise.resolve([])),
  getSlotRecentQuantities: jest.fn(() => Promise.resolve(new Map())),
  resolveSlotRecentRefs: jest.fn(() => Promise.resolve(new Map())),
  getEntriesForClockWindow: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../lib/database', () => ({ getNutritionTargets: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../lib/food/curatedMeals', () => ({ getCuratedCandidates: jest.fn(() => []) }));
jest.mock('../../lib/food/mealSuggest', () => ({
  rankSuggestions: jest.fn(() => ({ suggestions: [], remaining: null, perMeal: null })),
  mealsLeftToday: jest.fn(() => 1),
}));
jest.mock('../../lib/food/frequents', () => ({ refreshFrequentsIfStale: jest.fn(() => Promise.resolve()) }));
jest.mock('../../lib/food/waterfall', () => ({ searchFoods: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../lib/food/sources/localCache', () => ({
  resolveFoodRefs: jest.fn(() => Promise.resolve(new Map())),
}));

import useAppStore from '../../store/useAppStore';
import { todayLocalKey } from '../../lib/dayKey';
import { setMealLabelOverrides } from '../../lib/food/mealSlots';
import { searchFoods } from '../../lib/food/waterfall';
import FoodSearchScreen from '../FoodSearchScreen';

const store = { user: { id: 'u1' }, userProfile: {}, accessibility: { energyUnit: 'kcal' } };

const EGG = { food_ref: 'off:egg', name: 'Egg', serving_g: 50, serving_label: 'egg', kcal_100g: 140, protein_100g: 12, carbs_100g: 1, fat_100g: 10 };
const BREAD = { food_ref: 'off:bread', name: 'Toast', serving_g: 36, serving_label: '1 slice', kcal_100g: 250, protein_100g: 9, carbs_100g: 45, fat_100g: 3 };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve(); // eslint-disable-line no-await-in-loop
  });
}

const mounted = [];

async function mount(params = { mealSlot: 'breakfast', entryDate: todayLocalKey() }) {
  let tree;
  const nav = makeNav();
  await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={{ params }} />); });
  await flush();
  mounted.push(tree);
  return { tree, nav };
}

const box = (tree) => tree.root.findByProps({ accessibilityLabel: 'Search foods or brands' });

async function type(tree, text) {
  await act(async () => { box(tree).props.onChangeText(text); });
  await flush();
}

function textsInOrder(tree) {
  return tree.root.findAll((n) => n.type === 'Text' && Array.isArray(n.children)
    && n.children.every((c) => typeof c === 'string'))
    .map((n) => n.children.join(''));
}

// The pressable (composite) carrying this accessibility label or starting with it.
function pressable(tree, label) {
  const hit = tree.root.findAll((n) => typeof n.type !== 'string'
    && typeof n.props?.onPress === 'function'
    && typeof n.props.accessibilityLabel === 'string'
    && (n.props.accessibilityLabel === label || n.props.accessibilityLabel.startsWith(`${label}`)))[0];
  return hit;
}

async function press(tree, label) {
  const node = pressable(tree, label);
  if (!node) throw new Error(`no pressable "${label}"`);
  await act(async () => { await node.props.onPress(); });
  await flush();
}

async function openReview(tree, text = '2 eggs, toast and a tea') {
  await type(tree, text);
  await press(tree, 'Add these 3 as separate foods');
}

afterEach(async () => {
  // Unmount so a pending debounced search cannot render after the run ends.
  await act(async () => { while (mounted.length) mounted.pop().unmount(); });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDetailProps = null;
  setMealLabelOverrides({});
  useAppStore.mockImplementation((selector) => selector(store));
  mockLogFoodEntries.mockResolvedValue(['id1', 'id2']);
  searchFoods.mockImplementation(async (userId, q) => {
    if (q === 'eggs') return [EGG];
    if (q === 'toast') return [BREAD];
    return [];
  });
});

describe('the offer', () => {
  test('appears for two or more foods, with the count, and not for one or none', async () => {
    const { tree } = await mount();
    expect(pressable(tree, 'Add these')).toBeUndefined();
    await type(tree, 'banana');
    expect(pressable(tree, 'Add these')).toBeUndefined();
    await type(tree, '2 eggs, toast');
    expect(pressable(tree, 'Add these 2 as separate foods')).toBeDefined();
    expect(textsInOrder(tree)).toContain('Add these 2 as separate foods');
    await type(tree, '2 eggs, toast and a tea');
    expect(pressable(tree, 'Add these 3 as separate foods')).toBeDefined();
    await type(tree, '');
    expect(pressable(tree, 'Add these')).toBeUndefined();
  });

  test('is absent when picking a recipe ingredient', async () => {
    const { tree } = await mount({ mealSlot: 'breakfast', entryDate: todayLocalKey(), pickMode: 'recipe' });
    await type(tree, '2 eggs, toast');
    expect(pressable(tree, 'Add these')).toBeUndefined();
  });
});

describe('the review', () => {
  test('lists each match with its portion in words, says when nothing matched, and writes nothing', async () => {
    const { tree } = await mount();
    await openReview(tree);
    const names = searchFoods.mock.calls.map((c) => c[1]);
    expect(names).toEqual(expect.arrayContaining(['eggs', 'toast', 'tea']));

    const lines = textsInOrder(tree);
    expect(lines).toContain('Check these before adding');
    expect(lines).toContain('Egg');
    expect(lines).toContain('2 eggs · 1 egg (50 g) each = 100 g · 140 kcal');
    expect(lines).toContain('12 P · 1 C · 10 F');
    expect(lines).toContain('Toast');
    expect(lines).toContain('toast · 1 slice (36 g) = 36 g · 90 kcal');
    expect(lines).toContain("No match for 'tea'");
    expect(lines).toContain('Add 2 foods to Breakfast');
    expect(lines.some((l) => /left out/.test(l))).toBe(true);

    const title = tree.root.findAll((n) => n.type === 'Text' && n.props.accessibilityRole === 'header'
      && n.children.join('') === 'Check these before adding');
    expect(title.length).toBeGreaterThan(0);
    expect(mockLogFoodEntries).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('a row with no match closes the review and puts its name in the box', async () => {
    const { tree } = await mount();
    await openReview(tree);
    await press(tree, "No match for 'tea'");
    expect(box(tree).props.value).toBe('tea');
    expect(textsInOrder(tree)).not.toContain('Check these before adding');
    expect(mockLogFoodEntries).not.toHaveBeenCalled();
  });

  test('a row can be removed', async () => {
    const { tree } = await mount();
    await openReview(tree);
    await press(tree, 'Remove Egg');
    const lines = textsInOrder(tree);
    expect(lines).not.toContain('Egg');
    expect(lines).toContain('Add 1 food to Breakfast');
    expect(mockLogFoodEntries).not.toHaveBeenCalled();
  });

  test('a row opens the food\'s own sheet, and its new amount replaces the row', async () => {
    const { tree } = await mount();
    await openReview(tree);
    await press(tree, 'Egg, 2 eggs');
    expect(mockDetailProps.food.food_ref).toBe('off:egg');
    expect(mockDetailProps.initialQuantityG).toBe(100);
    // The sheet changes an amount for a write that comes later, so its button
    // never says "Add to Breakfast" here.
    expect(mockDetailProps.saveTitle).toBe('Use this amount');
    await act(async () => { await mockDetailProps.onSave({ quantityG: 150, mealSlot: 'snack', entryDate: '2020-01-01' }); });
    await act(async () => { mockDetailProps.onClose(); });
    await flush();
    expect(textsInOrder(tree)).toContain('2 eggs · 150 g · 210 kcal');
    await press(tree, 'Add 2 foods to Breakfast');
    const entries = mockLogFoodEntries.mock.calls[0][1];
    expect(entries.map((e) => [e.foodRef, e.quantityG, e.mealSlot])).toEqual([
      ['off:egg', 150, 'breakfast'], ['off:bread', 36, 'breakfast'],
    ]);
  });
});

describe('the one button', () => {
  test('writes every remaining matched row in ONE call, shows the undo toast, and clears the box', async () => {
    const { tree, nav } = await mount();
    await openReview(tree);
    await press(tree, 'Add 2 foods to Breakfast');

    expect(mockLogFoodEntries).toHaveBeenCalledTimes(1);
    const [userId, entries] = mockLogFoodEntries.mock.calls[0];
    expect(userId).toBe('u1');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      entryDate: todayLocalKey(), mealSlot: 'breakfast', foodRef: 'off:egg', quantityG: 100, kcal: 140,
    });
    expect(entries[1]).toMatchObject({ foodRef: 'off:bread', quantityG: 36, kcal: 90 });

    expect(mockToastShow).toHaveBeenCalledTimes(1);
    const [message, opts] = mockToastShow.mock.calls[0];
    expect(message).toBe('2 foods added to Breakfast.');
    expect(opts.variant).toBe('undo');
    await opts.action.onPress();
    expect(mockDeleteFoodEntries).toHaveBeenCalledTimes(1);
    expect(mockDeleteFoodEntries).toHaveBeenCalledWith('u1', ['id1', 'id2']);

    expect(nav.goBack).toHaveBeenCalled();
    expect(box(tree).props.value).toBe('');
  });

  test('a failed write keeps the review and says nothing was added', async () => {
    mockLogFoodEntries.mockRejectedValueOnce(new Error('disk'));
    const { tree, nav } = await mount();
    await openReview(tree);
    await press(tree, 'Add 2 foods to Breakfast');
    expect(mockToastShow).toHaveBeenCalledWith('Those foods were not added. Try again in a moment.', expect.objectContaining({ variant: 'error' }));
    expect(nav.goBack).not.toHaveBeenCalled();
    expect(textsInOrder(tree)).toContain('Check these before adding');
  });
});
