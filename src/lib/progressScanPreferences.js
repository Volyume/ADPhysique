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

// Launch capture defaults (founder 2026-07-12): a NEW user meets the
// self-facing (front) camera with a 5-second timer, so they can prop the phone,
// step back into full-body framing and see themselves before the shot. This is
// also capture-consistency-positive: the back camera hides the framing, so the
// body is more likely to be cropped or inconsistently placed between sets, and
// the Volyume Score depends on consistent framing. An explicit user choice
// (including timer 0 = "no timer") is always preserved; only a never-set or
// corrupt value falls to these defaults.
export const PROGRESS_SCAN_DEFAULT_CAMERA_FACING = 'front';
export const PROGRESS_SCAN_DEFAULT_TIMER_SECONDS = 5;

export function normaliseProgressScanCameraFacing(value) {
  return value === 'front' || value === 'back' ? value : PROGRESS_SCAN_DEFAULT_CAMERA_FACING;
}

export function normaliseProgressScanTimerSeconds(value) {
  const n = Number(value);
  return [0, 5, 10].includes(n) ? n : PROGRESS_SCAN_DEFAULT_TIMER_SECONDS;
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
      // Guard null (never set) BEFORE normalising: Number(null) === 0, so an
      // unset timer would otherwise be indistinguishable from an explicit
      // "no timer (0)". Unset -> launch default; any stored value is normalised
      // and preserved (including an explicit 0).
      cameraFacing: cameraFacing == null
        ? PROGRESS_SCAN_DEFAULT_CAMERA_FACING
        : normaliseProgressScanCameraFacing(cameraFacing),
      timerSeconds: timerSeconds == null
        ? PROGRESS_SCAN_DEFAULT_TIMER_SECONDS
        : normaliseProgressScanTimerSeconds(timerSeconds),
    };
  } catch (_) {
    return {
      cameraFacing: PROGRESS_SCAN_DEFAULT_CAMERA_FACING,
      timerSeconds: PROGRESS_SCAN_DEFAULT_TIMER_SECONDS,
    };
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
