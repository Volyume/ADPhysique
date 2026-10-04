/**
 * science.test.js -- D219 lane A1: every number the plan builder uses has its
 * grade and its source, and the plan modules stay pure.
 *
 * What this pins, and why:
 *   - Every exported number in science.js has an EVIDENCE entry with a grade
 *     from the report's scale (A, B, C, D, CONV, INF) and a source. The
 *     founder asked for plans "with scientific backing" (register D219), so a
 *     number cannot be added without saying what backs it.
 *   - The founder's rulings that are numbers: the 4 / 3 caps (D8), the 8
 *     exercise / 25 set session ceilings (D45), the effort ladder 3, 2, 2, 1,
 *     1, 4 (Q5 = A).
 *   - science.js, bands.js and prescribe.js have no I/O, no clock read, no
 *     randomness, and no route into src/lib/recovery/: prescribe.js is
 *     reached from the check-in path (coachApply.js), which must stay
 *     isolated from the recovery model (edIsolation.guard.test.js).
 */
import fs from 'fs';
import path from 'path';
import * as science from '../science';

const GRADES = new Set(['A', 'B', 'C', 'D', 'CONV', 'INF']);

function numericLeaves(value, prefix, out) {
  if (typeof value === 'number') { out.push(prefix); return out; }
  if (Array.isArray(value)) { out.push(prefix); return out; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) numericLeaves(v, `${prefix}.${k}`, out);
  }
  return out;
}

describe('science.js: every number has a grade and a source', () => {
  const groups = Object.entries(science).filter(([name, v]) => name !== 'EVIDENCE' && typeof v !== 'function');

  test('there are numbers to check (the test is not vacuous)', () => {
    expect(groups.length).toBeGreaterThan(10);
  });

  for (const [name, value] of groups) {
    test(`${name}: each number is covered by an EVIDENCE entry`, () => {
      const leaves = numericLeaves(value, name, []);
      expect(leaves.length).toBeGreaterThan(0);
      for (const leaf of leaves) {
        // A muscle table or a role's sub-table may be covered by its parent key.
        const parts = leaf.split('.');
        const candidates = parts.map((_, i) => parts.slice(0, i + 1).join('.'));
        const entry = candidates.map((k) => science.EVIDENCE[k]).find(Boolean);
        expect({ leaf, covered: Boolean(entry) }).toEqual({ leaf, covered: true });
        expect(GRADES.has(entry.grade)).toBe(true);
        expect(typeof entry.source).toBe('string');
        expect(entry.source.length).toBeGreaterThan(10);
      }
    });
  }

  test('every EVIDENCE entry names something that exists', () => {
    for (const key of Object.keys(science.EVIDENCE)) {
      const [group, ...rest] = key.split('.');
      let node = science[group];
      for (const part of rest) node = node?.[part];
      expect({ key, exists: node !== undefined }).toEqual({ key, exists: true });
    }
  });
});

describe("science.js: the founder's numbers", () => {
  test('D8: 4 sets for a compound, 3 for an isolation movement', () => {
    expect(science.SETS_PER_EXERCISE.capCompound).toBe(4);
    expect(science.SETS_PER_EXERCISE.capIsolation).toBe(3);
    expect(science.exerciseCap('isolation')).toBe(3);
    expect(science.exerciseCap('heavy_compound')).toBe(4);
    expect(science.exerciseCap(undefined)).toBe(4);
    expect(science.exerciseCap('isolation', true)).toBe(5);
  });

  test('D45: 8 exercises and 25 working sets a session', () => {
    expect(science.SESSION_CEILINGS).toEqual({ exercises: 8, workingSets: 25 });
  });

  test('Q5 = A: heavy weeks one rep short of failure, ladder 3, 2, 2, 1, 1, then 4', () => {
    expect(science.BLOCK.rirLadder).toEqual([3, 2, 2, 1, 1, 4]);
    expect(science.BLOCK.rirLadder).not.toContain(0);
  });

  test('the per-session caps and the bands match the design (4.3, 5.3)', () => {
    expect(science.PER_SESSION).toEqual({ directCap: 8, fractionalCap: 11, focusDirectCap: 10, focusFractionalCap: 12 });
    expect(science.WEEKLY_BANDS).toEqual({
      maintenanceFrom: 2, maintenanceTop: 6, normalFrom: 10, normalTop: 20, focusTop: 30, studiedTop: 42,
    });
    expect(science.exercisesAllowed('chest')).toBe(3);
    expect(science.exercisesAllowed('biceps')).toBe(2);
    expect(science.exercisesAllowed('hamstrings')).toBe(1);
    expect(science.exercisesAllowed('neck')).toBe(1);
  });
});

/** `src` with block and line comments removed, so a header that disclaims a call cannot trip the guard. */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const FORBIDDEN = [
  'Date.now(',
  'new Date(',
  'Math.random(',
  'database',
  'store/useAppStore',
  'async-storage',
  'recovery/',
  'supabase',
];

describe('purity (source guard): the plan modules', () => {
  for (const name of ['science', 'bands', 'prescribe']) {
    const src = codeOnly(fs.readFileSync(path.join(__dirname, '..', `${name}.js`), 'utf8'));

    test(`${name}.js has no I/O, no clock, no randomness and no route into src/lib/recovery`, () => {
      for (const needle of FORBIDDEN) expect({ needle, found: src.includes(needle) }).toEqual({ needle, found: false });
    });

    test(`${name}.js imports nothing outside src/lib/plan`, () => {
      const imports = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of imports) expect(spec.startsWith('./')).toBe(true);
    });

    test(`${name}.js still contains code after comment stripping (the guard is not vacuous)`, () => {
      expect(src).toMatch(/export (function|const)/);
    });
  }
});
