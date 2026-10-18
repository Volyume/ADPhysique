/**
 * localDbReset.js — "Reset and restore" for a local database that will not
 * open (founder answer 2026-10-17).
 *
 * The founder's ruling, verbatim: "Add a reset and restore: after repeated
 * failures, offer to reset this phone's copy and download everything again
 * from the account. Anything not yet saved online would be lost, so the
 * screen says so plainly first."
 *
 * What a reset removes (this phone's local copy only):
 *   - the database file family (volyume.db plus -wal, -shm and -journal);
 *   - the SQLCipher swap's working files (a surviving plaintext backup would
 *     otherwise be promoted back over the deleted database by dbCrypto);
 *   - the snapshot-restore record and its stage / rollback files (an orphaned
 *     rollback file makes every later open refuse);
 *   - the sync pull and push watermarks, so the next pull is a full one;
 *   - the AsyncStorage flags that describe the database's CONTENT (exercise
 *     seed and its follow-up passes, the OFF and CoFID snapshot imports, the
 *     food-library pull cursor and throttle), so the new, empty database is
 *     seeded again instead of being skipped as "already done".
 *
 * What a reset never touches: the SQLCipher key (expo-secure-store), Article 9
 * consent, auth tokens, preferences, first-run flags, the saved snapshots in
 * the snapshots folder, or any other AsyncStorage key.
 *
 * Every dependency is injectable so the order and the failure behaviour are
 * unit-testable without the native graph; the defaults are lazy requires.
 */

/** The reset is offered once the open has failed this many times in a launch. */
export const DB_RESET_OFFER_AFTER_FAILURES = 2;

/** True once the first failure and at least one failed "Try again" happened. */
export function shouldOfferDbReset(failureCount) {
  return Number(failureCount) >= DB_RESET_OFFER_AFTER_FAILURES;
}

// User-facing copy (British English, full words, no em dash; voice per
// docs/COACHING_VOICE_SYNTHESIS_LOCKED.md). Pinned by localDbReset.test.js.
export const DB_RESET_COPY = Object.freeze({
  offerButton: 'Reset and restore',
  resettingButton: 'Resetting...',
  confirmTitle: "Reset this phone's copy?",
  confirmBody: 'Volyume will remove the data stored on this phone and download everything saved to your account again. Anything changed since it was last saved online cannot be brought back.',
  cancel: 'Cancel',
  confirm: 'Reset and restore',
  failedLine: 'That did not work. Please try again, or reinstall Volyume if it keeps happening.',
});

// Each open's ref-counted native connection is drained with at most this many
// closes; a real leak is one or two references, so this is a safety ceiling.
const MAX_CONNECTION_RELEASES = 32;
// How long to wait for a discarded in-flight open to settle before the files
// go. A genuinely hung open may never settle, so this is bounded.
const DISCARDED_OPEN_SETTLE_MS = 3000;

function defaultDeps() {
  /* eslint-disable global-require */
  const FileSystem = require('expo-file-system/legacy');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const snapshot = require('./dbSnapshot');
  const crypto = require('./dbCrypto');
  const database = require('./database');
  const watermark = require('./sync/watermark');
  const seedExercises = require('./seedExercises');
  const foodSeed = require('./food/seed');
  const libraryDelta = require('./food/libraryDelta');
  /* eslint-enable global-require */
  return {
    discardInitState: () => database.discardDatabaseInitState(),
    releaseConnections: () => releaseCachedConnections(),
    deleteFamily: (uri) => snapshot.deleteDatabaseFamily(uri),
    deleteFile: (uri) => FileSystem.deleteAsync(uri, { idempotent: true }),
    fileExists: async (uri) => (await FileSystem.getInfoAsync(uri))?.exists === true,
    clearWatermarksForUser: (userId) => watermark.clearWatermarksForUser(userId),
    clearAllWatermarks: () => watermark.clearAllWatermarks(),
    removeStorageKeys: (keys) => AsyncStorage.multiRemove(keys),
    databaseFamilies: () => [
      snapshot.DB_PATH,
      `${snapshot.SQLITE_DIR}${crypto.PLAIN_BACKUP_DB_NAME}`,
      `${snapshot.SQLITE_DIR}${crypto.ENCRYPT_SWAP_DB_NAME}`,
      snapshot.RESTORE_STAGE,
      snapshot.RESTORE_ROLLBACK,
    ],
    singleFiles: () => [snapshot.RESTORE_STATE],
    contentKeys: () => [
      seedExercises.SEEDED_KEY,
      seedExercises.METADATA_BACKFILL_KEY,
      seedExercises.METADATA_REDERIVE_KEY,
      seedExercises.LIBRARY_VERSION_KEY,
      foodSeed.OFF_SNAPSHOT_FLAG_KEY,
      foodSeed.COFID_SNAPSHOT_FLAG_KEY,
      // A surviving progress marker would resume the import part-way into
      // the new, empty database and leave its first rows missing.
      foodSeed.OFF_SNAPSHOT_PROGRESS_KEY,
      foodSeed.COFID_SNAPSHOT_PROGRESS_KEY,
      libraryDelta.CURSOR_KEY,
      libraryDelta.THROTTLE_KEY,
    ],
    log: require('./errorLog'), // eslint-disable-line global-require
  };
}

/**
 * Close every native connection expo-sqlite still holds for volyume.db.
 *
 * expo-sqlite caches ONE ref-counted native connection per path (Android
 * SQLiteModule.kt / iOS SQLiteModule.swift, findCachedDatabase): a later
 * openDatabaseAsync of the same name re-uses it, and closeAsync only really
 * closes once the count reaches zero. A failed init does not close its handle
 * (database.js _doInit), so without this the reopen after the delete would
 * be handed the OLD connection on the deleted file and fail exactly as before.
 * Opening by name returns that cached connection; closing it until the native
 * side reports it closed releases every reference, including a hung open's.
 * Best-effort: any error here just means nothing was left open.
 */
export async function releaseCachedConnections({ SQLite, name = 'volyume.db' } = {}) {
  let released = 0;
  try {
    // eslint-disable-next-line global-require
    const lib = SQLite ?? require('expo-sqlite');
    const handle = await lib.openDatabaseAsync(name);
    for (let i = 0; i < MAX_CONNECTION_RELEASES; i += 1) {
      try {
        await handle.closeAsync();
        released += 1;
      } catch (_) {
        break; // closed for good: the native side refuses a further close
      }
    }
  } catch (_) { /* nothing could be opened, so nothing is held open */ }
  return released;
}

function settleWithin(promise, ms) {
  if (!promise || typeof promise.then !== 'function') return Promise.resolve();
  let timer;
  const bound = new Promise((resolve) => { timer = setTimeout(resolve, ms); });
  return Promise.race([promise.then(() => {}, () => {}), bound]).then(() => clearTimeout(timer));
}

/**
 * Remove this phone's copy so the next open starts empty. Order matters and
 * is pinned by the tests: close and forget the open, delete and verify the
 * files, then clear the watermarks and the content flags. Throws (with the
 * failing step on `err.dbResetStep`) when a file cannot be deleted or storage
 * cannot be cleared, so the caller keeps the failure screen.
 *
 * @param {{ userId?: string|null, deps?: object }} [args]
 * @returns {Promise<{ watermarksRemoved: number, filesChecked: number }>}
 */
export async function resetLocalDatabase({ userId = null, deps: injected } = {}) {
  const deps = { ...(injected ? {} : defaultDeps()), ...(injected ?? {}) };
  let step = 'close';
  try {
    const { pending } = (await deps.discardInitState()) ?? {};
    await deps.releaseConnections();
    // A discarded open whose connection was just closed rejects promptly;
    // give it a bounded moment so its late catch runs before the reopen.
    await settleWithin(pending, deps.settleMs ?? DISCARDED_OPEN_SETTLE_MS);

    step = 'delete';
    const families = deps.databaseFamilies();
    const singles = deps.singleFiles();
    const toCheck = [];
    for (const uri of families) {
      await deps.deleteFamily(uri);
      // deleteDatabaseFamily covers '', -wal and -shm; -journal is removed
      // here (rollback-journal mode leaves it beside the file).
      await deps.deleteFile(`${uri}-journal`).catch(() => {}); // verified below
      toCheck.push(uri, `${uri}-wal`, `${uri}-shm`, `${uri}-journal`);
    }
    for (const uri of singles) {
      await deps.deleteFile(uri).catch(() => {}); // verified below
      toCheck.push(uri);
    }
    // deleteDatabaseFamily swallows each delete's error, so the only honest
    // test of success is that every file is now absent.
    for (const uri of toCheck) {
      if (await deps.fileExists(uri)) {
        const err = new Error('a local database file could not be deleted');
        err.dbResetFile = uri.split('/').pop();
        throw err;
      }
    }

    step = 'watermarks';
    const watermarksRemoved = userId
      ? await deps.clearWatermarksForUser(userId)
      : await deps.clearAllWatermarks();

    step = 'content_keys';
    const keys = deps.contentKeys().filter((k) => typeof k === 'string' && k.length > 0);
    if (keys.length > 0) await deps.removeStorageKeys(keys);

    return { watermarksRemoved, filesChecked: toCheck.length };
  } catch (e) {
    if (e && typeof e === 'object') e.dbResetStep = step;
    throw e;
  }
}

/**
 * The whole confirmed action: reset, then run the same open "Try again"
 * uses. Resolves { ok: true, reopened } when the reset itself worked (the
 * reopen's own outcome is the caller's attempt result), or { ok: false }
 * after logging when a step of the reset failed. Never throws.
 *
 * @param {{ userId?: string|null, reopen: () => Promise<boolean>, deps?: object }} args
 */
export async function runDbResetAndReopen({ userId = null, reopen, deps } = {}) {
  // eslint-disable-next-line global-require
  const log = deps?.log ?? require('./errorLog');
  try { log.logInfo('RootNavigator.dbReset.start', 'local database reset started', { signedIn: !!userId }); } catch (_) {}
  try {
    await resetLocalDatabase({ userId, deps });
  } catch (e) {
    try {
      log.logError('RootNavigator.dbReset', e, { step: e?.dbResetStep ?? 'unknown', file: e?.dbResetFile ?? null });
    } catch (_) {}
    return { ok: false, reopened: false };
  }
  try { log.logInfo('RootNavigator.dbReset.done', 'local database reset succeeded', { signedIn: !!userId }); } catch (_) {}
  const reopened = typeof reopen === 'function' ? (await reopen()) === true : false;
  return { ok: true, reopened };
}
