/**
 * Regression guard for the 2-tier model lock
 * (SUBSCRIPTION_AND_PAYMENT_LOCKED.md founder override 2026-05-25
 * + COMPLETE_TIER_SCOPE_LOCKED.md).
 *
 * The client must never write a legacy 3-tier trial_state. The
 * server-side upgrade_tier RPC's CHECK constraint still accepts
 * 'complete_trial_active' / 'paid_complete' for compatibility with
 * already-applied migration 030, but the locked 2-tier override
 * states they are NEVER set by code.
 *
 * Source-level guard: cascade.js's mutating verbs (payAt,
 * autoDowngrade, skipToFree, cancel, graceLapsed, refunded) must
 * not pass 'complete' as a _target_tier and must not pass any
 * complete-flavoured _reason to upgrade_tier.
 */
import fs from 'fs';
import path from 'path';

const CASCADE = fs.readFileSync(
  path.resolve(__dirname, '../cascade.js'),
  'utf8',
);

describe('cascade.js client never writes legacy 3-tier states', () => {
  test('payAt rejects target_tier !== "pro"', () => {
    expect(CASCADE).toMatch(/if\s*\(\s*targetTier\s*!==\s*['"]pro['"]\s*\)/);
  });

  test('autoDowngrade rejects target_tier !== "free"', () => {
    expect(CASCADE).toMatch(/if\s*\(\s*targetTier\s*!==\s*['"]free['"]\s*\)/);
  });

  test('skipToPro returns the 2-tier removal error', () => {
    expect(CASCADE).toMatch(/skip_to_pro_removed_in_2_tier_model/);
  });

  test('no _target_tier: "complete" literal is written from cascade.js', () => {
    // Allows _target_tier: 'pro' | 'free' but rejects 'complete'.
    expect(CASCADE).not.toMatch(/_target_tier\s*:\s*['"]complete['"]/);
  });

  test('no startCascade or payAt writes complete_trial_active', () => {
    // _trial_state lives server-side; client never writes it as a
    // string literal but check anyway.
    expect(CASCADE).not.toMatch(/['"]complete_trial_active['"]\s*(?:,|\)|;|\}|$)/);
    expect(CASCADE).not.toMatch(/['"]paid_complete['"]\s*(?:,|\)|;|\}|$)/);
  });
});
