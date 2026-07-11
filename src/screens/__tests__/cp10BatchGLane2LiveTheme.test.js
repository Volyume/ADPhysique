/**
 * CP-10 batch G, lane 2 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md; docs/TASKBOARD.md "ACTIVE - CP-10
 * theming batch G"): pins the "restart-free -- flips live on the SAME
 * mounted instance, no remount" contract for the lane's 20 converted
 * screens, following the exact pattern of cp10Stage3SettingsLiveTheme.
 * test.js and cp10Stage3WorkoutShellsLiveTheme.test.js.
 *
 * Not exhaustive over all 20 screens (that would duplicate near-identical
 * assertions twenty times); this mounts a representative subset of the
 * simplest screens in their synchronous state -- WelcomeScreen,
 * PlanUpdateScreen, ImportScreen, GoalChangeSummaryScreen and
 * MesocycleBuilderScreen -- and asserts the SafeAreaView/container colour
 * tracks an accessibility.theme flip through the real store. Every other
 * screen in the lane repeats the identical
 * `const t = useTheme(); const live = useMemo(() => buildLiveStyles(t), [t]);`
 * + `style={[styles.KEY, live.KEY]}` mechanism pinned here, so this is the
 * generalising sample, same as the other cp10*LiveTheme test files.
 *
 * Mock surface: the subset of src/__tests__/screen-mount.test.js's
 * established mocks that these five screens' import graphs actually need
 * (SQLite via lib/database, document picker + file system via
 * lib/importExternal, Play prices via lib/payments/usePlayPrices, svg via
 * SvgBarSparkline, plus the usual expo/native shims).
 */
jest.mock('expo-sqlite');
jest.mock('expo-secure-store');
jest.mock('expo-crypto');
jest.mock('expo-application');
jest.mock('expo-constants');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    })),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
  })),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  withScope: jest.fn(cb => cb({ setTag: () => {}, setContext: () => {}, setUser: () => {} })),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  documentDirectory: '/tmp/',
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mk = (name) => (props) => React.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: mk('Svg'),
    Svg: mk('Svg'),
    Rect: mk('Rect'),
    Path: mk('Path'),
    Line: mk('Line'),
    Circle: mk('Circle'),
    G: mk('G'),
    Text: mk('SvgText'),
    Defs: mk('Defs'),
    LinearGradient: mk('LinearGradient'),
    Stop: mk('Stop'),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(),
    addListener: () => () => {}, setOptions: jest.fn(), dispatch: jest.fn(),
    getParent: () => ({ addListener: () => () => {} }),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  useScrollToTop: jest.fn(),
  NavigationContainer: ({ children }) => children,
  StackActions: { popToTop: jest.fn(), replace: jest.fn(), push: jest.fn() },
  CommonActions: { navigate: jest.fn(), reset: jest.fn() },
}));

jest.mock('../../components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
    ToastProvider: ({ children }) => children,
    default: props => React.createElement('Toast', props),
  };
});

// WelcomeScreen resolves the monthly Pro price from Google Play at render
// time; the price hook is billing infrastructure, not theming, so it is
// stubbed to "not loaded yet" (the screen's own no-price rendering path).
jest.mock('../../lib/payments/usePlayPrices', () => ({
  usePlayPrices: () => () => null,
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import useAppStore from '../../store/useAppStore';
import * as theme from '../../styles/theme';

function setTheme(themeName) {
  act(() => {
    useAppStore.setState({
      accessibility: {
        ...useAppStore.getState().accessibility,
        theme: themeName,
        higherContrast: false,
        colorBlindSafe: false,
        largerText: false,
      },
    });
  });
}

function makeNav() {
  const nav = {
    navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), push: jest.fn(),
    pop: jest.fn(), popToTop: jest.fn(), reset: jest.fn(), setOptions: jest.fn(),
    setParams: jest.fn(), dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}), removeListener: jest.fn(),
    canGoBack: jest.fn(() => true), isFocused: jest.fn(() => true),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
  };
  nav.getParent = jest.fn(() => nav);
  return nav;
}

async function mount(Screen, props = {}) {
  let tree;
  await act(async () => {
    tree = TestRenderer.create(
      React.createElement(Screen, {
        navigation: makeNav(),
        route: { params: {}, name: 'Test' },
        ...props,
      }),
    );
    // Flush microtasks + one macrotask so mount-time async effects settle.
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
  return tree;
}

// The screen's root SafeAreaView: the outermost node whose flattened style
// resolves a backgroundColor (styles.safe + live.safe). Matched on the
// style rather than the `edges` prop because some screens (WelcomeScreen)
// mount SafeAreaView without an explicit edges prop.
function findSafe(tree) {
  const nodes = tree.root.findAll(
    (n) => n.props.style
      && StyleSheet.flatten(n.props.style).backgroundColor !== undefined,
  );
  expect(nodes.length).toBeGreaterThan(0);
  return nodes[0];
}

function bg(node) {
  return StyleSheet.flatten(node.props.style).backgroundColor;
}

const DARK_BG = theme.resolveTheme({ theme: 'dark' }).colors.background;
const LIGHT_BG = theme.resolveTheme({ theme: 'light' }).colors.background;

const PRO_STATE = {
  user: { id: 'u-pro', email: 't@e.com', isLocal: false },
  session: { user: { id: 'u-pro' } },
  tier: 'pro',
  firstRunComplete: true,
  userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
};

async function expectSafeAreaFlips(Screen, props = {}) {
  setTheme('dark');
  useAppStore.setState(PRO_STATE);
  const tree = await mount(Screen, props);
  const darkBg = bg(findSafe(tree));
  expect(darkBg).toBe(DARK_BG);

  // Flip the SAME store with the tree still mounted -- restart-free.
  setTheme('light');
  const lightBg = bg(findSafe(tree));
  expect(lightBg).not.toBe(darkBg);
  expect(lightBg).toBe(LIGHT_BG);
  await act(async () => { tree.unmount(); });
}

describe('CP-10 batch G lane 2: screen chrome flips live, no remount', () => {
  test('WelcomeScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../WelcomeScreen').default;
    await expectSafeAreaFlips(Screen);
  });

  test('PlanUpdateScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../PlanUpdateScreen').default;
    await expectSafeAreaFlips(Screen);
  });

  test('ImportScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../ImportScreen').default;
    await expectSafeAreaFlips(Screen);
  });

  test('GoalChangeSummaryScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../GoalChangeSummaryScreen').default;
    await expectSafeAreaFlips(Screen, {
      route: {
        params: {
          previous: { goal: 'lean_gain', phase: 'maintenance', kcal: 2500 },
          next: { goal: 'mild_cut', phase: 'cut', kcal: 2200 },
        },
        name: 'GoalChangeSummary',
      },
    });
  });

  test('MesocycleBuilderScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../MesocycleBuilderScreen').default;
    await expectSafeAreaFlips(Screen);
  });
});
