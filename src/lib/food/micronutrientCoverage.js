/**
 * micronutrientCoverage.js — Ultimate-Audit item 16 (MN-1) display maths, D22
 * ruling (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, "D22
 * — Items 15 and 16 rulings"). Pure functions, no I/O, no engine imports —
 * this is display-layer maths only (the deterministic coaching engine never
 * reads these, per D22 16a/16b and the item-16 scoping read's ED-safety
 * section).
 *
 * Two consumers:
 *  - Per-food detail (`src/components/food/MicronutrientDetail.js`):
 *    `scaleMicronutrients` scales a food's per-100g columns to an eaten
 *    quantity, the same per-100g -> portion arithmetic as `macros.js`'s
 *    `scaleMacros`/`scaleSugarG`/`scaleSodiumMg`, honouring "unknown never 0"
 *    (a food with no value for a nutrient stays null, never coerced to 0).
 *  - Food Insights weekly average (`src/screens/FoodInsightsScreen.js`):
 *    `computeWeeklyMicronutrientAverages` applies the COVERAGE FLOOR rule
 *    below before a nutrient is allowed to render at all.
 *
 * COVERAGE FLOOR RULE (documented per the build brief, D22 16a "display ships
 * only once measured coverage is real"): a nutrient is included in the weekly
 * average ONLY when at least half (>= 0.5) of the window's total logged
 * energy (kcal, summed across every confirmed entry in the window,
 * regardless of that nutrient's own coverage) comes from entries whose food
 * carries a KNOWN value for that specific nutrient. Below the floor, the
 * nutrient is omitted entirely — never shown as a misleadingly low average
 * built from a handful of foods that happen to carry the datum. This keeps
 * the average honest: a nutrient that passes the floor is backed by foods
 * that account for most of what was actually eaten, not a sparse, unusually-
 * documented minority of it.
 */
import { MICRONUTRIENTS } from './micronutrients';

// Fraction of the window's total logged energy that must come from entries
// with a known value for a nutrient before that nutrient is shown at all.
export const WEEKLY_COVERAGE_FLOOR = 0.5;

function round(amount) {
  // Mirrors the deleted diary panel's display precision (git history,
  // commit 03e3c1d^): several NRVs (B12, biotin, vitamin D...) are naturally
  // sub-10 in their own unit, where a whole-number round would lose the only
  // meaningful digit; larger amounts round to a whole number.
  return Math.abs(amount) < 10 ? Math.round(amount * 100) / 100 : Math.round(amount);
}

/**
 * Scale one food's per-100g micronutrient columns to an eaten quantity.
 * Unknown stays null (never 0) for any nutrient the food carries no value
 * for, or when grams is missing/non-finite/non-positive.
 *
 * @param {object} per100Food a food row carrying the 27 `*_100g` columns
 * @param {number} grams the eaten quantity in grams
 * @returns {Object<string, number|null>} keyed by nutrient `key`
 */
export function scaleMicronutrients(per100Food, grams) {
  const g = Number(grams);
  const out = {};
  const validGrams = Number.isFinite(g) && g > 0;
  for (const n of MICRONUTRIENTS) {
    if (!validGrams || !per100Food) { out[n.key] = null; continue; }
    const raw = per100Food[n.column];
    if (raw == null || !Number.isFinite(Number(raw))) { out[n.key] = null; continue; }
    out[n.key] = round((Number(raw) * g) / 100);
  }
  return out;
}

/**
 * Count how many of the 27 nutrients carry a known (non-null) value in a
 * `scaleMicronutrients` result.
 * @param {Object<string, number|null>} scaled
 * @returns {number}
 */
export function knownMicronutrientCount(scaled) {
  return MICRONUTRIENTS.reduce((n, m) => n + (scaled?.[m.key] != null ? 1 : 0), 0);
}

/**
 * Apply the coverage-floor rule (see module header) over a window of logged
 * items and return, per nutrient, whether it clears the floor plus its
 * average grams/micrograms PER LOGGED DAY when it does.
 *
 * @param {Array<{ kcal:number, grams:number, food:object }>} items every
 *   confirmed food entry in the window, each carrying the entry's own kcal
 *   (the stored, already-scaled figure — not recomputed here), the eaten
 *   quantity in grams, and the resolved food row (per-100g columns).
 * @param {number} loggedDays the number of days in the window that had at
 *   least one confirmed entry (the averaging divisor — matches
 *   `nutrientSummary.js`'s "average per LOGGED day" convention, so an
 *   unlogged day never drags the average toward a false low figure).
 * @returns {Object<string, { included:boolean, coverage:number,
 *   avgPerDay:number|null }>} keyed by nutrient `key`. `coverage` is the
 *   fraction (0-1) of the window's total logged kcal that came from foods
 *   with a known value for that nutrient, reported even when `included` is
 *   false (useful for tests/telemetry, never shown to the user directly).
 *   `avgPerDay` is null whenever `included` is false.
 */
export function computeWeeklyMicronutrientAverages(items, loggedDays) {
  const list = Array.isArray(items) ? items : [];
  const totalKcal = list.reduce((s, it) => s + (Number(it?.kcal) || 0), 0);
  const days = Number(loggedDays) > 0 ? Number(loggedDays) : 0;
  const out = {};
  for (const n of MICRONUTRIENTS) {
    let sum = 0;
    let knownKcal = 0;
    for (const it of list) {
      const per100 = it?.food?.[n.column];
      const grams = Number(it?.grams);
      if (per100 == null || !Number.isFinite(Number(per100)) || !Number.isFinite(grams)) continue;
      sum += (Number(per100) * grams) / 100;
      knownKcal += Number(it?.kcal) || 0;
    }
    const coverage = totalKcal > 0 ? knownKcal / totalKcal : 0;
    const included = coverage >= WEEKLY_COVERAGE_FLOOR && days > 0;
    out[n.key] = {
      included,
      coverage,
      avgPerDay: included ? round(sum / days) : null,
    };
  }
  return out;
}
