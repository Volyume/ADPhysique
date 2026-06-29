/**
 * HRV Balance — Oura's core recovery-context metric. Compares a short (≈2-week)
 * trend of nightly RMSSD against a long (≈3-month) personal average and bands the
 * ratio. On par with or above your long-term average is good; a sustained drop
 * means your nervous system isn't keeping up with load/stress/illness.
 *
 * Pure arithmetic over nightly RMSSD already stored in daily_metrics — no extra
 * sensor needed (uses HRV we already derive from R-R).
 */

import { DayValue, emaBaseline } from './ema';

export type HrvBalance = {
  shortMean: number; // ≈14-day EMA of nightly RMSSD (ms)
  longMean: number; // ≈90-day EMA (ms)
  ratio: number; // short / long
  score: number; // 0..100 sub-score for four-tier banding
};

const SHORT_HALF_LIFE = 7; // responsive ~2-week trend
const LONG_HALF_LIFE = 45; // slow ~3-month average

export function hrvBalance(samples: DayValue[]): HrvBalance | null {
  if (samples.length < 7) return null; // need ~a week to say anything
  const shortMean = emaBaseline(samples, SHORT_HALF_LIFE);
  const longMean = emaBaseline(samples, LONG_HALF_LIFE);
  if (shortMean == null || longMean == null || longMean <= 0) return null;
  const ratio = shortMean / longMean;
  // ratio 1.0 → 75 (Good); ~1.07 → Optimal; 0.9 → Fair; <0.83 → Pay attention.
  const score = Math.max(1, Math.min(99, Math.round(75 + (ratio - 1) * 150)));
  return {
    shortMean: Math.round(shortMean),
    longMean: Math.round(longMean),
    ratio: Math.round(ratio * 100) / 100,
    score,
  };
}
