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
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

// Save button: captured on every render so the test can invoke onPress directly,
// the same call the real "Save and add to diary" tap makes.
let mockSaveButton = null;
jest.mock('../../components/Button', () => (props) => {
  if (props.accessibilityLabel === 'Save food and add to diary') mockSaveButton = props;
  return null;
});

jest.mock('../../lib/food/db', () => ({
  insertCustomFood: jest.fn(() => Promise.resolve('custom-1')),
  logFoodEntry: jest.fn(() => Promise.resolve('entry-1')),
}));
jest.mock('../../lib/food/writeback', () => ({
  queueContribution: jest.fn(() => Promise.resolve()),
  getConsent: jest.fn(() => Promise.resolve(false)),
  markScanChainCompleted: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/food/sources/localCache', () => ({ findLocalByBarcode: jest.fn(() => Promise.resolve(null)) }));

import useAppStore from '../../store/useAppStore';
import { insertCustomFood, logFoodEntry } from '../../lib/food/db';
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
  const CONFIDENCE_HINT = 'Not certain, check this value';
  const BANNER = "Amber figures aren't certain, check them.";

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

  test.each([
    ['a negative amount', '-50'],
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
    expect(logFoodEntry).toHaveBeenCalledWith('u1', expect.objectContaining({
      foodRef: 'custom:custom-1',
      quantityG: 150,
    }));
    expect(mockToastShow).not.toHaveBeenCalledWith(WARNING, expect.anything());
    expect(nav.goBack).toHaveBeenCalled();
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
