import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-local privacy preferences. Kept local on purpose: a privacy
// opt-out should not itself be transmitted, so this never goes through
// pref sync (enforced by PREF_EXCLUDE_PATTERNS in sync.js and pinned by
// syncPrefExclusions.test.js - Campaign 1 P0-2).
export const PRIVACY_PREFS_KEY = '@volyume_privacy_prefs';

// Returns { prefs, readFailed }. `prefs` is the parsed privacy prefs
// object ({ analyticsOptOut: boolean }) or null when nothing is stored;
// `readFailed` is true ONLY when the read itself threw. The distinction
// is load-bearing (Campaign 1 P0-2): a genuine miss means the user never
// opted out (defaults apply), but a FAILED read must not be treated as
// consent - the caller fails privacy-protectively and keeps telemetry
// off for the session rather than guessing.
export async function loadPrivacyPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PRIVACY_PREFS_KEY);
    return { prefs: raw ? JSON.parse(raw) : null, readFailed: false };
  } catch (_) {
    return { prefs: null, readFailed: true };
  }
}
