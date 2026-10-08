/**
 * Group chat (D221 ruling 4, Stage 3 spec 3b; server `supabase/migrate_191_
 * community_stage3_presence_groups_challenges.sql` Part 5).
 *
 * The push is requested best-effort with the new message's id (target null);
 * the server decides who, and whether. Text only, members only, 1 to 500 characters. The keyword filter runs
 * here before a doomed round trip and again on the server, which is the
 * authority; a block or mute hides the sender from the person who blocked
 * or muted them, server-side. Nothing here reads or writes the push: the
 * `group_message` push (no content, 15-minute collapse per group) is the
 * `community-notify` function's decision.
 */

import { callCommunity, CommunityError } from './transport';
import { cleanText } from './validation';
import { notifyCommunityEvent } from './notify';

export const GROUP_MESSAGE_MAX = 500;
export const GROUP_CHAT_PAGE_SIZE = 30;

/**
 * One page of messages, newest first (the server's order).
 *
 * @returns {Promise<{messages: Array, cursor: (string|null)}>}
 * @throws {CommunityError} 'not_allowed' (not a member)
 */
export async function loadGroupMessages(groupId, { cursor = null, limit = GROUP_CHAT_PAGE_SIZE } = {}) {
  if (!groupId) throw new CommunityError('invalid_input');
  const data = await callCommunity('community_group_messages', {
    _group_id: groupId, _cursor: cursor, _limit: limit,
  });
  return {
    messages: Array.isArray(data?.messages) ? data.messages : [],
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
  };
}

/**
 * @throws {CommunityError} 'invalid_input' (empty or over 500 characters),
 *   'content_not_allowed' (keyword filter), 'not_allowed' (not a member or a
 *   closed group), 'rate_limited'.
 * @returns {Promise<{message: (object|null)}>}
 */
export async function sendGroupMessage(groupId, body) {
  if (!groupId) throw new CommunityError('invalid_input');
  const cleaned = cleanText(body, GROUP_MESSAGE_MAX);
  if (!cleaned.ok) {
    throw new CommunityError(
      cleaned.reason === 'content_not_allowed' ? 'content_not_allowed' : 'invalid_input',
    );
  }
  const data = await callCommunity('community_group_send_message', {
    _group_id: groupId, _body: cleaned.value,
  });
  const message = data?.message ?? null;
  // Best effort, never awaited: the server resolves the recipients from the
  // message id and applies every push rule per recipient.
  if (message?.id) notifyCommunityEvent('group_message', null, message.id);
  return { message };
}

/** The author, or a group admin. Anyone else gets `not_found`. */
export async function deleteGroupMessage(id) {
  if (!id) throw new CommunityError('invalid_input');
  return callCommunity('community_group_message_delete', { _id: id });
}

/** Clears the group's unread count for the caller. */
export async function markGroupRead(groupId) {
  if (!groupId) throw new CommunityError('invalid_input');
  return callCommunity('community_group_mark_read', { _group_id: groupId });
}
