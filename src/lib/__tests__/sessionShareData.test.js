/**
 * sessionShareData — pure builders for the post-session share card. Tests lock
 * the three rules: best lift = heaviest WORKING set, intensity thresholds, and
 * the title fallback chain.
 */
import {
  topSetFromExerciseData,
  intensityTier,
  shareSessionName,
} from '../sessionShareData';

describe('topSetFromExerciseData', () => {
  test('returns null with no data', () => {
    expect(topSetFromExerciseData(null)).toBeNull();
    expect(topSetFromExerciseData([])).toBeNull();
    expect(topSetFromExerciseData([{ name: 'Squat', loggedSets: [] }])).toBeNull();
  });

  test('never picks a warm-up even when it is the heaviest set', () => {
    const data = [{
      name: 'Bench',
      loggedSets: [
        { weight: 200, reps: 1, setType: 'warmup' },
        { weight: 100, reps: 8, setType: 'straight' },
      ],
    }];
    expect(topSetFromExerciseData(data)).toEqual({ weight: 100, reps: 8, exerciseName: 'Bench' });
  });

  test('picks the heaviest working set across all exercises', () => {
    const data = [
      { name: 'Row', loggedSets: [{ weight: 80, reps: 10, setType: 'straight' }] },
      { name: 'Deadlift', loggedSets: [{ weight: 180, reps: 5, setType: 'straight' }] },
    ];
    expect(topSetFromExerciseData(data)).toEqual({ weight: 180, reps: 5, exerciseName: 'Deadlift' });
  });

  test('parses string weights and tolerates missing reps', () => {
    const data = [{ name: 'Curl', loggedSets: [{ weight: '22.5', setType: 'straight' }] }];
    expect(topSetFromExerciseData(data)).toEqual({ weight: 22.5, reps: 0, exerciseName: 'Curl' });
  });
});

describe('intensityTier', () => {
  test('epic on two PRs, big tonnage, or high set count', () => {
    expect(intensityTier(2, 0, 0)).toBe('epic');
    expect(intensityTier(0, 8001, 0)).toBe('epic');
    expect(intensityTier(0, 0, 25)).toBe('epic');
  });

  test('tough on one PR, moderate tonnage, or moderate set count', () => {
    expect(intensityTier(1, 0, 0)).toBe('tough');
    expect(intensityTier(0, 4001, 0)).toBe('tough');
    expect(intensityTier(0, 0, 18)).toBe('tough');
  });

  test('solid when nothing reaches a higher tier', () => {
    expect(intensityTier(0, 4000, 17)).toBe('solid');
    expect(intensityTier(0, 0, 0)).toBe('solid');
    expect(intensityTier(undefined, undefined, undefined)).toBe('solid');
  });
});

describe('shareSessionName', () => {
  test('prefers the trimmed routine name', () => {
    expect(shareSessionName('  Back + Delts (Width)  ', ['Row', 'Pulldown'])).toBe('Back + Delts (Width)');
  });

  test('joins the first two exercises and flags extras', () => {
    expect(shareSessionName('', ['Squat', 'Leg Press', 'Lunge'])).toBe('Squat & Leg Press +more');
    expect(shareSessionName(null, ['Squat', 'Leg Press'])).toBe('Squat & Leg Press');
  });

  test('falls back to a generic label with no routine and no exercises', () => {
    expect(shareSessionName('', [])).toBe('Session Complete');
    expect(shareSessionName(undefined)).toBe('Session Complete');
  });
});
