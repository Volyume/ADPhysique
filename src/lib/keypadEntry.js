/**
 * keypadEntry
 *
 * The field rules behind the logger's typed wells and the keyboard step bar
 * (12-BUILD-SPEC section 1.5, register D220; the invented keypad retired under
 * addendum 18, the phone's keyboard being the input): the limits the typed
 * fields enforce, and the step clamp the bar's keys use, so a stepped number
 * can never be one the typed path refused.
 *
 *   weight    up to 3 whole digits and 2 decimals, never above 500
 *   distance  up to 5 whole digits and 2 decimals
 *   reps      whole digits only, up to 3, never above 200
 *
 * Pure: no I/O, no React.
 */

export const WEIGHT_RULES = Object.freeze({ maxWhole: 3, maxDecimals: 2, max: 500 });
export const DISTANCE_RULES = Object.freeze({ maxWhole: 5, maxDecimals: 2, max: null });
export const REPS_RULES = Object.freeze({ maxWhole: 3, maxDecimals: 0, max: 200 });

/** Step a number and clamp it to [min, rules.max] at 2 decimal places. */
export function stepValue(value, delta, rules = WEIGHT_RULES, min = 0) {
  const n = value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : 0;
  const stepped = Math.round((n + delta) * 100) / 100;
  const ceiling = rules.max != null ? rules.max : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(stepped, min), ceiling);
}
