import type { DailyMetricRow } from '../db/database';

export type SleepTrustTier = 'none' | 'low' | 'medium' | 'high';

export type SleepTrustSource = {
  confidence?: 'high' | 'medium' | 'low' | null;
  coveragePct?: number | null;
  signalMin?: number | null;
};

export function sleepTrustTier(source: SleepTrustSource | null | undefined): SleepTrustTier {
  if (!source) return 'none';
  const coveragePct = source.coveragePct ?? 100;
  const signalMin = source.signalMin ?? 999;
  if (source.confidence === 'low' || coveragePct < 60 || signalMin < 150) return 'low';
  if (source.confidence === 'medium' || coveragePct < 80 || signalMin < 240) return 'medium';
  return 'high';
}

export function sleepTrustWeight(day: DailyMetricRow): number {
  const tier = sleepTrustTier(day.sleepDetail);
  if (tier === 'high') return 1;
  if (tier === 'medium') return 0.7;
  if (tier === 'low') return 0;
  return day.sleepDetail?.coveragePct != null ? 0.45 : 1;
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
