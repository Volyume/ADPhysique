/**
 * scheduleWinbackNotification tests (COMP-025-A §4c).
 *
 * Exercises the scheduler over the REAL winbackState + winbackContent (the
 * AsyncStorage mock is in-memory), mocking only the OS notification layer, the
 * DB queries, quiet hours and telemetry.
 *
 * Guarantees under test: no episode → nothing laid; ED flag → suppressed; past
 * fire date → not scheduled; the 180-day floor blocks a fresh episode's first
 * lay; a re-lay refreshes counts under one identifier; the laid notification
 * carries data.type 'winback'.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

const SCHEDULE_INPUT_TYPES = { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' };
const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
  cancelAllScheduledNotificationsAsync: () => Promise.resolve(),
  SchedulableTriggerInputTypes: SCHEDULE_INPUT_TYPES,
}));

const mockGetEd = jest.fn(() => Promise.resolve(null));
const mockGetAllWorkouts = jest.fn(() => Promise.resolve([]));
jest.mock('../../database', () => ({
  getOpenEdPatternFlag: (...a) => mockGetEd(...a),
  getAllWorkouts: (...a) => mockGetAllWorkouts(...a),
}));

const mockSent = jest.fn();
const mockFailed = jest.fn();
jest.mock('../telemetry', () => ({
  trackNotificationSent: (...a) => mockSent(...a),
  trackNotificationFailed: (...a) => mockFailed(...a),
}));

jest.mock('../quietHours', () => ({
  getQuietHours: () => Promise.resolve({ enabled: false }),
  shiftDateOutOfQuietHours: (date) => ({ date }),
  shiftHourMinuteOutOfQuietHours: (hour, minute) => ({ hour, minute }),
}));

jest.mock('../channels', () => ({ COACHING_REMINDERS_CHANNEL: 'coaching' }));

jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'u1' }, userProfile: null }) },
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { scheduleWinbackNotification } = require('../scheduler');
const winbackState = require('../../payments/winbackState');

const DAY_MS = 86400000;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockScheduleAsync.mockClear();
  mockCancelAsync.mockClear();
  mockGetEd.mockClear();
  mockGetEd.mockResolvedValue(null);
  mockGetAllWorkouts.mockClear();
  mockGetAllWorkouts.mockResolvedValue([]);
  mockSent.mockClear();
  mockFailed.mockClear();
  mockPlatformOS = 'android';
});

function laidContent() {
  return mockScheduleAsync.mock.calls[0][0];
}

test('no open episode → nothing scheduled', async () => {
  await scheduleWinbackNotification('u1', null);
  expect(mockScheduleAsync).not.toHaveBeenCalled();
});

test('open episode with a future fire date schedules the win-back and marks it laid', async () => {
  await winbackState.openEpisode(Date.now()); // +30d default → future
  mockGetAllWorkouts.mockResolvedValue([
    { isCompleted: 1, startedAt: Date.now() + 2 * DAY_MS },
    { isCompleted: 1, startedAt: 1 },
    { isCompleted: 0, startedAt: Date.now() + 2 * DAY_MS },
  ]);
  await scheduleWinbackNotification('u1', null);

  expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  const content = laidContent();
  expect(content.identifier).toBe('volyume_winback');
  expect(content.content.data).toEqual({ type: 'winback' });
  expect(mockSent).toHaveBeenCalledTimes(1);
  const ep = await winbackState.getEpisode();
  expect(ep.winbackLaid).toBe(true);
  expect(await winbackState.getLastFiredAt()).not.toBeNull();
});

test('an open ED flag suppresses the win-back entirely', async () => {
  await winbackState.openEpisode(Date.now());
  mockGetEd.mockResolvedValue({ id: 'flag' });
  await scheduleWinbackNotification('u1', null);
  expect(mockScheduleAsync).not.toHaveBeenCalled();
  expect(mockCancelAsync).toHaveBeenCalled(); // cancels any already-laid one
});

test('a fire date in the past is not scheduled', async () => {
  await winbackState.openEpisode(Date.now() - 40 * DAY_MS); // +30d → already past
  await scheduleWinbackNotification('u1', null);
  expect(mockScheduleAsync).not.toHaveBeenCalled();
});

test('the 180-day floor blocks a fresh episode first lay', async () => {
  // A prior win-back fired recently, then a new churn shortly after.
  await winbackState.openEpisode(1);
  await winbackState.markWinbackLaid(Date.now());
  await winbackState.clearEpisode();
  await winbackState.openEpisode(Date.now()); // fresh episode, future fire
  await scheduleWinbackNotification('u1', null);
  expect(mockScheduleAsync).not.toHaveBeenCalled();
});

test('a re-lay refreshes the win-back under one identifier (bypasses the floor)', async () => {
  await winbackState.openEpisode(Date.now());
  await scheduleWinbackNotification('u1', null); // first lay
  expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  mockScheduleAsync.mockClear();
  // Second open during the window: re-lay even though winbackLaid + lastFired
  // are both recent.
  await scheduleWinbackNotification('u1', null);
  expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  expect(laidContent().identifier).toBe('volyume_winback');
});

test('web platform no-ops', async () => {
  mockPlatformOS = 'web';
  await winbackState.openEpisode(Date.now());
  await scheduleWinbackNotification('u1', null);
  expect(mockScheduleAsync).not.toHaveBeenCalled();
});
