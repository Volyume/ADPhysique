/**
 * Source guard for EP-09/P-06 (Codex end-user-polish audit, native app only)
 * on PlansScreen.js.
 *
 * Before this fix, loadData()'s catch block was `catch (_e) {}` -- silently
 * swallowed, with `finally { setLoaded(true); }` unconditionally following.
 * A rejected read (e.g. a transient SQLite/offline failure) therefore landed
 * on `loaded = true` with `activePlan`/`myPlans`/`folders` all still at their
 * initial empty state, and the render below could only ever conclude "No
 * active plan" -- a load FAILURE painted as a confirmed empty account.
 *
 * This suite pins:
 *   - loadData() logs and flags the failure (loadError) rather than
 *     swallowing it.
 *   - the failure branch never resets activePlan/myPlans/folders (the whole
 *     read is one Promise.all, so nothing needs to be re-cleared; the catch
 *     body itself must not call any of those setters).
 *   - the render layer shows a distinct, retryable error card ONLY when
 *     there is genuinely nothing to fall back on (no activePlan already
 *     loaded), never overwriting an active-plan card that's already showing
 *     from a prior successful load.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');

describe('PlansScreen EP-09/P-06 load-failure guard', () => {
  test('loadError state exists alongside loaded', () => {
    expect(SRC).toMatch(/const \[loaded, setLoaded\] = useState\(false\);/);
    expect(SRC).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
  });

  test('loadData() logs and flags the failure instead of swallowing it', () => {
    const catchStart = SRC.indexOf('} catch (_e) {\n      // EP-09/P-06');
    expect(catchStart).toBeGreaterThan(-1);
    const finallyStart = SRC.indexOf('} finally {', catchStart);
    expect(finallyStart).toBeGreaterThan(catchStart);
    const catchBody = SRC.slice(catchStart, finallyStart);
    expect(catchBody).toMatch(/logError\('PlansScreen\.loadData', _e, \{ userId: user\?\.id \}\);/);
    expect(catchBody).toMatch(/setLoadError\(true\);/);
    // The whole read is one Promise.all: nothing has been reassigned yet, so
    // the catch body must not itself blank any plan/folder state.
    expect(catchBody).not.toMatch(/setActivePlanData\(/);
    expect(catchBody).not.toMatch(/setMyPlans\(/);
    expect(catchBody).not.toMatch(/setFolders\(/);
  });

  test('loaded is still always settled in finally, success or failure', () => {
    expect(SRC).toMatch(/\} finally \{\s*\n\s*setLoaded\(true\);\s*\n\s*\}/);
  });

  test('the success path resets loadError', () => {
    expect(SRC).toMatch(/setBlockSnoozed\(false\);\s*\n\s*\}\s*\n\s*setLoadError\(false\);\s*\n\s*\} catch/);
  });

  test('a load failure with no active plan yet renders a retryable error, ahead of the plan/folder branches', () => {
    const idxError = SRC.indexOf('{loadError && !activePlan ? (');
    const idxActivePlan = SRC.indexOf(') : activePlan ? (');
    expect(idxError).toBeGreaterThan(-1);
    expect(idxActivePlan).toBeGreaterThan(idxError);
    const errorBlock = SRC.slice(idxError, idxActivePlan);
    expect(errorBlock).toMatch(/Couldn't load your plans/);
    expect(errorBlock).toMatch(/title="Retry"/);
    expect(errorBlock).toMatch(/onPress=\{loadData\}/);
    expect(errorBlock).not.toMatch(/No active plan/);
  });

  test('an already-loaded active plan is never replaced by the error card (preserve prior data)', () => {
    // The error branch is explicitly gated on `!activePlan`, so a refresh
    // failure with an existing active plan falls through to the
    // `activePlan ? (...)` branch instead, keeping the real plan card up.
    expect(SRC).toMatch(/\{loadError && !activePlan \? \(/);
  });
});
