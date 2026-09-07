/**
 * deviceLocation.test.js (community product audit 2026-09-07,
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.2; founder decision 2026-09-07, "yes to both", relayed in chat:
 * `expo-location` armed for exactly one use, "Use my location" in the
 * gym finder).
 *
 * What this suite pins:
 *  - `isAvailable()` is true once the dependency resolves;
 *  - a granted permission resolves `{lat, lng}` from one low-accuracy fix;
 *  - a refused permission rejects with `code: 'denied'`, never a generic
 *    failure - the calm copy in `GymPicker` depends on telling these apart;
 *  - a fix that never lands rejects with `code: 'timeout'` after 15s,
 *    rather than hanging the picker forever;
 *  - any other failure (the module itself missing, an unexpected native
 *    throw) rejects with `code: 'unavailable'`;
 *  - the module's own CODE never watches, backgrounds, reads a cached
 *    position, or writes to any local storage (the source-guard half
 *    `community.privacy.guard.test.js`'s "the device location adapter is
 *    the only door" section does not itself re-check per PR, so it is
 *    pinned here too).
 */

jest.mock('expo-location', () => ({
  Accuracy: { Low: 2 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const Location = require('expo-location');
const { isAvailable, getApproximatePosition } = require('../deviceLocation');

beforeEach(() => {
  jest.useFakeTimers();
  Location.requestForegroundPermissionsAsync.mockReset();
  Location.getCurrentPositionAsync.mockReset();
});

afterEach(() => { jest.useRealTimers(); });

describe('isAvailable', () => {
  test('is true once the dependency resolves (this build, armed)', () => {
    expect(isAvailable()).toBe(true);
  });
});

describe('getApproximatePosition', () => {
  test('a granted permission resolves {lat, lng} from one low-accuracy fix', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 55.79, longitude: -3.99 } });

    await expect(getApproximatePosition()).resolves.toEqual({ lat: 55.79, lng: -3.99 });
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Low });
  });

  test('a refused permission rejects with code "denied", and never reads a position', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    await expect(getApproximatePosition()).rejects.toMatchObject({ code: 'denied' });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test('a fix that never lands rejects with code "timeout" after 15 seconds', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockReturnValue(new Promise(() => {})); // never settles

    const pending = getApproximatePosition();
    const assertion = expect(pending).rejects.toMatchObject({ code: 'timeout' });
    await jest.advanceTimersByTimeAsync(15000);
    await assertion;
  });

  test('an unexpected failure rejects with code "unavailable"', async () => {
    Location.requestForegroundPermissionsAsync.mockRejectedValue(new Error('native module exploded'));

    await expect(getApproximatePosition()).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('the module\'s CODE never watches, backgrounds, reads a cached fix, or persists', () => {
  test('none of the forbidden APIs or storage routes are named', () => {
    // Comments are stripped first (same convention as
    // `community.privacy.guard.test.js`'s `code()`): the header
    // deliberately documents what this file is and is not allowed to do,
    // which is the opposite of a read.
    const fs = require('fs');
    const path = require('path');
    const raw = fs.readFileSync(path.join(__dirname, '../deviceLocation.js'), 'utf8');
    const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const pattern of [
      /watchPositionAsync/,
      /getLastKnownPositionAsync/,
      /startLocationUpdatesAsync/,
      /requestBackgroundPermissionsAsync/,
      /startGeofencingAsync/,
      /AsyncStorage/,
      /SecureStore/,
      /expo-sqlite/,
    ]) {
      expect(pattern.test(source)).toBe(false);
    }
  });
});
