/**
 * HomeScreen.recoveryPercentGuard.test.js -- LANE R-G (Opus review finding
 * 25, per-muscle recovery programme, register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 9: "a source guard
 * that no recovery surface renders a percent without the word 'estimated'").
 *
 * Source-level guard (repo convention -- see
 * HomeScreen.communityRow.guard.test.js, HomeScreen.trainingDayBanner.guard.
 * test.js): src/screens/HomeScreen.js and src/components/
 * HomeChangeWorkoutSheet.js must never build a recovery percent themselves.
 * The "estimated" law (spec 4.2 point 4; Opus review finding 2: no evidence
 * is never "ready" in copy) lives ENTIRELY in
 * src/lib/recovery/nextWorkoutRecommendation.js's own strings
 * (muscleEstimateSentence). A screen or sheet that ever interpolated its own
 * "${x}%" could drop that word, or state a percent with no session behind
 * it, without this guard failing.
 *
 * Pins:
 *   (a) no template literal in either file interpolates a value immediately
 *       followed by a literal "%" (regex /\$\{[^}]*\}%/).
 *   (b) the only recovery line HomeScreen renders is `heroRecoveryLine`,
 *       which reads only recoveryRecommendation.programmeNextLine and a
 *       perSession[...].line -- never a third, ad hoc source -- and that
 *       variable, not a rebuilt string, is what the card's Text renders.
 *   (c) the change-workout sheet renders no recovery line at all.
 *
 * RE-PINNED D219 lane A6 (founder 2026-10-04: no surface recommends another
 * session): (b) used to include a third source, recoveryRecommendation.reason
 * (the swap reason), and (c) used to pin the sheet's per-row line
 * (recoveryLineFor reading perSession[...].line). Both are gone: the hero has
 * no swap branch, and the sheet is a plain list with no readiness.
 */
import fs from 'fs';
import path from 'path';

const HOME_SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'HomeScreen.js'),
  'utf8',
);
const SHEET_SRC = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'components', 'HomeChangeWorkoutSheet.js'),
  'utf8',
);

const PERCENT_INTERPOLATION = /\$\{[^}]*\}%/;

/** Same indexOf-bounded block extraction as HomeScreen.communityRow.guard.test.js's fnBody. */
function block(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end + endMarker.length);
}

describe('neither Home nor the change-workout sheet builds a recovery percent itself', () => {
  test('HomeScreen.js: no template literal interpolates a value into a percent', () => {
    expect(HOME_SRC).not.toMatch(PERCENT_INTERPOLATION);
  });

  test('HomeChangeWorkoutSheet.js: no template literal interpolates a value into a percent', () => {
    expect(SHEET_SRC).not.toMatch(PERCENT_INTERPOLATION);
  });
});

describe('HomeScreen renders only heroRecoveryLine, sourced from recommendNextWorkout', () => {
  const heroBody = block(HOME_SRC, 'const heroRecoveryLine = (() => {', '})();');

  test('there is no swap branch: the hero line never reads a reason or an override (D219)', () => {
    expect(heroBody).not.toMatch(/\.reason\b/);
    expect(heroBody).not.toMatch(/recoveryOverride|recoveryPrimaryActive|\.recommended\b/);
  });

  test('the programme-next case reads recoveryRecommendation.programmeNextLine', () => {
    expect(heroBody).toMatch(/recoveryRecommendation\.programmeNextLine/);
  });

  test('the fallback case reads a matching perSession entry\'s own .line, and nothing else', () => {
    expect(heroBody).toMatch(/recoveryRecommendation\.perSession/);
    expect(heroBody).toMatch(/\?\.line \?\? null/);
  });

  test('heroRecoveryLine itself, not a rebuilt string, is what the card renders', () => {
    expect(HOME_SRC).toMatch(/\{heroRecoveryLine \? \(/);
    expect(HOME_SRC).toMatch(/>\{heroRecoveryLine\}<\/Text>/);
  });
});

describe('the change-workout sheet renders no recovery line at all (D219)', () => {
  test('it takes no per-session readiness and builds no recovery line', () => {
    const code = SHEET_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/recoveryPerSession|recoveryLineFor|recoveryLine\b/);
    expect(code).not.toMatch(/\.line\b/);
    expect(code).not.toMatch(/ percent/);
  });

  test('Home hands the sheet no per-session readiness', () => {
    const mount = HOME_SRC.slice(HOME_SRC.indexOf('<HomeChangeWorkoutSheet'));
    const props = mount.slice(0, mount.indexOf('/>'));
    expect(props).not.toMatch(/recoveryPerSession/);
  });
});
