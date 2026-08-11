// C7 release audit F-12: the allow-list used to hold three PLAINTEXT
// personal email addresses, compiled into every production bundle and
// trivially recoverable from the APK. The gate now compares SHA-256
// digests of the normalised address: same behaviour, no personal data
// in the binary.
//
// The public check stays SYNCHRONOUS (both callers are sync paths):
// it answers from a per-email cache and kicks off the digest in the
// background on a miss, failing CLOSED until the digest lands. The
// only effect is that the founder's first check after launch may read
// false for a few milliseconds; diagnostics-only surfaces tolerate
// that, and the export long-press re-reads live state.
import * as Crypto from 'expo-crypto';

const CALIBRATION_EXPORT_EMAIL_DIGESTS = new Set([
  'bfb2f404b57859acf24d7580d31c4bb64b75833ce6b418300c12f01c4f17b88b',
  '740e9b084d53b5d914ce411df6c12d194b9acbc5b756d8c9e98200ba1a85d128',
  '48dfc19e6a77a722d1949a269fd7dd7cac46dbface2011ca50acdd9d4654c46b',
]);

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// email -> boolean once the digest has resolved; absent while pending.
const _resolved = new Map();
const _pending = new Set();

function _resolveInBackground(email) {
  if (_pending.has(email) || _resolved.has(email)) return;
  _pending.add(email);
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email)
    .then((digest) => {
      _resolved.set(email, CALIBRATION_EXPORT_EMAIL_DIGESTS.has(String(digest).toLowerCase()));
    })
    .catch(() => { _resolved.set(email, false); /* fail closed */ })
    .finally(() => { _pending.delete(email); });
}

// Awaitable warm-up: resolves the digest for this user and returns the
// verdict. Callers that can await (and tests) use this; the sync check
// below answers from the same cache.
export async function warmCalibrationAccess(user = null) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  const email = normaliseEmail(user?.email);
  if (!email) return false;
  if (!_resolved.has(email)) {
    try {
      const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email);
      _resolved.set(email, CALIBRATION_EXPORT_EMAIL_DIGESTS.has(String(digest).toLowerCase()));
    } catch (_) { _resolved.set(email, false); /* fail closed */ }
  }
  return _resolved.get(email);
}

export function isProgressScanCalibrationExportAllowed(user = null) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  const email = normaliseEmail(user?.email);
  if (!email) return false;
  if (_resolved.has(email)) return _resolved.get(email);
  _resolveInBackground(email);
  return false; // closed until the digest resolves
}
