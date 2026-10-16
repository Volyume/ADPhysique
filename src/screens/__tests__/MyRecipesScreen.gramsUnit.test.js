/**
 * MyRecipesScreen.gramsUnit.test.js
 *
 * D230 lane 3B (R12): the recipe servings sheet gains a second unit, "Grams",
 * beside "Servings" as house Chips (a radio group). In grams the person types
 * or steps the cooked amount (10 g steps, the diary's 1 to 5000 g bound) and
 * the screen hands applyRecipeToDiary `grams` (so quantity_g is that amount and
 * the macros scale by the same per-100g formula as servings; the db side is
 * pinned in src/lib/food/__tests__/recipeLogging.test.js). The button reads
 * "Add to <meal>" for either unit, the undo toast stays, the servings unit is
 * unchanged. Mocking follows MyRecipesScreen.undoToast.test.js.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/ModalHeader', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return ({ title, rightAccessory }) => React.createElement(View, null, React.createElement(Text, null, title), rightAccessory);
});
jest.mock('../../components/Button', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress, accessibilityLabel }) => (
    React.createElement(
      TouchableOpacity,
      { onPress, accessibilityLabel: accessibilityLabel || title },
      React.createElement(Text, null, title),
    )
  );
});
jest.mock('../../components/BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  // TextField reads the sheet context (the real field primitive inside a sheet).
  const BottomSheet = ({ visible, children }) => (visible ? React.createElement(View, null, children) : null);
  return { __esModule: true, default: BottomSheet, InsideBottomSheetContext: React.createContext(false) };
});
jest.mock('../../components/Skeleton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { SkeletonRow: () => React.createElement(Text, null, 'loading row') };
});
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data = [], renderItem }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, null, data.map((item, index) => renderItem({ item, index })));
  },
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ user: { id: 'u1' }, accessibility: { reduceMotion: true, energyUnit: 'kcal' } })),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/food/db', () => ({
  listRecipesWithTotals: jest.fn(),
  deleteRecipe: jest.fn(),
  applyRecipeToDiary: jest.fn(),
  getRecipeWithIngredients: jest.fn(),
  deleteFoodEntry: jest.fn(),
}));
jest.mock('../../lib/food/sources/localCache', () => ({ resolveFoodRef: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import MyRecipesScreen from '../MyRecipesScreen';
import {
  listRecipesWithTotals, applyRecipeToDiary, deleteFoodEntry,
} from '../../lib/food/db';
import { logError } from '../../lib/errorLog';
import { resolveFoodRef } from '../../lib/food/sources/localCache';
import Chip from '../../components/Chip';

const CHILLI = {
  id: 'r1',
  name: 'Chilli',
  total_servings: 4,
  notes: null,
  totals: { kcal: 2000, protein: 160, carbs: 200, fat: 60 },
};
const PARAMS = { mealSlot: 'breakfast', entryDate: '2026-10-16' };

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}
async function mount() {
  const nav = { navigate: jest.fn(), goBack: jest.fn() };
  let tree;
  await act(async () => { tree = create(<MyRecipesScreen navigation={nav} route={{ params: PARAMS }} />); });
  await flush();
  return { nav, tree };
}
const byLabel = (tree, label) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
)[0];
const flat = (style) => Object.assign({}, ...[].concat(style ?? []).flat(5).filter(Boolean));
const press = async (node) => { await act(async () => { await node.props.onPress(); }); };
const gramsField = (tree) => tree.root.findAll(
  (n) => n.props?.accessibilityLabel === 'Amount in grams' && typeof n.props?.onChangeText === 'function',
)[0];
const type = async (tree, text) => { await act(async () => { gramsField(tree).props.onChangeText(text); }); };

async function openSheet() {
  const ctx = await mount();
  await act(async () => { byLabel(ctx.tree, 'Log Chilli').props.onPress(); });
  await flush();
  return ctx;
}

beforeEach(() => {
  jest.clearAllMocks();
  listRecipesWithTotals.mockResolvedValue([CHILLI]);
  applyRecipeToDiary.mockResolvedValue('entry-9');
  deleteFoodEntry.mockResolvedValue(true);
  resolveFoodRef.mockResolvedValue({ food_ref: 'recipe:r1', serving_g: 250 });
});

describe('the recipe sheet\'s second unit', () => {
  test('Servings and Grams are house Chips in a radio group, Servings first and chosen, at 48 dp', async () => {
    const { tree } = await openSheet();
    const group = tree.root.findAll((n) => n.props?.accessibilityRole === 'radiogroup');
    expect(group.length).toBeGreaterThan(0);
    const chips = tree.root.findAll((n) => n.type === Chip);
    expect(chips.map((c) => c.props.label)).toEqual(['Servings', 'Grams']);
    expect(chips.every((c) => c.props.accessibilityRole === 'radio')).toBe(true);
    expect(chips.map((c) => c.props.selected)).toEqual([true, false]);
    // The house Chip's own minimum height is the 48 dp target.
    const hosts = tree.root.findAll((n) => n.props?.accessibilityRole === 'radio' && n.props?.style);
    expect(hosts.length).toBeGreaterThan(0);
    expect(hosts.every((h) => flat(h.props.style).minHeight >= 48)).toBe(true);
  });

  test('the servings unit is unchanged: servings go to the write and the button names the meal', async () => {
    const { tree } = await openSheet();
    expect(tree.root.findAll((n) => n.props?.title === 'Add to Breakfast').length).toBeGreaterThan(0);
    await press(byLabel(tree, 'More servings'));
    await press(byLabel(tree, 'Add to Breakfast'));
    expect(applyRecipeToDiary).toHaveBeenCalledWith('u1', 'r1', { ...PARAMS, servings: 1.5 });
  });

  test('Grams starts at what the servings come to, then logs grams with the toast and Undo', async () => {
    const { nav, tree } = await openSheet();
    await press(byLabel(tree, 'More servings')); // 1.5 servings of 250 g
    await act(async () => { tree.root.findAll((n) => n.props?.label === 'Grams')[0].props.onPress(); });
    expect(gramsField(tree).props.value).toBe('375');

    await press(byLabel(tree, 'Add to Breakfast'));
    expect(applyRecipeToDiary).toHaveBeenCalledTimes(1);
    expect(applyRecipeToDiary).toHaveBeenCalledWith('u1', 'r1', { ...PARAMS, grams: 375 });
    expect(mockToastShow).toHaveBeenCalledWith('Chilli added to Breakfast.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo' }),
    }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });
    expect(deleteFoodEntry).toHaveBeenCalledWith('entry-9', 'u1');
  });

  test('a typed amount is what is written, and the stepper moves it 10 g at a time', async () => {
    const { tree } = await openSheet();
    await act(async () => { tree.root.findAll((n) => n.props?.label === 'Grams')[0].props.onPress(); });
    await type(tree, '180');
    await press(byLabel(tree, 'More grams'));
    expect(gramsField(tree).props.value).toBe('190');
    await press(byLabel(tree, 'Fewer grams'));
    await press(byLabel(tree, 'Fewer grams'));
    expect(gramsField(tree).props.value).toBe('170');
    await type(tree, '212,5'); // a decimal comma is read as a decimal
    await press(byLabel(tree, 'Add to Breakfast'));
    expect(applyRecipeToDiary).toHaveBeenCalledWith('u1', 'r1', { ...PARAMS, grams: 212.5 });
  });

  test('an amount outside 1 to 5000 g, or none, cannot be added', async () => {
    const { tree } = await openSheet();
    await act(async () => { tree.root.findAll((n) => n.props?.label === 'Grams')[0].props.onPress(); });
    for (const text of ['', '0', '5001', '99999']) {
      // eslint-disable-next-line no-await-in-loop
      await type(tree, text);
      expect(tree.root.findAll((n) => n.props?.title === 'Add to Breakfast')[0].props.disabled).toBe(true);
    }
    await type(tree, '5000');
    expect(tree.root.findAll((n) => n.props?.title === 'Add to Breakfast')[0].props.disabled).toBe(false);
    await type(tree, '5001');
    // The button's handler also refuses; nothing is written.
    await press(tree.root.findAll((n) => n.props?.title === 'Add to Breakfast')[0]);
    expect(applyRecipeToDiary).not.toHaveBeenCalled();
  });

  test('the grams stepper buttons are the house 48 dp, and the sheet title is a heading', async () => {
    const { tree } = await openSheet();
    await act(async () => { tree.root.findAll((n) => n.props?.label === 'Grams')[0].props.onPress(); });
    for (const label of ['Fewer grams', 'More grams']) {
      const style = flat(byLabel(tree, label).props.style);
      expect(style.width).toBeGreaterThanOrEqual(48);
      expect(style.height).toBeGreaterThanOrEqual(48);
    }
    const headings = tree.root.findAll((n) => n.props?.accessibilityRole === 'header');
    expect(headings.map((n) => n.props.children)).toContain('Chilli');
  });

  test('a serving weight that cannot be read still leaves Grams usable from a typed amount', async () => {
    resolveFoodRef.mockRejectedValue(new Error('locked'));
    const { tree } = await openSheet();
    expect(logError).toHaveBeenCalledWith('MyRecipes.resolveServing', expect.any(Error), { hasId: true });
    await act(async () => { tree.root.findAll((n) => n.props?.label === 'Grams')[0].props.onPress(); });
    expect(gramsField(tree).props.value).toBe('100');
  });
});
