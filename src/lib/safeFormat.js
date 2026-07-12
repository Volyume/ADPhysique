/**
 * Presentation-boundary guards for values that may be malformed after a
 * restore, import, or a sync from a legacy schema (EP-23 / UI-11 end-user-
 * polish audit, 2026-07-12).
 *
 * Several render paths across the app pass a raw DB value straight into
 * `date-fns/format(new Date(value), ...)` or call `.toISOString()` on it.
 * Both throw `RangeError: Invalid time value` for anything that isn't a
 * parseable date, which crashes the whole screen. Other render paths build
 * numeric displays with `parseFloat(value).toFixed(n)`, which never throws
 * but silently prints the string "NaN" (e.g. "NaNkg") for the same kind of
 * malformed input.
 *
 * These helpers centralise both guards so a render path fails to a calm
 * fallback or an omitted stat instead of a crash or "NaNkg". Pure functions
 * only: no I/O, no store/database access, no randomness -- safe to import
 * from any screen or component, and irrelevant to the deterministic
 * coaching/nutrition engine (this module is never imported by it).
 */
import { format } from 'date-fns/format';

/**
 * Coerce `value` (epoch ms number, ISO/parseable date string, or a Date
 * instance) into a valid `Date`, or `null` if it can't be. Never throws.
 */
export function safeDate(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format `value` with date-fns `format` using `fmt`, or return `fallback`
 * when the date is missing/invalid. Never throws. Matches the app's
 * existing `format(new Date(value), fmt)` call sites so valid input renders
 * byte-identically to before.
 */
export function safeFormatDate(value, fmt, fallback = 'Date unavailable') {
  const d = safeDate(value);
  return d ? format(d, fmt) : fallback;
}

/**
 * Coerce `value` to a finite number the same way the existing
 * `parseFloat(value).toFixed(n)` call sites do (accepts a number, or a
 * numeric string via parseFloat), or `null` if the result isn't finite.
 */
export function safeNumber(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * `safeNumber(value)`, or `fallback` when the value isn't finite.
 */
export function finiteOr(value, fallback) {
  const n = safeNumber(value);
  return n === null ? fallback : n;
}

/**
 * Mirrors a `parseFloat(value).toFixed(digits)` call site without ever
 * rendering the string "NaN": returns the fixed-point string for a finite
 * value, or `fallback` otherwise (a clean placeholder, not a thrown error).
 */
export function safeToFixed(value, digits = 1, fallback = '-') {
  const n = safeNumber(value);
  return n === null ? fallback : n.toFixed(digits);
}
