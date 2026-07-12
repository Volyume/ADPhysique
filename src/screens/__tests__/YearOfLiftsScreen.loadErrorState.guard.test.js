/**
 * Source guard for EP-09/P-06 (Codex end-user-polish audit, native app only)
 * on YearOfLiftsScreen.js.
 *
 * Before this fix, the mount-effect's `load` was an effect-local async
 * closure whose catch block was `catch (_e) { /* leave data null -> graceful
 * empty *\/ }`, immediately followed by `setLoading(false)`. A rejected read
 * (getYearOfLiftsData / getRecapData / getBlockReflectionData) therefore left
 * `data` null exactly like a brand-new user with no sessions logged, and the
 * render only ever showed "No sessions yet" -- with no retry, since `load`
 * wasn't even reachable outside the effect.
 *
 * This suite pins:
 *   - `load` is hoisted to a stable useCallback (reachable by a Retry
 *     button), not an effect-local closure.
 *   - a rejected read is logged and flips `loadError`, never silently
 *     swallowed.
 *   - the render layer shows a distinct, retryable error ahead of and
 *     mutually exclusive with the real "No sessions yet" empty state.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'YearOfLiftsScreen.js'), 'utf8');

describe('YearOfLiftsScreen EP-09/P-06 load-failure guard', () => {
  test('loadError state exists alongside loading', () => {
    expect(SRC).toMatch(/const \[loading, setLoading\] = useState\(true\);/);
    expect(SRC).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
  });

  test('load is a stable useCallback, not an effect-local closure', () => {
    expect(SRC).toMatch(/const load = useCallback\(async \(\) => \{/);
    expect(SRC).toMatch(/\}, \[user\?\.id, variant, startMs, endMs, mesocycleId, yearMs\]\);/);
  });

  test('a rejected read is logged and flips loadError, not silently swallowed', () => {
    const catchStart = SRC.indexOf('} catch (e) {\n      // EP-09/P-06');
    expect(catchStart).toBeGreaterThan(-1);
    const finallyStart = SRC.indexOf('} finally {', catchStart);
    expect(finallyStart).toBeGreaterThan(catchStart);
    const catchBody = SRC.slice(catchStart, finallyStart);
    expect(catchBody).toMatch(/logError\('YearOfLiftsScreen\.load', e, \{ userId: user\?\.id, variant \}\);/);
    expect(catchBody).toMatch(/setLoadError\(true\);/);
    expect(catchBody).not.toMatch(/setData\(/);
  });

  test('loading is always settled in finally', () => {
    expect(SRC).toMatch(/\} finally \{\s*\n\s*setLoading\(false\);\s*\n\s*\}/);
  });

  test('a failed load renders a distinct retryable error, ahead of and separate from the real empty state', () => {
    const idxError = SRC.indexOf('{!loading && loadError && cards.length === 0 && (');
    const idxEmpty = SRC.indexOf('{!loading && !loadError && cards.length === 0 && (');
    expect(idxError).toBeGreaterThan(-1);
    expect(idxEmpty).toBeGreaterThan(idxError);
    const errorBlock = SRC.slice(idxError, idxEmpty);
    expect(errorBlock).toMatch(/title="Couldn't load this"/);
    expect(errorBlock).toMatch(/actionLabel="Retry"/);
    expect(errorBlock).toMatch(/onAction=\{load\}/);
    expect(errorBlock).not.toMatch(/No sessions/);
  });
});
