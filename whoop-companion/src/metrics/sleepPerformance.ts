/**
 * Sleep Performance — WHOOP's headline sleep ring. It is a COMPOSITE of four
 * contributors (Hours vs Needed, Sleep Consistency, Sleep Efficiency, High Sleep
 * Stress). Verified against the decompiled app: the composite is computed on
 * WHOOP's servers and only the final number is delivered to the client — the
 * exact weighting is NOT in the APK, and no simple blend reproduces the sample
 * (94/33/65/8 → 50). So we compute a TRANSPARENT weighted blend on-device and
 * label it an estimate; the four contributors themselves are exact.
 *
 * Weighting (ours, documented — Hours vs Needed dominant, as in WHOOP's older
 * published model, penalised by the quality contributors):
 *   0.50·HoursVsNeeded + 0.20·Efficiency + 0.20·Consistency + 0.10·(100−HighStress)
 * Consistency is dropped (weights renormalised) until ≥3 nights exist.
 */

import {
  Band,
  consistencyBand,
  efficiencyBand,
  highStressBand,
  hoursVsNeededBand,
  performanceBand,
} from './sleepBands';
import { clampPct } from '../util/number';

export type SleepContributor = {
  key: 'hoursVsNeeded' | 'consistency' | 'efficiency' | 'highStress';
  label: string;
  value: number | null; // percentage (null = calibrating)
  band: Band | null;
  inverse: boolean; // true = lower is better (High Sleep Stress)
};

export type SleepPerformance = {
  score: number; // 0..100 composite (estimate)
  band: Band;
  estimated: true; // never presented as WHOOP-exact
  contributors: SleepContributor[];
};

export function computeSleepPerformance(input: {
  hoursVsNeededPct: number;
  efficiencyPct: number;
  consistencyPct: number | null;
  highStressPct: number;
  confidenceCapPct?: number | null;
}): SleepPerformance {
  const hoursVsNeededPct = clampPct(input.hoursVsNeededPct);
  const efficiencyPct = clampPct(input.efficiencyPct);
  const consistencyPct = input.consistencyPct == null ? null : clampPct(input.consistencyPct);
  const highStressPct = clampPct(input.highStressPct);
  const stressGood = 100 - highStressPct;

  // Weighted blend; renormalise if consistency is still calibrating.
  const terms: Array<[number, number]> = [
    [0.5, hoursVsNeededPct],
    [0.2, efficiencyPct],
    [0.1, stressGood],
  ];
  if (consistencyPct != null) terms.push([0.2, consistencyPct]);
  const wSum = terms.reduce((a, [w]) => a + w, 0);
  const blended = Math.round(terms.reduce((a, [w, v]) => a + w * v, 0) / wSum);
  const confidenceCapPct = input.confidenceCapPct == null ? null : clampPct(input.confidenceCapPct);
  const score = clampPct(Math.min(blended, confidenceCapPct ?? 100));

  const contributors: SleepContributor[] = [
    { key: 'hoursVsNeeded', label: 'Hours vs Needed', value: Math.round(hoursVsNeededPct), band: hoursVsNeededBand(hoursVsNeededPct), inverse: false },
    { key: 'consistency', label: 'Sleep Consistency', value: consistencyPct == null ? null : Math.round(consistencyPct), band: consistencyPct == null ? null : consistencyBand(consistencyPct), inverse: false },
    { key: 'efficiency', label: 'Sleep Efficiency', value: Math.round(efficiencyPct), band: efficiencyBand(efficiencyPct), inverse: false },
    { key: 'highStress', label: 'High Sleep Stress', value: Math.round(highStressPct), band: highStressBand(highStressPct), inverse: true },
  ];

  return { score, band: performanceBand(score), estimated: true, contributors };
}
