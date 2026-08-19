/**
 * COMP-019 / CP-2 (design-usability-audit-2026-07-09, coverage-06-competitive-hps.md)
 * — the shared-store bridge (src/lib/widgets/storage.js). Pins:
 *   - iOS calls the existing `live-activity` native module's
 *     writeWidgetSnapshot(json), never throws when that module is absent;
 *   - Android path is unaffected;
 *   - AsyncStorage always gets a sandbox copy regardless of platform.
 *
 * jest.resetModules() runs per test (each test needs its own `live-activity`
 * mock shape), so AsyncStorage is re-required fresh inside each test too —
 * requiring it once at module scope would capture a stale instance.
 *
 * 2026-08-19: the doMock calls below no longer pass { virtual: true }. Both
 * `live-activity` (package.json "file:./modules/live-activity") and
 * `react-native-android-widget` (a real dependency) RESOLVE, and a virtual
 * mock on a resolvable module poisons Jest's worker-level resolver cache -
 * the failure mode src/__tests__/screen-mount.test.js's own header documents
 * at length. It bit in the other direction here: once screen-mount had
 * resolved `live-activity` for real earlier in the same --runInBand process,
 * this file's virtual marker stopped intercepting, androidWidgetApi()'s
 * require threw, and the Android case returned false. The suite passed for
 * months only because it happened to be scheduled first. Nothing about what
 * these tests assert has changed; they simply no longer depend on the order
 * the whole suite runs in.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({ setItem: jest.fn().mockResolvedValue(undefined) }));

describe('persistWidgetSnapshot: iOS', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
  });

  test('calls the live-activity bridge writeWidgetSnapshot with the JSON string', async () => {
    const writeWidgetSnapshot = jest.fn().mockResolvedValue(true);
    jest.doMock('live-activity', () => ({ writeWidgetSnapshot }));
    const { persistWidgetSnapshot } = require('../storage');
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    const snapshot = { v: 1, nextSession: { name: 'Push' }, consistency: null, computedAt: 1 };
    const ok = await persistWidgetSnapshot(snapshot);

    expect(ok).toBe(true);
    expect(writeWidgetSnapshot).toHaveBeenCalledWith(JSON.stringify(snapshot));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@volyume_widget_snapshot_v1', JSON.stringify(snapshot));
  });

  test('never throws when the live-activity module is absent (Expo Go, pre-extension build)', async () => {
    jest.doMock('live-activity', () => { throw new Error('native module unavailable'); });
    const { persistWidgetSnapshot } = require('../storage');
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    await expect(persistWidgetSnapshot({ v: 1 })).resolves.toBe(false);
    // The AsyncStorage sandbox copy still happens (Android widget-task fallback path).
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  test('never throws when the bridge exists but writeWidgetSnapshot rejects', async () => {
    jest.doMock('live-activity', () => ({
      writeWidgetSnapshot: jest.fn().mockRejectedValue(new Error('UserDefaults unavailable')),
    }));
    const { persistWidgetSnapshot } = require('../storage');

    await expect(persistWidgetSnapshot({ v: 1 })).resolves.toBe(false);
  });
});

describe('persistWidgetSnapshot: Android unaffected', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
  });

  test('never touches the iOS bridge on Android', async () => {
    const writeWidgetSnapshot = jest.fn();
    jest.doMock('live-activity', () => ({ writeWidgetSnapshot }));
    jest.doMock('react-native-android-widget', () => ({
      setWidgetPreferences: jest.fn().mockResolvedValue(undefined),
      requestWidgetUpdate: jest.fn().mockResolvedValue(undefined),
    }));
    const { persistWidgetSnapshot } = require('../storage');

    const ok = await persistWidgetSnapshot({ v: 1 });

    expect(ok).toBe(true);
    expect(writeWidgetSnapshot).not.toHaveBeenCalled();
  });
});
