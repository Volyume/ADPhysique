/**
 * D215 (founder order 2026-10-02): the lay-time skips, driven through the REAL
 * schedulers with the OS mocked. A requirement already met today means
 * today's prompt is not laid at all:
 *   - the morning and evening weigh-in prompts drop today's one-shot once the
 *     weigh-in is in (13 laid instead of 14), and every laid prompt names the
 *     local day it fires on;
 *   - a meal slot logged today with its time still ahead is laid as a short
 *     run of dated one-shots from tomorrow (MEAL_STAND_DOWN_RUN_DAYS), not a
 *     daily repeat; a slot whose time has passed, or that holds only planned
 *     rows, keeps the repeat; every meal request names its slot;
 *   - relayMealRemindersFromPrefs (the deed path) re-lays from the stored
 *     preference, coalesces concurrent calls into one pass, and lays nothing
 *     without a preference;
 *   - the check-in reminder names the day it fires on;
 *   - the training-day reminders drop today's once a session started today is
 *     completed (16 laid instead of 17: the 56-day horizon from a Monday
 *     morning holds nine Mondays and eight Wednesdays) and each names its day.
 * The clock is faked (Date only) so "today" and the quiet-hours window are
 * fixed whatever time the suite runs.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const SCHEDULE_INPUT_TYPES = { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' };
const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
const mockCancelAllAsync = jest.fn(() => Promise.resolve());
const mockGetAllScheduled = jest.fn(() => Promise.resolve([]));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
  cancelAllScheduledNotificationsAsync: (...a) => mockCancelAllAsync(...a),
  getAllScheduledNotificationsAsync: (...a) => mockGetAllScheduled(...a),
  getPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  setNotificationChannelAsync: () => Promise.resolve(),
  AndroidImportance: { HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetMorningWeightToday = jest.fn(() => Promise.resolve(null));
const mockGetCompletedBetween = jest.fn(() => Promise.resolve([]));
jest.mock('../../database', () => ({
  getLatestCheckin: () => Promise.resolve(null),
  getOpenEdPatternFlag: () => Promise.resolve(null),
  getRecentCompletedWorkouts: () => Promise.resolve([]),
  getActivePlan: () => Promise.resolve(null),
  getMorningWeightToday: (...a) => mockGetMorningWeightToday(...a),
  getCompletedWorkoutsBetween: (...a) => mockGetCompletedBetween(...a),
}));

jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const mockGetFoodEntries = jest.fn(() => Promise.resolve([]));
jest.mock('../../food/db', () => ({ getFoodEntriesForDay: (...a) => mockGetFoodEntries(...a) }));

const mockGetState = jest.fn(() => ({ user: { id: 'u1' }, tier: 'pro' }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockGetState() },
}));

jest.mock('../permissions', () => ({
  getNotificationPermissionStatus: jest.fn(() => Promise.resolve('granted')),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const scheduler = require('../scheduler');
const tr = require('../trainingReminders');
const { localDayKey } = require('../../dayKey');

const laid = (prefix) => mockScheduleAsync.mock.calls
  .map((c) => c[0])
  .filter((n) => typeof n?.identifier === 'string' && n.identifier.startsWith(prefix));

// Friday 2 October 2026. Fake the clock (Date only, timers untouched) so the
// morning 07:00 and the meal times sit where the test says they do.
const FRIDAY_0600 = new Date(2026, 9, 2, 6, 0, 0, 0);
const FRIDAY_1000 = new Date(2026, 9, 2, 10, 0, 0, 0);
const MONDAY_0600 = new Date(2026, 8, 7, 6, 0, 0, 0); // Monday 7 September 2026
const DO_NOT_FAKE = ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'hrtime', 'performance'];

function fakeNow(d) {
  jest.useFakeTimers({ now: d, doNotFake: DO_NOT_FAKE });
}

const BREAKFAST = { id: 'breakfast', label: 'Breakfast', hour: 8, minute: 15, enabled: true };
const LUNCH = { id: 'lunch', label: 'Lunch', hour: 13, minute: 0, enabled: true };
const DINNER = { id: 'dinner', label: 'Dinner', hour: 19, minute: 30, enabled: true };

beforeEach(async () => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
  mockScheduleAsync.mockImplementation(() => Promise.resolve('id'));
  mockCancelAsync.mockImplementation(() => Promise.resolve());
  mockGetAllScheduled.mockImplementation(() => Promise.resolve([]));
  mockGetMorningWeightToday.mockImplementation(() => Promise.resolve(null));
  mockGetCompletedBetween.mockImplementation(() => Promise.resolve([]));
  mockGetFoodEntries.mockImplementation(() => Promise.resolve([]));
  mockGetState.mockImplementation(() => ({ user: { id: 'u1' }, tier: 'pro' }));
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('weigh-in prompts: today\'s one-shot is not laid once the weigh-in is in', () => {
  test('morning: not weighed yet, 14 one-shots from today, each naming its day', async () => {
    fakeNow(FRIDAY_0600);
    await scheduler.scheduleMorningWeightNotification(); // 07:00 default, still ahead
    const m = laid('volyume_morning_weight_');
    expect(m).toHaveLength(14);
    expect(m[0].content.data).toEqual({ type: 'morning_weight', dayKey: '2026-10-02' });
    m.forEach((n) => expect(n.content.data.dayKey).toBe(localDayKey(n.trigger.date.getTime())));
  });

  test('morning: weighed today, 13 one-shots, none for today, the horizon otherwise unchanged', async () => {
    fakeNow(FRIDAY_0600);
    mockGetMorningWeightToday.mockImplementation(() => Promise.resolve({ weightKg: 80.1 }));
    await scheduler.scheduleMorningWeightNotification();
    const m = laid('volyume_morning_weight_');
    expect(m).toHaveLength(13);
    expect(m.map((n) => n.content.data.dayKey)).not.toContain('2026-10-02');
    expect(m[0].content.data.dayKey).toBe('2026-10-03');
    // The identifiers keep their horizon index, so the cancel loop still clears them.
    expect(m[0].identifier).toBe('volyume_morning_weight_2');
    expect(m[12].identifier).toBe('volyume_morning_weight_14');
  });

  test('evening: weighed today, today\'s 19:30 backstop is not laid either', async () => {
    fakeNow(FRIDAY_0600);
    mockGetMorningWeightToday.mockImplementation(() => Promise.resolve({ weightKg: 80.1 }));
    await scheduler.scheduleEveningWeightReminder();
    const e = laid('volyume_evening_weight_');
    expect(e).toHaveLength(13);
    expect(e.map((n) => n.content.data.dayKey)).not.toContain('2026-10-02');
    e.forEach((n) => expect(n.content.data).toEqual({ type: 'evening_weight', dayKey: localDayKey(n.trigger.date.getTime()) }));
  });

  test('a failing weigh-in read fails OPEN: all 14 are laid', async () => {
    fakeNow(FRIDAY_0600);
    mockGetMorningWeightToday.mockImplementation(() => Promise.reject(new Error('db')));
    await scheduler.scheduleMorningWeightNotification();
    expect(laid('volyume_morning_weight_')).toHaveLength(14);
  });
});

describe('meal reminders: a slot logged today is not prompted again today', () => {
  test('logged with the time still ahead: a run of dated one-shots from tomorrow, no repeat; logged with the time passed, or only planned: the repeat', async () => {
    fakeNow(FRIDAY_1000);
    mockGetFoodEntries.mockImplementation(() => Promise.resolve([
      { meal_slot: 'breakfast', is_planned: 0 }, // 08:15 has passed
      { meal_slot: 'lunch', is_planned: 0 }, // 13:00 still ahead
      { meal_slot: 'dinner', is_planned: 1 }, // planned, not eaten
    ]));
    await scheduler.scheduleMealReminders([BREAKFAST, LUNCH, DINNER]);
    const meals = laid('volyume_meal_reminder_');
    const ids = meals.map((n) => n.identifier);
    expect(ids).toEqual([
      'volyume_meal_reminder_breakfast',
      'volyume_meal_reminder_lunch_d1', 'volyume_meal_reminder_lunch_d2', 'volyume_meal_reminder_lunch_d3',
      'volyume_meal_reminder_dinner',
    ]);
    expect(scheduler.MEAL_STAND_DOWN_RUN_DAYS).toBe(3);

    const breakfast = meals[0];
    expect(breakfast.trigger).toMatchObject({ type: 'daily', hour: 8, minute: 15 });
    expect(breakfast.content.data).toEqual({ type: 'meal_log_reminder', slot: 'breakfast' });

    const run = meals.slice(1, 4);
    run.forEach((n, i) => {
      expect(n.trigger.type).toBe('date');
      expect(n.trigger.date.getHours()).toBe(13);
      expect(n.trigger.date.getMinutes()).toBe(0);
      expect(localDayKey(n.trigger.date.getTime())).toBe(['2026-10-03', '2026-10-04', '2026-10-05'][i]);
      expect(n.content.data).toEqual({ type: 'meal_log_reminder', slot: 'lunch', dayKey: localDayKey(n.trigger.date.getTime()) });
      expect(n.content.title).toBe('Lunch');
      expect(n.content.body).toBe('A gentle reminder to log it if it helps. No pressure.');
      expect(n.content.sound).toBe(false);
    });

    const dinner = meals[4];
    expect(dinner.trigger).toMatchObject({ type: 'daily', hour: 19, minute: 30 });
    expect(dinner.content.data).toEqual({ type: 'meal_log_reminder', slot: 'dinner' });
  });

  test('nothing logged: every slot is the daily repeat, as before', async () => {
    fakeNow(FRIDAY_1000);
    await scheduler.scheduleMealReminders([BREAKFAST, LUNCH, DINNER]);
    const meals = laid('volyume_meal_reminder_');
    expect(meals.map((n) => n.identifier)).toEqual([
      'volyume_meal_reminder_breakfast', 'volyume_meal_reminder_lunch', 'volyume_meal_reminder_dinner',
    ]);
    meals.forEach((n) => expect(n.trigger.type).toBe('daily'));
  });

  test('the run respects quiet hours like the repeat (a 06:30 slot shifts to 07:00)', async () => {
    fakeNow(new Date(2026, 9, 2, 5, 0, 0, 0));
    mockGetFoodEntries.mockImplementation(() => Promise.resolve([{ meal_slot: 'early', is_planned: 0 }]));
    await scheduler.scheduleMealReminders([{ id: 'early', label: 'Early', hour: 6, minute: 30, enabled: true }]);
    const run = laid('volyume_meal_reminder_early_d');
    expect(run).toHaveLength(3);
    run.forEach((n) => { expect(n.trigger.date.getHours()).toBe(7); expect(n.trigger.date.getMinutes()).toBe(0); });
  });

  test('ED-safety is unchanged: an open flag lays neither shape', async () => {
    fakeNow(FRIDAY_1000);
    const db = require('../../database');
    const spy = jest.spyOn(db, 'getOpenEdPatternFlag').mockImplementation(() => Promise.resolve({ id: 'flag' }));
    mockGetFoodEntries.mockImplementation(() => Promise.resolve([{ meal_slot: 'lunch', is_planned: 0 }]));
    await scheduler.scheduleMealReminders([LUNCH]);
    expect(laid('volyume_meal_reminder_')).toEqual([]);
    spy.mockRestore();
  });
});

describe('relayMealRemindersFromPrefs: the deed path', () => {
  test('re-lays from the stored preference, so a slot just logged comes back as the run', async () => {
    fakeNow(FRIDAY_1000);
    await AsyncStorage.setItem(scheduler.MEAL_REMINDERS_KEY, JSON.stringify([LUNCH, DINNER]));
    mockGetFoodEntries.mockImplementation(() => Promise.resolve([{ meal_slot: 'lunch', is_planned: 0 }]));
    await scheduler.relayMealRemindersFromPrefs();
    expect(laid('volyume_meal_reminder_').map((n) => n.identifier)).toEqual([
      'volyume_meal_reminder_lunch_d1', 'volyume_meal_reminder_lunch_d2', 'volyume_meal_reminder_lunch_d3',
      'volyume_meal_reminder_dinner',
    ]);
  });

  test('concurrent calls coalesce into one pass over the OS schedule', async () => {
    fakeNow(FRIDAY_1000);
    await AsyncStorage.setItem(scheduler.MEAL_REMINDERS_KEY, JSON.stringify([LUNCH]));
    await Promise.all([
      scheduler.relayMealRemindersFromPrefs(),
      scheduler.relayMealRemindersFromPrefs(),
      scheduler.relayMealRemindersFromPrefs(),
    ]);
    // cancelMealReminders reads the schedule once per pass.
    expect(mockGetAllScheduled).toHaveBeenCalledTimes(1);
    expect(laid('volyume_meal_reminder_')).toHaveLength(1);
  });

  test('no preference, or every reminder off: lays nothing and never throws', async () => {
    fakeNow(FRIDAY_1000);
    await expect(scheduler.relayMealRemindersFromPrefs()).resolves.toBeUndefined();
    await AsyncStorage.setItem(scheduler.MEAL_REMINDERS_KEY, JSON.stringify([{ ...LUNCH, enabled: false }]));
    await scheduler.relayMealRemindersFromPrefs();
    expect(laid('volyume_meal_reminder_')).toEqual([]);
  });

  test('web: touches nothing', async () => {
    mockPlatformOS = 'web';
    await AsyncStorage.setItem(scheduler.MEAL_REMINDERS_KEY, JSON.stringify([LUNCH]));
    await scheduler.relayMealRemindersFromPrefs();
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockGetAllScheduled).not.toHaveBeenCalled();
  });
});

describe('the check-in reminder names the day it fires on', () => {
  test('data.dayKey is the local day of the trigger date', async () => {
    fakeNow(FRIDAY_1000);
    await scheduler.scheduleCheckinReminder(0, 12, 0);
    const [c] = laid('volyume_weekly_checkin');
    expect(c).toBeDefined();
    expect(c.trigger.type).toBe('date');
    expect(c.content.data).toEqual({ type: 'weekly_checkin', dayKey: localDayKey(c.trigger.date.getTime()) });
  });
});

describe('training-day reminders: today\'s is not laid once a session started today is completed', () => {
  async function habit() {
    await AsyncStorage.setItem(tr.REMINDER_PREF_KEY, 'true');
    await AsyncStorage.setItem(tr.SCHEDULE_KEY, JSON.stringify({ days: [1, 3] })); // Monday, Wednesday
  }

  test('not trained: 17 dated one-shots over the horizon, the first today, each naming its day', async () => {
    fakeNow(MONDAY_0600);
    await habit();
    await tr.scheduleTrainingReminders();
    const t = laid('volyume_training_day_');
    // Monday 06:00: today's 08:00 is still ahead, so the 56-day horizon holds
    // nine Mondays (7 September to 2 November) and eight Wednesdays.
    expect(t).toHaveLength(17);
    expect(t[0].content.data).toEqual({ type: 'training_reminder', channelId: 'training-reminders', dayKey: '2026-09-07' });
    t.forEach((n) => expect(n.content.data.dayKey).toBe(localDayKey(n.trigger.date.getTime())));
  });

  test('a session started today and completed: 16, none for today', async () => {
    fakeNow(MONDAY_0600);
    await habit();
    mockGetCompletedBetween.mockImplementation(() => Promise.resolve([{ startedAt: MONDAY_0600.getTime() - 3600e3, endedAt: MONDAY_0600.getTime() - 600e3 }]));
    await tr.scheduleTrainingReminders();
    const t = laid('volyume_training_day_');
    expect(t).toHaveLength(16);
    expect(t.map((n) => n.content.data.dayKey)).not.toContain('2026-09-07');
    expect(t[0].content.data.dayKey).toBe('2026-09-09');
  });

  test('a failing training read fails OPEN: all 17 are laid', async () => {
    fakeNow(MONDAY_0600);
    await habit();
    mockGetCompletedBetween.mockImplementation(() => Promise.reject(new Error('db')));
    await tr.scheduleTrainingReminders();
    expect(laid('volyume_training_day_')).toHaveLength(17);
  });
});
