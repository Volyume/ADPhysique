/**
 * First-launch food work waits for a finished setup (Android spinner report,
 * 2026-10-18) - RootNavigator wiring.
 *
 * On a fresh install the bundled OFF and CoFID snapshot imports and the
 * food-library delta pull are about 80,000 sequential SQLite calls on the one
 * thread every Expo native call shares, and each 5,000-row delta page holds
 * the app-wide transaction queue the plan build writes through. They used to
 * start the moment the database opened, so they ran underneath onboarding
 * and began again on every app restart. What this pins:
 *   - the three calls live in startFoodLibraryWork and nowhere else here;
 *   - the database-open path no longer calls them inline;
 *   - they start only when the database is open AND firstRunComplete is true,
 *     and again after a reopen (the dbReadyTick bump).
 *
 * Source guards, matching the other rootNavigator*.guard tests: the navigator
 * pulls the whole native graph and cannot be mounted here.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'RootNavigator.js'), 'utf8');

function count(re) {
  return (src.match(re) || []).length;
}

test('each food job is started from exactly one place, startFoodLibraryWork', () => {
  const fn = src.slice(src.indexOf('function startFoodLibraryWork() {'), src.indexOf('export default function RootNavigator'));
  expect(fn).toMatch(/importOffSnapshotIfNeeded\(\)/);
  expect(fn).toMatch(/importCofidSnapshotIfNeeded\(\)/);
  expect(fn).toMatch(/pullFoodLibraryDelta\(\)/);
  expect(count(/importOffSnapshotIfNeeded\(\)/g)).toBe(1);
  expect(count(/importCofidSnapshotIfNeeded\(\)/g)).toBe(1);
  expect(count(/pullFoodLibraryDelta\(\)/g)).toBe(1);
});

test('the database-open path signals readiness instead of starting the food work', () => {
  const open = src.slice(src.indexOf('const attemptDbInit = useCallback(async () => {'), src.indexOf('const attemptDbInitRef = useRef(null);'));
  expect(open).toMatch(/setDbReadyTick\(\(n\) => n \+ 1\);/);
  expect(open).not.toMatch(/startFoodLibraryWork\(\)/);
});

test('the food work starts only with an open database and a finished setup', () => {
  expect(src).toMatch(/useEffect\(\(\) => \{\s*if \(!dbReadyTick \|\| !firstRunComplete\) return;\s*startFoodLibraryWork\(\);\s*\}, \[dbReadyTick, firstRunComplete\]\);/);
  expect(count(/startFoodLibraryWork\(\);/g)).toBe(1);
});

describe('start-up waits report a stall, and only report', () => {
  test('both splash waits are named, and each sends one warning after the window', () => {
    expect(src).toMatch(/const BOOT_STALL_REPORT_MS = 30000;/);
    const waits = src.slice(src.indexOf('const bootWaits = ['), src.indexOf("].filter(Boolean).join(',');"));
    for (const name of ["'splash'", "'first_run'", "'tier'", "'auth'", "'consent'"]) expect(waits).toContain(name);
    expect(src).toMatch(/_bootLog\('warn', 'RootNavigator\.bootStalled', `still waiting on \$\{bootWaits\}`\);\s*\}, BOOT_STALL_REPORT_MS\);\s*return \(\) => clearTimeout\(timer\);\s*\}, \[bootWaits\]\);/);
  });

  test('the report changes nothing: no state, consent or routing is touched by it', () => {
    const effect = src.slice(src.indexOf('const bootWaits = ['), src.indexOf('}, [bootWaits]);'));
    expect(effect).not.toMatch(/\bset(?!Timeout)[A-Z]\w*\(|setHealthConsent|navigation|navigate\(/);
  });
});
