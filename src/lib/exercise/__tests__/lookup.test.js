/**
 * The one exercise lookup (register D218): unfiltered, survivor-aware, with
 * the set's own name snapshot as the fallback. Pins what every reporting
 * surface relies on:
 *   - a soft-deleted custom exercise still resolves (its sets stay named and
 *     credited; deleting a definition never hides training that happened);
 *   - a retired id answers with its survivor's row (D217) unless the install
 *     still holds the retired row itself;
 *   - a set with an unknown id is named from its snapshot, through the
 *     survivor name, and only then "Exercise"; it is never nameless;
 *   - a set with an unknown id but a snapshot matching a row resolves to that
 *     row (so it can credit a muscle), and a live row beats a deleted twin;
 *   - the type and semantics maps carry the aliases too;
 *   - the shared resolvers accept a plain `{ id: row }` map as well.
 */
import {
  buildExerciseLookup, resolveExerciseFor, exerciseNameFor, exerciseTypeOf, loadSemanticsOf,
} from '../lookup';
import { canonicalExerciseId } from '../canonicalId';

const RETIRED = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR = canonicalExerciseId('Machine Lateral Raise');

const rows = [
  { id: SURVIVOR, name: 'Machine Lateral Raise', primaryMuscle: 'side_delts', exerciseType: 'weight_reps', loadSemantics: 'total' },
  { id: 'db-curl', name: 'Dumbbell Curl', primary_muscle: 'biceps', exercise_type: 'weight_reps', load_semantics: 'per_hand' },
  { id: 'custom-dead', name: 'Garage Press', primaryMuscle: 'chest', isCustom: 1, deletedAt: 1700000000000 },
  { id: 'twin-live', name: 'Twin Move', primaryMuscle: 'quads' },
  { id: 'twin-dead', name: 'Twin Move', primaryMuscle: 'glutes', deletedAt: 1 },
  { id: 'walk', name: 'Heel Walk', primaryMuscle: 'tibialis', exerciseType: 'distance' },
];

describe('buildExerciseLookup', () => {
  const lookup = buildExerciseLookup(rows);

  test('a soft-deleted custom exercise still resolves by id', () => {
    expect(lookup.get('custom-dead')?.name).toBe('Garage Press');
    expect(lookup.nameFor({ exerciseId: 'custom-dead' })).toBe('Garage Press');
  });

  test('a retired id answers with its survivor row, and the maps carry the alias', () => {
    expect(lookup.get(RETIRED)).toBe(lookup.get(SURVIVOR));
    expect(lookup.exerciseTypeById[RETIRED]).toBe('weight_reps');
    expect(lookup.loadSemanticsById[RETIRED]).toBe('total');
    expect(lookup.nameFor({ exercise_id: RETIRED })).toBe('Machine Lateral Raise');
  });

  test('an install that still holds the retired row keeps answering with it', () => {
    const withRetired = buildExerciseLookup([...rows, { id: RETIRED, name: 'Lateral Raise Machine', primaryMuscle: 'side_delts' }]);
    expect(withRetired.get(RETIRED)?.name).toBe('Lateral Raise Machine');
  });

  test('an unknown id is named from the snapshot, through the survivor name, never left blank', () => {
    expect(lookup.nameFor({ exerciseId: 'ghost', exerciseName: 'Cable Thing' })).toBe('Cable Thing');
    expect(lookup.nameFor({ exerciseId: 'ghost', exercise_name: 'Rope Pushdown' })).toBe('Tricep Pushdown (Rope)');
    expect(lookup.nameFor({ exerciseId: 'ghost' })).toBe('Exercise');
    expect(lookup.nameFor({ exerciseId: 'ghost', exerciseName: '   ' })).toBe('Exercise');
  });

  test('an unknown id with a snapshot that matches a row resolves to that row (so it credits a muscle)', () => {
    const row = lookup.resolve({ exerciseId: 'other-device-id', exerciseName: 'dumbbell curl' });
    expect(row?.id).toBe('db-curl');
    expect(lookup.semanticsFor({ exerciseId: 'other-device-id', exerciseName: 'Dumbbell Curl' })).toBe('per_hand');
  });

  test('a snapshot carrying a retired name resolves to the survivor row', () => {
    expect(lookup.resolve({ exerciseId: 'nope', exerciseName: 'Lateral Raise Machine' })?.id).toBe(SURVIVOR);
  });

  test('a live row beats a soft-deleted twin of the same name', () => {
    expect(lookup.resolve({ exerciseId: 'nope', exerciseName: 'Twin Move' })?.id).toBe('twin-live');
  });

  test('type and semantics read both spellings and default honestly', () => {
    expect(lookup.typeFor({ exerciseId: 'walk' })).toBe('distance');
    expect(lookup.typeFor({ exerciseId: 'ghost' })).toBe('weight_reps');
    expect(lookup.semanticsFor({ exerciseId: 'db-curl' })).toBe('per_hand');
    expect(lookup.semanticsFor({ exerciseId: 'ghost' })).toBe('total');
    expect(exerciseTypeOf({ type: 'duration' })).toBe('duration');
    expect(loadSemanticsOf(null)).toBe('total');
  });

  test('is frozen and tolerates junk input', () => {
    expect(Object.isFrozen(lookup)).toBe(true);
    expect(lookup.get(null)).toBeNull();
    expect(lookup.get(42)).toBeNull();
    expect(buildExerciseLookup(null).rows).toEqual([]);
    expect(buildExerciseLookup([null, { name: 'no id' }]).rows).toEqual([]);
  });
});

describe('the shared resolvers accept a lookup or a plain map', () => {
  const lookup = buildExerciseLookup(rows);
  const plain = { 'db-curl': rows[1] };

  test('resolveExerciseFor', () => {
    expect(resolveExerciseFor(lookup, { exerciseId: RETIRED })?.id).toBe(SURVIVOR);
    expect(resolveExerciseFor(plain, { exerciseId: 'db-curl' })?.name).toBe('Dumbbell Curl');
    expect(resolveExerciseFor(plain, { exerciseId: 'ghost' })).toBeNull();
    expect(resolveExerciseFor(plain, { exerciseId: 'toString' })).toBeNull(); // prototype keys are not exercises
    expect(resolveExerciseFor(null, { exerciseId: 'x' })).toBeNull();
  });

  test('exerciseNameFor', () => {
    expect(exerciseNameFor(lookup, { exerciseId: 'ghost', exerciseName: 'Cable Thing' })).toBe('Cable Thing');
    expect(exerciseNameFor(plain, { exerciseId: 'db-curl' })).toBe('Dumbbell Curl');
    expect(exerciseNameFor(plain, { exerciseId: 'ghost', exercise_name: 'Rope Pushdown' })).toBe('Tricep Pushdown (Rope)');
    expect(exerciseNameFor(plain, { exerciseId: 'ghost' })).toBe('Exercise');
    expect(exerciseNameFor(null, { exerciseId: 'ghost' })).toBe('Exercise');
  });
});
