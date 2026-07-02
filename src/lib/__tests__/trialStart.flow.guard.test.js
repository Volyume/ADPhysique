/**
 * Trial-start flow guards (founder repro 2026-07-02, fix approved "Proceed").
 *
 * The bug: "Start your free trial" on an account whose server row already
 * holds a consumed trial (e.g. a deleted-then-recreated test account) reset
 * onboarding with tier still 'free' and dumped the user into the free
 * FirstRunStack — no trial, no purchase sheet, no error. Two causes:
 * completeUpgrade swallowed start_cascade's result, and the local tier
 * mirror inside startCascade was fire-and-forget while RootNavigator routes
 * onboarding on store.tier.
 *
 * Behavioural coverage for the RPC wrapper lives in payments.cascade.test.js;
 * the screen flow is pinned by scoped source guards per the repo convention
 * (billing rule: docs/rules/billing.md — this suite is the written contract).
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const SCREEN = read('../../screens/ProUpgradeScreen.js');
const CASCADE = read('../payments/cascade.js');

describe('completeUpgrade branches on what start_cascade actually returns', () => {
  test('a failed RPC stays put: no resetFirstRun before the ok-check', () => {
    expect(SCREEN).toMatch(/if \(!trial\.ok\) \{/);
    const okCheck = SCREEN.indexOf('if (!trial.ok) {');
    const failReturn = SCREEN.indexOf('return;', okCheck);
    const resetAfter = SCREEN.indexOf('await resetFirstRun()', okCheck);
    expect(okCheck).toBeGreaterThan(-1);
    // The failure branch returns BEFORE any onboarding reset.
    expect(failReturn).toBeGreaterThan(okCheck);
    expect(resetAfter === -1 || resetAfter > failReturn).toBe(true);
  });

  test('a consumed/expired server state falls through to the purchase, not free onboarding', () => {
    expect(SCREEN).toMatch(/const trialLive = ts === 'pro_trial_active' \|\| ts === 'complete_trial_active';/);
    const notLive = SCREEN.indexOf('if (!trialLive) {');
    expect(notLive).toBeGreaterThan(-1);
    const subscribeInBranch = SCREEN.indexOf('await subscribePro();', notLive);
    const branchEnd = SCREEN.indexOf('return;', subscribeInBranch);
    expect(subscribeInBranch).toBeGreaterThan(notLive);
    expect(branchEnd).toBeGreaterThan(subscribeInBranch);
  });

  test('the tier is confirmed pro before onboarding is reset (routing keys on it)', () => {
    const tierCheck = SCREEN.indexOf("if (useAppStore.getState().tier !== 'pro') {");
    const reset = SCREEN.indexOf('await resetFirstRun()', tierCheck);
    expect(tierCheck).toBeGreaterThan(-1);
    expect(reset).toBeGreaterThan(tierCheck);
  });
});

describe('startCascade awaits the local tier mirror', () => {
  test('setTier is awaited, not fire-and-forget', () => {
    expect(CASCADE).toMatch(/await st\.setTier\?\.\('pro', 'cascade\.startCascade'\)/);
    expect(CASCADE).not.toMatch(/st\.setTier\?\.\('pro', 'cascade\.startCascade'\)\.catch/);
  });
});
