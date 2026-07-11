export type BandStepCounterRow = {
  ts: number;
  counter: number;
  activityClass?: number | null;
};

export type BandStepEstimate = {
  steps: number;
  /** Movement-confirmed ticks eligible for publication and calibration. */
  rawTicks: number;
  acceptedRawTicks: number;
  /** Plausible counter ticks rejected because neither endpoint showed movement. */
  rejectedInactiveRawTicks: number;
  sampleCount: number;
  usedIntervals: number;
  activeIntervals: number;
  activeRawTicks: number;
  inactiveRawTicks: number;
  movementLinkedPct: number;
  droppedIntervals: number;
  resetCount: number;
  ambiguousResetCount: number;
  calibrationDivisor: number;
  confidence: 'low' | 'medium' | 'high';
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

export type BandStepEstimateOptions = {
  /** Count a delta only when its endpoint is inside this half-open range. */
  countFromTs?: number;
  countToTs?: number;
};

const MAX_INTERVAL_MS = 15 * 60 * 1000;
const MAX_RAW_DELTA = 512;
const COUNTER_MODULUS = 65_536;
const AMBIGUOUS_ROLLOVER_WINDOW = 4_096;
// WHOOP history batches counter increments; the July capture has legitimate
// one-second jumps of 6-7 units during a known short walk. Keep a ceiling high
// enough for those batches while still rejecting wild counter corruption.
const MAX_STEPS_PER_SECOND = 8;

export function estimateBandStepsFromCounters(
  rows: BandStepCounterRow[],
  calibrationDivisor = WHOOP5_STEP_TICKS_PER_STEP,
  options: BandStepEstimateOptions = {},
): BandStepEstimate | null {
  if (rows.length < 2 || calibrationDivisor <= 0) return null;
  const sorted = rows.slice().sort((a, b) => a.ts - b.ts);
  const firstTs = sorted[0]?.ts ?? 0;
  const lastTs = sorted[sorted.length - 1]?.ts ?? firstTs;
  let rawTicks = 0;
  let usedIntervals = 0;
  let droppedIntervals = 0;
  let activeIntervals = 0;
  let activeRawTicks = 0;
  let inactiveRawTicks = 0;
  let resetCount = 0;
  let ambiguousResetCount = 0;

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (!prev || !cur) continue;
    if (options.countFromTs != null && cur.ts < options.countFromTs) continue;
    if (options.countToTs != null && cur.ts >= options.countToTs) continue;

    const dtMs = cur.ts - prev.ts;
    if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > MAX_INTERVAL_MS) {
      droppedIntervals += 1;
      continue;
    }

    const dtSec = Math.max(1, dtMs / 1000);
    const rawDelta = cur.counter - prev.counter;
    if (!Number.isFinite(rawDelta)) {
      droppedIntervals += 1;
      continue;
    }
    let delta = rawDelta;
    if (delta < 0) {
      const rolloverDelta = COUNTER_MODULUS - prev.counter + cur.counter;
      const maxRawRate = MAX_STEPS_PER_SECOND * calibrationDivisor;
      const stronglyConstrainedRollover =
        prev.counter >= COUNTER_MODULUS - MAX_RAW_DELTA &&
        cur.counter <= MAX_RAW_DELTA &&
        rolloverDelta > 0 &&
        rolloverDelta <= MAX_RAW_DELTA &&
        rolloverDelta / dtSec <= maxRawRate;
      if (stronglyConstrainedRollover) {
        delta = rolloverDelta;
      } else {
        resetCount += 1;
        if (prev.counter >= COUNTER_MODULUS - AMBIGUOUS_ROLLOVER_WINDOW && cur.counter <= AMBIGUOUS_ROLLOVER_WINDOW) {
          ambiguousResetCount += 1;
        }
        continue;
      }
    }
    if (delta <= 0) continue;

    const maxRawRate = MAX_STEPS_PER_SECOND * calibrationDivisor;
    if (delta > MAX_RAW_DELTA || delta / dtSec > maxRawRate) {
      droppedIntervals += 1;
      continue;
    }

    const movementLinked =
      prev.activityClass === 1 || prev.activityClass === 2 || cur.activityClass === 1 || cur.activityClass === 2;
    usedIntervals += 1;
    if (movementLinked) {
      rawTicks += delta;
      activeIntervals += 1;
      activeRawTicks += delta;
    } else {
      inactiveRawTicks += delta;
    }
  }

  if (usedIntervals <= 0) return null;
  const movementLinkedPct = Math.round((activeRawTicks / Math.max(1, activeRawTicks + inactiveRawTicks)) * 100);
  const spanMs = Math.max(0, lastTs - firstTs);
  const confidence =
    activeIntervals >= 5 && usedIntervals >= 20 && resetCount === 0 && movementLinkedPct >= 55
      ? 'high'
      : activeIntervals >= 3 && usedIntervals >= 5 && resetCount === 0 && movementLinkedPct >= 55 && spanMs >= 5 * 60 * 1000
        ? 'medium'
        : 'low';
  return {
    steps: Math.max(0, Math.round(rawTicks / calibrationDivisor)),
    rawTicks,
    acceptedRawTicks: rawTicks,
    rejectedInactiveRawTicks: inactiveRawTicks,
    sampleCount: sorted.length,
    usedIntervals,
    activeIntervals,
    activeRawTicks,
    inactiveRawTicks,
    movementLinkedPct,
    droppedIntervals,
    resetCount,
    ambiguousResetCount,
    calibrationDivisor,
    confidence,
    firstTs,
    lastTs,
  };
}

/** Only publish counters corroborated by the WHOOP's own movement class. */
export function bandStepEstimateIsTrusted(estimate: BandStepEstimate | null | undefined): boolean {
  return !!estimate && estimate.steps > 0 && estimate.rawTicks > 0 && estimate.resetCount === 0 && estimate.confidence !== 'low';
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
