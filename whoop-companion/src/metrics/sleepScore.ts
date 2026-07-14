/**
 * Transparent 0–100 Sleep Score, Oura-style, as a weighted blend of named
 * contributors with published thresholds — so the number decomposes instead of
 * being a black box. Computed from the current night's SleepResult; needs no
 * history. WHOOP shows "sleep performance" (got vs needed); this adds the wider
 * quality picture (efficiency, REM, deep, restfulness, timing).
 *
 * Contributors (weights): total sleep vs need 0.35, efficiency 0.20,
 * REM share 0.15, deep share 0.15, restfulness 0.15. Each sub-score is 0–100.
 */

import { SleepResult } from './sleep';

export type SleepContributor = { key: string; label: string; score: number; detail: string };
export type SleepScore = {
  score: number;
  contributors: SleepContributor[];
  confidenceCapPct: number | null;
  cappedByConfidence: boolean;
};

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function band(value: number, good: number, optimal: number): number {
  // Maps value to 0..100: reaches ~85 at `good`, ~100 at `optimal`.
  if (value >= optimal) return 100;
  if (value >= good) return 85 + ((value - good) / (optimal - good)) * 15;
  return clamp((value / good) * 85);
}

/** Two-sided plateau: 100 inside the core band, tapering to a 20 floor as the
 * value moves too low OR too high (penalises too-little and too-much alike). */
function twoSided(
  v: number,
  coreLo: number,
  coreHi: number,
  floorLo: number,
  floorHi: number,
  hardLo: number,
  hardHi: number,
): number {
  if (v >= coreLo && v <= coreHi) return 100;
  if (v < coreLo && v >= floorLo) return 60 + 40 * ((v - floorLo) / (coreLo - floorLo));
  if (v > coreHi && v <= floorHi) return 60 + 40 * ((floorHi - v) / (floorHi - coreHi));
  if (v < floorLo && v >= hardLo) return clamp(20 + 40 * ((v - hardLo) / (floorLo - hardLo)), 20, 60);
  if (v > floorHi && v <= hardHi) return clamp(20 + 40 * ((hardHi - v) / (hardHi - floorHi)), 20, 60);
  return 20;
}

function durationAdequacy(asleepMin: number, needMin: number): number {
  if (needMin <= 0) return 0;
  const r = asleepMin / needMin;
  if (r >= 1 && r <= 1.15) return 100;
  if (r < 1) return clamp(100 - 170 * (1 - r));
  return clamp(100 - 30 * ((r - 1.15) / 0.35), 70, 100);
}

/** Two-sided latency: the 10-20 min band is ideal; a long latency and a
 * suspiciously short latency (under five minutes, a sign of overtiredness) both
 * score below it. */
function latencyScore(lat: number): number {
  if (lat >= 10 && lat <= 20) return 100;
  if (lat >= 5 && lat < 10) return 100 - 3 * (10 - lat);
  if (lat < 5) return clamp(85 - 7 * (5 - lat), 40, 85);
  if (lat > 20 && lat <= 45) return 100 - 1.6 * (lat - 20);
  return clamp(60 - (lat - 45), 15, 60);
}

/** Circular distance (minutes) from a clock minute-of-day to the [lo,hi] band. */
function distanceToBand(minuteOfDay: number, lo: number, hi: number): number {
  if (minuteOfDay >= lo && minuteOfDay <= hi) return 0;
  const circ = (a: number, b: number) => {
    const d = Math.abs(a - b);
    return Math.min(d, 1440 - d);
  };
  return Math.min(circ(minuteOfDay, lo), circ(minuteOfDay, hi));
}

function timingScore(startTs: number, endTs: number, regularityScore?: number | null): number {
  const midMs = (startTs + endTs) / 2;
  const mid = new Date(midMs);
  const minuteOfDay = mid.getHours() * 60 + mid.getMinutes();
  // Biological night: a sleep midpoint between 00:00 and 03:00 is best-aligned.
  const align = clamp(100 - 0.5 * distanceToBand(minuteOfDay, 0, 180), 20, 100);
  return regularityScore != null && Number.isFinite(regularityScore)
    ? 0.6 * align + 0.4 * clamp(regularityScore)
    : align;
}

export function computeSleepScore(
  sleep: SleepResult,
  opts?: { confidenceCapPct?: number | null; regularityScore?: number | null },
): SleepScore {
  const asleep = sleep.asleepMin;
  const need = sleep.neededMin || 480;
  const eff = sleep.efficiency * 100;
  const remPct = asleep > 0 ? (sleep.stages.rem / asleep) * 100 : 0;
  const deepPct = asleep > 0 ? (sleep.stages.deep / asleep) * 100 : 0;
  const wakeEvents = midSleepAwakeEvents(sleep.hypnogram);
  const wakeAfterOnsetMin = midSleepAwakeMinutes(sleep.hypnogram);

  const duration = durationAdequacy(asleep, need);
  const efficiency = band(eff, 85, 95); // Oura: 85 good, 95 optimal
  const rem = twoSided(remPct, 20, 25, 13, 32, 8, 45); // healthy REM ≈ 20-25% of sleep
  const deep = twoSided(deepPct, 15, 20, 12, 24, 8, 30); // healthy deep ≈ 15-20% of sleep
  const restfulness = clamp(100 - wakeEvents * 7 - wakeAfterOnsetMin * 0.7);
  const latency = latencyScore(sleep.latencyMin);
  const timing = timingScore(sleep.startTs, sleep.endTs, opts?.regularityScore);

  // Staging confidence: REM and deep are down-weighted by this factor and the
  // freed weight moves to the high-confidence contributors, so stage values from
  // a low-confidence night cannot move the score.
  const hrvCoverage = clamp01(sleep.hrvMin / (0.5 * Math.max(1, asleep)));
  const unscoredFraction = clamp01(sleep.unscoredMin / Math.max(1, sleep.inBedMin));
  const sourceFactor = sleep.source === 'manual_duration' ? 0 : 1;
  const c = clamp01(hrvCoverage * (1 - unscoredFraction) * sourceFactor);

  let wDur = 0.3;
  let wEff = 0.15;
  let wRest = 0.15;
  const wRem = 0.13 * c;
  const wDeep = 0.13 * c;
  const freed = 0.26 * (1 - c);
  wDur += freed * 0.5;
  wEff += freed * 0.25;
  wRest += freed * 0.25;
  const wLat = 0.07;
  const wTiming = 0.07;

  const contributors: SleepContributor[] = [
    { key: 'total', label: 'Total sleep', score: Math.round(duration), detail: `${Math.round(asleep)} of ${Math.round(need)} min needed` },
    { key: 'efficiency', label: 'Efficiency', score: Math.round(efficiency), detail: `${Math.round(eff)}%` },
    { key: 'restfulness', label: 'Restfulness', score: Math.round(restfulness), detail: `${wakeEvents} awakening${wakeEvents === 1 ? '' : 's'}, ${wakeAfterOnsetMin}m awake` },
    { key: 'rem', label: 'REM sleep', score: Math.round(rem), detail: `${Math.round(remPct)}% of sleep${c < 0.4 ? ' — low staging confidence' : ''}` },
    { key: 'deep', label: 'Deep (SWS) sleep', score: Math.round(deep), detail: `${Math.round(deepPct)}% of sleep${c < 0.4 ? ' — low staging confidence' : ''}` },
    { key: 'latency', label: 'Sleep latency', score: Math.round(latency), detail: `${Math.round(sleep.latencyMin)} min to fall asleep` },
    { key: 'timing', label: 'Timing', score: Math.round(timing), detail: 'circadian alignment' },
  ];

  const totalWeight = wDur + wEff + wRest + wRem + wDeep + wLat + wTiming;
  const rawScore = Math.round(
    clamp(
      (wDur * duration + wEff * efficiency + wRest * restfulness + wRem * rem + wDeep * deep + wLat * latency + wTiming * timing) /
        totalWeight,
      1,
      99,
    ),
  );
  const confidenceCapPct = opts?.confidenceCapPct == null ? null : Math.round(clamp(opts.confidenceCapPct, 1, 100));
  const score = Math.round(Math.min(rawScore, confidenceCapPct ?? 100));
  return { score, contributors, confidenceCapPct, cappedByConfidence: confidenceCapPct != null && score < rawScore };
}

function midSleepAwakeEvents(hypnogram: SleepResult['hypnogram']): number {
  const firstSleep = hypnogram.findIndex((s) => s.stage !== 'awake');
  if (firstSleep < 0) return 0;
  let lastSleep = -1;
  for (let i = hypnogram.length - 1; i >= 0; i -= 1) {
    if (hypnogram[i]!.stage !== 'awake') {
      lastSleep = i;
      break;
    }
  }
  if (lastSleep <= firstSleep) return 0;
  let events = 0;
  for (let i = firstSleep + 1; i < lastSleep; i += 1) {
    if (hypnogram[i]!.stage === 'awake') events += 1;
  }
  return events;
}

function midSleepAwakeMinutes(hypnogram: SleepResult['hypnogram']): number {
  const firstSleep = hypnogram.findIndex((s) => s.stage !== 'awake');
  if (firstSleep < 0) return 0;
  let lastSleep = -1;
  for (let i = hypnogram.length - 1; i >= 0; i -= 1) {
    if (hypnogram[i]!.stage !== 'awake') {
      lastSleep = i;
      break;
    }
  }
  if (lastSleep <= firstSleep) return 0;
  let minutes = 0;
  for (let i = firstSleep + 1; i < lastSleep; i += 1) {
    const segment = hypnogram[i]!;
    if (segment.stage === 'awake') minutes += segment.minutes;
  }
  return minutes;
}
