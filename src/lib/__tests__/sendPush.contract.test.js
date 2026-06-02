/**
 * Contract guard for the send-push Edge Function (unit 2 of the Expo
 * push stack). The function runs in Deno and can't execute under Jest,
 * so this is a source-grep contract test in the same shape as
 * rtdnWebhook.contract.test.js: it locks the security and correctness
 * invariants so a future edit can't silently regress them.
 *
 * Invariants under guard:
 *   - service-to-service auth: rejects callers without the service-role
 *     key (this endpoint can push to ANY user; a client must never be
 *     able to call it);
 *   - reads device_push_tokens scoped to the target user_id;
 *   - posts to Expo's push endpoint;
 *   - prunes DeviceNotRegistered tokens so the table self-heals;
 *   - requires user_id + title + body.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/functions/send-push/index.ts'),
  'utf8',
);

describe('send-push Edge Function contract', () => {
  test('rejects callers that do not present the service-role key', () => {
    // The handler compares the bearer token to SUPABASE_SERVICE_ROLE_KEY in
    // constant time (timingSafeEqualStr, audit ISSUE-003) and returns 401 on
    // mismatch. The guard tracks the constant-time compare so a future edit
    // can't drop it back to a timing-leaky `!==`.
    expect(SRC).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(SRC).toMatch(/timingSafeEqualStr\(\s*token,\s*serviceRoleKey\s*\)/);
    expect(SRC).toMatch(/Unauthorised/);
  });

  test('reads device_push_tokens scoped to the target user', () => {
    expect(SRC).toMatch(/from\(['"]device_push_tokens['"]\)/);
    expect(SRC).toMatch(/\.eq\(['"]user_id['"],\s*userId\)/);
  });

  test('posts to the Expo push endpoint', () => {
    expect(SRC).toMatch(/exp\.host\/--\/api\/v2\/push\/send/);
  });

  test('prunes DeviceNotRegistered tokens', () => {
    expect(SRC).toMatch(/DeviceNotRegistered/);
    expect(SRC).toMatch(/\.delete\(\)/);
    expect(SRC).toMatch(/\.in\(['"]expo_push_token['"]/);
  });

  test('requires user_id, title and body', () => {
    expect(SRC).toMatch(/user_id,\s*title and body are required/);
  });

  test('no user-facing client path: never reads a user JWT via getUser', () => {
    // Unlike delete-account, send-push must NOT authenticate via a
    // user JWT; it is service-role only. Guard against a future edit
    // turning it into a client-callable endpoint.
    expect(SRC).not.toMatch(/auth\.getUser\(\)/);
  });
});
