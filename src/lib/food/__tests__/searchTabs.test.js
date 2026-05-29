import { SEARCH_TABS, selectTabRows } from '../searchTabs';

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
