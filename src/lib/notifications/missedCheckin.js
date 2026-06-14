/**
 * missedCheckin.js — OPP-C03 ghost prevention (pure helpers + copy)
 *
 * When a Pro user misses their check-in day, two single-shot pushes
 * re-engage them: a gentle same-evening nudge and a value-led +48h
 * follow-up built on data the engine already holds. Early
 * disengagement (a missed check-in) is the strongest churn predictor
 * in human coaching; the re-engagement copy NEVER shames ("you
 * missed" is banned). See the NOTIFICATIONS_LOCKED.md proposed
 * addendum (2026-06-12) for the copy and budget rules.
 *
 * Kept pure (no imports) so the date maths and copy are trivially
 * testable; the OS-facing scheduling lives in scheduler.js
 * (scheduleMissedCheckinFollowups), which applies quiet hours, the
 * push budget, ED-flag suppression and the Pro/toggle gates.
 */

const DAY_MS = 86400000;
const FOLLOWUP_GAP_MS = 2 * DAY_MS; // +48 hours
const EVENING_HOUR = 20; // 20:00 local on the check-in day

/**
 * Push copy. `name` is the pre-formatted ', First' suffix (or ''),
 * same convention as the other schedulers. Warm, complete sentences;
 * no shame copy.
 */
export function missedCheckinPush(name = '') {
  return {
    evening: {
      title: `Your check-in is ready when you are${name}`,
      body: 'Your check-in data is ready to review. It takes about two minutes.',
    },
    followup: {
      title: `Your weekly trend is ready${name}`,
      body: 'Tap to see how the week compares, whenever suits you.',
    },
  };
}

/** Most recent occurrence of (weekday at hour:minute) at or before `now`. */
function occurrenceOnOrBefore(weekday, hour, minute, now) {
  const d = new Date(now);
  const daysBack = (d.getDay() - weekday + 7) % 7;
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() - daysBack);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

/** Next occurrence of (weekday at hour:minute) strictly after `now`. */
function occurrenceAfter(weekday, hour, minute, now) {
  const prev = occurrenceOnOrBefore(weekday, hour, minute, now);
  prev.setDate(prev.getDate() + 7);
  return prev;
}

/**
 * The same-evening slot for a check-in occurrence: 20:00 local on the
 * check-in day, or occurrence + 2h when the user's check-in hour is
 * already 19:00 or later. Quiet hours are applied later by the
 * scheduler and always win (a late evening slot may shift to the
 * next morning, per the locked rule).
 */
export function eveningSlotFor(occurrence) {
  const evening = new Date(occurrence);
  if (occurrence.getHours() >= EVENING_HOUR - 1) {
    evening.setTime(occurrence.getTime() + 2 * 60 * 60 * 1000);
  } else {
    evening.setHours(EVENING_HOUR, 0, 0, 0);
  }
  return evening;
}

/**
 * Resolve the missed-check-in episode and its two fire dates.
 *
 * Episode rule (single-shot per missed check-in episode):
 *   - If the most recent check-in occurrence is live (it was genuinely
 *     expected per the 7-day minimum-gap rule, the user has not checked
 *     in since, and its +48h follow-up has not elapsed), the slots
 *     anchor on it: a re-lay mid-episode keeps the same fire dates, so
 *     a push that already fired is never repeated (its date is past).
 *   - Otherwise the slots pre-lay against the NEXT expected occurrence,
 *     ready in case the user misses it. If they check in instead, the
 *     schedule-time skip, foreground suppression and the post-submit
 *     re-lay all retire the pair.
 *
 * An elapsed episode is never chased: a user who reappears three days
 * after a missed check-in gets silence for that week, not back-fill.
 *
 * @param {object} args
 * @param {number} args.weekday        JS getDay (0=Sunday) check-in day
 * @param {number} args.hour           check-in reminder hour
 * @param {number} args.minute         check-in reminder minute
 * @param {Date}   [args.now]
 * @param {number} [args.lastCheckinMs] creation instant of the user's
 *                                      last REAL check-in (energy score
 *                                      present), 0 when none
 * @param {number} [args.minGapDays]   the minimum-gap rule (default 7)
 * @returns {{ occurrence: Date, evening: Date, followup: Date }}
 */
export function missedCheckinFireDates({
  weekday = 0,
  hour = 18,
  minute = 0,
  now = new Date(),
  lastCheckinMs = 0,
  minGapDays = 7,
} = {}) {
  const gapMs = minGapDays * DAY_MS;
  const recent = occurrenceOnOrBefore(weekday, hour, minute, now);

  const recentWasExpected = lastCheckinMs <= 0
    || recent.getTime() >= lastCheckinMs + gapMs;
  const recentUnresolved = lastCheckinMs < recent.getTime();
  const recentStillLive = recent.getTime() + FOLLOWUP_GAP_MS > now.getTime();

  let occurrence;
  if (recentWasExpected && recentUnresolved && recentStillLive) {
    occurrence = recent;
  } else {
    occurrence = occurrenceAfter(weekday, hour, minute, now);
    if (lastCheckinMs > 0) {
      while (occurrence.getTime() < lastCheckinMs + gapMs) {
        occurrence.setDate(occurrence.getDate() + 7);
      }
    }
  }

  return {
    occurrence,
    evening: eveningSlotFor(occurrence),
    followup: new Date(occurrence.getTime() + FOLLOWUP_GAP_MS),
  };
}
