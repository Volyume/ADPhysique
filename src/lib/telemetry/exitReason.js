/**
 * The optional "why did you leave" row (growth telemetry, founder brief
 * 2026-10-19), for the moment a person throws a workout away.
 *
 * Shown through the app's own dialog (AppAlert), which lives at the app root
 * and so survives the logger closing behind it. One tap picks a reason;
 * "Skip" or a tap outside closes it and sends nothing. It never blocks: the
 * discard has already happened and the person is already back on Home. It is
 * offered at most once a day (AsyncStorage day key); a storage failure means
 * it is not shown at all, never shown repeatedly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackNow } from './growth';

/** The chips, in order: label shown, schema value sent. */
export const WORKOUT_DISCARD_REASONS = Object.freeze([
  { text: 'No time', reason: 'no_time' },
  { text: 'Felt off', reason: 'felt_off' },
  { text: 'App problem', reason: 'app_problem' },
  { text: 'Just looking', reason: 'just_browsing' },
  { text: 'Other', reason: 'other' },
]);

const dayStamp = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Record the person's chosen reason. */
export function sendWorkoutDiscardReason(reason) {
  trackNow('exit_reason_given', { moment: 'workout_discard', reason });
}

/**
 * Offer the reason row once a day. Resolves true when it was shown.
 * `userId` scopes the once-a-day key.
 */
export async function offerWorkoutDiscardReason(userId) {
  try {
    if (!userId) return false;
    const key = `@volyume_tday_${userId}_exit_reason_workout_discard_${dayStamp()}`;
    if (await AsyncStorage.getItem(key)) return false;
    await AsyncStorage.setItem(key, String(Date.now()));
    // eslint-disable-next-line global-require
    const { appAlert } = require('../../components/AppAlert');
    appAlert(
      'Workout discarded',
      'If you like, tell us why. It is optional and helps us improve things.',
      [
        ...WORKOUT_DISCARD_REASONS.map((r) => ({ text: r.text, onPress: () => sendWorkoutDiscardReason(r.reason) })),
        { text: 'Skip', style: 'cancel' },
      ],
    );
    return true;
  } catch (_) {
    return false; // telemetry never blocks the UI
  }
}
