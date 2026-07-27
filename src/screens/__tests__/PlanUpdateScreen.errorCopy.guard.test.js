/**
 * Regression pin for C1 (pre-release sweep 2026-07-27, LANE C — "raw error
 * messages reaching users"). PlanUpdateScreen used to build its rebuild-
 * failure toast as a template literal interpolating `dry.error`,
 * `e?.message` or `planResult.error` straight in, so a failed engine run or
 * DB write during "Adjust training" could surface a raw technical string to
 * the user.
 *
 * This is a source-level guard (matching the fs.readFileSync + regex
 * pattern already used elsewhere in this repo for founder-locked rules)
 * rather than a full component mount: the screen pulls in the SQLite/sync
 * import graph, and what needs pinning here is textual — no toast.show call
 * in this file may ever interpolate a caught exception or an
 * engine-returned error code, and every failure path must still log the
 * real reason via errorLog before showing the one fixed calm message.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'PlanUpdateScreen.js'), 'utf8');

describe('PlanUpdateScreen rebuild-failure copy (C1 pin)', () => {
  test('no toast.show call interpolates a raw exception or error code', () => {
    expect(source).not.toMatch(/toast\.show\(`[^`]*\$\{e\?\.message/);
    expect(source).not.toMatch(/toast\.show\(`[^`]*\$\{dry\.error/);
    expect(source).not.toMatch(/toast\.show\(`[^`]*\$\{planResult\.error/);
    // Belt-and-braces: the old literal wording must not reappear verbatim.
    expect(source).not.toMatch(/Couldn't rebuild your plan \(/);
  });

  test('every rebuild-failure toast uses the single fixed calm message', () => {
    const failureToastCount = (source.match(/toast\.show\(REBUILD_FAILED_MESSAGE,/g) || []).length;
    // handleRebuildPress: !dry.ok + catch; handleConfirmRebuild: !planResult.ok.
    expect(failureToastCount).toBe(3);
  });

  test('the fixed message is calm, has no interpolation, and reassures the setup is unchanged', () => {
    const m = source.match(/const REBUILD_FAILED_MESSAGE = "([^"]+)";/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toMatch(/\$\{/);
    expect(m[1].toLowerCase()).toMatch(/wasn't changed/);
    expect(m[1]).not.toMatch(/—/); // no em dash in user-facing copy
  });

  test('each failure path still logs the real reason before showing the calm toast', () => {
    expect(source).toMatch(/logWarn\('PlanUpdateScreen\.reviewRebuild', dry\.error/);
    expect(source).toMatch(/logError\('PlanUpdateScreen\.reviewRebuild', e,/);
    expect(source).toMatch(/logError\('PlanUpdateScreen\.confirmRebuild', e,/);
    expect(source).toMatch(/logWarn\('PlanUpdateScreen\.confirmRebuild', planResult\.error/);
  });
});
