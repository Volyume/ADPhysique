/**
 * D141 items 2 and 7 (2026-09-04) - boot guards.
 *
 * Item 2: a database open that HANGS used to slip past the DB-init failure
 * screen. The 8s auth latch releases the splash on its own clock, so a hung
 * SecureStore key read or a locked SQLite file dropped the user into a
 * navigator whose every query waited forever, with no error and no way out.
 * The open is now raced against DB_INIT_TIMEOUT_MS and a timeout is handled
 * exactly like a thrown open; a late completion re-runs the attempt so the
 * flag clears itself.
 *
 * Item 7: the habit-derived training schedule is re-derived at launch (it
 * used to refresh only when a workout finished, so a lapsed user's OS-level
 * weekly reminder kept the days from their last session for ever).
 *
 * Source guards, matching rootNavigatorDbInitRecovery.guard.test.js: the
 * navigator pulls the whole native graph and cannot be mounted here.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'RootNavigator.js'), 'utf8');

function slice(marker, len = 3500) {
  const i = src.indexOf(marker);
  expect(i).toBeGreaterThan(-1);
  return src.slice(i, i + len);
}

describe('D141 item 2: a hung initDatabase is bounded and handled as a failure', () => {
  const fn = slice('const attemptDbInit = useCallback(async () => {', 7000);

  test('the open is raced against a named bound that exceeds the 8s auth latch', () => {
    expect(src).toMatch(/const DB_INIT_TIMEOUT_MS = (\d+);/);
    const ms = Number(src.match(/const DB_INIT_TIMEOUT_MS = (\d+);/)[1]);
    expect(ms).toBeGreaterThan(8000);
    expect(ms).toBeLessThanOrEqual(15000);
    expect(fn).toMatch(/const initPromise = initDatabase\(\);/);
    expect(fn).toMatch(/await Promise\.race\(\[initPromise, timedOut\]\);/);
  });

  test('a timeout reaches the same catch as a thrown open (logError + dbInitFailed + return false)', () => {
    expect(fn).toMatch(/throw raceErr;/);
    expect(fn).toMatch(/catch \(e\) \{[\s\S]*?logError\('RootNavigator\.bootstrap\.initDb', e\)[\s\S]*?setDbInitFailed\(true\);[\s\S]*?return false;/);
  });

  test('a late completion re-runs the attempt once so the flag clears itself', () => {
    expect(fn).toMatch(/initPromise\.then\(\(\) => \{ lateDbInitRef\.current = false; return attemptDbInitRef\.current\?\.\(\); \}\)/);
    expect(src).toMatch(/const lateDbInitRef = useRef\(false\);/);
    expect(src).toMatch(/attemptDbInitRef\.current = attemptDbInit;/);
  });

  test('the DB-failed screen still renders ahead of every other route', () => {
    expect(src.indexOf('if (dbInitFailed) {')).toBeGreaterThan(-1);
    expect(src).toMatch(/Couldn't open your data/);
  });
});

describe('D141 item 7: the habit-derived training schedule refreshes at launch', () => {
  test('after the session-branch notification restore, the schedule is re-derived', () => {
    const restoreIdx = src.indexOf("restoreNotifications(JSON.parse(raw), session.user.id)");
    const refreshIdx = src.indexOf(".refreshHabitDerivedTrainingSchedule(session.user.id)");
    expect(restoreIdx).toBeGreaterThan(-1);
    expect(refreshIdx).toBeGreaterThan(restoreIdx);
    // Best-effort: never on the launch path's critical chain.
    expect(src.slice(refreshIdx, refreshIdx + 200)).toMatch(/\.catch\(\(\) => \{\}\)/);
  });
});
