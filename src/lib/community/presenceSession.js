/**
 * The device half of presence (D221 ruling 4, Stage 3 spec 3a): what the
 * logger calls at session start, finish and discard, and the stale guard on
 * app foreground.
 *
 * `announceTraining(uid, on)` asks the server to show (or clear) the "training
 * now" marker, but only when the person has a Community profile, is not a
 * minor, the "Show when I am training" switch is on, and neither calm mode
 * nor an open ED flag is active (the same gate the consistency surfaces use).
 * A clear (`on === false`) is also sent when this device raised the marker, so
 * switching the setting off mid-session, or a gate arriving, never leaves a
 * stale marker behind.
 *
 * The server's `me` payload carries `show_training_now` (round 3R); the
 * device mirror (written by the privacy panel's setter, `saveShowTrainingNow`)
 * is what the logger reads at session start and the fallback for the panel. Every call is best effort and never throws:
 * presence is a convenience, never part of logging a session.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTrainingNow, setShowTrainingNow, TRAINING_NOW_STALE_MS } from './presence';
import { readCachedMe, hasProfile } from './profile';
import { consistencyGateState } from './trainingConsistency';

const SWITCH_PREFIX = '@volyume_community_show_training_now_';
const SINCE_PREFIX = '@volyume_community_training_now_since_';

export const showTrainingNowKey = (uid) => `${SWITCH_PREFIX}${uid ?? 'unknown'}`;
export const trainingNowSinceKey = (uid) => `${SINCE_PREFIX}${uid ?? 'unknown'}`;

/** The device's mirror of the switch. Unreadable means off. */
export async function readShowTrainingNow(uid) {
  try {
    return (await AsyncStorage.getItem(showTrainingNowKey(uid))) === 'true';
  } catch (_e) {
    return false;
  }
}

/**
 * The one setter for the switch (privacy panel). Server first, then the
 * device mirror, so the mirror never says on when the server refused.
 *
 * @throws {CommunityError} 'forbidden' (a minor), 'offline', restriction codes
 * @returns {Promise<boolean>} the stored state
 */
export async function saveShowTrainingNow(uid, on) {
  const out = await setShowTrainingNow(!!on);
  try {
    await AsyncStorage.setItem(showTrainingNowKey(uid), out.showTrainingNow ? 'true' : 'false');
    if (!out.showTrainingNow) await AsyncStorage.removeItem(trainingNowSinceKey(uid));
  } catch (_e) { /* the mirror is a convenience; the server holds the truth */ }
  return out.showTrainingNow;
}

/**
 * @param {string} uid
 * @param {boolean} on true at session start, false at finish or discard
 * @returns {Promise<{sent: boolean, reason: (string|null)}>}
 */
export async function announceTraining(uid, on) {
  if (!uid) return { sent: false, reason: 'no_user' };
  try {
    const raisedHere = !on && (await AsyncStorage.getItem(trainingNowSinceKey(uid))) != null;
    if (on || !raisedHere) {
      const me = await readCachedMe(uid).catch(() => null);
      if (!me || !hasProfile(me) || me.is_minor) return { sent: false, reason: 'no_profile' };
      if (!(await readShowTrainingNow(uid))) return { sent: false, reason: 'switch_off' };
      if (on) {
        const { allowed } = await consistencyGateState(uid, true);
        if (!allowed) return { sent: false, reason: 'gated' };
      }
    }
    await setTrainingNow(!!on);
    if (on) await AsyncStorage.setItem(trainingNowSinceKey(uid), String(Date.now()));
    else await AsyncStorage.removeItem(trainingNowSinceKey(uid));
    return { sent: true, reason: null };
  } catch (e) {
    return { sent: false, reason: e?.code ?? 'unavailable' };
  }
}

/**
 * The stale guard, run on app foreground: a marker this device raised more
 * than three hours ago is cleared (the server stops showing it after the
 * same three hours; this tidies the row). A no-op with no marker.
 */
export async function clearStaleTrainingNow(uid, nowMs = Date.now()) {
  if (!uid) return false;
  try {
    const raw = await AsyncStorage.getItem(trainingNowSinceKey(uid));
    const since = Number(raw);
    if (raw == null || !Number.isFinite(since) || nowMs - since < TRAINING_NOW_STALE_MS) return false;
    await setTrainingNow(false);
    await AsyncStorage.removeItem(trainingNowSinceKey(uid));
    return true;
  } catch (_e) {
    return false;
  }
}
