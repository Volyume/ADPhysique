/**
 * WhatsNewSheet contract (v3 sharpener). Pins the no-nag rules:
 *   - first install (no stored version): records silently, never shows;
 *   - same version again: never shows;
 *   - version changed WITH release notes: shows once, and marks seen
 *     BEFORE showing so a crash mid-show cannot loop into a nag;
 *   - version changed WITHOUT an entry: silent, but still marks seen.
 */
import { create, act } from 'react-test-renderer';

const mockStorage = { store: {} };
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k) => Promise.resolve(mockStorage.store[k] ?? null)),
    setItem: jest.fn((k, v) => { mockStorage.store[k] = v; return Promise.resolve(); }),
  },
}));

// Self-contained factory: imports hoist above consts, so a shared object
// captured here would still be undefined when the factory first runs.
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.2.0' }));

// Button drags in expo-haptics, which crashes at import in the node env;
// the sheet contract needs neither, so both primitives mock to plain hosts.
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn() }));
jest.mock('../Button', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: (props) => React.createElement(View, props) };
});
jest.mock('../BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, visible }) => (visible ? React.createElement(View, null, children) : null),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import WhatsNewSheet, { WHATS_NEW } from '../WhatsNewSheet';

const KEY = '@volyume_whats_new_last_seen';
const flush = () => act(async () => {});

beforeEach(() => {
  mockStorage.store = {};
  jest.clearAllMocks();
});

test('first install: records the version silently, shows nothing', async () => {
  const tree = create(<WhatsNewSheet />);
  await flush();
  expect(tree.toJSON()).toBeNull();
  expect(mockStorage.store[KEY]).toBe('1.2.0');
});

test('same version again: silent', async () => {
  mockStorage.store[KEY] = '1.2.0';
  const tree = create(<WhatsNewSheet />);
  await flush();
  expect(tree.toJSON()).toBeNull();
});

test('update with notes: shows once and marks seen before showing', async () => {
  expect(WHATS_NEW['1.2.0']?.length).toBeGreaterThan(0);
  mockStorage.store[KEY] = '1.1.0';
  const tree = create(<WhatsNewSheet />);
  await flush();
  expect(JSON.stringify(tree.toJSON())).toContain("What's new");
  // Seen was recorded even though the sheet is still open.
  expect(mockStorage.store[KEY]).toBe('1.2.0');
  const setCall = AsyncStorage.setItem.mock.calls.find(([k]) => k === KEY);
  expect(setCall[1]).toBe('1.2.0');
});

test('update without an entry: silent but marks seen', async () => {
  // Babel's namespace interop copies the mock once, so per-test version
  // mutation cannot work; empty the entry map instead to hit the branch.
  const saved = WHATS_NEW['1.2.0'];
  delete WHATS_NEW['1.2.0'];
  try {
    mockStorage.store[KEY] = '1.1.0';
    const tree = create(<WhatsNewSheet />);
    await flush();
    expect(tree.toJSON()).toBeNull();
    expect(mockStorage.store[KEY]).toBe('1.2.0');
  } finally {
    WHATS_NEW['1.2.0'] = saved;
  }
});
