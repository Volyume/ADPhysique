/**
 * COMP-019 Stage 2 — the shared-store bridge for home-screen widgets.
 *
 * The widget binaries read a small JSON snapshot from a shared store the app
 * writes (blueprint §"Data pipeline"): iOS App Group via the existing
 * `live-activity` native module (modules/live-activity, reused rather than a
 * new dependency — CP-2, design-usability-audit-2026-07-09), Android via
 * react-native-android-widget's storage. This adapter hides the native
 * module behind a lazy require so the JS unit tests, Expo Go, and any build
 * without the native targets degrade to a benign no-op (the snapshot writer
 * must never throw on a device that lacks the extension).
 *
 * The snapshot is the ONLY thing that crosses the boundary — keep widget code
 * dumb so logic fixes ship OTA in snapshot.js / writer.js, never the binary.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Must match the literal the native side uses: LiveActivityModule.swift's
// "writeWidgetSnapshot" (UserDefaults suiteName) and the entitlement the
// config plugin writes for both targets (app.json ios.entitlements,
// plugins/withVolyumeWidget.js).
const APP_GROUP = 'group.app.volyume.widget';
const SNAPSHOT_KEY = 'widget_snapshot_v1';
// AsyncStorage lives in the app sandbox, which the Android headless widget task
// handler can read — so it is the canonical snapshot the Android widget renders.
export const WIDGET_SNAPSHOT_ASYNC_KEY = '@volyume_widget_snapshot_v1';
const ANDROID_WIDGETS = ['NextSession', 'WeeklyConsistency'];

// Lazy, defensive native require. Absent module (Android, Expo Go, a build
// predating the widget extension) -> null -> no-op. `live-activity` is
// already a first-party dependency (package.json "live-activity":
// "file:./modules/live-activity"), not a new one.
function iosWidgetBridge() {
  try {
    // eslint-disable-next-line global-require
    return require('live-activity') || null;
  } catch (_) { return null; }
}
function androidWidgetApi() {
  try {
    // eslint-disable-next-line global-require
    return require('react-native-android-widget') || null;
  } catch (_) { return null; }
}

/**
 * Persist the snapshot to the platform shared store and ask the OS to reload
 * the widget timelines. Returns true if it reached a native store, false on the
 * benign no-op path. Never throws.
 */
export async function persistWidgetSnapshot(snapshot) {
  const json = JSON.stringify(snapshot);
  // Always stash a sandbox copy the Android widget task handler reads.
  try { await AsyncStorage.setItem(WIDGET_SNAPSHOT_ASYNC_KEY, json); } catch (_) { /* best-effort */ }
  try {
    if (Platform.OS === 'ios') {
      const bridge = iosWidgetBridge();
      if (!bridge || typeof bridge.writeWidgetSnapshot !== 'function') return false;
      // The native side writes into APP_GROUP/SNAPSHOT_KEY and reloads every
      // placed widget timeline itself (LiveActivityModule.swift).
      return await bridge.writeWidgetSnapshot(json);
    }
    if (Platform.OS === 'android') {
      const api = androidWidgetApi();
      if (!api) return false;
      // The Android library persists per-widget; write the snapshot then nudge
      // each widget to re-render from it.
      if (api.setWidgetPreferences) {
        await api.setWidgetPreferences({ [SNAPSHOT_KEY]: json });
      }
      if (api.requestWidgetUpdate) {
        for (const name of ANDROID_WIDGETS) {
          try { await api.requestWidgetUpdate({ widgetName: name }); } catch (_) { /* widget not placed */ }
        }
      }
      return true;
    }
  } catch (_) {
    // A device without the extension, or a transient native error, must never
    // fail the wider write — the snapshot is a best-effort glanceable.
  }
  return false;
}

export const _internals = { APP_GROUP, SNAPSHOT_KEY, ANDROID_WIDGETS };
