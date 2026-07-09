/**
 * E6B Live Activity wiring (approved 2026-07-02; plan in
 * docs/live-activity-viability-2026-07-02.md §3). What must hold:
 *
 *   - the JS module is a graceful no-op when the native side is absent
 *     (Android, Expo Go, iOS < 16.1, missing extension) — no call site may
 *     ever throw into the rest-timer flow;
 *   - all FIVE lifecycle call sites exist in the store and every one is
 *     wrapped in the same best-effort try/catch + lazy-require pattern as
 *     the restEnd notification (start, adjust, stop, natural expiry, and
 *     the launch sweep that clears a killed session's stale Activity);
 *   - set numbering stays OUT of the start payload (the "Set 3 of 2"
 *     confusion class the founder retired on Android);
 *   - the build prerequisites the viability audit found missing stay
 *     present: the podspec, the config plugin registered in app.json,
 *     NSSupportsLiveActivities on the app target, and no @main widget file
 *     inside the autolinked ios/ directory.
 */
import fs from 'fs';
import path from 'path';

// expo-modules-core eagerly wires a native JS logger at import time and
// crashes in the node env (SDK 54); the mock also reproduces exactly the
// shape under test — requireNativeModule throwing where no native module
// exists (Android / Expo Go / node).
jest.mock('expo-modules-core', () => ({
  requireNativeModule: () => { throw new Error('native module unavailable'); },
}));

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');
}

describe('live-activity JS module: graceful absence', () => {
  test('every API resolves as a no-op with no native module (node env)', async () => {
    // requireNativeModule throws in node, which is exactly the Android /
    // Expo Go shape the module must tolerate.
    const la = require('../../../modules/live-activity/index.ts');
    expect(la.isAvailable()).toBe(false);
    await expect(la.startRestActivity({ exerciseName: 'Bench', endTimeMs: Date.now() + 60000 })).resolves.toBeNull();
    await expect(la.updateRestActivity({ endTimeMs: Date.now() + 90000 })).resolves.toBe(false);
    await expect(la.endRestActivity()).resolves.toBeUndefined();
    await expect(la.endAllActivities()).resolves.toBeUndefined();
  });

  // CP-2 (design-usability-audit-2026-07-09): the widget-snapshot bridge
  // must be just as tolerant of a missing native module as every other API
  // here — src/lib/widgets/storage.js calls it unconditionally on iOS.
  test('writeWidgetSnapshot resolves false with no native module (node env)', async () => {
    const la = require('../../../modules/live-activity/index.ts');
    await expect(la.writeWidgetSnapshot(JSON.stringify({ v: 1 }))).resolves.toBe(false);
  });
});

describe('store wiring: five lifecycle sites, all best-effort', () => {
  const store = read('src/store/useAppStore.js');

  test('startRestTimer starts the Activity at the wall-clock anchor, without set numbering', () => {
    const at = store.indexOf('startRestTimer:');
    const body = store.slice(at, store.indexOf('stopRestTimer:'));
    expect(body).toMatch(/require\('live-activity'\)/);
    expect(body).toMatch(/startRestActivity\(\{/);
    expect(body).toMatch(/endTimeMs: endsAt/);
    expect(body).not.toMatch(/setNumber|totalSets/);
  });

  test('addRestTime updates the Activity to the adjusted end time', () => {
    const at = store.indexOf('addRestTime:');
    const body = store.slice(at, store.indexOf('tickRestTimer:'));
    expect(body).toMatch(/updateRestActivity\(\{ endTimeMs: nextEndsAt \}\)/);
  });

  test('stopRestTimer and natural expiry both end the Activity', () => {
    const stopAt = store.indexOf('stopRestTimer:');
    const stopBody = store.slice(stopAt, store.indexOf('addRestTime:'));
    expect(stopBody).toMatch(/endRestActivity\(\)/);
    const tickAt = store.indexOf('tickRestTimer:');
    const tickBody = store.slice(tickAt, store.indexOf('// Workout prefs'));
    expect(tickBody).toMatch(/endRestActivity\(\)/);
  });

  test('launch restore sweeps stale Activities from a killed session', () => {
    const at = store.indexOf('restoreActiveWorkout:');
    const body = store.slice(at, at + 1200);
    expect(body).toMatch(/endAllActivities\(\)/);
  });

  test('every live-activity call site is lazy-required inside try/catch (never blocks the timer)', () => {
    const sites = store.split("require('live-activity')").length - 1;
    expect(sites).toBe(5);
    // Each require sits inside a try block with a swallowing catch nearby.
    let idx = 0;
    for (let i = 0; i < sites; i++) {
      idx = store.indexOf("require('live-activity')", idx + 1);
      const before = store.slice(Math.max(0, idx - 500), idx);
      const after = store.slice(idx, idx + 700);
      expect(before).toMatch(/try \{/);
      expect(after).toMatch(/catch \(_\) \{\}/);
      expect(after).toMatch(/\.catch\(\(\) => \{\}\)/);
    }
  });
});

describe('build prerequisites the viability audit found missing', () => {
  test('the podspec exists and compiles only the app-side bridge (no @main)', () => {
    const podspec = read('modules/live-activity/ios/LiveActivity.podspec');
    expect(podspec).toMatch(/s\.dependency 'ExpoModulesCore'/);
    expect(podspec).toMatch(/s\.source_files = '\*\.swift'/);
    // The @main widget bundle must live OUTSIDE the autolinked ios/ dir.
    expect(fs.existsSync(path.resolve(__dirname, '../../..', 'modules/live-activity/ios/VolyumeWidgetBundle.swift'))).toBe(false);
    expect(fs.existsSync(path.resolve(__dirname, '../../..', 'modules/live-activity/widget/VolyumeWidgetBundle.swift'))).toBe(true);
    // The shared attributes compile into BOTH targets: app pod + extension.
    expect(fs.existsSync(path.resolve(__dirname, '../../..', 'modules/live-activity/ios/VolyumeRestTimerAttributes.swift'))).toBe(true);
  });

  test('app.json registers the widget plugin and NSSupportsLiveActivities', () => {
    const app = JSON.parse(read('app.json'));
    expect(app.expo.plugins).toContain('./plugins/withVolyumeWidget');
    expect(app.expo.ios.infoPlist.NSSupportsLiveActivities).toBe(true);
  });

  test('the config plugin targets the right extension shape', () => {
    const plugin = read('plugins/withVolyumeWidget.js');
    expect(plugin).toMatch(/com\.apple\.widgetkit-extension/);
    expect(plugin).toMatch(/app\.volyume\.widget/);
    expect(plugin).toMatch(/DEPLOYMENT_TARGET = '16\.1'/);
    expect(plugin).toMatch(/if \(proj\.pbxTargetByName\(WIDGET_NAME\)\) return proj;/); // idempotent
    expect(plugin).toMatch(/NSSupportsLiveActivities/); // on the extension plist too
  });

  // CP-2 (design-usability-audit-2026-07-09, coverage-06-competitive-hps.md):
  // the home/lock-screen WidgetKit widget added to the SAME extension, its
  // App Group entitlement wiring, and the native bridge that publishes data
  // to it.
  test('the home/lock-screen widget source is compiled into the extension, not the app pod', () => {
    const plugin = read('plugins/withVolyumeWidget.js');
    expect(plugin).toMatch(/VolyumeHomeWidgets\.swift/);
    expect(fs.existsSync(path.resolve(__dirname, '../../..', 'modules/live-activity/ios/VolyumeHomeWidgets.swift'))).toBe(false);
    expect(fs.existsSync(path.resolve(__dirname, '../../..', 'modules/live-activity/widget/VolyumeHomeWidgets.swift'))).toBe(true);
  });

  test('VolyumeWidgetBundle registers both home-screen widgets alongside the Live Activity', () => {
    const bundle = read('modules/live-activity/widget/VolyumeWidgetBundle.swift');
    expect(bundle).toMatch(/VolyumeRestTimerLiveActivity\(\)/);
    expect(bundle).toMatch(/VolyumeNextSessionWidget\(\)/);
    expect(bundle).toMatch(/VolyumeConsistencyWidget\(\)/);
  });

  test('the home widget only ever reads nextSession/consistency fields, never body data', () => {
    let widgetSource = read('modules/live-activity/widget/VolyumeHomeWidgets.swift');
    // Strip comments (the header doc legitimately explains the privacy rule
    // in prose) and SwiftUI's `weight: .bold`-style font-weight modifier
    // calls (an unrelated "weight" collision) before checking for real body
    // data leaking into the widget.
    widgetSource = widgetSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    widgetSource = widgetSource.replace(/weight:\s*\.\w+/g, '');
    expect(widgetSource).not.toMatch(/weight|kcal|calorie|macro|bodyfat/i);
  });

  test('the App Group entitlement is declared on both the app target and the extension target', () => {
    const app = JSON.parse(read('app.json'));
    expect(app.expo.ios.entitlements['com.apple.security.application-groups']).toContain('group.app.volyume.widget');
    const plugin = read('plugins/withVolyumeWidget.js');
    expect(plugin).toMatch(/group\.app\.volyume\.widget/);
    expect(plugin).toMatch(/CODE_SIGN_ENTITLEMENTS/);
  });

  test('LiveActivityModule exposes writeWidgetSnapshot writing to the same App Group + key storage.js uses', () => {
    const native = read('modules/live-activity/ios/LiveActivityModule.swift');
    expect(native).toMatch(/AsyncFunction\("writeWidgetSnapshot"\)/);
    expect(native).toMatch(/group\.app\.volyume\.widget/);
    expect(native).toMatch(/widget_snapshot_v1/);
    expect(native).toMatch(/WidgetCenter\.shared\.reloadAllTimelines\(\)/);

    const storage = read('src/lib/widgets/storage.js');
    expect(storage).toMatch(/group\.app\.volyume\.widget/);
    expect(storage).toMatch(/widget_snapshot_v1/);
  });
});
