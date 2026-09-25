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
