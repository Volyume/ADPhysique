/**
 * pillars.d218.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), audit findings F-4, F-9, F-12 class and the P17 row of its path
 * table (docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md).
 *
 * The Progress root's Training row ("Strength up on N of M exercises ...",
 * the featured best) counted a set as soon as it was not a warm-up, cluster
 * row or zero, and an exercise as soon as its type was weight_reps. So an
 * assistance machine's assistance number (more help read as a bigger lift), an
 * explosive row and a weighted-bodyweight lift that the live record detector
 * does count were treated differently from every other estimated-max reader,
 * and an exercise the library could not resolve was named "Exercise" in the
 * evidence line although its sets carry a name snapshot. Pins:
 *  - an exercise counts only when its type (exerciseType, exercise_type or
 *    type, weight_reps when unknown) is weight_reps or weighted_bodyweight
 *    and it is not an assistance machine (load semantics 'assisted');
 *  - a set counts only through isEstimatedMaxRow (the one gate every
 *    estimated-max and record read shares), which also refuses an explosive
 *    row;
 *  - RULED CHANGE (D218): a weighted_bodyweight exercise now counts here, as
 *    the live record detector counts it;
 *  - the name is the shared lookup rule (row name, else the set's snapshot,
 *    else "Exercise"), for a plain { [id]: row } map or a lookup.
 * Each test is written to fail against the code it replaces.
 */
import { computeTrainingPillarSummary } from '../pillars';
import { buildExerciseLookup } from '../../exercise/lookup';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-15T12:00:00Z').getTime();

function set(daysAgo, {
  weight = 100, reps = 5, exerciseId = 'e1', setType = 'straight', evidenceClass = null, exerciseName = null,
} = {}) {
  return {
    createdAt: NOW - daysAgo * DAY_MS, weight, actualReps: reps, exerciseId, setType, evidenceClass, exerciseName,
  };
}

// A baseline day well before the window and an improvement inside it.
function improving(exerciseId, extra = {}) {
  return [
    set(20, { weight: 100, exerciseId, ...extra }),
    set(1, { weight: 110, exerciseId, ...extra }),
  ];
}

const summarise = (sets, map) => computeTrainingPillarSummary(sets, map, { now: NOW, windowDays: 30 });

describe('which exercises count (type and load semantics)', () => {
  test('RULED CHANGE: a weighted_bodyweight exercise now counts, as the live record detector counts it', () => {
    const summary = summarise(improving('dip'), { dip: { name: 'Weighted Dip', exerciseType: 'weighted_bodyweight' } });
    expect(summary.trainedCount).toBe(1);
    expect(summary.improvedCount).toBe(1);
    expect(summary.featuredBest.exerciseName).toBe('Weighted Dip');
  });

  test('reps_only, distance and duration exercises never count, whichever key carries the type', () => {
    for (const row of [
      { name: 'Push-up', exerciseType: 'reps_only' },
      { name: 'Run', exercise_type: 'distance' },
      { name: 'Plank', type: 'duration' },
    ]) {
      const summary = summarise(improving('x'), { x: row });
      expect(summary.trainedCount).toBe(0);
      expect(summary.improvedCount).toBe(0);
    }
  });

  test('exerciseType wins over a stale `type` key (the spec order: exerciseType, exercise_type, type)', () => {
    const summary = summarise(improving('x'), { x: { name: 'Run', exerciseType: 'distance', type: 'weight_reps' } });
    expect(summary.trainedCount).toBe(0);
  });

  test('an assistance machine is skipped (the number entered is the help; D107-2), in either key spelling', () => {
    for (const row of [
      { name: 'Assisted Pull-Up', exerciseType: 'weighted_bodyweight', loadSemantics: 'assisted' },
      { name: 'Assisted Dip', exercise_type: 'weight_reps', load_semantics: 'assisted' },
    ]) {
      const summary = summarise(improving('x'), { x: row });
      expect(summary.trainedCount).toBe(0);
      expect(summary.improvedCount).toBe(0);
      expect(summary.featuredBest).toBeNull();
    }
  });

  test('a per-hand or added-bodyweight exercise still counts', () => {
    expect(summarise(improving('db'), { db: { name: 'Dumbbell Press', exerciseType: 'weight_reps', loadSemantics: 'per_hand' } }).improvedCount).toBe(1);
    expect(summarise(improving('dip'), { dip: { name: 'Weighted Dip', exerciseType: 'weighted_bodyweight', loadSemantics: 'added_bodyweight' } }).improvedCount).toBe(1);
  });
});

describe('which sets count (isEstimatedMaxRow)', () => {
  const MAP = { e1: { name: 'Bench press', exerciseType: 'weight_reps' } };

  test('an explosive (ballistic) row neither raises the bar nor counts as a new best', () => {
    const sets = [
      set(20, { weight: 100 }),
      // 40 kg x 25 as a ballistic row would out-score 100 x 5 under Epley.
      set(1, { weight: 40, reps: 25, evidenceClass: 'ballistic' }),
      set(1, { weight: 40, reps: 25, evidenceClass: 'circuit_ballistic' }),
    ];
    const summary = summarise(sets, MAP);
    expect(summary.improvedCount).toBe(0);
    expect(summary.namedBests).toEqual([]);
    // The ballistic rows are not even a training day for this row.
    expect(summary.comparedCount).toBe(0);
  });

  test('warm-up, myo-reps, rest-pause, zero-weight and zero-rep rows are still refused', () => {
    const sets = [
      set(20, { weight: 100 }),
      set(1, { weight: 150, setType: 'warmup' }),
      set(1, { weight: 150, setType: 'myo_reps' }),
      set(1, { weight: 150, setType: 'rest_pause' }),
      set(1, { weight: 0, reps: 5 }),
      set(1, { weight: 150, reps: 0 }),
    ];
    const summary = summarise(sets, MAP);
    expect(summary.improvedCount).toBe(0);
    expect(summary.namedBests).toEqual([]);
  });

  test('an ordinary set (and a circuit set, which is PR-eligible) still counts as before', () => {
    const summary = summarise([set(20, { weight: 100 }), set(1, { weight: 110, evidenceClass: 'circuit' })], MAP);
    expect(summary.improvedCount).toBe(1);
    expect(summary.namedBests[0].weight).toBe(110);
  });
});

describe('the exercise is named by the shared lookup rule (F-4)', () => {
  test('an exercise the map cannot resolve is named from its sets\' own snapshot, not a bare "Exercise"', () => {
    const sets = improving('ex-from-another-device', { exerciseName: 'Landmine Press' });
    const summary = summarise(sets, {});
    expect(summary.featuredBest.exerciseName).toBe('Landmine Press');
    expect(summary.namedBests[0].exerciseName).toBe('Landmine Press');
  });

  test('with no snapshot either it is still "Exercise"', () => {
    const summary = summarise(improving('ghost'), {});
    expect(summary.featuredBest.exerciseName).toBe('Exercise');
  });

  test('a resolved exercise keeps its row name even when a snapshot differs', () => {
    const sets = improving('e1', { exerciseName: 'Old name' });
    expect(summarise(sets, { e1: { name: 'Bench press', exerciseType: 'weight_reps' } }).featuredBest.exerciseName).toBe('Bench press');
  });

  test('the shared lookup is accepted in place of the plain map, with the same answers', () => {
    const rows = [
      { id: 'dip', name: 'Weighted Dip', exerciseType: 'weighted_bodyweight' },
      { id: 'assisted', name: 'Assisted Pull-Up', exerciseType: 'weighted_bodyweight', loadSemantics: 'assisted' },
    ];
    const sets = [...improving('dip'), ...improving('assisted'), ...improving('unknown', { exerciseName: 'Landmine Press' })];
    const viaLookup = summarise(sets, buildExerciseLookup(rows));
    const viaMap = summarise(sets, Object.fromEntries(rows.map((r) => [r.id, r])));
    expect(viaLookup).toEqual(viaMap);
    expect(viaLookup.trainedCount).toBe(2); // the dip and the snapshot-named exercise
    expect(viaLookup.namedBests.map((b) => b.exerciseName).sort()).toEqual(['Landmine Press', 'Weighted Dip']);
  });
});
