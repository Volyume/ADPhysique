/**
 * Single source for client-generated row ids (A2-036). Three modules carried
 * their own copy of this v4-shaped generator (sync queue, food db, external
 * import) and the store carried a fourth, dead one. Consolidating them here
 * means the CSPRNG upgrade (A2-020) is a one-line change in one place once a
 * random source is bundled.
 *
 * NOTE (A2-020, deferred): this still uses Math.random, not a CSPRNG. Hermes
 * has no global crypto.getRandomValues and neither expo-crypto nor
 * react-native-get-random-values is installed, so a real CSPRNG needs a native
 * dependency and on-device verification (same class as the deferred native
 * Apple Sign-In). The ids are random-enough for local row keys today; collision
 * risk across a single user's data is negligible. When a CSPRNG source lands,
 * swap the body here and every caller benefits.
 *
 * @param {string} [prefixChar] optional single character to start the id with,
 *   replacing the first hex digit. The sync queue uses 'q' to tag its rows; the
 *   output keeps the exact same shape the inline copy produced.
 */
export function generateUUID(prefixChar) {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return prefixChar ? prefixChar + uuid.slice(1) : uuid;
}
