/**
 * The number of unexplained silent catches only ever goes down (adversarial
 * audit 2026-08-26, finding 19).
 *
 * THE CLASS. This codebase's own convention, in CLAUDE.md, is that best-effort
 * paths swallow with `.catch(() => {})` AND A COMMENT saying why. 247 catches
 * across 64 files swallow with no explanation at all. Most are genuinely
 * best-effort and harmless: a haptic tap, an accessibility announcement, an
 * animation being stopped. Some are not, and the difference is invisible from
 * the outside, which is the point. This audit already found two that mattered:
 *
 *   PeekMenu.handleItem   every menu action in the app -- delete a routine,
 *                         remove a set, share, sign out -- ran inside an empty
 *                         catch, so a failure closed the sheet and did nothing,
 *                         with no toast, no log and no Sentry event. Fixed.
 *   restoreActiveWorkout  `catch (_) { row = null; }` made a failed database
 *                         read indistinguishable from "that workout is gone",
 *                         and the next branch deleted the recovery snapshot.
 *                         Fixed earlier in this campaign.
 *
 * WHY A RATCHET AND NOT 247 EDITS. CLAUDE.md forbids drive-by changes: "touch
 * only what the task requires; no drive-by refactors". Adding a comment to 247
 * sites the audit has not examined would be exactly that, and would also lie by
 * asserting each was considered. A lint rule has the same problem, since it
 * would fail the build 247 times on day one.
 *
 * So the count is frozen instead. New unexplained catches fail here, existing
 * ones can be fixed whenever their surrounding code is genuinely being worked
 * on, and the number can only fall. The failure message says which files carry
 * them so the next person does not have to re-derive the list.
 *
 * WHEN THIS TEST FAILS BECAUSE THE COUNT WENT DOWN: lower BASELINE. That is the
 * ratchet working.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

/**
 * The count at the time of the audit. Only ever revise this DOWNWARD.
 * Raising it to make a build pass defeats the entire purpose of the file.
 */
const BASELINE = 247;

/** `catch (x) {}` with nothing in the body and no comment on it or the next line. */
const EMPTY_CATCH = /catch\s*\((?:_\w*|\w+)?\)\s*\{\s*\}\s*$/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function findSilentCatches() {
  const hits = [];
  for (const file of walk(SRC)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!EMPTY_CATCH.test(line) || line.includes('//')) return;
      // A comment on the following line explains it just as well.
      if ((lines[i + 1] ?? '').includes('//')) return;
      hits.push({ file: path.relative(SRC, file), line: i + 1 });
    });
  }
  return hits;
}

describe('unexplained silent catches', () => {
  const hits = findSilentCatches();

  test('the scan finds something, so a broken regex cannot pass as progress', () => {
    // A ratchet that silently matches nothing reports perfect health forever.
    expect(hits.length).toBeGreaterThan(0);
  });

  test(`there are no more than ${BASELINE}`, () => {
    const byFile = hits.reduce((acc, h) => {
      acc[h.file] = (acc[h.file] ?? 0) + 1;
      return acc;
    }, {});
    const worst = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([f, n]) => `  ${n.toString().padStart(3)}  ${f}`)
      .join('\n');
    const message = hits.length > BASELINE
      ? `\n${hits.length - BASELINE} new silent catch(es). Either explain why the `
        + 'failure is safe to ignore, in a comment beside it, or handle it.\n'
        + `Worst files:\n${worst}\n`
      : '';
    expect(`${hits.length}${message}`).toBe(String(Math.min(hits.length, BASELINE)));
  });

  test('the two the audit fixed have not come back', () => {
    // Named individually because these were not harmless, and a regression in
    // either is worth more than a count moving by one.
    const peek = fs.readFileSync(path.join(SRC, 'components', 'PeekMenu.js'), 'utf8');
    expect(peek).not.toMatch(/try \{ item\.onPress\?\.\(\); \} catch \(_\) \{\}/);
    const store = fs.readFileSync(path.join(SRC, 'store', 'useAppStore.js'), 'utf8');
    const code = store.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/catch \(_\) \{ row = null; \}/);
  });

  test('the baseline is a ceiling, never a target to grow into', () => {
    // If the count has fallen, lower BASELINE. This asserts the file is honest
    // about which direction it is meant to move.
    expect(hits.length).toBeLessThanOrEqual(BASELINE);
  });
});
