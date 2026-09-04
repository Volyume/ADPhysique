/**
 * D148 (founder, 2026-09-04): there is no brand splash inside the app. The
 * native splash covers the boot and hides when the boot gate lifts; every
 * later gate (consent resolver, sign-out re-gate, app lock) holds on a bare
 * background so Welcome or Today simply appears. This replaces the UI-14
 * guard on the old animated wordmark's width, which no longer exists.
 */
const fs = require('fs');
const path = require('path');

const NAV = fs.readFileSync(path.join(__dirname, '..', 'RootNavigator.js'), 'utf8');

describe('RootNavigator SplashScreen is a bare hold, not a second brand moment', () => {
  test('the in-app splash renders only the background', () => {
    const fnStart = NAV.indexOf('function SplashScreen()');
    const fnEnd = NAV.indexOf('const splashStyles', fnStart);
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = NAV.slice(fnStart, fnEnd);
    expect(fnBody).toMatch(/return <View style=\{splashStyles\.container\} \/>;/);
    expect(fnBody).not.toMatch(/Image|Animated|wordmark|TAGLINE|accent/);
  });

  test('no frozen window-width constant and no wordmark asset remain', () => {
    expect(NAV).not.toMatch(/Dimensions\.get\('window'\)/);
    expect(NAV).not.toMatch(/^const SPLASH_W/m);
    expect(NAV).not.toMatch(/SPLASH_HERO/);
  });

  test('the native splash still hides exactly when the boot gate lifts', () => {
    expect(NAV).toMatch(/const bootGateResolved = splashReady && firstRunChecked && tierChecked && initialAuthResolved;/);
    expect(NAV).toMatch(/require\('expo-splash-screen'\)\.hideAsync\(\)/);
  });
});
