import { SEARCH_TABS, selectTabRows } from '../searchTabs';

const F = (name, ref) => ({ name, food_ref: ref });

describe('SEARCH_TABS (GAP row 28 + curated suggestions)', () => {
  test('Suggested leads, then the five locked tabs in order', () => {
    expect(SEARCH_TABS.map((t) => t.key)).toEqual([
      'suggested', 'recents', 'favourites', 'frequents', 'custom', 'database',
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

  test('database shows nothing under 2 chars', () => {
    expect(selectTabRows({ activeTab: 'database', query: 'b', lists, results: [F('x', 'g:9')] })).toEqual([]);
  });

  test('database shows the waterfall results at 2+ chars', () => {
    const results = [F('Beef', 'g:9')];
    expect(selectTabRows({ activeTab: 'database', query: 'be', lists, results })).toBe(results);
  });

  test('a curated tab returns its full list with no query', () => {
    expect(selectTabRows({ activeTab: 'recents', query: '', lists })).toEqual(lists.recents);
  });

  test('query filters a curated tab by name, case-insensitive', () => {
    expect(selectTabRows({ activeTab: 'recents', query: 'BAG', lists })).toEqual([F('Bagel', 'g:2')]);
  });

  test('missing list for a tab yields an empty array', () => {
    expect(selectTabRows({ activeTab: 'frequents', query: '', lists: {} })).toEqual([]);
  });
});
