/**
 * notifications/scheduler.js
 *
 * Cron-like scheduling helpers built on top of expo-notifications.
 * Each helper:
 *   1. Applies quiet hours to the requested trigger.
 *   2. Cancels the previous schedule for the same logical slot.
 *   3. Calls expo-notifications.scheduleNotificationAsync.
 *   4. On failure, fires notification_failed with the category.
 *
 * The handler in handler.js does the smart-suppression check at
 * delivery time. This file just lays the schedules down.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY } from './categories';
import {
  getQuietHours,
  shiftHourMinuteOutOfQuietHours,
  shiftDateOutOfQuietHours,
} from './quietHours';
import { trackNotificationFailed } from './telemetry';
import { COACHING_REMINDERS_CHANNEL } from './channels';
import { requestEventPushSlot } from './budget';
import { winbackPush, monthLabel } from './winbackContent';
import {
  getEpisode as getWinbackEpisode,
  getLastFiredAt as getWinbackLastFiredAt,
  getStatedReturn as getWinbackStatedReturn,
  markWinbackLaid,
  winbackFireDate,
  canLayWinback,
} from '../payments/winbackState';
import { localWeekStartMs } from '../dayKey';
import { logWarn } from '../errorLog';
import {
  trialDay3FireDate,
  trialStartFromEndsAt,
  selectTrialVariant,
  firstReviewUnlockDate,
  dayName,
  trialDay3Push,
} from '../trialActivation';
import { missedCheckinFireDates, missedCheckinPush } from './missedCheckin';
import { plannedMealConfirmPush, plannedConfirmSlot } from './plannedMealConfirm';
import { resolveActivationNudge, activationNudgePush } from '../activationNudge';

const NOTIF_ID_MORNING = 'volyume_morning_weight';
const NOTIF_ID_EVENING = 'volyume_evening_weight';
const NOTIF_ID_CHECKIN = 'volyume_weekly_checkin';
const NOTIF_ID_TRIAL_DAY3 = 'volyume_trial_day3';
const NOTIF_ID_WINBACK = 'volyume_winback';
const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

// The user's first name for a warm, personal greeting, or '' when we don't
// have one (so copy reads naturally either way). Read lazily from the store at
// schedule time, the same lazy-require pattern the rest of lib/ uses, so a name
// change is picked up the next time notifications are re-laid. Capped so a long
// or odd value can't blow out a notification title.
function greetName() {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const raw = useAppStore.getState()?.userProfile?.firstName;
    if (!raw || typeof raw !== 'string') return '';
    const first = raw.trim().split(/\s+/)[0];
    return first && first.length <= 20 ? `, ${first}` : '';
  } catch (_) {
    return '';
  }
}

// ─── Morning weight copy ──────────────────────────────────────────────────────

// Warm, encouraging morning copy. A gentle good-morning with the user's name
// (when we have it) and a kind nudge to weigh in. No clipped commands. The
// pool rotates across the week so it doesn't feel robotic; `name` is the
// pre-formatted ', First' suffix (or '').
function morningCopies(name) {
  return [
    { title: `Good morning${name}`, body: 'Whenever you\'re ready, hop on the scales and log today\'s weight.' },
    { title: `Good morning${name}`, body: 'A quiet weigh-in to start the day. No rush, just whenever suits you.' },
    { title: `Morning${name}`, body: 'When you get a moment, pop on the scales and log the number. That\'s all for now.' },
    { title: `Rise and shine${name}`, body: 'Logging your weight today keeps your coaching on track. Whenever you\'re ready.' },
  ];
}

function pickMorningCopy(dayOfWeek, name = '') {
  const copies = morningCopies(name);
  return copies[dayOfWeek % copies.length];
}

/**
 * Daily morning weight reminder. Quiet-hours shifts the trigger out
 * of the window if needed.
 *
 * @param {number} hour    0-23, default 7
 * @param {number} minute  0-59, default 0
 */
export async function scheduleMorningWeightNotification(hour = 7, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    await cancelMorningNotification();
    // ED-flag schedule gate (Q1): now that the morning nudge fires with sound,
    // it is also withheld while an ED flag is open, matching the evening
    // backstop. cancelMorningNotification above already cleared both prompts.
    if (await weighInEdFlagOpen()) return;
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    const name = greetName();
    // NOTIF-4: schedule one WEEKLY trigger per weekday so the morning copy
    // actually rotates. The old single DAILY trigger froze whatever copy was
    // picked at schedule time, so the per-weekday rotation never happened until
    // the next re-lay. expo weekday is 1=Sunday..7=Saturday -> JS getDay (w-1).
    for (let expoWeekday = 1; expoWeekday <= 7; expoWeekday += 1) {
      const copy = pickMorningCopy(expoWeekday - 1, name);
      // eslint-disable-next-line no-await-in-loop
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIF_ID_MORNING}_${expoWeekday}`,
        content: {
          title: copy.title,
          body: copy.body,
          data: { type: 'morning_weight' },
          // Q1: sound ON so a locked-phone morning nudge is actually noticed
          // (was silent). The handler still stands this down once the weight is
          // logged, and now also under an open ED flag (louder => must go quiet
          // when a flag is open).
          sound: true,
        },
        trigger: {
          channelId: COACHING_REMINDERS_CHANNEL,
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour: h,
          minute: m,
        },
      });
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.MORNING_WEIGHT,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleMorningWeight', e?.message);
    }
  }
}

// ─── Evening weigh-in backstop (Q1) ───────────────────────────────────────────
// A gentle end-of-day second chance to log today's weight, laid alongside the
// morning nudge and governed by the SAME morningEnabled toggle. Copy is neutral
// ("if you haven't yet") so it never accuses a user who already logged, and the
// handler stands it down at delivery once the weight is logged or an ED flag is
// open. Additionally ED-gated at SCHEDULE time here: while a flag is open we do
// not lay it at all (a second daily weight prompt at a flagged user is the harm
// pattern). Re-laid on every launch (restoreNotifications), so it comes back the
// moment a flag clears.

function eveningCopies(name) {
  return [
    { title: `Evening${name}`, body: 'If you haven\'t caught today\'s weight yet, there\'s still time. No worries either way.' },
    { title: `Before the day\'s out${name}`, body: 'A gentle nudge to log today\'s weight if you haven\'t already.' },
    { title: `Quick one${name}`, body: 'If you haven\'t weighed in yet today, whenever suits keeps your coaching on track.' },
    { title: `Evening${name}`, body: 'Still time to pop on the scales today if you fancy it. That\'s all for now.' },
  ];
}

function pickEveningCopy(dayOfWeek, name = '') {
  const copies = eveningCopies(name);
  return copies[dayOfWeek % copies.length];
}

// Shared ED-flag schedule gate for BOTH weigh-in prompts. A loud/repeated
// weight prompt at a flagged user is the harm pattern, so neither the morning
// nudge nor the evening backstop is laid while a flag is open. Because the OS
// delivers already-laid triggers in the background (where no handler runs),
// CoachOutputScreen also cancels these prompts the instant it raises a flag —
// this gate then stops restoreNotifications (which cancels-all, then re-lays)
// from putting them back while the flag stays open.
async function weighInEdFlagOpen() {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = useAppStore.getState()?.user?.id;
    if (!uid) return false;
    // eslint-disable-next-line global-require
    const { getOpenEdPatternFlag } = require('../database');
    return !!(await getOpenEdPatternFlag(uid));
  } catch (_) {
    return false;
  }
}

export async function cancelEveningWeightReminder() {
  for (let w = 1; w <= 7; w += 1) {
    // eslint-disable-next-line no-await-in-loop
    try { await Notifications.cancelScheduledNotificationAsync(`${NOTIF_ID_EVENING}_${w}`); } catch {}
  }
}

/**
 * Evening weigh-in backstop. Lays one WEEKLY trigger per weekday (rotating copy,
 * like the morning nudge). Suppressed at schedule time under an open ED flag,
 * and again at delivery (handler) once the weight is logged / the flag is open.
 *
 * @param {number} hour    0-23, default 19 (19:30 local)
 * @param {number} minute  0-59, default 30
 */
export async function scheduleEveningWeightReminder(hour = 19, minute = 30) {
  if (Platform.OS === 'web') return;
  try {
    await cancelEveningWeightReminder();
    // ED-flag schedule gate: never lay a second daily weight prompt while a flag
    // is open. Re-laid by restoreNotifications on the next launch/foreground
    // after the flag clears (and by clearEdPatternFlag's caller at clear time).
    if (await weighInEdFlagOpen()) return;
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    const name = greetName();
    for (let expoWeekday = 1; expoWeekday <= 7; expoWeekday += 1) {
      const copy = pickEveningCopy(expoWeekday - 1, name);
      // eslint-disable-next-line no-await-in-loop
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIF_ID_EVENING}_${expoWeekday}`,
        content: {
          title: copy.title,
          body: copy.body,
          data: { type: 'evening_weight' },
          sound: true,
        },
        trigger: {
          channelId: COACHING_REMINDERS_CHANNEL,
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour: h,
          minute: m,
        },
      });
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.EVENING_WEIGHT,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleEveningWeight', e?.message);
    }
  }
}

// ─── Meal-log reminders (gap #4) ───────────────────────────────────────────────
// Opt-in, convenience-only daily nudges to log a meal. STRICTLY no guilt: no
// "you haven't logged", no "you're behind", no streak. The body just offers a
// gentle reminder. Default OFF; added in Notification settings. Quiet hours are
// respected. Each reminder is { id, label, hour, minute, enabled }.
const NOTIF_ID_MEAL_PREFIX = 'volyume_meal_reminder_';

export async function cancelMealReminders() {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    for (const n of all || []) {
      if (typeof n?.identifier === 'string' && n.identifier.startsWith(NOTIF_ID_MEAL_PREFIX)) {
        // eslint-disable-next-line no-await-in-loop
        await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
      }
    }
  } catch (_) { /* tolerate */ }
}

export async function scheduleMealReminders(reminders = []) {
  if (Platform.OS === 'web') return;
  try {
    await cancelMealReminders();
    const quiet = await getQuietHours();
    for (const r of reminders) {
      if (!r || r.enabled === false || r.id == null) continue;
      const hr = Math.max(0, Math.min(23, r.hour | 0));
      const mn = Math.max(0, Math.min(59, r.minute | 0));
      const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hr, mn, quiet);
      const label = (typeof r.label === 'string' && r.label.trim()) ? r.label.trim().slice(0, 24) : 'Meal';
      // eslint-disable-next-line no-await-in-loop
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIF_ID_MEAL_PREFIX}${r.id}`,
        content: {
          title: label,
          body: 'A gentle reminder to log it if it helps. No pressure.',
          data: { type: CATEGORY.MEAL_LOG_REMINDER },
          sound: false,
        },
        trigger: {
          channelId: COACHING_REMINDERS_CHANNEL,
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
        },
      });
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.MEAL_LOG_REMINDER,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
  }
}

// ─── Weekly check-in reminder ─────────────────────────────────────────────────

function checkinCopy(name) {
  return {
    title: `How has your week gone${name}`,
    body: 'A two-minute check-in is all it takes, and your coach tunes next week around it.',
  };
}

/**
 * Returns a Date for the next occurrence of (weekday at hour:minute)
 * strictly after `after`. Used for one-off check-in reminders so we
 * can skip the week when the user has already checked in.
 */
function getNextWeekdayDate(weekday, hour, minute, after = new Date()) {
  const target = new Date(after);
  const currentDow = target.getDay();
  let daysUntil = (weekday - currentDow + 7) % 7;
  target.setHours(hour, minute, 0, 0);
  if (daysUntil === 0 && target.getTime() <= after.getTime()) {
    daysUntil = 7;
  }
  target.setDate(target.getDate() + daysUntil);
  return target;
}

export async function scheduleCheckinReminder(weekday = 0, hour = 12, minute = 0, options = {}) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN).catch(() => {});

    const baseAfter = options.skipThisWeek
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : new Date();
    let fireAt = getNextWeekdayDate(weekday, hour, minute, baseAfter);

    // Minimum-gap enforcement: when the user changes their check-in
    // day mid-cycle, the next reminder must still land at least
    // minGapDays after their LAST check-in so the coach gets a full
    // weekly trend window.
    const minGapMs = (options.minGapDays ?? 0) * 24 * 60 * 60 * 1000;
    const lastCheckinMs = options.lastCheckinMs ?? 0;
    if (minGapMs > 0 && lastCheckinMs > 0) {
      const earliest = lastCheckinMs + minGapMs;
      while (fireAt.getTime() < earliest) {
        fireAt.setDate(fireAt.getDate() + 7);
      }
    }

    const quiet = await getQuietHours();
    const { date: shiftedDate } = shiftDateOutOfQuietHours(fireAt, quiet);

    const checkin = checkinCopy(greetName());
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_CHECKIN,
      content: {
        title: checkin.title,
        body: checkin.body,
        data: { type: 'weekly_checkin' },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: shiftedDate,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.WEEKLY_CHECKIN_REMINDER,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleCheckin', e?.message);
    }
  }
}

/**
 * Start (Monday 00:00 LOCAL) of the current week, in epoch ms. Local, not
 * UTC, so it matches getCurrentWeekStart in WeeklyCheckInScreen and the
 * rest of the app's week boundary (UK-local rule).
 */
function getCurrentMondayWeekStartMs() {
  return localWeekStartMs();
}

/**
 * Schedule the next check-in reminder, but skip the upcoming
 * check-in day if the user has already saved a check-in for this
 * calendar week.
 */
export async function scheduleNextCheckinReminder(userId, weekday = 0, hour = 12, minute = 0) {
  let alreadyDone = false;
  try {
    if (userId) {
      // eslint-disable-next-line global-require
      const { getLatestCheckin } = require('../database');
      const latest = await getLatestCheckin(userId);
      const cycleStart = getCurrentMondayWeekStartMs();
      const now = Date.now();
      // Suppress on the check-in's actual creation instant, not its stored
      // week_start. created_at is an absolute timestamp, so it matches the
      // local week regardless of how week_start was computed (older rows
      // stored a UTC-Monday week_start); falls back to weekStart only if a
      // row somehow lacks created_at.
      // A row can exist from a completed workout (which contributes only
      // sleep_quality), so require a real check-in: energy_score is always set
      // by the weekly check-in. Without this, training suppressed the next
      // check-in reminder even though the user never checked in.
      const madeAt = latest?.createdAt ?? latest?.weekStart ?? 0;
      if (latest && latest.energyScore != null && madeAt >= cycleStart && madeAt <= now) {
        alreadyDone = true;
      }
    }
  } catch {}
  await scheduleCheckinReminder(weekday, hour, minute, { skipThisWeek: alreadyDone });
}

// ─── Cascade gate (day 19 + day 21) ─────────────────────────────────────────────
// NOTIFICATIONS_LOCKED.md "Timing": cascade day 19 (Pro winding down)
// and day 21 (auto-downgrade fired) both at 10:00 local, not
// configurable. These are LOCAL one-shots derived from the trial end
// date the device already holds (proTrialEndsAt); no server push is
// involved. The end date is the trial cutover (day 14 of the 14-day
// trial); the first push fires 2 days before (day 12), matching the
// "ends in two days" copy. The identifier strings still say day19/day21
// from the retired 3-tier cascade: they are KEPT deliberately, because
// cancel-before-reschedule matches on identifier and renaming them would
// orphan schedules already laid on updated devices. Names are cosmetic;
// the fire dates are derived from proTrialEndsAt either way (E10-F6).

const NOTIF_ID_CASCADE_19 = 'volyume_cascade_day19';
const NOTIF_ID_CASCADE_21 = 'volyume_cascade_day21';

const CASCADE_19_COPY = {
  title: 'Your free Pro trial ends in two days',
  body: 'Hope you\'ve been enjoying it. Have a look at your options whenever you\'re ready.',
};
const CASCADE_21_COPY = {
  title: 'You\'re back on the free plan',
  body: 'Everything you\'ve logged is safe and waiting. You can go Pro again any time.',
};

/**
 * Schedule both cascade-gate reminders from the trial end date.
 *
 * @param {number|string|Date} trialEndsAt  proTrialEndsAt: the day-21
 *        cutover instant. Day 19 is derived as 2 days earlier.
 *
 * Both fire at 10:00 local on their day, shifted out of quiet hours.
 * Past gates are skipped (a trial ending tomorrow has no day-19 push).
 * Re-running cancels and re-lays the schedules, so calling this on
 * every launch is safe and idempotent.
 */
export async function scheduleCascadeGateNotifications(trialEndsAt) {
  if (Platform.OS === 'web') return;
  const endMs = trialEndsAt instanceof Date
    ? trialEndsAt.getTime()
    : (typeof trialEndsAt === 'number' ? trialEndsAt : Date.parse(trialEndsAt));
  if (!Number.isFinite(endMs)) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_19).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_21).catch(() => {});

    const quiet = await getQuietHours();
    const now = Date.now();

    // Day 21: 10:00 local on the cutover day.
    const day21 = new Date(endMs);
    day21.setHours(10, 0, 0, 0);
    // Day 19: 10:00 local, two days before the cutover.
    const day19 = new Date(endMs);
    day19.setDate(day19.getDate() - 2);
    day19.setHours(10, 0, 0, 0);

    const gates = [
      { id: NOTIF_ID_CASCADE_19, when: day19, copy: CASCADE_19_COPY },
      { id: NOTIF_ID_CASCADE_21, when: day21, copy: CASCADE_21_COPY },
    ];

    for (const g of gates) {
      if (g.when.getTime() <= now) continue; // past gate, don't schedule
      const { date: shifted } = shiftDateOutOfQuietHours(g.when, quiet);
      // Push budget (NOTIFICATIONS_LOCKED addendum): cascade gates are top
      // priority, so this evicts a lower-priority push on a full day rather
      // than ever dropping the gate itself.
      const slot = await requestEventPushSlot({ category: CATEGORY.CASCADE_GATE, fireDate: shifted });
      if (!slot.allowed) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: g.id,
        content: {
          title: g.copy.title,
          body: g.copy.body,
          data: { type: 'cascade_gate' },
          sound: false,
        },
        trigger: {
          channelId: COACHING_REMINDERS_CHANNEL,
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: shifted,
        },
      });
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.CASCADE_GATE,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleCascadeGate', e?.message);
    }
  }
}

export async function cancelCascadeGateNotifications() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_19); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CASCADE_21); } catch {}
}

// ─── COMP-023: trial day-3 "the coach saw you" moment ─────────────────────────
// One local notification per trial, fired at trial start + 3 days, 10:00 local
// (quiet-hours-shifted), variant + copy baked from live local counters at
// schedule time. Like the cascade gates, this is wiped by cancelAllNotifications
// on restore, so restoreNotifications re-lays it. Suppressed entirely under an
// open ED flag (the Home banner carries a neutral, no-weight line instead).

export async function cancelTrialDay3Notification() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_TRIAL_DAY3); } catch {}
}

export async function scheduleTrialDay3Notification(userId, profile) {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line global-require
    const { stageOf } = require('../payments/cascade');
    if (!profile || stageOf(profile) !== 'pro_trial') { await cancelTrialDay3Notification(); return; }

    const endsAt = profile.proTrialEndsAt ?? profile.pro_trial_ends_at ?? null;
    const fire = trialDay3FireDate(endsAt);
    // No valid date, or day 3 already passed (user opening later in the trial):
    // nothing to lay; the Home banner carries the moment in-app.
    if (!fire || fire.getTime() <= Date.now()) { await cancelTrialDay3Notification(); return; }

    // eslint-disable-next-line global-require
    const db = require('../database');
    const [workouts, weights, edFlag] = await Promise.all([
      userId ? db.getAllWorkouts(userId).catch(() => []) : Promise.resolve([]),
      userId ? db.getMorningWeightsLast14Days(userId).catch(() => []) : Promise.resolve([]),
      userId ? db.getOpenEdPatternFlag(userId).catch(() => null) : Promise.resolve(null),
    ]);

    // Open ED flag → never schedule a weight-adjacent push; the banner falls
    // back to a neutral line with no counts or weight ask.
    if (edFlag) { await cancelTrialDay3Notification(); return; }

    const trialStart = trialStartFromEndsAt(endsAt);
    const completedSessions = workouts.filter(w => w.isCompleted && (w.startedAt ?? 0) >= trialStart).length;
    const weekAgo = Date.now() - 7 * 86400000;
    const weighIns7d = weights.filter(w => (w.loggedAt ?? 0) >= weekAgo).length;
    const firstWeightAt = weights.length
      ? Math.min(...weights.map(w => w.loggedAt ?? Infinity))
      : null;

    let checkinDay = 0;
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Number.isFinite(p?.checkinDay)) checkinDay = p.checkinDay;
      }
    } catch (_) { /* default Sunday */ }

    const variant = selectTrialVariant({ completedSessions, weighIns7d });
    const unlock = firstReviewUnlockDate(firstWeightAt, checkinDay);
    const copy = trialDay3Push({ variant, completedSessions, weighIns7d, unlockDayName: dayName(unlock) });

    await cancelTrialDay3Notification();
    const quiet = await getQuietHours();
    const { date: shifted } = shiftDateOutOfQuietHours(fire, quiet);
    // Push budget (NOTIFICATIONS_LOCKED addendum). Blocked = dropped, not
    // re-queued; the Home banner still carries the day-3 moment in-app.
    const slot = await requestEventPushSlot({ category: CATEGORY.TRIAL_DAY3, fireDate: shifted });
    if (!slot.allowed) return;
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_TRIAL_DAY3,
      content: {
        title: copy.title,
        body: copy.body,
        data: { type: 'trial_day3', variant },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: shifted,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.TRIAL_DAY3,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleTrialDay3', e?.message);
    }
  }
}

// ─── COMP-025-A: post-churn win-back ─────────────────────────────────────────
// One local notification per churn episode, anchored on the lapse timestamp
// (+30 days by default, or the §4d stated-return window). Re-laid on each app
// open while the fire date is still in the future so the session counts stay
// fresh (local notifications bake content at schedule time). Suppressed
// entirely while a wellbeing/ED flag is open. Single-shot is enforced by
// winbackState (one per episode + an absolute 180-day floor across episodes).
//
// Honest v1 limit (accepted, see blueprint §4c): a user who never reopens the
// app during the lapsed window never gets it — quiet hours + prefs live only on
// device, and an unsolicited server push to the never-returning segment reads
// most like spam.

export async function cancelWinbackNotification() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_WINBACK); } catch {}
}

export async function scheduleWinbackNotification(userId) {
  if (Platform.OS === 'web') return;
  try {
    const episode = await getWinbackEpisode();
    if (!episode) { await cancelWinbackNotification(); return; }

    // ED/wellbeing suppression (§5): never lay (and cancel any already-laid one)
    // while a flag is open. Silence is the respectful behaviour.
    // eslint-disable-next-line global-require
    const db = require('../database');
    const edFlag = userId ? await db.getOpenEdPatternFlag(userId).catch(() => null) : null;
    if (edFlag) { await cancelWinbackNotification(); return; }

    const statedReturn = await getWinbackStatedReturn();
    const fire = winbackFireDate(episode.lapseAt, statedReturn);
    // The window has arrived/passed: leave whatever is already laid (it has
    // fired or fires imminently); never schedule a past date. v1 does not chase
    // a window that elapsed while suppressed.
    if (fire.getTime() <= Date.now()) return;

    // First lay of this episode is gated by the cross-episode 180-day floor;
    // a re-lay (to refresh counts) of an already-laid episode is not — it is the
    // same single win-back, rescheduled under one identifier.
    const firstLay = !episode.winbackLaid;
    if (firstLay) {
      const lastFiredAt = await getWinbackLastFiredAt();
      if (!canLayWinback({ episode, lastFiredAt })) return;
    }

    // Counts from existing free-tier data (sessions only — never weight or
    // calorie figures, per §5).
    const workouts = userId ? await db.getAllWorkouts(userId).catch(() => []) : [];
    const completed = workouts.filter(w => w.isCompleted);
    const sessionsSince = completed.filter(w => (w.startedAt ?? 0) >= episode.lapseAt).length;
    const totalSessions = completed.length;
    const copy = winbackPush({
      sessionsSince,
      totalSessions,
      sinceLabel: monthLabel(episode.lapseAt),
      statedReturn,
    });

    await cancelWinbackNotification();
    const quiet = await getQuietHours();
    const { date: shifted } = shiftDateOutOfQuietHours(fire, quiet);
    // Push budget (NOTIFICATIONS_LOCKED addendum). Blocked = not laid and not
    // marked, so the next app-open re-lay retries the same window.
    const slot = await requestEventPushSlot({ category: CATEGORY.WINBACK, fireDate: shifted });
    if (!slot.allowed) return;
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_WINBACK,
      content: {
        title: copy.title,
        body: copy.body,
        data: { type: 'winback' },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: shifted,
      },
    });
    // notification_sent telemetry fires from the OS-received listener
    // (listeners.js), which derives the WINBACK category from data.type — the
    // same convention the other schedulers follow. Emitting it here would
    // double-count on every count-refresh re-lay.
    if (firstLay) await markWinbackLaid();
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.WINBACK,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleWinback', e?.message);
    }
  }
}

// ─── OPP-C03: missed check-in ghost prevention ───────────────────────────────
// Two single-shot pushes per missed check-in episode: a gentle same-evening
// nudge (20:00 local on the check-in day) and a value-led +48h follow-up.
// Never shame copy. Pro-only, toggleable (Settings → Coaching reminders),
// suppressed entirely under an open ED flag, quiet-hours shifted and gated
// through the push budget. Like the cascade gates, the pair is wiped by
// cancelAllNotifications on restore, so restoreNotifications re-lays it; the
// episode maths in missedCheckin.js keeps re-lays single-shot (a slot whose
// date has passed is never laid again for the same episode).

const NOTIF_ID_CHECKIN_MISSED_EVENING = 'volyume_checkin_missed_evening';
const NOTIF_ID_CHECKIN_MISSED_48H = 'volyume_checkin_missed_48h';

export async function cancelMissedCheckinFollowups() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN_MISSED_EVENING); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN_MISSED_48H); } catch {}
}

export async function scheduleMissedCheckinFollowups(userId) {
  if (Platform.OS === 'web') return;
  try {
    // Pro-only: check-ins are a Pro coaching input, so the follow-ups never
    // reach free users.
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    if (useAppStore.getState()?.tier !== 'pro') {
      await cancelMissedCheckinFollowups();
      return;
    }

    // Category toggle (default on) + the user's check-in schedule, from the
    // same prefs blob the check-in reminder uses.
    let prefs = {};
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) prefs = JSON.parse(raw) ?? {};
    } catch (_) { /* defaults below */ }
    if (prefs.missedCheckinEnabled === false) {
      await cancelMissedCheckinFollowups();
      return;
    }
    const weekday = Number.isFinite(prefs.checkinDay) ? prefs.checkinDay : 0;
    const hour = Number.isFinite(prefs.checkinHour) ? prefs.checkinHour : 18;
    const minute = Number.isFinite(prefs.checkinMinute) ? prefs.checkinMinute : 0;

    // Open ED/wellbeing flag → never lay (and retire anything laid). Silence
    // is the respectful behaviour; the suppression is consumed here, never
    // altered.
    // eslint-disable-next-line global-require
    const db = require('../database');
    const edFlag = userId ? await db.getOpenEdPatternFlag(userId).catch(() => null) : null;
    if (edFlag) {
      await cancelMissedCheckinFollowups();
      return;
    }

    // The last REAL check-in (energy score present, same rule as the
    // reminder's skip logic) resolves the episode: a checked-in week pre-lays
    // for the next expected occurrence instead.
    let lastCheckinMs = 0;
    try {
      const latest = userId ? await db.getLatestCheckin(userId) : null;
      if (latest && latest.energyScore != null) {
        lastCheckinMs = latest.createdAt ?? latest.weekStart ?? 0;
      }
    } catch (_) { /* treat as never checked in */ }

    const { evening, followup } = missedCheckinFireDates({
      weekday, hour, minute, now: new Date(), lastCheckinMs, minGapDays: 7,
    });

    await cancelMissedCheckinFollowups();
    const quiet = await getQuietHours();
    const copy = missedCheckinPush(greetName());
    const slots = [
      { id: NOTIF_ID_CHECKIN_MISSED_EVENING, when: evening, copy: copy.evening, slot: 'evening' },
      { id: NOTIF_ID_CHECKIN_MISSED_48H, when: followup, copy: copy.followup, slot: 'followup' },
    ];
    for (const s of slots) {
      if (!s.when || s.when.getTime() <= Date.now()) continue; // past slot: never chased
      const { date: shifted } = shiftDateOutOfQuietHours(s.when, quiet);
      // Push budget: blocked = dropped for this episode, never re-queued.
      // eslint-disable-next-line no-await-in-loop
      const slotOk = await requestEventPushSlot({ category: CATEGORY.CHECKIN_MISSED, fireDate: shifted });
      if (!slotOk.allowed) continue;
      // eslint-disable-next-line no-await-in-loop
      await Notifications.scheduleNotificationAsync({
        identifier: s.id,
        content: {
          title: s.copy.title,
          body: s.copy.body,
          data: { type: 'checkin_missed', slot: s.slot },
          sound: false,
        },
        trigger: {
          channelId: COACHING_REMINDERS_CHANNEL,
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: shifted,
        },
      });
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.CHECKIN_MISSED,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleMissedCheckin', e?.message);
    }
  }
}

// ─── S6: early-activation nudge ──────────────────────────────────────────────
// A single-shot push per stall stage (0/1/2 completed sessions in the first 14
// days) for a brand-new user, plus the matching Home banner (HomeScreen reads
// the same resolveActivationNudge). Tier-blind (activation is a free action).
// ED-flag suppressed at schedule AND delivery (handler), quiet-hours shifted,
// budget-gated. The anchored fire dates keep re-lays single-shot: a slot whose
// date has passed is never laid again (the missed-check-in pattern), so no
// per-stage flag is needed. Wiped by cancelAllNotifications on restore, so
// restoreNotifications re-lays it (which also lays the 0-session cold-start for
// a user who never returns to complete a workout); the workout-completion hook
// lays the next stage the instant a session lands.
const NOTIF_ID_ACTIVATION_NUDGE = 'volyume_activation_nudge';
const ACTIVATION_WINDOW_GRACE_MS = (14 + 3) * 86400000; // window + grace hard stop

export async function cancelActivationNudge() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_ACTIVATION_NUDGE); } catch {}
}

export async function scheduleActivationNudge(userId) {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    const uid = userId ?? useAppStore.getState()?.user?.id ?? null;
    if (!uid) { await cancelActivationNudge(); return; }

    // Category toggle (default on).
    let prefs = {};
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) prefs = JSON.parse(raw) ?? {};
    } catch (_) { /* defaults below */ }
    if (prefs.activationNudgeEnabled === false) { await cancelActivationNudge(); return; }

    // Account-creation date (install proxy) from the live session. Without it we
    // cannot place the window, so we stand down rather than guess.
    let accountCreatedAtMs = null;
    try {
      // eslint-disable-next-line global-require
      const { getSupabaseClient } = require('../supabase');
      const { data } = await getSupabaseClient().auth.getSession();
      const iso = data?.session?.user?.created_at ?? null;
      if (iso) accountCreatedAtMs = new Date(iso).getTime();
    } catch (_) { accountCreatedAtMs = null; }
    if (!Number.isFinite(accountCreatedAtMs)) { await cancelActivationNudge(); return; }

    // Cheap early-out: past the window + grace the lever is done for this user
    // (this also skips the workout read for every established user).
    if (Date.now() - accountCreatedAtMs > ACTIVATION_WINDOW_GRACE_MS) { await cancelActivationNudge(); return; }

    // Open ED/wellbeing flag → never lay (and retire anything laid). Silence is
    // the respectful behaviour; the suppression is consumed here, never altered.
    // eslint-disable-next-line global-require
    const db = require('../database');
    const edFlag = await db.getOpenEdPatternFlag(uid).catch(() => null);
    if (edFlag) { await cancelActivationNudge(); return; }

    // Completed-session start times only (never weight or calorie figures).
    const workouts = await db.getAllWorkouts(uid).catch(() => []);
    const completedStartedAtMs = workouts.filter((w) => w.isCompleted).map((w) => w.startedAt ?? 0);

    const nudge = resolveActivationNudge({ accountCreatedAtMs, completedStartedAtMs, nowMs: Date.now() });
    if (!nudge) { await cancelActivationNudge(); return; }

    await cancelActivationNudge();
    const fire = new Date(nudge.fireAtMs);
    // A fire time already in the past is never chased: an anchored slot that has
    // passed is not re-laid (single-shot per stage), matching missed check-in.
    if (fire.getTime() <= Date.now()) return;

    const quiet = await getQuietHours();
    const { date: shifted } = shiftDateOutOfQuietHours(fire, quiet);
    const slot = await requestEventPushSlot({ category: CATEGORY.ACTIVATION_NUDGE, fireDate: shifted });
    if (!slot.allowed) return;
    const copy = activationNudgePush(nudge.stage, greetName());
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_ACTIVATION_NUDGE,
      content: {
        title: copy.title,
        body: copy.body,
        data: { type: 'activation_nudge', stage: nudge.stage },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: shifted,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.ACTIVATION_NUDGE,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleActivationNudge', e?.message);
    }
  }
}

// ─── F3: planned-meal confirm reminder ───────────────────────────────────────
const NOTIF_ID_PLANNED_MEAL_CONFIRM = 'volyume_planned_meal_confirm';

export async function cancelPlannedMealConfirm() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_PLANNED_MEAL_CONFIRM); } catch {}
}

/**
 * F3: lay a gentle 20:00 nudge to confirm today's planned meals, but only when
 * the day actually has planned meals the user has not marked eaten. Pro-only,
 * toggle-gated (plannedMealConfirmEnabled, default on), suppressed under an open
 * ED/wellbeing flag, and quiet-hours-shifted + budgeted like every event push.
 * Self-suppresses (cancels) when there is nothing to confirm.
 * Spec: docs/f3-planned-meal-reminder-notification-spec-2026-06-16.md.
 */
export async function schedulePlannedMealConfirm(userId) {
  if (Platform.OS === 'web') return;
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    if (useAppStore.getState()?.tier !== 'pro') { await cancelPlannedMealConfirm(); return; }

    let prefs = {};
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) prefs = JSON.parse(raw) ?? {};
    } catch (_) { /* defaults below */ }
    if (prefs.plannedMealConfirmEnabled === false) { await cancelPlannedMealConfirm(); return; }

    const uid = userId ?? useAppStore.getState()?.user?.id ?? null;
    if (!uid) { await cancelPlannedMealConfirm(); return; }

    // Open ED/wellbeing flag → never lay (a food push at a flagged user is the
    // harm pattern, exactly as CHECKIN_MISSED / ED_PATTERN_LOCKOUT).
    // eslint-disable-next-line global-require
    const db = require('../database');
    const edFlag = await db.getOpenEdPatternFlag(uid).catch(() => null);
    if (edFlag) { await cancelPlannedMealConfirm(); return; }

    // Self-suppress: only nudge when TODAY has unconfirmed planned meals.
    // eslint-disable-next-line global-require
    const { getFoodEntriesForDay } = require('../food/db');
    // eslint-disable-next-line global-require
    const { todayLocalKey } = require('../dayKey');
    const entries = await getFoodEntriesForDay(uid, todayLocalKey()).catch(() => []);
    const hasUnconfirmed = Array.isArray(entries) && entries.some((e) => e.is_planned);
    if (!hasUnconfirmed) { await cancelPlannedMealConfirm(); return; }

    await cancelPlannedMealConfirm();
    const when = plannedConfirmSlot(new Date());
    if (!when || when.getTime() <= Date.now()) return; // past 20:00 today: no nudge

    const quiet = await getQuietHours();
    const { date: shifted } = shiftDateOutOfQuietHours(when, quiet);
    const slotOk = await requestEventPushSlot({ category: CATEGORY.PLANNED_MEAL_CONFIRM, fireDate: shifted });
    if (!slotOk.allowed) return;

    const copy = plannedMealConfirmPush(greetName());
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_PLANNED_MEAL_CONFIRM,
      content: {
        title: copy.title,
        body: copy.body,
        data: { type: 'planned_meal_confirm' },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: shifted,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.PLANNED_MEAL_CONFIRM,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.schedulePlannedMealConfirm', e?.message);
    }
  }
}

// ─── Weekly coach output ready ───────────────────────────────────────────────────
// NOTIFICATIONS_LOCKED.md "Timing": Monday 09:00 local, time-only
// configurable. Coach output is computed client-side after the weekly
// check-in, so this is a LOCAL recurring weekly reminder, not a server
// push. The default weekday is Monday (weekday 2 in expo's 1=Sunday
// convention); hour/minute are user-adjustable.

const NOTIF_ID_COACH_READY = 'volyume_weekly_coach_ready';

const COACH_READY_COPY = {
  title: 'Your coaching for the week is ready',
  body: 'Have a look at what\'s changed for you this week, and the thinking behind it.',
};

/**
 * Schedule a ONE-OFF "weekly coach output ready" reminder for the next Monday.
 *
 * @param {number} hour    0-23, default 9 (09:00 local)
 * @param {number} minute  0-59, default 0
 *
 * This is laid only when the user submits a check-in
 * (WeeklyCheckInScreen.handleSubmit), so the "your plan is ready" notification
 * fires only in a week the user actually checked in, i.e. only when a real
 * review exists. A week with no check-in gets no notification. Previously this
 * was a RECURRING weekly notification that fired every Monday regardless, and
 * tapping it (with no review for the week) dropped the user on the
 * "building baseline" screen. One-off + re-laid each check-in fixes that.
 * Re-running cancels and re-lays, so it stays idempotent.
 */
export async function scheduleWeeklyCoachReady(hour = 9, minute = 0) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_COACH_READY).catch(() => {});
    const quiet = await getQuietHours();
    const { hour: h, minute: m } = shiftHourMinuteOutOfQuietHours(hour, minute, quiet);
    // Next Monday at h:m (getNextWeekdayDate uses JS getDay, Monday = 1).
    const fireAt = getNextWeekdayDate(1, h, m, new Date());
    // Push budget (NOTIFICATIONS_LOCKED addendum): rank 2, evicts a
    // lower-priority push on a full Monday rather than being dropped.
    const slot = await requestEventPushSlot({ category: CATEGORY.WEEKLY_COACH_READY, fireDate: fireAt });
    if (!slot.allowed) return;
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_COACH_READY,
      content: {
        title: COACH_READY_COPY.title,
        body: COACH_READY_COPY.body,
        data: { type: 'weekly_coach_ready' },
        sound: false,
      },
      trigger: {
        channelId: COACHING_REMINDERS_CHANNEL,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.WEEKLY_COACH_READY,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.scheduleWeeklyCoachReady', e?.message);
    }
  }
}

export async function cancelWeeklyCoachReady() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_COACH_READY); } catch {}
}

// ─── Cancel helpers ───────────────────────────────────────────────────────────

export async function cancelMorningNotification() {
  // Legacy single id (pre-NOTIF-4) plus the 7 per-weekday ids.
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_MORNING); } catch {}
  for (let w = 1; w <= 7; w += 1) {
    try { await Notifications.cancelScheduledNotificationAsync(`${NOTIF_ID_MORNING}_${w}`); } catch {}
  }
  // Q1: the evening backstop rides the same morningEnabled toggle, so turning
  // the morning nudge off clears it too.
  await cancelEveningWeightReminder();
}

export async function cancelCheckinNotification() {
  try { await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHECKIN); } catch {}
}

export async function cancelAllNotifications() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
}

// ─── Restore on app launch ────────────────────────────────────────────────────

/**
 * Re-applies saved notification preferences on app launch.
 * Call from RootNavigator after the user session is restored.
 *
 * @param {object} prefs - { morningEnabled, morningHour, morningMinute,
 *                           checkinEnabled, checkinDay, checkinHour, checkinMinute }
 * @param {string|null} userId
 */
// NOTIF-1: the morning/check-in/coach triggers bake the quiet-hours-shifted
// hour in at schedule time, computed against the device's timezone THEN. After
// the user changes timezone (travel), that baked-in hour is wrong until the
// next cold start re-lays it. Call this on foreground: if the timezone offset
// changed since we last scheduled, re-lay the notifications so quiet-hours is
// recomputed for the new zone. Gated on the offset so a normal foreground does
// no work.
const TZ_OFFSET_KEY = '@volyume_notif_tz_offset';

export async function rescheduleForTimezoneIfChanged(userId = null) {
  if (Platform.OS === 'web') return;
  try {
    const current = new Date().getTimezoneOffset();
    const storedRaw = await AsyncStorage.getItem(TZ_OFFSET_KEY);
    const stored = storedRaw == null ? null : Number(storedRaw);
    if (stored === current) return; // no change, nothing to do
    await AsyncStorage.setItem(TZ_OFFSET_KEY, String(current));
    if (stored === null) return; // first run: just record the baseline
    const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
    if (raw) await restoreNotifications(JSON.parse(raw), userId);
  } catch (_) { /* tolerate */ }
}

export async function restoreNotifications(prefs, userId = null) {
  if (!prefs) return;
  // eslint-disable-next-line global-require
  const { getNotificationPermissionStatus } = require('./permissions');
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') return;

  await cancelAllNotifications();

  // E10-F4: the weigh-in prompts and the check-in reminder are Pro coaching
  // surfaces (their tap targets are Pro-gated, and a lapsed free user has no
  // free surface to act on them or any UI to turn them off). Re-lay them for
  // Pro only, matching the tier gates the missed-check-in and planned-meal
  // schedulers already carry. A daily audible weigh-in prompt aimed at
  // someone who cannot act on it is exactly the pressure pattern the ED
  // rules exist to avoid.
  let isPro = false;
  try {
    // eslint-disable-next-line global-require
    isPro = require('../../store/useAppStore').default.getState()?.tier === 'pro';
  } catch (_) { /* store unavailable: fail closed (no coaching re-lays) */ }

  if (isPro && prefs.morningEnabled) {
    await scheduleMorningWeightNotification(prefs.morningHour ?? 7, prefs.morningMinute ?? 0);
    // Q1: the evening backstop rides the same toggle. Fixed 19:30 default; the
    // helper self-gates under an open ED flag.
    await scheduleEveningWeightReminder(prefs.eveningHour ?? 19, prefs.eveningMinute ?? 30);
  } else {
    await cancelEveningWeightReminder();
  }
  if (isPro && prefs.checkinEnabled) {
    await scheduleNextCheckinReminder(
      userId,
      prefs.checkinDay ?? 0,
      prefs.checkinHour ?? 12,
      prefs.checkinMinute ?? 0,
    );
  }

  // cancelAllNotifications above wiped the trial-window pushes too. They were
  // previously laid once at startCascade and never restored, so on the next app
  // launch the cascade-gate pushes (legacy ids _19/_21, which fire at trial
  // end−2d and trial end — i.e. day 12 and day 14 of the 14-day trial) and the
  // COMP-023 day-3 push silently vanished. Re-lay them from the stored trial end
  // date so they survive.
  // Both helpers are idempotent and no-op when the user isn't in a Pro trial.
  try {
    // eslint-disable-next-line global-require
    const store = require('../../store/useAppStore').default;
    const profile = store.getState().userProfile;
    // eslint-disable-next-line global-require
    const { stageOf } = require('../payments/cascade');
    if (profile && stageOf(profile) === 'pro_trial') {
      const endsAt = profile.proTrialEndsAt ?? profile.pro_trial_ends_at ?? null;
      if (endsAt) await scheduleCascadeGateNotifications(endsAt);
      await scheduleTrialDay3Notification(userId ?? store.getState().user?.id ?? null, profile);
    }
  } catch (_) { /* trial re-lay is best-effort */ }

  // COMP-025-A: the win-back was wiped by cancelAllNotifications too. Re-lay it
  // so it survives launches; the helper self-guards (no-op when there's no open
  // churn episode, when ED-suppressed, or when the fire date has passed).
  try {
    // eslint-disable-next-line global-require
    const store = require('../../store/useAppStore').default;
    await scheduleWinbackNotification(userId ?? store.getState().user?.id ?? null);
  } catch (_) { /* win-back re-lay is best-effort */ }

  // OPP-C03: the missed check-in follow-ups were wiped by
  // cancelAllNotifications too (the same historic wipe pattern that lost the
  // cascade gates). Re-lay; the helper self-guards (Pro-only, toggle, ED flag,
  // past slots skipped).
  try {
    // eslint-disable-next-line global-require
    const store = require('../../store/useAppStore').default;
    await scheduleMissedCheckinFollowups(userId ?? store.getState().user?.id ?? null);
  } catch (_) { /* follow-up re-lay is best-effort */ }

  // F3: re-lay the planned-meal confirm nudge (self-guards: Pro-only, toggle,
  // ED flag, only when today has unconfirmed planned meals, past slot skipped).
  try {
    // eslint-disable-next-line global-require
    const store = require('../../store/useAppStore').default;
    await schedulePlannedMealConfirm(userId ?? store.getState().user?.id ?? null);
  } catch (_) { /* planned-meal nudge re-lay is best-effort */ }

  // S6: re-lay the early-activation nudge (self-guards: toggle, window elapsed,
  // ED flag, activated, past slot skipped). This is also the path that lays the
  // 0-session cold-start for a user who signs up and never returns.
  try {
    // eslint-disable-next-line global-require
    const store = require('../../store/useAppStore').default;
    await scheduleActivationNudge(userId ?? store.getState().user?.id ?? null);
  } catch (_) { /* activation-nudge re-lay is best-effort */ }
}

// ─── Year of Lifts unlock ─────────────────────────────────────────────────────
// Year of Lifts is gated until the user has 365 days of training (see
// AnalyticsScreen). The first time the gate opens, we fire a one-shot
// local notification. Idempotent via AsyncStorage flag.

const YEAR_OF_LIFTS_NOTIFIED_KEY = '@volyume_year_of_lifts_notified';

export async function checkYearOfLiftsUnlock(earliestWorkoutAt) {
  if (Platform.OS === 'web') return;
  if (!earliestWorkoutAt) return;
  const YEAR_MS = 365 * 86400000;
  if (Date.now() - earliestWorkoutAt < YEAR_MS) return;
  try {
    const already = await AsyncStorage.getItem(YEAR_OF_LIFTS_NOTIFIED_KEY);
    if (already === 'true') return;
    // Push budget (NOTIFICATIONS_LOCKED addendum). Fires immediately, so the
    // slot is today's. Blocked = flag stays unset, so a later open retries.
    const slot = await requestEventPushSlot({ category: CATEGORY.YEAR_OF_LIFTS_UNLOCK, fireDate: new Date() });
    if (!slot.allowed) return;
    await Notifications.scheduleNotificationAsync({
      identifier: 'volyume_year_of_lifts_unlock',
      content: {
        title: 'A whole year of lifts',
        body: 'What a year. Your wrap-up is ready, swipe through it on the Progress tab.',
        data: { type: 'year_of_lifts_unlock' },
        sound: true,
      },
      trigger: { channelId: COACHING_REMINDERS_CHANNEL },
    });
    await AsyncStorage.setItem(YEAR_OF_LIFTS_NOTIFIED_KEY, 'true');
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.YEAR_OF_LIFTS_UNLOCK,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.yearOfLiftsUnlock', e?.message);
    }
  }
}

const MONTHLY_RECAP_NOTIFIED_PREFIX = '@volyume_recap_notified_';

// COMP-005: one-shot monthly recap nudge. Mirrors checkYearOfLiftsUnlock —
// fires once per calendar month (idempotent per-month AsyncStorage key) on the
// app open that first satisfies the conditions: the user has unlocked recaps
// (>=10 lifetime sessions) AND trained at least once in the month being
// recapped. A zero-session month gets nothing — silence, not shame. The body
// softens under calm mode / an open ED flag (passed in as `neutral`).
export async function checkMonthlyRecapReady({ completedCount = 0, monthSessions = 0, monthKey, monthLabel, neutral = false } = {}) {
  if (Platform.OS === 'web') return;
  if (!monthKey || !monthLabel || completedCount < 10 || monthSessions < 1) return;
  const key = `${MONTHLY_RECAP_NOTIFIED_PREFIX}${monthKey}`;
  try {
    const already = await AsyncStorage.getItem(key);
    if (already === 'true') return;
    // Push budget (NOTIFICATIONS_LOCKED addendum). Fires immediately, so the
    // slot is today's. Blocked = the month flag stays unset, so a later
    // qualifying open retries within the same month.
    const slot = await requestEventPushSlot({ category: CATEGORY.MONTHLY_RECAP, fireDate: new Date() });
    if (!slot.allowed) return;
    await Notifications.scheduleNotificationAsync({
      identifier: `volyume_monthly_recap_${monthKey}`,
      content: {
        title: `Your ${monthLabel} recap is ready`,
        body: neutral
          ? 'Last month\'s training, summed up. Have a look when you fancy.'
          : '45 seconds of what you put in last month. Have a look when you fancy.',
        data: { type: 'monthly_recap' },
        sound: true,
      },
      trigger: { channelId: COACHING_REMINDERS_CHANNEL },
    });
    await AsyncStorage.setItem(key, 'true');
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.MONTHLY_RECAP,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.monthlyRecap', e?.message);
    }
  }
}

// ─── NEW-002 rebuild: partner beats (cheer received + shared streak kept) ────
// Founder decision 2026-06-12: both pushes ship, inside the budget. Pure
// decision logic lives in partnerBeats.js; this applies the gates (web, ED
// flag, preferences toggle), the quiet hours shift, the PARTNER_CHEER budget
// slot, and the per-user watermark so a beat fires exactly once.

const PARTNER_BEATS_KEY = (userId) => `@volyume_partner_beats_v1_${userId}`;
const NOTIF_ID_PARTNER_CHEER = 'volyume_partner_cheer';
const NOTIF_ID_PARTNER_STREAK = 'volyume_partner_streak';

/**
 * Check for newly arrived partner beats and lay their pushes. Called after
 * the partner sync pull lands (the only moment a cheer can ARRIVE on
 * device), fire-and-forget. Safe to call repeatedly: watermarks make each
 * beat fire at most once.
 */
export async function schedulePartnerBeats(userId) {
  if (Platform.OS === 'web' || !userId) return;
  try {
    // eslint-disable-next-line global-require
    const { cheerPush, streakKeptPush, normaliseBeatsState, cheerToNotify, streakRunToNotify } = require('./partnerBeats');
    // eslint-disable-next-line global-require
    const db = require('../database');

    // Open ED/wellbeing flag: silence (the partner surface freezes benignly;
    // pushes must not poke at it).
    const edFlag = await db.getOpenEdPatternFlag(userId).catch(() => null);
    if (edFlag) return;

    // Preferences toggle (default ON; the notification settings screen can
    // surface partnerCheerEnabled later without a schema change).
    let prefs = {};
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) prefs = JSON.parse(raw) ?? {};
    } catch (_) { /* default on */ }
    if (prefs.partnerCheerEnabled === false) return;

    // The active partnership; no pair, no beats.
    const partnerships = await db.getPartnershipsLocal(userId).catch(() => []);
    const pair = (partnerships || []).find((p) => p.status === 'active');
    if (!pair) return;
    const partnerName = pair.partnerFirstName || null;
    const partnerId = pair.memberA === userId ? pair.memberB : pair.memberA;

    const raw = await AsyncStorage.getItem(PARTNER_BEATS_KEY(userId)).catch(() => null);
    const state = normaliseBeatsState(raw ? JSON.parse(raw) : null);
    let nextState = state;

    const quiet = await getQuietHours();

    // ── Beat 1: cheer received ──
    const lastReceived = await db.getLastCheerReceived(pair.id, userId).catch(() => null);
    const cheer = cheerToNotify(state, lastReceived);
    if (cheer) {
      nextState = { ...nextState, lastCheerId: cheer.id };
      const { date } = shiftDateOutOfQuietHours(new Date(Date.now() + 5000), quiet);
      const slot = await requestEventPushSlot({ category: CATEGORY.PARTNER_CHEER, fireDate: date });
      if (slot.allowed) {
        const copy = cheerPush(partnerName);
        await Notifications.scheduleNotificationAsync({
          identifier: NOTIF_ID_PARTNER_CHEER,
          content: {
            title: copy.title, body: copy.body,
            data: { type: 'partner_cheer' }, sound: false,
          },
          trigger: {
            channelId: COACHING_REMINDERS_CHANNEL,
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
          },
        });
      }
    }

    // ── Beat 2: shared streak kept (run grew) ──
    if (pair.streakEnabled) {
      // eslint-disable-next-line global-require
      const { computeSharedStreak, buildSharedWeeks } = require('../partners/sharedStreak');
      const pairSignals = await db.getPairWeekSignals(pair.id).catch(() => []);
      const sharedStreak = computeSharedStreak({
        enabled: true,
        weeks: buildSharedWeeks(pairSignals, userId, partnerId),
      });
      const run = streakRunToNotify(nextState, sharedStreak);
      if (run != null) {
        nextState = { ...nextState, lastStreakRun: run };
        const { date } = shiftDateOutOfQuietHours(new Date(Date.now() + 5000), quiet);
        const slot = await requestEventPushSlot({ category: CATEGORY.PARTNER_CHEER, fireDate: date });
        if (slot.allowed) {
          const copy = streakKeptPush(partnerName, run);
          await Notifications.scheduleNotificationAsync({
            identifier: NOTIF_ID_PARTNER_STREAK,
            content: {
              title: copy.title, body: copy.body,
              data: { type: 'partner_streak' }, sound: false,
            },
            trigger: {
              channelId: COACHING_REMINDERS_CHANNEL,
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date,
            },
          });
        }
      }
    }

    // Watermarks advance even when the budget said no: a capped beat is
    // dropped for the episode, never re-queued later as stale news.
    if (nextState !== state) {
      await AsyncStorage.setItem(PARTNER_BEATS_KEY(userId), JSON.stringify(nextState)).catch(() => {});
    }
  } catch (e) {
    trackNotificationFailed({
      category: CATEGORY.PARTNER_CHEER,
      reason: 'schedule_threw',
      payload: { message: e?.message ?? 'unknown' },
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      logWarn('notifications.partnerBeats', e?.message);
    }
  }
}
