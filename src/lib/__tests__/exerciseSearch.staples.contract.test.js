/**
 * exerciseSearch.staples.contract.test.js
 *
 * What this suite pins, and why (F-09, docs/final-certification-2026-09-05/
 * 07-FINDINGS.md, evidence in 06-LIBRARY-SEARCH.md):
 *
 * The picker's unit tests all run against small hand-built fixtures, so
 * every one of them passed while the real 918-row corpus returned "Bench
 * Dip" above "Barbell Bench Press" for "bench", buried "Barbell Curl"
 * under a Spanish wrist-curl alias for "curl", put two hip thrusts in the
 * top three for "dip" (via "dip" ~ "hip"), kept Kettlebell Swing out of
 * the top five for the word "swing" entirely, and returned Dumbbell Bench
 * Press second for "glute bridge" (a garbled alias). A fixture cannot
 * catch any of that: the defects lived in the interaction between the
 * ranking rules, the corpus's [Implement] [Angle] [Movement] naming
 * convention and the real alias data.
 *
 * So this suite runs the REAL `fuzzySearch` over the REAL corpus, called
 * exactly as `ExercisePickerModal`'s `listData` memo calls it, and asserts
 * what a person typing each of these words must get. It is a product
 * contract, not a ranking-internals test: it says nothing about tiers or
 * scores, only about which exercise a real query surfaces. If a future
 * ranking change is genuinely better, these expectations are what it has
 * to keep true.
 *
 * The corpus comes from `exerciseCorpus/index.js` (the same module the
 * seed, top-up and re-derive use) through `corpusEntryToSeedRow`, sorted
 * by name — `getAllExercises()` is `ORDER BY name ASC`, so this is the
 * order the picker actually ranks.
 */
const { CORPUS, corpusEntryToSeedRow } = require('../exerciseCorpus');
const { fuzzySearch } = require('../exerciseFuzzySearch');
const { tierRank, autoTier } = require('../exercise/canonicality');

const ALL_EXERCISES = CORPUS
  .map(corpusEntryToSeedRow)
  .sort((a, b) => a.name.localeCompare(b.name));

// The picker's exact call shape (ExercisePickerModal.js `listData`).
function search(query) {
  return fuzzySearch(ALL_EXERCISES, query, (e) => e.name, {
    getAliases: (e) => e.aliases,
    getTier: (e) => tierRank(e.name),
  });
}

const namesTop = (query, n) => search(query).slice(0, n).map((e) => e.name);

describe('exercise search over the real corpus — staples surface (F-09)', () => {
  test('the corpus really is loaded (guards against an empty-list pass)', () => {
    expect(ALL_EXERCISES.length).toBeGreaterThan(900);
    expect(ALL_EXERCISES.some((e) => e.name === 'Barbell Bench Press')).toBe(true);
  });

  test('"bench" surfaces Barbell Bench Press in the top 3', () => {
    expect(namesTop('bench', 3)).toContain('Barbell Bench Press');
  });

  test('"bicep curl" surfaces a barbell or dumbbell curl staple in the top 3', () => {
    const top3 = namesTop('bicep curl', 3);
    expect(top3.some((n) => n === 'Barbell Curl' || n === 'Dumbbell Curl')).toBe(true);
  });

  test('"curl" returns Barbell Curl first', () => {
    expect(namesTop('curl', 1)).toEqual(['Barbell Curl']);
  });

  test('"row" surfaces Barbell Row (Bent Over) in the top 3 and no cable crossover in the top 5', () => {
    expect(namesTop('row', 3)).toContain('Barbell Row (Bent Over)');
    // "row" ~ "low" (edit distance 1) used to pull "Cable Crossover (High
    // to Low)" into third place. Three-letter words now get no allowance.
    expect(namesTop('row', 5).filter((n) => /crossover/i.test(n))).toEqual([]);
  });

  test('"swing" surfaces Kettlebell Swing in the top 3', () => {
    expect(namesTop('swing', 3)).toContain('Kettlebell Swing');
  });

  test('"kb swing" returns Kettlebell Swing first', () => {
    expect(namesTop('kb swing', 1)).toEqual(['Kettlebell Swing']);
  });

  test('"dip" returns no hip thrust in the top 5', () => {
    // "dip" ~ "hip" put Barbell Hip Thrust second and Machine Hip Thrust
    // third, which also inflated the audit's "staple in top 3" count.
    expect(namesTop('dip', 5).filter((n) => /hip thrust/i.test(n))).toEqual([]);
  });

  test('"clean" returns no chest-dip row in the top 5', () => {
    // "clean" ~ "Lean" pulled in "Straight Bar Dip (Chest-Lean)".
    expect(namesTop('clean', 5).filter((n) => /dip/i.test(n))).toEqual([]);
  });

  test('"front squat" surfaces Barbell Front Squat in the top 2', () => {
    expect(namesTop('front squat', 2)).toContain('Barbell Front Squat');
  });

  test('"hamstring curl" surfaces a leg-curl staple in the top 3', () => {
    const top3 = namesTop('hamstring curl', 3);
    expect(top3.some((n) => n === 'Lying Leg Curl' || n === 'Seated Leg Curl')).toBe(true);
  });

  test('"flat db press" surfaces Dumbbell Bench Press in the top 3', () => {
    // Returned ZERO results before F-09: every typed word must match, and
    // no row carried the word "flat" at all.
    expect(namesTop('flat db press', 3)).toContain('Dumbbell Bench Press');
  });

  test('"glute bridge" returns no bench press in the top 5', () => {
    // The garbled alias "Glute Bridge Single-Arm Press" on Dumbbell Bench
    // Press put a bench press second for this search.
    expect(namesTop('glute bridge', 5).filter((n) => /bench press/i.test(n))).toEqual([]);
  });

  test('"rdl" surfaces Romanian Deadlift in the top 2', () => {
    expect(namesTop('rdl', 2)).toContain('Romanian Deadlift');
  });

  test('"ohp" surfaces an overhead-press staple in the top 3', () => {
    const top3 = search('ohp').slice(0, 3);
    expect(top3.some((e) => /overhead press|military press/i.test(e.name) && autoTier(e.name) === 'staple')).toBe(true);
  });
});

describe('exercise search over the real corpus — misspellings still recover (F-09)', () => {
  // The tightened edit-distance allowance (3 letters or fewer none, 4 to 6
  // one, 7 or more two) must not cost the typo tolerance the audit
  // measured at 8/8. Each pair is the misspelling the harness types and a
  // pattern the correct family's name matches.
  const RECOVERIES = [
    ['benhc', /bench press/i],
    ['squt', /squat/i],
    ['deadlft', /deadlift/i],
    ['romainian', /romanian/i],
    ['lateral rase', /lateral raise/i],
    ['tricep pushdwn', /pushdown/i],
    ['kettelbell swing', /kettlebell swing/i],
    ['pullup', /pull-?up/i],
  ];

  test.each(RECOVERIES)('"%s" still finds the right family in the top 3', (query, pattern) => {
    expect(namesTop(query, 3).filter((n) => pattern.test(n)).length).toBeGreaterThan(0);
  });
});
