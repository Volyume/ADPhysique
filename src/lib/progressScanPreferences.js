import AsyncStorage from '@react-native-async-storage/async-storage';

export const PROGRESS_SCAN_HIDE_EXACT_KEY = '@volyume_progress_scan_hide_exact_numbers';

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
