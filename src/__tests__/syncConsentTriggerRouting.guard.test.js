/**
 * AC-02 (Codex adversarial audit, 2026-07-12) regression guard.
 *
 * SYNC_ARCHITECTURE_LOCKED.md: "All four triggers route through the same
 * syncAll() entry point." syncAll (src/lib/sync/runner.js) is the only place
 * the Article 9 fail-closed health-consent gate + the sign-out-wipe gate are
 * applied. Two triggers were still calling bulkUploadLocalData DIRECTLY,
 * bypassing both gates and uploading body/profile/coaching/prefs data for a
 * session whose consent was unresolved or denied:
 *   - the periodic background task VOLYUME_DAILY_SYNC (App.js), and
 *   - the debounced-on-write trigger scheduleSync (src/lib/sync.js).
 *
 * These are scoped source guards (the headless task and the debounce timer are
 * not unit-mountable) in the same style as the other App.js sync-wiring guards.
 * The gate itself is exercised by src/lib/sync/__tests__/runner.consent.test.js.
 */
const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8');
const SYNC = fs.readFileSync(path.resolve(__dirname, '../lib/sync.js'), 'utf8');

// The VOLYUME_DAILY_SYNC task body: from its defineTask to the registration
// call that follows much later — bound it to the defineTask block.
const dailyStart = APP.indexOf('TaskManager.defineTask(VOLYUME_DAILY_SYNC');
const dailyBody = APP.slice(dailyStart, APP.indexOf('registerTaskAsync(VOLYUME_DAILY_SYNC'));

// scheduleSync body: from its declaration to the next exported function.
const schedStart = SYNC.indexOf('export function scheduleSync');
const schedBody = SYNC.slice(schedStart, SYNC.indexOf('\nexport ', schedStart + 20));

describe('AC-02: periodic + write triggers route through syncAll, not bulkUploadLocalData', () => {
  test('the two trigger bodies are located', () => {
    expect(dailyStart).toBeGreaterThan(-1);
    expect(dailyBody.length).toBeGreaterThan(0);
    expect(schedStart).toBeGreaterThan(-1);
    expect(schedBody.length).toBeGreaterThan(0);
  });

  test('the daily background task calls syncAll (periodic) and never bulkUploadLocalData', () => {
    expect(dailyBody).toMatch(/syncAll\(\{[^}]*triggeredBy:\s*'periodic'/);
    expect(dailyBody).not.toMatch(/bulkUploadLocalData\(/);
  });

  test('the debounced write trigger calls syncAll (write) and never bulkUploadLocalData', () => {
    expect(schedBody).toMatch(/syncAll\(\{[^}]*triggeredBy:\s*'write'/);
    expect(schedBody).not.toMatch(/bulkUploadLocalData\(/);
  });
});
