// Peak Week protocol builder — deterministic, no Math.random.
//
// Protocol structure follows the carb-deplete → carb-load → water/sodium-taper
// sequence documented in the peer-reviewed survey of British natural
// bodybuilders (Langan-Evans et al., PMC6315482, n=81), in which 93.8% of
// competitors manipulated carbohydrate, water and/or sodium in the final week.
// Carb-loading ramp and water/sodium taper magnitudes follow the consensus
// described at bellyproof.com: "carb-deplete first, carb-load second, water
// and sodium taper last".
//
// Federation only informs posing emphasis — it never alters water/sodium/carb
// numbers. This module returns a plan; it does not give medical advice.

import { addDays, format } from 'date-fns';

// UK federations. Federation only informs posing emphasis; it does not
// alter water/sodium/carb numbers.
export const FEDERATIONS = [
  'BPA', '2BROS', 'FitX', 'FMX', 'IBFA', 'NABBA', 'NPC', 'PCA', 'UKBFF',
];

export const PEAK_WEEK_DISCLAIMER =
  'These protocols are derived from peer-reviewed surveys (Langan-Evans et al., '
  + 'PMC6315482) and should be reviewed with a qualified coach. Volyume cannot '
  + 'replace medical or coaching judgement.';

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

function round(n, step = 1) {
  return Math.round(n / step) * step;
}

// dayOffset: -6 (Sunday before a Saturday show) through 0 (show day)
const DAY_TEMPLATES = [
  { dayOffset: -6, phase: 'depletion', carbsPerKg: 1.5, fatPerKgLean: 0.8, waterFactor: 1.00, sodiumFactor: 1.00, training: 'Full-body depletion — 15–20 reps, short rest', posingMin: 45 },
  { dayOffset: -5, phase: 'depletion', carbsPerKg: 1.5, fatPerKgLean: 0.8, waterFactor: 1.00, sodiumFactor: 1.00, training: 'Full-body depletion — 15–20 reps, short rest', posingMin: 45 },
  { dayOffset: -4, phase: 'depletion', carbsPerKg: 1.5, fatPerKgLean: 0.8, waterFactor: 1.00, sodiumFactor: 1.00, training: 'Full-body depletion — 15–20 reps, short rest', posingMin: 45 },
  { dayOffset: -3, phase: 'load',      carbsPerKg: 4.0, fatPerKgLean: 0.4, waterFactor: 1.00, sodiumFactor: 1.00, training: 'Light upper-body pump', posingMin: 40 },
  { dayOffset: -2, phase: 'load',      carbsPerKg: 6.0, fatPerKgLean: 0.4, waterFactor: 0.75, sodiumFactor: 1.00, training: 'Rest — posing practice only', posingMin: 30 },
  { dayOffset: -1, phase: 'taper',     carbsPerKg: 8.0, fatPerKgLean: 0.4, waterFactor: 0.50, sodiumFactor: 0.33, training: 'Light pump — bands / press-ups', posingMin: 20 },
  { dayOffset:  0, phase: 'show',      carbsPerKg: 2.5, fatPerKgLean: 0.3, waterFactor: 0.10, sodiumFactor: 0.15, training: 'Backstage pump-up', posingMin: 15 },
];

const PHASE_LABELS = {
  depletion: 'Depletion',
  load: 'Carb load',
  taper: 'Water & sodium taper',
  show: 'Show day',
};

const PHASE_NOTES = {
  depletion: 'Low carbs, normal water and sodium. Deplete glycogen with high-rep, full-body training.',
  load: 'Ramp carbohydrates upward. Keep fats and fibre low so glycogen — not gut bulk — fills the muscle.',
  taper: 'Final carb hit. Water drops sharply and sodium is cut. Movement stays light to protect the look.',
  show: 'Sips of water only. A small morning carb top-up if you look flat. Pump up backstage, not too early.',
};

/**
 * buildPeakWeek — deterministic 7-day peak-week plan.
 *
 * @param {object} inputs
 * @param {string} inputs.showDate     ISO date string (yyyy-MM-dd) of the show
 * @param {string} inputs.federation   one of FEDERATIONS
 * @param {number} inputs.bodyweightKg current bodyweight in kg
 * @param {number} inputs.leanKg       lean mass estimate in kg
 * @param {number} inputs.prepCarbsPerKg prep-phase carbs (g/kg bodyweight/day)
 * @param {number} inputs.prepSodiumMg prep-phase sodium (mg/day)
 * @param {number} inputs.prepWaterL   prep-phase water (litres/day)
 * @returns {{ days: object[], disclaimer: string, federation: string }}
 */
export function buildPeakWeek(inputs) {
  const {
    showDate,
    federation = 'NPC',
    bodyweightKg = 80,
    leanKg = bodyweightKg * 0.9,
    prepWaterL = 4,
    prepSodiumMg = 3000,
  } = inputs || {};

  const bw = Number(bodyweightKg) || 80;
  const lean = Number(leanKg) || bw * 0.9;
  const baseWater = Number(prepWaterL) || 4;
  const baseSodium = Number(prepSodiumMg) || 3000;

  // Protein held constant through the week — protects muscle while dieting hard.
  const proteinG = round(2.2 * lean, 5);

  const showDateObj = showDate ? new Date(showDate) : null;
  const validDate = showDateObj && !isNaN(showDateObj.getTime());

  const days = DAY_TEMPLATES.map((t) => {
    const carbsG = round(t.carbsPerKg * bw, 5);
    const fatG = round(t.fatPerKgLean * lean, 5);
    const kcal = round(
      proteinG * KCAL_PER_G_PROTEIN
      + carbsG * KCAL_PER_G_CARB
      + fatG * KCAL_PER_G_FAT,
      10,
    );
    const waterL = Math.max(0.3, round(baseWater * t.waterFactor, 0.25));
    const sodiumMg = round(baseSodium * t.sodiumFactor, 50);

    const dateObj = validDate ? addDays(showDateObj, t.dayOffset) : null;

    return {
      dayOffset: t.dayOffset,
      dayLabel: t.dayOffset === 0 ? 'Show day' : `${Math.abs(t.dayOffset)} day${t.dayOffset === -1 ? '' : 's'} out`,
      weekday: dateObj ? format(dateObj, 'EEEE') : null,
      dateLabel: dateObj ? format(dateObj, 'd MMM yyyy') : null,
      dateISO: dateObj ? format(dateObj, 'yyyy-MM-dd') : null,
      phase: t.phase,
      phaseLabel: PHASE_LABELS[t.phase],
      phaseNote: PHASE_NOTES[t.phase],
      carbsPerKg: t.carbsPerKg,
      proteinG,
      carbsG,
      fatG,
      kcal,
      waterL,
      sodiumMg,
      training: t.training,
      posingMin: t.posingMin,
      isShowDay: t.dayOffset === 0,
    };
  });

  return {
    days,
    federation,
    disclaimer: PEAK_WEEK_DISCLAIMER,
  };
}

// Plain-text export (CSV-ish) for sharing with a coach.
export function peakWeekToText(plan, meta = {}) {
  const lines = [];
  lines.push('VOLYUME — PEAK WEEK PLAN');
  if (meta.showDateLabel) lines.push(`Show: ${meta.showDateLabel}`);
  lines.push(`Federation: ${plan.federation}`);
  lines.push('');
  lines.push('Day,Phase,kcal,Protein g,Carbs g,Fat g,Water L,Sodium mg,Training,Posing min');
  for (const d of plan.days) {
    const day = d.weekday ? `${d.dayLabel} (${d.weekday})` : d.dayLabel;
    lines.push(
      [day, d.phaseLabel, d.kcal, d.proteinG, d.carbsG, d.fatG, d.waterL, d.sodiumMg, d.training, d.posingMin].join(','),
    );
  }
  lines.push('');
  lines.push(plan.disclaimer);
  return lines.join('\n');
}
