import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/EngineLog', () => () => null);
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: () => null }));
jest.mock('../../components/EmptyState', () => ({ title, text, actionLabel, onAction }) => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return React.createElement(
    View,
    null,
    React.createElement(Text, null, `${title}. ${text}`),
    actionLabel ? React.createElement(TouchableOpacity, { accessibilityLabel: actionLabel, onPress: onAction }, React.createElement(Text, null, actionLabel)) : null,
  );
});
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('unspecified')),
}));
jest.mock('../../lib/database', () => ({
  getCoachOutputHistory: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import { getCoachOutputHistory, getOpenEdPatternFlag } from '../../lib/database';
import { logError } from '../../lib/errorLog';
import CoachHeldHistoryScreen from '../CoachHeldHistoryScreen';

let store;

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

beforeEach(() => {
  jest.clearAllMocks();
  store = { user: { id: 'u1' } };
  useAppStore.mockImplementation((selector) => selector(store));
  getCoachOutputHistory.mockResolvedValue([]);
  getOpenEdPatternFlag.mockResolvedValue(false);
});

describe('CoachHeldHistoryScreen fail-closed loading', () => {
  test('does not call coach history APIs when no user is present', async () => {
    store.user = null;
    let tree;
    await act(async () => { tree = create(<CoachHeldHistoryScreen />); });
    await flush();

    expect(getCoachOutputHistory).not.toHaveBeenCalled();
    expect(getOpenEdPatternFlag).not.toHaveBeenCalled();
    expect(flattenText(tree.toJSON())).toContain('No entries yet');
  });

  // Same-meaning re-anchor (C5-P35-06, D96). The empty state used to offer a
  // "Start check-in" CTA that, on day 0, ALWAYS landed on the check-in's own
  // "needs more data" gate (the first check-in requires five days of data),
  // contradicting the sentence directly above it for the whole period the
  // empty state is visible. The property worth pinning is that the empty
  // state is not a dead end: it states what unlocks the screen. It now does
  // that in copy instead of routing to a gate.
  test('empty history states what unlocks it and never routes to a gate that will bounce', async () => {
    const navigation = { navigate: jest.fn() };
    let tree;
    await act(async () => { tree = create(<CoachHeldHistoryScreen navigation={navigation} />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(text).toContain('After your first weekly check-in');
    expect(text).toMatch(/opens once your coach has a few days of training and weigh-ins to read/);
    expect(text).not.toContain('Start check-in');
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test('load failure clears history and renders the empty state', async () => {
    getCoachOutputHistory.mockRejectedValueOnce(new Error('offline'));
    let tree;
    await act(async () => { tree = create(<CoachHeldHistoryScreen />); });
    await flush();

    const text = flattenText(tree.toJSON());
    expect(logError).toHaveBeenCalledWith('CoachHeldHistory.load', expect.any(Error), expect.objectContaining({ hasUser: true }));
    expect(text).toContain('No entries yet');
    expect(text).not.toContain('Weeks you applied the call');
    expect(text).not.toContain('Applied');
  });
});
