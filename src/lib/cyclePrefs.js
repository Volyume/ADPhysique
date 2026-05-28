// Cycle tracking opt-in (GAP row 15). Off by default.
//
// Menstrual data is special-category health data (GDPR Article 9). The
// app already takes Article 9 consent at onboarding; this opt-in is the
// extra privacy gate the founder asked for, so the cycle question only
// ever appears for someone who chose to track it. When a user whose
// recorded biological sex is female turns this on, the weekly check-in
// shows one optional question: could your period be moving the scale
// this week? The coach already reads cycle_override to hold weight-based
// changes so a normal fluctuation isn't read as fat gain or loss.
//
// Stored in AsyncStorage like the app's other preferences (wellbeing
// mode, accessibility). Not synced to the cloud: a privacy opt-in
// defaults off on every device, the user turns it on where they want it.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const CYCLE_TRACKING_KEY = '@volyume_cycle_tracking';

export async function getCycleTracking() {
  try {
    return (await AsyncStorage.getItem(CYCLE_TRACKING_KEY)) === 'true';
  } catch (_) {
    return false;
  }
}

export async function setCycleTracking(enabled) {
  try {
    await AsyncStorage.setItem(CYCLE_TRACKING_KEY, enabled ? 'true' : 'false');
  } catch (_) {}
}

// The cycle question (and the Settings toggle) appear only when the
// feature is opted in AND the recorded biological sex is female. Pure
// so both screens share one rule and it can be tested without a render.
export function shouldShowCycleQuestion(sex, enabled) {
  return enabled === true && sex === 'female';
}
