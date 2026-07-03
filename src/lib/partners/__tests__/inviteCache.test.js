/**
 * Single-mint client cache (A1 §9.5). All share channels reuse the ONE active
 * pending code; only a cleared cache mints afresh.
 */
import { getCachedInvite, setCachedInvite, clearCachedInvite } from '../inviteCache';

beforeEach(() => clearCachedInvite());

test('returns the cached invite for the same user (channels reuse one code)', () => {
  const data = { code: 'ABCD1234EF', deepLink: 'volyume://partner/ABCD1234EF' };
  setCachedInvite('u1', data);
  expect(getCachedInvite('u1')).toBe(data);
  expect(getCachedInvite('u1')).toBe(data); // repeated reads reuse, never re-mint
});

test('does not leak a cached invite across users', () => {
  setCachedInvite('u1', { code: 'ABCD1234EF' });
  expect(getCachedInvite('u2')).toBe(null);
});

test('clear frees the cache so a fresh code can be minted', () => {
  setCachedInvite('u1', { code: 'ABCD1234EF' });
  clearCachedInvite();
  expect(getCachedInvite('u1')).toBe(null);
});
