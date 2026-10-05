/**
 * edIsolation.guard.test.js -- LANE R-G (Opus review finding 25, per-muscle
 * recovery programme, register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 9: "no import of
 * src/lib/recovery from any ED-safety module").
 *
 * CLAUDE.md Section 2 ("ED-safety system -- do not touch") keeps
 * edPatternDetector.js, wellbeing.js, nutritionEngine.js, weeklyCoach.js and
 * coachApply.js untouched by this feature: none of them may import or
 * require anything under src/lib/recovery/. This source-level guard pins
 * that isolation, so a future edit that wires the two systems together
 * fails a test rather than shipping quietly.
 */
import fs from 'fs';
import path from 'path';

const ED_SAFETY_FILES = [
  'edPatternDetector.js',
  'wellbeing.js',
  'nutritionEngine.js',
  'weeklyCoach.js',
  'coachApply.js',
];

// Matches an ES `from '...recovery/...'` or a `require('...recovery/...')`
// whose path contains a "recovery/" segment -- never a bare "recovery"
// import unrelated to this folder.
const RECOVERY_IMPORT = /\b(?:from|require)\b\s*\(?\s*['"][^'"]*\brecovery\/[^'"]*['"]/;

describe('ED-safety modules never import src/lib/recovery (CLAUDE.md Section 2)', () => {
  for (const file of ED_SAFETY_FILES) {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

    test(`${file} does not import or require anything matching /recovery\\//`, () => {
      expect(src).not.toMatch(RECOVERY_IMPORT);
    });
  }
});

/**
 * D219 lane A3 (design 11 test 11, founder answer Q6): the guard, made
 * TRANSITIVE for the one ED-safety module whose volume functions now call new
 * modules. A direct-import check cannot see coachApply.js -> plan/checkinPlacement
 * -> something -> src/lib/recovery, so this walks every relative import and
 * require (static or lazy) from coachApply.js and fails if anything it can
 * reach is under src/lib/recovery/ or imports a path that is.
 *
 * Scope, stated plainly: coachApply.js, and so nutritionEngine.js and the plan
 * modules it imports, reach nothing in the recovery model, and this holds them
 * there. wellbeing.js and weeklyCoach.js already reach src/lib/recovery
 * through their database and sync imports on main (a long-standing fact this
 * lane did not create and does not touch), so a transitive rule cannot be
 * asserted for them; their direct-import guard above stays. The walker takes a
 * file system so a test can prove it catches a seeded violation.
 */
const IMPORT_SPEC = /\b(?:from|require|import)\b\s*\(?\s*['"]([^'"]+)['"]/g;

function walkImports(entry, host) {
  const seen = new Set();
  const violations = [];
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (host.inRecovery(file)) violations.push({ file, spec: null });
    const source = host.read(file);
    IMPORT_SPEC.lastIndex = 0;
    let match = IMPORT_SPEC.exec(source);
    while (match) {
      const spec = match[1];
      if (RECOVERY_IMPORT.test(`from '${spec}'`)) violations.push({ file, spec });
      if (spec.startsWith('.')) {
        const resolved = host.resolve(file, spec);
        if (resolved) stack.push(resolved);
      }
      match = IMPORT_SPEC.exec(source);
    }
  }
  return { files: seen, violations };
}

describe('coachApply.js never reaches src/lib/recovery, through any chain of imports (D219, design 11 test 11)', () => {
  const libDir = path.join(__dirname, '..', '..');
  const recoveryDir = path.join(libDir, 'recovery') + path.sep;
  const realHost = {
    read: (file) => fs.readFileSync(file, 'utf8'),
    inRecovery: (file) => file.startsWith(recoveryDir),
    resolve: (from, spec) => {
      const base = path.resolve(path.dirname(from), spec);
      for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
        try {
          if (fs.statSync(candidate).isFile()) return candidate;
        } catch (_e) { /* not this one */ }
      }
      return null;
    },
  };

  test('the walk reaches the plan modules coachApply.js calls, and nothing in the recovery model', () => {
    const { files, violations } = walkImports(path.join(libDir, 'coachApply.js'), realHost);
    const rel = Array.from(files).map((f) => path.relative(libDir, f).split(path.sep).join('/'));
    // The guard must not pass for want of looking: the modules the volume
    // functions call are in the walk.
    expect(rel).toEqual(expect.arrayContaining([
      'coachApply.js', 'nutritionEngine.js', 'plan/prescribe.js', 'plan/science.js', 'plan/checkinPlacement.js',
    ]));
    expect(violations).toEqual([]);
    expect(rel.filter((f) => f.startsWith('recovery/'))).toEqual([]);
  });

  test('the walker catches a seeded transitive violation and an indirect lazy require', () => {
    const fake = {
      '/lib/coachApply.js': "import { a } from './plan/a';",
      '/lib/plan/a.js': "import { b } from './b';",
      '/lib/plan/b.js': "export const b = () => require('../recovery/constants');",
      '/lib/recovery/constants.js': 'export const X = 1;',
    };
    const host = {
      read: (file) => fake[file],
      inRecovery: (file) => file.startsWith('/lib/recovery/'),
      resolve: (from, spec) => {
        const base = path.posix.resolve(path.posix.dirname(from), spec);
        return [base, `${base}.js`].find((c) => fake[c]) ?? null;
      },
    };
    const { violations } = walkImports('/lib/coachApply.js', host);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.map((v) => v.file)).toEqual(expect.arrayContaining(['/lib/plan/b.js', '/lib/recovery/constants.js']));
  });
});
