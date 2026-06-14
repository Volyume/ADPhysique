/**
 * Engine robustness fuzz.
 *
 * Throws adversarial, malformed and extreme inputs (null, undefined, NaN,
 * Infinity, negatives, huge values, wrong types, garbage strings) at the
 * runtime-critical pure engines and asserts:
 *   - they never throw, and
 *   - no NaN / Infinity ever leaks into a user-facing number (a "NaN kcal"
 *     target or "Infinity g protein" is exactly the crash-adjacent launch bug
 *     this guards against).
 *
 * Deterministic (seeded RNG) so a failure is reproducible.
 */

import { calculateNutritionTargets, computeEWMA } from '../nutritionEngine';
import { runWeeklyCoach } from '../weeklyCoach';
import { stoneLbsToKg, parseBodyWeightToKg, ftInToCm } from '../units';
import { localDayKey, parseLocalDay } from '../dayKey';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A pool of nasty scalar values to feed numeric slots.
const NASTY = [
  null, undefined, NaN, Infinity, -Infinity, 0, -0, -1, -9999, 1e9, 1e-9,
  '30', '', 'abc', '.', '12.5kg', true, false, {}, [], [1], 0.1 + 0.2,
];
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const SEXES = ['male', 'female', 'm', 'f', null, undefined, 'other', ''];
const GOALS = ['lean_gain', 'build', 'bulk', 'maintain', 'mild_cut', 'aggressive_cut',
  'recomp', 'contest_prep', null, 'garbage', undefined];
const ACTIVITY = ['sedentary', 'light', 'moderate', 'active', 'very_active', 2, 1.55, null, 'x'];
const APPROACH = ['standard', 'optimised', 'advanced', null, 'x'];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced', 'competitive', null, 'x'];

// Every numeric field a NaN/Infinity must never reach.
const NUMERIC_FIELDS = [
  'bmrKcal', 'maintenanceKcal', 'targetKcal', 'kcalMin', 'kcalMax',
  'proteinG', 'carbsG', 'fatG', 'proteinGPerKg', 'perMealProteinG',
  'mealFrequency', 'targetRateKgPerWeek',
];

describe('Engine robustness: adversarial inputs never produce NaN/Infinity or throw', () => {
  test('calculateNutritionTargets stays finite and sane across 5000 fuzzed inputs', () => {
    const r = rng(20260605);
    const failures = [];
    for (let i = 0; i < 5000; i++) {
      const inputs = {
        sex: pick(r, SEXES),
        ageYears: pick(r, NASTY),
        heightCm: pick(r, NASTY),
        weightKg: pick(r, NASTY),
        bodyFatPercent: pick(r, NASTY),
        bodyFatSource: pick(r, [null, 'dexa', 'navy', 'manual', 'x']),
        activityLevel: pick(r, ACTIVITY),
        goal: pick(r, GOALS),
        trainingGoal: pick(r, GOALS),
        proteinApproach: pick(r, APPROACH),
        customProteinGPerKg: pick(r, NASTY),
        experienceLevel: pick(r, EXPERIENCE),
      };
      let out;
      try {
        out = calculateNutritionTargets(inputs);
      } catch (e) {
        failures.push(`THREW on ${JSON.stringify(inputs)}: ${e.message}`);
        continue;
      }
      for (const f of NUMERIC_FIELDS) {
        const v = out[f];
        if (v != null && !Number.isFinite(v)) {
          failures.push(`${f}=${v} not finite for ${JSON.stringify(inputs)}`);
        }
      }
      // Calories must land in a survivable band. The ceiling allows for the
      // clamped maximum human (weight clamped to 350 kg, very-active, bulk);
      // anything beyond means an input poisoned the formula.
      if (!(out.targetKcal >= 800 && out.targetKcal <= 16000)) {
        failures.push(`targetKcal out of band: ${out.targetKcal} for ${JSON.stringify(inputs)}`);
      }
      if (!(out.proteinG >= 0 && out.proteinG <= 1500)) {
        failures.push(`proteinG out of band: ${out.proteinG} for ${JSON.stringify(inputs)}`);
      }
      if (!Array.isArray(out.warnings)) failures.push('warnings not an array');
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  test('computeEWMA tolerates malformed weight arrays', () => {
    const r = rng(7);
    const failures = [];
    for (let i = 0; i < 2000; i++) {
      const n = Math.floor(r() * 6);
      const arr = Array.from({ length: n }, () => ({
        weightKg: pick(r, NASTY),
        loggedAt: pick(r, [Date.now(), pick(r, NASTY)]),
      }));
      const variants = [arr, null, undefined, [], 'x', {}, [null], [{}]];
      const input = pick(r, variants);
      try {
        const out = computeEWMA(input);
        if (out != null && !Array.isArray(out) && !Number.isFinite(out)) {
          // computeEWMA returns an array (nutrition) or value; either is fine,
          // just must not be NaN if a number.
          failures.push(`EWMA returned non-finite scalar ${out}`);
        }
      } catch (e) {
        failures.push(`EWMA threw on ${JSON.stringify(input)}: ${e.message}`);
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  test('runWeeklyCoach never throws and never prints NaN/Infinity in copy', () => {
    const r = rng(99);
    const failures = [];
    const PHASES = ['mild_cut', 'mild_bulk', 'maint', 'bulk', 'aggressive_cut', null, 'x'];
    for (let i = 0; i < 2000; i++) {
      const nW = Math.floor(r() * 16);
      // Plausible weights with non-finite noise mixed in. Absurd magnitudes
      // (e.g. 1e9) are an input-validation concern, weights are clamped where
      // they are logged; here we prove malformed entries are dropped, not that
      // the coach re-validates a physically impossible scale reading.
      const morningWeights = Array.from({ length: nW }, (_, k) => ({
        weightKg: pick(r, [60 + r() * 60, pick(r, [null, undefined, NaN, Infinity, 'abc', {}])]),
        loggedAt: Date.now() - (nW - k) * 86400000,
      }));
      const inputs = {
        checkin: {
          sleepHours: pick(r, NASTY), energyScore: pick(r, NASTY),
          sorenessScore: pick(r, NASTY), jointPain: pick(r, [true, false, null]),
          calsAdherence: pick(r, ['on', 'under', 'over', 'untracked', 'hit', null, 'x']),
          notes: pick(r, ['', 'note', null]),
        },
        morningWeights,
        sessionsCompleted: pick(r, NASTY), sessionsPlanned: pick(r, NASTY),
        prsThisWeek: pick(r, NASTY), goalPhase: pick(r, PHASES),
        weeksInPhase: pick(r, NASTY), currentCalTarget: pick(r, NASTY),
        currentMaintenanceKcal: pick(r, NASTY), bodyweightKg: pick(r, NASTY),
        currentStepsTarget: pick(r, NASTY), sex: pick(r, SEXES),
        recentIntakeAvgKcal: pick(r, NASTY), recentIntakeDaysLogged: pick(r, NASTY),
      };
      let out;
      try {
        out = runWeeklyCoach(inputs);
      } catch (e) {
        failures.push(`coach threw: ${e.message}`);
        continue;
      }
      // U-B-1 §2 invariant: the derived hero `primary` mirrors the existing
      // whyKeys ladder and NEVER promotes an ED-safety state to a hero.
      if (out && out.hasEnoughData) {
        const ALLOWED = [null, 'calories', 'training', 'steps', 'deload', 'dietBreak'];
        if (!out.primary || !ALLOWED.includes(out.primary.domain)) {
          failures.push(`primary.domain invalid: ${JSON.stringify(out.primary)}`);
        } else if ((out.ffmFloorHeld || out.rapidLossCorrectionApplied) && out.primary.domain !== null) {
          failures.push(`safety promoted to hero: domain=${out.primary.domain} ffm=${out.ffmFloorHeld} rapid=${out.rapidLossCorrectionApplied}`);
        } else if (typeof out.primary.reasonKey !== 'string' || out.primary.reasonKey.length === 0) {
          failures.push(`primary.reasonKey not a non-empty string: ${JSON.stringify(out.primary)}`);
        }
      }
      // Walk every string in the output; none may contain the literal tokens
      // String(NaN)/String(Infinity)/String(undefined) would print. Match
      // case-sensitively with word boundaries so the phase label "Maintenance"
      // (which contains a lowercase "nan") is not a false positive.
      const blob = JSON.stringify(out);
      const m = blob.match(/\bNaN\b|\bInfinity\b|\bundefined\b/);
      if (m) {
        const at = blob.indexOf(m[0]);
        failures.push(`coach copy leaked "${m[0]}": ...${blob.slice(Math.max(0, at - 40), at + 20)}...`);
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  test('unit conversions and day keys never produce NaN-bearing output that displays', () => {
    const r = rng(11);
    const failures = [];
    for (let i = 0; i < 3000; i++) {
      try {
        const a = stoneLbsToKg(pick(r, NASTY), pick(r, NASTY));
        const b = parseBodyWeightToKg(pick(r, NASTY), pick(r, ['kg', 'lb', 'st', null]), pick(r, NASTY));
        const c = ftInToCm(pick(r, NASTY), pick(r, NASTY));
        // Conversions may legitimately return null/NaN for junk; the contract we
        // enforce is they do not THROW. Callers guard the value.
        void a; void b; void c;
        const key = localDayKey(pick(r, [Date.now(), pick(r, NASTY)]));
        if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          // localDayKey on a NaN ms gives 'NaN-NaN-NaN'; record it, see note below.
          if (key.includes('NaN')) failures.push(`localDayKey produced ${key}`);
        }
        parseLocalDay(pick(r, ['2026-06-05', '', 'x', null, '2026-13-40']));
      } catch (e) {
        failures.push(`conversion threw: ${e.message}`);
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });
});

// ─── Insights engine robustness ──────────────────────────────────────────────
// generateInsights runs on the Home/Insights surface from raw workout + set
// rows. A null or malformed row (or a null args object) must never crash it.
describe('generateInsights tolerates malformed workout/set rows', () => {
  // eslint-disable-next-line global-require
  const { generateInsights } = require('../insightsEngine');
  const N2 = [null, undefined, NaN, Infinity, -1, 1e9, '5', '', 'abc', true, {}, []];
  const aset = (r) => ({ weight: pick(r, N2), reps: pick(r, N2), actualReps: pick(r, N2), created_at: pick(r, [Date.now(), pick(r, N2)]) });
  test('never throws across 2500 garbage inputs and odd args', () => {
    const r = rng(31);
    const failures = [];
    for (let i = 0; i < 2500; i++) {
      const sets = Array.from({ length: Math.floor(r() * 8) }, () => pick(r, [null, aset(r)]));
      const workouts = Array.from({ length: Math.floor(r() * 5) }, () => pick(r, [null, undefined, {}, {
        id: pick(r, N2), startedAt: pick(r, [Date.now(), pick(r, N2)]),
        isCompleted: pick(r, [true, false, null]), soreness24hBefore: pick(r, N2),
      }]));
      try {
        const out = generateInsights({ workouts, sets, exerciseMap: pick(r, [{}, null]), now: pick(r, [Date.now(), pick(r, N2)]) });
        if (out != null && !Array.isArray(out)) failures.push('not an array');
      } catch (e) { failures.push(`threw: ${e.message}`); }
    }
    for (const a of [undefined, null, {}, 'x', 42, { workouts: 'x', sets: 42 }, { workouts: [null], sets: [null] }]) {
      try { generateInsights(a); } catch (e) { failures.push(`arg threw: ${e.message}`); }
    }
    expect([...new Set(failures)].slice(0, 15)).toEqual([]);
  });
});
