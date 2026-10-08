/**
 * Session-count challenges (D221 ruling 4, Stage 3 spec 3c; server
 * `supabase/migrate_191_community_stage3_presence_groups_challenges.sql`
 * Part 7).
 *
 * One active challenge per group. The only figure anywhere is a count of
 * sessions: no load, no body figure, no food figure. The board is withheld
 * (null) for a viewer the migrate_180 consistency gate withholds, and the
 * client also checks `consistencyGateState` before showing it.
 */

import { callCommunity, CommunityError } from './transport';

export const CHALLENGE_NAME_MAX = 40;
export const CHALLENGE_MAX_DAYS = 31;
export const CHALLENGE_TARGET_MAX = 200;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function normaliseChallenge(c) {
  if (!c?.id) return null;
  return {
    id: c.id,
    groupId: c.group_id ?? null,
    name: c.name ?? '',
    startsOn: c.starts_on ?? null,
    endsOn: c.ends_on ?? null,
    targetSessions: Number.isFinite(Number(c.target_sessions)) && c.target_sessions !== null
      ? Number(c.target_sessions) : null,
    status: c.status ?? 'active',
  };
}

/**
 * Admin only. Dates are local-day keys (YYYY-MM-DD).
 *
 * @throws {CommunityError} 'invalid_input', 'not_allowed' (not an admin, or
 *   a challenge is already active), 'content_not_allowed'.
 * @returns {Promise<object|null>}
 */
export async function createChallenge(groupId, { name, startsOn, endsOn, target = null }) {
  const trimmed = String(name ?? '').trim();
  if (!groupId || !trimmed || trimmed.length > CHALLENGE_NAME_MAX
      || !DAY_RE.test(String(startsOn ?? '')) || !DAY_RE.test(String(endsOn ?? ''))) {
    throw new CommunityError('invalid_input');
  }
  if (target !== null && target !== undefined
      && !(Number.isInteger(target) && target >= 1 && target <= CHALLENGE_TARGET_MAX)) {
    throw new CommunityError('invalid_input');
  }
  const data = await callCommunity('community_challenge_create', {
    _group_id: groupId, _name: trimmed, _starts_on: startsOn, _ends_on: endsOn,
    _target: target ?? null,
  });
  return normaliseChallenge(data?.challenge);
}

/** Admin only; ending an ended challenge answers it unchanged. */
export async function endChallenge(id) {
  if (!id) throw new CommunityError('invalid_input');
  const data = await callCommunity('community_challenge_end', { _id: id });
  return normaliseChallenge(data?.challenge);
}

/**
 * Log one finished session. Idempotent on `sessionKey` (the local workout
 * uid), so a retry from the sync queue is safe. The day must lie inside the
 * challenge window and within 2 days of today (server-checked).
 *
 * @returns {Promise<{logged: boolean, isNew: boolean}>}
 */
export async function logChallengeSession(challengeId, sessionKey, loggedOn) {
  if (!challengeId || !sessionKey || !DAY_RE.test(String(loggedOn ?? ''))) {
    throw new CommunityError('invalid_input');
  }
  const data = await callCommunity('community_challenge_log_session', {
    _challenge_id: challengeId, _session_key: String(sessionKey), _logged_on: loggedOn,
  });
  return { logged: !!data?.logged, isNew: !!data?.new };
}

/**
 * The board, or null when the server withheld it (calm mode or an open ED
 * flag). Members are `{userId, handle, displayName, avatarPreset, sessions,
 * me}`; the caller's own row comes first.
 *
 * @returns {Promise<{challenge: object, groupTotal: number,
 *   daysRemaining: number, members: Array}|null>}
 */
export async function loadChallengeBoard(challengeId) {
  if (!challengeId) throw new CommunityError('invalid_input');
  const data = await callCommunity('community_challenge_board', { _challenge_id: challengeId });
  if (!data || typeof data !== 'object') return null;
  const members = (Array.isArray(data.members) ? data.members : []).map((m) => ({
    userId: m.user_id,
    handle: m.handle ?? null,
    displayName: m.display_name ?? '',
    avatarPreset: m.avatar_preset ?? null,
    sessions: Number(m.sessions) || 0,
    me: !!m.me,
  }));
  members.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0));
  return {
    challenge: normaliseChallenge(data.challenge),
    groupTotal: Number(data.group_total) || 0,
    daysRemaining: Number(data.days_remaining) || 0,
    members,
  };
}
