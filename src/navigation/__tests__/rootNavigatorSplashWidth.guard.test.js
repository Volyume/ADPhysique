/**
 * UI-14 (docs audit 2026-07-09/2026-07-12): SplashScreen's wordmark width
 * used to be a module-level `Dimensions.get('window')` snapshot taken once
 * at import time. Portrait/full-screen settings hide ordinary phone
 * rotation, but Android freeform/multi-window resize could leave the
 * wordmark sized for the OLD width until an unrelated remount.
 *
 * Fix: the width now derives from useWindowDimensions() inside SplashScreen
 * itself, so a resize re-renders it at the current width. RootNavigator.js
 * is not importable under this project's jest config (no native-module
 * mocks -- see e.g. rootNavigatorSheetIsolation.guard.test.js alongside
 * this file), so this is a source guard, same convention.
 */
const fs = require('fs');
const path = require('path');

const NAV = fs.readFileSync(
  path.resolve(__dirname, '..', 'RootNavigator.js'),
  'utf8',
);

describe('RootNavigator SplashScreen sizes its wordmark from live window dimensions', () => {
  test('there is no module-level frozen Dimensions.get(\'window\') splash-width constant', () => {
    expect(NAV).not.toMatch(/Dimensions\.get\('window'\)/);
    expect(NAV).not.toMatch(/^const SPLASH_W/m);
  });

  test('react-native Dimensions is no longer imported (useWindowDimensions replaces its only use)', () => {
    const importLine = NAV.split('\n').find(l => l.includes("from 'react-native'") && l.includes('import {'));
    expect(importLine).toBeTruthy();
    expect(importLine).toMatch(/useWindowDimensions/);
    expect(importLine).not.toMatch(/\bDimensions\b/);
  });

  test('SplashScreen reads width via the useWindowDimensions hook, not a frozen constant', () => {
    const fnStart = NAV.indexOf('function SplashScreen()');
    const fnEnd = NAV.indexOf('const splashStyles', fnStart);
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
    const fnBody = NAV.slice(fnStart, fnEnd);
    expect(fnBody).toMatch(/const \{ width: windowWidth \} = useWindowDimensions\(\);/);
    expect(fnBody).toMatch(/const splashW = Math\.round\(windowWidth \* 0\.7\);/);
  });

  test('the rendered Image uses the live splashW, not the old frozen SPLASH_W', () => {
    expect(NAV).toMatch(
      /style=\{\{ width: splashW, height: Math\.round\(splashW \/ HERO_ASPECT\) \}\}/,
    );
    expect(NAV).not.toMatch(/\bSPLASH_W\b/);
  });
});
