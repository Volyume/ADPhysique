/**
 * What this suite pins (blueprint sections 5.7, 6; SD-04, SD-09, SD-10;
 * product review 2026-09-06 finding 3, security review finding 9):
 *
 *  - every list RPC answers a WRAPPER object (`{posts, cursor}`,
 *    `{people, cursor}`, `{comments, cursor}`, `{activity, cursor}`), and
 *    the rows that leave this module are always arrays. Treating a
 *    wrapper as an array is silent: the inbox reads empty and the hub
 *    calls `.map` on an object;
 *  - the cursor carried onward is the SERVER's string. Rebuilding one
 *    from `created_at` is refused by `_community_cursor_parts` as
 *    `invalid_input`, so nothing here mints its own;
 *  - reading Discover never requires a Community profile (SD-04). Without
 *    one, `community_dimensions_me` is not called at all: it raises
 *    `no_profile`;
 *  - one failing section never empties Discover. The reads are settled
 *    independently, and a rejected optional section is simply empty;
 *  - `community_suggested_people` is never called by `loadHub` at all
 *    (spec 1.3, community-product-audit-2026-09-07 section 1.3): the hub
 *    never rendered `people`, so the read was removed rather than kept
 *    unrendered. The RPC and `suggestedPeople()` stay for compatibility;
 *    `hub.people` is simply always empty.
 *
 * Programme-sharing (publish/discover/search/adapt) was removed from
 * Community entirely (`docs/community-product-audit-2026-09-07/
 * 40-GAP-CLOSURE.md` §2): `loadHub`'s Discover half is now posts and
 * dimensions only.
 */

jest.mock('../transport', () => ({ callCommunity: jest.fn() }));
jest.mock('../profile', () => ({ currentUserId: () => 'u1' }));
jest.mock('../../dayKey', () => ({ localDayKey: jest.fn(() => '2026-09-10') }));

const { callCommunity } = require('../transport');
const {
  loadHub, loadFeed, listComments, clearCachedHub,
  myDimensions, loadHubSummary, loadDimensionRecent,
} = require('../feed');
const { loadActivity } = require('../activity');

function refusal(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

/** Answer each RPC by name, so a call that should never happen is loud. */
function server(map) {
  callCommunity.mockImplementation((name) => {
    if (!(name in map)) return Promise.reject(refusal('unexpected_rpc'));
    const value = map[name];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

const POST_PAGE = { posts: [{ post: { id: 'p1' } }], cursor: '2026-09-06T10:00:00.000000+00|p1' };

beforeEach(async () => {
  jest.clearAllMocks();
  // The hub caches per user, and an offline open is meant to fall back to
  // it. Each case starts from a cold cache so the assertion is about the
  // read, not about what a previous case left behind.
  await clearCachedHub('u1');
});

describe('the wrapper objects are unwrapped', () => {
  test('the feed answers rows and the server cursor, never the wrapper', async () => {
    server({ community_feed: POST_PAGE });
    const page = await loadFeed({});
    expect(page.posts).toEqual(POST_PAGE.posts);
    expect(page.cursor).toBe(POST_PAGE.cursor);
  });

  test('the activity inbox answers rows, not an empty list', async () => {
    server({ community_activity: { activity: [{ id: 'a1', kind: 'reaction' }], cursor: 'c1' } });
    const page = await loadActivity({});
    expect(page.activity).toHaveLength(1);
    expect(page.cursor).toBe('c1');
  });

  test('comments answer rows and the server cursor', async () => {
    server({ community_list_comments: { comments: [{ id: 'c1' }], cursor: 'k1' } });
    const page = await listComments('post', 'p1');
    expect(page.comments).toEqual([{ id: 'c1' }]);
    expect(page.cursor).toBe('k1');
  });

  test('a payload of the wrong shape leaves an array behind, never undefined', async () => {
    server({ community_feed: null });
    const page = await loadFeed({});
    expect(page.posts).toEqual([]);
    expect(page.cursor).toBeNull();
  });

  test('a cursor the server did not mint is never invented', async () => {
    server({ community_feed: { posts: [{ post: { id: 'p1', created_at: 12345 } }] } });
    const page = await loadFeed({});
    expect(page.cursor).toBeNull();
  });
});

describe('Discover without a Community profile (SD-04)', () => {
  test('the read that needs a profile is not made', async () => {
    server({
      community_discover_posts: POST_PAGE,
    });

    const hub = await loadHub('discover', { joined: false });

    const called = callCommunity.mock.calls.map(([name]) => name);
    expect(called).not.toContain('community_dimensions_me');
    expect(hub.posts).toEqual(POST_PAGE.posts);
    expect(hub.people).toEqual([]);
    expect(hub.dimensions).toEqual([]);
    expect(hub.error).toBeNull();
  });

  test('community_suggested_people is never called by loadHub, joined or not (spec 1.3)', async () => {
    server({
      community_discover_posts: POST_PAGE,
      community_dimensions_me: { dimensions: [] },
    });

    await loadHub('discover', { joined: false });
    await loadHub('discover', { joined: true });

    expect(callCommunity.mock.calls.map(([name]) => name))
      .not.toContain('community_suggested_people');
  });

  test('the paging cursor is the stories cursor the server minted', async () => {
    server({
      community_discover_posts: POST_PAGE,
    });
    const hub = await loadHub('discover', { joined: false });
    expect(hub.cursor).toBe(POST_PAGE.cursor);
  });
});

describe('one failing section never empties Discover', () => {
  test('a refused dimensions read leaves the stories standing', async () => {
    server({
      community_discover_posts: POST_PAGE,
      community_dimensions_me: refusal('no_profile'),
    });

    const hub = await loadHub('discover', { joined: true });

    expect(hub.posts).toEqual(POST_PAGE.posts);
    expect(hub.people).toEqual([]);
    expect(hub.dimensions).toEqual([]);
  });

  test('a refused stories read is a failure', async () => {
    server({
      community_discover_posts: refusal('offline'),
      community_dimensions_me: { dimensions: [] },
    });

    const hub = await loadHub('discover', { joined: true });

    expect(hub.error).toBe('offline');
    expect(hub.fromCache).toBe(false);
    expect(hub.posts).toEqual([]);
  });

  test('with something read earlier, offline shows that instead of nothing', async () => {
    server({
      community_discover_posts: POST_PAGE,
      community_dimensions_me: { dimensions: [] },
    });
    await loadHub('discover', { joined: true });

    server({
      community_discover_posts: refusal('offline'),
      community_dimensions_me: refusal('offline'),
    });
    const hub = await loadHub('discover', { joined: true });

    expect(hub.fromCache).toBe(true);
    expect(hub.error).toBe('offline');
    expect(hub.posts).toEqual(POST_PAGE.posts);
  });
});

describe('paging Discover', () => {
  test('pages the stories only, and asks for nothing else again', async () => {
    server({ community_discover_posts: { posts: [{ post: { id: 'p2' } }], cursor: 'next' } });

    const page = await loadHub('discover', { cursor: 'c0', joined: true });

    expect(callCommunity.mock.calls.map(([name]) => name)).toEqual(['community_discover_posts']);
    expect(page.posts).toHaveLength(1);
    expect(page.cursor).toBe('next');
  });
});

// ─── Communities revamp 2026-09-10 (task 4): _today on
// community_dimensions_me, community_hub_summary, community_dimension_
// recent -- all through the existing transport and error handling. ─────
describe('myDimensions sends the caller\'s own local day (22-MIGRATION-170A-CONTRACT.md, lead ruling 1)', () => {
  test('_today is the client\'s own localDayKey(), never left for the server to guess', async () => {
    server({ community_dimensions_me: { dimensions: [{ kind: 'gym', key: 'g1' }] } });

    const page = await myDimensions();

    expect(callCommunity).toHaveBeenCalledWith('community_dimensions_me', { _today: '2026-09-10' });
    expect(page.dimensions).toEqual([{ kind: 'gym', key: 'g1' }]);
  });
});

describe('loadHubSummary (community_hub_summary)', () => {
  test('answers cohorts and groups, sending the same _today', async () => {
    server({
      community_hub_summary: {
        cohorts: [{ kind: 'gym', key: 'g1', label: 'PureGym Leeds', member_count: 4, trained_today_count: 1, sample: [] }],
        groups: [{ id: 'grp1', name: 'Leeds crew', access: 'invite', member_count: 3, trained_today_count: 1, sample: [] }],
      },
    });

    const summary = await loadHubSummary();

    expect(callCommunity).toHaveBeenCalledWith('community_hub_summary', { _today: '2026-09-10' });
    expect(summary.cohorts).toHaveLength(1);
    expect(summary.groups).toHaveLength(1);
  });

  test('a payload of the wrong shape leaves arrays behind, never undefined', async () => {
    server({ community_hub_summary: null });
    const summary = await loadHubSummary();
    expect(summary).toEqual({ cohorts: [], groups: [] });
  });
});

describe('loadDimensionRecent (community_dimension_recent)', () => {
  test('sends the kind, key, cursor and limit, and answers the same shape community_feed does', async () => {
    server({ community_dimension_recent: POST_PAGE });

    const page = await loadDimensionRecent('discipline', 'bodybuilding', { cursor: 'c0', limit: 10 });

    expect(callCommunity).toHaveBeenCalledWith('community_dimension_recent', {
      _kind: 'discipline', _key: 'bodybuilding', _cursor: 'c0', _limit: 10,
    });
    expect(page.posts).toEqual(POST_PAGE.posts);
    expect(page.cursor).toBe(POST_PAGE.cursor);
  });

  test('cursor and limit default the same way every other paged reader here does', async () => {
    server({ community_dimension_recent: { posts: [], cursor: null } });

    await loadDimensionRecent('age_band', '25_34');

    expect(callCommunity).toHaveBeenCalledWith('community_dimension_recent', {
      _kind: 'age_band', _key: '25_34', _cursor: null, _limit: 20,
    });
  });
});
