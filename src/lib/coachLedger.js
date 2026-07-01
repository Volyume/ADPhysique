/**
 * coachLedger.js — A3 (Wave 1): week-one proof.
 *
 * Pure builders for the "what your coach is reading" ledger: the live counts
 * against the PUBLISHED first-review thresholds (MIN_WEIGH_INS weigh-ins in
 * the trailing week, FIRST_CHECKIN_MIN_DAYS days of data, adjustments from
 * week 2). The integrated loop is invisible in week one unless the app shows
 * the coach reading the logs (audit 04 §4); this module is that ledger.
 *
 * No React, no DB, no Date.now() reads without an injectable `now` — the same
 * testability contract as trialActivation.js, whose gate constants and unlock
 * maths are imported so the ledger can never disagree with the check-in gate.
 *
 * ED-safety: with an open ED-pattern flag the ledger drops to a neutral
 * variant with NO weigh-in counts and no weight ask, mirroring the
 * trialBannerLine rule (COMP-004/COMP-023).
 */

import {
  MIN_WEIGH_INS,
  FIRST_CHECKIN_MIN_DAYS,
  firstReviewUnlockDate,
} from './trialActivation';

const DAY_MS = 86400000;
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Sunday 5 July" — the named unlock date for the kept-promise copy. */
export function formatUnlockDate(date) {
  if (!date) return null;
  return `${DAYS_FULL[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * The ledger. Inputs mirror what HomeScreen's trial banner already gathers.
 *
 * @param {object} args
 * @param {number}      args.weighIns7d        weigh-ins in the trailing 7 days
 * @param {number}      args.completedSessions completed sessions since trial start
 * @param {number|null} args.firstWeightAt     epoch ms of the earliest morning weight
 * @param {number}      args.checkinDay        0=Sunday … 6=Saturday
 * @param {boolean}     args.edFlagOpen        open ED-pattern flag → neutral variant
 * @param {number}      [args.now]             epoch ms, injectable for tests
 * @returns {{ variant:'full'|'neutral', title:string, rows:Array<{key:string,done:boolean,label:string}>, unlockDate:Date|null, unlockLabel:string|null }}
 */
export function buildCoachLedger({
  weighIns7d = 0,
  completedSessions = 0,
  firstWeightAt = null,
  checkinDay = 0,
  edFlagOpen = false,
  now = Date.now(),
} = {}) {
  const unlockDate = firstReviewUnlockDate(firstWeightAt, checkinDay, now);
  const unlockLabel = formatUnlockDate(unlockDate);

  if (edFlagOpen) {
    // Neutral: no weigh-in counts, no weight ask, on top of an open flag.
    return {
      variant: 'neutral',
      title: 'Your coach is getting to know you',
      rows: [],
      unlockDate,
      unlockLabel,
    };
  }

  const daysOfData = firstWeightAt != null
    ? Math.floor((now - firstWeightAt) / DAY_MS)
    : 0;

  const rows = [
    {
      key: 'weighIns',
      done: weighIns7d >= MIN_WEIGH_INS,
      label: `${Math.min(weighIns7d, MIN_WEIGH_INS)} of ${MIN_WEIGH_INS} morning weigh-ins this week`,
    },
    {
      key: 'days',
      done: firstWeightAt != null && daysOfData >= FIRST_CHECKIN_MIN_DAYS,
      label: firstWeightAt != null
        ? `Day ${Math.min(daysOfData + 1, FIRST_CHECKIN_MIN_DAYS)} of ${FIRST_CHECKIN_MIN_DAYS} days of data`
        : 'First morning weight starts the clock',
    },
    {
      key: 'sessions',
      done: completedSessions >= 1,
      label: completedSessions >= 1
        ? `${plural(completedSessions, 'training session')} logged`
        : 'No training sessions yet',
    },
  ];

  return {
    variant: 'full',
    title: 'What your coach is reading',
    rows,
    unlockDate,
    unlockLabel,
  };
}

/**
 * The week-one hold as a full held-decision receipt (audit 04 §4: "rendering
 * the week-one hold as a full held-decision receipt instead of the bare
 * baseline view"). Consumed by CoachOutputScreen's InsufficientDataView.
 *
 * @param {object} args             same inputs as buildCoachLedger, plus:
 * @param {string|null} args.dataNote  the engine's own hold message (the rule)
 * @returns {{ ledger:object, rule:string, unlockLine:string }}
 */
export function buildHoldReceipt({ dataNote = null, ...ledgerArgs } = {}) {
  const ledger = buildCoachLedger(ledgerArgs);
  const rule = dataNote
    || `Your coach needs at least ${MIN_WEIGH_INS} morning weigh-ins and ${FIRST_CHECKIN_MIN_DAYS} days of data before the first review. Adjustments start from week 2; the first review sets your baseline.`;
  const unlockLine = ledger.unlockLabel
    ? (ledger.variant === 'neutral'
      ? `Your first coaching review unlocks on ${ledger.unlockLabel}.`
      : `Keep logging and your first coaching review unlocks on ${ledger.unlockLabel}.`)
    : 'Log your first morning weight and your first review date is set.';
  return { ledger, rule, unlockLine };
}
