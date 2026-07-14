import { baselineCalibration } from './ema';
import type { BaselineCalibration } from './ema';

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
  baselineSampleCount?: number;
  minimumBaselineSamples?: number;
  calibrationSamples?: number;
  weights?: RecoveryWeightProfile; // defaults to the proprietary Pulse v2 blend
  // Log-domain RMSSD (RMSSD is log-normal). When the log baseline is supplied,
  // HRV uses a natural-log z-score; otherwise it falls back to the linear z.
  lnRmssd?: number | null;
  lnRmssdBaseline?: number | null;
  lnRmssdSd?: number | null;
  // Multi-day HRV-trend sub-score (0..100, short vs long baseline balance),
  // included as its own contributor when available and dropped otherwise.
  hrvTrendSub?: number | null;
  // Bounded readiness modifier (load + autonomic stability). Must be <= 1: it may
  // only trim the score, never inflate it. Absent/undefined means no effect (1).
  readinessModifier?: number | null;
};

/** Relative weight of each recovery signal before renormalisation. */
export type RecoveryWeightProfile = Record<RecoveryContributorKey, number>;

// WHOOP's published Recovery is HRV-dominant and built from HRV, resting heart
// rate and respiratory rate measured during sleep (HRV carries most of the
// predictive value; RHR and respiration add non-overlapping information). WHOOP
// surfaces sleep performance and skin temperature elsewhere rather than folding
// them into Recovery, so this profile drops those terms. The ~65/20/15 split
// mirrors WHOOP's own explanation of the score. The weighting profile is a
// sourced approximation of a proprietary model, not WHOOP's exact coefficients.
export const WHOOP_RECOVERY_WEIGHTS: RecoveryWeightProfile = {
  hrv: 0.65,
  hrvTrend: 0,
  rhr: 0.2,
  resp: 0.15,
  sleep: 0,
  temp: 0,
};

// The previous transparent blend, retained so any night can be rescored and the
// two profiles compared, and so the change stays reversible.
export const LEGACY_RECOVERY_WEIGHTS: RecoveryWeightProfile = {
  hrv: 0.4,
  hrvTrend: 0,
  rhr: 0.25,
  resp: 0.1,
  sleep: 0.15,
  temp: 0.1,
};

// VOLYUME's proprietary recovery profile. The default profile weights HRV family
// highest (hrv + hrvTrend = 0.52), then RHR, sleep, respiration and skin
// temperature, and renormalises over available terms. Adds a multi-day HRV-trend
// term and a skin-temperature term that WHOOP's recovery omits.
export const PULSE_V2_RECOVERY_WEIGHTS: RecoveryWeightProfile = {
  hrv: 0.42,
  hrvTrend: 0.1,
  rhr: 0.18,
  resp: 0.1,
  temp: 0.08,
  sleep: 0.12,
};

export const DEFAULT_RECOVERY_WEIGHTS: RecoveryWeightProfile = PULSE_V2_RECOVERY_WEIGHTS;

export type RecoveryContributorKey = 'hrv' | 'hrvTrend' | 'rhr' | 'resp' | 'temp' | 'sleep';

export type RecoveryContributor = {
  key: RecoveryContributorKey;
  score: number;
  weight: number;
  contribution: number;
};

export type RecoveryResult = {
  score: number; // 0..100
  band: 'green' | 'yellow' | 'red';
  hrvSub: number;
  hrvTrendSub: number | null;
  rhrSub: number;
  respSub: number | null;
  tempSub: number | null;
  sleepSub: number;
  contributors: RecoveryContributor[];
  calibration: BaselineCalibration | null;
};

/** Five nights can produce a provisional value; 28 nights are fully calibrated. */
export function recoveryCalibration(
  sampleCount: number,
  minimumSamples = 5,
  calibrationSamples = 28,
): BaselineCalibration {
  return baselineCalibration(sampleCount, minimumSamples, calibrationSamples);
}

/** Pull a provisional score towards neutral until its baseline is calibrated. */
export function calibrateRecoveryScore(score: number, calibration: BaselineCalibration): number {
  if (!Number.isFinite(score)) return 50;
  return Math.round(50 + (clamp(score, 1, 99) - 50) * calibration.factor);
}

/** Logistic squash of a z-score to 0..100, centred at 50. */
function zToScore(z: number, gain = 1.1): number {
  const s = 100 / (1 + Math.exp(-gain * z));
  return s;
}

// Deviation (in SDs) a supporting signal may drift before its sub-score drops
// below the neutral 50. At baseline (|z| = 0) the sub-score is above 50.
const DEVIATION_TOLERANCE_Z = 1.0;

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
  if (
    inp.baselineSampleCount != null &&
    (!Number.isFinite(inp.baselineSampleCount) || inp.baselineSampleCount < 0)
  ) {
    return null;
  }
  const calibration = inp.baselineSampleCount == null
    ? null
    : recoveryCalibration(inp.baselineSampleCount, inp.minimumBaselineSamples, inp.calibrationSamples);
  if (calibration?.status === 'unavailable') return null;
  // HRV uses a natural-log RMSSD z-score against a log-domain baseline (RMSSD is
  // log-normal), when the log baseline is supplied, falling back to the linear z.
  const hasLnHrv =
    inp.lnRmssd != null &&
    inp.lnRmssdBaseline != null &&
    inp.lnRmssdSd != null &&
    Number.isFinite(inp.lnRmssd) &&
    Number.isFinite(inp.lnRmssdBaseline) &&
    Number.isFinite(inp.lnRmssdSd) &&
    (inp.lnRmssdSd as number) > 0;
  const hrvZ = hasLnHrv
    ? clamp((inp.lnRmssd as number) - (inp.lnRmssdBaseline as number), -4, 4) / (inp.lnRmssdSd as number)
    : inp.rmssdSd > 0
      ? (inp.rmssd - inp.rmssdBaseline) / inp.rmssdSd
      : 0;
  const hrvSub = zToScore(hrvZ, 1.0);

  // Multi-day HRV-trend term (0..100), included as its own contributor when
  // available and dropped otherwise, so one good night on a declining trend does
  // not read as full recovery.
  const hrvTrendSub =
    inp.hrvTrendSub != null && Number.isFinite(inp.hrvTrendSub)
      ? clamp(inp.hrvTrendSub, 0, 100)
      : null;

  // Resting heart rate is scored asymmetrically: a lower-than-baseline reading is
  // rewarded but the reward saturates, and a reading abnormal by more than two
  // standard deviations in either direction is penalised (an unusually low
  // nightly RHR is not linearly "better" — it can flag parasympathetic overreach).
  const rhrLowerZ = inp.rhrSd > 0 ? (inp.rhrBaseline - inp.restingHr) / inp.rhrSd : 0;
  const rhrReward = Math.min(rhrLowerZ, 1.5);
  const rhrExcess = Math.max(0, Math.abs(rhrLowerZ) - 2);
  const rhrSub = zToScore(rhrReward - 0.6 * rhrExcess, 1.0);

  // Sleep performance maps 0..1 -> 0..100; if unknown, fall back to neutral 60.
  const sleepSub = inp.sleepPerformance === null ? 60 : clamp(inp.sleepPerformance * 100, 0, 100);

  const hasResp =
    inp.respiratoryRate != null &&
    inp.respiratoryBaseline != null &&
    Number.isFinite(inp.respiratoryRate) &&
    Number.isFinite(inp.respiratoryBaseline);
  // A respiratory or skin-temperature reading at baseline scores neutral-good
  // (above 50), and only a deviation of more than about one standard deviation
  // pulls the sub-score below neutral. Larger deviations still lower it
  // monotonically, so an abnormal respiratory rate or skin temperature still
  // reduces recovery — but a stable, healthy reading no longer drags a good day.
  const respSd = inp.respiratorySd && inp.respiratorySd > 0 ? inp.respiratorySd : 1;
  const respSub = hasResp
    ? zToScore(DEVIATION_TOLERANCE_Z - Math.abs(((inp.respiratoryRate as number) - (inp.respiratoryBaseline as number)) / respSd), 0.9)
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
        DEVIATION_TOLERANCE_Z -
          Math.abs(
            ((inp.skinTemperature as number) - (inp.skinTemperatureBaseline as number)) /
              (inp.skinTemperatureSd as number),
          ),
      )
    : null;

  // Build one term per signal, then derive both the score and attribution from
  // this list. A contributor cannot be counted once in the score and again in
  // the attribution payload. A signal with zero weight or missing evidence is
  // excluded from both the score and the contributor attribution; the remaining
  // weights renormalise to one below.
  const profile = inp.weights ?? DEFAULT_RECOVERY_WEIGHTS;
  const candidateTerms: Array<{ key: RecoveryContributorKey; weight: number; score: number; available: boolean }> = [
    { key: 'hrv', weight: profile.hrv, score: hrvSub, available: true },
    { key: 'hrvTrend', weight: profile.hrvTrend, score: hrvTrendSub ?? 0, available: hrvTrendSub != null },
    { key: 'rhr', weight: profile.rhr, score: rhrSub, available: true },
    { key: 'sleep', weight: profile.sleep, score: sleepSub, available: true },
    { key: 'resp', weight: profile.resp, score: respSub ?? 0, available: respSub != null },
    { key: 'temp', weight: profile.temp, score: tempSub ?? 0, available: tempSub != null },
  ];
  const terms = candidateTerms
    .filter((term) => term.available && Number.isFinite(term.weight) && term.weight > 0)
    .map(({ key, weight, score }) => ({ key, weight, score }));
  const weight = terms.reduce((sum, term) => sum + term.weight, 0);
  if (terms.length === 0 || weight <= 0) return null;
  const core = terms.reduce((sum, term) => sum + term.weight * term.score, 0) / weight;
  // Bounded load/stability modifier may only trim the score, never inflate it,
  // and equals one (no effect) when its inputs are absent.
  const modifier =
    inp.readinessModifier != null && Number.isFinite(inp.readinessModifier)
      ? clamp(inp.readinessModifier, 0.5, 1)
      : 1;
  const rawScore = clamp(core * modifier, 1, 99);
  // Apply provisional-baseline calibration exactly once, at the aggregate
  // score. Component sub-scores remain useful diagnostic signal values.
  const score = calibration ? calibrateRecoveryScore(rawScore, calibration) : Math.round(rawScore);
  const contributors: RecoveryContributor[] = terms.map((term) => ({
    ...term,
    contribution: (term.weight / weight) * score,
  }));
  return {
    score,
    band: score >= 67 ? 'green' : score >= 34 ? 'yellow' : 'red',
    hrvSub: Math.round(hrvSub),
    hrvTrendSub: hrvTrendSub == null ? null : Math.round(hrvTrendSub),
    rhrSub: Math.round(rhrSub),
    respSub: respSub == null ? null : Math.round(respSub),
    tempSub: tempSub == null ? null : Math.round(tempSub),
    sleepSub: Math.round(sleepSub),
    contributors,
    calibration,
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
