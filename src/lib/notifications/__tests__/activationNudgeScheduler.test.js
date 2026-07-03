/**
 * scheduleActivationNudge tests (S6).
 *
 * Exercises the scheduler over the REAL activationNudge module (AsyncStorage is
 * in-memory), mocking only the OS layer, the DB, quiet hours, telemetry, the
 * store and the session. Guarantees under test: web no-op; the toggle off and
 * an open ED flag both suppress; it is tier-blind (schedules for a FREE user);
 * 0/1 sessions lay the cold-start / stalled-1 stage with the right data tag;
 * an activated user (3 sessions) lays nothing; a user past the window is an
 * early-out that never even reads the workout table; a missing account date
 * stands down rather than guesses.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const SCHEDULE_INPUT_TYPES = { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' };
const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
  getAllScheduledNotificationsAsync: () => Promise.resolve([]),
  cancelAllScheduledNotificationsAsync: () => Promise.resolve(),
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetEd = jest.fn(() => Promise.resolve(null));
const mockGetAllWorkouts = jest.fn(() => Promise.resolve([]));
jest.mock('../../database', () => ({
  getOpenEdPatternFlag: (...a) => mockGetEd(...a),
  getAllWorkouts: (...a) => mockGetAllWorkouts(...a),
}));

jest.mock('../telemetry', () => ({ trackNotificationFailed: jest.fn() }));
jest.mock('../quietHours', () => ({
  getQuietHours: () => Promise.resolve({ enabled: false }),
  shiftDateOutOfQuietHours: (date) => ({ date }),
  shiftHourMinuteOutOfQuietHours: (hour, minute) => ({ hour, minute }),
}));
jest.mock('../channels', () => ({ COACHING_REMINDERS_CHANNEL: 'coaching' }));

let mockTier = 'free';
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'u1' }, userProfile: null, tier: mockTier }) },
}));

let mockCreatedIso = null;
jest.mock('../../supabase', () => ({
  getSupabaseClient: () => ({ auth: { getSession: () => Promise.resolve({ data: { session: { user: { created_at: mockCreatedIso } } } }) } }),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { scheduleActivationNudge } = require('../scheduler');

const DAY = 86400000;
const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockScheduleAsync.mockClear();
  mockCancelAsync.mockClear();
  mockGetEd.mockClear(); mockGetEd.mockResolvedValue(null);
  mockGetAllWorkouts.mockClear(); mockGetAllWorkouts.mockResolvedValue([]);
  mockPlatformOS = 'android';
  mockTier = 'free';
  mockCreatedIso = new Date(Date.now() - DAY).toISOString(); // created 1 day ago
});

const laid = () => mockScheduleAsync.mock.calls[0][0];

test('web platform no-ops', async () => {
  mockPlatformOS = 'web';
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).not.toHaveBeenCalled();
});

test('the category toggle off suppresses (and cancels any laid one)', async () => {
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ activationNudgeEnabled: false }));
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).not.toHaveBeenCalled();
  expect(mockCancelAsync).toHaveBeenCalled();
});

test('an open ED flag suppresses entirely', async () => {
  mockGetEd.mockResolvedValue({ id: 'flag' });
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).not.toHaveBeenCalled();
  expect(mockCancelAsync).toHaveBeenCalled();
});

test('0 sessions -> cold_start push, and it is tier-blind (fires for a FREE user)', async () => {
  mockTier = 'free';
  mockGetAllWorkouts.mockResolvedValue([]);
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  const c = laid();
  expect(c.identifier).toBe('volyume_activation_nudge');
  expect(c.content.data).toEqual({ type: 'activation_nudge', stage: 'cold_start' });
  expect(c.trigger.date.getTime()).toBeGreaterThan(Date.now());
});

test('1 in-window session -> stalled_1 push', async () => {
  mockCreatedIso = new Date(Date.now() - 2 * DAY).toISOString();
  mockGetAllWorkouts.mockResolvedValue([{ isCompleted: 1, startedAt: Date.now() - DAY }]);
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  expect(laid().content.data).toEqual({ type: 'activation_nudge', stage: 'stalled_1' });
});

test('an activated user (3 sessions) lays nothing', async () => {
  mockGetAllWorkouts.mockResolvedValue([
    { isCompleted: 1, startedAt: Date.now() - 3 * 3600000 },
    { isCompleted: 1, startedAt: Date.now() - 2 * 3600000 },
    { isCompleted: 1, startedAt: Date.now() - 1 * 3600000 },
  ]);
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).not.toHaveBeenCalled();
  expect(mockCancelAsync).toHaveBeenCalled();
});

test('past the window + grace: early-out that never reads the workout table', async () => {
  mockCreatedIso = new Date(Date.now() - 20 * DAY).toISOString();
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).not.toHaveBeenCalled();
  expect(mockGetAllWorkouts).not.toHaveBeenCalled(); // cheap early-out for established users
});

test('a missing account-creation date stands down rather than guesses', async () => {
  mockCreatedIso = null;
  await scheduleActivationNudge('u1');
  expect(mockScheduleAsync).not.toHaveBeenCalled();
});
