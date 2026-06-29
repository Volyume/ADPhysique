/**
 * format.js — shared number formatting, pinned to en-GB.
 *
 * Volyume is British-English throughout (CLAUDE.md). Big numbers (tonnage,
 * kcal, grams) were previously formatted three different ways — some with
 * `toLocaleString('en-GB')`, some with a bare `toLocaleString()` (device
 * locale), some with no separator at all — so a UK user on a non-UK device
 * locale saw inconsistent grouping and 4-digit values printed as `3400`
 * rather than `3,400` (D2 X2). This is the single display helper for any
 * user-facing number; use it at every numeric display site.
 */

const GB = 'en-GB';

/**
 * Format a number for display with en-GB thousands grouping.
 * Non-finite input returns the fallback (default '0') so a UI label never
 * prints "NaN"/"undefined".
 *
 * @param {number} n
 * @param {{ fallback?: string }} [opts]
 * @returns {string}
 */
export function formatNumber(n, opts = {}) {
  const fallback = opts.fallback ?? '0';
  if (n == null || !Number.isFinite(Number(n))) return fallback;
  return Number(n).toLocaleString(GB);
}

/**
 * Format with a fixed number of decimal places, en-GB grouping.
 * @param {number} n
 * @param {number} [dp=0]
 * @param {{ fallback?: string }} [opts]
 */
export function formatDecimal(n, dp = 0, opts = {}) {
  const fallback = opts.fallback ?? '0';
  if (n == null || !Number.isFinite(Number(n))) return fallback;
  return Number(n).toLocaleString(GB, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

// ─── Energy unit (kcal ⇄ kJ) ───────────────────────────────────────────────
// A UK/EU audience reads packaged-food energy in kilojoules (EU food-labelling
// law gives kJ first). The toggle is a DISPLAY-ONLY preference (store key
// accessibility.energyUnit: 'kcal' | 'kj', default 'kcal'): every stored value,
// every nutrition target, and the entire deterministic coaching engine keep
// working in kcal — these helpers only change how an energy number is *shown*.
// 1 kcal = 4.184 kJ (the thermochemical factor EU labelling uses).
export const KJ_PER_KCAL = 4.184;

// Convert a kcal value to the chosen display unit, rounded to a whole number.
// Non-finite input → 0 (a label never prints NaN). kcal rounds to whole too, so
// callers can pass a raw total without pre-rounding.
export function toEnergy(kcal, unit = 'kcal') {
  const k = Number(kcal);
  if (!Number.isFinite(k)) return 0;
  return unit === 'kj' ? Math.round(k * KJ_PER_KCAL) : Math.round(k);
}

// The unit's display label.
export function energyUnitLabel(unit = 'kcal') {
  return unit === 'kj' ? 'kJ' : 'kcal';
}

// Format a kcal value for display in the chosen unit with en-GB grouping.
// `opts.withUnit` appends the unit label ("7,029 kJ"); otherwise returns the
// grouped number only so a caller can render the unit in its own styled node.
export function formatEnergy(kcal, unit = 'kcal', opts = {}) {
  const num = formatNumber(toEnergy(kcal, unit), opts);
  return opts.withUnit ? `${num} ${energyUnitLabel(unit)}` : num;
}
