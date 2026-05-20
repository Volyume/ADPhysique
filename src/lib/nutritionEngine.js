/**
 * nutritionEngine.js
 * Pure-function nutrition target calculator for the Volyume app.
 * No side effects, no DB calls, no imports — just math.
 * Adaptive TDEE: computeEWMA, computeWeeklyWeightChange, computeAdaptiveTDEEAdjustment
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Mifflin-St Jeor / Katch-McArdle activity multipliers corrected for gym-only training.
// The traditional 1.725 ("active") and 1.9 ("very active") values were calibrated for
// physically active occupations, not resistance training alone. Research on gym-going
// populations (SportRxiv, 2024) supports reducing these by ~0.05–0.1 to avoid systematic
// TDEE overestimation (~200–400 kcal/day). Users should compare their 4-week weight trend
// against targets and adjust if needed.
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.65,       // 5 gym sessions/week — was 1.725, reduced for gym-only population
  very_active: 1.725, // 6+ gym sessions/week — was 1.9, reduced for gym-only population
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
    range: '2.2–2.6 g/kg',
    description: 'A solid target for consistent gym training. Enough to support muscle growth and recovery without being excessive.',
    lbm: { lean_gain: 2.5, build: 2.5, maintain: 2.3, recomp: 2.6, mild_cut: 2.8, aggressive_cut: 3.0, contest_prep: 3.1 },
    bw:  { lean_gain: 2.2, build: 2.2, maintain: 2.0, recomp: 2.2, mild_cut: 2.5, aggressive_cut: 2.7, contest_prep: 2.9 },
    floor: 2.0,
  },
  optimised: {
    label: 'Optimised',
    range: '2.5–3.0 g/kg',
    description: 'The genuine target for serious hypertrophy training. Fully saturates muscle protein synthesis and gives clear headroom above the minimum.',
    lbm: { lean_gain: 2.8, build: 2.8, maintain: 2.6, recomp: 2.9, mild_cut: 3.1, aggressive_cut: 3.2, contest_prep: 3.3 },
    bw:  { lean_gain: 2.5, build: 2.5, maintain: 2.2, recomp: 2.6, mild_cut: 2.8, aggressive_cut: 3.0, contest_prep: 3.2 },
    floor: 2.2,
  },
  advanced: {
    label: 'Advanced',
    range: '2.8–3.3 g/kg',
    description: 'Upper-end protocol for competitive athletes and hard cuts. Pushes protein as high as practical to protect every gram of muscle.',
    lbm: { lean_gain: 3.0, build: 3.0, maintain: 2.8, recomp: 3.1, mild_cut: 3.2, aggressive_cut: 3.3, contest_prep: 3.3 },
    bw:  { lean_gain: 2.8, build: 2.8, maintain: 2.5, recomp: 2.8, mild_cut: 3.0, aggressive_cut: 3.2, contest_prep: 3.3 },
    floor: 2.5,
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
const MAX_SAFE_LOSS_RATE = 0.008;   // 0.8 % BW/week
const HARD_GATE_LOSS_RATE = 0.015;  // 1.5 % BW/week
const KCAL_PER_KG_FAT = 7700;       // rough energy equivalent of 1 kg body fat

// Fat targets in g/kg BW by phase.
// Carbs fill whatever remains after protein + fat are satisfied.
// Surplus phases: fat is kept lean so carbs remain high for performance.
// Deficit phases: fat stays constant; carbs are reduced first.
const FAT_TARGETS_GKG = {
  lean_gain:       1.0,
  build:           0.9,
  maintain:        1.0,
  recomp:          0.85,
  mild_cut:        0.8,
  aggressive_cut:  0.75,
  contest_prep:    0.7,
};

// ---------------------------------------------------------------------------
// Adaptive TDEE — EWMA weight trend and calorie correction
// ---------------------------------------------------------------------------

const EWMA_ALPHA = 0.28; // smoothing factor — MacroFactor uses ~0.3

// Compute exponentially-weighted moving average of daily weights.
// weightData: array of { weightKg, date } sorted oldest-first.
// Returns smoothed weight for each point, same length as input.
export function computeEWMA(weightData, alpha = EWMA_ALPHA) {
  if (!weightData || weightData.length === 0) return [];
  const result = [];
  let ewma = weightData[0].weightKg;
  for (const point of weightData) {
    ewma = alpha * point.weightKg + (1 - alpha) * ewma;
    result.push({ ...point, ewma: parseFloat(ewma.toFixed(3)) });
  }
  return result;
}

// Compute weekly weight change rate from EWMA-smoothed data.
// ewmaData: output of computeEWMA, sorted oldest-first.
// Returns kg/week (positive = gaining, negative = losing).
export function computeWeeklyWeightChange(ewmaData) {
  if (!ewmaData || ewmaData.length < 7) return null;
  const recent = ewmaData[ewmaData.length - 1].ewma;
  // Use point 7 days back, or oldest available
  const older = ewmaData[Math.max(0, ewmaData.length - 8)].ewma;
  return parseFloat((recent - older).toFixed(3));
}

const KCAL_PER_KG = 7700; // energy in 1 kg of body tissue (mixed lean + fat)

// Compute TDEE adjustment from actual weight trend vs. expected.
// Requires at least 3 weeks (21 data points) before producing a reliable correction.
//
// params:
//   ewmaData        — output of computeEWMA, sorted oldest-first
//   prescribedKcal  — the calorie target the app has been recommending
//   adherenceFactor — 0.0–1.0 (from check-in: 1.0 = fully on target, 0.7 = mostly)
//
// Returns:
//   { adjustmentKcal, adjustedTDEE, actualKgPerWeek, expectedKgPerWeek,
//     confidence, insight, weeks }
export function computeAdaptiveTDEEAdjustment({
  ewmaData,
  prescribedKcal,
  currentTDEEEstimate,
  adherenceFactor = 1.0,
}) {
  const MIN_POINTS = 14; // need at least 2 weeks

  if (!ewmaData || ewmaData.length < MIN_POINTS || !prescribedKcal || !currentTDEEEstimate) {
    return { adjustmentKcal: 0, confidence: 'insufficient_data', insight: null };
  }

  const weeks = Math.floor(ewmaData.length / 7);
  const actualKgPerWeek = computeWeeklyWeightChange(ewmaData);
  if (actualKgPerWeek === null) return { adjustmentKcal: 0, confidence: 'insufficient_data', insight: null };

  // Estimated actual intake, discounted by adherence
  const estimatedActualKcal = prescribedKcal * adherenceFactor;

  // What weight change the prescribed intake SHOULD produce at the estimated TDEE
  const surplusOrDeficit = estimatedActualKcal - currentTDEEEstimate; // kcal/day
  const expectedKgPerWeek = parseFloat(((surplusOrDeficit * 7) / KCAL_PER_KG).toFixed(3));

  // Discrepancy: actual - expected (in kg/week)
  const discrepancy = actualKgPerWeek - expectedKgPerWeek;

  // Convert discrepancy to daily kcal correction
  // If gaining more than expected → TDEE is lower than estimated → reduce TDEE estimate
  const rawAdjustmentKcal = Math.round(-discrepancy * KCAL_PER_KG / 7);

  // Dampen adjustment: apply only 50% of the signal to avoid overcorrection
  const adjustmentKcal = Math.round(rawAdjustmentKcal * 0.5);
  const adjustedTDEE = Math.round(currentTDEEEstimate + adjustmentKcal);

  // Confidence based on data length
  const confidence = weeks >= 4 ? 'high' : weeks >= 3 ? 'medium' : 'low';

  // Plain-English insight
  let insight = null;
  const absAdj = Math.abs(adjustmentKcal);
  if (absAdj < 50) {
    insight = `Your weight is tracking exactly as planned. No change needed.`;
  } else if (adjustmentKcal < 0) {
    insight = `Your weight has risen ${Math.abs(actualKgPerWeek).toFixed(2)} kg/week — slightly faster than planned. Trimming ${absAdj} kcal/day to keep pace on track.`;
  } else {
    insight = `Your weight has moved ${Math.abs(actualKgPerWeek).toFixed(2)} kg/week — slower than planned. Adding ${absAdj} kcal/day to match your true energy needs.`;
  }

  return {
    adjustmentKcal,   // negative = cut kcal, positive = add kcal
    adjustedTDEE,
    actualKgPerWeek,
    expectedKgPerWeek,
    confidence,
    insight,
    weeks,
  };
}

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
export const ADVANCED_PROTEIN_GOALS = [
  'mens_physique', 'classic_physique', 'bodybuilding',
  'bikini', 'wellness', 'figure', 'womens_physique',
  'strength_hypertrophy',
];

// Experience-based surplus multipliers. Beginners utilise larger surpluses efficiently;
// advanced lifters gain fat rapidly above a modest surplus (~200-350 kcal).
// Source: PMC10620361 (2023 parallel-groups RCT); Barakat et al. (2020) narrative review.
const SURPLUS_EXP_MULT = {
  beginner:    { lean_gain: 1.30, build: 1.25 },
  intermediate:{ lean_gain: 1.00, build: 1.00 },
  advanced:    { lean_gain: 0.65, build: 0.80 },
  competitive: { lean_gain: 0.50, build: 0.65 },
};

// Weekly body weight gain targets by experience level (kg/week).
// Beginners can gain more tissue per week; advanced lifters hit the ceiling faster.
export const GAIN_RATE_TARGETS = {
  beginner:    { min: 0.25, max: 0.50 },
  intermediate:{ min: 0.15, max: 0.30 },
  advanced:    { min: 0.05, max: 0.20 },
  competitive: { min: 0.03, max: 0.15 },
};

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
    experienceLevel = 'intermediate', // 'beginner' | 'intermediate' | 'advanced' | 'competitive'
  } = inputs;

  // Clamp inputs to physiologically safe ranges — guards against typos and invalid onboarding data.
  const safeAge    = Math.min(Math.max(Math.round(ageYears  ?? 28), 13), 100);
  const safeHeight = Math.min(Math.max(heightCm ?? 170, 100), 250);
  const safeWeight = Math.min(Math.max(weightKg ?? 75, 30), 350);

  const bodyFatPercent = _bfp ?? _bfpAlias;

  // Auto-select advanced protein approach for physique competitor and strength goals
  // unless the caller has explicitly specified a different approach.
  const proteinApproach = _proteinApproachInput
    ?? (ADVANCED_PROTEIN_GOALS.includes(trainingGoal) ? 'advanced' : 'optimised');

  const warnings = [];

  // --- BMR ---
  const { bmr, formula, lbm } = calcBMR(
    sex,
    safeAge,
    safeHeight,
    safeWeight,
    bodyFatPercent,
    bodyFatSource,
  );
  const bmrKcal = Math.round(bmr);

  // --- TDEE / Maintenance ---
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  const maintenanceKcal = Math.round(bmr * multiplier);

  // --- Phase calorie adjustment ---
  let phaseAdj = PHASE_ADJUSTMENTS[goal] ?? 0;
  // Scale surplus phases by experience level: beginners can use larger surpluses;
  // advanced lifters accumulate fat rapidly above a modest surplus.
  if (phaseAdj > 0) {
    const expMult = SURPLUS_EXP_MULT[experienceLevel] ?? SURPLUS_EXP_MULT.intermediate;
    const mult = expMult[goal] ?? 1.0;
    phaseAdj = phaseAdj * mult;
  }
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
  const estimatedRate = estimateWeeklyRate(targetKcal, maintenanceKcal, safeWeight);
  const isDeficit = targetKcal < maintenanceKcal;

  if (isDeficit) {
    const lossFraction = Math.abs(estimatedRate) / safeWeight;

    if (lossFraction > HARD_GATE_LOSS_RATE) {
      warnings.push(
        `Estimated loss rate (${(lossFraction * 100).toFixed(2)} % BW/week) exceeds the 1.5 % hard gate. ` +
          `Calories have been raised to limit loss to 1.5 % BW/week.`,
      );
      // Cap at 1.5 % loss: weekly deficit = 1.5% × BW × 7700 kcal/kg
      const maxWeeklyDeficit = HARD_GATE_LOSS_RATE * safeWeight * KCAL_PER_KG_FAT;
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
    calcProtein(goal, safeWeight, lbm, bodyFatSource, proteinApproach, customProteinGPerKg);
  const proteinG = Math.round(proteinRaw);
  const proteinKcal = proteinG * KCAL_PER_G_PROTEIN;

  // Fat: g/kg BW by phase keeps fat at hormonal minimum so carbs remain high.
  const fatTargetGkg = FAT_TARGETS_GKG[goal] ?? 1.0;
  const fatFloor = Math.max(0.5 * safeWeight, 40);
  let fatG = Math.max(Math.round(fatTargetGkg * safeWeight), fatFloor);
  const fatKcal = fatG * KCAL_PER_G_FAT;

  const carbKcal = Math.max(targetKcal - proteinKcal - fatKcal, 0);
  const carbsG = Math.round(carbKcal / KCAL_PER_G_CARB);

  // Recompute actual targetKcal from rounded macros
  const actualTargetKcal = proteinKcal + fatKcal + carbKcal;

  // --- Output ranges ---
  const kcalMin = Math.round(actualTargetKcal * 0.9);
  const kcalMax = Math.round(actualTargetKcal * 1.1);

  // --- Estimated weekly rate (recalculated with final targetKcal) ---
  const finalEstimatedRate = estimateWeeklyRate(actualTargetKcal, maintenanceKcal, safeWeight);

  // --- Per-meal protein distribution ---
  // Research: 3-5 protein meals per day, each crossing the ~25-40g leucine threshold,
  // produces ~25% greater 24-hour MPS than the same total in 1-2 large meals.
  // Source: Mamerow et al. (2014), J Nutrition; Frontiers Nutrition (2024).
  const mealFrequency = (goal === 'aggressive_cut' || goal === 'contest_prep') ? 5 : 4;
  const perMealProteinG = Math.round(proteinG / mealFrequency);

  // --- Weekly gain/loss rate targets ---
  const gainRateTarget = GAIN_RATE_TARGETS[experienceLevel] ?? GAIN_RATE_TARGETS.intermediate;

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
    proteinGPerKg: parseFloat((proteinG / safeWeight).toFixed(2)),
    proteinBasis,        // 'lbm' (preferred) or 'bodyweight' (fallback)
    proteinGPerKgLbm: lbm ? parseFloat((proteinG / lbm).toFixed(2)) : null,
    proteinApproach,     // 'standard' | 'optimised' | 'advanced'
    proteinRateUsed,     // exact g/kg rate applied
    perMealProteinG,     // target protein per meal to saturate MPS
    mealFrequency,       // recommended meals per day
    targetRateKgPerWeek: parseFloat(finalEstimatedRate.toFixed(3)),
    gainRateTargetMin: gainRateTarget.min,  // expected weekly rate (kg/week) for this experience level
    gainRateTargetMax: gainRateTarget.max,
    confidence: calcConfidence(bodyFatSource),
    phase: PHASE_LABELS[goal] ?? goal,
    goal,
    experienceLevel,
    formulaUsed: formula,
    warnings,
    isConsentRequired: true,
  };
}

// ---------------------------------------------------------------------------
// Export: getPlanNutritionContext
// ---------------------------------------------------------------------------

export function getPlanNutritionContext(targets, { bodyMetricsData = [], adherenceFactor = 1.0 } = {}) {
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

  // --- Refeed and diet break recommendations ---
  // Evidence: MATADOR study (2017, Int J Obesity) — 2-week diet breaks produced 50% more fat
  // loss than continuous restriction at equal total deficit time. Refeeds (1-2 days at
  // maintenance via carbs) partially restore leptin and preserve RMR.
  // Source: PMC7739314 (2020); multiple RCTs on intermittent energy restriction.
  let refeedRecommendation = null;
  if (goal === 'aggressive_cut' || goal === 'contest_prep') {
    const refeedProteinKcal = (targets.proteinG ?? 0) * 4;
    const refeedFatKcal     = (targets.fatG ?? 0) * 9;
    const refeedCarbsKcal   = Math.max(0, maintenanceKcal - refeedProteinKcal - refeedFatKcal);
    refeedRecommendation = {
      type: 'refeed',
      frequencyWeeks: goal === 'contest_prep' ? 1 : 2,
      durationDays: 2,
      caloricTargetKcal: maintenanceKcal,
      refeedCarbsG: Math.round(refeedCarbsKcal / 4),
      notes: 'Return to maintenance calories for 1-2 days, primarily via carbohydrates. Keep protein constant. This helps maintain metabolic rate and hormonal balance during a long deficit.',
    };
  }

  let dietBreakRecommendation = null;
  if (goal === 'contest_prep') {
    dietBreakRecommendation = {
      frequencyWeeks: 8,
      durationWeeks: 1,
      caloricTargetKcal: maintenanceKcal,
      notes: '1 week at maintenance every 8 weeks of prep. Best used when more than 10 weeks out from competition. Metabolic rate and hormonal environment partially restore during the break.',
    };
  }

  // --- Adaptive TDEE from body weight trend ---
  // bodyMetricsData items are { weightKg, recorded_at }; sort oldest-first before processing.
  let ewmaCurrentKg = null;
  let weeklyWeightChange = null;
  let adaptiveTDEEAdjustment = { adjustmentKcal: 0, confidence: 'insufficient_data', insight: null };

  if (bodyMetricsData && bodyMetricsData.length >= 14) {
    const sorted = [...bodyMetricsData]
      .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
      .map(entry => ({ weightKg: entry.weightKg, date: entry.recorded_at }));

    const ewmaData = computeEWMA(sorted);
    if (ewmaData.length > 0) {
      ewmaCurrentKg = ewmaData[ewmaData.length - 1].ewma;
    }
    weeklyWeightChange = computeWeeklyWeightChange(ewmaData);
    adaptiveTDEEAdjustment = computeAdaptiveTDEEAdjustment({
      ewmaData,
      prescribedKcal: targetKcal,
      currentTDEEEstimate: maintenanceKcal,
      adherenceFactor,
    });
  }

  return {
    phaseType,
    recoveryModifier: parseFloat(recoveryModifier.toFixed(2)),
    volumeCeiling,
    failureExposureLevel,
    deloadFrequencyWeeks,
    explanation,
    refeedRecommendation,
    dietBreakRecommendation,
    ewmaCurrentKg,
    weeklyWeightChange,
    adaptiveTDEEAdjustment,
  };
}
