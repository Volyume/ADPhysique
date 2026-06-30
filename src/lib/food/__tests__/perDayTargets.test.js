/**
 * perDayTargets — per-day-of-week planning offsets (gap #13). Pure weekday maths
 * and offset sanitisation; the floor clamp itself is tested in effectiveTargets.
 */
import {
  weekdayKeyFromIso, sanitiseOffset, normaliseOffsets, offsetForDate, hasAnyOffset,
  WEEKDAY_KEYS, DEFAULT_PERDAY_OFFSETS, MAX_PERDAY_OFFSET_KCAL,
} from '../perDayTargets';

describe('weekdayKeyFromIso', () => {
  test('maps known dates to the Monday-first weekday key', () => {
    // 2026-06-29 is a Monday; 2026-06-28 a Sunday; 2026-07-04 a Saturday.
    expect(weekdayKeyFromIso('2026-06-29')).toBe('mon');
    expect(weekdayKeyFromIso('2026-06-28')).toBe('sun');
    expect(weekdayKeyFromIso('2026-07-04')).toBe('sat');
    expect(weekdayKeyFromIso('2026-07-01')).toBe('wed');
  });

  test('returns null on a malformed input', () => {
    expect(weekdayKeyFromIso('')).toBeNull();
    expect(weekdayKeyFromIso('2026-6-1')).toBeNull();
    expect(weekdayKeyFromIso('not-a-date')).toBeNull();
    expect(weekdayKeyFromIso(null)).toBeNull();
    expect(weekdayKeyFromIso(20260629)).toBeNull();
  });
});

describe('sanitiseOffset', () => {
  test('rounds and bounds to the max offset', () => {
    expect(sanitiseOffset(123.4)).toBe(123);
    expect(sanitiseOffset(MAX_PERDAY_OFFSET_KCAL + 500)).toBe(MAX_PERDAY_OFFSET_KCAL);
    expect(sanitiseOffset(-MAX_PERDAY_OFFSET_KCAL - 500)).toBe(-MAX_PERDAY_OFFSET_KCAL);
  });

  test('non-finite or junk reads as 0', () => {
    expect(sanitiseOffset(NaN)).toBe(0);
    expect(sanitiseOffset('x')).toBe(0);
    expect(sanitiseOffset(undefined)).toBe(0);
    expect(sanitiseOffset(Infinity)).toBe(0); // non-finite reads as 0 before the bound
  });
});

describe('normaliseOffsets', () => {
  test('fills every weekday and bounds each value', () => {
    const out = normaliseOffsets({ mon: 200, sat: 99999, junk: 5 });
    expect(Object.keys(out).sort()).toEqual([...WEEKDAY_KEYS].sort());
    expect(out.mon).toBe(200);
    expect(out.sat).toBe(MAX_PERDAY_OFFSET_KCAL);
    expect(out.tue).toBe(0);
    expect(out).not.toHaveProperty('junk');
  });

  test('a missing / non-object input yields all-zero', () => {
    expect(normaliseOffsets(null)).toEqual(DEFAULT_PERDAY_OFFSETS);
    expect(normaliseOffsets(undefined)).toEqual(DEFAULT_PERDAY_OFFSETS);
  });
});

describe('offsetForDate', () => {
  test('returns the weekday offset for the date', () => {
    const offsets = normaliseOffsets({ sat: 300, sun: 300 });
    expect(offsetForDate(offsets, '2026-07-04')).toBe(300); // Saturday
    expect(offsetForDate(offsets, '2026-06-29')).toBe(0);   // Monday
  });

  test('a malformed date yields 0', () => {
    expect(offsetForDate(normaliseOffsets({ mon: 300 }), 'bad')).toBe(0);
  });
});

describe('hasAnyOffset', () => {
  test('true only when some weekday is non-zero', () => {
    expect(hasAnyOffset(DEFAULT_PERDAY_OFFSETS)).toBe(false);
    expect(hasAnyOffset(normaliseOffsets({ wed: -100 }))).toBe(true);
    expect(hasAnyOffset(null)).toBe(false);
  });
});
