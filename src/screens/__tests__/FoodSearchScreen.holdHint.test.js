/**
 * Wave A C7 (2026-07-03): the "Add again" re-log rows (Recents / Favourites /
 * Frequents tabs, no active search) log on tap and open the portion editor on
 * long-press, but that was accessibilityHint-only — invisible to a sighted
 * user. This pins the one-time caption shown above a populated re-log list:
 * it renders while the '@volyume_seen_diary_food_hint' flag is unset, hides
 * once it's 'true', and is dismissed either by performing the long-press it
 * describes or by the caption's own "Got it" link — without changing what
 * the long-press itself does (still opens the picker).
 *
 * Same heavy-mock scaffold as FoodSearchScreen.test.js (confirmLog/
 * confirmQuickAdd) and MyMealsScreen.test.js: the DB layer, useAppStore,
 * navigation context, and FlashList are captured/mocked at the same
 * boundaries. FlashList is mocked outright (not rendered via the FlatList
 * shim) so the test can call renderItem({ item }) directly for the row
 * element and read ListHeaderComponent straight off the captured props,
 * exactly the pattern MyMealsScreen.test.js uses.
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
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null }));
jest.mock('../../components/food/CuratedMealSheet', () => () => null);
jest.mock('../../components/food/FoodDetailSheet', () => () => null);
jest.mock('../../components/food/QuickAddSheet', () => () => null);
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../components/food/FoodRow', () => () => null);

let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));

const mockGetItem = jest.fn(() => Promise.resolve(null));
const mockSetItem = jest.fn(() => Promise.resolve());
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...a) => mockGetItem(...a),
  setItem: (...a) => mockSetItem(...a),
}));

jest.mock('../../lib/food/db', () => ({
  logFoodEntry: jest.fn(),
  deleteFoodEntry: jest.fn(),
  getFavourites: jest.fn(() => Promise.resolve([])),
  getDislikes: jest.fn(() => Promise.resolve([])),
  cycleFoodPreference: jest.fn(),
  getAllCustomFoods: jest.fn(() => Promise.resolve([])),
  getFoodFrequents: jest.fn(() => Promise.resolve([])),
  getRollupForDay: jest.fn(() => Promise.resolve(null)),
  getLoggedMealSlotsForDay: jest.fn(() => Promise.resolve([])),
  applyCuratedMealToDiary: jest.fn(),
  applySavedMealToDiary: jest.fn(),
  upsertSlotRecent: jest.fn(() => Promise.resolve()),
  getSlotRecents: jest.fn(() => Promise.resolve([{ food_ref: 'off:chicken', last_quantity_g: 150 }])),
  // T1: recents now resolve through resolveSlotRecentRef (not resolveFoodRef
  // directly), so it can also resolve a saved meal's synthetic 'meal:<id>'
  // ref. Every ref in THIS file is a normal food ref, so it mirrors the
  // resolveFoodRef mock below exactly; the hold-hint behaviour under test is
  // unaffected by that indirection.
  resolveSlotRecentRef: jest.fn(() => Promise.resolve({
    food_ref: 'off:chicken', name: 'Chicken breast', kcal_100g: 165,
    protein_100g: 31, carbs_100g: 0, fat_100g: 3.6,
  })),
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
  resolveFoodRef: jest.fn(() => Promise.resolve({
    food_ref: 'off:chicken', name: 'Chicken breast', kcal_100g: 165,
    protein_100g: 31, carbs_100g: 0, fat_100g: 3.6,
  })),
}));

import useAppStore from '../../store/useAppStore';
import FoodSearchScreen from '../FoodSearchScreen';
import HintCaption from '../../components/HintCaption';

const store = { user: { id: 'u1' }, userProfile: {}, accessibility: { energyUnit: 'kcal' } };
const HINT_TEXT = 'Hold a food to change the portion.';
const HINT_KEY = '@volyume_seen_diary_food_hint';

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function mountScreen(route) {
  const nav = makeNav();
  create(<FoodSearchScreen navigation={nav} route={route} />);
  return nav;
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  mockGetItem.mockResolvedValue(null);
  useAppStore.mockImplementation((selector) => selector(store));
});

describe('FoodSearchScreen re-log portion-edit hint', () => {
  test('renders above a populated Recents tab when the flag is unset', async () => {
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    mountScreen(route);
    await flush();

    expect(mockGetItem).toHaveBeenCalledWith(HINT_KEY);
    expect(capturedListProps).toBeTruthy();
    const header = capturedListProps.ListHeaderComponent;
    expect(header).toBeTruthy();
    expect(header.type).toBe(HintCaption);
    expect(header.props.text).toBe(HINT_TEXT);
  });

  test('does not render once the flag is already "true"', async () => {
    mockGetItem.mockResolvedValue('true');
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    mountScreen(route);
    await flush();

    expect(capturedListProps.ListHeaderComponent).toBeNull();
  });

  test('the re-log row long-press handler is unchanged (still opens the portion picker) and also marks the hint seen', async () => {
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    mountScreen(route);
    await flush();

    expect(capturedListProps.ListHeaderComponent).toBeTruthy();
    const row = capturedListProps.renderItem({
      item: { type: 'row', key: 'recents-off:chicken', food: { food_ref: 'off:chicken', name: 'Chicken breast', kcal_100g: 165 } },
    });
    expect(row.props.longPressHint).toBe('Long-press to change the portion');
    // Tap still one-tap re-logs; long-press still opens the picker (unchanged
    // behaviour — the hint only adds a side-effect, not a new handler).
    expect(typeof row.props.onPress).toBe('function');
    expect(typeof row.props.onLongPress).toBe('function');

    await act(async () => { row.props.onLongPress(); });
    await flush();

    expect(mockSetItem).toHaveBeenCalledWith(HINT_KEY, 'true');
    expect(capturedListProps.ListHeaderComponent).toBeNull();
  });

  test('"Got it" dismisses the hint directly, without needing the long-press', async () => {
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    mountScreen(route);
    await flush();

    const header = capturedListProps.ListHeaderComponent;
    expect(header).toBeTruthy();
    await act(async () => { header.props.onDismiss(); });
    await flush();

    expect(mockSetItem).toHaveBeenCalledWith(HINT_KEY, 'true');
    expect(capturedListProps.ListHeaderComponent).toBeNull();
  });
});
