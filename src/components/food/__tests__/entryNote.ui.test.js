/**
 * entryNote.ui.test.js
 *
 * D230 R20 (food level-up, 2026-10-16): the note on a diary entry, mounted.
 * Written to fail on the code before this lane (no field, no line, no name):
 *
 *   FoodDetailSheet  an optional "Note" field under the meal chips (one line,
 *                    120 characters, placeholder "Anything worth remembering"),
 *                    prefilled from initialNote in edit mode, sent on save as
 *                    the trimmed text ('' when blank, so an edit can clear it),
 *                    and ABSENT with the meal block when saveTitle is set (the
 *                    sheet then writes nothing, so it offers nothing).
 *   QuickAddSheet    a "What was it?" field (same bound) whose text is sent as
 *                    `note`; nothing is sent when it is left blank.
 *   EntryRow         a quick add with a note shows the note AS its name in
 *                    place of "Quick add"; any other entry shows the note as
 *                    one quiet caption line (textMuted, one line, ellipsised)
 *                    under the meta line; no note, no line.
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

import FoodDetailSheet from '../FoodDetailSheet';
import QuickAddSheet from '../QuickAddSheet';
import { EntryRow, friendlyFoodName } from '../EntryRow';
import { isoDate } from '../../../lib/food/diaryDates';
import { FOOD_NOTE_MAX_LENGTH } from '../../../lib/food/entryNote';

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    user: { id: 'user-1' },
    userProfile: {},
    accessibility: { reduceMotion: true, energyUnit: 'kcal' },
  };
});

const bagel = () => ({
  name: 'Plain bagel', brand: 'Bakery Co', source: 'off', food_ref: 'off:5000000000001',
  fetched_at: Date.now(), kcal_100g: 250, protein_100g: 10, carbs_100g: 50, fat_100g: 2,
  fibre_100g: 3, sugar_100g: 5, sodium_100g: 0.4, serving_g: 90, serving_label: 'bagel',
});

function renderSheet(props = {}) {
  const merged = {
    visible: true, mode: 'add', food: bagel(), initialMealSlot: 'meal_1',
    initialEntryDate: isoDate(new Date()), onSave: jest.fn(async () => {}), onClose: jest.fn(), ...props,
  };
  let tree;
  act(() => { tree = create(<FoodDetailSheet {...merged} />); });
  return { tree, props: merged };
}

const fieldByLabel = (tree, label) => tree.root.findAll(
  (n) => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function',
)[0];
const textInputByLabel = (tree, label) => tree.root.findAll(
  (n) => n.props.accessibilityLabel === label && n.props.maxLength !== undefined,
)[0];

async function press(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  await act(async () => { await node.props.onPress(); });
}

describe('FoodDetailSheet: the Note field', () => {
  test('is offered on add, one line of at most 120 characters, with its placeholder', () => {
    const { tree } = renderSheet();
    const input = textInputByLabel(tree, 'Note, optional');
    expect(input).toBeTruthy();
    expect(input.props.maxLength).toBe(FOOD_NOTE_MAX_LENGTH);
    expect(input.props.maxLength).toBe(120);
    expect(input.props.placeholder).toBe('Anything worth remembering');
    expect(input.props.multiline).toBeFalsy();
    expect(JSON.stringify(tree.toJSON())).toContain('Note');
  });

  test('is sent on save, trimmed', async () => {
    const { tree, props } = renderSheet();
    act(() => fieldByLabel(tree, 'Note, optional').props.onChangeText('  with the good butter  '));
    await press(tree, 'Add to Meal 1');
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ note: 'with the good butter' }));
  });

  test('a blank note is sent as an empty string, never as text', async () => {
    const { tree, props } = renderSheet();
    await press(tree, 'Add to Meal 1');
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ note: '' }));
  });

  test('edit mode opens with the entry\'s note, and clearing it sends an empty string', async () => {
    const { tree, props } = renderSheet({ mode: 'edit', initialQuantityG: 90, initialNote: 'Sam\'s café' });
    expect(fieldByLabel(tree, 'Note, optional').props.value).toBe('Sam\'s café');
    act(() => fieldByLabel(tree, 'Note, optional').props.onChangeText(''));
    await press(tree, 'Save changes');
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ note: '' }));
  });

  test('is hidden with the meal block when the sheet only sets an amount (saveTitle), and sends no note', async () => {
    const { tree, props } = renderSheet({ saveTitle: 'Use this amount' });
    expect(fieldByLabel(tree, 'Note, optional')).toBeUndefined();
    await press(tree, 'Use this amount');
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ note: undefined }));
  });
});

describe('QuickAddSheet: What was it?', () => {
  function renderQuick(props = {}) {
    const merged = { visible: true, initialMealSlot: 'snack', onSave: jest.fn(async () => {}), onClose: jest.fn(), ...props };
    let tree;
    act(() => { tree = create(<QuickAddSheet {...merged} />); });
    return { tree, props: merged };
  }

  test('offers the field, bounded to 120 characters, and sends the trimmed text as the note', async () => {
    const { tree, props } = renderQuick();
    const input = textInputByLabel(tree, 'What was it, optional');
    expect(input.props.maxLength).toBe(120);
    expect(JSON.stringify(tree.toJSON())).toContain('What was it?');
    act(() => fieldByLabel(tree, 'Energy in kcal').props.onChangeText('450'));
    act(() => fieldByLabel(tree, 'What was it, optional').props.onChangeText('  Curry at Raj\'s '));
    await press(tree, 'Add to diary');
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ kcal: 450, note: 'Curry at Raj\'s' }));
  });

  test('sends no note key when left blank', async () => {
    const { tree, props } = renderQuick();
    act(() => fieldByLabel(tree, 'Energy in kcal').props.onChangeText('450'));
    await press(tree, 'Add to diary');
    expect(props.onSave.mock.calls[0][0]).not.toHaveProperty('note');
  });
});

describe('EntryRow: the note', () => {
  const base = {
    id: 'e1', entry_date: '2026-10-16', meal_slot: 'meal_1', food_ref: 'global:oats',
    quantity_g: 60, kcal: 227, protein_g: 8, carbs_g: 36, fat_g: 5, fibre_g: 6, _name: 'Oats',
  };
  const lines = (entry) => {
    const tree = create(<EntryRow entry={entry} onEdit={() => {}} />);
    return { tree, json: JSON.stringify(tree.toJSON()) };
  };

  test('a quick add with a note shows the note AS its name, not "Quick add"', () => {
    const quick = { ...base, food_ref: 'quick:adhoc', quantity_g: 0, _name: undefined, note: 'Curry at Raj\'s' };
    expect(friendlyFoodName(quick)).toBe('Curry at Raj\'s');
    const { json } = lines(quick);
    expect(json).toContain('Curry at Raj');
    expect(json).not.toContain('Quick add');
    // Shown once: it is the name, so it is not repeated as the quiet line.
    expect(json.split('Curry at Raj').length - 1).toBe(2); // the visible name + the spoken label
  });

  test('a quick add without a note (or with a blank one) still reads "Quick add"', () => {
    const quick = { ...base, food_ref: 'quick:adhoc', quantity_g: 0, _name: undefined };
    expect(friendlyFoodName(quick)).toBe('Quick add');
    expect(friendlyFoodName({ ...quick, note: '   ' })).toBe('Quick add');
    expect(friendlyFoodName({ ...quick, note: null })).toBe('Quick add');
  });

  test('a food entry with a note shows it as one quiet, ellipsised caption line under the meta line', () => {
    const { tree } = lines({ ...base, note: 'with the good butter' });
    const noteNode = tree.root.findAll((n) => n.props.numberOfLines === 1 && n.props.ellipsizeMode === 'tail')
      .find((n) => JSON.stringify(n.props.children) === JSON.stringify('with the good butter'));
    expect(noteNode).toBeTruthy();
    // The food's own name is unchanged by a note.
    expect(friendlyFoodName({ ...base, note: 'with the good butter' })).toBe('Oats');
  });

  test('no note, no line', () => {
    const { json } = lines({ ...base, note: null });
    expect(json).not.toContain('ellipsizeMode');
    const { json: blank } = lines({ ...base, note: '  ' });
    expect(blank).not.toContain('ellipsizeMode');
  });
});
