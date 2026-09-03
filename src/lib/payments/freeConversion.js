/**
 * freeConversion.js — the one-shot migration of an EXISTING device onto the
 * fully-free product.
 *
 * FOUNDER DECISION 2026-09-03 (see src/lib/proGate.js, FULL_ACCESS_FOR_ALL):
 * Volyume is now fully free. No trial, no Free/Pro split, no paywall, no
 * expiry. New installs never see any of it, but a device that has been
 * running the trial build is still carrying the residue: cascade-gate and
 * day-3 pushes sitting in the OS queue, a win-back episode waiting to fire,
 * a cached trial state and end date, a queued start_cascade retry, a cached
 * 'free' tier and the Home trial-end gate flag. None of that is reachable by
 * the user any more, and some of it would still surface as a notification
 * about a trial that no longer exists.
 *
 * This module drains that residue exactly once per signed-in user and then
 * never runs again for them (a per-uid AsyncStorage marker). It is a
 * migration, not a policy: every live decision about entitlement is made by
 * FULL_ACCESS_FOR_ALL, so nothing here grants or revokes anything - the tier
 * write below only brings the local cache in line with what proGate already
 * answers.
 *
 * Contract:
 *  - BEST EFFORT. Every step is in its own try/catch, so one failure never
 *    costs the others.
 *  - NEVER THROWS. The caller runs it on the session-restore path, before
 *    restoreNotifications; a rejected promise there would be a launch-path
 *    failure for a cosmetic clean-up.
 *  - Failures are recorded with logError so they are visible, never silent.
 *  - IDEMPOTENT. Re-running it (a lost marker write, a reinstall) repeats
 *    the same removals, which are themselves idempotent.
 *
 * It touches NOTHING safety-adjacent: no ED flag, no wellbeing state, no
 * consent record, no weight/food data, no quiet hours, no push budget, and
 * none of the coaching, weigh-in or check-in notification families.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError, logInfo } from '../errorLog';

const CONVERTED_KEY_PFX = '@volyume_free_conversion_v1_';

// Owned by src/store/useAppStore.js; re-declared here rather than exported
// from the store to keep this module free of a store import at evaluation
// time (the store already lazily requires payments).
const TIER_KEY = '@volyume_tier';
const TRIAL_STATE_KEY = '@volyume_trial_state';
const PRO_TRIAL_ENDS_KEY = '@volyume_pro_trial_ends_at';
const PAID_VERIFIED_AT_KEY = '@volyume_paid_verified_at';
// Owned by HomeScreen (the day-14 trial-end gate, shown once per user).
const TRIAL_END_GATE_SHOWN_PFX = '@volyume_trial_end_gate_shown_';

/** Has this user already been converted on this device? */
export async function hasRunFreeConversion(userId) {
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(CONVERTED_KEY_PFX + userId)) != null;
  } catch (_) {
    // A failed read must not re-run a migration in a loop on every launch,
    // but it also must not claim the migration happened. Treat it as "not
    // yet": the steps are idempotent, so a repeat is harmless.
    return false;
  }
}

/**
 * Run the conversion once for `userId`. Resolves { ran: boolean }; never
 * rejects.
 *
 * @param {string|null} userId  the signed-in Supabase user id.
 */
export async function runFreeConversionOnce(userId) {
  if (!userId) return { ran: false };
  if (await hasRunFreeConversion(userId)) return { ran: false };

  // 1. Cancel the billing-lifecycle pushes already sitting in the OS queue.
  //    The schedulers themselves are no-ops now, so nothing re-lays these;
  //    without this an existing user could still receive a "your trial ends
  //    in two days" push days after the product stopped having a trial.
  try {
    // eslint-disable-next-line global-require
    const scheduler = require('../notifications/scheduler');
    await scheduler.cancelCascadeGateNotifications?.();
  } catch (e) {
    logError('freeConversion.cancelCascadeGate', e, { uid: userId });
  }
  try {
    // eslint-disable-next-line global-require
    const scheduler = require('../notifications/scheduler');
    await scheduler.cancelTrialDay3Notification?.();
  } catch (e) {
    logError('freeConversion.cancelTrialDay3', e, { uid: userId });
  }
  try {
    // eslint-disable-next-line global-require
    const scheduler = require('../notifications/scheduler');
    await scheduler.cancelWinbackNotification?.();
  } catch (e) {
    logError('freeConversion.cancelWinback', e, { uid: userId });
  }

  // 2. Close any open churn episode, so the win-back state machine holds no
  //    "this user lapsed" record for a product they cannot lapse from.
  try {
    // eslint-disable-next-line global-require
    await require('./winbackState').clearEpisode();
  } catch (e) {
    logError('freeConversion.clearWinbackEpisode', e, { uid: userId });
  }

  // 3. Drop the queued start_cascade retry. The sync runner flushes this on
  //    every trigger; left in place it would keep calling a trial RPC.
  try {
    // eslint-disable-next-line global-require
    await require('./pendingCascade').clearPendingCascade(userId);
  } catch (e) {
    logError('freeConversion.clearPendingCascade', e, { uid: userId });
  }

  // 4. Remove the cached trial/entitlement keys. Nothing reads them for a
  //    gating decision any more (checkTier skips the local trial-expiry
  //    demotion while FULL_ACCESS_FOR_ALL is on), so they are stale data
  //    describing a state the user is no longer in.
  for (const key of [TRIAL_STATE_KEY, PRO_TRIAL_ENDS_KEY, PAID_VERIFIED_AT_KEY]) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      logError('freeConversion.removeKey', e, { uid: userId, key });
    }
  }

  // 5. Bring the cached tier in line with what proGate already answers, so
  //    the pre-store-hydration launch window never renders a 'free' shell.
  //    This grants nothing: FULL_ACCESS_FOR_ALL is the decision, this is the
  //    cache catching up with it.
  try {
    await AsyncStorage.setItem(TIER_KEY, 'pro');
  } catch (e) {
    logError('freeConversion.setTier', e, { uid: userId });
  }

  // 6. Clear the Home trial-end gate flag. It marked "this user has already
  //    been shown the day-14 gate"; with no gate to show, the flag is only a
  //    stale per-user record.
  try {
    await AsyncStorage.removeItem(TRIAL_END_GATE_SHOWN_PFX + userId);
  } catch (e) {
    logError('freeConversion.clearTrialEndGateFlag', e, { uid: userId });
  }

  // Mark last: if the marker write is the thing that fails, the conversion
  // simply repeats next launch, which is harmless.
  try {
    await AsyncStorage.setItem(CONVERTED_KEY_PFX + userId, String(Date.now()));
    logInfo('freeConversion.done', `uid=${userId}`);
  } catch (e) {
    logError('freeConversion.mark', e, { uid: userId });
  }

  return { ran: true };
}
