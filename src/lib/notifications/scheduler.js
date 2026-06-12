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

const NOTIF_ID_MORNING = 'volyume_morning_weight';
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
          sound: false,
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
// involved. The end date is the day-21 cutover; day 19 is 2 days
// before, matching the "ends in 2 days" copy.

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

  if (prefs.morningEnabled) {
    await scheduleMorningWeightNotification(prefs.morningHour ?? 7, prefs.morningMinute ?? 0);
  }
  if (prefs.checkinEnabled) {
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
