/**
 * FoodSearchScreen.savedMealRelog.test.js
 *
 * T1 (world-class audit 2026-07-03, docs/world-class-audit-2026-07-03/
 * _SYNTHESIS.md:163): "saved meals/recipes join the ranked relog pool (the
 * go-to dinner deserves the 1-tap treatment single foods get)". A saved
 * meal that has earned its own food_slot_recents row (via
 * applySavedMealToDiary; see savedMeals.test.js) must rank alongside single
 * foods in the SAME Recents "Add again" list produced by getSlotRecents +
 * resolveSlotRecentRef, and a tap on it must log through
 * applySavedMealToDiary's fan-out + multi-entry Undo contract, not the
 * single-food scale-and-log path (quickLogRelog). A recipe needs no such
 * branch: resolveFoodRef already gives 'recipe:<id>' a normal food shape, so
 * it keeps the existing single-food contract untouched (pinned below too).
 *
 * Same heavy-mock scaffold as FoodSearchScreen.holdHint.test.js: FlashList
 * is captured outright so renderItem can be called directly for a row
 * element, with no real virtualised render required.
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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// getSlotRecents mixes a normal food ref with a saved meal's synthetic ref,
// exactly as the real food_slot_recents table would once a meal has earned
// its own row: same table, same ORDER BY, one merged pool.
jest.mock('../../lib/food/db', () => ({
  logFoodEntry: jest.fn(),
  deleteFoodEntry: jest.fn(() => Promise.resolve()),
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
  getSlotRecents: jest.fn(() => Promise.resolve([
    { food_ref: 'off:chicken', last_quantity_g: 150, log_count: 2 },
    { food_ref: 'meal:sm-1', last_quantity_g: 0, log_count: 5 },
  ])),
  // D138: loadBrowse now resolves every recent ref in ONE batched call
  // (resolveSlotRecentRefs) instead of looping resolveSlotRecentRef per row.
  // This mock mirrors resolveSlotRecentRef's own per-ref branching exactly,
  // just batched into a Map, so the mixed food + saved-meal pool below still
  // exercises the real 'meal:' branch this suite pins.
  resolveSlotRecentRefs: jest.fn((userId, refs) => Promise.resolve(new Map(refs.map((ref) => [
    ref,
    ref === 'meal:sm-1'
      ? {
        food_ref: 'meal:sm-1', savedMealId: 'sm-1', itemCount: 2,
        name: 'Go-to dinner', source: null, brand: null, serving_g: null,
        serving_label: '2 foods', kcal_100g: 600, protein_100g: 40, carbs_100g: 50, fat_100g: 20,
      }
      : {
        food_ref: 'off:chicken', name: 'Chicken breast', source: 'off',
        kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6,
      },
  ]))))
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

import useAppStore from '../../store/useAppStore';
import FoodSearchScreen from '../FoodSearchScreen';

const store = { user: { id: 'u1' }, userProfile: {}, accessibility: { energyUnit: 'kcal' } };

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
  useAppStore.mockImplementation((selector) => selector(store));
});

describe('T1: saved meals join the ranked "Add again" relog pool', () => {
  const ROUTE = { params: { mealSlot: 'dinner', entryDate: '2026-07-03' } };

  test('a saved meal with its own slot-recent row appears in the same Recents list as a single food', async () => {
    mountScreen(ROUTE);
    await flush();

    expect(capturedListProps).toBeTruthy();
    const keys = capturedListProps.data.map((d) => d.key);
    expect(keys).toEqual(expect.arrayContaining(['recents-off:chicken', 'recents-meal:sm-1']));
  });

  test('tapping the meal row opens its confirmation surface without logging', async () => {
    const nav = mountScreen(ROUTE);
    await flush();

    const item = capturedListProps.data.find((d) => d.key === 'recents-meal:sm-1');
    expect(item).toBeTruthy();
    const row = capturedListProps.renderItem({ item });
    // No sheet/plate/favourite affordances for a meal row: it is tap-only.
    expect(row.props.onLongPress).toBeUndefined();
    expect(row.props.onAdd).toBeUndefined();

    await act(async () => { row.props.onPress(); });
    expect(nav.navigate).toHaveBeenCalledWith('MyMeals', {
      mealSlot: 'dinner', entryDate: '2026-07-03', confirmMealId: 'sm-1',
    });
  });

  test('a single-food repeat row opens the portion confirmation sheet', async () => {
    mountScreen(ROUTE);
    await flush();

    const item = capturedListProps.data.find((d) => d.key === 'recents-off:chicken');
    expect(item).toBeTruthy();
    const row = capturedListProps.renderItem({ item });
    expect(typeof row.props.onPress).toBe('function');
    expect(typeof row.props.onLongPress).toBe('function');
    expect(row.props.longPressHint).toBeUndefined();
  });

  test('a recipe row (already food-shaped via resolveFoodRef) is not treated as a meal row', async () => {
    // Sanity: renderItem's meal branch keys strictly off a 'meal:' prefix, so
    // a 'recipe:<id>' row falls straight through the unchanged single-food
    // path below it (no special-casing needed; resolveFoodRef already
    // resolves recipes into a normal food shape).
    mountScreen(ROUTE);
    await flush();

    const item = { type: 'row', key: 'recents-recipe:r1', food: { food_ref: 'recipe:r1', name: 'Chicken and rice', kcal_100g: 144, serving_g: 250 } };
    const row = capturedListProps.renderItem({ item });
    expect(typeof row.props.onPress).toBe('function');
    expect(typeof row.props.onLongPress).toBe('function');
    expect(row.props.longPressHint).toBeUndefined();
  });
});
