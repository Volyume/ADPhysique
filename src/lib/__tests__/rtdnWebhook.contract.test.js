/**
 * Regression guard for the 2026-05-26 RTDN webhook impersonation
 * bug surfaced in the external main-branch audit.
 *
 * The bug: play-billing-rtdn called the user-facing upgrade_tier
 * RPC with a fabricated x-supabase-user-id header expecting
 * PostgREST to honour it as auth.uid(). PostgREST does not; the
 * RPC ran with auth.uid() = NULL and silently failed (or worse,
 * wrote rows under the service role). Every Play Billing renewal,
 * cancellation, refund, expiry, and restart was server-side broken.
 *
 * Fix: migration 042 adds upgrade_tier_for_user(_user_id, ...) which
 * is service-role-only and takes the target user as an explicit
 * parameter. The webhook now calls that RPC with _user_id in the
 * JSON body and no impersonation header.
 *
 * This source-grep test enforces the contract so a future edit
 * cannot silently regress to the broken pattern.
 */
import fs from 'fs';
import path from 'path';

const RTDN = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/functions/play-billing-rtdn/index.ts'),
  'utf8',
);

describe('play-billing-rtdn → Supabase RPC contract', () => {
  test('calls upgrade_tier_for_user, not the auth-bound upgrade_tier', () => {
    expect(RTDN).toMatch(/\/rest\/v1\/rpc\/upgrade_tier_for_user/);
    expect(RTDN).not.toMatch(/\/rest\/v1\/rpc\/upgrade_tier['"`]/);
  });

  test('passes _user_id in the JSON body', () => {
    expect(RTDN).toMatch(/_user_id:\s*userId/);
  });

  test('does not send x-supabase-user-id header (PostgREST ignores it)', () => {
    // Match the header-syntax form ("x-supabase-user-id": value) so
    // the explanatory comment about the removed workaround can stay
    // in the source without tripping the regression guard.
    expect(RTDN).not.toMatch(/["']x-supabase-user-id["']\s*:/i);
  });
});

describe('play-billing-rtdn → payment-failure push', () => {
  test('grace action sends the subscription_payment_failure push', () => {
    // ON_HOLD (5) / IN_GRACE_PERIOD (9) map to the grace action, which
    // must fire the payment-failure push via send-push.
    expect(RTDN).toMatch(/sendPaymentFailurePush\(userId\)/);
    expect(RTDN).toMatch(/\/functions\/v1\/send-push/);
    expect(RTDN).toMatch(/subscription_payment_failure/);
  });

  test('grace still applies NO tier change (3-day timer is client-side)', () => {
    // The grace case must not call upgrade_tier_for_user; access is
    // retained during the grace window.
    const graceBlock = RTDN.slice(
      RTDN.indexOf('case "grace":'),
      RTDN.indexOf('case "renewal":'),
    );
    expect(graceBlock).toMatch(/sendPaymentFailurePush/);
    expect(graceBlock).not.toMatch(/callUpgradeTier/);
  });

  test('payment-failure push authenticates to send-push with the service-role key', () => {
    expect(RTDN).toMatch(/Bearer \$\{SUPABASE_SERVICE_ROLE_KEY\}/);
  });

  test('does not redeclare SUPABASE_SERVICE_ROLE_KEY (single top-level const)', () => {
    const decls = RTDN.match(/const SUPABASE_SERVICE_ROLE_KEY\b/g) ?? [];
    expect(decls).toHaveLength(1);
  });
});

describe('play-billing-rtdn → client verify surfaces a failed grant (SUB-001)', () => {
  test('callUpgradeTier reports success/failure rather than void', () => {
    // Must return a result the caller can act on, not swallow RPC failures.
    expect(RTDN).toMatch(/callUpgradeTier\([\s\S]*?\):\s*Promise<\{\s*ok:\s*boolean/);
    expect(RTDN).toMatch(/return\s*\{\s*ok:\s*true\s*\}/);
    expect(RTDN).toMatch(/return\s*\{\s*ok:\s*false/);
  });

  test('handleClientVerify returns 502 when the grant does not persist', () => {
    const fn = RTDN.slice(
      RTDN.indexOf('async function handleClientVerify'),
      RTDN.indexOf('serve(async (req'),
    );
    // The grant result is checked, and a failed grant returns 502 instead
    // of the 200 {ok:true} the buggy version always returned.
    expect(fn).toMatch(/const upgrade = await callUpgradeTier\(/);
    expect(fn).toMatch(/if\s*\(\s*!upgrade\.ok\s*\)/);
    expect(fn).toMatch(/jsonResponse\(502/);
  });
});

describe('play-billing-rtdn → OIDC fails closed when unconfigured (BUG-003)', () => {
  test('unset audience rejects the RTDN path unless explicit setup mode', () => {
    const fn = RTDN.slice(
      RTDN.indexOf('async function verifyPubSubOidc'),
      RTDN.indexOf('// Map Google notificationType'),
    );
    // Setup-mode escape hatch exists and is the ONLY way an unset audience
    // returns ok:true; otherwise the unset branch fails closed.
    expect(RTDN).toMatch(/RTDN_ALLOW_UNAUTHENTICATED_SETUP\s*=\s*\n?\s*\(Deno\.env\.get\("RTDN_ALLOW_UNAUTHENTICATED_SETUP"\)\s*\?\?\s*""\)\s*===\s*"true"/);
    expect(fn).toMatch(/if\s*\(\s*RTDN_ALLOW_UNAUTHENTICATED_SETUP\s*\)/);
    // The fail-closed return: unset + no setup flag → ok:false.
    expect(fn).toMatch(/return\s*\{\s*ok:\s*false,\s*reason:\s*"oidc_unconfigured"\s*\}/);
  });

  test('logs a startup warning when RTDN_OIDC_AUDIENCE is unset', () => {
    expect(RTDN).toMatch(/STARTUP: RTDN_OIDC_AUDIENCE is not set/);
  });
});
