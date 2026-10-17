/**
 * Reset and restore (founder answer 2026-10-17): "after repeated failures,
 * offer to reset this phone's copy and download everything again from the
 * account. Anything not yet saved online would be lost, so the screen says so
 * plainly first."
 *
 * This suite pins the contract of src/lib/localDbReset.js against the REAL
 * module with injected file and storage seams:
 *   - the reset is offered only from the second failed open in a launch;
 *   - a confirmed reset runs close, delete, watermark clear, content-flag
 *     clear and only THEN the reopen, in that order;
 *   - a file that survives the delete fails the reset (no reopen, logged,
 *     ok:false so the failure screen stays and shows the calm line);
 *   - the watermarks are scoped to the signed-in user when one is known and
 *     cleared for every user otherwise;
 *   - nothing outside the listed content flags is removed from AsyncStorage;
 *   - the copy has no contraction and no em dash.
 * The live module graph (expo-file-system, expo-sqlite, database.js) is
 * never loaded: every dependency is injected.
 */
const {
  DB_RESET_OFFER_AFTER_FAILURES,
  DB_RESET_COPY,
  shouldOfferDbReset,
  resetLocalDatabase,
  runDbResetAndReopen,
  releaseCachedConnections,
} = require('../localDbReset');

const DIR = 'file:///data/SQLite/';
const FAMILIES = [`${DIR}volyume.db`, `${DIR}volyume-plain-backup.db`];
const SINGLES = [`${DIR}volyume-restore-state.json`];
const CONTENT_KEYS = ['@volyume_exercises_seeded_v7', '@volyume_off_snapshot_loaded_v1'];

function makeDeps({ survivors = [], calls = [] } = {}) {
  const present = new Set();
  for (const f of FAMILIES) ['', '-wal', '-shm', '-journal'].forEach((s) => present.add(`${f}${s}`));
  SINGLES.forEach((f) => present.add(f));
  const deps = {
    settleMs: 5,
    discardInitState: jest.fn(async () => { calls.push('discard'); return { pending: null }; }),
    releaseConnections: jest.fn(async () => { calls.push('release'); return 1; }),
    deleteFamily: jest.fn(async (uri) => {
      calls.push(`deleteFamily:${uri.split('/').pop()}`);
      ['', '-wal', '-shm'].forEach((s) => { if (!survivors.includes(`${uri}${s}`)) present.delete(`${uri}${s}`); });
    }),
    deleteFile: jest.fn(async (uri) => {
      calls.push(`deleteFile:${uri.split('/').pop()}`);
      if (!survivors.includes(uri)) present.delete(uri);
    }),
    fileExists: jest.fn(async (uri) => present.has(uri)),
    clearWatermarksForUser: jest.fn(async (uid) => { calls.push(`watermarks:${uid}`); return 4; }),
    clearAllWatermarks: jest.fn(async () => { calls.push('watermarks:all'); return 9; }),
    removeStorageKeys: jest.fn(async (keys) => { calls.push(`contentKeys:${keys.length}`); }),
    databaseFamilies: () => FAMILIES,
    singleFiles: () => SINGLES,
    contentKeys: () => CONTENT_KEYS,
    log: { logInfo: jest.fn(), logError: jest.fn(), logWarn: jest.fn() },
  };
  return { deps, present, calls };
}

describe('the reset is offered only after repeated failures', () => {
  test('hidden at zero and one failure, shown from the second', () => {
    expect(DB_RESET_OFFER_AFTER_FAILURES).toBe(2);
    expect(shouldOfferDbReset(0)).toBe(false);
    expect(shouldOfferDbReset(1)).toBe(false);
    expect(shouldOfferDbReset(2)).toBe(true);
    expect(shouldOfferDbReset(5)).toBe(true);
  });

  test('a missing or invalid count never offers it', () => {
    expect(shouldOfferDbReset(undefined)).toBe(false);
    expect(shouldOfferDbReset(null)).toBe(false);
    expect(shouldOfferDbReset('x')).toBe(false);
  });
});

describe('a confirmed reset runs delete, then watermark clear, then reopen', () => {
  test('the exact order, ending in the reopen', async () => {
    const { deps, calls, present } = makeDeps();
    const reopen = jest.fn(async () => { calls.push('reopen'); return true; });
    const result = await runDbResetAndReopen({ userId: 'u1', reopen, deps });
    expect(result).toEqual({ ok: true, reopened: true });
    expect(calls).toEqual([
      'discard',
      'release',
      'deleteFamily:volyume.db',
      'deleteFile:volyume.db-journal',
      'deleteFamily:volyume-plain-backup.db',
      'deleteFile:volyume-plain-backup.db-journal',
      'deleteFile:volyume-restore-state.json',
      'watermarks:u1',
      `contentKeys:${CONTENT_KEYS.length}`,
      'reopen',
    ]);
    expect(present.size).toBe(0);
  });

  test('every family member is checked, including -journal', async () => {
    const { deps } = makeDeps();
    await resetLocalDatabase({ userId: 'u1', deps });
    const checked = deps.fileExists.mock.calls.map(([u]) => u);
    for (const f of FAMILIES) {
      expect(checked).toEqual(expect.arrayContaining([f, `${f}-wal`, `${f}-shm`, `${f}-journal`]));
    }
    expect(checked).toEqual(expect.arrayContaining(SINGLES));
  });

  test('no known user clears every user\'s watermarks', async () => {
    const { deps, calls } = makeDeps();
    await resetLocalDatabase({ userId: null, deps });
    expect(deps.clearAllWatermarks).toHaveBeenCalledTimes(1);
    expect(deps.clearWatermarksForUser).not.toHaveBeenCalled();
    expect(calls).toContain('watermarks:all');
  });

  test('only the listed content flags are removed from AsyncStorage', async () => {
    const { deps } = makeDeps();
    await resetLocalDatabase({ userId: 'u1', deps });
    expect(deps.removeStorageKeys).toHaveBeenCalledTimes(1);
    expect(deps.removeStorageKeys).toHaveBeenCalledWith(CONTENT_KEYS);
  });

  test('a start and a success are logged, without personal data', async () => {
    const { deps } = makeDeps();
    await runDbResetAndReopen({ userId: 'u1', reopen: async () => true, deps });
    const scopes = deps.log.logInfo.mock.calls.map(([s]) => s);
    expect(scopes).toEqual(['RootNavigator.dbReset.start', 'RootNavigator.dbReset.done']);
    expect(JSON.stringify(deps.log.logInfo.mock.calls)).not.toMatch(/u1/);
  });

  test('a reopen that fails again still reports the reset itself as done', async () => {
    const { deps } = makeDeps();
    const result = await runDbResetAndReopen({ userId: 'u1', reopen: async () => false, deps });
    expect(result).toEqual({ ok: true, reopened: false });
  });
});

describe('a failed delete keeps the failure screen', () => {
  test('a surviving file stops the reset before watermarks, flags and the reopen', async () => {
    const { deps, calls } = makeDeps({ survivors: [`${DIR}volyume.db-wal`] });
    const reopen = jest.fn(async () => true);
    const result = await runDbResetAndReopen({ userId: 'u1', reopen, deps });
    expect(result).toEqual({ ok: false, reopened: false });
    expect(reopen).not.toHaveBeenCalled();
    expect(deps.clearWatermarksForUser).not.toHaveBeenCalled();
    expect(deps.removeStorageKeys).not.toHaveBeenCalled();
    expect(calls).not.toContain('reopen');
    expect(deps.log.logError).toHaveBeenCalledTimes(1);
    const [scope, err, ctx] = deps.log.logError.mock.calls[0];
    expect(scope).toBe('RootNavigator.dbReset');
    expect(err).toBeInstanceOf(Error);
    expect(ctx).toEqual({ step: 'delete', file: 'volyume.db-wal' });
  });

  test('a thrown delete is caught by the verify, not trusted', async () => {
    const { deps } = makeDeps({ survivors: [`${DIR}volyume-restore-state.json`] });
    deps.deleteFile = jest.fn(async () => { throw new Error('EACCES'); });
    const result = await runDbResetAndReopen({ userId: 'u1', reopen: async () => true, deps });
    expect(result.ok).toBe(false);
  });

  test('a storage failure clearing watermarks also fails the reset', async () => {
    const { deps } = makeDeps();
    deps.clearWatermarksForUser = jest.fn(async () => { throw new Error('storage down'); });
    const reopen = jest.fn(async () => true);
    const result = await runDbResetAndReopen({ userId: 'u1', reopen, deps });
    expect(result.ok).toBe(false);
    expect(reopen).not.toHaveBeenCalled();
    expect(deps.log.logError.mock.calls[0][2]).toEqual({ step: 'watermarks', file: null });
  });
});

describe('the reset waits a bounded time for a discarded open', () => {
  test('a pending open that never settles does not hold the reset', async () => {
    const { deps } = makeDeps();
    deps.discardInitState = jest.fn(async () => ({ pending: new Promise(() => {}) }));
    const result = await runDbResetAndReopen({ userId: 'u1', reopen: async () => true, deps });
    expect(result.ok).toBe(true);
  });
});

describe('releaseCachedConnections drains expo-sqlite\'s ref-counted connection', () => {
  test('closes until the native side refuses, then stops', async () => {
    let refs = 3;
    const handle = { closeAsync: jest.fn(async () => { if (refs <= 0) throw new Error('closed'); refs -= 1; }) };
    const SQLite = { openDatabaseAsync: jest.fn(async () => { refs += 1; return handle; }) };
    const released = await releaseCachedConnections({ SQLite });
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('volyume.db');
    expect(released).toBe(4);
    expect(refs).toBe(0);
  });

  test('an open that throws means nothing is held, and it never throws', async () => {
    const SQLite = { openDatabaseAsync: jest.fn(async () => { throw new Error('no'); }) };
    await expect(releaseCachedConnections({ SQLite })).resolves.toBe(0);
  });
});

describe('the copy is calm, plain British English', () => {
  const all = Object.values(DB_RESET_COPY).join('\n');

  test('no contraction (a possessive such as "phone\'s" is allowed)', () => {
    expect(all).not.toMatch(/n't\b/i);
    expect(all).not.toMatch(/'(re|ve|ll|m|d)\b/i);
    expect(all).not.toMatch(/\b(it|that|there|what|let|here)'s\b/i);
  });

  test('no em dash and no en dash', () => {
    expect(all).not.toMatch(/[—–]/);
  });

  test('the confirmation says plainly what will be lost', () => {
    expect(DB_RESET_COPY.confirmTitle).toBe("Reset this phone's copy?");
    expect(DB_RESET_COPY.confirmBody).toMatch(/cannot be brought back/);
    expect(DB_RESET_COPY.confirm).toBe('Reset and restore');
    expect(DB_RESET_COPY.cancel).toBe('Cancel');
    expect(DB_RESET_COPY.resettingButton).toBe('Resetting...');
    expect(DB_RESET_COPY.failedLine).toBe('That did not work. Please try again, or reinstall Volyume if it keeps happening.');
  });
});
