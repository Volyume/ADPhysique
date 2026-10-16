/**
 * waveFourReview.ui.test.js
 *
 * The Wave 4 hostile review of the food level-up (2026-10-16), the sheet and
 * row items. Each pin is written to fail on the code before the fix:
 *
 *   item 3   FoodDetailSheet `fixedMacros`: an entry with no food behind it (a
 *            quick add, an imported day) opens with NO Amount block and no
 *            "More about this food", the summary reads the entry's own
 *            figures, and Save sends quantityG undefined with the note, so the
 *            caller keeps the entry's energy and macros. Before, the sheet
 *            opened at 100 g of a 0 kcal stand-in and saved 0 kcal.
 *   item 11  EntryRow's spoken label carries the note line a sighted person
 *            reads under the meta line ("Note: ..."); a quick add, whose note
 *            is already its name, does not say it twice.
 *   item 12  a custom portion's amount reads "2 × 1 slice" (the times sign of
 *            the logger's amount grammar; a typed label is not pluralised),
 *            and its chip is spoken "Per slice", never "Per 1 slice".
 */
import { create, act } from 'react-test-renderer';

let mockState;
const mockToastShow = jest.fn();

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector(mockState);
  return { __esModule: true, default: fn };
});
jest.mock('../../Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../../lib/food/waterfall', () => ({ refetchStaleFood: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return function MockSwipeable(props) {
    return React.createElement('Swipeable', props, props.children);
  };
});

import FoodDetailSheet, { portionNoun } from '../FoodDetailSheet';
import { EntryRow } from '../EntryRow';
import { isoDate } from '../../../lib/food/diaryDates';

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    user: { id: 'user-1' },
    userProfile: {},
    accessibility: { reduceMotion: true, energyUnit: 'kcal' },
  };
});

function renderSheet(props = {}) {
  const merged = {
    visible: true, mode: 'edit', initialMealSlot: 'meal_1',
    initialEntryDate: isoDate(new Date()), onSave: jest.fn(async () => {}), onClose: jest.fn(), ...props,
  };
  let tree;
  act(() => { tree = create(<FoodDetailSheet {...merged} />); });
  return { tree, props: merged };
}

const byTestId = (tree, id) => tree.root.findAll((n) => n.props.testID === id);
const textOf = (tree) => JSON.stringify(tree.toJSON());

async function press(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  await act(async () => { await node.props.onPress(); });
}

// What DiaryScreen hands the sheet for a quick add (its stand-in food: 0 g in,
// so every per-100 g figure is 0).
const standIn = (name) => ({ name, brand: null, source: null, kcal_100g: 0, protein_100g: 0, carbs_100g: 0, fat_100g: 0, fibre_100g: null });

describe('FoodDetailSheet with fixedMacros (item 3)', () => {
  const fixed = { kcal: 350, protein: 10, carbs: 40, fat: 12, fibre: null };

  test('shows no Amount block and no "More about this food", and says why in one line', () => {
    const { tree } = renderSheet({ food: standIn('Curry at Raj\'s'), initialQuantityG: 0, fixedMacros: fixed });
    expect(byTestId(tree, 'food-sheet-amount')).toHaveLength(0);
    expect(byTestId(tree, 'food-sheet-more')).toHaveLength(0);
    expect(textOf(tree)).toContain('This entry keeps the figures it was added with.');
    // The meal and the note are still offered.
    expect(byTestId(tree, 'food-sheet-meal').length).toBeGreaterThan(0);
  });

  test('the summary reads the entry\'s own figures, never the 0 kcal stand-in', () => {
    const { tree } = renderSheet({ food: standIn('Quick add'), initialQuantityG: 0, fixedMacros: fixed });
    const summary = byTestId(tree, 'food-sheet-summary').find((n) => typeof n.props.accessibilityLabel === 'string');
    expect(summary.props.accessibilityLabel).toBe('350 calories, 10 grams protein, 40 grams carbs, 12 grams fat');
  });

  test('a note edit saves with quantityG undefined and no amount warning', async () => {
    const { tree, props } = renderSheet({ food: standIn('Breakfast, from MyFitnessPal'), initialQuantityG: 0, initialNote: 'Breakfast, from MyFitnessPal', fixedMacros: fixed });
    act(() => tree.root.findAll((n) => n.props.accessibilityLabel === 'Note, optional' && typeof n.props.onChangeText === 'function')[0]
      .props.onChangeText('Breakfast at the hotel'));
    await press(tree, 'Save changes');
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({
      quantityG: undefined, mealSlot: 'meal_1', note: 'Breakfast at the hotel',
    }));
  });

  test('without fixedMacros the sheet is as it was: the Amount block is there', () => {
    const { tree } = renderSheet({
      food: { name: 'Oats', source: 'off', food_ref: 'off:1', kcal_100g: 379, protein_100g: 13, carbs_100g: 60, fat_100g: 8 },
      initialQuantityG: 60,
    });
    expect(byTestId(tree, 'food-sheet-amount').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'food-sheet-fixed')).toHaveLength(0);
  });
});

describe('custom portion wording (item 12)', () => {
  const toast = () => ({
    name: 'Toast', source: null, food_ref: 'custom:cf-1', serving_g: null, serving_label: null,
    portions_json: '[{"label":"1 slice","grams":36},{"label":"mug","grams":250}]',
    kcal_100g: 250, protein_100g: 9, carbs_100g: 45, fat_100g: 3,
  });

  test('two of a "1 slice" portion read "2 × 1 slice", never "2 x 1 slice"', () => {
    const { tree } = renderSheet({ mode: 'add', food: toast(), initialQuantityG: 72 });
    const stepper = tree.root.findAll((n) => n.props.label === 'Amount' && typeof n.props.formatValue === 'function')[0];
    expect(stepper.props.formatValue(2)).toBe('2 × 1 slice');
    expect(stepper.props.formatValue(2)).not.toContain(' x ');
  });

  test('the chip is spoken "Per slice"; a label with no count is kept whole', () => {
    const { tree } = renderSheet({ mode: 'add', food: toast(), initialQuantityG: 72 });
    const labels = tree.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function')
      .map((n) => n.props.accessibilityLabel);
    expect(labels).toContain('Per slice');
    expect(labels).toContain('Per mug');
    expect(labels).not.toContain('Per 1 slice');
  });

  test('portionNoun drops only a leading count of one', () => {
    expect(portionNoun('1 slice')).toBe('slice');
    expect(portionNoun('1 glass of milk')).toBe('glass of milk');
    expect(portionNoun('10 almonds')).toBe('10 almonds');
    expect(portionNoun('slice')).toBe('slice');
    expect(portionNoun('1')).toBe('1');
  });
});

describe('EntryRow spoken label carries the note (item 11)', () => {
  const rowLabel = (entry) => {
    let tree;
    act(() => { tree = create(<EntryRow entry={entry} onEdit={() => {}} />); });
    return tree.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && typeof n.props.onPress === 'function')[0]
      .props.accessibilityLabel;
  };
  const base = { id: 'e1', food_ref: 'global:oats', _name: 'Porridge oats', quantity_g: 60, kcal: 227, protein_g: 8, carbs_g: 36, fat_g: 5 };

  test('a food entry with a note says it, after the figures and before the action', () => {
    expect(rowLabel({ ...base, note: 'with the good butter' }))
      .toBe('Porridge oats, 227 calories, 8 grams of protein, 36 carbs, 5 fat. Note: with the good butter. Tap to edit.');
  });

  test('a note that ends a sentence itself gets no second full stop', () => {
    expect(rowLabel({ ...base, note: 'Was it two?' })).toContain('Note: Was it two? Tap to edit.');
  });

  test('no note, no note words', () => {
    expect(rowLabel(base)).toBe('Porridge oats, 227 calories, 8 grams of protein, 36 carbs, 5 fat. Tap to edit.');
  });

  test('a quick add says its note once, as its name', () => {
    const label = rowLabel({ id: 'q1', food_ref: 'quick:adhoc', quantity_g: 0, kcal: 350, protein_g: 10, carbs_g: 40, fat_g: 12, note: 'Curry at Raj\'s' });
    expect(label.startsWith('Curry at Raj\'s, ')).toBe(true);
    expect(label).not.toContain('Note:');
  });
});
