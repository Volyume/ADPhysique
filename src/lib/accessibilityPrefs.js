import AsyncStorage from '@react-native-async-storage/async-storage';

export const A11Y_PREFS_KEY = '@volyume_a11y_prefs';

// Returns the parsed prefs object, or null if nothing is saved / on any
// read or parse error. Callers should treat null as "use defaults".
export async function loadA11yPrefs() {
  try {
    const raw = await AsyncStorage.getItem(A11Y_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}
