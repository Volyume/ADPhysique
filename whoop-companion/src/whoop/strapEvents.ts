/**
 * Decoders for the WHOOP strap's status + motion frames, ported from the
 * community reverse-engineering of the 5.0 "Maverick" protocol. Two step sources:
 *
 *  1. Heartbeat status (EVENT packet_type=48, command_byte=29): a periodic
 *     status packet whose byte[11] is a CANDIDATE cumulative step field. The RE
 *     notes mark this "possible" — it is NOT confirmed on this firmware, so we
 *     treat it as diagnostic only until validated against a known step count.
 *  2. IMU / raw accelerometer (packet_type 51 = IMU samples ax,ay,az,gx,gy,gz
 *     int16; or 43 = raw accel x,y,z int16). From the accelerometer we count
 *     steps ourselves with a standard peak detector (see metrics/stepDetect).
 *     This is the reliable, on-device-verifiable path.
 *
 * Enable the stream with cmdToggleImuMode()/cmdStartRawData() (commands.ts).
 */

import { MaverickFrame, PacketType } from './maverick';

export type Accel = { x: number; y: number; z: number };

const A_SCALE = 8 / 32768; // ±8g int16

/** Candidate cumulative step counter from a heartbeat status packet (unconfirmed). */
export function decodeHeartbeatSteps(frame: MaverickFrame): number | null {
  if (frame.packetType !== PacketType.EVENT || frame.commandByte !== 29) return null;
  if (frame.payload.length < 19) return null;
  return frame.payload[11] as number;
}

function readAccel(view: DataView, off: number): Accel {
  return {
    x: view.getInt16(off, true) * A_SCALE,
    y: view.getInt16(off + 2, true) * A_SCALE,
    z: view.getInt16(off + 4, true) * A_SCALE,
  };
}

/** Decode accelerometer samples from an IMU (51) or raw (43) frame. */
export function decodeAccel(frame: MaverickFrame): Accel[] {
  const p = frame.payload;
  const out: Accel[] = [];
  if (p.length < 6) return out;
  const view = new DataView(p.buffer, p.byteOffset, p.byteLength);
  if (frame.packetType === PacketType.REALTIME_IMU_DATA_STREAM) {
    // 12-byte samples: ax,ay,az,gx,gy,gz — take the accel triplet.
    for (let i = 0; i + 12 <= p.length; i += 12) out.push(readAccel(view, i));
  } else if (frame.packetType === PacketType.REALTIME_RAW_DATA) {
    // 6-byte samples: x,y,z.
    for (let i = 0; i + 6 <= p.length; i += 6) out.push(readAccel(view, i));
  }
  return out;
}

export function isAccelFrame(frame: MaverickFrame): boolean {
  return (
    frame.packetType === PacketType.REALTIME_IMU_DATA_STREAM ||
    frame.packetType === PacketType.REALTIME_RAW_DATA
  );
}
