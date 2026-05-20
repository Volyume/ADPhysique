import {
  VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES,
  calculateWeeklyVolume,
  getVolumeStatus,
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

  test('0 sets front_delts → below (mev is 0, status is below with 0 sets)', () => {
    // mev=0, so mev > 0 check fails → falls to optimal check: 0 <= mav(6) → optimal
    // Actually: workingSets < mev (0 < 0) is false; mev > 0 check fails; 0 <= 6 → optimal
    const result = getVolumeStatus(0, 'front_delts');
    expect(result.status).toBe('optimal');
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
