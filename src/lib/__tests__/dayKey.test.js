/**
 * TZ-1: localDayKey must bucket by the user's LOCAL calendar day, so food /
 * water / steps agree with weight / workouts about "today". These tests pin
 * the day-boundary cases that motivated the fix.
 *
 * Jest runs in UTC by default (process.env.TZ unset -> UTC), so we assert the
 * UTC-equivalent behaviour and the relationship to getFullYear/Month/Date.
 */
import { localDayKey, todayLocalKey } from '../dayKey';

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
