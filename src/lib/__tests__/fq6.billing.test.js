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

  test('both surfaces read the shared label, not their own maths', () => {
    expect(read('screens/SettingsAccountScreen.js')).toMatch(/trialEndsLabel\(userProfile\)/);
    expect(read('screens/HomeScreen.js')).toMatch(/trialEndsLabel\(useAppStore\.getState\(\)\.userProfile\)/);
  });
});

describe('FQ-6.1: the trial-grant retry', () => {
  test('network-shaped failures are retryable; definitive answers are not', () => {
    expect(isNetworkShapedError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkShapedError(new Error('ETIMEDOUT'))).toBe(true);
    expect(isNetworkShapedError(new Error('profile not found'))).toBe(false);
    expect(isNetworkShapedError(new Error('trial already used'))).toBe(false);
  });

  test('the consent screen queues only on failure, and the runner drains the queue', () => {
    // Re-anchored under D97-20 (C6 P-1): startCascade NEVER rejects, so the
    // queue arms on the RESULT (ok:false), not a .catch that never fires.
    const consent = read('screens/Article9ConsentScreen.js');
    expect(consent).toMatch(/const grant = await cascade\.startCascade\(\)/);
    expect(consent).toMatch(/queuePendingCascade\(user\?\.id, err\)/);
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
      const src = stripComments(read(f));
      expect(src).not.toMatch(/setTier\('free'/);
      expect(src).not.toMatch(/Switch to Free/);
    }
  });

  test('the manage flow routes to the platform subscription surface and states the expiry semantics', () => {
    const src = read('screens/SettingsAccountScreen.js');
    expect(src).toMatch(/Manage subscription/);
    expect(src).toMatch(/apps\.apple\.com\/account\/subscriptions/);
    expect(src).toMatch(/play\.google\.com\/store\/account\/subscriptions/);
    expect(src).toMatch(/Pro stays active until your current period ends/);
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
