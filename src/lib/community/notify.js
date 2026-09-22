/**
 * Community push hand-off (blueprint section 4; SD-15).
 *
 * The actor tells the server that something happened; the server decides
 * whether a push is allowed to leave. It re-verifies that the caller
 * really is the actor of a matching row, checks the recipient's block
 * list, checks their notification category preference, and checks their
 * open ED flag exactly as `partner-cheer` does, FAILING CLOSED to in-app
 * only on any read error. None of that is decided here, and none of it
 * can be skipped by a client that does not call this.
 *
 * Which is why this is best effort and nothing waits on it: the activity
 * row is written by the RPC that caused it, so the recipient already has
 * the record. A missing push is a missed convenience, never lost data,
 * and a failure here must never turn a successful follow into an error
 * the user sees.
 */

import { invokeCommunityFunction } from './transport';

export const COMMUNITY_NOTIFY_KINDS = Object.freeze([
  'follow', 'follow_request', 'follow_accepted', 'reaction', 'comment',
  // Discovery campaign (blueprint sections 1, 2; SD-20, SD-21). `message`
  // is the one kind the server collapses on a clock: at most one push per
  // conversation every 15 minutes while it is unread, read from
  // `community_conversations.last_message_at` and the recipient's own read
  // time. The push body is "New message from @handle" and NEVER the
  // content, so a locked screen cannot leak a conversation.
  'connect_request', 'connect_accepted', 'message',
  // RE-ANCHORED 2026-09-22 (founder order item 1, "wire the pushes"; B-09):
  // this was an eight-kind list. `community-notify` (migrate_165, design
  // 60 §3) has supported these three group kinds server-side since they
  // shipped -- `pushCopy`/`categoryFor` already handle all three -- but no
  // client call site ever named them, so the client's own allow-list
  // silently dropped any future attempt to notify on a group event before
  // it ever reached the edge function. `group_request`/`group_invited`
  // fan out from the join/invite RPCs; `group_accepted` from the approval
  // one. All three ride the community_follow category budget, same as the
  // connection kinds above (index.ts categoryFor).
  'group_request', 'group_accepted', 'group_invited',
]);

/**
 * @param {string} kind one of COMMUNITY_NOTIFY_KINDS
 * @param {string} targetUserId the recipient
 * @param {string|null} refId the row the notification is about
 * @returns {void} deliberately not awaited by callers
 */
export function notifyCommunityEvent(kind, targetUserId, refId = null) {
  if (!COMMUNITY_NOTIFY_KINDS.includes(kind) || !targetUserId) return;
  invokeCommunityFunction('community-notify', {
    kind, target_user_id: targetUserId, ref_id: refId,
  }).catch(() => {
    // Best effort by design: the in-app activity row is the record, and
    // the server is the only thing allowed to decide whether a push may
    // be sent. A failure here is silent on purpose.
  });
}
