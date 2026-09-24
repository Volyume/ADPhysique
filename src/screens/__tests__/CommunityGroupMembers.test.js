/**
 * CommunityGroupMembersScreen (community product audit `docs/community-
 * product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` sections 3-4;
 * server contract `community_group_members(_group_id, _cursor, _limit)`).
 * Added by the item 9 hygiene pass (founder order 2026-09-22, B-06): this
 * screen shipped with no test of its own.
 *
 * What this suite pins:
 *  1. The roster renders from `listGroupMembers`: name and role per row.
 *  2. An admin's Approve on a pending request calls `approveGroupRequest`
 *     with the group id and that row's user id.
 *  3. An admin's "Remove from group" (row kebab menu) calls
 *     `removeGroupMember` with the group id and that row's user id.
 *  4. An admin's "Make admin" (row kebab menu) calls `promoteGroupMember`
 *     with the group id and that row's user id.
 *  5. A non-admin sees none of those actions on any row: no Approve, no
 *     kebab. (`community_group_members` itself only ever returns a
 *     'requested' row to an admin caller, so a non-admin roster never
 *     carries one -- the fixtures below match that contract rather than
 *     asserting client-side gating that does not exist.)
 *  6. Loading shows the skeleton; an offline failure and a generic
 *     failure each show their own EmptyState with Try again.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  return {
    FlashList: ({ ListEmptyComponent, data, renderItem, keyExtractor }) => React.createElement(
      React.Fragment, null,
      (!data || !data.length) ? ListEmptyComponent : data.map(
        (item, index) => React.createElement(
          React.Fragment, { key: keyExtractor(item) }, renderItem({ item, index }),
        ),
      ),
    ),
  };
});

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../lib/community', () => ({
  listGroupMembers: jest.fn(),
  approveGroupRequest: jest.fn(),
  removeGroupMember: jest.fn(),
  promoteGroupMember: jest.fn(),
}));

import {
  listGroupMembers, approveGroupRequest, removeGroupMember, promoteGroupMember,
} from '../../lib/community';
import CommunityGroupMembersScreen from '../CommunityGroupMembersScreen';

/** Every string in a rendered tree, in order. */
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

async function flush() {
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
}

async function mount({ myRole = null } = {}) {
  let tree;
  await act(async () => {
    tree = create(
      <CommunityGroupMembersScreen
        route={{ params: { id: 'g1', name: 'Iron Collective', myRole } }}
      />,
    );
  });
  await flush();
  return { tree };
}

/** Mounts without flushing microtasks, so the load is still in flight. */
async function mountInFlight({ myRole = null } = {}) {
  let tree;
  await act(async () => {
    tree = create(
      <CommunityGroupMembersScreen
        route={{ params: { id: 'g1', name: 'Iron Collective', myRole } }}
      />,
    );
  });
  return { tree };
}

const MEMBER_A = {
  card: { user_id: 'u1', display_name: 'Alex Runner', handle: 'alex_runner', avatar_preset: null },
  role: 'member',
  state: 'member',
};
const MEMBER_ADMIN = {
  card: { user_id: 'u2', display_name: 'Sam Admin', handle: 'sam_admin', avatar_preset: null },
  role: 'admin',
  state: 'member',
};
const REQUEST_ROW = {
  card: { user_id: 'u3', display_name: 'Riley Newcomer', handle: 'riley_new', avatar_preset: null },
  role: 'member',
  state: 'requested',
};

beforeEach(() => {
  jest.clearAllMocks();
  listGroupMembers.mockResolvedValue({ members: [MEMBER_A, MEMBER_ADMIN], cursor: null });
  approveGroupRequest.mockResolvedValue({ approved: true });
  removeGroupMember.mockResolvedValue({ removed: true });
  promoteGroupMember.mockResolvedValue({ promoted: true });
});

test('the roster renders names and roles from listGroupMembers', async () => {
  const { tree } = await mount({ myRole: 'member' });
  expect(listGroupMembers).toHaveBeenCalledWith('g1', { limit: 20 });
  const text = texts(tree.toJSON());
  expect(text).toContain('Alex Runner');
  expect(text).toContain('Member');
  expect(text).toContain('Sam Admin');
  expect(text).toContain('Admin');
});

describe('admin actions', () => {
  test('Approve on a pending request calls approveGroupRequest with the group and user id', async () => {
    listGroupMembers.mockResolvedValue({ members: [REQUEST_ROW], cursor: null });
    const { tree } = await mount({ myRole: 'admin' });

    const approveBtn = byLabel(tree, 'Approve Riley Newcomer');
    expect(approveBtn).toBeTruthy();
    await act(async () => { approveBtn.props.onPress(); });
    await flush();

    expect(approveGroupRequest).toHaveBeenCalledWith('g1', 'u3');
    expect(mockToastShow).toHaveBeenCalledWith('Approved.');
  });

  test('"Remove from group" on the row menu calls removeGroupMember with the group and user id', async () => {
    listGroupMembers.mockResolvedValue({ members: [MEMBER_A], cursor: null });
    const { tree } = await mount({ myRole: 'admin' });

    await act(async () => { byLabel(tree, 'More actions for Alex Runner').props.onPress(); });
    const removeRow = tree.root.findAll(
      (n) => n.props?.label === 'Remove from group' && n.props?.onPress,
    )[0];
    expect(removeRow).toBeTruthy();
    await act(async () => { removeRow.props.onPress(); });
    await flush();

    expect(removeGroupMember).toHaveBeenCalledWith('g1', 'u1');
    expect(mockToastShow).toHaveBeenCalledWith('Removed from the group.');
  });

  test('"Make admin" on the row menu calls promoteGroupMember with the group and user id', async () => {
    listGroupMembers.mockResolvedValue({ members: [MEMBER_A], cursor: null });
    const { tree } = await mount({ myRole: 'admin' });

    await act(async () => { byLabel(tree, 'More actions for Alex Runner').props.onPress(); });
    const makeAdminRow = tree.root.findAll(
      (n) => n.props?.label === 'Make admin' && n.props?.onPress,
    )[0];
    expect(makeAdminRow).toBeTruthy();
    await act(async () => { makeAdminRow.props.onPress(); });
    await flush();

    expect(promoteGroupMember).toHaveBeenCalledWith('g1', 'u1');
    expect(mockToastShow).toHaveBeenCalledWith('Now an admin.');
  });

  // The row menu never offers "Make admin" for a row that is already an
  // admin -- there is nothing to promote.
  test('an already-admin row offers Remove but not Make admin', async () => {
    listGroupMembers.mockResolvedValue({ members: [MEMBER_ADMIN], cursor: null });
    const { tree } = await mount({ myRole: 'admin' });

    await act(async () => { byLabel(tree, 'More actions for Sam Admin').props.onPress(); });
    const labels = tree.root.findAll((n) => n.props?.rows).slice(-1)[0].props.rows.map((r) => r.label);
    expect(labels).toEqual(['Remove from group']);
  });
});

describe('a non-admin view', () => {
  test.each([['member'], [null]])('myRole=%s sees no Approve or kebab on any row', async (myRole) => {
    listGroupMembers.mockResolvedValue({ members: [MEMBER_A, MEMBER_ADMIN], cursor: null });
    const { tree } = await mount({ myRole });

    expect(byLabel(tree, 'More actions for Alex Runner')).toBeUndefined();
    expect(byLabel(tree, 'More actions for Sam Admin')).toBeUndefined();
    const approveButtons = tree.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Approve'),
    );
    expect(approveButtons).toHaveLength(0);
  });
});

describe('loading, offline and failed states', () => {
  test('loading shows the skeleton before the first page resolves', async () => {
    let resolveMembers;
    listGroupMembers.mockImplementation(() => new Promise((resolve) => { resolveMembers = resolve; }));
    const { tree } = await mountInFlight({ myRole: 'member' });

    const loadingMarks = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Loading');
    expect(loadingMarks.length).toBeGreaterThan(0);

    await act(async () => { resolveMembers({ members: [], cursor: null }); });
    await flush();
  });

  test('an offline failure shows the offline EmptyState with Try again', async () => {
    listGroupMembers.mockRejectedValue(Object.assign(new Error('offline'), { code: 'offline' }));
    const { tree } = await mount({ myRole: 'member' });

    expect(byLabel(tree, 'Try loading members again')).toBeTruthy();
    const text = texts(tree.toJSON());
    expect(text).toContain('You are offline');
    expect(text).toContain('Try again');
  });

  test('a generic failure shows the "could not load" EmptyState with Try again', async () => {
    listGroupMembers.mockRejectedValue(Object.assign(new Error('boom'), { code: 'unavailable' }));
    const { tree } = await mount({ myRole: 'member' });

    expect(byLabel(tree, 'Try loading members again')).toBeTruthy();
    const text = texts(tree.toJSON());
    expect(text).toContain('Could not load members');
  });
});
