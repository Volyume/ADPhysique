import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-local privacy preferences. Kept local on purpose: a privacy
// opt-out should not itself be transmitted, so this never goes through
// pref sync.
export const PRIVACY_PREFS_KEY = '@volyume_privacy_prefs';

// Returns the parsed privacy prefs object, or null on miss / error.
// Shape: { analyticsOptOut: boolean }. Callers treat null as defaults.
export async function loadPrivacyPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PRIVACY_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}
