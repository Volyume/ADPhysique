/**
 * winbackState.js — COMP-025-A §4c/§4d
 *
 * The local bookkeeping for the post-churn win-back loop. Pure logic +
 * AsyncStorage; no billing calls, no entitlement decisions (those stay in
 * cascade.js). This module only answers "is there an open churn episode, and
 * may we lay the single win-back for it?".
 *
 * A "churn episode" opens on the FIRST authoritative lapse detection (a
 * server-confirmed / client-reconciled pro→free where the user was paid_pro —
 * never the stale-entitlement lockdown, never a trial auto-downgrade) and
 * closes when the user returns to Pro (fresh slate). It tracks:
 *   - lapseAt        the churn timestamp the win-back timing anchors on
 *   - reasonCaptured whether a cancel reason was already captured this episode
 *                    (so Moment 2 doesn't ask again)
 *   - winbackLaid    whether the single win-back notification has been laid
 *
 * Two hard rules enforced here (blueprint §4c "Single-shot rule"):
 *   1. ONE win-back per episode (winbackLaid).
 *   2. An absolute floor of one win-back per 180 days across episodes
 *      (lastFiredAt), so a serial canceller is never drip-fed.
 *
 * The stated-return answer (§4d temporary-break) is captured at cancel time —
 * BEFORE any episode exists — so it lives under its own key and is consumed
 * when the win-back is scheduled.
 *
 * Every function is async and never throws; on any storage error it degrades
 * to the safe default (no episode / cannot lay).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const EPISODE_KEY = '@volyume_winback_episode_v1';
const LAST_FIRED_KEY = '@volyume_winback_last_fired_v1';
const STATED_RETURN_KEY = '@volyume_winback_stated_return_v1';

const DAY_MS = 86400000;
// Absolute floor across episodes (§4c): never more than one win-back / 180 days.
export const WINBACK_FLOOR_MS = 180 * DAY_MS;
// Default delay from lapse to the single win-back (§4c).
export const DEFAULT_WINBACK_DELAY_DAYS = 30;
// §4d: a stated return shifts the single win-back to roughly when they said.
export const STATED_RETURN_DELAY_DAYS = Object.freeze({
  in_a_month: 30,
  two_three_months: 75,
  not_sure: 60,
});

// ─── Pure helpers (sync, exported for tests) ──────────────────────────────────

/**
 * The fire date for the single win-back: lapse + the stated-return delay, or
 * the +30-day default when no break window was stated.
 */
export function winbackFireDate(lapseAt, statedReturn = null) {
  const days = STATED_RETURN_DELAY_DAYS[statedReturn] ?? DEFAULT_WINBACK_DELAY_DAYS;
  return new Date(lapseAt + days * DAY_MS);
}

/**
 * May we lay the win-back right now? True only when an episode is open, its
 * win-back hasn't been laid, and the 180-day cross-episode floor has cleared.
 */
export function canLayWinback({ episode, lastFiredAt, now = Date.now() } = {}) {
  if (!episode || episode.winbackLaid) return false;
  if (typeof lastFiredAt === 'number' && now - lastFiredAt < WINBACK_FLOOR_MS) return false;
  return true;
}

// ─── AsyncStorage-backed state ────────────────────────────────────────────────

export async function getEpisode() {
  try {
    const raw = await AsyncStorage.getItem(EPISODE_KEY);
    if (!raw) return null;
    const ep = JSON.parse(raw);
    return (ep && typeof ep.lapseAt === 'number') ? ep : null;
  } catch (_) {
    return null;
  }
}

/**
 * Open a churn episode on the first authoritative lapse. Idempotent: if an
 * episode is already open it is preserved (the same churn, re-detected on a
 * later launch), and { opened: false } is returned.
 */
export async function openEpisode(lapseAt = Date.now()) {
  try {
    const existing = await getEpisode();
    if (existing) return { episode: existing, opened: false };
    const episode = { lapseAt, reasonCaptured: false, winbackLaid: false };
    await AsyncStorage.setItem(EPISODE_KEY, JSON.stringify(episode));
    return { episode, opened: true };
  } catch (_) {
    return { episode: null, opened: false };
  }
}

export async function markReasonCaptured() {
  try {
    const ep = await getEpisode();
    if (!ep || ep.reasonCaptured) return;
    ep.reasonCaptured = true;
    await AsyncStorage.setItem(EPISODE_KEY, JSON.stringify(ep));
  } catch (_) { /* tolerate */ }
}

export async function markWinbackLaid(now = Date.now()) {
  try {
    const ep = await getEpisode();
    if (ep && !ep.winbackLaid) {
      ep.winbackLaid = true;
      await AsyncStorage.setItem(EPISODE_KEY, JSON.stringify(ep));
    }
    // Record the cross-episode floor regardless, so the 180-day rule holds even
    // if the episode is later cleared by a return to Pro.
    await AsyncStorage.setItem(LAST_FIRED_KEY, String(now));
  } catch (_) { /* tolerate */ }
}

export async function getLastFiredAt() {
  try {
    const raw = await AsyncStorage.getItem(LAST_FIRED_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch (_) {
    return null;
  }
}

/**
 * Close the episode on a return to Pro — a fresh slate. The 180-day floor
 * (LAST_FIRED_KEY) is deliberately kept so it survives across episodes.
 */
export async function clearEpisode() {
  try {
    await AsyncStorage.removeItem(EPISODE_KEY);
    await AsyncStorage.removeItem(STATED_RETURN_KEY);
  } catch (_) { /* tolerate */ }
}

// §4d temporary-break stated return, captured at cancel time.
export async function setStatedReturn(key) {
  try {
    if (key && STATED_RETURN_DELAY_DAYS[key] != null) {
      await AsyncStorage.setItem(STATED_RETURN_KEY, key);
    }
  } catch (_) { /* tolerate */ }
}

export async function getStatedReturn() {
  try {
    const v = await AsyncStorage.getItem(STATED_RETURN_KEY);
    return (v && STATED_RETURN_DELAY_DAYS[v] != null) ? v : null;
  } catch (_) {
    return null;
  }
}
