/**
 * What this suite pins (community product audit `docs/community-product-
 * audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 3; server
 * contract `supabase/migrate_165_community_boards_groups.sql` Part 6-10):
 *
 *  - every wrapper calls the exact RPC name with the exact parameter
 *    names the server function takes, positional args mapped to the
 *    server's own leading-underscore keys;
 *  - `createGroup`/`updateGroup`/`closeGroup`/`acceptGroupInvite` reduce
 *    the group card to the same normalised shape;
 *  - `listMyGroups` drops any row whose group came back falsy rather
 *    than crashing the Hub's chip row;
 *  - `listGroupMembers` reduces to `{card, role, state}` per row and
 *    drops a cardless row;
 *  - `searchGroups` never calls the RPC for a query under 2 characters
 *    (matching `findPeople`'s own floor) and answers `{groups: []}`;
 *  - `loadGroupFeed` reads the RPC's `posts` key (not `rows`) into
 *    `{rows, cursor}`, matching `community_group_feed`'s actual
 *    `jsonb_build_object('posts', ..., 'cursor', ...)` return shape.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});

const { callCommunity } = require('../transport');
const {
  createGroup, updateGroup, closeGroup, leaveGroup, joinGroup,
  approveGroupRequest, removeGroupMember, promoteGroupMember,
  inviteToGroup, createGroupInviteLink, acceptGroupInvite,
  listMyGroups, getGroup, listGroupMembers, searchGroups, loadGroupFeed,
} = require('../groups');

const CARD = {
  id: 'g1', name: 'Iron Collective', blurb: 'Monday leg day crew', access: 'open',
  created_by: 'u1', member_count: 4, status: 'active', created_at: '2026-09-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  callCommunity.mockResolvedValue(CARD);
});

test('createGroup calls community_group_create with _name/_blurb/_access and normalises the card', async () => {
  const out = await createGroup({ name: 'Iron Collective', blurb: 'Monday leg day crew', access: 'open' });
  expect(callCommunity).toHaveBeenCalledWith('community_group_create', {
    _name: 'Iron Collective', _blurb: 'Monday leg day crew', _access: 'open',
  });
  expect(out).toEqual({
    id: 'g1', name: 'Iron Collective', blurb: 'Monday leg day crew', access: 'open',
    createdBy: 'u1', memberCount: 4, status: 'active', createdAt: '2026-09-01T00:00:00Z',
  });
});

test('createGroup sends null for an empty blurb, never an empty string', async () => {
  await createGroup({ name: 'Solo', blurb: '' });
  expect(callCommunity).toHaveBeenCalledWith('community_group_create', {
    _name: 'Solo', _blurb: null, _access: 'open',
  });
});

test('updateGroup calls community_group_update with _group_id/_name/_blurb/_access', async () => {
  await updateGroup('g1', { name: 'New name', blurb: null, access: 'invite' });
  expect(callCommunity).toHaveBeenCalledWith('community_group_update', {
    _group_id: 'g1', _name: 'New name', _blurb: null, _access: 'invite',
  });
});

test('closeGroup calls community_group_close with _group_id', async () => {
  await closeGroup('g1');
  expect(callCommunity).toHaveBeenCalledWith('community_group_close', { _group_id: 'g1' });
});

test('leaveGroup reduces the response to {left}', async () => {
  callCommunity.mockResolvedValueOnce({ left: true });
  const out = await leaveGroup('g1');
  expect(callCommunity).toHaveBeenCalledWith('community_group_leave', { _group_id: 'g1' });
  expect(out).toEqual({ left: true });
});

test('joinGroup reduces the response to {state}', async () => {
  callCommunity.mockResolvedValueOnce({ state: 'requested' });
  const out = await joinGroup('g1');
  expect(callCommunity).toHaveBeenCalledWith('community_group_join', { _group_id: 'g1' });
  expect(out).toEqual({ state: 'requested' });
});

test('approveGroupRequest calls community_group_approve with group and user ids', async () => {
  callCommunity.mockResolvedValueOnce({ approved: true });
  const out = await approveGroupRequest('g1', 'u2');
  expect(callCommunity).toHaveBeenCalledWith('community_group_approve', { _group_id: 'g1', _user_id: 'u2' });
  expect(out).toEqual({ approved: true });
});

test('removeGroupMember calls community_group_remove with group and user ids', async () => {
  callCommunity.mockResolvedValueOnce({ removed: true });
  const out = await removeGroupMember('g1', 'u2');
  expect(callCommunity).toHaveBeenCalledWith('community_group_remove', { _group_id: 'g1', _user_id: 'u2' });
  expect(out).toEqual({ removed: true });
});

test('promoteGroupMember calls community_group_promote with group and user ids', async () => {
  callCommunity.mockResolvedValueOnce({ promoted: true });
  const out = await promoteGroupMember('g1', 'u2');
  expect(callCommunity).toHaveBeenCalledWith('community_group_promote', { _group_id: 'g1', _user_id: 'u2' });
  expect(out).toEqual({ promoted: true });
});

test('inviteToGroup lower-cases and trims the handle', async () => {
  callCommunity.mockResolvedValueOnce({ invited: 'u3' });
  const out = await inviteToGroup('g1', '  Rowan  ');
  expect(callCommunity).toHaveBeenCalledWith('community_group_invite', { _group_id: 'g1', _handle: 'rowan' });
  expect(out).toEqual({ invited: 'u3' });
});

test('createGroupInviteLink reduces to {token, expiresAt}', async () => {
  callCommunity.mockResolvedValueOnce({ token: 'tok1', expires_at: '2026-09-21T00:00:00Z' });
  const out = await createGroupInviteLink('g1');
  expect(callCommunity).toHaveBeenCalledWith('community_group_invite_link', { _group_id: 'g1' });
  expect(out).toEqual({ token: 'tok1', expiresAt: '2026-09-21T00:00:00Z' });
});

test('acceptGroupInvite sends both token and group_id through, either may be null', async () => {
  await acceptGroupInvite({ token: 'tok1' });
  expect(callCommunity).toHaveBeenCalledWith('community_group_accept_invite', {
    _token: 'tok1', _group_id: null,
  });
  await acceptGroupInvite({ groupId: 'g1' });
  expect(callCommunity).toHaveBeenCalledWith('community_group_accept_invite', {
    _token: null, _group_id: 'g1',
  });
});

test('listMyGroups maps {group, role, state} rows and drops one with no group', async () => {
  callCommunity.mockResolvedValueOnce({
    groups: [
      { group: CARD, role: 'admin', state: 'member' },
      { group: null, role: 'member', state: 'member' },
    ],
  });
  const out = await listMyGroups();
  expect(callCommunity).toHaveBeenCalledWith('community_group_list_mine', {});
  expect(out).toHaveLength(1);
  expect(out[0]).toEqual({ group: expect.objectContaining({ id: 'g1' }), role: 'admin', state: 'member' });
});

test('listMyGroups answers an empty array when the server sends nothing', async () => {
  callCommunity.mockResolvedValueOnce({});
  const out = await listMyGroups();
  expect(out).toEqual([]);
});

test('getGroup carries myRole/myState alongside the card, null for null', async () => {
  callCommunity.mockResolvedValueOnce({ ...CARD, my_role: null, my_state: null });
  const out = await getGroup('g1');
  expect(callCommunity).toHaveBeenCalledWith('community_group_get', { _group_id: 'g1' });
  expect(out.myRole).toBeNull();
  expect(out.myState).toBeNull();
  expect(out.id).toBe('g1');
});

test('getGroup answers null when the server sends no id', async () => {
  callCommunity.mockResolvedValueOnce({});
  expect(await getGroup('g1')).toBeNull();
});

test('listGroupMembers reduces to {card, role, state} rows and drops a cardless one', async () => {
  callCommunity.mockResolvedValueOnce({
    members: [
      { card: { user_id: 'u2', handle: 'rowan' }, role: 'admin', state: 'member' },
      { card: null, role: 'member', state: 'requested' },
    ],
    cursor: 'next',
  });
  const out = await listGroupMembers('g1', { cursor: 'c0', limit: 10 });
  expect(callCommunity).toHaveBeenCalledWith('community_group_members', {
    _group_id: 'g1', _cursor: 'c0', _limit: 10,
  });
  expect(out.members).toHaveLength(1);
  expect(out.members[0]).toEqual({ card: { user_id: 'u2', handle: 'rowan' }, role: 'admin', state: 'member' });
  expect(out.cursor).toBe('next');
});

test('searchGroups never calls the RPC below 2 characters', async () => {
  const out = await searchGroups('a');
  expect(callCommunity).not.toHaveBeenCalled();
  expect(out).toEqual({ groups: [] });
});

test('searchGroups calls community_group_search with _q/_limit and normalises rows', async () => {
  callCommunity.mockResolvedValueOnce({ groups: [CARD] });
  const out = await searchGroups('  iron  ', { limit: 10 });
  expect(callCommunity).toHaveBeenCalledWith('community_group_search', { _q: 'iron', _limit: 10 });
  expect(out.groups).toHaveLength(1);
  expect(out.groups[0].id).toBe('g1');
});

test('loadGroupFeed reads the RPC posts key into {rows, cursor}', async () => {
  callCommunity.mockResolvedValueOnce({
    posts: [{ post: { id: 'p1' }, author: { user_id: 'u2' }, my_reaction: true }],
    cursor: 'next',
  });
  const out = await loadGroupFeed('g1', { cursor: 'c0', limit: 10 });
  expect(callCommunity).toHaveBeenCalledWith('community_group_feed', {
    _group_id: 'g1', _cursor: 'c0', _limit: 10,
  });
  expect(out.rows).toEqual([{ post: { id: 'p1' }, author: { user_id: 'u2' }, myReaction: true }]);
  expect(out.cursor).toBe('next');
});

test('loadGroupFeed drops a row with no post', async () => {
  callCommunity.mockResolvedValueOnce({ posts: [{ post: null }, { post: { id: 'p2' } }] });
  const out = await loadGroupFeed('g1');
  expect(out.rows).toHaveLength(1);
  expect(out.rows[0].post.id).toBe('p2');
});
