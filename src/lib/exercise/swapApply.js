/**
 * swapApply.js -- D219 lane A4 (design 4.12, founder R10): the ONE place a swap
 * is carried out, for every surface that offers the choice "Just this session"
 * or "From now on" (the logger's swap sheet and the plan's routine screen).
 *
 *   just this session: the plan is untouched. The routine row and the plan's
 *     facts are never written; the swap is logged with scope `session`, which
 *     says nothing about preference (Campaign 16 quality law 1: a busy machine
 *     must never teach Volyume that the person dislikes an exercise).
 *   from now on: the routine row of the slot is replaced through the plan-level
 *     swap path (database.updateRoutineExerciseExercise: sets and reps carry,
 *     rest follows the new exercise, the load is cleared, and on a plan the new
 *     planner built the slot's facts follow), and the swap is logged with scope
 *     `programme`, an edit of the plan that may count as preference.
 *
 * Fail safe: only the exact scope `programme`, with the routine row to write,
 * ever edits the plan. Anything else (an unknown scope, no scope, a freeform
 * exercise with no routine row) is a one-off. The plan write throws on a database
 * failure and is the caller's to tell the person about; the swap log is
 * best-effort (a failed record never fails a swap).
 *
 * This module sits above database.js; the pure rules it applies live in
 * swapCarry.js and database.js reaches that lazily, so there is no cycle.
 */
import { updateRoutineExerciseExercise, recordExerciseSwap } from '../database';
import { logWarn } from '../errorLog';
import { SWAP_SCOPE } from './swapScope';

/**
 * @param {object} args
 * @param {string} args.userId
 * @param {string} [args.scope]               SWAP_SCOPE.SESSION or SWAP_SCOPE.PROGRAMME
 * @param {?string} [args.routineId]          the routine the swap happened in
 * @param {?string} [args.routineExerciseId]  the slot's routine exercise row, for a permanent swap
 * @param {object} args.fromExercise
 * @param {object} args.toExercise
 * @param {?string} [args.causeOverride]      'constraint' or 'style' (recordExerciseSwap)
 * @returns {Promise<{scope: string, plan: boolean, muscleChange: ?{from: string, to: string}}>}
 *          `plan` is true when the plan was written; `muscleChange` is the muscle
 *          the slot's sets moved between, when a permanent swap moved them
 */
export async function applyExerciseSwap({
  userId, scope, routineId = null, routineExerciseId = null, fromExercise, toExercise, causeOverride = null,
} = {}) {
  const toPlan = scope === SWAP_SCOPE.PROGRAMME && !!routineExerciseId && !!toExercise?.id;
  let muscleChange = null;
  if (toPlan) {
    const res = await updateRoutineExerciseExercise(routineExerciseId, toExercise.id);
    muscleChange = res?.muscleChange ?? null;
  }
  if (userId && fromExercise?.id && toExercise?.id) {
    try {
      await recordExerciseSwap(userId, fromExercise.id, toExercise.id, {
        routineId,
        explicit: true,
        scope: toPlan ? SWAP_SCOPE.PROGRAMME : SWAP_SCOPE.SESSION,
        causeOverride,
      });
    } catch (e) {
      logWarn('swapApply.recordExerciseSwap', e?.message);
    }
  }
  return { scope: toPlan ? SWAP_SCOPE.PROGRAMME : SWAP_SCOPE.SESSION, plan: toPlan, muscleChange };
}
