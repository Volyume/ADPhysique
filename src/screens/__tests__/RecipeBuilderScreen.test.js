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
  recipeBasisG: jest.fn(() => Promise.resolve(0)),
  rescaleRecipeRecents: jest.fn(() => Promise.resolve(0)),
  computeRecipeMacros: jest.fn(() => ({
    total: { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
    perServing: { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
  })),
}));
jest.mock('../../lib/food/sources/localCache', () => ({ resolveFoodRef: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../lib/food/recipeImport', () => ({ importRecipeFromUrl: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../lib/food/waterfall', () => ({ searchFoods: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import useAppStore from '../../store/useAppStore';
import { createRecipe, getRecipeWithIngredients, setRecipeIngredients } from '../../lib/food/db';
import RecipeBuilderScreen from '../RecipeBuilderScreen';

const RECIPE_BUILDER_SOURCE = require('fs').readFileSync(
  require('path').resolve(__dirname, '../RecipeBuilderScreen.js'),
  'utf8',
);

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
      'Add one ingredient before saving.',
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

describe('RecipeBuilderScreen edit load recovery', () => {
  test('shows a retry state instead of a blank form when an existing recipe fails to load', async () => {
    getRecipeWithIngredients.mockRejectedValueOnce(new Error('read failed'));
    const nav = makeNav();
    let tree;
    await act(async () => {
      tree = create(<RecipeBuilderScreen navigation={nav} route={{ params: { recipeId: 'recipe-404' } }} />);
    });
    await flush();

    // RE-POINTED (D230 R15, food level-up 2026-10-16): the load-error title is
    // a full sentence ("This recipe did not load"); same truth, a retry state
    // stands in place of the blank form.
    const retryText = tree.root.findAll((n) => n.props?.children === 'This recipe did not load');
    expect(retryText.length).toBeGreaterThan(0);
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Name')).toHaveLength(0);
    expect(createRecipe).not.toHaveBeenCalled();
  });
});

describe('RecipeBuilderScreen polish guards', () => {
  test('add ingredient renders as a contained neutral control', () => {
    // Batch 2 wave B (B-2 Button adoption): the hand-rolled TouchableOpacity +
    // raw <Ionicons>/<Text> pair now renders as <Button icon="add" variant="secondary">,
    // so the icon/label are props on Button, not raw JSX children.
    expect(RECIPE_BUILDER_SOURCE).toContain('icon="add"');
    expect(RECIPE_BUILDER_SOURCE).toContain('title="Add ingredient"');
    expect(RECIPE_BUILDER_SOURCE).toMatch(/addIngredientBtn: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(RECIPE_BUILDER_SOURCE).toContain('addLink: { ...type.label, color: colors.textPrimary }');
    expect(RECIPE_BUILDER_SOURCE).not.toContain('title="+ Add ingredient"');
  });
});

// D230 R15, R16 and R18 (food level-up 2026-10-16): full-sentence failures
// with the cause logged first, no "we" in the import hint, and a remove icon
// that is a 48 dp target.
describe('RecipeBuilderScreen sentences, logged causes and the 48 dp remove icon (D230)', () => {
  const { logError } = require('../../lib/errorLog');
  const { importRecipeFromUrl } = require('../../lib/food/recipeImport');
  const INGREDIENT = {
    food_ref: 'global:f1', name: 'Chicken breast', quantity_g: 200,
    food: { name: 'Chicken breast', food_ref: 'global:f1' },
  };

  async function mountWith(params) {
    const nav = makeNav();
    let tree;
    await act(async () => {
      tree = create(<RecipeBuilderScreen navigation={nav} route={{ params: { mealSlot: 'dinner', entryDate: '2026-10-16', ...params } }} />);
    });
    await flush();
    return { nav, tree };
  }

  test('a failed save says what happened and what to do, and logs the cause first', async () => {
    createRecipe.mockRejectedValueOnce(new Error('disk full'));
    const { nav, tree } = await mountWith({ addedIngredient: INGREDIENT });
    setInput(tree, 'Name', 'Sunday chilli');
    await act(async () => { await pressSave(tree)(); });
    await flush();

    expect(logError).toHaveBeenCalledWith('RecipeBuilder.save', expect.any(Error), { isEdit: false, ingredients: 1 });
    expect(mockToastShow).toHaveBeenCalledWith('That recipe was not saved. Try again in a moment.', { variant: 'error' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('a link that gives no recipe, and a link that throws, say the same calm sentence', async () => {
    const SENTENCE = 'A recipe could not be read from that link. Check the link and try again.';
    const { tree } = await mountWith({});

    importRecipeFromUrl.mockResolvedValueOnce(null);
    setInput(tree, 'Recipe web address', 'https://example.com/a');
    await act(async () => { await tree.root.findAll((n) => n.props?.accessibilityLabel === 'Import from web' && typeof n.props.onPress === 'function')[0].props.onPress(); });
    await flush();
    expect(mockToastShow).toHaveBeenCalledWith(SENTENCE, { variant: 'warning' });
    expect(logError).not.toHaveBeenCalledWith('RecipeBuilder.importFromUrl', expect.anything(), expect.anything());

    mockToastShow.mockClear();
    importRecipeFromUrl.mockRejectedValueOnce(new Error('network'));
    setInput(tree, 'Recipe web address', 'https://example.com/b');
    await act(async () => { await tree.root.findAll((n) => n.props?.accessibilityLabel === 'Import from web' && typeof n.props.onPress === 'function')[0].props.onPress(); });
    await flush();
    expect(logError).toHaveBeenCalledWith('RecipeBuilder.importFromUrl', expect.any(Error));
    expect(mockToastShow).toHaveBeenCalledWith(SENTENCE, { variant: 'warning' });
  });

  // D230 R17 (lane 3D): the import answers every line from the device first
  // and spends live lookups only on the misses, at most four at once.
  test('the URL import is local-first, then live only for the misses, four at a time', async () => {
    const { searchFoods } = require('../../lib/food/waterfall');
    searchFoods.mockReset();
    const lines = Array.from({ length: 10 }, (_, i) => `ingredient ${i}`);
    importRecipeFromUrl.mockResolvedValueOnce({ name: 'Big stew', servings: 4, ingredients: lines });
    const known = new Set(['ingredient 0', 'ingredient 1', 'ingredient 2', 'ingredient 3', 'ingredient 4', 'ingredient 5']); // 6 on the device, 4 misses
    let inFlight = 0; let peak = 0;
    searchFoods.mockImplementation(async (_uid, line, opts = {}) => {
      if (opts.localOnly) return known.has(line) ? [{ food_ref: `global:${line}`, name: line }] : [];
      inFlight += 1; peak = Math.max(peak, inFlight);
      await new Promise((r) => setImmediate(r));
      inFlight -= 1;
      return [{ food_ref: `live:${line}`, name: line }];
    });
    const { tree } = await mountWith({});
    setInput(tree, 'Recipe web address', 'https://example.com/stew');
    await act(async () => { await tree.root.findAll((n) => n.props?.accessibilityLabel === 'Import from web' && typeof n.props.onPress === 'function')[0].props.onPress(); });
    await flush();

    const localCalls = searchFoods.mock.calls.filter(([, , o]) => o?.localOnly);
    const liveCalls = searchFoods.mock.calls.filter(([, , o]) => !o?.localOnly);
    expect(localCalls).toHaveLength(10); // every line is tried locally first
    expect(liveCalls.map(([, l]) => l).sort()).toEqual(['ingredient 6', 'ingredient 7', 'ingredient 8', 'ingredient 9']); // live only for the misses
    expect(peak).toBeLessThanOrEqual(4);
    expect(mockToastShow).toHaveBeenCalledWith(expect.stringContaining('Imported 10 of 10 ingredients.'), { variant: 'success' });
  });

  test('the import hint no longer says "we"', async () => {
    const { tree } = await mountWith({});
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Each ingredient is matched to a food with a rough amount. Check the amounts after importing.');
    expect(text).not.toContain('We match');
  });

  test('the remove icon is a 48 dp target: a 24 dp glyph plus the house 12 dp hit slop', async () => {
    const { tree } = await mountWith({ addedIngredient: INGREDIENT });
    const remove = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Remove Chicken breast' && typeof n.props.onPress === 'function')[0];
    expect(remove).toBeTruthy();
    const glyph = remove.findAll((n) => n.type === 'Ionicons')[0];
    const slop = remove.props.hitSlop;
    expect(glyph.props.size + slop.top + slop.bottom).toBeGreaterThanOrEqual(48);
    expect(glyph.props.size + slop.left + slop.right).toBeGreaterThanOrEqual(48);
  });
});

// Food review D8: the remembered portion of a recipe is rescaled on the basis
// read BEFORE the save and the basis AFTER both the recipe and its
// ingredients are saved. updateRecipe used to rescale on its own, before the
// new ingredients were written, so an edit that changed both used the wrong
// basis. The rescale is best effort: a failure is logged and the save stands.
describe('RecipeBuilderScreen edit: remembered portion rescale order (food review D8)', () => {
  const db = require('../../lib/food/db');
  const { logError } = require('../../lib/errorLog');
  const LOADED = {
    id: 'recipe-7', name: 'Dal', total_servings: 4, cooked_weight_g: null, notes: null,
    ingredients: [{ id: 'ing-1', food_ref: 'global:f1', quantity_g: 800 }],
  };

  async function editAndSave() {
    getRecipeWithIngredients.mockResolvedValueOnce(LOADED);
    const nav = makeNav();
    let tree;
    await act(async () => {
      tree = create(<RecipeBuilderScreen navigation={nav} route={{ params: { recipeId: 'recipe-7' } }} />);
    });
    await flush();
    await act(async () => { await pressSave(tree)(); });
    await flush();
    return nav;
  }

  test('reads the old basis first, rescales after updateRecipe and setRecipeIngredients', async () => {
    const order = [];
    db.recipeBasisG.mockImplementationOnce(async () => { order.push('basis'); return 800; });
    db.updateRecipe.mockImplementationOnce(async () => { order.push('updateRecipe'); });
    db.setRecipeIngredients.mockImplementationOnce(async () => { order.push('setRecipeIngredients'); });
    db.rescaleRecipeRecents.mockImplementationOnce(async () => { order.push('rescale'); return 1; });
    const nav = await editAndSave();
    expect(order).toEqual(['basis', 'updateRecipe', 'setRecipeIngredients', 'rescale']);
    expect(db.recipeBasisG).toHaveBeenCalledWith('u1', 'recipe-7');
    expect(db.rescaleRecipeRecents).toHaveBeenCalledWith('u1', 'recipe-7', 800);
    expect(nav.goBack).toHaveBeenCalled();
  });

  test('a failed rescale is logged and never blocks the save', async () => {
    db.recipeBasisG.mockResolvedValueOnce(800);
    db.rescaleRecipeRecents.mockRejectedValueOnce(new Error('locked'));
    const nav = await editAndSave();
    expect(logError).toHaveBeenCalledWith('RecipeBuilder.rescaleRecents', expect.any(Error));
    expect(mockToastShow).not.toHaveBeenCalledWith('That recipe was not saved. Try again in a moment.', { variant: 'error' });
    expect(nav.goBack).toHaveBeenCalled();
  });

  test('a failed basis read skips the rescale and still saves', async () => {
    db.recipeBasisG.mockRejectedValueOnce(new Error('read failed'));
    const nav = await editAndSave();
    expect(logError).toHaveBeenCalledWith('RecipeBuilder.readBasis', expect.any(Error));
    expect(db.updateRecipe).toHaveBeenCalledTimes(1);
    expect(db.rescaleRecipeRecents).not.toHaveBeenCalled();
    expect(nav.goBack).toHaveBeenCalled();
  });

  test('a new recipe has no remembered portion: no basis read, no rescale', async () => {
    await renderAndSave({
      ingredient: { food_ref: 'global:f1', name: 'Chicken breast', quantity_g: 200, food: { name: 'Chicken breast', food_ref: 'global:f1' } },
    });
    expect(db.recipeBasisG).not.toHaveBeenCalled();
    expect(db.rescaleRecipeRecents).not.toHaveBeenCalled();
  });
});
