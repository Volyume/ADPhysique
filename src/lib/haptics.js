/**
 * haptics.js
 * Named haptic vocabulary so the rest of the app calls intent, not
 * vibration types. A central place to tune feel + respect reduce-motion.
 *
 * Each event is mapped to a specific tactile signature. The intent
 * (setLogged, prAchieved, restDone, error...) reads at the callsite
 * and the actual feedback type lives here, where it's easy to refine.
 *
 * Honours the user's "reduce motion" accessibility preference: when
 * on, all haptics no-op so a sensitive user gets a quiet experience.
 *
 * All helpers are safe to await OR fire-and-forget. They never throw.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import useAppStore from '../store/useAppStore';

function reduceMotion() {
  try { return !!useAppStore.getState().accessibility?.reduceMotion; }
  catch (_) { return false; }
}

// ─── D17: richer iOS curves (research docs/ux-world-class-audit-2026-07-09/
// core-haptics-research.md, decision D17) ──────────────────────────────────
//
// react-native-haptic-feedback's triggerPattern() gives real Core Haptics
// transient/continuous events (time, intensity, sharpness) authored directly
// in JS, no .ahap files, no native-project editing. Scope is exactly the two
// named high-emotion moments below; every other haptic in the app stays on
// expo-haptics untouched. Android has no equivalent amplitude/sharpness
// composition parity, so it keeps the existing discrete-vibration ladders
// unconditionally; iOS only reaches for the richer curve, and falls straight
// back to the same ladder if the library isn't there or a call throws.

/** Lazily resolves the native module, iOS only. Returns null on Android (so
 *  Android never even attempts the require) and null if the module fails to
 *  load for any reason (not linked, native build missing it, etc.) — either
 *  way the caller falls back to the legacy expo-haptics ladder. */
function getRichHaptics() {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line global-require
    const mod = require('react-native-haptic-feedback');
    return (mod && mod.triggerPattern) ? mod : null;
  } catch (_) {
    return null;
  }
}

/** Rest-timer completion, iOS rich curve: a soft rumble that rises across
 *  three short continuous beats and settles into one calm confirming tap.
 *  Telegraphs "rest is ending" before landing, rather than a flat on/off
 *  beep — calm precision, not a jolt. */
export const REST_DONE_PATTERN_IOS = [
  { time: 0, type: 'continuous', duration: 90, intensity: 0.18, sharpness: 0.15 },
  { time: 90, type: 'continuous', duration: 90, intensity: 0.32, sharpness: 0.2 },
  { time: 180, type: 'continuous', duration: 110, intensity: 0.48, sharpness: 0.3 },
  { time: 300, type: 'transient', intensity: 0.7, sharpness: 0.4 },
];

/** PR celebration, iOS rich curve: two peaks bridged by a brief soft
 *  connector, the second peak brighter/sharper than the first. Brighter than
 *  the rest-done signature (this moment earns it) but still restrained —
 *  precision, not confetti. */
export const PR_ACHIEVED_PATTERN_IOS = [
  { time: 0, type: 'transient', intensity: 0.6, sharpness: 0.5 },
  { time: 140, type: 'continuous', duration: 60, intensity: 0.4, sharpness: 0.35 },
  { time: 260, type: 'transient', intensity: 0.85, sharpness: 0.6 },
];

async function _impact(style) {
  if (reduceMotion()) return;
  try { await Haptics.impactAsync(style); } catch (_) {}
}

async function _notify(type) {
  if (reduceMotion()) return;
  try { await Haptics.notificationAsync(type); } catch (_) {}
}

async function _selection() {
  if (reduceMotion()) return;
  try { await Haptics.selectionAsync(); } catch (_) {}
}

// ─── Event vocabulary ─────────────────────────────────────────────────

/** Logging a working set. Soft confirmation, not loud. */
export function setLogged() { return _impact(Haptics.ImpactFeedbackStyle.Light); }

/** Logging a warm-up set. Even softer than a working set. */
export function warmupLogged() { return _selection(); }

/** Personal record: the celebration ladder. Success note plus two heavy
 *  beats — the exact signature PRCelebration shipped inline (D2 moved it
 *  here so the vocabulary is the single tuning point). D17: on iOS, when
 *  react-native-haptic-feedback is available, plays the richer two-peak
 *  curve instead; Android and any load/call failure keep this ladder. */
export async function prAchieved() {
  if (reduceMotion()) return;
  const rich = getRichHaptics();
  if (rich) {
    try {
      rich.triggerPattern(PR_ACHIEVED_PATTERN_IOS);
      return;
    } catch (_) { /* fall through to the legacy ladder below */ }
  }
  await _notify(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 150);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 300);
}

/** Rest timer finished: the GO beat. Success note plus two heavy pulses —
 *  the exact signature RestTimer shipped inline (D2 moved it here so the
 *  reduce-motion gate finally covers it). D17: on iOS, when
 *  react-native-haptic-feedback is available, plays the richer settle-swell
 *  curve instead; Android and any load/call failure keep this ladder. */
export async function restDone() {
  if (reduceMotion()) return;
  const rich = getRichHaptics();
  if (rich) {
    try {
      rich.triggerPattern(REST_DONE_PATTERN_IOS);
      return;
    } catch (_) { /* fall through to the legacy ladder below */ }
  }
  await _notify(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 200);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 400);
}

/** Rest timer about to end (3s warning). */
export function restAlmostDone() { return _impact(Haptics.ImpactFeedbackStyle.Light); }

/** Rest countdown tick. Escalates 3 -> 2 -> 1 so the user can feel which
 *  tick they're on without looking (RestTimer's shipped ladder, centralised
 *  so reduce-motion silences it). */
export function restCountdown(stage) {
  if (stage === 3) return _impact(Haptics.ImpactFeedbackStyle.Medium);
  if (stage === 2) return _impact(Haptics.ImpactFeedbackStyle.Heavy);
  return Promise.all([
    _impact(Haptics.ImpactFeedbackStyle.Heavy),
    _notify(Haptics.NotificationFeedbackType.Warning),
  ]);
}

/** Plan generated / setup complete. Single success note (D2). */
export function planReady() { return _notify(Haptics.NotificationFeedbackType.Success); }

/** A small UI selection: picker change, toggle, tap-to-confirm. */
export function selection() { return _selection(); }

/** Pressing a primary action button. */
export function press() { return _impact(Haptics.ImpactFeedbackStyle.Light); }

/** Workout completed end-to-end. Long success burst. */
export async function workoutComplete() {
  await _notify(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 150);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 320);
}

/** Error / blocked action. Warning notification. */
export function error() { return _notify(Haptics.NotificationFeedbackType.Warning); }

/** Toggling something off / undo. Heavier than selection so the user
 *  feels a "commit" beat that's distinct from a casual swipe. */
export function commit() { return _impact(Haptics.ImpactFeedbackStyle.Medium); }
