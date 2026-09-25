/**
 * src/lib/recovery/nextLikelyTrainingTime.js
 *
 * When is the athlete next LIKELY to train (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 4.1)? Not a
 * schedule and not an enforced rest day (D17: "user trains on the days
 * they want and have lives") -- purely a projection used to decide whether
 * a swap recommendation is worth making: if the athlete is not likely to
 * train again until Thursday, "not ready right this second" is not a
 * useful reason to recommend a different session today.
 *
 * The projection is the next HABITUAL weekday (deriveHabitualTrainingWeekdays,
 * trainingHabitSchedule.js) at or after now, at the athlete's typical
 * session start time (median minute-of-day, see load.js). Today counts if
 * today is itself a habitual weekday and that minute has not yet passed.
 * With no habit at all (null or empty -- both read as "nothing to project
 * onto"), the projection collapses to "now": every readiness figure is then
 * read at the instant the athlete is actually looking at the screen, which
 * is the honest answer for someone with no established pattern yet.
 *
 * PURE. No I/O, no Date.now() -- every instant is an argument, so the same
 * inputs give the same output every time (CLAUDE.md: the engine is
 * deterministic).
 */
import { DEFAULT_TRAINING_START_MINUTE } from './constants';

const DAYS_TO_SCAN = 7;

/**
 * `date` at local `minuteOfDay` (0-1439), seconds/ms zeroed. Local time,
 * matching every other clock read in this domain (dayKey.js's own
 * convention of local Date getters/setters rather than UTC).
 */
function atMinuteOfDay(date, minuteOfDay) {
  const d = new Date(date.getTime());
  const minute = Number.isFinite(minuteOfDay) ? minuteOfDay : DEFAULT_TRAINING_START_MINUTE;
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minute);
  return d.getTime();
}

/**
 * @param {object} p
 * @param {number} p.nowMs
 * @param {number[]|null} [p.habitualWeekdays] - deriveHabitualTrainingWeekdays'
 *   output: JS weekdays (0=Sunday..6=Saturday) trained on habitually, null
 *   when there is not yet enough history, or an empty array for a
 *   genuinely irregular trainer. Both null and empty read as "no habit".
 * @param {number} [p.typicalStartMinute] - median minute-of-day of recent
 *   session starts; DEFAULT_TRAINING_START_MINUTE when unknown.
 * @returns {number} epoch ms of the projected next session, or `nowMs`
 *   unchanged when there is no habit to project onto.
 */
export function nextLikelyTrainingTime({ nowMs, habitualWeekdays, typicalStartMinute } = {}) {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const days = Array.isArray(habitualWeekdays) ? habitualWeekdays : [];
  if (!days.length) return now;

  const minute = Number.isFinite(typicalStartMinute) ? typicalStartMinute : DEFAULT_TRAINING_START_MINUTE;
  const habitSet = new Set(days);
  const nowDate = new Date(now);
  const todayWeekday = nowDate.getDay();
  const todayMinuteOfDay = nowDate.getHours() * 60 + nowDate.getMinutes();

  // Today counts when today is itself habitual AND the typical minute has
  // not yet passed -- "the minute has not passed" per the build brief, so
  // the boundary minute itself still counts as today.
  if (habitSet.has(todayWeekday) && minute >= todayMinuteOfDay) {
    return atMinuteOfDay(nowDate, minute);
  }

  // Otherwise walk forward, day by day, to the next habitual weekday.
  // habitSet is non-empty here, so some weekday within 7 days always
  // matches (the loop is bounded purely as a defensive measure).
  for (let add = 1; add <= DAYS_TO_SCAN; add += 1) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + add);
    if (habitSet.has(candidate.getDay())) {
      return atMinuteOfDay(candidate, minute);
    }
  }
  // Unreachable: see the guarantee above. Kept only so this never returns
  // undefined if that invariant is ever violated by a malformed input.
  return now;
}
