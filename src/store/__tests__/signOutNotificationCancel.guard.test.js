/**
 * C7 release audit F1 (notifications lane) source guard.
 *
 * Sign-out never cancelled the OS-scheduled notification queue, so the
 * previous user's weigh-in/training/meal reminders - with their first
 * name baked into the copy - kept firing after sign-out, and because
 * AsyncStorage.clear() removed the prefs blob, the next launch's
 * restore path (gated on the blob existing) could not clean them up
 * either. clearAuthStateForSignOut now cancels every scheduled
 * notification BEFORE the storage wipe; delete-account routes through
 * the same function. Same scoped source-guard style as the sibling
 * sign-out guards (the store method's live dependency surface is
 * impractical to mount).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '../useAppStore.js'), 'utf8');

test('sign-out cancels all scheduled notifications before the storage wipe', () => {
  const start = SRC.indexOf('clearAuthStateForSignOut');
  const fn = SRC.slice(start);
  const cancelAt = fn.indexOf('cancelAllScheduledNotificationsAsync');
  // P1 (2026-08-27): the raw AsyncStorage.clear() call is now behind
  // wipeAsyncStorageWithRetry, which retries and verifies so a failed wipe can
  // fail closed. The ordering property this suite exists to pin is unchanged:
  // notifications must be cancelled BEFORE the storage wipe, or the previous
  // user's reminders keep firing on a device that may now belong to someone
  // else. Only the symbol moved.
  const clearAt = fn.indexOf('wipeAsyncStorageWithRetry()');
  expect(cancelAt).toBeGreaterThan(-1);
  expect(clearAt).toBeGreaterThan(-1);
  // Cancel must run BEFORE the wipe removes the prefs blob.
  expect(cancelAt).toBeLessThan(clearAt);
});
