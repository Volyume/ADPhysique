/**
 * Byte helpers. react-native-ble-plx hands characteristic values to JS as
 * base64 strings, so we convert to a Uint8Array before decoding. No Buffer in
 * the RN runtime, so base64 is decoded by hand (small, dependency-free).
 */

const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const B64_LOOKUP: Record<string, number> = (() => {
  const table: Record<string, number> = {};
  for (let i = 0; i < B64_ALPHABET.length; i += 1) {
    table[B64_ALPHABET[i] as string] = i;
  }
  return table;
})();

/** Decode a base64 string (as produced by react-native-ble-plx) to bytes. */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const outLen = Math.floor((clean.length * 3) / 4) - padding;
  const out = new Uint8Array(Math.max(0, outLen));

  let bits = 0;
  let bitCount = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const c = clean[i] as string;
    if (c === '=') break;
    const val = B64_LOOKUP[c];
    if (val === undefined) continue;
    bits = (bits << 6) | val;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      if (o < out.length) {
        out[o] = (bits >> bitCount) & 0xff;
        o += 1;
      }
    }
  }
  return out;
}

/** Lowercase hex string for logging raw frames, e.g. "aa01ff..". */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += (bytes[i] as number).toString(16).padStart(2, '0');
  }
  return hex;
}
