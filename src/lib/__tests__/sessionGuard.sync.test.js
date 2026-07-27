/**
 * sessionGuard.sync.test.js
 *
 * Pins the root fix from the Sentry triage of 2026-07-27
 * (docs/audit/sentry-triage-2026-07-27.md).
 *
 * BACKGROUND. On a locked phone the iOS Keychain refuses the session read, the
 * Supabase client carried on with no user JWT, auth.uid() came back NULL, and
 * every RLS policy of the form (auth.uid() = user_id) rejected the write with
 * 42501. The user's data was LOST, not merely logged noisily
 * (VOLYUME-2D/2F/2H/2C/2J/28).
 *
 * TWO CONTRACTS, and the second matters as much as the first:
 *   1. An explicit "no session" skips the run, so work stays queued for the
 *      next foreground sync instead of being pushed into a guaranteed refusal.
 *   2. The guard FAILS OPEN. Only a positive `false` blocks. If the check is
 *      unavailable, throws, or answers null, the run proceeds exactly as it did
 *      before this guard existed. A check that cannot answer must never be able
 *      to switch sync off for every user -- that would be a far worse outage
 *      than the bug it was added to prevent.
 *
 * Written to FAIL if anyone tightens the guard into a fail-closed one.
 */

let mockHasLiveSession;

jest.mock('../supabase', () => ({
  get hasLiveSession() { return mockHasLiveSession; },
}));

jest.mock('../sync.js', () => ({
  bulkUploadLocalData: jest.fn().mockResolvedValue({}),
  pullFromCloud: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ healthConsent: true }) },
}));

describe('syncAll live-session guard (Sentry triage 2026-07-27)', () => {
  let syncAll;

  beforeEach(() => {
    jest.resetModules();
    mockHasLiveSession = jest.fn().mockResolvedValue(true);
    // eslint-disable-next-line global-require
    ({ syncAll } = require('../sync/runner'));
  });

  test('skips the run when the session is positively absent', async () => {
    mockHasLiveSession = jest.fn().mockResolvedValue(false);
    // eslint-disable-next-line global-require
    ({ syncAll } = require('../sync/runner'));
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' });
    expect(res.status).toBe('skipped');
    expect(res.reason).toBe('no_live_session');
  });

  test('FAILS OPEN when the check answers null (could not determine)', async () => {
    mockHasLiveSession = jest.fn().mockResolvedValue(null);
    // eslint-disable-next-line global-require
    ({ syncAll } = require('../sync/runner'));
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' });
    expect(res.reason).not.toBe('no_live_session');
  });

  test('FAILS OPEN when the check throws', async () => {
    mockHasLiveSession = jest.fn().mockRejectedValue(new Error('module gone'));
    // eslint-disable-next-line global-require
    ({ syncAll } = require('../sync/runner'));
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' });
    expect(res.reason).not.toBe('no_live_session');
  });

  test('FAILS OPEN when the check is not exported at all', async () => {
    mockHasLiveSession = undefined;
    // eslint-disable-next-line global-require
    ({ syncAll } = require('../sync/runner'));
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' });
    expect(res.reason).not.toBe('no_live_session');
  });

  test('proceeds normally when a session is live', async () => {
    const res = await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' });
    expect(res.reason).not.toBe('no_live_session');
  });
});
