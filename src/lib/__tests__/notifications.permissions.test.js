/**
 * notifications.permissions.test.js
 *
 * Edge cases:
 *   - web platform always returns 'denied'
 *   - existing 'granted' short-circuits (no second prompt)
 *   - request returns whatever the OS replies
 *   - getPermissionsAsync throwing -> 'undetermined'
 *   - requestPermissionsAsync throwing -> 'undetermined'
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

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
