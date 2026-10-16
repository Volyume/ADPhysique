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
import fs from 'fs';
import path from 'path';

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
jest.mock('../../components/ModalHeader', () => () => null);
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/haptics', () => ({
  selection: jest.fn(),
  commit: jest.fn(),
  error: jest.fn(),
}));

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

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'MyMealsScreen.js'), 'utf8');
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

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function findByA11y(element, label) {
  if (!element || typeof element !== 'object') return null;
  if (element.props?.accessibilityLabel === label) return element;
  const children = Array.isArray(element.props?.children) ? element.props.children : [element.props?.children];
  for (const child of children) {
    const found = findByA11y(child, label);
    if (found) return found;
  }
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  useAppStore.mockImplementation((selector) => selector(store));
  listSavedMeals.mockResolvedValue([MEAL]);
  applySavedMealToDiary.mockResolvedValue({ logged: 2, entryIds: ['entry-1', 'entry-2'] });
  deleteFoodEntry.mockResolvedValue(true);
});

describe('MyMealsScreen saved-meal confirmation', () => {
  test('uses the same Saved meals label as the food search entry point', () => {
    // Coherence pass (2026-09-03): the screen is a DiaryStack modal and now
    // carries the shared ModalHeader like its sibling food modals; the pin
    // is on the label, not the chrome.
    expect(SOURCE).toContain('<ModalHeader title="Saved meals" onClose={() => navigation.goBack()} />');
    expect(SOURCE).not.toContain('title="My meals"');
  });

  test('shows a retry state when saved meals fail to load', async () => {
    listSavedMeals.mockRejectedValueOnce(new Error('offline'));
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    let tree;
    await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const text = flattenText(tree.toJSON());
    // RE-POINTED (D230 R15, food level-up 2026-10-16): the load-error title is
    // a full sentence; same truth, a retry state stands in for the empty prompt.
    expect(text).toContain('Your saved meals did not load');
    // L05-MM2 (2026-07-09 design audit): this is a local SQLite read failure,
    // not a network failure — "Check your connection and try again." ->
    // "Something went wrong loading these. Try again."
    expect(text).toContain('Something went wrong loading these. Try again.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('Save your go-to meals');
  });

  // RE-POINTED (D230 R15): the confirm sheet's button is "Add this meal", so
  // it no longer shares a label with the Diary's "Add another meal". Same
  // truth: a tap on the row opens the confirmation and only this button writes.
  test('tapping a meal opens confirmation and only Add this meal writes it', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    let tree;
    await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    expect(capturedListProps).toBeTruthy();
    const row = capturedListProps.renderItem({ item: MEAL });

    await act(async () => { row.props.onPress(); });

    expect(appAlert).not.toHaveBeenCalled();
    expect(applySavedMealToDiary).not.toHaveBeenCalled();
    const add = tree.root.findByProps({ title: 'Add this meal' });
    await act(async () => { await add.props.onPress(); });
    expect(applySavedMealToDiary).toHaveBeenCalledWith('u1', 'sm-1', { mealSlot: 'snack', entryDate: '2026-07-03' });
  });

  test('the visible more-actions button opens the rename/delete menu', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    const moreActions = findByA11y(row, 'More actions for Chicken and rice');
    expect(moreActions).toBeTruthy();
    await act(async () => { moreActions.props.onPress(); });

    expect(appAlert).toHaveBeenCalledWith(
      'Chicken and rice',
      undefined,
      expect.any(Array),
    );
  });

  test('a successful log shows a success + Undo toast and returns to the diary', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    let tree;
    await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { row.props.onPress(); });
    await act(async () => { await tree.root.findByProps({ title: 'Add this meal' }).props.onPress(); });

    // RE-POINTED (D230 R12): the toast names the meal it went to.
    expect(mockToastShow).toHaveBeenCalledWith('Chicken and rice added to Snacks.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  test('Undo deletes every entry the saved meal created, not just the first', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    let tree;
    await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { row.props.onPress(); });
    await act(async () => { await tree.root.findByProps({ title: 'Add this meal' }).props.onPress(); });

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
    let tree;
    await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { row.props.onPress(); });
    await act(async () => { await tree.root.findByProps({ title: 'Add this meal' }).props.onPress(); });

    expect(mockToastShow).toHaveBeenCalledWith('This meal has no foods in it.', expect.objectContaining({ variant: 'info' }));
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('L05-MM1: the info button opens a read-only inspect sheet, not a log or menu', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    let tree;
    await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    const viewButton = findByA11y(row, 'View Chicken and rice');
    expect(viewButton).toBeTruthy();
    await act(async () => { viewButton.props.onPress(); });
    await flush();

    expect(applySavedMealToDiary).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Chicken and rice');
    expect(text).toContain('600');
    expect(text).toContain('45g protein');
    expect(text).toContain('No food-by-food detail is stored for this meal.');
  });

  test('long press still opens the rename/delete menu', async () => {
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

// D230 R12, R15, R16 and R18 (food level-up 2026-10-16).
describe('MyMealsScreen: the house undo toast, calm failures, 48 dp icons (D230)', () => {
  const { logError } = require('../../lib/errorLog');
  const USUAL = { ...MEAL, id: 'sm-2', name: 'Your usual breakfast' };

  async function mountAndConfirm(meal, params) {
    const nav = makeNav();
    let tree;
    await act(async () => {
      tree = create(<MyMealsScreen navigation={nav} route={{ params }} />);
    });
    await flush();
    const row = capturedListProps.renderItem({ item: meal });
    await act(async () => { row.props.onPress(); });
    return { nav, tree, row };
  }

  test('the toast names the meal it went to, and Undo deletes every row the write returned', async () => {
    listSavedMeals.mockResolvedValue([USUAL]);
    applySavedMealToDiary.mockResolvedValue({ logged: 3, entryIds: ['e1', 'e2', 'e3'] });
    const { tree } = await mountAndConfirm(USUAL, { mealSlot: 'breakfast', entryDate: '2026-10-16' });
    await act(async () => { await tree.root.findByProps({ title: 'Add this meal' }).props.onPress(); });

    expect(mockToastShow).toHaveBeenCalledWith('Your usual breakfast added to Breakfast.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo' }),
    }));
    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });
    expect(deleteFoodEntry).toHaveBeenCalledTimes(3);
    expect(deleteFoodEntry.mock.calls.map((c) => c[0])).toEqual(['e1', 'e2', 'e3']);
    expect(deleteFoodEntry.mock.calls.every((c) => c[1] === 'u1')).toBe(true);
  });

  test('a failed Undo is not silent: the cause is logged and the person is told', async () => {
    applySavedMealToDiary.mockResolvedValue({ logged: 2, entryIds: ['e1', 'e2'] });
    deleteFoodEntry.mockRejectedValue(new Error('locked'));
    const { tree } = await mountAndConfirm(MEAL, { mealSlot: 'lunch', entryDate: '2026-10-16' });
    await act(async () => { await tree.root.findByProps({ title: 'Add this meal' }).props.onPress(); });
    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });

    expect(logError).toHaveBeenCalledWith('MyMeals.undoSavedMeal', expect.any(Error), { count: 2 });
    expect(mockToastShow).toHaveBeenCalledWith(
      'That meal was not removed. You can remove its foods from the diary.',
      { variant: 'error' },
    );
  });

  test('a failed log says what happened and what to do, and logs the cause first', async () => {
    applySavedMealToDiary.mockRejectedValue(new Error('disk'));
    const { tree, nav } = await mountAndConfirm(MEAL, { mealSlot: 'snack', entryDate: '2026-10-16' });
    await act(async () => { await tree.root.findByProps({ title: 'Add this meal' }).props.onPress(); });

    expect(logError).toHaveBeenCalledWith('MyMeals.applySavedMeal', expect.any(Error), { mealSlot: 'snack', itemCount: 2 });
    expect(mockToastShow).toHaveBeenCalledWith('That meal was not added. Try again in a moment.', { variant: 'error' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('the confirm sheet\'s button no longer shares a label with the Diary\'s "Add another meal"', async () => {
    const { tree } = await mountAndConfirm(MEAL, { mealSlot: 'snack', entryDate: '2026-10-16' });
    expect(tree.root.findAll((n) => n.props?.title === 'Add this meal').length).toBeGreaterThan(0);
    expect(tree.root.findAll((n) => n.props?.title === 'Add meal')).toHaveLength(0);
  });

  test('the sheet titles carry the header role', async () => {
    const { tree, row } = await mountAndConfirm(MEAL, { mealSlot: 'snack', entryDate: '2026-10-16' });
    // Open the rename sheet through the real long-press menu.
    await act(async () => { row.props.onLongPress(); });
    const rename = appAlert.mock.calls[0][2].find((b) => b.text === 'Rename');
    await act(async () => { rename.onPress(); });
    const headers = tree.root.findAll((n) => n.props?.accessibilityRole === 'header').map((n) => flattenText(n.props.children));
    expect(headers).toContain('Add saved meal?');
    expect(headers).toContain('Rename meal');
  });

  test('the info and more icons reach 48 dp: a 24 dp glyph plus the house 12 dp hit slop', async () => {
    await act(async () => { create(<MyMealsScreen navigation={makeNav()} route={{ params: {} }} />); });
    await flush();
    const row = capturedListProps.renderItem({ item: MEAL });
    for (const label of ['View Chicken and rice', 'More actions for Chicken and rice']) {
      const button = findByA11y(row, label);
      expect(button).toBeTruthy();
      const glyph = button.props.children;
      const slop = button.props.hitSlop;
      expect(glyph.props.size + slop.top + slop.bottom).toBeGreaterThanOrEqual(48);
      expect(glyph.props.size + slop.left + slop.right).toBeGreaterThanOrEqual(48);
    }
  });
});
