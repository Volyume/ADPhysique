/**
 * planWeek.js - the "Your plan week" view-model shared by the Progress root
 * and Consistency (register D214 addendum 1, Q5 = A; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/00-AUDIT-AND-PLAN.md`
 * sections 7.1 item 2 and 7.3 item 2).
 *
 * One builder, so the two screens print the same count, the same next session
 * and the same seven cells, and can never disagree with each other or with
 * Home (which reads the same programme position). Pure: takes
 * resolveProgrammePosition's result (or null) and the set rows a screen has
 * already loaded; no I/O, no store, no clock of its own.
 *
 * Two different weeks live here and are named apart on purpose:
 *   - the PLAN week: completed over required for the week the programme is
 *     on (`position.activeWeekIndex`, `programmePosition.js`), which can lag
 *     the calendar when a session is outstanding; the words "in week 2 of
 *     your plan" say so, so the count is never read as Monday to Sunday;
 *   - the CALENDAR week: the Monday-anchored local week (`dayKey.js`), which
 *     the seven cells read, and which the count falls back to when there is
 *     no plan ("2 sessions this week", the line the root printed before).
 *
 * D166 and D204: a record beside a denominator, never a streak, never "rest",
 * never an instruction. "Every session done" is the complete-week fact Home
 * reads through `isWeekComplete` (inlined here to keep this module pure).
 */
import { localWeekStartMs, localWeekEndMs } from '../dayKey';
import { sessionDisplayName, SESSION_STATE } from '../blockProgression';
import { RECOVERY_STATE } from '../recoveryState';

// Day keys in the vocabulary `src/components/community/DayDots.js` draws
// ('mon'..'sun', Monday first); getDay() is Sunday-first, hence the two lists.
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * The local weekday key of a timestamp ('mon'..'sun').
 * @param {number} ms
 * @returns {string}
 */
export function weekdayKey(ms) {
  return WEEKDAY_KEYS[new Date(ms).getDay()];
}

function setTime(s) {
  const at = Number(s?.createdAt ?? s?.created_at);
  return Number.isFinite(at) ? at : null;
}

/**
 * The days of the current Monday-anchored local week with at least one set
 * logged, Monday first. A set outside the week (last Sunday, next Monday) is
 * ignored; the week's end comes from `localWeekEndMs` so a clock-change week
 * keeps its true length.
 * @param {Array<object>} sets - set rows with `createdAt` (or `created_at`)
 * @param {number} [now]
 * @returns {string[]} 'mon'..'sun' keys, in week order
 */
export function trainedDayKeys(sets, now = Date.now()) {
  const start = localWeekStartMs(now);
  const end = localWeekEndMs(start);
  const keys = new Set();
  for (const s of Array.isArray(sets) ? sets : []) {
    const at = setTime(s);
    if (at == null || at < start || at >= end) continue;
    keys.add(weekdayKey(at));
  }
  return DAY_ORDER.filter((k) => keys.has(k));
}

/**
 * Distinct sessions with a set in the current Monday-anchored local week: the
 * no-plan count, the same reading the Progress root's old context line made.
 * @param {Array<object>} sets
 * @param {number} [now]
 * @returns {number}
 */
export function sessionsThisWeek(sets, now = Date.now()) {
  const start = localWeekStartMs(now);
  const end = localWeekEndMs(start);
  const ids = new Set();
  for (const s of Array.isArray(sets) ? sets : []) {
    const at = setTime(s);
    if (at == null || at < start || at >= end) continue;
    ids.add(s.workoutId ?? s.workout_id ?? at);
  }
  return ids.size;
}

/**
 * @typedef {object} PlanWeekSummary
 * @property {boolean} hasPlan - a readable programme position with required sessions
 * @property {number} done - completed sessions (plan week) or sessions this calendar week
 * @property {number|null} required - required sessions in the plan week; null without a plan
 * @property {number|null} weekIndex - the plan week the programme is on
 * @property {number|null} plannedWeeks - the block's length in weeks
 * @property {string|null} nextName - the next required session's display name
 * @property {boolean} weekComplete - every required session resolved, nothing next
 * @property {boolean} recoveryWeek - the block's own planned recovery week is active
 * @property {string[]} trainedDays - 'mon'..'sun' keys trained this calendar week
 * @property {string} todayKey - today's 'mon'..'sun' key
 * @property {string} headlineNumber - "2 of 4" or "2"
 * @property {string} headlineWords - "sessions" or "sessions this week"
 * @property {string|null} subline - "in week 2 of your plan · Upper A is next"; null without a plan
 * @property {string} accessibilityLabel - the whole card in one sentence
 */

/**
 * Build the plan-week view-model both screens render.
 *
 * @param {{position?: object|null, sets?: Array<object>, now?: number, finished?: boolean}} [input]
 *   position: resolveProgrammePosition's result (null on a read failure or
 *   with no block); sets: the set rows the screen already loaded (any span;
 *   only this week's are read); finished: the block is over and awaits the
 *   athlete's decision (the calendar row's awaitingDecision), so no live
 *   plan week is claimed (D214 addendum 6, lane 4 review S2: the card used
 *   to read "in week 6 of your plan · Upper B is next" over a block card
 *   that said "Block finished").
 * @returns {PlanWeekSummary}
 */
export function buildPlanWeekSummary({ position = null, sets = [], now = Date.now(), finished = false } = {}) {
  const trainedDays = trainedDayKeys(sets, now);
  const todayKey = weekdayKey(now);
  const sessions = Array.isArray(position?.sessions) ? position.sessions : [];

  if (!position || sessions.length === 0 || finished) {
    const n = sessionsThisWeek(sets, now);
    const words = n === 1 ? 'session this week' : 'sessions this week';
    const subline = finished ? 'Block finished' : null;
    return {
      hasPlan: false,
      done: n,
      required: null,
      weekIndex: null,
      plannedWeeks: null,
      nextName: null,
      weekComplete: false,
      recoveryWeek: false,
      trainedDays,
      todayKey,
      finished: !!finished,
      headlineNumber: String(n),
      headlineWords: words,
      subline,
      accessibilityLabel: subline ? `${n} ${words}. ${subline}.` : `${n} ${words}.`,
    };
  }

  const done = sessions.filter((s) => s?.state === SESSION_STATE.COMPLETED).length;
  const required = sessions.length;
  const next = position.nextSession ?? null;
  const nextName = next ? (sessionDisplayName(next, sessions) || null) : null;
  // isWeekComplete (programmePosition.js), inlined: nothing next and the
  // week's required sessions all resolved.
  const weekComplete = next == null && position.weekResolved === true;
  const recoveryWeek = position.recoveryState?.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY;
  const weekIndexRaw = Number(position.activeWeekIndex);
  const weekIndex = Number.isFinite(weekIndexRaw) && weekIndexRaw >= 1 ? weekIndexRaw : null;
  const plannedRaw = Number(position.plannedWeeks);
  const plannedWeeks = Number.isFinite(plannedRaw) && plannedRaw >= 1 ? plannedRaw : null;

  let weekWords = 'in your plan this week';
  if (weekIndex != null) {
    weekWords = recoveryWeek
      ? `in week ${weekIndex} of your plan, a recovery week`
      : `in week ${weekIndex} of your plan`;
  }
  let nextWords = null;
  if (nextName) nextWords = `${nextName} is next`;
  else if (weekComplete) nextWords = 'every session done';
  const subline = nextWords ? `${weekWords} · ${nextWords}` : weekWords;

  return {
    hasPlan: true,
    done,
    required,
    weekIndex,
    plannedWeeks,
    nextName,
    weekComplete,
    recoveryWeek,
    trainedDays,
    todayKey,
    headlineNumber: `${done} of ${required}`,
    headlineWords: required === 1 ? 'session' : 'sessions',
    subline,
    accessibilityLabel: `${done} of ${required} ${required === 1 ? 'session' : 'sessions'} ${weekWords}.${nextWords ? ` ${nextWords[0].toUpperCase()}${nextWords.slice(1)}.` : ''}`,
  };
}
