/**
 * notifications.permissions.test.js
 *
 * Edge cases:
 *   - web platform always returns 'denied'
 *   - existing 'granted' short-circuits (no second prompt)
 *   - request returns whatever the OS replies
 *   - getPermissionsAsync throwing -> 'undetermined'
 *   - requestPermissionsAsync throwing -> 'undetermined'
 *
 * Activation-funnel elevation (lead activation ruling, 2026-09-03):
 * notification_permission_requested fires on every path above, with the
 * status normalised to the closed enum, gated on a signed-in user, and
 * never blocking or changing the function's own return value.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

let mockUserId = 'user-1';
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: mockUserId ? { id: mockUserId } : null }) },
}));

const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../telemetry', () => ({ track: (...a) => mockTrack(...a) }));

const Notifications = require('expo-notifications');
const {
  requestNotificationPermissions,
  getNotificationPermissionStatus,
} = require('../notifications/permissions');

describe('requestNotificationPermissions', () => {
  beforeEach(() => {
    Notifications.getPermissionsAsync.mockReset();
    Notifications.requestPermissionsAsync.mockReset();
    mockPlatformOS = 'android';
  });

  test('returns "denied" on web without touching the OS', async () => {
    mockPlatformOS = 'web';
    expect(await requestNotificationPermissions()).toBe('denied');
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('short-circuits to "granted" when already granted, without re-prompting', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    expect(await requestNotificationPermissions()).toBe('granted');
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('prompts when not granted; relays OS response', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    expect(await requestNotificationPermissions()).toBe('granted');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledWith(
      expect.objectContaining({ ios: expect.objectContaining({ allowSound: false }) }),
    );
  });

  test('returns "denied" when user denies', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    expect(await requestNotificationPermissions()).toBe('denied');
  });

  test('returns "undetermined" when getPermissionsAsync throws', async () => {
    Notifications.getPermissionsAsync.mockRejectedValue(new Error('native bridge down'));
    expect(await requestNotificationPermissions()).toBe('undetermined');
  });

  test('returns "undetermined" when requestPermissionsAsync throws', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    Notifications.requestPermissionsAsync.mockRejectedValue(new Error('boom'));
    expect(await requestNotificationPermissions()).toBe('undetermined');
  });
});

describe('getNotificationPermissionStatus', () => {
  beforeEach(() => {
    Notifications.getPermissionsAsync.mockReset();
    mockPlatformOS = 'android';
  });

  test('returns "denied" on web without calling the OS', async () => {
    mockPlatformOS = 'web';
    expect(await getNotificationPermissionStatus()).toBe('denied');
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  test('returns the current OS status', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    expect(await getNotificationPermissionStatus()).toBe('granted');
  });

  test('returns "undetermined" when getPermissionsAsync throws (no prompt side effect)', async () => {
    Notifications.getPermissionsAsync.mockRejectedValue(new Error('off'));
    expect(await getNotificationPermissionStatus()).toBe('undetermined');
  });
});

describe('notification_permission_requested telemetry', () => {
  beforeEach(() => {
    Notifications.getPermissionsAsync.mockReset();
    Notifications.requestPermissionsAsync.mockReset();
    mockTrack.mockClear();
    mockPlatformOS = 'android';
    mockUserId = 'user-1';
  });

  test('emits with the normalised status on a granted result', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await requestNotificationPermissions();
    expect(mockTrack).toHaveBeenCalledWith('user-1', 'notification_permission_requested', { status: 'granted' });
  });

  test('emits "denied" and "undetermined" verbatim (real, standard OS statuses)', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await requestNotificationPermissions();
    expect(mockTrack).toHaveBeenCalledWith('user-1', 'notification_permission_requested', { status: 'denied' });

    mockTrack.mockClear();
    Notifications.requestPermissionsAsync.mockRejectedValue(new Error('boom'));
    await requestNotificationPermissions();
    expect(mockTrack).toHaveBeenCalledWith('user-1', 'notification_permission_requested', { status: 'undetermined' });
  });

  test('emits "unknown" on web rather than a fabricated "denied" (no real prompt happened)', async () => {
    mockPlatformOS = 'web';
    const result = await requestNotificationPermissions();
    expect(result).toBe('denied'); // return value is unchanged for existing callers
    expect(mockTrack).toHaveBeenCalledWith('user-1', 'notification_permission_requested', { status: 'unknown' });
  });

  test('never fires without a signed-in user, and never throws', async () => {
    mockUserId = null;
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await requestNotificationPermissions();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('never blocks or changes the resolved permission status', async () => {
    mockTrack.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    Notifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await expect(requestNotificationPermissions()).resolves.toBe('granted');
  });
});
