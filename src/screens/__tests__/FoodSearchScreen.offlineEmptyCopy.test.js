/**
 * FoodSearchScreen.offlineEmptyCopy.test.js
 *
 * Item 2 (offline-vs-not-found): a live search that comes back empty is
 * ambiguous -- did nothing match, or is the device offline and unable to
 * check the live food database at all? FoodSearchScreen.js already
 * distinguishes the two (renderEmpty(), search effect's NetInfo probe on a
 * zero-hit result), but had no regression test pinning it. This suite is
 * that guard: offline gets the offline-specific copy, online gets the plain
 * "No matches" copy. Screen and behaviour are unchanged by this suite.
 *
 * Same heavy-mount boundaries as FoodSearchScreen.test.js (DB layer,
 * useAppStore, navigation, sheets, FlashList), plus a mock of
 * @react-native-community/netinfo: the real native module throws under
 * Jest's node test environment (verified separately), which the screen's own
 * try/catch swallows -- so without mocking it here, the offline branch could
 * never be reached from a test and would go quietly untested forever.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
// The screen's renderEmpty() now goes through the shared EmptyState -> Button
// primitive (Batch 2 EmptyState adoption), which pulls in expo-haptics
// transitively; expo-haptics throws under the Jest node environment when not
// mocked (see WeeklyCheckInScreen.scanEvidence.test.js for the same pattern).
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn(), error: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data = [], renderItem, ListEmptyComponent }) => {
    const React = require('react');
    const { View } = require('react-native');
    if (!data.length) {
      const Empty = ListEmptyComponent;
      return <View>{typeof Empty === 'function' ? <Empty /> : Empty}</View>;
    }
    return (
      <View>
        {data.map((item, index) => (
          <React.Fragment key={item.key ?? index}>
            {renderItem({ item, index })}
          </React.Fragment>
        ))}
      </View>
    );
  },
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null }));
jest.mock('../../components/food/CuratedMealSheet', () => () => null);
jest.mock('../../components/food/FoodRow', () => ({ food }) => {
  const { Text } = require('react-native');
  return <Text>{food?.name ?? 'Food row'}</Text>;
});
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../components/food/FoodDetailSheet', () => () => null);
jest.mock('../../components/food/QuickAddSheet', () => () => null);

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
  getSlotRecents: jest.fn(() => Promise.resolve([])),
  resolveSlotRecentRef: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../lib/database', () => ({ getNutritionTargets: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../lib/food/curatedMeals', () => ({ getCuratedCandidates: jest.fn(() => []) }));
jest.mock('../../lib/food/mealSuggest', () => ({
  rankSuggestions: jest.fn(() => ({ suggestions: [], remaining: null, perMeal: null })),
  mealsLeftToday: jest.fn(() => 1),
}));
jest.mock('../../lib/food/frequents', () => ({ refreshFrequentsIfStale: jest.fn(() => Promise.resolve()) }));
jest.mock('../../lib/food/waterfall', () => ({ searchFoods: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../lib/food/sources/localCache', () => ({ resolveFoodRef: jest.fn(() => Promise.resolve(null)) }));

const mockNetInfoFetch = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: (...args) => mockNetInfoFetch(...args) },
}));

import useAppStore from '../../store/useAppStore';
import { searchFoods } from '../../lib/food/waterfall';
import FoodSearchScreen from '../FoodSearchScreen';

const store = { user: { id: 'u1' }, userProfile: {}, accessibility: { energyUnit: 'kcal' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => {
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    await Promise.resolve(); await Promise.resolve();
  });
}

// Matches the helper in FoodSearchScreen.test.js: walks rendered Text nodes
// directly rather than JSON-stringifying the tree, so a literal quote in the
// copy (e.g. the "No matches for "x"." message) can't be mistaken for an
// escaping artefact of JSON.stringify.
function treeHasText(tree, value) {
  return tree.root.findAll((node) => (
    Array.isArray(node.children)
    && node.children.some((child) => typeof child === 'string' && child.includes(value))
  )).length > 0;
}

async function typeQuery(tree, value) {
  const input = tree.root.findByProps({ accessibilityLabel: 'Search foods or brands' });
  act(() => { input.props.onChangeText(value); });
  act(() => { jest.advanceTimersByTime(250); });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => selector(store));
});
afterEach(() => { jest.useRealTimers(); });

describe('FoodSearchScreen live-search empty copy: offline vs genuine miss (item 2)', () => {
  test('no hits while offline shows the offline-specific copy, not "No matches"', async () => {
    jest.useFakeTimers();
    searchFoods.mockResolvedValue([]);
    mockNetInfoFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });

    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-08' } };
    let tree;
    await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={route} />); });
    await flush();

    await typeQuery(tree, 'nonexistentfood');
    // The NetInfo probe only fires after the (already-resolved) search
    // promise settles, so give the offline flag one more tick to land.
    await flush();

    expect(mockNetInfoFetch).toHaveBeenCalled();
    expect(treeHasText(
      tree,
      "You're offline, so live search can't check the food database. Saved foods still work, or add a custom food."
    )).toBe(true);
    expect(treeHasText(tree, 'No matches for')).toBe(false);
  });

  test('no hits while online shows the plain "No matches" copy', async () => {
    jest.useFakeTimers();
    searchFoods.mockResolvedValue([]);
    mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });

    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-08' } };
    let tree;
    await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={route} />); });
    await flush();

    await typeQuery(tree, 'nonexistentfood');
    await flush();

    expect(treeHasText(tree, 'No matches for "nonexistentfood".')).toBe(true);
    expect(treeHasText(tree, "You're offline")).toBe(false);
  });
});
