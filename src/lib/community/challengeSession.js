/**
 * The logger's half of session-count challenges (D221 Stage 3, 3c): when a
 * workout is finished, log it into every active challenge of the person's
 * groups with the local workout uid as `session_key`, so a repeat is
 * harmless (the server is idempotent on the key).
 *
 * Gate: the same one the consistency surfaces use (calm mode, an open ED
 * flag, a minor, no profile all stop it). The figure logged is a session,
 * and only a session: the key and the day, nothing about load or the body.
 *
 * Best effort and never throws. RETRY (round 3R): the ids come from the
 * server (`community_group_active_challenges`, via `challenges.js`) and are
 * cached on the device, so an offline finish still knows which challenges to
 * log into. A call that fails for a network-shaped reason is queued as a
 * `challenge_session` op in `syncQueue.js`; the op carries only
 * `challengeId`, `sessionKey` and `loggedOn`. A challenge that has not
 * started yet (its first day is after the session's day) is not logged into.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadActiveChallengeIds, logChallengeSession, challengeHasStarted, isRetryableChallengeError,
} from './challenges';
import { consistencyGateState } from './trainingConsistency';
import { readCachedMe, hasProfile } from './profile';
import { enqueueSyncOp } from '../syncQueue';

const CACHE_PREFIX = '@volyume_community_active_challenges_';

async function activeChallenges(uid) {
  try {
    const rows = await loadActiveChallengeIds();
    try { await AsyncStorage.setItem(`${CACHE_PREFIX}${uid}`, JSON.stringify(rows)); } catch (_e) { /* cache only */ }
    return rows;
  } catch (_e) {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${uid}`);
      const rows = raw ? JSON.parse(raw) : [];
      return Array.isArray(rows) ? rows : [];
    } catch (_e2) { return []; }
  }
}

/**
 * @param {string} uid
 * @param {string} sessionKey the local workout uid
 * @param {string} loggedOn the local-day key of the workout's own start day
 * @returns {Promise<{attempted: number, logged: number}>}
 */
export async function logFinishedSessionToChallenges(uid, sessionKey, loggedOn) {
  const out = { attempted: 0, logged: 0 };
  if (!uid || !sessionKey || !loggedOn) return out;
  try {
    const me = await readCachedMe(uid).catch(() => null);
    if (!me || !hasProfile(me) || me.is_minor) return out;
    const { allowed } = await consistencyGateState(uid, true);
    if (!allowed) return out;
    const rows = await activeChallenges(uid);
    const ids = [...new Set(rows
      .filter((r) => r?.id && challengeHasStarted(r.startsOn, loggedOn))
      .map((r) => r.id))];
    for (const id of ids) {
      out.attempted += 1;
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await logChallengeSession(id, sessionKey, loggedOn);
        if (res.logged) out.logged += 1;
      } catch (e) {
        if (isRetryableChallengeError(e)) {
          // eslint-disable-next-line no-await-in-loop
          await enqueueSyncOp('challenge_session', sessionKey, uid,
            { challengeId: id, sessionKey, loggedOn });
        }
      }
    }
  } catch (_e) { /* best effort: never part of finishing a session */ }
  return out;
}
