/**
 * RecipeBuilderScreen.test.js
 *
 * FOOD-002: a recipe with no ingredients (or only zero-quantity ones) used to
 * save as an empty shell. setRecipeIngredients silently drops rows with no
 * food_ref or a non-positive quantity, so the saved recipe later fails to
 * resolve or log (resolveFoodRef returns null when the ingredient grams sum to
 * <= 0). This suite pins that the builder BLOCKS the save with a clear toast and
 * keeps the user on the builder unless there is at least one ingredient and
 * every ingredient has a resolvable food_ref and a positive gram amount; a valid
 * one-ingredient recipe saves.
 *
 * Same mount + mock pattern as FoodSearchScreen.test.js: the DB layer, store,
 * navigation and Toast are mocked; ingredients are injected the way the app does
 * it, via the route param FoodSearchScreen hands back on pick.
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
jest.mock('../../components/Skeleton', () => ({ SkeletonRow: () => null }));
jest.mock('../../lib/haptics', () => ({
  selection: jest.fn(),
  commit: jest.fn(),
}));

jest.mock('../../lib/food/db', () => ({
  createRecipe: jest.fn(() => Promise.resolve('recipe-1')),
  updateRecipe: jest.fn(() => Promise.resolve()),
  getRecipeWithIngredients: jest.fn(() => Promise.resolve(null)),
  setRecipeIngredients: jest.fn(() => Promise.resolve()),
  computeRecipeMacros: jest.fn(() => ({
    total: { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
    perServing: { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
  })),
}));
jest.mock('../../lib/food/sources/localCache', () => ({ resolveFoodRef: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../lib/food/recipeImport', () => ({ importRecipeFromUrl: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../lib/food/waterfall', () => ({ searchFoods: jest.fn(() => Promise.resolve([])) }));

import useAppStore from '../../store/useAppStore';
import { createRecipe, setRecipeIngredients } from '../../lib/food/db';
import RecipeBuilderScreen from '../RecipeBuilderScreen';

const store = { user: { id: 'u1' }, accessibility: { energyUnit: 'kcal' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => selector(store));
});

function setInput(tree, label, value) {
  const nodes = tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label);
  expect(nodes.length).toBeGreaterThan(0);
  act(() => { nodes[0].props.onChangeText(value); });
}

function pressSave(tree) {
  const nodes = tree.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Save recipe');
  expect(nodes.length).toBeGreaterThan(0);
  return nodes[0].props.onPress;
}

// Mounts the builder with an optional pre-picked ingredient (injected the way
// FoodSearchScreen hands one back), gives it a name, presses Save.
async function renderAndSave({ ingredient } = {}) {
  const nav = makeNav();
  const params = { mealSlot: 'dinner', entryDate: '2026-07-04' };
  if (ingredient) params.addedIngredient = ingredient;
  const route = { params };
  let tree;
  await act(async () => { tree = create(<RecipeBuilderScreen navigation={nav} route={route} />); });
  await flush(); // the load effect + the addedIngredient effect settle
  setInput(tree, 'Name', 'Sunday chilli');
  await act(async () => { await pressSave(tree)(); });
  await flush();
  return nav;
}

describe('RecipeBuilderScreen save guard (FOOD-002)', () => {
  test('blocks an empty recipe: no create/ingredient write, calm toast, stays put', async () => {
    const nav = await renderAndSave();
    expect(createRecipe).not.toHaveBeenCalled();
    expect(setRecipeIngredients).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Add at least one ingredient before saving.',
      { variant: 'warning' },
    );
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('blocks a recipe whose only ingredient has a zero quantity', async () => {
    const nav = await renderAndSave({
      ingredient: { food_ref: 'global:f1', name: 'Chicken breast', quantity_g: 0, food: { name: 'Chicken breast', food_ref: 'global:f1' } },
    });
    expect(createRecipe).not.toHaveBeenCalled();
    expect(setRecipeIngredients).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Give each ingredient an amount in grams before saving.',
      { variant: 'warning' },
    );
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('saves a valid one-ingredient recipe', async () => {
    const nav = await renderAndSave({
      ingredient: { food_ref: 'global:f1', name: 'Chicken breast', quantity_g: 200, food: { name: 'Chicken breast', food_ref: 'global:f1' } },
    });
    expect(createRecipe).toHaveBeenCalledTimes(1);
    expect(setRecipeIngredients).toHaveBeenCalledTimes(1);
    const [, , rows] = setRecipeIngredients.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({ food_ref: 'global:f1', quantity_g: 200 }));
    expect(nav.goBack).toHaveBeenCalled();
  });
});
