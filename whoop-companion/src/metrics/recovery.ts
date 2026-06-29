/**
 * Daily recovery score (0–100), WHOOP-style, from published inputs:
 *   - HRV (RMSSD) today vs personal baseline — dominant signal
 *   - Resting HR today vs personal baseline — lower is better
 *   - Sleep performance (achieved / needed)
 *
 * WHOOP's exact weighting is proprietary; this uses a transparent weighted blend
 * (HRV 0.5, RHR 0.25, sleep 0.25). Output is a labelled approximation.
 *
 * Baselines are EMA values (see ema.ts); the SD of recent readings turns a raw
 * delta into a bounded sub-score.
 */

export type RecoveryInputs = {
  rmssd: number; // today's overnight RMSSD (ms)
  rmssdBaseline: number;
  rmssdSd: number; // SD of recent RMSSD readings
  restingHr: number; // today's overnight RHR (bpm)
  rhrBaseline: number;
  rhrSd: number;
  sleepPerformance: number | null; // 0..1 (achieved/needed), or null if unknown
};

export type RecoveryResult = {
  score: number; // 0..100
  band: 'green' | 'yellow' | 'red';
  hrvSub: number;
  rhrSub: number;
  sleepSub: number;
};

/** Logistic squash of a z-score to 0..100, centred at 50. */
function zToScore(z: number, gain = 1.1): number {
  const s = 100 / (1 + Math.exp(-gain * z));
  return s;
}

export function computeRecovery(inp: RecoveryInputs): RecoveryResult {
  // HRV: higher than baseline -> better.
  const hrvZ = inp.rmssdSd > 0 ? (inp.rmssd - inp.rmssdBaseline) / inp.rmssdSd : 0;
  const hrvSub = zToScore(hrvZ);

  // RHR: lower than baseline -> better, so invert the delta.
  const rhrZ = inp.rhrSd > 0 ? (inp.rhrBaseline - inp.restingHr) / inp.rhrSd : 0;
  const rhrSub = zToScore(rhrZ);

  // Sleep performance maps 0..1 -> 0..100; if unknown, fall back to neutral 60.
  const sleepSub = inp.sleepPerformance === null ? 60 : clamp(inp.sleepPerformance * 100, 0, 100);

  const score = clamp(0.5 * hrvSub + 0.25 * rhrSub + 0.25 * sleepSub, 1, 99);
  return {
    score: Math.round(score),
    band: score >= 67 ? 'green' : score >= 34 ? 'yellow' : 'red',
    hrvSub: Math.round(hrvSub),
    rhrSub: Math.round(rhrSub),
    sleepSub: Math.round(sleepSub),
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
