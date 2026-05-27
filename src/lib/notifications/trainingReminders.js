/**
 * trainingReminders.js
 * Schedules weekly local push notifications aligned with the user's training schedule.
 * One notification per training day, repeating weekly at the user's preferred time.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { colors } from '../../styles/theme';

export const SCHEDULE_KEY = '@volyume_schedule_v1';
export const REMINDER_PREF_KEY = '@volyume_reminder_enabled_v1';
export const REMINDER_TIME_KEY = '@volyume_reminder_time_v1'; // { hour, minute }

const TRAINING_REMINDER_CHANNEL = 'training-reminders';

// Identifier prefix used to tag all training reminder notifications so they
// can be cancelled as a group without touching other scheduled notifications.
const NOTIF_ID_PREFIX = 'volyume_training_day_';

// expo-notifications uses 1=Sunday … 7=Saturday for weekly calendar triggers.
// JS Date uses 0=Sunday … 6=Saturday, so we add 1.
function jsWeekdayToExpo(jsDay) {
  return jsDay + 1;
}

// ---------------------------------------------------------------------------
// ensureTrainingReminderChannel
// Creates the Android notification channel for training reminders.
// Safe to call multiple times, Android is idempotent on re-creation.
// ---------------------------------------------------------------------------
export async function ensureTrainingReminderChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(TRAINING_REMINDER_CHANNEL, {
      name: 'Training reminders',
      description: 'Reminders on your scheduled training days',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
  } catch {
    // Channels are Android-only; silently skip on other platforms
  }
}

// ---------------------------------------------------------------------------
// cancelTrainingReminders
// Cancels all previously scheduled training reminder notifications.
// ---------------------------------------------------------------------------
export async function cancelTrainingReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const trainingNotifs = scheduled.filter(n =>
      n.identifier && n.identifier.startsWith(NOTIF_ID_PREFIX)
    );
    await Promise.all(
      trainingNotifs.map(n =>
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})
      )
    );
  } catch {
    // Fail silently, cancellation is best-effort
  }
}

// ---------------------------------------------------------------------------
// scheduleTrainingReminders
// Reads the user's schedule and reminder preferences, then schedules one
// weekly repeating notification per training day.
// ---------------------------------------------------------------------------
export async function scheduleTrainingReminders() {
  if (Platform.OS === 'web') return;

  try {
    // 1. Check if reminders are enabled
    const enabledRaw = await AsyncStorage.getItem(REMINDER_PREF_KEY);
    const enabled = enabledRaw === 'true';
    if (!enabled) {
      await cancelTrainingReminders();
      return;
    }

    // 2. Check notification permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // 3. Load training schedule
    const scheduleRaw = await AsyncStorage.getItem(SCHEDULE_KEY);
    if (!scheduleRaw) {
      await cancelTrainingReminders();
      return;
    }

    let schedule;
    try {
      schedule = JSON.parse(scheduleRaw);
    } catch {
      await cancelTrainingReminders();
      return;
    }

    const days = Array.isArray(schedule?.days) ? schedule.days : [];
    if (days.length === 0) {
      await cancelTrainingReminders();
      return;
    }

    // 4. Load preferred reminder time (default 08:00)
    let hour = 8;
    let minute = 0;
    try {
      const timeRaw = await AsyncStorage.getItem(REMINDER_TIME_KEY);
      if (timeRaw) {
        const parsed = JSON.parse(timeRaw);
        if (typeof parsed.hour === 'number') hour = parsed.hour;
        if (typeof parsed.minute === 'number') minute = parsed.minute;
      }
    } catch {}

    // 5. Ensure the Android channel exists
    await ensureTrainingReminderChannel();

    // 6. Cancel existing training reminders before rescheduling
    await cancelTrainingReminders();

    // 7. Determine notification body using plan id for a personalised message
    // We keep it generic because we don't load the full plan name here to
    // avoid a database dependency in this utility module.
    const planId = schedule?.activePlanId ?? null;
    const body = planId
      ? 'Your training session is scheduled for today.'
      : 'Your training session is scheduled for today.';

    // 8. Schedule one weekly notification per training day
    await Promise.all(
      days.map((jsDay) => {
        const identifier = `${NOTIF_ID_PREFIX}${jsDay}`;
        return Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: 'Time to train',
            body,
            sound: true,
            data: { type: 'training_reminder', channelId: TRAINING_REMINDER_CHANNEL },
            android: {
              channelId: TRAINING_REMINDER_CHANNEL,
              color: colors.primary,
              smallIcon: 'notification_icon',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: jsWeekdayToExpo(jsDay),
            hour,
            minute,
            repeats: true,
          },
        }).catch(() => {});
      })
    );
  } catch (e) {
    // Fail silently, notification scheduling is non-critical. Fire
    // notification_failed telemetry so Panel 6 sees scheduling
    // outages even though the user surface stays quiet.
    try {
      // eslint-disable-next-line global-require
      const { trackNotificationFailed, CATEGORY } = require('./index');
      trackNotificationFailed({
        category: CATEGORY.TRAINING_REMINDER,
        reason: 'schedule_threw',
        payload: { message: e?.message ?? 'unknown' },
      });
    } catch (_) { /* telemetry layer unavailable -- accepted */ }
  }
}
