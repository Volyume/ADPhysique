import fs from 'fs';
import path from 'path';
import { pickBestLift } from '../bestLift';
import { calculate1RM } from '../algorithms';

const set = (exerciseId, exerciseName, weight, reps) => ({ exerciseId, exerciseName, weight, reps });

// The epleyE1rm suite that stood here protected ONLY the deleted plain-Epley
// implementation, so it goes with it (D95, AUDIT-DUPLICATES D-2). Its junk-input
// law is re-anchored here, unchanged in meaning, on the live selection path.
describe('junk input is guarded (re-anchored from the deleted epleyE1rm suite)', () => {
  test('a 0 kg, negative or non-numeric set never becomes the hero lift', () => {
    expect(pickBestLift([set('a', 'Zero', 0, 5)], new Map())).toBeNull();
    expect(pickBestLift([set('a', 'Negative', -10, 5)], new Map())).toBeNull();
    expect(pickBestLift([set('a', 'Junk', 'abc', 5)], new Map())).toBeNull();
  });

  test('reps below 1 are floored to 1', () => {
    expect(pickBestLift([set('a', 'Single', 100, 0)], new Map()))
      .toEqual(pickBestLift([set('a', 'Single', 100, 1)], new Map()));
  });
});

// D95 duplicates ruling (D-2, AUDIT-DUPLICATES.md): the plain-Epley default
// was the one dangerous default in this family. X4 already ruled that the
// weekly tally must use the SAME blended/clamped calculate1RM the live
// in-session PR detector uses, and the only production caller
// (database.getBestLiftThisWeek) injects it. These three suites are the
// equivalence/regression evidence the ruling requires before the default is
// removed: T-2.2 pins the LIVE path (unchanged either side of the change),
// T-2.1 pins that the default now IS the live path, T-2.3 stops the
// superseded formula returning.
describe('D-2 e1RM consolidation', () => {
  // T-2.1 (equivalence). The pairs span every divergence the audit worked:
  // the 20-rep clamp, past the clamp, the reps === 1 special case, an
  // ordinary mid-rep set, and the two junk-input guards.
  const PAIRS = [[60, 20], [60, 30], [100, 1], [100, 5], [0, 5], [100, 0]];

  test.each(PAIRS)('the default e1rmFn agrees with the injected calculate1RM (%p kg x %p)', (weight, reps) => {
    const sets = [set('bench', 'Bench Press', weight, reps)];
    const prior = new Map([['bench', 50]]);
    expect(pickBestLift(sets, prior)).toEqual(pickBestLift(sets, prior, calculate1RM));
  });

  // T-2.2 (regression on the live path). The fixture must make the canonical
  // formula and plain Epley pick DIFFERENT hero lifts, so that a silent
  // return of the private plain-Epley default would be caught.
  //
  // RE-ANCHORED by C10L. The old pair leaned on the >10-rep Epley/Brzycki
  // blend (60 kg x 20 read 113.6 canonically vs 100.0 under plain Epley).
  // That inflation is exactly what C10L removed, so the pair now TIES at
  // 100.0 and no longer discriminates. The divergence used here instead is
  // the 20-rep CLAMP plus the reps === 1 special case, neither of which C10L
  // touches:
  //   60 kg x 30  -> canonical 100.0 (clamped at 20) | plain Epley 120.0
  //   105 kg x 1  -> canonical 105.0 (raw weight)    | plain Epley 108.5
  // Canonical crowns the single; plain Epley crowns the high-rep set.
  const DIVERGENT_SETS = [
    set('squat', 'Back Squat', 60, 30),
    set('bench', 'Bench Press', 105, 1),
  ];

  test('the live path (calculate1RM injected) features the CANONICAL winner', () => {
    const best = pickBestLift(DIVERGENT_SETS, new Map(), calculate1RM);
    expect(best.exerciseName).toBe('Bench Press');
    expect(best.weight).toBe(105);
    expect(best.reps).toBe(1);
  });

  test('the default picks the same hero lift as the live path', () => {
    expect(pickBestLift(DIVERGENT_SETS, new Map()))
      .toEqual(pickBestLift(DIVERGENT_SETS, new Map(), calculate1RM));
  });

  // T-2.3 (tombstone). A plain-Epley e1RM never returns to this module: a
  // second implementation here forks the product truth X4 unified, and the
  // symptom is a PR celebrated in-session and reported as "0 PRs" one screen
  // away in the recap.
  test('source guard: no plain-Epley e1RM survives in bestLift.js', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'bestLift.js'), 'utf8');
    expect(source).not.toMatch(/1 \+ reps0? \/ 30/);
    expect(source).not.toMatch(/epleyE1rm/);
    // And the canonical estimator is what the module reaches for.
    expect(source).toMatch(/import \{ calculate1RM \} from '\.\/algorithms';/);
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
