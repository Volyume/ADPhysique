/**
 * WHOOP command encoders (whoop-vault eo0/e.java command enum + xg0/a.java
 * builder). Each returns a fully framed Maverick packet ready to write to the
 * proprietary command characteristic (fd4b0002).
 *
 * IMPORTANT (deep research finding): a freshly-connected client gets ONLY live
 * HR over the standard 0x2A37 service. The "deep" streams — skin temperature,
 * motion/IMU and per-second history — stay off until they are UNLOCKED. The
 * full sequence (per NOOP WHOOP5_DEEP_DATA.md + whoop-vault + my-whoop) is:
 *   1. BLE bond + CLIENT_HELLO handshake   (exact hello bytes vary by project;
 *      capture from this firmware or port from NOOP/my-whoop — NOT yet encoded
 *      here, flagged below)
 *   2. SET_CONFIG enable_r22_packets        (turns on the deep optical/PPG stream)
 *   3. ENTER_HIGH_FREQ_SYNC (96) → wait ~0.5 s → SEND_HISTORICAL_DATA (22)
 *   4. ACK each HISTORICAL_DATA chunk with HISTORICAL_DATA_RESULT (23),
 *      payload [SUCCESS=1, start_id u32 LE, end_id u32 LE] = 9 bytes, padded to 12.
 *
 * Until step 1/2 are validated on real 50.40.1.0 frames, the historical drain
 * may return little/nothing; live HR (standard GATT) is unaffected.
 */

import { buildInner, encodeFrame, PacketType } from './maverick';

export enum Command {
  LINK_VALID = 1, // keepalive — strap drops the link without one (send every ~2 s)
  TOGGLE_REALTIME_HR = 3, // realtime HR over proprietary fd4b stream
  SET_CLOCK = 10, // epoch_u32_LE + tz byte (0=UTC); part of bring-up
  TOGGLE_GENERIC_HR_PROFILE = 14, // makes the strap broadcast standard GATT 0x2A37
  SEND_HISTORICAL_DATA = 22,
  HISTORICAL_DATA_RESULT = 23,
  GET_HELLO_HARVARD = 35, // session hello
  ENTER_HIGH_FREQ_SYNC = 96,
  EXIT_HIGH_FREQ_SYNC = 97,
  SET_FF_VALUE = 0x78, // 120 — write a persistent feature-flag value (deep streams)
  GET_HELLO = 145, // alternate hello
}

/** SET_CLOCK (10): epoch seconds u32 LE + tz byte (0 = UTC). Part of bring-up. */
export function cmdSetClock(): Uint8Array {
  const epoch = Math.floor(Date.now() / 1000);
  const payload = new Uint8Array(5);
  payload[0] = epoch & 0xff;
  payload[1] = (epoch >> 8) & 0xff;
  payload[2] = (epoch >> 16) & 0xff;
  payload[3] = (epoch >> 24) & 0xff;
  payload[4] = 0; // UTC
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.SET_CLOCK, payload));
}

/** Keepalive — must be sent ~every 10 s or the strap disconnects. */
export function cmdLinkValid(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.LINK_VALID));
}

/** Session hello sent right after connecting. */
export function cmdGetHello(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.GET_HELLO_HARVARD));
}

/**
 * Tell the strap to broadcast live HR on the STANDARD GATT Heart Rate Service
 * (0x2A37) over our connection — i.e. we enable "Broadcast Heart Rate"
 * ourselves, with no official WHOOP app. Our existing 0x2A37 decoder then works.
 * (whoop-vault: TOGGLE_GENERIC_HR_PROFILE opcode 14.)
 */
export function cmdEnableHrBroadcast(on = true): Uint8Array {
  const payload = new Uint8Array([on ? 1 : 0]);
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.TOGGLE_GENERIC_HR_PROFILE, payload));
}

/** Enable realtime HR over the proprietary channel (fd4b0003). */
export function cmdToggleRealtimeHr(on = true): Uint8Array {
  const payload = new Uint8Array([on ? 1 : 0]);
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.TOGGLE_REALTIME_HR, payload));
}

/**
 * SET_CONFIG body (per NOOP WHOOP5_DEEP_DATA.md): 40 bytes — flag name in ASCII
 * NUL-padded to 32 bytes, the value byte at offset 32, remainder zero.
 * Offsets beyond the flag name are NOOP's interpretation and should be
 * validated against captured frames.
 */
export function cmdSetConfig(flag: string, value = 1): Uint8Array {
  const body = new Uint8Array(40);
  for (let i = 0; i < flag.length && i < 32; i += 1) body[i] = flag.charCodeAt(i) & 0x7f;
  body[32] = value & 0xff;
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.SET_FF_VALUE, body));
}

/** The "most load-bearing" flag — opens the deep optical/PPG + history streams. */
export function cmdEnableDeepStreams(): Uint8Array {
  return cmdSetConfig('enable_r22_packets', 1);
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
