/**
 * scenarios.nutrition.data.js — Campaign 21 NUTRITION/MAINTENANCE family DATA.
 *
 * Pure scenario definitions covering N-TARGETS (BMR/target calculation),
 * N-ADAPTIVE (weight-trend interpretation), N-MAINT (Campaign 19
 * effective-maintenance authority), N-COACH (weekly-coach nutrition gates,
 * minus what the conflict family already proved — see the header note
 * below), N-VOL (training-volume outcome memory, nutrition-adjacent),
 * N-BANK (calorie bank) and N-ADHERENCE (logging-quality tolerance bands).
 *
 * DUPLICATION CHECK (Campaign 21 Step 5 brief): scenarios.conflict.data.js
 * already exercises N-COACH-03 (CFL-12), N-COACH-08 (CFL-17/18),
 * N-COACH-10/U-AUTH-02 (CFL-18b/18c), N-COACH-11 (CFL-06), N-COACH-17
 * (CFL-28) and N-VOL-02 (CFL-10) against runWeeklyCoach. This file does
 * NOT repeat those; it covers the REMAINING N-COACH/N-VOL rules
 * (01/02/04/05/06/07/09/12/13/14/15/18/EXCEEDED, N-VOL-01/03) plus every
 * N-TARGETS/N-ADAPTIVE/N-MAINT/N-BANK/N-ADHERENCE rule via the new pure
 * registry seams added in this Step (`nutritionTargets`,
 * `effectiveMaintenance`, `calorieBank`, `adherence`).
 *
 * Numeric fixtures for the weeklyCoach-entry scenarios that model dose
 * escalation / anti-oscillation / fixed-step sizing follow the exact
 * fixture recipes proven in src/lib/__tests__/coachLearningLoop.test.js
 * and weeklyCoach.d15ExceededEscalation.test.js (TEST-tier authority per
 * ORACLE-LOCK.md's authority hierarchy), re-anchored to the harness's
 * fixed NOW so they stay deterministic.
 *
 * Authority: ORACLE-LOCK.md N-TARGETS/N-ADAPTIVE/N-MAINT/N-COACH/N-VOL/
 * N-BANK/N-ADHERENCE (LEAD-REVIEW: ACCEPTED 2026-08-16).
 */
import { NOW, DAY, b } from './harness';
// Fixture-construction-only imports (NOT the harness ENTRIES dispatch): these
// build realistic production-shaped fixtures (a cryptographically-checksummed
// effective-maintenance memo; a Campaign 18 intervention record) the same way
// scenarios.conflict.data.js hand-builds a VOLUME_START record shape. The
// scenarios below still exercise the REAL production decision through the
// `weeklyCoach` / `effectiveMaintenance` registry entries; these two imports
// only remove the need to hand-compute an FNV-1a checksum or duplicate a
// record shape that already has a canonical builder.
import { deriveEffectiveMaintenanceMemo } from '../../lib/effectiveMaintenance';
import { buildInterventionRecord, INTERVENTION_KIND } from '../../lib/coachIntervention';
// Reused verbatim (the exported fixture itself, not just its numbers) from
// scenarios.conflict.data.js's own CFL-06 base case, which already proves
// this exact fixture isolates ffmFloorHeld with every OTHER autoApplyHold
// term false -- the canonical FFM-floor-only week for the N-COACH-14 OR-
// isolation scenarios below.
import { ffmFloorWeek } from './scenarios.conflict.data';

// ── Shared fixture helpers ────────────────────────────────────────────────────

/** n distinct-calendar-day weight rows for effective-maintenance evidence. */
function memoWeights(n = 14, startKg = 80) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ loggedAt: (NOW - 30 * DAY) - (n - 1 - i) * DAY, weightKg: startKg });
  }
  return out;
}

/** 14-day flat/trending weight series (mirrors weeklyCoach.test.js's `trend()`
 * exactly, re-anchored to the harness NOW). Deliberately SHORT (14 points) so
 * the adaptive-TDEE resize path never activates (needs >=14 AND >=4 weeks'
 * coverage for 'high' confidence; 14 days is ~2 weeks), keeping the FIXED-STEP
 * sizing (N-COACH-04) isolated and exact. */
function flatTrend14(startKg, kgPerWeek = 0) {
  const count = 14;
  const out = [];
  const endKg = startKg + kgPerWeek * 2;
  for (let i = 0; i < count; i++) {
    const t = NOW - (count - 1 - i) * DAY;
    const w = startKg + (endKg - startKg) * (i / Math.max(1, count - 1));
    out.push({ loggedAt: t, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

/** A moderate weekly push (recovery x performance both '2'): the exact
 * fixture recipe from weeklyCoach.d15ExceededEscalation.test.js /
 * scenarios.conflict.data.js's moderatePushWeek, kept local so this file has
 * no cross-file data dependency. */
function moderatePushWeek(overrides = {}) {
  const flat = (n = 35, startKg = 85) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ loggedAt: NOW - (n - 1 - i) * DAY, weightKg: startKg });
    return out;
  };
  return {
    checkin: {
      weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3,
      calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null,
      ...overrides.checkin,
    },
    morningWeights: flat(),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'maint', weeksInPhase: 4,
    currentCalTarget: 2400, currentStepsTarget: 8000,
    bodyweightKg: 85, units: 'kg', nowMs: NOW,
    ...overrides.top,
  };
}

/** 35-day flat/trending weight series (mirrors scenarios.conflict.data.js's
 * own local `flatWeights`, duplicated here per this file's own convention of
 * re-anchored, verbatim-number local helpers rather than a cross-family data
 * import). Used only by the rapidWeightLossFlag OR-isolation scenario below,
 * which needs a genuine >=-1.5%/week rate over enough history to read
 * cleanly, unlike flatTrend14's short 14-day window. */
function flatWeights35(startKg, kgPerWeek = 0) {
  const n = 35;
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  const out = [];
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: NOW - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

/** doseEscalation fixture, re-anchored copy of coachLearningLoop.test.js's
 * `week()`/`oldUnchangedIncrease()` (TEST-tier authority: an existing,
 * founder-reviewed pin against the SAME production function). */
const doseWeights = (start, kgPerWeek, n = 35) => Array.from({ length: n }, (_, i) => ({
  loggedAt: NOW - (n - 1 - i) * DAY,
  weightKg: Math.round((start + kgPerWeek * (i / 7)) * 100) / 100,
}));

function doseWeek(o = {}) {
  return {
    nowMs: NOW,
    checkin: {
      weekStart: NOW - 7 * DAY, energyScore: 4, sorenessScore: 2, stressScore: 2,
      calsAdherence: 'hit', notes: '',
    },
    morningWeights: doseWeights(80, o.kgPerWeek ?? 0),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1, blockE1rmSlopePct: 1.1,
    goalPhase: o.goalPhase ?? 'bulk', weeksInPhase: 8,
    consecutiveOffTargetWeeks: o.offTarget ?? 3, lastCalAdjustmentWeeksAgo: 8,
    currentCalTarget: 3000, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: o.intakeAvg === undefined ? 3010 : o.intakeAvg,
    recentIntakeDaysLogged: o.intakeDays ?? 7,
    lastCheckinAt: NOW - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    priorInterventions: o.prior ?? [],
    priorDeclines: o.declines ?? [],
  };
}

const doseOldUnchangedIncrease = (over = {}) => buildInterventionRecord({
  kind: INTERVENTION_KIND.CALORIE_TARGET,
  appliedAtMs: NOW - 28 * DAY,
  direction: 1, magnitude: 100, goalPhase: 'bulk',
  baseline: { key: 'weight.trend', value: 0.0 },
  ...over,
});

/** 42-day step series: a sustained +2,000 steps/day shift starting 14 days
 * ago (N-ADAPTIVE-04). */
function stepDateKey(daysAgo) { return new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10); }
function stepSeries() {
  const rows = [];
  for (let d = 0; d <= 13; d++) rows.push({ entryDate: stepDateKey(d), steps: 10000 });
  for (let d = 14; d <= 41; d++) rows.push({ entryDate: stepDateKey(d), steps: 8000 });
  return rows;
}

// A valid, checksummed effective-maintenance memo (derived at module load via
// the real production derive function — see the header note). asOf is fixed
// at NOW-5*DAY so downstream resolve scenarios can move nowMs to land
// precisely either side of the 14-day staleness boundary.
const validMemo = deriveEffectiveMaintenanceMemo({
  formulaPriorKcal: 2900,
  resolved: null,
  adaptiveObservation: { confidence: 'high', adjustedTDEE: 2950 },
  actualIntakeKcal: 2950,
  foodDaysLogged: 7,
  evidenceSignature: 'sig-v1',
  weights: memoWeights(14, 80),
  context: { goalPhase: 'maint', activityLevel: 'moderate', formulaMethod: 'mifflin', bodyweightKg: 80 },
  weightEvidenceFresh: true,
  confounded: false,
  nowMs: NOW - 5 * DAY,
}).memo;

// ── The declarative scenario list ─────────────────────────────────────────────

export const SCENARIOS = [
  // ═══════════════════════════════════════════════════════════════════════
  // N-TARGETS: target calculation & persistence
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-01',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-01: Katch-McArdle IS selected when bodyFatPercent is finite/in-range AND bodyFatSource is a baseline source (dexa)',
    rules: ['N-TARGETS-01'],
    facts: { inputs: { sex: 'male', ageYears: 28, heightCm: 180, weightKg: 80, bodyFatPercent: 15, bodyFatSource: 'dexa', activityLevel: 'moderate', goal: 'maintain' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'bmrMethod', equals: 'katch_mcardle' },
      { kind: 'equals', path: 'proteinBasis', equals: 'lbm' },
      { kind: 'equals', path: 'bmrKcal', equals: 1839 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-02',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-01 MUST_NOT: a valid, in-range bodyFatPercent still falls back to Mifflin when bodyFatSource is NOT a baseline source (e.g. an "estimated" reading)',
    rules: ['N-TARGETS-01'],
    facts: { inputs: { sex: 'male', ageYears: 28, heightCm: 180, weightKg: 80, bodyFatPercent: 15, bodyFatSource: 'estimated', activityLevel: 'moderate', goal: 'maintain' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'bmrMethod', equals: 'mifflin' },
    ],
    mustNot: [
      { kind: 'equals', path: 'bmrMethod', equals: 'katch_mcardle' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-03',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-01 BOUNDARIES: bodyFatPercent>=60 is out of the (0,60) range guard, so a baseline source alone is not enough — falls back to Mifflin',
    rules: ['N-TARGETS-01'],
    facts: { inputs: { sex: 'male', ageYears: 28, heightCm: 180, weightKg: 80, bodyFatPercent: 65, bodyFatSource: 'dexa', activityLevel: 'moderate', goal: 'maintain' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'bmrMethod', equals: 'mifflin' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-04',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-02: maintenanceKcal = round(bmr*multiplier) + effectiveMaintenanceResidualKcal, the residual applied exactly once (moderate multiplier 1.55)',
    rules: ['N-TARGETS-02', 'N-MAINT-05'],
    facts: { inputs: { sex: 'male', ageYears: 28, heightCm: 180, weightKg: 80, bodyFatSource: null, activityLevel: 'moderate', goal: 'maintain', effectiveMaintenanceResidualKcal: 100 } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'bmrKcal', equals: 1790 },
      { kind: 'equals', path: 'formulaMaintenanceKcal', equals: 2775 },
      { kind: 'equals', path: 'maintenanceKcal', equals: 2875 },
      { kind: 'equals', path: 'effectiveMaintenanceResidualKcal', equals: 100 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-05',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-03: surplus phase adjustments are further scaled by experience — beginner lean_gain multiplies the base +10% by x1.30',
    rules: ['N-TARGETS-03'],
    facts: { inputs: { sex: 'male', ageYears: 25, heightCm: 175, weightKg: 70, bodyFatSource: null, activityLevel: 'moderate', goal: 'lean_gain', experienceLevel: 'beginner' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'within', path: 'targetKcal', min: 2915, max: 2947 }, // maintenance 2594 * 1.13 ≈ 2931
    ],
    mustNot: [
      { kind: 'within', path: 'targetKcal', min: 2848, max: 2860 }, // the un-scaled +10% (2594*1.10≈2853) must NOT be what fires
    ],
    restraint: false,
  },

  {
    id: 'NUT-06',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-04: a missing bodyweight forces phaseAdj to 0 on a deficit — a cut is NEVER sized off the invented 75kg display-fallback weight',
    rules: ['N-TARGETS-04'],
    facts: { inputs: { sex: 'male', ageYears: 25, heightCm: 175, weightKg: NaN, bodyFatSource: null, activityLevel: 'moderate', goal: 'aggressive_cut' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'targetKcal', equals: 2672 }, // phaseAdj forced 0: target == maintenance (safeWeight 75 fallback for BMR only)
      { kind: 'contains', path: 'warnings', contains: 'Body weight is missing, so a deficit cannot be sized safely. Holding at maintenance until a weight is recorded.' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-07',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-05: targetKcal clamps UP to the male floor (1500) — never lower, tier-blind',
    rules: ['N-TARGETS-05'],
    facts: { inputs: { sex: 'male', ageYears: 30, heightCm: 165, weightKg: 60, bodyFatSource: null, activityLevel: 'sedentary', goal: 'aggressive_cut' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'targetKcal', equals: 1500 },
      { kind: 'equals', path: 'floorApplied', equals: true },
      { kind: 'contains', path: 'warnings[0]', contains: 'below safe minimum' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-08',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-05 BOUNDARIES: unknown sex takes the HIGHER floor (1500), never the lower 1200 — Campaign 1 P0-7 D4',
    rules: ['N-TARGETS-05'],
    facts: { inputs: { sex: null, ageYears: 30, heightCm: 165, weightKg: 60, bodyFatSource: null, activityLevel: 'sedentary', goal: 'aggressive_cut' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'targetKcal', equals: 1500 },
      { kind: 'equals', path: 'floorApplied', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'targetKcal', equals: 1200 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-09',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-06: the 1.5% BW/week hard gate raises targetKcal so the estimated loss rate never exceeds it — an extreme (but clamp-legal: age 13, height 250cm, weight 30kg) aggressive_cut on very_active blows straight past 1.5% before the gate clamps it back',
    rules: ['N-TARGETS-06'],
    facts: { inputs: { sex: 'male', ageYears: 13, heightCm: 250, weightKg: 30, bodyFatSource: null, activityLevel: 'very_active', goal: 'aggressive_cut' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'floorApplied', equals: true },
      { kind: 'contains', path: 'warnings[0]', contains: '1.5 % hard gate' },
      // targetRateKgPerWeek is kg/week, not %: 1.5% of the 30kg clamp weight
      // is exactly 0.45kg/week (maxWeeklyDeficit = 0.015*30*7700 / 7700).
      { kind: 'within', path: 'targetRateKgPerWeek', min: -0.46, max: -0.44 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-10',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-07: the 0.8%-1.5% advisory fires a warning WITHOUT clamping the target (display-only guidance, junior to the hard gate) — same extreme physiology, a milder mild_cut lands the estimated rate between the two thresholds',
    rules: ['N-TARGETS-07'],
    facts: { inputs: { sex: 'male', ageYears: 13, heightCm: 250, weightKg: 30, bodyFatSource: null, activityLevel: 'very_active', goal: 'mild_cut' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'targetKcal', equals: 2705 },
      { kind: 'equals', path: 'floorApplied', equals: false },
      { kind: 'contains', path: 'warnings[0]', contains: '0.8 % threshold' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-11',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-08: energy-availability caution fires only on a deficit with proxyEA below the sex-aware line (male 35 kcal/kg FFM), suggesting an eased target clamped to [sexFloor, maintenance] — never lowers the target itself',
    rules: ['N-TARGETS-08'],
    facts: { _fn: 'energyAvailabilityCaution', targetKcal: 1800, maintenanceKcal: 2600, opts: { weightKg: 70, bodyFatPercent: null, bodyFatSource: null, sex: 'male' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'proxyEA', equals: 33 },
      { kind: 'equals', path: 'cautionKcalPerKg', equals: 35 },
      { kind: 'equals', path: 'suggestedKcal', equals: 1911 },
    ],
    mustNot: [
      { kind: 'within', path: 'suggestedKcal', min: 1, max: 1499 }, // never below the sex floor
    ],
    restraint: false,
  },

  {
    id: 'NUT-12',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-09: proteinG caps at PROTEIN_MAX_GKGBW=2.2 g/kg BW when bodyweight is known but BF% is unknown (getPlanNutritionContext, Morton 2018 CI); a value already under the cap is left as-is (guards against a vacuous pass)',
    rules: ['N-TARGETS-09'],
    facts: {
      _fn: 'getPlanNutritionContext',
      targets: { targetKcal: 2000, maintenanceKcal: 2300, goal: 'aggressive_cut', proteinG: 240, fatG: 70 },
      opts: { bodyweightKg: 80, bodyFatPercent: null },
    },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'proteinG', equals: 176 }, // 2.2 * 80
    ],
    restraint: false,
  },

  {
    id: 'NUT-13',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-10: maintenance (2400) exceeds the current target (2000), so the diet-break apply raises targetKcal to maintenance, holding protein and scaling fat/carbs proportionally — delegates through computeCalorieTargets so N-TARGETS-05\'s sex floor stays enforced',
    rules: ['N-TARGETS-10'],
    facts: { _fn: 'computeDietBreakTargets', nutrition: { targetKcal: 2000, proteinG: 180, fatG: 70, carbsG: 200 }, sex: 'male', effectiveMaintenanceKcal: 2400 },
    run: 'coachApply',
    must: [
      { kind: 'equals', path: 'newKcal', equals: 2400 },
      { kind: 'equals', path: 'targets.proteinG', equals: 180 },
      { kind: 'equals', path: 'targets.fatG', equals: 84 },
      { kind: 'equals', path: 'targets.carbsG', equals: 240 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-14',
    family: 'nutrition',
    why: 'ORACLE N-TARGETS-10 MUST_NOT: never raises a target that is already at or above maintenance — a no-op, not a re-raise (maintenance 1800 <= current target 2000)',
    rules: ['N-TARGETS-10'],
    facts: { _fn: 'computeDietBreakTargets', nutrition: { targetKcal: 2000, proteinG: 180, fatG: 70, carbsG: 200 }, sex: 'male', effectiveMaintenanceKcal: 1800 },
    run: 'coachApply',
    must: [
      { kind: 'equals', path: '', equals: null },
    ],
    restraint: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // N-ADAPTIVE: weight-trend interpretation & adaptive sizing
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-15',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-01: computeEWMA smooths with alpha=0.28 and drops rows with weightKg<=0 or non-finite',
    rules: ['N-ADAPTIVE-01'],
    facts: {
      _fn: 'computeEWMA',
      weightData: [
        { weightKg: 80, date: '2026-08-01' },
        { weightKg: -5, date: '2026-08-02' }, // dropped: non-positive
        { weightKg: NaN, date: '2026-08-03' }, // dropped: non-finite
        { weightKg: 79, date: '2026-08-04' },
      ],
    },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'rows.length', equals: 2 }, // only the two valid rows survive
      { kind: 'equals', path: 'rows[0].ewma', equals: 80 }, // seeded from the first valid point
      { kind: 'within', path: 'rows[1].ewma', min: 79.7, max: 79.75 }, // 0.28*79 + 0.72*80
    ],
    restraint: false,
  },

  {
    id: 'NUT-16',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-02: the date-aware path (MIN_SPAN_DAYS=6) is preferred whenever dated rows are available, never the index-based fallback',
    rules: ['N-ADAPTIVE-02'],
    facts: {
      _fn: 'computeWeeklyWeightChange',
      ewmaData: [
        { ewma: 80.0, date: new Date(NOW - 7 * DAY).toISOString() },
        { ewma: 79.3, date: new Date(NOW).toISOString() },
      ],
    },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'value', equals: -0.7 }, // exactly a 7-day span, -0.7kg/week
    ],
    restraint: false,
  },

  {
    id: 'NUT-17',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-03: below MIN_POINTS=14 the function refuses outright (confidence=insufficient_data, adjustmentKcal=0) — the evidence bar for adaptive resizing',
    rules: ['N-ADAPTIVE-03'],
    facts: {
      _fn: 'computeAdaptiveTDEEAdjustment',
      inputs: { ewmaData: [{ ewma: 80, date: new Date(NOW).toISOString() }], prescribedKcal: 2000, currentTDEEEstimate: 2200 },
    },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'confidence', equals: 'insufficient_data' },
      { kind: 'equals', path: 'adjustmentKcal', equals: 0 },
    ],
    restraint: true,
  },

  {
    id: 'NUT-18',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-04: a sustained step shift needs BOTH the 1,500 steps/day absolute delta AND the 20% ratio, plus two-half persistence, before it can accelerate an agreeing adjustment; gain ramps 0.50->0.65 across the 1500-4000 delta span',
    rules: ['N-ADAPTIVE-04'],
    facts: { _fn: 'computeStepTrendModifier', inputs: { stepRows: stepSeries(), todayKey: stepDateKey(0), adjustmentSign: 1 } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'active', equals: true },
      { kind: 'equals', path: 'direction', equals: 1 },
      { kind: 'equals', path: 'deltaSteps', equals: 2000 },
      { kind: 'within', path: 'gain', min: 0.52, max: 0.54 }, // 0.50 + 0.15*(2000-1500)/2500
    ],
    mustNot: [
      { kind: 'within', path: 'gain', min: 0.66, max: 1 }, // never above the STEP_GAIN_MAX=0.65 cap
    ],
    restraint: false,
  },

  {
    id: 'NUT-19',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-05: FFM_FLOOR_KCAL_PER_KG=30, credible path uses DEXA-measured lean mass (30*68=2040 for an 80kg/15%BF male)',
    rules: ['N-ADAPTIVE-05'],
    facts: { _fn: 'computeFFMFloor', weightKg: 80, opts: { bodyFatPercent: 15, bodyFatSource: 'dexa', sex: 'male' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'floorKcal', equals: 2040 },
      { kind: 'equals', path: 'source', equals: 'katch_mcardle' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-20',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-05 MUST_NOT: a "visual" BF% source is EXCLUDED from the credible path (only dexa/caliper/bia count) — falls to the more-protective 0.78 male fallback fraction even with a stated BF%',
    rules: ['N-ADAPTIVE-05'],
    facts: { _fn: 'computeFFMFloor', weightKg: 80, opts: { bodyFatPercent: 15, bodyFatSource: 'visual', sex: 'male' } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'source', equals: 'fallback' },
      { kind: 'equals', path: 'floorKcal', equals: 1872 }, // round(80*0.78*30)
    ],
    mustNot: [
      { kind: 'equals', path: 'floorKcal', equals: 2040 }, // the credible-path figure must not leak through
    ],
    restraint: false,
  },

  {
    id: 'NUT-21',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-06: precedence is today\'s EWMA > last valid weigh-in > profile bodyweight — the EWMA wins even when both other sources are supplied',
    rules: ['N-ADAPTIVE-06'],
    facts: { _fn: 'resolveFfmFloorWeightKg', inputs: { profileWeightKg: 90, ewmaTodayKg: 82, lastWeighInKg: 85 } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'value', equals: 82 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-22',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-06: with no EWMA, the last valid weigh-in wins over profile bodyweight (never null when a positive weight exists anywhere)',
    rules: ['N-ADAPTIVE-06'],
    facts: { _fn: 'resolveFfmFloorWeightKg', inputs: { profileWeightKg: 90, ewmaTodayKg: null, lastWeighInKg: 85 } },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'value', equals: 85 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-23',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-07: a diet break is suggested at exactly DIET_BREAK_THRESHOLD_WEEKS=8 weeks in deficit (MATADOR trial 2017) — a suggestion card only, never auto-applied',
    rules: ['N-ADAPTIVE-07'],
    facts: { _fn: 'shouldSuggestDietBreak', deficitStartDate: new Date(NOW - 8 * 7 * DAY).toISOString(), currentDate: new Date(NOW) },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'value.suggest', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-24',
    family: 'nutrition',
    why: 'ORACLE N-ADAPTIVE-07 BOUNDARIES: one week short of the 8-week threshold does NOT suggest a break yet',
    rules: ['N-ADAPTIVE-07'],
    facts: { _fn: 'shouldSuggestDietBreak', deficitStartDate: new Date(NOW - 7 * 7 * DAY).toISOString(), currentDate: new Date(NOW) },
    run: 'nutritionTargets',
    must: [
      { kind: 'equals', path: 'value.suggest', equals: false },
    ],
    restraint: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // N-MAINT: effective-maintenance authority (Campaign 19 = LAW)
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-25',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-01: no stored memo resolves to FORMULA (formula prior only) — the base case with nothing learned yet',
    rules: ['N-MAINT-01'],
    facts: { _fn: 'resolveEffectiveMaintenance', inputs: { formulaPriorKcal: 2900, memo: null, context: {}, evidenceSignature: null, nowMs: NOW } },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'status', equals: 'formula_prior' },
      { kind: 'equals', path: 'source', equals: 'formula_prior' },
      { kind: 'equals', path: 'effectiveMaintenanceKcal', equals: 2900 },
    ],
    restraint: true,
  },

  {
    id: 'NUT-26',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-01: a valid memo within 14 days of asOf and unchanged context resolves to CURRENT, source athlete_history — history is senior to the raw formula while current',
    rules: ['N-MAINT-01'],
    facts: {
      _fn: 'resolveEffectiveMaintenance',
      inputs: {
        formulaPriorKcal: 2900, memo: validMemo,
        context: { goalPhase: 'maint', activityLevel: 'moderate', formulaMethod: 'mifflin', bodyweightKg: 80 },
        evidenceSignature: validMemo.evidenceSignature, nowMs: NOW, // NOW is 5 days after asOf
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'status', equals: 'current' },
      { kind: 'equals', path: 'source', equals: 'athlete_history' },
      { kind: 'equals', path: 'effectiveMaintenanceKcal', equals: 2950 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-27',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-01 BOUNDARIES: staleness = EFFECTIVE_MAINTENANCE_STALE_DAYS=14 days — an otherwise-valid memo 15 days past asOf falls to HELD, never trusted as CURRENT',
    rules: ['N-MAINT-01'],
    facts: {
      _fn: 'resolveEffectiveMaintenance',
      inputs: {
        formulaPriorKcal: 2900, memo: validMemo,
        context: { goalPhase: 'maint', activityLevel: 'moderate', formulaMethod: 'mifflin', bodyweightKg: 80 },
        evidenceSignature: validMemo.evidenceSignature, nowMs: NOW + 10 * DAY, // 15 days after asOf
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'status', equals: 'held' },
      { kind: 'equals', path: 'reason', equals: 'evidence_stale' },
    ],
    mustNot: [
      { kind: 'equals', path: 'status', equals: 'current' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-28',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-01: a material bodyweight change (>=5% BW, MATERIAL_BODYWEIGHT_CHANGE_FRACTION=0.05) forces REVALIDATING even on a fresh, otherwise-valid memo',
    rules: ['N-MAINT-01'],
    facts: {
      _fn: 'resolveEffectiveMaintenance',
      inputs: {
        formulaPriorKcal: 2900, memo: validMemo,
        context: { goalPhase: 'maint', activityLevel: 'moderate', formulaMethod: 'mifflin', bodyweightKg: 75 }, // 80 -> 75 = 6.25% change
        evidenceSignature: validMemo.evidenceSignature, nowMs: NOW,
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'status', equals: 'revalidating' },
      { kind: 'equals', path: 'reason', equals: 'material_bodyweight_change' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-29',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-02: fail-closed by construction — a memo failing ANY validity check (here foodDaysLogged<5) can NEVER become authority, falling all the way back to FORMULA regardless of every other field being otherwise well-formed',
    rules: ['N-MAINT-02'],
    facts: { _fn: 'isValidEffectiveMaintenanceMemo', memo: { ...validMemo, foodDaysLogged: 3 } },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'value', equals: false },
    ],
    restraint: true,
  },

  {
    id: 'NUT-30',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-02: resolveEffectiveMaintenance itself falls back to the FORMULA branch when the supplied memo fails validity (foodDaysLogged<5), proving the fail-closed contract end-to-end, not merely at the validator',
    rules: ['N-MAINT-02'],
    facts: {
      _fn: 'resolveEffectiveMaintenance',
      inputs: {
        formulaPriorKcal: 2900, memo: { ...validMemo, foodDaysLogged: 3 },
        context: { goalPhase: 'maint' }, evidenceSignature: null, nowMs: NOW,
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'status', equals: 'formula_prior' },
      { kind: 'equals', path: 'reason', equals: 'memo_invalid' },
      { kind: 'equals', path: 'effectiveMaintenanceKcal', equals: 2900 },
    ],
    restraint: true,
  },

  {
    id: 'NUT-31',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-03: deriveEffectiveMaintenanceMemo holds (no adoption) when foodDaysLogged<5 — immature maintenance evidence never becomes the learned residual',
    rules: ['N-MAINT-03'],
    facts: {
      _fn: 'deriveEffectiveMaintenanceMemo',
      inputs: {
        formulaPriorKcal: 2900, resolved: null, adaptiveObservation: { confidence: 'high', adjustedTDEE: 2950 },
        actualIntakeKcal: 2950, foodDaysLogged: 3, evidenceSignature: 'sig-x', weights: memoWeights(14, 80),
        context: { goalPhase: 'maint' }, weightEvidenceFresh: true, confounded: false, nowMs: NOW,
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'updated', equals: false },
      { kind: 'equals', path: 'reason', equals: 'actual_intake_coverage_insufficient' },
      { kind: 'equals', path: 'memo', equals: null },
    ],
    restraint: true,
  },

  {
    id: 'NUT-32',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-03: hold when adaptiveObservation.confidence !== "high" — the N-ADAPTIVE-03 weeks>=4 bar is the judgeability gate for learning, not merely a display label',
    rules: ['N-MAINT-03', 'N-ADAPTIVE-03'],
    facts: {
      _fn: 'deriveEffectiveMaintenanceMemo',
      inputs: {
        formulaPriorKcal: 2900, resolved: null, adaptiveObservation: { confidence: 'medium', adjustedTDEE: 2950 },
        actualIntakeKcal: 2950, foodDaysLogged: 7, evidenceSignature: 'sig-y', weights: memoWeights(14, 80),
        context: { goalPhase: 'maint' }, weightEvidenceFresh: true, confounded: false, nowMs: NOW,
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'updated', equals: false },
      { kind: 'equals', path: 'reason', equals: 'adaptive_evidence_not_judgeable' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-33',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-03: with every evidence bar cleared (>=5 food days, >=14 weight days, confidence high) the memo derives using adjustedTDEE — the OBSERVATIONAL value, never a safety-clamped adjustmentKcal',
    rules: ['N-MAINT-03'],
    facts: {
      _fn: 'deriveEffectiveMaintenanceMemo',
      inputs: {
        formulaPriorKcal: 2900, resolved: null, adaptiveObservation: { confidence: 'high', adjustedTDEE: 2950 },
        actualIntakeKcal: 2950, foodDaysLogged: 7, evidenceSignature: 'sig-z', weights: memoWeights(14, 80),
        context: { goalPhase: 'maint' }, weightEvidenceFresh: true, confounded: false, nowMs: NOW,
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'updated', equals: true },
      { kind: 'equals', path: 'memo.cumulativeResidualKcal', equals: 50 }, // 2950 - 2900
      { kind: 'equals', path: 'memo.status', equals: 'current' },
      { kind: 'equals', path: 'memo.source', equals: 'athlete_history' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-34',
    family: 'nutrition',
    why: 'ORACLE N-MAINT-03 MUST_NOT: confounded=true holds even with every other bar cleared — a confounded week must never derive a new residual',
    rules: ['N-MAINT-03'],
    facts: {
      _fn: 'deriveEffectiveMaintenanceMemo',
      inputs: {
        formulaPriorKcal: 2900, resolved: null, adaptiveObservation: { confidence: 'high', adjustedTDEE: 2950 },
        actualIntakeKcal: 2950, foodDaysLogged: 7, evidenceSignature: 'sig-w', weights: memoWeights(14, 80),
        context: { goalPhase: 'maint' }, weightEvidenceFresh: true, confounded: true, nowMs: NOW,
      },
    },
    run: 'effectiveMaintenance',
    must: [
      { kind: 'equals', path: 'updated', equals: false },
      { kind: 'equals', path: 'reason', equals: 'evidence_confounded' },
    ],
    restraint: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // N-BANK: calorie bank (sole per-day exception)
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-35',
    family: 'nutrition',
    why: 'ORACLE N-BANK-01: the ONE DAILY TRUTH law — resolveEffectiveTargets leaves the stored target UNCHANGED unless bankedDelta!=0, with no training-day/rest-day or weekday-specific mechanism',
    rules: ['N-BANK-01'],
    facts: { _fn: 'resolveEffectiveTargets', targets: { targetKcal: 2400, carbsG: 250, proteinG: 180, fatG: 70 }, ctx: { bankedDelta: 0 } },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'targetKcal', equals: 2400 },
      { kind: 'equals', path: 'carbsG', equals: 250 },
    ],
    restraint: true,
  },

  {
    id: 'NUT-36',
    family: 'nutrition',
    why: 'ORACLE N-BANK-01: the calorie bank IS the sole per-day exception — a non-zero bankedDelta shifts kcal via carbs, protein/fat untouched',
    rules: ['N-BANK-01', 'N-BANK-03'],
    facts: { _fn: 'resolveEffectiveTargets', targets: { targetKcal: 2400, carbsG: 250, proteinG: 180, fatG: 70 }, ctx: { bankedDelta: 200 } },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'targetKcal', equals: 2600 },
      { kind: 'equals', path: 'carbsG', equals: 300 }, // +200kcal / 4kcal-per-g carbs
      { kind: 'equals', path: 'proteinG', equals: 180 }, // untouched
    ],
    restraint: false,
  },

  {
    id: 'NUT-37',
    family: 'nutrition',
    why: 'ORACLE N-BANK-02: banking may never legitimise an already-unsafe week — refuses outright ("floor") when ANY day (including the big day) is already below floorKcal',
    rules: ['N-BANK-02'],
    facts: {
      _fn: 'planCalorieBank',
      inputs: {
        perDayBaseKcal: { mon: 1400, tue: 2000, wed: 2000, thu: 2000, fri: 2000, sat: 2000, sun: 2000 },
        bigDayKey: 'sat', requestedBumpKcal: 300, floorKcal: 1500, bandMaxKcal: 3000,
      },
    },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'ok', equals: false },
      { kind: 'equals', path: 'reason', equals: 'floor' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-38',
    family: 'nutrition',
    why: 'ORACLE N-BANK-02 BOUNDARIES: below MIN_BANK_DELTA_KCAL=50, refuse as "presentation noise" rather than show a fake bigger day',
    rules: ['N-BANK-02'],
    facts: {
      _fn: 'planCalorieBank',
      inputs: {
        perDayBaseKcal: { mon: 2000, tue: 2000, wed: 2000, thu: 2000, fri: 2000, sat: 2000, sun: 2000 },
        bigDayKey: 'sat', requestedBumpKcal: 30, floorKcal: 1500, bandMaxKcal: 3000,
      },
    },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'ok', equals: false },
      { kind: 'equals', path: 'reason', equals: 'too_small' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-39',
    family: 'nutrition',
    why: 'ORACLE N-BANK-02 BOUNDARIES: MAX_BANK_DELTA_KCAL=500 is a hard ceiling (founder-confirmed 2026-06-16) even when room and requested bump both allow more',
    rules: ['N-BANK-02'],
    facts: {
      _fn: 'planCalorieBank',
      inputs: {
        perDayBaseKcal: { mon: 2000, tue: 2000, wed: 2000, thu: 2000, fri: 2000, sat: 2000, sun: 2000 },
        bigDayKey: 'sat', requestedBumpKcal: 9999, floorKcal: 500, bandMaxKcal: 5000,
      },
    },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'ok', equals: true },
      { kind: 'equals', path: 'appliedBumpKcal', equals: 500 },
      { kind: 'equals', path: 'reason', equals: 'ok' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-40',
    family: 'nutrition',
    why: 'ORACLE N-BANK-03: bankedPlanDayEdits only edits plan days that already carry a non-zero banked delta from N-BANK-02 — days with zero delta are left untouched and omitted',
    rules: ['N-BANK-03'],
    facts: {
      _fn: 'bankedPlanDayEdits',
      inputs: {
        planDays: [{ slots: [] }, { slots: [] }],
        dayKeys: ['2026-08-16', '2026-08-17'],
        perDayDeltaKcal: { '2026-08-16': 100 },
        floorKcal: 1500,
      },
    },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'edits.length', equals: 1 },
      { kind: 'equals', path: 'edits[0].dayKey', equals: '2026-08-16' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-41',
    family: 'nutrition',
    why: 'ORACLE N-BANK-05: safeDayFloorKcal delegates to nutritionEngine.kcalFloorForSex — unknown sex must NEVER fall back to the pre-Campaign-1 1200 drift, always the higher 1500',
    rules: ['N-BANK-05'],
    facts: { _fn: 'safeDayFloorKcal', inputs: { sex: null, ffmFloorKcal: null } },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'value', equals: 1500 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-42',
    family: 'nutrition',
    why: 'ORACLE N-BANK-05: floorKcal = max(sexFloor, ffmFloorKcal) — a higher FFM floor wins over the sex floor when supplied',
    rules: ['N-BANK-05'],
    facts: { _fn: 'safeDayFloorKcal', inputs: { sex: 'female', ffmFloorKcal: 1350 } },
    run: 'calorieBank',
    must: [
      { kind: 'equals', path: 'value', equals: 1350 },
    ],
    mustNot: [
      { kind: 'equals', path: 'value', equals: 1200 },
    ],
    restraint: false,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // N-ADHERENCE: logging-quality evidence gates
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-43',
    family: 'nutrition',
    why: 'ORACLE N-ADHERENCE-01: kcal/protein use a 10% tolerance band — exactly at the boundary counts as a hit, just over does not',
    rules: ['N-ADHERENCE-01'],
    facts: { value: 1100, target: 1000, tolerance: 0.10 },
    run: 'adherence',
    must: [
      { kind: 'equals', path: 'value', equals: true }, // exactly 10% over: still a hit
    ],
    restraint: false,
  },

  {
    id: 'NUT-44',
    family: 'nutrition',
    why: 'ORACLE N-ADHERENCE-01 BOUNDARIES: one kcal past the 10% band is NOT a hit — display/insights classifier only, never the calorie-decision gate',
    rules: ['N-ADHERENCE-01'],
    facts: { value: 1101, target: 1000, tolerance: 0.10 },
    run: 'adherence',
    must: [
      { kind: 'equals', path: 'value', equals: false },
    ],
    restraint: false,
  },

  {
    id: 'NUT-45',
    family: 'nutrition',
    why: 'ORACLE N-ADHERENCE-01: carbs/fat get the wider 15% tolerance band — a 14% miss is still a hit under the wider band',
    rules: ['N-ADHERENCE-01'],
    facts: { value: 228, target: 200, tolerance: 0.15 },
    run: 'adherence',
    must: [
      { kind: 'equals', path: 'value', equals: true },
    ],
    restraint: false,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // N-COACH: weekly coach nutrition gates (NOT duplicating the conflict family)
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-46',
    family: 'nutrition',
    why: 'ORACLE N-COACH-01 (identical mechanism to T-WEEKLY-01): below the weigh-in evidence bar, runWeeklyCoach hard-early-returns hasEnoughData:false, confidence data_hold, suppressing every calorie/training decision this run',
    rules: ['N-COACH-01'],
    facts: { checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null }, morningWeights: [{ loggedAt: NOW - DAY, weightKg: 85 }], sessionsCompleted: 2, sessionsPlanned: 4, goalPhase: 'maint', weeksInPhase: 4, currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'hasEnoughData', equals: false },
      { kind: 'equals', path: 'confidence', equals: 'data_hold' },
      { kind: 'equals', path: 'adjustments.calories', equals: null },
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'hold' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-47',
    family: 'nutrition',
    why: 'ORACLE N-COACH-02: sessionAdherence < 0.5 (50%) early-returns with no calorie/volume change this week',
    rules: ['N-COACH-02'],
    facts: b.intermediate().maintPhase(4).checkin({ calsAdherence: 'hit' }).weightTrend({ startKg: 85, pctPerWeek: 0 }).top({ sessionsCompleted: 1, sessionsPlanned: 4, currentCalTarget: 2400 }).toInputs(),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories', equals: null },
    ],
    restraint: true,
  },

  {
    id: 'NUT-48',
    family: 'nutrition',
    why: 'ORACLE N-COACH-02 MUST_NOT: an unknown denominator (sessionsPlanned<=0) routes to 0 (stabilise), NEVER to 1 (perfect) — "the Andy Morgan rule" — so the run must NOT proceed as if adherence were perfect',
    rules: ['N-COACH-02'],
    facts: b.intermediate().maintPhase(4).checkin({ calsAdherence: 'hit' }).weightTrend({ startKg: 85, pctPerWeek: 0 }).top({ sessionsCompleted: 3, sessionsPlanned: 0, currentCalTarget: 2400 }).toInputs(),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories', equals: null },
    ],
    restraint: true,
  },

  {
    id: 'NUT-49',
    family: 'nutrition',
    why: 'ORACLE N-COACH-04: cut + losing-too-slowly with calsAdherence=hit fires the fixed -150 kcal step (adaptive resize disabled here by omitting currentMaintenanceKcal, isolating the exact fixed-step magnitude; currentCalTarget kept high enough that N-COACH-07\'s 5% cap does not also bind here — that boundary is NUT-51\'s own scenario)',
    rules: ['N-COACH-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 4, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 3200, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories.change', equals: -150 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-50',
    family: 'nutrition',
    why: 'ORACLE N-COACH-04 BOUNDARIES: the SAME losing-too-slowly cut with calsAdherence NOT hit ("under") fires the smaller -100 kcal step, never -150',
    rules: ['N-COACH-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'under', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 4, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories.change', equals: -100 },
    ],
    mustNot: [
      { kind: 'equals', path: 'adjustments.calories.change', equals: -150 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-51',
    family: 'nutrition',
    why: 'ORACLE N-COACH-07: the same -150 fixed step is clamped to sign(change)*min(abs(change), round(currentCalTarget*0.05)) — a 1600 kcal target caps the change at -80, never the full -150',
    rules: ['N-COACH-07'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 4, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 1600, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories.change', equals: -80 }, // round(1600*0.05)=80
    ],
    restraint: false,
  },

  {
    id: 'NUT-52',
    family: 'nutrition',
    why: 'ORACLE N-COACH-06: a well-observed prior UNCHANGED same-direction calorie intervention resizes this week\'s adaptive step by DOSE_ESCALATION_MULTIPLIER=1.5 (fixture recipe pinned in coachLearningLoop.test.js CASE B against this SAME production function)',
    rules: ['N-COACH-06'],
    facts: doseWeek({ prior: [doseOldUnchangedIncrease()] }),
    run: 'weeklyCoach',
    must: [
      { kind: 'within', path: 'adjustments.calories.change', min: 56, max: 150 }, // resized larger than the plain ordinary step, never past the 5% cap (150)
    ],
    mustNot: [
      { kind: 'equals', path: 'adjustments.calories.change', equals: 100 }, // never simply repeats the PRIOR magnitude verbatim
    ],
    restraint: false,
  },

  {
    id: 'NUT-53',
    family: 'nutrition',
    why: 'ORACLE N-COACH-06 baseline (no prior history): the ordinary adaptive step applies un-escalated, smaller than NUT-52\'s learned step on identical evidence otherwise',
    rules: ['N-COACH-06'],
    facts: doseWeek({}),
    run: 'weeklyCoach',
    must: [
      { kind: 'within', path: 'adjustments.calories.change', min: 1, max: 150 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-54',
    family: 'nutrition',
    why: 'ORACLE N-COACH-09: a bulker eating UNDER target who is not gaining has not disproved the target — missExplains holds the calorie change and sets targetNotTestedHeld rather than rewarding poor execution with a raise',
    rules: ['N-COACH-09'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'under', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(80, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_bulk', weeksInPhase: 4, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 3000, recentIntakeAvgKcal: 2600, recentIntakeDaysLogged: 6,
      bodyweightKg: 80, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories', equals: null },
      { kind: 'equals', path: 'heldDecisions[0].type', equals: 'target_not_tested' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-55',
    family: 'nutrition',
    why: 'ORACLE N-COACH-12: a failed intake read holds any proposed CUT rather than proceeding floor-blind — fail-closed for cuts specifically, the same most-protective shape as the FFM floor',
    rules: ['N-COACH-12'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 4, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 2400, bodyweightKg: 85, intakeReadFailed: true, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories', equals: null },
      { kind: 'equals', path: 'heldDecisions[0].type', equals: 'intake_read_failed' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-56',
    family: 'nutrition',
    why: 'ORACLE N-COACH-13: precedence chain, on-target branch — "stable-when-stable-intended" produces the generic on-target held reason and no calorie change (structural restraint: a mild_cut tracking exactly at its own goal rate is a cut phase, so the generic (phase.isCut||isBulk) block is reachable, unlike maintain which never enters it)',
    rules: ['N-COACH-13'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(85, -0.32), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 4, consecutiveOffTargetWeeks: 0, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories', equals: null },
      { kind: 'equals', path: 'heldDecisions[0].type', equals: 'calories' },
      { kind: 'contains', path: 'heldDecisions[0].reason', contains: 'on target' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-57',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14: MUST OR the nine named booleans into autoApplyHoldActive — a wellbeing-screen restriction flag (scoffPositive) alone forces confirm-first regardless of any autonomy setting',
    rules: ['N-COACH-14'],
    facts: { ...moderatePushWeek(), scoffPositive: true },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-58',
    family: 'nutrition',
    why: 'ORACLE N-COACH-15: the forbidden sequence (a recent unjudged calorie change, then a same-day reversal) is refused — "one noisy weigh-in" cannot undo a recent decision before its own two-week observation window completes',
    rules: ['N-COACH-15'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: (() => {
        // A genuine decline losing-too-fast trend (~-1.0%/week), proposing an
        // INCREASE (+125, protect-muscle correction) that would REVERSE a
        // recent -1 (decrease) intervention still inside its 2-week window.
        const n = 35; const startKg = 85; const pctPerWeek = -1.0;
        const kgPerWeek = (pctPerWeek / 100) * startKg;
        const weeksSpan = (n - 1) / 7;
        const endKg = startKg + kgPerWeek * weeksSpan;
        const out = [];
        for (let i = 0; i < n; i++) {
          const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
          out.push({ loggedAt: NOW - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
        }
        return out;
      })(),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 6, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
      priorInterventions: [buildInterventionRecord({
        kind: INTERVENTION_KIND.CALORIE_TARGET, appliedAtMs: NOW - 3 * DAY, direction: -1, magnitude: 100, goalPhase: 'mild_cut',
      })],
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories', equals: null },
      { kind: 'equals', path: 'heldDecisions[0].type', equals: 'awaiting_last_change' },
    ],
    restraint: true,
  },

  {
    id: 'NUT-59',
    family: 'nutrition',
    why: 'ORACLE N-COACH-18: the shared limiter taxonomy — an on-target trend classifies the nutrition limiter as PLAN ("fine", the only route to a real calorie change from the trend), and nutrition appears NOWHERE in the training-limiter classification (job 14 founder law)',
    rules: ['N-COACH-18'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'maint', weeksInPhase: 4, currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'limiters.nutrition.limiter', equals: 'plan' },
      { kind: 'equals', path: 'limiters.nutrition.because', equals: 'on_target' },
    ],
    restraint: false,
  },

  {
    id: 'NUT-60',
    family: 'nutrition',
    why: 'ORACLE N-COACH-EXCEEDED (identical mechanism to T-WEEKLY-05): three consecutive exceeded weeks escalate an already-pushing week by one extra bounded step (capped at MATRIX_PUSH_CEILING=3), direct positive proof complementing the conflict family\'s senior-gate coverage',
    rules: ['N-COACH-EXCEEDED'],
    facts: { ...moderatePushWeek(), consecutiveExceededWeeks: 3 },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: true },
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'within', path: 'volumeSignal', min: 2, max: 3 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-61',
    family: 'nutrition',
    why: 'ORACLE N-VOL-01: a manualVolumeMuscles flag forces the prior VOLUME_START outcome to CONFOUNDED (user_changed_it_themselves) — the memory then withholds NOTHING (blockEscalation stays false), unlike a genuine judged decrease which N-VOL-02 (CFL-10) already proves DOES withhold',
    rules: ['N-VOL-01'],
    facts: {
      ...moderatePushWeek(),
      manualVolumeMuscles: ['chest'],
      priorInterventions: [buildInterventionRecord({
        kind: INTERVENTION_KIND.VOLUME_START, appliedAtMs: NOW - 21 * DAY, direction: 1, magnitude: 2, goalPhase: 'maint',
      })],
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'within', path: 'volumeSignal', min: 1, max: 3 }, // a genuine push still happens this week
      { kind: 'equals', path: 'volumeEscalationBlocked', equals: false },
    ],
    restraint: false,
  },

  {
    id: 'NUT-62',
    family: 'nutrition',
    why: 'ORACLE N-VOL-03 (identical mechanism to T-VOLUME-06): the ABSOLUTE_WEEKLY_SET_CEILING=30 backstop clamps a proposed push when a row has neither mrv nor mav, preventing +Infinity uncapped progression',
    rules: ['N-VOL-03'],
    facts: {
      _fn: 'computeVolumeApply',
      plannedRows: [{ muscle: 'chest', planned_sets: 25, mev: 6, mrv: null, mav: null }],
      volumeDelta: 10,
    },
    run: 'coachApply',
    must: [
      { kind: 'equals', path: '[0].plannedSets', equals: 30 },
      { kind: 'equals', path: '[0].muscle', equals: 'chest' },
    ],
    restraint: false,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // N-COACH-04: the two BULK-side fixed-step branches (the cut side is
  // already proven by NUT-49/50; these mirror that exact evidence shape --
  // >=5 logged days via consecutiveOffTargetWeeks/lastCalAdjustmentWeeksAgo
  // clearing N-COACH-03's cooldown, no safety hold, confidence sufficient,
  // adaptive resize disabled by omitting currentMaintenanceKcal so the
  // fixed-step magnitude is isolated exactly).
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-63',
    family: 'nutrition',
    why: 'ORACLE N-COACH-04: bulk + gaining-too-slowly (flat weight against a positive goal rate, offTargetDirection<0) fires the fixed +150 kcal step -- mirrors NUT-49\'s cut-side evidence shape (>=5-day-clearing consecutiveOffTargetWeeks/cooldown, no safety hold, confidence sufficient; adaptive resize disabled here by omitting currentMaintenanceKcal, isolating the exact fixed-step magnitude)',
    rules: ['N-COACH-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_bulk', weeksInPhase: 4, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 3200, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories.change', equals: 150 },
    ],
    restraint: false,
  },

  {
    id: 'NUT-64',
    family: 'nutrition',
    why: 'ORACLE N-COACH-04: bulk + gaining-too-fast (rapid weight gain against a mild positive goal rate, offTargetDirection>0) fires the fixed -125 kcal step -- unlike the cut side, this branch does NOT split on calsAdherence (same magnitude regardless of "hit"/"under"); mirrors NUT-49/50\'s evidence shape, adaptive resize disabled by omitting currentMaintenanceKcal',
    rules: ['N-COACH-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatTrend14(80, 0.8), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_bulk', weeksInPhase: 4, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
      currentCalTarget: 2800, bodyweightKg: 80, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.calories.change', equals: -125 },
    ],
    restraint: false,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // N-COACH-14 / T-WEEKLY-04: the nine-way autoApplyHoldActive OR, ISOLATED.
  // Seven of the nine named booleans (deloadSuggested, matrixDeload,
  // poorRecovery, safetyHold, ffmFloorHeld, rapidWeightLossFlag, calmMode)
  // each made true ALONE through runWeeklyCoach's real inputs, every other
  // term held false. edPatternHeld is already isolated at CFL-15
  // (scenarios.conflict.data.js) and scoffPositive at NUT-57 above, so
  // those two are not repeated here.
  //
  // rapidWeightLossFlag is a genuine STRUCTURAL exception, not a fixture
  // gap: its own condition (`actualRatePct<=-1.5 && energyScore<=2 &&
  // !cycleOverride`, weeklyCoach.js:1847-1852) requires energyScore<=2,
  // which is EXACTLY poorEnergy's own condition, so poorRecovery
  // (poorEnergy||highSoreness) is unavoidably co-true whenever
  // rapidWeightLossFlag is true in production -- there is no real-input
  // fixture where one fires without the other. CFL-08 documents this same
  // structural fact for the identical pair ("structurally co-true with
  // poorRecovery in production since both read energyScore<=2, but named
  // separately in the oracle and asserted here on its own field"); the
  // NUT-70 scenario below follows the same honest pattern, asserting
  // rapidWeightLossFlag on its own returned field rather than claiming a
  // fixture that cannot exist.
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: 'NUT-65',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14/T-WEEKLY-04 OR-isolation: deloadSuggested alone (deloadTriggers>=2 via consecutivePoorRecoveryWeeks>=2 AND weeksInPhase>=6 on a cut, with THIS week\'s own checkin reading good recovery so matrixDeload/poorRecovery/safetyHold all stay false) forces autoApplyHoldActive',
    rules: ['N-COACH-14', 'T-WEEKLY-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 4, sorenessScore: 1, stressScore: 2, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatWeights35(80, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 6, consecutivePoorRecoveryWeeks: 2,
      currentCalTarget: 2400, bodyweightKg: 80, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'recoveryFlag', equals: 'deload_suggested' }, // proves matrixDeload false
      { kind: 'equals', path: 'safetyHold', equals: true },
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-66',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14/T-WEEKLY-04 OR-isolation: matrixDeload alone -- recoveryScore forced to 3 by stress>=4 (not by soreness>=4 or energy<=2, so highSoreness/poorEnergy both stay false) combined with a dropped-performance grade 4, with consecutivePoorRecoveryWeeks=1 satisfying the AND-gate\'s second term -- forces autoApplyHoldActive with poorRecovery/safetyHold genuinely false',
    rules: ['N-COACH-14', 'T-WEEKLY-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 4, sorenessScore: 1, stressScore: 4, calsAdherence: 'hit', trainingPerformance: 'dropped', jointPain: false, notes: null },
      morningWeights: flatWeights35(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'maint', weeksInPhase: 4, consecutivePoorRecoveryWeeks: 1,
      currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'recoveryFlag', equals: 'deload_suggested' }, // matrixDeload true, observed via its own copy/flag consequence
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'safetyHold', equals: true },
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-67',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14/T-WEEKLY-04 OR-isolation: poorRecovery alone (energyScore<=2 with soreness/stress otherwise ordinary; recoveryScore forced to 3, but performance grade 2 so the deload OR-clause never fires -- matrixDeload false) forces autoApplyHoldActive; safetyHold confirmed false on its own field',
    rules: ['N-COACH-14', 'T-WEEKLY-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 2, sorenessScore: 2, stressScore: 2, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatWeights35(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'maint', weeksInPhase: 4, consecutivePoorRecoveryWeeks: 0,
      currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'recoveryFlag', equals: 'concerned' },
      { kind: 'equals', path: 'safetyHold', equals: false },
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-68',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14/T-WEEKLY-04 OR-isolation: safetyHold alone (jointPain=true with an otherwise good-recovery checkin, energy>2/soreness<4 so poorRecovery stays false) forces autoApplyHoldActive',
    rules: ['N-COACH-14', 'T-WEEKLY-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 4, sorenessScore: 1, stressScore: 2, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: true, notes: null },
      morningWeights: flatWeights35(85, 0), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'maint', weeksInPhase: 4, consecutivePoorRecoveryWeeks: 0,
      currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'safetyHold', equals: true },
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'recoveryFlag', equals: 'deload_suggested' }, // proves matrixDeload false
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-69',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14/T-WEEKLY-04 OR-isolation: ffmFloorHeld alone -- CFL-06\'s own base fixture (ffmFloorWeek(), before its consecutiveExceededWeeks override), reused verbatim: rising weight on a cut (poorRecovery/rapidWeightLossFlag false), no joint pain/notes (safetyHold false), recoveryScore 2 throughout (matrixDeload false), weeksInPhase 6 alone giving only one of the two deloadTriggers needed (deloadSuggested false) -- forces autoApplyHoldActive on the FFM floor alone',
    rules: ['N-COACH-14', 'T-WEEKLY-04'],
    facts: ffmFloorWeek(),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'recoveryFlag', equals: 'deload_suggested' },
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'safetyHold', equals: true },
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-70',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14/T-WEEKLY-04 OR-isolation: rapidWeightLossFlag, asserted on its own returned field as close to isolation as production permits -- its own condition (actualRatePct<=-1.5 && energyScore<=2, weeklyCoach.js:1847-1852) STRUCTURALLY requires energyScore<=2, which is poorEnergy\'s own condition, so poorRecovery is unavoidably co-true in any real fixture (the identical structural fact CFL-08 documents for this same pair); safetyHold/ffmFloorHeld/deloadSuggested/matrixDeload are still genuinely isolated false here',
    rules: ['N-COACH-14', 'T-WEEKLY-04'],
    facts: {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 2, sorenessScore: 2, stressScore: 3, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
      morningWeights: flatWeights35(85, -1.6), sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 3, consecutivePoorRecoveryWeeks: 0,
      currentCalTarget: 2400, bodyweightKg: 85, nowMs: NOW,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'recoveryFlag', equals: 'deload_suggested' },
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'safetyHold', equals: true },
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
    ],
    restraint: false,
  },

  {
    id: 'NUT-71',
    family: 'nutrition',
    why: 'ORACLE N-COACH-14/T-WEEKLY-04 OR-isolation: calmMode alone (a clean, otherwise-ordinary moderate push week, the same base ground truth as NUT-57\'s scoffPositive isolation) forces autoApplyHoldActive -- calmMode is a pure caller-supplied input read only at the OR/escalation sites, so no other named term is touched by setting it',
    rules: ['N-COACH-14', 'T-WEEKLY-04'],
    facts: { ...moderatePushWeek(), calmMode: true },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: 'recoveryFlag', equals: 'deload_suggested' },
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'safetyHold', equals: true },
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
    ],
    restraint: false,
  },
];

export const NUTRITION_COVERAGE = [
  ...SCENARIOS.map((s) => ({
    id: s.id, family: s.family || 'nutrition', rules: s.rules || [],
    pending: !!s.pending, expectedFail: !!s.expectedFail,
  })),
];
