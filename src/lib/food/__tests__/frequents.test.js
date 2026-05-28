// Stub the heavier imports so loading frequents.js (for the pure
// staleness helper) doesn't drag in the supabase client or the DB layer.
jest.mock('../../supabase', () => ({ getSupabaseClient: jest.fn(() => null) }));
jest.mock('../db', () => ({ replaceFoodFrequents: jest.fn(() => Promise.resolve()) }));

import { frequentsCacheStale, FREQUENTS_MAX_AGE_MS } from '../frequents';

describe('frequentsCacheStale (GAP row 28)', () => {
  test('never refreshed is stale', () => {
    expect(frequentsCacheStale(0)).toBe(true);
    expect(frequentsCacheStale(null)).toBe(true);
    expect(frequentsCacheStale(undefined)).toBe(true);
  });

  test('within the window is fresh', () => {
    const now = 1_000_000_000_000;
    expect(frequentsCacheStale(now - 1000, now)).toBe(false);
    expect(frequentsCacheStale(now - (FREQUENTS_MAX_AGE_MS - 1), now)).toBe(false);
  });

  test('at or beyond the window is stale', () => {
    const now = 1_000_000_000_000;
    expect(frequentsCacheStale(now - FREQUENTS_MAX_AGE_MS, now)).toBe(true);
    expect(frequentsCacheStale(now - FREQUENTS_MAX_AGE_MS - 1, now)).toBe(true);
  });
});
