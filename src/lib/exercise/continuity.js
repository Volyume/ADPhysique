/**
 * continuity.js — Campaign 16 job 5: what a REBUILD keeps.
 *
 * FOUNDER BRIEF: "initial plan: staples/common + correct coverage.
 * rebuild: continuity first. Do not replace a valid productive exercise
 * merely because another staple ranks slightly higher."
 *
 * THE PROBLEM
 *
 * Generation is deterministic and stateless: the same profile always
 * produces the same plan. That is a virtue for an INITIAL plan and a
 * defect for a rebuild, because a rebuild ran the identical code path with
 * no knowledge of what the user was already doing. Change one input - a
 * day, a session length, an equipment tick - and the selection could
 * reshuffle wholesale, discarding an exercise the user had been
 * progressing on for months in favour of one that scored a fraction
 * higher on a table that knows nothing about them.
 *
 * Nothing was wrong with the new exercise. That is exactly the point: when
 * two exercises are interchangeable for the job a slot exists to do, the
 * one with the user's history attached is the better choice, and it is not
 * close. History is the whole asset.
 *
 * HOW A SLOT IS MATCHED
 *
 * By MUSCLE and MOVEMENT FAMILY, not by position. A rebuild may change the
 * split, the number of days or the session length, so day-and-index
 * matching would break on precisely the rebuilds that matter. Muscle plus
 * family is the pair that says "these two exercises do the same job in
 * this programme", which is the only condition under which substituting
 * the incumbent is guaranteed not to change what the plan covers.
 *
 * WHAT DECIDES, AND WHAT DOES NOT
 *
 * The decision itself is NOT made here. It is made by programmeEpoch's
 * slotVerdict, which is the amendment's engine and already encodes the
 * founder's ordering: user intent first, then safety, then structural
 * validity, then plateau, and only then variation. This module's job is to
 * assemble honest evidence for that call and apply the answer. Two
 * implementations of "should this exercise stay" would drift, and the one
 * that drifted would be the one nobody was reading.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * No "fit score", no ranking of the incumbent against the newcomer. The
 * question is never "which is better" - the app cannot know that - it is
 * "is there a reason to change". Absent a reason, the answer is keep.
 */

import { SLOT_VERDICT, SLOT_REASON, slotVerdict } from '../programmeEpoch';

/** Why a generated slot ended up with the exercise it has. */
export const SLOT_OUTCOME = Object.freeze({
  /** The incumbent stayed. */
  RETAINED: 'retained',
  /** The incumbent was replaced, for a reason slotVerdict named. */
  REPLACED: 'replaced',
  /** Nothing was there before: a genuinely new slot. */
  NEW: 'new',
  /** CC33 round 4 (Q2): an incumbent that matched NO generated slot -
   *  its muscle/family job does not exist in the rebuilt plan, or its
   *  family could not be resolved at all (a custom lift with no stored
   *  tag). Before this member existed such incumbents simply vanished
   *  from the receipt: a rebuild silently dropped a user's own custom
   *  exercise on 15 of 17 muscles with no line anywhere. The receipt is
   *  a completeness contract; silence is the one outcome it may never
   *  have. */
  NO_LONGER_IN: 'no_longer_in',
});

/**
 * The key that says two exercises do the same job. Muscle alone is too
 * coarse (a pulldown would substitute for a row); the exercise itself is
 * too fine (nothing would ever match).
 */
export function slotKey(muscle, family) {
  return `${muscle ?? '?'}::${family ?? '?'}`;
}

/**
 * Decide, for one generated plan, which slots should keep the exercise the
 * user already has.
 *
 * Pure. Every fact it needs is passed in, so it can be tested against real
 * scenarios without a database and cannot acquire an opinion of its own
 * about the user's history.
 *
 * @param {object} params
 * @param {Array} params.generated
 *   The engine's workouts: [{ name, exercises: [{ exerciseId, exerciseName, ... }] }]
 * @param {Array} params.incumbents
 *   The user's current plan, flattened:
 *   [{ exerciseId, exerciseName, muscle, family }]
 * @param {(id: string) => object} params.evidenceFor
 *   Returns the slotVerdict evidence for an incumbent exercise id.
 * @param {(id: string) => object|null} [params.verdictFor]
 *   A verdict already produced by the block-boundary review. When present,
 *   this exact decision wins so the dry run and commit consume the proposal
 *   the user reviewed instead of silently recomputing with younger context.
 * @param {(id: string) => string|null} params.familyOf
 *   Muscle-and-family key for a GENERATED exercise id, or null if unknown.
 * @param {object} params.context
 *   { epochBlocks, goalChanged, sessionLengthChanged } passed to slotVerdict.
 * @param {boolean} params.isRebuild
 *   False for a first plan: there is nothing to be continuous with, and the
 *   initial-plan rules (staples, coverage) stand alone.
 *
 * @returns {{ workouts: Array, decisions: Array }}
 *   `decisions` is the machine-readable change receipt job 11 renders:
 *   one entry per slot, each carrying outcome, reason, and both names.
 */
export function applyContinuity({
  generated,
  incumbents = [],
  evidenceFor = () => ({}),
  verdictFor = null,
  familyOf = () => null,
  context = {},
  isRebuild = true,
}) {
  const decisions = [];

  if (!isRebuild || incumbents.length === 0) {
    for (const w of generated ?? []) {
      for (const ex of w.exercises ?? []) {
        decisions.push({
          workout: w.name ?? null,
          exerciseId: ex.exerciseId ?? null,
          exerciseName: ex.exerciseName ?? null,
          previousExerciseId: null,
          previousExerciseName: null,
          outcome: SLOT_OUTCOME.NEW,
          reason: null,
        });
      }
    }
    return { workouts: generated ?? [], decisions };
  }

  // Incumbents indexed by the job they do. A muscle/family pair can hold
  // more than one exercise (two back rows across a week), so each key keeps
  // a queue and each incumbent is used at most once.
  const byKey = new Map();
  for (const inc of incumbents) {
    const key = slotKey(inc.muscle, inc.family);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(inc);
  }
  // Round 6 (R6-5, D118 ruling): matching consumes ENTRIES, accounting
  // stays keyed on IDS. `used` (ids) answers "is this exercise retained
  // or replaced somewhere in the new plan" for the gone-accounting
  // below; `usedEntries` (object identity) answers "has this particular
  // routine row been matched to a slot". Keyed on ids alone, an
  // exercise deliberately programmed on two days could retain only its
  // first row - the second slot found no free incumbent and the receipt
  // called a lift the user has had for months "New in your plan" while
  // also listing it under "What stays".
  const used = new Set();
  const usedEntries = new Set();

  // Everything the generator itself placed. An incumbent that already
  // appears somewhere in the new plan must NOT be substituted into a second
  // slot: doing so would put the same exercise in a session twice, which is
  // not continuity, it is a duplicate. Found by a test rather than reasoned
  // about, which is why it is written down here.
  const generatedIds = new Set(
    (generated ?? []).flatMap(w => (w.exercises ?? []).map(e => e.exerciseId)).filter(Boolean),
  );

  const workouts = (generated ?? []).map(w => {
    // Round 7 (R7-1): incumbent ids already retained into THIS workout.
    // R6-5's entry-keyed matching let one twice-programmed incumbent be
    // retained into two slots of ONE session when the rebuilt session
    // held two slots of the same slotKey (ordinary for quads, whose
    // families collapse to two) - the same exercise back to back, which
    // this module's own law below calls a duplicate, not continuity.
    // Cross-WORKOUT double retention (the R6-5 case: one lift on two
    // days) stays allowed; a second entry refused here falls through to
    // the NEW branch exactly as the id-keyed code did.
    const placedInWorkout = new Set();
    return {
    ...w,
    exercises: (w.exercises ?? []).map((ex) => {
      const key = familyOf(ex.exerciseId);
      const queue = key ? (byKey.get(key) ?? []) : [];
      let incumbent = queue.find(
        i => !usedEntries.has(i)
          && !placedInWorkout.has(i.exerciseId)
          // Already placed by the generator elsewhere: nothing to retain.
          && (i.exerciseId === ex.exerciseId || !generatedIds.has(i.exerciseId)),
      );

      // A reviewed REPLACE is the one case where exact-family matching is
      // not required: the reviewed decision is specifically permission to
      // change the movement. Once the incumbent id has been removed from the
      // deterministic generator's library, the valid plan may cover that
      // muscle with a different angle/family. If we required an exact family
      // here, the reviewed decision would disappear and the receipt would
      // report the generated exercise as unrelated "new" work. Match that
      // explicit replacement to an unused slot for the same muscle; KEEP
      // decisions remain exact-family only and therefore cannot alter
      // programme coverage.
      if (!incumbent && key && verdictFor) {
        incumbent = incumbents.find(i => {
          if (usedEntries.has(i) || placedInWorkout.has(i.exerciseId) || generatedIds.has(i.exerciseId)) return false;
          if (!key.startsWith(`${i.muscle ?? '?'}::`)) return false;
          return verdictFor(i.exerciseId)?.verdict === SLOT_VERDICT.REPLACE;
        });
      }

      // Nothing was doing this job before.
      if (!incumbent) {
        decisions.push({
          workout: w.name ?? null,
          exerciseId: ex.exerciseId ?? null,
          exerciseName: ex.exerciseName ?? null,
          previousExerciseId: null,
          previousExerciseName: null,
          outcome: SLOT_OUTCOME.NEW,
          reason: null,
        });
        return ex;
      }

      // The verdict is ALWAYS consulted, including when the generator
      // happened to re-pick the incumbent itself.
      //
      // This used to short-circuit to a retention with a hardcoded "no
      // reason to change", which was wrong twice over: it reported the
      // wrong reason for an exercise that was actually still productive,
      // and - the real defect - it meant an exercise the user had EXCLUDED
      // could survive a rebuild simply because the generator offered it
      // back. Generation filters exclusions upstream, so that was unlikely
      // rather than impossible, and "unlikely" is not a guarantee.
      const samePick = incumbent.exerciseId === ex.exerciseId;
      const evidence = evidenceFor(incumbent.exerciseId) ?? {};
      const stored = verdictFor?.(incumbent.exerciseId) ?? null;
      const storedKeeps = !!stored && (stored.verdict === SLOT_VERDICT.KEEP
        || stored.verdict === SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE);
      // D112 R2 (CC33 audit T1-10): a stored reviewed KEEP never outranks
      // capability ineligibility - a review taken before a rule changed
      // could retain a movement the user cannot do, and the review used
      // to win unconditionally. The user's reviewed REPLACE always
      // stands (their word), and stored keeps stand wherever capability
      // has no objection; only the KEEP-of-an-ineligible-movement case
      // falls through to the fresh verdict, which replaces it with the
      // honest CAPABILITY_EXCLUDED reason. Keyed on the PRECISE
      // capability field, never the shared autoEligible seam (T1-08 root
      // fix) - a stored keep of an obscure-NAMED lift stands untouched.
      const decided = (storedKeeps && evidence.capabilityIneligible)
        ? slotVerdict(evidence, context)
        : (stored ?? slotVerdict(evidence, context));
      const { verdict, reason, prescriptionChange = null } = decided;
      const keeps = verdict === SLOT_VERDICT.KEEP
        || verdict === SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE;

      if (!keeps) {
        decisions.push({
          workout: w.name ?? null,
          exerciseId: ex.exerciseId ?? null,
          exerciseName: ex.exerciseName ?? null,
          previousExerciseId: incumbent.exerciseId,
          previousExerciseName: incumbent.exerciseName ?? null,
          outcome: SLOT_OUTCOME.REPLACED,
          reason,
          prescriptionChange: null,
        });
        used.add(incumbent.exerciseId);
        usedEntries.add(incumbent);
        placedInWorkout.add(incumbent.exerciseId);
        return ex;
      }

      // Keep the incumbent. The SLOT's programming - sets, reps, rest,
      // position - is the generator's and stays exactly as generated; only
      // the exercise identity changes back. This is why continuity cannot
      // alter what the plan delivers.
      used.add(incumbent.exerciseId);
      usedEntries.add(incumbent);
      placedInWorkout.add(incumbent.exerciseId);
      decisions.push({
        workout: w.name ?? null,
        exerciseId: incumbent.exerciseId,
        exerciseName: incumbent.exerciseName ?? null,
        previousExerciseId: incumbent.exerciseId,
        previousExerciseName: incumbent.exerciseName ?? null,
        outcome: SLOT_OUTCOME.RETAINED,
        reason,
        prescriptionChange,
        // What the generator would have chosen, kept for the receipt so
        // "why is this still here" can be answered honestly. Null when the
        // generator picked the same exercise: there was no alternative on
        // the table and saying otherwise would invent one.
        insteadOfId: samePick ? null : (ex.exerciseId ?? null),
        insteadOfName: samePick ? null : (ex.exerciseName ?? null),
      });
      return {
        ...ex,
        exerciseId: incumbent.exerciseId,
        exerciseName: incumbent.exerciseName ?? ex.exerciseName,
        // D112 R1 (CC33 audit T1-07): a slot retained under
        // CAPABILITY_HOLD is a deliberate keep of a movement the episode
        // filter would drop - temporary is an overlay, so the DOCUMENT
        // keeps it and serve-time works around it while the episode
        // lasts. The marker tells the resolver not to void this decision
        // at write time, which is exactly the receipt/commit
        // contradiction the audit found ("kept as it is" rendered beside
        // the emptied slot).
        ...(reason === SLOT_REASON.CAPABILITY_HOLD ? { _capabilityHold: true } : {}),
        // KEEP_WITH_PRESCRIPTION_CHANGE is only honest if the reviewed
        // prescription reaches the saved row. The proposal carries exact
        // values; continuity applies them without inventing a second rule.
        ...(prescriptionChange ? {
          repMin: prescriptionChange.repMin,
          repMax: prescriptionChange.repMax,
        } : {}),
      };
    }),
    };
  });

  // CC33 round 4 (Q2): every incumbent is accounted for. One not used by
  // any slot and not re-picked by the generator is NO LONGER IN the
  // plan, and the receipt says so instead of silence. The plan itself
  // is untouched - this is reporting, never a splice (the family-match
  // guarantee above is what keeps continuity from altering coverage,
  // and it stands).
  // Round 5 (R5-3): deduped by exercise id, like every other path
  // through `used`. Incumbents are one entry per routine_exercise row
  // across all routines, so an exercise programmed on two days listed
  // twice and counted one lost exercise as two.
  const listedGone = new Set();
  for (const inc of incumbents) {
    if (used.has(inc.exerciseId) || generatedIds.has(inc.exerciseId)) continue;
    if (listedGone.has(inc.exerciseId)) continue;
    listedGone.add(inc.exerciseId);
    decisions.push({
      workout: null,
      exerciseId: null,
      exerciseName: null,
      previousExerciseId: inc.exerciseId,
      previousExerciseName: inc.exerciseName ?? null,
      outcome: SLOT_OUTCOME.NO_LONGER_IN,
      reason: SLOT_REASON.NO_MATCHING_SLOT,
    });
  }

  return { workouts, decisions };
}

/**
 * A one-line summary of a rebuild, for the change receipt and the
 * block-complete notification. Counts only, never prose.
 */
export function summariseDecisions(decisions = []) {
  const retained = decisions.filter(d => d.outcome === SLOT_OUTCOME.RETAINED).length;
  const replaced = decisions.filter(d => d.outcome === SLOT_OUTCOME.REPLACED).length;
  const added = decisions.filter(d => d.outcome === SLOT_OUTCOME.NEW).length;
  const noLongerIn = decisions.filter(d => d.outcome === SLOT_OUTCOME.NO_LONGER_IN).length;
  return { retained, replaced, added, noLongerIn, total: decisions.length };
}
