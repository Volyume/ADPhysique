/**
 * Training consistency counters (community product audit
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 1). Kept as a SEPARATE module from `trainingProfile.js` on
 * purpose: the bands there are coarse, static-ish preferences (days,
 * time, experience); these counters are a moving weekly/monthly figure
 * used for boards, which is a different privacy shape and gets its own
 * gate composition below.
 *
 * Two halves, same split as `trainingProfile.js`:
 *  - `computeConsistency` is PURE. Given completed-workout start
 *    timestamps and the active plan's days per week, it answers the
 *    eight counters. No I/O, no store, no clock of its own (`now` is
 *    injected).
 *  - `publishConsistency` is the I/O half. SD-30: the ONLY device reads
 *    are completed-workout start timestamps and the active plan's days
 *    per week (`getRoutinesForPlan` row count) - nothing about the body,
 *    food, Progress Scan, injuries, coaching or check-ins.
 *
 * ED gate: reuses the app's one canonical suppression composition
 * (`isPhotoSuppressed`/`derivePhotoSuppression` in
 * `src/hooks/usePhotoSuppression.js` - the same gate every high-risk
 * progress surface uses, e.g. `BeforeAfterShareSheet.js`,
 * `CoachOutputScreen.js`). This file cannot import `wellbeing.js` or
 * `edPatternDetector.js` directly (the Community privacy guard bans
 * that for every file under `src/lib/community`), so the raw,
 * fail-closed reads live in `readEdOrCalmSuppressed` in that hooks file
 * and are reused from there rather than re-implemented.
 *
 * Minors: never sent. Checked from the cached Community `me.is_minor`
 * (already fetched for the rest of Community, never a fresh DOB read -
 * `date_of_birth` is on the Community privacy guard's forbidden list).
 * An unreadable cache fails CLOSED (treated as a minor) rather than
 * risk sending counters for one.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCompletedWorkoutStartTimestamps, getActivePlan, getRoutinesForPlan,
} from '../database';
import { callCommunity } from './transport';
import { currentUserId, readCachedMe } from './profile';
import {
  loadTrainingProfile, readShareSettings, shareablePayload, TP_WINDOW_WEEKS,
} from './trainingProfile';
import { readEdOrCalmSuppressed } from '../../hooks/usePhotoSuppression';
import {
  localWeekStartMs, localWeekEndMs, localDayKey,
} from '../dayKey';

const DAY_KEYS_BY_JS_INDEX = Object.freeze(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
const DAY_ORDER = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

/** Weeks a no-plan account must meet to count as "consistent" (section 1). */
export const NO_PLAN_CONSISTENT_THRESHOLD = 2;

/** How many weeks the planned-pct and consistent-weeks windows look back. */
export const PLANNED_WINDOW_WEEKS = 4;
export const CONSISTENT_WINDOW_WEEKS = 12;

/** Weeks of history the profile-strip mini bars cover (design 60 §4, D4). */
export const WEEKS_HISTORY_LEN = 8;

function toTimestamps(workouts) {
  return (Array.isArray(workouts) ? workouts : [])
    .map((t) => Number(t))
    .filter((t) => Number.isFinite(t));
}

function sessionsInRange(ts, start, end) {
  return ts.filter((t) => t >= start && t < end).length;
}

/**
 * Derive the eight counters. PURE.
 *
 * @param {object} input
 * @param {number[]} input.workouts completed-workout start times, epoch ms
 * @param {{daysPerWeek?: number|null}|null} input.plan the active plan's
 *   days per week, or null/absent when there is no active plan
 * @param {number} input.now injected clock, epoch ms
 * @param {{localWeekStartMs: Function, localWeekEndMs: Function,
 *   localDayKey: Function}} [input.dayKey] injected day-key helpers,
 *   for tests that want to pin the week/day math independently; defaults
 *   to the real `src/lib/dayKey.js` functions.
 * @returns {{c_sessions_week: number, c_sessions_month: number,
 *   c_weeks_streak: number, c_planned_pct_4w: (number|null),
 *   c_consistent_weeks_12w: number, c_trained_days_week: string[],
 *   c_last_trained_day: (string|null), c_weeks_history: number[],
 *   c_updated_at: number}}
 */
export function computeConsistency({
  workouts = [], plan = null, now = Date.now(), dayKey = null,
} = {}) {
  const dk = dayKey || { localWeekStartMs, localWeekEndMs, localDayKey };
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const ts = toTimestamps(workouts);

  const weekStart = dk.localWeekStartMs(nowMs);
  const weekEnd = dk.localWeekEndMs(weekStart);
  const c_sessions_week = sessionsInRange(ts, weekStart, weekEnd);

  const nowDate = new Date(nowMs);
  const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
  const monthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1).getTime();
  const c_sessions_month = sessionsInRange(ts, monthStart, monthEnd);

  const trainedSet = new Set(
    ts.filter((t) => t >= weekStart && t < weekEnd)
      .map((t) => DAY_KEYS_BY_JS_INDEX[new Date(t).getDay()]),
  );
  const c_trained_days_week = DAY_ORDER.filter((key) => trainedSet.has(key));

  const c_last_trained_day = ts.length ? dk.localDayKey(Math.max(...ts)) : null;

  // Streak: consecutive weeks with >= 1 session, ending this week (if it
  // already has one) or last week (if this week is still in progress with
  // nothing in it yet) - so a mid-week check never reads as a broken streak.
  let c_weeks_streak = 0;
  {
    let s = weekStart;
    let e = weekEnd;
    if (sessionsInRange(ts, s, e) === 0) {
      e = s;
      s = dk.localWeekStartMs(s - 1);
    }
    while (sessionsInRange(ts, s, e) > 0) {
      c_weeks_streak += 1;
      e = s;
      s = dk.localWeekStartMs(s - 1);
    }
  }

  const rawDaysPerWeek = Number(plan?.daysPerWeek);
  const daysPerWeek = Number.isFinite(rawDaysPerWeek) && rawDaysPerWeek > 0 ? rawDaysPerWeek : null;

  // Planned pct over the last 4 weeks (this week plus the 3 before it).
  let sum4 = 0;
  {
    let s = weekStart;
    let e = weekEnd;
    for (let i = 0; i < PLANNED_WINDOW_WEEKS; i += 1) {
      sum4 += sessionsInRange(ts, s, e);
      e = s;
      s = dk.localWeekStartMs(s - 1);
    }
  }
  const c_planned_pct_4w = daysPerWeek
    ? Math.min(100, Math.round((sum4 / (daysPerWeek * PLANNED_WINDOW_WEEKS)) * 100))
    : null;

  // Consistent weeks over the last 12: a week counts when it meets the
  // plan's days per week, or NO_PLAN_CONSISTENT_THRESHOLD without a plan.
  const threshold = daysPerWeek ?? NO_PLAN_CONSISTENT_THRESHOLD;
  let c_consistent_weeks_12w = 0;
  {
    let s = weekStart;
    let e = weekEnd;
    for (let i = 0; i < CONSISTENT_WINDOW_WEEKS; i += 1) {
      if (sessionsInRange(ts, s, e) >= threshold) c_consistent_weeks_12w += 1;
      e = s;
      s = dk.localWeekStartMs(s - 1);
    }
  }

  // Weeks history: sessions per week for the last WEEKS_HISTORY_LEN weeks,
  // oldest first, Monday-start UK-local (design 60 §4, D4's mini bars).
  const c_weeks_history = [];
  {
    let s = weekStart;
    let e = weekEnd;
    for (let i = 0; i < WEEKS_HISTORY_LEN; i += 1) {
      c_weeks_history.push(sessionsInRange(ts, s, e));
      e = s;
      s = dk.localWeekStartMs(s - 1);
    }
    c_weeks_history.reverse();
  }

  return {
    c_sessions_week,
    c_sessions_month,
    c_weeks_streak,
    c_planned_pct_4w,
    c_consistent_weeks_12w,
    c_trained_days_week,
    c_last_trained_day,
    c_weeks_history,
    c_updated_at: nowMs,
  };
}

/**
 * Read the device and derive. The only two device reads are completed-
 * workout start timestamps and the active plan's routine count (its
 * days per week) - SD-30.
 *
 * @param {string} userId
 * @param {{nowMs?: number}} [opts]
 * @returns {Promise<object>} the eight counters
 */
export async function loadConsistency(userId, { nowMs = Date.now() } = {}) {
  const uid = userId ?? currentUserId();
  const [workouts, activePlan] = await Promise.all([
    getCompletedWorkoutStartTimestamps(uid).catch(() => []),
    getActivePlan(uid).catch(() => null),
  ]);
  let daysPerWeek = null;
  if (activePlan?.id) {
    try {
      const routines = await getRoutinesForPlan(activePlan.id);
      const count = Array.isArray(routines) ? routines.length : 0;
      daysPerWeek = count > 0 ? count : null;
    } catch (_e) {
      daysPerWeek = null;
    }
  }
  return computeConsistency({ workouts, plan: { daysPerWeek }, now: nowMs });
}

/**
 * Whether counters may be sent right now: the person's toggle is on, AND
 * neither calm mode nor an open ED-pattern flag is active, AND they are
 * not a minor. Fails CLOSED on any unreadable input.
 *
 * @param {string} uid
 * @param {boolean} shareToggleOn
 * @returns {Promise<{allowed: boolean, gated: boolean, isMinor: boolean}>}
 */
export async function consistencyGateState(uid, shareToggleOn) {
  const [gated, cachedMe] = await Promise.all([
    readEdOrCalmSuppressed(uid),
    readCachedMe(uid).catch(() => null),
  ]);
  // Fail closed: an unreadable `me` (never fetched, or a bad cache read)
  // is treated as a minor rather than risk sending counters for one.
  const isMinor = cachedMe ? !!cachedMe.is_minor : true;
  return { allowed: !!shareToggleOn && !gated && !isMinor, gated: !!gated, isMinor };
}

/**
 * Recompute the counters and send them, merged into the same
 * `community_update_training_profile` call the training-profile bands
 * use, so one RPC carries both. Never throws: this is a background
 * convenience triggered on workout completion and on app foreground
 * when the local week key has changed.
 *
 * @param {string} userId
 * @param {{nowMs?: number}} [opts]
 * @returns {Promise<{sent: boolean, reason: (string|null), payload: (object|null)}>}
 */
export async function publishConsistency(userId, { nowMs = Date.now() } = {}) {
  const uid = userId ?? currentUserId();
  if (!uid) return { sent: false, reason: 'no_user', payload: null };

  try {
    const [bands, share, counters] = await Promise.all([
      loadTrainingProfile(uid, { nowMs, windowWeeks: TP_WINDOW_WEEKS }),
      readShareSettings(uid),
      loadConsistency(uid, { nowMs }),
    ]);
    const { allowed, gated, isMinor } = await consistencyGateState(uid, !!share.consistency);
    const payload = shareablePayload(bands, share, {
      consistencyCounters: counters,
      consistencyGated: gated || isMinor,
    });
    // `allowed` is redundant with the gate composition above (kept as a
    // belt-and-braces assertion, never a second source of truth): if the
    // toggle is off, `shareablePayload` already omits the counters via
    // `share.consistency` and stamps `share_consistency: false`.
    void allowed;
    await callCommunity('community_update_training_profile', { _p: payload });
    return { sent: true, reason: null, payload };
  } catch (e) {
    return { sent: false, reason: e?.code ?? 'unavailable', payload: null };
  }
}

export const CONSISTENCY_WEEK_KEY_PREFIX = '@volyume_community_consistency_week_';

function consistencyWeekKey(uid) {
  return `${CONSISTENCY_WEEK_KEY_PREFIX}${uid ?? 'unknown'}`;
}

/**
 * The app-foreground trigger (section 1: "refresh on workout completion
 * and on app foreground when the week changed"). Compares the local
 * Monday-start week the device last published against the current one;
 * publishes and remembers the new week only when they differ, so opening
 * the app several times inside the same week does not resend every time.
 *
 * @param {string} userId
 * @param {{nowMs?: number}} [opts]
 * @returns {Promise<{sent: boolean, reason: (string|null), payload: (object|null)}>}
 */
export async function publishConsistencyOnForeground(userId, { nowMs = Date.now() } = {}) {
  const uid = userId ?? currentUserId();
  if (!uid) return { sent: false, reason: 'no_user', payload: null };
  const currentWeek = String(localWeekStartMs(nowMs));
  let lastWeek = null;
  try {
    lastWeek = await AsyncStorage.getItem(consistencyWeekKey(uid));
  } catch (_e) { /* unreadable: treat as changed, publish is idempotent */ }
  if (lastWeek === currentWeek) return { sent: false, reason: 'week_unchanged', payload: null };
  const out = await publishConsistency(uid, { nowMs });
  try {
    await AsyncStorage.setItem(consistencyWeekKey(uid), currentWeek);
  } catch (_e) { /* best effort: worst case, publishes again next foreground */ }
  return out;
}
