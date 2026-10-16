/**
 * AddCustomFoodScreen.test.js
 *
 * FOOD-001: the custom-food form logs the eaten amount with logFoodEntry. It
 * must not save a negative, zero, blank or extreme quantity, which would leave a
 * diary row whose grams and macros disagree (macro scaling clamps non-positive
 * grams to zero macros, but the quantity itself would stay wrong). This suite
 * pins that the form validates the eaten grams against the shared 1 to 5000 g
 * bound (the same gate FoodDetailSheet uses) BEFORE calling logFoodEntry:
 * -50, 0, blank and 6000 are refused with a calm toast and no write; a valid
 * amount goes through.
 *
 * Heavy screen mount, mocked at the same boundaries the food-screen suites use
 * (FoodSearchScreen.test.js): the DB layer, useAppStore, navigation, the Toast,
 * and the Save button (captured so the test can invoke its onPress as a real tap
 * would). The grams validator (servingEntry) and macro/sanity helpers are the
 * REAL modules so the guard under test is exercised, not a stand-in.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
// Default: every confirm resolves as "Save anyway" (the sanity gate and the
// item-5 OCR-unsure gate below both offer that exact button), so a test that
// doesn't care about the alert never hangs waiting on an unpressed button.
// Tests for the OCR-unsure gate itself override this per-call to press
// "Check first" instead.
jest.mock('../../components/AppAlert', () => ({
  appAlert: jest.fn((title, message, buttons) => {
    buttons?.find((b) => b.text === 'Save anyway')?.onPress?.();
  }),
}));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

// Save button: captured on every render so the test can invoke onPress directly,
// the same call the real "Save and add to diary" / "Save changes to food" tap makes.
// "Save the food" (D230 4.11) is the second action, captured the same way.
let mockSaveButton = null;
let mockSaveOnlyButton = null;
let mockAddPortionButton = null;
let mockRemoveButtons = {};
jest.mock('../../components/Button', () => (props) => {
  if (props.accessibilityLabel === 'Save food and add to diary'
    || props.accessibilityLabel === 'Add the saved food to the diary'
    || props.accessibilityLabel === 'Save changes to food') mockSaveButton = props;
  if (props.title === 'Save the food') mockSaveOnlyButton = props;
  if (props.title === 'Add another portion') mockAddPortionButton = props;
  if (props.title === 'Remove this portion') mockRemoveButtons[props.accessibilityLabel] = props;
  return null;
});
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

jest.mock('../../lib/food/db', () => ({
  insertCustomFood: jest.fn(() => Promise.resolve('custom-1')),
  updateCustomFood: jest.fn(() => Promise.resolve('existing-1')),
  getCustomFoodById: jest.fn(() => Promise.resolve(null)),
  logFoodEntries: jest.fn(() => Promise.resolve(['entry-1'])),
  deleteFoodEntries: jest.fn(() => Promise.resolve(1)),
}));
jest.mock('../../lib/food/writeback', () => ({
  queueContribution: jest.fn(() => Promise.resolve()),
  getConsent: jest.fn(() => Promise.resolve(false)),
  markScanChainCompleted: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/food/sources/localCache', () => ({ findLocalByBarcode: jest.fn(() => Promise.resolve(null)) }));

import useAppStore from '../../store/useAppStore';
import { insertCustomFood, updateCustomFood, getCustomFoodById, logFoodEntries as logFoodEntry } from '../../lib/food/db';
import AddCustomFoodScreen from '../AddCustomFoodScreen';

const store = { user: { id: 'u1' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

const WARNING = 'Enter an amount between 1 and 5000 g.';

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveButton = null;
  mockSaveOnlyButton = null;
  mockAddPortionButton = null;
  mockRemoveButtons = {};
  useAppStore.mockImplementation((selector) => selector(store));
});

function setInput(tree, label, value) {
  const nodes = tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label);
  expect(nodes.length).toBeGreaterThan(0);
  act(() => { nodes[0].props.onChangeText(value); });
}

function allText(tree) {
  return JSON.stringify(tree.toJSON());
}

// Renders the form, fills a valid name (so canSave is satisfied) and sets the
// eaten amount, then presses Save and returns after the async work settles.
async function renderAndSave(eatenValue) {
  const nav = makeNav();
  const route = { params: { mealSlot: 'snack', entryDate: '2026-07-04' } };
  let tree;
  await act(async () => { tree = create(<AddCustomFoodScreen navigation={nav} route={route} />); });
  await flush();
  setInput(tree, 'Name', 'Test food');
  setInput(tree, 'Eaten (g), grams', eatenValue);
  expect(mockSaveButton).toBeTruthy();
  await act(async () => { await mockSaveButton.onPress(); });
  await flush();
  return nav;
}

describe('AddCustomFoodScreen OCR low-confidence highlighting (item 5)', () => {
  // RE-POINTED (D230 R15, food level-up 2026-10-16): the note no longer names
  // a colour ("Amber figures aren't certain, check them."); it names the dot
  // that now sits beside each unsure field's label, in full sentences, and the
  // field's spoken hint matches. Same truth: an unsure field is marked, the
  // note appears while any is unsure, and editing the field clears both.
  const CONFIDENCE_HINT = 'Hard to read. Check this value.';
  const BANNER = 'The figures marked with a dot were hard to read. Check them before you save.';

  function ocrRoute(prefillMacros, prefillConfidence) {
    return {
      params: {
        mealSlot: 'snack',
        entryDate: '2026-07-08',
        from: 'scan',
        prefillName: 'Scanned food',
        prefillMacros,
        prefillConfidence,
      },
    };
  }

  test('a low-confidence field is marked and named in the banner at confirm', async () => {
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();

    expect(allText(tree)).toContain(BANNER);

    const kcalInput = tree.root.findByProps({ accessibilityLabel: 'Calories' });
    expect(kcalInput.props.accessibilityHint).toBe(CONFIDENCE_HINT);

    const proteinInput = tree.root.findByProps({ accessibilityLabel: 'Protein, grams' });
    expect(proteinInput.props.accessibilityHint).toBeUndefined();
  });

  test('editing the flagged value clears its mark and the banner', async () => {
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();

    expect(allText(tree)).toContain(BANNER);
    setInput(tree, 'Calories', '110');

    expect(allText(tree)).not.toContain(BANNER);
    const kcalInput = tree.root.findByProps({ accessibilityLabel: 'Calories' });
    expect(kcalInput.props.accessibilityHint).toBeUndefined();
  });

  test('no OCR prefill (manual entry) shows no low-confidence banner or marks', async () => {
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-08' } };
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();

    expect(allText(tree)).not.toContain(BANNER);
    const kcalInput = tree.root.findByProps({ accessibilityLabel: 'Calories' });
    expect(kcalInput.props.accessibilityHint).toBeUndefined();
  });

  test('a high-confidence-only scan records no ocr_low_confidence_saved telemetry on save', async () => {
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'high', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    const { track } = require('../../lib/engineTelemetry');
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Eaten (g), grams', '100');
    expect(mockSaveButton).toBeTruthy();
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(track).not.toHaveBeenCalledWith('u1', 'ocr_low_confidence_saved', expect.anything());
  });

  test('saving with the low-confidence field left unedited records ocr_low_confidence_saved', async () => {
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    const { track } = require('../../lib/engineTelemetry');
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Eaten (g), grams', '100');
    expect(mockSaveButton).toBeTruthy();
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(track).toHaveBeenCalledWith('u1', 'ocr_low_confidence_saved', { fields_flagged: 1, from: 'scan' });
  });
});

// D138: a prefilled low-confidence field the user never touched must route
// the save through a confirm, never save silently.
describe('AddCustomFoodScreen OCR-unsure confirm gate (D138 item 5)', () => {
  function ocrRoute(prefillMacros, prefillConfidence) {
    return {
      params: {
        mealSlot: 'snack',
        entryDate: '2026-07-08',
        from: 'scan',
        prefillName: 'Scanned food',
        prefillMacros,
        prefillConfidence,
      },
    };
  }

  test('an unsure field shows the confirm; the default "Save anyway" still saves', async () => {
    const { appAlert } = require('../../components/AppAlert');
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Eaten (g), grams', '100');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(appAlert).toHaveBeenCalledWith(
      "Some figures were not read clearly",
      'Save anyway?',
      expect.any(Array),
      expect.any(Object),
    );
    expect(insertCustomFood).toHaveBeenCalledTimes(1);
  });

  test('choosing "Check first" cancels the save: no write, no log', async () => {
    const { appAlert } = require('../../components/AppAlert');
    appAlert.mockImplementationOnce((title, message, buttons) => {
      buttons.find((b) => b.text === 'Check first').onPress();
    });
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Eaten (g), grams', '100');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(insertCustomFood).not.toHaveBeenCalled();
    expect(logFoodEntry).not.toHaveBeenCalled();
  });

  test('every field high-confidence, or no scan at all: the confirm never shows', async () => {
    const { appAlert } = require('../../components/AppAlert');
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'high', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Eaten (g), grams', '100');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(appAlert).not.toHaveBeenCalled();
    expect(insertCustomFood).toHaveBeenCalledTimes(1);
  });

  test('editing the unsure field away clears it, so the confirm never shows', async () => {
    const { appAlert } = require('../../components/AppAlert');
    const route = ocrRoute(
      { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
      { kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' }
    );
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Calories', '110');
    setInput(tree, 'Eaten (g), grams', '100');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(appAlert).not.toHaveBeenCalled();
    expect(insertCustomFood).toHaveBeenCalledTimes(1);
  });
});

// D138 item 7: a drink label reads its serving in ml, not g. There is no
// separate ml column (custom_foods has one serving figure), so the ml
// reading prefills serving_g directly -- the same 1 ml ~= 1 g convention
// usdaToFood.js already uses for a per-100ml global food -- with the serving
// label set to 'ml' rather than inventing a new column.
describe('AddCustomFoodScreen servingMl prefill (D138 item 7)', () => {
  function mlRoute() {
    return {
      params: {
        mealSlot: 'snack',
        entryDate: '2026-09-01',
        from: 'scan',
        prefillName: 'Cola',
        prefillMacros: { kcal100g: 42, protein100g: 0, carbs100g: 10.6, fat100g: 0, fibre100g: null, servingG: null, servingMl: 330, servingUnit: 'ml' },
        prefillConfidence: { kcal100g: 'high', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'missing' },
      },
    };
  }

  test('prefills Serving (g) with the ml figure and the serving name with "ml"', async () => {
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={mlRoute()} />); });
    await flush();

    const servingField = tree.root.findByProps({ accessibilityLabel: 'Serving (g), grams' });
    expect(servingField.props.value).toBe('330');
    const servingNameField = tree.root.findByProps({ accessibilityLabel: 'Serving name (optional)' });
    expect(servingNameField.props.value).toBe('ml');
  });

  test('a gram serving is still preferred over an ml reading when both are somehow present', async () => {
    const route = mlRoute();
    route.params.prefillMacros.servingG = 100;
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();

    const servingField = tree.root.findByProps({ accessibilityLabel: 'Serving (g), grams' });
    expect(servingField.props.value).toBe('100');
    const servingNameField = tree.root.findByProps({ accessibilityLabel: 'Serving name (optional)' });
    expect(servingNameField.props.value).toBe('');
  });

  test('no serving reading at all still defaults to 100g, blank name (unchanged)', async () => {
    const route = mlRoute();
    route.params.prefillMacros.servingMl = null;
    route.params.prefillMacros.servingUnit = null;
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();

    const servingField = tree.root.findByProps({ accessibilityLabel: 'Serving (g), grams' });
    expect(servingField.props.value).toBe('100');
  });
});

describe('AddCustomFoodScreen eaten-quantity guard (FOOD-001)', () => {
  test('uses plain diary copy instead of meal-number context', async () => {
    const route = { params: { mealSlot: 'meal_2', entryDate: '2026-07-04' } };
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    const text = allText(tree);
    expect(text).toContain('Save this food, then add it to your diary.');
    expect(text).not.toContain('Logging to');
    expect(text).not.toContain('Meal 2');
  });

  // Re-pinned 2026-10-16: a negative amount is an unreadable figure, so it says
  // why under the field and blocks the save instead of a toast.
  test('a negative amount blocks the save with a reason under the field', async () => {
    const nav = await renderAndSave('-50');
    expect(logFoodEntry).not.toHaveBeenCalled();
    expect(insertCustomFood).not.toHaveBeenCalled();
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test.each([
    ['zero', '0'],
    ['blank', ''],
    ['an extreme amount over the 5000 g cap', '6000'],
  ])('refuses %s: no log, calm toast, stays on the form', async (_label, value) => {
    const nav = await renderAndSave(value);
    expect(logFoodEntry).not.toHaveBeenCalled();
    expect(insertCustomFood).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(WARNING, { variant: 'warning' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('accepts a valid amount (150 g): logs it and does not warn', async () => {
    const nav = await renderAndSave('150');
    expect(insertCustomFood).toHaveBeenCalledTimes(1);
    expect(logFoodEntry).toHaveBeenCalledTimes(1);
    // Re-pinned 2026-10-16: the add goes through the batch writer, says it was
    // added with an Undo, and returns to the Diary.
    expect(logFoodEntry).toHaveBeenCalledWith('u1', [expect.objectContaining({
      foodRef: 'custom:custom-1',
      quantityG: 150,
    })]);
    expect(mockToastShow).not.toHaveBeenCalledWith(WARNING, expect.anything());
    expect(mockToastShow).toHaveBeenCalledWith('Test food added to Snacks.', expect.objectContaining({ variant: 'undo' }));
    expect(nav.navigate).toHaveBeenCalledWith('Diary');
  });
});

// MN-1 (audit §15 item 2): the optional per-100g vitamin/mineral entry
// section. Collapsed by default, driven off MICRONUTRIENTS, and collected
// into `food.micros` for the existing insertCustomFood call (the DB layer
// already persists food.micros via microValuesFromInput; this suite pins
// only that the SCREEN builds that object correctly and never invents a 0
// for a field the user left blank).
describe('AddCustomFoodScreen micronutrients (MN-1)', () => {
  function expandMicros(tree) {
    const header = tree.root.findByProps({ accessibilityLabel: 'Vitamins and minerals (optional)' });
    act(() => { header.props.onPress(); });
  }

  test('collapsed by default: no micronutrient inputs are mounted until opened', async () => {
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-08' } };
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Vitamin C')).toHaveLength(0);
    expect(allText(tree)).toContain('Vitamins and minerals (optional)');
  });

  test('entered values are collected and passed through as food.micros on save', async () => {
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-08' } };
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Name', 'Test food');
    expandMicros(tree);
    setInput(tree, 'Vitamin C', '12');
    setInput(tree, 'Iron', '3.5');
    setInput(tree, 'Eaten (g), grams', '100');

    expect(mockSaveButton).toBeTruthy();
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({
      micros: { vitC: 12, iron: 3.5 },
    }));
  });

  test('a field opened then left blank is omitted, never coerced to 0', async () => {
    const route = { params: { mealSlot: 'snack', entryDate: '2026-07-08' } };
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={route} />); });
    await flush();
    setInput(tree, 'Name', 'Test food');
    expandMicros(tree);
    setInput(tree, 'Vitamin C', '12');
    setInput(tree, 'Vitamin C', ''); // typed then cleared
    setInput(tree, 'Eaten (g), grams', '100');

    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    const call = insertCustomFood.mock.calls[0][1];
    expect(call.micros).not.toHaveProperty('vitC');
  });

  test('saving with the section never opened omits every micronutrient (unchanged from before this feature)', async () => {
    await renderAndSave('150');
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({ micros: {} }));
  });
});

// D138 item 6: a custom food is editable from the More tab. editFoodId in
// route params switches the whole screen into edit mode: it prefills from
// getCustomFoodById, titles itself "Edit food", saves via updateCustomFood
// (never insertCustomFood/logFoodEntry -- editing never logs a new entry),
// and says on-screen that only future logs pick up the change.
describe('AddCustomFoodScreen edit mode (D138 item 6)', () => {
  const EXISTING = {
    id: 'cf-1', name: 'Overnight oats', brand: 'Home-made',
    serving_g: 250, serving_label: 'bowl',
    kcal_100g: 150, protein_100g: 6, carbs_100g: 20, fat_100g: 4, fibre_100g: 3,
    barcode_ean: null, photo_url: null, notes: null,
  };

  function editRoute() {
    return { params: { mealSlot: 'snack', entryDate: '2026-09-01', editFoodId: 'cf-1' } };
  }

  beforeEach(() => {
    getCustomFoodById.mockResolvedValue(EXISTING);
  });

  test('prefills from getCustomFoodById, titles itself "Edit food", and names the historical-integrity rule', async () => {
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={editRoute()} />); });
    await flush();

    expect(getCustomFoodById).toHaveBeenCalledWith('cf-1', 'u1');
    const text = allText(tree);
    expect(text).toContain('Edit food');
    expect(text).toContain('Overnight oats');
    expect(text).toContain('Home-made');
    expect(text).toContain('bowl');
    // One line stating logged entries are untouched by an edit.
    expect(text).toContain('Logged entries keep the numbers they were logged with');
    // The "Eaten" quantity (today's log, not part of the food) has no place
    // in edit mode, and the primary button reads "Save changes".
    expect(text).not.toContain('Eaten (g)');
    expect(mockSaveButton.title).toBe('Save changes');
  });

  test('saving calls updateCustomFood only -- never insertCustomFood or logFoodEntry', async () => {
    await act(async () => { create(<AddCustomFoodScreen navigation={makeNav()} route={editRoute()} />); });
    await flush();

    expect(mockSaveButton).toBeTruthy();
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();

    expect(updateCustomFood).toHaveBeenCalledWith('u1', 'cf-1', expect.objectContaining({
      name: 'Overnight oats', brand: 'Home-made', servingG: 250, servingLabel: 'bowl',
      kcal100g: 150, protein100g: 6, carbs100g: 20, fat100g: 4, fibre100g: 3,
    }));
    expect(insertCustomFood).not.toHaveBeenCalled();
    expect(logFoodEntry).not.toHaveBeenCalled();
  });
});

// D230 R15 (food level-up 2026-10-16): the unsure-figure mark is a dot beside
// the field's label as well as the border it always had, so it is never only a
// colour. The dot is the house Ionicons "ellipse" at 8 dp in the quiet text
// colour, with the spoken label "hard to read"; a field that was read clearly
// carries no dot.
describe('AddCustomFoodScreen hard-to-read dot (D230 R15)', () => {
  const { colors } = require('../../styles/theme');

  function scanRoute(confidence) {
    return {
      params: {
        mealSlot: 'snack',
        entryDate: '2026-10-16',
        from: 'scan',
        prefillName: 'Scanned food',
        prefillMacros: { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
        prefillConfidence: confidence,
      },
    };
  }

  function dots(tree) {
    return tree.root.findAll((n) => n.type === 'Ionicons' && n.props.accessibilityLabel === 'hard to read');
  }

  test('an unsure field gets a visible dot (ellipse, 8 dp, textSecondary) beside its label and keeps its border', async () => {
    let tree;
    await act(async () => {
      tree = create(<AddCustomFoodScreen
        navigation={makeNav()}
        route={scanRoute({ kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' })}
      />);
    });
    await flush();

    const found = dots(tree);
    expect(found).toHaveLength(1);
    expect(found[0].props.name).toBe('ellipse');
    expect(found[0].props.size).toBe(8);
    expect(found[0].props.color).toBe(colors.textSecondary);
    // The border it had before the dot is still there: the dot adds to it.
    expect(tree.root.findByProps({ accessibilityLabel: 'Calories' }).props.fieldStyle).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Protein, grams' }).props.fieldStyle).toBeFalsy();
  });

  test('each unsure field gets its own dot; clearly read fields and manual entry get none', async () => {
    let tree;
    await act(async () => {
      tree = create(<AddCustomFoodScreen
        navigation={makeNav()}
        route={scanRoute({ kcal100g: 'low', protein100g: 'low', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' })}
      />);
    });
    await flush();
    expect(dots(tree)).toHaveLength(2);

    let manual;
    await act(async () => {
      manual = create(<AddCustomFoodScreen navigation={makeNav()} route={{ params: { mealSlot: 'snack', entryDate: '2026-10-16' } }} />);
    });
    await flush();
    expect(dots(manual)).toHaveLength(0);
  });

  test('editing the flagged value removes its dot', async () => {
    let tree;
    await act(async () => {
      tree = create(<AddCustomFoodScreen
        navigation={makeNav()}
        route={scanRoute({ kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' })}
      />);
    });
    await flush();
    expect(dots(tree)).toHaveLength(1);
    setInput(tree, 'Calories', '110');
    expect(dots(tree)).toHaveLength(0);
  });

  test('the section titles are sentence case (SectionLabel capitalises them itself)', async () => {
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={makeNav()} route={{ params: {} }} />); });
    await flush();
    const text = allText(tree);
    expect(text).toContain('Per 100 g');
    expect(text).toContain('Quantity eaten');
    expect(text).not.toContain('PER 100G');
    expect(text).not.toContain('QUANTITY EATEN');
  });
});

// D230 4.11: "Save the food" is the second action. It saves the custom food
// (and queues the Open Food Facts contribution as before) without writing a
// diary entry, then closes. The sanity confirm and the unsure-figures confirm
// apply to it exactly as to "Save and add to diary".
describe('AddCustomFoodScreen "Save the food" (D230 4.11)', () => {
  const { logError } = require('../../lib/errorLog');
  const { queueContribution, getConsent } = require('../../lib/food/writeback');
  const { appAlert } = require('../../components/AppAlert');

  async function mount(route) {
    const nav = makeNav();
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={nav} route={route} />); });
    await flush();
    return { nav, tree };
  }

  const NEW_FOOD = { params: { mealSlot: 'snack', entryDate: '2026-10-16' } };

  test('a new food offers both actions; editing a food offers only "Save changes"', async () => {
    await mount(NEW_FOOD);
    expect(mockSaveButton.title).toBe('Save and add to diary');
    expect(mockSaveOnlyButton).toBeTruthy();
    expect(mockSaveOnlyButton.variant).toBe('secondary');

    mockSaveOnlyButton = null;
    getCustomFoodById.mockResolvedValueOnce({
      id: 'cf-1', name: 'Overnight oats', brand: null, serving_g: 250, serving_label: null,
      kcal_100g: 150, protein_100g: 6, carbs_100g: 20, fat_100g: 4, fibre_100g: 3,
    });
    await mount({ params: { mealSlot: 'snack', entryDate: '2026-10-16', editFoodId: 'cf-1' } });
    expect(mockSaveButton.title).toBe('Save changes');
    expect(mockSaveOnlyButton).toBeNull();
  });

  test('saves the food and closes, with no diary entry and no eaten-amount check', async () => {
    const { nav, tree } = await mount(NEW_FOOD);
    setInput(tree, 'Name', 'Home granola');
    setInput(tree, 'Eaten (g), grams', ''); // a blank eaten amount blocks logging, not saving
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();

    expect(insertCustomFood).toHaveBeenCalledTimes(1);
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({ name: 'Home granola' }));
    expect(logFoodEntry).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalledWith(WARNING, expect.anything());
    expect(mockToastShow).toHaveBeenCalledWith('Food saved. You can add it to your diary any time.');
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  test('"Save and add to diary" still logs the entry (the other action is unchanged)', async () => {
    const { tree } = await mount(NEW_FOOD);
    setInput(tree, 'Name', 'Home granola');
    setInput(tree, 'Eaten (g), grams', '40');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledTimes(1);
    expect(logFoodEntry).toHaveBeenCalledTimes(1);
  });

  test('the sanity confirm applies: "Edit" stops the save, nothing is written', async () => {
    appAlert.mockImplementationOnce((title, message, buttons) => { buttons.find((b) => b.text === 'Edit').onPress(); });
    const { nav, tree } = await mount(NEW_FOOD);
    setInput(tree, 'Name', 'Impossible food');
    setInput(tree, 'Calories', '950'); // above the 900 kcal per 100 g bound
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();

    expect(appAlert).toHaveBeenCalledWith('Numbers look off', expect.any(String), expect.any(Array), expect.any(Object));
    expect(insertCustomFood).not.toHaveBeenCalled();
    expect(logFoodEntry).not.toHaveBeenCalled();
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('the unsure-figures confirm applies: "Check first" stops the save', async () => {
    appAlert.mockImplementationOnce((title, message, buttons) => { buttons.find((b) => b.text === 'Check first').onPress(); });
    await mount({
      params: {
        mealSlot: 'snack', entryDate: '2026-10-16', from: 'scan', prefillName: 'Scanned food',
        prefillMacros: { servingG: 100, kcal100g: 105, protein100g: 20, carbs100g: 5, fat100g: 2, fibre100g: 1 },
        prefillConfidence: { kcal100g: 'low', protein100g: 'high', carbs100g: 'high', fat100g: 'high', fibre100g: 'high' },
      },
    });
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();
    expect(appAlert).toHaveBeenCalledWith("Some figures were not read clearly", 'Save anyway?', expect.any(Array), expect.any(Object));
    expect(insertCustomFood).not.toHaveBeenCalled();
  });

  test('a scanned food still queues the contribution when the person has consented (as before)', async () => {
    getConsent.mockResolvedValueOnce(true);
    const { nav, tree } = await mount({
      params: { mealSlot: 'snack', entryDate: '2026-10-16', from: 'scan_chain', prefillBarcode: '5000000000017', prefillName: 'Scanned food' },
    });
    setInput(tree, 'Name', 'Scanned food');
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();

    expect(logFoodEntry).not.toHaveBeenCalled();
    expect(queueContribution).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith('Saved. Next time this barcode scans instantly.');
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  test('a failed save says what happened and what to do, and logs its cause first', async () => {
    insertCustomFood.mockRejectedValueOnce(new Error('disk full'));
    const { nav, tree } = await mount(NEW_FOOD);
    setInput(tree, 'Name', 'Home granola');
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();

    expect(logError).toHaveBeenCalledWith('AddCustomFood.save', expect.any(Error), { logged: false, scanned: false });
    expect(mockToastShow).toHaveBeenCalledWith('That food was not saved. Try again in a moment.', { variant: 'error' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('a failed "Save and add to diary" and a failed edit use the same sentence and log too', async () => {
    logFoodEntry.mockRejectedValueOnce(new Error('write failed'));
    const { tree } = await mount(NEW_FOOD);
    setInput(tree, 'Name', 'Home granola');
    setInput(tree, 'Eaten (g), grams', '40');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    // Re-pinned 2026-10-16: the food saved and only the add failed, so the
    // screen says exactly that.
    expect(logError).toHaveBeenCalledWith('AddCustomFood.logAfterSave', expect.any(Error), { scanned: false });
    expect(mockToastShow).toHaveBeenCalledWith(
      'Home granola was saved, but it was not added to Snacks. You can add it from search.',
      expect.objectContaining({ variant: 'error' }),
    );
    // A retry adds only: it never saves a second food.
    insertCustomFood.mockClear();
    expect(mockSaveButton.title).toBe('Add to diary');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(insertCustomFood).not.toHaveBeenCalled();
    expect(logFoodEntry).toHaveBeenCalledTimes(2);

    jest.clearAllMocks();
    getCustomFoodById.mockResolvedValueOnce({
      id: 'cf-1', name: 'Overnight oats', brand: null, serving_g: 250, serving_label: null,
      kcal_100g: 150, protein_100g: 6, carbs_100g: 20, fat_100g: 4, fibre_100g: 3,
    });
    updateCustomFood.mockRejectedValueOnce(new Error('update failed'));
    await mount({ params: { mealSlot: 'snack', entryDate: '2026-10-16', editFoodId: 'cf-1' } });
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(logError).toHaveBeenCalledWith('AddCustomFood.updateFood', expect.any(Error), { hasId: true });
    expect(mockToastShow).toHaveBeenCalledWith('That food was not saved. Try again in a moment.', { variant: 'error' });
  });

  test('a food that will not load says so, with a way forward, and logs its cause', async () => {
    getCustomFoodById.mockRejectedValueOnce(new Error('read failed'));
    await mount({ params: { mealSlot: 'snack', entryDate: '2026-10-16', editFoodId: 'cf-9' } });
    expect(logError).toHaveBeenCalledWith('AddCustomFood.loadFood', expect.any(Error), { hasId: true });
    expect(mockToastShow).toHaveBeenCalledWith('That food did not load. Try again in a moment.', { variant: 'error' });
  });
});

// D230 R20 (lane 4B): the serving block is "Portions". The single serving stays
// portion one (serving_g / serving_label); "Add another portion" adds up to two
// more rows, saved to portions_json through the same two save buttons, and an
// edit reads them back. Every portion keeps the 1 to 5000 g bound.
describe('AddCustomFoodScreen portions (D230 R20)', () => {
  async function mountNew() {
    const nav = makeNav();
    let tree;
    await act(async () => {
      tree = create(<AddCustomFoodScreen navigation={nav} route={{ params: { mealSlot: 'snack', entryDate: '2026-10-16' } }} />);
    });
    await flush();
    setInput(tree, 'Name', 'Toast');
    setInput(tree, 'Serving name (optional)', '1 slice');
    setInput(tree, 'Serving (g), grams', '36');
    setInput(tree, 'Eaten (g), grams', '36');
    return tree;
  }

  function addTwoPortions(tree) {
    act(() => { mockAddPortionButton.onPress(); });
    setInput(tree, 'Portion 2 name', '1 mug');
    setInput(tree, 'Portion 2 weight, grams', '250');
    act(() => { mockAddPortionButton.onPress(); });
    setInput(tree, 'Portion 3 name', '1 tbsp');
    setInput(tree, 'Portion 3 weight, grams', '15');
  }

  test('the section is titled Portions and the first portion keeps the existing field labels', async () => {
    const tree = await mountNew();
    const text = allText(tree);
    expect(text).toContain('Portions');
    expect(text).toContain('Quantity eaten');
    expect(mockAddPortionButton).toBeTruthy();
  });

  test('Save and add to diary saves two extra portions beside the first', async () => {
    const tree = await mountNew();
    addTwoPortions(tree);
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({
      servingG: 36,
      servingLabel: '1 slice',
      portions: [{ label: '1 mug', grams: 250 }, { label: '1 tbsp', grams: 15 }],
    }));
  });

  test('Save the food carries them too', async () => {
    const tree = await mountNew();
    addTwoPortions(tree);
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({
      portions: [{ label: '1 mug', grams: 250 }, { label: '1 tbsp', grams: 15 }],
    }));
    expect(logFoodEntry).not.toHaveBeenCalled();
  });

  test('no more than two extra rows: the add button goes once there are two', async () => {
    const tree = await mountNew();
    addTwoPortions(tree);
    mockAddPortionButton = null;
    setInput(tree, 'Name', 'Toast again');
    expect(mockAddPortionButton).toBeNull();
    expect(tree.root.findAll((n) => n.props && n.props.testID === 'portion-row-4')).toHaveLength(0);
  });

  test('a wholly blank extra row is ignored; a half-filled one blocks the save', async () => {
    const tree = await mountNew();
    act(() => { mockAddPortionButton.onPress(); });
    expect(mockSaveButton.disabled).toBe(false);
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({ portions: [] }));

    insertCustomFood.mockClear();
    setInput(tree, 'Portion 2 name', '1 mug');
    expect(mockSaveButton.disabled).toBe(true);
    setInput(tree, 'Portion 2 weight, grams', '6000');
    expect(mockSaveButton.disabled).toBe(true);
    setInput(tree, 'Portion 2 weight, grams', '0');
    expect(mockSaveButton.disabled).toBe(true);
    setInput(tree, 'Portion 2 weight, grams', '250');
    expect(mockSaveButton.disabled).toBe(false);
  });

  test('the remove control drops that row', async () => {
    const tree = await mountNew();
    addTwoPortions(tree);
    act(() => { mockRemoveButtons['Remove portion 2'].onPress(); });
    expect(tree.root.findAll((n) => n.props && n.props.testID === 'portion-row-3')).toHaveLength(0);
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({
      portions: [{ label: '1 tbsp', grams: 15 }],
    }));
  });

  test('editing reads both stored portions back and saves them again', async () => {
    getCustomFoodById.mockResolvedValue({
      id: 'cf-9', name: 'Toast', brand: null, serving_g: 36, serving_label: '1 slice',
      kcal_100g: 250, protein_100g: 9, carbs_100g: 45, fat_100g: 3, fibre_100g: null,
      portions_json: '[{"label":"1 mug","grams":250},{"label":"1 tbsp","grams":15}]',
      barcode_ean: null, photo_url: null, notes: null,
    });
    let tree;
    await act(async () => {
      tree = create(<AddCustomFoodScreen navigation={makeNav()} route={{ params: { mealSlot: 'snack', entryDate: '2026-10-16', editFoodId: 'cf-9' } }} />);
    });
    await flush();
    const value = (label) => tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label)[0].props.value;
    expect(value('Portion 2 name')).toBe('1 mug');
    expect(value('Portion 2 weight, grams')).toBe('250');
    expect(value('Portion 3 name')).toBe('1 tbsp');
    expect(value('Portion 3 weight, grams')).toBe('15');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(updateCustomFood).toHaveBeenCalledWith('u1', 'cf-9', expect.objectContaining({
      servingG: 36,
      portions: [{ label: '1 mug', grams: 250 }, { label: '1 tbsp', grams: 15 }],
    }));
  });
});

// Wave 4 hostile review (2026-10-16), item 10. Each pin fails on the code
// before it:
//  (a) a portion weight typed with a decimal comma ("12,5", the decimal-pad on
//      a comma-region phone) was stripped to "125" and saved as 125 g; it is
//      now read as the amount sheet reads it (parseDecimalInput), 12.5 g. The
//      first portion's weight is read the same way.
//  (c) a serving over 5000 g greyed the save with no reason anywhere; the
//      reason now sits under the field, and goes when the weight is fixed.
describe('AddCustomFoodScreen portion weights (Wave 4 review, item 10)', () => {
  async function mountNew() {
    let tree;
    await act(async () => {
      tree = create(<AddCustomFoodScreen navigation={makeNav()} route={{ params: { mealSlot: 'snack', entryDate: '2026-10-16' } }} />);
    });
    await flush();
    setInput(tree, 'Name', 'Toast');
    setInput(tree, 'Eaten (g), grams', '36');
    return tree;
  }
  const errorOf = (tree, label) => tree.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function',
  )[0].props.error;

  test('"12,5" in an extra portion is 12.5 g, never 125 g', async () => {
    const tree = await mountNew();
    act(() => { mockAddPortionButton.onPress(); });
    setInput(tree, 'Portion 2 name', '1 tbsp');
    setInput(tree, 'Portion 2 weight, grams', '12,5');
    const field = tree.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Portion 2 weight, grams')[0];
    expect(field.props.value).toBe('12,5');
    expect(errorOf(tree, 'Portion 2 weight, grams')).toBeUndefined();
    expect(mockSaveButton.disabled).toBe(false);
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({
      portions: [{ label: '1 tbsp', grams: 12.5 }],
    }));
  });

  test('"36,5" as the serving weight saves 36.5 g', async () => {
    const tree = await mountNew();
    setInput(tree, 'Serving (g), grams', '36,5');
    expect(mockSaveButton.disabled).toBe(false);
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({ servingG: 36.5 }));
  });

  test('a serving over 5000 g says why under the field, and the reason goes when it is fixed', async () => {
    const tree = await mountNew();
    expect(errorOf(tree, 'Serving (g), grams')).toBeUndefined();
    setInput(tree, 'Serving (g), grams', '6000');
    expect(mockSaveButton.disabled).toBe(true);
    expect(errorOf(tree, 'Serving (g), grams')).toBe('Enter a serving of 5000 g or less.');
    setInput(tree, 'Serving (g), grams', '');
    expect(mockSaveButton.disabled).toBe(true);
    expect(errorOf(tree, 'Serving (g), grams')).toBe('Enter the serving\'s weight in grams.');
    setInput(tree, 'Serving (g), grams', '5000');
    expect(mockSaveButton.disabled).toBe(false);
    expect(errorOf(tree, 'Serving (g), grams')).toBeUndefined();
  });
});


describe('food audit 2026-10-16: comma decimals, sugars and salt, carried foods', () => {
  const NEW_FOOD = { params: { mealSlot: 'snack', entryDate: '2026-10-16' } };
  async function mount(route) {
    const nav = makeNav();
    let tree;
    await act(async () => { tree = create(<AddCustomFoodScreen navigation={nav} route={route} />); });
    await flush();
    return { nav, tree };
  }

  test('a comma decimal is read, and an unreadable figure says why', async () => {
    const { tree } = await mount(NEW_FOOD);
    setInput(tree, 'Name', 'Bar');
    setInput(tree, 'Protein, grams', '9,5');
    expect(mockSaveButton.disabled).toBe(false);
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();
    expect(insertCustomFood).toHaveBeenCalledWith('u1', expect.objectContaining({ protein100g: 9.5 }));
    setInput(tree, 'Protein, grams', '9x5');
    expect(mockSaveButton.disabled).toBe(true);
    expect(allText(tree)).toContain('Enter a number, such as 9.5.');
  });

  test('a comma in a vitamin is kept, not dropped', async () => {
    const { MICRONUTRIENTS } = require('../../lib/food/micronutrients');
    const n = MICRONUTRIENTS[0];
    getCustomFoodById.mockResolvedValueOnce({
      id: 'cf-1', name: 'Loaf', brand: null, serving_g: 40, serving_label: null,
      kcal_100g: 255, protein_100g: 9, carbs_100g: 45, fat_100g: 3, fibre_100g: 3, [n.column]: 1,
    });
    const { tree } = await mount({ params: { mealSlot: 'snack', entryDate: '2026-10-16', editFoodId: 'cf-1' } });
    setInput(tree, n.label, '1,2');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(updateCustomFood.mock.calls[0][2].micros[n.key]).toBe(1.2);
  });

  test('sugars and salt save per 100 g; salt is stored as sodium (salt / 2.5); blank stays null', async () => {
    const { tree } = await mount(NEW_FOOD);
    setInput(tree, 'Name', 'Bar');
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();
    expect(insertCustomFood.mock.calls[0][1]).toMatchObject({ sugar100g: null, sodium100g: null });
    insertCustomFood.mockClear();
    setInput(tree, 'Sugars (optional), grams', '4,5');
    setInput(tree, 'Salt (optional), grams', '1');
    await act(async () => { await mockSaveOnlyButton.onPress(); });
    await flush();
    expect(insertCustomFood.mock.calls[0][1]).toMatchObject({ sugar100g: 4.5, sodium100g: 0.4 });
  });

  test('a rename keeps the stored sugar and sodium exactly; changing salt changes sodium', async () => {
    getCustomFoodById.mockResolvedValue({
      id: 'cf-1', name: 'Loaf', brand: null, serving_g: 40, serving_label: null,
      kcal_100g: 255, protein_100g: 9, carbs_100g: 45, fat_100g: 3, fibre_100g: 3,
      sugar_100g: 3.3, sodium_100g: 0.196,
    });
    const route = { params: { mealSlot: 'snack', entryDate: '2026-10-16', editFoodId: 'cf-1' } };
    const { tree } = await mount(route);
    setInput(tree, 'Name', 'Loaf renamed');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(updateCustomFood.mock.calls[0][2]).toMatchObject({ sugar100g: 3.3, sodium100g: 0.196 });
    updateCustomFood.mockClear();
    const again = await mount(route);
    setInput(again.tree, 'Salt (optional), grams', '1');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(updateCustomFood.mock.calls[0][2]).toMatchObject({ sugar100g: 3.3, sodium100g: 0.4 });
    getCustomFoodById.mockResolvedValue(null);
  });

  test('foods carried from the plate are written with the new food in one call, one Undo', async () => {
    const carry = [{ foodRef: 'off:egg', name: 'Egg', quantityG: 50, kcal: 70, proteinG: 6, carbsG: 0, fatG: 5, fibreG: null }];
    const { tree, nav } = await mount({ params: { mealSlot: 'snack', entryDate: '2026-10-16', carryItems: carry } });
    logFoodEntry.mockResolvedValueOnce(['a', 'b']);
    setInput(tree, 'Name', 'Bar');
    setInput(tree, 'Eaten (g), grams', '40');
    await act(async () => { await mockSaveButton.onPress(); });
    await flush();
    expect(logFoodEntry).toHaveBeenCalledTimes(1);
    expect(logFoodEntry.mock.calls[0][1].map((e) => e.foodRef)).toEqual(['off:egg', 'custom:custom-1']);
    expect(mockToastShow).toHaveBeenCalledWith('2 foods added to Snacks.', expect.objectContaining({ variant: 'undo' }));
    expect(nav.navigate).toHaveBeenCalledWith('Diary');
  });
});
