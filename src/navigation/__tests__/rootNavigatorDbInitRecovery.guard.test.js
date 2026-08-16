/**
 * Release gate finding (final reliability audit, baseline 0480e6e4):
 * initDatabase() failing during bootstrap() (SQLCipher open or a genuine
 * migration error) was caught and only logged - bootstrap then fell through
 * and rendered the normal navigator as if the database had opened. `_db`
 * stays null (initDatabase's own catch resets it on throw), so every
 * subsequent db() call anywhere in the app re-attempts the SAME failing
 * init, and because most read functions in database.js wrap their own
 * query in a try/catch that returns []/null on failure, the app didn't
 * crash - it silently rendered a permanently empty app (no plan, no
 * history, can't start a workout) with zero explanation and no recovery
 * path short of an OS-level app-data reset, on every single launch. A
 * fresh reinstall does not help either: a new install starts at
 * user_version 0 and marches straight into the same broken migration.
 *
 * RootNavigator is not importable under this project's jest config (no
 * native-module mocks - see e.g. rootNavigatorAuthLatch.guard.test.js's own
 * header, the established precedent for this exact situation), so this is
 * a scoped source guard pinning the fix's full contract.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '..', 'RootNavigator.js'),
  'utf8',
);

describe('RootNavigator surfaces a failed local-database open as recoverable, not silent', () => {
  test('a dedicated, never-auto-reset state flag exists for the failure', () => {
    expect(src).toMatch(/const \[dbInitFailed, setDbInitFailed\] = useState\(false\)/);
  });

  test('attemptDbInit sets the flag true on failure and still logs to errorLog (Sentry-forwarding)', () => {
    const start = src.indexOf('const attemptDbInit = useCallback(');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('const handleDbRetry', start);
    const body = src.slice(start, end);
    expect(body).toMatch(/catch \(e\) \{[\s\S]*?logError\('RootNavigator\.bootstrap\.initDb', e\)[\s\S]*?setDbInitFailed\(true\);[\s\S]*?return false;/);
  });

  test('attemptDbInit clears the flag on a successful (re)run', () => {
    const start = src.indexOf('const attemptDbInit = useCallback(');
    const end = src.indexOf('const handleDbRetry', start);
    const body = src.slice(start, end);
    expect(body).toMatch(/setDbInitFailed\(false\);\s*return true;/);
  });

  test('bootstrap() actually calls attemptDbInit rather than duplicating/reintroducing an inline swallow', () => {
    const bootstrapStart = src.indexOf('async function bootstrap()');
    expect(bootstrapStart).toBeGreaterThan(-1);
    const bootstrapBody = src.slice(bootstrapStart, bootstrapStart + 2500);
    expect(bootstrapBody).toMatch(/await attemptDbInit\(\);/);
  });

  test('a retry handler exists and re-invokes attemptDbInit, tracking an in-flight state', () => {
    expect(src).toMatch(/const \[dbRetrying, setDbRetrying\] = useState\(false\)/);
    const start = src.indexOf('const handleDbRetry = useCallback(');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, start + 400);
    expect(body).toMatch(/setDbRetrying\(true\)/);
    expect(body).toMatch(/await attemptDbInit\(\)/);
    expect(body).toMatch(/setDbRetrying\(false\)/);
  });

  test('the render gate blocks the normal navigator tree while the flag is set', () => {
    const splashGateIdx = src.indexOf(
      'if (!splashReady || !firstRunChecked || !tierChecked || !initialAuthResolved) {',
    );
    expect(splashGateIdx).toBeGreaterThan(-1);
    const gateIdx = src.indexOf('if (dbInitFailed) {', splashGateIdx);
    // Must exist, and must be evaluated BEFORE renderNavigator() is ever
    // reached - a fallback bolted on after would still let the broken
    // navigator flash first.
    expect(gateIdx).toBeGreaterThan(splashGateIdx);
    const renderNavigatorDefIdx = src.indexOf('function renderNavigator()');
    const renderNavigatorCallIdx = src.indexOf('renderNavigator()', renderNavigatorDefIdx + 1);
    expect(gateIdx).toBeLessThan(renderNavigatorCallIdx);
  });

  test('the fallback screen offers a retry action, not a dead end', () => {
    const gateIdx = src.indexOf('if (dbInitFailed) {');
    const gateBlock = src.slice(gateIdx, gateIdx + 900);
    expect(gateBlock).toMatch(/onPress=\{handleDbRetry\}/);
    expect(gateBlock).toMatch(/disabled=\{dbRetrying\}/);
  });

  test('the fallback UI uses static theme tokens, not the live useTheme() hook (must render even if theming itself is broken)', () => {
    const gateIdx = src.indexOf('if (dbInitFailed) {');
    const gateBlock = src.slice(gateIdx, gateIdx + 900);
    expect(gateBlock).not.toMatch(/useTheme\(\)/);
    expect(gateBlock).toMatch(/dbErrorStyles\./);
  });
});
