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
  const out: number[] = [];
  let ema = samples[0]!.value;
  let prevDay = samples[0]!.day;
  out.push(ema);
  for (let i = 1; i < samples.length; i += 1) {
    const s = samples[i]!;
    const w = alphaForGap(s.day - prevDay, halfLifeDays); // weight on history
    ema = w * ema + (1 - w) * s.value;
    prevDay = s.day;
    out.push(ema);
  }
  return out;
}

/** Current baseline only. */
export function emaBaseline(samples: DayValue[], halfLifeDays = 7): number | null {
  const s = emaSeries(samples, halfLifeDays);
  return s.length ? (s[s.length - 1] as number) : null;
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
