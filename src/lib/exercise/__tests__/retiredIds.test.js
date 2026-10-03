/**
 * retiredIds.js (register D217): the one map from a retired exercise id or
 * name to its survivor. Pins the map against the corpus, the exact pair
 * behind the founder's report (the sets on "Lateral Raise Machine" carried
 * ceab62c3-..., which is that name's canonical id), chain resolution, and
 * the pass-through of anything that is not retired.
 */
const { RETIRED_ENTRIES } = require('../../exerciseCorpus');
const { canonicalExerciseId } = require('../canonicalId');
const {
  RETIRED_ID_TO_SURVIVOR_ID, survivorExerciseId, survivorExerciseName, retiredIdPairs,
} = require('../retiredIds');

test('one entry per retired corpus name, keyed by the canonical id of the retired name', () => {
  expect(RETIRED_ID_TO_SURVIVOR_ID.size).toBe(RETIRED_ENTRIES.length);
  expect(RETIRED_ENTRIES.length).toBeGreaterThanOrEqual(21);
  for (const e of RETIRED_ENTRIES) {
    expect(RETIRED_ID_TO_SURVIVOR_ID.get(canonicalExerciseId(e.name))).toBe(canonicalExerciseId(e.retiredInto));
  }
});

test('the founder\'s report: "Lateral Raise Machine" is ceab62c3-... and resolves to "Machine Lateral Raise"', () => {
  expect(canonicalExerciseId('Lateral Raise Machine')).toBe('ceab62c3-23b6-47d9-9c3f-89422c95c4e1');
  expect(survivorExerciseId('ceab62c3-23b6-47d9-9c3f-89422c95c4e1')).toBe(canonicalExerciseId('Machine Lateral Raise'));
  expect(survivorExerciseName('Lateral Raise Machine')).toBe('Machine Lateral Raise');
});

test('no survivor is itself retired, so every pair resolves in one hop', () => {
  for (const { to } of retiredIdPairs()) {
    expect(RETIRED_ID_TO_SURVIVOR_ID.has(to)).toBe(false);
  }
  expect(retiredIdPairs()).toHaveLength(RETIRED_ID_TO_SURVIVOR_ID.size);
});

test('a live id, a custom id, an empty value or a non-string pass through unchanged', () => {
  const live = canonicalExerciseId('Machine Lateral Raise');
  expect(survivorExerciseId(live)).toBe(live);
  expect(survivorExerciseId('custom-abc')).toBe('custom-abc');
  expect(survivorExerciseId('')).toBe('');
  expect(survivorExerciseId(null)).toBe(null);
  expect(survivorExerciseId(undefined)).toBe(undefined);
  expect(survivorExerciseName('Machine Lateral Raise')).toBe('Machine Lateral Raise');
});

test('a chain of retirements resolves to the final survivor, and a cycle cannot hang', () => {
  const chain = new Map([['a', 'b'], ['b', 'c']]);
  expect(survivorExerciseId('a', chain)).toBe('c');
  expect(retiredIdPairs(chain)).toEqual([{ from: 'a', to: 'c' }, { from: 'b', to: 'c' }]);
  const cycle = new Map([['x', 'y'], ['y', 'x']]);
  expect(['x', 'y']).toContain(survivorExerciseId('x', cycle));
});
