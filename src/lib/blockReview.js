/**
 * blockReview.js — Campaign 16 phase C: the one coherent proposal a block
 * boundary produces.
 *
 * FOUNDER BRIEF: "The pure programmeEpoch engine currently has NO
 * production consumer. That must be completed. Do NOT leave another
 * dead-helper architecture. At block end: Block Ledger + learned volume +
 * programmeEpoch + Exercise Intelligence + movement-family coverage +
 * current plan structure must produce ONE coherent proposed next block."
 *
 * WHAT THIS MODULE IS
 *
 * The assembly point. Every input already exists and every decision is
 * already made somewhere pure:
 *
 *   programmeEpoch.slotVerdict      should this exercise stay?
 *   programmeEpoch.programmeVerdict is this a continue, a refine or a rebuild?
 *   programmeEpoch.countEpochBlocks how much history is on this structure?
 *   exercise/intent                 what has the user told us and done?
 *   exercise/movementFamily         what job does each slot do?
 *
 * This module reads them, in one place, and produces the proposal plus the
 * user-facing receipt. It decides nothing on its own, which is the point:
 * a second opinion living here would drift from the engine and the one that
 * drifted would be the one nobody read.
 *
 * BLOCK IS NOT PROGRAMME
 *
 * Every block boundary evaluates volume. Structural review of the EXERCISES
 * becomes eligible only once the programme epoch has enough history, and
 * even then nothing is mandatory: `CONTINUE_STRUCTURE` is a legitimate,
 * explicitly-recorded answer, not the absence of a decision (quality law 6).
 *
 * REPEAT MEANS REPEAT
 *
 * Nothing here may leak into a Repeat. `proposeNextBlock` is only ever
 * called for the review/adjust route; the repeat route takes the user's
 * existing plan unchanged. That is asserted at the call site rather than
 * trusted, because "we would never call it there" is exactly the kind of
 * assumption this campaign has been unpicking.
 */

import {
  PROGRAMME_VERDICT, SLOT_VERDICT, SLOT_REASON,
  slotVerdict, programmeVerdict, countEpochBlocks, epochReviewDue,
  structureSignature,
} from './programmeEpoch';

/**
 * Build the next-block proposal for ONE programme.
 *
 * Pure: every fact is passed in. `slots` is the current plan flattened to
 * one entry per exercise, `evidenceFor` returns the slotVerdict evidence
 * for an exercise id, and `history` is the completed-block list
 * countEpochBlocks reads.
 *
 * @returns {{
 *   epochBlocks: number, reviewDue: boolean,
 *   verdict: string, changedCount: number,
 *   slots: Array<{exerciseId, exerciseName, workout, verdict, reason}>,
 *   stays: Array, changes: Array,
 * }}
 */
export function proposeNextBlock({
  slots = [],
  evidenceFor = () => ({}),
  history = [],
  currentStructure = null,
  daysChanged = false,
  equipmentChanged = false,
  sessionLengthChanged = false,
  goalChanged = false,
} = {}) {
  // countEpochBlocks compares SIGNATURES, not plans. Passing a plan object
  // straight through silently matched nothing and reported a zero-block
  // epoch for a mature programme, which would have suppressed structural
  // review forever. Signatures are derived here, once.
  const currentSignature = currentStructure ? structureSignature(currentStructure) : null;
  const signedHistory = (history ?? []).map(b => ({
    completed: b?.completed !== false,
    signature: b?.signature
      ?? (b?.structure ? structureSignature(b.structure) : null),
  }));
  const epochBlocks = currentSignature
    ? countEpochBlocks(currentSignature, signedHistory)
    : 0;
  const reviewDue = epochReviewDue(epochBlocks);

  const judged = slots.map((s) => {
    const { verdict, reason } = slotVerdict(evidenceFor(s.exerciseId) ?? {}, {
      epochBlocks, goalChanged, sessionLengthChanged,
    });
    return {
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName ?? null,
      workout: s.workout ?? null,
      verdict,
      reason,
    };
  });

  const verdict = programmeVerdict({
    epochBlocks,
    slotVerdicts: judged,
    daysChanged,
    equipmentChanged,
    sessionLengthChanged,
    goalChanged,
  });

  const changes = judged.filter(
    s => s.verdict === SLOT_VERDICT.REPLACE || s.verdict === SLOT_VERDICT.REMOVE_OR_REDISTRIBUTE,
  );
  const stays = judged.filter(
    s => s.verdict === SLOT_VERDICT.KEEP || s.verdict === SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE,
  );

  return {
    epochBlocks,
    reviewDue,
    verdict: verdict?.verdict ?? verdict,
    changedCount: changes.length,
    slots: judged,
    stays,
    changes,
  };
}

// ---------------------------------------------------------------------------
// User language
// ---------------------------------------------------------------------------

/**
 * The programme verdict, in the user's words.
 *
 * Never says "your programme has changed" - nothing has changed until the
 * user confirms. Every string describes a PROPOSAL.
 */
export function verdictCopy(verdict, { changedCount = 0 } = {}) {
  switch (verdict) {
    case PROGRAMME_VERDICT.REBUILD_PROGRAMME:
      return {
        title: 'Worth rebuilding',
        body: 'What you are training for, or what you have to train with, has moved far enough that the structure itself is worth rebuilding rather than adjusted.',
      };
    case PROGRAMME_VERDICT.REFINE_PROGRAMME:
      return {
        title: changedCount === 1 ? 'One change recommended' : `${changedCount} changes recommended`,
        body: 'Most of your programme stays. A few slots have a reason to change, and each one is listed with why.',
      };
    case PROGRAMME_VERDICT.CONTINUE_STRUCTURE:
    default:
      return {
        title: 'Your structure stays',
        // The amendment is explicit that this must be stated as a
        // deliberate outcome, not left as silence.
        body: 'Most of your programme is staying the same because it is still producing good evidence. Your set targets still move with what this block showed.',
      };
  }
}

/**
 * The recovery-week heads-up. It INFORMS; it must not promise changes.
 *
 * The amendment's own example wording, kept close because it is careful:
 * it says a review is coming and what the review will consider, and it
 * commits to nothing.
 */
export function recoveryHeadsUp({ epochBlocks = 0 } = {}) {
  const base = 'Your next block review is coming up. After this recovery week, Volyume will use what this block showed to decide what should stay, what should change and where your training volume should start.';
  if (!epochReviewDue(epochBlocks)) return { body: base };
  return {
    body: `${base} You have now built enough history on this programme for Volyume to review the exercise structure as well.`,
  };
}

/**
 * The one-line summary for the block-complete notification.
 *
 * Two forms only, and the richer one is used ONLY when a proposal actually
 * exists, exactly as the amendment specifies. Neither ever claims the
 * programme has already changed.
 */
export function blockReadyNotificationBody(proposal = null) {
  if (!proposal || proposal.changedCount === 0) {
    return 'Your next block is ready to review.';
  }
  const n = proposal.changedCount;
  return `Your next block is ready - most of your plan stays, with ${n} change${n === 1 ? '' : 's'} recommended.`;
}

/**
 * Group the proposal into the WHAT STAYS / WHAT CHANGES / WHY shape the
 * review screen renders. Reasons stay machine-readable; the screen maps
 * them to copy.
 */
export function reviewSections(proposal) {
  if (!proposal) return { stays: [], changes: [], verdict: null };
  return {
    verdict: proposal.verdict,
    stays: proposal.stays.map(s => ({
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      workout: s.workout,
      reason: s.reason,
      prescriptionChange: s.verdict === SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE,
    })),
    changes: proposal.changes.map(s => ({
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      workout: s.workout,
      reason: s.reason,
      removed: s.verdict === SLOT_VERDICT.REMOVE_OR_REDISTRIBUTE,
    })),
  };
}

/** Re-exported so consumers need one import for the whole vocabulary. */
export { PROGRAMME_VERDICT, SLOT_VERDICT, SLOT_REASON };
