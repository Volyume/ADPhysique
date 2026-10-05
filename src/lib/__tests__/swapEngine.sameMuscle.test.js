/**
 * swapEngine.sameMuscle.test.js -- D219 lane A4 (design 4.12 and 1.6: "Swap
 * candidates are not filtered by muscle, so a swap can move a slot's weekly
 * sets to another muscle with no word about it", probe 4: 4 of 22 typical swap
 * sheets listed another muscle's exercise).
 *
 * What this suite pins and why: the sheet lists exercises for the SAME primary
 * muscle first. rankSwaps scored the muscle at 40 of a possible 105, so a
 * different-muscle exercise that matched on pattern, equipment, tier, fatigue
 * and return (65) outranked a same-muscle one that matched on little, and
 * rankPersonalised then re-sorted by personal standing and by how staple an
 * exercise is, so a different-muscle staple could lead a list of eight. Both
 * fail on the code before this lane. Nothing is filtered out: a person can still
 * choose another muscle's exercise, further down, with a note.
 */
import { rankSwaps } from '../swapEngine';
import { rankPersonalised } from '../exercise/intent';

const camel = (id, name, primaryMuscle, extra = {}) => ({
  id, name, primaryMuscle, movementPattern: 'knee_extension', equipment: 'machine',
  compoundIsolation: 'isolation', fatigueCost: 2, stimulusToFatigueRatio: 4, subregion: null, ...extra,
});

// The original is a quads isolation machine. The glutes candidates match it on
// pattern, equipment, tier, fatigue and return (65); the quads candidates match
// the muscle alone (40) plus a tier match (10).
const ORIGINAL = camel('legext', 'Leg Extension', 'quads');
const GLUTES = [
  camel('abduct', 'Hip Abduction Machine', 'glutes'),
  camel('kick', 'Glute Kickback Machine', 'glutes'),
];
const QUADS = [
  camel('sissy', 'Sissy Squat', 'quads', { movementPattern: 'squat', equipment: 'bodyweight', fatigueCost: 5, stimulusToFatigueRatio: 1 }),
  camel('lunge', 'Walking Lunge', 'quads', { movementPattern: 'lunge', equipment: 'dumbbell', fatigueCost: 5, stimulusToFatigueRatio: 1 }),
  camel('hack', 'Hack Squat', 'quads', { movementPattern: 'squat', equipment: 'barbell', compoundIsolation: 'compound', fatigueCost: 5, stimulusToFatigueRatio: 1 }),
];
const LIB = [ORIGINAL, ...GLUTES, ...QUADS];

describe('rankSwaps lists the same primary muscle first', () => {
  test('the premise: on the structural score alone the glutes candidates lead', () => {
    const score = (id) => rankSwaps(ORIGINAL, LIB, { numResults: 10 }).find((r) => r.exercise.id === id).score;
    expect(score('abduct')).toBeGreaterThan(score('sissy'));
  });

  test('every quads candidate comes before every glutes candidate, in score order within each group', () => {
    const ranked = rankSwaps(ORIGINAL, LIB, { numResults: 10 });
    expect(ranked.slice(0, 3).map((r) => r.exercise.primaryMuscle)).toEqual(['quads', 'quads', 'quads']);
    expect(ranked.slice(3).map((r) => r.exercise.primaryMuscle)).toEqual(['glutes', 'glutes']);
    const quads = ranked.slice(0, 3);
    for (let i = 1; i < quads.length; i++) expect(quads[i - 1].score).toBeGreaterThanOrEqual(quads[i].score);
  });

  test('a short list shows the same muscle, not the other muscle that scored higher', () => {
    const ranked = rankSwaps(ORIGINAL, LIB, { numResults: 3 });
    expect(ranked.map((r) => r.exercise.primaryMuscle)).toEqual(['quads', 'quads', 'quads']);
  });

  test('each result says whether it shares the muscle, so the personal layer can keep the order', () => {
    const ranked = rankSwaps(ORIGINAL, LIB, { numResults: 10 });
    expect(ranked.filter((r) => r.sameMuscle).map((r) => r.exercise.id).sort()).toEqual(['hack', 'lunge', 'sissy']);
    expect(ranked.filter((r) => !r.sameMuscle).map((r) => r.exercise.id).sort()).toEqual(['abduct', 'kick']);
  });

  test('nothing is filtered out: another muscle\'s exercise is still offered, further down', () => {
    const ids = rankSwaps(ORIGINAL, LIB, { numResults: 10 }).map((r) => r.exercise.id);
    expect(ids).toEqual(expect.arrayContaining(['abduct', 'kick']));
  });

  test('legacy "shoulders" and "side_delts" are one muscle, and snake_case rows are read', () => {
    const original = camel('lat', 'Cable Lateral Raise', 'shoulders');
    const sameMuscle = { ...camel('db', 'Dumbbell Lateral Raise', 'side_delts'), equipment: 'dumbbell', movementPattern: 'abduction' };
    const other = camel('curl', 'Bayesian Curl', 'biceps');
    const ranked = rankSwaps(original, [other, sameMuscle], { numResults: 5 });
    expect(ranked[0].exercise.id).toBe('db');
    expect(ranked[0].sameMuscle).toBe(true);
    const snake = rankSwaps({ id: 'a', name: 'A', primary_muscle: 'chest' }, [
      { id: 'b', name: 'B', primary_muscle: 'back' },
      { id: 'c', name: 'C', primary_muscle: 'chest' },
    ]);
    expect(snake[0].exercise.id).toBe('c');
  });

  test('an original with no muscle (a custom exercise) is ranked on score alone, as before', () => {
    const original = camel('own', 'My Own', null);
    const ranked = rankSwaps(original, LIB, { numResults: 10 });
    expect(ranked.every((r) => r.sameMuscle === false)).toBe(true);
    const scores = ranked.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(ranked.slice(0, 2).map((r) => r.exercise.id).sort()).toEqual(['abduct', 'kick']);
  });
});

describe('the personal layer keeps the same muscle first', () => {
  const state = {
    intents: new Map(), swaps: [], defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: 'block-1',
  };

  test('a staple of another muscle does not climb over a same-muscle exercise it would otherwise beat', () => {
    // Without the flag the generic judgement (staples before obscure movements)
    // puts the Rope Pushdown first; with it the same-muscle JM Press leads.
    const candidates = [
      { exercise: { id: 'rope', name: 'Rope Pushdown' }, score: 10, sameMuscle: false },
      { exercise: { id: 'jm', name: 'JM Press' }, score: 10, sameMuscle: true },
    ];
    const withoutFlag = rankPersonalised(state, candidates.map(({ sameMuscle, ...c }) => c), { fromExerciseId: 'x' });
    expect(withoutFlag[0].exercise.id).toBe('rope');
    const ranked = rankPersonalised(state, candidates, { fromExerciseId: 'x' });
    expect(ranked.map((r) => r.exercise.id)).toEqual(['jm', 'rope']);
  });

  test('inside a muscle the personal order is unchanged', () => {
    const candidates = [
      { exercise: { id: 'jm', name: 'JM Press' }, score: 10, sameMuscle: true },
      { exercise: { id: 'rope', name: 'Rope Pushdown' }, score: 10, sameMuscle: true },
    ];
    expect(rankPersonalised(state, candidates, { fromExerciseId: 'x' })[0].exercise.id).toBe('rope');
  });

  test('the sheet\'s own pipeline (rank, personalise, show eight) offers same-muscle exercises first', () => {
    const many = [ORIGINAL];
    for (let i = 0; i < 9; i++) many.push(camel(`q${i}`, `Quads ${i}`, 'quads', { movementPattern: 'squat', equipment: 'barbell', fatigueCost: 5, stimulusToFatigueRatio: 1 }));
    for (let i = 0; i < 6; i++) many.push(camel(`g${i}`, `Glutes ${i}`, 'glutes'));
    const ranked = rankSwaps(ORIGINAL, many, { numResults: 20 });
    const shown = rankPersonalised(state, ranked, { fromExerciseId: ORIGINAL.id, routineId: null }).slice(0, 8);
    expect(shown.map((r) => r.exercise.primaryMuscle)).toEqual(new Array(8).fill('quads'));
  });
});
