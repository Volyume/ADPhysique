/**
 * ULTIMATE-PLANDIFF-01 — plan diff/preview (pure helpers).
 * Pins: prospective/current normalisation, friendly split labels, the Now/After
 * delta (days, split, session length, moves added/dropped) and the `identical`
 * empty-state flag.
 */
import {
  splitLabel, summariseProspectivePlan, summariseCurrentPlan, diffPlans,
} from '../planDiff';

describe('splitLabel', () => {
  test('maps known codes to friendly labels', () => {
    expect(splitLabel('ppl')).toBe('Push / Pull / Legs');
    expect(splitLabel('upper_lower')).toBe('Upper / Lower');
    expect(splitLabel('full_body')).toBe('Full body');
  });
  test('passes through already-friendly division labels and null', () => {
    expect(splitLabel('V-Taper')).toBe('V-Taper');
    expect(splitLabel(null)).toBeNull();
  });
});

describe('summariseProspectivePlan', () => {
  test('counts workouts as days, dedupes + sorts moves, carries split + length', () => {
    const plan = {
      splitType: 'ppl',
      workouts: [
        { exercises: [{ exerciseName: 'Bench Press' }, { exerciseName: 'Squat' }] },
        { exercises: [{ exerciseName: 'Squat' }, { exerciseName: 'Row' }] },
      ],
    };
    expect(summariseProspectivePlan(plan, 60)).toEqual({
      days: 2, split: 'ppl', sessionLengthMinutes: 60,
      moves: ['Bench Press', 'Row', 'Squat'],
    });
  });
  test('malformed plan → zero days, empty moves', () => {
    expect(summariseProspectivePlan(null, null)).toEqual({
      days: 0, split: null, sessionLengthMinutes: null, moves: [],
    });
  });
});

describe('summariseCurrentPlan', () => {
  test('counts routines as days, takes first split, gathers exercise names', () => {
    const routines = [
      { splitType: 'upper_lower', exercises: [{ name: 'Bench Press' }, { name: 'Pull-up' }] },
      { splitType: 'upper_lower', exercises: [{ name: 'Squat' }] },
    ];
    expect(summariseCurrentPlan(routines, 75)).toEqual({
      days: 2, split: 'upper_lower', sessionLengthMinutes: 75,
      moves: ['Bench Press', 'Pull-up', 'Squat'],
    });
  });
  test('null routines → empty summary', () => {
    expect(summariseCurrentPlan(null).days).toBe(0);
  });
});

describe('diffPlans', () => {
  const now = { days: 4, split: 'upper_lower', sessionLengthMinutes: 60, moves: ['Bench Press', 'Squat'] };

  test('surfaces day, split, session-length changes and moves added/dropped', () => {
    const after = { days: 5, split: 'ppl', sessionLengthMinutes: 75, moves: ['Bench Press', 'Deadlift'] };
    const d = diffPlans(now, after);
    expect(d.days).toEqual({ now: 4, after: 5, changed: true });
    expect(d.split).toEqual({ now: 'Upper / Lower', after: 'Push / Pull / Legs', changed: true });
    expect(d.sessionLength).toEqual({ now: 60, after: 75, changed: true });
    expect(d.movesAdded).toEqual(['Deadlift']);
    expect(d.movesDropped).toEqual(['Squat']);
    expect(d.identical).toBe(false);
  });

  test('identical setup → identical:true, no changes flagged', () => {
    const d = diffPlans(now, { ...now });
    expect(d.identical).toBe(true);
    expect(d.days.changed).toBe(false);
    expect(d.split.changed).toBe(false);
    expect(d.movesAdded).toEqual([]);
    expect(d.movesDropped).toEqual([]);
  });

  test('split label difference alone (same code) does not falsely flag a change', () => {
    // both 'ppl' → both 'Push / Pull / Legs'
    const d = diffPlans({ ...now, split: 'ppl' }, { ...now, split: 'ppl' });
    expect(d.split.changed).toBe(false);
  });

  test('missing current plan (null now) treats everything as the After state', () => {
    const after = { days: 4, split: 'ppl', sessionLengthMinutes: 60, moves: ['Squat'] };
    const d = diffPlans(null, after);
    expect(d.movesAdded).toEqual(['Squat']);
    expect(d.movesDropped).toEqual([]);
    expect(d.days).toEqual({ now: null, after: 4, changed: true });
    expect(d.identical).toBe(false);
  });
});
