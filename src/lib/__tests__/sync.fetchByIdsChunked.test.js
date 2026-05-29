// Regression test for fetchByIdsChunked's within-chunk pagination.
//
// Production bug (2026-05-29 logs): a 200-id chunk that matched more
// than 1000 child rows was silently truncated at PostgREST's 1000-row
// cap, so a fresh pull left workouts missing sets and routines missing
// exercises. The helper must page through each chunk with .range()
// until a short page comes back.
//
// sync.js is the legacy monolith; mock its module-load imports so we can
// import it in the node env without the real supabase/db chain.

jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn(() => null) }));
jest.mock('../database', () => ({}));
jest.mock('../sync/runner', () => ({ scheduleSync: jest.fn() }));
jest.mock('../errorLog', () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.mock('../observability', () => ({ audit: jest.fn() }));
jest.mock('../engineTelemetry', () => ({ track: jest.fn() }));

const { fetchByIdsChunked } = require('../sync');

// A fake PostgREST builder: .range(from,to) returns a slice of a fixed
// row set, capped at the 1000-row page size, mirroring real behaviour.
function makeBuilder(totalRows) {
  const rows = Array.from({ length: totalRows }, (_, i) => ({ id: i }));
  return {
    range: (from, to) => {
      const page = rows.slice(from, to + 1); // PostgREST range is inclusive
      return Promise.resolve({ data: page, error: null });
    },
  };
}

describe('fetchByIdsChunked within-chunk pagination', () => {
  test('returns ALL rows when a chunk exceeds the 1000-row cap', async () => {
    // One chunk (ids under the 200 CHUNK size), 2300 child rows.
    const ids = Array.from({ length: 50 }, (_, i) => `r${i}`);
    let rangeCalls = 0;
    const queryFactory = () => {
      const b = makeBuilder(2300);
      const origRange = b.range;
      b.range = (from, to) => { rangeCalls += 1; return origRange(from, to); };
      return b;
    };

    const out = await fetchByIdsChunked('test', 'routine_exercises', 'routine_id', ids, queryFactory);

    expect(out).toHaveLength(2300);        // nothing dropped
    expect(rangeCalls).toBe(3);             // 1000 + 1000 + 300 → three pages
  });

  test('stops after one page when a chunk fits under the cap', async () => {
    const ids = ['a', 'b'];
    let rangeCalls = 0;
    const queryFactory = () => {
      const b = makeBuilder(42);
      const origRange = b.range;
      b.range = (from, to) => { rangeCalls += 1; return origRange(from, to); };
      return b;
    };

    const out = await fetchByIdsChunked('test', 'workout_sets', 'workout_id', ids, queryFactory);

    expect(out).toHaveLength(42);
    expect(rangeCalls).toBe(1);             // short first page → no extra round-trip
  });

  test('pages each chunk independently across multiple chunks', async () => {
    // 250 ids → two chunks (200 + 50). Each chunk has 1500 rows, so each
    // needs two pages (1000 + 500). Total 3000 rows, 4 range calls.
    const ids = Array.from({ length: 250 }, (_, i) => `id${i}`);
    let rangeCalls = 0;
    const queryFactory = () => {
      const b = makeBuilder(1500);
      const origRange = b.range;
      b.range = (from, to) => { rangeCalls += 1; return origRange(from, to); };
      return b;
    };

    const out = await fetchByIdsChunked('test', 'mesocycle_weeks', 'mesocycle_id', ids, queryFactory);

    expect(out).toHaveLength(3000);
    expect(rangeCalls).toBe(4);
  });

  test('an empty id list makes no query', async () => {
    let called = false;
    const queryFactory = () => { called = true; return makeBuilder(0); };
    const out = await fetchByIdsChunked('test', 'workout_sets', 'workout_id', [], queryFactory);
    expect(out).toEqual([]);
    expect(called).toBe(false);
  });
});
