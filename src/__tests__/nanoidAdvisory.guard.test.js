/**
 * GHSA-28wg-ghj8-5hjv (nanoid) — REMEDIATED.
 *
 * THE ADVISORY. "nanoid: non-secure generators can loop indefinitely with
 * negative size", affecting < 3.3.16. The security campaign moved the lock to
 * a patched 3.3.x release without changing the Expo major.
 *
 * THE VULNERABLE CODE, verbatim from node_modules/nanoid/non-secure/index.js:
 *
 *     let nanoid = (size = 21) => {
 *       let id = ''
 *       let i = size | 0
 *       while (i--) { id += urlAlphabet[(Math.random() * 64) | 0] }
 *       return id
 *     }
 *
 * `while (i--)` counts DOWN. From a negative start it never reaches zero, so it
 * never terminates. Confirmed by running it: still looping after five million
 * iterations. The secure generator in nanoid's main entry point is not affected,
 * because fillPool throws RangeError('Wrong ID size') for a negative argument.
 *
 * THE EXPLOIT PRECONDITION. A caller must pass a negative size.
 *
 * WHAT VOLYUME ACTUALLY DOES. nanoid reaches the bundle through three runtime
 * dependencies -- @react-navigation/core, @react-navigation/routers and
 * @gorhom/portal -- all of which import `nanoid/non-secure`. Every one of their call sites is `nanoid()`
 * with NO argument. A sweep of the compiled output for any call passing
 * anything at all returns nothing. The size parameter is therefore always the
 * default 21, and there is no data path from any input -- typed, synced, or
 * arriving on a deep link -- to it.
 *
 * REMEDIATION. The lockfile now resolves nanoid to a patched 3.3.x release.
 * The reachability sweep remains because it documents the actual runtime use
 * and catches any future consumer that begins passing attacker-controlled size.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const NM = path.join(ROOT, 'node_modules');

/** The three runtime packages that pull nanoid into the app bundle. */
const CONSUMERS = [
  '@react-navigation/core',
  '@react-navigation/routers',
  '@gorhom/portal',
];

function jsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) jsFiles(p, out);
    // Source maps embed the original source and would produce false hits.
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.map')) out.push(p);
  }
  return out;
}

describe('the advisory is patched in the installed dependency', () => {
  test('the non-secure loop has an explicit positive bound', () => {
    const src = fs.readFileSync(path.join(NM, 'nanoid', 'non-secure', 'index.js'), 'utf8');
    expect(src).toMatch(/let i = size \| 0/);
    expect(src).toMatch(/while \(i-- > 0\)/);
    expect(src).not.toMatch(/while \(i--\)\s*\{/);
  });

  test('the secure generator still rejects negative byte counts', () => {
    const src = fs.readFileSync(path.join(NM, 'nanoid', 'index.js'), 'utf8');
    expect(src).toMatch(/if \(bytes < 0\) throw new RangeError/);
  });

  test('the installed version is at least the first patched 3.3 release', () => {
    const v = JSON.parse(fs.readFileSync(path.join(NM, 'nanoid', 'package.json'), 'utf8')).version;
    const [major, minor, patch] = v.split('.').map(Number);
    expect(major).toBe(3);
    expect(minor).toBe(3);
    expect(patch).toBeGreaterThanOrEqual(16);
  });
});

describe('no code in this app can reach the precondition', () => {
  test('the consumers really do import the vulnerable module, so this is not moot', () => {
    // Establishing that the affected entry point IS the one that ships, before
    // arguing it is unreachable. The reverse order would be wishful.
    const importers = CONSUMERS.filter((pkg) => jsFiles(path.join(NM, pkg))
      .some((f) => /nanoid\/non-secure/.test(fs.readFileSync(f, 'utf8'))));
    expect(importers.sort()).toEqual([...CONSUMERS].sort());
  });

  test.each(CONSUMERS)('%s never passes an argument to nanoid', (pkg) => {
    const offenders = [];
    for (const file of jsFiles(path.join(NM, pkg))) {
      const text = fs.readFileSync(file, 'utf8');
      // Any nanoid call whose first character after the paren is not ')'.
      for (const m of text.matchAll(/\bnanoid\s*\(\s*(?!\))/g)) {
        offenders.push(`${path.relative(NM, file)}: ${text.slice(m.index, m.index + 60)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('nor does Volyume itself, which does not use nanoid at all', () => {
    const src = path.join(ROOT, 'src');
    const offenders = jsFiles(src)
      .filter((f) => !f.includes('__tests__'))
      .filter((f) => /require\(['"]nanoid|from ['"]nanoid/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  test('so the size is always the default, and a default is not negative', () => {
    const src = fs.readFileSync(path.join(NM, 'nanoid', 'non-secure', 'index.js'), 'utf8');
    expect(src).toMatch(/let nanoid = \(size = 21\)/);
  });
});

describe('the disposition is recorded where a reader will find it', () => {
  test('the campaign document carries it', () => {
    const doc = fs.readFileSync(
      path.join(ROOT, 'docs', 'audit', 'remediation-campaign-2026-08-27.md'), 'utf8',
    );
    expect(doc).toMatch(/GHSA-28wg-ghj8-5hjv/);
  });
});
