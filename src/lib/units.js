/**
 * Body weight unit helpers.
 *
 * Gym weights (barbells, dumbbells) always use the `units` store value (kg|lbs).
 * Body weight uses the separate `bodyWeightUnits` value (st|kg|lbs).
 *
 * All internal storage is kg. These functions convert for display/input only.
 */

// ─── Conversions ──────────────────────────────────────────────────────────────

export function stoneLbsToKg(stone, lbs = 0) {
  const totalLbs = (parseInt(stone, 10) || 0) * 14 + (parseFloat(lbs) || 0);
  return totalLbs * 0.453592;
}

export function kgToStoneLbs(kg) {
  const totalLbs = kg / 0.453592;
  let stone = Math.floor(totalLbs / 14);
  let lbs   = Math.round((totalLbs % 14) * 2) / 2; // round to nearest 0.5 lb
  // Carry when rounding pushes the remainder up to a full stone (audit
  // 2026-07-01): e.g. 13.8 lb rounds to 14.0, which must read as the next
  // stone + 0 lb, not "N st 14 lb". Without this the st/lb display and the
  // st/lb round-trip on edit both corrupt near every stone boundary.
  if (lbs >= 14) { stone += 1; lbs = 0; }
  return { stone, lbs };
}

export function kgToLbs(kg) {
  return kg / 0.453592;
}

export function lbsToKg(lbs) {
  return lbs * 0.453592;
}

// ─── Parsing input → kg ───────────────────────────────────────────────────────

/**
 * Parses a body weight value (or stone+lbs pair) and returns kg.
 *
 * @param {string}  value           - main input string
 * @param {string}  bodyWeightUnits - 'st' | 'kg' | 'lbs'
 * @param {string}  [stoneLbsExtra] - lbs remainder when unit is 'st'
 * @returns {number} weight in kg, or NaN if unparseable
 */
export function parseBodyWeightToKg(value, bodyWeightUnits, stoneLbsExtra = '0') {
  if (bodyWeightUnits === 'st') {
    return stoneLbsToKg(value, stoneLbsExtra);
  }
  if (bodyWeightUnits === 'lbs') {
    return lbsToKg(parseFloat(value));
  }
  return parseFloat(value); // kg
}

// ─── Formatting kg → display string ──────────────────────────────────────────

/**
 * Formats a kg value for display in the given body weight unit.
 *
 * @param {number}  kg
 * @param {string}  bodyWeightUnits - 'st' | 'kg' | 'lbs'
 * @returns {string}
 */
export function formatBodyWeight(kg, bodyWeightUnits = 'st') {
  if (kg == null || isNaN(kg)) return '';
  if (bodyWeightUnits === 'st') {
    const { stone, lbs } = kgToStoneLbs(kg);
    return lbs > 0 ? `${stone} st ${lbs} ${lbs === 1 ? 'lb' : 'lbs'}` : `${stone} st`;
  }
  if (bodyWeightUnits === 'lbs') {
    return `${Math.round(kgToLbs(kg))} lbs`;
  }
  return `${parseFloat(kg.toFixed(1))} kg`;
}

/**
 * Short display for tight UI (chip/badge contexts).
 */
export function formatBodyWeightShort(kg, bodyWeightUnits = 'st') {
  if (kg == null || isNaN(kg)) return '';
  if (bodyWeightUnits === 'st') {
    const { stone, lbs } = kgToStoneLbs(kg);
    return `${stone}st ${lbs > 0 ? `${lbs}lb` : ''}`.trim();
  }
  if (bodyWeightUnits === 'lbs') {
    return `${Math.round(kgToLbs(kg))} lbs`;
  }
  return `${parseFloat(kg.toFixed(1))} kg`;
}

/**
 * Returns the unit label suffix for body weight (e.g. for input placeholders).
 */
export function bodyWeightUnitLabel(bodyWeightUnits = 'st') {
  if (bodyWeightUnits === 'st')  return 'st / lbs';
  if (bodyWeightUnits === 'lbs') return 'lbs';
  return 'kg';
}

/**
 * Decomposes a known-kg value back into stone+lbs strings for pre-filling
 * two-field inputs.
 *
 * @returns {{ stoneStr: string, lbsStr: string }}
 */
export function kgToStoneLbsStrings(kg) {
  if (!kg || isNaN(kg)) return { stoneStr: '', lbsStr: '' };
  const { stone, lbs } = kgToStoneLbs(kg);
  return { stoneStr: String(stone), lbsStr: lbs > 0 ? String(lbs) : '0' };
}

// ─── Height helpers ───────────────────────────────────────────────────────────

/**
 * Returns true when the given bodyWeightUnits implies imperial height (ft/in).
 * UK users who use st or lbs for body weight also use ft/in for height.
 */
export function usesImperialHeight(bodyWeightUnits) {
  return bodyWeightUnits === 'st' || bodyWeightUnits === 'lbs';
}

export function ftInToCm(ft, inches) {
  return Math.round(((parseInt(ft, 10) || 0) * 12 + (parseInt(inches, 10) || 0)) * 2.54);
}
