/**
 * food/mealRationale.js — Campaign 17B job 5.
 *
 * FOUNDER LAW: a user should be able to answer "Why these meals? Why did you
 * keep this? Why did you use this food? Why isn't that food appearing?" - and
 * the answers must come from ACTUAL STRUCTURED REASONS, never be
 * reverse-engineered from the meal name.
 *
 * So the assembler stamps a CODE on each meal as it places it, and this module
 * turns codes into plain English at read time. Same shape as the training
 * side's planRationale: the code is what is stored, the wording is rendered,
 * so copy can improve without a migration and without a saved plan carrying a
 * sentence written by an older build.
 *
 * A code is only ever stamped where the reason is genuinely known. There is no
 * "probably because" fallback: a meal with no recorded reason renders nothing
 * at all, which is honest, rather than a guess dressed up as an explanation.
 */

/**
 * Why a meal is in the plan. Ordered most specific first: a meal that is BOTH
 * the user's own recipe and a good macro fit is explained as their recipe,
 * because that is the reason that means something to them.
 */
export const MEAL_REASON = Object.freeze({
  /** The user asked us to keep this one. */
  PINNED: 'pinned',
  /** One of the user's own saved meals. */
  SAVED_MEAL: 'saved_meal',
  /** One of the user's own recipes. */
  RECIPE: 'recipe',
  /** The user eats this often enough that we built around it. */
  USUAL: 'usual',
  /** It fits what is left of the day's target. The ordinary case. */
  MACRO_FIT: 'macro_fit',
  /** We have no personal history yet, so this is a sensible starting choice. */
  GENERIC_START: 'generic_start',
});

/**
 * Why a FOOD inside a meal is what it is. Stamped by the paths that change a
 * food after assembly, so a swapped ingredient can explain itself.
 */
export const FOOD_REASON = Object.freeze({
  /** "Use turkey instead of chicken from now on" (Campaign 17A job 3). */
  PERSISTENT_REPLACEMENT: 'persistent_replacement',
  /** The portion moved to match a changed target (17A job 5). */
  TARGET_CHANGE: 'target_change',
});

const MEAL_COPY = Object.freeze({
  [MEAL_REASON.PINNED]: 'You asked us to keep this one.',
  [MEAL_REASON.SAVED_MEAL]: 'This is one of your saved meals.',
  [MEAL_REASON.RECIPE]: 'This is one of your recipes.',
  [MEAL_REASON.USUAL]: 'You eat this regularly, so we have built around it.',
  [MEAL_REASON.MACRO_FIT]: 'This fits the calories and protein left for this meal.',
  [MEAL_REASON.GENERIC_START]: 'We do not have enough history yet, so we have used a simple option that fits your preferences.',
});

const FOOD_COPY = Object.freeze({
  [FOOD_REASON.PERSISTENT_REPLACEMENT]: 'You asked us to use this instead.',
  [FOOD_REASON.TARGET_CHANGE]: 'The amount changed to match your new target.',
});

/** Plain English for a meal's reason code, or null when none was recorded. */
export function explainMeal(reason) {
  if (!reason) return null;
  return MEAL_COPY[reason] ?? null;
}

/** Plain English for a food-level reason code, or null. */
export function explainFood(reason) {
  if (!reason) return null;
  return FOOD_COPY[reason] ?? null;
}

/**
 * Why a food is NOT appearing. The founder's fourth question, and the one the
 * app can answer most precisely, because an exclusion is something the user
 * said outright.
 *
 * @param {object} ctx { excludedByUser, excludedByAllergen, excludedByDiet }
 */
export function explainAbsence({ excludedByUser, excludedByAllergen, excludedByDiet } = {}) {
  if (excludedByUser) return 'You asked us not to suggest this food.';
  if (excludedByAllergen) return 'This does not fit the allergens you avoid.';
  if (excludedByDiet) return 'This does not fit the diet you have chosen.';
  return null;
}

/**
 * The one-line summary for a whole generated day: what shaped it.
 *
 * Leads with what the user will recognise - their own meals - and falls back
 * to an honest statement of inexperience rather than inventing a rationale.
 *
 * @param {Array} slots  the day's slots, each optionally carrying `reason`
 */
export function explainDay(slots = []) {
  const list = Array.isArray(slots) ? slots : [];
  if (!list.length) return null;
  const count = (r) => list.filter((s) => s?.reason === r).length;
  const own = count(MEAL_REASON.SAVED_MEAL) + count(MEAL_REASON.RECIPE) + count(MEAL_REASON.USUAL);
  const pinned = count(MEAL_REASON.PINNED);
  const generic = count(MEAL_REASON.GENERIC_START);

  if (pinned && own) {
    return `Built around the meal you asked us to keep and ${own === 1 ? 'one of your own meals' : 'your own meals'}.`;
  }
  if (pinned) return 'Built around the meal you asked us to keep.';
  if (own) {
    return own === 1
      ? 'Built around one of your own meals, with the rest chosen to fit your target.'
      : 'Built around your own meals, with the rest chosen to fit your target.';
  }
  if (generic === list.length) {
    return 'We do not have enough history yet, so these are simple options that fit your preferences and your target.';
  }
  return 'Chosen to fit your calories and protein for the day, within your preferences.';
}
