/**
 * Transparent 0–100 Sleep Score, Oura-style, as a weighted blend of named
 * contributors with published thresholds — so the number decomposes instead of
 * being a black box. Computed from the current night's SleepResult; needs no
 * history. WHOOP shows "sleep performance" (got vs needed); this adds the wider
 * quality picture (efficiency, REM, deep, restfulness, timing).
 *
 * Contributors (weights): total sleep vs need 0.35, efficiency 0.20,
 * REM share 0.15, deep share 0.15, restfulness 0.15. Each sub-score is 0–100.
 */

import { SleepResult } from './sleep';

export type SleepContributor = { key: string; label: string; score: number; detail: string };
export type SleepScore = { score: number; contributors: SleepContributor[] };

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

function band(value: number, good: number, optimal: number): number {
  // Maps value to 0..100: reaches ~85 at `good`, ~100 at `optimal`.
  if (value >= optimal) return 100;
  if (value >= good) return 85 + ((value - good) / (optimal - good)) * 15;
  return clamp((value / good) * 85);
}

function ideal(value: number, lo: number, hi: number): number {
  // 100 inside [lo,hi], tapering outside.
  if (value >= lo && value <= hi) return 100;
  if (value < lo) return clamp((value / lo) * 100);
  return clamp(100 - ((value - hi) / hi) * 100);
}

export function computeSleepScore(sleep: SleepResult): SleepScore {
  const asleep = sleep.asleepMin;
  const need = sleep.neededMin || 480;
  const eff = sleep.efficiency * 100;
  const remPct = asleep > 0 ? (sleep.stages.rem / asleep) * 100 : 0;
  const deepPct = asleep > 0 ? (sleep.stages.deep / asleep) * 100 : 0;
  const wakeEvents = sleep.hypnogram.filter((s) => s.stage === 'awake').length;

  const total = clamp((asleep / need) * 100);
  const efficiency = band(eff, 85, 95); // Oura: 85 good, 95 optimal
  const rem = ideal(remPct, 18, 26); // ~20–25% ideal
  const deep = ideal(deepPct, 13, 20); // ~13–20% ideal
  const restfulness = clamp(100 - wakeEvents * 7); // fewer awakenings better

  const contributors: SleepContributor[] = [
    { key: 'total', label: 'Total sleep', score: Math.round(total), detail: `${Math.round(asleep)} of ${Math.round(need)} min needed` },
    { key: 'efficiency', label: 'Efficiency', score: Math.round(efficiency), detail: `${Math.round(eff)}%` },
    { key: 'rem', label: 'REM sleep', score: Math.round(rem), detail: `${Math.round(remPct)}% of sleep` },
    { key: 'deep', label: 'Deep (SWS) sleep', score: Math.round(deep), detail: `${Math.round(deepPct)}% of sleep` },
    { key: 'restfulness', label: 'Restfulness', score: Math.round(restfulness), detail: `${wakeEvents} awakening${wakeEvents === 1 ? '' : 's'}` },
  ];

  const score = Math.round(
    clamp(0.35 * total + 0.2 * efficiency + 0.15 * rem + 0.15 * deep + 0.15 * restfulness, 1, 99),
  );
  return { score, contributors };
}
