/**
 * notifications/trainingReminders.js (audit D4, runtime-critical, was untested).
 *
 * scheduleTrainingReminders is the weekly training-day push scheduler. Pins
 * the three behaviours that matter: it does nothing when reminders are off, it
 * does nothing without notification permission (so it never lays schedules the
 * OS will silently drop), and when on it schedules one weekly notification per
 * training day with the JS-day -> expo-weekday (+1) conversion and the default
 * 08:00 time.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const SCHEDULE_INPUT_TYPES = { WEEKLY: 'weekly', DAILY: 'daily', DATE: 'date' };
const mockSchedule = jest.fn(() => Promise.resolve('id'));
const mockCancel = jest.fn(() => Promise.resolve());
const mockGetAll = jest.fn(() => Promise.resolve([]));
const mockGetPerms = jest.fn(() => Promise.resolve({ status: 'granted' }));
const mockSetChannel = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockSchedule(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancel(...a),
  getAllScheduledNotificationsAsync: (...a) => mockGetAll(...a),
  getPermissionsAsync: (...a) => mockGetPerms(...a),
  setNotificationChannelAsync: (...a) => mockSetChannel(...a),
  AndroidImportance: { HIGH: 4, LOW: 2 },
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...a) => mockGetItem(...a),
}));

const tr = require('../notifications/trainingReminders');

function store(map) {
  mockGetItem.mockImplementation(async (k) => (k in map ? map[k] : null));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockGetAll.mockResolvedValue([]);
});

describe('scheduleTrainingReminders (D4)', () => {
  test('reminders disabled: schedules nothing', async () => {
    store({ [tr.REMINDER_PREF_KEY]: 'false' });
    await tr.scheduleTrainingReminders();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('enabled + permission granted: one weekly notif per day, JS day -> expo weekday + 1, default 08:00', async () => {
    store({
      [tr.REMINDER_PREF_KEY]: 'true',
      [tr.SCHEDULE_KEY]: JSON.stringify({ days: [0, 3] }), // Sunday, Wednesday
    });
    await tr.scheduleTrainingReminders();
    expect(mockSchedule).toHaveBeenCalledTimes(2);
    const weekdays = mockSchedule.mock.calls.map((c) => c[0].trigger.weekday).sort();
    expect(weekdays).toEqual([1, 4]); // 0+1, 3+1
    expect(mockSchedule.mock.calls[0][0].trigger.hour).toBe(8);
    expect(mockSchedule.mock.calls[0][0].trigger.minute).toBe(0);
    expect(mockSchedule.mock.calls[0][0].trigger.repeats).toBe(true);
  });

  test('enabled but permission not granted: schedules nothing', async () => {
    store({
      [tr.REMINDER_PREF_KEY]: 'true',
      [tr.SCHEDULE_KEY]: JSON.stringify({ days: [1] }),
    });
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    await tr.scheduleTrainingReminders();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
