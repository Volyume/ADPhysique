// Test stub for expo-crypto. The real module's getRandomValues is backed by a
// native secure source; in Jest we fill the array with Math.random so uuid.js's
// CSPRNG code path runs without the native module. Mirrors the real API: fills
// the typed array in place and returns it.
function getRandomValues(typedArray) {
  for (let i = 0; i < typedArray.length; i += 1) {
    typedArray[i] = Math.floor(Math.random() * 256);
  }
  return typedArray;
}

function getRandomBytes(count) {
  return getRandomValues(new Uint8Array(count));
}

// Async CSPRNG used by dbCrypto.getOrCreateDbKey for the SQLCipher key.
async function getRandomBytesAsync(count) {
  return getRandomValues(new Uint8Array(count));
}

// digestStringAsync backs progressScanStore's duplicate-pose content hash (SHA-256 of a saved
// photo's base64 bytes). Node's built-in `crypto` gives a real SHA-256 here, so tests exercise
// genuine hash-equality semantics rather than a fake stand-in.
const nodeCrypto = require('crypto');
const CryptoDigestAlgorithm = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512', MD5: 'MD5' };
const CryptoEncoding = { HEX: 'hex', BASE64: 'base64' };
async function digestStringAsync(algorithm, data, options = {}) {
  const nodeAlgo = String(algorithm || 'SHA-256').replace('SHA-', 'sha');
  const encoding = options.encoding === CryptoEncoding.BASE64 ? 'base64' : 'hex';
  return nodeCrypto.createHash(nodeAlgo).update(String(data ?? '')).digest(encoding);
}

module.exports = {
  getRandomValues,
  getRandomBytes,
  getRandomBytesAsync,
  digestStringAsync,
  CryptoDigestAlgorithm,
  CryptoEncoding,
};
