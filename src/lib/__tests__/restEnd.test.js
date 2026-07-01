/**
 * A2: the end-of-rest notification backstop. The in-app timer's cues are
 * foreground-only, so this OS-scheduled alert is what reaches a locked or
 * pocketed phone. Contract: schedules a DATE trigger at the rest's end on the
 * sounding rest-alerts channel, replaces itself via a fixed identifier, never
 * schedules a past/imminent date, and cancels cleanly.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

const mockSchedule = jest.fn(() => Promise.resolve('id'));
const mockCancel = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args) => mockSchedule(...args),
  cancelScheduledNotificationAsync: (...args) => mockCancel(...args),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const { scheduleRestEndNotification, cancelRestEndNotification } = require('../notifications/restEnd');

beforeEach(() => {
  mockSchedule.mockClear();
  mockCancel.mockClear();
  mockPlatformOS = 'android';
});

describe('scheduleRestEndNotification (A2)', () => {
  test('schedules a DATE trigger at the end timestamp on the rest-alerts channel, sound on', async () => {
    const endsAt = Date.now() + 90_000;
    await scheduleRestEndNotification(endsAt);
    expect(mockCancel).toHaveBeenCalledWith('volyume_rest_end');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const arg = mockSchedule.mock.calls[0][0];
    expect(arg.identifier).toBe('volyume_rest_end');
    expect(arg.content.data).toEqual({ type: 'rest_end' });
    expect(arg.content.sound).toBe(true);
    expect(arg.trigger.channelId).toBe('rest-alerts');
    expect(arg.trigger.type).toBe('date');
    expect(arg.trigger.date.getTime()).toBe(endsAt);
  });

  test('a past or imminent end time schedules nothing (no stray instant buzz)', async () => {
    await scheduleRestEndNotification(Date.now() - 1000);
    await scheduleRestEndNotification(Date.now() + 500);
    await scheduleRestEndNotification(NaN);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('re-scheduling uses the same identifier so the previous alert is replaced', async () => {
    await scheduleRestEndNotification(Date.now() + 60_000);
    await scheduleRestEndNotification(Date.now() + 75_000);
    const ids = mockSchedule.mock.calls.map((c) => c[0].identifier);
    expect(ids).toEqual(['volyume_rest_end', 'volyume_rest_end']);
  });

  test('web: no-op', async () => {
    mockPlatformOS = 'web';
    await scheduleRestEndNotification(Date.now() + 60_000);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('cancel never throws', async () => {
    mockCancel.mockRejectedValueOnce(new Error('gone'));
    await expect(cancelRestEndNotification()).resolves.toBeUndefined();
  });

  test('copy is calm and weight-free', async () => {
    await scheduleRestEndNotification(Date.now() + 60_000);
    const { title, body } = mockSchedule.mock.calls[0][0].content;
    const blob = `${title} ${body}`.toLowerCase();
    expect(blob).not.toMatch(/weight|kcal|calorie/);
  });
});
