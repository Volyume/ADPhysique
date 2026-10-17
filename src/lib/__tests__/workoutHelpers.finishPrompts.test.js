/**
 * Founder request 2026-10-17 (logger): the finish prompts, Remove set and the
 * renumber after a delete or a type change. Pins the pure rules the logger
 * reads, written to FAIL on the code before they existed (none of these
 * helpers were exported):
 *   - missedExercises: an exercise with NO logged set, not one Time Crunch
 *     dropped (_timeCrunchSkipped), in session order, with its index and name;
 *   - missedNamesPhrase: "A", "A and B", "A, B and N more";
 *   - everyExerciseHasWorkingSet: every kept exercise has a non-warm-up set (a
 *     warm-up alone is not "done"); a dropped slot is ignored; an empty list
 *     is never "everything";
 *   - canRemovePendingSet: offered only while the target is more than one
 *     working set above what is logged, so it never goes below logged + 1;
 *   - renumberSetsByKind: set numbers per kind in the order given (warm-ups
 *     on their own; every other type together), the SAME split as
 *     setNumberForKind, so the next set logged can never repeat a number.
 */
import {
  missedExercises,
  missedNamesPhrase,
  everyExerciseHasWorkingSet,
  canRemovePendingSet,
  renumberSetsByKind,
  setNumberForKind,
} from '../workoutHelpers';

const ex = (id, name, sets = [], extra = {}) => ({ exercise: { id, name }, sets, ...extra });
const work = (id) => ({ id, setType: 'straight' });
const warm = (id) => ({ id, setType: 'warmup' });

describe('missedExercises', () => {
  test('lists exercises with no logged set, in session order, with index and name', () => {
    const list = [ex('a', 'Bench Press', [work('s1')]), ex('b', 'Row'), ex('c', 'Curl'), ex('d', 'Squat', [warm('s2')])];
    expect(missedExercises(list)).toEqual([
      { index: 1, id: 'b', name: 'Row' },
      { index: 2, id: 'c', name: 'Curl' },
    ]);
  });

  test('an exercise Time Crunch dropped is never missed', () => {
    const list = [ex('a', 'Bench Press', [work('s1')]), ex('b', 'Row', [], { _timeCrunchSkipped: true })];
    expect(missedExercises(list)).toEqual([]);
  });

  test('an exercise with only a warm-up logged counts as touched (the ended-early rule)', () => {
    expect(missedExercises([ex('a', 'Bench Press', [warm('s1')])])).toEqual([]);
  });

  test('empty, null and entries without sets are safe', () => {
    expect(missedExercises([])).toEqual([]);
    expect(missedExercises(null)).toEqual([]);
    expect(missedExercises([{ exercise: { id: 'a', name: 'Row' } }])).toEqual([{ index: 0, id: 'a', name: 'Row' }]);
  });
});

describe('missedNamesPhrase', () => {
  const m = (...names) => names.map((name, i) => ({ index: i, id: String(i), name }));
  test('one, two, three and many names', () => {
    expect(missedNamesPhrase(m('Row'))).toBe('Row');
    expect(missedNamesPhrase(m('Row', 'Curl'))).toBe('Row and Curl');
    expect(missedNamesPhrase(m('Row', 'Curl', 'Squat'))).toBe('Row, Curl and 1 more');
    expect(missedNamesPhrase(m('Row', 'Curl', 'Squat', 'Lunge', 'Dip'))).toBe('Row, Curl and 3 more');
  });
  test('nothing missed is an empty phrase', () => {
    expect(missedNamesPhrase([])).toBe('');
    expect(missedNamesPhrase(undefined)).toBe('');
  });
});

describe('everyExerciseHasWorkingSet', () => {
  test('true when every kept exercise has a non-warm-up set', () => {
    expect(everyExerciseHasWorkingSet([ex('a', 'A', [work('1')]), ex('b', 'B', [warm('2'), work('3')])])).toBe(true);
  });
  test('a warm-up alone is not done', () => {
    expect(everyExerciseHasWorkingSet([ex('a', 'A', [work('1')]), ex('b', 'B', [warm('2')])])).toBe(false);
  });
  test('a dropped slot is ignored, an empty session is not everything', () => {
    expect(everyExerciseHasWorkingSet([ex('a', 'A', [work('1')]), ex('b', 'B', [], { _timeCrunchSkipped: true })])).toBe(true);
    expect(everyExerciseHasWorkingSet([])).toBe(false);
    expect(everyExerciseHasWorkingSet([ex('b', 'B', [], { _timeCrunchSkipped: true })])).toBe(false);
  });
});

describe('canRemovePendingSet', () => {
  test('offered only while more than one unlogged row remains', () => {
    expect(canRemovePendingSet(4, 0)).toBe(true);
    expect(canRemovePendingSet(4, 2)).toBe(true);
    expect(canRemovePendingSet(4, 3)).toBe(false); // only the next row is left
    expect(canRemovePendingSet(4, 4)).toBe(false);
    expect(canRemovePendingSet(1, 0)).toBe(false);
  });
  test('removing down to logged + 1 is the floor', () => {
    let target = 5;
    const logged = 2;
    while (canRemovePendingSet(target, logged)) target -= 1;
    expect(target).toBe(logged + 1);
  });
  test('a non-number target never offers it', () => {
    expect(canRemovePendingSet(undefined, 0)).toBe(false);
    expect(canRemovePendingSet(NaN, 0)).toBe(false);
  });
});

describe('renumberSetsByKind', () => {
  test('warm-ups and other sets are numbered separately, in the order given', () => {
    const sets = [work('a'), warm('b'), { id: 'c', setType: 'dropset' }, warm('d'), work('e')];
    expect(renumberSetsByKind(sets)).toEqual([
      { id: 'a', setNumber: 1 },
      { id: 'b', setNumber: 1 },
      { id: 'c', setNumber: 2 },
      { id: 'd', setNumber: 2 },
      { id: 'e', setNumber: 3 },
    ]);
  });
  test('closes the gap after a delete: 1, 2 not 2, 3', () => {
    expect(renumberSetsByKind([work('b'), work('c')]).map((n) => n.setNumber)).toEqual([1, 2]);
  });
  test('the next set logged follows the last renumbered one (no collision)', () => {
    const kept = [work('b'), work('c')];
    const last = Math.max(...renumberSetsByKind(kept).map((n) => n.setNumber));
    expect(setNumberForKind(kept, false)).toBe(last + 1);
  });
  test('reads set_type as well as setType, defaults to a working set, tolerates null', () => {
    expect(renumberSetsByKind([{ id: 'a', set_type: 'warmup' }, { id: 'b' }])).toEqual([
      { id: 'a', setNumber: 1 }, { id: 'b', setNumber: 1 },
    ]);
    expect(renumberSetsByKind(null)).toEqual([]);
  });
});
