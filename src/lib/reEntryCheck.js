/**
 * reEntryCheck.js — Campaign 18 block-progression amendment, long-gap re-entry.
 *
 * THE LAW THIS ENCODES, and it is the whole module in two lines:
 *
 *   TIME MAY QUESTION THE PRESCRIPTION.
 *   TIME MAY NOT CHANGE THE NEXT WORKOUT.
 *
 * Session sequencing means an outstanding session stays outstanding however
 * long the athlete is away - Legs is still Legs after twenty days. That is
 * correct, and it creates the opposite risk: blindly handing back a peak
 * prescription that was appropriate three weeks ago.
 *
 * SO THIS ASKS A QUESTION. It does not answer one. Nothing here reorders the
 * queue, resolves a session, advances a week, or changes a single prescribed
 * number. It reports that a gap is long enough to be worth asking about, and
 * carries the athlete's answer.
 *
 * ELAPSED TIME IS EVIDENCE OF UNCERTAINTY, NOT OF DETRAINING. The app does not
 * know how much strength was lost, whether the athlete trained elsewhere, or
 * what their tissue tolerance now is - so it does not say. "14 days = detrained"
 * is not encoded here and must not be: the threshold below is a UX ATTENTION
 * boundary, the point at which asking is more honest than assuming.
 *
 * PURE. No I/O, no clock: the caller passes nowMs.
 */

/**
 * The gap at which asking becomes more honest than assuming.
 *
 * Chosen as a bounded product heuristic, and deliberately NOT presented as
 * physiology. Two weeks is long enough that the previous block's peak
 * prescription is genuinely in question, and short enough that a returning
 * athlete is asked once rather than surprised by an unexplained change.
 *
 * `STALE_EVIDENCE_WEEKS` (interBlock) is the app's existing four-week boundary
 * for when block evidence can no longer authorise an INCREASE. It is not
 * reused here because it answers a different question - whether old evidence
 * may push a prescription UP - and borrowing it would quietly give it a second
 * meaning, the same mistake the epoch-similarity constant was corrected for.
 */
export const RE_ENTRY_GAP_DAYS = 14;

/**
 * Very low-frequency programmes need a longer boundary, or a once-a-week
 * athlete would be asked almost every time they train. Scaled off the
 * programme's own session count rather than a second hard-coded number.
 */
export function reEntryGapDaysFor(sessionsPerWeek) {
  const n = Number(sessionsPerWeek);
  if (!Number.isFinite(n) || n <= 0) return RE_ENTRY_GAP_DAYS;
  if (n >= 3) return RE_ENTRY_GAP_DAYS;
  // At two sessions a week or fewer, a fortnight is only a few missed
  // sessions. Give the boundary room rather than nagging a legitimate rhythm.
  return Math.round(RE_ENTRY_GAP_DAYS * (3 / Math.max(1, n)));
}

/** What the athlete told us. UNKNOWN is a real answer, not a missing one. */
export const RE_ENTRY_ANSWER = Object.freeze({
  TRAINED_ELSEWHERE: 'trained_elsewhere',
  DID_NOT_TRAIN: 'did_not_train',
  CONTINUE: 'continue',
});

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Is this return worth asking about?
 *
 * @param {object} p
 * @param {number} p.lastWorkoutAtMs   the last COMPLETED session, or null
 * @param {number} p.nowMs
 * @param {number} [p.sessionsPerWeek] the programme's own session count
 * @param {string} [p.answeredFor]     a marker of the gap already answered, so
 *   the athlete is asked once per return rather than on every screen
 * @returns {null | { gapDays, thresholdDays, key }}
 */
export function reEntryCheckDue({
  lastWorkoutAtMs = null, nowMs = null, sessionsPerWeek = null, answeredFor = null,
} = {}) {
  const last = num(lastWorkoutAtMs);
  const now = num(nowMs);
  // A brand-new athlete has no gap, only an absence of history. Asking someone
  // who has never trained whether they have been training elsewhere is not a
  // returning-athlete question.
  if (last == null || now == null || now <= last) return null;
  const gapDays = Math.floor((now - last) / 86400000);
  const thresholdDays = reEntryGapDaysFor(sessionsPerWeek);
  if (gapDays < thresholdDays) return null;
  // One key per return, so answering it stops the prompt for THIS gap and a
  // later, genuinely new absence asks again.
  const key = `${last}`;
  if (answeredFor === key) return null;
  return { gapDays, thresholdDays, key };
}

/**
 * The question, and the three answers.
 *
 * Plain English, no medical claim, and it states why it is being asked: the
 * app is uncertain, not accusing. "It's been a while" is a fact about the LOG,
 * which is the only thing Volyume can actually observe.
 */
export function reEntryPrompt(check) {
  if (!check) return null;
  return {
    title: 'Welcome back',
    body: "It's been a while since your last logged workout, so we want to check before using the same training targets.",
    options: [
      { answer: RE_ENTRY_ANSWER.TRAINED_ELSEWHERE, label: "I've still been training" },
      { answer: RE_ENTRY_ANSWER.DID_NOT_TRAIN, label: "I haven't trained" },
      { answer: RE_ENTRY_ANSWER.CONTINUE, label: 'Just continue' },
    ],
  };
}

/**
 * What each answer means for the PRESCRIPTION. Never for the queue.
 *
 * TRAINED ELSEWHERE. No logs are fabricated, and no reduction is applied
 * merely because Volyume cannot see the work. The existing prescription and
 * every existing safety rule stand exactly as they were.
 *
 * DID NOT TRAIN. The athlete has told us something real, so an easier return
 * is warranted - and it is TEMPORARY restraint, not a programme change. The
 * workout identity is untouched: Legs remains Legs.
 *
 * CONTINUE. Respected, and not asked again for this return.
 *
 * `easeReturn` is a REQUEST, not a prescription. The consuming layer applies
 * it through the existing deload/re-entry tooling; nothing here computes a
 * load, a set count or a percentage, because inventing a second training
 * engine for one question is exactly what this amendment forbids.
 */
export function reEntryOutcome(answer) {
  switch (answer) {
    case RE_ENTRY_ANSWER.TRAINED_ELSEWHERE:
      return {
        answer, easeReturn: false, changesQueue: false,
        because: 'athlete_reports_training_elsewhere',
        note: 'Keeping your targets as they are. Ease into the first session and let us know how it goes.',
      };
    case RE_ENTRY_ANSWER.DID_NOT_TRAIN:
      return {
        answer, easeReturn: true, changesQueue: false,
        because: 'athlete_reports_no_training',
        note: 'We will start you back a little easier for this session. Your programme is unchanged.',
      };
    case RE_ENTRY_ANSWER.CONTINUE:
    default:
      return {
        answer: RE_ENTRY_ANSWER.CONTINUE, easeReturn: false, changesQueue: false,
        because: 'athlete_chose_to_continue',
        note: null,
      };
  }
}
