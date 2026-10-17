/**
 * Final audit 2026-10-17, B6: withdrawing Article 9 consent removes the
 * local "consented" cache (@volyume_health_consent_<uid>) FIRST, before the
 * audit RPC and before the account delete runs.
 *
 * Why: the delete wipes AsyncStorage only once the cloud delete has
 * succeeded. Offline, it aborts, and a cache still reading 'true' would let
 * the next sign-in's cache-first consent read (readHealthConsentStatus)
 * restore consent the person has just withdrawn. Removal must also never
 * block the withdrawal: a failure is logged and the withdrawal goes on.
 *
 * The hook drives alerts and native modules, so it is source-pinned (the
 * repo convention for this file, see useAccountActions.guard.test.js).
 */
const fs = require('fs');
const path = require('path');

const HOOK = fs.readFileSync(path.resolve(__dirname, '../useAccountActions.js'), 'utf8');

function withdrawBody() {
  const start = HOOK.indexOf('async function handleWithdrawConsent()');
  const end = HOOK.indexOf('return {', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return HOOK.slice(start, end);
}

describe('B6: consent withdrawal clears the consent cache before anything can fail', () => {
  test('the cache key is the shared one the consent read uses', () => {
    expect(HOOK).toMatch(/import \{ healthConsentCacheKey \} from '\.\.\/lib\/consent\/healthConsentRead';/);
    expect(withdrawBody()).toMatch(/await AsyncStorage\.removeItem\(healthConsentCacheKey\(user\.id\)\);/);
  });

  test('removal runs before the audit RPC, the in-memory flip and the delete', () => {
    const body = withdrawBody();
    const removeAt = body.indexOf('AsyncStorage.removeItem(healthConsentCacheKey(user.id))');
    const rpcAt = body.indexOf("sb.rpc('record_health_consent'");
    const flipAt = body.indexOf('setHealthConsent(false, true);');
    const deleteAt = body.indexOf("await performDeleteAccount('consent_withdrawal');");
    expect(removeAt).toBeGreaterThan(-1);
    expect(rpcAt).toBeGreaterThan(removeAt);
    expect(flipAt).toBeGreaterThan(removeAt);
    expect(deleteAt).toBeGreaterThan(removeAt);
  });

  test('a removal failure is logged and never blocks the withdrawal', () => {
    const body = withdrawBody();
    expect(body).toMatch(/catch \(cacheErr\) \{\s*\n\s*logError\('SettingsScreen\.withdrawConsent\.cache', cacheErr/);
  });
});
