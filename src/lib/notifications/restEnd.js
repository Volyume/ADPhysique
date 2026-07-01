/**
 * A2 (Wave 1): the end-of-rest alert.
 *
 * The in-app rest timer is wall-clock anchored and correct, but its beeps and
 * haptics run in a FOREGROUND effect — locked or pocketed, rest ended in
 * silence and the loop's heartbeat went missing exactly when users look away
 * (UX audit CL-1). This schedules ONE local notification at the timer's end
 * timestamp as the backstop; the store cancels/reschedules it on skip, ±15s
 * and replacement, and cancels it when the session ends.
 *
 * Deliberate choices:
 *  - NOT quiet-hours shifted: the user started this rest seconds ago,
 *    mid-session; shifting or dropping the alert IS the bug being fixed.
 *  - Weight-free, calm copy. Nothing ED-adjacent rides this surface.
 *  - Fires on BOTH platforms. A plain scheduled alert is not the gated iOS
 *    Live-Activity item; this is iOS's first lock-screen rest signal.
 *  - Foreground delivery is suppressed (handler.js): in-app, the timer row,
 *    beeps and haptics already carry the moment; the notification is only
 *    for the locked/backgrounded phone.
 *  - OS-scheduled means it survives process death: if Android reaps the app
 *    mid-rest, the alert still fires on time.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { REST_ALERTS_CHANNEL } from './channels';

const NOTIF_ID_REST_END = 'volyume_rest_end';

export async function cancelRestEndNotification() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_REST_END); } catch (_) { /* tolerate */ }
}

/**
 * (Re)schedule the end-of-rest alert for a wall-clock end timestamp.
 * Same identifier every time, so a reschedule replaces the previous one.
 *
 * @param {number} endsAtMs epoch ms the rest ends at (store restTimerEndsAt)
 */
export async function scheduleRestEndNotification(endsAtMs) {
  if (Platform.OS === 'web') return;
  // Founder decision 2026-07-01: the alert has an in-app off switch
  // (Settings → Workout & units). The pref is device-local workout prefs
  // state, hydrated by ActiveWorkoutScreen before any rest can start; the
  // lazy require avoids an import cycle (store → this module → store).
  try {
    // eslint-disable-next-line global-require
    const enabled = require('../../store/useAppStore').default.getState()?.restEndAlertEnabled;
    if (enabled === false) return;
  } catch (_) { /* unknown pref state: keep the default-on behaviour */ }
  try {
    await cancelRestEndNotification();
    const ms = Number(endsAtMs) - Date.now();
    // Under ~2s away the in-app/foreground cues own the moment; scheduling a
    // past or imminent date would fire instantly and read as a stray buzz.
    if (!Number.isFinite(ms) || ms < 2000) return;
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_REST_END,
      content: {
        title: 'Rest done',
        body: 'Next set when you\'re ready.',
        data: { type: 'rest_end' },
        sound: true,
      },
      trigger: {
        channelId: REST_ALERTS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Number(endsAtMs)),
      },
    });
  } catch (_) {
    // Best-effort backstop: the in-app timer is unaffected by a failure here.
  }
}
