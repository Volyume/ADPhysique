const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ImportScreen.js'), 'utf8');

describe('ImportScreen CTA primitives', () => {
  test('uses shared Button for import flow CTAs instead of bespoke pressable cards', () => {
    expect(SOURCE).toMatch(/import Button from '\.\.\/components\/Button';/);
    expect(SOURCE).toMatch(/<Button[\s\S]*title="Pick CSV file"[\s\S]*icon="document-attach-outline"/);
    expect(SOURCE).toMatch(/<Button[\s\S]*title=\{`Import \$\{analysis\.workoutCount\} sessions`\}[\s\S]*icon="checkmark"/);
    expect(SOURCE).toMatch(/<Button[\s\S]*title="Pick a different file"[\s\S]*variant="secondary"/);
    expect(SOURCE).toMatch(/<Button[\s\S]*title="Import another file"[\s\S]*variant="secondary"/);
    expect(SOURCE).not.toMatch(/import PressableCard from '\.\.\/components\/PressableCard';/);
    expect(SOURCE).not.toMatch(/primaryCta(Text)?|secondaryCta(Text)?/);
  });
});
