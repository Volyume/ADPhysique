// Node-runnable guard for resolve-asc-app-id.mjs. Run: node scripts/ci/resolve-asc-app-id.test.mjs
// Runs free in CI before the submit, so a broken JWT signer or a botched eas.json
// patch fails fast instead of corrupting the submit profile.
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { makeTokenFromPem, injectSubmitConfig } from './resolve-asc-app-id.mjs';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok - ${name}`);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const p8 = privateKey.export({ type: 'pkcs8', format: 'pem' });

check('JWT is a verifiable ES256 token with ASC claims', () => {
  const jwt = makeTokenFromPem(p8, 'KID', 'ISS', 1750000000);
  const [h, p, s] = jwt.split('.');
  assert.equal(jwt.split('.').length, 3);
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  assert.equal(payload.aud, 'appstoreconnect-v1');
  assert.equal(payload.iss, 'ISS');
  const sig = Buffer.from(s, 'base64url');
  assert.equal(sig.length, 64);
  assert.equal(
    crypto.verify('SHA256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, sig),
    true,
  );
});

check('injectSubmitConfig writes ios fields and preserves siblings', () => {
  const eas = {
    build: { production: { env: { APP_VARIANT: 'production' } } },
    submit: { production: { android: { track: 'internal' } } },
  };
  const out = injectSubmitConfig(eas, {
    ascAppId: '1234567890',
    ascApiKeyPath: '/tmp/key.p8',
    ascApiKeyId: 'KID',
    ascApiKeyIssuerId: 'ISS',
  });
  assert.equal(out.submit.production.ios.ascAppId, '1234567890');
  assert.equal(out.submit.production.ios.ascApiKeyPath, '/tmp/key.p8');
  assert.equal(out.submit.production.ios.ascApiKeyId, 'KID');
  assert.equal(out.submit.production.ios.ascApiKeyIssuerId, 'ISS');
  assert.equal(out.submit.production.android.track, 'internal');
  assert.equal(out.build.production.env.APP_VARIANT, 'production');
});

check('injectSubmitConfig creates the submit path and skips empty values', () => {
  const out = injectSubmitConfig({ build: {} }, { ascAppId: '999', ascApiKeyPath: '', ascApiKeyId: undefined });
  assert.equal(out.submit.production.ios.ascAppId, '999');
  assert.equal('ascApiKeyPath' in out.submit.production.ios, false);
  assert.equal('ascApiKeyId' in out.submit.production.ios, false);
});

console.log(`\n${passed} checks passed.`);
