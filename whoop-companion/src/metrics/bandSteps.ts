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
  firstTs: number;
  lastTs: number;
};

// WHOOP 5/MG history exposes a cumulative step-like counter. The later capture
// from this firmware ended near 208 raw counter increments when the user expected
// roughly 200 real steps, so default to 1:1 and let calibration fine-tune it.
export const WHOOP5_STEP_TICKS_PER_STEP = 1;
export const LEGACY_WHOOP5_STEP_TICKS_PER_STEP = 8;
export const MIN_STEP_TICKS_PER_STEP = 0.5;
export const MAX_STEP_TICKS_PER_STEP = 30;

const MAX_INTERVAL_MS = 15 * 60 * 1000;
const MAX_RAW_DELTA = 512;
// WHOOP history batches counter increments; the July capture has legitimate
// one-second jumps of 6-7 units during a known short walk. Keep a ceiling high
// enough for those batches while still rejecting wild counter corruption.
const MAX_STEPS_PER_SECOND = 8;

export function estimateBandStepsFromCounters(
  rows: BandStepCounterRow[],
  calibrationDivisor = WHOOP5_STEP_TICKS_PER_STEP,
): BandStepEstimate | null {
  if (rows.length < 2 || calibrationDivisor <= 0) return null;
  const sorted = rows.slice().sort((a, b) => a.ts - b.ts);
  const firstTs = sorted[0]?.ts ?? 0;
  const lastTs = sorted[sorted.length - 1]?.ts ?? firstTs;
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
    firstTs,
    lastTs,
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
