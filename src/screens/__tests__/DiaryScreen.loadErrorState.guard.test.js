/**
 * Source guard for EP-07/UI-02 and EP-09/P-06 (Codex end-user-polish audit,
 * native app only) on DiaryScreen.js.
 *
 * Before this fix, `load()` (DiaryScreen.js) awaited its core reads
 * (getFoodEntriesForDay/getRollupForDay/getWater/getNutritionTargets etc.)
 * with no outer try/catch/finally. A rejection there meant `setLoaded(true)`
 * never ran, so a day whose read failed spun the skeleton forever
 * (EP-07/UI-02), and if a caller ever swallowed the rejection the day would
 * fall through to `viewEntries.length === 0` and paint "Nothing logged for
 * this day yet" -- a false empty state for a load that actually FAILED
 * (EP-09/P-06). The focus-effect caller (`useFocusEffect(useCallback(() =>
 * { load(); }, [load]))`) never observed a rejection either, and
 * `onRefresh` never settled `refreshing` in a `finally`.
 *
 * This suite pins:
 *   - load() wraps its whole body in try/catch/finally.
 *   - `loadError` state exists and is what the failure branch flips.
 *   - a caught failure never wipes entries/rollup/etc already on screen (no
 *     setEntries/setRollup/etc call inside the catch block) -- so a refresh
 *     failure preserves whatever was already showing.
 *   - `loaded`/`refreshing` are ALWAYS settled (finally), so a rejected read
 *     can never spin the skeleton or the pull-to-refresh spinner forever.
 *   - the focus caller `.catch`es load() defensively.
 *   - the render layer shows a retryable error state (not the empty-state
 *     copy, and not an endless skeleton) when loadError is true and there is
 *     nothing already on screen to preserve.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'DiaryScreen.js'), 'utf8');

describe('DiaryScreen EP-07/UI-02 load try/catch/finally wiring', () => {
  test('loadError state exists alongside loaded', () => {
    expect(SRC).toMatch(/const \[loaded, setLoaded\] = useState\(false\);/);
    expect(SRC).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
  });

  test('load() wraps its body in try/catch/finally', () => {
    const start = SRC.indexOf('const load = useCallback(async () => {');
    expect(start).toBeGreaterThan(-1);
    const end = SRC.indexOf('}, [userId, selectedDate, macroCycle, refeed, sex, readOnly]);', start);
    expect(end).toBeGreaterThan(start);
    const body = SRC.slice(start, end);
    expect(body).toMatch(/if \(!userId\) return;\s*\n\s*const loadToken = loadGuardRef\.current\.next\(\);\s*\n[\s\S]*?\n\s*try \{/);
    expect(body).toMatch(/\} catch \(e\) \{/);
    expect(body).toMatch(/\} finally \{/);
  });

  test('a caught failure logs, flips loadError, and never clears already-rendered data', () => {
    const catchStart = SRC.indexOf('} catch (e) {\n      // A stale');
    expect(catchStart).toBeGreaterThan(-1);
    const finallyStart = SRC.indexOf('} finally {', catchStart);
    expect(finallyStart).toBeGreaterThan(catchStart);
    const catchBody = SRC.slice(catchStart, finallyStart);
    expect(catchBody).toMatch(/logError\('DiaryScreen\.load', e, \{ userId, selectedDate \}\);/);
    expect(catchBody).toMatch(/setLoadError\(true\);/);
    // Preserving prior data on a refresh failure means the catch block must
    // never call any of the success-path setters.
    expect(catchBody).not.toMatch(/setEntries\(/);
    expect(catchBody).not.toMatch(/setRollup\(/);
    expect(catchBody).not.toMatch(/setTargets\(/);
  });

  test('loaded is ALWAYS settled in finally, success or failure', () => {
    const finallyMatch = SRC.match(/\} finally \{\s*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*if \(loadGuardRef\.current\.isCurrent\(loadToken\)\) setLoaded\(true\);\s*\n\s*\}/);
    expect(finallyMatch).not.toBeNull();
  });

  test('the success path resets loadError before the stale-request guard exits are all accounted for', () => {
    expect(SRC).toMatch(/setLatestCoachOutput\(coachOut \?\? null\);\s*\n\s*setLoadError\(false\);/);
  });

  test('the focus caller observes a rejection defensively (never an unhandled rejection)', () => {
    expect(SRC).toMatch(/useFocusEffect\(useCallback\(\(\) => \{ load\(\)\.catch\(\(\) => \{\}\); \}, \[load\]\)\);/);
  });

  test('onRefresh always settles refreshing, even if load() throws', () => {
    const start = SRC.indexOf('const onRefresh = useCallback(async () => {');
    expect(start).toBeGreaterThan(-1);
    const body = SRC.slice(start, start + 250);
    expect(body).toMatch(/setRefreshing\(true\);\s*\n\s*try \{\s*\n\s*await load\(\);\s*\n\s*\} finally \{\s*\n\s*setRefreshing\(false\);\s*\n\s*\}/);
  });
});

describe('DiaryScreen EP-09/P-06 false empty-state guard', () => {
  test('imports the shared EmptyState component for the failed-load render', () => {
    expect(SRC).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
  });

  test('a failed load with nothing to show renders a retryable error, ahead of the real empty state', () => {
    const idxSkeleton = SRC.indexOf('{!loaded ? (');
    const idxError = SRC.indexOf('loadError && viewEntries.length === 0 ? (');
    const idxEmpty = SRC.indexOf('viewEntries.length === 0 ? (\n          readOnly ? (');
    expect(idxSkeleton).toBeGreaterThan(-1);
    expect(idxError).toBeGreaterThan(idxSkeleton);
    expect(idxEmpty).toBeGreaterThan(idxError);
    const errorBlock = SRC.slice(idxError, idxEmpty);
    expect(errorBlock).toMatch(/title="Couldn't load this day"/);
    expect(errorBlock).toMatch(/actionLabel="Retry"/);
    expect(errorBlock).toMatch(/onAction=\{load\}/);
    expect(errorBlock).not.toMatch(/Nothing logged/);
  });
});
