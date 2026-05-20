/**
 * nutritionEngine.js
 * Pure-function nutrition target calculator for the Volyume app.
 * No side effects, no DB calls, no imports — just math.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const PHASE_ADJUSTMENTS = {
  lean_gain: 0.10,
  build: 0.17,
  maintain: 0.0,
  recomp: -0.05,
  mild_cut: -0.13,
  aggressive_cut: -0.22,
  contest_prep: -0.28,
};

const PHASE_LABELS = {
  lean_gain: 'Build muscle (slow)',
  build: 'Build muscle (fast)',
  maintain: 'Maintain weight',
  recomp: 'Hold muscle, lose fat',
  mild_cut: 'Lose weight (steady)',
  aggressive_cut: 'Lose weight (fast)',
  contest_prep: 'Contest preparation',
};

// Three protein approaches — user selects which fits their preference.
//
// standard  — mainstream sports nutrition guidelines. Adequate for muscle
//             growth and easy to sustain day-to-day.
// optimised — midpoint of current hypertrophy research (gains plateau ~1.62 g/kg BW;
//             2.0–2.3 g/kg LBM gives a practical buffer above that). DEFAULT.
// advanced  — higher-end competitive protocol. Rates rise aggressively in
//             deficits to maximise lean mass retention. Based on published
//             contest-prep research (2.3–3.1 g/kg LBM range).
//
// Rates are g per kg of LEAN BODY MASS (preferred when body fat is measured):
export const PROTEIN_APPROACHES = {
  standard: {
    label: 'Standard',
    range: '1.2–1.6 g/kg',
    description: 'General athletic guidelines. Plenty for muscle growth; easy to hit consistently.',
    lbm: { lean_gain: 2.0, build: 2.0, maintain: 1.9, recomp: 2.2, mild_cut: 2.3, aggressive_cut: 2.5, contest_prep: 2.8 },
    bw:  { lean_gain: 1.4, build: 1.4, maintain: 1.3, recomp: 1.6, mild_cut: 1.8, aggressive_cut: 2.0, contest_prep: 2.2 },
    floor: 1.2,
  },
  optimised: {
    label: 'Optimised',
    range: '2.0–2.6 g/kg',
    description: 'The practical sweet spot for regular gym training. High enough to fully support muscle growth and recovery without being extreme.',
    lbm: { lean_gain: 2.5, build: 2.5, maintain: 2.3, recomp: 2.6, mild_cut: 2.8, aggressive_cut: 3.0, contest_prep: 3.1 },
    bw:  { lean_gain: 2.0, build: 2.0, maintain: 1.9, recomp: 2.2, mild_cut: 2.4, aggressive_cut: 2.7, contest_prep: 2.9 },
    floor: 1.8,
  },
  advanced: {
    label: 'Advanced',
    range: '2.2–3.3 g/kg',
    description: 'The upper end, used by serious athletes and people cutting who want to hold onto as much muscle as possible.',
    lbm: { lean_gain: 2.6, build: 2.6, maintain: 2.6, recomp: 2.9, mild_cut: 3.0, aggressive_cut: 3.2, contest_prep: 3.3 },
    bw:  { lean_gain: 2.4, build: 2.4, maintain: 2.2, recomp: 2.4, mild_cut: 2.6, aggressive_cut: 3.0, contest_prep: 3.3 },
    floor: 1.8,
  },
  custom: {
    label: 'Custom',
    range: 'Your value',
    description: 'Override with a specific g/kg rate. Use if your coach or dietitian has given you a personalised target.',
    lbm: null,
    bw:  null,
    floor: 1.2,
  },
};

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;
const FAT_FRACTION = 0.25;
const MAX_SAFE_LOSS_RATE = 0.008;   // 0.8 % BW/week
const HARD_GATE_LOSS_RATE = 0.015;  // 1.5 % BW/week
const KCAL_PER_KG_FAT = 7700;       // rough energy equivalent of 1 kg body fat

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function calcBMR(sex, ageYears, heightCm, weightKg, bodyFatPercent, bodyFatSource) {
  const useKatchMcArdle =
    bodyFatPercent !== null &&
    bodyFatPercent !== undefined &&
    bodyFatSource !== null &&
    bodyFatSource !== undefined &&
    bodyFatSource !== 'visual';

  if (useKatchMcArdle) {
    const lbm = weightKg * (1 - bodyFatPercent / 100);
    return { bmr: 370 + 21.6 * lbm, formula: 'katch_mcardle', lbm };
  }

  const base =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;

  return { bmr: base, formula: 'mifflin', lbm: null };
}

function calcConfidence(bodyFatSource) {
  if (bodyFatSource === 'dexa' || bodyFatSource === 'caliper') return 'high';
  if (bodyFatSource === 'bia') return 'medium';
  if (bodyFatSource === 'visual') return 'low';
  return 'medium'; // no body fat provided
}

// Returns { proteinG, basis, proteinRateUsed } where basis is 'lbm' or 'bodyweight'.
function calcProtein(goal, weightKg, lbm, bodyFatSource, proteinApproach = 'optimised', customGPerKg = null) {
  const approach = PROTEIN_APPROACHES[proteinApproach] ?? PROTEIN_APPROACHES.optimised;
  const floorG = approach.floor * weightKg;

  // Custom override — apply rate directly to bodyweight (coaches typically specify g/kg BW).
  if (proteinApproach === 'custom' && customGPerKg != null && customGPerKg > 0) {
    const proteinG = Math.max(customGPerKg * weightKg, floorG);
    return { proteinG, basis: 'bodyweight', proteinRateUsed: customGPerKg };
  }

  const hasCredibleLbm =
    lbm !== null &&
    lbm !== undefined &&
    lbm > 0 &&
    bodyFatSource !== null &&
    bodyFatSource !== undefined &&
    bodyFatSource !== 'visual';

  let proteinG;
  let basis;
  let proteinRateUsed;
  if (hasCredibleLbm) {
    proteinRateUsed = approach.lbm[goal] ?? approach.lbm.maintain;
    proteinG = proteinRateUsed * lbm;
    basis = 'lbm';
  } else {
    proteinRateUsed = approach.bw[goal] ?? approach.bw.maintain;
    proteinG = proteinRateUsed * weightKg;
    basis = 'bodyweight';
  }

  return { proteinG: Math.max(proteinG, floorG), basis, proteinRateUsed };
}

function estimateWeeklyRate(targetKcal, maintenanceKcal, weightKg) {
  const dailyDelta = targetKcal - maintenanceKcal;
  const weeklyDelta = dailyDelta * 7;
  // 1 kg body fat ≈ 7700 kcal deficit/surplus
  return weeklyDelta / KCAL_PER_KG_FAT;
}

// ---------------------------------------------------------------------------
// Main export: calculateNutritionTargets
// ---------------------------------------------------------------------------

// Physique competitor and strength goals warrant the advanced protein approach
// because coaches prescribe 2.4 g/kg BW for bulking phases in these categories.
const ADVANCED_PROTEIN_GOALS = [
  'mens_physique', 'classic_physique', 'bodybuilding',
  'bikini', 'wellness', 'figure', 'womens_physique',
  'strength_hypertrophy',
];

export function calculateNutritionTargets(inputs) {
  const {
    sex,
    ageYears,
    heightCm,
    weightKg,
    bodyFatPercent: _bfp = null,
    bodyFatPct: _bfpAlias = null,  // accept both spellings
    bodyFatSource = null,
    activityLevel,
    goal,
    trainingGoal = null,
    proteinApproach: _proteinApproachInput = null,
    customProteinGPerKg = null,
    targetRateKgPerWeek = null,
  } = inputs;

  const bodyFatPercent = _bfp ?? _bfpAlias;

  // Auto-select advanced protein approach for physique competitor and strength goals
  // unless the caller has explicitly specified a different approach.
  const proteinApproach = _proteinApproachInput
    ?? (ADVANCED_PROTEIN_GOALS.includes(trainingGoal) ? 'advanced' : 'optimised');

  const warnings = [];

  // --- BMR ---
  const { bmr, formula, lbm } = calcBMR(
    sex,
    ageYears,
    heightCm,
    weightKg,
    bodyFatPercent,
    bodyFatSource,
  );
  const bmrKcal = Math.round(bmr);

  // --- TDEE / Maintenance ---
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  const maintenanceKcal = Math.round(bmr * multiplier);

  // --- Phase calorie adjustment ---
  const phaseAdj = PHASE_ADJUSTMENTS[goal] ?? 0;
  let targetKcal = Math.round(maintenanceKcal * (1 + phaseAdj));

  // --- Safety floors ---
  const kcalFloor = sex === 'male' ? 1500 : 1200;
  if (targetKcal < kcalFloor) {
    warnings.push(
      `Target calories (${targetKcal} kcal) below safe minimum (${kcalFloor} kcal). Raising to floor.`,
    );
    targetKcal = kcalFloor;
  }

  // --- Loss rate checks ---
  const estimatedRate = estimateWeeklyRate(targetKcal, maintenanceKcal, weightKg);
  const isDeficit = targetKcal < maintenanceKcal;

  if (isDeficit) {
    const lossFraction = Math.abs(estimatedRate) / weightKg;

    if (lossFraction > HARD_GATE_LOSS_RATE) {
      warnings.push(
        `Estimated loss rate (${(lossFraction * 100).toFixed(2)} % BW/week) exceeds the 1.5 % hard gate. ` +
          `Calories have been raised to limit loss to 1.5 % BW/week.`,
      );
      // Cap at 1.5 % loss: weekly deficit = 1.5% × BW × 7700 kcal/kg
      const maxWeeklyDeficit = HARD_GATE_LOSS_RATE * weightKg * KCAL_PER_KG_FAT;
      const maxDailyDeficit = maxWeeklyDeficit / 7;
      targetKcal = Math.round(maintenanceKcal - maxDailyDeficit);
    } else if (lossFraction > MAX_SAFE_LOSS_RATE) {
      warnings.push(
        `Estimated loss rate (${(lossFraction * 100).toFixed(2)} % BW/week) exceeds the recommended 0.8 % threshold. ` +
          `Consider slowing the rate to preserve muscle mass.`,
      );
    }
  }

  if (goal === 'contest_prep') {
    warnings.push(
      'Contest Prep is an extreme protocol. Consult a qualified sports dietitian before proceeding.',
    );
  }

  // --- Macros ---
  const { proteinG: proteinRaw, basis: proteinBasis, proteinRateUsed } =
    calcProtein(goal, weightKg, lbm, bodyFatSource, proteinApproach, customProteinGPerKg);
  const proteinG = Math.round(proteinRaw);
  const proteinKcal = proteinG * KCAL_PER_G_PROTEIN;

  const fatFloor = Math.max(0.5 * weightKg, 30);
  let fatG = Math.max(Math.round((targetKcal * FAT_FRACTION) / KCAL_PER_G_FAT), fatFloor);
  const fatKcal = fatG * KCAL_PER_G_FAT;

  const carbKcal = Math.max(targetKcal - proteinKcal - fatKcal, 0);
  const carbsG = Math.round(carbKcal / KCAL_PER_G_CARB);

  // Recompute actual targetKcal from rounded macros
  const actualTargetKcal = proteinKcal + fatKcal + carbKcal;

  // --- Output ranges ---
  const kcalMin = Math.round(actualTargetKcal * 0.9);
  const kcalMax = Math.round(actualTargetKcal * 1.1);

  // --- Estimated weekly rate (recalculated with final targetKcal) ---
  const finalEstimatedRate = estimateWeeklyRate(actualTargetKcal, maintenanceKcal, weightKg);

  return {
    bmrFormula: formula === 'mifflin' ? 'Standard calorie formula' : 'Lean mass-adjusted formula',
    bmrKcal,
    maintenanceKcal,
    targetKcal: actualTargetKcal,
    kcalMin,
    kcalMax,
    proteinG,
    carbsG,
    fatG,
    proteinGPerKg: parseFloat((proteinG / weightKg).toFixed(2)),
    proteinBasis,        // 'lbm' (preferred) or 'bodyweight' (fallback)
    proteinGPerKgLbm: lbm ? parseFloat((proteinG / lbm).toFixed(2)) : null,
    proteinApproach,     // 'standard' | 'optimised' | 'advanced'
    proteinRateUsed,     // exact g/kg rate applied
    targetRateKgPerWeek: parseFloat(finalEstimatedRate.toFixed(3)),
    confidence: calcConfidence(bodyFatSource),
    phase: PHASE_LABELS[goal] ?? goal,
    goal,
    formulaUsed: formula,
    warnings,
    isConsentRequired: true,
  };
}

// ---------------------------------------------------------------------------
// Export: getPlanNutritionContext
// ---------------------------------------------------------------------------

export function getPlanNutritionContext(targets) {
  const { targetKcal, maintenanceKcal, goal } = targets;

  // Phase type
  let phaseType;
  if (targetKcal > maintenanceKcal) {
    phaseType = 'surplus';
  } else if (targetKcal < maintenanceKcal) {
    phaseType = 'deficit';
  } else {
    phaseType = 'maintenance';
  }

  // Recovery modifier: surplus supports more volume; deep deficits reduce recovery
  let recoveryModifier;
  if (phaseType === 'surplus') {
    // lean_gain vs build
    recoveryModifier = goal === 'build' ? 1.15 : 1.1;
  } else if (phaseType === 'maintenance' || goal === 'recomp') {
    recoveryModifier = 1.0;
  } else {
    // deficit — scale by how deep the cut is
    const deficitFraction = (maintenanceKcal - targetKcal) / maintenanceKcal;
    if (deficitFraction <= 0.13) {
      recoveryModifier = 0.95; // mild_cut
    } else if (deficitFraction <= 0.22) {
      recoveryModifier = 0.85; // aggressive_cut
    } else {
      recoveryModifier = 0.75; // contest_prep
    }
  }

  // Volume ceiling
  let volumeCeiling;
  if (phaseType === 'surplus') {
    volumeCeiling = 'high';
  } else if (phaseType === 'maintenance' || goal === 'recomp' || goal === 'mild_cut') {
    volumeCeiling = 'moderate';
  } else {
    volumeCeiling = 'low'; // aggressive_cut / contest_prep
  }

  // Failure exposure: how often to train to true failure
  let failureExposureLevel;
  if (phaseType === 'deficit' && (goal === 'aggressive_cut' || goal === 'contest_prep')) {
    failureExposureLevel = 'low';
  } else if (phaseType === 'surplus') {
    failureExposureLevel = 'high';
  } else {
    failureExposureLevel = 'moderate';
  }

  // Deload frequency
  let deloadFrequencyWeeks;
  if (recoveryModifier <= 0.85) {
    deloadFrequencyWeeks = 4;
  } else if (recoveryModifier <= 1.0) {
    deloadFrequencyWeeks = 5;
  } else {
    deloadFrequencyWeeks = 6;
  }

  // One-sentence explanation
  const explanations = {
    lean_gain:
      'A modest calorie surplus with controlled volume supports steady lean tissue accrual.',
    build:
      'A larger surplus increases recovery capacity, allowing high training volume and progressive overload.',
    maintain:
      'Maintenance calories sustain training performance; moderate volume keeps adaptations without excessive fatigue.',
    recomp:
      'A slight deficit with high protein and moderate volume enables simultaneous fat loss and muscle retention.',
    mild_cut:
      'A conservative deficit preserves strength; volume is moderated to match reduced recovery resources.',
    aggressive_cut:
      'A significant deficit impairs recovery; low volume and infrequent failure training limit muscle loss.',
    contest_prep:
      'An extreme deficit demands minimal volume and very low failure exposure to protect lean mass.',
  };
  const explanation = explanations[goal] ?? 'Nutrition context applied based on current phase.';

  return {
    phaseType,
    recoveryModifier: parseFloat(recoveryModifier.toFixed(2)),
    volumeCeiling,
    failureExposureLevel,
    deloadFrequencyWeeks,
    explanation,
  };
}
