/**
 * recoveryClocks.d219.test.js -- register D219, lane B3a. Design:
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md section
 * 4.13 ("The recovery model, corrected where the evidence says so") and the
 * founder's answer to section 12 Q3 (the legs' clocks, "Re-centre 54h / 60h").
 * Evidence: 03-SCIENCE.md Q5, Q5b (Table 2, Table 3) and F5; 02-CODE-MAP-
 * RECOVERY.md section 1.
 *
 * Pins, each written to FAIL on the D201 constants:
 *  - the lower-body clocks re-centred (Q3 = A): quads and glutes 54 h,
 *    hamstrings 60 h, every other muscle unchanged, so biceps (48) still
 *    recovers sooner than back (60), the founder's own example;
 *  - the effort ladder: RIR 0 1.25, RIR 1 1.10, RIR 2 1.00, RIR 3 or more
 *    0.80 (the D201 spread of 10 to 15% was far narrower than the measured
 *    failure versus non-failure gap), the absent-target guard unchanged;
 *  - the first-week factor is gone (the repeated-bout effect is specific to
 *    the exercise, not to week 1 of a block): `firstWeek` no longer moves a
 *    clock, and `novel` (1.15) takes its place;
 *  - the long-length factor (1 + 0.10 x the share of direct sets), the
 *    mostly-indirect factor (0.85) and the band helper (plus or minus 25%
 *    inside the 24 to 168 h clamp);
 *  - the frozen long-length list is made of exact, live corpus names, and
 *    every live corpus row in a named family is on it, so a new row in one of
 *    those families flags itself here instead of going unweighted.
 * recoveryHoursAcross keeps returning exactly what recoveryHours returns, the
 * new options included (the personal learner relies on that equality).
 */
import { CORPUS } from '../../exerciseCorpus';
import * as constants from '../constants';
import {
  BASE_RECOVERY_HOURS, RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX,
  NOVELTY_FACTOR, NOVELTY_SESSIONS, NOVELTY_LAYOFF_DAYS, INDIRECT_FACTOR, RECOVERY_BAND,
  LONG_LENGTH_WEIGHT, LONG_LENGTH_EXERCISE_NAMES,
  intensityFactor, longLengthFactor, isLongLengthExercise, recoveryBandHours,
  recoveryHours, recoveryHoursAcross,
} from '../constants';

describe('the base clocks (design 4.13, founder answer Q3 = A)', () => {
  test('quads and glutes read 54 h and hamstrings 60 h; every other muscle keeps its D201 clock', () => {
    expect(BASE_RECOVERY_HOURS).toEqual({
      quads: 54, glutes: 54, hamstrings: 60,
      adductors: 60, back: 60, chest: 60,
      triceps: 48, biceps: 48, side_delts: 48, front_delts: 48, rear_delts: 48, traps: 48,
      forearms: 36, calves: 36, abs: 36, neck: 36, tibialis: 36,
    });
  });

  test('biceps still recover sooner than back, and the small muscles sooner than the arms (founder R12)', () => {
    expect(BASE_RECOVERY_HOURS.biceps).toBeLessThan(BASE_RECOVERY_HOURS.back);
    expect(BASE_RECOVERY_HOURS.calves).toBeLessThan(BASE_RECOVERY_HOURS.biceps);
  });

  test('a standard session reads the new clocks through recoveryHours', () => {
    expect(recoveryHours('quads')).toBe(54);
    expect(recoveryHours('glutes')).toBe(54);
    expect(recoveryHours('hamstrings')).toBe(60);
    expect(recoveryHours('chest')).toBe(60);
    expect(recoveryHours('biceps')).toBe(48);
    expect(recoveryHours('calves')).toBe(36);
  });

  test('an unknown muscle takes the longest clock the table now holds (60 h), never a shorter one', () => {
    expect(recoveryHours('not_a_muscle')).toBe(Math.max(...Object.values(BASE_RECOVERY_HOURS)));
    expect(recoveryHours('not_a_muscle')).toBe(60);
  });
});

describe('the effort ladder (design 4.13, row 1)', () => {
  test('RIR 0 reads 1.25, RIR 1 reads 1.10, RIR 2 reads 1.00, RIR 3 or more reads 0.80', () => {
    expect(intensityFactor(0)).toBe(1.25);
    expect(intensityFactor(1)).toBe(1.10);
    expect(intensityFactor(2)).toBe(1.0);
    expect(intensityFactor(3)).toBe(0.8);
    expect(intensityFactor(4)).toBe(0.8);
    expect(intensityFactor(6)).toBe(0.8);
  });

  test('the rung edges are the D201 ones: at most 0 is failure, at most 1 is the RIR 1 rung, under 3 is neutral', () => {
    expect(intensityFactor(-1)).toBe(1.25);
    expect(intensityFactor(0.5)).toBe(1.10);
    expect(intensityFactor(1.5)).toBe(1.0);
    expect(intensityFactor(2.9)).toBe(1.0);
    expect(intensityFactor('0')).toBe(1.25);
    expect(intensityFactor('3')).toBe(0.8);
  });

  test('an absent or unreadable target is neutral, and never reads as RIR 0 (Number(null) is 0)', () => {
    expect(intensityFactor(null)).toBe(1.0);
    expect(intensityFactor(undefined)).toBe(1.0);
    expect(intensityFactor('')).toBe(1.0);
    expect(intensityFactor('x')).toBe(1.0);
    expect(intensityFactor(NaN)).toBe(1.0);
  });

  test('the ladder reaches the clock: a failure week lengthens it, a far-from-failure week shortens it', () => {
    expect(recoveryHours('chest', { rirTarget: 0 })).toBeCloseTo(60 * 1.25, 10);
    expect(recoveryHours('chest', { rirTarget: 1 })).toBeCloseTo(60 * 1.10, 10);
    expect(recoveryHours('chest', { rirTarget: 3 })).toBeCloseTo(60 * 0.8, 10);
  });
});

describe('the first-week factor is gone and novelty replaces it (design 4.13, row 2)', () => {
  test('the constants: 1.15 for two sessions, after 21 days without the muscle', () => {
    expect(NOVELTY_FACTOR).toBe(1.15);
    expect(NOVELTY_SESSIONS).toBe(2);
    expect(NOVELTY_LAYOFF_DAYS).toBe(21);
  });

  test('a novel session lengthens the clock by 15%; a familiar one, or no flag, leaves it alone', () => {
    expect(recoveryHours('chest', { novel: true })).toBeCloseTo(60 * 1.15, 10);
    expect(recoveryHours('chest', { novel: false })).toBe(60);
    expect(recoveryHours('chest')).toBe(60);
  });

  test('the first-week factor no longer exists', () => {
    expect(constants.FIRST_WEEK_FACTOR).toBeUndefined();
  });

  test('week 1 of a block no longer lengthens anything: firstWeek is ignored', () => {
    expect(recoveryHours('chest', { firstWeek: true })).toBe(recoveryHours('chest'));
    expect(recoveryHours('quads', { sets: 12, rirTarget: 1, firstWeek: true }))
      .toBe(recoveryHours('quads', { sets: 12, rirTarget: 1 }));
  });
});

describe('the long-length factor (design 4.13, row 3)', () => {
  test('the weight is 0.10, and the factor is 1 + 0.10 x the share of direct sets, share held to 0..1', () => {
    expect(LONG_LENGTH_WEIGHT).toBe(0.10);
    expect(longLengthFactor(0)).toBe(1);
    expect(longLengthFactor(0.5)).toBeCloseTo(1.05, 10);
    expect(longLengthFactor(1)).toBeCloseTo(1.10, 10);
    expect(longLengthFactor(2)).toBeCloseTo(1.10, 10);
    expect(longLengthFactor(-1)).toBe(1);
  });

  test('an absent or unreadable share is neutral', () => {
    for (const share of [null, undefined, '', 'x', NaN]) expect(longLengthFactor(share)).toBe(1);
  });

  test('it reaches the clock through recoveryHours', () => {
    expect(recoveryHours('triceps', { longLengthShare: 1 })).toBeCloseTo(48 * 1.10, 10);
    expect(recoveryHours('triceps', { longLengthShare: 0.5 })).toBeCloseTo(48 * 1.05, 10);
    expect(recoveryHours('triceps', { longLengthShare: 0 })).toBe(48);
    expect(recoveryHours('triceps')).toBe(48);
  });
});

describe('the mostly-indirect factor (design 4.13, row 4)', () => {
  test('INDIRECT_FACTOR is 0.85, and a session that is mostly synergist credit shortens the clock by it', () => {
    expect(INDIRECT_FACTOR).toBe(0.85);
    expect(recoveryHours('biceps', { mostlyIndirect: true })).toBeCloseTo(48 * 0.85, 10);
    expect(recoveryHours('biceps', { mostlyIndirect: false })).toBe(48);
    expect(recoveryHours('biceps')).toBe(48);
  });
});

describe('the factors multiply, inside the 24 to 168 h clamp', () => {
  test('every factor together: dose, rating, effort, novelty, long length and ratings', () => {
    const h = recoveryHours('hamstrings', {
      sets: 9, recoveryRating: 'poor', rirTarget: 1, novel: true, longLengthShare: 0.5, ratings: { fatigue: 4 },
    });
    expect(h).toBeCloseTo(60 * Math.sqrt(9 / 6) * 1.15 * 1.10 * 1.15 * 1.05 * 1.2, 6);
  });

  test('mostly indirect and long length can both apply', () => {
    expect(recoveryHours('triceps', { sets: 6, mostlyIndirect: true, longLengthShare: 1 }))
      .toBeCloseTo(48 * 0.85 * 1.10, 10);
  });

  test('the clamp holds at both ends whatever the new factors do', () => {
    expect(recoveryHours('calves', { sets: 1, recoveryRating: 'good', rirTarget: 4, mostlyIndirect: true }))
      .toBe(RECOVERY_HOURS_MIN);
    expect(recoveryHours('quads', {
      sets: 60, recoveryRating: 'poor', rirTarget: 0, novel: true, longLengthShare: 1, ratings: { fatigue: 5, joint: 3 },
    })).toBe(RECOVERY_HOURS_MAX);
  });

  test('recoveryHoursAcross is exactly recoveryHours at each factor, the new options included', () => {
    const factors = [0.75, 0.9, 1, 1.15, 1.4, null, undefined, 'x', 2];
    const cases = [
      ['quads', { novel: true }],
      ['hamstrings', { sets: 9, rirTarget: 0, longLengthShare: 0.75 }],
      ['biceps', { sets: 3, mostlyIndirect: true }],
      ['chest', { sets: 12, recoveryRating: 'poor', rirTarget: 1, novel: true, longLengthShare: 0.2, mostlyIndirect: false, ratings: { joint: 2 } }],
      ['quads', { firstWeek: true }],
    ];
    for (const [muscle, opts] of cases) {
      expect(recoveryHoursAcross(muscle, opts, factors))
        .toEqual(factors.map((f) => recoveryHours(muscle, { ...opts, personalFactor: f })));
    }
    // And the shared figure is the real one, not two functions agreeing on neutral.
    expect(recoveryHoursAcross('chest', { novel: true, longLengthShare: 1, mostlyIndirect: true }, [1])[0])
      .toBeCloseTo(60 * 1.15 * 1.10 * 0.85, 10);
  });
});

describe('the band (design 4.13, row 6)', () => {
  test('RECOVERY_BAND is 0.25, so a clock is shown from 0.75 to 1.25 of the estimate', () => {
    expect(RECOVERY_BAND).toBe(0.25);
    expect(recoveryBandHours(60)).toEqual({ lowHours: 45, highHours: 75 });
    expect(recoveryBandHours(48)).toEqual({ lowHours: 36, highHours: 60 });
  });

  test('both ends stay inside the existing clamp', () => {
    expect(recoveryBandHours(RECOVERY_HOURS_MIN)).toEqual({ lowHours: RECOVERY_HOURS_MIN, highHours: 30 });
    expect(recoveryBandHours(28)).toEqual({ lowHours: RECOVERY_HOURS_MIN, highHours: 35 });
    expect(recoveryBandHours(RECOVERY_HOURS_MAX)).toEqual({ lowHours: 126, highHours: RECOVERY_HOURS_MAX });
    expect(recoveryBandHours(150)).toEqual({ lowHours: 112.5, highHours: RECOVERY_HOURS_MAX });
  });

  test('a clock that cannot be read has no band', () => {
    for (const bad of [null, undefined, '', 'x', NaN, 0, -5, Infinity]) expect(recoveryBandHours(bad)).toBeNull();
  });

  test('the band of a real estimate is the estimate times 0.75 and 1.25', () => {
    const t = recoveryHours('quads', { sets: 8, rirTarget: 1 });
    const band = recoveryBandHours(t);
    expect(band.lowHours).toBeCloseTo(t * 0.75, 10);
    expect(band.highHours).toBeCloseTo(t * 1.25, 10);
  });
});

describe('the frozen long-length list (design 4.13, row 3; exact corpus names)', () => {
  const live = new Map(CORPUS.map((e) => [e.name, e]));

  test('is frozen, has no duplicate, and holds the names the brief fixed', () => {
    expect(Object.isFrozen(LONG_LENGTH_EXERCISE_NAMES)).toBe(true);
    expect(new Set(LONG_LENGTH_EXERCISE_NAMES).size).toBe(LONG_LENGTH_EXERCISE_NAMES.length);
    for (const name of ['Seated Leg Curl', 'Barbell Back Squat', 'Hack Squat Machine', 'Standing Calf Raise (Machine)']) {
      expect(LONG_LENGTH_EXERCISE_NAMES).toContain(name);
    }
  });

  test('every name is a live corpus row (no typo, none retired into another name)', () => {
    for (const name of LONG_LENGTH_EXERCISE_NAMES) {
      expect(live.has(name)).toBe(true);
    }
  });

  test('every live corpus row in a named family is on the list', () => {
    const inFamily = CORPUS.filter((e) => (
      /Preacher Curl/.test(e.name)
      || /Romanian Deadlift/.test(e.name)
      || (e.primaryMuscle === 'triceps' && /Overhead/.test(e.name))
    )).map((e) => e.name);
    // Guard against the filter going quiet: each family has rows today.
    expect(inFamily.filter((n) => /Preacher Curl/.test(n)).length).toBeGreaterThanOrEqual(4);
    expect(inFamily.filter((n) => /Romanian Deadlift/.test(n)).length).toBeGreaterThanOrEqual(3);
    expect(inFamily.filter((n) => /Overhead/.test(n)).length).toBeGreaterThanOrEqual(2);
    for (const name of inFamily) expect(LONG_LENGTH_EXERCISE_NAMES).toContain(name);
  });

  test('the overhead triceps extensions on the list all train the triceps as the prime mover', () => {
    for (const name of LONG_LENGTH_EXERCISE_NAMES.filter((n) => /Overhead/.test(n))) {
      expect(live.get(name).primaryMuscle).toBe('triceps');
    }
  });

  test('isLongLengthExercise matches the exact name only', () => {
    expect(isLongLengthExercise({ name: 'Seated Leg Curl' })).toBe(true);
    expect(isLongLengthExercise({ name: 'Lying Leg Curl' })).toBe(false);
    expect(isLongLengthExercise({ name: 'seated leg curl' })).toBe(false);
    expect(isLongLengthExercise({ name: 'Seated Leg Curl ' })).toBe(false);
    expect(isLongLengthExercise({})).toBe(false);
    expect(isLongLengthExercise(null)).toBe(false);
    expect(isLongLengthExercise(undefined)).toBe(false);
  });
});
