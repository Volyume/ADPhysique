/**
 * D228 item 2, tier c (founder 2026-10-15): the Coaching decision screen's
 * "Your week" rows withhold the weight figures under an OPEN FLAG, a failed
 * read or the unknown state, and not under calm alone. The row builder is
 * pinned behaviourally in src/lib/__tests__/coachOutputWeekRows.test.js; this
 * source guard pins the wiring on the screen, written to FAIL if
 *  - the screen stops reading the one safety state (useSafetyState + the
 *    withholdsWeightFigures helper) or composes its own calm/flag OR for the
 *    chip;
 *  - the render-scope held-decision flag (a flag the run raised THIS visit,
 *    which the hook has not re-read yet) stops withholding;
 *  - the weekly chip's own derivation (R-14, campaign6.longTerm.test.js) is
 *    edited: the figure is withheld at the row builder, not recomputed;
 *  - calm alone starts withholding the figures.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

describe('CoachOutputScreen weight figures (D228 item 2, tier c)', () => {
  test('reads the safety state once, through the hook, at the top of the component', () => {
    expect(SRC).toMatch(/import useSafetyState from '\.\.\/hooks\/useSafetyState';/);
    expect(SRC).toMatch(/import \{ deriveSafetyState, withholdsWeightFigures \} from '\.\.\/lib\/safetyState';/);
    expect(SRC.match(/useSafetyState\(user\?\.id\)/g)).toHaveLength(1);
    const hookAt = SRC.indexOf('useSafetyState(user?.id)');
    const firstEarlyReturn = SRC.indexOf('return (', SRC.indexOf('export default function CoachOutputScreen'));
    expect(hookAt).toBeGreaterThan(SRC.indexOf('export default function CoachOutputScreen'));
    expect(hookAt).toBeLessThan(firstEarlyReturn);
  });

  test('the withhold is the helper plus the render-scope held-decision flag, and never calm', () => {
    const m = SRC.match(/const weightFiguresWithheld = ([^;]+);/);
    expect(m).not.toBeNull();
    expect(m[1]).toMatch(/withholdsWeightFigures\(safety\)/);
    expect(m[1]).toMatch(/edPatternOpen/);
    expect(m[1]).not.toMatch(/calm/i);
  });

  test('the rows builder receives it; the chip derivation itself is untouched', () => {
    expect(SRC).toMatch(/buildWeekRows\(\{[\s\S]*?withholdWeight: weightFiguresWithheld,[\s\S]*?\}\);/);
    const fn = SRC.slice(SRC.indexOf('const weightChipValue = (() => {'));
    const chip = fn.slice(0, fn.indexOf('})();'));
    expect(chip).toMatch(/if \(bwu === 'kg'\) return trend\.deltaLabel/);
    expect(chip).not.toMatch(/withhold|safety/i);
  });
});
