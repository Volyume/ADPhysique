/**
 * installNotificationListeners tests.
 *
 * Locks the contract that the notifications module owns the expo
 * listener wiring and the two telemetry firings; the navigation
 * layer only routes. CLAUDE.md Rule 5 (runtime-critical surface,
 * tests in the same commit as the change).
 */

// Jest mock factories may only reference `mock`-prefixed outer vars.
const mockTapCalls = [];
const mockReceiveCalls = [];
const mockState = { lastResponse: null, tapSubRemoved: 0, recvSubRemoved: 0 };

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn((fn) => {
    mockTapCalls.push(fn);
    return { remove: () => { mockState.tapSubRemoved += 1; } };
  }),
  addNotificationReceivedListener: jest.fn((fn) => {
    mockReceiveCalls.push(fn);
    return { remove: () => { mockState.recvSubRemoved += 1; } };
  }),
  getLastNotificationResponseAsync: jest.fn(async () => mockState.lastResponse),
}));

const mockTrackSent = jest.fn();
const mockTrackTapped = jest.fn();
jest.mock('../telemetry', () => ({
  trackNotificationSent: (...a) => mockTrackSent(...a),
  trackNotificationTapped: (...a) => mockTrackTapped(...a),
}));

const { installNotificationListeners } = require('../listeners');

beforeEach(() => {
  mockTapCalls.length = 0;
  mockReceiveCalls.length = 0;
  mockState.lastResponse = null;
  mockState.tapSubRemoved = 0;
  mockState.recvSubRemoved = 0;
  mockTrackSent.mockReset();
  mockTrackTapped.mockReset();
});

describe('installNotificationListeners', () => {
  test('installs both expo listeners and returns a disposer', () => {
    const dispose = installNotificationListeners({ onTap: () => {} });
    expect(mockTapCalls).toHaveLength(1);
    expect(mockReceiveCalls).toHaveLength(1);
    dispose();
    expect(mockState.tapSubRemoved).toBe(1);
    expect(mockState.recvSubRemoved).toBe(1);
  });

  test('dispose is idempotent', () => {
    const dispose = installNotificationListeners({ onTap: () => {} });
    dispose();
    dispose();
    expect(mockState.tapSubRemoved).toBe(1);
    expect(mockState.recvSubRemoved).toBe(1);
  });

  test('a delivered notification fires notification_sent with scheduledFor when the trigger has a date', () => {
    installNotificationListeners({ onTap: () => {} });
    const triggerDate = new Date('2026-05-27T08:00:00Z');
    mockReceiveCalls[0]({
      request: { trigger: { date: triggerDate } },
    });
    expect(mockTrackSent).toHaveBeenCalledTimes(1);
    expect(mockTrackSent.mock.calls[0][0].scheduledFor).toBe(triggerDate.toISOString());
  });

  test('a tap fires notification_tapped and forwards the response to onTap', () => {
    const onTap = jest.fn();
    installNotificationListeners({ onTap });
    const response = {
      notification: {
        request: { content: { data: { type: 'weekly_checkin' } } },
      },
    };
    mockTapCalls[0](response);
    expect(mockTrackTapped).toHaveBeenCalledTimes(1);
    expect(mockTrackTapped.mock.calls[0][0].payload).toEqual({ data_type: 'weekly_checkin' });
    expect(onTap).toHaveBeenCalledWith(response);
  });

  test('a tap with no data.type still fires telemetry with data_type:unknown and still calls onTap', () => {
    const onTap = jest.fn();
    installNotificationListeners({ onTap });
    const response = { notification: { request: { content: { data: {} } } } };
    mockTapCalls[0](response);
    expect(mockTrackTapped.mock.calls[0][0].payload).toEqual({ data_type: 'unknown' });
    expect(onTap).toHaveBeenCalled();
  });

  test('a thrown onTap does not propagate (notifications must never crash the app)', () => {
    const onTap = jest.fn(() => { throw new Error('navigation not ready'); });
    installNotificationListeners({ onTap });
    expect(() => mockTapCalls[0]({ notification: { request: { content: { data: { type: 'x' } } } } }))
      .not.toThrow();
  });

  test('cold-start: getLastNotificationResponseAsync resolves and is routed through onTap', async () => {
    mockState.lastResponse = {
      notification: { request: { content: { data: { type: 'year_of_lifts_unlock' } } } },
    };
    const onTap = jest.fn();
    installNotificationListeners({ onTap });
    // Flush the promise the listener installer fired.
    await Promise.resolve();
    await Promise.resolve();
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(mockTrackTapped).toHaveBeenCalledTimes(1);
  });

  test('cold-start: a null response is a no-op', async () => {
    mockState.lastResponse = null;
    const onTap = jest.fn();
    installNotificationListeners({ onTap });
    await Promise.resolve();
    await Promise.resolve();
    expect(onTap).not.toHaveBeenCalled();
    expect(mockTrackTapped).not.toHaveBeenCalled();
  });
});
