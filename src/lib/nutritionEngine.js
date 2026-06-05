/**
 * nutritionEngine.js
 * Pure-function nutrition target calculator for the Volyume app.
 * No side effects, no DB calls, no imports, just math.
 * Adaptive TDEE: computeEWMA, computeWeeklyWeightChange, computeAdaptiveTDEEAdjustment
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Mifflin-St Jeor / Katch-McArdle activity multipliers tuned downward from the
// generic 1.725 / 1.9 values for gym-only populations. The downward tuning is
// based on coaching observation that standard multipliers overestimate gym-only
// TDEE by 200-400 kcal/day. Theoretical basis in the constrained-TDEE literature
// (Pontzer et al. 2016, Current Biology 26:410-417) is contested by Davy et al.
// 2025 (PNAS, 10.1073/pnas.2519626122). Users should compare their 4-week weight
// trend against targets and adjust if needed.
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.65,       // 5 gym sessions/week, was 1.725, reduced for gym-only population
  very_active: 1.725, // 6+ gym sessions/week, was 1.9, reduced for gym-only population
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

// Three protein approaches, user selects which fits their preference.
//
// standard , mainstream sports nutrition guidelines. Adequate for muscle
//             growth and easy to sustain day-to-day.
// optimised, midpoint of current hypertrophy research (gains plateau ~1.62 g/kg BW;
//             2.0–2.3 g/kg LBM gives a practical buffer above that). DEFAULT.
// advanced , higher-end competitive protocol. Rates rise aggressively in
//             deficits to maximise lean mass retention. Based on published
//             contest-prep research (2.3–3.1 g/kg LBM range).
//
// Rates are g per kg of LEAN BODY MASS (preferred when body fat is measured):
// `range` is shown to the user under a plain "g/kg" label, which a user reads
// as grams per kg of BODYWEIGHT. So range states the bodyweight-basis span
// actually delivered across the common goals (the no-BF% path most users are
// on). It also brackets the lean-mass path: an LBM rate x lean fraction lands
// in the same band, so the displayed range is honest for both. (Previously
// range showed the higher lean-mass-only numbers, which over-stated the target
// for the common bodyweight path, e.g. "2.5-3.0" shown but 2.2 delivered.)
export const PROTEIN_APPROACHES = {
  standard: {
    label: 'Standard',
    range: '2.0–2.7 g/kg',
    description: 'A solid target for consistent gym training. Enough to support muscle growth and recovery without being excessive.',
    lbm: { lean_gain: 2.5, build: 2.5, maintain: 2.3, recomp: 2.6, mild_cut: 2.8, aggressive_cut: 3.0, contest_prep: 3.1 },
    bw:  { lean_gain: 2.2, build: 2.2, maintain: 2.0, recomp: 2.2, mild_cut: 2.5, aggressive_cut: 2.7, contest_prep: 2.9 },
    floor: 2.0,
  },
  optimised: {
    label: 'Optimised',
    range: '2.2–3.0 g/kg',
    description: 'The real target if you are serious about building muscle. Comfortably above the minimum, with headroom to spare.',
    lbm: { lean_gain: 2.8, build: 2.8, maintain: 2.6, recomp: 2.9, mild_cut: 3.1, aggressive_cut: 3.2, contest_prep: 3.3 },
    bw:  { lean_gain: 2.5, build: 2.5, maintain: 2.2, recomp: 2.6, mild_cut: 2.8, aggressive_cut: 3.0, contest_prep: 3.2 },
    floor: 2.2,
  },
  advanced: {
    label: 'Advanced',
    range: '2.5–3.2 g/kg',
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

// MATADOR trial (2017, Int J Obesity): intermittent energy restriction with 2-week breaks
// every 8–12 weeks preserves metabolic rate better than continuous restriction.
export const DIET_BREAK_THRESHOLD_WEEKS = 8;

// FFM (fat-free mass) energy floor. The IOC RED-S consensus
// (Mountjoy et al. 2014 BJSM 48:491-497; updated Mountjoy et al. 2023
// BJSM 57:1073-1097, DOI 10.1136/bjsports-2023-106994) labels sustained
// intake at or below 30 kcal per kg of fat-free mass per day as
// "problematic low energy availability". Precision Coaching uses this
// as a hard floor: when the 7-day rolling intake average falls at or
// below the user's FFM-derived floor, deficit suggestions are refused
// and a held-decision card surfaces.
export const FFM_FLOOR_KCAL_PER_KG = 30;

// When BF% is unknown or unreliable, FFM is estimated from population
// averages. Conservative defaults chosen so the floor errs on the
// higher (safer) side rather than the lower side that would let the
// engine keep cutting under-fuelled users. Sex-aware because typical
// body-fat percentages differ meaningfully by sex.
const FFM_FALLBACK_FRACTION = {
  male:   0.78, // ~22% BF (conservative for typical male trainee)
  female: 0.72, // ~28% BF (conservative for typical female trainee)
};

// Morton et al. (2018) meta-analysis upper CI, no benefit beyond 2.2 g/kg BW when
// body fat % is unknown (lean mass-based calculation already handles the known-BF% case).
export const PROTEIN_MAX_GKGBW = 2.2;

// Hard ceiling for a coach/user-entered custom protein rate. Generous enough
// for lean contest prep on a bodyweight basis, but catches mis-entries (a
// "10" meaning 10 g/kg BW). Above this there is no added benefit.
export const PROTEIN_CUSTOM_MAX_GKGBW = 3.5;

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
// Adaptive TDEE, EWMA weight trend and calorie correction
// ---------------------------------------------------------------------------

const EWMA_ALPHA = 0.28; // smoothing factor : MacroFactor uses ~0.3

// Compute exponentially-weighted moving average of daily weights.
// weightData: array of { weightKg, date } sorted oldest-first.
// Returns smoothed weight for each point, same length as input.
//
// Distinct from weeklyCoach.computeEWMA. This one uses an aggressive
// alpha (0.28, ~3.5-day memory) for diet-planning surfaces (BodyMetrics,
// CoachOutput nutrition trend). The slow variant in weeklyCoach uses
// alpha 0.1 (~10-day memory) for the weekly-coach trend signal. Output
// shapes differ deliberately ({ ...point, ewma } here vs
// { loggedAt, rawKg, ewmaKg } there) so callers can't accidentally use
// the wrong one and have the wrong field names compile.
export function computeEWMA(weightData, alpha = EWMA_ALPHA) {
  if (!Array.isArray(weightData)) return [];
  // Drop malformed rows (null entries, missing or non-numeric weightKg) so one
  // corrupt weigh-in can neither crash the smoother nor poison every later
  // point with NaN.
  const clean = weightData.filter((p) => p && Number.isFinite(Number(p.weightKg)));
  if (clean.length === 0) return [];
  const result = [];
  let ewma = Number(clean[0].weightKg);
  for (const point of clean) {
    ewma = alpha * Number(point.weightKg) + (1 - alpha) * ewma;
    result.push({ ...point, ewma: parseFloat(ewma.toFixed(3)) });
  }
  return result;
}

// Generic EWMA over a plain numeric series, same smoothing factor as the
// weight trend. Used for the body-fat trend chart (GAP row 25) so the
// line follows the trend rather than the daily noise. Non-numeric or
// empty input yields []. Each output is rounded to 2 dp.
export function ewmaValues(values, alpha = EWMA_ALPHA) {
  if (!Array.isArray(values)) return [];
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return [];
  const out = [];
  let ewma = nums[0];
  for (const n of nums) {
    ewma = alpha * n + (1 - alpha) * ewma;
    out.push(parseFloat(ewma.toFixed(2)));
  }
  return out;
}

// Compute weekly weight change rate from EWMA-smoothed data.
// ewmaData: output of computeEWMA, sorted oldest-first.
// Returns kg/week (positive = gaining, negative = losing).
//
// Requires at least 8 points so the window between recent (index -1) and
// older (index -8) spans a full 7 days. With only 7 points the gap is 6
// days and the rate would read ~17% optimistic.
export function computeWeeklyWeightChange(ewmaData) {
  if (!ewmaData || ewmaData.length < 2) return null;
  const last = ewmaData[ewmaData.length - 1];
  const lastMs = last && last.date != null ? Date.parse(last.date) : NaN;

  // Date-aware path: normalise to a true 7-day rate from timestamps, so a
  // user who logs several times a day (or skips days) gets a correct
  // kg/week rather than "index -8 == 7 days ago". Requires ~a week of span
  // so the rate isn't extrapolated from a day or two of noise.
  if (Number.isFinite(lastMs)) {
    const MIN_SPAN_DAYS = 6;
    let older = null;
    let olderMs = NaN;
    for (let i = ewmaData.length - 2; i >= 0; i--) {
      const ms = ewmaData[i].date != null ? Date.parse(ewmaData[i].date) : NaN;
      if (!Number.isFinite(ms)) continue;
      if (lastMs - ms >= MIN_SPAN_DAYS * 86400000) {
        older = ewmaData[i];
        olderMs = ms;
        break; // newest entry that is at least ~a week back
      }
    }
    if (!older) return null;
    const spanDays = (lastMs - olderMs) / 86400000;
    if (spanDays <= 0) return null;
    const ratePerWeek = ((last.ewma - older.ewma) / spanDays) * 7;
    return parseFloat(ratePerWeek.toFixed(3));
  }

  // Back-compat fallback when entries carry no usable date: the original
  // index-based window (assumes ~daily logging).
  if (ewmaData.length < 8) return null;
  const olderByIndex = ewmaData[ewmaData.length - 8].ewma;
  return parseFloat((last.ewma - olderByIndex).toFixed(3));
}

const KCAL_PER_KG = 7700; // energy in 1 kg of body tissue (mixed lean + fat)

// Compute TDEE adjustment from actual weight trend vs. expected.
// Requires at least 3 weeks (21 data points) before producing a reliable correction.
//
// params:
//   ewmaData       , output of computeEWMA, sorted oldest-first
//   prescribedKcal , the calorie target the app has been recommending
//   adherenceFactor, 0.0–1.0 (from check-in: 1.0 = fully on target, 0.7 = mostly)
//
// Returns:
//   { adjustmentKcal, adjustedTDEE, actualKgPerWeek, expectedKgPerWeek,
//     confidence, insight, weeks }
export function computeAdaptiveTDEEAdjustment({
  ewmaData,
  prescribedKcal,
  currentTDEEEstimate,
  adherenceFactor = 1.0,
  // FFM-floor safety context. When provided, Precision Coaching refuses
  // to suggest further deficit (clamps negative adjustments to zero) once
  // the 7-day rolling intake average sits at or below the user's
  // FFM-derived energy floor. Positive adjustments (increase calories)
  // are unaffected; the floor only blocks cuts.
  //
  // Locked in COACHING_VOICE_SYNTHESIS_LOCKED.md, MOVE_1_FOOD_FOUNDATION_AND_FFM.md.
  // Threshold from Mountjoy 2014/2023 IOC RED-S consensus (30 kcal/kg FFM/day).
  ffmFloorContext = null,
  // Move #3: upward-only override. Set by the caller when the rapid-
  // loss safety condition fires (weekly loss <= -1.5% AND energy low).
  // True clamps any negative adjustment to zero -- only upward
  // corrections survive. The gating-bypass semantics (no 2-week
  // cooldown, no consecutiveOffTargetWeeks gate) live in the caller
  // (runWeeklyCoach); this function just forces the upward-only shape
  // of the adjustment value so a misconfigured caller can't push a
  // cut while the override is on.
  rapidLossOverride = false,
}) {
  const MIN_POINTS = 14; // need at least 2 weeks

  if (!ewmaData || ewmaData.length < MIN_POINTS || !prescribedKcal || !currentTDEEEstimate) {
    return { adjustmentKcal: 0, confidence: 'insufficient_data', insight: null, floorHeld: false };
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
    insight = `Your weight has risen ${Math.abs(actualKgPerWeek).toFixed(2)} kg/week, slightly faster than planned. Trimming ${absAdj} kcal/day to keep pace on track.`;
  } else {
    insight = `Your weight has moved ${Math.abs(actualKgPerWeek).toFixed(2)} kg/week, slower than planned. Adding ${absAdj} kcal/day to match your true energy needs.`;
  }

  // FFM-floor safety check. Runs only when the caller supplied an
  // ffmFloorContext with enough recent food-intake data (>=5 days in
  // the last 7) and a credible-or-fallback body composition input.
  // If the user's 7-day rolling intake sits at or below their
  // FFM-derived floor, Precision Coaching refuses any further deficit
  // suggestion this run. Positive adjustments (add calories) are
  // never blocked.
  let floorHeld = false;
  let finalAdjustmentKcal = adjustmentKcal;
  let finalInsight = insight;
  if (
    ffmFloorContext &&
    typeof ffmFloorContext.weightKg === 'number' &&
    typeof ffmFloorContext.recentIntakeAvgKcal === 'number' &&
    typeof ffmFloorContext.recentIntakeDaysLogged === 'number' &&
    ffmFloorContext.recentIntakeDaysLogged >= 5
  ) {
    const floor = computeFFMFloor(ffmFloorContext.weightKg, {
      bodyFatPercent: ffmFloorContext.bodyFatPercent ?? null,
      bodyFatSource:  ffmFloorContext.bodyFatSource ?? null,
      sex:            ffmFloorContext.sex ?? null,
    });
    if (ffmFloorContext.recentIntakeAvgKcal <= floor.floorKcal && adjustmentKcal < 0) {
      // Clamp the cut. Increases are never clamped.
      floorHeld = true;
      finalAdjustmentKcal = 0;
      finalInsight = `Precision Coaching has held your calorie target. Your seven-day average intake of ${Math.round(ffmFloorContext.recentIntakeAvgKcal)} kcal is at or below your safety floor of ${floor.floorKcal} kcal. Eating below this level for long stretches breaks down muscle and stalls recovery.`;
    }
  }

  // Move #3 upward-only override. Clamps negative adjustments to
  // zero so the caller can't accidentally push a cut while the
  // rapid-loss safety condition is open. Applied last so it composes
  // with the FFM floor without double-counting.
  if (rapidLossOverride && finalAdjustmentKcal < 0) {
    finalAdjustmentKcal = 0;
  }

  return {
    adjustmentKcal: finalAdjustmentKcal,   // negative = cut kcal, positive = add kcal
    adjustedTDEE,
    actualKgPerWeek,
    expectedKgPerWeek,
    confidence,
    insight: finalInsight,
    weeks,
    floorHeld,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function calcBMR(sex, ageYears, heightCm, weightKg, bodyFatPercent, bodyFatSource) {
  const useKatchMcArdle =
    Number.isFinite(bodyFatPercent) &&
    // Range guard: a corrupt or fat-fingered body-fat reading (negative, 0,
    // or > 60%) would poison the lean-mass formula and produce absurd calorie
    // and protein targets. Mirror the same physiological band computeFFMFloor
    // already enforces, and fall back to Mifflin outside it.
    bodyFatPercent > 0 &&
    bodyFatPercent < 60 &&
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

/**
 * Compute the FFM-derived energy floor for a user.
 *
 * Returns the minimum daily kcal Precision Coaching will permit on a
 * cut, based on the user's fat-free mass and the Mountjoy 2014/2023
 * 30 kcal/kg FFM/day threshold for problematic low energy availability.
 *
 * When the user has a credible BF% measurement (DEXA, caliper, BIA,
 * but not visual self-estimate), FFM is computed from weight × (1 -
 * BF%/100). When BF% is unknown or visual-only, FFM falls back to a
 * sex-aware conservative population estimate that errs on the
 * higher (safer) FFM side so the floor protects more, not less.
 *
 * @param {number} weightKg
 * @param {object} options
 * @param {number|null} options.bodyFatPercent
 * @param {string|null} options.bodyFatSource - 'dexa'|'caliper'|'bia'|'visual'|null
 * @param {'male'|'female'|null} options.sex
 * @returns {{ floorKcal: number, ffmKg: number, source: 'katch_mcardle'|'fallback' }}
 */
export function computeFFMFloor(weightKg, { bodyFatPercent = null, bodyFatSource = null, sex = null } = {}) {
  if (typeof weightKg !== 'number' || !isFinite(weightKg) || weightKg <= 0) {
    throw new Error('computeFFMFloor: weightKg must be a positive number');
  }

  const credibleBF =
    bodyFatPercent !== null &&
    bodyFatPercent !== undefined &&
    isFinite(bodyFatPercent) &&
    bodyFatPercent > 0 &&
    bodyFatPercent < 60 &&
    bodyFatSource !== null &&
    bodyFatSource !== 'visual';

  if (credibleBF) {
    const ffmKg = weightKg * (1 - bodyFatPercent / 100);
    return {
      floorKcal: Math.round(ffmKg * FFM_FLOOR_KCAL_PER_KG),
      ffmKg: Math.round(ffmKg * 10) / 10,
      source: 'katch_mcardle',
    };
  }

  const fraction = FFM_FALLBACK_FRACTION[sex] ?? FFM_FALLBACK_FRACTION.male;
  const ffmKg = weightKg * fraction;
  return {
    floorKcal: Math.round(ffmKg * FFM_FLOOR_KCAL_PER_KG),
    ffmKg: Math.round(ffmKg * 10) / 10,
    source: 'fallback',
  };
}

function calcConfidence(bodyFatSource) {
  if (bodyFatSource === 'dexa' || bodyFatSource === 'caliper') return 'high';
  if (bodyFatSource === 'bia') return 'medium';
  if (bodyFatSource === 'visual') return 'low';
  return 'medium'; // no body fat provided
}

// Returns { proteinG, basis, proteinRateUsed } where basis is 'lbm' or 'bodyweight'.
function calcProtein(goal, weightKg, lbm, bodyFatSource, proteinApproach = 'optimised', customGPerKg = null) {
  // The 'custom' entry only carries metadata (label, floor); its lbm/bw
  // tables are null because the rate comes from the user. If 'custom' is
  // selected without a value, fall back to 'optimised' so the bw/lbm
  // lookup below has tables to read. Without this fallback, the next
  // line dereferences null and Hermes throws "Cannot convert null value
  // to object".
  const effectiveApproach =
    proteinApproach === 'custom' && !(customGPerKg != null && customGPerKg > 0)
      ? 'optimised'
      : proteinApproach;
  const approach = PROTEIN_APPROACHES[effectiveApproach] ?? PROTEIN_APPROACHES.optimised;
  const floorG = approach.floor * weightKg;

  // Custom override, apply rate directly to bodyweight (coaches typically specify g/kg BW).
  if (proteinApproach === 'custom' && customGPerKg != null && customGPerKg > 0) {
    // Clamp to a sane ceiling: above ~3.5 g/kg BW there is no added benefit
    // and the value is almost certainly a mis-entry (e.g. a fat-fingered 10).
    const rate = Math.min(customGPerKg, PROTEIN_CUSTOM_MAX_GKGBW);
    const proteinG = Math.max(rate * weightKg, floorG);
    return { proteinG, basis: 'bodyweight', proteinRateUsed: rate };
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

function estimateWeeklyRate(targetKcal, maintenanceKcal, _weightKg) {
  const dailyDelta = targetKcal - maintenanceKcal;
  const weeklyDelta = dailyDelta * 7;
  // 1 kg body fat ≈ 7700 kcal deficit/surplus
  return weeklyDelta / KCAL_PER_KG_FAT;
}

// ---------------------------------------------------------------------------
// Main export: calculateNutritionTargets
// ---------------------------------------------------------------------------

// Physique competitor categories warrant the advanced protein approach
// because coaches prescribe 2.4 g/kg BW for bulking phases in these
// categories. 'strength_hypertrophy' used to live here too, but that
// concept moved to TRAINING_PHASES.strength_size, a phase emphasis,
// not a physique. Strength-size users on general physique get the
// standard 2.0 g/kg protein target, which is fine for them.
export const ADVANCED_PROTEIN_GOALS = [
  'mens_physique', 'classic_physique', 'bodybuilding',
  'bikini', 'wellness', 'figure', 'womens_physique',
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
    targetRateKgPerWeek: _targetRateKgPerWeek = null,
    experienceLevel = 'intermediate', // 'beginner' | 'intermediate' | 'advanced' | 'competitive'
  } = inputs;

  // Clamp inputs to physiologically safe ranges, guards against typos and invalid onboarding data.
  // Number.isFinite (not ??) so an explicit NaN (e.g. parseFloat('.')) falls
  // back to the default instead of poisoning every downstream calorie/macro
  // value with NaN. null/undefined still hit the default as before.
  const safeAge    = Math.min(Math.max(Math.round(Number.isFinite(ageYears) ? ageYears : 28), 13), 100);
  const safeHeight = Math.min(Math.max(Number.isFinite(heightCm) ? heightCm : 170, 100), 250);
  const safeWeight = Math.min(Math.max(Number.isFinite(weightKg) ? weightKg : 75, 30), 350);

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
// Diet break trigger
// ---------------------------------------------------------------------------

// Returns a flag and message when a user has been in a calorie deficit for
// >= DIET_BREAK_THRESHOLD_WEEKS weeks.
// Based on MATADOR trial finding: intermittent energy restriction with 2-week
// breaks every 8–12 weeks preserves metabolic rate better than continuous restriction.
//
// deficitStartDate, Date (or date-parseable value) when the deficit began
// currentDate     , defaults to now; override in tests
export function shouldSuggestDietBreak(deficitStartDate, currentDate = new Date()) {
  // Guard a null/invalid start date. new Date(null) is epoch 0, which would
  // read as ~2900 weeks of deficit and fire a spurious diet-break suggestion.
  const startMs = deficitStartDate == null ? NaN : new Date(deficitStartDate).getTime();
  if (!Number.isFinite(startMs)) {
    return { suggest: false, weeksInDeficit: 0 };
  }
  const weeksInDeficit = Math.floor(
    (currentDate - startMs) / (7 * 24 * 60 * 60 * 1000),
  );

  if (weeksInDeficit >= DIET_BREAK_THRESHOLD_WEEKS) {
    return {
      suggest: true,
      weeksInDeficit,
      message:
        `You have been in a calorie deficit for ${weeksInDeficit} weeks. ` +
        `A 2-week diet break at maintenance calories may help maintain your metabolic rate ` +
        `and training performance before continuing. (Based on MATADOR trial findings.)`,
    };
  }

  return { suggest: false, weeksInDeficit };
}

// ---------------------------------------------------------------------------
// Export: getPlanNutritionContext
// ---------------------------------------------------------------------------

export function getPlanNutritionContext(targets, { bodyMetricsData = [], adherenceFactor = 1.0, bodyweightKg = null, bodyFatPercent = null } = {}) {
  const { targetKcal, maintenanceKcal, goal } = targets;

  // Protein cap: when bodyweight is known but body fat % is NOT known, cap protein at
  // 2.2 g/kg BW per day. When BF% is known, the lean-mass-based calculation already
  // handles the upper bound correctly.
  // Morton et al. (2018) meta-analysis upper CI, no benefit beyond 2.2 g/kg without BF% data
  let { proteinG } = targets;
  if (
    bodyweightKg != null &&
    bodyweightKg > 0 &&
    (bodyFatPercent == null || bodyFatPercent === undefined)
  ) {
    const proteinCapG = PROTEIN_MAX_GKGBW * bodyweightKg;
    if (proteinG > proteinCapG) {
      proteinG = Math.round(proteinCapG);
    }
  }

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
    // deficit, scale by how deep the cut is
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
      'A small calorie surplus and steady training. You gain muscle slowly with little fat.',
    build:
      'A bigger surplus gives you more to recover from, so you can train hard and add weight over time.',
    maintain:
      'Eating at maintenance holds your performance. Steady training keeps your gains without piling on fatigue.',
    recomp:
      'A slight deficit with high protein. You lose a bit of fat while holding onto muscle.',
    mild_cut:
      'A gentle deficit keeps your strength up. Training eases off a little to match lower recovery.',
    aggressive_cut:
      'A big deficit makes recovery harder, so training drops back and you stop short of failure to keep muscle.',
    contest_prep:
      'A very hard deficit. Training stays light and well short of failure to protect your muscle.',
  };
  const explanation = explanations[goal] ?? 'Set up for your current phase.';

  // --- Refeed and diet break recommendations ---
  // Evidence: MATADOR study (2017, Int J Obesity), 2-week diet breaks produced 50% more fat
  // loss than continuous restriction at equal total deficit time. Refeeds (1-2 days at
  // maintenance via carbs) partially restore leptin and preserve RMR.
  // Source: PMC7739314 (2020); multiple RCTs on intermittent energy restriction.
  let refeedRecommendation = null;
  if (goal === 'aggressive_cut' || goal === 'contest_prep') {
    const refeedProteinKcal = (proteinG ?? 0) * 4;
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
