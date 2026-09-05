/**
 * Pins the pure-JS fuzzy scorer behind the exercise picker search
 * (L07-F6, design-usability-audit-2026-07-09 / 07-workout-logger.md). No
 * dependency: this is a hand-written token scorer, so these tests lock the
 * exact behaviours the audit asked for (typo tolerance, partial words,
 * out-of-order words) plus the "does not match everything" guard.
 *
 * Exercise-library-expansion-2026-09-05 (EL-20): the alias-aware,
 * six-tier ranking (exact name > name prefix > alias exact > alias prefix
 * > fuzzy name > fuzzy alias, tier-rank then alphabetical within each) is
 * pinned below, plus the EL-18 creation-suggestion helper
 * (`findCanonicalNameMatch`) and a perf guard over a synthetic 1,600-row
 * library.
 */
import {
  fuzzyScore, fuzzySearch, tokenize, levenshteinDistance,
  findCanonicalNameMatch, normaliseExerciseName,
} from '../exerciseFuzzySearch';
import { tierRank } from '../exercise/canonicality';

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

// ─── EL-20: alias-aware, six-tier ranking ──────────────────────────────────
describe('fuzzySearch — EL-20 six-tier ranking with aliases', () => {
  // A fixture exercising all six tiers against one query family, with
  // real STAPLE/COMMON names (canonicality.js) so the tier-rank tie-break
  // is exercised against the real registry, not a stand-in.
  const withAliases = (list) => (item) => (list.find(e => e.name === item.name)?.aliases) || [];

  const library = [
    // Tier 0: exact name match for query "Barbell Bench Press".
    { name: 'Barbell Bench Press', aliases: ['Bench Press'] },
    // Tier 1: name prefix ("Barbell Bench Press (Close Grip)" starts with it).
    { name: 'Barbell Bench Press (Close Grip)', aliases: [] },
    // Tier 2/3 candidate, plus the RDL case: alias exact match.
    { name: 'Romanian Deadlift', aliases: ['RDL', 'Stiff-Leg Deadlift'] },
    // A niche variant that only fuzzy-matches "bench press" on the name
    // (no shared alias), used to prove staples outrank it.
    { name: 'Spoto Press', aliases: [] },
  ];
  const getAliases = withAliases(library);
  const getTier = (item) => tierRank(item.name);

  test('tier 0: exact name match', () => {
    const result = fuzzySearch(library, 'Barbell Bench Press', e => e.name, { getAliases, getTier });
    expect(result[0].name).toBe('Barbell Bench Press');
  });

  test('tier 1: name prefix match ranks below an exact match', () => {
    const result = fuzzySearch(library, 'Barbell Bench Press', e => e.name, { getAliases, getTier });
    const names = result.map(e => e.name);
    expect(names.indexOf('Barbell Bench Press')).toBeLessThan(names.indexOf('Barbell Bench Press (Close Grip)'));
  });

  test('tier 2: alias exact match — "RDL" finds Romanian Deadlift through its alias', () => {
    const result = fuzzySearch(library, 'RDL', e => e.name, { getAliases, getTier });
    expect(result.map(e => e.name)).toContain('Romanian Deadlift');
    // Nothing else in the fixture shares "rdl" as a name or alias token.
    expect(result[0].name).toBe('Romanian Deadlift');
  });

  test('tier 3: alias prefix match', () => {
    const result = fuzzySearch(library, 'Stiff-Leg', e => e.name, { getAliases, getTier });
    expect(result[0].name).toBe('Romanian Deadlift');
  });

  test('tier 4 vs tier 5: a name-fuzzy hit outranks an alias-only fuzzy hit', () => {
    const list = [
      { name: 'Cable Row (Neutral Grip)', aliases: [] }, // fuzzy on NAME
      { name: 'Seated Row', aliases: ['Cable Rowing'] }, // fuzzy only on an ALIAS
    ];
    const result = fuzzySearch(list, 'cable row', e => e.name, { getAliases: withAliases(list), getTier });
    expect(result.map(e => e.name)).toEqual(['Cable Row (Neutral Grip)', 'Seated Row']);
  });

  test('"Bench Press" puts the staple Barbell Bench Press above a niche variant', () => {
    // Both "Barbell Bench Press" (via its alias, tier 2) and "Spoto Press"
    // (via name-fuzzy, tier 4) match; the staple's better TIER already
    // wins here, and canonicality.js confirms it also outranks by
    // auto-generation tier (STAPLE vs the unlisted default SPECIALIST).
    expect(tierRank('Barbell Bench Press')).toBeLessThan(tierRank('Spoto Press'));
    const result = fuzzySearch(library, 'Bench Press', e => e.name, { getAliases, getTier });
    const names = result.map(e => e.name);
    expect(names[0]).toBe('Barbell Bench Press');
    expect(names.indexOf('Barbell Bench Press')).toBeLessThan(names.indexOf('Spoto Press'));
  });

  test('within the same match tier, a lower auto-generation tier (staple) sorts first', () => {
    // Two exercises that both hit tier 4 (fuzzy on name) for "press", one
    // a real STAPLE, one unlisted (defaults to SPECIALIST) — confirms the
    // getTier tie-break, isolated from the six match tiers above.
    const list = [
      { name: 'Some Unlisted Novelty Press', aliases: [] },
      { name: 'Machine Chest Press', aliases: [] }, // STAPLE in canonicality.js
    ];
    expect(tierRank('Machine Chest Press')).toBe(0); // STAPLE
    expect(tierRank('Some Unlisted Novelty Press')).toBeGreaterThan(0); // unlisted default
    const result = fuzzySearch(list, 'press', e => e.name, { getAliases: withAliases(list), getTier });
    expect(result[0].name).toBe('Machine Chest Press');
  });

  test('without getTier, ties fall back to alphabetical (pre-EL-20 behaviour, unchanged)', () => {
    const list = [
      { name: 'Zercher Press', aliases: [] },
      { name: 'Arnold Press', aliases: [] },
    ];
    const result = fuzzySearch(list, 'press', e => e.name, { getAliases: withAliases(list) });
    expect(result.map(e => e.name)).toEqual(['Arnold Press', 'Zercher Press']);
  });

  test('an alias may still fail to match — no false positives from unrelated aliases', () => {
    const result = fuzzySearch(library, 'xyz999nonsense', e => e.name, { getAliases, getTier });
    expect(result).toEqual([]);
  });
});

// ─── EL-18: creation-suggestion helper ─────────────────────────────────────
describe('findCanonicalNameMatch', () => {
  const library = [
    { name: 'Romanian Deadlift', aliases: ['RDL', 'Stiff-Leg Deadlift'], isCustom: 0 },
    { name: 'Barbell Bench Press', aliases: ['Bench Press'], isCustom: 0 },
    { name: "Alice's Curl", aliases: [], isCustom: 1 }, // a custom row
  ];

  test('matches an existing canonical row by exact (normalised) name', () => {
    expect(findCanonicalNameMatch('romanian   deadlift', library)?.name).toBe('Romanian Deadlift');
    expect(findCanonicalNameMatch('  Romanian Deadlift  ', library)?.name).toBe('Romanian Deadlift');
  });

  test('matches an existing canonical row through an alias', () => {
    expect(findCanonicalNameMatch('rdl', library)?.name).toBe('Romanian Deadlift');
    expect(findCanonicalNameMatch('Bench Press', library)?.name).toBe('Barbell Bench Press');
  });

  test('is case- and accent-insensitive', () => {
    expect(findCanonicalNameMatch('BENCH PRESS', library)?.name).toBe('Barbell Bench Press');
  });

  test('never matches an existing CUSTOM exercise (canonical rows only)', () => {
    expect(findCanonicalNameMatch("Alice's Curl", library)).toBeNull();
  });

  test('returns null for a genuinely new name', () => {
    expect(findCanonicalNameMatch('Some Brand New Movement', library)).toBeNull();
  });

  test('returns null for an empty/whitespace name', () => {
    expect(findCanonicalNameMatch('', library)).toBeNull();
    expect(findCanonicalNameMatch('   ', library)).toBeNull();
  });

  test('normaliseExerciseName collapses whitespace and strips accents/case', () => {
    expect(normaliseExerciseName('  Café   Curl ')).toBe('cafe curl');
  });
});

// ─── Perf guard: search must feel instant over a large library ────────────
describe('fuzzySearch performance (EL-20)', () => {
  test('ranked search over a synthetic 1,600-row library completes well under 30ms', () => {
    // Synthetic, but shaped like the real corpus: varied implement/muscle
    // words, every 10th row carrying two aliases, so the alias-matching
    // path is genuinely exercised at scale, not skipped.
    const implements_ = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Kettlebell', 'Bodyweight', 'Band', 'Smith'];
    const movements = ['Press', 'Row', 'Squat', 'Curl', 'Raise', 'Extension', 'Pulldown', 'Fly', 'Deadlift', 'Lunge'];
    const modifiers = ['Incline', 'Decline', 'Seated', 'Standing', 'Single-Arm', 'Close Grip', 'Wide Grip', 'Paused'];
    const big = [];
    for (let i = 0; i < 1600; i++) {
      const impl = implements_[i % implements_.length];
      const mov = movements[(i * 3) % movements.length];
      const mod = modifiers[(i * 7) % modifiers.length];
      const name = `${mod} ${impl} ${mov} ${i}`;
      big.push({
        name,
        aliases: i % 10 === 0 ? [`${mov} Alt ${i}`, `${impl} ${mov} Variant ${i}`] : [],
      });
    }
    const getAliases = (item) => item.aliases;
    const getTier = (item) => tierRank(item.name);

    const start = Date.now();
    const result = fuzzySearch(big, 'incline press', e => e.name, { getAliases, getTier });
    const elapsedMs = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    // Generous ceiling (task brief): asserts under 30ms in Jest/node,
    // which is far slower to warn about than to actually breach here.
    expect(elapsedMs).toBeLessThan(30);
    // eslint-disable-next-line no-console
    console.log(`[perf] fuzzySearch over 1,600 rows: ${elapsedMs}ms`);
  });
});
