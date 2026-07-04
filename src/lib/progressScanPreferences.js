import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROGRESS_SCAN_HIDE_EXACT_KEY = '@volyume_progress_scan_hide_exact_numbers';
export const PROGRESS_SCAN_CAMERA_FACING_KEY = '@volyume_progress_scan_camera_facing';
export const PROGRESS_SCAN_TIMER_SECONDS_KEY = '@volyume_progress_scan_timer_seconds';

export function normaliseProgressScanCameraFacing(value) {
  return value === 'front' || value === 'back' ? value : 'back';
}

export function normaliseProgressScanTimerSeconds(value) {
  const n = Number(value);
  return [0, 5, 10].includes(n) ? n : 0;
}

export async function getProgressScanHideExactPreference() {
  try {
    return (await AsyncStorage.getItem(PROGRESS_SCAN_HIDE_EXACT_KEY)) === 'true';
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
