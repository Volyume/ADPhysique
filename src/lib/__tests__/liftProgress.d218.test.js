/**
 * liftProgress.d218.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), audit findings F-13 and F-4
 * (docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md).
 *
 * buildLiftProgressRows (Lift Progress, the strength standing, the Athlete
 * profile's key lifts and the Body metrics recomposition card all read it)
 * kept every set that was not a warm-up, so a myo-reps or explosive row, an
 * assistance machine's assistance number and a distance exercise's metres all
 * became an "estimated max", while buildExerciseMetricSeries and Exercise
 * Detail's chart refused those same rows: one lift showed two different
 * bests. It also keyed rows by the raw exercise id and named a row from the
 * filtered library, so a retired id and its survivor were two rows and an
 * exercise the library could not resolve was "Exercise" although every set
 * carries a name snapshot. Pins:
 *  - a set contributes only through isEstimatedMaxRow (the one gate every
 *    estimated-max and record READ shares): bestE1rm, latestWeight, trend and
 *    deltaPct come only from those sets, and an assisted or distance or
 *    duration exercise has no row at all (it has no estimated max);
 *  - rows group by the RESOLVED exercise id, and the name is the lookup's
 *    (row name, else the set's snapshot through the survivor name, else
 *    "Exercise"), the muscle the resolved row's;
 *  - the function still takes the plain exercise ARRAY its other callers
 *    pass (recompReframe.js, athleteProfileSummary.js) and a lookup;
 *  - the e1RM lens of buildExerciseMetricSeries skips an assisted exercise
 *    (the third, optional map; a Map or the lookup's plain object), every
 *    other lens unchanged.
 * Each test is written to fail against the code it replaces.
 */
import { buildLiftProgressRows, buildExerciseMetricSeries } from '../liftProgress';
import { calculate1RM } from '../algorithms';
import { buildExerciseLookup } from '../exercise/lookup';
import { canonicalExerciseId } from '../exercise/canonicalId';

const RETIRED_ID = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR_ID = canonicalExerciseId('Machine Lateral Raise');

const round1 = (n) => Math.round(n * 10) / 10;

function set({ exerciseId, workoutId, weight, reps, at, setType = 'straight', evidenceClass = null, exerciseName = null }) {
  return {
    exerciseId, workoutId, weight, actualReps: reps, createdAt: at, setType, evidenceClass, exerciseName,
  };
}

const BENCH = { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', exerciseType: 'weight_reps', loadSemantics: 'total' };
const DIP = { id: 'dip', name: 'Weighted Dip', primaryMuscle: 'chest', exerciseType: 'weighted_bodyweight', loadSemantics: 'added_bodyweight' };
const ASSISTED = { id: 'assisted-pullup', name: 'Assisted Pull-Up', primaryMuscle: 'back', exerciseType: 'weighted_bodyweight', loadSemantics: 'assisted' };
const WALK = { id: 'heel-walk', name: 'Heel Walk', primaryMuscle: 'calves', exerciseType: 'distance', loadSemantics: 'total' };
const PLANK = { id: 'plank', name: 'Plank', primaryMuscle: 'abs', exerciseType: 'duration', loadSemantics: 'total' };
const SURVIVOR = { id: SURVIVOR_ID, name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', exerciseType: 'weight_reps', loadSemantics: 'total' };
const DELETED_CUSTOM = {
  id: 'ex-custom-gone', name: 'Cable Crunch Pro', primaryMuscle: 'quads', exerciseType: 'weight_reps', loadSemantics: 'total',
  isCustom: 1, deletedAt: 1700000000000,
};
const ROWS = [BENCH, DIP, ASSISTED, WALK, PLANK, SURVIVOR, DELETED_CUSTOM];

describe('buildLiftProgressRows: only estimated-max rows contribute (F-13)', () => {
  test('a myo-reps, rest-pause and explosive row never raise the best, the latest weight or the trend', () => {
    const sets = [
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 }),
      // Summed efforts: 50 kg x 27 would out-score 100 x 5 under Epley.
      set({ exerciseId: 'bench', workoutId: 'w2', weight: 50, reps: 27, at: 2000, setType: 'myo_reps' }),
      set({ exerciseId: 'bench', workoutId: 'w2', weight: 55, reps: 27, at: 2001, setType: 'rest_pause' }),
      set({ exerciseId: 'bench', workoutId: 'w2', weight: 40, reps: 20, at: 2002, evidenceClass: 'ballistic' }),
      set({ exerciseId: 'bench', workoutId: 'w3', weight: 105, reps: 5, at: 3000 }),
    ];
    const rows = buildLiftProgressRows(sets, ROWS);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    // Session 2 had nothing eligible, so it is not a session of this lift.
    expect(row.sessions).toBe(2);
    expect(row.trend).toEqual([round1(calculate1RM(100, 5)), round1(calculate1RM(105, 5))]);
    expect(row.bestE1rm).toBe(round1(calculate1RM(105, 5)));
    expect(row.latestWeight).toBe(105);
    expect(row.lastTrainedAt).toBe(3000);
  });

  test('an assisted exercise has no row (the number entered is the help, not a load)', () => {
    const sets = [
      set({ exerciseId: 'assisted-pullup', workoutId: 'w1', weight: 40, reps: 8, at: 1000 }),
      set({ exerciseId: 'assisted-pullup', workoutId: 'w2', weight: 50, reps: 8, at: 2000 }),
      set({ exerciseId: 'bench', workoutId: 'w2', weight: 100, reps: 5, at: 2001 }),
    ];
    const rows = buildLiftProgressRows(sets, ROWS);
    expect(rows.map((r) => r.exerciseId)).toEqual(['bench']);
  });

  test('a distance or duration exercise has no row (metres and seconds are not weight and reps)', () => {
    const sets = [
      set({ exerciseId: 'heel-walk', workoutId: 'w1', weight: 400, reps: 90, at: 1000 }),
      set({ exerciseId: 'plank', workoutId: 'w1', weight: 20, reps: 60, at: 1001 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1002 }),
    ];
    const rows = buildLiftProgressRows(sets, ROWS);
    expect(rows.map((r) => r.exerciseId)).toEqual(['bench']);
  });

  test('weighted bodyweight still has a row', () => {
    const sets = [set({ exerciseId: 'dip', workoutId: 'w1', weight: 20, reps: 8, at: 1000 })];
    const rows = buildLiftProgressRows(sets, ROWS);
    expect(rows).toHaveLength(1);
    expect(rows[0].bestE1rm).toBe(round1(calculate1RM(20, 8)));
  });

  test('warm-up, zero-weight and zero-rep rows still contribute nothing', () => {
    const sets = [
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 40, reps: 10, at: 900, setType: 'warmup' }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 0, reps: 5, at: 1001 }),
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 0, at: 1002 }),
    ];
    const rows = buildLiftProgressRows(sets, ROWS);
    expect(rows[0].sessions).toBe(1);
    expect(rows[0].bestE1rm).toBe(round1(calculate1RM(100, 5)));
  });
});

describe('buildLiftProgressRows: rows group by the resolved exercise and name from the lookup (F-4)', () => {
  test('a retired id and its survivor are ONE row, with sessions from both ids', () => {
    const sets = [
      set({ exerciseId: RETIRED_ID, workoutId: 'w1', weight: 20, reps: 12, at: 1000 }),
      set({ exerciseId: SURVIVOR_ID, workoutId: 'w2', weight: 25, reps: 12, at: 2000 }),
    ];
    const rows = buildLiftProgressRows(sets, buildExerciseLookup(ROWS));
    expect(rows).toHaveLength(1);
    expect(rows[0].exerciseId).toBe(SURVIVOR_ID);
    expect(rows[0].name).toBe('Machine Lateral Raise');
    expect(rows[0].primaryMuscle).toBe('side_delts');
    expect(rows[0].sessions).toBe(2);
    expect(rows[0].trend).toEqual([round1(calculate1RM(20, 12)), round1(calculate1RM(25, 12))]);
  });

  test('a soft-deleted custom exercise keeps its name and muscle when the lookup is unfiltered', () => {
    const sets = [set({ exerciseId: 'ex-custom-gone', workoutId: 'w1', weight: 40, reps: 12, at: 1000 })];
    const rows = buildLiftProgressRows(sets, buildExerciseLookup(ROWS));
    expect(rows[0].name).toBe('Cable Crunch Pro');
    expect(rows[0].primaryMuscle).toBe('quads');
  });

  test('an id nothing resolves is named from its own name snapshot (through the survivor name), never a bare "Exercise"', () => {
    const sets = [
      set({ exerciseId: 'ex-from-another-device', workoutId: 'w1', weight: 30, reps: 10, at: 1000, exerciseName: 'Landmine Press' }),
      // A retired NAME in a snapshot reads as its survivor.
      set({ exerciseId: 'ex-old-device', workoutId: 'w1', weight: 15, reps: 15, at: 1001, exerciseName: 'Lateral Raise Machine' }),
    ];
    const rows = buildLiftProgressRows(sets, buildExerciseLookup(ROWS));
    const byId = Object.fromEntries(rows.map((r) => [r.exerciseId, r]));
    expect(byId['ex-from-another-device'].name).toBe('Landmine Press');
    expect(byId['ex-from-another-device'].primaryMuscle).toBeNull();
    // That snapshot also matches the survivor's row by name, so it is that exercise.
    expect(rows.find((r) => r.name === 'Machine Lateral Raise')).toBeTruthy();
  });

  test('with no snapshot either the name is still "Exercise" (the existing fallback)', () => {
    const sets = [set({ exerciseId: 'ghost', workoutId: 'w1', weight: 50, reps: 5, at: 1000 })];
    const rows = buildLiftProgressRows(sets, buildExerciseLookup(ROWS));
    expect(rows[0].name).toBe('Exercise');
    expect(rows[0].primaryMuscle).toBeNull();
  });
});

describe('buildLiftProgressRows: the exercise ARRAY form its other callers pass keeps working', () => {
  test('an array and the lookup built from it give identical rows', () => {
    const sets = [
      set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 }),
      set({ exerciseId: 'bench', workoutId: 'w2', weight: 105, reps: 5, at: 2000 }),
      set({ exerciseId: 'ex-custom-gone', workoutId: 'w2', weight: 40, reps: 12, at: 2001 }),
    ];
    expect(buildLiftProgressRows(sets, ROWS)).toEqual(buildLiftProgressRows(sets, buildExerciseLookup(ROWS)));
  });

  test('the array form applies the same gates (assisted has no row; names fall back to the snapshot)', () => {
    const sets = [
      set({ exerciseId: 'assisted-pullup', workoutId: 'w1', weight: 40, reps: 8, at: 1000 }),
      set({ exerciseId: 'unknown-id', workoutId: 'w1', weight: 30, reps: 8, at: 1001, exerciseName: 'Landmine Press' }),
    ];
    const rows = buildLiftProgressRows(sets, ROWS);
    expect(rows.map((r) => r.name)).toEqual(['Landmine Press']);
  });

  test('the array form matches a row by its own id as given (a fixture\'s numeric ids, as recompReframe\'s tests use)', () => {
    const sets = [
      set({ exerciseId: 1, workoutId: 'w1', weight: 100, reps: 5, at: 1000 }),
      set({ exerciseId: 1, workoutId: 'w2', weight: 110, reps: 5, at: 2000 }),
    ];
    const rows = buildLiftProgressRows(sets, [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Back Squat' }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Bench Press');
    expect(rows[0].exerciseId).toBe(1);
    expect(rows[0].trend).toHaveLength(2);
  });

  test('null input still returns an empty array', () => {
    expect(buildLiftProgressRows(null, null)).toEqual([]);
    expect(buildLiftProgressRows([], buildExerciseLookup([]))).toEqual([]);
  });
});

describe('buildExerciseMetricSeries: the e1RM lens skips an assisted exercise (F-13)', () => {
  const pullups = [
    set({ exerciseId: 'assisted-pullup', workoutId: 'w1', weight: 40, reps: 8, at: 1000 }),
    set({ exerciseId: 'assisted-pullup', workoutId: 'w2', weight: 30, reps: 8, at: 2000 }),
  ];

  test('with the semantics map (a Map), the exercise has no e1RM points; heaviest and reps are unchanged', () => {
    const out = buildExerciseMetricSeries(pullups, null, new Map([['assisted-pullup', 'assisted']]));
    const series = out.get('assisted-pullup');
    expect(series.e1rm).toEqual([]);
    expect(series.heaviest).toEqual([40, 30]);
    expect(series.reps).toEqual([8, 8]);
    // Lead review (D218): the help is not weight lifted (the load-semantics
    // spec leaves assistance out of every total), so the volume lens reads
    // nought, as the workout summary's Total lifted does.
    expect(series.volume).toEqual([0, 0]);
  });

  test('the volume lens counts a per-hand set twice, as the summary\'s Total lifted does', () => {
    const curls = [set({ exerciseId: 'db-curl', workoutId: 'w1', weight: 15, reps: 10, at: 1000 })];
    expect(buildExerciseMetricSeries(curls, null, new Map([['db-curl', 'per_hand']])).get('db-curl').volume).toEqual([300]);
    expect(buildExerciseMetricSeries(curls).get('db-curl').volume).toEqual([150]);
  });

  test('the lookup\'s plain-object map works the same way', () => {
    const lookup = buildExerciseLookup(ROWS);
    const out = buildExerciseMetricSeries(pullups, new Map([['assisted-pullup', 'weighted_bodyweight']]), lookup.loadSemanticsById);
    expect(out.get('assisted-pullup').e1rm).toEqual([]);
    expect(out.get('assisted-pullup').heaviest).toEqual([40, 30]);
  });

  test('without the map, or for another exercise, the e1RM lens is exactly what it was', () => {
    const plain = buildExerciseMetricSeries(pullups).get('assisted-pullup');
    expect(plain.e1rm).toEqual([round1(calculate1RM(40, 8)), round1(calculate1RM(30, 8))]);
    const benchSets = [set({ exerciseId: 'bench', workoutId: 'w1', weight: 100, reps: 5, at: 1000 })];
    const out = buildExerciseMetricSeries(benchSets, null, new Map([['assisted-pullup', 'assisted']]));
    expect(out.get('bench').e1rm).toEqual([round1(calculate1RM(100, 5))]);
  });

  test('a per-hand or added-bodyweight exercise keeps its e1RM lens', () => {
    const sets = [set({ exerciseId: 'dip', workoutId: 'w1', weight: 20, reps: 8, at: 1000 })];
    const out = buildExerciseMetricSeries(sets, null, { dip: 'added_bodyweight' });
    expect(out.get('dip').e1rm).toEqual([round1(calculate1RM(20, 8))]);
  });
});
