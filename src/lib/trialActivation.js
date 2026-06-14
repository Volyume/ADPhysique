/**
 * COMP-023 — trial day-3 "the coach saw you" moment.
 *
 * Pure, dependency-free helpers (no React, no DB, no notifications) so they can
 * be unit-tested against the WeeklyCheckInScreen gate maths and reused by both
 * the scheduler (baking the push copy) and HomeScreen (the live banner).
 *
 * The kept-promise rule: the unlock date this names MUST match the date the
 * weekly check-in gate would actually open. To guarantee that the two can never
 * drift, FIRST_CHECKIN_MIN_DAYS and MIN_WEIGH_INS are defined HERE and imported
 * by WeeklyCheckInScreen — this file is the single source of truth.
 */

const DAY_MS = 86400000;
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The in-app cardless Pro trial is 14 days; the value moment fires on day 3.
export const TRIAL_LENGTH_DAYS = 14;
export const TRIAL_DAY3_OFFSET_DAYS = 3;

// Gate constants — single source of truth, mirrored from the original
// WeeklyCheckInScreen definitions. The screen now imports these back.
export const FIRST_CHECKIN_MIN_DAYS = 5;   // days of data before the first check-in
export const MIN_WEIGH_INS = 3;            // weigh-ins required in the trailing 7 days

/**
 * Trial start derived from the stored end date (no new storage).
 * @param {number} proTrialEndsAt - epoch ms
 * @returns {number|null} epoch ms of trial start, or null
 */
export function trialStartFromEndsAt(proTrialEndsAt) {
  if (proTrialEndsAt == null) return null;
  return proTrialEndsAt - TRIAL_LENGTH_DAYS * DAY_MS;
}

/**
 * The day-3 push fire instant: trial start + 3 days at `hour`:00 local.
 * @param {number} proTrialEndsAt - epoch ms
 * @param {number} [hour] - local hour, default 10:00
 * @returns {Date|null}
 */
export function trialDay3FireDate(proTrialEndsAt, hour = 10) {
  const start = trialStartFromEndsAt(proTrialEndsAt);
  if (start == null) return null;
  const d = new Date(start + TRIAL_DAY3_OFFSET_DAYS * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * The date the first weekly coaching review unlocks — the next occurrence of
 * the user's chosen check-in weekday whose LOCAL MIDNIGHT already clears the
 * FIRST_CHECKIN_MIN_DAYS "too soon" gate. Using midnight (not the reminder
 * time) is deliberate: the named day is then one the gate is open for at any
 * hour, so the promise can never be broken by a keen early-morning tap. The
 * weigh-in requirement is future-conditional, so callers pair this with a
 * "keep logging" framing rather than an unconditional guarantee.
 *
 * @param {number} firstWeightAt - epoch ms of the first morning weight
 * @param {number} checkinDay    - 0=Sunday … 6=Saturday
 * @param {number} [now]         - epoch ms, defaults to Date.now()
 * @returns {Date|null}
 */
export function firstReviewUnlockDate(firstWeightAt, checkinDay, now = Date.now()) {
  if (firstWeightAt == null || checkinDay == null) return null;
  const earliestOk = firstWeightAt + FIRST_CHECKIN_MIN_DAYS * DAY_MS;
  const cursor = new Date(Math.max(now, earliestOk));
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const day = new Date(cursor);
    day.setDate(day.getDate() + i);
    day.setHours(0, 0, 0, 0);
    const elapsedDays = Math.floor((day.getTime() - firstWeightAt) / DAY_MS);
    if (day.getDay() === checkinDay && elapsedDays >= FIRST_CHECKIN_MIN_DAYS) {
      return day;
    }
  }
  return null;
}

export function dayName(date) {
  return date ? DAYS_FULL[date.getDay()] : null;
}

/**
 * Real-data variant for the day-3 moment.
 *   S1 — on track:            ≥1 completed session AND ≥MIN_WEIGH_INS weigh-ins/7d
 *   S2 — training, not weighing: ≥1 session, <MIN_WEIGH_INS weigh-ins
 *   S3 — nothing yet:         0 completed sessions
 * @param {{ completedSessions:number, weighIns7d:number }} counts
 * @returns {'S1'|'S2'|'S3'}
 */
export function selectTrialVariant({ completedSessions = 0, weighIns7d = 0 } = {}) {
  if (completedSessions <= 0) return 'S3';
  if (weighIns7d >= MIN_WEIGH_INS) return 'S1';
  return 'S2';
}

function weighInsNeeded(weighIns7d) {
  return Math.max(0, MIN_WEIGH_INS - (weighIns7d || 0));
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Day-3 push copy. `edFlagOpen` callers should NOT schedule the push at all
 * (handled by the scheduler); this builder assumes no open flag.
 * COPY: blueprint copy, founder voice review at PR before merge to main.
 *
 * @param {{ variant:string, completedSessions:number, weighIns7d:number, unlockDayName:string|null }} ctx
 * @returns {{ title:string, body:string }}
 */
export function trialDay3Push({ variant, completedSessions = 0, weighIns7d = 0, unlockDayName }) {
  const when = unlockDayName || 'soon';
  if (variant === 'S1') {
    return {
      title: 'Your coach has a read on you',
      body: `${plural(completedSessions, 'session')} and ${plural(weighIns7d, 'weigh-in')} logged. Keep logging and your first coaching review unlocks on ${when}.`,
    };
  }
  if (variant === 'S2') {
    return {
      title: 'Your coach can see your training',
      body: `${plural(completedSessions, 'session')} logged. ${plural(weighInsNeeded(weighIns7d), 'more morning weigh-in')} and your first coaching review unlocks on ${when}.`,
    };
  }
  return {
    title: 'Your plan is ready when you are',
    body: `One session this week is all it takes to start your first coaching review. It's waiting on the Train tab.`,
  };
}

/**
 * Home banner line. `edFlagOpen` returns a neutral line with no weigh-in counts
 * and no weight ask. `trialDay` advances the S1 copy at the day-7 midpoint.
 * COPY: blueprint copy, founder voice review at PR before merge to main.
 *
 * @param {{ variant:string, completedSessions:number, weighIns7d:number, unlockDayName:string|null, trialDay:number, edFlagOpen:boolean }} ctx
 * @returns {string}
 */
export function trialBannerLine({ variant, completedSessions = 0, weighIns7d = 0, unlockDayName, trialDay = 0, edFlagOpen = false }) {
  const when = unlockDayName || 'soon';
  if (edFlagOpen) {
    // Neutral fallback: no weigh-in counts, no weight ask, on top of an open flag.
    return `First coaching review unlocks ${when}`;
  }
  const midpoint = trialDay >= 7;
  if (variant === 'S1') {
    return midpoint
      ? `Half-way. Your first coaching review unlocks ${when}`
      : `First coaching review unlocks ${when} · ${plural(completedSessions, 'session')}, ${plural(weighIns7d, 'weigh-in')} in`;
  }
  if (variant === 'S2') {
    return `${plural(weighInsNeeded(weighIns7d), 'more morning weigh-in')} unlock your first coaching review`;
  }
  return `Your 14-day trial is live. One session starts your first coaching review.`;
}
