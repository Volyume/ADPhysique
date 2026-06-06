/**
 * TZ-1: localDayKey must bucket by the user's LOCAL calendar day, so food /
 * water / steps agree with weight / workouts about "today". These tests pin
 * the day-boundary cases that motivated the fix.
 *
 * Jest runs in UTC by default (process.env.TZ unset -> UTC), so we assert the
 * UTC-equivalent behaviour and the relationship to getFullYear/Month/Date.
 */
import { localDayKey, todayLocalKey, localWeekStartMs } from '../dayKey';

describe('localDayKey', () => {
  test('formats as zero-padded YYYY-MM-DD', () => {
    // 2026-06-03T12:00:00Z -> local (UTC in CI) 2026-06-03
    expect(localDayKey(Date.UTC(2026, 5, 3, 12, 0, 0))).toBe('2026-06-03');
    // single-digit month + day are padded
    expect(localDayKey(Date.UTC(2026, 0, 9, 12, 0, 0))).toBe('2026-01-09');
  });

  test('uses local calendar fields, not a UTC string slice', () => {
    const ms = Date.UTC(2026, 5, 3, 12, 0, 0);
    const d = new Date(ms);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(localDayKey(ms)).toBe(expected);
  });

  test('a timestamp and the same wall-clock day map to one key', () => {
    const morning = new Date(2026, 5, 3, 7, 30, 0).getTime();   // local constructor
    const evening = new Date(2026, 5, 3, 22, 30, 0).getTime();
    expect(localDayKey(morning)).toBe('2026-06-03');
    expect(localDayKey(evening)).toBe('2026-06-03');
    expect(localDayKey(morning)).toBe(localDayKey(evening));
  });

  test('crossing local midnight rolls the key to the next day', () => {
    const beforeMidnight = new Date(2026, 5, 3, 23, 59, 0).getTime();
    const afterMidnight = new Date(2026, 5, 4, 0, 1, 0).getTime();
    expect(localDayKey(beforeMidnight)).toBe('2026-06-03');
    expect(localDayKey(afterMidnight)).toBe('2026-06-04');
  });

  test('todayLocalKey equals localDayKey(now)', () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 5, 3, 9, 0, 0));
    expect(todayLocalKey()).toBe(localDayKey(Date.now()));
    spy.mockRestore();
  });
});

describe('localWeekStartMs (local Monday week boundary)', () => {
  test('returns a Monday at local midnight', () => {
    const d = new Date(localWeekStartMs(Date.UTC(2026, 5, 3, 14, 30))); // a Wednesday
    expect(d.getDay()).toBe(1); // Monday
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  test('is the start of the week containing the input', () => {
    const input = Date.UTC(2026, 5, 3, 14, 30);
    const start = localWeekStartMs(input);
    expect(start).toBeLessThanOrEqual(input);
    expect(input - start).toBeLessThan(7 * 86400000);
  });

  test('every day within a week maps to the same Monday', () => {
    const start = localWeekStartMs(Date.UTC(2026, 5, 3, 12));
    for (let i = 0; i < 7; i++) {
      expect(localWeekStartMs(start + i * 86400000 + 3600000)).toBe(start);
    }
  });

  test('is idempotent and ignores time of day', () => {
    const start = localWeekStartMs(Date.UTC(2026, 5, 3, 12));
    expect(localWeekStartMs(start)).toBe(start);
    expect(localWeekStartMs(start + 23 * 3600000)).toBe(start);
  });

  test('a non-finite input falls back to now without throwing', () => {
    expect(() => localWeekStartMs(NaN)).not.toThrow();
    expect(Number.isFinite(localWeekStartMs(NaN))).toBe(true);
  });
});
