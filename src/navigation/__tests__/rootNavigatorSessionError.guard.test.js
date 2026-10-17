/**
 * Final audit 2026-10-17, B1 + B2: a signed-in person must never be dropped
 * on Welcome because an offline token refresh failed, and consent left
 * unresolved must be re-resolved later rather than stay null all session.
 *
 * B1. auth-js answers an expired access token refreshed offline with
 * { data: { session: null }, error } and KEEPS the refresh token. The boot
 * path and the retry button used to read only `data.session`, so that answer
 * looked like "signed out": the boot path marked it a genuine resolution and
 * the navigator rendered Welcome. Pinned here: the pure classifier
 * (classifySessionRead) against real inputs, and its wiring at both reads.
 *
 * B2. Consent resolution ran only in the SIGNED_IN / INITIAL_SESSION enter
 * pipeline. Pinned here: a re-resolution runs the SAME shared read on
 * TOKEN_REFRESHED, foreground and reconnect, applies only while consent is
 * still null for the same user (never overwrites a real answer), leaves a
 * failed read untouched (fail CLOSED), and never hard-codes a grant.
 *
 * RootNavigator cannot mount under this Jest config (native modules), so the
 * wiring is source-pinned, the house convention for this file.
 */
import fs from 'fs';
import path from 'path';
import { classifySessionRead, classifyAuthBoot } from '../../lib/authBootGate';

const NAV = fs.readFileSync(path.resolve(__dirname, '..', 'RootNavigator.js'), 'utf8');

function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('B1: classifySessionRead', () => {
  test('a session with a user is a session', () => {
    expect(classifySessionRead({ data: { session: { user: { id: 'u' } } }, error: null })).toBe('session');
  });

  test('a null session WITH an error is unresolved, never signed out (the offline refresh)', () => {
    const offline = { data: { session: null }, error: { name: 'AuthRetryableFetchError', message: 'Network request failed' } };
    expect(classifySessionRead(offline)).toBe('unresolved');
  });

  test('a null session with no error is the only definitive signed-out answer', () => {
    expect(classifySessionRead({ data: { session: null }, error: null })).toBe('signed_out');
  });

  test('a missing result is unresolved', () => {
    expect(classifySessionRead(undefined)).toBe('unresolved');
  });

  test('an unresolved boot on this install holds the retry state, not Welcome', () => {
    // What the boot path sets on 'unresolved': gave up, with a prior session.
    expect(classifyAuthBoot({
      initialAuthResolved: true, authGaveUp: true, hasUser: false, hadPriorSession: true,
    })).toBe('auth_retry');
  });
});

describe('B1: the boot read honours the error', () => {
  const boot = sliceBetween(NAV, 'async function bootstrap()', '// No cloud session. Validate local state');

  test('the boot read classifies the whole result, including a thrown read', () => {
    expect(boot).toMatch(/sessionResult = await client\.auth\.getSession\(\);/);
    expect(boot).toMatch(/catch \(readErr\) \{\s*sessionResult = \{ data: \{ session: null \}, error: readErr \};/);
    expect(boot).toMatch(/if \(classifySessionRead\(sessionResult\) === 'unresolved'\) \{/);
    // The old destructure that dropped `error` must not come back.
    expect(NAV).not.toMatch(/const \{ data: \{ session \} \} = await client\.auth\.getSession\(\);/);
  });

  test('an unresolved read is a give-up, never a genuine answer, and returns before the no-session path', () => {
    const branch = sliceBetween(boot, "if (classifySessionRead(sessionResult) === 'unresolved') {", 'const session = sessionResult');
    expect(branch).toMatch(/setAuthGaveUp\(true\);/);
    expect(branch).toMatch(/setHadPriorSession\(true\);/);
    expect(branch).toMatch(/setInitialAuthResolved\(true\);/);
    expect(branch).toMatch(/return;/);
    expect(branch).not.toMatch(/authGenuinelyResolvedRef\.current = true/);
  });
});

describe('B1: the retry button honours the error', () => {
  const retry = sliceBetween(NAV, 'const handleAuthRetry = useCallback(async () => {', 'const handleAuthGiveUpToWelcome');

  test('an unresolved read stays on the retry state', () => {
    const unresolvedAt = retry.indexOf("if (classifySessionRead(result) === 'unresolved') {");
    const resolvedAt = retry.indexOf('authGenuinelyResolvedRef.current = true;');
    expect(unresolvedAt).toBeGreaterThan(-1);
    expect(resolvedAt).toBeGreaterThan(unresolvedAt);
    const branch = retry.slice(unresolvedAt, resolvedAt);
    expect(branch).toMatch(/return;/);
    expect(branch).not.toMatch(/setAuthGaveUp\(false\)/);
  });
});

describe('B2: the consent re-resolution', () => {
  const retry = sliceBetween(NAV, 'const retryUnresolvedHealthConsent = useCallback(', 'const retryUnresolvedHealthConsentRef');

  test('it runs the SAME shared read the sign-in path uses', () => {
    expect(retry).toMatch(/readHealthConsentStatus\(\{/);
    const signIn = sliceBetween(NAV, 'Article 9 health-data consent check', 'Local-only edits made while signed out');
    expect(signIn).toMatch(/readHealthConsentStatus\(\{/);
  });

  test('only for a signed-in user whose consent is still unresolved', () => {
    expect(retry).toMatch(/if \(!uid \|\| before\.user\?\.isLocal\) return;/);
    expect(retry).toMatch(/if \(before\.healthConsent != null\) return;/);
  });

  test('never overwrites a real answer or another account', () => {
    expect(retry).toMatch(/if \(now\.user\?\.id !== uid \|\| now\.healthConsent != null\) return;/);
  });

  test('fails CLOSED: a failed read changes nothing, and nothing hard-codes a grant', () => {
    const unresolvedAt = retry.indexOf("if (consentRead.status === 'unresolved') return;");
    const applyAt = retry.indexOf('now.setHealthConsent(granted, true);');
    expect(unresolvedAt).toBeGreaterThan(-1);
    expect(applyAt).toBeGreaterThan(unresolvedAt);
    expect(retry).toMatch(/const granted = consentRead\.status === 'granted';/);
    expect(retry).not.toMatch(/setHealthConsent\(\s*true/);
    expect(retry).not.toMatch(/healthConsentGranted/);
  });

  test('fires on TOKEN_REFRESHED after the user is published', () => {
    const setUserAt = NAV.indexOf('setUser(session?.user ?? null);');
    const hookAt = NAV.indexOf("retryUnresolvedHealthConsentRef.current?.('token_refreshed');");
    expect(setUserAt).toBeGreaterThan(-1);
    expect(hookAt).toBeGreaterThan(setUserAt);
    expect(NAV).toMatch(/if \(event === 'TOKEN_REFRESHED' && session\?\.user\?\.id\) \{\s*\n\s*retryUnresolvedHealthConsentRef\.current\?\.\('token_refreshed'\);/);
  });

  test('fires on foreground and on a network reconnect edge', () => {
    expect(NAV).toMatch(/if \(state === 'active'\) retryUnresolvedHealthConsentRef\.current\?\.\('foreground'\);/);
    expect(NAV).toMatch(/if \(prevConnected === false && connected === true\) \{\s*\n\s*retryUnresolvedHealthConsentRef\.current\?\.\('network'\);/);
  });

  test('the gate routing a new user sees is unchanged', () => {
    expect(NAV).toMatch(/const consentUnresolvedForNewUser = healthConsent == null && !firstRunComplete;/);
    expect(NAV).toMatch(/if \(user && !user\.isLocal && healthConsentChecked && \(healthConsent === false \|\| consentUnresolvedForNewUser\)\) \{\s*\n\s*return <Article9ConsentStack \/>;/);
  });
});
