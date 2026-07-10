export const MIN_PLAUSIBLE_HR_BPM = 30;
export const MAX_PLAUSIBLE_HR_BPM = 220;

export function isPlausibleHeartRate(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_PLAUSIBLE_HR_BPM &&
    value <= MAX_PLAUSIBLE_HR_BPM
  );
}

export function isDirectSleepHeartRateSample(sample: {
  bpm: unknown;
  source?: string | null;
}): boolean {
  return (
    isPlausibleHeartRate(sample.bpm) &&
    (sample.source === 'whoop5_v18' || sample.source === 'live_standard')
  );
}

export function cleanRrIntervals(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value) && value >= 300 && value <= 2000,
  );
}

export function finiteRange(
  value: unknown,
  minimum: number,
  maximum: number,
  round = false,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) return null;
  return round ? Math.round(value) : value;
}
