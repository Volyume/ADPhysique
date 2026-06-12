/**
 * watch-bridge — iOS WatchConnectivity (WCSession) bridge for the Apple Watch
 * set-logging companion (COMP-020).
 *
 * The phone is the source of truth; the watch is a durable remote. Two
 * directions:
 *   - STATE DOWN (phone -> watch): updateApplicationContext, latest-state-only
 *     semantics — exactly right for a mirror. Two payload kinds: a session
 *     SCRIPT (sent once at start / on structural change) and a CURSOR (sent on
 *     every change: current exercise, set counts, restTimerEndsAt). All strings
 *     are composed phone-side so the watch only ever RENDERS strings (the
 *     "Set 3 of 2" defect class is structurally impossible).
 *   - EVENTS UP (watch -> phone): the watch's durable queue delivers each
 *     action as an event { eventId, seq, type, payload }. The native side wakes
 *     the app and emits `onWatchEvent`; the JS coordinator applies it via the
 *     idempotent store action (applyRemoteSetEvent) and the native side acks.
 *
 * Off iOS (and in Expo Go / any build without the native module) every method
 * no-ops and isSupported() is false, so callers need no platform branch.
 */
import { Platform } from 'react-native';
import { requireNativeModule, EventEmitter } from 'expo-modules-core';

type SessionScript = {
  workoutId: string;
  scriptVersion: number;
  exercises: Array<{
    name: string;
    beatLine: string;        // "Last: 60 kg × 8 · Target 8–12" — composed phone-side
    restSeconds: number;
    prefillWeight: number;
    prefillReps: number;
  }>;
};

type Cursor = {
  stateVersion: number;
  currentExerciseIndex: number;
  setLine: string;           // "Set 2 of 4 next" — composed phone-side
  restTimerEndsAt: number | null;
};

export type WatchEvent = {
  eventId: string;
  seq: number;
  workoutId?: string;
  type: 'logSet' | 'skipRest' | 'extendRest';
  payload?: Record<string, unknown>;
};

let native: any = null;
try {
  if (Platform.OS === 'ios') native = requireNativeModule('WatchBridgeModule');
} catch (_) {
  native = null;
}

// Typed event map: without it expo-modules-core's EventEmitter defaults to
// Record<never, never> and addListener rejects every event name (TS2345).
type WatchBridgeEvents = {
  onWatchEvent: (e: WatchEvent) => void;
};

const emitter = native ? new EventEmitter<WatchBridgeEvents>(native) : null;

export function isSupported(): boolean {
  try { return !!native && native.isSupported(); } catch (_) { return false; }
}

/** Send the full session script (start / structural change). */
export async function sendSessionScript(script: SessionScript): Promise<void> {
  try { if (native) await native.sendContext({ kind: 'script', ...script }); } catch (_) { /* no-op */ }
}

/** Send the lightweight cursor (every change). */
export async function sendCursor(cursor: Cursor): Promise<void> {
  try { if (native) await native.sendContext({ kind: 'cursor', ...cursor }); } catch (_) { /* no-op */ }
}

/** Tell the watch the session ended (clears the wrist surface). */
export async function endSession(): Promise<void> {
  try { if (native) await native.sendContext({ kind: 'end' }); } catch (_) { /* no-op */ }
}

/** Subscribe to events delivered up from the watch. Returns an unsubscribe fn. */
export function addWatchEventListener(cb: (e: WatchEvent) => void): () => void {
  if (!emitter) return () => {};
  const sub = emitter.addListener('onWatchEvent', cb);
  return () => sub.remove();
}

/** Acknowledge an applied event so the watch can drop it from its queue. */
export async function ackWatchEvent(eventId: string): Promise<void> {
  try { if (native) await native.ackEvent(eventId); } catch (_) { /* no-op */ }
}
