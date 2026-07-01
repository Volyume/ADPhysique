/**
 * SQLCipher key helper (audit F-004; hardened per audit F-001 2026-07-01).
 *
 * getOrCreateDbKey is the only part of dbCrypto that can run under node — the
 * migration itself is native SQLCipher and MUST be device-tested. These tests
 * pin the key contract the encryption depends on, INCLUDING the F-001 data-loss
 * guards:
 *   - a valid stored key is reused verbatim as {existing} (the DB only opens
 *     with the same key)
 *   - a missing key is generated (64 hex / 256-bit), persisted, returned {created}
 *   - a malformed stored value is replaced, never returned (would brick decrypt)
 *   - a TRANSIENT read failure retries and self-heals; it never mints a
 *     replacement key over a real one
 *   - a PERSISTENT read failure returns {unavailable} and writes nothing (minting
 *     a new key would orphan an existing encrypted DB)
 *   - a WRITE failure returns {unavailable}, never an unpersisted key (the next
 *     launch would generate a different key and the DB would be unreadable)
 *
 * The mock functions are defined inside the jest.mock factory (not mutated
 * later) because `import * as` copies the module namespace at import time — a
 * lazily-populated object would be empty when dbCrypto reads it.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

// The key is written with AFTER_FIRST_UNLOCK accessibility so a locked-device
// background launch can still read it (audit S-002 pt2, Sentry VOLYUME-1N).
const KEY_OPTS = { keychainAccessible: 'AFTER_FIRST_UNLOCK' };
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
  test('reuses an existing valid key verbatim as {existing}, never regenerates', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce(VALID);

    const res = await getOrCreateDbKey();

    expect(res).toEqual({ key: VALID, status: 'existing' });
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('generates + persists a 256-bit (64 hex) key as {created} when none exists', async () => {
    const res = await getOrCreateDbKey();

    expect(res).toEqual({ key: SEQ_HEX, status: 'created' });
    expect(res.key).toMatch(/^[0-9a-f]{64}$/);
    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('volyume_db_key_v1', SEQ_HEX, KEY_OPTS);
  });

  test('replaces a malformed stored value rather than returning it', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('not-a-valid-key');

    const res = await getOrCreateDbKey();

    expect(res).toEqual({ key: SEQ_HEX, status: 'created' });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('volyume_db_key_v1', SEQ_HEX, KEY_OPTS);
  });

  test('reads + writes the key with AFTER_FIRST_UNLOCK accessibility (S-002 pt2)', async () => {
    await getOrCreateDbKey();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('volyume_db_key_v1', KEY_OPTS);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('volyume_db_key_v1', SEQ_HEX, KEY_OPTS);
  });

  // F-001: a transient read failure must self-heal via retry, NOT mint a key.
  test('a transient read failure retries, then succeeds, without replacing the key', async () => {
    SecureStore.getItemAsync
      .mockRejectedValueOnce(new Error('keystore locked'))
      .mockResolvedValueOnce(VALID);

    const res = await getOrCreateDbKey();

    expect(res).toEqual({ key: VALID, status: 'existing' });
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  // F-001: if EVERY read attempt throws, report unavailable and write NOTHING —
  // minting a replacement key would orphan the user's existing encrypted DB.
  test('a persistent read failure returns {unavailable} and never writes a new key', async () => {
    SecureStore.getItemAsync.mockRejectedValue(new Error('keystore locked'));

    const res = await getOrCreateDbKey();

    expect(res).toEqual({ key: null, status: 'unavailable' });
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  // F-001: an unpersisted fresh key must never be handed back as usable, or the
  // next launch would generate a different key and the DB would be unreadable.
  test('a write failure returns {unavailable}, not an unpersisted key', async () => {
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('keystore full'));

    const res = await getOrCreateDbKey();

    expect(res).toEqual({ key: null, status: 'unavailable' });
  });
});
