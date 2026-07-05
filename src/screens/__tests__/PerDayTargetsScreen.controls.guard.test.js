import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'PerDayTargetsScreen.js'), 'utf8');

describe('PerDayTargetsScreen controls design guard', () => {
  test('uses shared Stepper and Button controls for weekday offsets', () => {
    expect(source).toMatch(/import Stepper from '\.\.\/components\/Stepper';/);
    expect(source).toMatch(/import Button from '\.\.\/components\/Button';/);
    expect(source).toMatch(
      /<Stepper[\s\S]*min=\{-MAX_PERDAY_OFFSET_KCAL\}[\s\S]*max=\{MAX_PERDAY_OFFSET_KCAL\}[\s\S]*step=\{STEP_KCAL\}[\s\S]*decreaseLabel=\{`Lower \$\{WEEKDAY_LABELS\[key\]\} target`\}[\s\S]*increaseLabel=\{`Raise \$\{WEEKDAY_LABELS\[key\]\} target`\}/,
    );
    expect(source).toMatch(/<Button[\s\S]*title="Reset all to base target"[\s\S]*icon="refresh-outline"[\s\S]*variant="secondary"/);
    expect(source).not.toMatch(/local\.stepBtn/);
    expect(source).not.toMatch(/local\.resetBtn/);
  });
});
