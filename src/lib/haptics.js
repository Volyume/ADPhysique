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

/** Personal record. Success notification + a beat of heavy impact. */
export async function prAchieved() {
  await _notify(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 120);
}

/** Rest timer finished. Medium impact, then a heavier one. */
export async function restDone() {
  await _impact(Haptics.ImpactFeedbackStyle.Medium);
  setTimeout(() => _impact(Haptics.ImpactFeedbackStyle.Heavy), 200);
}

/** Rest timer about to end (3s warning). */
export function restAlmostDone() { return _impact(Haptics.ImpactFeedbackStyle.Light); }

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
