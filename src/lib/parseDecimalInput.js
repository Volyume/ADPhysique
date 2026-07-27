/**
 * parseDecimalInput — the single place a typed number becomes a JS number.
 *
 * WHY THIS EXISTS (pre-release sweep 2026-07-27, finding B1).
 *
 * iOS renders the decimal-pad's separator key from the device's REGION setting,
 * not from the app's language. A phone regioned to any comma-decimal country --
 * most of the EU, which is exactly this app's user base -- shows a comma on
 * that keyboard. `parseFloat('82,5')` returns 82: it stops at the comma and
 * silently discards everything after it.
 *
 * That truncation was invisible. The range validators accepted the result,
 * because 82 is a perfectly plausible body weight, so nothing ever flagged it.
 * The wrong number then propagated: body weight feeds Mifflin-St Jeor /
 * Katch-McArdle in nutritionEngine.js, so a silently truncated weight moved the
 * user's BMR, TDEE, calorie target and macro split.
 *
 * NORMALISE, never reject. The user typed a number their own keyboard offered
 * them; refusing it would punish them for their device region. A comma decimal
 * is a correct way to write a number in most of Europe.
 *
 * This changes NO ED-safety floor, gate or threshold. It only ensures the
 * engine receives the number the user actually typed.
 */

/**
 * Parse a user-typed numeric string, tolerating a comma decimal separator.
 *
 * @param {string|number|null|undefined} value
 * @returns {number} the parsed number, or NaN when there is nothing to parse.
 */
export function parseDecimalInput(value) {
  if (typeof value === 'number') return value;
  if (value == null) return NaN;
  const raw = String(value).trim();
  if (!raw) return NaN;

  // Strip spaces used as digit grouping ("1 234,5"), which some locales and
  // some keyboards produce.
  let s = raw.replace(/\s/g, '');

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: the RIGHTMOST is the decimal separator and the other is
    // digit grouping ("1.234,5" in DE, "1,234.5" in UK). Drop the grouping one.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Comma only. It is grouping ONLY when it looks like a thousands separator
    // -- exactly three digits follow it and it is not the sole separator of a
    // short value. "82,5" is 82.5; "1,234" is 1234.
    const after = s.length - lastComma - 1;
    const multiple = (s.match(/,/g) || []).length > 1;
    if (multiple || after === 3) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
  }

  return parseFloat(s);
}

/**
 * Integer form of the same rule, for whole-number fields (reps, sets, stone).
 *
 * @param {string|number|null|undefined} value
 * @returns {number} the parsed integer, or NaN.
 */
export function parseIntegerInput(value) {
  const n = parseDecimalInput(value);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

export default parseDecimalInput;
