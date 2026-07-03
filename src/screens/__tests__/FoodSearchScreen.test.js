/**
 * A2 (Wave A first-week trust): confirmLog (the ServingPicker sheet's "Add to
 * diary") and confirmQuickAdd (the flash-icon quick add) previously logged
 * silently, with no toast at all — every OTHER log path (quickLogRelog,
 * DiaryScreen's onLogUsual) already shows a success + Undo toast. This suite
 * pins both paths to the same feedback contract.
 *
 * Heavy screen mount, mocked at the same boundaries the other food-screen
 * suites use (MealPlanScreen.test.js, FoodInsightsScreen.test.js): the DB
 * layer, useAppStore, navigation context, and the two sheet components
 * (captured so the test can call their onSave directly, exactly as a real
 * "Add to diary" / "Save" tap would).
 */
import { create, act } from 'react-test-renderer';

// Declared before every jest.mock() call (not just "mock"-prefixed) so there
// is no ambiguity around hoisting: this reference is fully initialised before
// any mocked module's factory can possibly read it.
const mockToastShow = jest.fn();

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null }));
jest.mock('../../components/food/CuratedMealSheet', () => () => null);
jest.mock('../../components/food/FoodRow', () => () => null);
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Sheets: captured on every render so the test can invoke onSave directly,
// the same call the real sheet makes on its own "Save" / "Add to diary" tap.
let mockSheetProps = null;
jest.mock('../../components/food/FoodDetailSheet', () => (props) => { mockSheetProps = props; return null; });
let mockQuickAddProps = null;
jest.mock('../../components/food/QuickAddSheet', () => (props) => { mockQuickAddProps = props; return null; });

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
  upsertSlotRecent: jest.fn(() => Promise.resolve()),
  getSlotRecents: jest.fn(() => Promise.resolve([])),
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
import { logFoodEntry, deleteFoodEntry, upsertSlotRecent } from '../../lib/food/db';
import FoodSearchScreen from '../FoodSearchScreen';

const store = { user: { id: 'u1' }, userProfile: {}, accessibility: { energyUnit: 'kcal' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

const SCANNED_FOOD = {
  food_ref: 'off:chicken',
  name: 'Chicken breast',
  source: 'off',
  kcal_100g: 165,
  protein_100g: 31,
  carbs_100g: 0,
  fat_100g: 3.6,
};

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSheetProps = null;
  mockQuickAddProps = null;
  useAppStore.mockImplementation((selector) => selector(store));
  logFoodEntry.mockResolvedValue('entry-1');
  deleteFoodEntry.mockResolvedValue(undefined);
  upsertSlotRecent.mockResolvedValue(undefined);
});

describe('FoodSearchScreen confirmLog (A2)', () => {
  test('a successful "Add to diary" shows a success + Undo toast, matching DiaryScreen.onLogUsual', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03', scannedFood: SCANNED_FOOD } };
    await act(async () => { create(<FoodSearchScreen navigation={nav} route={route} />); });
    await flush(); // the scannedFood effect opens the picker

    expect(mockSheetProps).toBeTruthy();
    expect(mockSheetProps.food).toEqual(SCANNED_FOOD);

    await act(async () => {
      await mockSheetProps.onSave({ quantityG: 150, mealSlot: 'snack', entryDate: '2026-07-03' });
    });

    expect(logFoodEntry).toHaveBeenCalledWith('u1', expect.objectContaining({
      entryDate: '2026-07-03',
      mealSlot: 'snack',
      foodRef: 'off:chicken',
      quantityG: 150,
    }));
    expect(mockToastShow).toHaveBeenCalledWith('Chicken breast added.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);

    // The Undo action deletes exactly the entry just created.
    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });
    expect(deleteFoodEntry).toHaveBeenCalledWith('entry-1', 'u1');
  });
});

describe('FoodSearchScreen confirmQuickAdd (A2)', () => {
  test('a successful quick add shows a success + Undo toast', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<FoodSearchScreen navigation={nav} route={route} />); });
    await flush();

    expect(mockQuickAddProps).toBeTruthy();
    await act(async () => {
      await mockQuickAddProps.onSave({ kcal: 300, protein: 20, carbs: 30, fat: 10, mealSlot: 'snack' });
    });

    expect(logFoodEntry).toHaveBeenCalledWith('u1', expect.objectContaining({
      foodRef: 'quick:adhoc',
      quantityG: 0,
      kcal: 300,
    }));
    expect(mockToastShow).toHaveBeenCalledWith('Quick add added.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));

    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });
    expect(deleteFoodEntry).toHaveBeenCalledWith('entry-1', 'u1');
  });
});
