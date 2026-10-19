/**
 * The pending gym-challenge code (gym challenge SPEC section 2, steps 2 to 5).
 *
 * A code arrives before the person can join: from a link opened while signed
 * out, or from the Google Play install referrer on first launch. It is kept
 * on the device until the join screen has dealt with it (joined or "Not now"),
 * so it survives sign-in and the Article 9 consent gate, which is never
 * skipped or reordered. Device-local only; the code is a public challenge
 * code, not personal data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logError } from '../errorLog';

export const PENDING_CHALLENGE_KEY = '@volyume_pending_challenge';
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
    notify(c);
    return true;
  } catch (e) {
    logError('Challenges.setPending', e);
    return false;
  }
}

/** The pending code without clearing it, or null. */
export async function peekPendingChallenge() {
  try {
    return normaliseChallengeCode(await AsyncStorage.getItem(PENDING_CHALLENGE_KEY));
  } catch (e) {
    logError('Challenges.peekPending', e);
    return null;
  }
}

/** The pending code, cleared as it is read, or null. */
export async function takePendingChallenge() {
  const c = await peekPendingChallenge();
  try {
    await AsyncStorage.removeItem(PENDING_CHALLENGE_KEY);
  } catch (e) {
    logError('Challenges.takePending', e);
  }
  if (c) notify(null);
  return c;
}

/** Clear without reading (the "Not now" path). */
export async function clearPendingChallenge() {
  try {
    await AsyncStorage.removeItem(PENDING_CHALLENGE_KEY);
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
export function readInstallReferrerOnce() {
  if (referrerPromise) return referrerPromise;
  referrerPromise = (async () => {
    if (Platform.OS !== 'android') return null;
    try {
      if (await AsyncStorage.getItem(REFERRER_READ_KEY)) return null;
      await AsyncStorage.setItem(REFERRER_READ_KEY, '1');
      // eslint-disable-next-line global-require
      const Application = require('expo-application');
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

export const CHALLENGE_ACTIVE_KEY = '@volyume_challenge_active';

/** Remember on this device that the person is in a challenge (set by the
 * join screen; read by StartChoice for its coaching note). Best effort. */
export async function setChallengeActiveFlag() {
  try {
    await AsyncStorage.setItem(CHALLENGE_ACTIVE_KEY, '1');
  } catch (e) {
    logError('Challenges.setActiveFlag', e);
  }
}

export async function hasChallengeActiveFlag() {
  try {
    return (await AsyncStorage.getItem(CHALLENGE_ACTIVE_KEY)) === '1';
  } catch (e) {
    logError('Challenges.hasActiveFlag', e);
    return false;
  }
}
