/**
 * The pending gym-challenge code (gym challenge SPEC section 2, steps 2 to 5).
 *
 * A code arrives before the person can join: from a link opened while signed
 * out, or from the Google Play install referrer on first launch. It is kept
 * on the device until the join screen has dealt with it (joined or "Not now"),
 * so it survives sign-in and the Article 9 consent gate, which is never
 * skipped or reordered. Device-local only; the code is a public challenge
 * code, not personal data.
 *
 * A code belongs to whoever is signed in when it is first looked at (a code
 * that arrived while nobody was signed in is claimed by the first person who
 * signs in). If a different person signs in later, the code is dropped, so one
 * person's pending challenge is never offered to the next person on the device.
 * Sign-out also clears all of AsyncStorage; this holds when that did not run.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logError } from '../errorLog';

export const PENDING_CHALLENGE_KEY = '@volyume_pending_challenge';
export const PENDING_OWNER_KEY = '@volyume_pending_challenge_owner';
export const REFERRER_READ_KEY = '@volyume_install_referrer_read';

const CODE_RE = /^[a-z0-9-]{3,32}$/;

const listeners = new Set();
let referrerPromise = null;

/** Lower-case a code and return it only when it is a valid challenge code. */
export function normaliseChallengeCode(code) {
  if (typeof code !== 'string') return null;
  const c = code.trim().toLowerCase();
  return CODE_RE.test(c) ? c : null;
}

/** The signed-in user's id, or null (nobody signed in, or the store is not up yet). */
function currentUserId() {
  try {
    // Lazy require: the store imports modules that import this one.
    // eslint-disable-next-line global-require
    const id = require('../../store/useAppStore').default.getState().user?.id;
    return typeof id === 'string' && id ? id : null;
  } catch (_) {
    return null;
  }
}

function notify(code) {
  listeners.forEach((fn) => {
    try { fn(code); } catch (_) { /* a listener must never break storage */ }
  });
}

/** Subscribe to pending-code changes. Returns the unsubscribe function. */
export function subscribePendingChallenge(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Store a pending code. An invalid code is ignored. Never throws. */
export async function setPendingChallenge(code) {
  const c = normaliseChallengeCode(code);
  if (!c) return false;
  try {
    await AsyncStorage.setItem(PENDING_CHALLENGE_KEY, c);
    // Whoever is signed in now owns it; empty while nobody is.
    await AsyncStorage.setItem(PENDING_OWNER_KEY, currentUserId() ?? '');
    notify(c);
    return true;
  } catch (e) {
    logError('Challenges.setPending', e);
    return false;
  }
}

async function removePending() {
  await AsyncStorage.removeItem(PENDING_CHALLENGE_KEY);
  await AsyncStorage.removeItem(PENDING_OWNER_KEY);
}

/**
 * The pending code without clearing it, or null. A code owned by a different
 * signed-in user is cleared and reads as none; with nobody signed in there is
 * no verdict yet and the code stands; an unowned code is claimed by whoever is
 * signed in.
 */
export async function peekPendingChallenge() {
  try {
    const code = normaliseChallengeCode(await AsyncStorage.getItem(PENDING_CHALLENGE_KEY));
    if (!code) return null;
    const uid = currentUserId();
    if (!uid) return code;
    const owner = await AsyncStorage.getItem(PENDING_OWNER_KEY);
    if (owner && owner !== uid) {
      await removePending();
      notify(null);
      return null;
    }
    if (!owner) await AsyncStorage.setItem(PENDING_OWNER_KEY, uid);
    return code;
  } catch (e) {
    logError('Challenges.peekPending', e);
    return null;
  }
}

/** The pending code, cleared as it is read, or null. */
export async function takePendingChallenge() {
  const c = await peekPendingChallenge();
  try {
    await removePending();
  } catch (e) {
    logError('Challenges.takePending', e);
  }
  if (c) notify(null);
  return c;
}

/** Clear without reading (the "Not now" path). */
export async function clearPendingChallenge() {
  try {
    await removePending();
  } catch (e) {
    logError('Challenges.clearPending', e);
  }
  notify(null);
}

/** `challenge=<code>` out of a Play install referrer string, or null. */
export function parseChallengeFromReferrer(referrer) {
  if (typeof referrer !== 'string' || !referrer) return null;
  for (const part of referrer.split('&')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    let key;
    let value;
    try {
      key = decodeURIComponent(part.slice(0, eq));
      value = decodeURIComponent(part.slice(eq + 1));
    } catch (_) {
      continue;
    }
    if (key === 'challenge') return normaliseChallengeCode(value);
  }
  return null;
}

/**
 * Android only, once per install: read the Play install referrer and keep a
 * `challenge=<code>` value as the pending code. The once-flag is set before
 * the read so a crash or a slow Play service can never make it run twice.
 * The promise is shared, so the navigator can wait on the same read.
 * Failures are logged and ignored.
 */
// A challenge code from the install referrer counts only within 3 days of
// installing.
export const REFERRER_FRESH_MS = 3 * 24 * 60 * 60 * 1000;

export function readInstallReferrerOnce() {
  if (referrerPromise) return referrerPromise;
  referrerPromise = (async () => {
    if (Platform.OS !== 'android') return null;
    try {
      if (await AsyncStorage.getItem(REFERRER_READ_KEY)) return null;
      await AsyncStorage.setItem(REFERRER_READ_KEY, '1');
      // eslint-disable-next-line global-require
      const Application = require('expo-application');
      // The Play referrer stays with the install for ever, and a sign-out
      // wipes the read marker; only a fresh install carries a challenge, so a
      // later account on the same phone is never handed an old code.
      const installed = await Application.getInstallationTimeAsync();
      if (!installed || Date.now() - new Date(installed).getTime() > REFERRER_FRESH_MS) return null;
      const referrer = await Application.getInstallReferrerAsync();
      const code = parseChallengeFromReferrer(referrer);
      if (code) await setPendingChallenge(code);
      return code;
    } catch (e) {
      logError('Challenges.readInstallReferrer', e);
      return null;
    }
  })();
  return referrerPromise;
}

/** Test seam: forget the shared referrer promise and listeners. */
export function _resetPendingForTests() {
  referrerPromise = null;
  listeners.clear();
}

// One flag per person: another account on this device never reads it.
export const CHALLENGE_ACTIVE_KEY = (userId) => `@volyume_challenge_active_${userId}`;

/** Remember on this device that this person is in a challenge (set by the join
 * screen; read by StartChoice for its coaching note). Best effort. */
export async function setChallengeActiveFlag(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(CHALLENGE_ACTIVE_KEY(userId), '1');
  } catch (e) {
    logError('Challenges.setActiveFlag', e);
  }
}

export async function hasChallengeActiveFlag(userId) {
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(CHALLENGE_ACTIVE_KEY(userId))) === '1';
  } catch (e) {
    logError('Challenges.hasActiveFlag', e);
    return false;
  }
}
