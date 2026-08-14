/**
 * searchPersonal.test.js — Campaign 17B jobs 1 and 2.
 *
 * FOUNDER QUESTION (job 1): "When I search for something I eat regularly, does
 * MY exact food appear before a generic alternative?"
 *
 * The ranking layer already existed and was already live: `rankByPersonalHistory`
 * lifts favourites, slot-recents and frequents above generic database matches,
 * and FoodSearchScreen has called it since it shipped. What it could not do was
 * ADD. A mature user whose exact branded yoghurt sat below twenty-five generic
 * text matches never saw it, because the ranker had nothing to promote - the
 * row was not in the result set at all.
 *
 * `mergePersonalMatches` closes that, and this suite pins both halves plus the
 * rule that governs them: IDENTITY, NOT NAME. Everything matches and dedupes on
 * `food_ref`, which carries the source. A user's history with one specific
 * branded item must never promote every food that merely looks like it.
 *
 * Job 2's serving memory is pinned here too, at the data level: the remembered
 * portion is keyed on the exact food_ref, so it can never transfer across
 * similar foods.
 */
import {
  rankByPersonalHistory,
  mergePersonalMatches,
  foodNameMatchesQuery,
  normaliseFoodQuery,
  selectTabRows,
} from '../searchTabs';

const row = (ref, name) => ({ food_ref: ref, name });

describe('query normalisation is small on purpose', () => {
  test('case and punctuation are levelled', () => {
    expect(normaliseFoodQuery("Kellogg's Corn Flakes")).toBe('kellogg s corn flakes');
    expect(normaliseFoodQuery('  GREEK   yoghurt ')).toBe('greek yoghurt');
  });

  test('it is not a spell-checker and does not pretend to be', () => {
    // No edit distance, no phonetics. "yoghurt" and "yogurt" stay different
    // words; that is a genuine limitation, recorded rather than papered over.
    expect(normaliseFoodQuery('yoghurt')).not.toBe(normaliseFoodQuery('yogurt'));
  });
});

describe('name matching covers the founder\'s stated variations, and no more', () => {
  test('singular and plural find each other', () => {
    expect(foodNameMatchesQuery('Porridge oats', 'oat')).toBe(true);
    expect(foodNameMatchesQuery('Oat milk', 'oats')).toBe(true);
  });

  test('punctuation and spacing variation still match', () => {
    expect(foodNameMatchesQuery("Kellogg's Corn Flakes", 'kelloggs corn')).toBe(true);
    expect(foodNameMatchesQuery('Greek-style yoghurt', 'greek yoghurt')).toBe(true);
  });

  test('every query word must appear: a partial-word query does not match anything', () => {
    expect(foodNameMatchesQuery('Chicken breast', 'chicken rice')).toBe(false);
  });

  test('a one-character query never matches', () => {
    expect(foodNameMatchesQuery('Chicken breast', 'c')).toBe(false);
  });
});

describe('the user\'s own food is MERGED IN, not merely re-ordered', () => {
  const mine = row('off:5011026005271', 'Fage Total 0% Greek yoghurt');

  test('it appears even when the query returned twenty-five generic rows without it', () => {
    const generic = Array.from({ length: 25 }, (_, i) => row(`off:generic-${i}`, `Greek yoghurt ${i}`));
    expect(generic.map((r) => r.food_ref)).not.toContain(mine.food_ref);
    const merged = mergePersonalMatches(generic, { personal: [mine], query: 'greek yoghurt' });
    expect(merged.map((r) => r.food_ref)).toContain(mine.food_ref);
  });

  test('and the ranker then puts it FIRST, above every generic match', () => {
    const generic = Array.from({ length: 25 }, (_, i) => row(`off:generic-${i}`, `Greek yoghurt ${i}`));
    const merged = mergePersonalMatches(generic, { personal: [mine], query: 'greek yoghurt' });
    const ranked = rankByPersonalHistory(merged, { favouriteRefs: new Set([mine.food_ref]) });
    expect(ranked[0].food_ref).toBe(mine.food_ref);
  });

  test('a food already in the results is not duplicated', () => {
    const results = [row('off:generic-1', 'Greek yoghurt'), mine];
    const merged = mergePersonalMatches(results, { personal: [mine], query: 'greek yoghurt' });
    expect(merged.filter((r) => r.food_ref === mine.food_ref).length).toBe(1);
  });

  test('personal foods that do NOT match the query are left out', () => {
    const other = row('off:999', 'Chicken breast');
    const merged = mergePersonalMatches([], { personal: [other], query: 'greek yoghurt' });
    expect(merged).toEqual([]);
  });

  test('the merged personal rows are never truncated away by the cap', () => {
    const generic = Array.from({ length: 40 }, (_, i) => row(`off:g${i}`, 'Greek yoghurt'));
    const merged = mergePersonalMatches(generic, { personal: [mine], query: 'greek yoghurt', limit: 5 });
    expect(merged.map((r) => r.food_ref)).toContain(mine.food_ref);
  });

  test('with no query, or no personal foods, the results are returned untouched', () => {
    const results = [row('off:1', 'A')];
    expect(mergePersonalMatches(results, { personal: [mine], query: '' })).toBe(results);
    expect(mergePersonalMatches(results, { personal: [], query: 'greek' })).toBe(results);
  });
});

describe('IDENTITY, NOT NAME', () => {
  test('two foods with the SAME name from different sources stay two foods', () => {
    const branded = row('off:5011026005271', 'Greek yoghurt');
    const reference = row('curated:greek_yogurt_0', 'Greek yoghurt');
    const custom = row('custom:abc', 'Greek yoghurt');
    const merged = mergePersonalMatches([reference], {
      personal: [branded, custom], query: 'greek yoghurt',
    });
    const refs = merged.map((r) => r.food_ref);
    expect(refs).toContain(branded.food_ref);
    expect(refs).toContain(reference.food_ref);
    expect(refs).toContain(custom.food_ref);
    expect(new Set(refs).size).toBe(3);
  });

  test('history with ONE branded item does not promote every similar name', () => {
    // The founder's rule, as a behaviour: only the exact food the user has a
    // relationship with is lifted; its lookalikes keep their relevance order.
    const mineRef = 'off:5011026005271';
    const results = [
      row('off:other-1', 'Greek yoghurt'),
      row(mineRef, 'Greek yoghurt'),
      row('off:other-2', 'Greek yoghurt'),
    ];
    const ranked = rankByPersonalHistory(results, { frequentRefs: new Set([mineRef]) });
    expect(ranked[0].food_ref).toBe(mineRef);
    // The other two keep their original relative order beneath it.
    expect(ranked.slice(1).map((r) => r.food_ref)).toEqual(['off:other-1', 'off:other-2']);
  });

  test('provenance survives the merge: the source prefix is never rewritten', () => {
    const personal = [
      row('curated:oats', 'Porridge oats'),
      row('custom:my-oats', 'Porridge oats'),
      row('off:123', 'Porridge oats'),
    ];
    const merged = mergePersonalMatches([], { personal, query: 'oats' });
    expect(merged.map((r) => r.food_ref)).toEqual([
      'curated:oats', 'custom:my-oats', 'off:123',
    ]);
  });
});

describe('the ranking intent the founder asked for', () => {
  const fav = row('off:fav', 'Chicken breast');
  const freq = row('off:freq', 'Chicken breast');
  const custom = row('custom:mine', 'Chicken breast');
  const generic = row('off:generic', 'Chicken breast');

  test('favourite, then frequent/recent, then custom, then generic', () => {
    const ranked = rankByPersonalHistory([generic, custom, freq, fav], {
      favouriteRefs: new Set([fav.food_ref]),
      frequentRefs: new Set([freq.food_ref]),
    });
    expect(ranked.map((r) => r.food_ref)).toEqual([
      'off:fav', 'off:freq', 'custom:mine', 'off:generic',
    ]);
  });

  test('personal history never LOSES to generic text relevance', () => {
    // The generic row is first by relevance; the user's frequent food is last.
    const ranked = rankByPersonalHistory([generic, freq], {
      frequentRefs: new Set([freq.food_ref]),
    });
    expect(ranked[0].food_ref).toBe(freq.food_ref);
  });

  test('nothing here claims a food is BETTER: the weights are familiarity only', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../searchTabs.js'), 'utf8',
    );
    expect(src).not.toMatch(/\bbest\b|\bclean\b|\boptimal\b|better for your/i);
  });
});

describe('the live screen actually uses all of this', () => {
  // "Do not confuse a ranking function existing with the search screen using
  // it." Both halves are asserted at the call site.
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../../screens/FoodSearchScreen.js'), 'utf8',
  );

  test('search results are merged AND ranked, in that order', () => {
    expect(SCREEN).toMatch(/rankByPersonalHistory\(\s*mergePersonalMatches\(results, \{ personal: personalPool, query \}\)/);
  });

  test('the personal pool honours the exclusion rules (17A job 6 stays pinned)', () => {
    const start = SCREEN.indexOf('const personalPool');
    expect(start).toBeGreaterThan(-1);
    const body = SCREEN.slice(start, SCREEN.indexOf('const rankedResults', start));
    expect(body).toMatch(/dislikeRefs\.has\(ref\)/);
    expect(body).toMatch(/foodRefExcluded\(ref, suggestExclusions\)/);
  });

  test('the remembered portion is preselected from the exact food_ref', () => {
    expect(SCREEN).toMatch(/slotPortions\.get\(picker\.food\.food_ref\)/);
    expect(SCREEN).toMatch(/getSlotRecentQuantities\(userId, mealSlot\)/);
  });

  test('the sheet PRESELECTS, it does not auto-submit', () => {
    // The remembered portion feeds initialQuantityG on the detail sheet; the
    // user still confirms. One-tap logging stays where it already was.
    expect(SCREEN).toMatch(/initialQuantityG=\{picker\?\.food\?\.last_quantity_g/);
  });

  test('a typed query still searches from every tab (unchanged)', () => {
    const lists = { recents: [row('a', 'A')] };
    expect(selectTabRows({ activeTab: 'recents', query: 'ch', lists, results: [row('b', 'B')] }))
      .toEqual([row('b', 'B')]);
    expect(selectTabRows({ activeTab: 'recents', query: '', lists, results: [] }))
      .toEqual(lists.recents);
  });
});
