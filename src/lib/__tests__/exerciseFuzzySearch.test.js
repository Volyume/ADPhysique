/**
 * Pins the pure-JS fuzzy scorer behind the exercise picker search
 * (L07-F6, design-usability-audit-2026-07-09 / 07-workout-logger.md). No
 * dependency: this is a hand-written token scorer, so these tests lock the
 * exact behaviours the audit asked for (typo tolerance, partial words,
 * out-of-order words) plus the "does not match everything" guard.
 */
import { fuzzyScore, fuzzySearch, tokenize, levenshteinDistance } from '../exerciseFuzzySearch';

describe('tokenize', () => {
  test('lower-cases and splits on non-alphanumeric boundaries', () => {
    expect(tokenize('Bulgarian Split Squat')).toEqual(['bulgarian', 'split', 'squat']);
    expect(tokenize('Barbell Row (Underhand)')).toEqual(['barbell', 'row', 'underhand']);
  });

  test('returns an empty array for empty/whitespace input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('levenshteinDistance', () => {
  test('is 0 for identical strings and matches known edit distances', () => {
    expect(levenshteinDistance('squat', 'squat')).toBe(0);
    expect(levenshteinDistance('sqaut', 'squat')).toBe(2); // transposition
    expect(levenshteinDistance('bench', 'bnech')).toBe(2);
    expect(levenshteinDistance('', 'abc')).toBe(3);
  });
});

describe('fuzzyScore', () => {
  test('an empty query matches everything with the maximum score', () => {
    expect(fuzzyScore('', 'Bench Press')).toBe(1);
    expect(fuzzyScore('   ', 'Bench Press')).toBe(1);
  });

  test('exact match scores highest', () => {
    expect(fuzzyScore('bench press', 'Bench Press')).toBe(1);
  });

  test('audit example: "bul garian" finds "Bulgarian Split Squat"', () => {
    expect(fuzzyScore('bul garian', 'Bulgarian Split Squat')).toBeGreaterThan(0);
  });

  test('out-of-order words still match regardless of typed order', () => {
    const forward = fuzzyScore('bulgarian split squat', 'Bulgarian Split Squat');
    const reversed = fuzzyScore('squat split bulgarian', 'Bulgarian Split Squat');
    expect(forward).toBeGreaterThan(0);
    expect(reversed).toBeGreaterThan(0);
  });

  test('a genuine typo (transposed letters) still matches', () => {
    expect(fuzzyScore('buglarian split squat', 'Bulgarian Split Squat')).toBeGreaterThan(0);
    expect(fuzzyScore('sqaut', 'Barbell Squat')).toBeGreaterThan(0);
  });

  test('a partial prefix word matches', () => {
    expect(fuzzyScore('bulg', 'Bulgarian Split Squat')).toBeGreaterThan(0);
  });

  test('every typed word must match something, or the whole query fails', () => {
    // "curl" has nothing to match against in "Leg Press" - must not return
    // every exercise sharing only the word "leg".
    expect(fuzzyScore('leg curl', 'Leg Press')).toBe(0);
  });

  test('an unrelated query does not match', () => {
    expect(fuzzyScore('xyz123qq', 'Bench Press')).toBe(0);
  });
});

describe('fuzzySearch', () => {
  const exercises = [
    { name: 'Bulgarian Split Squat' },
    { name: 'Back Squat' },
    { name: 'Front Squat' },
    { name: 'Bench Press' },
  ];

  test('returns the unfiltered list, in the same order, for an empty query', () => {
    expect(fuzzySearch(exercises, '', e => e.name)).toEqual(exercises);
  });

  test('filters out non-matches and keeps matches', () => {
    const result = fuzzySearch(exercises, 'bul garian', e => e.name);
    expect(result.map(e => e.name)).toEqual(['Bulgarian Split Squat']);
  });

  test('ranks a closer match above a looser one', () => {
    const list = [
      { name: 'Squat' }, // exact token match
      { name: 'Squatting Jack' }, // partial/prefix match
    ];
    const result = fuzzySearch(list, 'squat', e => e.name);
    expect(result[0].name).toBe('Squat');
  });
});
