/**
 * MyRecipesScreen.undoToast.test.js
 *
 * D230 R12, R15, R16 and R18 (food level-up 2026-10-16). Logging a recipe used
 * to close the sheet and the screen in silence: no confirmation, no Undo. It
 * now shows the house undo toast ("Chilli added to Breakfast.") and its Undo
 * deletes the one diary row the write returned. This suite mounts the screen
 * (db mocked, as the other MyRecipes suites do) and pins:
 *   1. the toast text and variant, and that Undo calls deleteFoodEntry with
 *      exactly the id applyRecipeToDiary returned;
 *   2. that a recipe with no resolvable ingredients (the write returns null)
 *      shows no undo toast, only the existing "Add at least one ingredient"
 *      info;
 *   3. the failure sentence ("That recipe was not logged. Try again in a
 *      moment.") with the cause logged first, the delete failure sentence,
 *      and a failed Undo that is not silent;
 *   4. the row icons reach 48 dp (a 40 dp box plus 4 dp of hit slop a side)
 *      and the servings sheet's title carries the header role.
 *
 * Mocking follows MyRecipesScreen.loadState.test.js (same heavy-mount
 * boundaries), with a shared toast spy and deleteFoodEntry added to the db mock.
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
  return ({ visible, children }) => (visible ? React.createElement(View, null, children) : null);
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
import { appAlert } from '../../components/AppAlert';
import {
  listRecipesWithTotals, applyRecipeToDiary, deleteFoodEntry, deleteRecipe,
} from '../../lib/food/db';
import { logError } from '../../lib/errorLog';

const CHILLI = {
  id: 'r1',
  name: 'Chilli',
  total_servings: 4,
  notes: null,
  totals: { kcal: 2000, protein: 160, carbs: 200, fat: 60 },
};

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn() };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

async function mount(params = { mealSlot: 'breakfast', entryDate: '2026-10-16' }) {
  const nav = makeNav();
  let tree;
  await act(async () => { tree = create(<MyRecipesScreen navigation={nav} route={{ params }} />); });
  await flush();
  return { nav, tree };
}

function byLabel(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function')[0];
}

// Open the servings sheet for Chilli and press the log button.
async function logChilli(tree) {
  await act(async () => { byLabel(tree, 'Log Chilli').props.onPress(); });
  await act(async () => { await byLabel(tree, 'Log 1 serving').props.onPress(); });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  listRecipesWithTotals.mockResolvedValue([CHILLI]);
  applyRecipeToDiary.mockResolvedValue('entry-9');
  deleteFoodEntry.mockResolvedValue(true);
  deleteRecipe.mockResolvedValue(undefined);
});

describe('MyRecipesScreen recipe log toast (D230 R12)', () => {
  test('logging shows the house undo toast naming the meal, then returns to the add screen\'s caller', async () => {
    const { nav, tree } = await mount();
    await logChilli(tree);

    expect(applyRecipeToDiary).toHaveBeenCalledWith('u1', 'r1', { mealSlot: 'breakfast', entryDate: '2026-10-16', servings: 1 });
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith('Chilli added to Breakfast.', expect.objectContaining({
      variant: 'undo',
      action: expect.objectContaining({ label: 'Undo', onPress: expect.any(Function) }),
    }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  test('Undo deletes the row the write returned, and only that row', async () => {
    const { tree } = await mount();
    await logChilli(tree);

    const [, opts] = mockToastShow.mock.calls[0];
    expect(deleteFoodEntry).not.toHaveBeenCalled();
    await act(async () => { await opts.action.onPress(); });
    expect(deleteFoodEntry).toHaveBeenCalledTimes(1);
    expect(deleteFoodEntry).toHaveBeenCalledWith('entry-9', 'u1');
  });

  test('a recipe with nothing to log shows no undo toast, only the existing hint', async () => {
    applyRecipeToDiary.mockResolvedValue(null);
    const { nav, tree } = await mount();
    await logChilli(tree);

    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith('Add at least one ingredient first.', { variant: 'info' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('a failed Undo is not silent: the cause is logged and the person is told', async () => {
    deleteFoodEntry.mockRejectedValue(new Error('locked'));
    const { tree } = await mount();
    await logChilli(tree);
    const [, opts] = mockToastShow.mock.calls[0];
    await act(async () => { await opts.action.onPress(); });

    expect(logError).toHaveBeenCalledWith('MyRecipes.undoRecipeLog', expect.any(Error));
    expect(mockToastShow).toHaveBeenCalledWith('That recipe was not removed. You can remove it from the diary.', { variant: 'error' });
  });
});

describe('MyRecipesScreen failures are full sentences with a logged cause (D230 R15, R18)', () => {
  test('a failed log says what happened and what to do', async () => {
    applyRecipeToDiary.mockRejectedValue(new Error('disk'));
    const { nav, tree } = await mount();
    await logChilli(tree);

    expect(logError).toHaveBeenCalledWith('MyRecipes.applyRecipe', expect.any(Error), { mealSlot: 'breakfast' });
    expect(mockToastShow).toHaveBeenCalledWith('That recipe was not logged. Try again in a moment.', { variant: 'error' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('a failed delete says what happened and what to do', async () => {
    deleteRecipe.mockRejectedValue(new Error('locked'));
    const { tree } = await mount();
    await act(async () => { byLabel(tree, 'Delete Chilli').props.onPress(); });
    const buttons = appAlert.mock.calls[0][2];
    await act(async () => { await buttons.find((b) => b.text === 'Delete').onPress(); });

    expect(logError).toHaveBeenCalledWith('MyRecipes.deleteRecipe', expect.any(Error), { hasId: true });
    expect(mockToastShow).toHaveBeenCalledWith('That recipe was not deleted. Try again in a moment.', { variant: 'error' });
  });
});

describe('MyRecipesScreen 48 dp icons and heading roles (D230 R16)', () => {
  test('view, edit and delete reach 48 dp: a 40 dp box plus 4 dp of hit slop on each side', async () => {
    const { tree } = await mount();
    for (const label of ['View Chilli', 'Edit Chilli', 'Delete Chilli']) {
      const button = byLabel(tree, label);
      const flat = Object.assign({}, ...[].concat(button.props.style));
      // hitSlop is a number (every side) or an insets object.
      const slop = typeof button.props.hitSlop === 'number'
        ? { top: button.props.hitSlop, bottom: button.props.hitSlop, left: button.props.hitSlop, right: button.props.hitSlop }
        : button.props.hitSlop;
      expect(flat.width + slop.left + slop.right).toBeGreaterThanOrEqual(48);
      expect(flat.height + slop.top + slop.bottom).toBeGreaterThanOrEqual(48);
    }
  });

  test('the servings sheet title is a heading', async () => {
    const { tree } = await mount();
    await act(async () => { byLabel(tree, 'Log Chilli').props.onPress(); });
    const headings = tree.root.findAll((n) => n.props?.accessibilityRole === 'header');
    expect(headings.map((n) => n.props.children)).toContain('Chilli');
  });
});
