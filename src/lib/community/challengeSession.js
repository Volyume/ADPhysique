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
 * Best effort and never throws. RETRY: the sync queue (`syncQueue.js`)
 * dispatches a closed list of op types to named sync functions, so it cannot
 * carry this RPC; a call that fails (offline, a day outside the server's
 * two-day window) is not retried. Reported to the lead as a STOP item for
 * the retry only.
 */

import { listMyGroups } from './groups';
import { logChallengeSession } from './challenges';
import { consistencyGateState } from './trainingConsistency';
import { readCachedMe, hasProfile } from './profile';

/**
 * @param {string} uid
 * @param {string} sessionKey the local workout uid
 * @param {string} loggedOn the local-day key the session was done on
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
    const rows = await listMyGroups();
    const ids = [...new Set(rows
      .filter((r) => r.state === 'member' && r.activeChallengeId)
      .map((r) => r.activeChallengeId))];
    for (const id of ids) {
      out.attempted += 1;
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await logChallengeSession(id, sessionKey, loggedOn);
        if (res.logged) out.logged += 1;
      } catch (_e) { /* best effort; see the RETRY note above */ }
    }
  } catch (_e) { /* best effort: never part of finishing a session */ }
  return out;
}
