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
  // D149 (2026-09-05): the gate now carries one bypass, freshInstallOpen,
  // which is true only for a VERIFIED fresh install (no owner marker and
  // no stored auth session, classifyFreshInstall) and still requires the
  // fast flags; the auth latch remains the gate for every other device.
  test('the splash gate waits on the one-shot initialAuthResolved latch', () => {
    expect(src).toMatch(
      /if \(!freshInstallOpen && \(!splashReady \|\| !firstRunChecked \|\| !tierChecked \|\| !initialAuthResolved\)\) \{\s*return <SplashScreen \/>;/
    );
    expect(src).toMatch(/const freshInstallOpen = freshInstall && splashReady && firstRunChecked && tierChecked;/);
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
    // RE-PINNED (Campaign 24 Wave E, WAVE-E-FINDINGS.md item 0 /
    // hostile-review F1): the failsafe now records a GIVE-UP when it fires
    // without a genuine getSession answer, so a previously-signed-in device
    // holds on the bounded retry state instead of flashing WelcomeStack.
    // The invariant this suite pins — a hard 8s timeout exists and is
    // cleaned up — is unchanged and strengthened (see authBootGate.test.js
    // for the give-up semantics' own pins).
    expect(src).toMatch(/const authLatchTimer = setTimeout\(\(\) => \{\s*\n\s*if \(!authGenuinelyResolvedRef\.current\) setAuthGaveUp\(true\);\s*\n\s*setInitialAuthResolved\(true\);\s*\n\s*\}, 8000\);/);
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
    // D149: the frame also lifts for a verified fresh install, and for
    // nothing else.
    expect(src).toMatch(/const nativeFrameLifts = bootGateResolved \|\| freshInstallOpen;/);
    expect(src).toMatch(/if \(!nativeFrameLifts\) return;[\s\S]{0,220}?require\('expo-splash-screen'\)\.hideAsync\(\)/);
    const app = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'App.js'), 'utf8');
    // App.js's only remaining hide is inside the failsafe timer.
    expect(app).toMatch(/const failsafe = setTimeout\(\(\) => \{ SplashScreen\.hideAsync\(\)\.catch\(\(\) => \{\}\); \}, 12000\)/);
    expect(app).not.toMatch(/if \(!themeReady\) return;\s*SplashScreen\.hideAsync/);
  });
});
