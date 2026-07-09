/**
 * CP-7 (design-usability audit 2026-07-09,
 * docs/design-usability-audit-2026-07-09/coverage-06-competitive-hps.md) --
 * opt-in biometric app lock. The lock is an ADDITIONAL gate wrapped strictly
 * around the navigator's existing final `MainTabs` branch (via a new
 * `LockedMainTabs` wrapper); it must never appear inside renderNavigator()'s
 * routing decision itself, so it cannot affect -- and by construction cannot
 * weaken, reorder, or bypass -- the Welcome / Article 9 consent / onboarding
 * branches above it.
 *
 * RootNavigator is not importable under this jest config (no native-module
 * mocks), so this is a scoped source guard in the same style as the
 * A2-014 / ONB-001/002 consent guards alongside it.
 */

const fs = require('fs');
const path = require('path');

const NAV = fs.readFileSync(
  path.resolve(__dirname, '../navigation/RootNavigator.js'),
  'utf8',
);

const fnStart = NAV.indexOf('function renderNavigator()');
const fnEnd = NAV.indexOf('<NavigationContainer', fnStart);
const fnBody = NAV.slice(fnStart, fnEnd);

describe('CP-7 app-lock gate sits after auth + Article 9 consent, never inside them', () => {
  test('renderNavigator body is located', () => {
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
  });

  test('the existing consent/auth/onboarding routing lines are all still present, unchanged', () => {
    expect(fnBody).toMatch(/if \(!user\) return <WelcomeStack \/>;/);
    expect(fnBody).toMatch(/!user\.isLocal\s*&&\s*!firstRunComplete\s*&&\s*!healthConsentChecked/);
    expect(fnBody).toMatch(/healthConsentChecked\s*&&\s*\(healthConsent === false/);
    expect(fnBody).toMatch(/Article9ConsentStack/);
    expect(fnBody).toMatch(/consentUnresolvedForNewUser/);
    expect(fnBody).toMatch(/tier === 'pro' \? <ProOnboardingStack \/> : <FirstRunStack \/>/);
  });

  test('the final branch now renders LockedMainTabs, wrapping (not replacing) MainTabs', () => {
    expect(fnBody).toMatch(/return <LockedMainTabs \/>;/);
    // The bare, unwrapped MainTabs render this replaced must be gone from
    // this function -- it now only appears inside the LockedMainTabs
    // wrapper definition itself (checked below).
    expect(fnBody).not.toMatch(/return <MainTabs \/>;/);
  });

  test('the lock gate hook/screen are never referenced inside renderNavigator itself', () => {
    // If either symbol appeared inside the routing function body, the lock
    // could influence which branch is chosen -- it must only be reachable
    // via the LockedMainTabs wrapper, entirely outside this function.
    expect(fnBody).not.toMatch(/useAppLockGate/);
    expect(fnBody).not.toMatch(/BiometricLockScreen/);
  });

  test('the ordering comment above renderNavigator documents the gate as strictly last', () => {
    const orderCommentStart = NAV.indexOf('Navigation priority:');
    expect(orderCommentStart).toBeGreaterThan(-1);
    expect(orderCommentStart).toBeLessThan(fnStart);
  });
});

describe('CP-7 LockedMainTabs wraps MainTabs and is scoped away from the pre-MainTabs stacks', () => {
  const lockedStart = NAV.indexOf('function LockedMainTabs()');
  const lockedEnd = NAV.indexOf('function WelcomeStack()', lockedStart);
  const lockedBody = NAV.slice(lockedStart, lockedEnd);

  test('LockedMainTabs is defined and renders MainTabs underneath the lock overlay', () => {
    expect(lockedStart).toBeGreaterThan(-1);
    expect(lockedEnd).toBeGreaterThan(lockedStart);
    expect(lockedBody).toMatch(/<MainTabs\s*\/>/);
    expect(lockedBody).toMatch(/useAppLockGate/);
    expect(lockedBody).toMatch(/BiometricLockScreen/);
  });

  // Every stack mounted BEFORE a user reaches MainTabs (Welcome, Article 9
  // consent, onboarding) must never reference the lock gate: the pref can
  // only ever be switched on from Settings, which lives inside MainTabs, so
  // there is no legitimate reason for the lock to run any earlier.
  test.each([
    'function WelcomeStack()',
    'function Article9ConsentStack()',
    'function ProOnboardingStack()',
    'function FirstRunStack()',
  ])('%s does not reference the app-lock gate', (marker) => {
    const start = NAV.indexOf(marker);
    expect(start).toBeGreaterThan(-1);
    // Bound each stack's body to the next top-level `function ` declaration
    // that follows it, mirroring how the other scoped guards in this file
    // slice their regions.
    const next = NAV.indexOf('\nfunction ', start + marker.length);
    const body = NAV.slice(start, next > -1 ? next : undefined);
    expect(body).not.toMatch(/useAppLockGate/);
    expect(body).not.toMatch(/BiometricLockScreen/);
  });
});

describe('CP-7 new dependency is wired for a managed-workflow config plugin, no eject', () => {
  const PKG = fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8');
  const APP_JSON = fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf8');

  test('expo-local-authentication is declared in package.json', () => {
    expect(PKG).toMatch(/"expo-local-authentication":\s*"~?\d+\.\d+\.\d+"/);
  });

  test('app.json wires the module\'s config plugin (no eject) and an honest Face ID usage string', () => {
    expect(APP_JSON).toMatch(/"expo-local-authentication"/);
    expect(APP_JSON).toMatch(/"faceIDPermission"/);
    // The pre-existing NSFaceIDUsageDescription placeholder claimed the app
    // never uses Face ID; that became false the moment this feature shipped
    // and must not still read that way.
    expect(APP_JSON).not.toMatch(/Volyume does not use Face ID/);
  });
});
