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
 *  4. Admin-only menu rows (Invite by username, Share invite link, Close
 *     group) render only for `myRole === 'admin'`.
 *
 * RE-ANCHORED 2026-09-23 (founder order 2026-09-22 item 8): "Invite by
 * handle" -> "Invite by username" in point 4 and the two menu-row
 * assertions below (audit A-14, copy only).
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
// caller's own most recently completed workout id, on device only. F7
// fix: an id-only read (`getLatestCompletedWorkoutId`), never the full
// workout row `getAllWorkouts` carried (private notes included) for a
// single id this screen never renders -- see
// `database.getLatestCompletedWorkoutId.test.js` for the SQL-level
// filter/order behaviour this mock now stands in for.
jest.mock('../../lib/database', () => ({ getLatestCompletedWorkoutId: jest.fn() }));

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
  groupInviteUrl: (id, t) => `https://volyume.app/g/?id=${id}&t=${t}`,
  // Early days (26-EARLY-DAYS-SPEC.md 1.7): the invite link's token.
  acceptGroupInvite: jest.fn(),
}));

import {
  getGroup, joinGroup, leaveGroup, closeGroup, loadGroupFeed, loadBoard,
} from '../../lib/community';
import { getLatestCompletedWorkoutId } from '../../lib/database';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityGroupScreen from '../CommunityGroupScreen';

/** Every string in a rendered tree, in order (the invite tests read copy). */
function texts(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(texts).join(' ');
  return texts(node.children);
}

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
  getLatestCompletedWorkoutId.mockResolvedValue(null);
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

// Founder order 2026-09-22 item 8 (audit A-08): the group's own empty
// feed is one quiet line, matching the Hub and Profile (blueprint section
// 9 rule 9); the offline/error branch above keeps its full EmptyState
// with its retry.
describe('the empty feed line', () => {
  test('a member with an empty feed sees the quiet line, no EmptyState icon', async () => {
    getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
    loadGroupFeed.mockResolvedValue({ rows: [], cursor: null });
    const { tree } = await mount();
    expect(texts(tree.toJSON())).toContain("Nothing here yet from this group's members.");
    expect(tree.root.findAll((n) => n.props?.name === 'images-outline')).toHaveLength(0);
  });

  test('an offline load keeps the full EmptyState with Try again', async () => {
    getGroup.mockRejectedValue(Object.assign(new Error('offline'), { code: 'offline' }));
    const { tree } = await mount();
    expect(byLabel(tree, 'Try loading this group again')).toBeTruthy();
    expect(texts(tree.toJSON())).toContain('Try again');
  });
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
  expect(labels).toEqual(expect.arrayContaining(['Edit', 'Invite by username', 'Share invite link', 'Close group']));
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
  expect(labels).not.toEqual(expect.arrayContaining(['Invite by username', 'Close group']));
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
    getLatestCompletedWorkoutId.mockResolvedValue('w-new');
    const { tree, navigation } = await mount();

    await act(async () => { byLabel(tree, 'Share a workout with the group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });

    expect(getLatestCompletedWorkoutId).toHaveBeenCalledWith('u1');
    expect(navigation.navigate).toHaveBeenCalledWith('CommunityCompose', {
      kind: 'session', workoutId: 'w-new', presetGroupId: 'g1',
    });
  });

  test('no completed workout at all: a calm toast, never a dead-end navigation', async () => {
    getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
    getLatestCompletedWorkoutId.mockResolvedValue(null);
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

test('a member giving Respect on a group feed item calls reactToPost with post id, true, and author user id', async () => {
  const { reactToPost } = require('../../lib/community');
  const feedItem = {
    post: { id: 'p2', kind: 'session', payload: {}, caption: null, reaction_count: 0, comment_count: 0, created_at: Date.now() },
    author: { user_id: 'u3', handle: 'john_doe', display_name: 'John Doe' },
    myReaction: false,
  };
  getGroup.mockResolvedValue({ ...OPEN_GROUP, myRole: 'member', myState: 'member' });
  loadGroupFeed.mockResolvedValue({ rows: [feedItem], cursor: null });
  const { tree } = await mount();
  // Find component with renderItem prop (the screen passes it to FlashList)
  let flashListProps = null;
  tree.root.findAll((n) => {
    if (n.props?.renderItem && n.props?.data) {
      flashListProps = n.props;
    }
  });
  expect(flashListProps).toBeTruthy();
  const itemEl = flashListProps.renderItem({ item: feedItem });
  let itemTree = null;
  act(() => { itemTree = create(itemEl); });
  const respectBtn = itemTree.root.findAll(
    (n) => n.props?.accessibilityLabel === 'Give this respect' && typeof n.props.onPress === 'function',
  )[0];
  await act(async () => { respectBtn.props.onPress(); });
  // Founder order 2026-09-22 item 1 (review R-01): the author id must reach reactToPost or no push fires.
  expect(reactToPost).toHaveBeenCalledWith('p2', true, 'u3');
});

// ─── Early days (26-EARLY-DAYS-SPEC.md 1.7): the invite link's token ───

describe('an invite link into the group', () => {
  const { acceptGroupInvite } = require('../../lib/community');

  async function mountWithToken({ myState = null, access = 'invite', token = 'tok-1', isMinor = false } = {}) {
    getGroup.mockResolvedValue({ ...OPEN_GROUP, access, myState });
    useCommunityMe.mockReturnValue({ me: { profile: { user_id: 'u1' }, is_minor: isMinor } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() };
    let tree;
    await act(async () => {
      tree = create(<CommunityGroupScreen navigation={navigation} route={{ params: { id: 'g1', t: token } }} />);
    });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
    return { tree, navigation };
  }

  test('a non-member with a token sees the invite and Accept, never the plain Join', async () => {
    const { tree } = await mountWithToken();
    const text = texts(tree.toJSON());
    expect(text).toContain('You have been invited to this group.');
    expect(byLabel(tree, 'Accept the invite to this group')).toBeTruthy();
    expect(byLabel(tree, 'Join group')).toBeUndefined();
  });

  test('Accept consumes the token, says Joined, spends the token in the route, and reloads', async () => {
    acceptGroupInvite.mockResolvedValue({ ...OPEN_GROUP, access: 'invite', myState: 'member' });
    const { tree, navigation } = await mountWithToken({ token: '11111111-2222-4333-8444-555555555555' });
    await act(async () => { byLabel(tree, 'Accept the invite to this group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
    expect(acceptGroupInvite).toHaveBeenCalledWith({ token: '11111111-2222-4333-8444-555555555555' });
    expect(mockToastShow).toHaveBeenCalledWith('Joined.');
    expect(navigation.setParams).toHaveBeenCalledWith({ id: 'g1', t: undefined });
    expect(getGroup).toHaveBeenCalledTimes(2);
  });

  // Review fix 3: the token names its own group. A link whose `id` is for
  // another group must land on the group actually joined, never loop.
  test('a token for a different group moves the page to the group joined', async () => {
    acceptGroupInvite.mockResolvedValue({ ...OPEN_GROUP, id: 'g2', name: 'Other crew', access: 'invite', myState: 'member' });
    const { tree, navigation } = await mountWithToken({ token: '11111111-2222-4333-8444-555555555555' });
    await act(async () => { byLabel(tree, 'Accept the invite to this group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
    expect(navigation.setParams).toHaveBeenCalledWith({ id: 'g2', t: undefined });
    // No reload of g1: the new id's own load effect takes over.
    expect(getGroup).toHaveBeenCalledTimes(1);
  });

  // Review fix 4: a pending request plus a token is not a loop; the
  // Requested state keeps its own (disabled) button.
  test('a requested member with a token sees Requested, not Accept', async () => {
    const { tree } = await mountWithToken({ myState: 'requested', token: '11111111-2222-4333-8444-555555555555' });
    expect(byLabel(tree, 'Accept the invite to this group')).toBeUndefined();
    expect(byLabel(tree, 'Join requested')).toBeTruthy();
  });

  // Review note 12: a mangled token is said calmly, never sent as a cast error.
  test('a token that is not a uuid reads as expired without a server call', async () => {
    const { tree } = await mountWithToken({ token: 'not-a-token' });
    await act(async () => { byLabel(tree, 'Accept the invite to this group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });
    expect(acceptGroupInvite).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith('This invite link has expired.', { variant: 'error' });
  });

  test('an expired or unknown token says so calmly', async () => {
    acceptGroupInvite.mockRejectedValue(Object.assign(new Error('not_found'), { code: 'not_found' }));
    const { tree } = await mountWithToken({ token: '11111111-2222-4333-8444-555555555555' });
    await act(async () => { byLabel(tree, 'Accept the invite to this group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
    expect(mockToastShow).toHaveBeenCalledWith('This invite link has expired.', { variant: 'error' });
  });

  test('already a member: the page just refreshes', async () => {
    acceptGroupInvite.mockRejectedValue(Object.assign(new Error('already_member'), { code: 'already_member' }));
    const { tree } = await mountWithToken({ token: '11111111-2222-4333-8444-555555555555' });
    await act(async () => { byLabel(tree, 'Accept the invite to this group').props.onPress(); });
    await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
    expect(getGroup).toHaveBeenCalledTimes(2);
    expect(mockToastShow).not.toHaveBeenCalledWith(expect.stringContaining('expired'), expect.anything());
  });

  test('a member with a token sees the ordinary page; a minor sees no accept', async () => {
    const member = await mountWithToken({ myState: 'member' });
    expect(texts(member.tree.toJSON())).not.toContain('You have been invited');
    const minor = await mountWithToken({ isMinor: true });
    expect(byLabel(minor.tree, 'Accept the invite to this group')).toBeUndefined();
  });

  test('no token: Join exactly as before', async () => {
    const { tree } = await mount();
    expect(byLabel(tree, 'Join group')).toBeTruthy();
    expect(texts(tree.toJSON())).not.toContain('You have been invited');
  });
});
