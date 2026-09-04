/**
 * trainingReminders.js
 * Schedules weekly local push notifications aligned with the user's training schedule.
 * One notification per training day, repeating weekly at the user's preferred time.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { colors } from '../../styles/theme';
import { getQuietHours, shiftHourMinuteOutOfQuietHours } from './quietHours';
import { scheduleCheckedNotification } from './triggerDate';

export const SCHEDULE_KEY = '@volyume_schedule_v1';
export const REMINDER_PREF_KEY = '@volyume_reminder_enabled_v1';
export const REMINDER_TIME_KEY = '@volyume_reminder_time_v1'; // { hour, minute }

const TRAINING_REMINDER_CHANNEL = 'training-reminders';

// Identifier prefix used to tag all training reminder notifications so they
// can be cancelled as a group without touching other scheduled notifications.
const NOTIF_ID_PREFIX = 'volyume_training_day_';
// D142 (founder decision C, 2026-09-04): the reminder used to be laid as an
// OS-level WEEKLY REPEAT, i.e. indefinitely. Nothing in the app runs in the
// background, so for a user who stopped opening the app it kept firing the
// days and plan name baked in at their last session, for ever - the only
// push that still reached them, and it could never adapt. Same restraint
// as the weigh-in prompts (C8 Work 5): a bounded run of dated one-shots
// covering about eight weeks, re-laid every time the app opens or a
// workout finishes (restoreNotifications at launch, the weekly foreground
// top-up, the habit-schedule refresh), so an active user's experience is
// unchanged and a genuine return restores the cadence at once. Someone
// who never comes back stops being pinged after the horizon runs out; the
// one calm return nudge (scheduler.scheduleReturnNudge) covers that gap
// deliberately instead of by accident.
//
// The one-shot count is capped so the run sits inside iOS's 64-pending
// ceiling alongside the weigh-in horizon (28), the check-in, meal,
// coach-ready, block-ready and nudge pushes: 28 covers eight weeks at
// three or four days a week and shortens gracefully for denser habits.
export const TRAINING_HORIZON_DAYS = 56;
export const TRAINING_HORIZON_MAX_ONESHOTS = 28;

/**
 * Pure: the dated fire times for the habit days over the horizon, soonest
 * first, never in the past, capped. Exported for the unit tests.
 */
export function trainingHorizonDates(days, hour, minute, nowMs = Date.now(), {
  horizonDays = TRAINING_HORIZON_DAYS, max = TRAINING_HORIZON_MAX_ONESHOTS,
} = {}) {
  const out = [];
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return out;
  const wanted = new Set((Array.isArray(days) ? days : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  if (wanted.size === 0) return out;
  const now = new Date(nowMs);
  for (let i = 0; i <= horizonDays && out.length < max; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute, 0, 0);
    if (!Number.isFinite(d.getTime())) continue;
    if (!wanted.has(d.getDay())) continue;
    if (d.getTime() <= nowMs) continue; // never schedule into the past
    out.push(d);
  }
  return out;
}

// Longest total reminder body we allow. A warm, complete sentence may run a
// little over the ~80-char copy target (the locked convention prefers warmth to
// terseness), but beyond this an oversized user-named plan would dominate or
// truncate in the notification tray, so we fall back to the plan-agnostic line.
// Bounding the WHOLE body (not the name alone) is deliberate: the fixed wording
// is ~55 chars, so a name-length guard let realistic plan names overrun the
// body convention (C12 review finding).
const MAX_REMINDER_BODY_CHARS = 90;

// ---------------------------------------------------------------------------
// buildTrainingReminderBody (pure)
// The reminder body. When the active plan is known we name it, referenced by
// its stored name verbatim (matching src/lib/planDisplay.js so the reminder
// can never drift from the Train tab). We name the PLAN, never a specific
// routine: the plan rotates round-robin (decision D5), so a weekly repeating
// notification cannot know which routine will be next on a future date without
// asserting a plan fact that may not hold. Warm and encouraging, never a
// barked command. Exported for unit testing.
// ---------------------------------------------------------------------------
export function buildTrainingReminderBody(planName) {
  const generic = 'You\'ve got a session on for today. Enjoy it whenever it suits you.';
  const name = typeof planName === 'string' ? planName.trim() : '';
  if (!name) return generic;
  const named = `Your ${name} plan is on today. Enjoy it whenever it suits you.`;
  return named.length <= MAX_REMINDER_BODY_CHARS ? named : generic;
}

// ---------------------------------------------------------------------------
// resolveActivePlanName
// Best-effort read of the active plan's name for the reminder copy. Lazy
// requires keep this notifications utility free of a static database/store
// dependency (and any import cycle); every failure path returns '' so the copy
// falls back to the plan-agnostic line. Never throws.
// ---------------------------------------------------------------------------
async function resolveActivePlanName() {
  try {
    // eslint-disable-next-line global-require
    const store = require('../../store/useAppStore').default;
    const userId = store.getState()?.user?.id ?? null;
    if (!userId) return '';
    // eslint-disable-next-line global-require
    const { getActivePlan } = require('../database');
    const plan = await getActivePlan(userId).catch(() => null);
    return plan && typeof plan.name === 'string' ? plan.name.trim() : '';
  } catch (_) {
    return '';
  }
}

// expo-notifications uses 1=Sunday … 7=Saturday for weekly calendar triggers.
// JS Date uses 0=Sunday … 6=Saturday, so we add 1.
export function jsWeekdayToExpo(jsDay) {
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
export async function scheduleTrainingReminders(planNameArg) {
  if (Platform.OS === 'web') return;

  try {
    // 1. Check if reminders are enabled.
    // C14 job 3: through the single authority (categoryPrefs), not the
    // dedicated key directly. The Settings screen read the per-category
    // SQLite row while this read '@volyume_reminder_enabled_v1', and the
    // two sync by different mechanisms with different conflict rules, so
    // after a cross-device conflict the switch could show OFF while these
    // reminders kept arriving. The legacy key is still written and is
    // still the fallback for an install that pre-dates the blob field.
    // eslint-disable-next-line global-require
    const { isCategoryEnabled } = require('./categoryPrefs');
    // eslint-disable-next-line global-require
    const { CATEGORY } = require('./categories');
    const enabled = await isCategoryEnabled(CATEGORY.TRAINING_REMINDER);
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

    // 4b. Quiet hours always win (NOTIFICATIONS_LOCKED.md). This was the one
    // scheduler that fired at the picked time even inside the window, making
    // the settings screen's "applies to every reminder" claim false
    // (comprehension-trust audit 2026-08-06, T17). Same shift rule as the
    // weight/check-in/meal schedulers.
    try {
      const quiet = await getQuietHours();
      const shifted = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
      hour = shifted.hour;
      minute = shifted.minute;
    } catch (_) { /* best-effort: an unreadable pref never blocks scheduling */ }

    // 5. Ensure the Android channel exists
    await ensureTrainingReminderChannel();

    // 6. Cancel existing training reminders before rescheduling
    await cancelTrainingReminders();

    // 7. Notification body. Names the active plan when we can resolve it: an
    // explicit name passed by the plan-activation hook wins, else a best-effort
    // self-source, else the plan-agnostic line (see buildTrainingReminderBody).
    let planName = typeof planNameArg === 'string' ? planNameArg.trim() : '';
    if (!planName) planName = await resolveActivePlanName();
    const body = buildTrainingReminderBody(planName);

    // 8. Schedule one dated one-shot per habit day across the bounded
    // horizon (D142; see TRAINING_HORIZON_DAYS above). The identifier keeps
    // the group prefix so cancelTrainingReminders still clears the run.
    const fireDates = trainingHorizonDates(days, hour, minute);
    await Promise.all(
      fireDates.map((fireAt) => {
        const ymd = `${fireAt.getFullYear()}${String(fireAt.getMonth() + 1).padStart(2, '0')}${String(fireAt.getDate()).padStart(2, '0')}`;
        const identifier = `${NOTIF_ID_PREFIX}${fireAt.getDay()}_${ymd}`;
        return scheduleCheckedNotification({
          identifier,
          content: {
            // D17: the schedule key is HABIT-derived, not a set timetable, and
            // the founder ruled (2026-08-03, Home banner removal) that the app
            // never asserts scheduled training days. The title matches the
            // body's soft framing; never "Today's a training day".
            title: 'One of your usual training days',
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
            // channelId belongs on the trigger for expo-notifications; the
            // content.android.channelId above is ignored by the library, so
            // without this the reminder posted with no channel and never showed
            // on Android 8+.
            channelId: TRAINING_REMINDER_CHANNEL,
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
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
