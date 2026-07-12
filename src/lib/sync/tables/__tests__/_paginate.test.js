// LS-03b (Codex adversarial audit, 2026-07-12): fetchAllUserRows must page
// past PostgREST's 1000-row cap, and must surface an error with NO partial
// data so a caller never applies a truncated pull as if complete.
import { fetchAllUserRows } from '../_paginate';

function builderOverRows(rows) {
  return () => ({
    range: (from, to) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
  });
}

describe('fetchAllUserRows', () => {
  test('returns every row across pages when the total exceeds the 1000 cap', async () => {
    const rows = Array.from({ length: 2300 }, (_, i) => ({ id: i }));
    const { data, error } = await fetchAllUserRows(builderOverRows(rows));
    expect(error).toBeNull();
    expect(data).toHaveLength(2300);
  });

  test('a single short page returns in one round-trip', async () => {
    const rows = Array.from({ length: 42 }, (_, i) => ({ id: i }));
    let calls = 0;
    const factory = () => ({
      range: (from, to) => { calls += 1; return Promise.resolve({ data: rows.slice(from, to + 1), error: null }); },
    });
    const { data } = await fetchAllUserRows(factory);
    expect(data).toHaveLength(42);
    expect(calls).toBe(1);
  });

  test('a page error returns { data: null, error } with no partial rows', async () => {
    const factory = () => ({
      range: (from) => {
        if (from === 0) return Promise.resolve({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null });
        return Promise.resolve({ data: null, error: { message: 'blip', code: '500' } });
      },
    });
    const { data, error } = await fetchAllUserRows(factory);
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'blip', code: '500' });
  });

  test('an empty table returns an empty array, not null', async () => {
    const { data, error } = await fetchAllUserRows(builderOverRows([]));
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
