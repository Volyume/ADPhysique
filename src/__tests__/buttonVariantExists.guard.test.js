/**
 * buttonVariantExists.guard.test.js
 *
 * Founder order 2026-09-26 (register D206): Button silently falls back to
 * its primary look for a variant it does not define, so a "ghost" decline
 * rendered as a second primary beside the action it declined, on three
 * screens. This guard reads every literal `variant="..."` passed to the
 * shared Button across src/screens and src/components and fails on any
 * name Button.js's variant table does not define.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUTTON = fs.readFileSync(path.join(ROOT, 'components', 'Button.js'), 'utf8');

function definedVariants() {
  const start = BUTTON.indexOf('function buildVariants(c) {');
  const body = BUTTON.slice(start, BUTTON.indexOf('\n}\n', start));
  return new Set((body.match(/^\s{4}(\w+): \{/gm) || []).map((l) => l.trim().split(':')[0]));
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

describe('every literal Button variant exists', () => {
  test('Button defines the variants this guard expects to read', () => {
    const v = definedVariants();
    for (const name of ['emphatic', 'primary', 'secondary', 'tertiary', 'outline', 'destructive']) {
      expect(v.has(name)).toBe(true);
    }
  });

  test('no screen or component passes a variant Button does not define', () => {
    const v = definedVariants();
    const offenders = [];
    for (const file of [...walk(path.join(ROOT, 'screens')), ...walk(path.join(ROOT, 'components'))]) {
      const src = fs.readFileSync(file, 'utf8');
      if (!/<Button\b/.test(src)) continue;
      const re = /<Button\b[^>]*?\bvariant="(\w+)"/gs;
      let m;
      while ((m = re.exec(src))) {
        if (!v.has(m[1])) offenders.push(`${path.relative(ROOT, file)}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
