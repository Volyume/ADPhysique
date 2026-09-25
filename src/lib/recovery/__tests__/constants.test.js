/**
 * constants.test.js -- the per-muscle recovery estimate's constants and
 * factor functions (register D201, spec section 3.1). Pins: every engine
 * muscle key has a baseline and the table holds the spec's values; the
 * dose factor is a clamped square root; the rating, intensity, first-week
 * and feedback factors take their spec values; feedback never shortens an
 * estimate; recoveryHours is clamped to [24, 168] and deterministic; an
 * unknown muscle takes the most conservative baseline; the module does no
 * I/O.
 *
 * LANE R-G addition (Opus review finding 25, spec section 9; D201 addendum,
 * lead ruling 3, and addendum 6 ruling 12): TYPICAL_WEEK_GAP_HOURS holds
 * exactly the typical-week layout per session count and every row sums to
 * a full week; PLAN_OPENING_RIR (spec 5.1) is the RIR the sequencer's
 * scorer is judged at.
 */
import fs from 'fs';
import path from 'path';
import { VOLUME_LANDMARKS } from '../../algorithms';
import {
  RECOVERY_ESTIMATE_LABEL, BASE_RECOVERY_HOURS, REFERENCE_SETS,
  DOSE_FACTOR_MIN, DOSE_FACTOR_MAX, RATING_FACTOR, FIRST_WEEK_FACTOR, FEEDBACK_FACTOR,
  RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX, READY_PERCENT, NEARLY_PERCENT, LOOKBACK_DAYS,
  TYPICAL_WEEK_GAP_HOURS, PLAN_OPENING_RIR,
  doseFactor, ratingFactor, intensityFactor, feedbackFactor, recoveryHours,
} from '../constants';

describe('baselines', () => {
  test('every VOLUME_LANDMARKS muscle key has a baseline, and nothing else does', () => {
    expect(Object.keys(BASE_RECOVERY_HOURS).sort()).toEqual(Object.keys(VOLUME_LANDMARKS).sort());
  });

  test('the table holds the spec values', () => {
    expect(BASE_RECOVERY_HOURS).toEqual({
      quads: 72, hamstrings: 72, glutes: 72, adductors: 60, back: 60, chest: 60,
      triceps: 48, biceps: 48, side_delts: 48, front_delts: 48, rear_delts: 48, traps: 48,
      forearms: 36, calves: 36, abs: 36, neck: 36, tibialis: 36,
    });
  });

  test('the label, the reference dose, the bands and the window are the spec values', () => {
    expect(RECOVERY_ESTIMATE_LABEL).toBe('estimated');
    expect(REFERENCE_SETS).toBe(6);
    expect(READY_PERCENT).toBe(90);
    expect(NEARLY_PERCENT).toBe(75);
    expect(LOOKBACK_DAYS).toBe(14);
    expect(FIRST_WEEK_FACTOR).toBe(1.10);
    expect(RATING_FACTOR).toEqual({ poor: 1.15, average: 1.0, good: 0.9 });
    expect(FEEDBACK_FACTOR).toEqual({ highSorenessOrFatigue: 1.20, jointDiscomfortAdd: 0.10 });
  });
});

describe('doseFactor', () => {
  test('is the square root of the dose ratio, clamped to [0.7, 1.5]', () => {
    expect(doseFactor(6)).toBeCloseTo(1.0, 10);
    expect(doseFactor(3)).toBeCloseTo(Math.sqrt(0.5), 10);
    expect(doseFactor(12)).toBeCloseTo(Math.sqrt(2), 10);
    expect(doseFactor(1)).toBe(DOSE_FACTOR_MIN);
    expect(doseFactor(60)).toBe(DOSE_FACTOR_MAX);
  });

  test('a missing, zero or non-finite dose reads as the reference dose', () => {
    expect(doseFactor(undefined)).toBe(1.0);
    expect(doseFactor(0)).toBe(1.0);
    expect(doseFactor(NaN)).toBe(1.0);
  });
});

describe('ratingFactor, intensityFactor, feedbackFactor', () => {
  test('rating: poor lengthens, good shortens, unknown is average', () => {
    expect(ratingFactor('poor')).toBe(1.15);
    expect(ratingFactor('average')).toBe(1.0);
    expect(ratingFactor('good')).toBe(0.9);
    expect(ratingFactor(undefined)).toBe(1.0);
    expect(ratingFactor('anything')).toBe(1.0);
  });

  test('intensity: RIR 0-1 lengthens, 2 neutral, 3+ shortens, unknown neutral', () => {
    expect(intensityFactor(0)).toBe(1.15);
    expect(intensityFactor(1)).toBe(1.15);
    expect(intensityFactor(2)).toBe(1.0);
    expect(intensityFactor(3)).toBe(0.9);
    expect(intensityFactor(4)).toBe(0.9);
    expect(intensityFactor(null)).toBe(1.0);
    expect(intensityFactor(undefined)).toBe(1.0);
  });

  test('feedback can only lengthen: high soreness or fatigue 1.20, joint adds 0.10, none 1.0', () => {
    expect(feedbackFactor()).toBe(1.0);
    expect(feedbackFactor({ sorenessNext: 2, fatigue: 3, joint: 1 })).toBe(1.0);
    expect(feedbackFactor({ sorenessNext: 3 })).toBeCloseTo(1.20, 10);
    expect(feedbackFactor({ fatigue: 4 })).toBeCloseTo(1.20, 10);
    expect(feedbackFactor({ fatigue: 5, joint: 2 })).toBeCloseTo(1.30, 10);
    expect(feedbackFactor({ joint: 3 })).toBeCloseTo(1.10, 10);
    // Never below the baseline, whatever is passed.
    expect(feedbackFactor({ sorenessNext: 1, fatigue: 1, joint: 0 })).toBe(1.0);
  });
});

describe('recoveryHours', () => {
  test('a standard-dose, average, RIR 2, mid-block, unrated session reads the baseline', () => {
    expect(recoveryHours('quads')).toBe(72);
    expect(recoveryHours('calves')).toBe(36);
  });

  test('the factors multiply: hard legs in week 1 for a poor recoverer at RIR 1', () => {
    const h = recoveryHours('quads', { sets: 12, recoveryRating: 'poor', rirTarget: 1, firstWeek: true });
    expect(h).toBeCloseTo(72 * Math.sqrt(2) * 1.15 * 1.15 * 1.10, 6);
    expect(h).toBeLessThanOrEqual(RECOVERY_HOURS_MAX);
  });

  test('is clamped to [24, 168] hours', () => {
    expect(recoveryHours('calves', { sets: 1, recoveryRating: 'good', rirTarget: 4 })).toBe(RECOVERY_HOURS_MIN);
    expect(recoveryHours('quads', {
      sets: 60, recoveryRating: 'poor', rirTarget: 0, firstWeek: true, ratings: { fatigue: 5, joint: 3 },
    })).toBe(RECOVERY_HOURS_MAX);
  });

  test('ratings lengthen the estimate and never shorten it', () => {
    const base = recoveryHours('chest');
    expect(recoveryHours('chest', { ratings: { fatigue: 5 } })).toBeGreaterThan(base);
    expect(recoveryHours('chest', { ratings: { fatigue: 1, sorenessNext: 1, joint: 0 } })).toBe(base);
  });

  test('an unknown muscle takes the most conservative baseline in the table', () => {
    expect(recoveryHours('not_a_muscle')).toBe(72);
  });

  test('is deterministic', () => {
    const a = recoveryHours('back', { sets: 9, recoveryRating: 'good', rirTarget: 2, ratings: { joint: 2 } });
    const b = recoveryHours('back', { sets: 9, recoveryRating: 'good', rirTarget: 2, ratings: { joint: 2 } });
    expect(a).toBe(b);
  });
});

describe('TYPICAL_WEEK_GAP_HOURS and PLAN_OPENING_RIR (D201 addendum, lead ruling 3; spec 5.1)', () => {
  test('holds exactly the typical-week layout, keyed by session count', () => {
    expect(TYPICAL_WEEK_GAP_HOURS).toEqual({
      1: [168],
      2: [72, 96],
      3: [48, 48, 72],
      4: [24, 48, 24, 72],
      5: [24, 24, 24, 24, 72],
      6: [24, 24, 24, 24, 24, 48],
      7: [24, 24, 24, 24, 24, 24, 24],
    });
  });

  test('every row sums to a full week (168 hours), so the wrap gap always closes the week', () => {
    for (const row of Object.values(TYPICAL_WEEK_GAP_HOURS)) {
      expect(row.reduce((sum, hours) => sum + hours, 0)).toBe(168);
    }
  });

  test('the block-opening RIR the sequencer\'s scorer is judged at is 3 (spec 5.1)', () => {
    expect(PLAN_OPENING_RIR).toBe(3);
  });
});

describe('purity (source guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'constants.js'), 'utf8');
  test('imports nothing that does I/O and never reads the clock', () => {
    expect(src).not.toMatch(/from ['"]\.\.\/database/);
    expect(src).not.toMatch(/async-storage|expo-sqlite|react-native/);
    expect(src).not.toMatch(/Date\.now\(|new Date\(|Math\.random/);
  });
  test('states the estimate law and the evidence in its header', () => {
    expect(src).toMatch(/never calls it a measurement/);
    expect(src).toMatch(/Goulart et al\. 2021/);
    expect(src).toMatch(/Ferreira et al\. 2017/);
    expect(src).toMatch(/Schoenfeld, Grgic, Krieger 2019/);
  });
});
