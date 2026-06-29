/**
 * HR-based energy expenditure, mirroring WHOOP's per-activity "Calories" (which
 * is derived from heart rate + your age/sex/weight, NOT a per-sport MET table —
 * confirmed against WHOOP's strain model, which is purely cardiovascular).
 *
 * Uses the Keytel et al. (2005) regression for kcal/min from HR, the most widely
 * cited HR→energy model. Only counts minutes with a meaningful HR (above rest),
 * so sitting still doesn't accrue activity calories.
 *
 *   Male:   kcal/min = (-55.0969 + 0.6309·HR + 0.1988·wt + 0.2017·age) / 4.184
 *   Female: kcal/min = (-20.4022 + 0.4472·HR − 0.1263·wt + 0.0740·age) / 4.184
 */

import type { UserProfile } from './strain';

const DEFAULT_WEIGHT_KG = 75;

/** kcal/min for one HR sample given the user's profile (clamped at >= 0). */
export function kcalPerMinute(hr: number, profile: UserProfile): number {
  const wt = profile.weightKg ?? DEFAULT_WEIGHT_KG;
  const age = profile.ageYears;
  const raw =
    profile.sex === 'female'
      ? -20.4022 + 0.4472 * hr - 0.1263 * wt + 0.074 * age
      : -55.0969 + 0.6309 * hr + 0.1988 * wt + 0.2017 * age;
  return Math.max(0, raw / 4.184);
}

/** Total kcal across a series of per-minute HR samples. */
export function totalKcal(
  samples: Array<{ hr: number; minutes: number }>,
  profile: UserProfile,
): number {
  let sum = 0;
  for (const s of samples) sum += kcalPerMinute(s.hr, profile) * s.minutes;
  return Math.round(sum);
}
