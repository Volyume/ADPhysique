/**
 * foodSwapScope.js — Campaign 17A job 3.
 *
 * FOUNDER LAW: "Different user actions mean different things." Three of them,
 * and before this the food domain could tell none of them apart:
 *
 *   JUST_THIS_TIME  "No chicken in the house." / "The shop had no yoghurt."
 *                   / "I fancy something else tonight."
 *                   Affects the current plan occurrence and NOTHING else. It
 *                   must never teach Volyume that the user dislikes the food
 *                   they swapped away from.
 *   PERSISTENT      "Use turkey instead of chicken in future."
 *                   A deliberate statement, and legitimate personalisation
 *                   evidence: future plans may prefer the chosen replacement
 *                   where it fits.
 *   (neither)       "Don't suggest this" is stronger still, and lives on the
 *                   profile's mealPlanExcludeFoods rather than here, because
 *                   it is standing INTENT about a food rather than an EVENT
 *                   between two foods.
 *
 * A tiny module of its own, deliberately, and for the same reason
 * exercise/swapScope.js is one: the database layer WRITES the value and
 * food/intent.js READS it, and intent.js already imports the database layer,
 * so putting the constant in either would create a cycle or make the reader
 * depend on the writer's test mock.
 */

export const FOOD_SWAP_SCOPE = Object.freeze({
  /** Just this occurrence. The user's standing preferences are unchanged. */
  JUST_THIS_TIME: 'just_this_time',
  /** "From now on, use this instead." A standing replacement. */
  PERSISTENT: 'persistent',
});

/** Is this a scope value the schema and the readers both understand? */
export function isFoodSwapScope(value) {
  return value === FOOD_SWAP_SCOPE.JUST_THIS_TIME || value === FOOD_SWAP_SCOPE.PERSISTENT;
}
