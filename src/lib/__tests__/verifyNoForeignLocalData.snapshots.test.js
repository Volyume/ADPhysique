/**
 * Incident 2026-09-04: every fresh install was refused its first sign-in
 * ("Couldn't switch accounts safely", Sentry VOLYUME-2G, step 'snapshots').
 *
 * Cause: _doInit takes a pre-migration snapshot of the brand-new, empty
 * database before anyone has signed in, and the first-account residue check
 * (2026-09-01) treated any file in the snapshots directory as another
 * account's leftovers.
 *
 * What this pins, against the real verifyNoForeignLocalData:
 *   - migration snapshots alone never refuse a first account;
 *   - an account-switch snapshot, a pre-restore snapshot, or a name this app
 *     did not write still refuse (unknown is unsafe);
 *   - an empty or missing snapshots directory passes.
 */
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  readDirectoryAsync: jest.fn(async () => []),
  deleteAsync: jest.fn(async () => {}),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  moveAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async () => {}),
  readAsStringAsync: jest.fn(async () => ''),
}));
jest.mock('../progressPhotos', () => ({ photoDir: (uid) => `file:///docs/progress_photos/users/${uid}/` }));
jest.mock('../profileAvatar', () => ({
  profileAvatarDir: () => 'file:///docs/avatars/',
  isProfileAvatarUriForUser: () => true,
}));

const FileSystem = require('expo-file-system/legacy');

// The repo's shared in-memory SQLite double (no SQL is simulated): every
// table reads clean, which is exactly the fresh-install state under test.
const database = require('../database');

function fsWith(snapshotNames) {
  FileSystem.getInfoAsync.mockImplementation(async (uri) => ({ exists: uri === 'file:///docs/snapshots/' && snapshotNames !== null }));
  FileSystem.readDirectoryAsync.mockImplementation(async (uri) => (uri === 'file:///docs/snapshots/' ? snapshotNames : []));
}

beforeEach(() => { jest.clearAllMocks(); });

describe('verifyNoForeignLocalData and the snapshots directory', () => {
  test('a fresh install\'s own pre-migration snapshot is not foreign residue', async () => {
    fsWith(['volyume_v0_to_v87_1788600000000.db']);
    await expect(database.verifyNoForeignLocalData('user-1')).resolves.toEqual({ ok: true });
  });

  test('several migration snapshots (an updated install) still pass', async () => {
    fsWith(['volyume_v70_to_v71_1788000000000.db', 'volyume_v71_to_v87_1788600000000.db']);
    await expect(database.verifyNoForeignLocalData('user-1')).resolves.toEqual({ ok: true });
  });

  test('a pre-account-switch snapshot still refuses', async () => {
    fsWith(['volyume_v0_to_v87_1788600000000.db', 'volyume_accountswitch_1788600001000.db']);
    await expect(database.verifyNoForeignLocalData('user-1')).resolves.toEqual({ ok: false, step: 'snapshots' });
  });

  test('a pre-restore snapshot still refuses', async () => {
    fsWith(['volyume_prerestore_1788600001000.db']);
    await expect(database.verifyNoForeignLocalData('user-1')).resolves.toEqual({ ok: false, step: 'snapshots' });
  });

  test('a name this app did not write still refuses (unknown is unsafe)', async () => {
    fsWith(['something-else.db']);
    await expect(database.verifyNoForeignLocalData('user-1')).resolves.toEqual({ ok: false, step: 'snapshots' });
  });

  test('an empty or missing snapshots directory passes', async () => {
    fsWith([]);
    await expect(database.verifyNoForeignLocalData('user-1')).resolves.toEqual({ ok: true });
    fsWith(null);
    await expect(database.verifyNoForeignLocalData('user-1')).resolves.toEqual({ ok: true });
  });
});
