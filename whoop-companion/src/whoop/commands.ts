/**
 * WHOOP command encoders (whoop-vault eo0/e.java command enum + xg0/a.java
 * builder). Each returns a fully framed Maverick packet ready to write to the
 * proprietary command characteristic (fd4b0002).
 *
 * Historical-data handshake (whoop-vault historical_v2.py):
 *   1. ENTER_HIGH_FREQ_SYNC (96)
 *   2. wait ~0.5 s
 *   3. SEND_HISTORICAL_DATA (22)
 *   4. for each HISTORICAL_DATA chunk, ACK with HISTORICAL_DATA_RESULT (23),
 *      payload [SUCCESS=1, start_id u32 LE, end_id u32 LE] = 9 bytes, padded to 12.
 */

import { buildInner, encodeFrame, PacketType } from './maverick';

export enum Command {
  LINK_VALID = 1,
  SEND_HISTORICAL_DATA = 22,
  HISTORICAL_DATA_RESULT = 23,
  ENTER_HIGH_FREQ_SYNC = 96,
}

let seq = 0;
function nextSeq(): number {
  seq = (seq + 1) & 0xff;
  return seq;
}

export function cmdEnterHighFreqSync(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.ENTER_HIGH_FREQ_SYNC));
}

export function cmdSendHistoricalData(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.SEND_HISTORICAL_DATA));
}

export function cmdHistoricalDataResult(startId: number, endId: number): Uint8Array {
  // [SUCCESS=1, start_id u32 LE, end_id u32 LE]; encodeFrame pads inner to 4-byte.
  const payload = new Uint8Array(9);
  payload[0] = 1; // SUCCESS
  payload[1] = startId & 0xff;
  payload[2] = (startId >> 8) & 0xff;
  payload[3] = (startId >> 16) & 0xff;
  payload[4] = (startId >> 24) & 0xff;
  payload[5] = endId & 0xff;
  payload[6] = (endId >> 8) & 0xff;
  payload[7] = (endId >> 16) & 0xff;
  payload[8] = (endId >> 24) & 0xff;
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.HISTORICAL_DATA_RESULT, payload));
}

/** Metadata HISTORY_END (packet_type 49, subtype 2) carries start_id + end_id. */
export function parseHistoryEnd(payload: Uint8Array): { startId: number; endId: number } | null {
  // payload layout after the command byte: [subtype, start_id u32 LE, end_id u32 LE].
  if (payload.length < 9) return null;
  const subtype = payload[0] as number;
  if (subtype !== 2) return null;
  const startId =
    (payload[1] as number) |
    ((payload[2] as number) << 8) |
    ((payload[3] as number) << 16) |
    ((payload[4] as number) << 24);
  const endId =
    (payload[5] as number) |
    ((payload[6] as number) << 8) |
    ((payload[7] as number) << 16) |
    ((payload[8] as number) << 24);
  return { startId: startId >>> 0, endId: endId >>> 0 };
}
