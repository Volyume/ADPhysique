/**
 * Mount the food screens via react-test-renderer and surface any
 * import-time or render-time throw.
 */
jest.mock('react-native-url-polyfill/auto', () => ({}), { virtual: true });
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
  useNavigation: () => ({ navigate: () => {}, goBack: () => {}, replace: () => {}, dispatch: () => {} }),
  NavigationContainer: ({ children }) => children,
  useScrollToTop: () => {},
  createNavigationContainerRef: () => ({ isReady: () => false, navigate: () => {} }),
  StackActions: { popToTop: () => ({}) },
}), { virtual: true });
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({ Navigator: ({ children }) => children, Screen: ({ children }) => children || null }),
}), { virtual: true });
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({ Navigator: ({ children }) => children, Screen: ({ children }) => children || null }),
}), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}), { virtual: true });
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ changes: 0 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    withTransactionAsync: jest.fn((cb) => cb()),
    closeAsync: jest.fn(() => Promise.resolve()),
  })),
}), { virtual: true });
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: () => null }), { virtual: true });
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}), { virtual: true });
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }), { virtual: true });

global.__DEV__ = false;

const React = require('react');
const TestRenderer = require('react-test-renderer');

const screens = [
  '../screens/FoodSearchScreen',
  '../screens/DiaryScreen',
  '../screens/AddCustomFoodScreen',
];

describe('food screens mount', () => {
  for (const path of screens) {
    test(path, () => {
      let Component;
      expect(() => { Component = require(path).default; }).not.toThrow();
      const navigation = { navigate: () => {}, goBack: () => {}, replace: () => {}, dispatch: () => {} };
      const route = { params: { mealSlot: 'breakfast', entryDate: '2026-05-23' } };
      let renderer;
      expect(() => {
        TestRenderer.act(() => {
          renderer = TestRenderer.create(React.createElement(Component, { navigation, route }));
        });
      }).not.toThrow();
      if (renderer) renderer.unmount();
    });
  }
});
