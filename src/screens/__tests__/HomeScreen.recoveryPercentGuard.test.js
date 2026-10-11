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
 *   (b) RE-ANCHORED D224: Today renders no recovery line at all and reads
 *       no recovery reading (the founder's order, below).
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

describe('neither Home nor the change-workout sheet builds a recovery percent itself', () => {
  test('HomeScreen.js: no template literal interpolates a value into a percent', () => {
    expect(HOME_SRC).not.toMatch(PERCENT_INTERPOLATION);
  });

  test('HomeChangeWorkoutSheet.js: no template literal interpolates a value into a percent', () => {
    expect(SHEET_SRC).not.toMatch(PERCENT_INTERPOLATION);
  });
});

// RE-ANCHORED D224 (founder order 2026-10-11, on Today: "Remove the recovery
// data from today. I don't want it there full stop."): Today renders no
// recovery line at all, and never imports the recovery estimate's modules.
describe('Today renders no recovery data (D224)', () => {
  const code = HOME_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test('no recovery line and no import of the recovery estimate', () => {
    expect(code).not.toMatch(/heroRecoveryLine|recoveryRecommendation/);
    expect(code).not.toMatch(/lib\/recovery\/(load|nextWorkoutRecommendation|nextLikelyTrainingTime)/);
    expect(code).not.toMatch(/'Opens Recovery'/);
  });

  test('no soreness, sleep, energy, fatigue or deload reading feeds Today', () => {
    expect(code).not.toMatch(/getRecentWorkoutFeedback|shouldDeload|buildLast4WeekDeloadBuckets|fatigueHistory|deloadSuggestion/);
  });

  test('the block state Today shows is the planned recovery week only', () => {
    expect(code).toMatch(/const todayRecoveryState = gatedRecoveryState\?\.state === RECOVERY_STATE\.PLANNED_BLOCK_RECOVERY \? gatedRecoveryState : null;/);
    expect(code).toMatch(/nextWorkoutRecoveryLabel\(todayRecoveryState\)/);
    expect(code).toMatch(/gatedRecoveryState: todayRecoveryState/);
    expect(code).toMatch(/recoveryState=\{todayRecoveryState\}/);
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
