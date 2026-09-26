/**
 * sessionShareData — pure builders for the post-session share card. Tests lock
 * the three rules: best lift = heaviest WORKING set, intensity thresholds, and
 * the title fallback chain.
 */
import {
  topSetFromExerciseData,
  intensityTier,
  shareSessionName,
  liftOptionsFromExerciseData,
  defaultLiftIndex,
  shareCardTitle,
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

  test('EL-7: never picks a ballistic set even when it is the heaviest', () => {
    const data = [{
      name: 'Kettlebell Swing',
      loggedSets: [
        { weight: 200, reps: 1, setType: 'straight', evidenceClass: 'ballistic' },
        { weight: 20, reps: 20, setType: 'straight', evidenceClass: 'circuit_ballistic' },
        { weight: 100, reps: 8, setType: 'straight', evidenceClass: null },
      ],
    }];
    expect(topSetFromExerciseData(data)).toEqual({ weight: 100, reps: 8, exerciseName: 'Kettlebell Swing' });
  });

  test('EL-7: a plain circuit set is still a candidate', () => {
    const data = [{ name: 'Goblet Squat', loggedSets: [{ weight: 40, reps: 10, setType: 'straight', evidenceClass: 'circuit' }] }];
    expect(topSetFromExerciseData(data)).toEqual({ weight: 40, reps: 10, exerciseName: 'Goblet Squat' });
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
    expect(shareSessionName('', [])).toBe('Workout complete');
    expect(shareSessionName(undefined)).toBe('Workout complete');
  });
});

// Founder order 2026-09-26 on the share image: "I want the user to be able to
// select their Top Lift rather than it just doing one", and exercise names do
// not appear on the image "at all".
describe('liftOptionsFromExerciseData', () => {
  const DATA = [
    { name: 'Bench', loggedSets: [
      { weight: 60, reps: 10, setType: 'warmup' },
      { weight: 100, reps: 5 },
      { weight: 100, reps: 7 },
      { weight: 90, reps: 8 },
    ] },
    { name: 'Kettlebell Swing', loggedSets: [{ weight: 32, reps: 20, evidenceClass: 'ballistic' }] },
    { name: 'Pull-up', loggedSets: [{ weight: 0, reps: 12 }] },
    { name: 'Squat', loggedSets: [{ weight: '140', reps: 3 }] },
    { name: 'Bench', loggedSets: [{ weight: 102.5, reps: 2 }] },
  ];

  test('one entry per exercise, its heaviest working set, in session order', () => {
    expect(liftOptionsFromExerciseData(DATA)).toEqual([
      { weight: 102.5, reps: 2, exerciseName: 'Bench' },
      { weight: 140, reps: 3, exerciseName: 'Squat' },
    ]);
  });

  test('more reps break a tie at the same weight', () => {
    const [bench] = liftOptionsFromExerciseData([DATA[0]]);
    expect(bench).toEqual({ weight: 100, reps: 7, exerciseName: 'Bench' });
  });

  test('the heaviest entry names what topSetFromExerciseData picks', () => {
    const top = topSetFromExerciseData(DATA);
    const options = liftOptionsFromExerciseData(DATA);
    const heaviest = options.reduce((a, o) => (o.weight > a.weight ? o : a));
    expect([heaviest.exerciseName, heaviest.weight]).toEqual([top.exerciseName, top.weight]);
  });

  test('nothing to choose from is an empty list, never a throw', () => {
    expect(liftOptionsFromExerciseData(null)).toEqual([]);
    expect(liftOptionsFromExerciseData([{ name: 'Plank', loggedSets: [{ weight: 0, reps: 1 }] }])).toEqual([]);
  });
});

describe('defaultLiftIndex', () => {
  const OPTIONS = [
    { weight: 100, reps: 5, exerciseName: 'Bench' },
    { weight: 180, reps: 5, exerciseName: 'Leg Press' },
    { weight: 60, reps: 8, exerciseName: 'Row' },
  ];

  test('opens on the heaviest lift that set a new best today', () => {
    expect(defaultLiftIndex(OPTIONS, [{ exerciseName: 'Row' }, { exerciseName: 'Bench' }])).toBe(0);
  });

  test('otherwise on the heaviest lift of the session', () => {
    expect(defaultLiftIndex(OPTIONS, [])).toBe(1);
    expect(defaultLiftIndex(OPTIONS)).toBe(1);
  });

  test('no options is -1 (no top lift)', () => {
    expect(defaultLiftIndex([], [{ exerciseName: 'Bench' }])).toBe(-1);
  });
});

describe('shareCardTitle', () => {
  const at = (h) => new Date(2026, 8, 26, h, 30).getTime();

  test('a named routine always wins', () => {
    expect(shareCardTitle('  Back + Delts (Width) ', at(7))).toBe('Back + Delts (Width)');
  });

  test('otherwise the time of day, never a list of exercise names', () => {
    expect(shareCardTitle('', at(7))).toBe('Morning workout');
    expect(shareCardTitle(null, at(13))).toBe('Afternoon workout');
    expect(shareCardTitle(null, at(19))).toBe('Evening workout');
    expect(shareCardTitle(null, at(23))).toBe('Night workout');
    expect(shareCardTitle(null, at(3))).toBe('Night workout');
    expect(shareCardTitle(null, new Date(2026, 8, 26, 9).toISOString())).toBe('Morning workout');
  });

  test('an unknown start time falls back to the generic label', () => {
    expect(shareCardTitle(null, null)).toBe('Workout complete');
    expect(shareCardTitle(undefined, 'not a date')).toBe('Workout complete');
  });
});
