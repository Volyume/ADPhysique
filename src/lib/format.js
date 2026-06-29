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
