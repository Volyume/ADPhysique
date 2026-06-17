/**
 * Pure derivations for the weekly check-in.
 *
 * Extracted from WeeklyCheckInScreen so the verdict thresholds and date/text
 * derivations are locked with tests. NOTE: these are DISPLAY-tier pre-selections
 * the user always sees and can override — they are NOT the ED safety system
 * (calorie floors, rapid-loss threshold), which lives in src/coaching/safety/
 * and is untouched here. deriveCalsAdherence is an adherence read against the
 * user's own target, never a floor check.
 */
import { localDayKey, todayLocalKey, localWeekStartMs } from './dayKey';

// Local Monday 00:00 of the current week (UK-local, never UTC). Returns a
// Date so the existing callers (.getTime() for storage, formatWeekRange for
// display) are unchanged in shape.
export function getCurrentWeekStart() {
  return new Date(localWeekStartMs());
}

export function formatWeekRange(weekStart) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sun = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d) => `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  return `${fmt(weekStart)} – ${fmt(sun)}`;
}

export function hasLoggedToday(weights) {
  if (!weights || weights.length === 0) return false;
  const todayStr = todayLocalKey(); // TZ-1: local "today", matches weight buckets
  return weights.some((w) => {
    const ts = w.loggedAt ?? w.logged_at ?? w.createdAt ?? w.created_at;
    return ts && localDayKey(new Date(ts).getTime()) === todayStr;
  });
}

// Earliest morning-weight timestamp in the user's history. Stand-in
// for "when did this user actually start using the coaching flow",
// preferable to user.created_at (which can be old for a Free user
// upgrading to Pro) or proEnrolledAt (which we don't store yet).
export function earliestWeightTs(weights) {
  if (!weights || weights.length === 0) return null;
  return Math.min(...weights.map(w => w.loggedAt ?? w.logged_at ?? Infinity)
    .filter(Number.isFinite));
}

// Derive training performance from logged session data. Used to pre-select
// the chip on step 3 so the user doesn't subjectively rate what the app
// already measured. Combines session adherence, PRs and the week-over-week
// change in total working-set volume so the verdict reflects real progress,
// stagnation or decline, not just attendance. volDeltaPct is the fractional
// change in working sets vs last week (e.g. 0.08 = +8%), or null when there
// is no prior week to compare. Returns null when there is no session data.
export function deriveTrainingPerformance({ completed, planned, prs, volDeltaPct }) {
  if (!planned || completed === 0) return null;
  const ratio = completed / planned;
  const volUp = volDeltaPct != null && volDeltaPct >= 0.05;     // clearly more work
  const volDown = volDeltaPct != null && volDeltaPct <= -0.10;  // clear drop-off
  if (ratio < 0.5) return 'dropped';                       // missed most sessions
  if (ratio >= 1.0 && (prs > 0 || volUp)) return 'exceeded'; // full + improving
  if (volDown) return 'struggled';                          // volume fell away
  if (ratio >= 0.9) return 'hit';                           // on plan, holding
  return 'struggled';
}

// Derive calorie adherence from the week's food rollups. Returns a verdict
// from whatever days were logged (the screen shows the days-logged count and
// the average alongside, so the user sees the confidence and can override).
// Returns null only when there is no target or no logged day. Threshold:
// within 10% of target on the average daily intake counts as "hit".
export function deriveCalsAdherence({ rollups, targetKcal }) {
  if (!targetKcal || !rollups || rollups.length === 0) return null;
  // Number.isFinite excludes a NaN kcal_total (which `?? 0` would let through
  // and poison the average) as well as null/0.
  const logged = rollups.filter(r => Number.isFinite(r.kcal_total) && r.kcal_total > 0);
  if (logged.length < 1) return null;
  const avg = logged.reduce((a, r) => a + r.kcal_total, 0) / logged.length;
  const drift = Math.abs(avg - targetKcal) / targetKcal;
  return drift <= 0.10 ? 'yes' : 'no';
}

// Recover the user's free-text note from a stored notes string by removing the
// joint/sore lines handleSubmit appends, so prefill-then-resubmit cannot
// duplicate them. Kept in sync with the append format in handleSubmit.
export function stripAutoNotes(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/Joint pain flagged this week\./g, '')
    .replace(/Sore:[^.]*\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Plain-language read of the derived training verdict, shown next to the
// session count so the user sees what the app concluded before overriding.
export const PERF_VERDICT_TEXT = {
  exceeded: 'looks like you beat your targets',
  hit: 'on track with your plan',
  struggled: 'a bit below your usual',
  dropped: 'well down on your usual',
};
