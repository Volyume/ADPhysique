/**
 * MyRecipesScreen.inspectSheet.test.js
 *
 * Campaign 24 Wave B (docs/whole-app-coherence-campaign-24-2026-08-17/
 * WAVE-B-FINDINGS.md, MyRecipesScreen.js IA_DEFECT finding): MyRecipesScreen
 * had no read-only "view contents" affordance, unlike its sibling
 * MyMealsScreen (info-circle -> SavedMealDetailSheet, L05-MM1/D6). This pins
 * the new RecipeDetailSheet entry point's READ-ONLY CONTRACT — the thing the
 * findings file called out as worth a dedicated pin:
 *   1. The info button opens the sheet, and only the sheet — never the
 *      servings-picker log flow, Edit, or Delete.
 *   2. Opening it performs a read (getRecipeWithIngredients + resolveFoodRef)
 *      and NEVER calls a write path (deleteRecipe, applyRecipeToDiary).
 *   3. It renders the ingredient list plus BOTH per-serving and whole-recipe
 *      totals (the contract the findings file specifies).
 *   4. Closing it is a pure UI action with no write.
 *
 * Mocking follows MyRecipesScreen.loadState.test.js / .rowMacros.test.js
 * (same heavy-mount boundaries: BackHeader, Button, BottomSheet, Skeleton,
 * FlashList, nav, store, food/db, errorLog), extended with
 * getRecipeWithIngredients and lib/food/sources/localCache's resolveFoodRef,
 * the two reads RecipeDetailSheet's data needs that MyMealsScreen's sibling
 * sheet does not (a saved meal's row already carries its item list; a
 * recipe's row only carries the whole-recipe total).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/BackHeader', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return ({ title, right }) => React.createElement(View, null, React.createElement(Text, null, title), right);
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
  return ({ visible, children, accessibilityLabel }) => (
    visible ? React.createElement(View, { accessibilityLabel }, children) : null
  );
});
jest.mock('../../components/Skeleton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { SkeletonRow: () => React.createElement(Text, null, 'loading row') };
});
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
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
}));
jest.mock('../../lib/food/sources/localCache', () => ({
  resolveFoodRef: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import MyRecipesScreen from '../MyRecipesScreen';
import {
  listRecipesWithTotals, deleteRecipe, applyRecipeToDiary, getRecipeWithIngredients,
} from '../../lib/food/db';
import { resolveFoodRef } from '../../lib/food/sources/localCache';

const RECIPE = {
  id: 'r1',
  name: 'Chicken traybake',
  total_servings: 4,
  notes: null,
  totals: { kcal: 800, protein: 60, carbs: 80, fat: 20 },
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  listRecipesWithTotals.mockResolvedValue([RECIPE]);
  getRecipeWithIngredients.mockResolvedValue({
    id: 'r1',
    name: 'Chicken traybake',
    total_servings: 4,
    ingredients: [
      { id: 'i1', food_ref: 'food:chicken', quantity_g: 400, order_index: 0 },
      { id: 'i2', food_ref: 'food:rice', quantity_g: 300, order_index: 1 },
    ],
  });
  resolveFoodRef.mockImplementation(async (userId, ref) => {
    if (ref === 'food:chicken') return { name: 'Chicken breast', kcal_100g: 165 };
    if (ref === 'food:rice') return { name: 'White rice', kcal_100g: 130 };
    return null;
  });
});

describe('MyRecipesScreen — recipe inspect sheet (Campaign 24 Wave B)', () => {
  test('the info button opens the read-only inspect sheet, not the servings-log flow', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    const viewButton = tree.root.findByProps({ accessibilityLabel: 'View Chicken traybake' });
    expect(viewButton).toBeTruthy();

    await act(async () => { viewButton.props.onPress(); });
    await flush();

    // Never triggered the log flow's servings sheet or a write.
    expect(applyRecipeToDiary).not.toHaveBeenCalled();
    expect(deleteRecipe).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();

    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('How many servings did you eat?');
  });

  test('opening the sheet reads the ingredient list (getRecipeWithIngredients + resolveFoodRef) and calls no write path', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    const viewButton = tree.root.findByProps({ accessibilityLabel: 'View Chicken traybake' });
    await act(async () => { viewButton.props.onPress(); });
    await flush();

    expect(getRecipeWithIngredients).toHaveBeenCalledWith('u1', 'r1');
    expect(resolveFoodRef).toHaveBeenCalledWith('u1', 'food:chicken');
    expect(resolveFoodRef).toHaveBeenCalledWith('u1', 'food:rice');
    expect(deleteRecipe).not.toHaveBeenCalled();
    expect(applyRecipeToDiary).not.toHaveBeenCalled();
  });

  test('renders the ingredient list plus both per-serving and whole-recipe totals', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    const viewButton = tree.root.findByProps({ accessibilityLabel: 'View Chicken traybake' });
    await act(async () => { viewButton.props.onPress(); });
    await flush();

    const text = flattenText(tree.toJSON());
    // Ingredient rows, resolved names.
    expect(text).toContain('Chicken breast');
    expect(text).toContain('White rice');
    expect(text).toContain('400g');
    expect(text).toContain('300g');
    // Per-serving total (whole 800/4 = 200) and whole-recipe total (800),
    // both labelled so neither can be mistaken for the other.
    expect(text).toContain('Per serving');
    expect(text).toContain('200');
    expect(text).toContain('Whole recipe (4 servings)');
    expect(text).toContain('800');
  });

  test('closing the sheet is a pure UI action: no write path fires', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    const viewButton = tree.root.findByProps({ accessibilityLabel: 'View Chicken traybake' });
    await act(async () => { viewButton.props.onPress(); });
    await flush();

    const closeButton = tree.root.findByProps({ accessibilityLabel: 'Close' });
    await act(async () => { closeButton.props.onPress(); });
    await flush();

    expect(deleteRecipe).not.toHaveBeenCalled();
    expect(applyRecipeToDiary).not.toHaveBeenCalled();
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Chicken breast');
  });
});
