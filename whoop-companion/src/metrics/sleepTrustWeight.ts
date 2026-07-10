import type { DailyMetricRow } from '../db/database';

export type SleepTrustTier = 'none' | 'low' | 'medium' | 'high';

export type SleepTrustSource = {
  confidence?: 'high' | 'medium' | 'low' | null;
  coveragePct?: number | null;
  signalMin?: number | null;
  inBedMin?: number | null;
};

export const SLEEP_TRUST_LOW_COVERAGE_PCT = 60;
export const SLEEP_TRUST_LOW_SIGNAL_MIN = 150;
export const SLEEP_TRUST_MEDIUM_COVERAGE_PCT = 80;
export const SLEEP_TRUST_MEDIUM_SIGNAL_MIN = 240;

export function sleepTrustTier(source: SleepTrustSource | null | undefined): SleepTrustTier {
  if (!source) return 'none';
  const coveragePct = source.coveragePct ?? 100;
  const signalMin = source.signalMin ?? 999;
  const inBedMin = source.inBedMin ?? 0;
  const lowSignalMin = inBedMin > 0
    ? Math.min(SLEEP_TRUST_LOW_SIGNAL_MIN, Math.max(60, Math.ceil(inBedMin * 0.5)))
    : SLEEP_TRUST_LOW_SIGNAL_MIN;
  const mediumSignalMin = inBedMin > 0
    ? Math.min(SLEEP_TRUST_MEDIUM_SIGNAL_MIN, Math.max(90, Math.ceil(inBedMin * 0.7)))
    : SLEEP_TRUST_MEDIUM_SIGNAL_MIN;
  if (source.confidence === 'low' || coveragePct < SLEEP_TRUST_LOW_COVERAGE_PCT || signalMin < lowSignalMin) return 'low';
  if (source.confidence === 'medium' || coveragePct < SLEEP_TRUST_MEDIUM_COVERAGE_PCT || signalMin < mediumSignalMin) return 'medium';
  return 'high';
}

export function sleepTrustWeight(day: DailyMetricRow): number {
  const tier = sleepTrustTier(day.sleepDetail);
  if (tier === 'high') return 1;
  if (tier === 'medium') return 0.7;
  return 0;
}

export function sleepTrustWeightedAverage(
  rows: DailyMetricRow[],
  pick: (day: DailyMetricRow) => number | null,
): { avg: number | null; weight: number; count: number } {
  let total = 0;
  let weightTotal = 0;
  let count = 0;
  for (const row of rows) {
    const value = pick(row);
    if (value == null || !Number.isFinite(value)) continue;
    const weight = sleepTrustWeight(row);
    if (weight <= 0) continue;
    total += value * weight;
    weightTotal += weight;
    count += 1;
  }
  return { avg: weightTotal > 0 ? total / weightTotal : null, weight: weightTotal, count };
}
