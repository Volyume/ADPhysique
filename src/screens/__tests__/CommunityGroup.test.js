/**
 * CommunityGroupScreen (community product audit `docs/community-product-
 * audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 3-4).
 *
 * What this suite pins:
 *  1. A non-member sees Join; joining an open group calls `joinGroup` and
 *     reloads. A minor never sees Join at all (fails closed on the
 *     cached `me.is_minor`, mirroring the server's own refusal).
 *  2. A member loads the group's week board (scope 'group') and the
 *     members' feed, and reloads neither for a non-member.
 *  3. Leave calls `leaveGroup` and goes back; a `last_admin` refusal is
 *     spoken calmly and the screen stays.
 *  4. Admin-only menu rows (Invite by handle, Share invite link, Close
 *     group) render only for `myRole === 'admin'`.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => (props) => (props?.right ?? null));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  return {
    FlashList: ({ ListHeaderComponent, ListEmptyComponent, data }) => React.createElement(
      React.Fragment, null, ListHeaderComponent, (!data || !data.length) ? ListEmptyComponent : null,
    ),
  };
});

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../hooks/useCommunityMe', () => ({ __esModule: true, default: jest.fn() }));

jest.mock('../../lib/community', () => ({
  getGroup: jest.fn(),
  joinGroup: jest.fn(),
  leaveGroup: jest.fn(),
  closeGroup: jest.fn(),
  loadGroupFeed: jest.fn(),
  reactToPost: jest.fn(),
  loadBoard: jest.fn(),
  daysLabel: () => '',
  GROUP_ACCESS: { open: 'Open', invite: 'Invite only' },
  REPORT_REASONS: { spam: 'Spam' },
  REPORT_DETAIL_MAX: 200,
  reportContent: jest.fn(),
  inviteToGroup: jest.fn(),
  createGroupInviteLink: jest.fn(),
  groupUrl: (id) => `https://volyume.app/g/?id=${id}`,
}));

import {
  getGroup, joinGroup, leaveGroup, closeGroup, loadGroupFeed, loadBoard,
} from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityGroupScreen from '../CommunityGroupScreen';

function byLabel(tree, label) {
  return tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && (n.props?.onPress || n.props?.onChangeText),
  )[0];
}

function findAllByLabelPrefix(tree, needle) {
  return tree.root.findAll(
    (n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes(needle),
  );
}

async function mount({ isMinor = false } = {}) {
  useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1' }, is_minor: isMinor } });
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityGroupScreen navigation={navigation} route={{ params: { id: 'g1' } }} />);
  });
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
  return { tree, navigation };
}

const OPEN_GROUP = {
  id: 'g1', name: 'Iron Collective', blurb: 'Monday crew', access: 'open',
  memberCount: 4, myRole: null, myState: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  getGroup.mockResolvedValue(OPEN_GROUP);
  loadBoard.mockResolvedValue({ rows: [], you: null, count: 0, thresholdMet: true, cursor: null });
  loadGroupFeed.mockResolvedValue({ rows: [], cursor: null });
  joinGroup.mockResolvedValue({ state: 'member' });
  leaveGroup.mockResolvedValue({ left: true });
});

test('a non-member sees Join; joining calls joinGroup and reloads', async () => {
  const { tree } = await mount();
  const joinBtn = byLabel(tree, 'Join group');
  expect(joinBtn).toBeTruthy();

  await act(async () => { joinBtn.props.onPress(); });
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });

  expect(joinGroup).toHaveBeenCalledWith('g1');
  expect(getGroup).toHaveBeenCalledTimes(2);
});

test('a minor never sees Join, even for an open group', async () => {
  const { tree } = await mount({ isMinor: true });
  expect(byLabel(tree, 'Join group')).toBeUndefined();
});

test('a member loads the group week board and the feed; a non-member loads neither', async () => {
  getGroup.mockResolvedValueOnce({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
  await mount();
  expect(loadBoard).toHaveBeenCalledWith(expect.objectContaining({ scope: 'group', scopeKey: 'g1', window: 'week' }));
  expect(loadGroupFeed).toHaveBeenCalledWith('g1', expect.objectContaining({ limit: expect.any(Number) }));

  jest.clearAllMocks();
  getGroup.mockResolvedValue(OPEN_GROUP);
  await mount();
  expect(loadBoard).not.toHaveBeenCalled();
  expect(loadGroupFeed).not.toHaveBeenCalled();
});

test('Leave calls leaveGroup and goes back', async () => {
  getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
  const { tree, navigation } = await mount();

  await act(async () => { byLabel(tree, 'Group menu').props.onPress(); });
  const leaveRow = findAllByLabelPrefix(tree, 'Leave group')[0]
    ?? tree.root.findAll((n) => n.props?.label === 'Leave group' && n.props?.onPress)[0];
  await act(async () => { leaveRow.props.onPress(); });
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });

  expect(leaveGroup).toHaveBeenCalledWith('g1');
  expect(navigation.goBack).toHaveBeenCalled();
});

test('last_admin is spoken calmly and the screen does not navigate away', async () => {
  const err = new Error('last_admin');
  err.code = 'last_admin';
  leaveGroup.mockRejectedValueOnce(err);
  getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'admin', myState: 'member' });
  const { tree, navigation } = await mount();

  await act(async () => { byLabel(tree, 'Group menu').props.onPress(); });
  const leaveRow = tree.root.findAll((n) => n.props?.label === 'Leave group' && n.props?.onPress)[0];
  await act(async () => { leaveRow.props.onPress(); });
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });

  expect(mockToastShow).toHaveBeenCalledWith(
    'Promote someone else to admin before leaving.',
    expect.objectContaining({ variant: 'error' }),
  );
  expect(navigation.goBack).not.toHaveBeenCalled();
});

test('admin-only menu rows render only for an admin member', async () => {
  getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'admin', myState: 'member' });
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Group menu').props.onPress(); });
  const labels = tree.root.findAll((n) => n.props?.rows).slice(-1)[0].props.rows.map((r) => r.label);
  expect(labels).toEqual(expect.arrayContaining(['Edit', 'Invite by handle', 'Share invite link', 'Close group']));
});

test('Edit opens CommunityGroupCreate in edit mode, prefilled', async () => {
  getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'admin', myState: 'member' });
  const { tree, navigation } = await mount();
  await act(async () => { byLabel(tree, 'Group menu').props.onPress(); });
  const editRow = tree.root.findAll((n) => n.props?.label === 'Edit' && n.props?.onPress)[0];
  await act(async () => { editRow.props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('CommunityGroupCreate', {
    mode: 'edit',
    group: { id: 'g1', name: 'Iron Collective', blurb: 'Monday crew', access: 'open' },
  });
});

test('a plain member sees no admin-only menu rows', async () => {
  getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Group menu').props.onPress(); });
  const labels = tree.root.findAll((n) => n.props?.rows).slice(-1)[0].props.rows.map((r) => r.label);
  expect(labels).not.toEqual(expect.arrayContaining(['Invite by handle', 'Close group']));
});

test('closeGroup fires from the menu for an admin', async () => {
  getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'admin', myState: 'member' });
  closeGroup.mockResolvedValueOnce({ id: 'g1', status: 'closed' });
  const { tree } = await mount();
  await act(async () => { byLabel(tree, 'Group menu').props.onPress(); });
  const closeRow = tree.root.findAll((n) => n.props?.label === 'Close group' && n.props?.onPress)[0];
  await act(async () => { closeRow.props.onPress(); });
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
  expect(closeGroup).toHaveBeenCalledWith('g1');
});
