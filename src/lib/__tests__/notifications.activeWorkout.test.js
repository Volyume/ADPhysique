/**
 * notifications/activeWorkout.js (audit D4, runtime-critical, was untested).
 *
 * The persistent workout notification is currently disabled (the set
 * numbering confused users), so showActiveWorkoutNotification must be a no-op
 * and must never schedule. dismissActiveWorkoutNotification tears down both
 * the sticky notification and the (absent) foreground service, and no-ops off
 * Android. These pin that contract so a re-enable is a conscious change.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const mockSchedule = jest.fn(() => Promise.resolve('id'));
const mockDismiss = jest.fn(() => Promise.resolve());
const mockCancel = jest.fn(() => Promise.resolve());
const mockSetChannel = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockSchedule(...a),
  dismissNotificationAsync: (...a) => mockDismiss(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancel(...a),
  setNotificationChannelAsync: (...a) => mockSetChannel(...a),
  AndroidImportance: { LOW: 2 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidNotificationPriority: { LOW: 'low' },
}));

const NOTIF_ID = 'volyume_active_workout';
const aw = require('../notifications/activeWorkout');

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
});

describe('activeWorkout notification (D4)', () => {
  test('showActiveWorkoutNotification is a no-op and never schedules (surface disabled)', async () => {
    await expect(
      aw.showActiveWorkoutNotification({ workoutName: 'Push A', currentSetIndex: 1, elapsedSeconds: 90 }),
    ).resolves.toBeUndefined();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('dismiss on Android dismisses and cancels the sticky notification', async () => {
    await aw.dismissActiveWorkoutNotification();
    expect(mockDismiss).toHaveBeenCalledWith(NOTIF_ID);
    expect(mockCancel).toHaveBeenCalledWith(NOTIF_ID);
  });

  test('dismiss is a no-op off Android', async () => {
    mockPlatformOS = 'ios';
    await aw.dismissActiveWorkoutNotification();
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
