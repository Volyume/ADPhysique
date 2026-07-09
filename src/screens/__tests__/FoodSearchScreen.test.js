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
const fs = require('fs');
const path = require('path');

import { create, act } from 'react-test-renderer';

// Declared before every jest.mock() call (not just "mock"-prefixed) so there
// is no ambiguity around hoisting: this reference is fully initialised before
// any mocked module's factory can possibly read it.
const mockToastShow = jest.fn();

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
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
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

import useAppStore from '../../store/useAppStore';
import { logFoodEntry, deleteFoodEntry, upsertSlotRecent } from '../../lib/food/db';
import { searchFoods } from '../../lib/food/waterfall';
import FoodSearchScreen from '../FoodSearchScreen';

const SCREEN_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'FoodSearchScreen.js'), 'utf8');

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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
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
afterEach(() => { jest.useRealTimers(); });

function treeHasText(tree, value) {
  return tree.root.findAll((node) => (
    Array.isArray(node.children)
    && node.children.some((child) => typeof child === 'string' && child.includes(value))
  )).length > 0;
}

describe('FoodSearchScreen selected plate sheet accessibility', () => {
  test('uses shared BottomSheet chrome with a labelled header', () => {
    expect(SCREEN_SOURCE).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet';/);
    expect(SCREEN_SOURCE).toMatch(/<BottomSheet[\s\S]*visible=\{showPlate\}[\s\S]*accessibilityLabel="Selected foods"/);
    expect(SCREEN_SOURCE).toMatch(/accessibilityRole="header"[\s\S]*Selected foods \(\{plate\.length\}\)/);
    expect(SCREEN_SOURCE).not.toMatch(/<Modal visible=\{showPlate\}/);
    // The blanket "no useSafeAreaInsets anywhere in this file" ban dates from
    // when the plate sheet was a raw Modal doing its own manual inset maths;
    // that anti-pattern is what the two guards above and below rule out. The
    // design-usability sweep (batch 1, lane-03) legitimately reintroduced
    // useSafeAreaInsets for a DIFFERENT, unrelated purpose: this screen is a
    // root-stack modal outside the tab navigator, so it must pad its own
    // sticky plateBar footer for the bottom system inset. The plate SHEET
    // itself still takes its chrome entirely from shared BottomSheet, which
    // is what this test actually pins.
    expect(SCREEN_SOURCE).not.toMatch(/plateModalBackdrop/);
  });

  test('keeps extra food actions in the Custom tab, not as a header icon pile', () => {
    expect(SCREEN_SOURCE).toMatch(/key: 'cta-scan-barcode'/);
    expect(SCREEN_SOURCE).toMatch(/key: 'cta-quick-add'/);
    expect(SCREEN_SOURCE).toMatch(/navigation\.navigate\('MyMeals', \{ mealSlot, entryDate \}\)/);
    expect(SCREEN_SOURCE).not.toMatch(/accessibilityLabel="Add a saved meal"/);
    expect(SCREEN_SOURCE).not.toMatch(/styles\.headerActions/);
  });

  test('keeps the plate log button slot-neutral on screen', () => {
    // Batch 1 lane-03 moved the top header onto the shared ModalHeader
    // component (was a bespoke <View style={styles.header}> with its own
    // styles.headerTitle Text); the title itself is unchanged ("Add food",
    // never the meal slot), which is what this test guards.
    expect(SCREEN_SOURCE).toMatch(/<ModalHeader title="Add food" onClose=\{/);
    expect(SCREEN_SOURCE).not.toMatch(/headerSubtitle/);
    expect(SCREEN_SOURCE).not.toMatch(/>to \{mealSlotLabel\(mealSlot\)\}/);
    expect(SCREEN_SOURCE).not.toMatch(/<ModalHeader title=\{`Add to \$\{mealSlotLabel\(mealSlot\)\}`\}/);
    expect(SCREEN_SOURCE).toMatch(/<Text style=\{styles\.plateLogText\}>Log selected<\/Text>/);
    expect(SCREEN_SOURCE).toMatch(/accessibilityLabel=\{`Log \$\{plate\.length\} to \$\{mealSlotLabel\(mealSlot\)\}`\}/);
    expect(SCREEN_SOURCE).not.toMatch(/<Text style=\{styles\.plateLogText\}>Log \{plate\.length\} to \{mealSlotLabel\(mealSlot\)\}<\/Text>/);
  });

  test('does not duplicate the custom-food CTA while already on the custom tab', () => {
    expect(SCREEN_SOURCE).toMatch(/if \(activeTab === 'custom'\) \{/);
    expect(SCREEN_SOURCE).toMatch(/label: 'Add custom food'/);
    expect(SCREEN_SOURCE).toMatch(/activeTab !== 'custom' && query\.trim\(\)\.length >= 2 && results\.length > 0/);
  });

  test('the no-target suggested state can open Nutrition Targets across tabs', () => {
    expect(SCREEN_SOURCE).toMatch(/import \{ navigateCrossTab \} from '\.\.\/navigation\/navigateCrossTab';/);
    expect(SCREEN_SOURCE).toMatch(/Set your targets first and Volyume can suggest meals that fit them\./);
    expect(SCREEN_SOURCE).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'NutritionTargets'\)/);
    // Batch 2 EmptyState adoption (2026-07-09): this block was a hand-rolled
    // emptyWrap/emptyActionText pair, now the shared EmptyState primitive.
    // old -> new: accessibilityLabel="Set nutrition targets" on a raw
    // TouchableOpacity -> actionAccessibilityLabel="Set nutrition targets" on
    // EmptyState (same accessible name, same tap target); the hand-rolled
    // <Text style={styles.emptyActionText}> label -> EmptyState's actionLabel
    // prop, rendered through the shared Button primitive.
    expect(SCREEN_SOURCE).toMatch(/actionLabel="Set nutrition targets"/);
    expect(SCREEN_SOURCE).toMatch(/actionAccessibilityLabel="Set nutrition targets"/);
  });

  test('the custom tab labels saved meal surfaces plainly', () => {
    expect(SCREEN_SOURCE).toMatch(/label: 'Recipes'/);
    expect(SCREEN_SOURCE).toMatch(/label: 'Saved meals'/);
    expect(SCREEN_SOURCE).not.toMatch(/label: 'My recipes'/);
    expect(SCREEN_SOURCE).not.toMatch(/label: 'My meals'/);
  });

  test('suggested empty copy uses meal wording, not internal slot jargon', () => {
    expect(SCREEN_SOURCE).toContain('No suggestions ready for this meal');
    expect(SCREEN_SOURCE).not.toContain('No suggestions ready for this slot');
  });

  test('custom-food fallback uses a bordered button surface, not an orange text link', () => {
    expect(SCREEN_SOURCE).toMatch(/style=\{styles\.footerBtn\}/);
    expect(SCREEN_SOURCE).toMatch(/footerBtn: \{[\s\S]*borderRadius: radius\.md[\s\S]*backgroundColor: colors\.surface2/);
    expect(SCREEN_SOURCE).toMatch(/footerBtnText: \{ \.\.\.type\.bodyStrong, color: colors\.textPrimary \}/);
  });
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
    expect(mockToastShow).toHaveBeenCalledWith('Quick add saved.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));

    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });
    expect(deleteFoodEntry).toHaveBeenCalledWith('entry-1', 'u1');
  });
});

describe('FoodSearchScreen live search race guard', () => {
  test('a slower older search response cannot overwrite the latest query results', async () => {
    jest.useFakeTimers();
    const older = deferred();
    const newer = deferred();
    searchFoods.mockImplementation((_userId, q) => {
      if (q === 'ri') return older.promise;
      if (q === 'ric') return newer.promise;
      return Promise.resolve([]);
    });

    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    let tree;
    await act(async () => { tree = create(<FoodSearchScreen navigation={nav} route={route} />); });
    await flush();

    const input = tree.root.findByProps({ accessibilityLabel: 'Search foods or brands' });
    act(() => { input.props.onChangeText('ri'); });
    act(() => { jest.advanceTimersByTime(250); });
    await flush();
    expect(searchFoods).toHaveBeenCalledWith('u1', 'ri', { limit: 25 });

    act(() => { input.props.onChangeText('ric'); });
    act(() => { jest.advanceTimersByTime(250); });
    await flush();
    expect(searchFoods).toHaveBeenCalledWith('u1', 'ric', { limit: 25 });

    await act(async () => {
      newer.resolve([{ food_ref: 'local:rice', name: 'Rice cakes', kcal_100g: 380 }]);
      await Promise.resolve();
    });
    expect(treeHasText(tree, 'Rice cakes')).toBe(true);

    await act(async () => {
      older.resolve([{ food_ref: 'local:risotto', name: 'Old risotto result', kcal_100g: 220 }]);
      await Promise.resolve();
    });

    expect(treeHasText(tree, 'Rice cakes')).toBe(true);
    expect(treeHasText(tree, 'Old risotto result')).toBe(false);

    jest.useRealTimers();
  });
});
