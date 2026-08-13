/**
 * swapScope.js — Campaign 16 quality law 1.
 *
 * "Distinguish temporary session swaps from persistent programme
 * replacements and explicit Don't Suggest. A one-day equipment-availability
 * substitution must not teach negative exercise preference."
 *
 * Three different facts that were previously one undifferentiated event:
 *
 *   SESSION    the user changed the exercise for TODAY, on a sheet that
 *              explicitly says the plan is unchanged. Usually because the
 *              machine was busy. It says nothing about preference.
 *   PROGRAMME  the user edited the exercise out of their plan. This one is
 *              a statement, and it may legitimately count against the
 *              exercise.
 *   (neither)  "Don't suggest this" is stronger still and lives in
 *              exercise_intent, not here, because it is intent rather than
 *              an event.
 *
 * A tiny module of its own, deliberately: database.js writes the value and
 * exercise/intent.js reads it, and intent.js already imports database.js,
 * so putting the constant in either one would either create a cycle or make
 * the reader depend on the writer's test mock.
 */

export const SWAP_SCOPE = Object.freeze({
  /** Just for this workout. The plan is unchanged and the sheet says so. */
  SESSION: 'session',
  /** The exercise was edited out of the programme. */
  PROGRAMME: 'programme',
});
