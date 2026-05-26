/**
 * Regression guard for the 2026-05-26 ProOnboardingScreen identity
 * bug surfaced in the external main-branch audit.
 *
 * The bug: ProOnboardingScreen called migrateLocalUserId() on every
 * successful auth, including sign-in. Per
 * IDENTITY_AND_OWNERSHIP_LOCKED.md the anonymous-to-account migration
 * is the ONE legitimate user_id mutation and is only legal on
 * signup. LoginScreen has always had the gate; ProOnboardingScreen
 * had to be retrofitted.
 *
 * This test asserts the source file structure stays correct so a
 * future edit cannot silently re-introduce the bug. It complements
 * scripts/check-identity-invariant.sh, which only watches SQL-level
 * 'SET user_id' mutations.
 */
import fs from 'fs';
import path from 'path';

const PRO_ONBOARDING = fs.readFileSync(
  path.resolve(__dirname, '../../screens/ProOnboardingScreen.js'),
  'utf8',
);

describe('ProOnboardingScreen identity gate', () => {
  test('calls migrateLocalUserId inside an authMode === "signup" branch', () => {
    const lines = PRO_ONBOARDING.split('\n');
    const callLineIdx = lines.findIndex(l => /migrateLocalUserId\s*\(/.test(l));
    expect(callLineIdx).toBeGreaterThan(-1);
    // The gate must appear in the 6 lines preceding the call.
    const window = lines.slice(Math.max(0, callLineIdx - 6), callLineIdx).join('\n');
    expect(window).toMatch(/authMode\s*===\s*['"]signup['"]/);
  });

  test('bulkUploadLocalData is also gated to authMode === "signup"', () => {
    const lines = PRO_ONBOARDING.split('\n');
    const callLineIdx = lines.findIndex(l => /bulkUploadLocalData\s*\(/.test(l));
    expect(callLineIdx).toBeGreaterThan(-1);
    const window = lines.slice(Math.max(0, callLineIdx - 6), callLineIdx).join('\n');
    expect(window).toMatch(/authMode\s*===\s*['"]signup['"]/);
  });
});
