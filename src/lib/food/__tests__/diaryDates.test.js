/**
 * diaryDates — pure local-calendar helpers for the food diary. Tests lock the
 * day-key maths (TZ-1): local-day shifting, the Mon..Sun banking week, weekday
 * labels, and the Today/Yesterday/Tomorrow friendly labels.
 */
import {
  isoDate,
  shiftDate,
  weekDatesMon,
  weekdayShort,
  friendlyDate,
} from '../diaryDates';

describe('isoDate', () => {
  test('keys a Date to its local YYYY-MM-DD', () => {
    // Local noon avoids any UTC-offset day flip in the test environment.
    expect(isoDate(new Date(2026, 5, 17, 12, 0, 0))).toBe('2026-06-17');
  });
});

describe('shiftDate', () => {
  test('moves forwards and backwards by whole days', () => {
    expect(shiftDate('2026-06-17', 1)).toBe('2026-06-18');
    expect(shiftDate('2026-06-17', -1)).toBe('2026-06-16');
    expect(shiftDate('2026-06-17', 0)).toBe('2026-06-17');
  });

  test('crosses month and year boundaries', () => {
    expect(shiftDate('2026-06-30', 1)).toBe('2026-07-01');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
  });

  test('handles a multi-day jump across a month end', () => {
    expect(shiftDate('2026-02-26', 5)).toBe('2026-03-03');
  });
});

describe('weekDatesMon', () => {
  test('returns Mon..Sun for a midweek date', () => {
    // 2026-06-17 is a Wednesday.
    expect(weekDatesMon('2026-06-17')).toEqual([
      '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18',
      '2026-06-19', '2026-06-20', '2026-06-21',
    ]);
  });

  test('a Sunday belongs to the week that started the previous Monday', () => {
    // 2026-06-21 is a Sunday — it is the last day of the 15th's week.
    const week = weekDatesMon('2026-06-21');
    expect(week[0]).toBe('2026-06-15');
    expect(week[6]).toBe('2026-06-21');
  });

  test('a Monday is the first day of its own week', () => {
    const week = weekDatesMon('2026-06-15');
    expect(week[0]).toBe('2026-06-15');
    expect(week).toHaveLength(7);
  });
});

describe('weekdayShort', () => {
  test('labels the day of the week', () => {
    expect(weekdayShort('2026-06-15')).toBe('Mon');
    expect(weekdayShort('2026-06-17')).toBe('Wed');
    expect(weekdayShort('2026-06-21')).toBe('Sun');
  });
});

describe('friendlyDate', () => {
  const today = '2026-06-17';

  test('relative labels around the injected today', () => {
    expect(friendlyDate('2026-06-17', today)).toBe('Today');
    expect(friendlyDate('2026-06-16', today)).toBe('Yesterday');
    expect(friendlyDate('2026-06-18', today)).toBe('Tomorrow');
  });

  test('a more distant date renders as a short British date', () => {
    // Exact punctuation comes from the runtime Intl formatter; assert the parts.
    const label = friendlyDate('2026-06-10', today);
    expect(label).toContain('Wed');
    expect(label).toContain('10 Jun');
  });
});
