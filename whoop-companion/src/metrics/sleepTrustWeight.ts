import type { DailyMetricRow } from '../db/database';

export function sleepTrustWeight(day: DailyMetricRow): number {
  const confidence = day.sleepDetail?.confidence;
  if (confidence === 'high') return 1;
  if (confidence === 'medium') return 0.7;
  if (confidence === 'low') return 0;
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
