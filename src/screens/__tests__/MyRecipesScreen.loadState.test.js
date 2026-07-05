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
  default: jest.fn((selector) => selector({ user: { id: 'u1' }, accessibility: { reduceMotion: true } })),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../lib/food/db', () => ({
  listRecipes: jest.fn(),
  deleteRecipe: jest.fn(),
  applyRecipeToDiary: jest.fn(),
}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import MyRecipesScreen from '../MyRecipesScreen';
import { listRecipes } from '../../lib/food/db';
import { logError } from '../../lib/errorLog';

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

describe('MyRecipesScreen load states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows a retryable error instead of the empty recipe prompt when recipes fail to load', async () => {
    listRecipes.mockRejectedValue(new Error('offline'));
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;

    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: {} }} />);
    });
    await flush();

    let text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load recipes");
    expect(text).toContain('Check your connection and try again.');
    expect(text).toContain('Try again');
    expect(text).not.toContain('Build your first recipe');
    expect(logError).toHaveBeenCalledWith('MyRecipesScreen.reload', expect.any(Error), { userId: 'u1' });

    const retry = tree.root.findByProps({ accessibilityLabel: 'Try again' });
    await act(async () => {
      retry.props.onPress();
    });
    await flush();

    expect(listRecipes).toHaveBeenCalledTimes(2);
    text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't load recipes");
  });

  test('keeps the genuine empty state when recipes load successfully but none exist', async () => {
    listRecipes.mockResolvedValue([]);
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;

    await act(async () => {
      tree = create(<MyRecipesScreen navigation={navigation} route={{ params: { mealSlot: 'lunch', entryDate: '2026-07-05' } }} />);
    });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Build your first recipe');
    expect(text).not.toContain("Couldn't load recipes");

    const build = tree.root.findByProps({ accessibilityLabel: 'Build a recipe' });
    await act(async () => {
      build.props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('RecipeBuilder', {
      mealSlot: 'lunch',
      entryDate: '2026-07-05',
    });
  });
});
