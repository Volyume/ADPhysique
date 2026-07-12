/**
 * safeFormat.js -- presentation-boundary guards for malformed restored/
 * legacy values (EP-23 / UI-11 end-user-polish audit, 2026-07-12).
 *
 * Several screens passed a raw DB value straight into
 * `date-fns/format(new Date(value), ...)` or `.toISOString()`, which throws
 * `RangeError: Invalid time value` for an unparseable date, and built
 * numeric displays with `parseFloat(value).toFixed(n)`, which renders the
 * string "NaN" for the same kind of bad input. These tests pin that every
 * helper here fails to a calm fallback instead, for every input shape the
 * real call sites hand it (epoch ms, ISO string, Date instance, and the
 * assorted garbage a corrupted restore/import/sync could produce), and that
 * VALID input formats exactly like the pre-existing call sites did.
 */
import { safeDate, safeFormatDate, safeNumber, finiteOr, safeToFixed } from '../safeFormat';
import { format } from 'date-fns/format';

describe('safeDate', () => {
  test('accepts an epoch-ms number', () => {
    const ms = Date.UTC(2026, 6, 12, 9, 30, 0);
    const d = safeDate(ms);
    expect(d).toBeInstanceOf(Date);
    expect(d.getTime()).toBe(ms);
  });

  test('accepts an ISO date string', () => {
    const d = safeDate('2026-07-12T09:30:00.000Z');
    expect(d).toBeInstanceOf(Date);
    expect(d.getTime()).toBe(Date.UTC(2026, 6, 12, 9, 30, 0));
  });

  test('accepts a Date instance and returns a valid Date unchanged', () => {
    const input = new Date(2026, 6, 12);
    const d = safeDate(input);
    expect(d).toBeInstanceOf(Date);
    expect(d.getTime()).toBe(input.getTime());
  });

  test('returns null for a malformed date string', () => {
    expect(safeDate('not-a-date')).toBeNull();
    expect(safeDate('2026-13-45')).toBeNull();
  });

  test('returns null for an already-invalid Date instance', () => {
    expect(safeDate(new Date(NaN))).toBeNull();
  });

  test('returns null for null/undefined/empty string', () => {
    expect(safeDate(null)).toBeNull();
    expect(safeDate(undefined)).toBeNull();
    expect(safeDate('')).toBeNull();
  });

  test('returns null for NaN and non-date objects', () => {
    expect(safeDate(NaN)).toBeNull();
    expect(safeDate({})).toBeNull();
    expect(safeDate([])).toBeNull();
  });

  test('epoch 0 is a valid date, not treated as missing', () => {
    const d = safeDate(0);
    expect(d).toBeInstanceOf(Date);
    expect(d.getTime()).toBe(0);
  });
});

describe('safeFormatDate', () => {
  test('formats a valid epoch ms exactly like the existing format(new Date(value), fmt) call sites', () => {
    const ms = Date.UTC(2026, 6, 12, 12, 0, 0);
    expect(safeFormatDate(ms, 'MMM d yyyy')).toBe(format(new Date(ms), 'MMM d yyyy'));
  });

  test('formats a valid ISO string identically to the existing call sites', () => {
    const iso = '2026-07-12T00:00:00.000Z';
    expect(safeFormatDate(iso, 'MMM yyyy')).toBe(format(new Date(iso), 'MMM yyyy'));
  });

  test('returns the default fallback for a malformed value, never throws', () => {
    expect(() => safeFormatDate('not-a-date', 'MMM d yyyy')).not.toThrow();
    expect(safeFormatDate('not-a-date', 'MMM d yyyy')).toBe('Date unavailable');
  });

  test('returns a caller-supplied fallback (including empty string, for omit-the-row call sites)', () => {
    expect(safeFormatDate('garbage', 'MMM yyyy', '')).toBe('');
    expect(safeFormatDate(undefined, 'MMM yyyy', 'unknown')).toBe('unknown');
  });

  test('never throws for the exact shapes that used to crash format(new Date(value), fmt)', () => {
    const badInputs = [null, undefined, '', 'garbage', NaN, {}, [], new Date(NaN)];
    for (const bad of badInputs) {
      expect(() => safeFormatDate(bad, 'MMM d yyyy')).not.toThrow();
    }
  });
});

describe('safeNumber / finiteOr', () => {
  test('passes through a finite number', () => {
    expect(safeNumber(82.5)).toBe(82.5);
    expect(finiteOr(82.5, '-')).toBe(82.5);
  });

  test('parses a numeric string, matching parseFloat(value) call sites', () => {
    expect(safeNumber('82.5')).toBe(82.5);
    expect(finiteOr('82.5', '-')).toBe(82.5);
  });

  test('returns null / the fallback for NaN, Infinity, and unparseable strings', () => {
    expect(safeNumber(NaN)).toBeNull();
    expect(safeNumber(Infinity)).toBeNull();
    expect(safeNumber(-Infinity)).toBeNull();
    expect(safeNumber('not-a-number')).toBeNull();
    expect(safeNumber(null)).toBeNull();
    expect(safeNumber(undefined)).toBeNull();
    expect(finiteOr('not-a-number', '-')).toBe('-');
    expect(finiteOr(undefined, '-')).toBe('-');
  });
});

describe('safeToFixed', () => {
  test('matches parseFloat(value).toFixed(digits) for valid numbers and numeric strings', () => {
    expect(safeToFixed(82.53, 1)).toBe(parseFloat(82.53).toFixed(1));
    expect(safeToFixed('82.53', 1)).toBe(parseFloat('82.53').toFixed(1));
    expect(safeToFixed(100, 0)).toBe(parseFloat(100).toFixed(0));
  });

  test('never renders the string "NaN": returns the fallback instead', () => {
    expect(safeToFixed('corrupt', 1)).toBe('-');
    expect(safeToFixed(NaN, 1)).toBe('-');
    expect(safeToFixed(undefined, 1)).toBe('-');
    expect(safeToFixed(null, 1)).toBe('-');
    // the exact old behaviour this replaces, for documentation:
    expect(parseFloat('corrupt').toFixed(1)).toBe('NaN');
  });

  test('accepts a caller-supplied fallback', () => {
    expect(safeToFixed('corrupt', 1, null)).toBeNull();
  });
});
