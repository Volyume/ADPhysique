/**
 * food/insights.js — Campaign 17B job 7.
 *
 * FOUNDER LAW: "Do not make Food Insights a dashboard of clever statistics.
 * Prioritise actionable, trustworthy observations." And: where possible an
 * insight should answer "So what?"
 *
 *   "Protein was close to target on 6 of your last 7 logged days."  useful
 *   "Protein consistency score: 86."                                not
 *
 * NO JUDGEMENT. No cheat day, no bad food, no dirty meal, no failed day, no
 * diet score, no punishment, no guilt, and nothing that encourages obsessive
 * logging. Every line here states what happened and stops.
 *
 * INSUFFICIENT DATA IS AN ANSWER. "If diary coverage is incomplete: say so. Do
 * not create false adherence or nutrient conclusions." A partly-logged fortnight
 * cannot support a claim about someone's protein intake, and pretending
 * otherwise is worse than silence - so every insight here carries its own
 * sufficiency and refuses rather than guesses.
 *
 * UNKNOWN IS NOT ZERO. A food source that lacks a micronutrient tells us
 * nothing about what the user ate; it must never read as "you consumed none".
 * This module never converts a missing value into a number.
 *
 * PURE. No I/O, no clock: the caller supplies the days.
 */
import { within, ADHERENCE_TOLERANCE } from './adherence';

/**
 * How much of a window must be logged before Volyume's nutrition decisions can
 * lean on it.
 *
 * A PRODUCT HEURISTIC, written down as one. It is the honesty line for this
 * whole screen: below it we say what we do not know, rather than averaging a
 * handful of days into a confident-looking number.
 */
export const RELIABLE_COVERAGE_FRACTION = 0.7;

/** The fewest logged days worth drawing any conclusion from at all. */
export const MIN_LOGGED_DAYS = 4;

/**
 * How completely the diary covers a window.
 *
 * @param {Array} days     the window's day keys
 * @param {Map}   rollups  dayKey -> { entries_count }
 * @returns {{ loggedDays, windowDays, fraction, reliable, enoughToSayAnything }}
 */
export function loggingCoverage(days = [], rollups = new Map()) {
  const windowDays = Array.isArray(days) ? days.length : 0;
  let loggedDays = 0;
  for (const d of days || []) {
    const r = rollups?.get?.(d);
    if (r && (Number(r.entries_count) || 0) > 0) loggedDays += 1;
  }
  const fraction = windowDays > 0 ? loggedDays / windowDays : 0;
  return {
    loggedDays,
    windowDays,
    fraction,
    reliable: windowDays > 0 && fraction >= RELIABLE_COVERAGE_FRACTION && loggedDays >= MIN_LOGGED_DAYS,
    enoughToSayAnything: loggedDays >= MIN_LOGGED_DAYS,
  };
}

/**
 * The headline: can Volyume rely on this diary?
 *
 * This is the founder's first listed category, and it is the one that makes
 * every other number on the screen honest. It is stated as a fact about the
 * DIARY, never as a judgement of the person: no streak, no target, no praise,
 * no nagging to log more.
 */
export function coverageInsight(coverage) {
  const c = coverage || {};
  const { loggedDays = 0, windowDays = 0 } = c;
  if (!windowDays) return null;
  if (!c.enoughToSayAnything) {
    return {
      headline: `You have logged ${loggedDays} of the last ${windowDays} days.`,
      body: 'That is not enough yet for the figures below to mean much. They will fill in as you log.',
      reliable: false,
    };
  }
  if (!c.reliable) {
    return {
      headline: `You have logged ${loggedDays} of the last ${windowDays} days.`,
      body: 'The figures below cover those days only, so treat them as a partial picture.',
      reliable: false,
    };
  }
  return {
    headline: `You have logged ${loggedDays} of the last ${windowDays} days.`,
    body: 'That is enough for your coaching decisions to be based on what you actually ate.',
    reliable: true,
  };
}

/**
 * "Protein was close to target on 6 of your last 7 logged days."
 *
 * Counted over LOGGED days only and said so, because "3 of 14" would read as a
 * failure when eleven of those days simply were not logged. Returns null below
 * the minimum: no data, no claim.
 */
export function proteinInsight({ rollups = [], targetProteinG = 0 } = {}) {
  const logged = (rollups || []).filter((r) => (Number(r?.entries_count) || 0) > 0);
  if (!targetProteinG || logged.length < MIN_LOGGED_DAYS) return null;
  const close = logged.filter((r) => within(Number(r.protein_g) || 0, targetProteinG, ADHERENCE_TOLERANCE.protein)).length;
  return {
    headline: `Protein was close to target on ${close} of your last ${logged.length} logged days.`,
    body: close === logged.length
      ? 'Nothing to change there.'
      : 'Protein is the one worth keeping steady; the rest can move around it.',
    close,
    loggedDays: logged.length,
  };
}

/**
 * Calorie steadiness, stated as a fact rather than a score.
 *
 * The "so what" is the second line: someone whose intake swings a lot is
 * reading a weight trend that is harder to interpret, which is a real reason
 * to care and not a moral one.
 */
export function calorieConsistencyInsight({ rollups = [], targetKcal = 0 } = {}) {
  const logged = (rollups || []).filter((r) => (Number(r?.entries_count) || 0) > 0);
  if (!targetKcal || logged.length < MIN_LOGGED_DAYS) return null;
  const close = logged.filter((r) => within(Number(r.kcal_total) || 0, targetKcal, ADHERENCE_TOLERANCE.kcal)).length;
  return {
    headline: `Calories were close to target on ${close} of your last ${logged.length} logged days.`,
    body: close >= Math.ceil(logged.length * 0.7)
      ? 'Steady enough for your weight trend to mean something.'
      : 'A steadier week makes your weight trend easier to read.',
    close,
    loggedDays: logged.length,
  };
}

/**
 * Assemble the insights worth showing, best-first, dropping every one that
 * cannot be supported.
 *
 * The coverage line always leads when it is not reliable, because everything
 * beneath it has to be read in that light.
 */
export function buildInsights({ coverage, rollups = [], targets = null } = {}) {
  const out = [];
  const cov = coverageInsight(coverage);
  if (cov) out.push({ key: 'coverage', ...cov });
  // A handful of logged days is enough to render the coverage fact, but not
  // to generalise about intake across the window. Nutrient conclusions use
  // the stronger reliability gate.
  if (!coverage?.reliable) return out;
  const protein = proteinInsight({ rollups, targetProteinG: targets?.proteinG });
  if (protein) out.push({ key: 'protein', ...protein });
  const kcal = calorieConsistencyInsight({ rollups, targetKcal: targets?.targetKcal });
  if (kcal) out.push({ key: 'calories', ...kcal });
  return out;
}

/**
 * Vocabulary this module may never produce. Exported so the ban is checkable
 * rather than a comment someone can drift past.
 */
export const BANNED_INSIGHT_WORDS = Object.freeze([
  'cheat', 'bad food', 'dirty', 'failed', 'score', 'streak', 'punish', 'guilt', 'clean eating',
]);
