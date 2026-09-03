/**
 * trialStart.flow.guard.test.js
 *
 * ORIGINAL INTENT (founder repro 2026-07-02): "Start your free trial" on an
 * account whose server row already held a consumed trial reset onboarding with
 * tier still 'free' and dumped the user into the free FirstRunStack. This suite
 * pinned the two fixes: ProUpgradeScreen.completeUpgrade branching on what
 * start_cascade actually returned, and startCascade awaiting its local tier
 * mirror.
 *
 * INVERTED INTENT (founder decision 2026-09-03, fully-free product). Volyume
 * has no trial, no Free/Pro split, no paywall and no expiry. The bug above is
 * not fixed, it is DISSOLVED: there is no trial to start, so no screen may
 * start one. That is what this suite pins now - CONSENT NEVER STARTS A TRIAL,
 * and no live path arms the trial retry queue.
 *
 * The founder ruling that produced the original pins is superseded by the
 * later founder decision; the dormant machinery it guarded is not deleted, and
 * its behavioural coverage still lives in
 * src/lib/payments/__tests__/cascade.lifecycle.test.js and
 * pendingCascade.flush.test.js, which exercise the modules directly.
 *
 * Source guards (fs.readFileSync + regex) per the repo convention for locking
 * founder rules; the billing rule (docs/rules/billing.md) makes this suite the
 * written contract for the change.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const CONSENT = read('../../screens/Article9ConsentScreen.js');
const CASCADE = read('../payments/cascade.js');
const BARREL = read('../payments/index.js');

describe('consent never starts a trial', () => {
  test('the Article 9 consent path does not call the cascade at all', () => {
    expect(CONSENT).not.toMatch(/startCascade/);
    expect(CONSENT).not.toMatch(/from '\.\.\/lib\/payments'/);
    expect(CONSENT).not.toMatch(/require\('\.\.\/lib\/payments/);
  });

  test('it does not arm the trial-grant retry queue either', () => {
    expect(CONSENT).not.toMatch(/queuePendingCascade/);
    expect(CONSENT).not.toMatch(/pendingCascade/);
  });

  test('the consent gate itself is untouched: RPC, fail-closed flag, telemetry', () => {
    // Article 9 is an inviolable compliance gate (CLAUDE.md section 2). The
    // trial removal must not have weakened, reordered or skipped any of it.
    expect(CONSENT).toMatch(/record_health_consent/);
    expect(CONSENT).toMatch(/queuePendingConsent/);
    expect(CONSENT).toMatch(/article9_consent_recorded/);
    expect(CONSENT).toMatch(/healthConsentGranted\?\.\(\)/);
  });
});

describe('the billing boundary is what stops a trial being started elsewhere', () => {
  test('the payments barrel answers billing_disabled instead of calling the RPC', () => {
    expect(BARREL).toMatch(/billing_disabled/);
    expect(BARREL).toMatch(/'startCascade'/);
  });
});

describe('the dormant cascade module is preserved, not gutted', () => {
  test('startCascade still awaits its local tier mirror (unchanged behaviour)', () => {
    // If FULL_ACCESS_FOR_ALL is ever flipped back, this is the line that stops
    // the original 2026-07-02 repro coming back with it.
    expect(CASCADE).toMatch(/await st\.setTier\?\.\('pro', 'cascade\.startCascade'\)/);
    expect(CASCADE).not.toMatch(/st\.setTier\?\.\('pro', 'cascade\.startCascade'\)\.catch/);
  });

  test('the start_cascade RPC wrapper still exists (dormant, not deleted)', () => {
    expect(CASCADE).toMatch(/export async function startCascade\(\)/);
    expect(CASCADE).toMatch(/_call\('start_cascade'/);
  });
});
