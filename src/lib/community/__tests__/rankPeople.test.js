/**
 * rankPeople.test.js (community product audit `40-GAP-CLOSURE.md` §1,
 * "People search tolerance").
 */

import {
  rankPeople, loadRecentPeopleSearches, recordPeopleSearch,
  clearRecentPeopleSearches, RECENT_SEARCHES_MAX,
} from '../rankPeople';

const SAM_HANDLE = { card: { user_id: 'u1', handle: 'sam', display_name: 'Sam Wilson' } };
const AWESOME_SAM = { card: { user_id: 'u2', handle: 'awesomesam', display_name: 'Awesome Sam' } };
const SAMANTHA = { card: { user_id: 'u3', handle: 'samantha_j', display_name: 'Samantha Jones' } };
const UNRELATED = { card: { user_id: 'u4', handle: 'deadlift_dave', display_name: 'Dave' } };
const SMYTH = { card: { user_id: 'u5', handle: 'jsmyth', display_name: 'Jo Smyth' } };

const FIXTURES = [UNRELATED, SAMANTHA, AWESOME_SAM, SAM_HANDLE, SMYTH];

function ids(rows) {
  return rows.map((r) => r.card.user_id);
}

describe('rankPeople: exact handle beats everything', () => {
  test('"sam" puts the exact handle match first', () => {
    const out = rankPeople(FIXTURES, 'sam');
    expect(out[0].card.user_id).toBe('u1');
  });
});

describe('rankPeople: handle prefix', () => {
  test('"samant" ranks the samantha_j handle above unrelated rows', () => {
    const out = rankPeople(FIXTURES, 'samant');
    expect(ids(out).indexOf('u3')).toBeLessThan(ids(out).indexOf('u4'));
  });
});

describe('rankPeople: display-name token prefix', () => {
  test('"jones" finds Samantha Jones by name token, ranked above unrelated', () => {
    const out = rankPeople(FIXTURES, 'jones');
    expect(ids(out).indexOf('u3')).toBeLessThan(ids(out).indexOf('u4'));
  });
});

describe('rankPeople: loose edit-distance tolerance', () => {
  test('"smith" (misspelling of smyth) still surfaces jsmyth above unrelated', () => {
    const out = rankPeople(FIXTURES, 'smith');
    expect(ids(out).indexOf('u5')).toBeLessThan(ids(out).indexOf('u4'));
  });
});

describe('rankPeople: empty query and stability', () => {
  test('an empty query returns the input order unchanged', () => {
    expect(rankPeople(FIXTURES, '')).toEqual(FIXTURES);
  });

  test('ties keep the server order (stable sort)', () => {
    const out = rankPeople([UNRELATED, { card: { user_id: 'u6', handle: 'other', display_name: 'Other' } }], 'zzz');
    expect(ids(out)).toEqual(['u4', 'u6']);
  });
});

describe('recent people searches (on-device)', () => {
  beforeEach(async () => {
    await clearRecentPeopleSearches();
  });

  test('starts empty', async () => {
    expect(await loadRecentPeopleSearches()).toEqual([]);
  });

  test('records a query, newest first', async () => {
    await recordPeopleSearch('sam');
    await recordPeopleSearch('dave');
    expect(await loadRecentPeopleSearches()).toEqual(['dave', 'sam']);
  });

  test('de-duplicates case-insensitively and moves the repeat to the front', async () => {
    await recordPeopleSearch('sam');
    await recordPeopleSearch('dave');
    await recordPeopleSearch('SAM');
    expect(await loadRecentPeopleSearches()).toEqual(['SAM', 'dave']);
  });

  test('caps at RECENT_SEARCHES_MAX', async () => {
    for (let i = 0; i < RECENT_SEARCHES_MAX + 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await recordPeopleSearch(`q${i}`);
    }
    const list = await loadRecentPeopleSearches();
    expect(list.length).toBe(RECENT_SEARCHES_MAX);
    expect(list[0]).toBe(`q${RECENT_SEARCHES_MAX + 2}`);
  });

  test('an empty query is not recorded', async () => {
    await recordPeopleSearch('   ');
    expect(await loadRecentPeopleSearches()).toEqual([]);
  });

  test('clear empties the list', async () => {
    await recordPeopleSearch('sam');
    await clearRecentPeopleSearches();
    expect(await loadRecentPeopleSearches()).toEqual([]);
  });
});
