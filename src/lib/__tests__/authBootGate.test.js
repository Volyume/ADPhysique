/**
 * authBootGate — pins the Campaign 24 Wave E startup-flash law
 * (WAVE-E-FINDINGS.md item 0; founder order: "UNTIL AUTH + MINIMUM
 * ROUTING STATE ARE RESOLVED, SHOW A NEUTRAL VOLYUME LOADING/SPLASH
 * STATE. Do not speculatively render logged-out/tier UI.").
 *
 * Written to FAIL if: the splash releases before resolution; a give-up
 * on a previously-signed-in device falls to Welcome (the flash this
 * campaign fixed); or a fresh install is walled behind the retry state.
 * Plus a source-level wiring guard on RootNavigator (the screen cannot
 * mount in this Jest environment; the decision logic is exercised here
 * against the real pure function, the wiring by source pin — the house
 * convention).
 */
import fs from 'fs';
import path from 'path';
import { classifyAuthBoot } from '../authBootGate';

describe('classifyAuthBoot — the decision table', () => {
  test('unresolved auth always shows the splash, regardless of everything else', () => {
    expect(classifyAuthBoot({ initialAuthResolved: false })).toBe('splash');
    expect(classifyAuthBoot({
      initialAuthResolved: false, authGaveUp: true, hasUser: true, hadPriorSession: true,
    })).toBe('splash');
  });

  test('genuine resolution navigates (signed in and signed out alike)', () => {
    expect(classifyAuthBoot({ initialAuthResolved: true, hasUser: true })).toBe('navigate');
    expect(classifyAuthBoot({ initialAuthResolved: true, hasUser: false })).toBe('navigate');
  });

  test('THE FLASH CASE: give-up + no user + prior sign-in on this device holds on auth_retry, never Welcome', () => {
    expect(classifyAuthBoot({
      initialAuthResolved: true, authGaveUp: true, hasUser: false, hadPriorSession: true,
    })).toBe('auth_retry');
  });

  test('a fresh install (no prior-session marker) is never walled: give-up falls to the navigator/Welcome exactly as before the fix', () => {
    expect(classifyAuthBoot({
      initialAuthResolved: true, authGaveUp: true, hasUser: false, hadPriorSession: false,
    })).toBe('navigate');
  });

  test('a give-up that nevertheless has a user in state navigates (the session arrived late)', () => {
    expect(classifyAuthBoot({
      initialAuthResolved: true, authGaveUp: true, hasUser: true, hadPriorSession: true,
    })).toBe('navigate');
  });

  test('defaults are fail-quiet: no arguments means splash', () => {
    expect(classifyAuthBoot()).toBe('splash');
    expect(classifyAuthBoot({})).toBe('splash');
  });
});

describe('RootNavigator wiring (source guard)', () => {
  const NAV = fs.readFileSync(path.resolve(__dirname, '../../navigation/RootNavigator.js'), 'utf8');

  test('every give-up release site routes through the genuine-resolution ref check', () => {
    // The 8s latch, the bootstrap catch and the unhandled catch must all
    // check the ref before marking a give-up — a genuine answer that
    // already landed must never be reclassified.
    const giveUpSites = NAV.match(/if \(!authGenuinelyResolvedRef\.current\) setAuthGaveUp\(true\);/g) || [];
    expect(giveUpSites.length).toBe(3);
    // And the genuine sites mark the ref before resolving.
    expect(NAV).toMatch(/authGenuinelyResolvedRef\.current = true; \/\/ Wave E: real answer \(session found\)/);
    expect(NAV).toMatch(/authGenuinelyResolvedRef\.current = true; \/\/ Wave E: real answer \(no session\)/);
  });

  test('the retry branch renders only through the pure decision and before any routing', () => {
    expect(NAV).toMatch(/classifyAuthBoot\(\{\s*\n\s*initialAuthResolved, authGaveUp, hasUser: !!user, hadPriorSession,\s*\n\s*\}\) === 'auth_retry'/);
    // The branch must sit AFTER the splash gate and BEFORE the dbInitFailed
    // branch (which itself precedes all navigator routing).
    const splashGate = NAV.indexOf('if (!splashReady || !firstRunChecked');
    const retryBranch = NAV.indexOf("=== 'auth_retry'");
    const dbBranch = NAV.indexOf('if (dbInitFailed)');
    expect(splashGate).toBeGreaterThan(-1);
    expect(retryBranch).toBeGreaterThan(splashGate);
    expect(dbBranch).toBeGreaterThan(retryBranch);
  });

  test('the prior-session marker read is fail-quiet (a failed read can never wall a fresh install)', () => {
    expect(NAV).toMatch(/AsyncStorage\.getItem\('@volyume_last_supabase_user_id'\)\s*\n\s*\.then\(\(v\) => \{ if \(v\) setHadPriorSession\(true\); \}\)\s*\n\s*\.catch\(\(\) => \{\}\);/);
  });

  test('the consent gate ordering is untouched: the retry branch returns BEFORE the NavigationContainer renders, so no routing (consent included) is reachable from it', () => {
    // File position of stack DEFINITIONS is irrelevant (they appear above);
    // what matters is that the auth_retry early-return sits between the
    // splash gate and the navigator render, so the consent-gated routing
    // never executes while the branch is showing.
    const retryBranch = NAV.indexOf("=== 'auth_retry'");
    const navContainer = NAV.indexOf('<NavigationContainer');
    expect(retryBranch).toBeGreaterThan(-1);
    expect(navContainer).toBeGreaterThan(retryBranch);
    // And the consent gate itself still exists, untouched, in the routing.
    expect(NAV).toMatch(/healthConsent/);
  });

  test('the escape hatch exists: an explicit Go-to-sign-in action clears the give-up', () => {
    expect(NAV).toMatch(/handleAuthGiveUpToWelcome/);
    expect(NAV).toMatch(/title="Go to sign in"/);
  });
});
