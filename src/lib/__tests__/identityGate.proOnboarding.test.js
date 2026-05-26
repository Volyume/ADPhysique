/**
 * Regression guard for the IDENTITY_AND_OWNERSHIP_LOCKED.md
 * anti-patterns: anonymous mode of any kind, migrateLocalUserId,
 * "Continue locally" sign-in-skip path, initLocalUser bootstrap.
 *
 * Replaces the earlier identityGate.proOnboarding.test.js which
 * locked the signup-only GATE on a function the locked spec said
 * to delete. With migrateLocalUserId removed (rule 5), the right
 * guard is "these symbols never come back".
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');
}

describe('IDENTITY_AND_OWNERSHIP_LOCKED.md anti-patterns', () => {
  test('database.js has no migrateLocalUserId export', () => {
    const src = read('src/lib/database.js');
    expect(src).not.toMatch(/export\s+(async\s+)?function\s+migrateLocalUserId\b/);
  });

  test('database.js has no runtime UPDATE ... SET user_id call without LOCKED-OK annotation', () => {
    // scripts/check-identity-invariant.sh enforces this at CI; this
    // test additionally asserts no NEW unannotated SET user_id has
    // crept in since the last grep.
    const src = read('src/lib/database.js');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/SET\s+user_id/.test(lines[i])) {
        const window = lines.slice(Math.max(0, i - 10), i).join('\n');
        expect(window).toMatch(/LOCKED-OK/);
      }
    }
  });

  test('useAppStore.js has no initLocalUser action', () => {
    const src = read('src/store/useAppStore.js');
    expect(src).not.toMatch(/^\s*initLocalUser\s*:\s*async/m);
  });

  test('LoginScreen.js has no handleContinueLocally', () => {
    const src = read('src/screens/LoginScreen.js');
    expect(src).not.toMatch(/function\s+handleContinueLocally\b/);
    expect(src).not.toMatch(/Continue locally/);
  });

  test('LoginScreen.js does not import or call migrateLocalUserId', () => {
    const src = read('src/screens/LoginScreen.js');
    // Comments referencing the deleted symbol (for context) are fine.
    // Reject import/require/function-call shapes.
    expect(src).not.toMatch(/import\s+\{[^}]*migrateLocalUserId[^}]*\}/);
    expect(src).not.toMatch(/require\([^)]*migrateLocalUserId/);
    expect(src).not.toMatch(/(^|[^\w.])migrateLocalUserId\s*\(/m);
  });

  test('ProOnboardingScreen.js does not import or call migrateLocalUserId', () => {
    const src = read('src/screens/ProOnboardingScreen.js');
    expect(src).not.toMatch(/import\s+\{[^}]*migrateLocalUserId[^}]*\}/);
    expect(src).not.toMatch(/require\([^)]*migrateLocalUserId/);
    expect(src).not.toMatch(/(^|[^\w.])migrateLocalUserId\s*\(/m);
  });

  test('RootNavigator.js bootstrap does not call initLocalUser', () => {
    const src = read('src/navigation/RootNavigator.js');
    expect(src).not.toMatch(/initLocalUser\s*\(/);
  });

  test('WelcomeScreen.js routes both Free and Pro to Login', () => {
    // Spec scenario A: "User taps Free or Pro on Welcome. Both
    // route to sign-up."
    const src = read('src/screens/WelcomeScreen.js');
    expect(src).toMatch(/navigation\.navigate\(\s*['"]Login['"]/);
    // Sanity: neither CTA still calls initLocalUser.
    expect(src).not.toMatch(/initLocalUser/);
  });
});
