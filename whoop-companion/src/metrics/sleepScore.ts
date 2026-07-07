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
export type SleepScore = {
  score: number;
  contributors: SleepContributor[];
  confidenceCapPct: number | null;
  cappedByConfidence: boolean;
};

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

function totalSleepAdequacy(asleepMin: number, needMin: number): number {
  if (needMin <= 0) return 0;
  const ratio = asleepMin / needMin;
  if (ratio <= 1) return clamp(ratio * 100);
  if (ratio <= 1.1) return 100;
  return clamp(100 - ((ratio - 1.1) / 0.45) * 35, 65, 100);
}

export function computeSleepScore(sleep: SleepResult, opts?: { confidenceCapPct?: number | null }): SleepScore {
  const asleep = sleep.asleepMin;
  const need = sleep.neededMin || 480;
  const eff = sleep.efficiency * 100;
  const remPct = asleep > 0 ? (sleep.stages.rem / asleep) * 100 : 0;
  const deepPct = asleep > 0 ? (sleep.stages.deep / asleep) * 100 : 0;
  const wakeEvents = midSleepAwakeEvents(sleep.hypnogram);
  const wakeAfterOnsetMin = midSleepAwakeMinutes(sleep.hypnogram);

  const total = totalSleepAdequacy(asleep, need);
  const efficiency = band(eff, 85, 95); // Oura: 85 good, 95 optimal
  const rem = ideal(remPct, 18, 26); // ~20–25% ideal
  const deep = ideal(deepPct, 13, 20); // ~13–20% ideal
  const restfulness = clamp(100 - wakeEvents * 6 - wakeAfterOnsetMin * 0.65); // fewer/shorter awakenings better

  const contributors: SleepContributor[] = [
    { key: 'total', label: 'Total sleep', score: Math.round(total), detail: `${Math.round(asleep)} of ${Math.round(need)} min needed` },
    { key: 'efficiency', label: 'Efficiency', score: Math.round(efficiency), detail: `${Math.round(eff)}%` },
    { key: 'rem', label: 'REM sleep', score: Math.round(rem), detail: `${Math.round(remPct)}% of sleep` },
    { key: 'deep', label: 'Deep (SWS) sleep', score: Math.round(deep), detail: `${Math.round(deepPct)}% of sleep` },
    { key: 'restfulness', label: 'Restfulness', score: Math.round(restfulness), detail: `${wakeEvents} awakening${wakeEvents === 1 ? '' : 's'}, ${wakeAfterOnsetMin}m awake` },
  ];

  const rawScore = Math.round(
    clamp(0.35 * total + 0.2 * efficiency + 0.15 * rem + 0.15 * deep + 0.15 * restfulness, 1, 99),
  );
  const confidenceCapPct = opts?.confidenceCapPct == null ? null : Math.round(clamp(opts.confidenceCapPct, 1, 100));
  const score = Math.round(Math.min(rawScore, confidenceCapPct ?? 100));
  return { score, contributors, confidenceCapPct, cappedByConfidence: confidenceCapPct != null && score < rawScore };
}

function midSleepAwakeEvents(hypnogram: SleepResult['hypnogram']): number {
  const firstSleep = hypnogram.findIndex((s) => s.stage !== 'awake');
  if (firstSleep < 0) return 0;
  let lastSleep = -1;
  for (let i = hypnogram.length - 1; i >= 0; i -= 1) {
    if (hypnogram[i]!.stage !== 'awake') {
      lastSleep = i;
      break;
    }
  }
  if (lastSleep <= firstSleep) return 0;
  let events = 0;
  for (let i = firstSleep + 1; i < lastSleep; i += 1) {
    if (hypnogram[i]!.stage === 'awake') events += 1;
  }
  return events;
}

function midSleepAwakeMinutes(hypnogram: SleepResult['hypnogram']): number {
  const firstSleep = hypnogram.findIndex((s) => s.stage !== 'awake');
  if (firstSleep < 0) return 0;
  let lastSleep = -1;
  for (let i = hypnogram.length - 1; i >= 0; i -= 1) {
    if (hypnogram[i]!.stage !== 'awake') {
      lastSleep = i;
      break;
    }
  }
  if (lastSleep <= firstSleep) return 0;
  let minutes = 0;
  for (let i = firstSleep + 1; i < lastSleep; i += 1) {
    const segment = hypnogram[i]!;
    if (segment.stage === 'awake') minutes += segment.minutes;
  }
  return minutes;
}
