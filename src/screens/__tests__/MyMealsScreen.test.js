/**
 * MyMealsScreen — C6 (Wave A, 2026-07-03): logging a saved meal gives a
 * success + Undo toast, the same contract as DiaryScreen.onLogUsual and
 * FoodSearchScreen.confirmLog (see FoodSearchScreen.test.js).
 *
 * A saved meal fans out into MULTIPLE food_entries rows (one per item), so
 * this suite also pins that Undo removes EVERY entry created, not just the
 * first — the exact gap the plain `entryId` shape would have left open.
 *
 * D230 lane 3B (R12): tapping a meal opens a sheet listing its foods with
 * their grams (a house Stepper each, a remove control with Undo in the sheet),
 * and "Add to <meal>" writes the foods AS SHOWN in ONE logFoodEntries call;
 * the meal itself is never changed by logging. "Edit this meal" turns the
 * same list into an editor (rename, grams, remove, Add a food through a
 * FoodSearch round trip in route params) and Save is ONE updateSavedMeal
 * call. RE-POINTED here: the old confirmation ("Add saved meal?" / "Add this
 * meal" over applySavedMealToDiary) is that sheet; the same truths hold (only
 * an explicit button writes, the toast names the meal, Undo removes every
 * row, a failure is a calm full sentence with its cause logged).
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
  logFoodEntries: jest.fn(),
  deleteFoodEntries: jest.fn(),
  renameSavedMeal: jest.fn(),
  deleteSavedMeal: jest.fn(),
  updateSavedMeal: jest.fn(),
  upsertSlotRecent: jest.fn(),
}));
jest.mock('../../lib/food/sources/localCache', () => ({ resolveFoodRefs: jest.fn() }));

import useAppStore from '../../store/useAppStore';
import { appAlert } from '../../components/AppAlert';
import {
  listSavedMeals, logFoodEntries, deleteFoodEntries, updateSavedMeal, renameSavedMeal, upsertSlotRecent,
} from '../../lib/food/db';
import { resolveFoodRefs } from '../../lib/food/sources/localCache';
import { scaleMacros } from '../../lib/food/macros';
import MyMealsScreen from '../MyMealsScreen';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'MyMealsScreen.js'), 'utf8');
const store = { user: { id: 'u1' }, accessibility: { energyUnit: 'kcal' } };

function makeNav() {
  return { navigate: jest.fn(), push: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

const CHICKEN = { foodRef: 'global:chicken', name: 'Chicken breast', quantityG: 200, kcal: 330, proteinG: 62, carbsG: 0, fatG: 7, fibreG: 0 };
const RICE = { foodRef: 'global:rice', name: 'White rice', quantityG: 150, kcal: 195, proteinG: 4.5, carbsG: 42, fatG: 0.5, fibreG: null };
const MEAL = {
  id: 'sm-1',
  name: 'Chicken and rice',
  items: [CHICKEN, RICE],
  itemCount: 2,
  totals: { kcal: 525, protein: 66.5, carbs: 42, fat: 7.5 },
};
const BARE_MEAL = { id: 'sm-0', name: 'Bare meal', itemCount: 2, totals: { kcal: 600, protein: 45, carbs: 60, fat: 12 } };

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

// The first pressable carrying a label (a composite and its host share props).
const byLabel = (tree, label) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
)[0];
const byTitle = (tree, title) => tree.root.findAll((n) => n.props?.title === title && typeof n.props?.onPress === 'function')[0];
const press = async (node) => { await act(async () => { await node.props.onPress(); }); };

beforeEach(() => {
  jest.clearAllMocks();
  capturedListProps = null;
  useAppStore.mockImplementation((selector) => selector(store));
  listSavedMeals.mockResolvedValue([MEAL]);
  logFoodEntries.mockResolvedValue(['entry-1', 'entry-2']);
  deleteFoodEntries.mockResolvedValue(2);
  updateSavedMeal.mockResolvedValue(undefined);
  upsertSlotRecent.mockResolvedValue(undefined);
  resolveFoodRefs.mockResolvedValue(new Map());
});

async function mountOpen(meal = MEAL, params = { mealSlot: 'snack', entryDate: '2026-07-03' }) {
  const nav = makeNav();
  let tree;
  await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={{ params }} />); });
  await flush();
  const row = capturedListProps.renderItem({ item: meal });
  await act(async () => { row.props.onPress(); });
  await flush();
  return { nav, tree, row };
}

describe('MyMealsScreen saved-meal sheet', () => {
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

  // RE-POINTED (D230 R12): the sheet that opens on a tap lists the foods and
  // its button is "Add to <meal>". Same truth: a tap on the row opens the
  // sheet and only its button writes.
  test('tapping a meal opens its sheet and only Add to <meal> writes it', async () => {
    const { tree } = await mountOpen();

    expect(appAlert).not.toHaveBeenCalled();
    expect(logFoodEntries).not.toHaveBeenCalled();
    await press(byTitle(tree, 'Add to Snacks'));
    expect(logFoodEntries).toHaveBeenCalledTimes(1);
  });

  // (a) The sheet lists the foods with their grams and the foods are written
  // AS SHOWN, scaled, in ONE logFoodEntries call.
  test('the sheet lists each food with its grams and kcal, resolved names, and a live total', async () => {
    resolveFoodRefs.mockResolvedValue(new Map([['global:chicken', { name: 'Chicken breast, grilled' }]]));
    const { tree } = await mountOpen();
    expect(resolveFoodRefs).toHaveBeenCalledTimes(1);
    expect(resolveFoodRefs).toHaveBeenCalledWith('u1', ['global:chicken', 'global:rice']);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Chicken breast, grilled'); // the resolved name
    expect(text).toContain('White rice');              // the stored name stands in
    expect(text).toContain('200 g');
    expect(text).toContain('150 g');
    expect(text).toContain('330 kcal');
    expect(text).toContain('Total: 525 kcal, 66.5 g protein, 42 g carbs, 7.5 g fat.');
  });

  test('changed grams scale the macros and the foods are written as shown, in ONE call', async () => {
    const { tree } = await mountOpen();
    await press(byLabel(tree, 'More Chicken breast'));
    await press(byLabel(tree, 'More Chicken breast'));
    // The live total moved with the grams: 220 g chicken is 363 kcal.
    expect(flattenText(tree.toJSON())).toContain('Total: 558 kcal');

    await press(byTitle(tree, 'Add to Snacks'));

    expect(logFoodEntries).toHaveBeenCalledTimes(1);
    const [uid, rows] = logFoodEntries.mock.calls[0];
    expect(uid).toBe('u1');
    expect(rows).toHaveLength(2);
    const per100 = { kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.5, fibre_100g: 0 };
    const expected = scaleMacros(per100, 220);
    expect(rows[0]).toEqual({
      entryDate: '2026-07-03', mealSlot: 'snack', foodRef: 'global:chicken', quantityG: 220,
      kcal: expected.kcal, proteinG: expected.proteinG, carbsG: expected.carbsG, fatG: expected.fatG, fibreG: expected.fibreG,
    });
    expect(rows[0].kcal).toBe(363);
    expect(rows[0].proteinG).toBe(68.2);
    // The untouched food is written exactly as stored.
    expect(rows[1]).toEqual({
      entryDate: '2026-07-03', mealSlot: 'snack', foodRef: 'global:rice', quantityG: 150,
      kcal: 195, proteinG: 4.5, carbsG: 42, fatG: 0.5, fibreG: null,
    });
    // Logging never changes the meal.
    expect(updateSavedMeal).not.toHaveBeenCalled();
    expect(renameSavedMeal).not.toHaveBeenCalled();
  });

  test('stepping up and back down returns the exact stored figures', async () => {
    const { tree } = await mountOpen();
    await press(byLabel(tree, 'More Chicken breast'));
    await press(byLabel(tree, 'Less Chicken breast'));
    await press(byTitle(tree, 'Add to Snacks'));
    expect(logFoodEntries.mock.calls[0][1][0]).toMatchObject({ quantityG: 200, kcal: 330, proteinG: 62, fatG: 7 });
  });

  // (b) A removed food is not written; Undo in the sheet puts it back; the
  // meal is unchanged by logging.
  test('a removed food is not written, Undo in the sheet brings it back, and the meal is unchanged', async () => {
    const { tree } = await mountOpen();
    await press(byLabel(tree, 'Take Chicken breast out'));
    expect(flattenText(tree.toJSON())).toContain('Chicken breast was taken out.');
    expect(flattenText(tree.toJSON())).toContain('Total: 195 kcal');

    await press(byLabel(tree, 'Put Chicken breast back'));
    expect(flattenText(tree.toJSON())).toContain('Total: 525 kcal');

    await press(byLabel(tree, 'Take Chicken breast out'));
    await press(byTitle(tree, 'Add to Snacks'));
    expect(logFoodEntries).toHaveBeenCalledTimes(1);
    const rows = logFoodEntries.mock.calls[0][1];
    expect(rows.map((r) => r.foodRef)).toEqual(['global:rice']);
    expect(updateSavedMeal).not.toHaveBeenCalled();
  });

  test('taking every food out leaves nothing to add', async () => {
    const { tree } = await mountOpen();
    await press(byLabel(tree, 'Take Chicken breast out'));
    await press(byLabel(tree, 'Take White rice out'));
    expect(flattenText(tree.toJSON())).toContain('Every food has been taken out. Put one back to add this meal.');
    expect(byTitle(tree, 'Add to Snacks').props.disabled).toBe(true);
  });

  test('the more-actions button opens the rename/delete menu', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    const moreActions = findByA11y(row, 'More actions for Chicken and rice');
    expect(moreActions).toBeTruthy();
    await act(async () => { moreActions.props.onPress(); });

    expect(appAlert).toHaveBeenCalledWith('Chicken and rice', undefined, expect.any(Array));
  });

  test('a successful log shows a success + Undo toast and returns to the diary', async () => {
    const { nav, tree } = await mountOpen();
    await press(byTitle(tree, 'Add to Snacks'));

    // RE-POINTED (D230 R12): the toast names the meal it went to.
    expect(mockToastShow).toHaveBeenCalledWith('Chicken and rice added to Snacks.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
    // The meal as a whole earns its "Add again" memory.
    expect(upsertSlotRecent).toHaveBeenCalledWith('u1', { mealSlot: 'snack', foodRef: 'meal:sm-1', quantityG: 0 });
  });

  // RE-POINTED (D230 lane 3B): the fan-out is one logFoodEntries call, so Undo
  // is one deleteFoodEntries call with every id it returned.
  test('Undo deletes every entry the saved meal created, in one call', async () => {
    const { tree } = await mountOpen();
    await press(byTitle(tree, 'Add to Snacks'));

    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });

    expect(deleteFoodEntries).toHaveBeenCalledTimes(1);
    expect(deleteFoodEntries).toHaveBeenCalledWith('u1', ['entry-1', 'entry-2']);
  });

  test('a meal with no foods shows an info toast, writes nothing and does not navigate back', async () => {
    const { nav, tree } = await mountOpen(BARE_MEAL);
    await press(byTitle(tree, 'Add to Snacks'));

    expect(mockToastShow).toHaveBeenCalledWith('This meal has no foods in it.', expect.objectContaining({ variant: 'info' }));
    expect(logFoodEntries).not.toHaveBeenCalled();
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  // RE-POINTED (L05-MM1): the info button used to open a read-only peek; it
  // now opens the same sheet as a tap on the row (which lists the foods). Same
  // truth: opening it logs nothing and opens no menu.
  test('L05-MM1: the info button opens the meal\'s sheet, not a log or menu', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    let tree;
    await act(async () => { tree = create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: BARE_MEAL });
    const viewButton = findByA11y(row, 'View Bare meal');
    expect(viewButton).toBeTruthy();
    await act(async () => { viewButton.props.onPress(); });
    await flush();

    expect(logFoodEntries).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Bare meal');
    expect(text).toContain('No food-by-food detail is stored for this meal.');
  });

  test('long press still opens the rename/delete menu', async () => {
    const nav = makeNav();
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-03' } };
    await act(async () => { create(<MyMealsScreen navigation={nav} route={route} />); });
    await flush();

    const row = capturedListProps.renderItem({ item: MEAL });
    await act(async () => { row.props.onLongPress(); });

    expect(appAlert).toHaveBeenCalledWith('Chicken and rice', undefined, expect.any(Array));
  });
});

// D230 R12, R15, R16 and R18 (food level-up 2026-10-16).
describe('MyMealsScreen: the house undo toast, calm failures, 48 dp icons (D230)', () => {
  const { logError } = require('../../lib/errorLog');
  const USUAL = { ...MEAL, id: 'sm-2', name: 'Your usual breakfast' };

  test('the toast names the meal it went to, and Undo deletes every row the write returned', async () => {
    listSavedMeals.mockResolvedValue([USUAL]);
    logFoodEntries.mockResolvedValue(['e1', 'e2', 'e3']);
    const { tree } = await mountOpen(USUAL, { mealSlot: 'breakfast', entryDate: '2026-10-16' });
    await press(byTitle(tree, 'Add to Breakfast'));

    expect(mockToastShow).toHaveBeenCalledWith('Your usual breakfast added to Breakfast.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo' }),
    }));
    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });
    expect(deleteFoodEntries).toHaveBeenCalledWith('u1', ['e1', 'e2', 'e3']);
  });

  test('a failed Undo is not silent: the cause is logged and the person is told', async () => {
    logFoodEntries.mockResolvedValue(['e1', 'e2']);
    deleteFoodEntries.mockRejectedValue(new Error('locked'));
    const { tree } = await mountOpen(MEAL, { mealSlot: 'lunch', entryDate: '2026-10-16' });
    await press(byTitle(tree, 'Add to Lunch'));
    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });

    expect(logError).toHaveBeenCalledWith('MyMeals.undoSavedMeal', expect.any(Error), { count: 2 });
    expect(mockToastShow).toHaveBeenCalledWith(
      'That meal was not removed. You can remove its foods from the diary.',
      { variant: 'error' },
    );
  });

  test('a failed log says what happened and what to do, and logs the cause first', async () => {
    logFoodEntries.mockRejectedValue(new Error('disk'));
    const { tree, nav } = await mountOpen(MEAL, { mealSlot: 'snack', entryDate: '2026-10-16' });
    await press(byTitle(tree, 'Add to Snacks'));

    expect(logError).toHaveBeenCalledWith('MyMeals.applySavedMeal', expect.any(Error), { mealSlot: 'snack', itemCount: 2 });
    expect(mockToastShow).toHaveBeenCalledWith('That meal was not added. Try again in a moment.', { variant: 'error' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  // RE-POINTED: the sheet's button no longer reads "Add this meal"; it names
  // where the foods go. The retired "Add meal" label stays retired.
  test('the sheet\'s button names the meal it adds to, and never shares the Diary\'s "Add another meal"', async () => {
    const { tree } = await mountOpen(MEAL, { mealSlot: 'snack', entryDate: '2026-10-16' });
    expect(tree.root.findAll((n) => n.props?.title === 'Add to Snacks').length).toBeGreaterThan(0);
    expect(tree.root.findAll((n) => n.props?.title === 'Add meal')).toHaveLength(0);
    expect(tree.root.findAll((n) => n.props?.title === 'Add another meal')).toHaveLength(0);
  });

  test('the sheet titles carry the header role', async () => {
    const { tree, row } = await mountOpen(MEAL, { mealSlot: 'snack', entryDate: '2026-10-16' });
    // The log sheet's title is the meal's name.
    let headers = tree.root.findAll((n) => n.props?.accessibilityRole === 'header').map((n) => flattenText(n.props.children));
    expect(headers).toContain('Chicken and rice');
    // Open the rename sheet through the real long-press menu.
    await act(async () => { row.props.onLongPress(); });
    const rename = appAlert.mock.calls[0][2].find((b) => b.text === 'Rename');
    await act(async () => { rename.onPress(); });
    headers = tree.root.findAll((n) => n.props?.accessibilityRole === 'header').map((n) => flattenText(n.props.children));
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

  // (e) 48 dp on the sheet's own controls: the Stepper's buttons are the
  // house 48 dp and the remove control is a 48 dp box.
  test('the remove control and the stepper buttons are 48 dp targets', async () => {
    const { tree } = await mountOpen();
    const flat = (style) => Object.assign({}, ...[].concat(style ?? []).flat(5).filter(Boolean));
    const remove = byLabel(tree, 'Take Chicken breast out');
    expect(flat(remove.props.style).width).toBeGreaterThanOrEqual(48);
    expect(flat(remove.props.style).height).toBeGreaterThanOrEqual(48);
    for (const label of ['Less Chicken breast', 'More Chicken breast']) {
      const btn = byLabel(tree, label);
      expect(flat(btn.props.style).width).toBeGreaterThanOrEqual(48);
      expect(flat(btn.props.style).height).toBeGreaterThanOrEqual(48);
    }
  });
});

// D230 R12: "Edit this meal".
describe('MyMealsScreen: Edit this meal (D230 R12)', () => {
  const { logError } = require('../../lib/errorLog');
  const EGG = { food_ref: 'global:egg', name: 'Egg', kcal_100g: 143, protein_100g: 12.6, carbs_100g: 0.7, fat_100g: 9.5, fibre_100g: null };

  const nameField = (tree) => tree.root.findAll(
    (n) => n.props?.accessibilityLabel === 'Meal name' && typeof n.props?.onChangeText === 'function',
  )[0];

  test('Edit this meal opens the editor with a header, the name, the foods and a Save', async () => {
    const { tree } = await mountOpen();
    await press(byTitle(tree, 'Edit this meal'));
    const headers = tree.root.findAll((n) => n.props?.accessibilityRole === 'header').map((n) => flattenText(n.props.children));
    expect(headers).toContain('Edit this meal');
    expect(nameField(tree).props.value).toBe('Chicken and rice');
    expect(nameField(tree).props.maxLength).toBe(60);
    expect(byTitle(tree, 'Save')).toBeTruthy();
    expect(byTitle(tree, 'Add a food')).toBeTruthy();
    // Nothing has been written by opening the editor.
    expect(updateSavedMeal).not.toHaveBeenCalled();
    expect(logFoodEntries).not.toHaveBeenCalled();
  });

  test('rename, change grams, remove a food, add a food from the search, Save: ONE updateSavedMeal call', async () => {
    const params = { mealSlot: 'snack', entryDate: '2026-07-03' };
    const { tree, nav } = await mountOpen(MEAL, params);
    await press(byTitle(tree, 'Edit this meal'));
    await act(async () => { nameField(tree).props.onChangeText('Chicken and egg'); });
    await press(byLabel(tree, 'More White rice'));          // 150 -> 160 g
    await press(byLabel(tree, 'Take Chicken breast out'));

    // Add a food: the sheet steps aside and the search opens in pick mode.
    await press(byTitle(tree, 'Add a food'));
    expect(nav.push).toHaveBeenCalledWith('FoodSearch', {
      pickMode: 'recipe', returnTo: 'MyMeals', mealSlot: 'snack', entryDate: '2026-07-03',
    });
    expect(byTitle(tree, 'Save')).toBeUndefined();

    // The search returns the pick in route params, with the slot and day gone
    // from them (navigate replaces params).
    await act(async () => {
      tree.update(<MyMealsScreen navigation={nav} route={{ params: { addedIngredient: { food_ref: 'global:egg', name: 'Egg', quantity_g: 120, food: EGG } } }} />);
    });
    await flush();
    expect(nav.setParams).toHaveBeenCalledWith({ addedIngredient: undefined });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Egg');
    expect(text).toContain('120 g');

    await press(byTitle(tree, 'Save'));
    expect(updateSavedMeal).toHaveBeenCalledTimes(1);
    const [uid, id, payload] = updateSavedMeal.mock.calls[0];
    expect(uid).toBe('u1');
    expect(id).toBe('sm-1');
    expect(payload.name).toBe('Chicken and egg');
    expect(payload.items.map((i) => i.foodRef)).toEqual(['global:rice', 'global:egg']);
    expect(payload.items[0]).toMatchObject({ quantityG: 160, kcal: 208 }); // 130 kcal per 100 g
    expect(payload.items[1]).toEqual({
      foodRef: 'global:egg', name: 'Egg', quantityG: 120,
      ...(({ kcal, proteinG, carbsG, fatG, fibreG }) => ({ kcal, proteinG, carbsG, fatG, fibreG }))(scaleMacros(EGG, 120)),
    });
    expect(payload.items[1].kcal).toBe(172);
    // The log write never ran.
    expect(logFoodEntries).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith('Chicken and egg saved.', { variant: 'success' });
  });

  test('Save is off with a blank name or no foods, and Cancel writes nothing', async () => {
    const { tree } = await mountOpen();
    await press(byTitle(tree, 'Edit this meal'));
    await act(async () => { nameField(tree).props.onChangeText('   '); });
    expect(byTitle(tree, 'Save').props.disabled).toBe(true);
    await act(async () => { nameField(tree).props.onChangeText('Lunch'); });
    expect(byTitle(tree, 'Save').props.disabled).toBe(false);
    await press(byLabel(tree, 'Take Chicken breast out'));
    await press(byLabel(tree, 'Take White rice out'));
    expect(byTitle(tree, 'Save').props.disabled).toBe(true);
    await press(byTitle(tree, 'Cancel'));
    expect(updateSavedMeal).not.toHaveBeenCalled();
  });

  test('a failed save is a calm full sentence with its cause logged, and the editor stays', async () => {
    updateSavedMeal.mockRejectedValue(new Error('disk'));
    const { tree } = await mountOpen();
    await press(byTitle(tree, 'Edit this meal'));
    await press(byTitle(tree, 'Save'));
    expect(logError).toHaveBeenCalledWith('MyMeals.updateSavedMeal', expect.any(Error), { itemCount: 2 });
    expect(mockToastShow).toHaveBeenCalledWith('That meal was not saved. Try again in a moment.', { variant: 'error' });
    expect(byTitle(tree, 'Save')).toBeTruthy();
  });
});
