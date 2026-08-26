/**
 * Pins the fix for Sentry VOLYUME-1K: a hard native crash (EXC_BREAKPOINT /
 * SIGTRAP) that killed the app outright whenever an Invalid Date reached an
 * expo-notifications DATE trigger.
 *
 * The trap lives in expo-notifications' own Swift, in
 * DateTriggerRecord.toUNNotificationTrigger():
 *
 *     let timestamp: Int = Int(self.timestamp / 1000)
 *
 * Swift's Int(Double) traps on NaN and on infinity, on a background
 * libdispatch queue. Nothing in JavaScript can catch it: not the try/catch
 * around the scheduling call, not App.js's ErrorBoundary, not ScreenBoundary.
 * The process is simply killed, which is why the two reporting users saw the
 * app vanish with no error screen and no incident code.
 *
 * These tests therefore pin the ONLY defence available: no non-finite value
 * may ever be handed to a DATE trigger. Each case below is a value that
 * previously reached native and killed the app.
 */

import { safeTriggerDate, scheduleCheckedNotification } from '../triggerDate';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', WEEKLY: 'weekly', TIME_INTERVAL: 'timeInterval' },
  scheduleNotificationAsync: jest.fn(async () => 'scheduled-id'),
}));
jest.mock('../telemetry', () => ({ trackNotificationFailed: jest.fn() }));

const Notifications = require('expo-notifications');
const { trackNotificationFailed } = require('../telemetry');

beforeEach(() => {
  Notifications.scheduleNotificationAsync.mockClear();
  trackNotificationFailed.mockClear();
});

describe('safeTriggerDate rejects every value that traps in Swift', () => {
  // Int(NaN / 1000) and Int(±Infinity / 1000) are the exact trapping cases.
  const trapping = [
    ['an Invalid Date', new Date('nonsense')],
    ['new Date(NaN)', new Date(NaN)],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['undefined', undefined],
    ['null', null],
    ['an unparsable string', 'not a date'],
    // Number.isFinite(1e300) is true, but new Date(1e300) is an Invalid Date
    // whose getTime() is NaN. A finite-check alone would let this through.
    ['a finite number beyond the Date range', 1e300],
    ['a Date built beyond the Date range', new Date(8.64e15 + 1)],
  ];

  test.each(trapping)('rejects %s', (_label, value) => {
    expect(safeTriggerDate(value, { category: 'test' })).toBeNull();
  });

  test('reports each rejection so the producing scheduler can be found', () => {
    safeTriggerDate(NaN, { category: 'weekly_coach_ready', scope: 'coach_ready' });
    expect(trackNotificationFailed).toHaveBeenCalledWith(expect.objectContaining({
      category: 'weekly_coach_ready',
      reason: 'invalid_trigger_date',
    }));
  });

  test('never puts a real instant in telemetry, only the shape of the fault', () => {
    safeTriggerDate(NaN, { category: 'c' });
    const { payload } = trackNotificationFailed.mock.calls[0][0];
    expect(payload.raw).toBe('NaN');
    expect(String(payload.raw)).not.toMatch(/\d{10,}/);
  });
});

describe('safeTriggerDate passes valid instants through unchanged', () => {
  test('accepts a Date and preserves the exact instant', () => {
    const d = new Date('2026-09-01T09:00:00.000Z');
    expect(safeTriggerDate(d).getTime()).toBe(d.getTime());
  });

  test('accepts epoch milliseconds', () => {
    const ms = Date.UTC(2026, 8, 1, 9, 0, 0);
    expect(safeTriggerDate(ms).getTime()).toBe(ms);
  });

  test('accepts a past instant: past-date policy stays with the callers', () => {
    // Scope note. This guard rejects only what TRAPS. Callers already have
    // their own past-date rules and those must not change behaviour here.
    const past = new Date(Date.now() - 60_000);
    expect(safeTriggerDate(past).getTime()).toBe(past.getTime());
  });

  test('accepts the exact boundary of the representable range', () => {
    expect(safeTriggerDate(8.64e15).getTime()).toBe(8.64e15);
  });
});

describe('scheduleCheckedNotification is the choke point', () => {
  const dateTrigger = (date) => ({
    identifier: 'volyume_test',
    content: { title: 't' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });

  test('a bad DATE trigger never reaches native', async () => {
    const result = await scheduleCheckedNotification(dateTrigger(new Date(NaN)));
    expect(result).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('a good DATE trigger is scheduled with the instant intact', async () => {
    const when = new Date('2026-09-01T09:00:00.000Z');
    await scheduleCheckedNotification(dateTrigger(when));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const sent = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(sent.trigger.date.getTime()).toBe(when.getTime());
  });

  test('other trigger fields survive the rebuild', async () => {
    await scheduleCheckedNotification({
      identifier: 'x',
      content: { title: 't' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date('2026-09-01T09:00:00.000Z'),
        channelId: 'coaching_reminders',
      },
    });
    const sent = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(sent.trigger.channelId).toBe('coaching_reminders');
  });

  test('non-DATE triggers pass through untouched: they cannot trap', async () => {
    const cfg = {
      identifier: 'weekly',
      content: { title: 't' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 8, minute: 0 },
    };
    await scheduleCheckedNotification(cfg);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(cfg);
  });

  test('a null trigger (fire now) passes through untouched', async () => {
    const cfg = { identifier: 'now', content: { title: 't' }, trigger: null };
    await scheduleCheckedNotification(cfg);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(cfg);
  });
});
