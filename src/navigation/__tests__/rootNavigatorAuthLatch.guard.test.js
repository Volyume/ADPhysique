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
});
