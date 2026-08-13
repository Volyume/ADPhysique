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
  const used = new Set();

  // Everything the generator itself placed. An incumbent that already
  // appears somewhere in the new plan must NOT be substituted into a second
  // slot: doing so would put the same exercise in a session twice, which is
  // not continuity, it is a duplicate. Found by a test rather than reasoned
  // about, which is why it is written down here.
  const generatedIds = new Set(
    (generated ?? []).flatMap(w => (w.exercises ?? []).map(e => e.exerciseId)).filter(Boolean),
  );

  const workouts = (generated ?? []).map(w => ({
    ...w,
    exercises: (w.exercises ?? []).map((ex) => {
      const key = familyOf(ex.exerciseId);
      const queue = key ? (byKey.get(key) ?? []) : [];
      const incumbent = queue.find(
        i => !used.has(i.exerciseId)
          // Already placed by the generator elsewhere: nothing to retain.
          && (i.exerciseId === ex.exerciseId || !generatedIds.has(i.exerciseId)),
      );

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

      // The generator re-picked the incumbent anyway. Still a retention:
      // the user's history is intact and the receipt should say so.
      if (incumbent.exerciseId === ex.exerciseId) {
        used.add(incumbent.exerciseId);
        decisions.push({
          workout: w.name ?? null,
          exerciseId: ex.exerciseId ?? null,
          exerciseName: ex.exerciseName ?? null,
          previousExerciseId: incumbent.exerciseId,
          previousExerciseName: incumbent.exerciseName ?? null,
          outcome: SLOT_OUTCOME.RETAINED,
          reason: SLOT_REASON.NO_REASON_TO_CHANGE,
        });
        return ex;
      }

      const { verdict, reason } = slotVerdict(evidenceFor(incumbent.exerciseId) ?? {}, context);
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
        });
        used.add(incumbent.exerciseId);
        return ex;
      }

      // Keep the incumbent. The SLOT's programming - sets, reps, rest,
      // position - is the generator's and stays exactly as generated; only
      // the exercise identity changes back. This is why continuity cannot
      // alter what the plan delivers.
      used.add(incumbent.exerciseId);
      decisions.push({
        workout: w.name ?? null,
        exerciseId: incumbent.exerciseId,
        exerciseName: incumbent.exerciseName ?? null,
        previousExerciseId: incumbent.exerciseId,
        previousExerciseName: incumbent.exerciseName ?? null,
        outcome: SLOT_OUTCOME.RETAINED,
        reason,
        // What the generator would have chosen, kept for the receipt so
        // "why is this still here" can be answered honestly.
        insteadOfId: ex.exerciseId ?? null,
        insteadOfName: ex.exerciseName ?? null,
      });
      return {
        ...ex,
        exerciseId: incumbent.exerciseId,
        exerciseName: incumbent.exerciseName ?? ex.exerciseName,
      };
    }),
  }));

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
  return { retained, replaced, added, total: decisions.length };
}
