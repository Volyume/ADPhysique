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

// Phase 3's RespectAllRow has its own async device-flag lifecycle
// (AsyncStorage read on mount); stubbed here so this suite's own
// assertions never race it -- `RespectAllRow.test.js` owns that
// component's behaviour.
jest.mock('../../components/community/RespectAllRow', () => () => null);

// Phase 3, lead ruling: "Share a workout with the group" reads the
// caller's own most recently completed workout id, on device only.
jest.mock('../../lib/database', () => ({ getAllWorkouts: jest.fn() }));

jest.mock('../../lib/community', () => ({
  getGroup: jest.fn(),
  joinGroup: jest.fn(),
  leaveGroup: jest.fn(),
  closeGroup: jest.fn(),
  loadGroupFeed: jest.fn(),
  reactToPost: jest.fn(),
  loadBoard: jest.fn(),
  daysLabel: () => '',
  // Phase 3: real implementation (pure, no I/O) -- `groups.test.js` owns
  // its behaviour; mounting the real one here keeps this suite honest
  // about what actually renders instead of guessing a stand-in shape.
  togetherLine: jest.requireActual('../../lib/community/groups').togetherLine,
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
import { getAllWorkouts } from '../../lib/database';
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
  getAllWorkouts.mockResolvedValue([]);
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

// ─── Phase 3 (spec section 4): "Together this week" ─────────────────────
describe('the Together line', () => {
  function flattenText(node) {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(flattenText).join(' ');
    return flattenText(node.children);
  }

  test('no line at all when the group carries no Together fields (a non-member of an invite-only group)', async () => {
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Together:');
  });

  test('"nothing shared yet" when nobody in the group shares', async () => {
    getGroup.mockResolvedValue({
      ...OPEN_GROUP, togetherSessionsWeek: 0, togetherPlannedWeek: 0, sharingMembers: 0,
    });
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain('Together: nothing shared yet');
  });

  test('the full line with a real planned figure', async () => {
    getGroup.mockResolvedValue({
      ...OPEN_GROUP, memberCount: 8, togetherSessionsWeek: 11, togetherPlannedWeek: 16, sharingMembers: 6,
    });
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain('Together: 11 of 16 planned sessions this week · 6 of 8 sharing');
  });
});

// ─── Phase 3, lead ruling: "Share a workout with the group" ─────────────
describe('Share a workout with the group', () => {
  test('renders only for a member, at the top of ACTIVITY', async () => {
    getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
    const { tree } = await mount();
    expect(byLabel(tree, 'Share a workout with the group')).toBeTruthy();
  });

  test('a non-member never sees the row', async () => {
    const { tree } = await mount();
    expect(byLabel(tree, 'Share a workout with the group')).toBeUndefined();
  });

  test('tapping it opens Compose on the caller\'s latest completed workout, this group preselected', async () => {
    getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
    getAllWorkouts.mockResolvedValue([
      { id: 'w-old', isCompleted: 1, startedAt: 1000 },
      { id: 'w-new', isCompleted: 1, startedAt: 5000 },
      { id: 'w-unfinished', isCompleted: 0, startedAt: 9000 },
    ]);
    const { tree, navigation } = await mount();

    await act(async () => { byLabel(tree, 'Share a workout with the group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityCompose', {
      kind: 'session', workoutId: 'w-new', presetGroupId: 'g1',
    });
  });

  test('no completed workout at all: a calm toast, never a dead-end navigation', async () => {
    getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
    getAllWorkouts.mockResolvedValue([{ id: 'w1', isCompleted: 0, startedAt: 1000 }]);
    const { tree, navigation } = await mount();

    await act(async () => { byLabel(tree, 'Share a workout with the group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });

    expect(navigation.navigate).not.toHaveBeenCalledWith('CommunityCompose', expect.anything());
    expect(mockToastShow).toHaveBeenCalledWith('Finish a workout first, then share it here.');
  });
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
