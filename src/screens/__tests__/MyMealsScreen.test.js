/**
 * MyMealsScreen — C6 (Wave A, 2026-07-03): logging a saved meal used to gate
 * behind an appAlert confirm dialog ("Log \"X\"?" / Cancel / Log it). That's
 * gone: tapping a row now logs immediately (optimistic write) and shows a
 * success + Undo toast, the same contract as DiaryScreen.onLogUsual and
 * FoodSearchScreen.confirmLog (see FoodSearchScreen.test.js).
 *
 * A saved meal fans out into MULTIPLE food_entries rows (one per item), so
 * this suite also pins that Undo removes EVERY entry created, not just the
 * first — the exact gap the plain `entryId` shape would have left open.
 *
 * Heavy screen mount, mocked at the same boundaries as the other food-screen
 * suites (FoodSearchScreen.test.js, MealPlanScreen.test.js): the DB layer,
 * useAppStore, navigation/focus, AppAlert, and FlashList (captured so the
 * test can invoke a row's renderItem directly, exactly as a real tap would).
 */
import { create, act } from 'react-test-renderer';

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
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

// FlashList: captured, not rendered — the test calls renderItem({ item })
// directly to get the row element, the same object a real tap would fire
// onPress/onLongPress on.
let capturedListProps = null;
jest.mock('@shopify/flash-list', () => ({
  FlashList: (props) => { capturedListProps = props; return null; },
}));

jest.mock('../../lib/food/db', () => ({
  listSavedMeals: jest.fn(),
  applySavedMealToDiary: jest.fn(),
  renameSavedMeal: jest.fn(),
  deleteSavedMeal: jest.fn(),
  deleteFoodEntry: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import { appAlert } from '../../components/AppAlert';
import {
  listSavedMeals, applySavedMealToDiary, deleteFoodEntry,
} from '../../lib/food/db';
import MyMealsScreen from '../MyMealsScreen';

const store = { user: { id: 'u1' }, accessibility: { energyUnit: 'kcal' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

const MEAL = {
  id: 'sm-1',
  name: 'Chicken and rice',
  itemCount: 2,
  totals: { kcal: 600, protein: 45, carbs: 60, fat: 12 },
};

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  useAppStore.mockImplementation((selector) => selector(store));
  listSavedMeals.mockResolvedValue([MEAL]);
  applySavedMealToDiary.mockResolvedValue({ logged: 2, entryIds: ['entry-1', 'entry-2'] });
  deleteFoodEntry.mockResolvedValue(true);
});

describe('MyMealsScreen row tap (C6)', () => {
  test('tapping a meal logs it immediately, no confirm dialog', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    expect(capturedListProps).toBeTruthy();
    const row = capturedListProps.renderItem({ item: MEAL });

    await act(async () => { await row.props.onPress(); });

    expect(appAlert).not.toHaveBeenCalled();
    expect(applySavedMealToDiary).toHaveBeenCalledWith('u1', 'sm-1', { mealSlot: 'snack', entryDate: '2026-07-03' });
  });

  test('a successful log shows a success + Undo toast and returns to the diary', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { await row.props.onPress(); });

    expect(mockToastShow).toHaveBeenCalledWith('Chicken and rice added.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  test('Undo deletes every entry the saved meal created, not just the first', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { await row.props.onPress(); });

    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });

    expect(deleteFoodEntry).toHaveBeenCalledTimes(2);
    expect(deleteFoodEntry).toHaveBeenCalledWith('entry-1', 'u1');
    expect(deleteFoodEntry).toHaveBeenCalledWith('entry-2', 'u1');
  });

  test('a meal with no foods shows an info toast and does not navigate back', async () => {
    applySavedMealToDiary.mockResolvedValue({ logged: 0, entryIds: [] });
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { await row.props.onPress(); });

    expect(mockToastShow).toHaveBeenCalledWith('This meal has no foods in it.', expect.objectContaining({ variant: 'info' }));
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('long press still opens the rename/delete menu (untouched by C6)', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { row.props.onLongPress(); });

    expect(appAlert).toHaveBeenCalledWith(
      'Chicken and rice',
      undefined,
      expect.any(Array),
    );
  });
});
