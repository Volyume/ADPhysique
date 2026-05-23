/**
 * Force-mount every NEW or modified screen since baseline 7a9a994 to
 * surface any import-time crash or render throw before APK build time.
 */

jest.mock('react-native-url-polyfill/auto', () => ({}), { virtual: true });

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}), { virtual: true });

jest.mock('expo-file-system', () => ({
  documentDirectory: '/tmp/',
  cacheDirectory: '/tmp/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { UTF8: 'utf8' },
}), { virtual: true });

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  shareAsync: jest.fn(() => Promise.resolve()),
}), { virtual: true });

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ changes: 0, lastInsertRowId: 0 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
  })),
}), { virtual: true });

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((cb) => cb()),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() }),
  useRoute: () => ({ params: {} }),
  NavigationContainer: ({ children }) => children,
  createNavigationContainerRef: () => ({ navigate: jest.fn(), isReady: () => true }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...p }) => React.createElement('SafeAreaView', p, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return { Ionicons: (p) => React.createElement('Ionicons', p) };
});

jest.mock('zustand/react/shallow', () => ({
  useShallow: (selector) => selector,
}));

jest.mock('../store/useAppStore', () => {
  const state = {
    user: { id: 'test-user', email: 'test@example.com' },
    userProfile: null,
    session: null,
    tier: 'free',
    accessibility: { reduceMotion: false },
  };
  const useStore = (selector) => selector ? selector(state) : state;
  useStore.getState = () => state;
  useStore.setState = jest.fn();
  return { __esModule: true, default: useStore };
});

const React = require('react');
const TestRenderer = require('react-test-renderer');

describe('New screens since baseline 7a9a994 — mount stress', () => {
  test('FoodSearchScreen imports without throwing', () => {
    expect(() => require('../screens/FoodSearchScreen')).not.toThrow();
  });

  test('DiaryScreen imports without throwing', () => {
    expect(() => require('../screens/DiaryScreen')).not.toThrow();
  });

  test('BodyMetricsScreen imports without throwing', () => {
    expect(() => require('../screens/BodyMetricsScreen')).not.toThrow();
  });

  test('food/db imports without throwing', () => {
    expect(() => require('../lib/food/db')).not.toThrow();
  });

  test('sync imports without throwing', () => {
    expect(() => require('../lib/sync')).not.toThrow();
  });

  test('FoodSearchScreen renders without throwing', () => {
    const FoodSearchScreen = require('../screens/FoodSearchScreen').default;
    const fakeNav = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };
    const fakeRoute = { params: { mealSlot: 'snack', entryDate: '2026-05-23' } };
    let tree;
    expect(() => {
      tree = TestRenderer.create(
        React.createElement(FoodSearchScreen, { navigation: fakeNav, route: fakeRoute })
      );
    }).not.toThrow();
    tree?.unmount();
  });

  test('DiaryScreen renders without throwing', () => {
    const DiaryScreen = require('../screens/DiaryScreen').default;
    const fakeNav = { navigate: jest.fn(), goBack: jest.fn() };
    let tree;
    expect(() => {
      tree = TestRenderer.create(
        React.createElement(DiaryScreen, { navigation: fakeNav, route: { params: {} } })
      );
    }).not.toThrow();
    tree?.unmount();
  });

  test('RootNavigator imports without throwing (catches new-screen import chain)', () => {
    expect(() => require('../navigation/RootNavigator')).not.toThrow();
  });
});
