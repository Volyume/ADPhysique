/**
 * planRationale.js — Campaign 16 jobs 10 and 11: the structured explanation
 * layer, for the initial plan AND for the next-block change receipt.
 *
 * FOUNDER BRIEF: "Do not reverse-engineer explanations from names after
 * generation. Keep/change decisions must emit machine-readable reasons.
 * Copy consumes these." And: "The user should be able to understand why
 * this split, why these exercises, why these movement families, why this
 * volume, why something stayed, why something changed - without
 * implementation jargon."
 *
 * WHY THIS MODULE IS SEPARATE FROM THE DECIDING
 *
 * Every reason here is a CODE emitted at the moment the decision was made:
 * `selectionReason` by planEngine's selector, `SLOT_REASON` by
 * programmeEpoch's verdicts, `SLOT_OUTCOME` by the continuity pass. This
 * module only translates. That separation is the whole point of the rule -
 * an explanation composed later, by reading the finished plan, would be a
 * plausible story rather than the actual reason, and nobody reading it
 * could tell the difference.
 *
 * It is also why there is no fallback that invents prose. An unmapped code
 * returns null and the surface shows nothing, which is honest. A generic
 * "this exercise suits your training" would be the exact failure the rule
 * exists to prevent.
 *
 * VOICE
 *
 * Plain, calm, British English, no jargon and no implementation words. The
 * user never sees "family", "role", "slot", "verdict" or "canonicality".
 */

import { SELECTION_REASON } from './planEngine';
import { SLOT_REASON } from './programmeEpoch';
import { SLOT_OUTCOME } from './exercise/continuity';

// ---------------------------------------------------------------------------
// Why an exercise is in the plan (job 10)
// ---------------------------------------------------------------------------

const SELECTION_COPY = Object.freeze({
  [SELECTION_REASON.REQUIRED_ROLE]:
    'Covers a movement your week needs.',
  [SELECTION_REASON.FAMILY_DIVERSITY]:
    'A different movement to the rest of this session, so the muscle is worked from more than one angle.',
  [SELECTION_REASON.VOLUME_FILL]:
    'Adds the remaining sets this muscle needs for the week.',
  [SELECTION_REASON.COVERAGE_FALLBACK]:
    'The best available option for a movement your week needs, given your equipment.',
  [SELECTION_REASON.ONLY_OPTION]:
    'The option your equipment and preferences left for this muscle.',
});

/**
 * Why this exercise is here. Returns null for an unknown code rather than
 * inventing a sentence.
 */
export function explainSelection(selectionReason) {
  return SELECTION_COPY[selectionReason] ?? null;
}

// ---------------------------------------------------------------------------
// Why something stayed or changed (job 11)
// ---------------------------------------------------------------------------

const REASON_COPY = Object.freeze({
  // Kept, and why.
  [SLOT_REASON.STILL_PRODUCTIVE]:
    'You are still adding weight or reps on this, so it stays.',
  [SLOT_REASON.PERSONAL_FIT_KEEP]:
    'You have chosen this movement for yourself and kept training it, so it stays.',
  [SLOT_REASON.INSUFFICIENT_HISTORY]:
    'Not enough history on this yet to judge it, so it stays for another block.',
  [SLOT_REASON.NO_REASON_TO_CHANGE]:
    'Nothing about this has stopped working, so it stays.',
  // Campaign 18 job 5. A fact about the BLOCK, not about the exercise and
  // not about the person: without the sessions there is nothing to judge, so
  // there is nothing to change either.
  [SLOT_REASON.INSUFFICIENT_EXECUTION]:
    'This block was not trained often enough to judge this exercise, so it stays as it is.',
  // CC30 (section 7 matrix): an episode-affected slot is kept, not
  // judged. Calm, no medical language, and it names the temporary frame.
  [SLOT_REASON.CAPABILITY_HOLD]:
    "This clashes with an injury or limitation you've set while your temporary change lasts, so it is kept as it is rather than judged.",
  // Changed, and why.
  [SLOT_REASON.USER_EXCLUDED]:
    'You asked not to be suggested this.',
  // CC33 D112 R6 (audit T1-08): the capability lane's own words - this
  // line must never read as a preference ("asked not to be suggested")
  // for a rule that means the movement sits outside how the user trains.
  [SLOT_REASON.CAPABILITY_EXCLUDED]:
    "This clashes with an injury or limitation you've set.",
  [SLOT_REASON.USER_SWAPPED_AWAY]:
    'You have swapped this out of your plan more than once.',
  [SLOT_REASON.JOINT_DISCOMFORT]:
    'You have reported discomfort on this more than once.',
  [SLOT_REASON.EQUIPMENT_LOST]:
    'This needs equipment you no longer have.',
  [SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE]:
    'This is no longer one Volyume will pick for you automatically. You can still choose it yourself.',
  [SLOT_REASON.MOVEMENT_REDUNDANT]:
    'This repeats a movement your session already has.',
  [SLOT_REASON.COVERAGE_GAP]:
    'Your week was missing a movement, and this covers it.',
  [SLOT_REASON.GOAL_CHANGED]:
    'This no longer fits what you are training for.',
  [SLOT_REASON.SESSION_LENGTH_CHANGED]:
    'Your sessions are a different length now, so this no longer fits.',
  [SLOT_REASON.PLATEAU]:
    'Your numbers on this have stopped moving.',
  [SLOT_REASON.SYSTEMATIC_VARIATION]:
    'You have run this for several blocks, so it is worth trying something different here.',
  // CC33 round 4 (Q2): the no-longer-in section's why - a fact about
  // the rebuilt structure, stated without judging the exercise. "Add it
  // back" stays the user's call and the copy does not pretend otherwise.
  [SLOT_REASON.NO_MATCHING_SLOT]:
    'The rebuilt plan has nothing doing the job this one did. You can add it back to any session yourself.',
});

/** Plain-English reason for a keep or change decision, or null. */
export function explainReason(reason) {
  return REASON_COPY[reason] ?? null;
}

// ---------------------------------------------------------------------------
// The receipt (job 11)
// ---------------------------------------------------------------------------

/**
 * Turn a continuity decision list into the change receipt the user reads.
 *
 * WHAT STAYS is a section in its own right, not the leftovers. Quality law
 * 6: retaining a productive exercise is a decision, and the receipt says so
 * rather than listing only what moved.
 */
export function buildChangeReceipt(decisions = []) {
  const stays = [];
  const changes = [];
  const added = [];
  const noLongerIn = [];

  for (const d of decisions) {
    const line = {
      exerciseName: d.exerciseName ?? null,
      // Round 6 (R6-5, extending R5-3): every line carries the
      // exercise's ID - renders key on identity, never a display name,
      // and names are not unique across custom and library lifts.
      exerciseId: d.exerciseId ?? null,
      workout: d.workout ?? null,
      reason: d.reason ?? null,
      why: explainReason(d.reason),
      prescriptionChange: d.prescriptionChange ?? null,
      prescriptionCopy: d.prescriptionChange
        ? `Rep target changes to ${d.prescriptionChange.repMin}-${d.prescriptionChange.repMax}.`
        : null,
    };
    if (d.outcome === SLOT_OUTCOME.RETAINED) {
      stays.push({ ...line, insteadOfName: d.insteadOfName ?? null });
    } else if (d.outcome === SLOT_OUTCOME.REPLACED) {
      changes.push({
        ...line,
        previousExerciseName: d.previousExerciseName ?? null,
        previousExerciseId: d.previousExerciseId ?? null,
      });
    } else if (d.outcome === SLOT_OUTCOME.NO_LONGER_IN) {
      // CC33 round 4 (Q2): its own section, never folded into `added`
      // (which is where an unknown outcome used to land - the exact
      // wrong bucket for an exercise that is GONE). Round 5 (R5-3): the
      // line carries the exercise's ID too - names are not unique (a
      // custom lift can share a library exercise's name), and the render
      // keys on identity, never on a display string.
      noLongerIn.push({
        ...line,
        exerciseName: d.previousExerciseName ?? null,
        previousExerciseId: d.previousExerciseId ?? null,
      });
    } else {
      added.push(line);
    }
  }

  const prescriptionCount = stays.filter(s => s.prescriptionChange).length;
  return {
    stays, changes, added, noLongerIn,
    prescriptionCount,
    headline: receiptHeadline(stays.length, changes.length, prescriptionCount, noLongerIn.length, added.length),
  };
}

/**
 * One honest line describing the shape of the change.
 *
 * Never announces that the programme HAS changed: the receipt is shown
 * before the user confirms.
 *
 * Round 5 (R5-2) established the law - the headline never denies a
 * section rendered beneath it - and round 6 (R6-5) made it structural:
 * the headline is COMPOSED from every count the receipt renders
 * (changes, additions, drops, rep targets), so no count can appear in a
 * section while the headline claims nothing is changing. The old shape
 * had no `added` parameter at all ("Nothing is changing" above "New in
 * your plan"), and its drop branch returned before the rep-target one,
 * so a drop suppressed the only statement of a prescription change and
 * affirmed "The rest stays as it is" over moving rep targets.
 */
export function receiptHeadline(stayCount, changeCount, prescriptionCount = 0, noLongerInCount = 0, addedCount = 0) {
  const bits = [];
  if (changeCount > 0) bits.push(`${changeCount} ${changeCount === 1 ? 'exercise' : 'exercises'} would change`);
  if (addedCount > 0) bits.push(`${addedCount} would be new`);
  if (noLongerInCount > 0) bits.push(`${noLongerInCount} would no longer be in your plan`);
  // When the first spoken count is not the change count, it carries the
  // noun itself so the sentence never opens with a bare number.
  if (bits.length && changeCount === 0) {
    bits[0] = bits[0].replace(/^(\d+) /, (_m, n) => `${n} ${n === '1' ? 'exercise' : 'exercises'} `);
  }
  const repTail = prescriptionCount > 0
    ? ` ${prescriptionCount} rep target${prescriptionCount === 1 ? '' : 's'} would change too.`
    : '';
  if (!bits.length) {
    if (prescriptionCount > 0) {
      return `${prescriptionCount} rep target${prescriptionCount === 1 ? '' : 's'} would change. Your exercises stay.`;
    }
    return 'Nothing is changing. Your plan is still producing good evidence.';
  }
  const joined = bits.length > 1
    ? `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`
    : bits[0];
  const totalMoved = changeCount + addedCount + noLongerInCount;
  const listedTail = totalMoved === 1 ? 'listed below with why' : 'each listed with why';
  if (stayCount === 0) return `${joined}.${repTail}`;
  return `Most of your plan stays. ${joined}, ${listedTail}.${repTail}`;
}

/**
 * Why this plan, for the INITIAL plan: the engine's own input-level
 * narrative plus the exercise-level reasons, in one shape.
 *
 * The two halves answer different questions and both were commissioned:
 * the engine's `whyThis` explains the split, the days and the volume, and
 * the per-exercise reasons explain the selection. Neither is derived from
 * the other.
 */
export function buildPlanExplanation(plan) {
  const exercises = [];
  for (const w of plan?.workouts ?? []) {
    for (const ex of w.exercises ?? []) {
      exercises.push({
        workout: w.name ?? null,
        exerciseName: ex.exerciseName ?? null,
        reason: ex.selectionReason ?? null,
        why: explainSelection(ex.selectionReason),
      });
    }
  }
  return { narrative: plan?.whyThis ?? {}, exercises };
}
