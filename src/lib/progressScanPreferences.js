import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROGRESS_SCAN_HIDE_EXACT_KEY = '@volyume_progress_scan_hide_exact_numbers';
export const PROGRESS_SCAN_CAMERA_FACING_KEY = '@volyume_progress_scan_camera_facing';
export const PROGRESS_SCAN_TIMER_SECONDS_KEY = '@volyume_progress_scan_timer_seconds';
// Wave 3 (results-ui-and-copy-blueprint.md §1): the recalibration note and the
// meaning moment each render at most once. Both flags are device-local
// preferences, same fail-soft pattern as the rest of this module (a failed
// read/write never blocks scan use).
export const PROGRESS_SCAN_RECALIBRATION_SEEN_KEY = '@volyume_progress_scan_recalibration_seen_ids';
export const PROGRESS_SCAN_MEANING_MOMENT_SEEN_KEY = '@volyume_progress_scan_meaning_moment_seen';
const RECALIBRATION_SEEN_ID_CAP = 500;

export function normaliseProgressScanCameraFacing(value) {
  return value === 'front' || value === 'back' ? value : 'back';
}

export function normaliseProgressScanTimerSeconds(value) {
  const n = Number(value);
  return [0, 5, 10].includes(n) ? n : 0;
}

export async function getProgressScanHideExactPreference() {
  try {
    const stored = await AsyncStorage.getItem(PROGRESS_SCAN_HIDE_EXACT_KEY);
    if (stored == null) return true;
    return stored === 'true';
  } catch (_) {
    return true;
  }
}

export async function setProgressScanHideExactPreference(hidden) {
  try {
    await AsyncStorage.setItem(PROGRESS_SCAN_HIDE_EXACT_KEY, hidden ? 'true' : 'false');
  } catch (_) {
    // Device preference only. A failed write must not block scan use.
  }
}

export async function getProgressScanCapturePreferences() {
  try {
    const [cameraFacing, timerSeconds] = await Promise.all([
      AsyncStorage.getItem(PROGRESS_SCAN_CAMERA_FACING_KEY),
      AsyncStorage.getItem(PROGRESS_SCAN_TIMER_SECONDS_KEY),
    ]);
    return {
      cameraFacing: normaliseProgressScanCameraFacing(cameraFacing),
      timerSeconds: normaliseProgressScanTimerSeconds(timerSeconds),
    };
  } catch (_) {
    return { cameraFacing: 'back', timerSeconds: 0 };
  }
}

export async function setProgressScanCameraFacingPreference(cameraFacing) {
  try {
    await AsyncStorage.setItem(
      PROGRESS_SCAN_CAMERA_FACING_KEY,
      normaliseProgressScanCameraFacing(cameraFacing),
    );
  } catch (_) {
    // Device preference only. A failed write must not block scan use.
  }
}

export async function setProgressScanTimerPreference(timerSeconds) {
  try {
    await AsyncStorage.setItem(
      PROGRESS_SCAN_TIMER_SECONDS_KEY,
      String(normaliseProgressScanTimerSeconds(timerSeconds)),
    );
  } catch (_) {
    // Device preference only. A failed write must not block scan use.
  }
}

// Pure reducer (unit-testable without AsyncStorage): appends a scan id once,
// bounded so the stored list cannot grow without limit across a long-lived
// install.
export function nextSeenRecalibrationIds(seenIds = [], scanId) {
  const list = Array.isArray(seenIds) ? seenIds : [];
  if (!scanId || list.includes(scanId)) return list;
  return [...list, scanId].slice(-RECALIBRATION_SEEN_ID_CAP);
}

export async function getSeenRecalibrationScanIds() {
  try {
    const stored = await AsyncStorage.getItem(PROGRESS_SCAN_RECALIBRATION_SEEN_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export async function markRecalibrationNoteSeen(scanId) {
  if (!scanId) return;
  try {
    const seen = await getSeenRecalibrationScanIds();
    const next = nextSeenRecalibrationIds(seen, scanId);
    if (next === seen) return;
    await AsyncStorage.setItem(PROGRESS_SCAN_RECALIBRATION_SEEN_KEY, JSON.stringify(next));
  } catch (_) {
    // Device preference only. A failed write must not block scan use.
  }
}

export async function getProgressScanMeaningMomentSeen() {
  try {
    return (await AsyncStorage.getItem(PROGRESS_SCAN_MEANING_MOMENT_SEEN_KEY)) === 'true';
  } catch (_) {
    return false;
  }
}

export async function setProgressScanMeaningMomentSeen() {
  try {
    await AsyncStorage.setItem(PROGRESS_SCAN_MEANING_MOMENT_SEEN_KEY, 'true');
  } catch (_) {
    // Device preference only. A failed write must not block scan use.
  }
}
