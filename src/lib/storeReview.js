import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_PROMPTED_KEY = 'volyume_review_prompted';
const REVIEW_SESSIONS_KEY = 'volyume_sessions_since_install';
const REVIEW_FIRST_SESSION_KEY = 'volyume_first_session_at';

// Ask for a store review only once the habit is real: at least this many
// completed workouts AND at least this many days since the first one. The
// old 5-session threshold could fire inside a single enthusiastic week,
// before the app had proven itself, and the one prompt the OS allows was
// spent early. Both gates must pass.
export const REVIEW_PROMPT_AFTER = 10; // completed sessions
export const REVIEW_MIN_DAYS = 14; // days since the first counted session

export async function incrementSessionCount() {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_SESSIONS_KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await AsyncStorage.setItem(REVIEW_SESSIONS_KEY, String(count));
    // Anchor for the days gate. For installs that predate this key the clock
    // starts now, which only ever delays the prompt, never rushes it.
    const firstAt = await AsyncStorage.getItem(REVIEW_FIRST_SESSION_KEY);
    if (!firstAt) await AsyncStorage.setItem(REVIEW_FIRST_SESSION_KEY, String(Date.now()));
    return count;
  } catch {
    return 0;
  }
}

export async function shouldPromptReview(nowMs = Date.now()) {
  try {
    const prompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    if (prompted === 'true') return false;
    const raw = await AsyncStorage.getItem(REVIEW_SESSIONS_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count < REVIEW_PROMPT_AFTER) return false;
    const firstRaw = await AsyncStorage.getItem(REVIEW_FIRST_SESSION_KEY);
    const firstAt = firstRaw ? Number(firstRaw) : NaN;
    if (!Number.isFinite(firstAt)) return false; // no anchor yet; the next session sets it
    return nowMs - firstAt >= REVIEW_MIN_DAYS * 24 * 60 * 60 * 1000;
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
