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
import useAppStore from '../store/useAppStore';

function reduceMotion() {
  try { return !!useAppStore.getState().accessibility?.reduceMotion; }
  catch (_) { return false; }
}

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
 *  here so the vocabulary is the single tuning point). */
export async function prAchieved() {
  await _notify(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 150);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 300);
}

/** Rest timer finished: the GO beat. Success note plus two heavy pulses —
 *  the exact signature RestTimer shipped inline (D2 moved it here so the
 *  reduce-motion gate finally covers it). */
export async function restDone() {
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
