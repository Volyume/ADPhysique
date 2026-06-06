// Node-runnable guard for regenerate-ios-profile.mjs. Run: node scripts/ci/regenerate-ios-profile.test.mjs
// The iOS workflow runs this before the credit-spending build, so a regression
// in the JWT signer or the entitlement check fails fast and free, rather than
// silently no-op-ing and shipping a stale profile to Xcode.
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { makeTokenFromPem, hasAllRequired } from './regenerate-ios-profile.mjs';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

// A throwaway P-256 key in PKCS8 PEM, the same shape as an App Store Connect .p8.
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const p8 = privateKey.export({ type: 'pkcs8', format: 'pem' });

check('JWT has three parts with an ES256 header and ASC claims', () => {
  const now = 1750000000;
  const jwt = makeTokenFromPem(p8, 'ABC123KEYID', 'issuer-uuid-1234', now);
  const [h, p] = jwt.split('.');
  assert.equal(jwt.split('.').length, 3);
  const header = JSON.parse(Buffer.from(h, 'base64url').toString());
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  assert.deepEqual(header, { alg: 'ES256', kid: 'ABC123KEYID', typ: 'JWT' });
  assert.equal(payload.iss, 'issuer-uuid-1234');
  assert.equal(payload.aud, 'appstoreconnect-v1');
  assert.equal(payload.iat, now);
  assert.equal(payload.exp, now + 900);
});

check('JWT signature is a verifiable 64-byte raw ES256 signature', () => {
  const jwt = makeTokenFromPem(p8, 'K', 'I');
  const [h, p, s] = jwt.split('.');
  const sig = Buffer.from(s, 'base64url');
  assert.equal(sig.length, 64, 'ES256 must be raw R||S (64 bytes), not DER');
  const verified = crypto.verify(
    'SHA256',
    Buffer.from(`${h}.${p}`),
    { key: publicKey, dsaEncoding: 'ieee-p1363' },
    sig,
  );
  assert.equal(verified, true);
});

check('hasAllRequired detects a present entitlement in profile content', () => {
  const content = Buffer.from(
    'pkcs7...<key>com.apple.developer.associated-domains</key><array/>...',
  ).toString('base64');
  assert.equal(hasAllRequired(content, ['com.apple.developer.associated-domains']), true);
});

check('hasAllRequired flags a missing entitlement (the stale-profile case)', () => {
  const content = Buffer.from('pkcs7...<key>com.apple.developer.healthkit</key><true/>...').toString('base64');
  assert.equal(hasAllRequired(content, ['com.apple.developer.associated-domains']), false);
});

check('hasAllRequired requires every entitlement, not just one', () => {
  const content = Buffer.from('...<key>com.apple.developer.associated-domains</key>...').toString('base64');
  assert.equal(
    hasAllRequired(content, ['com.apple.developer.associated-domains', 'com.apple.developer.healthkit']),
    false,
  );
});

console.log(`\n${passed} checks passed.`);
