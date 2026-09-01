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

import { safeTriggerDate, safeWeeklyTrigger, scheduleCheckedNotification } from '../triggerDate';

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

  test('a valid WEEKLY trigger passes through untouched', async () => {
    const cfg = {
      identifier: 'weekly',
      content: { title: 't' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 8, minute: 0 },
    };
    await scheduleCheckedNotification(cfg);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(cfg);
  });

  test.each([
    ['wrong type', { type: 'WEEKLY', weekday: 2, hour: 8, minute: 0 }],
    ['missing type', { weekday: 2, hour: 8, minute: 0 }],
    ['missing weekday', { type: 'weekly', hour: 8, minute: 0 }],
    ['weekday zero', { type: 'weekly', weekday: 0, hour: 8, minute: 0 }],
    ['weekday eight', { type: 'weekly', weekday: 8, hour: 8, minute: 0 }],
    ['weekday NaN', { type: 'weekly', weekday: NaN, hour: 8, minute: 0 }],
    ['weekday infinity', { type: 'weekly', weekday: Infinity, hour: 8, minute: 0 }],
    ['fractional weekday', { type: 'weekly', weekday: 2.5, hour: 8, minute: 0 }],
    ['string weekday from persisted state', { type: 'weekly', weekday: '2', hour: 8, minute: 0 }],
    ['negative hour', { type: 'weekly', weekday: 2, hour: -1, minute: 0 }],
    ['hour 24', { type: 'weekly', weekday: 2, hour: 24, minute: 0 }],
    ['hour NaN', { type: 'weekly', weekday: 2, hour: NaN, minute: 0 }],
    ['fractional hour', { type: 'weekly', weekday: 2, hour: 8.5, minute: 0 }],
    ['negative minute', { type: 'weekly', weekday: 2, hour: 8, minute: -1 }],
    ['minute 60', { type: 'weekly', weekday: 2, hour: 8, minute: 60 }],
    ['minute infinity', { type: 'weekly', weekday: 2, hour: 8, minute: Infinity }],
    ['fractional minute', { type: 'weekly', weekday: 2, hour: 8, minute: 0.5 }],
  ])('corrupt persisted WEEKLY state (%s) is rejected before native', async (_label, trigger) => {
    const config = { identifier: 'corrupt-weekly', content: { title: 't' }, trigger };
    expect(safeWeeklyTrigger(trigger, { category: 'training_reminder' })).toBeNull();
    expect(await scheduleCheckedNotification(config, { category: 'training_reminder' })).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('WEEKLY rejection telemetry exposes only the invalid field, never its value', async () => {
    await scheduleCheckedNotification({
      identifier: 'corrupt-weekly',
      content: { title: 't' },
      trigger: { type: 'weekly', weekday: NaN, hour: 8, minute: 0 },
    }, { category: 'training_reminder' });
    expect(trackNotificationFailed).toHaveBeenCalledWith({
      category: 'training_reminder',
      reason: 'invalid_weekly_trigger',
      payload: { raw: 'invalid-weekday', scope: 'corrupt-weekly' },
    });
  });

  test('a null trigger (fire now) passes through untouched', async () => {
    const cfg = { identifier: 'now', content: { title: 't' }, trigger: null };
    await scheduleCheckedNotification(cfg);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(cfg);
  });
});
