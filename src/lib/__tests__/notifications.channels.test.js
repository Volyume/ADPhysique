/**
 * notifications/channels.js (audit D4, runtime-critical, was untested).
 *
 * ensureNotifChannels registers the Android channels. Asserts each is
 * declared with the locked importance / sound config (training-reminders and
 * coaching-reminders are HIGH + sound, rest-timer is LOW + silent). The
 * coaching channel is required so the morning weight / check-in / coach
 * notifications post to a real channel instead of being dropped on Android 8+.
 */

const mockSetChannel = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: (...a) => mockSetChannel(...a),
  AndroidImportance: { HIGH: 4, LOW: 2 },
}));

const { ensureNotifChannels } = require('../notifications/channels');

beforeEach(() => jest.clearAllMocks());

describe('ensureNotifChannels (D4)', () => {
  test('registers training-reminders + coaching-reminders (HIGH, sound) and rest-timer (LOW, silent)', async () => {
    await ensureNotifChannels();
    expect(mockSetChannel).toHaveBeenCalledTimes(3);
    const byId = Object.fromEntries(mockSetChannel.mock.calls.map(([id, cfg]) => [id, cfg]));
    expect(byId['training-reminders']).toMatchObject({
      importance: 4, sound: 'default', enableVibrate: true, showBadge: false,
    });
    expect(byId['coaching-reminders']).toMatchObject({
      importance: 4, sound: 'default', enableVibrate: true, showBadge: true,
    });
    expect(byId['rest-timer']).toMatchObject({
      importance: 2, sound: null, enableVibrate: false, showBadge: false,
    });
  });

  test('swallows a channel-registration failure (iOS / no channel support)', async () => {
    mockSetChannel.mockRejectedValueOnce(new Error('no channels'));
    await expect(ensureNotifChannels()).resolves.toBeUndefined();
  });
});
