/**
 * evidencePanel — Campaign 26 (founder device order 2026-08-17).
 *
 * The founder's verdict on the C22 Evidence Row: the bare "First review: N
 * more morning weigh-ins." link "ruined" the since-check-in evidence pane
 * (the old CoachDailyBrief runway), and the logged morning weight kept a
 * whole bordered card with a bright green "Logged" pill after it had
 * stopped being an action. Target shape, from the founder's own sketch:
 * ONE quiet evidence pane that shows what the user has actually done since
 * the last check-in (or still needs to do for the first), with the logged
 * morning weight folded in as a quiet line, never a second region.
 *
 * This resolver honours BOTH standing rulings at once:
 *  - The restore order (2026-08-17): the pane is back - title, days to the
 *    next check-in, weigh-in row, sessions row, weight line.
 *  - The Today-truth-repair ruling (d1f6a608, 2026-08-16): no clamped
 *    "3 of 3" gate counter for every count >= 3. When a target is still
 *    short, "N of 3" is the honest needed-to-do display; once it is met
 *    the row states the ACTUAL count, never a clamp.
 *
 * PURE, no I/O, no React. Gate booleans and the next-check-in date come
 * from buildCoachLedger/firstReviewUnlockDate (never re-derived here);
 * only the row labels are authored here, per the honesty rule above -
 * the same split firstReviewLine.js used.
 *
 * ED-safety (fail closed, CLAUDE.md): callers pass the SAME edFlagOpen
 * OR-chain the You tab's readiness ledger uses (open ED flag, elevated
 * SCOFF, failed wellbeing read, calm mode). Under it the pane drops to
 * the ledger's neutral variant - its own title and the date-only
 * countdown, NO weigh-in counts, NO weight line, no weight ask - exactly
 * the disclosure buildHoldReceipt's neutral unlockLine already makes.
 */
import { buildCoachLedger, formatCheckinCountdown } from '../coachLedger';
import { MIN_WEIGH_INS } from '../trialActivation';

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * @param {object} facts
 * @param {'free'|'pro'} facts.tier - Pro only; check-ins are Precision Coaching.
 * @param {boolean} [facts.hasCompletedFirstReview] - a completed coach
 *   decision exists; flips the pane from first-review progress to the
 *   since-check-in read.
 * @param {number} [facts.weighIns7d] - distinct weigh-in mornings in the
 *   current Monday-anchored week (the same count the You tab reads).
 * @param {number|null} [facts.firstWeightAt] - epoch ms of the earliest
 *   morning weight, or null.
 * @param {number} [facts.checkinDay] - 0=Sunday … 6=Saturday.
 * @param {boolean} [facts.edFlagOpen] - the fail-closed suppression chain.
 * @param {number} [facts.completedSessions] - completed workouts, all time
 *   (the first-review sessions row).
 * @param {number|null} [facts.sessionsSinceCheckin] - completed workouts
 *   since the last check-in's week started, or null when unknown (the row
 *   is omitted rather than guessed).
 * @param {string|null} [facts.todayWeightLabel] - the ALREADY-FORMATTED
 *   display weight logged this morning ("213 lbs"), or null when unlogged.
 * @param {number} [facts.now] - epoch ms, injectable for tests.
 * @returns {{variant:'full'|'neutral', title:string, countdown:string|null,
 *   rows:Array<{key:string, done:boolean, label:string}>}|null}
 */
export function resolveEvidencePanel({
  tier,
  hasCompletedFirstReview = false,
  weighIns7d = 0,
  firstWeightAt = null,
  checkinDay = 0,
  edFlagOpen = false,
  completedSessions = 0,
  sessionsSinceCheckin = null,
  todayWeightLabel = null,
  now = Date.now(),
} = {}) {
  if (tier !== 'pro') return null;

  const ledger = buildCoachLedger({
    weighIns7d, completedSessions, firstWeightAt, checkinDay, edFlagOpen, now,
  });
  const countdown = formatCheckinCountdown(ledger.unlockDate, now);

  if (ledger.variant === 'neutral') {
    // Date-only disclosure; no counts, no weight line, no weight ask.
    if (!countdown) return null;
    return { variant: 'neutral', title: ledger.title, countdown, rows: [] };
  }

  const rows = [];

  // Weigh-ins: needed-to-do progress while short, the actual count once
  // met (never the Math.min clamp the truth-repair ruling removed).
  const weighInsMet = weighIns7d >= MIN_WEIGH_INS;
  rows.push({
    key: 'weighIns',
    done: weighInsMet,
    label: weighInsMet
      ? `${plural(weighIns7d, 'morning weigh-in')} this week`
      : `${weighIns7d} of ${MIN_WEIGH_INS} morning weigh-ins this week`,
  });

  // Sessions: since the last check-in once one exists (the pane's whole
  // frame is "since your check-in"); all-time before the first review,
  // where the ledger's own gate row is the honest read.
  if (hasCompletedFirstReview) {
    if (Number.isFinite(sessionsSinceCheckin)) {
      rows.push({
        key: 'sessions',
        done: sessionsSinceCheckin >= 1,
        label: sessionsSinceCheckin >= 1
          ? `${plural(sessionsSinceCheckin, 'training session')} logged`
          : 'No training sessions yet this cycle',
      });
    }
  } else {
    rows.push({
      key: 'sessions',
      done: completedSessions >= 1,
      label: completedSessions >= 1
        ? `${plural(completedSessions, 'training session')} logged`
        : 'No training sessions yet',
    });
  }

  // The folded-in morning weight: a quiet done-line, only on a day it was
  // actually logged. When unlogged, logging is an ACTION and belongs to
  // the weigh-in strip above the pane, not to this evidence read.
  if (todayWeightLabel) {
    rows.push({
      key: 'weight',
      done: true,
      label: `Morning weight ${todayWeightLabel}`,
    });
  }

  return {
    variant: 'full',
    // "Since your check-in" is only ever claimed once a check-in has
    // actually happened (C5-P12-04's truth rule, kept).
    title: hasCompletedFirstReview ? 'Since your check-in' : 'Your first review',
    countdown,
    rows,
  };
}

export default resolveEvidencePanel;
