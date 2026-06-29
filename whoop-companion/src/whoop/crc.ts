/**
 * CRC helpers for the WHOOP "Maverick" BLE framing.
 *
 * The frame carries a CRC16 over the header and a CRC32 over the inner buffer
 * (per whoop-vault: maverick.py computes both). CRC32 is the standard IEEE
 * (zlib) variant. The CRC16 is CRC-16/MODBUS (poly 0x8005 reflected = 0xA001,
 * init 0xFFFF) — confirmed by deep research: NOOP's Framing.puffinCommandFrame
 * uses crc16Modbus on the header and whoop-vault converges on the same framing.
 * Parsing *incoming* frames does not depend on CRC being correct — we read the
 * length field and skip validation.
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

// CRC-16/MODBUS (poly 0xA001 = reflected 0x8005, init 0xFFFF, refin/refout
// true, xorout 0x0000). This is the variant the WHOOP strap expects on the
// frame header (per NOOP's crc16Modbus, corroborated by whoop-vault).
export function crc16modbus(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i] as number;
    for (let b = 0; b < 8; b += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }
  return crc & 0xffff;
}
