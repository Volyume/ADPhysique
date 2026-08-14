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
  meal_1: 'your first meal', meal_2: 'your second meal', meal_3: 'your third meal',
  meal_4: 'your fourth meal', meal_5: 'your fifth meal', meal_6: 'your sixth meal',
  pre_workout: 'your pre-workout meal',
  post_workout: 'your post-workout meal',
});

function slotLabel(slot) {
  return SLOT_LABELS[slot] || 'your plan';
}

// "65 g less white rice at your third meal" / "40 g more oats at your first meal"
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
    // Already under the floor: the honest message is "eat more", never
    // "nothing changes to keep you safe".
    if (change && change.belowFloor) {
      return {
        headline: 'Your plan stays as it is, and you have room to eat more.',
        body: 'You are at the lowest your plan should go. There is nothing to take away. Keep logging.',
        edits: [],
        deepLink: null,
        floorNote: true,
      };
    }
    // A clamped/refused cut with no edits still deserves an honest line.
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
  const fatDelta = (change.macroDelta && change.macroDelta.fat) || 0;
  const dirWord = applied < 0 ? 'dropped' : 'went up';
  const takenWord = applied < 0 ? 'taken' : 'added';
  const offWord = applied < 0 ? 'off' : 'onto';

  // Lead line: the number, then the macro(s) that actually moved, then the
  // food. When a cut spilled into fat (the 2.25:1 fallback) name both, so
  // the headline macro can never disagree with the edit list.
  const movedFat = Math.abs(fatDelta) >= 1;
  const movedCarb = Math.abs(carbsDelta) >= 1;
  let carbPhrase;
  if (movedCarb && movedFat) {
    carbPhrase = `${Math.abs(carbsDelta)} g of carbs and ${Math.abs(fatDelta)} g of fat`;
  } else if (movedCarb) {
    carbPhrase = `${Math.abs(carbsDelta)} g of carbs`;
  } else if (movedFat) {
    carbPhrase = `${Math.abs(fatDelta)} g of fat`;
  } else {
    carbPhrase = `${absKcal} kcal`;
  }

  const editPhrases = change.edits.map((e) => describeEdit(e, { withGrams: true }));
  const editList = joinList(editPhrases);

  let headline;
  let body;
  if (register === 'precise') {
    headline = `Target ${dirWord} ${absKcal} kcal. Plan updated.`;
    body = `${capitalise(takenWord)} ${carbPhrase} ${offWord} your plan: ${editList}. Protein held.`;
  } else {
    headline = `Your target ${dirWord} ${absKcal} kcal this week.`;
    // D88: the actor is "your coach", never "I" (locked voice doc,
    // actor-naming rule). This module sits outside weeklyCoach, so the
    // coach-voice regression guard never caught it.
    body = `Your coach has ${takenWord} ${carbPhrase} ${offWord} your plan. That is ${editList}. Your protein stays the same.`;
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

// ─── The continuity change receipt (Campaign 17A jobs 4 and 5) ───────────────

/**
 * The full plain-English receipt for a target change that was reconciled
 * through the continuity ladder (planContinuity.reconcilePlanToTarget).
 *
 * FOUNDER LAW: "The user should see concise plain-English truth", with the
 * founder's own example as the shape:
 *
 *   "Your daily target has gone up slightly.
 *    Breakfast and lunch stay the same.
 *    We've added more rice to dinner and a little more cereal to your evening
 *    snack.
 *    Your protein target hasn't changed."
 *
 * Every line here is built from what ACTUALLY changed - the real slots, the
 * real foods, the real grams - never reverse-engineered generic copy. The
 * "what stays" line comes first because that is the point of continuity: the
 * user should recognise their plan before they are told what moved.
 *
 * `buildPlanEditNarration` above is the coach's one-paragraph version for the
 * weekly decision card and stays as it is; this is the fuller receipt for the
 * surface where the user confirms.
 *
 * @param {object} result   a reconcilePlanToTarget result
 * @param {object} [opts]   { proteinChanged: boolean }
 * @returns {{ headline, stays, changes, added, protein, lines, unresolved }|null}
 */
export function buildContinuityReceipt(result, { proteinChanged = false } = {}) {
  if (!result) return null;
  const edits = result.edits || [];
  const foodChanges = result.foodChanges || [];
  const mealChanges = result.mealChanges || [];
  const nothingMoved = !edits.length && !foodChanges.length && !mealChanges.length;

  const before = Number(result.beforeKcal) || 0;
  const after = Number(result.afterKcal) || 0;
  const delta = Math.round(after - before);

  if (nothingMoved) {
    // "A stable target and successful meal plan may remain broadly stable for
    // months." Saying so is a real answer, not an empty state.
    return {
      headline: 'Your meals stay as they are.',
      stays: 'Your plan already matches your target, so nothing needs to change.',
      changes: [],
      added: null,
      protein: null,
      lines: ['Your meals stay as they are.', 'Your plan already matches your target, so nothing needs to change.'],
      unresolved: null,
    };
  }

  const size = Math.abs(delta) < 100 ? 'a little' : 'a bit';
  const headline = delta === 0
    ? 'Your plan has been brought back in line with your target.'
    : delta > 0
      ? `Your daily target has gone up ${size}.`
      : `Your daily target has come down ${size}.`;

  // What stays. Named, so the user recognises the plan they already run.
  const keptNames = (result.kept || []).map((k) => slotLabel(k.slot));
  const stays = keptNames.length
    ? `${capitalise(joinList(keptNames))} ${keptNames.length === 1 ? 'stays' : 'stay'} the same.`
    : null;

  // What moved, in real food. Portions first (the least disruptive), then any
  // food that was swapped, then a meal that was replaced.
  const changes = [];
  for (const e of edits) changes.push(describeEdit(e, { withGrams: true }));
  for (const f of foodChanges) {
    changes.push(`${f.foodInName.toLowerCase()} instead of ${f.foodOutName.toLowerCase()} at ${slotLabel(f.slot)}`);
  }
  for (const m of mealChanges) {
    changes.push(`${m.toName.toLowerCase()} instead of ${m.fromName.toLowerCase()} at ${slotLabel(m.slot)}`);
  }
  const added = changes.length ? `${capitalise(joinList(changes))}.` : null;

  // The protein line. The founder's law: when calories move and the protein
  // target does not, say so plainly, because that is the reassurance the
  // user actually wants.
  const protein = proteinChanged
    ? 'Your protein target has changed too, and your plan matches it.'
    : 'Your protein target has not changed.';

  // Honest when the ladder could not get all the way there. Never silent.
  const unresolved = result.cannotReach && !result.floorHeld
    ? 'This is as close as your current meals can get. Build a new plan if you want a closer match.'
    : result.floorHeld
      ? 'That is as far as it goes. Your safe minimum holds the rest.'
      : null;

  const lines = [headline, stays, added, protein, unresolved].filter(Boolean);
  return { headline, stays, changes, added, protein, lines, unresolved };
}
