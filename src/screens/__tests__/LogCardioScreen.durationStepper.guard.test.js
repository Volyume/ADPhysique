/**
 * Source guard: LogCardioScreen should use the shared Stepper for duration
 * instead of carrying a bespoke minus/plus control.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'LogCardioScreen.js'), 'utf8');

describe('LogCardioScreen duration stepper', () => {
  test('uses the shared Stepper with the cardio duration range', () => {
    expect(source).toMatch(/import Stepper from '\.\.\/components\/Stepper';/);
    expect(source).toMatch(
      /<Stepper[\s\S]*value=\{duration\}[\s\S]*onChange=\{setDuration\}[\s\S]*min=\{5\}[\s\S]*max=\{300\}[\s\S]*step=\{5\}[\s\S]*unit="min"/,
    );
  });

  test('does not reintroduce local duration plus-minus styles', () => {
    expect(source).not.toMatch(/styles\.step(?:per|Btn|BtnText|Value)/);
    expect(source).not.toMatch(/accessibilityLabel="(?:Less|More) time"/);
  });
});
