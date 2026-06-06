import {
  VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES,
  calculateWeeklyVolume,
  getVolumeStatus,
  detectLaggingMuscles,
  defaultIncrement,
  getProgressionSuggestion,
  computeSetTargets,
  calculatePlates,
  PLATE_SETS,
  DEFAULT_BAR_WEIGHT,
  calculate1RM,
  bestPRPerExercise,
} from '../algorithms';

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

// ─── calculateEffectiveSets, RIR/RPE math ─────────────────────────────────
//
// Locks in the operator-precedence fix on line 965 (was 950 before edit).
// The old code was:
//   getSetEffectivenessWeight(set.rir ?? set.rpe != null ? 10 - set.rpe : null)
// which parsed as (set.rir ?? (set.rpe != null)) ? 10 - set.rpe : null
// any non-null rir>0 evaluated 10 - rpe (NaN when rpe was null), rir===0
// returned null, and effective-volume was silently corrupted.

describe('calculateEffectiveSets, RIR/RPE precedence fix', () => {
  // Need access to the function, import it.
  // eslint-disable-next-line global-require
  const { calculateEffectiveSets, getSetEffectivenessWeight } = require('../algorithms');

  const makeSetWith = (props) => ({
    exerciseId: 'ex1',
    setType: 'straight',
    weight: 80,
    actualReps: 10,
    ...props,
  });

  test('set with rir=2 and no rpe produces a numeric effectiveSets', () => {
    const exerciseMap = { ex1: { primary_muscle: 'chest', secondary_muscles: '[]' } };
    const result = calculateEffectiveSets([makeSetWith({ rir: 2 })], exerciseMap);
    expect(result.chest).toBeDefined();
    expect(result.chest.workingSets).toBe(1);
    expect(Number.isFinite(result.chest.effectiveSets)).toBe(true);
    expect(result.chest.effectiveSets).toBeGreaterThan(0);
    // RIR 2 → full credit (weight 1.0)
    expect(result.chest.effectiveSets).toBeCloseTo(1.0, 3);
  });

  test('set with rir=0 (failure set) gets full effective credit', () => {
    const exerciseMap = { ex1: { primary_muscle: 'chest', secondary_muscles: '[]' } };
    const result = calculateEffectiveSets([makeSetWith({ rir: 0 })], exerciseMap);
    expect(result.chest.workingSets).toBe(1);
    expect(Number.isFinite(result.chest.effectiveSets)).toBe(true);
    expect(result.chest.effectiveSets).toBeCloseTo(1.0, 3);
  });

  test('set with rpe=8 (no rir) translates to rir=2 internally → full credit', () => {
    const exerciseMap = { ex1: { primary_muscle: 'chest', secondary_muscles: '[]' } };
    const rirOnly = calculateEffectiveSets([makeSetWith({ rir: 2 })], exerciseMap);
    const rpeOnly = calculateEffectiveSets([makeSetWith({ rpe: 8 })], exerciseMap);
    expect(rpeOnly.chest.effectiveSets).toBeCloseTo(rirOnly.chest.effectiveSets, 3);
  });

  test('set with neither rir nor rpe still computes (null → 0.9 default weight)', () => {
    const exerciseMap = { ex1: { primary_muscle: 'chest', secondary_muscles: '[]' } };
    const result = calculateEffectiveSets([makeSetWith({})], exerciseMap);
    expect(result.chest.workingSets).toBe(1);
    expect(Number.isFinite(result.chest.effectiveSets)).toBe(true);
    // null RIR → treated as ~RIR 2 (conservative) → 0.9 weight
    expect(result.chest.effectiveSets).toBeCloseTo(0.9, 3);
  });

  test('high RIR (5+) reduces effective credit', () => {
    const exerciseMap = { ex1: { primary_muscle: 'chest', secondary_muscles: '[]' } };
    const lowRIR = calculateEffectiveSets([makeSetWith({ rir: 1 })], exerciseMap);
    const highRIR = calculateEffectiveSets([makeSetWith({ rir: 5 })], exerciseMap);
    expect(highRIR.chest.effectiveSets).toBeLessThan(lowRIR.chest.effectiveSets);
  });

  test('getSetEffectivenessWeight returns expected values for known RIR', () => {
    expect(getSetEffectivenessWeight(0)).toBe(1.0);
    expect(getSetEffectivenessWeight(2)).toBe(1.0);
    expect(getSetEffectivenessWeight(3)).toBe(0.85);
    expect(getSetEffectivenessWeight(5)).toBe(0.5);
    expect(getSetEffectivenessWeight(8)).toBe(0.0);
    expect(getSetEffectivenessWeight(null)).toBe(0.9); // conservative null default
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

describe('getProgressionSuggestion, unit-aware increments (A2-043)', () => {
  const prev = (weight) => [{ weight, actualReps: 12, rir: 2, set_type: 'straight' }];

  test('kg: heavy lift jumps 2.5kg, light lift 1.25kg', () => {
    expect(getProgressionSuggestion(null, prev(80), 8, 12, 'kg').suggestedWeight).toBe(82.5);
    expect(getProgressionSuggestion(null, prev(40), 8, 12, 'kg').suggestedWeight).toBe(41.25);
  });

  test('lbs: heavy lift jumps 5lb, light lift 2.5lb', () => {
    expect(getProgressionSuggestion(null, prev(185), 8, 12, 'lbs').suggestedWeight).toBe(190);
    expect(getProgressionSuggestion(null, prev(95), 8, 12, 'lbs').suggestedWeight).toBe(97.5);
  });

  test('message carries the display-unit label', () => {
    expect(getProgressionSuggestion(null, prev(185), 8, 12, 'lbs').message).toContain('lbs');
  });
});

describe('computeSetTargets, unit-aware increments (A2-043)', () => {
  const prev = (weight) => [{ weight, actualReps: 12, rir: 2, set_type: 'straight' }];

  test('lbs compound adds 5lb at the top of the range', () => {
    const { targets } = computeSetTargets(prev(185), 8, 12, 'lbs', { exerciseCategory: 'compound' });
    expect(targets[0].weight).toBe(190);
  });

  test('kg compound adds 2.5kg', () => {
    const { targets } = computeSetTargets(prev(80), 8, 12, 'kg', { exerciseCategory: 'compound' });
    expect(targets[0].weight).toBe(82.5);
  });

  test('explicit incrementKg still overrides the unit default', () => {
    const { targets } = computeSetTargets(prev(185), 8, 12, 'lbs', { exerciseCategory: 'compound', incrementKg: 2 });
    expect(targets[0].weight).toBe(187);
  });
});

describe('plate sets and bar weights (A2-043)', () => {
  test('lbs plate set uses real lb denominations, kg uses kg', () => {
    expect(PLATE_SETS.lbs).toEqual([45, 35, 25, 10, 5, 2.5]);
    expect(PLATE_SETS.kg).toEqual([25, 20, 15, 10, 5, 2.5, 1.25]);
  });

  test('default bars are 20kg and 45lb', () => {
    expect(DEFAULT_BAR_WEIGHT.kg).toBe(20);
    expect(DEFAULT_BAR_WEIGHT.lbs).toBe(45);
  });

  test('225lb on a 45lb bar is 45+45 each side', () => {
    const { plates, totalWeight } = calculatePlates(225, 45, PLATE_SETS.lbs);
    expect(plates).toEqual([45, 45]);
    expect(totalWeight).toBe(225);
  });

  test('100kg on a 20kg bar is 25+15 each side', () => {
    const { plates, totalWeight } = calculatePlates(100, 20, PLATE_SETS.kg);
    expect(plates).toEqual([25, 15]);
    expect(totalWeight).toBe(100);
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

// CALC-2/4/5/6/7: numeric edge-case hardening.
describe('numeric edge cases (CALC-2/4/5/6/7)', () => {
  const {
    calculate1RM, getVolumeStatus, getProgressionSuggestion,
    generateDeloadPrescription, calculatePlates,
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

  test('CALC-5: bodyweight (all-zero) history does not suggest a weight increase', () => {
    const prev = [
      { weight: 0, actualReps: 15, rir: 3 },
      { weight: 0, actualReps: 15, rir: 3 },
    ];
    const s = getProgressionSuggestion(prev, prev, 8, 12, 'kg');
    expect(s.action).not.toBe('increase_weight');
    expect(s.message).not.toMatch(/kg/);
  });

  test('CALC-6: generateDeloadPrescription never prescribes a negative load', () => {
    const out = generateDeloadPrescription([{ weight: -50, actualReps: 5, setType: 'straight' }], false);
    expect(out[0].weight).toBeGreaterThanOrEqual(0);
  });

  test('CALC-7: calculatePlates terminates when availablePlates contains 0', () => {
    const res = calculatePlates(100, 20, [25, 0, 5]);
    expect(Array.isArray(res.plates)).toBe(true); // returned, did not hang
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
