import {
  VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES,
  calculateWeeklyVolume,
  getVolumeStatus,
  detectLaggingMuscles,
} from '../algorithms';

// ─── VOLUME_LANDMARKS shape ────────────────────────────────────────────────────

describe('VOLUME_LANDMARKS — delt split', () => {
  test('shoulders key is removed', () => {
    expect(VOLUME_LANDMARKS.shoulders).toBeUndefined();
  });

  test('front_delts landmark exists and is conservative (gets indirect volume from pressing)', () => {
    expect(VOLUME_LANDMARKS.front_delts).toEqual({ mv: 0, mev: 0, mav: 6, mrv: 12 });
  });

  test('side_delts landmark includes mv field and correct MRV', () => {
    expect(VOLUME_LANDMARKS.side_delts).toEqual({ mv: 0, mev: 8, mav: 16, mrv: 26 });
  });

  test('rear_delts landmark exists with unified values', () => {
    expect(VOLUME_LANDMARKS.rear_delts).toEqual({ mv: 0, mev: 6, mav: 14, mrv: 22 });
  });
});

// ─── MUSCLE_DISPLAY_NAMES ─────────────────────────────────────────────────────

describe('MUSCLE_DISPLAY_NAMES — delt labels (en-GB)', () => {
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

// ─── getVolumeStatus — acceptance criteria ────────────────────────────────────

describe('getVolumeStatus — delt heads', () => {
  test('4 sets lateral raises → side_delts below min (textMuted)', () => {
    const result = getVolumeStatus(4, 'side_delts');
    expect(result.status).toBe('below');
  });

  test('12 sets overhead press → front_delts at MRV (near_mrv warning)', () => {
    const result = getVolumeStatus(12, 'front_delts');
    expect(result.status).toBe('near_mrv');
  });

  test('13 sets overhead press → front_delts over MRV (over_mrv)', () => {
    const result = getVolumeStatus(13, 'front_delts');
    expect(result.status).toBe('over_mrv');
  });

  test('getVolumeStatus("rear_delt", 14) — acceptance criteria: optimal', () => {
    // rear_delts mev:4, mav:16 → 14 sets is within optimal range
    const result = getVolumeStatus(14, 'rear_delts');
    expect(result.status).toBe('optimal');
    expect(result.color).toBe('#00C853');
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
    // indirect volume — but zero LOGGED sets shouldn't render green on
    // the heatmap. The zero-work short-circuit in getVolumeStatus catches
    // this case before the mev comparison.
    const result = getVolumeStatus(0, 'front_delts');
    expect(result.status).toBe('below');
  });
});

// ─── calculateWeeklyVolume — legacy 'shoulders' normalisation ─────────────────

describe('calculateWeeklyVolume — legacy normalisation', () => {
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

// ─── calculateEffectiveSets — RIR/RPE math ─────────────────────────────────
//
// Locks in the operator-precedence fix on line 965 (was 950 before edit).
// The old code was:
//   getSetEffectivenessWeight(set.rir ?? set.rpe != null ? 10 - set.rpe : null)
// which parsed as (set.rir ?? (set.rpe != null)) ? 10 - set.rpe : null —
// any non-null rir>0 evaluated 10 - rpe (NaN when rpe was null), rir===0
// returned null, and effective-volume was silently corrupted.

describe('calculateEffectiveSets — RIR/RPE precedence fix', () => {
  // Need access to the function — import it.
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

// Defensive parse — the algorithm should survive bad JSON in
// exercise.secondary_muscles instead of aborting the whole calc.
describe('calculateWeeklyVolume — malformed secondary_muscles', () => {
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
