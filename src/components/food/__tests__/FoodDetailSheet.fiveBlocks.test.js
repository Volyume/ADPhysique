/**
 * FoodDetailSheet.fiveBlocks.test.js
 *
 * D230 R5, R8, R15 and R16 (food level-up, 2026-10-16;
 * docs/audit/food-levelup-2026-10-16/03-ASSESSMENT-AND-PLAN.md section 4.5).
 * Mounted behaviour of the add and edit sheet, written to fail if the sheet
 * drifts back towards the ten stacked blocks it replaced:
 *
 *   (a) at open the sheet is exactly five blocks, in order (title, Amount,
 *       the one line of what this amount is, the meal, the actions), plus
 *       the collapsed "More about this food" row whose content (last
 *       verified, weigh basis, sugar, salt, vitamins and minerals) is absent
 *       until it is pressed, and closed again on every open. The sheet
 *       scrolls (BottomSheet `scroll`), so no block relies on the window cap.
 *   (b) the primary button reads "Add to <meal>" through mealSlotLabel and
 *       follows the meal chip; edit mode reads "Save changes".
 *   (c) the "For Wednesday 14 October." line shows only when the day is not
 *       today, above the meal chips, with a year only when it differs.
 *   (d) a typed "1,5" servings resolves to the same grams as "1.5".
 *   (f) the title is a heading; the unit chips are radios at 48 dp.
 *   (g) the one macro line's words and its spoken label.
 *   Salt (e, the display half): "Salt 0.9 g" with the sodium figure kept in
 *   the spoken label, under the existing sodium Display toggle. The pure
 *   helper is pinned in src/lib/food/__tests__/macros.test.js.
 *   ED safety: nothing in the sheet reads a safety state, so it is the same
 *   sheet under an open flag (source-level, the house idiom for a negative).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

let mockState;
const mockToastShow = jest.fn();

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector(mockState);
  return { __esModule: true, default: fn };
});
jest.mock('../../Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../../lib/haptics', () => ({
  selection: jest.fn(),
  commit: jest.fn(),
}));
// The opportunistic stale-food refresh reaches the network layer; it is
// fire-and-forget and irrelevant to the layout under test.
jest.mock('../../../lib/food/waterfall', () => ({
  refetchStaleFood: jest.fn(() => Promise.resolve()),
}));

import FoodDetailSheet, { entryDateLine } from '../FoodDetailSheet';
import { setMealLabelOverrides } from '../../../lib/food/mealSlots';
import { isoDate, shiftDate } from '../../../lib/food/diaryDates';

const DAY_MS = 24 * 60 * 60 * 1000;

// 90 g bagel: 225 kcal, 9 g protein, 45 g carbs, 1.8 g fat, 2.7 g fibre,
// 4.5 g sugars, 360 mg sodium (0.9 g salt).
function bagel(overrides = {}) {
  return {
    name: 'Plain bagel',
    brand: 'Bakery Co',
    source: 'off',
    food_ref: 'off:5000000000001',
    fetched_at: Date.now() - 3 * DAY_MS,
    kcal_100g: 250,
    protein_100g: 10,
    carbs_100g: 50,
    fat_100g: 2,
    fibre_100g: 3,
    sugar_100g: 5,
    sodium_100g: 0.4,
    serving_g: 90,
    serving_label: 'bagel',
    ...overrides,
  };
}

function baseState(accessibility = {}) {
  return {
    user: { id: 'user-1' },
    userProfile: {},
    accessibility: { reduceMotion: true, energyUnit: 'kcal', ...accessibility },
  };
}

function render(props = {}) {
  const merged = {
    visible: true,
    mode: 'add',
    food: bagel(),
    initialMealSlot: 'meal_1',
    initialEntryDate: isoDate(new Date()),
    onSave: jest.fn(async () => {}),
    onClose: jest.fn(),
    ...props,
  };
  let tree;
  act(() => {
    tree = create(<FoodDetailSheet {...merged} />);
  });
  return { tree, props: merged };
}

function textOf(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('|');
  return textOf(node.children);
}

// Every rendered string, with the macro line's no-break spaces read as spaces.
function allText(tree) {
  return textOf(tree.toJSON()).replace(/\u00A0/g, ' ');
}

function hostByTestID(tree, id) {
  return tree.root.find((n) => typeof n.type === 'string' && n.props.testID === id);
}

// The strings rendered inside one block (a host instance), in order.
function blockText(instance) {
  return instance.findAll((n) => typeof n.type === 'string')
    .flatMap((n) => [].concat(n.props.children))
    .filter((c) => typeof c === 'string' || typeof c === 'number')
    .join('|')
    .replace(/\u00A0/g, ' ');
}

function byLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  return node;
}

async function press(tree, label) {
  const node = byLabel(tree, label);
  await act(async () => {
    await node.props.onPress();
  });
}

function typeAmount(tree, label, value) {
  const field = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function',
  )[0];
  expect(field).toBeTruthy();
  act(() => field.props.onChangeText(value));
}

function flattenStyle(style) {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  if (style && typeof style === 'object') return style;
  return {};
}

const MORE_CONTENT = ['Checked 3 days ago', 'Sugars', 'Salt', 'Vitamins and minerals'];

beforeEach(() => {
  jest.clearAllMocks();
  mockState = baseState();
  setMealLabelOverrides({});
});

describe('(a) five blocks at open, the rest on demand', () => {
  test('the scrolling sheet holds exactly the five blocks in order, with the closed disclosure before the meal and the actions', () => {
    const { tree } = render();
    // `scroll`: the body is the sheet's scroll view, not the fixed view.
    const body = tree.root.find((n) => n.type === 'BottomSheetScrollView');
    const ids = body.findAll(
      (n) => typeof n.type === 'string' && typeof n.props.testID === 'string' && n.props.testID.startsWith('food-sheet-'),
    ).map((n) => n.props.testID);
    // The lead's ruling on lane 2B's note 4: the disclosure is content, so
    // it sits after the summary and before the meal; the action is last, as
    // every house sheet reads.
    expect(ids).toEqual([
      'food-sheet-title',
      'food-sheet-amount',
      'food-sheet-summary',
      'food-sheet-more',
      'food-sheet-meal',
      'food-sheet-actions',
    ]);
    const disclosure = byLabel(tree, 'More about this food');
    expect(disclosure.props.accessibilityState).toEqual({ expanded: false });
  });

  test('each block holds its own content at open', () => {
    const { tree } = render();
    const title = hostByTestID(tree, 'food-sheet-title');
    expect(blockText(title)).toContain('Plain bagel');
    expect(blockText(title)).toContain('Bakery Co');
    expect(title.findAll((n) => n.props.accessibilityLabel === 'Source: Food Facts').length).toBeGreaterThan(0);

    const amount = blockText(hostByTestID(tree, 'food-sheet-amount'));
    expect(amount).toContain('Amount');
    expect(amount).toContain('bagel (90 g)');
    expect(amount).toContain('Grams');
    // The lead's ruling on lane 2B's note 1: the typed field IS the
    // Stepper's centre (the house Stepper's `centre` slot), so the number
    // appears once, in the field, never mirrored beside it.
    expect(amount).not.toContain('1 serving');
    const amountField = tree.root.findAll((n) => n.props.accessibilityLabel === 'Amount in servings' && typeof n.props.onChangeText === 'function')[0];
    expect(amountField.props.value).toBe('1');
    expect(amount).toContain('= |90| g');

    expect(blockText(hostByTestID(tree, 'food-sheet-summary')))
      .toBe('225 kcal · 9 g protein · 45 g carbs · 1.8 g fat · 2.7 g fibre');

    const meal = blockText(hostByTestID(tree, 'food-sheet-meal'));
    expect(meal).toContain('Meal 1');
    expect(meal).not.toContain('Eaten at');

    const actions = blockText(hostByTestID(tree, 'food-sheet-actions'));
    expect(actions).toContain('Cancel');
    expect(actions).toContain('Add to Meal 1');
  });

  test('"More about this food" content is absent until the row is pressed, in its stated order', async () => {
    const { tree } = render({ food: bagel({ food_ref: 'curated:oats', source: 'off' }) });
    const closed = allText(tree);
    for (const s of MORE_CONTENT) expect(closed).not.toContain(s);
    expect(closed).not.toContain('Weighed');

    await press(tree, 'More about this food');
    const open = allText(tree);
    for (const s of MORE_CONTENT) expect(open).toContain(s);
    expect(open).toContain('Weighed');
    expect(open).toContain('Sugars |4.5 g');
    expect(open).toContain('Salt |0.9 g');
    // Order: last verified, weigh basis, sugar, salt, vitamins and minerals.
    const order = ['Checked 3 days ago', 'Weighed', 'Sugars', 'Salt', 'Vitamins and minerals'].map((s) => open.indexOf(s));
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(byLabel(tree, 'More about this food').props.accessibilityState).toEqual({ expanded: true });
  });

  test('the disclosure is closed again on every open of the sheet', async () => {
    const { tree, props } = render();
    await press(tree, 'More about this food');
    expect(allText(tree)).toContain('Vitamins and minerals');
    act(() => { tree.update(<FoodDetailSheet {...props} visible={false} />); });
    act(() => { tree.update(<FoodDetailSheet {...props} visible />); });
    expect(allText(tree)).not.toContain('Vitamins and minerals');
    expect(byLabel(tree, 'More about this food').props.accessibilityState).toEqual({ expanded: false });
  });

  test('the disclosure header is the house CollapsibleSection at 48 dp', () => {
    const { tree } = render();
    const header = byLabel(tree, 'More about this food');
    expect(header.props.accessibilityRole).toBe('button');
    expect(flattenStyle(header.props.style).minHeight).toBeGreaterThanOrEqual(48);
  });
});

describe('(b) the primary names the meal', () => {
  test('reads "Add to <meal>" and follows the selected meal chip, then saves to that meal', async () => {
    const { tree, props } = render();
    expect(allText(tree)).toContain('Add to Meal 1');
    await press(tree, 'Meal: Meal 3');
    const text = allText(tree);
    expect(text).toContain('Add to Meal 3');
    expect(text).not.toContain('Add to Meal 1');
    await press(tree, 'Add to Meal 3');
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ mealSlot: 'meal_3', quantityG: 90 }));
  });

  test('uses the person\'s own meal name through mealSlotLabel', () => {
    setMealLabelOverrides({ meal_2: 'Lunch at work' });
    const { tree } = render({ initialMealSlot: 'meal_2' });
    expect(allText(tree)).toContain('Add to Lunch at work');
  });

  test('edit mode reads "Save changes" and keeps "Eaten at" under the meal chips and the Remove action', () => {
    const { tree } = render({ mode: 'edit', initialQuantityG: 90, onDelete: jest.fn() });
    const text = allText(tree);
    expect(text).toContain('Save changes');
    expect(text).not.toContain('Add to Meal 1');
    const meal = blockText(hostByTestID(tree, 'food-sheet-meal'));
    expect(meal.indexOf('Eaten at')).toBeGreaterThan(meal.indexOf('Meal 1'));
    expect(byLabel(tree, 'Remove entry')).toBeTruthy();
  });
});

describe('(c) the day line only when the day is not today', () => {
  test('pure: weekday, day and month in words, a year only when it differs, nothing for today', () => {
    expect(entryDateLine('2026-10-14', '2026-10-16')).toBe('For Wednesday 14 October.');
    expect(entryDateLine('2025-12-31', '2026-01-02')).toBe('For Wednesday 31 December 2025.');
    expect(entryDateLine('2026-10-16', '2026-10-16')).toBeNull();
    expect(entryDateLine(undefined, '2026-10-16')).toBeNull();
    expect(entryDateLine('not-a-day', '2026-10-16')).toBeNull();
  });

  test('mounted: absent for today, present above the meal chips for another day', () => {
    const today = isoDate(new Date());
    const { tree } = render({ initialEntryDate: today });
    expect(allText(tree)).not.toMatch(/For [A-Z][a-z]+day /);

    const backDated = shiftDate(today, -2);
    const { tree: back } = render({ initialEntryDate: backDated });
    const line = entryDateLine(backDated);
    expect(line).toMatch(/^For [A-Z][a-z]+day \d{1,2} [A-Z][a-z]+( \d{4})?\.$/);
    // First in the meal block, above the meal chips; nowhere else in the sheet.
    const meal = blockText(hostByTestID(back, 'food-sheet-meal'));
    expect(meal.indexOf(line)).toBe(0);
    expect(meal.indexOf(line)).toBeLessThan(meal.indexOf('Meal 1'));
    expect(allText(back).split(line)).toHaveLength(2);
  });
});

describe('(d) a decimal comma is a decimal point', () => {
  test('"1,5" servings resolves to the same grams as "1.5" (135 g of a 90 g bagel)', async () => {
    const comma = render();
    typeAmount(comma.tree, 'Amount in servings', '1,5');
    expect(allText(comma.tree)).toContain('= |135| g');
    await press(comma.tree, 'Add to Meal 1');

    const point = render();
    typeAmount(point.tree, 'Amount in servings', '1.5');
    await press(point.tree, 'Add to Meal 1');

    expect(comma.props.onSave).toHaveBeenCalledWith(expect.objectContaining({ quantityG: 135 }));
    expect(point.props.onSave).toHaveBeenCalledWith(expect.objectContaining({ quantityG: 135 }));
  });

  test('the buttons step 0.5 serving from the typed amount, and the field is the one number (no adjustable mirrors it)', () => {
    const { tree } = render();
    typeAmount(tree, 'Amount in servings', '1,5');
    // With the field in the Stepper's centre the row is not one adjustable
    // (that would hide the field from a screen reader): the buttons and the
    // field are reached each as themselves.
    expect(tree.root.findAll((n) => n.props.accessibilityRole === 'adjustable' && typeof n.type === 'string')).toHaveLength(0);
    act(() => { byLabel(tree, 'Increase amount').props.onPress(); });
    const field = tree.root.findAll((n) => n.props.accessibilityLabel === 'Amount in servings' && typeof n.props.onChangeText === 'function')[0];
    expect(field.props.value).toBe('2');
    act(() => { byLabel(tree, 'Decrease amount').props.onPress(); });
    expect(field.props.value).toBe('1.5');
  });

  test('the 1 to 5000 g bound still refuses an amount over it', async () => {
    const { tree, props } = render();
    typeAmount(tree, 'Amount in servings', '60');
    await press(tree, 'Add to Meal 1');
    expect(props.onSave).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith('Enter an amount that works out between 1 and 5000 g.', { variant: 'warning' });
  });
});

describe('(f) heading and 48 dp radio unit chips', () => {
  test('the food name is a heading', () => {
    const { tree } = render();
    const title = tree.root.find((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header');
    expect(textOf(title.props.children)).toBe('Plain bagel');
  });

  test('the unit chips are radios at a 48 dp minimum, with checked state', () => {
    const { tree } = render();
    for (const label of ['Per bagel', 'Grams']) {
      const chip = tree.root.findAll(
        (n) => n.props.accessibilityLabel === label && n.props.accessibilityRole === 'radio' && n.props.style,
      ).pop();
      expect(chip).toBeTruthy();
      expect(flattenStyle(chip.props.style).minHeight).toBeGreaterThanOrEqual(48);
    }
    const perBagel = tree.root.findAll((n) => n.props.accessibilityLabel === 'Per bagel' && n.props.accessibilityState).pop();
    expect(perBagel.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
  });

  test('the meal chips are radios at a 48 dp minimum', () => {
    const { tree } = render();
    const chip = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Meal: Meal 2' && n.props.accessibilityRole === 'radio' && n.props.style,
    ).pop();
    expect(flattenStyle(chip.props.style).minHeight).toBeGreaterThanOrEqual(48);
  });
});

describe('(g) the one line of what this amount is', () => {
  test('its words and its spoken label', () => {
    const { tree } = render();
    const summary = hostByTestID(tree, 'food-sheet-summary');
    expect(blockText(summary)).toBe('225 kcal · 9 g protein · 45 g carbs · 1.8 g fat · 2.7 g fibre');
    expect(summary.props.accessibilityLabel)
      .toBe('225 calories, 9 grams protein, 45 grams carbs, 1.8 grams fat, 2.7 grams fibre');
    expect(summary.props.accessible).toBe(true);
  });

  test('wraps between parts, never inside one', () => {
    const { tree } = render();
    const summary = hostByTestID(tree, 'food-sheet-summary');
    const raw = summary.findAll((n) => typeof n.type === 'string' && typeof n.props.children === 'string')[0].props.children;
    expect(raw).toContain('9\u00A0g\u00A0protein');
    expect(raw.split(' · ')).toHaveLength(5);
  });

  test('fibre only when the food carries it and the Display toggle is on', () => {
    const noFibre = render({ food: bagel({ fibre_100g: null }) });
    const a = hostByTestID(noFibre.tree, 'food-sheet-summary');
    expect(a.props.accessibilityLabel).toBe('225 calories, 9 grams protein, 45 grams carbs, 1.8 grams fat');

    mockState = baseState({ showFibre: false });
    const off = render();
    expect(allText(off.tree)).not.toContain('fibre');
  });

  test('kilojoules when that is the chosen energy unit', () => {
    mockState = baseState({ energyUnit: 'kj' });
    const { tree } = render();
    const summary = hostByTestID(tree, 'food-sheet-summary');
    expect(summary.props.accessibilityLabel).toMatch(/^941 kilojoules, 9 grams protein/);
    expect(allText(tree)).toContain('941 kJ · 9 g protein');
  });
});

describe('(e) salt, under the sodium Display toggle', () => {
  test('shows "Salt 0.9 g" and keeps the sodium figure in the spoken label', async () => {
    const { tree } = render();
    await press(tree, 'More about this food');
    expect(allText(tree)).toContain('Salt |0.9 g');
    const salt = tree.root.findAll((n) => n.props.accessibilityLabel === '0.9 grams of salt, 360 milligrams sodium');
    expect(salt.length).toBeGreaterThan(0);
    expect(allText(tree)).not.toMatch(/Sodium|360 ?mg/);
  });

  test('the toggle that governed sodium now governs salt', async () => {
    mockState = baseState({ showSodium: false });
    const { tree } = render();
    await press(tree, 'More about this food');
    expect(allText(tree)).not.toContain('Salt');
    expect(allText(tree)).toContain('Sugars');
  });

  test('no salt line when the food carries no sodium figure', async () => {
    const { tree } = render({ food: bagel({ sodium_100g: null }) });
    await press(tree, 'More about this food');
    expect(allText(tree)).not.toContain('Salt');
  });
});

describe('ED safety: the sheet reads no safety state', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'FoodDetailSheet.js'), 'utf8');
  test('no flag, calm-mode or safety-state read anywhere in the sheet', () => {
    expect(SRC).not.toMatch(/useSafetyState|edPatternDetector|getOpenEdPatternFlag|edFlag|isCalm|calmMode|wellbeing/);
  });
});
