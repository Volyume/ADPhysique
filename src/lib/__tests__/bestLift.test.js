import { pickBestLift, epleyE1rm } from '../bestLift';

const set = (exerciseId, exerciseName, weight, reps) => ({ exerciseId, exerciseName, weight, reps });

describe('epleyE1rm', () => {
  test('matches plain Epley (weight * (1 + reps/30))', () => {
    expect(epleyE1rm(100, 5)).toBeCloseTo(100 * (1 + 5 / 30), 5);
    expect(epleyE1rm(60, 1)).toBeCloseTo(60 * (1 + 1 / 30), 5); // matches getWeeklyPRCount
  });
  test('guards junk input', () => {
    expect(epleyE1rm(0, 5)).toBe(0);
    expect(epleyE1rm(-10, 5)).toBe(0);
    expect(epleyE1rm('abc', 5)).toBe(0);
    expect(epleyE1rm(100, 0)).toBe(epleyE1rm(100, 1)); // reps<1 floored to 1
  });
});

describe('pickBestLift', () => {
  test('returns null with no sets', () => {
    expect(pickBestLift([], new Map())).toBeNull();
    expect(pickBestLift(null, new Map())).toBeNull();
  });

  test('picks the biggest e1RM GAIN, not the heaviest absolute lift', () => {
    // Squat is heavier in absolute terms, but bench made the bigger jump.
    const weekSets = [
      set('squat', 'Back Squat', 140, 5), // e1RM ~163.3, prior 162 -> gain ~1.3
      set('bench', 'Bench Press', 100, 5), // e1RM ~116.7, prior 100 -> gain ~16.7
    ];
    const prior = new Map([['squat', 162], ['bench', 100]]);
    const best = pickBestLift(weekSets, prior);
    expect(best.exerciseName).toBe('Bench Press');
    expect(best.isNewBest).toBe(true);
    expect(best.weight).toBe(100);
    expect(best.reps).toBe(5);
    expect(best.gainKg).toBeGreaterThan(10);
  });

  test('a 60kg and a 140kg lifter can both win on gain (fairness)', () => {
    const lighter = pickBestLift(
      [set('ohp', 'Overhead Press', 60, 5)],
      new Map([['ohp', 55]]),
    );
    expect(lighter.isNewBest).toBe(true);
    expect(lighter.exerciseName).toBe('Overhead Press');
  });

  test('falls back to the heaviest set when nothing beat a prior best', () => {
    const weekSets = [
      set('squat', 'Back Squat', 140, 5),
      set('bench', 'Bench Press', 100, 5),
    ];
    // Priors already above this week — no gains.
    const prior = new Map([['squat', 200], ['bench', 200]]);
    const best = pickBestLift(weekSets, prior);
    expect(best.isNewBest).toBe(false);
    expect(best.gainKg).toBeNull();
    expect(best.exerciseName).toBe('Back Squat'); // heaviest by e1RM
  });

  test('first-time lifts (no prior) are NOT flagged as a new best, but still heroable as heaviest', () => {
    const best = pickBestLift([set('dl', 'Deadlift', 180, 3)], new Map());
    expect(best).not.toBeNull();
    expect(best.isNewBest).toBe(false); // no prior to beat
    expect(best.gainKg).toBeNull();
    expect(best.exerciseName).toBe('Deadlift');
  });

  test('takes the top set within an exercise (higher e1RM wins)', () => {
    const weekSets = [
      set('bench', 'Bench Press', 90, 8), // e1RM 114
      set('bench', 'Bench Press', 100, 5), // e1RM ~116.7 -> this one
    ];
    const best = pickBestLift(weekSets, new Map([['bench', 100]]));
    expect(best.weight).toBe(100);
    expect(best.reps).toBe(5);
  });

  test('accepts a plain object map as well as a Map', () => {
    const best = pickBestLift([set('bench', 'Bench Press', 100, 5)], { bench: 90 });
    expect(best.isNewBest).toBe(true);
  });
});
