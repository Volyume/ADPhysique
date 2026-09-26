/**
 * purity.guard.test.js -- LANE R-G (Opus review finding 25, per-muscle
 * recovery programme, register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 9: "the model files
 * import no I/O"; CLAUDE.md: the coaching engine is deterministic, no I/O).
 *
 * Source-level guard, mirroring the "purity (source guard)" blocks already
 * in constants.test.js, muscleRecoveryModel.test.js and sessionReadiness.
 * test.js, for the three next-workout/sequencing modules that were not yet
 * guarded that way: nextLikelyTrainingTime.js, nextWorkoutRecommendation.js
 * and sequenceSessions.js.
 *
 * Unlike those three existing guards, this one does not ban "new Date("
 * outright: nextLikelyTrainingTime.js legitimately builds Date objects from
 * an ms argument it is handed (deterministic date maths on a given instant,
 * never the system clock), so the ban here is scoped to the actual I/O,
 * clock and randomness entry points that would break purity -- the same
 * ones CLAUDE.md's "deterministic, no I/O" mandate is written to catch.
 *
 * Lead ruling (lane R-G's stop item): the check runs over CODE ONLY, with
 * block and line comments stripped first, so a header sentence that
 * disclaims a call ("no Date.now()") can never trip a guard written for
 * the call itself.
 */
import fs from 'fs';
import path from 'path';

// personalRecovery (register D210): the personal learner is engine code too.
const FILES = ['nextLikelyTrainingTime', 'nextWorkoutRecommendation', 'sequenceSessions', 'personalRecovery'];

/** `src` with block and line comments removed (a "//" inside a URL is
 * kept: only a "//" not preceded by ":" starts a line comment here). */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const FORBIDDEN = [
  "Date.now(",
  "Math.random(",
  "from '../database'",
  "require('../database')",
  'store/useAppStore',
  'async-storage',
];

describe('purity (source guard): nextLikelyTrainingTime, nextWorkoutRecommendation, sequenceSessions, personalRecovery', () => {
  for (const name of FILES) {
    const src = codeOnly(fs.readFileSync(path.join(__dirname, '..', `${name}.js`), 'utf8'));

    test(`${name}.js has no I/O, no clock read and no randomness`, () => {
      for (const needle of FORBIDDEN) {
        expect(src).not.toContain(needle);
      }
    });

    test(`${name}.js still contains code after comment stripping (the guard is not vacuous)`, () => {
      expect(src).toMatch(/export function/);
    });
  }
});
