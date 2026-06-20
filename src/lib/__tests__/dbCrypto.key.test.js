/**
 * SQLCipher key helper (audit F-004).
 *
 * getOrCreateDbKey is the only part of dbCrypto that can run under node —
 * the migration itself is native SQLCipher and MUST be device-tested. These
 * tests pin the key contract that the encryption depends on:
 *   - a valid stored key is reused verbatim (the DB only opens with the same key)
 *   - a missing key is generated as 64 hex chars / 256-bit and persisted once
 *   - a malformed stored value is replaced, never returned (would brick decrypt)
 *   - SecureStore failures never throw (encryption must not crash app start)
 *
 * The mock functions are defined inside the jest.mock factory (not mutated
 * later) because `import * as` copies the module namespace at import time — a
 * lazily-populated object would be empty when dbCrypto reads it.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
}));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn(),
}));

const SecureStore = require('expo-secure-store');
const Crypto = require('expo-crypto');
const { getOrCreateDbKey } = require('../dbCrypto');

// 32 deterministic bytes -> a known 64-char hex string.
function seq32() {
  return Uint8Array.from(Array.from({ length: 32 }, (_, i) => i));
}
const SEQ_HEX = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const VALID = 'a'.repeat(64);

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue(undefined);
  Crypto.getRandomBytesAsync.mockResolvedValue(seq32());
});

describe('getOrCreateDbKey', () => {
  test('reuses an existing valid key verbatim, never regenerates', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce(VALID);

    const key = await getOrCreateDbKey();

    expect(key).toBe(VALID);
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('generates a 256-bit (64 hex char) key and persists it when none exists', async () => {
    const key = await getOrCreateDbKey();

    expect(key).toBe(SEQ_HEX);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('volyume_db_key_v1', SEQ_HEX);
  });

  test('replaces a malformed stored value rather than returning it', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('not-a-valid-key');

    const key = await getOrCreateDbKey();

    expect(key).toBe(SEQ_HEX);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('volyume_db_key_v1', SEQ_HEX);
  });

  test('a SecureStore read failure does not throw; a fresh key is still produced', async () => {
    SecureStore.getItemAsync.mockRejectedValueOnce(new Error('keystore locked'));

    const key = await getOrCreateDbKey();

    expect(key).toBe(SEQ_HEX);
  });

  test('a SecureStore write failure does not throw; the key is still returned', async () => {
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('keystore full'));

    const key = await getOrCreateDbKey();

    expect(key).toBe(SEQ_HEX);
  });
});
