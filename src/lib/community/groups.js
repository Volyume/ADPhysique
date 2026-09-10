/**
 * Community groups (community product audit
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 3; server contract `supabase/migrate_165_community_boards_
 * groups.sql` Part 6-10, sixteen `community_group_*` RPCs plus
 * `community_group_feed`).
 *
 * Every wrapper goes through `callCommunity` (the transport's three gates
 * and error mapping) -- this module never touches the network directly.
 * Minors are refused SERVER-SIDE on create/join/invite/accept; callers
 * additionally fail closed on the cached `me.is_minor` before ever
 * reaching these wrappers (screens do that check, not this module, so it
 * stays a thin RPC layer).
 */

import { callCommunity } from './transport';

export const GROUP_NAME_MAX = 40;
export const GROUP_BLURB_MAX = 140;

export const GROUP_ACCESS = Object.freeze({ open: 'Open', invite: 'Invite only' });
export const GROUP_ACCESS_ORDER = Object.freeze(['open', 'invite']);

/** One row's card, as `_community_group_card` returns it. */
function normaliseGroup(g) {
  if (!g?.id) return null;
  return {
    id: g.id,
    name: g.name ?? '',
    blurb: g.blurb ?? null,
    access: g.access ?? 'open',
    createdBy: g.created_by ?? null,
    memberCount: Number.isFinite(Number(g.member_count)) ? Number(g.member_count) : 0,
    status: g.status ?? 'active',
    createdAt: g.created_at ?? null,
    // Phase 3 ("Together this week": `22-MIGRATION-170A-CONTRACT.md` Part
    // B, `community_group_get`). Only `community_group_get` ever returns
    // these three; every other RPC this file wraps (`community_group_
    // create`/`_update`/`_close`/`_list_mine`/`_search`) simply omits
    // them, and `Number.isFinite` reads that absence as `null` here too --
    // the SAME shape the server uses for a non-member of an invite-only
    // group (stripped alongside `member_count`/`blurb`), so `togetherLine`
    // below renders no line at all for either case, never a false zero.
    togetherSessionsWeek: Number.isFinite(Number(g.together_sessions_week))
      ? Number(g.together_sessions_week) : null,
    togetherPlannedWeek: Number.isFinite(Number(g.together_planned_week))
      ? Number(g.together_planned_week) : null,
    sharingMembers: Number.isFinite(Number(g.sharing_members)) ? Number(g.sharing_members) : null,
  };
}

/**
 * The group page's "Together this week" line (phase3 spec section 4;
 * blueprint section 6). Cooperative, never per-member, never red.
 *
 * - Any of the three fields missing (a non-member of an invite-only
 *   group, or an RPC that never carries them) answers `null`: no line at
 *   all, not a claim about a group the caller cannot see the shape of.
 * - Nobody sharing (`sharingMembers === 0`): the fixed line "Together:
 *   nothing shared yet", regardless of the other two numbers.
 * - Nobody who shares has a plan (`togetherPlannedWeek === 0`, even
 *   though sessions may be > 0): the planned figure is OMITTED rather
 *   than rendering "0 of 0" or a stray zero denominator --
 *   "Together: 11 sessions this week · 6 of 8 sharing".
 * - Otherwise: "Together: 11 of 16 planned sessions this week · 6 of 8
 *   sharing".
 *
 * @param {{togetherSessionsWeek: (number|null), togetherPlannedWeek: (number|null),
 *   sharingMembers: (number|null), memberCount?: number}} group
 * @returns {string|null}
 */
export function togetherLine(group) {
  const sessions = group?.togetherSessionsWeek;
  const planned = group?.togetherPlannedWeek;
  const sharing = group?.sharingMembers;
  if (sessions == null || planned == null || sharing == null) return null;
  if (sharing === 0) return 'Together: nothing shared yet';
  const memberCount = Number.isFinite(Number(group?.memberCount)) ? Number(group.memberCount) : sharing;
  const sessionsPart = planned > 0
    ? `${sessions} of ${planned} planned session${planned === 1 ? '' : 's'} this week`
    : `${sessions} session${sessions === 1 ? '' : 's'} this week`;
  return `Together: ${sessionsPart} · ${sharing} of ${memberCount} sharing`;
}

/**
 * Create a group. Minors refused server-side.
 * @param {{name: string, blurb?: string, access?: 'open'|'invite'}} input
 * @returns {Promise<object>} the group card
 */
export async function createGroup({ name, blurb = null, access = 'open' }) {
  const data = await callCommunity('community_group_create', {
    _name: name, _blurb: blurb || null, _access: access,
  });
  return normaliseGroup(data);
}

/** Admin-only. Any field omitted (null) leaves it unchanged. */
export async function updateGroup(groupId, { name = null, blurb = null, access = null } = {}) {
  const data = await callCommunity('community_group_update', {
    _group_id: groupId, _name: name, _blurb: blurb, _access: access,
  });
  return normaliseGroup(data);
}

/** Admin-only. A closed group stays readable to its existing members. */
export async function closeGroup(groupId) {
  const data = await callCommunity('community_group_close', { _group_id: groupId });
  return normaliseGroup(data);
}

/** The last admin cannot leave without promoting someone else first
 * (raises `last_admin`). */
export async function leaveGroup(groupId) {
  const data = await callCommunity('community_group_leave', { _group_id: groupId });
  return { left: !!data?.left };
}

/**
 * Join a group. Open groups admit directly ('member'); invite-only
 * groups queue a request ('requested'). Minors refused server-side.
 * @returns {Promise<{state: 'member'|'requested'}>}
 */
export async function joinGroup(groupId) {
  const data = await callCommunity('community_group_join', { _group_id: groupId });
  return { state: data?.state ?? null };
}

/** Admin-only: approve a pending join request. */
export async function approveGroupRequest(groupId, userId) {
  const data = await callCommunity('community_group_approve', { _group_id: groupId, _user_id: userId });
  return { approved: !!data?.approved };
}

/** Admin-only: remove a member. Refuses on the last admin (`last_admin`)
 * and on removing yourself (`invalid_input` -- use leaveGroup instead). */
export async function removeGroupMember(groupId, userId) {
  const data = await callCommunity('community_group_remove', { _group_id: groupId, _user_id: userId });
  return { removed: !!data?.removed };
}

/** Admin-only: make another member an admin. */
export async function promoteGroupMember(groupId, userId) {
  const data = await callCommunity('community_group_promote', { _group_id: groupId, _user_id: userId });
  return { promoted: !!data?.promoted };
}

/** Admin-only: invite by handle. The invitee lands in 'invited' state
 * until they accept. */
export async function inviteToGroup(groupId, handle) {
  const data = await callCommunity('community_group_invite', {
    _group_id: groupId, _handle: String(handle || '').trim().toLowerCase(),
  });
  return { invited: data?.invited ?? null };
}

/** Admin-only: mint a share link token (14-day expiry). */
export async function createGroupInviteLink(groupId) {
  const data = await callCommunity('community_group_invite_link', { _group_id: groupId });
  return { token: data?.token ?? null, expiresAt: data?.expires_at ?? null };
}

/**
 * Accept an invite, by token (share link) or by an existing pending
 * 'invited' row for this group (invite-by-handle). Minors refused
 * server-side.
 */
export async function acceptGroupInvite({ token = null, groupId = null } = {}) {
  const data = await callCommunity('community_group_accept_invite', {
    _token: token, _group_id: groupId,
  });
  return normaliseGroup(data);
}

/** The caller's own groups, most recently joined first. */
export async function listMyGroups() {
  const data = await callCommunity('community_group_list_mine', {});
  const rows = Array.isArray(data?.groups) ? data.groups : [];
  return rows.map((row) => ({
    group: normaliseGroup(row.group),
    role: row.role ?? null,
    state: row.state ?? null,
  })).filter((row) => !!row.group);
}

/**
 * One group's header. `myRole`/`myState` are null for a non-member. An
 * invite-only group withholds `blurb`/`memberCount` from a non-member
 * (server-side, design 60 §3) -- this only passes what came back.
 */
export async function getGroup(groupId) {
  const data = await callCommunity('community_group_get', { _group_id: groupId });
  if (!data?.id) return null;
  return {
    ...normaliseGroup(data),
    myRole: data.my_role ?? null,
    myState: data.my_state ?? null,
  };
}

/**
 * The roster, keyset paged. Requests appear only for an admin caller
 * (the approval queue); an ordinary member never sees them.
 */
export async function listGroupMembers(groupId, { cursor = null, limit = 20 } = {}) {
  const data = await callCommunity('community_group_members', {
    _group_id: groupId, _cursor: cursor, _limit: limit,
  });
  const members = Array.isArray(data?.members) ? data.members : [];
  return {
    members: members.map((m) => ({
      card: m.card, role: m.role ?? 'member', state: m.state ?? 'member',
    })).filter((m) => !!m.card),
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
  };
}

/** Open-group name-prefix search ("Find a group"). Fewer than 2 characters
 * answers empty without a round trip, matching `findPeople`'s own floor. */
export async function searchGroups(query, { limit = 20 } = {}) {
  const q = String(query ?? '').trim();
  if (q.length < 2) return { groups: [] };
  const data = await callCommunity('community_group_search', { _q: q, _limit: limit });
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  return { groups: groups.map(normaliseGroup).filter(Boolean) };
}

/** The group's board via `community_board` scope `group`; screens pass
 * this straight to `loadBoard({ scope: 'group', scopeKey: groupId })`
 * rather than through this module, so this file names it only in
 * documentation, not as a wrapper (`boards.js` already owns that RPC). */

/** The members' visible stories, chronological, members only. */
export async function loadGroupFeed(groupId, { cursor = null, limit = 20 } = {}) {
  const data = await callCommunity('community_group_feed', {
    _group_id: groupId, _cursor: cursor, _limit: limit,
  });
  const rows = Array.isArray(data?.rows ?? data?.posts) ? (data.rows ?? data.posts) : [];
  return {
    rows: rows.map((row) => ({
      post: row.post, author: row.author, myReaction: !!row.my_reaction,
    })).filter((row) => !!row.post),
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
  };
}
