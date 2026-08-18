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
 * FRAMING LAW (founder correction 2026-08-17, verbatim: "STOP CALLING IT
 * FIRST REVIEW"): this pane is the RECURRING weekly evidence read - it
 * exists every week of the athlete's life, and no state of it is ever
 * framed as a "first review". Before any check-in has happened it titles
 * itself with the ledger's own honest "What your coach is reading" (the
 * exact title the original runway used); after that, "Since your
 * check-in". Never re-introduce first-review wording here.
 *
 * @param {object} facts
 * @param {'free'|'pro'} facts.tier - Pro only; check-ins are Precision Coaching.
 * @param {boolean} [facts.hasCheckedInEver] - a REAL weekly check-in row
 *   (energy score present) exists in history. NOT "is the latest coach
 *   output complete" - that predicate is about the current week's
 *   decision and goes false mid-cycle whenever the engine saves a held
 *   output before the week's check-in, which made a four-week veteran's
 *   device regress to first-review framing (founder device report).
 * @param {number} [facts.weighIns7d] - distinct weigh-in mornings in the
 *   current Monday-anchored week (the same count the You tab reads).
 * @param {number|null} [facts.firstWeightAt] - epoch ms of the earliest
 *   morning weight, or null.
 * @param {number} [facts.checkinDay] - 0=Sunday … 6=Saturday.
 * @param {boolean} [facts.edFlagOpen] - the fail-closed suppression chain.
 * @param {number} [facts.completedSessions] - completed workouts, all time
 *   (the sessions row before any check-in exists).
 * @param {number|null} [facts.sessionsSinceCheckin] - completed workouts
 *   since the last real check-in happened, or null when unknown (the row
 *   is omitted rather than guessed).
 * @param {number|null} [facts.foodDays7] - distinct local days with any
 *   food logged in the trailing 7 days (getRecentIntakeSummary's own
 *   count); row omitted at zero/null.
 * @param {string|null} [facts.todayWeightLabel] - the ALREADY-FORMATTED
 *   display weight logged this morning ("213 lbs"), or null when unlogged.
 * @param {number} [facts.now] - epoch ms, injectable for tests.
 * @returns {{variant:'full'|'neutral', title:string, countdown:string|null,
 *   rows:Array<{key:string, done:boolean, label:string}>}|null}
 */
export function resolveEvidencePanel({
  tier,
  hasCheckedInEver = false,
  weighIns7d = 0,
  firstWeightAt = null,
  checkinDay = 0,
  edFlagOpen = false,
  completedSessions = 0,
  sessionsSinceCheckin = null,
  foodDays7 = null,
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
    // Founder order 2026-08-17 (second correction): no title in any
    // pre-check-in state - the coach is not a person, so the pane never
    // speaks as one. Countdown only here.
    if (!countdown) return null;
    return { variant: 'neutral', title: null, countdown, rows: [] };
  }

  const rows = [];

  // Weigh-ins: needed-to-do progress while short, the actual count once
  // met (never the Math.min clamp the truth-repair ruling removed).
  // Row order is a founder device order (2026-08-18): training sessions
  // FIRST, then the weigh-in count with the latest weight folded onto the
  // same line, then food. The old standalone "Morning weight X" row is
  // gone - the number now rides the weigh-in row it belongs to.
  // Sessions: since the last check-in once one exists (the pane's whole
  // frame is "since your check-in"); all-time before any check-in, where
  // the ledger's own gate row is the honest read.
  if (hasCheckedInEver) {
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

  // Weigh-ins second, and the latest logged weight on its OWN row directly
  // behind it (founder device order 2026-08-18, corrected same day: "have
  // it in the next row", never merged onto the count line).
  const weighInsMet = weighIns7d >= MIN_WEIGH_INS;
  rows.push({
    key: 'weighIns',
    done: weighInsMet,
    label: weighInsMet
      ? `${plural(weighIns7d, 'morning weigh-in')} this week`
      : `${weighIns7d} of ${MIN_WEIGH_INS} morning weigh-ins this week`,
  });
  if (todayWeightLabel) {
    rows.push({
      key: 'weight',
      done: true,
      label: `Morning weight ${todayWeightLabel}`,
    });
  }

  // Food adherence (founder order 2026-08-17): IF food has been logged,
  // show on how many of the last 7 days - the same trailing week the
  // engine's own intake summary reads. Day count only, never amounts;
  // omitted entirely at zero and under the neutral variant above.
  if (Number.isFinite(foodDays7) && foodDays7 >= 1) {
    rows.push({
      key: 'food',
      done: true,
      label: `Food logged on ${foodDays7} of the last 7 days`,
    });
  }

  return {
    variant: 'full',
    // "Since your check-in" is only ever claimed once a check-in has
    // actually happened (C5-P12-04's truth rule). Before that there is NO
    // title at all (founder order 2026-08-17: the coach is not a person,
    // so no "what your coach is reading" voice) - the countdown leads.
    title: hasCheckedInEver ? 'Since your check-in' : null,
    countdown,
    rows,
  };
}

export default resolveEvidencePanel;
