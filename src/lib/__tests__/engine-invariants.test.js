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
import { runWeeklyCoach } from '../weeklyCoach';
import {
  calculate1RM,
  calculateTonnage,
  calculateWeeklyVolume,
  calculateEffectiveSets,
  getSetEffectivenessWeight,
  detectLaggingMuscles,
  calculatePlates,
} from '../algorithms';
import {
  computeEWMA,
  computeWeeklyWeightChange,
  computeAdaptiveTDEEAdjustment,
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
  const phases = ['agg_cut', 'mod_cut', 'mild_cut', 'recomp', 'maint', 'mild_bulk', 'mod_bulk'];
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

  test('idempotent for identical inputs', () => {
    const inputs = {
      checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 3, sleepHours: 7, calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false },
      morningWeights: Array.from({ length: 14 }, (_, i) => ({ loggedAt: NOW - (14 - i) * DAY, weightKg: 85 - i * 0.05 })),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
      goalPhase: 'mod_cut', weeksInPhase: 4,
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

  test('calculatePlates: never crashes; total >= bar', () => {
    for (let i = 0; i < 200; i++) {
      const target = rfloat(0, 300);
      const bar = pick([15, 20, 25]);
      const { plates, totalWeight } = calculatePlates(target, bar);
      expect(Array.isArray(plates)).toBe(true);
      expect(typeof totalWeight).toBe('number');
      expect(totalWeight).toBeGreaterThanOrEqual(bar - 1e-6);
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
  const phases = ['mod_cut', 'mild_cut', 'recomp', 'maint', 'mild_bulk', 'mod_bulk'];
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
