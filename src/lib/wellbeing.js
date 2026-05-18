// Wellbeing mode — a single, user-controlled signal that softens the app
// for anyone who has experienced or is in recovery from an eating disorder
// or body-image condition. Asked once during first run, changeable anytime
// in Settings. Stored in AsyncStorage for consistency with the app's other
// preferences (the flag is not a secret).
//
// Values:
//   'calm'        — user asked for a calmer experience
//   'normal'      — user said no
//   'unspecified' — prefer not to say / not yet asked (default; normal UX)

import AsyncStorage from '@react-native-async-storage/async-storage';

export const WELLBEING_KEY = '@volyume_wellbeing_mode';

export const WELLBEING_HELPLINE =
  "If you're struggling, Beat Eating Disorders UK: 0808 801 0677 (free, confidential).";

export async function getWellbeingMode() {
  try {
    const v = await AsyncStorage.getItem(WELLBEING_KEY);
    return v || 'unspecified';
  } catch (_) {
    return 'unspecified';
  }
}

export async function setWellbeingMode(mode) {
  try {
    await AsyncStorage.setItem(WELLBEING_KEY, mode);
  } catch (_) {}
}

export function isCalm(mode) {
  return mode === 'calm';
}
