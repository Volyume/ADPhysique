/**
 * WHOOP 5 historical-offload decoding.
 *
 * Type-47 history records are stored on the band and replayed during sync. Public
 * reverse-engineering in NOOP maps two layouts that matter for sleep backfill:
 * v18 carries per-second HR/R-R directly, while v26 carries a 24 Hz PPG waveform
 * that can be converted into per-second HR by autocorrelation. Captures from
 * this WHOOP 5 also show v20/v21 raw sensor history blocks; they have valid
 * timestamps but should not be promoted to HR samples.
 */

import { crc16modbus, crc32 } from './crc';
import { decodeWhoop5SkinTemp } from './skinTemperature';

const PACKET_HISTORICAL_DATA = 47;
const MIN_PLAUSIBLE_UNIX = 1_700_000_000;
const FUTURE_MARGIN_SEC = 86_400;

export type HistoricalHrSample = {
  ts: number; // epoch milliseconds
  bpm: number;
  rr: number[];
  source: 'whoop5_v18' | 'whoop5_v26_ppg';
  confidence?: number;
};

export type HistoricalStepSample = {
  ts: number; // epoch milliseconds
  counter: number;
  activityClass: number | null;
};

export type HistoricalSleepStateSample = {
  ts: number; // epoch milliseconds
  state: number; // v18 @81 high nibble candidate: 0 wake-like, 1 still, 2 sleep-like, 3 up-like
};

export type HistoricalMotionSample = {
  ts: number;
  intensity: number; // 0..1, derived from within-frame K21 IMU axis movement
};

export type HistoricalRawVitalSample = {
  ts: number; // epoch milliseconds
  spo2: number | null;
  skinTempC: number | null;
};

export type HistoricalDecodeResult = {
  hr: HistoricalHrSample[];
  steps: HistoricalStepSample[];
  sleepStates: HistoricalSleepStateSample[];
  motion: HistoricalMotionSample[];
  rawVitals: HistoricalRawVitalSample[];
  records: number;
  decodedRecords: number;
  rejectedRecords: number;
  droppedImplausibleTs: number;
  v18Records: number;
  v20Records: number;
  v21Records: number;
  v26Records: number;
  rawSensorRecords: number;
  versions: number[];
};

type PpgSample = { ts: number; value: number };
type PpgEstimate = { ts: number; bpm: number; conf: number };
export type HistoricalDecodeOptions = { ppgContextFrames?: Uint8Array[] };

export function decodeWhoop5HistoryFrames(
  frames: Uint8Array[],
  wallNowSec = Math.floor(Date.now() / 1000),
  options: HistoricalDecodeOptions = {},
): HistoricalDecodeResult {
  const hr: HistoricalHrSample[] = [];
  const steps: HistoricalStepSample[] = [];
  const sleepStates: HistoricalSleepStateSample[] = [];
  const motion: HistoricalMotionSample[] = [];
  const rawVitals: HistoricalRawVitalSample[] = [];
  const ppg: PpgSample[] = [];
  const versions = new Set<number>();
  let records = 0;
  let decodedRecords = 0;
  let rejectedRecords = 0;
  let droppedImplausibleTs = 0;
  let v18Records = 0;
  let v20Records = 0;
  let v21Records = 0;
  let v26Records = 0;
  let rawSensorRecords = 0;

  // PPG autocorrelation needs several adjacent seconds. Include a bounded tail
  // from the prior durable chunk as signal context, but never count it again as
  // records or other decoded streams.
  appendPpgContext(options.ppgContextFrames ?? [], ppg, wallNowSec);

  for (const frame of frames) {
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
      if (rec.skinTempC != null) {
        rawVitals.push({ ts: ts * 1000, spo2: null, skinTempC: rec.skinTempC });
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
      // Count these packet families for diagnostics, but do not promote guessed
      // offsets. v20 SpO2 and temperature channel identities remain unverified.
      continue;
    }

    if (version === 21) {
      const rec = decodeK21Motion(frame);
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
      v21Records += 1;
      motion.push({ ts: ts * 1000, intensity: rec.intensity });
      continue;
    }

    rejectedRecords += 1;
  }

  for (const estimate of estimatePpgHr(ppg)) {
    hr.push({
      ts: estimate.ts * 1000,
      bpm: estimate.bpm,
      rr: [],
      source: 'whoop5_v26_ppg',
      confidence: estimate.conf,
    });
  }

  const mergedHr = mergeHistoricalHrSamples(hr);
  steps.sort((a, b) => a.ts - b.ts);
  sleepStates.sort((a, b) => a.ts - b.ts);
  motion.sort((a, b) => a.ts - b.ts);
  rawVitals.sort((a, b) => a.ts - b.ts);
  return {
    hr: mergedHr,
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

function appendPpgContext(frames: Uint8Array[], ppg: PpgSample[], wallNowSec: number): void {
  for (const frame of frames) {
    if (!isHistoryFrame(frame) || u8(frame, 9) !== 26 || !verifyWhoop5Frame(frame)) continue;
    const rec = decodeV26(frame);
    if (!rec) continue;
    const ts = plausibleUnix(rec.unix, wallNowSec);
    if (ts == null) continue;
    for (const value of rec.samples) ppg.push({ ts, value });
  }
}

function mergeHistoricalHrSamples(samples: HistoricalHrSample[]): HistoricalHrSample[] {
  const byTimestamp = new Map<number, HistoricalHrSample>();
  for (const sample of samples) {
    const existing = byTimestamp.get(sample.ts);
    if (!existing || preferHistoricalHrSample(sample, existing)) byTimestamp.set(sample.ts, sample);
  }
  return [...byTimestamp.values()].sort((a, b) => a.ts - b.ts);
}

function preferHistoricalHrSample(candidate: HistoricalHrSample, existing: HistoricalHrSample): boolean {
  const candidateHasRr = candidate.rr.length > 0;
  const existingHasRr = existing.rr.length > 0;
  if (candidateHasRr !== existingHasRr) return candidateHasRr;
  return (candidate.confidence ?? 1) > (existing.confidence ?? 1);
}

function isHistoryFrame(frame: Uint8Array): boolean {
  return frame.length > 9 && frame[0] === 0xaa && frame[8] === PACKET_HISTORICAL_DATA;
}

function verifyWhoop5Frame(frame: Uint8Array): boolean {
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

function decodeV18(frame: Uint8Array): {
  unix: number;
  bpm: number;
  rr: number[];
  stepCounter: number | null;
  activityClass: number | null;
  sleepState: number | null;
  skinTempC: number | null;
} | null {
  const unix = u32(frame, 15);
  const bpm = u8(frame, 22);
  if (unix == null || bpm == null) return null;
  const rrCount = u8(frame, 23) ?? 0;
  const rr: number[] = [];
  for (let i = 0; i < Math.min(rrCount, 4); i += 1) {
    const v = u16(frame, 24 + i * 2);
    if (v != null && v > 0) rr.push(v);
  }
  const stepCounter = u16(frame, 57);
  const act = u8(frame, 63);
  const activityClass = act === 0 || act === 1 || act === 2 ? act : null;
  const sleepStateByte = u8(frame, 81);
  const sleepState = sleepStateByte == null ? null : (sleepStateByte >> 4) & 0x03;
  const skinTempC = decodeWhoop5SkinTemp(u16(frame, 73));
  return { unix, bpm, rr, stepCounter, activityClass, sleepState, skinTempC };
}

function decodeV26(frame: Uint8Array): { unix: number; samples: number[] } | null {
  const unix = u32(frame, 15);
  if (unix == null || frame.length < 75) return null;
  const samples: number[] = [];
  for (let off = 27; off < 75; off += 2) {
    const v = i16(frame, off);
    if (v == null) return null;
    samples.push(v);
  }
  return samples.length ? { unix, samples } : null;
}

function decodeK21Motion(frame: Uint8Array): { unix: number; intensity: number } | null {
  const payload = frame.subarray(8, frame.length - 4);
  const unix = u32(payload, 7);
  const group1Count = u16(payload, 16);
  const group2Count = u16(payload, 622);
  if (
    unix == null ||
    group1Count == null ||
    group2Count == null ||
    group1Count < 20 ||
    group2Count < 20 ||
    group1Count > 100 ||
    group2Count > 100
  ) {
    return null;
  }

  const group1Mad = axisGroupMeanAbsDiff(payload, [20, 220, 420], group1Count);
  const group2Mad = axisGroupMeanAbsDiff(payload, [632, 832, 1032], group2Count);
  if (group1Mad == null || group2Mad == null) return null;

  // The axes' engineering units are still unpublished, so use a bounded
  // within-frame movement index. Thresholds come from this device's capture:
  // stationary K21 frames cluster in the low tens, while walk/run frames rise sharply.
  const energy = Math.max(group1Mad, group2Mad * 1.5);
  const intensity = Math.max(0, Math.min(1, (energy - 20) / 180));
  return { unix, intensity: Math.round(intensity * 1000) / 1000 };
}

function axisGroupMeanAbsDiff(payload: Uint8Array, offsets: number[], count: number): number | null {
  let total = 0;
  let differences = 0;
  for (const offset of offsets) {
    let previous: number | null = null;
    for (let i = 0; i < count; i += 1) {
      const value = i16(payload, offset + i * 2);
      if (value == null) return null;
      if (previous != null) {
        total += Math.abs(value - previous);
        differences += 1;
      }
      previous = value;
    }
  }
  return differences ? total / differences : null;
}

function decodeRawSensorHistory(
  frame: Uint8Array,
  _version: number,
): { unix: number; spo2: number | null; skinTempC: number | null } | null {
  const unix = u32(frame, 15);
  if (unix == null) return null;
  return { unix, spo2: null, skinTempC: null };
}

function plausibleUnix(ts: number, wallNowSec: number): number | null {
  if (ts < MIN_PLAUSIBLE_UNIX || ts > wallNowSec + FUTURE_MARGIN_SEC) return null;
  return ts;
}

function u8(bytes: Uint8Array, off: number): number | null {
  return off < bytes.length ? (bytes[off] as number) : null;
}

function u16(bytes: Uint8Array, off: number): number | null {
  if (off + 2 > bytes.length) return null;
  return (bytes[off] as number) | ((bytes[off + 1] as number) << 8);
}

function i16(bytes: Uint8Array, off: number): number | null {
  const v = u16(bytes, off);
  if (v == null) return null;
  return v >= 0x8000 ? v - 0x10000 : v;
}

function u32(bytes: Uint8Array, off: number): number | null {
  if (off + 4 > bytes.length) return null;
  return (
    ((bytes[off] as number) |
      ((bytes[off + 1] as number) << 8) |
      ((bytes[off + 2] as number) << 16) |
      ((bytes[off + 3] as number) << 24)) >>>
    0
  );
}

const PPG_SAMPLE_RATE_HZ = 24;
const PPG_WINDOW_SECONDS = 8;
const PPG_MIN_BPM = 30;
const PPG_MAX_BPM = 220;
const PPG_MIN_CONFIDENCE = 0.3;

function estimatePpgHr(samples: PpgSample[]): PpgEstimate[] {
  if (!samples.length) return [];

  const secs = new Map<number, number[]>();
  for (const sample of samples) {
    const list = secs.get(sample.ts) ?? [];
    list.push(sample.value);
    secs.set(sample.ts, list);
  }

  const order = [...secs.keys()].sort((a, b) => a - b);
  if (!order.length) return [];

  const runs: number[][] = [];
  let cur: number[] = [order[0] as number];
  for (let i = 1; i < order.length; i += 1) {
    const ts = order[i] as number;
    const prev = cur[cur.length - 1] as number;
    if (ts - prev === 1) cur.push(ts);
    else {
      runs.push(cur);
      cur = [ts];
    }
  }
  runs.push(cur);

  const out: PpgEstimate[] = [];
  const half = Math.floor(PPG_WINDOW_SECONDS / 2);
  for (const run of runs) {
    if (run.length < 3) continue;
    const runSet = new Set(run);
    for (const center of run) {
      const win: number[] = [];
      for (let ts = center - half; ts <= center + half; ts += 1) {
        if (runSet.has(ts)) win.push(ts);
      }
      if (win.length < 3) continue;
      const values: number[] = [];
      for (const ts of win) {
        const secondSamples = secs.get(ts);
        if (secondSamples) values.push(...secondSamples);
      }
      const est = estimatePpgWindow(values, center);
      if (est) out.push(est);
    }
  }

  out.sort((a, b) => a.ts - b.ts);
  return out;
}

function estimatePpgWindow(values: number[], ts: number): PpgEstimate | null {
  if (values.length < PPG_SAMPLE_RATE_HZ * 3) return null;
  const clean = detrend(removeRecordRateComponent(values, PPG_SAMPLE_RATE_HZ));
  const loLag = Math.max(2, Math.round((PPG_SAMPLE_RATE_HZ * 60) / PPG_MAX_BPM));
  const hiLag = Math.min(clean.length - 2, Math.round((PPG_SAMPLE_RATE_HZ * 60) / PPG_MIN_BPM));
  if (hiLag <= loLag) return null;

  const vals = new Map<number, number>();
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

  const conf = Math.round((vals.get(bestLag) ?? 0) * 1000) / 1000;
  return { ts, bpm: Math.round((PPG_SAMPLE_RATE_HZ * 60) / bestLag), conf };
}

function detrend(x: number[]): number[] {
  const n = x.length;
  if (n <= 1) return new Array(n).fill(0);
  const nD = n;
  const sumI = (nD * (nD - 1)) / 2;
  const sumI2 = ((nD - 1) * nD * (2 * nD - 1)) / 6;
  let sumY = 0;
  let sumIY = 0;
  for (let i = 0; i < n; i += 1) {
    const y = x[i] ?? 0;
    sumY += y;
    sumIY += i * y;
  }
  const denom = nD * sumI2 - sumI * sumI;
  if (denom === 0) {
    const mean = sumY / nD;
    return x.map((v) => v - mean);
  }
  const slope = (nD * sumIY - sumI * sumY) / denom;
  const intercept = (sumY - slope * sumI) / nD;
  return x.map((v, i) => v - (slope * i + intercept));
}

function acf(x: number[], lag: number): number {
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
  for (let i = 0; i < n; i += 1) {
    num += ((x[i] ?? mean) - mean) * ((x[i + lag] ?? mean) - mean);
  }
  return num / den;
}

function removeRecordRateComponent(x: number[], fs: number): number[] {
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

  const colSum = new Array(fs).fill(0) as number[];
  const colCount = new Array(fs).fill(0) as number[];
  for (let i = 0; i < n; i += 1) {
    const p = i % fs;
    colSum[p] = (colSum[p] ?? 0) + (x[i] ?? 0);
    colCount[p] = (colCount[p] ?? 0) + 1;
  }
  const colMean = colSum.map((sum, p) => {
    const count = colCount[p] ?? 0;
    return count > 0 ? sum / count : 0;
  });
  return x.map((v, i) => v - (colMean[i % fs] ?? 0));
}
