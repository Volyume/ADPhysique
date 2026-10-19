/**
 * Growth telemetry helpers (founder brief 2026-10-19): the small, shared
 * pieces screens use so the same thing is always measured the same way.
 *
 *  - trackNow: send an event for whoever is signed in.
 *  - trackFeatureSeen: a feature's first sighting, once per person.
 *  - trackOncePerDay: at most once a day per key (setup cards).
 *  - experimentVariant: a deterministic A/B arm from the person's id, with
 *    the exposure recorded once per test.
 *  - errorShown / helpOpened: the friction and confusion signals, tagged
 *    with the screen the person is on.
 *
 * Every payload still passes the schema in the transport.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from '../engineTelemetry';
import { currentScreen } from './session';

function currentUserId() {
  try {
    // eslint-disable-next-line global-require
    return require('../../store/useAppStore').default.getState()?.user?.id ?? null;
  } catch (_) {
    return null;
  }
}

/** Send `event` for the signed-in person (nothing when signed out). */
export function trackNow(event, payload = null) {
  const uid = currentUserId();
  if (!uid) return;
  Promise.resolve(track(uid, event, payload)).catch(() => {});
}

async function once(key, fn) {
  try {
    if (await AsyncStorage.getItem(key)) return;
    await AsyncStorage.setItem(key, String(Date.now()));
  } catch (_) {
    return; // no storage, no repeat risk taken: skip rather than flood
  }
  fn();
}

/** A feature's first sighting, once per person per feature. */
export function trackFeatureSeen(feature) {
  const uid = currentUserId();
  if (!uid || !feature) return;
  once(`@volyume_tfeature_${uid}_${feature}`, () => trackNow('feature_seen', { feature }));
}

const dayKey = (now = new Date()) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

/** At most one `event` a day per `key`. */
export function trackOncePerDay(event, payload, key) {
  const uid = currentUserId();
  if (!uid) return;
  once(`@volyume_tday_${uid}_${event}_${key}_${dayKey()}`, () => trackNow(event, payload));
}

// FNV-1a: a stable, uniform 32-bit hash; the same id always lands in the
// same arm, on every device.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const ARMS = ['a', 'b', 'c', 'd'];

/**
 * The person's arm in `experiment` ('a' to 'd', `arms` of them), stable
 * across devices. Records `experiment_exposed` the first time it is asked.
 * Signed out: 'a', unrecorded.
 */
export function experimentVariant(experiment, arms = 2, userId = currentUserId()) {
  const n = Math.max(2, Math.min(ARMS.length, arms));
  if (!userId) return 'a';
  const variant = ARMS[hash(`${experiment}:${userId}`) % n];
  once(`@volyume_texp_${userId}_${experiment}`, () => trackNow('experiment_exposed', { experiment, variant }));
  return variant;
}

/** The person saw a failure. `kind`: toast, alert or error_view. */
export function errorShown(kind) {
  trackNow('error_shown', { screen: currentScreen(), kind });
}

/** An explanation was opened (a glossary or tooltip key). */
export function helpOpened(topic) {
  trackNow('help_opened', { topic, screen: currentScreen() });
}

export const __test = { hash, dayKey };
