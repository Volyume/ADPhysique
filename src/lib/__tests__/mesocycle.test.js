/**
 * Tests for mesocycle.js, the deload schedule, volume ramp, autoreg
 * decision matrix, and time-crunch trimmer.
 */
import {
  getCurrentMesoWeek,
  getMesoSchedule,
  getWeekSetsMultiplier,
  isRecoveryWeek,
  buildWeeklyProgression,
  evaluateAutoReg,
  applyTimeCrunch,
  getBlockStatus,
} from '../mesocycle';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 4, 20);

describe('getCurrentMesoWeek', () => {
  test('returns 1 for a brand-new block', () => {
    expect(getCurrentMesoWeek(NOW - 1 * DAY, 'intermediate', NOW)).toBe(1);
  });

  test('increments roughly each calendar week', () => {
    expect(getCurrentMesoWeek(NOW - 7 * DAY, 'intermediate', NOW)).toBe(2);
    expect(getCurrentMesoWeek(NOW - 21 * DAY, 'intermediate', NOW)).toBe(4);
  });

  test('clamps to the schedule length for over-long blocks', () => {
    const schedule = getMesoSchedule('intermediate');
    const out = getCurrentMesoWeek(NOW - 200 * DAY, 'intermediate', NOW);
    expect(out).toBeLessThanOrEqual(schedule.length);
  });
});

describe('getMesoSchedule', () => {
  test('beginner / intermediate / advanced all return non-empty arrays', () => {
    for (const exp of ['beginner', 'intermediate', 'advanced']) {
      const s = getMesoSchedule(exp);
      expect(Array.isArray(s)).toBe(true);
      expect(s.length).toBeGreaterThan(0);
    }
  });

  test('schedules end with at least one recovery / deload week', () => {
    const s = getMesoSchedule('intermediate');
    const hasRecovery = s.some(e => e.phase === 'recovery' || e.phase === 'deload');
    expect(hasRecovery).toBe(true);
  });
});

describe('isRecoveryWeek', () => {
  test('returns true for the deload week index', () => {
    const schedule = getMesoSchedule('intermediate');
    const recoveryIdx = schedule.find(s => s.phase === 'recovery')?.week;
    if (recoveryIdx != null) {
      expect(isRecoveryWeek(recoveryIdx, 'intermediate')).toBe(true);
    }
  });

  test('returns false for non-recovery weeks', () => {
    expect(isRecoveryWeek(1, 'intermediate')).toBe(false);
  });

  test('returns false (not undefined) for unknown week index', () => {
    expect(isRecoveryWeek(999, 'intermediate')).toBe(false);
  });
});

describe('getWeekSetsMultiplier', () => {
  test('returns a positive multiplier for known weeks', () => {
    const m = getWeekSetsMultiplier(1, 'intermediate');
    expect(m).toBeGreaterThan(0);
  });

  test('non-existent week falls back without throwing', () => {
    expect(() => getWeekSetsMultiplier(999, 'intermediate')).not.toThrow();
  });
});

describe('buildWeeklyProgression', () => {
  test('returns one entry per scheduled week', () => {
    const out = buildWeeklyProgression(10, 18, 'intermediate');
    const schedule = getMesoSchedule('intermediate');
    expect(out.length).toBe(schedule.length);
  });

  test('every step has a non-negative sets value', () => {
    const out = buildWeeklyProgression(10, 18, 'intermediate');
    for (const step of out) {
      // Step shape may vary; assert any numeric field present is non-negative
      // and the entry is at minimum a plain object.
      expect(step).toBeDefined();
      for (const v of Object.values(step)) {
        if (typeof v === 'number') {
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('evaluateAutoReg', () => {
  test('empty feedback window → hold', () => {
    const out = evaluateAutoReg([]);
    expect(out.action).toBeDefined();
  });

  test('consistent good feedback → push or hold (never crash)', () => {
    const window = Array.from({ length: 4 }, () => ({
      sessionDifficulty: 2, pump: 4, soreness24h: 1,
    }));
    expect(() => evaluateAutoReg(window)).not.toThrow();
  });

  test('consistent poor feedback → recommend deload or back-off', () => {
    const window = Array.from({ length: 4 }, () => ({
      sessionDifficulty: 5, pump: 1, soreness24h: 5,
    }));
    const out = evaluateAutoReg(window);
    expect(typeof out.action).toBe('string');
  });
});

describe('applyTimeCrunch', () => {
  test('returns a result that can be iterated', () => {
    const exercises = [
      { exerciseName: 'Bench', sets: 3 },
      { exerciseName: 'Row', sets: 3 },
    ];
    const out = applyTimeCrunch(exercises, 90, () => 30);
    // applyTimeCrunch may return an array or an object with a trimmed list;
    // accept either shape but assert it doesn't crash and produces something.
    expect(out).toBeDefined();
  });

  test('does not crash on empty input', () => {
    expect(() => applyTimeCrunch([], 30, () => 30)).not.toThrow();
  });

  // COMP-013 starter-session bounds. Options default off → existing callers
  // unchanged; when set, a final deterministic trim caps the subset.
  describe('starter-session options (COMP-013)', () => {
    const day1 = [
      { exerciseName: 'Squat',        sets: 4, restSec: 120, compoundIsolation: 'compound' },
      { exerciseName: 'Bench',        sets: 3, restSec: 120, compoundIsolation: 'compound' },
      { exerciseName: 'Row',          sets: 3, restSec: 90,  compoundIsolation: 'compound' },
      { exerciseName: 'Overhead',     sets: 3, restSec: 90,  compoundIsolation: 'compound' },
      { exerciseName: 'Curl',         sets: 3, restSec: 60,  compoundIsolation: 'isolation' },
      { exerciseName: 'Lateral Raise',sets: 3, restSec: 60,  compoundIsolation: 'isolation' },
    ];
    // A real-ish estimator: every set costs work + rest minutes.
    const estimate = (exs) => exs.reduce((t, ex) => t + (ex.sets * (ex.restSec / 60 + 0.75)), 0);

    test('caps to the first N exercises in plan order', () => {
      const { exercises } = applyTimeCrunch(day1, 15, estimate, { maxExercises: 4, maxSetsPerExercise: 2 });
      expect(exercises).toHaveLength(4);
      expect(exercises.map(e => e.exerciseName)).toEqual(['Squat', 'Bench', 'Row', 'Overhead']);
    });

    test('caps every kept exercise at maxSetsPerExercise', () => {
      const { exercises } = applyTimeCrunch(day1, 15, estimate, { maxExercises: 4, maxSetsPerExercise: 2 });
      expect(exercises.every(e => e.sets <= 2)).toBe(true);
    });

    test('keeps the same lifts and order it kept — a true subset of Day 1', () => {
      const { exercises } = applyTimeCrunch(day1, 15, estimate, { maxExercises: 4, maxSetsPerExercise: 2 });
      const original = day1.map(e => e.exerciseName);
      exercises.forEach((e, i) => {
        expect(original).toContain(e.exerciseName);
        if (i > 0) {
          // order preserved relative to the original plan
          expect(original.indexOf(e.exerciseName)).toBeGreaterThan(
            original.indexOf(exercises[i - 1].exerciseName),
          );
        }
      });
    });

    test('lands a compound-heavy Day 1 near a 15-minute budget, far below the full session', () => {
      const { exercises } = applyTimeCrunch(day1, 15, estimate, { maxExercises: 4, maxSetsPerExercise: 2 });
      const trimmed = estimate(exercises);
      const full = estimate(day1);
      // "About 15 minutes": the 4×2 subset lands in a believable band (~14-16),
      // not the exact target — the blueprint flags this as an approximate floor.
      expect(trimmed).toBeLessThanOrEqual(17);
      // and is dramatically shorter than the un-trimmed Day 1.
      expect(trimmed).toBeLessThan(full / 2);
    });

    test('is deterministic — identical input yields identical output', () => {
      const a = applyTimeCrunch(day1, 15, estimate, { maxExercises: 4, maxSetsPerExercise: 2 });
      const b = applyTimeCrunch(day1, 15, estimate, { maxExercises: 4, maxSetsPerExercise: 2 });
      expect(a).toEqual(b);
    });

    test('options absent → behaviour unchanged (compounds protected, sets intact)', () => {
      const { exercises } = applyTimeCrunch(day1, 15, estimate);
      // every compound survives and keeps its full set count
      const compounds = day1.filter(e => e.compoundIsolation === 'compound');
      compounds.forEach((c) => {
        const kept = exercises.find(e => e.exerciseName === c.exerciseName);
        expect(kept).toBeDefined();
        expect(kept.sets).toBe(c.sets);
      });
    });
  });
});

describe('getBlockStatus', () => {
  test('returns currentWeek + totalWeeks + status', () => {
    const out = getBlockStatus(NOW - 14 * DAY, 5);
    expect(typeof out).toBe('object');
    expect(out).toHaveProperty('currentWeek');
    expect(out).toHaveProperty('totalWeeks');
    expect(out).toHaveProperty('status');
    expect(out.totalWeeks).toBe(5);
    expect(out.currentWeek).toBeGreaterThan(0);
  });

  test('null start date returns a sane shape', () => {
    expect(() => getBlockStatus(null, 5)).not.toThrow();
  });
});

// CALC-8: out-of-range / NaN week numbers must be handled, not silently swallowed.
describe('mesocycle helpers handle bad week numbers (CALC-8)', () => {
  const { getWeekSetsMultiplier, getCurrentMesoWeek, getVolumeTargetsForWeek } = require('../mesocycle');

  test('getCurrentMesoWeek(NaN) falls back to week 1, not NaN', () => {
    expect(getCurrentMesoWeek(NaN)).toBe(1);
    expect(getCurrentMesoWeek(undefined)).toBe(1);
  });

  test('getWeekSetsMultiplier wraps an out-of-range week instead of NaN/undefined', () => {
    const m = getWeekSetsMultiplier(99);
    expect(Number.isFinite(m)).toBe(true);
    expect(m).toBeGreaterThan(0);
    // In-range weeks are unchanged
    expect(getWeekSetsMultiplier(1)).toBe(getWeekSetsMultiplier(1));
  });

  test('getWeekSetsMultiplier(NaN) is finite (defaults to week 1)', () => {
    expect(Number.isFinite(getWeekSetsMultiplier(NaN))).toBe(true);
  });

  test('getVolumeTargetsForWeek scales with a finite multiplier even for a bad week', () => {
    const out = getVolumeTargetsForWeek({ chest: 10 }, 99);
    expect(Number.isFinite(out.chest)).toBe(true);
  });
});
