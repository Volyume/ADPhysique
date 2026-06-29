/**
 * Cardiovascular strain from heart rate, using Banister TRIMP (Training Impulse)
 * with Tanaka HRmax and Karvonen heart-rate reserve — all published methods.
 *
 * WHOOP's "Strain" is a proprietary 0–21 logarithmic scale (Borg-derived). We
 * cannot reproduce its exact numbers, so we compute a TRIMP load and map it onto
 * a 0–21 scale with a monotonic log curve. Treat the 0–21 value as a calibrated
 * approximation, not WHOOP's figure.
 */

export type UserProfile = {
  ageYears: number;
  sex: 'male' | 'female';
  restingHr: number; // bpm
  maxHr?: number; // bpm; if absent, Tanaka estimate is used
};

/** Tanaka et al. (2001): HRmax = 208 − 0.7 × age. */
export function tanakaHrMax(ageYears: number): number {
  return Math.round(208 - 0.7 * ageYears);
}

export function hrMaxFor(profile: UserProfile): number {
  return profile.maxHr ?? tanakaHrMax(profile.ageYears);
}

/** Karvonen heart-rate reserve fraction for a given HR. Clamped to [0,1]. */
export function hrReserveFraction(hr: number, profile: UserProfile): number {
  const max = hrMaxFor(profile);
  const denom = max - profile.restingHr;
  if (denom <= 0) return 0;
  return clamp01((hr - profile.restingHr) / denom);
}

/**
 * Banister TRIMP for one HR sample held for `minutes`.
 * TRIMP = minutes × HRr × 0.64 × e^(b × HRr), b = 1.92 (male) / 1.67 (female).
 */
export function trimpForSample(hr: number, minutes: number, profile: UserProfile): number {
  const hrr = hrReserveFraction(hr, profile);
  const b = profile.sex === 'female' ? 1.67 : 1.92;
  return minutes * hrr * 0.64 * Math.exp(b * hrr);
}

/** Sum TRIMP across a series of {hr, minutes} samples. */
export function totalTrimp(
  samples: Array<{ hr: number; minutes: number }>,
  profile: UserProfile,
): number {
  let sum = 0;
  for (const s of samples) sum += trimpForSample(s.hr, s.minutes, profile);
  return sum;
}

/**
 * Map a TRIMP load to a 0–21 strain scale with a log curve. TRIMP_REF is the
 * load that maps to ~18 ("strenuous day"); tuned to feel WHOOP-like, adjustable.
 */
const TRIMP_REF = 300;
export function trimpToStrain(trimp: number): number {
  if (trimp <= 0) return 0;
  const strain = 21 * (Math.log1p(trimp) / Math.log1p(TRIMP_REF));
  return Math.round(Math.min(21, strain) * 10) / 10;
}

export type HrZone = { zone: number; label: string; minutes: number };

const ZONE_EDGES = [0.5, 0.6, 0.7, 0.8, 0.9]; // %HRR boundaries
const ZONE_LABELS = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

/** Minutes spent in each Karvonen %HRR zone. */
export function hrZones(
  samples: Array<{ hr: number; minutes: number }>,
  profile: UserProfile,
): HrZone[] {
  const minutes = [0, 0, 0, 0, 0];
  for (const s of samples) {
    const hrr = hrReserveFraction(s.hr, profile);
    let z = 0;
    for (let i = 0; i < ZONE_EDGES.length; i += 1) {
      if (hrr >= (ZONE_EDGES[i] as number)) z = i;
    }
    minutes[z] = (minutes[z] as number) + s.minutes;
  }
  return ZONE_LABELS.map((label, i) => ({ zone: i + 1, label, minutes: Math.round(minutes[i] as number) }));
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
