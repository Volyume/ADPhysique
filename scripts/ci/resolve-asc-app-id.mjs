// Resolve the App Store Connect numeric app id (ascAppId) for the bundle and
// write it into eas.json's submit profile, so `eas submit` can upload to
// TestFlight non-interactively without ascAppId committed in the repo.
//
// Why: `eas submit --platform ios` needs submit.production.ios.ascAppId. That id
// is the `id` of the app resource in App Store Connect. This looks it up with the
// same ASC API key the workflow already uses (a free API call, no build credit)
// and patches eas.json in place at submit time.
//
// Fails loudly (non-zero) if the app record does not exist in App Store Connect,
// with the exact one-time action, rather than letting eas submit fail opaquely.
//
// Env:
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_API_KEY_PATH  the App Store Connect API key
//   IOS_BUNDLE_ID   bundle identifier (default app.volyume)
//   EAS_JSON_PATH   path to eas.json (default eas.json)

import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import { pathToFileURL } from 'node:url';

const API = 'https://api.appstoreconnect.apple.com';

function req(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`::error::Missing required env ${name}`);
    process.exit(1);
  }
  return v;
}

export function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function makeTokenFromPem(p8Pem, keyId, issuerId, now = Math.floor(Date.now() / 1000)) {
  const key = crypto.createPrivateKey(p8Pem);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.sign('SHA256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(sig)}`;
}

// Set submit.production.ios fields without disturbing the rest of eas.json.
// eas submit needs the App Store Connect API key in the submit profile too
// (ascApiKeyPath/ascApiKeyId/ascApiKeyIssuerId): it does NOT read the EXPO_ASC_*
// env vars that eas build uses, and without these it tries to set up a key
// interactively and fails in --non-interactive mode.
export function injectSubmitConfig(easJson, fields) {
  const ios = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v) ios[k] = v;
  }
  const next = { ...easJson };
  next.submit = { ...(next.submit || {}) };
  next.submit.production = { ...(next.submit.production || {}) };
  next.submit.production.ios = { ...(next.submit.production.ios || {}), ...ios };
  return next;
}

function request(method, url, token) {
  return new Promise((resolve, reject) => {
    const r = https.request(
      new URL(url),
      { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    r.on('error', reject);
    r.end();
  });
}

async function main() {
  const keyId = req('ASC_KEY_ID');
  const issuerId = req('ASC_ISSUER_ID');
  const keyPath = req('ASC_API_KEY_PATH');
  const bundleId = process.env.IOS_BUNDLE_ID || 'app.volyume';
  const easJsonPath = process.env.EAS_JSON_PATH || 'eas.json';

  const token = makeTokenFromPem(fs.readFileSync(keyPath, 'utf8'), keyId, issuerId);
  const res = await request(
    'GET',
    `${API}/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=bundleId,name&limit=10`,
    token,
  );
  if (res.status !== 200) {
    console.error(`::error::App Store Connect /v1/apps lookup failed (HTTP ${res.status}): ${res.body.slice(0, 500)}`);
    process.exit(1);
  }
  const apps = (JSON.parse(res.body).data || []);
  if (apps.length === 0) {
    console.error(
      `::error::No App Store Connect app record exists for bundle ${bundleId}. ` +
        'Create it once (App Store Connect > My Apps > + > New App, bundle ' +
        `${bundleId}), then re-run. TestFlight cannot accept a build until the app record exists.`,
    );
    process.exit(1);
  }
  const ascAppId = apps[0].id;
  console.log(`Resolved ascAppId ${ascAppId} for ${bundleId} ("${apps[0].attributes?.name || ''}").`);

  // eas submit needs the API key in the profile too, not just ascAppId.
  const submitFields = {
    ascAppId,
    ascApiKeyPath: keyPath,
    ascApiKeyId: keyId,
    ascApiKeyIssuerId: issuerId,
  };
  const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  fs.writeFileSync(easJsonPath, `${JSON.stringify(injectSubmitConfig(easJson, submitFields), null, 2)}\n`);
  console.log(`✓ Wrote submit.production.ios (ascAppId + ASC API key fields) into ${easJsonPath}.`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(`::error::resolve-asc-app-id failed: ${err?.stack || err}`);
    process.exit(1);
  });
}
