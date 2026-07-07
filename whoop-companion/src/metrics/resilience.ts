/**
 * Resilience — Oura's standout multi-day metric: how well your system holds up
 * over weeks. Oura blends daytime stress recovery with nightly recovery; we have
 * no motion-gated daytime-stress history yet (the IMU stream is locked), so v1
 * uses the signal we DO store reliably every night: the 14-day trend of recovery
 * (HRV/RHR/sleep) plus its stability. A consistently high recovery = high
 * resilience; an erratic or declining trend = lower.
 *
 * Tiers mirror Oura: Limited / Adequate / Solid / Strong / Exceptional.
 */

import { stdev } from './ema';

export type ResilienceTier = 'Limited' | 'Adequate' | 'Solid' | 'Strong' | 'Exceptional';

export type Resilience = {
  tier: ResilienceTier;
  score: number; // 0..100
  days: number; // nights of data used
};

export function resilience(recoveries: number[]): Resilience | null {
  const vals = recoveries.filter((v) => Number.isFinite(v));
  if (vals.length < 3) return null;
  const window = vals.slice(-14);
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const sd = stdev(window);
  // Reward consistency: low night-to-night variance adds up to +8, high subtracts.
  const stability = Math.max(-5, Math.min(8, 8 - sd / 2.5));
  const score = Math.max(1, Math.min(99, Math.round(mean + stability)));

  let tier: ResilienceTier;
  if (score >= 80) tier = 'Exceptional';
  else if (score >= 68) tier = 'Strong';
  else if (score >= 55) tier = 'Solid';
  else if (score >= 42) tier = 'Adequate';
  else tier = 'Limited';

  return { tier, score, days: window.length };
}
