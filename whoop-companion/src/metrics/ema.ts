/**
 * Exponentially-weighted moving average with a configurable half-life, used to
 * turn a noisy daily signal (e.g. nightly RMSSD, RHR) into a personal baseline.
 * Mirrors the smoothing approach VOLYUME uses in src/lib/recoveryEMA.js
 * (7-day half-life), reimplemented here for this app's stack.
 *
 * Samples are {day, value} where `day` is a day index or epoch-day; spacing is
 * accounted for so missing days decay correctly.
 */

export type DayValue = { day: number; value: number };

export type BaselineOutlierMethod = 'mad' | 'winsorized';

export type BaselineOptions = {
  halfLifeDays?: number;
  method?: BaselineOutlierMethod;
  madMultiplier?: number;
  minimumSamples?: number;
  calibrationSamples?: number;
  windowDays?: number | null;
};

export type BaselineCalibration = {
  sampleCount: number;
  minimumSamples: number;
  calibrationSamples: number;
  factor: number;
  status: 'unavailable' | 'provisional' | 'calibrated';
  label: 'unavailable' | 'provisional' | 'calibrated';
};

export type BaselineEstimate = BaselineCalibration & {
  value: number | null;
  baseline: number | null;
  robustScale: number;
  acceptedSamples: number;
  rejectedSamples: number;
  method: BaselineOutlierMethod;
  halfLifeDays: number;
};

const DEFAULT_HALF_LIFE_DAYS = 7;
const DEFAULT_MINIMUM_SAMPLES = 5;
const DEFAULT_CALIBRATION_SAMPLES = 28;
const DEFAULT_MAD_MULTIPLIER = 3.5;
const MAD_SCALE = 1.4826;

function finiteValues(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value));
}

/** Median of finite values, or null when no usable values are present. */
export function median(values: number[]): number | null {
  const sorted = finiteValues(values).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

/** Median absolute deviation, expressed in the input unit. */
export function mad(values: number[], center = median(values)): number {
  if (center == null) return 0;
  return median(values.map((value) => Math.abs(value - center))) ?? 0;
}

function normalizedHalfLife(value: number | undefined): number {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : DEFAULT_HALF_LIFE_DAYS;
}

function normalizedMinimum(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && (value as number) >= 1 ? Math.ceil(value as number) : fallback;
}

function orderedSamples(samples: DayValue[], windowDays: number | null | undefined): DayValue[] {
  const sorted = samples
    .map((sample, index) => ({ sample, index }))
    .filter(({ sample }) => Number.isFinite(sample.day) && Number.isFinite(sample.value))
    .sort((a, b) => a.sample.day - b.sample.day || a.index - b.index)
    .map(({ sample }) => sample);
  if (!sorted.length || windowDays == null || !Number.isFinite(windowDays) || windowDays <= 0) return sorted;
  const lastDay = sorted[sorted.length - 1]!.day;
  return sorted.filter((sample) => lastDay - sample.day <= windowDays);
}

function outlierBounds(values: number[], multiplier: number): { center: number; scale: number; lower: number; upper: number } {
  const center = median(values) ?? 0;
  const scale = MAD_SCALE * mad(values, center);
  // A zero MAD is common for rounded nightly metrics. A small relative floor
  // still rejects a contaminated reading without rejecting equal rounded values.
  const threshold = Math.max(multiplier * scale, Math.abs(center) * 0.05, Number.EPSILON);
  return { center, scale, lower: center - threshold, upper: center + threshold };
}

export function baselineCalibration(
  sampleCount: number,
  minimumSamples = DEFAULT_MINIMUM_SAMPLES,
  calibrationSamples = DEFAULT_CALIBRATION_SAMPLES,
): BaselineCalibration {
  const minimum = normalizedMinimum(minimumSamples, DEFAULT_MINIMUM_SAMPLES);
  const full = Math.max(minimum, normalizedMinimum(calibrationSamples, DEFAULT_CALIBRATION_SAMPLES));
  const count = Number.isFinite(sampleCount) ? Math.max(0, Math.floor(sampleCount)) : 0;
  const status = count < minimum ? 'unavailable' : count < full ? 'provisional' : 'calibrated';
  return {
    sampleCount: count,
    minimumSamples: minimum,
    calibrationSamples: full,
    factor: Math.min(1, count / full),
    status,
    label: status,
  };
}

/**
 * Robust, time-aware baseline for a short personal history. The default
 * 28-sample calibration is intentionally separate from the five-sample
 * provisional floor: callers can display a provisional value without calling
 * it fully calibrated.
 */
export function robustBaseline(samples: DayValue[], options: BaselineOptions = {}): BaselineEstimate {
  const halfLifeDays = normalizedHalfLife(options.halfLifeDays);
  const method = options.method ?? 'mad';
  const madMultiplier = Number.isFinite(options.madMultiplier) && (options.madMultiplier as number) > 0
    ? (options.madMultiplier as number)
    : DEFAULT_MAD_MULTIPLIER;
  const chronological = orderedSamples(samples, options.windowDays ?? 30);
  const calibration = baselineCalibration(
    chronological.length,
    options.minimumSamples,
    options.calibrationSamples,
  );
  const values = chronological.map((sample) => sample.value);
  const bounds = outlierBounds(values, madMultiplier);
  const treated = chronological.map((sample) => {
    if (method === 'winsorized') {
      return { ...sample, value: Math.max(bounds.lower, Math.min(bounds.upper, sample.value)) };
    }
    return sample;
  });
  const accepted = method === 'winsorized'
    ? chronological
    : chronological.filter((sample) => sample.value >= bounds.lower && sample.value <= bounds.upper);
  const series = method === 'winsorized' ? treated : accepted;
  const ema = emaSeries(series, halfLifeDays);
  const estimate = accepted.length >= calibration.minimumSamples
    ? ema.length ? ema[ema.length - 1]! : null
    : null;
  return {
    ...calibration,
    value: estimate,
    baseline: estimate,
    robustScale: bounds.scale,
    acceptedSamples: accepted.length,
    rejectedSamples: chronological.length - accepted.length,
    method,
    halfLifeDays,
  };
}

/** Numeric form for callers that only need the current baseline. */
export function robustEmaBaseline(samples: DayValue[], options: BaselineOptions = {}): number | null {
  return robustBaseline(samples, { ...options, minimumSamples: options.minimumSamples ?? 1 }).value;
}

/**
 * Dispersion over the same outlier-filtered sample set as robustBaseline.
 * Keeping the baseline and its z-score scale on one accepted set prevents a
 * rejected night from widening the recovery denominator.
 */
export function robustStdev(samples: DayValue[], options: BaselineOptions = {}): number {
  const method = options.method ?? 'mad';
  const madMultiplier = Number.isFinite(options.madMultiplier) && (options.madMultiplier as number) > 0
    ? (options.madMultiplier as number)
    : DEFAULT_MAD_MULTIPLIER;
  const chronological = orderedSamples(samples, options.windowDays ?? 30);
  const values = chronological.map((sample) => sample.value);
  const bounds = outlierBounds(values, madMultiplier);
  const accepted = method === 'winsorized'
    ? chronological.map((sample) => Math.max(bounds.lower, Math.min(bounds.upper, sample.value)))
    : chronological
        .filter((sample) => sample.value >= bounds.lower && sample.value <= bounds.upper)
        .map((sample) => sample.value);
  return stdev(accepted);
}

/** Decay constant from a half-life expressed in the same unit as `day`. */
function alphaForGap(gap: number, halfLife: number): number {
  if (gap <= 0) return 1;
  // weight of the previous value after `gap` steps.
  return Math.pow(0.5, gap / halfLife);
}

/**
 * Compute the EMA series. Returns one EMA value per input sample (in order).
 * The last element is the current baseline.
 */
export function emaSeries(samples: DayValue[], halfLifeDays = 7): number[] {
  if (samples.length === 0) return [];
  const chronological = orderedSamples(samples, null);
  if (chronological.length === 0) return [];
  const halfLife = normalizedHalfLife(halfLifeDays);
  const out: number[] = [];
  let ema = chronological[0]!.value;
  let prevDay = chronological[0]!.day;
  out.push(ema);
  for (let i = 1; i < chronological.length; i += 1) {
    const s = chronological[i]!;
    const w = alphaForGap(s.day - prevDay, halfLife); // weight on history
    ema = w * ema + (1 - w) * s.value;
    prevDay = s.day;
    out.push(ema);
  }
  return out;
}

/** Current baseline only. */
export function emaBaseline(samples: DayValue[], halfLifeDays = 7): number | null {
  return robustEmaBaseline(samples, { halfLifeDays, windowDays: null });
}

/**
 * Standard deviation of the values about their own mean — used to express
 * today's reading as a deviation from baseline in SD units.
 */
export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
  return Math.sqrt(v);
}
