/**
 * CP-10 batch G, lane 1 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md; docs/TASKBOARD.md "ACTIVE - CP-10
 * theming batch G"): pins the "restart-free -- flips live on the SAME
 * mounted instance, no remount" contract for the lane's 16 converted
 * screens, following the exact pattern of cp10BatchGLane2LiveTheme.test.js.
 *
 * Not exhaustive over all 16 screens (mounting every billing/ED-safety
 * surface with its full native-module and IAP mock surface would dwarf this
 * file for no extra signal); this mounts five representative screens in
 * their synchronous state -- CascadeGateScreen, SubscriptionScreen,
 * NutritionEducationScreen, CoachHeldHistoryScreen and
 * CoachingRemindersScreen -- and asserts the root chrome's flattened
 * backgroundColor tracks an accessibility.theme flip through the REAL
 * store, with the tree never unmounted between reads (the restart-free
 * contract). The remaining 11 screens (FreeStarterScreen, PaywallScreen,
 * ProGoalSetupScreen, ProOnboardingScreen, ProSetupCompleteScreen,
 * ProUpgradeScreen, Article9ConsentScreen, NotificationSettingsScreen,
 * SettingsDietaryScreen, BodyMetricsScreen, ProgressPhotosScreen) are
 * source-guarded: every converted screen must import useTheme, call it,
 * and define a matching buildLiveStyles(t) (or, for SettingsDietaryScreen,
 * be confirmed as a no-op wrapper around the already-live SettingsPage).
 *
 * Mock surface: the same subset of src/__tests__/screen-mount.test.js's
 * established mocks the five mounted screens' import graphs need, plus the
 * billing modules (lib/payments/cascade, catalogue, restore) left REAL --
 * they are pure/idempotent read helpers here (stageOf/daysRemaining/skuFor
 * are synchronous, no network at mount) -- so this test never re-implements
 * or forks billing behaviour, only stubs the native IAP bridge
 * (playBilling) and the store price hook.
 */
jest.mock('expo-sqlite');
jest.mock('expo-secure-store');
jest.mock('expo-crypto');
jest.mock('expo-application');
jest.mock('expo-constants');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

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
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
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

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  withScope: jest.fn(cb => cb({ setTag: () => {}, setContext: () => {}, setUser: () => {} })),
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
  useFocusEffect: (cb) => { require('react').useEffect(() => cb(), []); },
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

// EngineLog (CoachHeldHistoryScreen's child) hits lib/database for its own
// adaptation-event read; its data shape is irrelevant to this batch's
// colour-only contract, so it is stubbed to a bare node, matching the
// existing CoachHeldHistoryScreen.failClosed.test.js precedent.
jest.mock('../../components/EngineLog', () => () => null);

// CascadeGateScreen / SubscriptionScreen: usePlayPrices resolves the store
// price hook; PLAY-002 (no hardcoded fallback) means null is the correct
// "not loaded yet" stub, same as cp10BatchGLane2LiveTheme.test.js's
// WelcomeScreen mock.
jest.mock('../../lib/payments/usePlayPrices', () => ({
  usePlayPrices: () => () => null,
}));

// The native IAP bridge itself (never invoked by a mount, only by a button
// press this test never fires) is stubbed so importing it can't reach the
// real react-native-iap native module in the test env.
jest.mock('../../lib/payments/playBilling', () => ({
  purchasePackage: jest.fn(async () => ({ transactionId: 'txn_test' })),
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import fs from 'fs';
import path from 'path';
import useAppStore from '../../store/useAppStore';
import * as theme from '../../styles/theme';

const readScreen = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

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

// The screen's root chrome: the outermost node whose flattened style
// resolves a backgroundColor (styles.safe + live.safe, in every one of
// these five screens). Matched on the style rather than a specific tag so
// the same helper works for every screen in the sample.
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
  billingPeriod: 'monthly',
  firstRunComplete: true,
  userProfile: {
    firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric',
    trialState: 'complete_trial_active',
  },
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

describe('CP-10 batch G lane 1: screen chrome flips live, no remount', () => {
  test('CascadeGateScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../CascadeGateScreen').default;
    await expectSafeAreaFlips(Screen, {
      route: { params: { variant: 'day14' }, name: 'CascadeGate' },
    });
  });

  test('SubscriptionScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../SubscriptionScreen').default;
    await expectSafeAreaFlips(Screen);
  });

  test('NutritionEducationScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../NutritionEducationScreen').default;
    await expectSafeAreaFlips(Screen);
  });

  test('CoachHeldHistoryScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../CoachHeldHistoryScreen').default;
    await expectSafeAreaFlips(Screen);
  });

  test('CoachingRemindersScreen: safe-area background flips dark -> light on the same instance', async () => {
    const Screen = require('../CoachingRemindersScreen').default;
    await expectSafeAreaFlips(Screen);
  });
});

// Source-guard convention (matching cp10BatchGLane2LiveTheme.test.js's own
// generalising-sample rationale): the remaining 11 lane-1 screens are not
// mounted here (billing/IAP + native-module mock surface for
// ProOnboardingScreen/ProgressPhotosScreen/BodyMetricsScreen would dwarf
// this file for no extra signal over the five above, which already pin the
// mechanism). Each must still carry the live-theme wiring: the useTheme
// import, at least one useTheme() call, and a matching buildLiveStyles(t)
// definition.
describe('CP-10 batch G lane 1: remaining screens carry the live-theme wiring', () => {
  test.each([
    'FreeStarterScreen.js',
    'PaywallScreen.js',
    'ProGoalSetupScreen.js',
    'ProOnboardingScreen.js',
    'ProSetupCompleteScreen.js',
    'ProUpgradeScreen.js',
    'Article9ConsentScreen.js',
    'NotificationSettingsScreen.js',
    'BodyMetricsScreen.js',
    'ProgressPhotosScreen.js',
  ])('%s imports useTheme, calls it, and defines buildLiveStyles(t)', (file) => {
    const source = readScreen(file);
    expect(source).toMatch(/import useTheme from '\.\.\/hooks\/useTheme';/);
    expect(source).toMatch(/const t = useTheme\(\);/);
    expect(source).toMatch(/function buildLiveStyles\(t\)/);
  });

  test('SettingsDietaryScreen.js stays a no-op wrapper around the already-live SettingsPage', () => {
    // CP-10 batch G lane 1: this screen carries no styles of its own -- it
    // delegates entirely to SettingsPage (already live-themed in an earlier
    // stage) and DietaryPreferencesEditor (out of this batch's scope), so
    // there is nothing here to unfreeze.
    const source = readScreen('SettingsDietaryScreen.js');
    expect(source).toMatch(/import \{ SettingsPage \} from '\.\.\/components\/SettingsPrimitives';/);
    expect(source).toMatch(/<SettingsPage title="Dietary needs">/);
    expect(source).not.toMatch(/StyleSheet\.create/);
  });
});
