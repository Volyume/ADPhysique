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

  test('L07-F6 spec example: "dumbell press" finds Dumbbell Press variants', () => {
    expect(fuzzyScore('dumbell press', 'Dumbbell Press')).toBeGreaterThan(0);
    expect(fuzzyScore('dumbell press', 'Incline Dumbbell Press')).toBeGreaterThan(0);
    expect(fuzzyScore('dumbell press', 'Decline Dumbbell Press')).toBeGreaterThan(0);
  });

  test('L07-F6 spec example: "lat pulldwon" finds Lat Pulldown', () => {
    expect(fuzzyScore('lat pulldwon', 'Lat Pulldown')).toBeGreaterThan(0);
    expect(fuzzyScore('lat pulldwon', 'Wide Grip Lat Pulldown')).toBeGreaterThan(0);
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

  test('L07-F6 spec example: "dumbell press" finds Dumbbell Press variants, ranked', () => {
    const list = [
      { name: 'Dumbbell Press' },
      { name: 'Incline Dumbbell Press' },
      { name: 'Barbell Squat' },
    ];
    const result = fuzzySearch(list, 'dumbell press', e => e.name);
    expect(result.map(e => e.name)).toEqual(['Dumbbell Press', 'Incline Dumbbell Press']);
  });

  test('L07-F6 spec example: "lat pulldwon" finds Lat Pulldown', () => {
    const list = [
      { name: 'Lat Pulldown' },
      { name: 'Barbell Squat' },
    ];
    const result = fuzzySearch(list, 'lat pulldwon', e => e.name);
    expect(result.map(e => e.name)).toEqual(['Lat Pulldown']);
  });

  test('ranks a closer match above a looser one', () => {
    const list = [
      { name: 'Squat' }, // exact token match
      { name: 'Squatting Jack' }, // partial/prefix match
    ];
    const result = fuzzySearch(list, 'squat', e => e.name);
    expect(result[0].name).toBe('Squat');
  });

  test('an exact substring match always outranks a typo/fuzzy match', () => {
    const list = [
      { name: 'Lat Pulldown' }, // typo'd query matches this via edit distance only
      { name: 'Wide Grip Lat Pulldown' }, // contains the exact query as a substring
    ];
    // "lat pulldwon" is an exact substring of neither name once tokenized
    // ("pulldwon" only fuzzy-matches "pulldown"), so use a query where one
    // candidate is hit exactly and the other only via the typo tolerance.
    const resultExact = fuzzySearch(list, 'lat pulldown', e => e.name);
    expect(resultExact.map(e => e.name)).toEqual(['Lat Pulldown', 'Wide Grip Lat Pulldown']);

    const mixed = [
      { name: 'Bench Press' }, // exact match for "bench press"
      { name: 'Bench Prsss' }, // hypothetical typo'd custom exercise name: only a fuzzy hit
    ];
    const resultMixed = fuzzySearch(mixed, 'bench press', e => e.name);
    expect(resultMixed[0].name).toBe('Bench Press');
  });

  test('is deterministic: repeated runs over the same input return the same order', () => {
    const list = [
      { name: 'Bulgarian Split Squat' },
      { name: 'Back Squat' },
      { name: 'Front Squat' },
      { name: 'Goblet Squat' },
      { name: 'Overhead Squat' },
      { name: 'Bench Press' },
      { name: 'Lat Pulldown' },
    ];
    const queries = ['squat', 'bul garian', 'lat pulldwon', 'dumbell press', ''];
    for (const q of queries) {
      const first = fuzzySearch(list, q, e => e.name).map(e => e.name);
      for (let i = 0; i < 5; i++) {
        const again = fuzzySearch(list, q, e => e.name).map(e => e.name);
        expect(again).toEqual(first);
      }
    }
  });

  test('nonsense input finds nothing', () => {
    const list = [
      { name: 'Bulgarian Split Squat' },
      { name: 'Dumbbell Press' },
      { name: 'Lat Pulldown' },
    ];
    expect(fuzzySearch(list, 'qzxjklw999', e => e.name)).toEqual([]);
  });
});
