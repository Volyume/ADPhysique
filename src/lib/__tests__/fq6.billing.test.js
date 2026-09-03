/**
 * fq6.billing.test.js — the FQ-6 billing test plan (D96, founder-approved
 * 2026-08-10). Billing is live; these changes were approved with explicit
 * requirements, each pinned here.
 *
 * 6.1 trial-grant retry: idempotent, network-vs-definitive distinction, no
 *     local Pro invention, drained by the sync runner.
 * 6.2 trial end date: ONE authoritative source (cascade.trialEndsAtMs),
 *     surfaced on Account and the trial banner.
 * 6.4 truthful subscription management: no local tier forgery, the platform
 *     surface owns cancellation, entitlement expiry decides Free.
 * Billing invariants: product IDs and the 14+7 trial shape untouched.
 *
 * AMENDED 2026-09-03 (fully-free product, founder decision). Volyume has no
 * trial, no Free/Pro split, no paywall and no expiry; the store/billing
 * infrastructure is retained DORMANT behind the inactive boundary in
 * lib/payments/index.js. Two pins are inverted and two are skipped, each
 * annotated in place: the consent screen no longer starts a trial, and the
 * trial-end / manage-subscription SURFACES no longer have to exist. The
 * billing INVARIANTS (product IDs, the documented 14+7 shape, "the retry
 * never invents a local entitlement") are untouched and still enforced.
 */
import fs from 'fs';
import path from 'path';
import { trialEndsAtMs, trialEndsLabel, daysRemaining } from '../payments/cascade';
import { isNetworkShapedError } from '../payments/pendingCascade';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('FQ-6.2: one authoritative trial end date', () => {
  const activeProfile = { trialState: 'pro_trial_active', proTrialEndsAt: Date.UTC(2026, 7, 24) };

  test('resolves the active trial end, in ms, from the entitlement fields', () => {
    expect(trialEndsAtMs(activeProfile)).toBe(Date.UTC(2026, 7, 24));
  });

  test('no active trial resolves to null, never a fabricated date', () => {
    expect(trialEndsAtMs({ trialState: 'cascade_expired', proTrialEndsAt: Date.UTC(2026, 7, 24) })).toBeNull();
    expect(trialEndsAtMs({})).toBeNull();
    expect(trialEndsLabel({})).toBeNull();
  });

  test('daysRemaining derives from the SAME source (no second derivation)', () => {
    const src = read('lib/payments/cascade.js');
    const fn = src.slice(src.indexOf('export function daysRemaining'));
    expect(fn.slice(0, 400)).toMatch(/trialEndsAtMs\(profile\)/);
    expect(daysRemaining(activeProfile, Date.UTC(2026, 7, 20))).toBe(4);
  });

  test('no surface invents its own trial maths (the shared label is the only source)', () => {
    // RELAXED 2026-09-03 (fully-free product). This used to REQUIRE the trial
    // banner on SettingsAccountScreen and YouScreen. There is no trial and no
    // banner to require any more, and those surfaces are being unwound. The
    // invariant that still matters, and the only one this test ever really
    // protected, is the negative: no screen derives a trial end date itself.
    for (const f of ['screens/SettingsAccountScreen.js', 'screens/YouScreen.js', 'screens/HomeScreen.js']) {
      let src;
      try { src = read(f); } catch (_) { continue; } // screen may be gone
      const stripped = stripComments(src);
      expect(stripped).not.toMatch(/proTrialEndsAt[\s\S]{0,80}Date\.now\(\)/);
    }
  });

  test.skip('both surfaces read the shared label, not their own maths', () => {
    // RE-PINNED (Campaign 22 Phase 2 Stage 2, FOUNDER-RULINGS-PHASE2 R3): the
    // trial banner -- and with it, this line -- rehomed from HomeScreen.js to
    // YouScreen.js in full (billing-adjacent flag for review: cascade.js and
    // trialEndsLabel() itself are untouched; only the calling surface moved,
    // still read-only consumption of the same shared function, still the
    // ONE authoritative source this test exists to guard). YouScreen reads
    // its own already-destructured `userProfile` (a real hook dependency of
    // its effect, unlike Home's old imperative getState() escape hatch,
    // which existed only because Home's effect did not depend on userProfile
    // at all) rather than a live store re-read.
    expect(read('screens/SettingsAccountScreen.js')).toMatch(/trialEndsLabel\(userProfile\)/);
    expect(read('screens/HomeScreen.js')).not.toMatch(/trialEndsLabel/);
    expect(read('screens/YouScreen.js')).toMatch(/trialEndsLabel\(userProfile\)/);
  });
});

describe('FQ-6.1: the trial-grant retry', () => {
  test('network-shaped failures are retryable; definitive answers are not', () => {
    expect(isNetworkShapedError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkShapedError(new Error('ETIMEDOUT'))).toBe(true);
    expect(isNetworkShapedError(new Error('profile not found'))).toBe(false);
    expect(isNetworkShapedError(new Error('trial already used'))).toBe(false);
  });

  test('INVERTED (fully free, 2026-09-03): consent never starts a trial, so nothing is queued', () => {
    // Was: the consent screen calls startCascade and queues the retry on an
    // ok:false RESULT (D97-20 / C6 P-1). Volyume has no trial now, so the call
    // and its queue arming are both gone from the consent path. The drain in
    // the sync runner is deliberately LEFT: it is idempotent, it self-exits
    // when the queue is empty, and it is the thing that finishes any retry a
    // pre-conversion device still had queued.
    const consent = read('screens/Article9ConsentScreen.js');
    expect(consent).not.toMatch(/startCascade/);
    expect(consent).not.toMatch(/queuePendingCascade/);
    const runner = read('lib/sync/runner.js');
    expect(runner).toMatch(/flushPendingCascade\(userId\)/);
  });

  test('the retry never invents a local entitlement', () => {
    const src = stripComments(read('lib/payments/pendingCascade.js'));
    expect(src).not.toMatch(/setTier|tier\s*[:=]/);
  });

  test('a definitive flush outcome clears the queue (no hammering, no duplicate grants)', () => {
    // Re-anchored under D97-20 (C6 P-1): the flush judges the resolved
    // RESULT, keeps the queue on network-shaped failures, and clears it on
    // success or a definitive refusal. Behavioural coverage lives in
    // payments/__tests__/pendingCascade.flush.test.js.
    const src = read('lib/payments/pendingCascade.js');
    const fn = src.slice(src.indexOf('export async function flushPendingCascade'));
    expect(fn).toMatch(/await clearPendingCascade\(userId\);[\s\S]{0,300}return \{ flushed: true \}/);
    expect(fn).toMatch(/isNetworkShapedError\(err\)/);
  });
});

describe('FQ-6.4: truthful subscription management', () => {
  test('no surface forges a local Free tier any more', () => {
    for (const f of ['screens/SettingsAccountScreen.js', 'screens/SubscriptionPolicyScreen.js']) {
      let src;
      try { src = stripComments(read(f)); } catch (_) { continue; } // screen may be gone
      expect(src).not.toMatch(/setTier\('free'/);
      expect(src).not.toMatch(/Switch to Free/);
    }
  });

  // DORMANT 2026-09-03 (fully-free product, founder decision). The manage-
  // subscription flow is part of the retained-but-inactive billing surface;
  // there is no subscription for a user to manage while Volyume is free, and
  // the screens carrying this copy are being unregistered. Kept, skipped, so
  // the contract is still written down for a future monetisation flip rather
  // than deleted and re-guessed.
  test.skip('the manage flow routes to the platform subscription surface and states the expiry semantics', () => {
    const src = read('screens/SettingsAccountScreen.js');
    expect(src).toMatch(/Manage subscription/);
    expect(src).toMatch(/apps\.apple\.com\/account\/subscriptions/);
    expect(src).toMatch(/play\.google\.com\/store\/account\/subscriptions/);
    expect(src).toMatch(/Pro stays active until your current period ends/);
  });
});

// The billing invariants below are UNTOUCHED by the fully-free decision and
// must stay green exactly as written: the live product identifiers and the
// documented trial shape are the things a future flip depends on being intact.
describe('fully-free product: the boundary is inactive, the infrastructure is retained', () => {
  test('the override is on and the barrel is the boundary', () => {
    const gate = read('lib/proGate.js');
    expect(gate).toMatch(/export const FULL_ACCESS_FOR_ALL = true;/);
    expect(gate).toMatch(/export const PRO_BETA_ACTIVE = FULL_ACCESS_FOR_ALL;/);
    const barrel = read('lib/payments/index.js');
    expect(barrel).toMatch(/billing_disabled/);
  });

  test('no billing module was deleted: the dormant infrastructure is all still there', () => {
    for (const f of [
      'lib/payments/cascade.js',
      'lib/payments/catalogue.js',
      'lib/payments/playBilling.js',
      'lib/payments/restore.js',
      'lib/payments/lapseDetect.js',
      'lib/payments/pendingCascade.js',
      'lib/payments/winbackState.js',
      'lib/differentialPaywall.js',
    ]) {
      expect(() => read(f)).not.toThrow();
    }
  });
});

describe('billing invariants: untouched by FQ-6', () => {
  test('product IDs unchanged', () => {
    const src = read('lib/payments/catalogue.js');
    expect(src).toMatch(/pro_monthly/);
    expect(src).toMatch(/pro_annual/);
  });

  test('the 14-day server trial + 7-day store offer shape is unchanged', () => {
    const src = read('lib/payments/cascade.js');
    expect(src).toMatch(/start_cascade/);
    // The founder-verified console fact stays recorded in the rules doc.
    const rules = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'docs', 'rules', 'billing.md'), 'utf8');
    expect(rules).toMatch(/FOUNDER-VERIFIED CONSOLE FACT/);
  });
});
