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
import { allowedBeforeConsent } from './schema';

function currentUserId() {
  try {
    // eslint-disable-next-line global-require
    return require('../../store/useAppStore').default.getState()?.user?.id ?? null;
  } catch (_) {
    return null;
  }
}

// Failures and slowness before sign-in (founder: "if something is failing or
// slow before that appears I want to know"). Only the preConsent events
// (performance, failure, lifecycle; no health data) are held, at most
// SIGNED_OUT_CAP of them, and sent once someone signs in on this phone.
const SIGNED_OUT_KEY = '@volyume_telemetry_signed_out';
const SIGNED_OUT_CAP = 20;

// When the hold is full, these two kinds are worth more than the rest: a
// stall or a failure replaces the OLDEST screen_viewed or screen_ready.
const HOLD_PRIORITY = new Set(['setup_stage_stalled', 'error_shown']);
const HOLD_REPLACEABLE = new Set(['screen_viewed', 'screen_ready']);

// Adversarial review M5. Every write to and read of the hold goes through ONE
// in-memory promise chain, so two events in the same tick are never lost to a
// read-modify-write race on AsyncStorage.
let _holdChain = Promise.resolve();
function serialiseHold(task) {
  const run = _holdChain.then(task);
  _holdChain = run.catch(() => {});
  return run;
}

// "Something may be held." True at start-up until the first check, true again
// the moment anything is held, false once a check finds the hold empty, so a
// signed-in trackNow skips the AsyncStorage read when nothing is waiting.
// _pendingHolds counts hold writes queued but not yet finished, so a check
// that finds the hold empty cannot clear the flag over a write still to come.
let _mayHold = true;
let _pendingHolds = 0;

// LB-9: a person who has turned usage data off has nothing held on the phone.
// Fails closed: if the opt-out state cannot be read, nothing is held.
function usageDataOn() {
  try {
    // eslint-disable-next-line global-require
    return require('./transport').isTelemetryEnabled() !== false;
  } catch (_) {
    return false;
  }
}

function holdSignedOut(event, payload) {
  if (!usageDataOn()) return Promise.resolve();
  _mayHold = true;
  _pendingHolds += 1;
  return serialiseHold(async () => {
    try {
      const held = JSON.parse((await AsyncStorage.getItem(SIGNED_OUT_KEY)) || '[]');
      if (held.length >= SIGNED_OUT_CAP) {
        // Full: a stall or a failure replaces the oldest screen view or
        // screen-ready; anything else is dropped.
        if (!HOLD_PRIORITY.has(event)) return;
        const at = held.findIndex((h) => HOLD_REPLACEABLE.has(h.event));
        if (at === -1) return;
        held.splice(at, 1);
      }
      held.push({ event, payload });
      await AsyncStorage.setItem(SIGNED_OUT_KEY, JSON.stringify(held));
    } catch (_) { /* best effort */ } finally {
      _pendingHolds -= 1;
    }
  }).catch(() => {});
}

// One shared send of the held events, so every event that arrives while it
// runs waits for it and the timeline keeps its order.
let _heldSend = null;
function sendHeld(uid) {
  if (_heldSend) return _heldSend;
  if (!_mayHold) return Promise.resolve();
  _heldSend = serialiseHold(async () => {
    try {
      const raw = await AsyncStorage.getItem(SIGNED_OUT_KEY);
      if (raw) {
        await AsyncStorage.removeItem(SIGNED_OUT_KEY);
        JSON.parse(raw).forEach(({ event, payload }) => {
          Promise.resolve(track(uid, event, payload)).catch(() => {});
        });
      }
      // The hold is now empty, unless a hold write is still queued behind us.
      _mayHold = _pendingHolds > 0;
    } catch (_) {
      _mayHold = true; // could not look: something may still be held
    }
  }).catch(() => {}).finally(() => { _heldSend = null; });
  return _heldSend;
}

/**
 * Send `event` for the signed-in person. Signed out, a preConsent event is
 * held on the phone and sent at the next signed-in event; anything else is
 * dropped.
 */
export function trackNow(event, payload = null) {
  const uid = currentUserId();
  if (!uid) {
    if (allowedBeforeConsent(event)) holdSignedOut(event, payload);
    return;
  }
  // Anything held from before sign-in goes first.
  sendHeld(uid)
    .then(() => track(uid, event, payload))
    .catch(() => {});
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

export const __test = {
  hash, dayKey, SIGNED_OUT_KEY, SIGNED_OUT_CAP,
  mayHold: () => _mayHold,
  idle: () => _holdChain,
  reset: () => { _mayHold = true; _pendingHolds = 0; _holdChain = Promise.resolve(); _heldSend = null; },
};
