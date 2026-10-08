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
import { localDayKey, addLocalCalendarDays } from '../dayKey';

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

/** The lengths the create sheet offers, in days. All are inside the 31-day cap. */
export const CHALLENGE_LENGTH_CHOICES = Object.freeze([7, 14, 28]);

/**
 * The window a create-sheet choice means, as local-day keys: a start of
 * 'today' or 'tomorrow' and a length in days (7, 14 or 28). Pure given `now`.
 * The server needs `ends_on` after `starts_on` and at most 31 days on; every
 * choice here is.
 *
 * @param {{start?: ('today'|'tomorrow'), days?: number, now?: number}} [opts]
 * @returns {{startsOn: string, endsOn: string}}
 */
export function challengeWindow({ start = 'today', days = 7, now = Date.now() } = {}) {
  const length = CHALLENGE_LENGTH_CHOICES.includes(days) ? days : 7;
  const startDate = addLocalCalendarDays(now, start === 'tomorrow' ? 1 : 0);
  const endDate = addLocalCalendarDays(startDate, length);
  return { startsOn: localDayKey(startDate.getTime()), endsOn: localDayKey(endDate.getTime()) };
}

/** "5 days left", "Last day", "Ends today" never needed: 0 left reads as the last day. */
export function challengeDaysLine(daysRemaining) {
  const n = Number(daysRemaining) || 0;
  if (n <= 0) return 'Last day';
  return n === 1 ? '1 day left' : `${n} days left`;
}

/** "12 of 30 sessions" with a target, "12 sessions" without. Sessions only. */
export function challengeTotalLine(total, target = null) {
  const n = Number(total) || 0;
  const noun = n === 1 ? 'session' : 'sessions';
  return target ? `${n} of ${target} sessions` : `${n} ${noun}`;
}

/** The calm line for a challenge write that did not land. */
export function challengeFailureLine(code) {
  if (code === 'offline') return 'You are offline. Try again when you have a connection.';
  if (code === 'not_allowed') return 'Only a group admin can do that, and a group has one challenge at a time.';
  if (code === 'content_not_allowed') return 'Some of that wording is not allowed in Community. Please reword it.';
  if (code === 'invalid_input') return 'Check the name and the number of sessions, then try again.';
  return 'Could not do that just now.';
}
