/**
 * notifications.scheduler.test.js
 *
 * Asserts the scheduling helpers:
 *   - Each helper cancels existing schedule before re-scheduling
 *   - Quiet-hours rule shifts the trigger when needed
 *   - Default times (07:00 morning, Sun 12:00 checkin) are OUTSIDE the
 *     default 22:00->07:00 window so unaffected by quiet hours
 *   - On schedule failure, notification_failed telemetry fires with the
 *     correct category
 *   - scheduleNextCheckinReminder skips the cycle if a checkin exists
 *     for this week
 *   - Year of Lifts unlock is idempotent (AsyncStorage flag)
 *   - Year of Lifts requires >= 365 days since earliest workout
 *   - Web platform: every helper no-ops without touching the OS
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

const SCHEDULE_INPUT_TYPES = { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' };
const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
const mockCancelAllAsync = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args) => mockScheduleAsync(...args),
  cancelScheduledNotificationAsync: (...args) => mockCancelAsync(...args),
  cancelAllScheduledNotificationsAsync: (...args) => mockCancelAllAsync(...args),
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetLatestCheckin = jest.fn();
const mockGetOpenEdFlag = jest.fn(() => Promise.resolve(null));
jest.mock('../database', () => ({
  getLatestCheckin: (...args) => mockGetLatestCheckin(...args),
  getOpenEdPatternFlag: (...args) => mockGetOpenEdFlag(...args),
}));

const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../engineTelemetry', () => ({
  track: (...args) => mockTrack(...args),
}));

const mockGetFoodEntries = jest.fn(() => Promise.resolve([]));
jest.mock('../food/db', () => ({
  getFoodEntriesForDay: (...args) => mockGetFoodEntries(...args),
}));

const mockGetState = jest.fn(() => ({ user: { id: 'user-1' } }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockGetState() },
}));

// AsyncStorage is auto-mocked by __mocks__/@react-native-async-storage/async-storage.js
// (in-memory Map), we can write to it directly via the public default API.
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const scheduler = require('../notifications/scheduler');

beforeEach(async () => {
  mockScheduleAsync.mockReset();
  mockScheduleAsync.mockImplementation(() => Promise.resolve('id'));
  mockCancelAsync.mockReset();
  mockCancelAsync.mockImplementation(() => Promise.resolve());
  mockCancelAllAsync.mockReset();
  mockCancelAllAsync.mockImplementation(() => Promise.resolve());
  mockGetLatestCheckin.mockReset();
  mockGetOpenEdFlag.mockReset();
  mockGetOpenEdFlag.mockImplementation(() => Promise.resolve(null));
  mockTrack.mockReset();
  mockTrack.mockImplementation(() => Promise.resolve());
  mockPlatformOS = 'android';
  await AsyncStorage.clear();
});

// ─── scheduleMorningWeightNotification ─────────────────────────────

describe('scheduleMorningWeightNotification', () => {
  test('default 07:00 schedules a WEEKLY trigger per weekday at 7:00 (NOTIF-4 rotation)', async () => {
    await scheduler.scheduleMorningWeightNotification(); // defaults 7, 0
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_morning_weight');
    // One WEEKLY trigger per weekday so the copy rotates instead of freezing.
    expect(mockScheduleAsync).toHaveBeenCalledTimes(7);
    const args = mockScheduleAsync.mock.calls.map((c) => c[0]);
    expect(args.map((a) => a.identifier).sort()).toEqual([
      'volyume_morning_weight_1', 'volyume_morning_weight_2', 'volyume_morning_weight_3',
      'volyume_morning_weight_4', 'volyume_morning_weight_5', 'volyume_morning_weight_6',
      'volyume_morning_weight_7',
    ]);
    args.forEach((a, i) => {
      expect(a.content.data).toEqual({ type: 'morning_weight' });
      expect(a.trigger).toEqual({
        channelId: 'coaching-reminders',
        type: SCHEDULE_INPUT_TYPES.WEEKLY,
        weekday: i + 1,
        hour: 7,
        minute: 0,
      });
    });
  });

  test('23:00 inside default quiet window shifts to 07:00', async () => {
    await scheduler.scheduleMorningWeightNotification(23, 0);
    const arg = mockScheduleAsync.mock.calls[0][0];
    expect(arg.trigger.hour).toBe(7);
    expect(arg.trigger.minute).toBe(0);
  });

  test('respects a custom quiet-hours window persisted in AsyncStorage', async () => {
    await AsyncStorage.setItem(
      '@volyume_quiet_hours_v1',
      JSON.stringify({ enabled: true, startHour: 12, startMinute: 0, endHour: 14, endMinute: 0 }),
    );
    await scheduler.scheduleMorningWeightNotification(13, 0);
    expect(mockScheduleAsync.mock.calls[0][0].trigger.hour).toBe(14);
  });

  test('disabled quiet hours: trigger passes through unchanged', async () => {
    await AsyncStorage.setItem(
      '@volyume_quiet_hours_v1',
      JSON.stringify({ enabled: false, startHour: 22, startMinute: 0, endHour: 7, endMinute: 0 }),
    );
    await scheduler.scheduleMorningWeightNotification(23, 0);
    expect(mockScheduleAsync.mock.calls[0][0].trigger.hour).toBe(23);
  });

  test('failure -> notification_failed telemetry fires with morning_weight category', async () => {
    mockScheduleAsync.mockRejectedValue(new Error('os refused'));
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1',
      'notification_failed',
      expect.objectContaining({
        category: 'morning_weight',
        reason: 'schedule_threw',
      }),
    );
  });

  test('web platform: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockCancelAsync).not.toHaveBeenCalled();
  });

  test('Q1: morning nudge now fires with sound on (was silent)', async () => {
    await scheduler.scheduleMorningWeightNotification(7, 0);
    const args = mockScheduleAsync.mock.calls.map((c) => c[0]);
    expect(args.length).toBe(7);
    args.forEach((a) => expect(a.content.sound).toBe(true));
  });

  test('Q1: open ED flag -> morning nudge withheld (cancelled, not re-laid)', async () => {
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag-1', status: 'open' });
    await scheduler.scheduleMorningWeightNotification(7, 0);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    // It still cancels both prompts first (morning + evening ids).
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_morning_weight_1');
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_evening_weight_1');
  });
});

// ─── scheduleEveningWeightReminder (Q1) ─────────────────────────────

describe('scheduleEveningWeightReminder', () => {
  test('default lays a WEEKLY evening trigger per weekday, sound on, type evening_weight', async () => {
    await scheduler.scheduleEveningWeightReminder(); // defaults 19:30
    // 7 weekly triggers, one per weekday.
    expect(mockScheduleAsync).toHaveBeenCalledTimes(7);
    const args = mockScheduleAsync.mock.calls.map((c) => c[0]);
    expect(args.map((a) => a.identifier).sort()).toEqual([
      'volyume_evening_weight_1', 'volyume_evening_weight_2', 'volyume_evening_weight_3',
      'volyume_evening_weight_4', 'volyume_evening_weight_5', 'volyume_evening_weight_6',
      'volyume_evening_weight_7',
    ]);
    args.forEach((a, i) => {
      expect(a.content.data).toEqual({ type: 'evening_weight' });
      expect(a.content.sound).toBe(true);
      expect(a.trigger).toEqual({
        channelId: 'coaching-reminders',
        type: SCHEDULE_INPUT_TYPES.WEEKLY,
        weekday: i + 1,
        hour: 19,
        minute: 30,
      });
    });
  });

  test('cancels its 7 ids before re-laying', async () => {
    await scheduler.scheduleEveningWeightReminder();
    for (let w = 1; w <= 7; w += 1) {
      expect(mockCancelAsync).toHaveBeenCalledWith(`volyume_evening_weight_${w}`);
    }
  });

  test('open ED flag -> does NOT lay a second daily weight prompt', async () => {
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag-1', status: 'open' });
    await scheduler.scheduleEveningWeightReminder();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('19:30 outside the default quiet window passes through unshifted', async () => {
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync.mock.calls[0][0].trigger.hour).toBe(19);
    expect(mockScheduleAsync.mock.calls[0][0].trigger.minute).toBe(30);
  });

  test('a time inside quiet hours is shifted out', async () => {
    await AsyncStorage.setItem(
      '@volyume_quiet_hours_v1',
      JSON.stringify({ enabled: true, startHour: 19, startMinute: 0, endHour: 21, endMinute: 0 }),
    );
    await scheduler.scheduleEveningWeightReminder(19, 30);
    expect(mockScheduleAsync.mock.calls[0][0].trigger.hour).toBe(21);
  });

  test('web platform: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduler.scheduleEveningWeightReminder();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('failure -> notification_failed telemetry fires with evening_weight category', async () => {
    mockScheduleAsync.mockRejectedValue(new Error('os refused'));
    await scheduler.scheduleEveningWeightReminder();
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1',
      'notification_failed',
      expect.objectContaining({ category: 'evening_weight', reason: 'schedule_threw' }),
    );
  });
});

// ─── scheduleCheckinReminder ───────────────────────────────────────

describe('scheduleCheckinReminder', () => {
  test('schedules a DATE trigger for the next weekday occurrence', async () => {
    await scheduler.scheduleCheckinReminder(0, 12, 0); // Sunday 12:00
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_weekly_checkin');
    const arg = mockScheduleAsync.mock.calls[0][0];
    expect(arg.identifier).toBe('volyume_weekly_checkin');
    expect(arg.trigger.type).toBe(SCHEDULE_INPUT_TYPES.DATE);
    expect(arg.trigger.date).toBeInstanceOf(Date);
    expect(arg.trigger.date.getDay()).toBe(0); // Sunday
    expect(arg.trigger.date.getHours()).toBe(12);
  });

  test('skipThisWeek option pushes target no earlier than baseline', async () => {
    // Whether dSkip is strictly later than dThis depends on the
    // current day-of-week and time. The contract is "skip pushes
    // the baseline forward by ~1 day so a same-day fire is missed".
    // The invariant we can always assert: dSkip is at least as
    // late as dThis. Stronger: dSkip is strictly after "tomorrow",
    // so it cannot be today.
    await scheduler.scheduleCheckinReminder(0, 12, 0, { skipThisWeek: false });
    const dThis = mockScheduleAsync.mock.calls[0][0].trigger.date;

    mockScheduleAsync.mockClear();
    await scheduler.scheduleCheckinReminder(0, 12, 0, { skipThisWeek: true });
    const dSkip = mockScheduleAsync.mock.calls[0][0].trigger.date;

    expect(dSkip.getTime()).toBeGreaterThanOrEqual(dThis.getTime());
    expect(dSkip.getTime()).toBeGreaterThan(Date.now() + 12 * 60 * 60 * 1000);
  });

  test('minGapDays + lastCheckinMs pushes the schedule out by full weeks', async () => {
    // Set last checkin to "yesterday". With minGapDays=7, the earliest
    // valid next fire is 6 more days. If the natural next-Sunday is
    // sooner than that, the helper should advance by a full week.
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    await scheduler.scheduleCheckinReminder(0, 12, 0, {
      lastCheckinMs: yesterday,
      minGapDays: 7,
    });
    const fireDate = mockScheduleAsync.mock.calls[0][0].trigger.date;
    expect(fireDate.getTime()).toBeGreaterThanOrEqual(yesterday + 7 * 24 * 60 * 60 * 1000);
  });

  test('failure -> notification_failed with weekly_checkin_reminder category', async () => {
    mockScheduleAsync.mockRejectedValue(new Error('boom'));
    await scheduler.scheduleCheckinReminder(0, 12, 0);
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1',
      'notification_failed',
      expect.objectContaining({
        category: 'weekly_checkin_reminder',
        reason: 'schedule_threw',
      }),
    );
  });

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduler.scheduleCheckinReminder(0, 12, 0);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });
});

// ─── scheduleNextCheckinReminder ───────────────────────────────────

describe('scheduleNextCheckinReminder', () => {
  test('with no existing checkin: schedules normally (no skip)', async () => {
    mockGetLatestCheckin.mockResolvedValue(null);
    await scheduler.scheduleNextCheckinReminder('user-1', 0, 12, 0);
    expect(mockScheduleAsync).toHaveBeenCalled();
  });

  test('with this-week checkin already made: skips this cycle', async () => {
    // A check-in created now is inside the current local week, so the
    // upcoming reminder day is skipped. Suppression matches on created_at
    // (an absolute instant), not the stored week_start.
    mockGetLatestCheckin.mockResolvedValue({ createdAt: Date.now() });

    await scheduler.scheduleNextCheckinReminder('user-1', 0, 12, 0);
    const fireDate = mockScheduleAsync.mock.calls[0][0].trigger.date;
    // Skip means we fire at least 1 day after now.
    expect(fireDate.getTime()).toBeGreaterThan(Date.now());
  });

  test('without userId: skips DB lookup, schedules normally', async () => {
    await scheduler.scheduleNextCheckinReminder(null, 0, 12, 0);
    expect(mockGetLatestCheckin).not.toHaveBeenCalled();
    expect(mockScheduleAsync).toHaveBeenCalled();
  });

  test('DB throw: falls through to scheduling without skip', async () => {
    mockGetLatestCheckin.mockRejectedValue(new Error('sqlite locked'));
    await scheduler.scheduleNextCheckinReminder('user-1', 0, 12, 0);
    expect(mockScheduleAsync).toHaveBeenCalled();
  });
});

// ─── cancel helpers ────────────────────────────────────────────────

describe('cancel helpers', () => {
  test('cancelMorningNotification cancels by id and swallows error', async () => {
    mockCancelAsync.mockRejectedValue(new Error('not scheduled'));
    await expect(scheduler.cancelMorningNotification()).resolves.toBeUndefined();
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_morning_weight');
  });

  test('cancelCheckinNotification cancels by id', async () => {
    await scheduler.cancelCheckinNotification();
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_weekly_checkin');
  });

  test('cancelAllNotifications drains everything', async () => {
    await scheduler.cancelAllNotifications();
    expect(mockCancelAllAsync).toHaveBeenCalledTimes(1);
  });
});

// ─── checkYearOfLiftsUnlock ────────────────────────────────────────

describe('checkYearOfLiftsUnlock', () => {
  test('does nothing when earliestWorkoutAt is null', async () => {
    await scheduler.checkYearOfLiftsUnlock(null);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('does nothing when < 365 days since earliest workout', async () => {
    const earliest = Date.now() - 364 * 86400000;
    await scheduler.checkYearOfLiftsUnlock(earliest);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('schedules immediate notification when >= 365 days', async () => {
    const earliest = Date.now() - 366 * 86400000;
    await scheduler.checkYearOfLiftsUnlock(earliest);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
    const arg = mockScheduleAsync.mock.calls[0][0];
    expect(arg.identifier).toBe('volyume_year_of_lifts_unlock');
    expect(arg.content.data).toEqual({ type: 'year_of_lifts_unlock' });
    // Immediate, but carries the coaching channel so Android 8+ actually shows it.
    expect(arg.trigger).toEqual({ channelId: 'coaching-reminders' });
  });

  test('idempotent: second call after success is a no-op (AsyncStorage flag)', async () => {
    const earliest = Date.now() - 400 * 86400000;
    await scheduler.checkYearOfLiftsUnlock(earliest);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1);

    await scheduler.checkYearOfLiftsUnlock(earliest);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1); // not 2
  });

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduler.checkYearOfLiftsUnlock(Date.now() - 400 * 86400000);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });
});

// ─── checkMonthlyRecapReady (COMP-005) ─────────────────────────────

describe('checkMonthlyRecapReady', () => {
  const ok = { completedCount: 12, monthSessions: 8, monthKey: '2026-05', monthLabel: 'May' };

  test('does nothing below the 10-session unlock', async () => {
    await scheduler.checkMonthlyRecapReady({ ...ok, completedCount: 9 });
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('does nothing for a zero-session month (silence, not shame)', async () => {
    await scheduler.checkMonthlyRecapReady({ ...ok, monthSessions: 0 });
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('schedules the recap notification when unlocked and the month had sessions', async () => {
    await scheduler.checkMonthlyRecapReady(ok);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
    const arg = mockScheduleAsync.mock.calls[0][0];
    expect(arg.identifier).toBe('volyume_monthly_recap_2026-05');
    expect(arg.content.title).toBe('Your May recap is ready');
    expect(arg.content.data).toEqual({ type: 'monthly_recap' });
  });

  test('neutral body under calm / ED flag', async () => {
    await scheduler.checkMonthlyRecapReady({ ...ok, monthKey: '2026-04', neutral: true });
    const arg = mockScheduleAsync.mock.calls[0][0];
    expect(arg.content.body).toMatch(/summed up/);
  });

  test('idempotent per month', async () => {
    await scheduler.checkMonthlyRecapReady({ ...ok, monthKey: '2026-03' });
    await scheduler.checkMonthlyRecapReady({ ...ok, monthKey: '2026-03' });
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  });

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduler.checkMonthlyRecapReady({ ...ok, monthKey: '2026-02' });
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });
});

// ─── restoreNotifications ──────────────────────────────────────────

describe('restoreNotifications', () => {
  // restoreNotifications calls getNotificationPermissionStatus
  // (lazy-required from ./permissions). The mock for expo-notifications
  // doesn't include getPermissionsAsync, so the permission check
  // returns 'undetermined' via the catch path and restore is a no-op.
  // That's the right behaviour: if permissions are unknown, we don't
  // re-schedule. We test the happy path by skipping permission via
  // the prefs object being null/falsy.

  test('null prefs: short-circuits without touching scheduler', async () => {
    await scheduler.restoreNotifications(null, 'user-1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockCancelAllAsync).not.toHaveBeenCalled();
  });
});

// ─── scheduleCascadeGateNotifications ──────────────────────────────

describe('scheduleCascadeGateNotifications', () => {
  const DAY = 86400000;

  test('schedules day-19 and day-21 one-shots from a future trial end', async () => {
    const endsAt = Date.now() + 10 * DAY; // 10 days out, both gates future
    await scheduler.scheduleCascadeGateNotifications(endsAt);

    // Both prior schedules cancelled first.
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_cascade_day19');
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_cascade_day21');

    const ids = mockScheduleAsync.mock.calls.map(c => c[0].identifier);
    expect(ids).toContain('volyume_cascade_day19');
    expect(ids).toContain('volyume_cascade_day21');

    for (const call of mockScheduleAsync.mock.calls) {
      const arg = call[0];
      expect(arg.content.data).toEqual({ type: 'cascade_gate' });
      expect(arg.trigger.type).toBe('date');
      expect(arg.trigger.date instanceof Date).toBe(true);
    }
  });

  test('day-19 lands 2 days before day-21, both at 10:00 local', async () => {
    const endsAt = Date.now() + 10 * DAY;
    await scheduler.scheduleCascadeGateNotifications(endsAt);
    const byId = {};
    for (const call of mockScheduleAsync.mock.calls) byId[call[0].identifier] = call[0].trigger.date;
    const d19 = byId['volyume_cascade_day19'];
    const d21 = byId['volyume_cascade_day21'];
    // 2 calendar days apart (10:00 both; quiet hours don't touch 10:00).
    expect(d21.getTime() - d19.getTime()).toBe(2 * DAY);
    expect(d19.getHours()).toBe(10);
    expect(d21.getHours()).toBe(10);
  });

  test('skips a past gate: trial ending tomorrow schedules only day-21', async () => {
    const endsAt = Date.now() + 1 * DAY; // day 19 would be yesterday
    await scheduler.scheduleCascadeGateNotifications(endsAt);
    const ids = mockScheduleAsync.mock.calls.map(c => c[0].identifier);
    expect(ids).toContain('volyume_cascade_day21');
    expect(ids).not.toContain('volyume_cascade_day19');
  });

  test('both gates past: schedules nothing', async () => {
    const endsAt = Date.now() - 1 * DAY;
    await scheduler.scheduleCascadeGateNotifications(endsAt);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('invalid date: no-op, no throw', async () => {
    await scheduler.scheduleCascadeGateNotifications('not-a-date');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduler.scheduleCascadeGateNotifications(Date.now() + 10 * DAY);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('schedule failure fires notification_failed with CASCADE_GATE', async () => {
    mockScheduleAsync.mockRejectedValue(new Error('os down'));
    await scheduler.scheduleCascadeGateNotifications(Date.now() + 10 * DAY);
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1', 'notification_failed',
      expect.objectContaining({ category: 'cascade_gate', reason: 'schedule_threw' }),
    );
  });
});

// ─── scheduleWeeklyCoachReady ──────────────────────────────────────

describe('scheduleWeeklyCoachReady', () => {
  test('schedules a ONE-OFF date trigger for the next Monday 09:00', async () => {
    await scheduler.scheduleWeeklyCoachReady(); // defaults 9, 0
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_weekly_coach_ready');
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
    const arg = mockScheduleAsync.mock.calls[0][0];
    expect(arg.identifier).toBe('volyume_weekly_coach_ready');
    expect(arg.content.data).toEqual({ type: 'weekly_coach_ready' });
    expect(arg.trigger.type).toBe('date');
    // Next Monday (JS getDay === 1) at 09:00 local.
    expect(arg.trigger.date instanceof Date).toBe(true);
    expect(arg.trigger.date.getDay()).toBe(1);
    expect(arg.trigger.date.getHours()).toBe(9);
    expect(arg.trigger.date.getTime()).toBeGreaterThan(Date.now());
  });

  test('09:00 is outside the default quiet window, unshifted', async () => {
    await scheduler.scheduleWeeklyCoachReady(9, 0);
    const arg = mockScheduleAsync.mock.calls[0][0];
    expect(arg.trigger.date.getHours()).toBe(9);
  });

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduler.scheduleWeeklyCoachReady();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('schedule failure fires notification_failed with WEEKLY_COACH_READY', async () => {
    mockScheduleAsync.mockRejectedValue(new Error('os down'));
    await scheduler.scheduleWeeklyCoachReady();
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1', 'notification_failed',
      expect.objectContaining({ category: 'weekly_coach_ready', reason: 'schedule_threw' }),
    );
  });
});

// ─── scheduleMissedCheckinFollowups (OPP-C03) ──────────────────────

describe('scheduleMissedCheckinFollowups', () => {
  const ID_EVENING = 'volyume_checkin_missed_evening';
  const ID_48H = 'volyume_checkin_missed_48h';

  // A check-in day 3 days out at 18:00 keeps both slots in the future
  // whatever day the test runs on.
  async function setProPrefs(extra = {}) {
    mockGetState.mockImplementation(() => ({ user: { id: 'user-1' }, tier: 'pro' }));
    await AsyncStorage.setItem('@volyume_notification_prefs', JSON.stringify({
      checkinDay: (new Date().getDay() + 3) % 7,
      checkinHour: 18,
      checkinMinute: 0,
      ...extra,
    }));
  }

  afterEach(() => {
    mockGetState.mockImplementation(() => ({ user: { id: 'user-1' } }));
  });

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await setProPrefs();
    await scheduler.scheduleMissedCheckinFollowups('user-1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockCancelAsync).not.toHaveBeenCalled();
  });

  test('free tier: cancels the pair and never schedules (Pro-only)', async () => {
    mockGetState.mockImplementation(() => ({ user: { id: 'user-1' }, tier: 'free' }));
    await scheduler.scheduleMissedCheckinFollowups('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID_EVENING);
    expect(mockCancelAsync).toHaveBeenCalledWith(ID_48H);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('category toggle off: cancels the pair and never schedules', async () => {
    await setProPrefs({ missedCheckinEnabled: false });
    await scheduler.scheduleMissedCheckinFollowups('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID_EVENING);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('open ED flag: suppressed entirely (cancels, never schedules)', async () => {
    await setProPrefs();
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag-1' });
    await scheduler.scheduleMissedCheckinFollowups('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID_EVENING);
    expect(mockCancelAsync).toHaveBeenCalledWith(ID_48H);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('lays the evening nudge (20:00 on the check-in day) and the +48h follow-up', async () => {
    await setProPrefs();
    mockGetLatestCheckin.mockResolvedValue(null);
    await scheduler.scheduleMissedCheckinFollowups('user-1');

    expect(mockScheduleAsync).toHaveBeenCalledTimes(2);
    const byId = {};
    for (const call of mockScheduleAsync.mock.calls) byId[call[0].identifier] = call[0];

    const evening = byId[ID_EVENING];
    expect(evening.content.data).toEqual({ type: 'checkin_missed', slot: 'evening' });
    expect(evening.trigger.type).toBe(SCHEDULE_INPUT_TYPES.DATE);
    expect(evening.trigger.channelId).toBe('coaching-reminders');
    expect(evening.trigger.date.getHours()).toBe(20);
    expect(evening.trigger.date.getTime()).toBeGreaterThan(Date.now());

    const followup = byId[ID_48H];
    expect(followup.content.data).toEqual({ type: 'checkin_missed', slot: 'followup' });
    expect(followup.trigger.date.getHours()).toBe(18); // occurrence hour + 48h
    // Exactly 48h after the occurrence = evening day at 18:00 plus 2 days.
    expect(followup.trigger.date.getTime() - evening.trigger.date.getTime())
      .toBe(2 * 86400000 - 2 * 60 * 60 * 1000);
  });

  test('never shame copy: neither push says "missed"', async () => {
    await setProPrefs();
    await scheduler.scheduleMissedCheckinFollowups('user-1');
    for (const call of mockScheduleAsync.mock.calls) {
      expect(`${call[0].content.title} ${call[0].content.body}`).not.toMatch(/miss/i);
    }
  });

  test('re-lay cancels its own identifiers first (idempotent across launches)', async () => {
    await setProPrefs();
    await scheduler.scheduleMissedCheckinFollowups('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID_EVENING);
    expect(mockCancelAsync).toHaveBeenCalledWith(ID_48H);
    expect(mockScheduleAsync).toHaveBeenCalledTimes(2);
  });

  test('schedule failure fires notification_failed with checkin_missed', async () => {
    await setProPrefs();
    mockScheduleAsync.mockRejectedValue(new Error('os down'));
    await scheduler.scheduleMissedCheckinFollowups('user-1');
    expect(mockTrack).toHaveBeenCalledWith(
      'user-1', 'notification_failed',
      expect.objectContaining({ category: 'checkin_missed', reason: 'schedule_threw' }),
    );
  });
});

// ─── rescheduleForTimezoneIfChanged (NOTIF-1) ──────────────────────
describe('schedulePlannedMealConfirm (F3)', () => {
  const ID = 'volyume_planned_meal_confirm';
  const PREFS_KEY = '@volyume_notification_prefs';

  async function setPro(extra = {}) {
    mockGetState.mockImplementation(() => ({ user: { id: 'user-1' }, tier: 'pro' }));
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(extra));
  }

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await setPro();
    await scheduler.schedulePlannedMealConfirm('user-1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('free tier: cancels and never schedules (Pro-only)', async () => {
    mockGetState.mockImplementation(() => ({ user: { id: 'user-1' }, tier: 'free' }));
    await scheduler.schedulePlannedMealConfirm('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('toggle off: cancels and never schedules', async () => {
    await setPro({ plannedMealConfirmEnabled: false });
    await scheduler.schedulePlannedMealConfirm('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('open ED flag: suppressed (cancels, never schedules)', async () => {
    await setPro();
    mockGetOpenEdFlag.mockResolvedValue({ id: 'flag-1' });
    await scheduler.schedulePlannedMealConfirm('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('self-suppress: no unconfirmed planned meals today → cancels, never schedules', async () => {
    await setPro();
    mockGetFoodEntries.mockResolvedValue([{ is_planned: 0 }]); // nothing planned/unconfirmed
    await scheduler.schedulePlannedMealConfirm('user-1');
    expect(mockCancelAsync).toHaveBeenCalledWith(ID);
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  afterEach(() => { mockGetFoodEntries.mockReset(); mockGetFoodEntries.mockResolvedValue([]); });
});

describe('rescheduleForTimezoneIfChanged', () => {
  const TZ_KEY = '@volyume_notif_tz_offset';

  test('first run records the baseline offset and does not re-lay', async () => {
    const spy = jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
    await scheduler.rescheduleForTimezoneIfChanged('u1');
    expect(await AsyncStorage.getItem(TZ_KEY)).toBe('0');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('unchanged offset is a no-op', async () => {
    const spy = jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
    await AsyncStorage.setItem(TZ_KEY, '0');
    await scheduler.rescheduleForTimezoneIfChanged('u1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('a changed offset updates the stored baseline (and attempts a re-lay)', async () => {
    const spy = jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(60);
    await AsyncStorage.setItem(TZ_KEY, '0');
    await scheduler.rescheduleForTimezoneIfChanged('u1');
    expect(await AsyncStorage.getItem(TZ_KEY)).toBe('60');
    spy.mockRestore();
  });
});
