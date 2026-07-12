/**
 * AX-08 (launch accessibility audit, d1cd0033-launchaccessibility.md ~line
 * 110): "Errors and status updates are frequently silent to screen
 * readers." ImportScreen inserted its dynamic parse/read error as plain
 * Text with no alert/live-region role and no focus move
 * (src/screens/ImportScreen.js:189 pre-fix) -- a screen-reader user who
 * tapped Pick CSV and hit an error was left on the button with no idea why
 * nothing happened.
 *
 * Fix: the error Text now carries accessibilityRole="alert" +
 * accessibilityLiveRegion="assertive" (mirroring src/components/Toast.js's
 * alert + live-region pattern) plus a best-effort screen-reader focus move
 * onto the error node (same guarded findNodeHandle + setAccessibilityFocus
 * pattern as InfoTooltip's AX-01 fix).
 *
 * This suite mounts the real screen and drives the file-read-failure path
 * (the outer catch in handlePickFile) to assert the rendered error node
 * carries the alert/live-region props, then source-guards the focus-move
 * wiring (findNodeHandle returns null off a native host, so the runtime
 * focus call itself is device-verified -- see the manual checklist).
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

const mockGetDocumentAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args) => mockGetDocumentAsync(...args),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: (...args) => mockReadAsStringAsync(...args),
  documentDirectory: '/tmp/',
  EncodingType: { UTF8: 'utf8' },
}));

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
}));

jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
}));

const mockAccessibilityInfo = {
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  setAccessibilityFocus: jest.fn(),
};

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import useAppStore from '../../store/useAppStore';
import ImportScreen from '../ImportScreen';

const ReactNative = require('react-native');
ReactNative.AccessibilityInfo = mockAccessibilityInfo;

function makeNav() {
  return {
    navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), push: jest.fn(),
    pop: jest.fn(), popToTop: jest.fn(), reset: jest.fn(), setOptions: jest.fn(),
    setParams: jest.fn(), dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}), removeListener: jest.fn(),
    canGoBack: jest.fn(() => true), isFocused: jest.fn(() => true),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
  };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAppStore.setState({ user: { id: 'u-1', email: 't@e.com', isLocal: false } });
});

describe('ImportScreen dynamic error is announced to screen readers (AX-08)', () => {
  test('a file-read failure renders the error with alert role + assertive live region', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///bad.csv' }],
    });
    mockReadAsStringAsync.mockRejectedValue(new Error('native read failure'));

    let tree;
    await act(async () => {
      tree = TestRenderer.create(
        React.createElement(ImportScreen, { navigation: makeNav(), route: { params: {}, name: 'Import' } }),
      );
    });
    await flush();

    const pickButton = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Pick CSV file' || n.props.title === 'Pick CSV file',
    )[0];
    expect(pickButton).toBeTruthy();

    await act(async () => { pickButton.props.onPress(); });
    await flush();

    const alertNode = tree.root.findAll(
      (n) => n.props.accessibilityRole === 'alert' && n.props.accessibilityLiveRegion === 'assertive',
    );
    expect(alertNode.length).toBeGreaterThan(0);
    expect(JSON.stringify(tree.toJSON())).toContain('Could not read that file. Try again.');

    await act(async () => { tree.unmount(); });
  });
});

describe('ImportScreen screen-reader focus-move wiring (source guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'ImportScreen.js'), 'utf8');

  test('a best-effort findNodeHandle + setAccessibilityFocus move targets the error node, guarded like InfoTooltip\'s AX-01 fix', () => {
    expect(src).toMatch(/import \{\s*\n?\s*View, Text, StyleSheet, ScrollView, ActivityIndicator, AccessibilityInfo, findNodeHandle,/);
    expect(src).toContain('const errorRef = useRef(null);');
    expect(src).toMatch(/const node = findNodeHandle\(errorRef\.current\);\s*\n\s*if \(node != null\) AccessibilityInfo\.setAccessibilityFocus\(node\);/);
    expect(src).toContain('ref={errorRef}');
  });
});
