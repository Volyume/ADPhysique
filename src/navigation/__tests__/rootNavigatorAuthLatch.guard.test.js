/**
 * Founder defect (2026-07-12, TestFlight): every cold launch flashed the
 * Welcome (free/Pro tier) page for a beat even when signed in. The splash
 * gate released on the two fast AsyncStorage flags (firstRunChecked /
 * tierChecked) while the initial getSession() restore was still queued
 * behind awaited SQLCipher init + migrations in bootstrap(), so
 * renderNavigator hit its `!user -> WelcomeStack` branch until the session
 * landed.
 *
 * Pins the fix's full contract so no half can regress alone:
 *   1. the splash gate waits on the one-shot initialAuthResolved latch;
 *   2. every bootstrap resolution path flips the latch (session found,
 *      no-session, bootstrap catch, unhandled rejection);
 *   3. the hard timeout failsafe exists so the latch can never hang the
 *      splash;
 *   4. the gate still deliberately does NOT wait on the live isAuthLoading
 *      flag -- gating on it caused the OAuth loop on ProOnboarding Step 1
 *      (it flips true on every SIGNED_IN and unmounted the active stack).
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '..', 'RootNavigator.js'),
  'utf8',
);

describe('RootNavigator initial-auth splash latch (founder defect 2026-07-12)', () => {
  test('the splash gate waits on the one-shot initialAuthResolved latch', () => {
    expect(src).toMatch(
      /if \(!splashReady \|\| !firstRunChecked \|\| !tierChecked \|\| !initialAuthResolved\) \{\s*return <SplashScreen \/>;/
    );
  });

  test('every bootstrap resolution path flips the latch', () => {
    // Session-found path, no-session path, bootstrap catch: three inline
    // call sites inside bootstrap(), plus the unhandled-rejection handler.
    const inline = src.match(/setInitialAuthResolved\(true\)/g) || [];
    expect(inline.length).toBeGreaterThanOrEqual(4);
    // The unhandled-rejection handler specifically.
    expect(src).toMatch(/bootstrap\(\)\.catch\(\(e\) => \{[\s\S]{0,200}?setInitialAuthResolved\(true\);/);
  });

  test('the hard timeout failsafe exists and is cleaned up', () => {
    expect(src).toMatch(/const authLatchTimer = setTimeout\(\(\) => setInitialAuthResolved\(true\), 8000\)/);
    expect(src).toMatch(/clearTimeout\(authLatchTimer\)/);
  });

  test('the gate still does not wait on the live isAuthLoading flag (OAuth-loop regression)', () => {
    expect(src).not.toMatch(/if \([^)]*isAuthLoading[^)]*\) \{\s*return <SplashScreen \/>;/);
  });

  test('the latch is a one-shot useState, never reset to false anywhere', () => {
    expect(src).toMatch(/const \[initialAuthResolved, setInitialAuthResolved\] = useState\(false\)/);
    expect(src).not.toMatch(/setInitialAuthResolved\(false\)/);
  });

  // Founder defect (2026-07-13, Android walk): the latch made the JS
  // SplashScreen visible AFTER the native splash, reading as two loading
  // screens. Single-splash contract: the native splash hides exactly when
  // the boot gate lifts (here), and App.js no longer hides it on
  // themeReady (only a hard failsafe timer remains there).
  test('the native splash hides when the boot gate lifts, not on themeReady', () => {
    expect(src).toMatch(/const bootGateResolved = splashReady && firstRunChecked && tierChecked && initialAuthResolved/);
    expect(src).toMatch(/if \(!bootGateResolved\) return;[\s\S]{0,220}?require\('expo-splash-screen'\)\.hideAsync\(\)/);
    const app = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'App.js'), 'utf8');
    // App.js's only remaining hide is inside the failsafe timer.
    expect(app).toMatch(/const failsafe = setTimeout\(\(\) => \{ SplashScreen\.hideAsync\(\)\.catch\(\(\) => \{\}\); \}, 12000\)/);
    expect(app).not.toMatch(/if \(!themeReady\) return;\s*SplashScreen\.hideAsync/);
  });
});
