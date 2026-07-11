/**
 * Garmin-style training metrics — VO₂max, Training Effect (aerobic/anaerobic),
 * training load + acute:chronic ratio, training status and recovery time.
 *
 * Garmin licenses Firstbeat's proprietary models (the real maths runs in native
 * code / on the watch), so these are faithful published-method APPROXIMATIONS
 * from HR + HR-zones, using Garmin's own band labels (confirmed in the decompiled
 * app: "No Benefit / Recovery / Maintaining / Improving / Highly Improving /
 * Overreaching"; statuses "Detraining / Recovery / Maintaining / Productive /
 * Peaking / Overreaching / Unproductive / Strained"). Treat the numbers as
 * estimates, not Garmin-exact.
 */

import { HrZone } from './strain';

/**
 * Training zones in this app are calculated from heart-rate reserve (HRR),
 * using resting and maximum HR. Keep this contract explicit at presentation
 * boundaries because a zone number without its basis is easy to misread as a
 * percentage of maximum HR.
 */
export const TRAINING_HR_ZONE_BASIS = 'HR reserve (HRR)' as const;

const TRAINING_ZONE_RANGES = ['<50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'] as const;

export function trainingZoneRange(zone: number): string {
  const index = Math.max(0, Math.min(TRAINING_ZONE_RANGES.length - 1, Math.round(zone)));
  return `${TRAINING_ZONE_RANGES[index]} ${TRAINING_HR_ZONE_BASIS}`;
}

export function trainingZoneTarget(minZone: number, maxZone = minZone): string {
  const min = Math.max(0, Math.min(5, Math.round(minZone)));
  const max = Math.max(min, Math.min(5, Math.round(maxZone)));
  return min === max ? `Z${min} (HRR)` : `Z${min}-Z${max} (HRR)`;
}

/** Resolve a sport from its explicit activity field; a template name is descriptive only. */
export function workoutActivityLabel(input: { activity?: string | null; name?: string | null }): string {
  const activity = input.activity?.trim();
  return activity || 'Workout';
}

/** Keep the sport visible when a structured workout is shown by name. */
export function workoutSummaryLabel(input: { activity?: string | null; name?: string | null }): string {
  const activity = workoutActivityLabel(input);
  const name = input.name?.trim();
  return name && name !== activity ? `${activity} - ${name}` : activity;
}

/** VO₂max estimate (ml·kg⁻¹·min⁻¹), Uth–Sørensen–Overgaard–Pedersen (2004):
 *  VO₂max ≈ 15.3 × HRmax / HRrest. */
export function vo2maxEstimate(maxHr: number, restingHr: number): number | null {
  if (!restingHr || restingHr <= 0 || !maxHr || maxHr <= 0) return null;
  return Math.round(15.3 * (maxHr / restingHr) * 10) / 10;
}

/** Rough fitness-age-style label for a VO₂max value (population bands). */
export function vo2maxLabel(v: number, age: number, sex: 'male' | 'female'): string {
  // Cooper-institute-style superior/excellent/good/fair thresholds (approx, men;
  // women shifted down ~7). Coarse on purpose.
  const adj = sex === 'female' ? 7 : 0;
  const ageAdj = Math.max(0, (age - 30) * 0.3);
  const v2 = v + adj + ageAdj;
  if (v2 >= 56) return 'Superior';
  if (v2 >= 48) return 'Excellent';
  if (v2 >= 42) return 'Good';
  if (v2 >= 35) return 'Fair';
  return 'Poor';
}

export type TrainingEffect = {
  aerobic: number; // 0..5
  anaerobic: number; // 0..5
  aerobicLabel: string;
  anaerobicLabel: string;
};

export function teLabel(te: number): string {
  if (te < 1) return 'No Benefit';
  if (te < 2) return 'Recovery';
  if (te < 3) return 'Maintaining';
  if (te < 4) return 'Improving';
  if (te < 5) return 'Highly Improving';
  return 'Overreaching';
}

/**
 * Training Effect (0–5) for one activity from its time-in-zone profile. Aerobic
 * TE accrues across zones 1–4 (steady cardiovascular load); anaerobic TE only
 * from zone 4–5 (high-intensity). Both saturate towards 5 (Firstbeat's scale is
 * also saturating/EPOC-based).
 */
export function trainingEffect(zones: HrZone[]): TrainingEffect {
  let aer = 0;
  let ana = 0;
  for (const z of zones) {
    if (z.zone >= 1) aer += z.minutes * Math.exp(0.55 * z.zone); // zones 1+ (zone 0 = rest, excluded)
    if (z.zone >= 4) ana += z.minutes * Math.exp(1.1 * (z.zone - 3));
  }
  const sat = (x: number, ref: number) => Math.max(0, Math.min(5, 5 * (1 - Math.exp(-x / ref))));
  const aerobic = Math.round(sat(aer, 150) * 10) / 10;
  const anaerobic = Math.round(sat(ana, 70) * 10) / 10;
  return { aerobic, anaerobic, aerobicLabel: teLabel(aerobic), anaerobicLabel: teLabel(anaerobic) };
}

/** Recovery-time advisor (hours) from the harder of the two Training Effects. */
export function recoveryTimeHours(te: TrainingEffect): number {
  const peak = Math.max(te.aerobic, te.anaerobic);
  const hours = Math.round(peak ** 1.85 * 4.5);
  return Math.max(3, Math.min(96, hours));
}

/**
 * Race-time predictor from VO₂max. Velocity at VO₂max via the ACSM running
 * equation (VO₂ = 0.2·v + 3.5, v in m/min), then each race is run at a
 * sustainable fraction of that velocity (5K ~95% … marathon ~78%). Estimates.
 */
export type RacePrediction = { label: string; meters: number; seconds: number };
const RACES: Array<{ label: string; meters: number; frac: number }> = [
  { label: '5K', meters: 5000, frac: 0.95 },
  { label: '10K', meters: 10000, frac: 0.9 },
  { label: 'Half', meters: 21097, frac: 0.84 },
  { label: 'Marathon', meters: 42195, frac: 0.78 },
];

export function racePredictions(vo2max: number | null): RacePrediction[] | null {
  if (vo2max == null || vo2max <= 3.5) return null;
  const vMax = (vo2max - 3.5) / 0.2; // m/min at VO₂max
  if (vMax <= 0) return null;
  return RACES.map((r) => ({
    label: r.label,
    meters: r.meters,
    seconds: Math.round((r.meters / (vMax * r.frac)) * 60),
  }));
}

/** Format seconds as H:MM:SS or M:SS. */
export function formatRaceTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export type TrainingLoad = {
  acute: number; // 7-day TRIMP sum
  chronic: number; // 28-day TRIMP, expressed as a weekly average
  acwr: number | null; // acute : chronic ratio
  status: string; // Garmin training-status category
  statusDetail: string;
};

/**
 * Training load from per-activity TRIMP plus an acute:chronic workload ratio.
 * ACWR is a descriptive comparison with this person's recent load, not a
 * universal safe zone and not an injury-risk estimate.
 */
export function trainingLoad(activities: Array<{ ts: number; trimp: number }>, now: number): TrainingLoad {
  const DAY = 86400000;
  let acute = 0;
  let last28 = 0;
  for (const a of activities) {
    const ageMs = now - a.ts;
    if (ageMs < 0) continue;
    if (ageMs <= 7 * DAY) acute += a.trimp;
    if (ageMs <= 28 * DAY) last28 += a.trimp;
  }
  const chronic = last28 / 4; // weekly average over 4 weeks
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null;

  let status = 'Detraining';
  let statusDetail = 'Very little recent training load. This is a descriptive load trend, not a fitness or injury diagnosis.';
  const daysSinceLast = activities.length
    ? (now - Math.max(...activities.map((a) => a.ts))) / DAY
    : Infinity;

  if (acute === 0 && daysSinceLast > 4) {
    status = 'Detraining';
    statusDetail = 'No training in several days. A light session may be a reasonable way to restart, depending on recovery and goals.';
  } else if (acwr == null) {
    status = 'Baseline building';
    statusDetail = 'There is not yet enough chronic load for a stable comparison. Keep logging activities and use recovery, symptoms and goals for context.';
  } else if (acwr < 0.8) {
    status = 'Below recent baseline';
    statusDetail = `ACWR ${acwr.toFixed(2)} is below your recent weekly average. This is descriptive and does not by itself indicate readiness or lower injury risk.`;
  } else if (acwr <= 1.3) {
    status = 'Near recent baseline';
    statusDetail = `ACWR ${acwr.toFixed(2)} is near your recent weekly average. There is no universal optimal band; interpret it with recovery, symptoms and training goals.`;
  } else if (acwr <= 1.5) {
    status = 'Above recent baseline';
    statusDetail = `ACWR ${acwr.toFixed(2)} is above your recent weekly average. Consider fatigue, recovery and the type of work before adding more.`;
  } else if (acwr <= 1.8) {
    status = 'Well above recent baseline';
    statusDetail = `ACWR ${acwr.toFixed(2)} is well above your recent weekly average. Treat this as a context flag and adjust gradually if fatigue or symptoms are present.`;
  } else {
    status = 'Well above recent baseline';
    statusDetail = `ACWR ${acwr.toFixed(2)} is far above your recent weekly average. ACWR alone cannot estimate injury or illness risk; consider a lighter session if recovery, fatigue or symptoms agree.`;
  }
  return { acute: Math.round(acute), chronic: Math.round(chronic), acwr, status, statusDetail };
}
