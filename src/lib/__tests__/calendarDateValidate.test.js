/**
 * calendarDateValidate — pins A7 (pre-release sweep 2026-07-27, LANE A).
 *
 * A native `new Date('2026-02-30')` silently rolls forward to 2 March 2026
 * instead of erroring, so getTime() is finite and the old NaN-fallback check
 * in bodyMetricValidate.js never caught a mistyped date. This validator
 * checks calendar arithmetic explicitly: exact 'YYYY-MM-DD' shape, month
 * 1-12, day valid for that month AND year (leap years included).
 */
import {
  isValidCalendarDateString,
  parseCalendarDateString,
  INVALID_CALENDAR_DATE_MESSAGE,
} from '../calendarDateValidate';

describe('isValidCalendarDateString', () => {
  test('accepts genuine calendar dates', () => {
    ['2026-01-01', '2026-07-27', '2026-12-31', '2000-02-29', '2024-02-29'].forEach((s) =>
      expect(isValidCalendarDateString(s)).toBe(true));
  });

  test('rejects an out-of-range month', () => {
    expect(isValidCalendarDateString('2026-13-45')).toBe(false);
    expect(isValidCalendarDateString('2026-00-10')).toBe(false);
  });

  test('rejects a day impossible for its month', () => {
    expect(isValidCalendarDateString('2026-02-30')).toBe(false); // Feb never has 30
    expect(isValidCalendarDateString('2026-04-31')).toBe(false); // April has 30
    expect(isValidCalendarDateString('2026-00-00')).toBe(false);
  });

  test('29 Feb is accepted ONLY in a leap year', () => {
    expect(isValidCalendarDateString('2026-02-29')).toBe(false); // 2026 is not a leap year
    expect(isValidCalendarDateString('2025-02-29')).toBe(false); // not a leap year
    expect(isValidCalendarDateString('2100-02-29')).toBe(false); // divisible by 100, not 400
    expect(isValidCalendarDateString('2024-02-29')).toBe(true);  // divisible by 4
    expect(isValidCalendarDateString('2000-02-29')).toBe(true);  // divisible by 400
  });

  test('rejects malformed shapes', () => {
    ['', '2026-7-27', '27-07-2026', '2026/07/27', 'not-a-date', null, undefined].forEach((s) =>
      expect(isValidCalendarDateString(s)).toBe(false));
  });
});

describe('parseCalendarDateString', () => {
  test('returns local-midnight epoch ms for a valid date', () => {
    const ms = parseCalendarDateString('2026-07-27');
    const d = new Date(ms);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // 0-indexed
    expect(d.getDate()).toBe(27);
    expect(d.getHours()).toBe(0);
  });

  test('returns null for an invalid calendar date, never a rolled-over guess', () => {
    expect(parseCalendarDateString('2026-13-45')).toBeNull();
    expect(parseCalendarDateString('2026-02-30')).toBeNull();
    expect(parseCalendarDateString('2026-02-29')).toBeNull();
  });

  test('a leap-year 29 Feb parses to the actual date, not a native Date rollover', () => {
    const ms = parseCalendarDateString('2024-02-29');
    const d = new Date(ms);
    expect(d.getMonth()).toBe(1); // February, not rolled into March
    expect(d.getDate()).toBe(29);
  });
});

test('the shared rejection message carries no em dash (lint rule + calm-voice guard)', () => {
  expect(INVALID_CALENDAR_DATE_MESSAGE).not.toMatch(/—/);
});
