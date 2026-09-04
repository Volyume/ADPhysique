/**
 * Item 8 (D141): sync give-ups must be visible, not just counted internally.
 * syncQueue.getQueueStats already returned a `failed` count (ops parked at
 * MAX_RETRIES), but nothing on screen ever read it. This pins that
 * SettingsDataScreen now:
 *   - reads the failed count (via syncQueue.getQueueStats, merged onto the
 *     same snapshot formatLastSynced reads - the existing queue_depth path,
 *     not a second one)
 *   - shows it plainly next to Cloud sync when > 0
 *   - offers a "Retry now" action that calls retryFailedOps(userId) and then
 *     refreshes the snapshot
 *
 * A source-level guard (not a full render) matches this suite's existing
 * SettingsDataScreen.errorCopy.guard.test.js pattern.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'SettingsDataScreen.js'),
  'utf8',
);

describe('SettingsDataScreen surfaces parked (failed) sync ops and lets the user retry', () => {
  test('imports getQueueStats and retryFailedOps from the syncQueue module (extends the existing path)', () => {
    expect(src).toMatch(/import \{ getQueueStats, retryFailedOps \} from '\.\.\/lib\/syncQueue';/);
  });

  test('the failed count rides the same snapshot object formatLastSynced reads (no second state path)', () => {
    expect(src).toMatch(/getQueueStats\(user\?\.id\)/);
    expect(src).toMatch(/setSyncSnapshot\(prev => \(\{/);
    expect(src).toMatch(/failed: stats\?\.ok !== false \? \(stats\?\.failed \?\? 0\) : \(prev\?\.failed \?\? 0\)/);
  });

  test('a "Retry now" row renders only when something is actually parked', () => {
    expect(src).toMatch(/\{\(syncSnapshot\?\.failed \?\? 0\) > 0 \? \(/);
    expect(src).toMatch(/label=\{retryingFailed \? 'Retrying\.\.\.' : 'Retry now'\}/);
    expect(src).toMatch(/couldn't sync`/);
  });

  test('the retry handler calls retryFailedOps for the signed-in user, then refreshes the snapshot', () => {
    const at = src.indexOf('async function handleRetryFailedOps');
    const body = src.slice(at, src.indexOf('async function handleRefreshFoodLibrary'));
    expect(body).toMatch(/retryFailedOps\(user\.id\)/);
    expect(body).toMatch(/refreshSyncSnapshot\(\)/);
    // Failure is logged and told to the user in calm, stable copy - never a
    // raw exception message (matches the errorCopy.guard contract already
    // pinned for this screen's other handlers).
    expect(body).toMatch(/logError\('SettingsDataScreen\.retryFailedOps', e, \{ userId: user\.id \}\)/);
    expect(body).not.toMatch(/toast\.show\(e\?\.message/);
  });

  test('never shows a raw exception message for the retry action', () => {
    const at = src.indexOf('async function handleRetryFailedOps');
    const body = src.slice(at, src.indexOf('async function handleRefreshFoodLibrary'));
    expect(body).toMatch(/toast\.show\("Couldn't retry those changes, try again", \{ variant: 'error' \}\)/);
  });
});
