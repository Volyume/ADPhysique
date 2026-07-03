/**
 * B4 surface guards — source-level locks for the countdown's wiring rules
 * (docs/b4-contest-countdown-ed-review-2026-07-02.md). The pure-module
 * rules are pinned in contestCountdown.test.js; these pin how the SCREENS
 * use it, the part a unit test on the lib cannot see:
 *  - rule 1: the CoachOutput countdown renders BELOW the held-decisions
 *    safety shelf, never above it;
 *  - rule 2: the screen feeds the lib fail-closed sentinels, so a failed
 *    ED-flag or wellbeing read HIDES the countdown rather than showing it;
 *  - rule 3: nothing in the notifications layer touches the countdown —
 *    it is a pull surface only;
 *  - the show-date field only exists for competition divisions.
 */
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
const coachOutput = read('screens/CoachOutputScreen.js');
const proGoalSetup = read('screens/ProGoalSetupScreen.js');

describe('rule 1: safety shelf renders above the countdown', () => {
  test('the countdown card sits after the HeldDecisionsCard in CoachOutput', () => {
    const shelf = coachOutput.indexOf('<HeldDecisionsCard');
    const card = coachOutput.indexOf('styles.countdownCard');
    expect(shelf).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(shelf);
  });
});

describe('rule 2: the surface fails closed on wellbeing reads', () => {
  test('a failed ED-flag read feeds a truthy sentinel into the lib', () => {
    expect(coachOutput).toMatch(/getOpenEdPatternFlag\(user\.id\)\.catch\(\(\) => 'read_failed'\)/);
  });
  test('a failed wellbeing read fails closed (calm) via a raw AsyncStorage read', () => {
    // getWellbeingMode swallows genuine failures to 'unspecified' (fail open),
    // so wellbeing is read raw; a real failure yields 'read_failed', which the
    // calm computation then treats as calm.
    expect(coachOutput).toMatch(/AsyncStorage\.getItem\(WELLBEING_KEY\)[\s\S]*?\.catch\(\(\) => 'read_failed'\)/);
    expect(coachOutput).toMatch(/wb === 'read_failed'/);
    expect(coachOutput).not.toMatch(/getWellbeingMode\(/);
  });
  test('SCOFF feeds the lib from the profile score', () => {
    expect(coachOutput).toMatch(/scoffPositive: \(userProfile\?\.scoffScore \?\? 0\) >= 2/);
  });
});

describe('rule 3: the countdown is a pull surface only', () => {
  test('no notifications module references the countdown', () => {
    const dir = path.join(__dirname, '..', 'notifications');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(src).not.toMatch(/contestCountdown|showDate|show_date|weeks to your show/i);
    }
  });
});

describe('show date entry is competition-only and validated', () => {
  test('the field renders only under isCompetitionGoal', () => {
    expect(proGoalSetup).toMatch(/const showDateApplicable = isCompetitionGoal\(selectedGoal\)/);
    expect(proGoalSetup).toMatch(/\{showDateApplicable && \(/);
  });
  test('an invalid date blocks the save before anything writes', () => {
    expect(proGoalSetup).toMatch(/parseShowDate\(trimmedShowDate\) === null/);
  });
});
