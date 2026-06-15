/**
 * food/adherence.js
 *
 * Single source for the diary "macro adherence" bands shown on Food Insights:
 * a logged day counts as a hit when each macro lands within its tolerance of
 * target. kcal & protein are held to 10%; carbs & fat get a wider 15% lever.
 *
 * Centralised here (food review U-M3) so the screen's pass/fail checks AND its
 * user-facing copy ("within 10% turns green") derive from the same numbers and
 * can never drift apart.
 */
export const ADHERENCE_TOLERANCE = Object.freeze({
  kcal: 0.10,
  protein: 0.10,
  carbs: 0.15,
  fat: 0.15,
});

/** "10%" / "15%" label for a 0–1 tolerance, for user-facing copy. */
export const pctLabel = (tolerance) => `${Math.round(tolerance * 100)}%`;

/** True when `value` is within `tolerance` (0–1 fraction) of `target`. */
export function within(value, target, tolerance) {
  if (target == null || target === 0) return false;
  return Math.abs(value - target) / target <= tolerance;
}
