/**
 * Daily recovery score (0–100), WHOOP-style, from published inputs:
 *   - HRV (RMSSD) today vs personal baseline — dominant signal
 *   - Resting HR today vs personal baseline — lower is better
 *   - Respiratory rate stability vs personal baseline (when available)
 *   - Skin-temperature stability vs personal baseline (when available)
 *   - Sleep performance (achieved / needed)
 *
 * WHOOP's exact weighting is proprietary; this uses a transparent weighted blend
 * (HRV-led, with RHR, respiration, skin temperature and sleep as supporting inputs). Output is a
 * labelled approximation.
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
  respiratoryRate?: number | null;
  respiratoryBaseline?: number | null;
  respiratorySd?: number | null;
  skinTemperature?: number | null;
  skinTemperatureBaseline?: number | null;
  skinTemperatureSd?: number | null;
  sleepPerformance: number | null; // 0..1 (achieved/needed), or null if unknown
};

export type RecoveryResult = {
  score: number; // 0..100
  band: 'green' | 'yellow' | 'red';
  hrvSub: number;
  rhrSub: number;
  respSub: number | null;
  tempSub: number | null;
  sleepSub: number;
};

/** Logistic squash of a z-score to 0..100, centred at 50. */
function zToScore(z: number, gain = 1.1): number {
  const s = 100 / (1 + Math.exp(-gain * z));
  return s;
}

export function computeRecovery(inp: RecoveryInputs): RecoveryResult | null {
  if (
    !Number.isFinite(inp.rmssd) ||
    !Number.isFinite(inp.rmssdBaseline) ||
    !Number.isFinite(inp.rmssdSd) ||
    !Number.isFinite(inp.restingHr) ||
    !Number.isFinite(inp.rhrBaseline) ||
    !Number.isFinite(inp.rhrSd) ||
    inp.rmssd <= 0 ||
    inp.rmssdBaseline <= 0 ||
    inp.rmssdSd <= 0 ||
    inp.restingHr <= 0 ||
    inp.rhrBaseline <= 0 ||
    inp.rhrSd <= 0
  ) {
    return null;
  }
  // HRV: higher than baseline -> better.
  const hrvZ = inp.rmssdSd > 0 ? (inp.rmssd - inp.rmssdBaseline) / inp.rmssdSd : 0;
  const hrvSub = zToScore(hrvZ);

  // RHR: lower than baseline -> better, so invert the delta.
  const rhrZ = inp.rhrSd > 0 ? (inp.rhrBaseline - inp.restingHr) / inp.rhrSd : 0;
  const rhrSub = zToScore(rhrZ);

  // Sleep performance maps 0..1 -> 0..100; if unknown, fall back to neutral 60.
  const sleepSub = inp.sleepPerformance === null ? 60 : clamp(inp.sleepPerformance * 100, 0, 100);

  const hasResp =
    inp.respiratoryRate != null &&
    inp.respiratoryBaseline != null &&
    Number.isFinite(inp.respiratoryRate) &&
    Number.isFinite(inp.respiratoryBaseline);
  const respSd = inp.respiratorySd && inp.respiratorySd > 0 ? inp.respiratorySd : 1;
  const respSub = hasResp
    ? zToScore(-Math.abs(((inp.respiratoryRate as number) - (inp.respiratoryBaseline as number)) / respSd), 0.9)
    : null;

  const hasTemp =
    inp.skinTemperature != null &&
    inp.skinTemperatureBaseline != null &&
    inp.skinTemperatureSd != null &&
    Number.isFinite(inp.skinTemperature) &&
    Number.isFinite(inp.skinTemperatureBaseline) &&
    Number.isFinite(inp.skinTemperatureSd) &&
    inp.skinTemperatureSd > 0;
  const tempSub = hasTemp
    ? zToScore(
        -Math.abs(
          ((inp.skinTemperature as number) - (inp.skinTemperatureBaseline as number)) /
            (inp.skinTemperatureSd as number),
        ),
      )
    : null;

  const terms: Array<[number, number]> = [
    [0.4, hrvSub],
    [0.25, rhrSub],
    [0.15, sleepSub],
  ];
  if (respSub != null) terms.push([0.1, respSub]);
  if (tempSub != null) terms.push([0.1, tempSub]);
  const weight = terms.reduce((sum, [termWeight]) => sum + termWeight, 0);
  const score = clamp(terms.reduce((sum, [termWeight, value]) => sum + termWeight * value, 0) / weight, 1, 99);
  return {
    score: Math.round(score),
    band: score >= 67 ? 'green' : score >= 34 ? 'yellow' : 'red',
    hrvSub: Math.round(hrvSub),
    rhrSub: Math.round(rhrSub),
    respSub: respSub == null ? null : Math.round(respSub),
    tempSub: tempSub == null ? null : Math.round(tempSub),
    sleepSub: Math.round(sleepSub),
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
