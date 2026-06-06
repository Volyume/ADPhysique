// Force EAS to mint a fresh iOS App Store provisioning profile when the stored
// one is stale (missing a capability the app now declares).
//
// Why this exists: EAS enables capabilities on the Bundle ID during `eas build`
// (the "Synced capabilities" step works with an App Store Connect API key, no
// Apple ID login needed), but it does NOT regenerate an already-stored
// provisioning profile just because the Bundle ID's capabilities changed. EAS
// only checks a profile's expiry, certificate and bundle id, not its
// entitlements, so a profile minted before a capability was added is judged
// "active" and shipped to Xcode, which then rejects it:
//   Provisioning profile "...AppStore..." doesn't include the Associated
//   Domains capability.
// (Confirmed from CI run #13 logs, 2026-06-05.)
//
// What this does: using the same App Store Connect API key the build already
// has, it lists the IOS_APP_STORE profiles for the bundle, reads each profile's
// embedded entitlements, and deletes ONLY the ones that are missing a required
// entitlement. EAS then has no valid App Store profile and mints a fresh one
// (with every currently-enabled capability) during the build that follows.
//
// Self-limiting and safe to leave in place: once a correct profile exists, this
// finds nothing stale and deletes nothing, so it does not churn credentials or
// force a regeneration on every build. It is scoped to one profile type and one
// bundle id, so it cannot touch certificates or other apps.
//
// Hard-fails (non-zero exit) on auth or API errors so a doomed run stops before
// the paid EAS build step, rather than after.
//
// Env:
//   ASC_KEY_ID        App Store Connect API key id
//   ASC_ISSUER_ID     issuer id
//   ASC_API_KEY_PATH  path to the .p8 private key file
//   IOS_BUNDLE_ID     bundle identifier (default: app.volyume)
//   REQUIRED_ENTITLEMENTS  comma list to require (default:
//                          com.apple.developer.associated-domains)

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
  // dsaEncoding ieee-p1363 gives the raw R||S signature JOSE/ES256 requires,
  // not the DER form openssl/Node emit by default.
  const sig = crypto.sign('SHA256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(sig)}`;
}

function request(method, url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request(
      u,
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

export function hasAllRequired(profileContentB64, required) {
  // profileContent is base64 of the .mobileprovision (a CMS/PKCS7 blob that
  // embeds a plaintext XML entitlements plist). A substring check on the
  // decoded bytes is reliable for entitlement keys.
  const text = Buffer.from(profileContentB64, 'base64').toString('latin1');
  return required.every((ent) => text.includes(ent));
}

async function main() {
  const keyId = req('ASC_KEY_ID');
  const issuerId = req('ASC_ISSUER_ID');
  const keyPath = req('ASC_API_KEY_PATH');
  const bundleId = process.env.IOS_BUNDLE_ID || 'app.volyume';
  const required = (process.env.REQUIRED_ENTITLEMENTS || 'com.apple.developer.associated-domains')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const token = makeTokenFromPem(fs.readFileSync(keyPath, 'utf8'), keyId, issuerId);

  // Page through App Store profiles, pulling each profile's content + its bundle id.
  let url =
    `${API}/v1/profiles?filter[profileType]=IOS_APP_STORE&include=bundleId` +
    `&fields[profiles]=name,profileState,profileContent,bundleId&fields[bundleIds]=identifier&limit=200`;
  const profiles = [];
  const bundleById = new Map();

  while (url) {
    const res = await request('GET', url, token);
    if (res.status !== 200) {
      console.error(`::error::App Store Connect list profiles failed (HTTP ${res.status}): ${res.body.slice(0, 500)}`);
      process.exit(1);
    }
    const json = JSON.parse(res.body);
    for (const inc of json.included || []) {
      if (inc.type === 'bundleIds') bundleById.set(inc.id, inc.attributes?.identifier);
    }
    for (const p of json.data || []) profiles.push(p);
    url = json.links?.next || null;
  }

  const mine = profiles.filter((p) => {
    const bid = p.relationships?.bundleId?.data?.id;
    return bid && bundleById.get(bid) === bundleId;
  });

  console.log(`Found ${mine.length} IOS_APP_STORE profile(s) for ${bundleId}.`);
  console.log(`Requiring entitlement(s): ${required.join(', ')}`);

  const stale = mine.filter((p) => {
    const content = p.attributes?.profileContent;
    if (!content) {
      // Can't read content: treat as stale so EAS regenerates rather than risk
      // shipping an unknown profile to Xcode.
      console.log(`  - "${p.attributes?.name}" (${p.id}): no profileContent returned, treating as stale`);
      return true;
    }
    const ok = hasAllRequired(content, required);
    console.log(`  - "${p.attributes?.name}" (${p.id}): ${ok ? 'has required entitlements, keeping' : 'MISSING required entitlements, will delete'}`);
    return !ok;
  });

  if (stale.length === 0) {
    console.log('✓ No stale profile to remove. EAS will reuse the correct profile. Nothing to do.');
    return;
  }

  for (const p of stale) {
    const res = await request('DELETE', `${API}/v1/profiles/${p.id}`, token);
    if (res.status !== 204) {
      console.error(`::error::Failed to delete profile ${p.id} (HTTP ${res.status}): ${res.body.slice(0, 500)}`);
      process.exit(1);
    }
    console.log(`✓ Deleted stale profile "${p.attributes?.name}" (${p.id}).`);
  }

  console.log('✓ Stale App Store profile(s) removed. EAS will mint a fresh one during the build.');
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(`::error::regenerate-ios-profile failed: ${err?.stack || err}`);
    process.exit(1);
  });
}
