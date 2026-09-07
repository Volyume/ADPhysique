/**
 * Messaging between connected people (discovery blueprint section 2;
 * SD-21, SD-31, SD-32).
 *
 * One-to-one text, and nothing else. No groups, no media, no read
 * receipts beyond an unread count, and nothing is ever pre-written or
 * sent on a person's behalf. A message may carry ONE context reference,
 * a training story, which the screen renders as the existing tile above
 * the text: that is how a conversation starts about something rather
 * than out of nowhere. (Programme references were removed with Community
 * programme-sharing, `docs/community-product-audit-2026-09-07/
 * 40-GAP-CLOSURE.md` §2.)
 *
 * This exists only because the connection graph now supplies the consent
 * gate the earlier ruling lacked (SD-21 reverses SD-12). So every send is
 * refused server-side unless the two people are connected
 * (`not_connected`), and under-18 accounts are refused outright
 * (`minor_restricted`, SD-32). Nothing here can grant either.
 *
 * The push carries no content. "New message from @handle", at most one
 * per conversation every 15 minutes while it is unread, decided entirely
 * by the server against the recipient's own preferences and the same
 * fail-closed wellbeing check every Community push takes.
 */

import { callCommunity, CommunityError } from './transport';
import { cleanText } from './validation';

export const DEFAULT_PAGE_SIZE = 30;

/** 1 to 1,000 characters. Long enough for a real answer, short enough
 * that a conversation stays a conversation. */
export const MESSAGE_MAX = 1000;

/** The thing a message may point at. */
export const MESSAGE_REF_KINDS = Object.freeze(['post', 'session']);

// ─── Session suggestion (community product audit 40-GAP-CLOSURE.md §1,
//     "Session planning after connecting" BUILD row; server Part 14) ────

/** Composer chip day chips, in list order, matching the server's
 * `_ref_payload.day` values exactly. */
export const SESSION_DAYS = Object.freeze([
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]);

/** Time band chips, day-order, never a clock time (SD-31). */
export const SESSION_TIME_BANDS = Object.freeze([
  { key: 'early', label: 'Early' }, { key: 'morning', label: 'Morning' },
  { key: 'midday', label: 'Midday' }, { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' }, { key: 'late', label: 'Late' },
]);

const SESSION_DAY_FULL = Object.freeze({
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
});
const SESSION_TIME_BAND_LABEL = Object.fromEntries(SESSION_TIME_BANDS.map((b) => [b.key, b.label]));

/**
 * The tile line for a session suggestion ("Thursday evening at PureGym
 * Motherwell" / "Thursday evening" with no gym / "Anywhere" when the
 * proposer picked no venue). `ref` is a session message's `.ref`
 * (`{day, time_band, gym_id, gym_name, accepted, responded_at}`).
 */
export function sessionTileLine(ref) {
  const day = SESSION_DAY_FULL[ref?.day] ?? '';
  const band = SESSION_TIME_BAND_LABEL[ref?.time_band]?.toLowerCase() ?? '';
  const when = [day, band].filter(Boolean).join(' ');
  const where = ref?.gym_name || 'Anywhere';
  return when ? `${when} at ${where}` : where;
}

/** The state line under a session tile once responded, else null (the
 * screen shows Accept / "Can't make it" instead). */
export function sessionStateLine(ref) {
  if (!ref || !('accepted' in ref) || ref.accepted === null || ref.accepted === undefined) return null;
  return ref.accepted ? 'Accepted' : 'Not this time';
}

/** @param {string} day one of `SESSION_DAYS` keys
 *  @param {string} timeBand one of `SESSION_TIME_BANDS` keys
 *  @param {string|null} [gymId] null/omitted means "Anywhere" */
export function buildSessionRefPayload(day, timeBand, gymId = null) {
  return { day, time_band: timeBand, gym_id: gymId || null };
}

/**
 * The composer's placeholder for the surface it was opened from. It is a
 * PROMPT, never a draft: the field is empty and the person writes their
 * own words (SD-21).
 *
 * @param {{kind?: string}|string|null} ref
 * @returns {string}
 */
export function placeholderFor(ref) {
  const kind = typeof ref === 'string' ? ref : (ref?.kind ?? ref?.refKind ?? ref?.ref_kind ?? null);
  if (kind === 'post') return 'Say something about this session';
  return 'Write a message';
}

/**
 * One page of conversations, newest activity first.
 *
 * There are no realtime subscriptions anywhere in this campaign: the list
 * is re-read on focus and on a push tap, which is enough for a text
 * conversation and keeps a socket off a training app.
 *
 * @returns {Promise<{conversations: Array, cursor: (string|null)}>}
 */
export async function listConversations({ cursor = null, limit = DEFAULT_PAGE_SIZE } = {}) {
  const data = await callCommunity('community_conversations', { _cursor: cursor, _limit: limit });
  const rows = data?.conversations;
  return {
    conversations: Array.isArray(rows) ? rows : [],
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
  };
}

/**
 * One page of messages in a conversation, newest first (the server's own
 * order, `created_at desc, id desc`).
 *
 * @returns {Promise<{messages: Array, cursor: (string|null)}>}
 */
export async function listMessages(conversationId, { cursor = null, limit = DEFAULT_PAGE_SIZE } = {}) {
  if (!conversationId) throw new CommunityError('invalid_input');
  const data = await callCommunity('community_messages', {
    _conversation_id: conversationId, _cursor: cursor, _limit: limit,
  });
  const rows = data?.messages;
  return {
    messages: Array.isArray(rows) ? rows : [],
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
  };
}

/**
 * Send one message, creating the conversation if this is the first.
 *
 * @param {string} targetUserId the connected person
 * @param {string} body 1 to MESSAGE_MAX characters
 * @param {{refKind?: string|null, refId?: string|null}} [ref] one context
 *   reference; an unknown kind or a kind without an id is dropped rather
 *   than sent, because a half reference renders as a broken tile.
 * @returns {Promise<{conversation_id: (string|null), message: (object|null)}>}
 * @throws {CommunityError} 'invalid_input' (no target, empty or over-long
 *   body), 'content_not_allowed' (keyword filter), 'not_connected',
 *   'minor_restricted', 'blocked', 'rate_limited'.
 */
export async function sendMessage(targetUserId, body, { refKind = null, refId = null, refPayload = null } = {}) {
  if (!targetUserId) throw new CommunityError('invalid_input');
  const cleaned = cleanText(body, MESSAGE_MAX);
  if (!cleaned.ok) {
    throw new CommunityError(
      cleaned.reason === 'content_not_allowed' ? 'content_not_allowed' : 'invalid_input',
    );
  }
  // 'session' carries no ref_id (nothing to look up server-side): its
  // whole reference is the validated payload, unlike 'post'/'programme'
  // which point at an existing row and are dropped without an id.
  const kind = MESSAGE_REF_KINDS.includes(refKind)
    && (refKind === 'session' ? !!refPayload : !!refId)
    ? refKind : null;
  const data = await callCommunity('community_send_message', {
    _target: targetUserId,
    _body: cleaned.value,
    _ref_kind: kind,
    _ref_id: kind && kind !== 'session' ? refId : null,
    _ref_payload: kind === 'session' ? refPayload : null,
  });
  return {
    conversation_id: data?.conversation_id ?? null,
    message: data?.message ?? null,
  };
}

/**
 * Respond to a proposed training session (migrate_164 Part 14). Once
 * only, party-checked server-side: the proposer cannot respond to their
 * own suggestion, and the response is final once made.
 *
 * @throws {CommunityError} 'invalid_input', 'not_found', 'not_allowed'
 *   (wrong party, or the sender responding to themself), 'already_responded'
 * @returns {Promise<{conversation_id: (string|null), message: (object|null)}>}
 */
export async function respondSession(messageId, accept) {
  if (!messageId) throw new CommunityError('invalid_input');
  const data = await callCommunity('community_respond_session', {
    _message_id: messageId, _accept: !!accept,
  });
  return {
    conversation_id: data?.conversation_id ?? null,
    message: data?.message ?? null,
  };
}

/** Mark this conversation read for the caller, which clears the unread
 * count and stops the 15 minute push collapse from firing again. */
export async function markRead(conversationId) {
  if (!conversationId) throw new CommunityError('invalid_input');
  return callCommunity('community_mark_conversation_read', { _conversation_id: conversationId });
}

/** Delete one of your own messages. A hard delete: it goes for both
 * people, because a message you can still see after the sender removed it
 * is not a deletion. */
export async function deleteMessage(id) {
  if (!id) throw new CommunityError('invalid_input');
  return callCommunity('community_delete_message', { _id: id });
}
