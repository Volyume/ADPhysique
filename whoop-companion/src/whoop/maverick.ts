/**
 * WHOOP "Maverick" BLE frame codec (WHOOP 5.0, firmware r52), ported from the
 * whoop-vault reverse-engineering project.
 *
 * TARGET FIRMWARE: 50.40.1.0 (this device). whoop-vault validated 50.38.1.0 —
 * one minor revision lower, same r52 generation, so the framing/commands below
 * are expected to match. The per-second history record layout (historicalParse.ts)
 * is the part most likely to differ between point releases and must be confirmed
 * against frames captured from THIS firmware (Device screen → capture/export).
 *
 * Wire format (whoop-vault maverick.py):
 *   AA | version(1) | length_u16_LE | role_a(1) | role_b(1) | crc16(header)
 *      | inner_buffer[length, 4-byte aligned, 0x00 padded]
 *      | crc32(inner)
 *
 * Inner buffer (whoop-vault xg0/a.java):
 *   [0] packet_type   35=COMMAND, 47=HISTORICAL_DATA, 48=EVENT, 49=METADATA
 *   [1] sequence number
 *   [2] command_byte  (see commands.ts)
 *   [3..] payload
 *
 * Critical: the inner buffer is ALWAYS 4-byte aligned (padded with 0x00). Per
 * whoop-vault this was the key breakthrough — unaligned commands are silently
 * dropped by the strap.
 *
 * Notifications arrive in BLE-sized chunks, so incoming bytes are fed to a
 * FrameAssembler that reassembles complete frames using the length field.
 */

import { crc16modbus, crc32 } from './crc';

export const FRAME_START = 0xaa;

// Packet types — VERIFIED against WHOOP 5.444.1 (im0.c.a enum).
export enum PacketType {
  COMMAND = 35,
  COMMAND_RESPONSE = 36,
  PUFFIN_COMMAND = 37, // WHOOP 5.0 ("Puffin") command variant
  REALTIME_DATA = 40, // live data (incl. HR) over the proprietary stream
  REALTIME_RAW_DATA = 43,
  HISTORICAL_DATA = 47,
  EVENT = 48,
  METADATA = 49,
  REALTIME_IMU_DATA_STREAM = 51,
  HISTORICAL_IMU_DATA_STREAM = 52,
}

export type MaverickFrame = {
  version: number;
  roleA: number;
  roleB: number;
  /** The raw inner buffer (already de-padded to declared length). */
  inner: Uint8Array;
  packetType: number;
  sequence: number;
  commandByte: number;
  /** Payload = inner[3..]. */
  payload: Uint8Array;
};

function pad4(buf: Uint8Array): Uint8Array {
  const rem = buf.length % 4;
  if (rem === 0) return buf;
  const out = new Uint8Array(buf.length + (4 - rem));
  out.set(buf, 0);
  return out; // remaining bytes are already 0x00
}

/**
 * Build a complete Maverick frame around an inner buffer.
 * version/roleA/roleB default to values observed for app->strap command frames;
 * adjust once confirmed from a captured outgoing frame.
 */
export function encodeFrame(
  inner: Uint8Array,
  opts: { version?: number; roleA?: number; roleB?: number } = {},
): Uint8Array {
  // Header bytes VERIFIED against whoop-vault (hardware-validated r52): the
  // outer frame is AA 01 | len_u16_LE | 00 01 | crc16(header) | inner | crc32,
  // where len = padded-inner length + 4 (it counts the trailing CRC32).
  const version = opts.version ?? 0x01;
  const roleA = opts.roleA ?? 0x00;
  const roleB = opts.roleB ?? 0x01;

  const alignedInner = pad4(inner);
  const length = alignedInner.length + 4;

  const header = new Uint8Array(6);
  header[0] = FRAME_START;
  header[1] = version & 0xff;
  header[2] = length & 0xff;
  header[3] = (length >> 8) & 0xff;
  header[4] = roleA & 0xff;
  header[5] = roleB & 0xff;
  const headerCrc = crc16modbus(header);

  const innerCrc = crc32(alignedInner);

  const frame = new Uint8Array(header.length + 2 + alignedInner.length + 4);
  let o = 0;
  frame.set(header, o);
  o += header.length;
  frame[o] = headerCrc & 0xff;
  frame[o + 1] = (headerCrc >> 8) & 0xff;
  o += 2;
  frame.set(alignedInner, o);
  o += alignedInner.length;
  frame[o] = innerCrc & 0xff;
  frame[o + 1] = (innerCrc >> 8) & 0xff;
  frame[o + 2] = (innerCrc >> 16) & 0xff;
  frame[o + 3] = (innerCrc >> 24) & 0xff;
  return frame;
}

/** Compose an inner buffer from its fields (before framing/alignment). */
export function buildInner(
  packetType: PacketType,
  sequence: number,
  commandByte: number,
  payload: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const inner = new Uint8Array(3 + payload.length);
  inner[0] = packetType & 0xff;
  inner[1] = sequence & 0xff;
  inner[2] = commandByte & 0xff;
  inner.set(payload, 3);
  return inner;
}

function parseInner(inner: Uint8Array): Omit<MaverickFrame, 'version' | 'roleA' | 'roleB'> {
  return {
    inner,
    packetType: inner.length > 0 ? (inner[0] as number) : -1,
    sequence: inner.length > 1 ? (inner[1] as number) : -1,
    commandByte: inner.length > 2 ? (inner[2] as number) : -1,
    payload: inner.length > 3 ? inner.subarray(3) : new Uint8Array(0),
  };
}

/**
 * Reassembles complete Maverick frames from a stream of BLE notification chunks.
 * Resynchronises on the 0xAA start byte if the buffer gets out of step.
 */
export class FrameAssembler {
  private buf: number[] = [];

  push(chunk: Uint8Array): MaverickFrame[] {
    for (let i = 0; i < chunk.length; i += 1) this.buf.push(chunk[i] as number);
    return this.drain();
  }

  private drain(): MaverickFrame[] {
    const frames: MaverickFrame[] = [];
    // Loop while a full frame might be present.
    for (;;) {
      // Resync to start byte.
      while (this.buf.length > 0 && this.buf[0] !== FRAME_START) this.buf.shift();
      if (this.buf.length < 8) break; // need header(6) + crc16(2)

      // length field = padded-inner length + 4 (includes the trailing CRC32).
      const length = (this.buf[2] as number) | ((this.buf[3] as number) << 8);
      const innerLen = length - 4;
      const total = 8 + length; // header(6) + crc16(2) + innerLen + crc32(4)
      if (innerLen <= 0 || innerLen > 4096) {
        // Implausible length — drop the start byte and resync.
        this.buf.shift();
        continue;
      }
      if (this.buf.length < total) break; // wait for more bytes

      const version = this.buf[1] as number;
      const roleA = this.buf[4] as number;
      const roleB = this.buf[5] as number;
      const inner = new Uint8Array(this.buf.slice(8, 8 + innerLen));
      frames.push({ version, roleA, roleB, ...parseInner(inner) });

      this.buf.splice(0, total);
    }
    return frames;
  }

  reset(): void {
    this.buf = [];
  }
}
