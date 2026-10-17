/**
 * FoodSearchScreen, nothing on the plate is lost (food audit 2026-10-16).
 *
 * Pins, each written to fail on the pre-fix code:
 *  - Item 5: a single add from the sheet, a quick add, a suggested food or a
 *    curated meal, made while foods wait on the plate, writes the plate and
 *    the new food in ONE logFoodEntries call with ONE Undo (previously only
 *    the new food was written and the plate vanished with the screen).
 *  - Item 6: a row whose food has a remembered amount at this meal starts
 *    from it, so the row, its "+" and the sheet agree.
 *  - Item 17: a typed line of several foods shows its offer and no
 *    "No matches" block, with "Add custom food" still reachable.
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
const mockRowProps = {};
jest.mock('../../components/food/FoodRow', () => (props) => {
  const { Text } = require('react-native');
  mockRowProps[props.food.name] = props;
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
  // Re-pinned 2026-10-16: the Often tab now merges the device's own counts.
  getLocalFoodFrequents: jest.fn(() => Promise.resolve([])),
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
// Re-pinned 2026-10-16: mergeFrequents is the real pure function (the Often tab merges local counts).
jest.mock('../../lib/food/frequents', () => ({
  refreshFrequentsIfStale: jest.fn(() => Promise.resolve()),
  mergeFrequents: (...a) => jest.requireActual('../../lib/food/frequents').mergeFrequents(...a),
}));
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


const mockUndo = () => mockToastShow.mock.calls[mockToastShow.mock.calls.length - 1];

afterEach(async () => {
  await act(async () => { while (mounted.length) mounted.pop().unmount(); });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDetailProps = null;
  setMealLabelOverrides({});
  useAppStore.mockImplementation((selector) => selector(store));
  mockLogFoodEntries.mockResolvedValue(['id1', 'id2']);
  searchFoods.mockImplementation(async (userId, q) => (q === 'eggs' ? [EGG] : q === 'toast' ? [BREAD] : []));
});

async function plateOneEgg(tree) {
  await type(tree, 'eggs');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
  await flush();
  await act(async () => { mockRowProps.Egg.onAdd(); });
  await flush();
}

describe('item 5: the plate is written with a single add', () => {
  test('the sheet add writes the plate and the new food in one call with one Undo', async () => {
    const { tree, nav } = await mount();
    await plateOneEgg(tree);
    await act(async () => { mockRowProps.Egg.onPress(); });
    await flush();
    await act(async () => { await mockDetailProps.onSave({ quantityG: 36, mealSlot: 'breakfast', entryDate: todayLocalKey() }); });
    await flush();
    expect(mockLogFoodEntries).toHaveBeenCalledTimes(1);
    const entries = mockLogFoodEntries.mock.calls[0][1];
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.foodRef)).toEqual(['off:egg', 'off:egg']);
    const [message, opts] = mockUndo();
    expect(message).toBe('2 foods added to Breakfast.');
    await opts.action.onPress();
    expect(mockDeleteFoodEntries).toHaveBeenCalledWith('u1', ['id1', 'id2']);
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  test('with an empty plate the sheet add keeps its single write and says which meal', async () => {
    const { tree } = await mount();
    await type(tree, 'eggs');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    await flush();
    await act(async () => { mockRowProps.Egg.onPress(); });
    await flush();
    expect(mockDetailProps).toBeTruthy();
    expect(mockLogFoodEntries).not.toHaveBeenCalled();
  });

  test('a failed combined write rethrows to the sheet and keeps the plate', async () => {
    mockLogFoodEntries.mockRejectedValueOnce(new Error('disk'));
    const { tree, nav } = await mount();
    await plateOneEgg(tree);
    await act(async () => { mockRowProps.Egg.onPress(); });
    await flush();
    await expect(mockDetailProps.onSave({ quantityG: 36, mealSlot: 'breakfast', entryDate: todayLocalKey() })).rejects.toThrow('disk');
    expect(nav.goBack).not.toHaveBeenCalled();
    expect(textsInOrder(tree)).toContain('1 to log');
  });
});

describe('item 6: the row starts from the remembered amount', () => {
  test('a food with a remembered amount at this meal gives the row that amount', async () => {
    const { getSlotRecentQuantities } = require('../../lib/food/db');
    getSlotRecentQuantities.mockResolvedValue(new Map([['off:egg', 65]]));
    const { tree } = await mount();
    await type(tree, 'eggs');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    await flush();
    expect(mockRowProps.Egg.food.last_quantity_g).toBe(65);
  });
});

describe('item 17: the line offer stands alone', () => {
  test('no "No matches" block for a line of several foods; Add custom food stays', async () => {
    const { tree } = await mount();
    await type(tree, '2 zzz, yyy and xxx');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    await flush();
    const texts = textsInOrder(tree).join('|');
    expect(texts).toContain('Add these 3 as separate foods');
    expect(texts).not.toContain('No matches for');
    expect(pressable(tree, 'Add custom food')).toBeDefined();
  });
});
