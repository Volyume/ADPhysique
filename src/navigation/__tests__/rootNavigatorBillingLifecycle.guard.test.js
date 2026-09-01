/**
 * Release-blocker fix (final release gate, baseline a50fba85):
 * playBilling.initialise() registers the purchase-completion listener, and
 * purchasePackage() settles its parked promise ONLY from that listener. But
 * initialise() was called from exactly ONE place - bootstrap()'s cold-launch
 * getSession() branch - and NOT from the onAuthStateChange auth-enter path.
 * A user who signed up or signed in during the SAME app session (no restart)
 * therefore reached the paywall with no listener registered: Play took the
 * payment, the awaited promise hung to its 90s E_PURCHASE_TIMEOUT, the
 * entitlement grant downstream (cascade.payAt / confirmPurchase) never ran,
 * and they were shown a purchase-failed message while already being charged.
 *
 * App.js's own comment stated the intended contract - "listeners are
 * registered inside initialise() once an authenticated user is known
 * (RootNavigator triggers initialise after sign-in)" - which the code only
 * half-honoured.
 *
 * RootNavigator is not importable under this project's jest config (no
 * native-module mocks - see rootNavigatorAuthLatch.guard.test.js and
 * rootNavigatorDbInitRecovery.guard.test.js, the established precedent), so
 * this is a scoped source guard. The module-level lifecycle behaviour it
 * depends on is pinned behaviourally in
 * src/lib/payments/__tests__/playBilling.lifecycle.test.js.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '..', 'RootNavigator.js'),
  'utf8',
);

describe('billing is initialised on the auth-enter path, not only on cold launch', () => {
  test('the auth-enter pipeline calls ensureBillingForUser for the signing-in user', () => {
    const enterIdx = src.indexOf('if (isAuthEnter) {');
    expect(enterIdx).toBeGreaterThan(-1);
    const block = src.slice(enterIdx);
    expect(block).toMatch(
      /require\('\.\.\/lib\/payments\/playBilling'\);[\s\S]{0,200}?ensureBillingForUser\(session\.user\.id\)/,
    );
  });

  test('it sits alongside the tier refresh, AFTER the account-switch/deletion aborts', () => {
    // Both abort paths return before reaching the billing call, so billing is
    // never bound to an account that is about to be signed straight back out.
    const enterIdx = src.indexOf('if (isAuthEnter) {');
    const billingIdx = src.indexOf('ensureBillingForUser(session.user.id)', enterIdx);
    const tierIdx = src.indexOf('refreshTierFromCloud(client, session.user.id)', enterIdx);
    const switchAbortIdx = src.indexOf("logInfo('SignIn.accountSwitch.kept'", enterIdx);
    expect(billingIdx).toBeGreaterThan(-1);
    expect(billingIdx).toBeGreaterThan(switchAbortIdx);
    expect(billingIdx).toBeGreaterThan(tierIdx);
  });

  test('the cold-launch bootstrap path still initialises billing (unchanged behaviour)', () => {
    const bootstrapIdx = src.indexOf('async function bootstrap()');
    const enterIdx = src.indexOf('if (isAuthEnter) {');
    const coldIdx = src.indexOf("require('../lib/payments/playBilling')", bootstrapIdx);
    expect(coldIdx).toBeGreaterThan(bootstrapIdx);
    expect(coldIdx).toBeLessThan(enterIdx);
  });

  test('both call sites are require-guarded so a module-mocking test env cannot crash boot', () => {
    // Three existing suites mock playBilling with an object that has no
    // initialise/ensureBillingForUser key; the try/require/.catch shape is
    // what keeps those green (and what the cold-launch site already used).
    const calls = src.match(/require\('\.\.\/lib\/payments\/playBilling'\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const m of ['ensureBillingForUser(session.user.id)', 'logOut?.()']) {
      const i = src.indexOf(m);
      expect(i).toBeGreaterThan(-1);
      // A try { ... } wrapper opens within the preceding ~400 chars.
      expect(src.slice(Math.max(0, i - 400), i)).toMatch(/try \{/);
    }
  });
});

describe('sign-out releases the billing session so a user switch cannot inherit it', () => {
  test('SIGNED_OUT calls playBilling.logOut()', () => {
    const idx = src.indexOf("if (event === 'SIGNED_OUT') {");
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, src.indexOf('const isAuthEnter', idx));
    expect(block).toMatch(/require\('\.\.\/lib\/payments\/playBilling'\)\.logOut\?\.\(\)/);
  });

  test('it is best-effort and can never block or fail the sign-out', () => {
    const idx = src.indexOf("if (event === 'SIGNED_OUT') {");
    const block = src.slice(idx, src.indexOf('const isAuthEnter', idx));
    expect(block).toMatch(/\.catch\(\(\) => \{\}\)/);
    expect(block).not.toMatch(/await require\('\.\.\/lib\/payments\/playBilling'\)/);
  });
});
