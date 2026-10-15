/**
 * The first automatic post waits for one confirmation (D228 item 1, option B).
 *
 * Sharing is on by default and to everyone (D194 addendum 2, which stands).
 * What changes is the FIRST time it is about to act: the workout summary asks
 * once, "Share this session?", and names the audience (Everyone, People who
 * follow me, or Not now). Until the person has answered with an audience,
 * nothing is posted automatically: not from the summary, and not from the
 * queue the Hub and the app foreground flush.
 *
 * The confirmation is one device key per person, and it FAILS CLOSED. A key
 * that cannot be read answers "not confirmed", so a storage fault can only
 * ever hold a post back; it can never release one. Only the exact stored
 * value '1' confirms. "Not now" writes nothing, so the question returns at
 * the next finished workout.
 *
 * Device-recorded rather than server-recorded on purpose: it records that the
 * person has seen and answered the question, not their sharing consent, which
 * is `share_sessions` and `sessions_audience` and travels to the server
 * through `saveShareSessions` the moment they answer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_POST_CONFIRMED_PREFIX = '@volyume_community_first_post_confirmed_';

/** The audiences the sheet can write, in the order its buttons show them.
 * A minor is offered only the second (the server holds a minor to followers). */
export const FIRST_POST_AUDIENCES = Object.freeze(['everyone', 'followers']);

export function firstPostConfirmedKey(uid) {
  return `${FIRST_POST_CONFIRMED_PREFIX}${uid}`;
}

/** Has this person answered the first-post question? An unreadable key, a
 * missing account id or any value other than '1' reads as NOT confirmed. */
export async function readFirstPostConfirmed(uid) {
  if (!uid) return false;
  try {
    return (await AsyncStorage.getItem(firstPostConfirmedKey(uid))) === '1';
  } catch (_e) {
    return false;
  }
}

/** Record the confirmation. Never throws. Answers whether the key was
 * written; a failed write leaves the person unconfirmed, so the question
 * returns, which is the closed direction. */
export async function markFirstPostConfirmed(uid) {
  if (!uid) return false;
  try {
    await AsyncStorage.setItem(firstPostConfirmedKey(uid), '1');
    return true;
  } catch (_e) {
    return false;
  }
}
