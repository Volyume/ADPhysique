/**
 * CommunityFollowersScreen (community product audit `docs/community-
 * product-audit-2026-09-07/40-GAP-CLOSURE.md` §1 "Follow management").
 *
 * What this suite pins:
 *  1. Loads the first page via `listFollowers` and renders a row per
 *     follower; paging asks for the next page with the server cursor.
 *  2. The row's kebab opens a menu whose "Remove follower" calls
 *     `removeFollower` after a calm confirm, and the row drops from the
 *     list on success.
 *  3. A row press opens that person's profile.
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
  listFollowers: jest.fn(),
  removeFollower: jest.fn(),
}));

import { listFollowers, removeFollower } from '../../lib/community';
import CommunityFollowersScreen from '../CommunityFollowersScreen';

function byLabel(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && n.props?.onPress)[0];
}

const FOLLOWER_A = { user_id: 'a1', handle: 'ally' };
const FOLLOWER_B = { user_id: 'b1', handle: 'benji' };

async function mount() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityFollowersScreen navigation={navigation} />);
  });
  await act(async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); });
  return { tree, navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  lastAlertButtons = null;
  listFollowers.mockResolvedValue({ people: [FOLLOWER_A, FOLLOWER_B], cursor: 'cursor-1' });
  removeFollower.mockResolvedValue({});
});

test('loads the first page of followers', async () => {
  await mount();
  expect(listFollowers).toHaveBeenCalledWith({ limit: 20 });
});

test('paging asks for the next page with the server cursor', async () => {
  const { tree } = await mount();
  listFollowers.mockResolvedValueOnce({ people: [{ user_id: 'c1', handle: 'cass' }], cursor: null });
  const list = tree.root.findAll((n) => n.props?.onEndReached)[0];
  await act(async () => { list.props.onEndReached(); });
  expect(listFollowers).toHaveBeenCalledWith({ cursor: 'cursor-1', limit: 20 });
});

test('the kebab opens a menu whose Remove follower calls removeFollower and drops the row', async () => {
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Options for @ally').props.onPress(); });

  const removeRow = tree.root.findAll(
    (n) => n.props?.label === 'Remove follower' && n.props?.onPress,
  )[0];
  await act(async () => { removeRow.props.onPress(); });

  // The confirm alert's destructive button fires the actual removal.
  const confirmBtn = lastAlertButtons.find((b) => b.text === 'Remove');
  await act(async () => { await confirmBtn.onPress(); });

  expect(removeFollower).toHaveBeenCalledWith('a1');
  expect(mockToastShow).toHaveBeenCalledWith('Follower removed');
});

test('a row press opens that person\'s profile', async () => {
  const { tree, navigation } = await mount();
  const cardPress = byLabel(tree, 'card-b1');
  await act(async () => { cardPress.props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('CommunityProfile', { userId: 'b1' });
});
