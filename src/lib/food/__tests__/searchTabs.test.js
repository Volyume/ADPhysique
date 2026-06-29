import { SEARCH_TABS, selectTabRows, rankByPersonalHistory } from '../searchTabs';

const F = (name, ref) => ({ name, food_ref: ref });

describe('SEARCH_TABS (GAP row 28 + curated suggestions)', () => {
  test('Recents leads, Suggested second, then the browse lists; no Database tab', () => {
    expect(SEARCH_TABS.map((t) => t.key)).toEqual([
      'recents', 'suggested', 'favourites', 'frequents', 'custom',
    ]);
  });

  test('Suggested has no selectTabRows list (the screen renders meals, not rows)', () => {
    expect(selectTabRows({ activeTab: 'suggested', query: '', lists: {} })).toEqual([]);
  });
});

describe('selectTabRows', () => {
  const lists = {
    recents: [F('Banana', 'g:1'), F('Bagel', 'g:2')],
    favourites: [F('Chicken breast', 'g:3')],
    frequents: [F('Oats', 'g:4')],
    custom: [F('My shake', 'custom:1')],
  };

  test('a query under 2 chars shows the browse list, not search results', () => {
    expect(selectTabRows({ activeTab: 'recents', query: 'b', lists, results: [F('x', 'g:9')] }))
      .toEqual(lists.recents);
  });

  test('a 2+ char query is a database search from any tab', () => {
    const results = [F('Beef', 'g:9')];
    expect(selectTabRows({ activeTab: 'recents', query: 'be', lists, results })).toBe(results);
    expect(selectTabRows({ activeTab: 'favourites', query: 'be', lists, results })).toBe(results);
    expect(selectTabRows({ activeTab: 'custom', query: 'be', lists, results })).toBe(results);
  });

  test('a browse tab returns its full list with no query', () => {
    expect(selectTabRows({ activeTab: 'recents', query: '', lists })).toEqual(lists.recents);
  });

  test('missing list for a tab yields an empty array', () => {
    expect(selectTabRows({ activeTab: 'frequents', query: '', lists: {} })).toEqual([]);
  });
});

describe('rankByPersonalHistory — the user\'s own foods lead a typed search', () => {
  // A typed-query result set: a generic DB match, a favourite, a recent, a
  // frequent, a never-logged custom, in deliberately "wrong" order.
  const results = [
    F('Beef mince generic', 'g:db1'),     // 0 — generic database
    F('Chicken breast', 'g:fav'),          // 3 — favourited
    F('Porridge oats', 'g:rec'),           // 2 — recent in this slot
    F('Greek yoghurt', 'g:freq'),          // 2 — logged often
    F('My protein shake', 'custom:1'),     // 1 — own custom food
    F('Beef steak generic', 'g:db2'),      // 0 — generic database
  ];
  const sets = {
    favouriteRefs: new Set(['g:fav']),
    recentRefs: new Set(['g:rec']),
    frequentRefs: new Set(['g:freq']),
  };

  test('favourite first, then recent/frequent (stable), then custom, then generic in original order', () => {
    const out = rankByPersonalHistory(results, sets).map((f) => f.food_ref);
    expect(out).toEqual(['g:fav', 'g:rec', 'g:freq', 'custom:1', 'g:db1', 'g:db2']);
  });

  test('is stable: equal-weight rows keep the waterfall\'s relevance order', () => {
    // Two recents in input order rec1 before rec2 must stay rec1, rec2.
    const r = [F('a', 'g:db'), F('b', 'rec2'), F('c', 'rec1')];
    const out = rankByPersonalHistory(r, { recentRefs: new Set(['rec1', 'rec2']) }).map((f) => f.food_ref);
    expect(out).toEqual(['rec2', 'rec1', 'g:db']);
  });

  test('with no fav/recent/frequent sets, the user\'s own custom food still leads (it is personal)', () => {
    const expected = ['custom:1', 'g:db1', 'g:fav', 'g:rec', 'g:freq', 'g:db2'];
    expect(rankByPersonalHistory(results, {}).map((f) => f.food_ref)).toEqual(expected);
    expect(rankByPersonalHistory(results).map((f) => f.food_ref)).toEqual(expected);
  });

  test('a result set with no personal signal at all keeps the waterfall order untouched', () => {
    const generic = [F('a', 'g:1'), F('b', 'g:2'), F('c', 'g:3')];
    expect(rankByPersonalHistory(generic, sets).map((f) => f.food_ref)).toEqual(['g:1', 'g:2', 'g:3']);
  });

  test('tolerates empty / single / missing input without throwing', () => {
    expect(rankByPersonalHistory([], sets)).toEqual([]);
    expect(rankByPersonalHistory([F('only', 'g:fav')], sets)).toEqual([F('only', 'g:fav')]);
    expect(rankByPersonalHistory(undefined, sets)).toEqual([]);
  });

  test('accepts array refs as well as Sets (defensive)', () => {
    const out = rankByPersonalHistory(results, { favouriteRefs: ['g:fav'] }).map((f) => f.food_ref);
    expect(out[0]).toBe('g:fav');
  });
});
