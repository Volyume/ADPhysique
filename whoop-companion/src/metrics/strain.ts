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
  weightKg?: number; // body mass; used for HR-based calorie estimation
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

// Banister sex-specific constants. The female constant is corrected to 0.86 (it
// was the male 0.64), so women's load is no longer computed with the male scalar.
function banisterConst(sex: 'male' | 'female'): { m: number; b: number } {
  return sex === 'female' ? { m: 0.86, b: 1.67 } : { m: 0.64, b: 1.92 };
}

/**
 * Banister TRIMP for one HR sample held for `minutes`.
 * TRIMP = minutes × HRr × m × e^(b × HRr); (m, b) = (0.64, 1.92) male / (0.86, 1.67) female.
 */
export function trimpForSample(hr: number, minutes: number, profile: UserProfile): number {
  const hrr = hrReserveFraction(hr, profile);
  const { m, b } = banisterConst(profile.sex);
  return minutes * hrr * m * Math.exp(b * hrr);
}

// Strain reflects cardiovascular demand ABOVE rest: per-minute load is zero below
// a 20% heart-rate-reserve basal gate, so sitting and sleeping contribute nothing
// while brisk walking / on-your-feet activity still counts.
const HRR_BASAL_GATE = 0.2;

/** Gated exponentially-weighted Banister load for one minute at reserve `hrr`. */
export function loadPerMinute(hrr: number, sex: 'male' | 'female'): number {
  if (!Number.isFinite(hrr) || hrr < HRR_BASAL_GATE) return 0;
  const { m, b } = banisterConst(sex);
  return hrr * m * Math.exp(b * hrr);
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
 * Accumulated gated Banister load across {hr, minutes} samples. The daily load is
 * the sum of the per-minute loads; the load-to-strain map is applied once to this
 * accumulated load, never by summing per-minute strain (which would linearise it).
 */
export function pulseLoad(
  samples: Array<{ hr: number; minutes: number }>,
  profile: UserProfile,
): number {
  let load = 0;
  for (const s of samples) load += s.minutes * loadPerMinute(hrReserveFraction(s.hr, profile), profile.sex);
  return load;
}

/**
 * Map accumulated load to a 0–21 strain scale with a logarithmic curve reaching
 * exactly 21 at the maximal daily load (STRAIN_L_MAX) and clamped to 21 above it,
 * so a maximal day attains 21 rather than approaching it asymptotically, and each
 * successive strain point costs more load than the last (Borg-style).
 */
const STRAIN_TAU = 20; // low-end shape constant (load units)
const STRAIN_L_MAX = 500; // maximal daily gated load → exactly 21
const STRAIN_LOG_DENOM = Math.log(1 + STRAIN_L_MAX / STRAIN_TAU);
export function strainFromLoad(load: number): number {
  if (!Number.isFinite(load) || load <= 0) return 0;
  const strain = 21 * (Math.log(1 + load / STRAIN_TAU) / STRAIN_LOG_DENOM);
  return Math.round(Math.min(21, strain) * 10) / 10;
}

export type HrZone = { zone: number; label: string; range: string; minutes: number };

// Current WHOOP zones use heart-rate reserve (HRR), accounting for resting and
// maximum HR. The lowest training zone (Zone 1) begins at 40% heart-rate reserve,
// matching WHOOP's five-zone model; only below 40% HRR counts as rest.
// Rest <40%, Zone 1 40–60%, 2 60–70%, 3 70–80%, 4 80–90%, 5 90–100%.
const ZONE_MAX_EDGES = [0.4, 0.6, 0.7, 0.8, 0.9];
const ZONE_LABELS = ['Rest', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];
const ZONE_RANGES = ['<40%', '40–60%', '60–70%', '70–80%', '80–90%', '90–100%'];

/** Minutes spent in each WHOOP heart-rate-reserve zone (rest + Zones 1–5). */
export function hrZones(
  samples: Array<{ hr: number; minutes: number }>,
  profile: UserProfile,
): HrZone[] {
  const minutes = [0, 0, 0, 0, 0, 0];
  for (const s of samples) {
    const frac = hrReserveFraction(s.hr, profile);
    let z = 0;
    for (let i = 0; i < ZONE_MAX_EDGES.length; i += 1) {
      if (frac >= (ZONE_MAX_EDGES[i] as number)) z = i + 1;
    }
    minutes[z] = (minutes[z] as number) + s.minutes;
  }
  return ZONE_LABELS.map((label, i) => ({
    zone: i, // weight 0..5
    label,
    range: ZONE_RANGES[i] as string,
    minutes: Math.round(minutes[i] as number),
  }));
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
