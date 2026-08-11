/**
 * campaign7.releaseConfig.test.js — durable release-config laws from the
 * Campaign 7 release-delta audit. Pins app.json facts a drive-by config
 * edit could silently break.
 */
const fs = require('fs');
const path = require('path');

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'));
const expo = appJson.expo;

describe('C7 release-config laws', () => {
  test('identity is the single production family', () => {
    expect(expo.ios.bundleIdentifier).toBe('app.volyume');
    expect(expo.android.package).toBe('app.volyume');
    expect(expo.scheme).toBe('volyume');
  });

  test('the E6A rest-timer permissions stay declared (they are NOT dead)', () => {
    // C7 correction, caught by e6aRestSurvival.guard: the audit lane
    // called these dead because the SESSION sticky flag
    // (USE_FOREGROUND_SERVICE=false) is off - but modules/rest-timer-live
    // hosts a live shortService foreground service whose own manifest
    // relies on the app-level FOREGROUND_SERVICE declaration, and it
    // upgrades the end-of-rest alarm to setExactAndAllowWhileIdle behind
    // canScheduleExactAlarms(). Removing either would break the shipped
    // rest timer. Both founder-approved E6A (2026-07-02).
    expect(expo.android.permissions).toContain('android.permission.FOREGROUND_SERVICE');
    expect(expo.android.permissions).toContain('android.permission.SCHEDULE_EXACT_ALARM');
    // The RESTRICTED alarm permission must never creep in (Play limits it
    // to alarm-clock/calendar apps).
    expect(expo.android.permissions).not.toContain('android.permission.USE_EXACT_ALARM');
  });

  test('no cardio/health permission or module ships', () => {
    const raw = JSON.stringify(appJson);
    expect(raw).not.toMatch(/health_connect|healthkit|BODY_SENSORS|ACTIVITY_RECOGNITION/i);
  });

  test('iOS Universal Links entitlement matches the live AASA host', () => {
    expect(expo.ios.associatedDomains).toEqual(['applinks:volyume.app']);
    const aasa = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', '.well-known', 'apple-app-site-association'), 'utf8'));
    expect(aasa.applinks.details[0].appID.endsWith('app.volyume')).toBe(true);
  });

  test('the Android https app link is scoped to the partner path the AASA claims', () => {
    const https = expo.android.intentFilters.flatMap((f) => f.data ?? []).find((d) => d.host === 'volyume.app');
    expect(https.pathPrefix).toBe('/partner');
  });

  test('package-visibility query actions are BARE names (the plugin prepends the prefix)', () => {
    const plugins = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties');
    const intents = plugins[1].android.manifestQueries.intent;
    for (const i of intents) expect(i.action).not.toMatch(/^android\.intent/);
  });

  test('cleartext stays off and backups stay off', () => {
    const bp = expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-build-properties')[1];
    expect(bp.android.usesCleartextTraffic).toBe(false);
    expect(expo.android.allowBackup).toBe(false);
  });
});
