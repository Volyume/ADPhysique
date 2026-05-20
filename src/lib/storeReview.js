import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_PROMPTED_KEY = 'volyume_review_prompted';
const REVIEW_SESSIONS_KEY = 'volyume_sessions_since_install';
const REVIEW_PROMPT_AFTER = 5; // sessions before asking

export async function incrementSessionCount() {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_SESSIONS_KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await AsyncStorage.setItem(REVIEW_SESSIONS_KEY, String(count));
    return count;
  } catch {
    return 0;
  }
}

export async function shouldPromptReview() {
  try {
    const prompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    if (prompted === 'true') return false;
    const raw = await AsyncStorage.getItem(REVIEW_SESSIONS_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    return count >= REVIEW_PROMPT_AFTER;
  } catch {
    return false;
  }
}

export async function requestReview() {
  try {
    // expo-store-review loaded dynamically so the app doesn't crash
    // if the package isn't yet installed in a dev build
    const StoreReview = await import('expo-store-review');
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;
    await StoreReview.requestReview();
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, 'true');
  } catch {}
}
