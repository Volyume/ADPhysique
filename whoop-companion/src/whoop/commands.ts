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
 *   4. ACK each HISTORY_END chunk with HISTORICAL_DATA_RESULT (23),
 *      payload [SUCCESS=1] + the HISTORY_END end_data bytes.
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
  ABORT_HISTORICAL_TRANSMITS = 20,
  SEND_HISTORICAL_DATA = 22,
  HISTORICAL_DATA_RESULT = 23,
  GET_DATA_RANGE = 34,
  GET_HELLO_HARVARD = 35, // session hello
  SET_ALARM_TIME = 66,
  GET_ALARM_TIME = 67,
  RUN_ALARM = 68,
  DISABLE_ALARM = 69,
  ENTER_HIGH_FREQ_SYNC = 96,
  EXIT_HIGH_FREQ_SYNC = 97,
  START_RAW_DATA = 81, // accel raw (~1 Hz) via REALTIME_RAW_DATA
  TOGGLE_IMU_MODE = 106, // IMU realtime (accel+gyro) via REALTIME_IMU_DATA_STREAM (51)
  SET_FF_VALUE = 0x78, // 120 — write a persistent feature-flag value (deep streams)
  STOP_HAPTICS = 122,
  GET_HELLO = 145, // alternate hello
}

/**
 * Enable the strap's onboard IMU realtime stream (accelerometer + gyro). Payload
 * is [REVISION_1=0x01, on] per the WHOOP 5.0 APK (xg0/d1.java) — confirmed in the
 * community RE. Turning this on makes the band emit motion data we can count
 * steps from, and (per RE) periodic status heartbeats carrying a step field.
 */
export function cmdToggleImuMode(on = true): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.TOGGLE_IMU_MODE, new Uint8Array([0x01, on ? 1 : 0])));
}

/** Start the low-rate raw accelerometer stream (alternative motion source). */
export function cmdStartRawData(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.START_RAW_DATA, new Uint8Array([0x01])));
}

/** SET_CLOCK (10): epoch seconds u32 LE + tz byte (0 = UTC). Part of bring-up. */
export function cmdSetClock(): Uint8Array {
  const epoch = Math.floor(Date.now() / 1000);
  const payload = new Uint8Array(8);
  payload[0] = epoch & 0xff;
  payload[1] = (epoch >> 8) & 0xff;
  payload[2] = (epoch >> 16) & 0xff;
  payload[3] = (epoch >> 24) & 0xff;
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.SET_CLOCK, payload));
}

/** Keepalive — must be sent ~every 10 s or the strap disconnects. */
export function cmdLinkValid(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.LINK_VALID));
}

/** Session hello sent right after connecting. */
export function cmdGetHello(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.GET_HELLO, new Uint8Array([0x01])));
}

/** Harvard hello is still sent by NOOP before the WHOOP 5/MG hello. */
export function cmdGetHelloHarvard(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.GET_HELLO_HARVARD, new Uint8Array([0x00])));
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

/** Abort any in-flight historical replay before/after a stalled transfer. */
export function cmdAbortHistoricalTransmits(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.ABORT_HISTORICAL_TRANSMITS));
}

/** Enable realtime HR over the proprietary channel (fd4b0003). */
export function cmdToggleRealtimeHr(on = true): Uint8Array {
  const payload = new Uint8Array([on ? 1 : 0]);
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.TOGGLE_REALTIME_HR, payload));
}

/** Clear the strap's stored wake/haptic alarm. */
export function cmdDisableAlarm(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.DISABLE_ALARM, new Uint8Array([0x01])));
}

/** Stop any currently-running haptic vibration pattern. */
export function cmdStopHaptics(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.STOP_HAPTICS));
}

/** Trigger the strap alarm haptic immediately. Pair with STOP_HAPTICS for tests. */
export function cmdRunAlarm(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.RUN_ALARM, new Uint8Array([0x01])));
}

/** Arm the strap's stored wake/haptic alarm at a Unix epoch timestamp. */
export function cmdSetAlarmTime(wakeTsMs: number): Uint8Array {
  const epoch = Math.floor(wakeTsMs / 1000) >>> 0;
  const payload = new Uint8Array(7);
  payload[0] = 0x01;
  payload[1] = epoch & 0xff;
  payload[2] = (epoch >> 8) & 0xff;
  payload[3] = (epoch >> 16) & 0xff;
  payload[4] = (epoch >> 24) & 0xff;
  payload[5] = 0x00;
  payload[6] = 0x00;
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.SET_ALARM_TIME, payload));
}

/**
 * SET_CONFIG body (per NOOP WHOOP5_DEEP_DATA.md): 40 bytes — flag name in ASCII
 * NUL-padded to 32 bytes, the value byte at offset 32, remainder zero.
 * Offsets beyond the flag name are NOOP's interpretation and should be
 * validated against captured frames.
 */
export function cmdSetConfig(flag: string, value = 0x32): Uint8Array {
  const body = new Uint8Array(40);
  for (let i = 0; i < flag.length && i < 32; i += 1) body[i] = flag.charCodeAt(i) & 0x7f;
  body[32] = value & 0xff;
  const payload = new Uint8Array(1 + body.length);
  payload[0] = 0x01;
  payload.set(body, 1);
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.SET_FF_VALUE, payload));
}

/** The "most load-bearing" flag — opens the deep optical/PPG + history streams. */
export function cmdEnableDeepStreams(): Uint8Array {
  return cmdSetConfig('enable_r22_packets', 0x32);
}

export function cmdEnableDeepStreamSequence(): Uint8Array[] {
  const flags: Array<[string, number]> = [
    ['enable_r22_packets', 0x32],
    ['enable_r22_v2_packets', 0x32],
    ['enable_r22_v3_packets', 0x32],
    ['enable_r22_v4_packets', 0x31],
    ['enable_r22_v5_packets', 0x32],
    ['enable_r22_v6_packets', 0x32],
    ['enable_r22_v8_packets', 0x32],
    ['make_hrfm_visible', 0x32],
    ['disable_pip_r26_packets', 0x32],
    ['wear_detect_bias', 0x32],
    ['hr_ch_switching', 0x32],
    ['ir_hw_switching', 0x32],
    ['enable_passive_strap_fit_gen5', 0x31],
    ['enable_sig11_during_sleep', 0x32],
    ['dorset_inhibit_wpt', 0x32],
  ];
  return flags.map(([name, value]) => cmdSetConfig(name, value));
}

let seq = 0;
function nextSeq(): number {
  seq = (seq + 1) & 0xff;
  return seq;
}

export function cmdEnterHighFreqSync(): Uint8Array {
  // Gen5 expects revision 2 + interval/duration (u16 LE). Goose uses the
  // WHOOP smart-alarm history-sync mode: poll every 180s for a 2h window.
  const payload = new Uint8Array(5);
  payload[0] = 2;
  payload[1] = 180 & 0xff;
  payload[2] = (180 >> 8) & 0xff;
  payload[3] = 7200 & 0xff;
  payload[4] = (7200 >> 8) & 0xff;
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.ENTER_HIGH_FREQ_SYNC, payload));
}

export function cmdExitHighFreqSync(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.EXIT_HIGH_FREQ_SYNC));
}

export function cmdGetDataRange(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.GET_DATA_RANGE));
}

export function cmdSendHistoricalData(): Uint8Array {
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.SEND_HISTORICAL_DATA));
}

export function cmdHistoricalDataResult(endData: Uint8Array): Uint8Array {
  const payload = new Uint8Array(1 + endData.length);
  payload[0] = 1; // SUCCESS
  payload.set(endData, 1);
  return encodeFrame(buildInner(PacketType.COMMAND, nextSeq(), Command.HISTORICAL_DATA_RESULT, payload));
}

export type HistoryMetadata =
  | { kind: 'start' }
  | { kind: 'complete' }
  | { kind: 'end'; unix: number | null; trim: number | null; endData: Uint8Array };

function u32le(bytes: Uint8Array, off: number): number | null {
  if (off + 4 > bytes.length) return null;
  return (
    ((bytes[off] as number) |
      ((bytes[off + 1] as number) << 8) |
      ((bytes[off + 2] as number) << 16) |
      ((bytes[off + 3] as number) << 24)) >>>
    0
  );
}

export function parseHistoryMetadata(inner: Uint8Array): HistoryMetadata | null {
  if (
    inner.length < 3 ||
    (inner[0] !== PacketType.METADATA && inner[0] !== PacketType.PUFFIN_METADATA)
  ) {
    return null;
  }
  const metaType = inner[2] as number;
  if (metaType === 1) return { kind: 'start' };
  if (metaType === 3) return { kind: 'complete' };
  if (metaType !== 2 || inner.length < 21) return null;
  return {
    kind: 'end',
    unix: u32le(inner, 3),
    trim: u32le(inner, 13),
    endData: inner.slice(13, 21),
  };
}
