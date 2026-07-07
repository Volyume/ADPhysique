const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'NutritionTargetsScreen.js'), 'utf8');

describe('NutritionTargetsScreen section labels', () => {
  test('uses the shared SectionLabel primitive for title-scale form sections', () => {
    expect(source).toMatch(/import SectionLabel from '\.\.\/components\/SectionLabel';/);
    expect(source).toMatch(/<SectionLabel variant="title" style=\{styles\.sectionHeading\}>/);
    expect(source).not.toMatch(/return <Text style=\{styles\.sectionHeading\}>/);
    expect(source).not.toMatch(/sectionHeading:\s*\{[\s\S]{0,120}\.\.\.type\.title/);
  });

  test('exact body-fat input is measured-only and does not offer a visual guess source', () => {
    expect(source).toContain('Measured body fat %');
    expect(source).toContain('Measurement method');
    expect(source).toContain('Leave body fat blank unless you have a measured value');
    expect(source).not.toContain("{ key: 'visual',  label: 'Visual' }");
    expect(source).not.toContain('Body fat estimated visually');
  });
});
