/**
 * MyRecipesScreen.rowMacros.test.js
 *
 * L05-MR1 (2026-07-09 design audit): recipe list rows previously showed no
 * calories/macros at all. listRecipesWithTotals(userId) now resolves a
 * whole-recipe macro total per row; the screen divides that total by
 * total_servings (perServingTotals, src/lib/food/macros.js) and labels the
 * figure "per serving" so it can't be mistaken for the whole-recipe number
 * sitting right above it. This pins that the row actually renders the
 * per-serving figure (not the raw whole-recipe total) with the label present,
 * using a fixture recipe with a known total and serving count.
 *
 * Mocking follows MyRecipesScreen.loadState.test.js (same heavy-mount
 * boundaries: BackHeader, Button, BottomSheet, Skeleton, FlashList, nav,
 * store, food/db, errorLog).
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
  return ({ visible, children }) => (visible ? React.createElement(View, null, children) : null);
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
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import MyRecipesScreen from '../MyRecipesScreen';
import { listRecipesWithTotals } from '../../lib/food/db';

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
  });
}

describe('MyRecipesScreen recipe row calories/macros (L05-MR1)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows the per-serving figure (whole-recipe total divided by servings), labelled "per serving"', async () => {
    // Fixture: a 4-serving recipe whose whole-recipe total is 800 kcal / 60g
    // protein -> per serving must read 200 kcal / 15g protein, not the raw 800/60.
    listRecipesWithTotals.mockResolvedValue([
      {
        id: 'r1',
        name: 'Chicken traybake',
        total_servings: 4,
        notes: null,
        totals: { kcal: 800, protein: 60, carbs: 80, fat: 20 },
      },
    ]);
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Chicken traybake');
    expect(text).toContain('4 servings');
    expect(text).toContain('per serving');
    expect(text).toContain('200');
    expect(text).toContain('kcal');
    expect(text).toContain('P 15g');
    // The raw whole-recipe numbers must not appear unlabelled elsewhere.
    expect(text).not.toContain('800 kcal');
    expect(text).not.toContain('P 60g');
  });

  test('a one-serving recipe shows the same number as its (single-serving) total', async () => {
    listRecipesWithTotals.mockResolvedValue([
      {
        id: 'r2',
        name: 'Solo omelette',
        total_servings: 1,
        notes: null,
        totals: { kcal: 350, protein: 28, carbs: 4, fat: 24 },
      },
    ]);
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('350');
    expect(text).toContain('per serving');
    expect(text).toContain('P 28g');
  });

  test('a recipe with no resolvable totals renders without a macro line (no crash)', async () => {
    listRecipesWithTotals.mockResolvedValue([
      { id: 'r3', name: 'Unresolved recipe', total_servings: 2, notes: null, totals: null },
    ]);
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Unresolved recipe');
    expect(text).not.toContain('per serving');
  });
});
