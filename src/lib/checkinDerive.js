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

// C5-P22-01 (D96): Pro enrolment writes the typed body weight into
// morning_weights so the check-in gate can count enrolment day
// (ProOnboardingScreen). That row is a STARTING POINT the user typed, not a
// morning the user weighed, and it is marked as such at the write. Surfaces
// that speak about the user's own weigh-in behaviour ("Logged", "not yet
// today") must not count it; the gate's MIN_WEIGH_INS count deliberately
// still does, because tightening that gate would be a worse defect than the
// disclosure gap (see the note at WeeklyCheckInScreen's trailing-7-day
// window).
export const ENROLMENT_WEIGHT_NOTE = 'enrolment';

export function isEnrolmentSeedWeight(row) {
  if (!row) return false;
  const notes = row.notes ?? row.note ?? null;
  return typeof notes === 'string' && notes.trim() === ENROLMENT_WEIGHT_NOTE;
}

export function hasLoggedToday(weights) {
  if (!weights || weights.length === 0) return false;
  const todayStr = todayLocalKey(); // TZ-1: local "today", matches weight buckets
  return weights.some((w) => {
    if (isEnrolmentSeedWeight(w)) return false;
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
// hasPriorWeek says whether there is an earlier completed week to compare
// against. Default true so existing callers are unchanged.
export function deriveTrainingPerformance({ completed, planned, prs, volDeltaPct, hasPriorWeek = true }) {
  if (!planned || completed === 0) return null;
  const ratio = completed / planned;
  const volUp = volDeltaPct != null && volDeltaPct >= 0.05;     // clearly more work
  const volDown = volDeltaPct != null && volDeltaPct <= -0.10;  // clear drop-off
  // C5-P19-01 (D96): week 1. Every verdict the app speaks back on the
  // downgrade side ("a bit below your usual", "well down on your usual",
  // "Performance dropped") asserts a personal baseline the user does not have
  // yet, and the two upgrade paths that would avoid the fall-through
  // (a week-over-week volume rise, a PR) are structurally unavailable in a
  // first week: volDeltaPct is null with no prior week and a first-ever lift
  // is deliberately not a PR (database.js detectPR). So a first week derives
  // only the two NON-comparative reads, and anything else stays unselected -
  // the neutral "How did your sessions go compared to what you expected?"
  // subtitle shows and the user says how the week went. The plain session and
  // PR counts are unchanged, so the user still sees exactly what the app read.
  if (!hasPriorWeek) {
    if (ratio >= 1.0 && (prs > 0 || volUp)) return 'exceeded';
    if (ratio >= 0.9) return 'hit';
    return null;
  }
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
// C6 RD6-5 (D97-25): "your usual" asserted a personal baseline the
// verdict does not have - struggled rests on the plan ratio OR one
// adjacent week's volume, and dropped is purely a plan-adherence read
// with no volume evidence at all. Each downgrade string now names the
// comparison actually made (plan / last week), which is also what the
// narration sentence beside it already shows the user in numbers. The
// user's own tappable chip labels are their self-report and unchanged.
export const PERF_VERDICT_TEXT = {
  exceeded: 'looks like you beat your targets',
  hit: 'on track with your plan',
  struggled: 'a lighter week than planned or last week',
  dropped: 'well short of the plan this week',
};
