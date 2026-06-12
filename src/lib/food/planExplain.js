/**
 * food/planExplain.js
 *
 * Renders a planEdit change record (planEdit.applyMacroDeltaToPlan) into
 * the coach voice, at the gram of rice (blueprint §3.5 step 5). This is
 * the line that makes the transparent-coach moat tangible: not "carbs
 * down 50 g" but "I have taken 50 g of carbs off your plan, that is 65 g
 * less white rice at dinner. Open your meal plan to see it."
 *
 * Voice rules (COACHING_VOICE_SYNTHESIS_LOCKED): plain sentences, numbers
 * before narrative, mirror what changed (never infer state), British
 * English, NO em dashes, no motivational filler. Two registers
 * (supportive | precise) share identical facts.
 *
 * Off-plan path: when the user is not on a meal plan, the coach narrates
 * the macro change as it does today (macro level only). This module is
 * the on-a-plan path; callers pick which to use.
 */

const SLOT_LABELS = Object.freeze({
  meal_1: 'meal 1', meal_2: 'meal 2', meal_3: 'meal 3',
  meal_4: 'meal 4', meal_5: 'meal 5', meal_6: 'meal 6',
  pre_workout: 'your pre-workout meal',
  post_workout: 'your post-workout meal',
});

function slotLabel(slot) {
  return SLOT_LABELS[slot] || 'your plan';
}

// "65 g less white rice at meal 3" / "40 g more oats at meal 1"
function describeEdit(edit, { withGrams = true } = {}) {
  const diff = edit.gramsAfter - edit.gramsBefore;
  const dir = diff < 0 ? 'less' : 'more';
  const mag = Math.abs(diff);
  const where = slotLabel(edit.slot);
  if (!withGrams) return `${dir} ${edit.name.toLowerCase()} at ${where}`;
  return `${mag} g ${dir} ${edit.name.toLowerCase()} at ${where}`;
}

/**
 * Build the food-level narration for a coach plan edit.
 *
 * @param change   the planEdit change record
 * @param opts     { register: 'supportive'|'precise', deepLinkLabel }
 * @returns { headline, body, edits: string[], deepLink, floorNote } or
 *          null when nothing actually changed.
 */
export function buildPlanEditNarration(change, opts = {}) {
  if (!change || !Array.isArray(change.edits) || change.edits.length === 0) {
    // A floored hold with no edits still deserves an honest line.
    if (change && change.floorHeld) {
      return {
        headline: 'Your plan stays as it is this week.',
        body: 'A lower target would drop you below your safe floor, so nothing changes. Keep logging.',
        edits: [],
        deepLink: null,
        floorNote: true,
      };
    }
    return null;
  }

  const register = opts.register === 'precise' ? 'precise' : 'supportive';
  const applied = change.adjustmentKcalApplied || 0;
  const absKcal = Math.abs(applied);
  const carbsDelta = (change.macroDelta && change.macroDelta.carbs) || 0;
  const dirWord = applied < 0 ? 'dropped' : 'went up';
  const takenWord = applied < 0 ? 'taken' : 'added';
  const offWord = applied < 0 ? 'off' : 'onto';

  // Lead line: the number, then the macro, then the food.
  const carbPhrase = carbsDelta !== 0
    ? `${Math.abs(carbsDelta)} g of carbs`
    : `${absKcal} kcal`;

  const editPhrases = change.edits.map((e) => describeEdit(e, { withGrams: true }));
  const editList = joinList(editPhrases);

  let headline;
  let body;
  if (register === 'precise') {
    headline = `Target ${dirWord} ${absKcal} kcal. Plan updated.`;
    body = `${capitalise(takenWord)} ${carbPhrase} ${offWord} your plan: ${editList}. Protein held.`;
  } else {
    headline = `Your target ${dirWord} ${absKcal} kcal this week.`;
    body = `I have ${takenWord} ${carbPhrase} ${offWord} your plan. That is ${editList}. Your protein stays the same.`;
  }

  const floorNote = change.floorHeld
    ? 'That is as far as it goes this week. Your safe floor holds the rest.'
    : null;

  return {
    headline,
    body,
    edits: editPhrases,
    deepLink: { label: opts.deepLinkLabel || 'See your meal plan', target: 'MealPlan' },
    floorNote,
  };
}

function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Oxford-free list join in British register: "a, b and c".
function joinList(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
}
