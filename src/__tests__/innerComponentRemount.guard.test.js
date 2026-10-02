/**
 * innerComponentRemount.guard.test.js (founder device report 2026-10-02:
 * the morning-weight keyboard dropped after every digit, for the second
 * time; register D214 addendum 3 records the fix).
 *
 * The rule this guard pins, repo-wide: a React component is never DECLARED
 * inside another component's body and then rendered as a JSX tag. Such a
 * component has a new function identity on every render of its parent, so
 * React treats it as a different element type, unmounts its subtree and
 * remounts it, which drops focus and the keyboard from any TextInput inside
 * it (TodayStrip's weight row, the defect this guard closes), discards
 * local state, and re-runs effects. Declaring the helper as a plain
 * function and calling it (`{renderRow()}`), or hoisting the component to
 * module level with props, are both fine.
 *
 * The check: in every non-test source file, a function or arrow named with
 * a capital letter and declared at two or more spaces of indentation (so,
 * inside another function) that is rendered anywhere in the same file as
 * `<Name` is a failure, named with its file and line.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const DECLARATION = /^(\s{2,})(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)|\w+)\s*=>)/;

test('no component is declared inside another component and rendered as a JSX tag', () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const m = DECLARATION.exec(line);
      if (!m) return;
      const name = m[2] || m[3];
      if (!name) return;
      const tag = new RegExp(`<${name}(\\s|/|>)`);
      if (tag.test(src)) offenders.push(`${path.relative(SRC, file)}:${i + 1} declares ${name} inside a function and renders <${name} />`);
    });
  }
  expect(offenders).toEqual([]);
});
