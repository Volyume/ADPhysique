/**
 * programmeEpoch.js — Campaign 16 amendment: programme epochs, multi-block
 * continuity, and when a plan's EXERCISE STRUCTURE may evolve.
 *
 * THE CORRECTION THIS ENCODES
 *
 * A training block is roughly four hard weeks plus recovery. A programme
 * epoch is the run of consecutive blocks that share substantially the same
 * exercise structure. Those are different time scales, and conflating them
 * is how an app ends up rotating someone's exercises every four weeks.
 *
 * FOUNDER RULING, and the reason it is worth stating plainly: there is no
 * defensible rule that exercises must change every N weeks. The evidence
 * supports progressive overload and appropriate volume as the primary
 * drivers, supports fixed selection remaining effective across multi-week
 * training, and warns that excessive or random rotation can degrade
 * training quality. Systematic variation may broaden regional adaptation.
 * So variation must be PURPOSEFUL, never calendar-driven.
 *
 *   A block boundary is a REVIEW OPPORTUNITY.
 *   A block boundary is NOT an exercise-change trigger.
 *
 * WHAT THIS MODULE DECIDES
 *
 *   epochBlocks   how many consecutive completed blocks the athlete has
 *                 run under substantially this same structure
 *   programme     CONTINUE_STRUCTURE | REFINE_PROGRAMME | REBUILD_PROGRAMME
 *   per slot      KEEP | KEEP_WITH_PRESCRIPTION_CHANGE | REPLACE |
 *                 REMOVE_OR_REDISTRIBUTE
 *
 * Every verdict carries a structured reason. Nothing here reverse-engineers
 * a justification after the fact: the decision produces the reason code, and
 * copy renders it.
 *
 * Pure. No I/O, no randomness, no clock of its own. Same inputs, same
 * verdicts, which is the engine law this app is built on.
 */

// ─── Verdict vocabulary ───────────────────────────────────────────────────

export const PROGRAMME_VERDICT = Object.freeze({
  CONTINUE_STRUCTURE: 'continue_structure',
  REFINE_PROGRAMME: 'refine_programme',
  REBUILD_PROGRAMME: 'rebuild_programme',
});

export const SLOT_VERDICT = Object.freeze({
  KEEP: 'keep',
  KEEP_WITH_PRESCRIPTION_CHANGE: 'keep_with_prescription_change',
  REPLACE: 'replace',
  REMOVE_OR_REDISTRIBUTE: 'remove_or_redistribute',
});

/**
 * Why a slot got its verdict. These are the machine-readable reasons the
 * amendment requires: copy renders them, it never invents them.
 *
 * The SAFETY_FIT group outranks continuity and may fire in ANY block,
 * including the first. The SYSTEMATIC group is the only group gated on the
 * review threshold, because it is the only one that is about variation
 * rather than about something being wrong.
 */
export const SLOT_REASON = Object.freeze({
  // Safety and explicit user intent. Never gated on epoch age.
  USER_EXCLUDED: 'user_excluded',
  JOINT_DISCOMFORT: 'joint_discomfort',
  USER_SWAPPED_AWAY: 'user_swapped_away',
  // Structural: the slot no longer fits the programme it sits in.
  EQUIPMENT_LOST: 'equipment_lost',
  NO_LONGER_AUTO_ELIGIBLE: 'no_longer_auto_eligible',
  MOVEMENT_REDUNDANT: 'movement_redundant',
  COVERAGE_GAP: 'coverage_gap',
  GOAL_CHANGED: 'goal_changed',
  SESSION_LENGTH_CHANGED: 'session_length_changed',
  // Evidence about this exercise specifically.
  PLATEAU: 'plateau',
  // Variation for its own sake, allowed only after the review threshold.
  SYSTEMATIC_VARIATION: 'systematic_variation',
  // Kept. C16 quality law 6: "KEEP is a first-class intelligent decision.
  // At block review, explicitly record positive reasons for retaining
  // productive exercises rather than treating unchanged slots as absence of
  // a decision." Every KEEP below names WHY it was kept.
  STILL_PRODUCTIVE: 'still_productive',
  PERSONAL_FIT_KEEP: 'personal_fit_keep',
  INSUFFICIENT_HISTORY: 'insufficient_history',
  NO_REASON_TO_CHANGE: 'no_reason_to_change',
});

/**
 * The reasons that justify replacing an exercise BEFORE the epoch has
 * enough history to review its structure. Every one is either the user
 * telling us something, or the slot no longer being valid at all.
 * "It has been here a while" is deliberately not among them.
 */
export const EARLY_TRIGGERS = new Set([
  SLOT_REASON.USER_EXCLUDED,
  SLOT_REASON.JOINT_DISCOMFORT,
  SLOT_REASON.USER_SWAPPED_AWAY,
  SLOT_REASON.EQUIPMENT_LOST,
  SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE,
  SLOT_REASON.MOVEMENT_REDUNDANT,
  SLOT_REASON.COVERAGE_GAP,
  SLOT_REASON.GOAL_CHANGED,
  SLOT_REASON.SESSION_LENGTH_CHANGED,
]);

/**
 * May this reason replace an exercise BEFORE the epoch has earned its
 * structural review?
 *
 * Exported rather than left implicit in the ordering below, so the law is
 * checkable: exactly one reason (SYSTEMATIC_VARIATION) is gated on the
 * review threshold, and every other reason is something being wrong or the
 * user telling us, which cannot be made to wait for a block count.
 */
export function isEarlyTrigger(reason) {
  return EARLY_TRIGGERS.has(reason);
}

/**
 * The block count at which a programme has enough repeated exposure for its
 * exercise STRUCTURE to be reviewed, not just its volume.
 *
 * This is a PRODUCT HEURISTIC and is documented as one. It is not a claim
 * that three blocks is scientifically optimal, because the literature does
 * not establish that. It is the point at which the athlete has produced
 * enough repeated exposure for a structural judgement to mean anything, and
 * it keeps variation systematic rather than frequent.
 *
 * Reaching it makes review MANDATORY and change ELIGIBLE. It never makes
 * change mandatory.
 */
export const EPOCH_REVIEW_BLOCKS = 3;

// ─── Structural identity ──────────────────────────────────────────────────

/**
 * A stable fingerprint of a programme's exercise STRUCTURE.
 *
 * Deliberately excludes everything that is allowed to change block to block
 * without starting a new epoch: sets, volume ramps, recovery dose,
 * progression, rep ranges and rest. Those are block-level prescriptions,
 * and the amendment is explicit that changing them must not reset the
 * counter.
 *
 * Also deliberately excludes the programme's database id. A rebuilt or
 * copied plan can carry an effectively identical structure under a new id,
 * and treating that as a fresh epoch would hand the user a structural
 * review they have not earned, or hide one they have.
 */
export function structureSignature(programme) {
  // The pure engine historically called these `days`; the real generator
  // and database paths call them `workouts`. Accept both at this one
  // boundary. Production previously passed `{ workouts }`, which collapsed
  // every programme to an empty signature and made unrelated blocks look
  // like one long epoch.
  const sourceDays = programme?.days ?? programme?.workouts ?? [];
  const days = sourceDays
    .map(d => ({
      name: d?.name ?? '',
      exercises: [...new Set((d?.exercises ?? [])
        .map(e => e?.exerciseId ?? e?.exerciseName ?? null)
        .filter(Boolean))].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    splitType: programme?.splitType ?? null,
    dayCount: days.length,
    days,
    exercises: [...new Set(days.flatMap(d => d.exercises))].sort(),
  };
}

/**
 * How much two structures overlap, 0..1, by exercise identity.
 * Jaccard rather than "retained / previous" so adding three exercises is
 * as visible as removing three.
 */
export function structureSimilarity(a, b) {
  const A = new Set(a?.exercises ?? []);
  const B = new Set(b?.exercises ?? []);
  if (A.size === 0 && B.size === 0) return 1;
  let shared = 0;
  for (const x of A) if (B.has(x)) shared += 1;
  const union = A.size + B.size - shared;
  return union === 0 ? 1 : shared / union;
}

/**
 * The boundary between "this is still the same programme, refined" and
 * "this is a different programme".
 *
 * Set where it is because the amendment describes a refinement as retaining
 * most of the plan and changing only the slots with a reason. This is NOT a
 * refresh-eligibility threshold - nothing consults it to decide whether an
 * exercise may change - it only answers whether the epoch counter continues.
 */
export const EPOCH_CONTINUITY_SIMILARITY = 0.6;

/**
 * Do two programmes belong to the same epoch?
 *
 * A different split or a different number of training days is a material
 * structural change and always starts a new epoch. Beyond that, an epoch
 * survives a refinement and ends at a rebuild.
 */
export function isSameEpochStructure(a, b) {
  if (!a || !b) return false;
  if ((a.splitType ?? null) !== (b.splitType ?? null)) return false;
  if (a.dayCount !== b.dayCount) return false;
  return structureSimilarity(a, b) >= EPOCH_CONTINUITY_SIMILARITY;
}

/**
 * How many consecutive COMPLETED blocks the athlete has run under
 * substantially the current structure.
 *
 * `history` is newest-first: each entry is { signature, completed }. Only
 * completed blocks count, because an abandoned block is not evidence, and
 * counting it would hand someone a structural review they never trained for.
 */
export function countEpochBlocks(currentSignature, history = []) {
  let n = 0;
  for (const block of history) {
    if (!block?.completed) break;
    if (!isSameEpochStructure(currentSignature, block.signature)) break;
    n += 1;
  }
  return n;
}

/** Has this epoch earned a structural review? */
export function epochReviewDue(epochBlocks) {
  return (epochBlocks ?? 0) >= EPOCH_REVIEW_BLOCKS;
}

// ─── Slot verdicts ────────────────────────────────────────────────────────

/**
 * The verdict for ONE existing programme slot.
 *
 * `evidence` is what is actually known about this exercise, and every field
 * is something the app already tracks or the user explicitly told us:
 *
 *   excluded            Campaign 9 avoid / don't-suggest
 *   jointDiscomfort     repeated credible joint evidence, not one session
 *   swappedAwayCount    repeated deliberate swaps away from this exercise
 *   equipmentLost       no longer possible under current equipment
 *   autoEligible        still valid under the C16 canonicality metadata
 *   redundant           duplicates a movement family already covered
 *   coverageGap         the slot is needed for a family nothing else covers
 *   plateau             genuine multi-session plateau under the C12 rules
 *   progressing         still adding load or reps
 *   prescriptionFix     a rep-range or prescription change would plausibly
 *                       address the plateau
 *
 * The ordering below is the ruling's ordering: safety and explicit user
 * intent first, then structural validity, then evidence about the exercise,
 * and only last, and only after the review threshold, systematic variation.
 */
export function slotVerdict(evidence = {}, { epochBlocks = 0, goalChanged = false, sessionLengthChanged = false } = {}) {
  const verdict = (v, reason) => ({ verdict: v, reason });

  // 1. The user told us. Outranks everything, in any block.
  if (evidence.excluded) return verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.USER_EXCLUDED);
  // Repeated deliberate swaps are the user telling us by behaviour rather
  // than by switch. One swap is not evidence; a pattern is.
  if ((evidence.swappedAwayCount ?? 0) >= 2) {
    return verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.USER_SWAPPED_AWAY);
  }
  // 2. Safety. Repeated credible joint discomfort, never a single session.
  if (evidence.jointDiscomfort) return verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.JOINT_DISCOMFORT);

  // 3. The slot is no longer valid at all.
  if (evidence.equipmentLost) return verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.EQUIPMENT_LOST);
  if (evidence.autoEligible === false) {
    return verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE);
  }
  if (evidence.redundant) {
    return verdict(SLOT_VERDICT.REMOVE_OR_REDISTRIBUTE, SLOT_REASON.MOVEMENT_REDUNDANT);
  }
  if (goalChanged && evidence.conflictsWithGoal) {
    return verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.GOAL_CHANGED);
  }
  if (sessionLengthChanged && evidence.doesNotFitSession) {
    return verdict(SLOT_VERDICT.REMOVE_OR_REDISTRIBUTE, SLOT_REASON.SESSION_LENGTH_CHANGED);
  }

  // 4. Evidence about this exercise. A plateau opens the question of an
  // intervention; it does not decide that the intervention is replacement.
  // Changing the prescription is often the smaller and better move, and the
  // amendment is explicit that plateau alone must not always mean REPLACE.
  if (evidence.plateau) {
    return evidence.prescriptionFix
      ? verdict(SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE, SLOT_REASON.PLATEAU)
      : verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.PLATEAU);
  }

  // 5. Systematic variation. The ONLY reason gated on the review threshold,
  // because it is the only one that is about variation rather than about
  // something being wrong. Positive evidence actively protects a movement:
  // a still-progressing exercise is never rotated out for novelty, at any
  // age. There is no maximum exercise age.
  if (epochReviewDue(epochBlocks) && evidence.systematicCandidate && !evidence.progressing) {
    return verdict(SLOT_VERDICT.REPLACE, SLOT_REASON.SYSTEMATIC_VARIATION);
  }

  // 6. Keep, and say why. C16 quality law 6: a retained slot is a decision
  // that was made, not a decision that was skipped, so every branch here
  // returns a reason rather than falling through silently.
  if (evidence.progressing) return verdict(SLOT_VERDICT.KEEP, SLOT_REASON.STILL_PRODUCTIVE);
  // Established personal fit: the user has chosen this movement for
  // themselves, repeatedly, and kept training it. That is a positive
  // reason to retain it in its own right, distinct from "nothing is wrong
  // with it".
  if (evidence.establishedPersonalFit) {
    return verdict(SLOT_VERDICT.KEEP, SLOT_REASON.PERSONAL_FIT_KEEP);
  }
  if (!epochReviewDue(epochBlocks)) {
    return verdict(SLOT_VERDICT.KEEP, SLOT_REASON.INSUFFICIENT_HISTORY);
  }
  return verdict(SLOT_VERDICT.KEEP, SLOT_REASON.NO_REASON_TO_CHANGE);
}

// C16 phase C. Two separate ideas, deliberately given separate names.
//
// REBUILD_MIN_CHANGED_SLOTS is the founder's rule stated directly: one or
// two changed slots is a refinement, never a rebuild, whatever proportion
// of a small programme they represent.
//
// REBUILD_CHURN_RATIO is the proportion above which "refinement" stops
// being an honest word. It is a product heuristic, not a scientific
// threshold, and it is NOT EPOCH_CONTINUITY_SIMILARITY - that constant
// answers a different question (does the epoch counter continue?) and must
// not acquire a second meaning.
const REBUILD_MIN_CHANGED_SLOTS = 3;
const REBUILD_CHURN_RATIO = 0.4;

// ─── Programme verdict ────────────────────────────────────────────────────

/**
 * The one programme-level verdict for a block boundary.
 *
 * `structural` names the material changes that make this a rebuild rather
 * than a refinement: the things that change what the programme IS, not
 * which exercises fill it.
 *
 * The review is MANDATORY at every boundary once the epoch reaches the
 * threshold, so the app can never quietly say "same exercises forever
 * because the user did not change their days". Answering CONTINUE_STRUCTURE
 * is a legitimate outcome of that review - it is just no longer the default
 * that happens by nobody asking.
 */
export function programmeVerdict({
  epochBlocks = 0,
  slotVerdicts = [],
  daysChanged = false,
  equipmentChanged = false,
  sessionLengthChanged = false,
  goalChanged = false,
} = {}) {
  const changed = slotVerdicts.filter(
    s => s.verdict === SLOT_VERDICT.REPLACE || s.verdict === SLOT_VERDICT.REMOVE_OR_REDISTRIBUTE,
  );
  const total = slotVerdicts.length;

  // Material structural change. Not a matter of how many exercises moved.
  if (daysChanged || equipmentChanged || sessionLengthChanged || goalChanged) {
    return {
      verdict: PROGRAMME_VERDICT.REBUILD_PROGRAMME,
      epochBlocks,
      reviewDue: epochReviewDue(epochBlocks),
      changedSlots: changed.length,
      totalSlots: total,
      reasons: [
        daysChanged && 'days_changed',
        equipmentChanged && 'equipment_changed',
        sessionLengthChanged && 'session_length_changed',
        goalChanged && 'goal_changed',
      ].filter(Boolean),
    };
  }

  // Enough of the programme no longer fits that calling it a refinement
  // would be untrue.
  //
  // C16 phase C: this used to be a churn RATIO alone, and the ratio reused
  // EPOCH_CONTINUITY_SIMILARITY. Two problems, both now fixed:
  //
  //   1. The comment above promised "a two-exercise change is never a
  //      rebuild" and the code did not enforce it - on a four-slot upper
  //      day, two changes is 50% churn and was reported as a rebuild. The
  //      founder's instruction is explicit: "Do not call something
  //      REBUILD_PROGRAMME if only one/two slots changed." It is now an
  //      absolute floor, checked before the ratio, so a small programme
  //      cannot reach a rebuild by arithmetic.
  //   2. EPOCH_CONTINUITY_SIMILARITY decides whether the epoch COUNTER
  //      continues and nothing else. Borrowing it here quietly gave it a
  //      second meaning, which is exactly what its own documentation says
  //      it must not have. Churn has its own named constant.
  //
  // A material structural change (days, equipment, session length, goal)
  // returned above and is unaffected: that is a rebuild however few
  // exercises move, because it changes what the programme IS.
  const churn = total > 0 ? changed.length / total : 0;
  const enoughSlotsToRebuild = changed.length >= REBUILD_MIN_CHANGED_SLOTS;
  const verdict = changed.length === 0
    ? PROGRAMME_VERDICT.CONTINUE_STRUCTURE
    : (enoughSlotsToRebuild && churn > REBUILD_CHURN_RATIO
      ? PROGRAMME_VERDICT.REBUILD_PROGRAMME
      : PROGRAMME_VERDICT.REFINE_PROGRAMME);

  return {
    verdict,
    epochBlocks,
    reviewDue: epochReviewDue(epochBlocks),
    changedSlots: changed.length,
    totalSlots: total,
    reasons: [...new Set(changed.map(s => s.reason))],
  };
}

/**
 * Does the next block start a new epoch?
 *
 * Only a genuine rebuild does. A refinement, a volume change, a ramp
 * change, a recovery change or one refined accessory all continue the
 * epoch, so the counter keeps meaning "how long has this athlete trained
 * this structure" rather than "how long since anything at all moved".
 */
export function epochContinues(programmeVerdictResult) {
  return programmeVerdictResult?.verdict !== PROGRAMME_VERDICT.REBUILD_PROGRAMME;
}
