/**
 * Property-based / fuzz tests for the math engines.
 *
 * For each engine we feed thousands of randomised but plausible inputs and
 * assert invariants that must hold regardless of input shape:
 *
 *   1. Never throw on plausible random inputs (no crashes in production)
 *   2. Never return NaN / Infinity in numeric output fields
 *   3. Bounded outputs respect their declared bounds
 *   4. Idempotence where applicable (running twice on same input gives
 *      identical output)
 *
 * These don't replace targeted unit tests but catch regressions where a
 * normally-rare branch produces garbage (the operator-precedence rir/rpe
 * bug we fixed in wave 2 was exactly this, only NaN for rir > 0 with no
 * rpe, would have surfaced here).
 */
import { runWeeklyCoach, computeWeeklyTrendPct } from '../weeklyCoach';
import { detectEdPatternFlag } from '../edPatternDetector';
import {
  calculate1RM,
  calculateTonnage,
  calculateWeeklyVolume,
  calculateEffectiveSets,
  getSetEffectivenessWeight,
  detectLaggingMuscles,
  computeSessionAdjustments,
} from '../algorithms';
import { SESSION_REASON_CODES } from '../whyThisTemplates';
import {
  computeEWMA,
  computeWeeklyWeightChange,
  computeAdaptiveTDEEAdjustment,
  computeStepTrendModifier,
  shouldSuggestDietBreak,
} from '../nutritionEngine';
import { emaValue, computeRecoveryEMAs } from '../recoveryEMA';
import { generatePlan } from '../planEngine';

// Deterministic PRNG so the fuzz run is reproducible across CI.
function mulberry32(seed) {
  let a = seed;
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260520);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const rint = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const rfloat = (min, max) => rng() * (max - min) + min;
const rmaybe = (p, v, def = null) => (rng() < p ? v() : def);

const NOW = Date.UTC(2026, 4, 20);
const DAY = 86_400_000;

function isFiniteOrNull(v) {
  return v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v));
}

function assertNoBadNumbers(label, obj, depth = 0) {
  if (depth > 4) return;
  if (obj == null) return;
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) {
      throw new Error(`${label}: non-finite number ${obj}`);
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((x, i) => assertNoBadNumbers(`${label}[${i}]`, x, depth + 1));
    return;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      assertNoBadNumbers(`${label}.${k}`, v, depth + 1);
    }
  }
}

// ── runWeeklyCoach ─────────────────────────────────────────────────────────

describe('runWeeklyCoach: fuzz invariants', () => {
  const phases = ['mild_cut', 'recomp', 'maint', 'mild_bulk', 'mod_bulk', 'bulk'];
  const adherence = ['hit', 'under', 'over', 'untracked', null];

  test('never throws and never returns NaN/Infinity on 500 random inputs', () => {
    for (let i = 0; i < 500; i++) {
      const numWeights = rint(0, 30);
      const startKg = rfloat(45, 140);
      const morningWeights = Array.from({ length: numWeights }, (_, j) => ({
        loggedAt: NOW - (numWeights - j) * DAY + rint(-3600_000, 3600_000),
        weightKg: Math.max(35, Math.min(200, startKg + rfloat(-3, 3))),
      }));
      const inputs = {
        checkin: rmaybe(0.9, () => ({
          weekStart: NOW - rint(0, 30) * DAY,
          energyScore: rint(1, 5),
          sorenessScore: rint(1, 5),
          stressScore: rint(1, 5),
          sleepHours: rmaybe(0.85, () => rfloat(3, 10)),
          calsAdherence: pick(adherence),
          stepsAdherence: pick(adherence),
          trainingPerformance: pick(['hit', 'under', 'over', null]),
          jointPain: rng() < 0.1,
          notes: rmaybe(0.05, () => 'random note'),
        })),
        morningWeights,
        sessionsCompleted: rint(0, 7),
        sessionsPlanned: rint(0, 7),
        prsThisWeek: rint(0, 5),
        goalPhase: pick(phases),
        weeksInPhase: rint(1, 40),
        consecutiveOffTargetWeeks: rint(0, 8),
        consecutivePoorRecoveryWeeks: rint(0, 8),
        lastCalAdjustmentDirection: pick(['up', 'down', null]),
        lastCalAdjustmentWeeksAgo: rint(0, 20),
        currentCalTarget: rmaybe(0.95, () => rint(1200, 4500)),
        currentStepsTarget: rint(2000, 18000),
        bodyweightKg: rmaybe(0.95, () => startKg),
        units: pick(['kg', 'lbs']),
      };
      let out;
      try { out = runWeeklyCoach(inputs); }
      catch (e) {
        throw new Error(`runWeeklyCoach threw on seed ${i}: ${e.message}\ninputs=${JSON.stringify(inputs).slice(0, 400)}`);
      }
      // Output shape invariants
      expect(out).toBeDefined();
      expect(typeof out.weekLabel).toBe('string');
      expect(out.trend).toBeDefined();
      assertNoBadNumbers(`seed ${i}`, out);

      // Calorie change must be capped at ±5% of currentCalTarget when present
      if (out.adjustments?.calories && inputs.currentCalTarget) {
        const cap = Math.ceil(inputs.currentCalTarget * 0.05);
        expect(Math.abs(out.adjustments.calories.change)).toBeLessThanOrEqual(cap + 1);
      }
    }
  });

  test('null/empty inputs do not crash', () => {
    expect(() => runWeeklyCoach({
      checkin: null, morningWeights: [], sessionsCompleted: 0, sessionsPlanned: 0,
      prsThisWeek: 0, goalPhase: 'maint', weeksInPhase: 1,
      consecutiveOffTargetWeeks: 0, consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: null, currentStepsTarget: 8000,
      bodyweightKg: null, units: 'kg',
    })).not.toThrow();
  });

  // ── COMP-024 SAFETY INVARIANT (blocking, §4d F4) ──────────────────────────
  // The cycle-robust smoother must NEVER mask a genuine rapid loss. A real
  // -1.8%/wk drop with low energy on a cut must still fire the rapid-loss
  // safety flag AND the ED-pattern s1 signal — exactly as before COMP-024,
  // because the safety reads stay on the plain alpha-0.1 EWMA.
  test('F4: a genuine rapid loss still fires rapid-loss safety + ED s1 (robust smoothing must not mask it)', () => {
    // A clearly-rapid sustained loss (~2.5%/wk raw). 21 days so the alpha-0.1
    // EWMA reaches steady slope and the 7-day-ago lookup spans the full drop.
    // Anchor to real Date.now() because getEwmaSevenDaysAgo() reads the live clock.
    const now = Date.now();
    const morningWeights = Array.from({ length: 21 }, (_, i) => ({
      loggedAt: now - (21 - i) * DAY,
      weightKg: 85 - i * 0.30,
    }));
    const out = runWeeklyCoach({
      checkin: { weekStart: now - 7 * DAY, energyScore: 2, sorenessScore: 3, sleepHours: 7, calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false },
      morningWeights,
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', weeksInPhase: 4,
      consecutiveOffTargetWeeks: 1, consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2400, currentStepsTarget: 8000,
      bodyweightKg: 85, units: 'kg',
    });
    // Safety flag fires (reads the plain trend, unaffected by the robust smoother).
    expect(out.rapidWeightLossFlag).toBe(true);

    // The ED-pattern s1 (rapid_loss) signal still sees the drop via the plain
    // computeWeeklyTrendPct feed.
    const trendPct = computeWeeklyTrendPct(morningWeights, 85);
    expect(trendPct).toBeLessThanOrEqual(-1.5);
    const ed = detectEdPatternFlag({ weightTrendPctPerWeek: trendPct, energyScore: 2 }, [], false);
    expect(ed.signals.s1).toBe(true);
  });

  test('idempotent for identical inputs', () => {
    const inputs = {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 3, sleepHours: 7, calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false },
      morningWeights: Array.from({ length: 14 }, (_, i) => ({ loggedAt: NOW - (14 - i) * DAY, weightKg: 85 - i * 0.05 })),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
      goalPhase: 'mild_cut', weeksInPhase: 4,
      consecutiveOffTargetWeeks: 1, consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2400, currentStepsTarget: 8000,
      bodyweightKg: 85, units: 'kg',
    };
    const a = runWeeklyCoach(inputs);
    const b = runWeeklyCoach(inputs);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// ── COMP-026 SAFETY INVARIANTS (blocking) ─────────────────────────────────
// No-shadow gate: the step-trend modifier may only SPEED an adaptive resize the
// weight trend already justified. It must never weaken a safety clamp, create a
// change, reverse a change, or pierce the +/-5% cap. If any of these fails, the
// modifier is unsafe to ship live and the change is held (the COMP-024 lesson).
describe('COMP-026: step-trend gain safety invariants (blocking)', () => {
  // A dated, daily EWMA series so confidence reaches 'high' (>=4 distinct weeks).
  const DATED = (perDayKg, days = 30, start = 85) =>
    Array.from({ length: days }, (_, j) => {
      const ms = NOW - (days - 1 - j) * DAY;
      const w = parseFloat((start + perDayKg * j).toFixed(3));
      return { loggedAt: ms, weightKg: w, ewma: w, date: new Date(ms).toISOString() };
    });

  test('updateGain is hard-clamped to [0.50, 0.65]: never weakens the damping nor pierces the cap', () => {
    const at = (g) => computeAdaptiveTDEEAdjustment({
      ewmaData: DATED(0.04), prescribedKcal: 2200, currentTDEEEstimate: 2500, adherenceFactor: 1.0, updateGain: g,
    }).adjustmentKcal;
    const lo = at(0.5);
    const hi = at(0.65);
    // Below 0.5 clamps UP to 0.5; above 0.65 clamps DOWN to 0.65; junk -> 0.5.
    expect(at(0.4)).toBe(lo);
    expect(at(0)).toBe(lo);
    expect(at(-2)).toBe(lo);
    expect(at(NaN)).toBe(lo);
    expect(at(undefined)).toBe(lo);
    expect(at(1.0)).toBe(hi);
    expect(at(5)).toBe(hi);
    // The higher gain raises magnitude, never flips the sign.
    expect(Math.sign(hi)).toBe(Math.sign(lo));
    expect(Math.abs(hi)).toBeGreaterThanOrEqual(Math.abs(lo));
  });

  test('fuzz: the gain bounds every result in magnitude and can neither create nor reverse a change', () => {
    for (let i = 0; i < 300; i++) {
      const base = {
        ewmaData: DATED(rfloat(-0.2, 0.2), rint(14, 45)),
        prescribedKcal: rint(1200, 4000),
        currentTDEEEstimate: rint(1200, 4000),
        adherenceFactor: rfloat(0.6, 1.2),
      };
      const lo = computeAdaptiveTDEEAdjustment({ ...base, updateGain: 0.5 }).adjustmentKcal;
      const hi = computeAdaptiveTDEEAdjustment({ ...base, updateGain: 0.65 }).adjustmentKcal;
      const g = computeAdaptiveTDEEAdjustment({ ...base, updateGain: rfloat(-1, 3) }).adjustmentKcal;
      const loA = Math.abs(lo);
      const hiA = Math.abs(hi);
      expect(Math.abs(g)).toBeGreaterThanOrEqual(Math.min(loA, hiA) - 1); // -1 for rounding
      expect(Math.abs(g)).toBeLessThanOrEqual(Math.max(loA, hiA) + 1);
      if (lo !== 0) expect(Math.sign(g) === 0 || Math.sign(g) === Math.sign(lo)).toBe(true);
    }
  });

  test('FFM floor outranks the gain: a cut held at gain 0.50 stays held at 0.65', () => {
    const ffmFloorContext = { weightKg: 80, bodyFatPercent: 15, bodyFatSource: 'dexa', sex: 'male', recentIntakeAvgKcal: 1800, recentIntakeDaysLogged: 7 };
    const base = { ewmaData: DATED(0.04), prescribedKcal: 1500, currentTDEEEstimate: 2000, adherenceFactor: 1.0, ffmFloorContext };
    for (const g of [0.5, 0.575, 0.65]) {
      const r = computeAdaptiveTDEEAdjustment({ ...base, updateGain: g });
      expect(r.floorHeld).toBe(true);
      expect(r.adjustmentKcal).toBe(0);
    }
  });

  test('rapid-loss upward-only override outranks the gain: a cut clamps to 0 at any gain', () => {
    const base = { ewmaData: DATED(0.04), prescribedKcal: 1800, currentTDEEEstimate: 2200, adherenceFactor: 1.0, rapidLossOverride: true };
    for (const g of [0.5, 0.65]) {
      expect(computeAdaptiveTDEEAdjustment({ ...base, updateGain: g }).adjustmentKcal).toBe(0);
    }
  });

  test('fuzz: computeStepTrendModifier never proposes a gain outside [0.50, 0.65] and never throws', () => {
    for (let i = 0; i < 500; i++) {
      const n = rint(0, 50);
      const stepRows = Array.from({ length: n }, () => ({
        entryDate: new Date(NOW - rint(0, 50) * DAY).toISOString().slice(0, 10),
        steps: rng() < 0.1 ? (rng() < 0.5 ? null : NaN) : rint(-500, 250000),
        source: pick(['health', 'manual', undefined]),
      }));
      const todayKey = rng() < 0.1 ? 'bad-key' : new Date(NOW).toISOString().slice(0, 10);
      const adjustmentSign = pick([-1, 0, 1, NaN]);
      let r;
      expect(() => { r = computeStepTrendModifier({ stepRows, todayKey, adjustmentSign }); }).not.toThrow();
      expect(r.gain).toBeGreaterThanOrEqual(0.5);
      expect(r.gain).toBeLessThanOrEqual(0.65);
      if (!r.active) expect(r.gain).toBe(0.5); // an inactive modifier never moves the gain
    }
  });
});

describe('COMP-026: runWeeklyCoach composition invariants (blocking)', () => {
  const TODAY = '2024-02-15';
  const keyAgo = (age) => {
    const [y, m, d] = TODAY.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d) - age * DAY);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  };
  const risingWeights = (start = 80, perDayKg = 0.015, days = 42) =>
    Array.from({ length: days }, (_, i) => ({ weightKg: start + perDayKg * i, loggedAt: Date.now() - (days - 1 - i) * DAY }));
  const stepSeries = (recent, baseline) =>
    Array.from({ length: 42 }, (_, age) => ({ entryDate: keyAgo(age), steps: age <= 13 ? recent : baseline, source: 'health' }));
  const inputs = (over = {}) => ({
    checkin: { energyScore: 4, recoveryScore: 4, calsAdherence: 'hit', cycleOverride: false },
    currentCalTarget: 2000, currentMaintenanceKcal: 2400, currentStepsTarget: 8000,
    sessionsCompleted: 4, sessionsPlanned: 4, morningWeights: risingWeights(),
    goalPhase: 'mild_cut', weeksInPhase: 6, consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
    bodyweightKg: 80, stepsTodayKey: TODAY, ...over,
  });

  test('+/-5% weekly cap holds even with an active 0.65 gain', () => {
    const out = runWeeklyCoach(inputs({ dailyStepsSeries: stepSeries(6000, 12000) }));
    expect(out.stepModifier.gain).toBe(0.65); // confirm the gain really did rise
    if (out.adjustments.calories) {
      expect(Math.abs(out.adjustments.calories.change)).toBeLessThanOrEqual(Math.round(2000 * 0.05));
    }
  });

  test('cycleOverride holds the whole calorie block regardless of the step gain', () => {
    const out = runWeeklyCoach(inputs({
      checkin: { energyScore: 4, calsAdherence: 'hit', cycleOverride: true },
      dailyStepsSeries: stepSeries(6000, 12000),
    }));
    expect(out.adjustments.calories).toBeNull();
  });

  test('scoffPositive holds the calorie block regardless of the step gain', () => {
    const out = runWeeklyCoach(inputs({ scoffPositive: true, dailyStepsSeries: stepSeries(6000, 12000) }));
    expect(out.adjustments.calories).toBeNull();
  });

  test('an active agreeing step series never suppresses a genuine rapid-loss flag', () => {
    const now = Date.now();
    const out = runWeeklyCoach({
      checkin: { weekStart: now - 7 * DAY, energyScore: 2, calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false },
      morningWeights: Array.from({ length: 21 }, (_, i) => ({ loggedAt: now - (21 - i) * DAY, weightKg: 85 - i * 0.30 })),
      sessionsCompleted: 4, sessionsPlanned: 4, goalPhase: 'mod_cut', weeksInPhase: 4,
      currentCalTarget: 2400, currentStepsTarget: 8000, bodyweightKg: 85, units: 'kg',
      dailyStepsSeries: stepSeries(6000, 12000), stepsTodayKey: TODAY,
    });
    expect(out.rapidWeightLossFlag).toBe(true);
  });

  test('steps never CREATE a change: on-target weight with an active step series stays null', () => {
    const flat = Array.from({ length: 42 }, (_, i) => ({ weightKg: 80, loggedAt: Date.now() - (41 - i) * DAY }));
    const out = runWeeklyCoach(inputs({
      goalPhase: 'maint', currentMaintenanceKcal: 2000, morningWeights: flat,
      consecutiveOffTargetWeeks: 0, dailyStepsSeries: stepSeries(12000, 6000),
    }));
    expect(out.adjustments.calories).toBeNull();
  });
});

// ── algorithms ─────────────────────────────────────────────────────────────

describe('algorithms: fuzz invariants', () => {
  test('calculate1RM never returns NaN/Infinity for plausible inputs', () => {
    for (let i = 0; i < 1000; i++) {
      const w = rfloat(0, 400);
      const reps = rint(0, 30);
      const v = calculate1RM(w, reps);
      expect(isFiniteOrNull(v)).toBe(true);
    }
  });

  test('calculate1RM is robust to zero / null inputs', () => {
    // Implementation returns `weight || 0` when inputs are out of range;
    // we just assert that the result is finite and non-negative.
    expect(calculate1RM(0, 5)).toBeGreaterThanOrEqual(0);
    expect(calculate1RM(100, 0)).toBeGreaterThanOrEqual(0); // returns weight (100)
    expect(calculate1RM(null, 5)).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(calculate1RM(0, 0))).toBe(true);
  });

  test('calculateTonnage handles empty + malformed sets', () => {
    expect(calculateTonnage([])).toBe(0);
    expect(calculateTonnage([{ weight: null, actualReps: 10 }])).toBe(0);
    expect(calculateTonnage([{ weight: 100, actualReps: null }])).toBe(0);
  });

  test('getSetEffectivenessWeight monotone in RIR', () => {
    let prev = Infinity;
    for (let rir = 0; rir <= 10; rir++) {
      const w = getSetEffectivenessWeight(rir);
      expect(typeof w).toBe('number');
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(prev + 1e-9);
      prev = w;
    }
  });

  test('calculateWeeklyVolume tolerates 300 randomised sets without throwing', () => {
    const muscles = ['chest', 'back', 'side_delts', 'quads', 'hamstrings', 'biceps', 'triceps'];
    const exerciseMap = {};
    for (let i = 0; i < 50; i++) {
      exerciseMap[`ex${i}`] = {
        primary_muscle: pick(muscles),
        secondary_muscles: rng() < 0.3 ? '[]' : JSON.stringify([pick(muscles)]),
      };
    }
    const sets = Array.from({ length: 300 }, () => ({
      exerciseId: `ex${rint(0, 49)}`,
      setType: pick(['straight', 'warmup', 'dropset', 'amrap']),
      weight: rfloat(0, 200),
      actualReps: rint(0, 20),
      rir: rmaybe(0.6, () => rint(0, 8)),
    }));
    expect(() => calculateWeeklyVolume(sets, exerciseMap)).not.toThrow();
    const out = calculateWeeklyVolume(sets, exerciseMap);
    assertNoBadNumbers('weeklyVolume', out);
  });

  test('calculateEffectiveSets effectiveSets always finite', () => {
    const exerciseMap = { ex1: { primary_muscle: 'chest', secondary_muscles: '[]' } };
    for (let i = 0; i < 200; i++) {
      const sets = [{
        exerciseId: 'ex1', setType: 'straight',
        weight: rfloat(0, 200), actualReps: rint(1, 20),
        rir: rmaybe(0.5, () => rint(0, 10)),
        rpe: rmaybe(0.5, () => rint(0, 10)),
      }];
      const out = calculateEffectiveSets(sets, exerciseMap);
      assertNoBadNumbers(`fuzz ${i}`, out);
    }
  });

  test('detectLaggingMuscles: empty input → empty output', () => {
    expect(detectLaggingMuscles([], 3)).toEqual([]);
  });
});

// ── nutritionEngine ────────────────────────────────────────────────────────

describe('nutritionEngine: fuzz invariants', () => {
  test('computeEWMA never blows up on random walks', () => {
    for (let i = 0; i < 100; i++) {
      const n = rint(0, 30);
      let w = rfloat(50, 130);
      const points = Array.from({ length: n }, (_, j) => {
        w += rfloat(-1, 1);
        return { loggedAt: NOW - (n - j) * DAY, weightKg: Math.max(35, Math.min(200, w)) };
      });
      const result = computeEWMA(points);
      expect(Array.isArray(result)).toBe(true);
      for (const p of result) {
        expect(Number.isFinite(p.ewma)).toBe(true);
      }
    }
  });

  test('computeWeeklyWeightChange returns null for <8 points and finite otherwise', () => {
    expect(computeWeeklyWeightChange([])).toBeNull();
    expect(computeWeeklyWeightChange(Array.from({ length: 7 }, (_, i) => ({ ewma: 85 - i * 0.05 })))).toBeNull();
    const r = computeWeeklyWeightChange(Array.from({ length: 14 }, (_, i) => ({ ewma: 85 - i * 0.05 })));
    expect(Number.isFinite(r)).toBe(true);
  });

  test('shouldSuggestDietBreak returns an object with `suggest` boolean', () => {
    const r1 = shouldSuggestDietBreak(new Date(NOW - 1 * DAY));
    const r2 = shouldSuggestDietBreak(new Date(NOW - 90 * DAY));
    expect(typeof r1).toBe('object');
    expect(typeof r1.suggest).toBe('boolean');
    expect(typeof r2.suggest).toBe('boolean');
    expect(r1.suggest).toBe(false);  // < threshold
    expect(r2.suggest).toBe(true);   // > threshold
  });

  test('computeAdaptiveTDEEAdjustment never returns NaN', () => {
    for (let i = 0; i < 50; i++) {
      const ewma = Array.from({ length: 30 }, (_, j) => ({
        loggedAt: NOW - (30 - j) * DAY, weightKg: 85 - j * 0.05, ewma: 85 - j * 0.05,
      }));
      const result = computeAdaptiveTDEEAdjustment({
        ewmaData: ewma,
        prescribedKcal: rint(1200, 4000),
        currentTDEEEstimate: rint(1200, 4000),
        adherenceFactor: rfloat(0.5, 1.2),
      });
      assertNoBadNumbers(`seed ${i}`, result);
    }
  });
});

// ── recoveryEMA fuzz ───────────────────────────────────────────────────────

describe('recoveryEMA: fuzz invariants', () => {
  test('emaValue tolerates mixed valid/invalid points', () => {
    for (let i = 0; i < 100; i++) {
      const n = rint(0, 50);
      const points = Array.from({ length: n }, () => ({
        value: rng() < 0.1 ? null : rng() < 0.1 ? NaN : rfloat(0, 5),
        at: NOW - rint(0, 60) * DAY,
      }));
      const v = emaValue(points);
      expect(v === null || Number.isFinite(v)).toBe(true);
    }
  });

  test('computeRecoveryEMAs always returns shape { soreness, fatigue, joint }', () => {
    const workouts = Array.from({ length: 20 }, () => ({
      startedAt: NOW - rint(0, 30) * DAY,
      soreness24hBefore: rmaybe(0.7, () => rint(1, 5)),
      fatigueLevel: rmaybe(0.7, () => rint(1, 5)),
      maxJointDiscomfort: rmaybe(0.3, () => rint(0, 3)),
    }));
    const r = computeRecoveryEMAs(workouts);
    expect(Object.keys(r).sort()).toEqual(['fatigue', 'joint', 'soreness']);
    for (const v of Object.values(r)) {
      expect(v === null || Number.isFinite(v)).toBe(true);
    }
  });
});

// ── planEngine ─────────────────────────────────────────────────────────────

describe('planEngine.generatePlan: invariants across goal/phase grid', () => {
  const experiences = ['beginner', 'intermediate', 'advanced'];
  const equipments = ['full_gym', 'home_gym', 'bodyweight'];
  const goals = ['build_muscle', 'physique', 'general_fitness', 'strength'];
  const phases = ['mild_cut', 'recomp', 'maint', 'mild_bulk', 'mod_bulk'];
  const recoveries = ['poor', 'average', 'good'];

  test('every combination produces a valid plan structure', () => {
    let combos = 0;
    for (const experience of experiences) {
      for (const equipment of equipments) {
        for (const goal of goals) {
          for (const phase of phases) {
            for (const recoveryRating of recoveries) {
              combos++;
              const plan = generatePlan({
                experience, daysPerWeek: pick([3, 4, 5]),
                sessionLengthMinutes: pick([45, 60, 75]),
                equipment, goal, phase, weakPoints: [], recoveryRating,
                nutritionPhase: 'maintain',
              });
              expect(plan).toBeDefined();
              expect(typeof plan.name).toBe('string');
              expect(Array.isArray(plan.workouts)).toBe(true);
              expect(plan.workouts.length).toBeGreaterThan(0);
              for (const w of plan.workouts) {
                expect(Array.isArray(w.exercises)).toBe(true);
                for (const ex of w.exercises) {
                  expect(typeof ex.exerciseName).toBe('string');
                  expect(ex.exerciseName.length).toBeGreaterThan(0);
                  expect(Number.isFinite(ex.repMin)).toBe(true);
                  expect(Number.isFinite(ex.repMax)).toBe(true);
                  expect(ex.repMin).toBeLessThanOrEqual(ex.repMax);
                  expect(ex.sets).toBeGreaterThan(0);
                }
              }
            }
          }
        }
      }
    }
    expect(combos).toBeGreaterThan(50); // sanity: we actually ran some combos
  });
});

// ── computeSessionAdjustments (COMP-015) ───────────────────────────────────

describe('computeSessionAdjustments: fuzz invariants', () => {
  const MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'side_delts', 'biceps', 'triceps', 'calves', 'abs'];
  const SIGNALS = ['reduce', 'hold', 'push'];
  const VALID_CODES = new Set(Object.values(SESSION_REASON_CODES));

  function randomInput() {
    const trained = [...new Set(Array.from({ length: rint(0, 5) }, () => pick(MUSCLES)))];
    const todaysExercises = trained.map((m, i) => ({
      exerciseId: rmaybe(0.9, () => `ex${i}`, null),
      primaryMuscle: m,
      plannedSets: rint(1, 6),
    }));
    const muscleSignals = {};
    const landmarks = {};
    for (const m of trained) {
      // landmarks: keep mev<mav<mrv ordered and finite
      const mev = rint(0, 6);
      const mav = mev + rint(2, 10);
      const mrv = mav + rint(2, 8);
      landmarks[m] = { mev, mav, mrv };
      muscleSignals[m] = rmaybe(0.85, () => ({
        lastTrainedAt: NOW - rint(0, 7) * DAY,
        lastFeedback: { pump: rint(1, 3), joint: rint(0, 3), performance: rint(1, 4) },
        checkinSore: rng() < 0.4,
        checkinAt: NOW - rint(0, 8) * DAY,
        presessionSoreness: rint(1, 3),
      }), {});
    }
    const doneThisWeekByMuscle = {};
    for (const m of trained) doneThisWeekByMuscle[m] = rint(0, 18);
    const recentSessionEvents = Array.from({ length: rint(0, 4) }, () => ({
      muscle: pick(MUSCLES),
      decision: pick(['session_add_under_stimulus', 'session_adjustment_reverted', 'session_drop_residual_soreness']),
      createdAt: NOW - rint(0, 20) * DAY,
    }));
    return {
      todaysExercises,
      muscleSignals,
      weeklyContext: {
        doneThisWeekByMuscle,
        landmarks,
        weeklySignal: pick(SIGNALS),
        safetyHold: rng() < 0.3,
        isDeload: rng() < 0.15,
        weekStartMs: NOW - rint(0, 6) * DAY,
      },
      recentSessionEvents,
      now: NOW,
      presessionIntent: pick(['sharp', 'average', 'below_par', null]),
    };
  }

  test('never throws; no NaN/Infinity; respects all structural invariants on 2000 inputs', () => {
    for (let i = 0; i < 2000; i++) {
      const input = randomInput();
      let out;
      expect(() => { out = computeSessionAdjustments(input); }).not.toThrow();
      assertNoBadNumbers(`sessionAdj[${i}]`, out);

      // Idempotence (invariant 2)
      expect(JSON.stringify(computeSessionAdjustments(input))).toBe(JSON.stringify(out));

      // Deload → all-zero/empty (invariant 5)
      if (input.weeklyContext.isDeload) {
        expect(out).toEqual([]);
        continue;
      }

      const trainedMuscles = new Set(input.todaysExercises.map(e => e.primaryMuscle));
      const perMuscleAdjusted = {};
      let nonzeroCount = 0;

      for (const o of out) {
        // setDelta domain + floor (invariant 3)
        expect([-1, 0, 1]).toContain(o.setDelta);
        expect(o.adjustedSets).toBeGreaterThanOrEqual(1);
        expect(o.adjustedSets).toBe(o.plannedSets + o.setDelta);

        // Only muscles trained today, with signals, ever appear (invariant 6)
        expect(trainedMuscles.has(o.muscle)).toBe(true);

        // reasonCode closed enum + non-empty reasonText (invariant 7)
        expect(VALID_CODES.has(o.reasonCode)).toBe(true);
        expect(typeof o.reasonText).toBe('string');
        expect(o.reasonText.length).toBeGreaterThan(0);

        if (o.setDelta !== 0) {
          nonzeroCount++;
          perMuscleAdjusted[o.muscle] = (perMuscleAdjusted[o.muscle] ?? 0) + 1;

          // Landmark clamp (invariant 4), directional: a DROP never takes
          // projected weekly below mev (the recovery floor); an ADD never pushes
          // projected past mrv (the session layer must not exceed the working
          // ceiling on its own). The opposite rails don't apply — a drop from an
          // already-over-mrv muscle legitimately stays > mrv, and an add on an
          // under-trained muscle legitimately stays < mev while climbing.
          const lk = input.weeklyContext.landmarks[o.muscle];
          const projected = (input.weeklyContext.doneThisWeekByMuscle[o.muscle] ?? 0) + o.adjustedSets;
          if (o.setDelta < 0) expect(projected).toBeGreaterThanOrEqual(lk.mev);
          if (o.setDelta > 0) expect(projected).toBeLessThanOrEqual(lk.mrv);

          // safetyHold / weeklySignal reduce → no positive deltas (invariant 5)
          if (input.weeklyContext.safetyHold || input.weeklyContext.weeklySignal === 'reduce') {
            expect(o.setDelta).toBeLessThanOrEqual(0);
          }
        }
      }

      // ≤1 adjusted exercise per muscle, ≤2 per session (invariant 3)
      for (const n of Object.values(perMuscleAdjusted)) expect(n).toBeLessThanOrEqual(1);
      expect(nonzeroCount).toBeLessThanOrEqual(2);

      // Add-frequency cap (invariant 8): an add this week blocks further adds for M
      const addedThisWeek = new Set(
        input.recentSessionEvents
          .filter(e => e.decision.startsWith('session_add') && e.createdAt >= input.weeklyContext.weekStartMs)
          .map(e => e.muscle),
      );
      for (const o of out) {
        if (o.setDelta > 0) expect(addedThisWeek.has(o.muscle)).toBe(false);
      }
    }
  });
});
