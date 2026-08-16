import fs from 'fs';
import path from 'path';
import {
  VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES,
  muscleDisplayName,
  calculateWeeklyVolume,
  getVolumeStatus,
  detectLaggingMuscles,
  defaultIncrement,
  calculate1RM,
  bestPRPerExercise,
  calculateTonnage,
} from '../algorithms';
// Campaign 20 Phase 2 Stage 12: getProgressionSuggestion and computeSetTargets
// were RETIRED (see algorithms.js's own retirement comment). The unit-aware
// A2-043 law they proved end-to-end now runs through the resolver's
// nextSessionOpeningLoad, migrated below rather than deleted (it is the only
// place any suite exercises the resolver with 'lbs' units end-to-end).
import { nextSessionOpeningLoad } from '../livePrescription';

// ─── VOLUME_LANDMARKS shape ────────────────────────────────────────────────────

describe('VOLUME_LANDMARKS, delt split', () => {
  test('shoulders key is removed', () => {
    expect(VOLUME_LANDMARKS.shoulders).toBeUndefined();
  });

  test('front_delts landmark reflects heavy indirect volume from pressing', () => {
    expect(VOLUME_LANDMARKS.front_delts).toEqual({ mv: 0, mev: 0, mav: 8, mrv: 14 });
  });

  test('side_delts landmark includes mv field and correct MRV', () => {
    expect(VOLUME_LANDMARKS.side_delts).toEqual({ mv: 0, mev: 8, mav: 16, mrv: 26 });
  });

  test('rear_delts landmark exists with unified values', () => {
    expect(VOLUME_LANDMARKS.rear_delts).toEqual({ mv: 0, mev: 6, mav: 16, mrv: 24 });
  });

  test('triceps mrv matches biceps: similar recovery, heavy indirect from pressing', () => {
    expect(VOLUME_LANDMARKS.triceps).toEqual({ mv: 4, mev: 6, mav: 14, mrv: 22 });
  });

  test('forearms ceiling is not pinned right above mav (high-frequency tolerant)', () => {
    expect(VOLUME_LANDMARKS.forearms).toEqual({ mv: 2, mev: 4, mav: 16, mrv: 22 });
  });

  test('traps ceiling reflects high volume tolerance and indirect load', () => {
    expect(VOLUME_LANDMARKS.traps).toEqual({ mv: 0, mev: 4, mav: 14, mrv: 24 });
  });

  test('every muscle keeps the invariant mv <= mev <= mav <= mrv', () => {
    for (const lm of Object.values(VOLUME_LANDMARKS)) {
      expect(lm.mv).toBeLessThanOrEqual(lm.mev);
      expect(lm.mev).toBeLessThanOrEqual(lm.mav);
      expect(lm.mav).toBeLessThanOrEqual(lm.mrv);
      // Guard against another mrv-just-above-mav regression: a real productive
      // band sits between mav and mrv for every trained muscle.
      if (lm.mrv > 0) expect(lm.mrv - lm.mav).toBeGreaterThanOrEqual(2);
    }
  });
});

// ─── MUSCLE_DISPLAY_NAMES ─────────────────────────────────────────────────────

describe('MUSCLE_DISPLAY_NAMES, delt labels (en-GB)', () => {
  test('front_delts label', () => {
    expect(MUSCLE_DISPLAY_NAMES.front_delts).toBe('Front delts');
  });

  test('side_delts label', () => {
    expect(MUSCLE_DISPLAY_NAMES.side_delts).toBe('Side delts');
  });

  test('rear_delts label', () => {
    expect(MUSCLE_DISPLAY_NAMES.rear_delts).toBe('Rear delts');
  });

  test('shoulders key removed from display names', () => {
    expect(MUSCLE_DISPLAY_NAMES.shoulders).toBeUndefined();
  });
});

// ─── getVolumeStatus, acceptance criteria ────────────────────────────────────

describe('getVolumeStatus, delt heads', () => {
  test('4 sets lateral raises → side_delts below min (textMuted)', () => {
    const result = getVolumeStatus(4, 'side_delts');
    expect(result.status).toBe('below');
  });

  test('12 sets → front_delts approaching MRV (near_mrv warning)', () => {
    const result = getVolumeStatus(12, 'front_delts');
    expect(result.status).toBe('near_mrv');
  });

  test('15 sets → front_delts over MRV (over_mrv)', () => {
    const result = getVolumeStatus(15, 'front_delts');
    expect(result.status).toBe('over_mrv');
  });

  test('getVolumeStatus("rear_delt", 14), acceptance criteria: optimal', () => {
    // rear_delts mev:4, mav:16 → 14 sets is within optimal range
    const result = getVolumeStatus(14, 'rear_delts');
    expect(result.status).toBe('optimal');
    // Colour resolution moved to theme.volumeStatusColor (A2-038); the pure
    // algorithm returns only the status string now.
  });

  test('8 sets side_delts → minimum stimulus (at MEV)', () => {
    const result = getVolumeStatus(8, 'side_delts');
    expect(result.status).toBe('minimum');
  });

  test('27 sets side_delts → over MRV', () => {
    const result = getVolumeStatus(27, 'side_delts');
    expect(result.status).toBe('over_mrv');
  });

  test('0 sets front_delts → below (zero-work short-circuit overrides mev=0)', () => {
    // front_delts.mev is 0 because pressing movements provide plenty of
    // indirect volume, but zero LOGGED sets shouldn't render green on
    // the heatmap. The zero-work short-circuit in getVolumeStatus catches
    // this case before the mev comparison.
    const result = getVolumeStatus(0, 'front_delts');
    expect(result.status).toBe('below');
  });
});

// ─── calculateWeeklyVolume, legacy 'shoulders' normalisation ─────────────────

describe('calculateWeeklyVolume, legacy normalisation', () => {
  const makeSet = (exerciseId) => ({
    exerciseId,
    set_type: 'straight',
    weight: 80,
    actual_reps: 10,
    actualReps: 10,
  });

  test('exercise with primary_muscle "shoulders" → counts toward side_delts', () => {
    const sets = [makeSet('ex1'), makeSet('ex1'), makeSet('ex1')];
    const exerciseMap = {
      ex1: { primary_muscle: 'shoulders', secondary_muscles: '[]' },
    };
    const result = calculateWeeklyVolume(sets, exerciseMap);
    expect(result.side_delts).toBeDefined();
    expect(result.side_delts.workingSets).toBe(3);
    expect(result.shoulders).toBeUndefined();
  });

  test('exercise with primary_muscle "side_delts" → counts directly', () => {
    const sets = [makeSet('ex2'), makeSet('ex2')];
    const exerciseMap = {
      ex2: { primary_muscle: 'side_delts', secondary_muscles: '[]' },
    };
    const result = calculateWeeklyVolume(sets, exerciseMap);
    expect(result.side_delts?.workingSets).toBe(2);
  });

  test('exercise with secondary muscle "shoulders" → counts toward front_delts (secondary normalisation)', () => {
    const sets = [makeSet('ex3')];
    const exerciseMap = {
      ex3: { primary_muscle: 'chest', secondary_muscles: '["shoulders"]' },
    };
    const result = calculateWeeklyVolume(sets, exerciseMap);
    expect(result.front_delts).toBeDefined();
    expect(result.front_delts.workingSets).toBe(0.5);
    expect(result.chest?.workingSets).toBe(1);
  });

  test('mixed workout: lateral raise (side_delts) + OHP (front_delts) + rear fly (rear_delts)', () => {
    const sets = [
      makeSet('lateral'), makeSet('lateral'), makeSet('lateral'),
      makeSet('ohp'), makeSet('ohp'), makeSet('ohp'),
      makeSet('rearfly'), makeSet('rearfly'), makeSet('rearfly'),
    ];
    const exerciseMap = {
      lateral: { primary_muscle: 'side_delts', secondary_muscles: '[]' },
      ohp:     { primary_muscle: 'front_delts', secondary_muscles: '["triceps","side_delts"]' },
      rearfly: { primary_muscle: 'rear_delts', secondary_muscles: '["back"]' },
    };
    const result = calculateWeeklyVolume(sets, exerciseMap);
    // 3 direct + 3 × 0.5 secondary from OHP = 4.5
    expect(result.side_delts.workingSets).toBeCloseTo(4.5);
    expect(result.front_delts.workingSets).toBe(3);
    expect(result.rear_delts.workingSets).toBe(3);
  });
});

// Defensive parse, the algorithm should survive bad JSON in
// exercise.secondary_muscles instead of aborting the whole calc.
describe('calculateWeeklyVolume, malformed secondary_muscles', () => {
  const makeSet = (id) => ({
    exerciseId: id,
    set_type: 'straight',
    weight: 80,
    actual_reps: 10,
    actualReps: 10,
  });

  test('non-JSON secondary_muscles string does not throw', () => {
    const exerciseMap = {
      ex1: { primary_muscle: 'chest', secondary_muscles: 'not-json-{{{' },
    };
    expect(() => calculateWeeklyVolume([makeSet('ex1')], exerciseMap)).not.toThrow();
    const result = calculateWeeklyVolume([makeSet('ex1')], exerciseMap);
    expect(result.chest).toBeDefined();
  });

  test('null secondary_muscles falls back to empty array', () => {
    const exerciseMap = {
      ex1: { primary_muscle: 'chest', secondary_muscles: null },
    };
    expect(() => calculateWeeklyVolume([makeSet('ex1')], exerciseMap)).not.toThrow();
  });
});

// ─── detectLaggingMuscles ──────────────────────────────────────────────────────

describe('detectLaggingMuscles', () => {
  test('returns empty array when fewer than minWeeks data points', () => {
    const history = [{ chest: 2 }, { chest: 2 }]; // only 2 weeks, minWeeks=3
    expect(detectLaggingMuscles(history, 3)).toHaveLength(0);
  });

  test('flags chest when consistently below MEV (6) for 3 weeks', () => {
    const history = [{ chest: 3 }, { chest: 2 }, { chest: 4 }];
    const result = detectLaggingMuscles(history, 3);
    const chestFlag = result.find(r => r.muscle === 'chest');
    expect(chestFlag).toBeDefined();
    expect(chestFlag.weeksBelow).toBe(3);
    expect(chestFlag.mev).toBe(6);
  });

  test('does not flag chest when it reaches MEV in one week', () => {
    const history = [{ chest: 3 }, { chest: 8 }, { chest: 3 }]; // week 2 above MEV
    const result = detectLaggingMuscles(history, 3);
    const chestFlag = result.find(r => r.muscle === 'chest');
    expect(chestFlag).toBeUndefined();
  });

  test('skips muscles with mev <= 0 (e.g. front_delts)', () => {
    const history = [{ front_delts: 0 }, { front_delts: 0 }, { front_delts: 0 }];
    const result = detectLaggingMuscles(history, 3);
    const flag = result.find(r => r.muscle === 'front_delts');
    expect(flag).toBeUndefined();
  });
});

// ─── A2-043: unit-aware gym-weight maths ──────────────────────────────────────
// Gym weight is stored in the display unit (kg|lbs) and never converted, so the
// progression jumps, plate sets and bar weights must follow that unit. Before
// the fix these were all kg-hardcoded and only the label changed.

describe('defaultIncrement, unit-aware load steps', () => {
  test('kg compound: 2.5 above 60kg, 1.25 below', () => {
    expect(defaultIncrement(80, 'kg', 'compound')).toBe(2.5);
    expect(defaultIncrement(40, 'kg', 'compound')).toBe(1.25);
  });

  test('lbs compound: 5 above 135lb, 2.5 below (not kg-sized)', () => {
    expect(defaultIncrement(185, 'lbs', 'compound')).toBe(5);
    expect(defaultIncrement(95, 'lbs', 'compound')).toBe(2.5);
  });

  test('isolation and accessory steps are smaller and unit-aware', () => {
    expect(defaultIncrement(25, 'kg', 'isolation')).toBe(1);
    expect(defaultIncrement(10, 'kg', 'isolation')).toBe(0.5);
    expect(defaultIncrement(50, 'lbs', 'isolation')).toBe(2.5);
    expect(defaultIncrement(20, 'lbs', 'isolation')).toBe(1.25);
  });

  test('defaults to kg compound', () => {
    expect(defaultIncrement(80)).toBe(2.5);
  });
});

// getProgressionSuggestion RETIRED (Campaign 20 Phase 2 Stage 12): its
// CALC-5 bodyweight pin is migrated onto the resolver at
// livePrescription.test.js's "CALC-5 / FR-C4-4" describe (see also the
// "numeric edge cases" describe below, whose own CALC-5 test is deleted for
// the same reason); its other unit-increment coverage duplicates
// defaultIncrement's own describe above and the migrated describe below.

// computeSetTargets RETIRED (Campaign 20 Phase 2 Stage 12). Its three
// former describes here:
//   - "unit-aware increments (A2-043)": the only suite anywhere that proves
//     the resolver's increment maths is unit-aware (lbs vs kg) through the
//     FULL top-of-band advance path, not just defaultIncrement in isolation
//     - migrated below onto nextSessionOpeningLoad, not deleted.
//   - "layoff reduction is the final invariant (LS-04/H-13)": genuinely
//     duplicated - the same law is pinned at livePrescription.test.js's
//     "§10.5 layoff" describe and livePrescription.scenarios.test.js's
//     scenario 32 ("Layoff 10 days - MUST skip advance/anchor logic
//     (LS-04)") - deleted, not migrated.
//   - "the anchor pass honours the 5% cap at low load (LS-05)": the
//     per-ordinal-set "anchor pass" this pinned no longer exists in the new
//     architecture (design §3 authority #1: the flat per-set anchor-to-
//     session-best pass is AMENDED away entirely, replaced by the back-off-
//     aware structure detection in §13.1 - there is no longer a second
//     "raise every lighter set to the session max" pass to cap). The
//     underlying invariant LS-05 actually protects - the 5% cap is NEVER
//     disabled at low load - is unconditionally true for every resolver
//     caller because resolveLoadIncrement is the one increment source
//     everywhere (§10.2, pinned at livePrescription.test.js: "a tiny 5% cap
//     still floors at +0.25") - deleted, not migrated.

describe('nextSessionOpeningLoad (resolver), unit-aware increments (A2-043, migrated from computeSetTargets)', () => {
  const BAND = { min: 8, max: 12 };
  // A topped, comparable, effort-corroborated (difficulty 2) single-session
  // history - the minimal shape that reaches the ADVANCE gate.
  const session = (weight, reps) => ({ at: 1, difficulty: 2, band: BAND, working: [{ pos: 1, weight, reps, setType: 'straight' }] });

  test('lbs compound adds 5lb at the top of the range', () => {
    const out = nextSessionOpeningLoad([session(185, 12)], BAND, { units: 'lbs', category: 'compound' });
    expect(out.weight).toBe(190);
  });

  test('kg compound adds 2.5kg', () => {
    const out = nextSessionOpeningLoad([session(80, 12)], BAND, { units: 'kg', category: 'compound' });
    expect(out.weight).toBe(82.5);
  });

  test('explicit incrementKg still overrides the unit default', () => {
    const out = nextSessionOpeningLoad([session(185, 12)], BAND, { units: 'lbs', category: 'compound', incrementKg: 2 });
    expect(out.weight).toBe(187);
  });
});

describe('calculate1RM, high-rep guard (A2-040)', () => {
  test('1-20 reps behaviour is unchanged', () => {
    // Single rep returns the weight; low reps use the Epley/Brzycki blend.
    expect(calculate1RM(100, 1)).toBe(100);
    expect(calculate1RM(100, 5)).toBeCloseTo(115.0, 1);
    expect(calculate1RM(100, 10)).toBeCloseTo(133.35, 1);
  });

  test('above 20 reps plateaus at the 20-rep estimate instead of exploding', () => {
    const at20 = calculate1RM(100, 20);
    expect(calculate1RM(100, 25)).toBeCloseTo(at20, 5);
    expect(calculate1RM(100, 30)).toBeCloseTo(at20, 5);
    expect(calculate1RM(100, 50)).toBeCloseTo(at20, 5);
  });

  test('a 30-rep set no longer estimates a runaway 1RM', () => {
    // Old code returned pure Brzycki here (~516 for 100kg x 30). Now bounded.
    expect(calculate1RM(100, 30)).toBeLessThan(220);
  });

  test('estimate is monotonic non-decreasing in reps and always finite', () => {
    let prev = 0;
    for (let reps = 1; reps <= 60; reps++) {
      const v = calculate1RM(100, reps);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
});

// WK-2: the finish flow summarises the workout's actual DB sets so that sets
// logged on an exercise later swapped out or removed still count. This helper
// is the pure core of that calc.
describe('summariseWorkoutSets', () => {
  const { summariseWorkoutSets } = require('../algorithms');

  test('counts every set as totalSets but excludes warm-ups from workingSetCount', () => {
    const sets = [
      { setType: 'warmup', weight: 40, actualReps: 10 },
      { setType: 'straight', weight: 100, actualReps: 8 },
      { setType: 'straight', weight: 100, actualReps: 8 },
    ];
    const { totalSets, workingSetCount } = summariseWorkoutSets(sets);
    expect(totalSets).toBe(3);
    expect(workingSetCount).toBe(2);
  });

  test('tonnage excludes warm-ups; dropsets count (matches calculateTonnage/isHardSet)', () => {
    const sets = [
      { setType: 'warmup', weight: 40, actualReps: 10 },   // excluded from tonnage + workingSetCount
      { setType: 'straight', weight: 100, actualReps: 8 },  // 800
      { setType: 'dropset', weight: 50, actualReps: 12 },   // 600 (isHardSet only excludes warm-ups)
    ];
    const { totalSets, workingSetCount, tonnage } = summariseWorkoutSets(sets);
    expect(totalSets).toBe(3);
    expect(workingSetCount).toBe(2); // straight + dropset (only warm-up excluded)
    expect(tonnage).toBe(1400);
  });

  test('reads snake_case set_type from raw DB rows', () => {
    const dbRows = [
      { set_type: 'warmup', weight: 40, actual_reps: 10 },
      { set_type: 'straight', weight: 100, actual_reps: 8 },
    ];
    const { totalSets, workingSetCount, tonnage } = summariseWorkoutSets(dbRows);
    expect(totalSets).toBe(2);
    expect(workingSetCount).toBe(1);
    expect(tonnage).toBe(800);
  });

  test('empty or non-array input yields zeros', () => {
    expect(summariseWorkoutSets([])).toEqual({ totalSets: 0, workingSetCount: 0, tonnage: 0 });
    expect(summariseWorkoutSets(null)).toEqual({ totalSets: 0, workingSetCount: 0, tonnage: 0 });
  });
});

// ─── calculateTonnage: exercise_type exclusions ────────────────────────────────
//
// 'distance'/'duration' sets reuse the weight column for metres/seconds, so
// weight × reps for those is NOT load. With an exerciseTypeById map they must be
// excluded; without a map, behaviour is byte-identical (everything counts).

describe('calculateTonnage excludes non-load exercise types', () => {
  test('a distance set (metres in weight) does NOT inflate tonnage', () => {
    const sets = [
      { exerciseId: 'bench', weight: 100, actualReps: 8 },   // 800 real load
      { exerciseId: 'run',   weight: 5000, actualReps: 1200 }, // 5000 m × 1200 s = garbage
    ];
    const typeMap = { bench: 'weight_reps', run: 'distance' };
    // Distance set dropped; only the bench press counts.
    expect(calculateTonnage(sets, typeMap)).toBe(800);
  });

  test('a duration set (seconds in reps) does NOT inflate tonnage', () => {
    const sets = [
      { exerciseId: 'squat', weight: 120, actualReps: 5 }, // 600 real load
      { exerciseId: 'plank', weight: 0, actualReps: 90 },  // duration: 90 s, weight 0
      { exerciseId: 'wallsit', weight: 30, actualReps: 60 }, // duration w/ stray weight → must drop
    ];
    const typeMap = { squat: 'weight_reps', plank: 'duration', wallsit: 'duration' };
    expect(calculateTonnage(sets, typeMap)).toBe(600);
  });

  test('weight_reps and weighted_bodyweight count; reps_only contributes 0', () => {
    const sets = [
      { exerciseId: 'row',    weight: 80, actualReps: 10 }, // 800
      { exerciseId: 'wpullup', weight: 20, actualReps: 6 }, // weighted_bodyweight → 120
      { exerciseId: 'pushup', weight: 0, actualReps: 25 },  // reps_only → 0
    ];
    const typeMap = { row: 'weight_reps', wpullup: 'weighted_bodyweight', pushup: 'reps_only' };
    expect(calculateTonnage(sets, typeMap)).toBe(920);
  });

  test('weight_reps behaviour is unchanged: no map, or unknown type, still counts', () => {
    const sets = [
      { setType: 'warmup', weight: 40, actualReps: 10 }, // excluded (warm-up)
      { exerciseId: 'bench', weight: 100, actualReps: 8 }, // 800
      { weight: 50, actual_reps: 12 },                     // snake_case, no id → 600
    ];
    // No map → identical to legacy behaviour.
    expect(calculateTonnage(sets)).toBe(1400);
    // Map with no matching ids → unknown defaults to weight_reps (counted).
    expect(calculateTonnage(sets, { somethingElse: 'distance' })).toBe(1400);
  });
});

// CALC-2/4/6/7: numeric edge-case hardening. CALC-5 (bodyweight/all-zero
// history never suggests a weight increase) moved with getProgressionSuggestion's
// retirement (Campaign 20 Phase 2 Stage 12) - now pinned at
// livePrescription.test.js's "CALC-5 / FR-C4-4" describe, against the
// resolver's own reps_only/zero-weight law, not a standalone function.
describe('numeric edge cases (CALC-2/4/6/7)', () => {
  const {
    calculate1RM, getVolumeStatus,
    generateDeloadPrescription,
  } = require('../algorithms');

  test('CALC-2: calculate1RM is finite for non-numeric reps and weight', () => {
    expect(calculate1RM(100, 'abc')).toBe(100); // valid weight, non-numeric reps -> weight
    expect(calculate1RM(NaN, 5)).toBe(0);
    // A NUMERIC string still computes (must equal the numeric form), it isn't
    // wrongly collapsed to the weight.
    expect(calculate1RM(100, '5')).toBeCloseTo(calculate1RM(100, 5), 5);
    expect(calculate1RM(100, '5')).toBeGreaterThan(100);
    expect(calculate1RM('100', 5)).toBeCloseTo(calculate1RM(100, 5), 5);
  });

  test('CALC-4: getVolumeStatus(NaN) is not "over_mrv"', () => {
    const s = getVolumeStatus(NaN, 'chest');
    expect(s.status).not.toBe('over_mrv');
  });

  test('CALC-6: generateDeloadPrescription never prescribes a negative load', () => {
    const out = generateDeloadPrescription([{ weight: -50, actualReps: 5, setType: 'straight' }], false);
    expect(out[0].weight).toBeGreaterThanOrEqual(0);
  });
});

describe('bestPRPerExercise (one PR per exercise per session)', () => {
  test('collapses the three PR types from one exercise to a single PR, keeping the 1RM', () => {
    const out = bestPRPerExercise([
      { exerciseId: 'bench', type: '1rm_estimate', value: 110 },
      { exerciseId: 'bench', type: 'heaviest_weight', value: 100 },
      { exerciseId: 'bench', type: 'most_reps_at_weight', value: 8 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('1rm_estimate');
  });

  test('keeps one PR per exercise and preserves first-seen order', () => {
    const out = bestPRPerExercise([
      { exerciseId: 'squat', type: 'heaviest_weight', value: 140 },
      { exerciseId: 'bench', type: '1rm_estimate', value: 110 },
      { exerciseId: 'squat', type: '1rm_estimate', value: 180 },
    ]);
    expect(out.map(p => p.exerciseId)).toEqual(['squat', 'bench']);
    expect(out.find(p => p.exerciseId === 'squat').type).toBe('1rm_estimate');
  });

  test('within a type, the larger value (a better later set) wins', () => {
    const out = bestPRPerExercise([
      { exerciseId: 'ohp', type: '1rm_estimate', value: 60 },
      { exerciseId: 'ohp', type: '1rm_estimate', value: 65 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe(65);
  });

  test('a six-exercise session of many raw PRs collapses to six', () => {
    const raw = [];
    for (let i = 0; i < 6; i++) {
      for (const t of ['1rm_estimate', 'heaviest_weight', 'most_reps_at_weight']) {
        raw.push({ exerciseId: `ex${i}`, type: t, value: 100 + i });
        raw.push({ exerciseId: `ex${i}`, type: t, value: 105 + i }); // a better later set
      }
    }
    expect(raw.length).toBeGreaterThan(20);
    expect(bestPRPerExercise(raw)).toHaveLength(6);
  });

  test('falls back to exerciseName and tolerates empty/invalid input', () => {
    expect(bestPRPerExercise([])).toEqual([]);
    expect(bestPRPerExercise(null)).toEqual([]);
    const out = bestPRPerExercise([
      { exerciseName: 'Curl', type: 'heaviest_weight', value: 20 },
      { exerciseName: 'Curl', type: 'most_reps_at_weight', value: 12 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('heaviest_weight');
  });
});

// ─── muscleDisplayName (D95, AUDIT-DUPLICATES D-4) ─────────────────────────────
//
// interBlock.js, blockExplain.js and divisionDiff.js each carried a private
// copy of this body. They are reproduced VERBATIM below as fixtures so the
// consolidation is provably output-preserving rather than merely plausible.
//
// Premise note, recorded because the audit's T-4.1 assumed otherwise: the three
// bodies agreed on every real muscle key but NOT on an empty/nullish key, where
// they returned 'Muscle', '' and a throw respectively. No call site can reach
// that input (interBlock already guarded it, blockExplain's keys come from
// Object.entries and a truthy filter, divisionDiff's from an internally-built
// diff), and the shared helper takes the most defensive of the three, so the
// equivalence fixture below covers the whole reachable key domain.

// interBlock.js:109-115 (deleted)
function fixtureInterBlock(muscleKey) {
  const key = String(muscleKey || 'muscle');
  const known = MUSCLE_DISPLAY_NAMES[key];
  if (known) return known;
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// blockExplain.js:35-40 (deleted)
const fixtureBlockExplain = (key) => {
  const known = MUSCLE_DISPLAY_NAMES[String(key)];
  if (known) return known;
  const spaced = String(key ?? '').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

// divisionDiff.js:138-139 (deleted) — capitalise-then-replace
const fixtureDivisionDiff = (m) => MUSCLE_DISPLAY_NAMES[m]
  ?? m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ');

describe('D-4: one muscleDisplayName, three converged call sites', () => {
  const REACHABLE_KEYS = [
    ...Object.keys(MUSCLE_DISPLAY_NAMES),
    'shoulders',        // normalised away before any lookup, but legal input
    'made_up_muscle',   // a custom_exercises primary_muscle from a foreign client
    'x',
  ];

  test.each(REACHABLE_KEYS)('%s: matches all three deleted implementations', (key) => {
    expect(muscleDisplayName(key)).toBe(fixtureInterBlock(key));
    expect(muscleDisplayName(key)).toBe(fixtureBlockExplain(key));
    expect(muscleDisplayName(key)).toBe(fixtureDivisionDiff(key));
  });

  test('an unknown key is humanised, never leaked raw', () => {
    expect(muscleDisplayName('rear_delts_extra')).toBe('Rear delts extra');
    expect(muscleDisplayName('made_up_muscle')).not.toContain('_');
  });

  test('a missing key falls back to the calm generic word, and never throws', () => {
    for (const bad of [null, undefined, '', 0]) {
      expect(muscleDisplayName(bad)).toBe('Muscle');
    }
  });

  // T-4.2: the invariant that makes the humanising fallback unreachable in
  // normal operation. If a landmark gains a muscle without a display name, the
  // heatmap and every coaching line start speaking snake_case.
  test('every landmark muscle has a display name, and vice versa', () => {
    expect(Object.keys(MUSCLE_DISPLAY_NAMES)).toEqual(Object.keys(VOLUME_LANDMARKS));
  });

  test('source guard: no module keeps a private copy of the body', () => {
    for (const rel of ['../interBlock.js', '../blockExplain.js', '../divisionDiff.js']) {
      const source = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      expect(source).not.toMatch(/charAt\(0\)\.toUpperCase\(\)/);
      expect(source).toMatch(/muscleDisplayName/);
    }
  });
});
