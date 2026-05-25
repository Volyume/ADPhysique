import {
  DEFAULT_QUIET_HOURS,
  isInsideQuietHours,
  shiftHourMinuteOutOfQuietHours,
  shiftDateOutOfQuietHours,
} from '../notifications/quietHours';

describe('isInsideQuietHours', () => {
  test('returns false when the rule is disabled', () => {
    const off = { ...DEFAULT_QUIET_HOURS, enabled: false };
    expect(isInsideQuietHours(23, 30, off)).toBe(false);
    expect(isInsideQuietHours(3, 0, off)).toBe(false);
  });

  test('handles a wrap window: 22:00 -> 07:00', () => {
    const w = DEFAULT_QUIET_HOURS;
    expect(isInsideQuietHours(22, 0, w)).toBe(true);
    expect(isInsideQuietHours(23, 30, w)).toBe(true);
    expect(isInsideQuietHours(0, 0, w)).toBe(true);
    expect(isInsideQuietHours(6, 59, w)).toBe(true);
    expect(isInsideQuietHours(7, 0, w)).toBe(false); // end is exclusive
    expect(isInsideQuietHours(8, 0, w)).toBe(false);
    expect(isInsideQuietHours(21, 59, w)).toBe(false);
    expect(isInsideQuietHours(12, 0, w)).toBe(false);
  });

  test('handles a same-day window: 12:00 -> 14:00', () => {
    const w = { enabled: true, startHour: 12, startMinute: 0, endHour: 14, endMinute: 0 };
    expect(isInsideQuietHours(11, 59, w)).toBe(false);
    expect(isInsideQuietHours(12, 0, w)).toBe(true);
    expect(isInsideQuietHours(13, 30, w)).toBe(true);
    expect(isInsideQuietHours(14, 0, w)).toBe(false);
  });

  test('start equal to end is treated as never inside', () => {
    const w = { enabled: true, startHour: 9, startMinute: 0, endHour: 9, endMinute: 0 };
    expect(isInsideQuietHours(9, 0, w)).toBe(false);
    expect(isInsideQuietHours(15, 0, w)).toBe(false);
  });
});

describe('shiftHourMinuteOutOfQuietHours', () => {
  test('passes through times outside the window', () => {
    const out = shiftHourMinuteOutOfQuietHours(19, 0, DEFAULT_QUIET_HOURS);
    expect(out).toEqual({ hour: 19, minute: 0, shifted: false });
  });

  test('shifts a time inside the wrap window to the window end', () => {
    // 23:00 is inside 22:00 -> 07:00, so should shift to 07:00.
    const out = shiftHourMinuteOutOfQuietHours(23, 0, DEFAULT_QUIET_HOURS);
    expect(out).toEqual({ hour: 7, minute: 0, shifted: true });
  });

  test('shifts a pre-dawn time inside the wrap window to the window end', () => {
    const out = shiftHourMinuteOutOfQuietHours(3, 30, DEFAULT_QUIET_HOURS);
    expect(out).toEqual({ hour: 7, minute: 0, shifted: true });
  });

  test('passes through when the rule is disabled', () => {
    const off = { ...DEFAULT_QUIET_HOURS, enabled: false };
    const out = shiftHourMinuteOutOfQuietHours(23, 0, off);
    expect(out).toEqual({ hour: 23, minute: 0, shifted: false });
  });
});

describe('shiftDateOutOfQuietHours', () => {
  test('passes through a date outside the window', () => {
    const date = new Date('2026-05-25T19:00:00');
    const out = shiftDateOutOfQuietHours(date, DEFAULT_QUIET_HOURS);
    expect(out.shifted).toBe(false);
    expect(out.date.getHours()).toBe(19);
  });

  test('shifts a 23:00 date forward to 07:00 the next morning', () => {
    // Acceptance check from NOTIFICATIONS_LOCKED.md:
    // "A scheduled push at 23:00 local shifts to 07:00 next day."
    const date = new Date('2026-05-25T23:00:00');
    const out = shiftDateOutOfQuietHours(date, DEFAULT_QUIET_HOURS);
    expect(out.shifted).toBe(true);
    expect(out.date.getHours()).toBe(7);
    expect(out.date.getMinutes()).toBe(0);
    expect(out.date.getDate()).toBe(26);
  });

  test('shifts a pre-dawn date forward to the same-day window end', () => {
    const date = new Date('2026-05-25T03:30:00');
    const out = shiftDateOutOfQuietHours(date, DEFAULT_QUIET_HOURS);
    expect(out.shifted).toBe(true);
    expect(out.date.getHours()).toBe(7);
    expect(out.date.getMinutes()).toBe(0);
    expect(out.date.getDate()).toBe(25);
  });

  test('respects a custom window', () => {
    const w = { enabled: true, startHour: 12, startMinute: 0, endHour: 14, endMinute: 0 };
    const date = new Date('2026-05-25T13:00:00');
    const out = shiftDateOutOfQuietHours(date, w);
    expect(out.shifted).toBe(true);
    expect(out.date.getHours()).toBe(14);
  });

  test('passes through when the rule is disabled', () => {
    const off = { ...DEFAULT_QUIET_HOURS, enabled: false };
    const date = new Date('2026-05-25T23:00:00');
    const out = shiftDateOutOfQuietHours(date, off);
    expect(out.shifted).toBe(false);
    expect(out.date.getHours()).toBe(23);
  });
});
