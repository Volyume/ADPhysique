/**
 * CommunityConnectionsScreen (community product audit `docs/community-
 * product-audit-2026-09-07/40-GAP-CLOSURE.md` §1 "Follow management").
 *
 * What this suite pins:
 *  1. Loads the caller's own connections via `listConnections(null, ...)`
 *     and paginates with the server cursor.
 *  2. The row's kebab menu offers Message (navigates to the
 *     conversation) and Remove connection (calm confirm, calls
 *     `removeConnection`, drops the row).
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/community/ProfileCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ card, onPress }) => React.createElement(
      Pressable,
      { onPress, accessibilityLabel: `card-${card.user_id}` },
      React.createElement(Text, null, card.handle),
    ),
  };
});
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  return {
    FlashList: ({ ListEmptyComponent, data, renderItem, keyExtractor }) => React.createElement(
      React.Fragment, null,
      (!data || !data.length) ? ListEmptyComponent : data.map(
        (item) => React.createElement(React.Fragment, { key: keyExtractor(item) }, renderItem({ item })),
      ),
    ),
  };
});

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

let lastAlertButtons = null;
jest.mock('../../components/AppAlert', () => ({
  appAlert: jest.fn((title, message, buttons) => { lastAlertButtons = buttons; }),
}));

jest.mock('../../lib/community', () => ({
  listConnections: jest.fn(),
  removeConnection: jest.fn(),
}));

import { listConnections, removeConnection } from '../../lib/community';
import CommunityConnectionsScreen from '../CommunityConnectionsScreen';

function byLabel(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && n.props?.onPress)[0];
}

const CONN_A = { user_id: 'a1', handle: 'ally' };

async function mount() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityConnectionsScreen navigation={navigation} />);
  });
  await act(async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); });
  return { tree, navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  lastAlertButtons = null;
  listConnections.mockResolvedValue({ people: [CONN_A], cursor: 'cursor-1' });
  removeConnection.mockResolvedValue({});
});

test('loads the caller\'s own connections', async () => {
  await mount();
  expect(listConnections).toHaveBeenCalledWith(null, { limit: 30 });
});

test('paging asks for the next page with the server cursor', async () => {
  const { tree } = await mount();
  listConnections.mockResolvedValueOnce({ people: [{ user_id: 'c1', handle: 'cass' }], cursor: null });
  const list = tree.root.findAll((n) => n.props?.onEndReached)[0];
  await act(async () => { list.props.onEndReached(); });
  expect(listConnections).toHaveBeenCalledWith(null, { cursor: 'cursor-1', limit: 30 });
});

test('the kebab menu offers Message, which opens the conversation', async () => {
  const { tree, navigation } = await mount();
  await act(async () => { byLabel(tree, 'Options for @ally').props.onPress(); });
  const messageRow = tree.root.findAll((n) => n.props?.label === 'Message' && n.props?.onPress)[0];
  await act(async () => { messageRow.props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('CommunityConversation', { userId: 'a1' });
});

test('Remove connection calls removeConnection after a calm confirm and drops the row', async () => {
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Options for @ally').props.onPress(); });
  const removeRow = tree.root.findAll(
    (n) => n.props?.label === 'Remove connection' && n.props?.onPress,
  )[0];
  await act(async () => { removeRow.props.onPress(); });

  const confirmBtn = lastAlertButtons.find((b) => b.text === 'Remove');
  await act(async () => { await confirmBtn.onPress(); });

  expect(removeConnection).toHaveBeenCalledWith('a1');
  expect(mockToastShow).toHaveBeenCalledWith('Connection removed');
});
