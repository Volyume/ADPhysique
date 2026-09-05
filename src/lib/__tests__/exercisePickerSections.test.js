/**
 * Exercise-library-expansion-2026-09-05 (EL-20, 05-DECISIONS.md EL-20):
 * pins the exercise picker's EMPTY-QUERY ordering - recent/frequent, then
 * the active plan's exercises, then staples matching whatever filter is
 * already active, then everything else alphabetically. Real STAPLE names
 * from `exercise/canonicality.js` are used in the fixture so the staple
 * check is exercised against the real registry, not a stand-in.
 */
import {
  buildRecentAndFrequentIds, buildEmptyQuerySections, flattenSectionsForList,
} from '../exercisePickerSections';

describe('buildRecentAndFrequentIds', () => {
  test('recency wins: recent ids keep their order, unchanged', () => {
    const result = buildRecentAndFrequentIds(['a', 'b', 'c'], []);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('a frequent-but-not-recent exercise is appended after recents, ranked by session count', () => {
    const recentIds = ['a', 'b'];
    const usageStats = [
      { exerciseId: 'z', sessions: 10 },
      { exerciseId: 'y', sessions: 3 },
    ];
    expect(buildRecentAndFrequentIds(recentIds, usageStats)).toEqual(['a', 'b', 'z', 'y']);
  });

  test('a single one-off session does not count as "frequent"', () => {
    const usageStats = [{ exerciseId: 'once', sessions: 1 }];
    expect(buildRecentAndFrequentIds([], usageStats)).toEqual([]);
  });

  test('never lists the same exercise twice (recent + frequent overlap)', () => {
    const recentIds = ['a'];
    const usageStats = [{ exerciseId: 'a', sessions: 50 }, { exerciseId: 'b', sessions: 5 }];
    expect(buildRecentAndFrequentIds(recentIds, usageStats)).toEqual(['a', 'b']);
  });

  test('is capped, recents never pushed out by frequency overflow', () => {
    const recentIds = ['r1', 'r2', 'r3'];
    const usageStats = Array.from({ length: 20 }, (_, i) => ({ exerciseId: `f${i}`, sessions: 20 - i }));
    const result = buildRecentAndFrequentIds(recentIds, usageStats, 5);
    expect(result).toHaveLength(5);
    expect(result.slice(0, 3)).toEqual(['r1', 'r2', 'r3']);
  });

  test('tolerates missing/malformed input', () => {
    expect(buildRecentAndFrequentIds(undefined, undefined)).toEqual([]);
    expect(buildRecentAndFrequentIds(null, [{ sessions: 5 }])).toEqual([]); // no exerciseId
  });
});

describe('buildEmptyQuerySections', () => {
  // Real STAPLE/unlisted names (exercise/canonicality.js) so the tier
  // check runs against the real registry.
  const base = [
    { id: '1', name: 'Barbell Bench Press' }, // STAPLE
    { id: '2', name: 'Machine Chest Press' }, // STAPLE
    { id: '3', name: 'Larsen Bench Press' }, // unlisted -> SPECIALIST
    { id: '4', name: 'Cable Crossover (High to Low)' }, // STAPLE
    { id: '5', name: 'Some Novelty Press' }, // unlisted -> SPECIALIST
  ];

  test('with nothing recent/frequent and no plan, sections are just Staples then All exercises', () => {
    const sections = buildEmptyQuerySections({ base });
    expect(sections.map(s => s.key)).toEqual(['staples', 'all']);
    expect(sections[0].items.map(e => e.id)).toEqual(['1', '2', '4']);
    expect(sections[1].items.map(e => e.id)).toEqual(['3', '5']);
  });

  test('recent/frequent items are pulled out ahead of every other section', () => {
    const sections = buildEmptyQuerySections({ base, recentAndFrequentIds: ['3'] });
    expect(sections.map(s => s.key)).toEqual(['recent', 'staples', 'all']);
    expect(sections[0].items.map(e => e.id)).toEqual(['3']);
    // "3" (Larsen Bench Press) no longer appears in "all" - each exercise
    // is in exactly one section.
    expect(sections[2].items.map(e => e.id)).toEqual(['5']);
  });

  test('a recent STAPLE is not also double-listed under Staples', () => {
    const sections = buildEmptyQuerySections({ base, recentAndFrequentIds: ['1'] });
    const staples = sections.find(s => s.key === 'staples');
    expect(staples.items.map(e => e.id)).toEqual(['2', '4']);
  });

  test('"In your plan" sits between Recent and Staples', () => {
    const sections = buildEmptyQuerySections({
      base,
      recentAndFrequentIds: ['4'],
      planExercises: [{ id: '3' }],
    });
    expect(sections.map(s => s.key)).toEqual(['recent', 'plan', 'staples', 'all']);
    expect(sections[1].items.map(e => e.id)).toEqual(['3']);
  });

  test('a plan exercise not present in `base` (filtered out elsewhere) is silently skipped', () => {
    const sections = buildEmptyQuerySections({ base, planExercises: [{ id: 'not-in-base' }] });
    expect(sections.some(s => s.key === 'plan')).toBe(false);
  });

  test('an empty base produces no sections at all', () => {
    expect(buildEmptyQuerySections({ base: [] })).toEqual([]);
  });

  test('tolerates missing options entirely', () => {
    expect(buildEmptyQuerySections()).toEqual([]);
  });
});

describe('flattenSectionsForList', () => {
  test('inserts one header marker ahead of each section\'s items', () => {
    const sections = [
      { key: 'recent', label: 'Recent', items: [{ id: '1' }] },
      { key: 'all', label: 'All exercises', items: [{ id: '2' }, { id: '3' }] },
    ];
    const flat = flattenSectionsForList(sections);
    expect(flat).toEqual([
      { __section: 'Recent', key: 'section-recent' },
      { id: '1' },
      { __section: 'All exercises', key: 'section-all' },
      { id: '2' },
      { id: '3' },
    ]);
  });

  test('an empty section list flattens to an empty array', () => {
    expect(flattenSectionsForList([])).toEqual([]);
  });
});
