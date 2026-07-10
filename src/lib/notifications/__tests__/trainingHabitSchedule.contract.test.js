/**
 * Contract test (D17): refreshHabitDerivedTrainingSchedule
 * (trainingHabitSchedule.js) writes @volyume_schedule_v1 in the EXACT shape
 * the REAL, unmocked reader (scheduleTrainingReminders, trainingReminders.js)
 * already parses -- { days: number[] } of JS weekdays (0=Sun..6=Sat). The
 * reader's contract is deliberately untouched by the D17 rebuild; this test
 * pins that by sharing one in-memory AsyncStorage between the writer and
 * the real reader, so a future shape drift on either side fails here
 * instead of only inside each module's own isolated unit tests.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

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
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
}));

// In-memory AsyncStorage shared by the writer and the real reader -- the
// point of the test is to prove they agree on the same stored value.
const mockMemStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockMemStore.has(k) ? mockMemStore.get(k) : null)),
  setItem: jest.fn((k, v) => { mockMemStore.set(k, v); return Promise.resolve(); }),
}));

const mockGetCompletedWorkoutStartTimestamps = jest.fn();
const mockGetActivePlan = jest.fn(() => Promise.resolve(null));
jest.mock('../../database', () => ({
  getCompletedWorkoutStartTimestamps: (...a) => mockGetCompletedWorkoutStartTimestamps(...a),
  getActivePlan: (...a) => mockGetActivePlan(...a),
}));

jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'u1' } }) },
}));

const { localWeekStartMs } = require('../../dayKey');
const { refreshHabitDerivedTrainingSchedule, MIN_HISTORY_WEEKS } = require('../trainingHabitSchedule');
const { REMINDER_PREF_KEY, SCHEDULE_KEY } = require('../trainingReminders');

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

beforeEach(() => {
  jest.clearAllMocks();
  mockMemStore.clear();
  mockPlatformOS = 'android';
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockGetAll.mockResolvedValue([]);
  mockGetActivePlan.mockResolvedValue(null);
  // Reminders must be enabled for the real reader to actually lay anything;
  // this mirrors a user who has already turned the toggle on in Settings.
  mockMemStore.set(REMINDER_PREF_KEY, 'true');
});

test('writer -> real reader: one weekly notification per habit-derived weekday, matching the written shape exactly', async () => {
  const now = Date.UTC(2026, 7, 15, 9, 0, 0); // a Saturday-ish mid-week moment
  const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
  const currentWeekStart = localWeekStartMs(now);
  const anchor = currentWeekStart - MIN_HISTORY_WEEKS * WEEK_MS + DAY_MS;

  // Train on two distinct weekdays consistently for both observed weeks
  // (threshold = ceil(2/2) = 1, so a single hit per week already qualifies).
  const offsetA = 1;
  const offsetB = 4;
  const timestamps = [
    anchor,
    currentWeekStart - 1 * WEEK_MS + offsetA * DAY_MS,
    currentWeekStart - 2 * WEEK_MS + offsetA * DAY_MS,
    currentWeekStart - 1 * WEEK_MS + offsetB * DAY_MS,
    currentWeekStart - 2 * WEEK_MS + offsetB * DAY_MS,
  ];
  mockGetCompletedWorkoutStartTimestamps.mockResolvedValue(timestamps);

  const weekdayA = new Date(currentWeekStart - 1 * WEEK_MS + offsetA * DAY_MS).getDay();
  const weekdayB = new Date(currentWeekStart - 1 * WEEK_MS + offsetB * DAY_MS).getDay();
  const expectedDays = [weekdayA, weekdayB].sort((a, b) => a - b);

  await refreshHabitDerivedTrainingSchedule('u1');

  // The writer wrote the exact { days } shape.
  const stored = JSON.parse(mockMemStore.get(SCHEDULE_KEY));
  expect(stored).toEqual({ days: expectedDays });

  // ...and the REAL (unmocked) reader consumed exactly that: one weekly
  // trigger per derived weekday, JS weekday -> expo weekday (+1).
  expect(mockSchedule).toHaveBeenCalledTimes(expectedDays.length);
  const scheduledExpoWeekdays = mockSchedule.mock.calls.map((c) => c[0].trigger.weekday).sort((a, b) => a - b);
  expect(scheduledExpoWeekdays).toEqual(expectedDays.map((d) => d + 1).sort((a, b) => a - b));

  dateNowSpy.mockRestore();
});

test('writer -> real reader: an empty derived schedule cancels rather than scheduling anything', async () => {
  const now = Date.UTC(2026, 7, 15, 9, 0, 0);
  const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
  const currentWeekStart = localWeekStartMs(now);
  // Sufficient history span but a different weekday every week -> derives [].
  const timestamps = [0, 1, 2, 3, 4, 5].map(
    (w) => currentWeekStart - (w + 1) * WEEK_MS + w * DAY_MS + 3600000,
  );
  mockGetCompletedWorkoutStartTimestamps.mockResolvedValue(timestamps);

  await refreshHabitDerivedTrainingSchedule('u1');

  expect(JSON.parse(mockMemStore.get(SCHEDULE_KEY))).toEqual({ days: [] });
  expect(mockSchedule).not.toHaveBeenCalled();

  dateNowSpy.mockRestore();
});
