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

  test('empty history offers a weekly check-in action', async () => {
    const navigation = { navigate: jest.fn() };
    let tree;
    await act(async () => { tree = create(<CoachHeldHistoryScreen navigation={navigation} />); });
    await flush();

    expect(flattenText(tree.toJSON())).toContain('Start check-in');
    const action = tree.root.findByProps({ accessibilityLabel: 'Start check-in' });
    await act(async () => { action.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledWith('WeeklyCheckIn');
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
