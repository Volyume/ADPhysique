/**
 * hasLiveSession.validity.test.js
 *
 * The session guard was WRONG in its first shipped form. Build 48 (2026-08-01)
 * carried it and the 42501 RLS rejections continued, because:
 *
 *   1. it checked `!!access_token` -- PRESENCE, not validity. getSession()
 *      returns the stored session even when the token has already EXPIRED, so
 *      an expired token passed, the request went out, auth.uid() was NULL
 *      server-side, and every write was refused; and
 *   2. it lived in syncAll only, while four screens call bulkUploadLocalData /
 *      pullFromCloud directly and bypassed it entirely.
 *
 * Binding auto-refresh to the foreground made (1) MORE likely, not less, so the
 * two halves of that fix left the hole wider than they found it.
 *
 * Separate file from sessionGuard.sync.test.js deliberately: that suite mocks
 * ../supabase wholesale to drive the runner, so it can never exercise the real
 * implementation. These pin the corrected contract against the real module.
 */

describe('hasLiveSession judges VALIDITY, not presence', () => {
  const nowSec = () => Math.floor(Date.now() / 1000);
  let mod;

  function withSession(session, { refreshTo } = {}) {
    jest.resetModules();
    // eslint-disable-next-line global-require
    mod = require('../supabase');
    mod._setClientForTests({
      auth: {
        getSession: async () => ({ data: { session }, error: null }),
        refreshSession: async () => (refreshTo === undefined
          ? { data: { session: null }, error: { message: 'refresh failed' } }
          : { data: { session: refreshTo }, error: null }),
      },
    });
    return mod;
  }

  test('a valid, unexpired token is live', async () => {
    const m = withSession({ access_token: 'tok', expires_at: nowSec() + 3600 });
    await expect(m.hasLiveSession()).resolves.toBe(true);
  });

  test('THE BUG: an EXPIRED token is not live just because it exists', async () => {
    const m = withSession({ access_token: 'stale', expires_at: nowSec() - 60 });
    await expect(m.hasLiveSession()).resolves.not.toBe(true);
  });

  test('an expired token that CAN be refreshed is live again', async () => {
    const m = withSession(
      { access_token: 'stale', expires_at: nowSec() - 60 },
      { refreshTo: { access_token: 'fresh', expires_at: nowSec() + 3600 } },
    );
    await expect(m.hasLiveSession()).resolves.toBe(true);
  });

  test('an expired token that cannot be refreshed blocks the run', async () => {
    const m = withSession({ access_token: 'stale', expires_at: nowSec() - 60 });
    await expect(m.hasLiveSession()).resolves.toBe(false);
  });

  test('a token expiring within the skew window is treated as expired', async () => {
    const m = withSession({ access_token: 'tok', expires_at: nowSec() + 5 });
    await expect(m.hasLiveSession()).resolves.not.toBe(true);
  });

  test('no session at all is a positive false, not an unknown', async () => {
    const m = withSession(null);
    await expect(m.hasLiveSession()).resolves.toBe(false);
  });
});

describe('the guard sits at the choke point, not at one caller (source guard)', () => {
  // eslint-disable-next-line global-require
  const fs = require('fs');
  // eslint-disable-next-line global-require
  const path = require('path');
  const SYNC = fs.readFileSync(path.resolve(__dirname, '..', 'sync.js'), 'utf8');

  test('bulkUploadLocalData and pullFromCloud both guard themselves', () => {
    // Four screens call these directly, bypassing syncAll entirely.
    expect(SYNC).toMatch(/_blockedByDeadSession\('sync\.bulkUploadLocalData'\)/);
    expect(SYNC).toMatch(/_blockedByDeadSession\('sync\.pullFromCloud'\)/);
  });

  test('the choke-point guard still fails OPEN', () => {
    // Only an explicit false blocks; undetermined must proceed.
    expect(SYNC).toMatch(/if \(live === false\)/);
  });
});
