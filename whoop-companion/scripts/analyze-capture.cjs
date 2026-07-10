#!/usr/bin/env node

const fs = require('fs');

const PACKET_HISTORICAL_DATA = 47;
const PACKET_METADATA = 49;
const PACKET_PUFFIN_METADATA = 56;
const MIN_PLAUSIBLE_UNIX = 1_700_000_000;
const FUTURE_MARGIN_SEC = 86_400;
// Keep this aligned with src/metrics/bandSteps.ts. The July capture showed the
// WHOOP 5 history counter ending near the user's real ~200-step walk.
const WHOOP5_STEP_TICKS_PER_STEP = 1;
const MAX_STEP_INTERVAL_MS = 15 * 60 * 1000;
const MAX_STEP_RAW_DELTA = 512;
const MAX_STEP_RATE_PER_SEC = 8;

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/analyze-capture.cjs <pulse-frames.txt>');
  process.exit(2);
}

function main() {
  const raw = fs.readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);
  const chunks = [];
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\t+/);
    if (parts.length < 3) continue;
    const ts = Number(parts[0]);
    const source = parts[1];
    const hex = parts[2]?.trim();
    if (!Number.isFinite(ts) || !source || !hex || !/^[0-9a-fA-F]+$/.test(hex)) continue;
    chunks.push({ ts, source, bytes: hexToBytes(hex) });
  }

  const assemblers = new Map();
  const frames = [];
  const byPacket = new Map();
  for (const chunk of chunks) {
    let asm = assemblers.get(chunk.source);
    if (!asm) {
      asm = new FrameAssembler();
      assemblers.set(chunk.source, asm);
    }
    for (const frame of asm.push(chunk.bytes)) {
      frames.push({ ...frame, chunkTs: chunk.ts, source: chunk.source });
      byPacket.set(frame.packetType, (byPacket.get(frame.packetType) ?? 0) + 1);
    }
  }

  const historyFrames = frames.filter((f) => f.packetType === PACKET_HISTORICAL_DATA).map((f) => f.raw);
  const historyShapes = summarizeHistoryShapes(historyFrames);
  const meta = summarizeMetadata(frames);
  const commandResponses = summarizeCommandResponses(frames);
  const decoded = decodeWhoop5HistoryFrames(historyFrames, Math.floor(Date.now() / 1000));
  const motionStats = summarizeK21Motion(historyFrames, decoded.steps);
  const hrDates = summarizeTimed(decoded.hr.map((s) => s.ts));
  const stepDates = summarizeTimed(decoded.steps.map((s) => s.ts));
  const sleepStateDates = summarizeTimed(decoded.sleepStates.map((s) => s.ts));
  const stepEstimate = estimateBandStepsFromCounters(decoded.steps);
  const hrByDay = groupByDay(decoded.hr.map((s) => s.ts));
  const stepByDay = groupByDay(decoded.steps.map((s) => s.ts));
  const stepRowsByDay = groupRowsByDay(decoded.steps);
  const sleepStateByDay = groupByDay(decoded.sleepStates.map((s) => s.ts));
  const sleepStateCounts = countSleepStates(decoded.sleepStates);
  const activityClassCounts = countActivityClasses(decoded.steps);
  const rawVitalStats = summarizeRawVitals(decoded.rawVitals);
  const versions = decoded.versions.join(', ') || 'none';
  const bpm = decoded.hr.map((s) => s.bpm).filter((v) => v > 0);
  const rrCount = decoded.hr.reduce((a, s) => a + s.rr.length, 0);
  const cleanRrCount = decoded.hr.reduce((a, s) => a + cleanSampleRr(s).length, 0);

  console.log(`file: ${path}`);
  console.log(`chunks: ${chunks.length}`);
  console.log(`maverick_frames: ${frames.length}`);
  console.log(`packet_counts: ${JSON.stringify(Object.fromEntries([...byPacket.entries()].sort((a, b) => a[0] - b[0])))}`);
  console.log(`metadata: starts=${meta.starts} ends=${meta.ends} completes=${meta.completes}`);
  console.log(`command_responses: ${JSON.stringify(commandResponses)}`);
  console.log(
    `history: records=${decoded.records} decoded=${decoded.decodedRecords} rejected=${decoded.rejectedRecords} dropped_ts=${decoded.droppedImplausibleTs} versions=${versions}`,
  );
  console.log(
    `layouts: v18=${decoded.v18Records} v20=${decoded.v20Records} v21=${decoded.v21Records} v26=${decoded.v26Records} raw_sensor=${decoded.rawSensorRecords} imu=${decoded.motion.length}`,
  );
  console.log(`history_frame_shapes: ${JSON.stringify(historyShapes)}`);
  console.log(`k21_motion: ${JSON.stringify(motionStats)}`);
  console.log(`imu_minute_motion: ${JSON.stringify(summarizeImuMinutes(decoded.motion))}`);
  console.log(
    `hr: samples=${decoded.hr.length} rr=${rrCount} rr_clean=${cleanRrCount} bpm_min=${min(bpm)} bpm_max=${max(bpm)} ${formatRange(hrDates)}`,
  );
  console.log(
    `steps: rows=${decoded.steps.length} calibrated_total=${stepEstimate?.steps ?? 'n/a'} raw_ticks=${stepEstimate?.rawTicks ?? 'n/a'} active_ticks=${stepEstimate?.activeRawTicks ?? 0} inactive_ticks=${stepEstimate?.inactiveRawTicks ?? 0} movement_linked=${stepEstimate?.movementLinkedPct ?? 0}% divisor=${stepEstimate?.calibrationDivisor ?? WHOOP5_STEP_TICKS_PER_STEP} used_intervals=${stepEstimate?.usedIntervals ?? 0} active_intervals=${stepEstimate?.activeIntervals ?? 0} dropped_intervals=${stepEstimate?.droppedIntervals ?? 0} confidence=${stepEstimate?.confidence ?? 'n/a'} publishable=${stepEstimate?.confidence === 'high' || stepEstimate?.confidence === 'medium'} ${formatRange(stepDates)}`,
  );
  console.log(
    `step_activity_class: still=${activityClassCounts[0] ?? 0} walk=${activityClassCounts[1] ?? 0} run=${activityClassCounts[2] ?? 0} unknown=${activityClassCounts.unknown ?? 0}`,
  );
  console.log(
    `sleep_state: rows=${decoded.sleepStates.length} wake=${sleepStateCounts[0] ?? 0} still=${sleepStateCounts[1] ?? 0} asleep=${sleepStateCounts[2] ?? 0} up=${sleepStateCounts[3] ?? 0} ${formatRange(sleepStateDates)}`,
  );
  console.log(
    `raw_vitals: rows=${decoded.rawVitals.length} spo2=${formatStat(rawVitalStats.spo2, '%')} skin_temp=${formatStat(
      rawVitalStats.skinTempC,
      ' C',
    )}`,
  );
  console.log('hr_by_day:');
  for (const [day, count] of Object.entries(hrByDay)) console.log(`  ${day}: ${count}`);
  console.log('step_rows_by_day:');
  for (const [day, count] of Object.entries(stepByDay)) console.log(`  ${day}: ${count}`);
  console.log('step_estimate_by_day:');
  for (const [day, rows] of Object.entries(stepRowsByDay)) {
    const est = estimateBandStepsFromCounters(rows);
    console.log(
      `  ${day}: steps=${est?.steps ?? 'n/a'} raw_ticks=${est?.rawTicks ?? 'n/a'} active_ticks=${est?.activeRawTicks ?? 0} inactive_ticks=${est?.inactiveRawTicks ?? 0} movement_linked=${est?.movementLinkedPct ?? 0}% used=${est?.usedIntervals ?? 0} dropped=${est?.droppedIntervals ?? 0}`,
    );
  }
  console.log('sleep_state_by_day:');
  for (const [day, count] of Object.entries(sleepStateByDay)) console.log(`  ${day}: ${count}`);

  const sleepHints = findSleepHints(decoded.hr);
  console.log('sleep_coverage_hints:');
  for (const hint of sleepHints) {
    console.log(
      `  ${hint.day}: ${hint.samples} HR samples between 20:00-12:00, ${Math.round(
        hint.coverageMin,
      )} covered minutes, avg ${Math.round(hint.avgHr)} bpm`,
    );
  }
  const stateHints = findSleepStateHints(decoded.sleepStates);
  console.log('sleep_state_hints:');
  for (const hint of stateHints) {
    console.log(
      `  ${hint.day}: rows=${hint.rows} wake=${hint.counts[0] ?? 0} still=${hint.counts[1] ?? 0} asleep=${hint.counts[2] ?? 0} up=${hint.counts[3] ?? 0}`,
    );
  }
  const motionHints = findSleepMotionHints(decoded.steps);
  console.log('sleep_motion_hints:');
  for (const hint of motionHints) {
    console.log(
      `  ${hint.day}: rows=${hint.rows} evidence_min=${hint.evidenceMin} moving_min=${hint.movingMin} still_min=${hint.stillMin}`,
    );
  }
}

function summarizeHistoryShapes(frames) {
  const shapes = {};
  for (const frame of frames) {
    const version = frame[9];
    const key = String(version ?? 'unknown');
    const shape = shapes[key] ?? { count: 0, lengths: {}, prefix: '' };
    shape.count += 1;
    shape.lengths[frame.length] = (shape.lengths[frame.length] ?? 0) + 1;
    if (!shape.prefix) shape.prefix = bytesToHex(frame.subarray(8, Math.min(frame.length - 4, 40)));
    shapes[key] = shape;
  }
  return shapes;
}

function summarizeK21Motion(frames, steps) {
  const rows = frames.filter((frame) => frame[9] === 21).map(decodeK21Motion).filter(Boolean);
  const group1 = rows.map((row) => row.group1Mad);
  const group2 = rows.map((row) => row.group2Mad);
  const classByTs = new Map(steps.map((row) => [row.ts, row.activityClass]));
  const byClass = {};
  for (const row of rows) {
    const activityClass = classByTs.get(row.ts);
    const key = activityClass == null ? 'unknown' : String(activityClass);
    const bucket = byClass[key] ?? { group1: [], group2: [] };
    bucket.group1.push(row.group1Mad);
    bucket.group2.push(row.group2Mad);
    byClass[key] = bucket;
  }
  const classStats = {};
  for (const [key, bucket] of Object.entries(byClass)) {
    classStats[key] = {
      rows: bucket.group1.length,
      group1_mad: summarizeQuantiles(bucket.group1),
      group2_mad: summarizeQuantiles(bucket.group2),
    };
  }
  return {
    rows: rows.length,
    first: rows.length ? new Date(rows[0].ts).toISOString() : null,
    last: rows.length ? new Date(rows[rows.length - 1].ts).toISOString() : null,
    group1_mad: summarizeQuantiles(group1),
    group2_mad: summarizeQuantiles(group2),
    by_activity_class: classStats,
  };
}

function summarizeImuMinutes(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const minute = Math.floor(row.ts / 60000);
    const values = buckets.get(minute) ?? [];
    values.push(row.intensity);
    buckets.set(minute, values);
  }
  const values = [];
  for (const bucket of buckets.values()) {
    if (bucket.length < 5) continue;
    bucket.sort((a, b) => a - b);
    values.push(bucket[Math.min(bucket.length - 1, Math.round((bucket.length - 1) * 0.75))] ?? 0);
  }
  return {
    minutes: values.length,
    still: values.filter((value) => value < 0.2).length,
    moving: values.filter((value) => value >= 0.4).length,
    intensity: summarizeQuantiles(values),
  };
}

function decodeK21Motion(frame) {
  const payload = frame.subarray(8, frame.length - 4);
  const unix = readU32(payload, 7);
  const count1 = readU16(payload, 16);
  const count2 = readU16(payload, 622);
  if (!unix || !count1 || !count2 || count1 > 100 || count2 > 100) return null;
  const group1Mad = groupMeanAbsDiff(payload, [20, 220, 420], count1);
  const group2Mad = groupMeanAbsDiff(payload, [632, 832, 1032], count2);
  if (group1Mad == null || group2Mad == null) return null;
  const energy = Math.max(group1Mad, group2Mad * 1.5);
  const intensity = Math.max(0, Math.min(1, (energy - 20) / 180));
  return { ts: unix * 1000, group1Mad, group2Mad, intensity: Math.round(intensity * 1000) / 1000 };
}

function groupMeanAbsDiff(payload, offsets, count) {
  let sum = 0;
  let n = 0;
  for (const offset of offsets) {
    let prev = null;
    for (let i = 0; i < count; i += 1) {
      const value = readI16(payload, offset + i * 2);
      if (value == null) return null;
      if (prev != null) {
        sum += Math.abs(value - prev);
        n += 1;
      }
      prev = value;
    }
  }
  return n ? Math.round((sum / n) * 100) / 100 : null;
}

function summarizeQuantiles(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p))];
  return { min: at(0), p25: at(0.25), p50: at(0.5), p75: at(0.75), p95: at(0.95), max: at(1) };
}

function readU16(bytes, offset) {
  if (offset + 2 > bytes.length) return null;
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readI16(bytes, offset) {
  const value = readU16(bytes, offset);
  return value == null ? null : value >= 0x8000 ? value - 0x10000 : value;
}

function readU32(bytes, offset) {
  if (offset + 4 > bytes.length) return null;
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function bytesToHex(bytes) {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

class FrameAssembler {
  constructor() {
    this.buf = [];
  }

  push(chunk) {
    for (const b of chunk) this.buf.push(b);
    return this.drain();
  }

  drain() {
    const frames = [];
    for (;;) {
      while (this.buf.length > 0 && this.buf[0] !== 0xaa) this.buf.shift();
      if (this.buf.length < 8) break;
      const length = this.buf[2] | (this.buf[3] << 8);
      const innerLen = length - 4;
      const total = 8 + length;
      if (innerLen <= 0 || innerLen > 4096) {
        this.buf.shift();
        continue;
      }
      if (this.buf.length < total) break;
      const raw = Uint8Array.from(this.buf.slice(0, total));
      const inner = Uint8Array.from(this.buf.slice(8, 8 + innerLen));
      frames.push({
        raw,
        version: this.buf[1],
        roleA: this.buf[4],
        roleB: this.buf[5],
        inner,
        packetType: inner.length > 0 ? inner[0] : -1,
        sequence: inner.length > 1 ? inner[1] : -1,
        commandByte: inner.length > 2 ? inner[2] : -1,
        payload: inner.length > 3 ? inner.subarray(3) : new Uint8Array(0),
      });
      this.buf.splice(0, total);
    }
    return frames;
  }
}

function decodeWhoop5HistoryFrames(framesIn, wallNowSec) {
  const hr = [];
  const steps = [];
  const sleepStates = [];
  const motion = [];
  const rawVitals = [];
  const ppg = [];
  const versions = new Set();
  let records = 0;
  let decodedRecords = 0;
  let rejectedRecords = 0;
  let droppedImplausibleTs = 0;
  let v18Records = 0;
  let v20Records = 0;
  let v21Records = 0;
  let v26Records = 0;
  let rawSensorRecords = 0;

  for (const frame of framesIn) {
    if (!isHistoryFrame(frame)) continue;
    records += 1;
    const version = u8(frame, 9);
    if (version != null) versions.add(version);

    if (!verifyWhoop5Frame(frame)) {
      rejectedRecords += 1;
      continue;
    }

    if (version === 18) {
      const rec = decodeV18(frame);
      if (!rec) {
        rejectedRecords += 1;
        continue;
      }
      const ts = plausibleUnix(rec.unix, wallNowSec);
      if (ts == null) {
        droppedImplausibleTs += 1;
        continue;
      }
      decodedRecords += 1;
      v18Records += 1;
      if (rec.bpm > 0) hr.push({ ts: ts * 1000, bpm: rec.bpm, rr: rec.rr, source: 'whoop5_v18' });
      if (rec.stepCounter != null) {
        steps.push({ ts: ts * 1000, counter: rec.stepCounter, activityClass: rec.activityClass });
      }
      if (rec.sleepState != null) {
        sleepStates.push({ ts: ts * 1000, state: rec.sleepState });
      }
      continue;
    }

    if (version === 26) {
      const rec = decodeV26(frame);
      if (!rec) {
        rejectedRecords += 1;
        continue;
      }
      const ts = plausibleUnix(rec.unix, wallNowSec);
      if (ts == null) {
        droppedImplausibleTs += 1;
        continue;
      }
      decodedRecords += 1;
      v26Records += 1;
      for (const value of rec.samples) ppg.push({ ts, value });
      continue;
    }

    if (version === 20) {
      const rec = decodeRawSensorHistory(frame, version);
      if (!rec) {
        rejectedRecords += 1;
        continue;
      }
      const ts = plausibleUnix(rec.unix, wallNowSec);
      if (ts == null) {
        droppedImplausibleTs += 1;
        continue;
      }
      decodedRecords += 1;
      rawSensorRecords += 1;
      v20Records += 1;
      // K20 remains packet diagnostics only; its vital offsets are unvalidated.
      continue;
    }

    if (version === 21) {
      const rec = decodeK21Motion(frame);
      if (!rec) {
        rejectedRecords += 1;
        continue;
      }
      const ts = plausibleUnix(rec.ts / 1000, wallNowSec);
      if (ts == null) {
        droppedImplausibleTs += 1;
        continue;
      }
      decodedRecords += 1;
      rawSensorRecords += 1;
      v21Records += 1;
      motion.push({ ts: rec.ts, intensity: rec.intensity });
      continue;
    }

    rejectedRecords += 1;
  }

  for (const estimate of estimatePpgHr(ppg)) {
    hr.push({ ts: estimate.ts * 1000, bpm: estimate.bpm, rr: [], source: 'whoop5_v26_ppg', confidence: estimate.conf });
  }

  hr.sort((a, b) => a.ts - b.ts);
  steps.sort((a, b) => a.ts - b.ts);
  sleepStates.sort((a, b) => a.ts - b.ts);
  motion.sort((a, b) => a.ts - b.ts);
  rawVitals.sort((a, b) => a.ts - b.ts);
  return {
    hr,
    steps,
    sleepStates,
    motion,
    rawVitals,
    records,
    decodedRecords,
    rejectedRecords,
    droppedImplausibleTs,
    v18Records,
    v20Records,
    v21Records,
    v26Records,
    rawSensorRecords,
    versions: [...versions].sort((a, b) => a - b),
  };
}

function isHistoryFrame(frame) {
  return frame.length > 9 && frame[0] === 0xaa && frame[8] === PACKET_HISTORICAL_DATA;
}

function verifyWhoop5Frame(frame) {
  if (frame.length < 12 || frame[0] !== 0xaa) return false;
  const declared = u16(frame, 2);
  if (declared == null) return false;
  const total = declared + 8;
  if (total !== frame.length) return false;
  const headerCrc = u16(frame, 6);
  if (headerCrc == null || crc16modbus(frame.subarray(0, 6)) !== headerCrc) return false;
  const inner = frame.subarray(8, total - 4);
  const wire = u32(frame, total - 4);
  return wire != null && crc32(inner) === wire;
}

function decodeV18(frame) {
  const unix = u32(frame, 15);
  const bpm = u8(frame, 22);
  if (unix == null || bpm == null) return null;
  const rrCount = u8(frame, 23) ?? 0;
  const rr = [];
  for (let i = 0; i < Math.min(rrCount, 4); i += 1) {
    const v = u16(frame, 24 + i * 2);
    if (v != null && v > 0) rr.push(v);
  }
  const stepCounter = u16(frame, 57);
  const act = u8(frame, 63);
  const activityClass = act === 0 || act === 1 || act === 2 ? act : null;
  const sleepStateByte = u8(frame, 81);
  const sleepState = sleepStateByte == null ? null : (sleepStateByte >> 4) & 0x03;
  return { unix, bpm, rr, stepCounter, activityClass, sleepState };
}

function decodeV26(frame) {
  const unix = u32(frame, 15);
  if (unix == null || frame.length < 75) return null;
  const samples = [];
  for (let off = 27; off < 75; off += 2) {
    const v = i16(frame, off);
    if (v == null) return null;
    samples.push(v);
  }
  return samples.length ? { unix, samples } : null;
}

function decodeRawSensorHistory(frame, _version) {
  const unix = u32(frame, 15);
  if (unix == null) return null;
  return { unix, spo2: null, skinTempC: null };
}

function summarizeMetadata(framesIn) {
  let starts = 0;
  let ends = 0;
  let completes = 0;
  for (const frame of framesIn) {
    if (frame.packetType !== PACKET_METADATA && frame.packetType !== PACKET_PUFFIN_METADATA) continue;
    const metaType = frame.inner[2];
    if (metaType === 1) starts += 1;
    else if (metaType === 2) ends += 1;
    else if (metaType === 3) completes += 1;
  }
  return { starts, ends, completes };
}

function summarizeCommandResponses(framesIn) {
  const counts = {};
  for (const frame of framesIn) {
    if (frame.packetType !== 36 || frame.inner.length < 5) continue;
    const command = frame.inner[2];
    const result = frame.inner[4];
    const key = `${command}:${result}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function plausibleUnix(ts, wallNowSec) {
  if (ts < MIN_PLAUSIBLE_UNIX || ts > wallNowSec + FUTURE_MARGIN_SEC) return null;
  return ts;
}

function u8(bytes, off) {
  return off < bytes.length ? bytes[off] : null;
}

function u16(bytes, off) {
  if (off + 2 > bytes.length) return null;
  return bytes[off] | (bytes[off + 1] << 8);
}

function i16(bytes, off) {
  const v = u16(bytes, off);
  if (v == null) return null;
  return v >= 0x8000 ? v - 0x10000 : v;
}

function u32(bytes, off) {
  if (off + 4 > bytes.length) return null;
  return (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const idx = (crc ^ bytes[i]) & 0xff;
    crc = CRC32_TABLE[idx] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function crc16modbus(bytes) {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc & 0xffff;
}

const PPG_SAMPLE_RATE_HZ = 24;
const PPG_WINDOW_SECONDS = 8;
const PPG_MIN_BPM = 30;
const PPG_MAX_BPM = 220;
const PPG_MIN_CONFIDENCE = 0.3;

function estimatePpgHr(samples) {
  if (!samples.length) return [];
  const secs = new Map();
  for (const sample of samples) {
    const list = secs.get(sample.ts) ?? [];
    list.push(sample.value);
    secs.set(sample.ts, list);
  }
  const order = [...secs.keys()].sort((a, b) => a - b);
  if (!order.length) return [];
  const runs = [];
  let cur = [order[0]];
  for (let i = 1; i < order.length; i += 1) {
    const ts = order[i];
    const prev = cur[cur.length - 1];
    if (ts - prev === 1) cur.push(ts);
    else {
      runs.push(cur);
      cur = [ts];
    }
  }
  runs.push(cur);
  const out = [];
  const half = Math.floor(PPG_WINDOW_SECONDS / 2);
  for (const run of runs) {
    if (run.length < 3) continue;
    const runSet = new Set(run);
    for (const center of run) {
      const win = [];
      for (let ts = center - half; ts <= center + half; ts += 1) {
        if (runSet.has(ts)) win.push(ts);
      }
      if (win.length < 3) continue;
      const values = [];
      for (const ts of win) values.push(...(secs.get(ts) ?? []));
      const est = estimatePpgWindow(values, center);
      if (est) out.push(est);
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

function estimatePpgWindow(values, ts) {
  if (values.length < PPG_SAMPLE_RATE_HZ * 3) return null;
  const clean = detrend(removeRecordRateComponent(values, PPG_SAMPLE_RATE_HZ));
  const loLag = Math.max(2, Math.round((PPG_SAMPLE_RATE_HZ * 60) / PPG_MAX_BPM));
  const hiLag = Math.min(clean.length - 2, Math.round((PPG_SAMPLE_RATE_HZ * 60) / PPG_MIN_BPM));
  if (hiLag <= loLag) return null;
  const vals = new Map();
  let peak = Number.NEGATIVE_INFINITY;
  for (let lag = loLag; lag <= hiLag; lag += 1) {
    const v = acf(clean, lag);
    vals.set(lag, v);
    if (v > peak) peak = v;
  }
  if (peak < PPG_MIN_CONFIDENCE) return null;
  let bestLag = -1;
  for (let lag = loLag + 1; lag <= hiLag - 1; lag += 1) {
    const v = vals.get(lag) ?? 0;
    if (v >= 0.85 * peak && v >= (vals.get(lag - 1) ?? 0) && v >= (vals.get(lag + 1) ?? 0)) {
      bestLag = lag;
      break;
    }
  }
  if (bestLag < 0) {
    bestLag = loLag;
    let best = vals.get(loLag) ?? Number.NEGATIVE_INFINITY;
    for (let lag = loLag + 1; lag <= hiLag; lag += 1) {
      const v = vals.get(lag) ?? Number.NEGATIVE_INFINITY;
      if (v > best) {
        best = v;
        bestLag = lag;
      }
    }
  }
  return { ts, bpm: Math.round((PPG_SAMPLE_RATE_HZ * 60) / bestLag), conf: Math.round((vals.get(bestLag) ?? 0) * 1000) / 1000 };
}

function detrend(x) {
  const n = x.length;
  if (n <= 1) return new Array(n).fill(0);
  const sumI = (n * (n - 1)) / 2;
  const sumI2 = ((n - 1) * n * (2 * n - 1)) / 6;
  let sumY = 0;
  let sumIY = 0;
  for (let i = 0; i < n; i += 1) {
    const y = x[i] ?? 0;
    sumY += y;
    sumIY += i * y;
  }
  const denom = n * sumI2 - sumI * sumI;
  if (denom === 0) {
    const mean = sumY / n;
    return x.map((v) => v - mean);
  }
  const slope = (n * sumIY - sumI * sumY) / denom;
  const intercept = (sumY - slope * sumI) / n;
  return x.map((v, i) => v - (slope * i + intercept));
}

function acf(x, lag) {
  const n = x.length - lag;
  if (n <= 0) return 0;
  const mean = x.reduce((a, b) => a + b, 0) / x.length;
  let den = 0;
  for (const v of x) {
    const d = v - mean;
    den += d * d;
  }
  if (den === 0) return 0;
  let num = 0;
  for (let i = 0; i < n; i += 1) num += ((x[i] ?? mean) - mean) * ((x[i + lag] ?? mean) - mean);
  return num / den;
}

function removeRecordRateComponent(x, fs) {
  const n = x.length;
  if (fs <= 1 || n < fs * 4) return x;
  let withinSum = 0;
  let withinCount = 0;
  let boundarySum = 0;
  let boundaryCount = 0;
  for (let i = 1; i < n; i += 1) {
    const d = Math.abs((x[i] ?? 0) - (x[i - 1] ?? 0));
    if (i % fs === 0) {
      boundarySum += d;
      boundaryCount += 1;
    } else {
      withinSum += d;
      withinCount += 1;
    }
  }
  if (!withinCount || !boundaryCount) return x;
  const within = withinSum / withinCount;
  const boundary = boundarySum / boundaryCount;
  if (within <= 0 || boundary <= within * 3) return x;
  const colSum = new Array(fs).fill(0);
  const colCount = new Array(fs).fill(0);
  for (let i = 0; i < n; i += 1) {
    const p = i % fs;
    colSum[p] += x[i] ?? 0;
    colCount[p] += 1;
  }
  const colMean = colSum.map((sum, p) => (colCount[p] > 0 ? sum / colCount[p] : 0));
  return x.map((v, i) => v - (colMean[i % fs] ?? 0));
}

function estimateBandStepsFromCounters(rows, calibrationDivisor = WHOOP5_STEP_TICKS_PER_STEP) {
  if (rows.length < 2) return null;
  const sorted = rows.slice().sort((a, b) => a.ts - b.ts);
  let rawTicks = 0;
  let usedIntervals = 0;
  let droppedIntervals = 0;
  let activeIntervals = 0;
  let activeRawTicks = 0;
  let inactiveRawTicks = 0;
  let resetCount = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const dtMs = cur.ts - prev.ts;
    if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > MAX_STEP_INTERVAL_MS) {
      droppedIntervals += 1;
      continue;
    }
    const dtSec = Math.max(1, dtMs / 1000);
    let delta = cur.counter - prev.counter;
    if (delta < 0 && prev.counter > 60_000 && cur.counter < 5_000) delta += 65_536;
    else if (delta < 0) {
      resetCount += 1;
      continue;
    }
    if (delta <= 0) continue;
    if (delta / dtSec > MAX_STEP_RATE_PER_SEC * calibrationDivisor || delta > MAX_STEP_RAW_DELTA) {
      droppedIntervals += 1;
      continue;
    }
    const active = prev.activityClass === 1 || prev.activityClass === 2 || cur.activityClass === 1 || cur.activityClass === 2;
    rawTicks += delta;
    usedIntervals += 1;
    if (active) {
      activeIntervals += 1;
      activeRawTicks += delta;
    } else {
      inactiveRawTicks += delta;
    }
  }
  if (usedIntervals <= 0) return null;
  const movementLinkedPct = Math.round((activeRawTicks / Math.max(1, rawTicks)) * 100);
  const confidence =
    activeIntervals >= 5 && usedIntervals >= 20 && resetCount <= 1 && movementLinkedPct >= 55
      ? 'high'
      : activeIntervals >= 1 && usedIntervals >= 2 && movementLinkedPct >= 40
        ? 'medium'
        : 'low';
  return {
    steps: Math.max(0, Math.round(rawTicks / calibrationDivisor)),
    rawTicks,
    usedIntervals,
    activeIntervals,
    activeRawTicks,
    inactiveRawTicks,
    movementLinkedPct,
    droppedIntervals,
    resetCount,
    calibrationDivisor,
    confidence,
  };
}

function summarizeTimed(timestamps) {
  if (!timestamps.length) return null;
  return { first: Math.min(...timestamps), last: Math.max(...timestamps) };
}

function formatRange(range) {
  if (!range) return 'range=n/a';
  return `first=${new Date(range.first).toISOString()} last=${new Date(range.last).toISOString()}`;
}

function groupByDay(timestamps) {
  const out = {};
  for (const ts of timestamps) {
    const d = new Date(ts);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out[day] = (out[day] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
}

function groupRowsByDay(rows) {
  const out = {};
  for (const row of rows) {
    const d = new Date(row.ts);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    (out[day] ??= []).push(row);
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
}

function summarizeRawVitals(rows) {
  return {
    spo2: summarizeValues(rows.map((r) => r.spo2).filter((v) => v != null)),
    skinTempC: summarizeValues(rows.map((r) => r.skinTempC).filter((v) => v != null)),
  };
}

function summarizeValues(values) {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: Math.min(...values),
    mean: sum / values.length,
    max: Math.max(...values),
  };
}

function formatStat(stat, unit) {
  if (!stat) return 'n/a';
  return `n=${stat.count} min=${round1(stat.min)} mean=${round1(stat.mean)} max=${round1(stat.max)}${unit}`;
}

function countActivityClasses(rows) {
  const counts = { unknown: 0 };
  for (const row of rows) {
    if (row.activityClass === 0 || row.activityClass === 1 || row.activityClass === 2) {
      counts[row.activityClass] = (counts[row.activityClass] ?? 0) + 1;
    } else {
      counts.unknown += 1;
    }
  }
  return counts;
}

function findSleepHints(hr) {
  if (!hr.length) return [];
  const byAnchor = new Map();
  for (const s of hr) {
    const d = new Date(s.ts);
    const hour = d.getHours() + d.getMinutes() / 60;
    if (hour < 20 && hour >= 12) continue;
    const anchor = new Date(s.ts);
    if (hour >= 20) anchor.setDate(anchor.getDate() + 1);
    anchor.setHours(0, 0, 0, 0);
    const day = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
    const list = byAnchor.get(day) ?? [];
    list.push(s);
    byAnchor.set(day, list);
  }
  return [...byAnchor.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, samples]) => {
      const minutes = new Set(samples.map((s) => Math.floor(s.ts / 60000)));
      const avgHr = samples.reduce((a, s) => a + s.bpm, 0) / samples.length;
      return { day, samples: samples.length, coverageMin: minutes.size, avgHr };
    });
}

function findSleepStateHints(sleepStates) {
  if (!sleepStates.length) return [];
  const byAnchor = new Map();
  for (const s of sleepStates) {
    const d = new Date(s.ts);
    const hour = d.getHours() + d.getMinutes() / 60;
    if (hour < 20 && hour >= 12) continue;
    const anchor = new Date(s.ts);
    if (hour >= 20) anchor.setDate(anchor.getDate() + 1);
    anchor.setHours(0, 0, 0, 0);
    const day = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
    const list = byAnchor.get(day) ?? [];
    list.push(s);
    byAnchor.set(day, list);
  }
  return [...byAnchor.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, rows]) => ({ day, rows: rows.length, counts: countSleepStates(rows) }));
}

function findSleepMotionHints(steps) {
  if (!steps.length) return [];
  const byAnchor = new Map();
  for (const s of steps) {
    const d = new Date(s.ts);
    const hour = d.getHours() + d.getMinutes() / 60;
    if (hour < 20 && hour >= 12) continue;
    const anchor = new Date(s.ts);
    if (hour >= 20) anchor.setDate(anchor.getDate() + 1);
    anchor.setHours(0, 0, 0, 0);
    const day = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
    const list = byAnchor.get(day) ?? [];
    list.push(s);
    byAnchor.set(day, list);
  }
  return [...byAnchor.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, rows]) => {
      const motion = sleepMotionByMinute(rows);
      const values = [...motion.values()];
      return {
        day,
        rows: rows.length,
        evidenceMin: values.length,
        movingMin: values.filter((v) => v > 0.4).length,
        stillMin: values.filter((v) => v <= 0.4).length,
      };
    });
}

function sleepMotionByMinute(rows) {
  const out = new Map();
  const mark = (minute, motion) => {
    out.set(minute, Math.max(out.get(minute) ?? 0, motion));
  };

  const sorted = rows.slice().sort((a, b) => a.ts - b.ts);
  for (const row of sorted) {
    const minute = Math.floor(row.ts / 60000);
    if (row.activityClass === 0) mark(minute, 0);
    else if (row.activityClass === 1 || row.activityClass === 2) mark(minute, 1);
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gapMin = Math.max(1, Math.round((cur.ts - prev.ts) / 60000));
    if (gapMin > 30) continue;

    let delta = cur.counter - prev.counter;
    if (delta < 0 && prev.counter > 60_000 && cur.counter < 5_000) delta += 65_536;
    if (delta <= 0) continue;

    const stepRate = delta / gapMin;
    if (stepRate < 1 && !(delta >= 10 && gapMin <= 15)) continue;

    const motion = stepRate >= 8 ? 1 : 0.55;
    const startMinute = Math.floor(prev.ts / 60000) + 1;
    const endMinute = Math.floor(cur.ts / 60000);
    const fillInterval = gapMin <= 8 || stepRate >= 5;
    if (fillInterval) {
      for (let minute = startMinute; minute <= endMinute; minute += 1) mark(minute, motion);
    } else {
      mark(endMinute, motion);
    }
  }

  return out;
}

function countSleepStates(rows) {
  const counts = {};
  for (const row of rows) counts[row.state] = (counts[row.state] ?? 0) + 1;
  return counts;
}

function cleanSampleRr(sample) {
  if (!sample.rr.length || sample.bpm < 30 || sample.bpm > 220) return [];
  const expectedRr = 60000 / sample.bpm;
  const clean = sample.rr.filter((rr) => {
    if (rr < 300 || rr > 2000) return false;
    const beatHr = 60000 / rr;
    return Math.abs(beatHr - sample.bpm) <= Math.max(10, sample.bpm * 0.18);
  });
  if (!clean.length) return [];
  const meanRr = clean.reduce((a, b) => a + b, 0) / clean.length;
  if (Math.abs(meanRr - expectedRr) > Math.max(140, expectedRr * 0.22)) return [];
  return clean;
}

function min(values) {
  return values.length ? Math.min(...values) : 'n/a';
}

function max(values) {
  return values.length ? Math.max(...values) : 'n/a';
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

main();
