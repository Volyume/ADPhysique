/**
 * standDown.js: a reminder never asks for something already done today.
 *
 * Founder order 2026-10-02 (register D215), verbatim: "If I've already
 * entered my weight in the day we shouldn't be asking for it again as a
 * notification later in the day ensure there's no repeat notifications when
 * the requirement has already been satisfied".
 *
 * The foreground handler (handler.js) already swallows a prompt that arrives
 * while the app is open and the thing is done. That cannot help once the app
 * is in the background: a dated one-shot laid at launch fires at its time
 * whatever happened in between. So every daily requirement has two more
 * defences, both subtractive (they only ever cancel or skip a prompt, never
 * add one, so nothing under NOTIFICATIONS_LOCKED.md or the ED-safety
 * suppressions is weakened):
 *
 *   1. STAND DOWN ON THE DEED. The device-truth write that satisfies a
 *      requirement calls in here: database.logMorningWeight (the weigh-in),
 *      the workout completion writes (the training day),
 *      database.saveWeeklyCheckin (the week's check-in), food/db.logFoodEntry
 *      and the planned-meal confirms (the meal slot). The weigh-in, training
 *      and check-in prompts are cancelled by reading the OS's pending requests
 *      and matching on each request's own type and day. The meal reminders
 *      are re-laid through scheduler.scheduleMealReminders, which lays a slot
 *      already logged today as a short run from tomorrow instead of a daily
 *      repeat (a repeat cannot skip a day), through every gate it already has.
 *   2. SKIP AT LAY TIME. Every scheduler that lays dated prompts (the morning
 *      and evening weigh-in prompts, the training-day reminders, the meal
 *      reminders) asks the `is...SatisfiedToday` read first and does not lay
 *      today's prompt when the answer is yes.
 *
 * Every laid request carries `data.dayKey` (the local day it fires on, from
 * dayKey.js) and a meal request carries `data.slot`, so matching never depends
 * on the OS's trigger shape; a request laid by an older build without a
 * dayKey is matched by its date trigger instead (the launch re-lay replaces
 * those on the first run of this build anyway). A repeating trigger carries
 * no day and is never matched here.
 *
 * The "is it done" reads apply the same rules as the foreground handler's
 * own checks: the canonical morning_weights row for today holds a weight; a
 * completed workout started today (a session that ran past midnight belongs
 * to the day it started); a real (non-planned) food entry sits in the slot
 * today. Every read fails OPEN to "not done", so a read failure can only ever
 * let a prompt through, never silence one the person opted into.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { localDayKey, localWeekStartMs } from '../dayKey';

export const WEIGH_IN_TYPES = Object.freeze(['morning_weight', 'evening_weight']);
export const TRAINING_TYPES = Object.freeze(['training_reminder']);
export const MEAL_TYPES = Object.freeze(['meal_log_reminder']);
// The week's own reminder is matched to the week; the missed-check-in
// follow-ups are matched whatever day they were laid for, because a saved
// check-in ends the episode they chase.
export const CHECKIN_TYPES = Object.freeze(['weekly_checkin']);
export const CHECKIN_FOLLOWUP_TYPES = Object.freeze(['checkin_missed']);

function asMs(v) {
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v) { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  return null;
}

/**
 * The local day a scheduled request fires on: its own `data.dayKey` when it
 * was laid with one, else the day of its date trigger; null for a repeating or
 * unreadable trigger (which is therefore never matched to a day).
 * @param {object} request an entry of getAllScheduledNotificationsAsync()
 * @returns {?string} 'YYYY-MM-DD'
 */
export function requestDayKey(request) {
  const laid = request?.content?.data?.dayKey;
  if (typeof laid === 'string' && laid) return laid;
  const t = request?.trigger;
  const ms = asMs(t?.date) ?? asMs(t?.value);
  return ms == null ? null : localDayKey(ms);
}

/**
 * Pure: the scheduled requests that ask for one of `types`, on one of
 * `dayKeys` (any day when null), in `slot` (any slot when null).
 */
export function requestsToStandDown(scheduled, { types, dayKeys = null, slot = null } = {}) {
  const want = new Set(Array.isArray(types) ? types : []);
  const days = dayKeys == null ? null : new Set(dayKeys);
  return (Array.isArray(scheduled) ? scheduled : []).filter((r) => {
    if (!want.has(r?.content?.data?.type)) return false;
    if (slot != null && String(r?.content?.data?.slot) !== String(slot)) return false;
    if (days == null) return true;
    const key = requestDayKey(r);
    return key != null && days.has(key);
  });
}

/** Cancels the matching scheduled requests; resolves to how many it cancelled. Never throws. */
export async function standDownScheduled(opts) {
  if (Platform.OS === 'web') return 0;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const list = requestsToStandDown(all, opts);
    for (const r of list) {
      if (typeof r?.identifier === 'string') {
        // eslint-disable-next-line no-await-in-loop
        await Notifications.cancelScheduledNotificationAsync(r.identifier).catch(() => {});
      }
    }
    return list.length;
  } catch (_) {
    return 0;
  }
}

/** Pure: the seven local day keys of the week holding `ms`, Monday first. */
export function weekDayKeys(ms = Date.now()) {
  const start = new Date(localWeekStartMs(ms));
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(localDayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i).getTime()));
  }
  return out;
}

/** A weigh-in logged for today stands down today's morning and evening prompts; one entered for a past day changes nothing. */
export async function standDownWeighIn(loggedAtMs = Date.now(), nowMs = Date.now()) {
  const day = localDayKey(loggedAtMs);
  if (day !== localDayKey(nowMs)) return 0;
  return standDownScheduled({ types: WEIGH_IN_TYPES, dayKeys: [day] });
}

/** A session started today and now completed stands down today's training-day reminder. */
export async function standDownTraining(startedAtMs = Date.now(), nowMs = Date.now()) {
  const day = localDayKey(startedAtMs);
  if (day !== localDayKey(nowMs)) return 0;
  return standDownScheduled({ types: TRAINING_TYPES, dayKeys: [day] });
}

/**
 * Food logged in a slot today stands down that slot's reminder for today, by
 * re-laying the meal reminders from the stored preference through the
 * scheduler's own gates (scheduler.relayMealRemindersFromPrefs): the logged
 * slot comes back as a run from tomorrow, the others unchanged. Resolves to
 * whether a re-lay ran.
 */
export async function standDownMeal(slot, entryDayKey, nowMs = Date.now()) {
  if (slot == null || slot === '' || entryDayKey !== localDayKey(nowMs)) return false;
  try {
    // eslint-disable-next-line global-require
    const { relayMealRemindersFromPrefs } = require('./scheduler');
    await relayMealRemindersFromPrefs();
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * A saved weekly check-in stands down this week's reminder (a reminder already
 * laid for next week is the next week's business and stays) and every
 * missed-check-in follow-up.
 */
export async function standDownCheckin(nowMs = Date.now()) {
  const thisWeek = await standDownScheduled({ types: CHECKIN_TYPES, dayKeys: weekDayKeys(nowMs) });
  const followUps = await standDownScheduled({ types: CHECKIN_FOLLOWUP_TYPES });
  return thisWeek + followUps;
}

// ── "Is it done today?" The one read per requirement, each failing open. ──

function currentUserId() {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../store/useAppStore').default;
    return useAppStore.getState()?.user?.id ?? null;
  } catch (_) { return null; }
}

/** The canonical morning_weights row for today holds a weight. */
export async function isWeighInSatisfiedToday() {
  try {
    const uid = currentUserId();
    if (!uid) return false;
    // eslint-disable-next-line global-require
    const { getMorningWeightToday } = require('../database');
    const entry = await getMorningWeightToday(uid);
    return !!entry?.weightKg;
  } catch (_) { return false; }
}

/** A completed workout that started today (the foreground handler's rule). */
export async function isTrainingSatisfiedToday(nowMs = Date.now()) {
  try {
    const uid = currentUserId();
    if (!uid) return false;
    // eslint-disable-next-line global-require
    const { getCompletedWorkoutsBetween } = require('../database');
    const now = new Date(nowMs);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    // The bounded read keys on when the session ended; the start-day rule is
    // applied on top so a session that ran past midnight counts for the day
    // it started, as the handler counts it.
    const rows = await getCompletedWorkoutsBetween(uid, start, end);
    return (Array.isArray(rows) ? rows : []).some((w) => Number(w?.startedAt) >= start);
  } catch (_) { return false; }
}

/** A real (non-planned) food entry in `slot` for today. */
export async function isMealSatisfiedToday(slot, nowMs = Date.now()) {
  try {
    const uid = currentUserId();
    if (!uid || slot == null || slot === '') return false;
    // eslint-disable-next-line global-require
    const { getFoodEntriesForDay } = require('../food/db');
    const rows = await getFoodEntriesForDay(uid, localDayKey(nowMs));
    return (Array.isArray(rows) ? rows : []).some((e) => {
      const s = e?.mealSlot ?? e?.meal_slot;
      const planned = e?.isPlanned ?? e?.is_planned;
      return String(s) === String(slot) && !(planned === 1 || planned === true);
    });
  } catch (_) { return false; }
}
