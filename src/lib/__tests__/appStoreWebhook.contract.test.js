/**
 * Contract guard for the Apple App Store Edge Functions, the iOS siblings of
 * play-billing-rtdn. Source-grep tests (the functions are Deno, not jest-run),
 * locking the security + grant contract so a future edit cannot silently
 * regress it. Mirrors rtdnWebhook.contract.test.js.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../supabase/functions');
const SHARED = fs.readFileSync(path.join(root, '_shared/appStore.ts'), 'utf8');
const VERIFY = fs.readFileSync(path.join(root, 'app-store-verify/index.ts'), 'utf8');
const NOTIFS = fs.readFileSync(path.join(root, 'app-store-notifications/index.ts'), 'utf8');

describe('_shared/appStore → Supabase RPC contract', () => {
  test('calls upgrade_tier_for_user, not the auth-bound upgrade_tier', () => {
    expect(SHARED).toMatch(/\/rest\/v1\/rpc\/upgrade_tier_for_user/);
    expect(SHARED).not.toMatch(/\/rest\/v1\/rpc\/upgrade_tier['"`]/);
  });
  test('passes _user_id in the JSON body, no impersonation header', () => {
    expect(SHARED).toMatch(/_user_id:\s*userId/);
    expect(SHARED).not.toMatch(/["']x-supabase-user-id["']\s*:/i);
  });
  test('authenticates to send-push with the service-role key', () => {
    expect(SHARED).toMatch(/Bearer \$\{SUPABASE_SERVICE_ROLE_KEY\}/);
  });
  test('App Store Server API JWT is ES256 with the configured key id + issuer', () => {
    expect(SHARED).toMatch(/alg:\s*"ES256"/);
    expect(SHARED).toMatch(/appstoreconnect-v1/);
    expect(SHARED).toMatch(/ASC_KEY_ID/);
    expect(SHARED).toMatch(/ASC_ISSUER_ID/);
  });
});

describe('app-store-verify → trusts Apple, not the client JWS', () => {
  test('re-fetches the authoritative transaction from Apple before granting', () => {
    expect(VERIFY).toMatch(/getTransactionInfo\(/);
  });
  test('routes the grant by Apple-returned appAccountToken (the buyer id)', () => {
    expect(VERIFY).toMatch(/const userId = tx\.appAccountToken/);
  });
  test('rejects an inactive (revoked/expired) transaction', () => {
    expect(VERIFY).toMatch(/not_active/);
  });
  test('returns 502 when the grant does not persist (matches the Google contract)', () => {
    expect(VERIFY).toMatch(/const upgrade = await callUpgradeTier\(/);
    expect(VERIFY).toMatch(/if\s*\(\s*!upgrade\.ok\s*\)/);
    expect(VERIFY).toMatch(/jsonResponse\(502/);
  });
});

describe('app-store-notifications → authoritative-status guards', () => {
  test('decides tier from the re-fetched subscription status, not the POST body', () => {
    expect(NOTIFS).toMatch(/getSubscriptionStatus\(/);
  });
  test('a purchase grant requires an active/grace authoritative status', () => {
    const block = NOTIFS.slice(NOTIFS.indexOf('case "purchase":'), NOTIFS.indexOf('case "grace":'));
    expect(block).toMatch(/APPLE_STATUS\.ACTIVE/);
    expect(block).toMatch(/callUpgradeTier\(userId, "pro"/);
    expect(block).not.toMatch(/status\s*===\s*null/);
  });
  test('an EXPIRED notification only downgrades if Apple confirms it (no forged downgrade)', () => {
    const block = NOTIFS.slice(NOTIFS.indexOf('case "expire":'), NOTIFS.indexOf('case "refund":'));
    expect(block).toMatch(/APPLE_STATUS\.EXPIRED/);
    expect(block).toMatch(/still active; no downgrade/);
    expect(block).not.toMatch(/status\s*===\s*null/);
  });
  test('failed authoritative lookup ACKs without routing by the claimed token', () => {
    expect(NOTIFS).toMatch(/if\s*\(\s*!authoritative\s*\)/);
    expect(NOTIFS).toMatch(/authoritative Apple lookup failed; no tier change/);
    expect(NOTIFS).toMatch(/const userId = authoritative\.tx\.appAccountToken/);
    expect(NOTIFS).not.toMatch(/authoritative\?\.tx\.appAccountToken\s*\?\?/);
  });
  test('refund/revoke cannot downgrade an Apple-active transaction', () => {
    const block = NOTIFS.slice(NOTIFS.indexOf('case "refund":'), NOTIFS.indexOf('case "ignore":'));
    expect(block).toMatch(/APPLE_STATUS\.REVOKED/);
    expect(block).toMatch(/not terminal; no downgrade/);
  });
  test('grace keeps Pro and fires the payment-failure push', () => {
    const block = NOTIFS.slice(NOTIFS.indexOf('case "grace":'), NOTIFS.indexOf('case "expire":'));
    expect(block).toMatch(/sendPaymentFailurePush\(userId\)/);
  });
});
