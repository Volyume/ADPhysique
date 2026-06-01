/**
 * Single source for client-generated row ids (A2-036). Three modules carried
 * their own copy of this v4-shaped generator (sync queue, food db, external
 * import) and the store carried a fourth, dead one. Consolidating them here
 * meant the CSPRNG upgrade could be a one-line change in one place.
 *
 * A2-020: ids now come from expo-crypto's getRandomValues, a CSPRNG backed by
 * the platform's secure random source, instead of Math.random. A Math.random
 * fallback stays so two environments without the native module keep working:
 * the Jest runner, and the frozen closed-test build that predates this
 * dependency. The output keeps the exact v4 shape and prefix behaviour, so
 * every existing caller and every stored id is unaffected.
 *
 * Pending: on-device verification that expo-crypto's native module resolves in
 * the next build (it is additive and falls back safely until then).
 */
import * as Crypto from 'expo-crypto';

/**
 * `count` random bytes from the platform CSPRNG, or Math.random if
 * expo-crypto's native source is not available (frozen build / test runner).
 * Never throws.
 *
 * @param {number} count
 * @returns {Uint8Array}
 */
export function secureRandomBytes(count) {
  try {
    if (Crypto && typeof Crypto.getRandomValues === 'function') {
      return Crypto.getRandomValues(new Uint8Array(count));
    }
  } catch (_) {
    // expo-crypto imported but the native module is not linked: fall through.
  }
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) out[i] = (Math.random() * 256) & 0xff;
  return out;
}

/**
 * RFC 4122 version-4 id as a 36-char string.
 *
 * @param {string} [prefixChar] optional single character to start the id with,
 *   replacing the first hex digit. The sync queue uses 'q' to tag its rows; the
 *   output keeps the exact same shape the inline copy produced.
 * @returns {string}
 */
export function generateUUID(prefixChar) {
  const b = secureRandomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant (8, 9, a or b)
  let hex = '';
  for (let i = 0; i < 16; i += 1) hex += b[i].toString(16).padStart(2, '0');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return prefixChar ? prefixChar + uuid.slice(1) : uuid;
}
