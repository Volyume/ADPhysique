/**
 * attribution.js — C8 phase 1 (founder-accepted marketing sequence,
 * 2026-07-11): coarse first-touch acquisition attribution.
 *
 * Scope is deliberately minimal: an incoming deep link may carry a
 * marketing source token (?src=... or ?utm_source=...); the FIRST one
 * ever seen is persisted device-locally and attached, as a short enum-ish
 * token, to the one activation event that answers the central marketing
 * question ("which source produced someone who actually completed a
 * workout?") - first_workout_logged.
 *
 * Explicitly OUT of scope for phase 1 (recorded in the founder's
 * sequencing message): no advertising SDK, no fingerprinting, no native
 * Install Referrer dependency, no attribution platform. First-write-wins,
 * so later links never overwrite the acquisition source.
 *
 * Privacy: the token is sanitised to a lowercase [a-z0-9_-] slug capped at
 * 32 characters - never a raw URL, never a click id, no PII. Storage is
 * AsyncStorage (device-local, same scope as the telemetry firsts flags).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_TOUCH_KEY = '@volyume_first_touch_source';

// In-memory cache so the hot workout-completion path never awaits storage.
let cached; // undefined = not loaded yet; null = loaded, none recorded

/** Extract and sanitise a source token from a deep-link URL. */
export function parseSourceFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  // Tolerant of custom schemes (volyume://...) that URL() may reject.
  const match = url.match(/[?&](?:src|utm_source)=([^&#]+)/i);
  if (!match) return null;
  let raw;
  try {
    raw = decodeURIComponent(match[1]);
  } catch (_) {
    raw = match[1];
  }
  const slug = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  return slug || null;
}

/**
 * Record the first-touch source from an incoming URL. First-write-wins;
 * a later link never overwrites. Best-effort, never throws.
 */
export async function captureFirstTouch(url) {
  const source = parseSourceFromUrl(url);
  if (!source) return;
  try {
    const existing = await AsyncStorage.getItem(FIRST_TOUCH_KEY);
    if (existing) { cached = existing; return; }
    await AsyncStorage.setItem(FIRST_TOUCH_KEY, source);
    cached = source;
  } catch (_) { /* best effort - attribution is never worth a crash */ }
}

/**
 * The recorded first-touch source, or null. Synchronous once warmed;
 * callers on hot paths should call warmFirstTouch() at startup.
 */
export function getFirstTouchSource() {
  return cached ?? null;
}

/** Load the persisted value into the in-memory cache. Never throws. */
export async function warmFirstTouch() {
  if (cached !== undefined) return cached;
  try {
    cached = await AsyncStorage.getItem(FIRST_TOUCH_KEY);
  } catch (_) {
    cached = null;
  }
  return cached;
}
