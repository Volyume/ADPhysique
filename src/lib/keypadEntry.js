/**
 * keypadEntry
 *
 * The text rules behind the logger's docked keypad (12-BUILD-SPEC sections
 * 1.5 and 3, register D220): one key at a time applied to the field's text,
 * with the limits the SetEntry text fields already enforced, so a number
 * typed on the pad can never be one the typed path refused.
 *
 *   weight    up to 3 whole digits and 2 decimals, never above 500
 *   distance  up to 5 whole digits and 2 decimals
 *   reps      whole digits only, up to 3, never above 200
 *
 * Pure: no I/O, no React. A key the rules refuse leaves the text as it was.
 */

export const KEY_BACKSPACE = 'backspace';
export const KEY_POINT = '.';

export const WEIGHT_RULES = Object.freeze({ maxWhole: 3, maxDecimals: 2, max: 500 });
export const DISTANCE_RULES = Object.freeze({ maxWhole: 5, maxDecimals: 2, max: null });
export const REPS_RULES = Object.freeze({ maxWhole: 3, maxDecimals: 0, max: 200 });

function fits(text, rules) {
  const [whole, decimals] = text.split('.');
  if (whole.length > rules.maxWhole) return false;
  if (decimals != null && decimals.length > rules.maxDecimals) return false;
  if (rules.max != null && text !== '' && Number(text) > rules.max) return false;
  return true;
}

/**
 * Apply one key to a field's text.
 * @param {string} text   the field's current text ('' for empty)
 * @param {string} key    '0' to '9', KEY_POINT or KEY_BACKSPACE
 * @param {{maxWhole:number, maxDecimals:number, max:number|null}} rules
 * @returns {string} the new text, or `text` unchanged when the key is refused
 */
export function applyKey(text, key, rules = WEIGHT_RULES) {
  const current = text == null ? '' : String(text);
  if (key === KEY_BACKSPACE) return current.slice(0, -1);
  if (key === KEY_POINT) {
    if (rules.maxDecimals === 0 || current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }
  if (!/^[0-9]$/.test(key)) return current;
  const next = current === '0' ? key : `${current}${key}`;
  return fits(next, rules) ? next : current;
}

/** Step a number and clamp it to [min, rules.max] at 2 decimal places. */
export function stepValue(value, delta, rules = WEIGHT_RULES, min = 0) {
  const n = value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : 0;
  const stepped = Math.round((n + delta) * 100) / 100;
  const ceiling = rules.max != null ? rules.max : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(stepped, min), ceiling);
}
