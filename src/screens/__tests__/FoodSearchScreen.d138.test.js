/**
 * FoodSearchScreen.d138.test.js
 *
 * D138 (nutrition ruling): pins for FoodSearchScreen's part of the ruling --
 * items 1, 2 and 6 (item 3's batching is pinned by
 * FoodSearchScreen.savedMealRelog.test.js and FoodSearchScreen.test.js /
 * holdHint.test.js exercising the real loadBrowse/loadFrequents call paths;
 * this file additionally counts calls to prove they are batched, not looped).
 *
 * Same heavy-mock scaffold as FoodSearchScreen.holdHint.test.js: FlashList is
 * captured outright so renderItem can be called directly, with no real
 * virtualised render required.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn(), error: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null }));
jest.mock('../../components/food/CuratedMealSheet', () => () => null);
jest.mock('../../components/food/FoodDetailSheet', () => () => null);
jest.mock('../../components/food/QuickAddSheet', () => () => null);
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));

let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockGetSlotRecents = jest.fn(() => Promise.resolve([]));
const mockGetFavourites = jest.fn(() => Promise.resolve([]));
const mockGetFoodFrequents = jest.fn(() => Promise.resolve([]));
const mockResolveSlotRecentRefs = jest.fn(() => Promise.resolve(new Map()));
const mockResolveFoodRefs = jest.fn(() => Promise.resolve(new Map()));

jest.mock('../../lib/food/db', () => ({
  logFoodEntry: jest.fn(),
  deleteFoodEntry: jest.fn(),
  getFavourites: (...a) => mockGetFavourites(...a),
  getDislikes: jest.fn(() => Promise.resolve([])),
  cycleFoodPreference: jest.fn(),
  getAllCustomFoods: jest.fn(() => Promise.resolve([
    { id: 'cf-1', name: 'My chilli', kcal_100g: 120, protein_100g: 8, carbs_100g: 10, fat_100g: 4 },
  ])),
  getFoodFrequents: (...a) => mockGetFoodFrequents(...a),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  getLoggedMealSlotsForDay: jest.fn(() => Promise.resolve([])),
  applyCuratedMealToDiary: jest.fn(),
  applySavedMealToDiary: jest.fn(),
  upsertSlotRecent: jest.fn(() => Promise.resolve()),
  getSlotRecents: (...a) => mockGetSlotRecents(...a),
  getSlotRecentQuantities: jest.fn(() => Promise.resolve(new Map())),
  resolveSlotRecentRefs: (...a) => mockResolveSlotRecentRefs(...a),
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
  resolveFoodRefs: (...a) => mockResolveFoodRefs(...a),
}));

import useAppStore from '../../store/useAppStore';
import FoodSearchScreen from '../FoodSearchScreen';

const store = { user: { id: 'u1' }, userProfile: {}, accessibility: { energyUnit: 'kcal' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  mockGetSlotRecents.mockResolvedValue([]);
  mockGetFavourites.mockResolvedValue([]);
  mockGetFoodFrequents.mockResolvedValue([]);
  mockResolveSlotRecentRefs.mockImplementation(() => Promise.resolve(new Map()));
  mockResolveFoodRefs.mockImplementation(() => Promise.resolve(new Map()));
  useAppStore.mockImplementation((selector) => selector(store));
});

describe('D138 item 3: browse loaders batch their ref resolution', () => {
  test('loadBrowse resolves the whole recents list in ONE resolveSlotRecentRefs call, in order', async () => {
    mockGetSlotRecents.mockResolvedValue([
      { food_ref: 'off:a', last_quantity_g: 100 },
      { food_ref: 'off:b', last_quantity_g: 50 },
      { food_ref: 'off:c', last_quantity_g: 10 },
    ]);
    mockResolveSlotRecentRefs.mockImplementation((userId, refs) => Promise.resolve(new Map(refs.map((r, i) => [
      r, { food_ref: r, name: `Food ${i}`, kcal_100g: 100 },
    ]))));
    const nav = makeNav();
    await act(async () => { create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01' } }} />); });
    await flush();

    expect(mockResolveSlotRecentRefs).toHaveBeenCalledTimes(1);
    expect(mockResolveSlotRecentRefs).toHaveBeenCalledWith('u1', ['off:a', 'off:b', 'off:c']);
  });

  test('loadBrowse resolves favourites in ONE resolveFoodRefs call, never one per row', async () => {
    mockGetFavourites.mockResolvedValue([{ food_ref: 'off:x' }, { food_ref: 'off:y' }]);
    const nav = makeNav();
    await act(async () => { create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01' } }} />); });
    await flush();

    const favCall = mockResolveFoodRefs.mock.calls.find(([, refs]) => refs.includes('off:x'));
    expect(favCall).toBeTruthy();
    expect(favCall[1]).toEqual(['off:x', 'off:y']);
    // Never called once per favourite row.
    expect(mockResolveFoodRefs.mock.calls.filter(([, refs]) => refs.length === 1 && refs[0] === 'off:x')).toHaveLength(0);
  });

  test('loadFrequents resolves in ONE resolveFoodRefs call', async () => {
    mockGetFoodFrequents.mockResolvedValue([{ food_ref: 'off:p' }, { food_ref: 'off:q' }]);
    const nav = makeNav();
    await act(async () => {
      create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01', initialTab: 'frequents' } }} />);
    });
    await flush();

    const freqCall = mockResolveFoodRefs.mock.calls.find(([, refs]) => refs.includes('off:p'));
    expect(freqCall).toBeTruthy();
    expect(freqCall[1]).toEqual(['off:p', 'off:q']);
  });
});

describe('D138 item 1: the search box autofocuses only for a genuinely empty recents list', () => {
  test('an empty recents list (once loaded) autofocuses the search box', async () => {
    mockGetSlotRecents.mockResolvedValue([]);
    const nav = makeNav();
    let tree;
    await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01' } }} />); });
    await flush();

    const input = tree.root.findByProps({ accessibilityLabel: 'Search foods or brands' });
    expect(input.props.autoFocus).toBe(true);
  });

  test('a populated recents list keeps the keyboard down (no autofocus)', async () => {
    mockGetSlotRecents.mockResolvedValue([{ food_ref: 'off:a', last_quantity_g: 100 }]);
    mockResolveSlotRecentRefs.mockImplementation((userId, refs) => Promise.resolve(new Map(refs.map((r) => [
      r, { food_ref: r, name: 'Chicken', kcal_100g: 100 },
    ]))));
    const nav = makeNav();
    let tree;
    await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01' } }} />); });
    await flush();

    const input = tree.root.findByProps({ accessibilityLabel: 'Search foods or brands' });
    expect(input.props.autoFocus).toBe(false);
  });
});

describe('D138 item 2: the plate bar names the fastest path plainly', () => {
  test('reads "N to log", keeping the tap-to-review affordance', async () => {
    const nav = makeNav();
    let tree;
    await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01' } }} />); });
    await flush();

    // Drive a plate item through the real addToPlate path via the captured
    // FlashList renderItem, same technique FoodSearchScreen.savedMealRelog
    // uses -- avoids re-mocking FoodRow, which would hide the row's onAdd.
    const listData = capturedListProps.data;
    const row = capturedListProps.renderItem({ item: { type: 'row', key: 'custom-custom:cf-1', food: {
      food_ref: 'custom:cf-1', id: 'cf-1', name: 'My chilli', source: 'custom',
      kcal_100g: 120, protein_100g: 8, carbs_100g: 10, fat_100g: 4,
    } } });
    expect(listData).toBeTruthy();
    await act(async () => { row.props.onAdd(); });

    const joinedTexts = tree.root.findAll((n) => Array.isArray(n.children)
      && n.children.every((c) => typeof c === 'string'))
      .map((n) => n.children.join(''));
    expect(joinedTexts).toContain('1 to log');
    expect(joinedTexts.some((t) => t.includes('tap to review'))).toBe(true);
    expect(joinedTexts).not.toContain('1 selected');
  });
});

describe('D138 item 6: a custom food is editable from the More tab', () => {
  test('a custom row on the More tab carries onEdit, navigating to AddCustomFood in edit mode', async () => {
    const nav = makeNav();
    await act(async () => {
      create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01', initialTab: 'custom' } }} />);
    });
    await flush();

    const row = capturedListProps.renderItem({ item: { type: 'row', key: 'custom-custom:cf-1', food: {
      food_ref: 'custom:cf-1', id: 'cf-1', name: 'My chilli', source: 'custom',
      kcal_100g: 120, protein_100g: 8, carbs_100g: 10, fat_100g: 4,
    } } });

    expect(typeof row.props.onEdit).toBe('function');
    row.props.onEdit();
    expect(nav.navigate).toHaveBeenCalledWith('AddCustomFood', {
      mealSlot: 'snack', entryDate: '2026-09-01', editFoodId: 'cf-1',
    });
  });

  test('a non-custom row (e.g. an OFF result) never carries onEdit', async () => {
    const nav = makeNav();
    await act(async () => {
      create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01', initialTab: 'custom' } }} />);
    });
    await flush();

    const row = capturedListProps.renderItem({ item: { type: 'row', key: 'custom-off:x', food: {
      food_ref: 'off:x', name: 'Chicken breast', source: 'off', kcal_100g: 165,
    } } });
    expect(row.props.onEdit).toBeUndefined();
  });

  test('a custom food reached via search (not the More tab) never carries onEdit', async () => {
    const nav = makeNav();
    await act(async () => {
      create(<FoodSearchScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-09-01' } }} />);
    });
    await flush();

    // activeTab defaults to 'recents' here, not 'custom'.
    const row = capturedListProps.renderItem({ item: { type: 'row', key: 'recents-custom:cf-1', food: {
      food_ref: 'custom:cf-1', id: 'cf-1', name: 'My chilli', source: 'custom', kcal_100g: 120,
    } } });
    expect(row.props.onEdit).toBeUndefined();
  });
});
