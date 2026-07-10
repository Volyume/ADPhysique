/**
 * refreshHabitDerivedTrainingSchedule (D17), the DB-touching writer half of
 * trainingHabitSchedule.js. scheduleTrainingReminders is mocked out here so
 * these tests isolate the writer's own behaviour (what it reads, what it
 * writes, when it re-lays); the end-to-end shape contract against the REAL
 * reader lives in trainingHabitSchedule.contract.test.js.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const mockGetCompletedWorkoutStartTimestamps = jest.fn();
jest.mock('../../database', () => ({
  getCompletedWorkoutStartTimestamps: (...a) => mockGetCompletedWorkoutStartTimestamps(...a),
}));

const mockSetItem = jest.fn(() => Promise.resolve());
const mockGetItem = jest.fn(() => Promise.resolve(null));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: (...a) => mockSetItem(...a),
  getItem: (...a) => mockGetItem(...a),
}));

const mockScheduleTrainingReminders = jest.fn(() => Promise.resolve());
jest.mock('../trainingReminders', () => ({
  SCHEDULE_KEY: '@volyume_schedule_v1',
  scheduleTrainingReminders: (...a) => mockScheduleTrainingReminders(...a),
}));

const { localWeekStartMs } = require('../../dayKey');
const { refreshHabitDerivedTrainingSchedule, MIN_HISTORY_WEEKS } = require('../trainingHabitSchedule');

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
  mockGetItem.mockResolvedValue(null);
});

describe('refreshHabitDerivedTrainingSchedule', () => {
  test('a fresh user with no workout history writes no schedule', async () => {
    mockGetCompletedWorkoutStartTimestamps.mockResolvedValue([]);
    await refreshHabitDerivedTrainingSchedule('new-user');
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockScheduleTrainingReminders).not.toHaveBeenCalled();
  });

  test('no userId: no-op, nothing read or written', async () => {
    await refreshHabitDerivedTrainingSchedule(null);
    expect(mockGetCompletedWorkoutStartTimestamps).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('web platform: no-op', async () => {
    mockPlatformOS = 'web';
    mockGetCompletedWorkoutStartTimestamps.mockResolvedValue([Date.now()]);
    await refreshHabitDerivedTrainingSchedule('u1');
    expect(mockGetCompletedWorkoutStartTimestamps).not.toHaveBeenCalled();
  });

  test('enough history: writes { days } and asks the reader to re-lay', async () => {
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const currentWeekStart = localWeekStartMs(now);
    const anchor = currentWeekStart - MIN_HISTORY_WEEKS * WEEK_MS + DAY_MS;
    const t1 = currentWeekStart - 1 * WEEK_MS + 1 * DAY_MS;
    mockGetCompletedWorkoutStartTimestamps.mockResolvedValue([anchor, t1]);

    await refreshHabitDerivedTrainingSchedule('u1');

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const [key, value] = mockSetItem.mock.calls[0];
    expect(key).toBe('@volyume_schedule_v1');
    const parsed = JSON.parse(value);
    expect(Array.isArray(parsed.days)).toBe(true);
    expect(mockScheduleTrainingReminders).toHaveBeenCalledTimes(1);
    dateNowSpy.mockRestore();
  });

  test('insufficient history: writes a { days: [] } schedule only when history is genuinely sparse-but-sufficient, not when it is absent', async () => {
    // Absent history (tested above) writes nothing at all. This test
    // confirms the DISTINCT case: enough history span, but no weekday ever
    // repeats, so the derivation returns [] rather than null, and the
    // writer honours that by writing the empty schedule (which the reader
    // treats as "cancel", correctly silencing a stale reminder).
    const now = Date.UTC(2026, 7, 15, 9, 0, 0);
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const currentWeekStart = localWeekStartMs(now);
    const timestamps = [0, 1, 2, 3, 4, 5].map(
      (w) => currentWeekStart - (w + 1) * WEEK_MS + w * DAY_MS + 3600000,
    );
    mockGetCompletedWorkoutStartTimestamps.mockResolvedValue(timestamps);

    await refreshHabitDerivedTrainingSchedule('u1');

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const [, value] = mockSetItem.mock.calls[0];
    expect(JSON.parse(value)).toEqual({ days: [] });
    expect(mockScheduleTrainingReminders).toHaveBeenCalledTimes(1);
    dateNowSpy.mockRestore();
  });

  test('a DB read failure never throws and writes nothing', async () => {
    mockGetCompletedWorkoutStartTimestamps.mockRejectedValue(new Error('db locked'));
    await expect(refreshHabitDerivedTrainingSchedule('u1')).resolves.toBeUndefined();
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
