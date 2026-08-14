/**
 * food/habits.js — Campaign 17B job 4.
 *
 * FOUNDER LAW: "Build only conservative, useful habit intelligence."
 *
 * Volyume MAY learn from confirmed actual behaviour: a common breakfast, a
 * recurring saved meal or recipe, a meal-slot preference, a repeated
 * persistent replacement, a frequent exact food.
 *
 * Volyume must NOT learn from: a missing log, a planned-but-not-eaten row, a
 * deleted mistake, a single temporary swap, one unusual day, or a calorie-bank
 * day treated as a permanent habit.
 *
 * STATED VS OBSERVED, and this is the whole design: "Do not silently overwrite
 * user preferences." A user who chose four meals and consistently logs three
 * gets ASKED - "You usually log three main meals. Want future meal plans built
 * that way?" - and confirms or declines. Nothing here changes a preference. It
 * returns an observation and a question; a human answers it.
 *
 * WHAT COUNTS AS EVIDENCE
 *
 * Only COMPLETE logged days. A day where someone logged a coffee and stopped
 * says nothing about how many meals they eat, and counting it would manufacture
 * a habit out of a gap in the diary. Completeness is judged on how much of the
 * day's target was actually logged - see DAY_COMPLETE_FRACTION.
 *
 * Planned rows never reach here at all: the readers this module consumes
 * already exclude them (Campaign 17A job 2), so a meal plan staged into the
 * diary and never confirmed cannot teach anything.
 *
 * SUFFICIENCY reuses the food-intent layer's existing repeated-choice law
 * rather than inventing a second one. If the evidence is ambiguous, this
 * module returns null and the app says nothing.
 *
 * PURE. No I/O, no clock, no randomness: the caller supplies the days.
 */
import { FOOD_EVIDENCE_MATURITY, foodEvidenceMaturity, ESTABLISHED_USES } from './intent';

/**
 * How much of a day's calorie target must be logged before that day's MEAL
 * COUNT means anything.
 *
 * A PRODUCT HEURISTIC, written down as one. 70% is deliberately generous: it
 * admits an honest day that ran a little under target, and rejects the days
 * where someone logged breakfast and then stopped - which is the case that
 * would otherwise teach "you only eat one meal".
 */
export const DAY_COMPLETE_FRACTION = 0.7;

/**
 * How many complete days are needed before an observation is worth raising.
 *
 * Tied to the food-intent layer's ESTABLISHED_USES rather than a new number,
 * so the app has ONE idea of what "established" means. Below this the answer
 * is silence, not a guess.
 */
export const MIN_COMPLETE_DAYS = ESTABLISHED_USES;

/** A meal slot only counts as a MEAL when it carries real food. */
export const MIN_MEAL_KCAL = 100;

/**
 * Judge which days are complete enough to learn from.
 *
 * @param {Array} days  [{ date, targetKcal, slots: [{ slot, kcal }] }]
 * @returns {{ complete: Array, incomplete: Array }}
 */
export function splitByCompleteness(days = []) {
  const complete = [];
  const incomplete = [];
  for (const d of Array.isArray(days) ? days : []) {
    const target = Number(d?.targetKcal) || 0;
    const logged = (d?.slots ?? []).reduce((a, s) => a + (Number(s?.kcal) || 0), 0);
    if (target > 0 && logged >= target * DAY_COMPLETE_FRACTION) complete.push(d);
    else incomplete.push(d);
  }
  return { complete, incomplete };
}

/** How many MEANINGFUL meals a day carried (a coffee is not a meal). */
export function meaningfulMealCount(day) {
  return (day?.slots ?? []).filter((s) => (Number(s?.kcal) || 0) >= MIN_MEAL_KCAL).length;
}

/**
 * The meal count this user actually eats, from complete days only.
 *
 * Returns null when the evidence is ambiguous - too few complete days, or no
 * single count that dominates. Ambiguity means silence: "If the evidence is
 * ambiguous: do nothing."
 *
 * @returns {null | { count, completeDays, agreeingDays, maturity }}
 */
export function observedMealCount(days = []) {
  const { complete } = splitByCompleteness(days);
  if (complete.length < MIN_COMPLETE_DAYS) return null;
  const tally = new Map();
  for (const d of complete) {
    const n = meaningfulMealCount(d);
    if (n <= 0) continue;
    tally.set(n, (tally.get(n) ?? 0) + 1);
  }
  if (!tally.size) return null;
  let best = null;
  for (const [count, n] of tally) {
    if (!best || n > best.n || (n === best.n && count < best.count)) best = { count, n };
  }
  // A clear majority, not a plurality. Three days at four meals and three at
  // three is not a habit; it is a person with a varied week.
  if (best.n * 2 <= complete.length) return null;
  return {
    count: best.count,
    completeDays: complete.length,
    agreeingDays: best.n,
    maturity: foodEvidenceMaturity({ uses: best.n }),
  };
}

/**
 * The observation to put to the user, or null.
 *
 * ONLY raised when the observed count DISAGREES with what they chose, the
 * evidence is established, and they have not already answered this question.
 * Everything else is silence.
 *
 * @param {object} params
 * @param {number} params.statedMealsPerDay  what the user chose
 * @param {Array}  params.days
 * @param {number|null} [params.dismissedForCount]  a count they already declined
 * @returns {null | { observedCount, statedCount, completeDays, question, detail }}
 */
export function mealCountObservation({
  statedMealsPerDay, days = [], dismissedForCount = null,
} = {}) {
  const stated = Number(statedMealsPerDay) || 0;
  if (!stated) return null;
  const observed = observedMealCount(days);
  if (!observed) return null;
  if (observed.count === stated) return null;
  if (observed.maturity !== FOOD_EVIDENCE_MATURITY.ESTABLISHED) return null;
  // Asked once. A declined question is an answer, not an invitation to keep
  // asking every time they open the screen.
  if (dismissedForCount === observed.count) return null;
  return {
    observedCount: observed.count,
    statedCount: stated,
    completeDays: observed.completeDays,
    ...mealCountCopy(observed.count),
  };
}

/**
 * What the user reads. The founder's own wording, kept as-is because it is
 * already the right register: an observation, then a question.
 */
export function mealCountCopy(count) {
  const word = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][count] || String(count);
  return {
    question: `You usually log ${word} main meals. Want future meal plans built that way?`,
    detail: 'Your current plans stay as they are until you say so.',
  };
}

/**
 * The foods and meals this user genuinely eats often, for the surfaces that
 * want to say "your usual".
 *
 * Built ONLY from confirmed intake. Every input here is a count of actual
 * logged eating; there is no channel through which an absence could become a
 * signal, which is the point.
 *
 * @param {Array} days
 * @returns {{ bySlot: Map<string, {ref, name, count}[]>, usual: Map<string, object> }}
 */
export function commonMealsBySlot(days = []) {
  const { complete } = splitByCompleteness(days);
  const bySlot = new Map();
  for (const d of complete) {
    for (const s of d?.slots ?? []) {
      if ((Number(s?.kcal) || 0) < MIN_MEAL_KCAL) continue;
      const ref = s?.foodRef ?? s?.mealId ?? null;
      if (!ref) continue;
      if (!bySlot.has(s.slot)) bySlot.set(s.slot, new Map());
      const m = bySlot.get(s.slot);
      const prev = m.get(ref) ?? { ref, name: s.name ?? ref, count: 0 };
      prev.count += 1;
      m.set(ref, prev);
    }
  }
  const out = new Map();
  const usual = new Map();
  for (const [slot, m] of bySlot) {
    const list = [...m.values()].sort((a, b) => b.count - a.count || String(a.ref).localeCompare(String(b.ref)));
    out.set(slot, list);
    // "Your usual X" is only claimable at established evidence. Below that the
    // honest answer is that we have not seen enough yet.
    const top = list[0];
    if (top && foodEvidenceMaturity({ uses: top.count }) === FOOD_EVIDENCE_MATURITY.ESTABLISHED) {
      usual.set(slot, top);
    }
  }
  return { bySlot: out, usual };
}

/**
 * The explicit non-evidence list, as a checkable export rather than a comment.
 *
 * Nothing in this module reads any of these. It is here so a future change
 * that starts consuming one of them fails a test rather than shipping.
 */
export const NEVER_EVIDENCE = Object.freeze([
  'missing_log',
  'planned_not_eaten',
  'deleted_entry',
  'single_swap',
  'one_unusual_day',
  'calorie_bank_day',
]);
