/**
 * Decoder for the standard GATT Heart Rate Measurement characteristic (0x2A37).
 *
 * This is a Bluetooth SIG standard format (not WHOOP-proprietary), documented in
 * the Heart Rate Service spec. The WHOOP 5.0 exposes live HR here — the same
 * source the official app's live-HR screen uses — which makes it the reliable
 * backbone of the Phase 1 proof.
 *
 * Layout:
 *   byte 0: flags
 *     bit 0  — HR value format: 0 = uint8, 1 = uint16 (LE)
 *     bit 1-2 — sensor contact status
 *     bit 3  — energy expended present
 *     bit 4  — RR intervals present
 *   then: HR value (1 or 2 bytes)
 *   then: energy expended (2 bytes LE) if present
 *   then: zero or more RR intervals (uint16 LE each, units of 1/1024 s)
 */

export type HeartRateSample = {
  /** Beats per minute. */
  bpm: number;
  /** R-R intervals in milliseconds (may be empty for a given notification). */
  rrMs: number[];
  /** True/false if the sensor reports skin contact; null if not reported. */
  contact: boolean | null;
};

export function decodeHeartRate(bytes: Uint8Array): HeartRateSample | null {
  if (bytes.length < 2) return null;

  const flags = bytes[0] as number;
  const is16Bit = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = (flags & 0x02) !== 0;
  const energyPresent = (flags & 0x08) !== 0;
  const rrPresent = (flags & 0x10) !== 0;

  let offset = 1;
  let bpm: number;
  if (is16Bit) {
    if (bytes.length < offset + 2) return null;
    bpm = (bytes[offset] as number) | ((bytes[offset + 1] as number) << 8);
    offset += 2;
  } else {
    bpm = bytes[offset] as number;
    offset += 1;
  }

  if (energyPresent) {
    offset += 2; // skip energy expended
  }

  const rrMs: number[] = [];
  if (rrPresent) {
    while (offset + 1 < bytes.length) {
      const raw = (bytes[offset] as number) | ((bytes[offset + 1] as number) << 8);
      // RR is in units of 1/1024 second -> milliseconds.
      rrMs.push(Math.round((raw / 1024) * 1000));
      offset += 2;
    }
  }

  return {
    bpm,
    rrMs,
    contact: contactSupported ? contactDetected : null,
  };
}
