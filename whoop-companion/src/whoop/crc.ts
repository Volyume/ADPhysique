/**
 * CRC helpers for the WHOOP "Maverick" BLE framing.
 *
 * The frame carries a CRC16 over the header and a CRC32 over the inner buffer
 * (per whoop-vault: maverick.py computes both). CRC32 is the standard IEEE
 * (zlib) variant. The exact CRC16 variant used by the strap is not published;
 * CRC-16/CCITT (poly 0x1021) is the common choice and is used here, but it MUST
 * be confirmed against a real captured frame before trusting *outgoing*
 * commands (the strap silently drops a frame whose CRC it dislikes). Parsing
 * *incoming* frames does not depend on CRC being correct — we read the length
 * field and skip validation.
 */

// Standard IEEE CRC-32 (zlib / PNG / Ethernet). Reflected, init 0xFFFFFFFF,
// final XOR 0xFFFFFFFF.
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = (crc ^ (bytes[i] as number)) & 0xff;
    crc = (CRC32_TABLE[idx] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// CRC-16/CCITT (poly 0x1021, init 0xFFFF, non-reflected). UNCONFIRMED variant —
// see file header. Provided so the command encoder is complete and easy to
// correct once a real frame's header CRC is captured.
export function crc16ccitt(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= (bytes[i] as number) << 8;
    for (let b = 0; b < 8; b += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc & 0xffff;
}
