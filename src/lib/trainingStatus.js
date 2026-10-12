/**
 * trainingStatus.js -- D226 (founder decision 2026-10-12): a private
 * "natural or enhanced" training status.
 *
 * Article 9 health data, kept on this phone only (founder answer): stored in
 * the device's secure store (encrypted, never in AsyncStorage, so the prefs
 * sync never sees it), never sent to the cloud, Sentry, analytics, the coach
 * report or any share card. The only thing that leaves this module is a
 * number, the gain ceiling the weekly coach reads in a gain phase.
 *
 * Evidence (docs/audit/energy-slider-2026-10-12/01-RESEARCH.md): natural
 * off-season gain is held to about 0.25 to 0.5% bodyweight a week (Iraki et
 * al. 2019, expert practice). Androgens raise lean-mass gain in trained men
 * (Bhasin 1996, 2001: well established; about 6 kg fat-free mass in 10
 * weeks with training). That an enhanced athlete can carry a faster gain
 * with a similar share of lean tissue is OUR READING of those findings, not
 * a nutrition study, so the ceiling only stops the coach pulling calories
 * back up to 0.75% a week; it never raises the target or the range.
 */

import * as SecureStore from 'expo-secure-store';
import { logWarn } from './errorLog';

export const TRAINING_STATUS = Object.freeze({ NATURAL: 'natural', ENHANCED: 'enhanced' });
const KEY = 'volyume_training_status';
const KEY_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

/** The fastest weekly gain (% bodyweight) the coach reads as on target for an enhanced athlete in a gain phase. */
export const ENHANCED_GAIN_CEILING_PCT = 0.75;

/** The stored status; natural when unset or unreadable. */
export async function getTrainingStatus() {
  try {
    const v = await SecureStore.getItemAsync(KEY, KEY_OPTS);
    return v === TRAINING_STATUS.ENHANCED ? TRAINING_STATUS.ENHANCED : TRAINING_STATUS.NATURAL;
  } catch (e) {
    logWarn('trainingStatus.get', e?.message);
    return TRAINING_STATUS.NATURAL;
  }
}

/** Save the status; natural removes the stored value. */
export async function setTrainingStatus(status) {
  if (status === TRAINING_STATUS.ENHANCED) {
    await SecureStore.setItemAsync(KEY, TRAINING_STATUS.ENHANCED, KEY_OPTS);
  } else {
    await SecureStore.deleteItemAsync(KEY, KEY_OPTS);
  }
}

/** Remove the status (sign out, account deletion). Best effort. */
export async function clearTrainingStatus() {
  await SecureStore.deleteItemAsync(KEY, KEY_OPTS).catch(() => {}); // best effort: nothing to clear is fine
}

/** The weekly coach's gain ceiling for a status: a number for enhanced, null (the phase's own band) otherwise. */
export function gainCeilingFor(status) {
  return status === TRAINING_STATUS.ENHANCED ? ENHANCED_GAIN_CEILING_PCT : null;
}
