/**
 * live-activity
 *
 * iOS Live Activity / Dynamic Island integration for the Volyume rest
 * timer. The native side calls Apple's ActivityKit to drive a system
 * widget that ticks down the rest interval on the lock screen and in
 * the Dynamic Island without the app being foregrounded.
 *
 * On Android (and Expo Go on either platform) the native module is
 * unavailable so isAvailable() returns false and every API method
 * silently no-ops. Callers don't need a platform branch — fire-and-
 * forget is safe everywhere.
 *
 * Lifecycle:
 *   - startRestActivity() called when the user logs a set and the
 *     rest timer starts. Posts a new Live Activity with the
 *     exercise name + end timestamp.
 *   - updateRestActivity() can adjust the end time (±15s / ±30s
 *     buttons in the app) — the system widget reflects the change.
 *   - endRestActivity() dismisses the Live Activity when the user
 *     stops the timer or the rest finishes.
 *
 * The Live Activity widget extension itself (the SwiftUI view, the
 * Dynamic Island presentations, the activity attributes) lives in
 * ios/widget/. To make the Live Activity actually appear in a build,
 * a Widget Extension target needs to be added to the Xcode project
 * with the widget Swift files copied in — see ios/widget/README.md
 * for the step-by-step. Until that target exists, this module
 * compiles and links but Activity.request() throws and the Live
 * Activity never appears. The Android chronometer (rest-timer-live)
 * remains the lock-screen surface in the meantime.
 */

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

type StartOptions = {
  exerciseName: string;
  workoutName?: string;
  setNumber?: number;
  totalSets?: number;
  endTimeMs: number;
};

type UpdateOptions = {
  endTimeMs: number;
};

type NativeShape = {
  isSupported(): boolean;
  start(options: StartOptions): Promise<string | null>;
  update(activityId: string, options: UpdateOptions): Promise<boolean>;
  end(activityId: string): Promise<void>;
  endAll(): Promise<void>;
};

let nativeModule: NativeShape | null = null;
try {
  nativeModule = requireNativeModule<NativeShape>('LiveActivityModule');
} catch (_e) {
  nativeModule = null;
}

let currentActivityId: string | null = null;

/**
 * True only on iOS 16.1+ where the native module is bundled AND
 * ActivityKit reports the device supports Live Activities (user
 * hasn't disabled them in Settings → Volyume → Live Activities).
 */
export function isAvailable(): boolean {
  return Platform.OS === 'ios' && nativeModule !== null && (nativeModule.isSupported?.() ?? false);
}

/**
 * Post a new rest-timer Live Activity. If one is already running it
 * is ended first so we never accumulate multiple Activities for the
 * same workout. Returns the new activity id on success.
 */
export async function startRestActivity(options: StartOptions): Promise<string | null> {
  if (!isAvailable()) return null;
  if (currentActivityId) {
    try { await nativeModule!.end(currentActivityId); } catch (_e) { /* tolerate */ }
    currentActivityId = null;
  }
  try {
    const id = await nativeModule!.start(options);
    currentActivityId = id;
    return id;
  } catch (_e) {
    currentActivityId = null;
    return null;
  }
}

/**
 * Update the end time of the running Live Activity (e.g. user added
 * 30 seconds to their rest). No-op if there's no active Activity.
 */
export async function updateRestActivity(options: UpdateOptions): Promise<boolean> {
  if (!isAvailable() || !currentActivityId) return false;
  try {
    return await nativeModule!.update(currentActivityId, options);
  } catch (_e) {
    return false;
  }
}

/**
 * End the running rest-timer Live Activity. Safe to call when nothing
 * is running.
 */
export async function endRestActivity(): Promise<void> {
  if (!isAvailable()) return;
  const id = currentActivityId;
  currentActivityId = null;
  if (!id) return;
  try { await nativeModule!.end(id); } catch (_e) { /* tolerate */ }
}

/**
 * End every Live Activity Volyume currently owns. Used on app
 * launch to clear stale Activities left over from a previous run.
 */
export async function endAllActivities(): Promise<void> {
  if (!isAvailable()) return;
  currentActivityId = null;
  try { await nativeModule!.endAll(); } catch (_e) { /* tolerate */ }
}
