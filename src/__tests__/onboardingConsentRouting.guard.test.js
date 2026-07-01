/**
 * ONB-001 / ONB-002 regression guard. renderNavigator used to pick an
 * onboarding branch (Pro vs Free) as soon as a user was signed in, before the
 * Article 9 consent check had resolved. While that check is in flight a
 * brand-new Pro-path account has tier=null and firstRunComplete=false, so it
 * fell through to FirstRunStack (the free flow) and flashed it before the
 * consent gate and the trial grant landed. The fix holds such an account on a
 * blocking resolver (SplashScreen) until healthConsentChecked is true.
 *
 * RootNavigator is not importable under this jest config (no native-module
 * mocks), so this is a scoped source guard in the same style as the
 * A2-014 consent guard alongside it.
 */

const fs = require('fs');
const path = require('path');

const NAV = fs.readFileSync(
  path.resolve(__dirname, '../navigation/RootNavigator.js'),
  'utf8',
);

// Scope to renderNavigator's body: from its declaration to the
// NavigationContainer render that follows it.
const fnStart = NAV.indexOf('function renderNavigator()');
const fnEnd = NAV.indexOf('<NavigationContainer', fnStart);
const fnBody = NAV.slice(fnStart, fnEnd);

describe('ONB-001/002 consent resolves before an onboarding branch is chosen', () => {
  test('renderNavigator body is located', () => {
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
  });

  test('a real signed-in account waits on a resolver until consent is checked', () => {
    // The blocking guard: signed in, not local, not yet through first run,
    // and the consent check has not resolved -> hold on the splash resolver.
    expect(fnBody).toMatch(
      /!user\.isLocal\s*&&\s*!firstRunComplete\s*&&\s*!healthConsentChecked/,
    );
  });

  test('the resolver guard runs BEFORE the Pro-vs-Free onboarding branch', () => {
    const resolverIdx = fnBody.indexOf('!healthConsentChecked');
    const branchIdx = fnBody.indexOf('ProOnboardingStack');
    expect(resolverIdx).toBeGreaterThan(-1);
    expect(branchIdx).toBeGreaterThan(-1);
    // If the branch were evaluated first, the Free flow could flash.
    expect(resolverIdx).toBeLessThan(branchIdx);
  });

  test('the Article 9 consent gate is still present after the resolver', () => {
    expect(fnBody).toMatch(/healthConsentChecked\s*&&\s*\(healthConsent === false/);
    expect(fnBody).toMatch(/Article9ConsentStack/);
  });

  // audit 2026-07-01 #7/#12: a NEW user (onboarding unfinished) whose consent is
  // UNRESOLVED (null, after a transient consent-read failure) must ALSO route to
  // the Article 9 gate, not fall through to onboarding — otherwise health data
  // is processed with no recorded consent and a Pro-intent signup lands in the
  // free flow (the cascade that sets tier='pro' only fires once consent is
  // granted at the gate).
  test('a new user with unresolved (null) consent is routed to the gate', () => {
    expect(fnBody).toMatch(/healthConsent == null\s*&&\s*!firstRunComplete/);
    const unresolvedIdx = fnBody.indexOf('consentUnresolvedForNewUser');
    const gateIdx = fnBody.indexOf('Article9ConsentStack');
    expect(unresolvedIdx).toBeGreaterThan(-1);
    expect(unresolvedIdx).toBeLessThan(gateIdx);
  });
});
