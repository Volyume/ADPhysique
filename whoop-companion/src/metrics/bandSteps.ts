export type BandStepCounterRow = {
  ts: number;
  counter: number;
  activityClass?: number | null;
};

export type BandStepEstimate = {
  steps: number;
  rawTicks: number;
  usedIntervals: number;
  droppedIntervals: number;
  calibrationDivisor: number;
  confidence: 'low' | 'medium';
};

// WHOOP 5/MG history exposes a cumulative motion counter. On the user's capture
// it over-reports literal steps by ~7.5x, so treat it as ticks and calibrate it
// down instead of displaying raw deltas as steps.
export const WHOOP5_STEP_TICKS_PER_STEP = 8;
export const MIN_STEP_TICKS_PER_STEP = 2;
export const MAX_STEP_TICKS_PER_STEP = 30;

const MAX_INTERVAL_MS = 15 * 60 * 1000;
const MAX_RAW_DELTA = 512;
const MAX_STEPS_PER_SECOND = 4.2; // 252 spm ceiling after calibration.

export function estimateBandStepsFromCounters(
  rows: BandStepCounterRow[],
  calibrationDivisor = WHOOP5_STEP_TICKS_PER_STEP,
): BandStepEstimate | null {
  if (rows.length < 2 || calibrationDivisor <= 0) return null;
  const sorted = rows.slice().sort((a, b) => a.ts - b.ts);
  let rawTicks = 0;
  let usedIntervals = 0;
  let droppedIntervals = 0;
  let activeIntervals = 0;

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (!prev || !cur) continue;

    const dtMs = cur.ts - prev.ts;
    if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > MAX_INTERVAL_MS) {
      droppedIntervals += 1;
      continue;
    }

    let delta = cur.counter - prev.counter;
    if (delta < 0 && prev.counter > 60_000 && cur.counter < 5_000) {
      delta += 65_536;
    }
    if (delta <= 0) continue;

    const dtSec = Math.max(1, dtMs / 1000);
    const maxRawRate = MAX_STEPS_PER_SECOND * calibrationDivisor;
    if (delta > MAX_RAW_DELTA || delta / dtSec > maxRawRate) {
      droppedIntervals += 1;
      continue;
    }

    rawTicks += delta;
    usedIntervals += 1;
    if (prev.activityClass === 1 || prev.activityClass === 2 || cur.activityClass === 1 || cur.activityClass === 2) {
      activeIntervals += 1;
    }
  }

  if (usedIntervals <= 0) return null;
  return {
    steps: Math.max(0, Math.round(rawTicks / calibrationDivisor)),
    rawTicks,
    usedIntervals,
    droppedIntervals,
    calibrationDivisor,
    confidence: activeIntervals > 0 ? 'medium' : 'low',
  };
}

export function estimateStepsFromBandCounters(
  rows: BandStepCounterRow[],
  calibrationDivisor = WHOOP5_STEP_TICKS_PER_STEP,
): number | null {
  return estimateBandStepsFromCounters(rows, calibrationDivisor)?.steps ?? null;
}

export function normaliseStepDivisor(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return WHOOP5_STEP_TICKS_PER_STEP;
  const clamped = Math.max(MIN_STEP_TICKS_PER_STEP, Math.min(MAX_STEP_TICKS_PER_STEP, value));
  return Math.round(clamped * 10) / 10;
}
