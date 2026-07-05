import fs from 'fs';
import path from 'path';

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('goal setup surfaces use shared section labels', () => {
  test.each([
    ['PlanUpdateScreen.js'],
    ['ProGoalSetupScreen.js'],
  ])('%s does not carry local section-label typography', (file) => {
    const source = read(file);

    expect(source).toMatch(/import SectionLabel from '..\/components\/SectionLabel'/);
    expect(source).toMatch(/<SectionLabel/);
    expect(source).not.toMatch(/<Text style=\{\[styles\.sectionLabel/);
    expect(source).not.toMatch(/<Text style=\{styles\.sectionLabel\}/);
    expect(source).not.toMatch(/sectionLabel:\s*\{[\s\S]*?\.\.\.type\.label/);
  });
});
