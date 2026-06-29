/**
 * Historical chunk parsing.
 *
 * HONESTY NOTE: whoop-vault documents the Maverick *framing* and the handshake
 * precisely (see maverick.ts / commands.ts), and that the per-second history
 * record ("K18"/"R24") contains HR, skin temperature (0.01 °C), motion, a
 * 3-axis gravity vector, an activity score and an on-body flag. The exact BYTE
 * OFFSETS of those fields are NOT published in a form I can port verbatim, so
 * decoding them precisely requires a few real captured frames from the actual
 * strap + firmware. Until then this module:
 *   - reassembles the historical payload, and
 *   - stores each record's raw bytes (so they can be decoded offline once
 *     captured), and
 *   - exposes a clearly-labelled BEST-EFFORT field reader that must be
 *     validated/corrected against captured data before its numbers are trusted.
 *
 * The app does NOT depend on this to function: the live Heart Rate stream
 * (0x2A37) is logged continuously (incl. overnight via background mode) and is
 * the real source for HRV / recovery / sleep / strain. Historical drain is a
 * backfill for gaps when the app wasn't connected.
 */

export type PerSecondSample = {
  /** Unix epoch seconds (derived from record id + base, once layout confirmed). */
  ts: number;
  hr: number | null;
  skinTempC: number | null;
  motion: number | null;
  gravX: number | null;
  gravY: number | null;
  gravZ: number | null;
  activity: number | null;
  onBody: boolean | null;
  /** Raw record bytes, always kept for offline decoding / correction. */
  rawHex: string;
};

import { bytesToHex } from '../ble/bytes';

/**
 * BEST-EFFORT, UNCONFIRMED record reader. Returns the raw bytes always, plus a
 * tentative HR read at offset 0 (the only field commonly first in such records).
 * All other fields are left null until the layout is confirmed from captures.
 */
export function decodeRecordBestEffort(record: Uint8Array, ts: number): PerSecondSample {
  return {
    ts,
    hr: record.length > 0 ? (record[0] as number) : null,
    skinTempC: null,
    motion: null,
    gravX: null,
    gravY: null,
    gravZ: null,
    activity: null,
    onBody: null,
    rawHex: bytesToHex(record),
  };
}
