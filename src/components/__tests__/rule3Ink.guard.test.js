/**
 * D214 addendum 6 (lane 3 review 4): the lead's rule-3 hunks had no regression
 * pin, and a mutation run showed NavRow's tile and BlockShapeCard's dots could
 * go back to amber with every suite green. Plan 7.0 rule 3: amber only on an
 * action, at most one per screen, never on a fact. These are source pins on
 * the shared components, plus the plan-week card's under-section, which must
 * never become an accessible group (it would swallow the strip's controls).
 */
const fs = require('fs');
const path = require('path');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('rule 3: ink on the shared doors and block dots', () => {
  test('NavRow carries no amber token: the tile is surface2, the glyph textSecondary', () => {
    const src = code(read('NavRow.js'));
    expect(src).not.toMatch(/colors\.(primary|primaryBg|primaryDim|primaryFill|gold|warning)\b/);
    expect(src).toMatch(/color=\{t\.colors\.textSecondary\}/);
    expect(src).toMatch(/navRowIcon: \{ backgroundColor: t\.colors\.surface2 \}/);
    expect(src).toMatch(/accessibilityLabel=\{sub \? `\$\{label\}\. \$\{sub\}` : label\}/);
  });
  test('BlockShapeCard carries no amber token; the recovery dot is a dashed outline', () => {
    const src = code(read('BlockShapeCard.js'));
    expect(src).not.toMatch(/colors\.(primary|primaryBg|primaryDim|primaryFill|gold|warning)\b/);
    expect(src).not.toMatch(/withAlpha/);
    expect(src).toMatch(/dotRecovery: \{[^}]*borderStyle: 'dashed'/);
    expect(src).toMatch(/dotCurrent: \{[^}]*borderColor: colors\.textPrimary/);
    expect(src).toMatch(/dotLabelCurrent: \{ color: colors\.textPrimary/);
  });
  test('the no-plan card\'s icon is ink (ProgressSections)', () => {
    const src = code(read('ProgressSections.js'));
    expect(src).toMatch(/name="layers-outline" size=\{32\} color=\{t\.colors\.textSecondary\}/);
    expect(src).not.toMatch(/primaryDim/);
  });
  test('PlanWeekCard: the under-section is never an accessible group', () => {
    const src = code(read('PlanWeekCard.js'));
    const under = src.slice(src.indexOf('testID="plan-week-under"') - 160, src.indexOf('testID="plan-week-under"'));
    expect(under).not.toMatch(/accessible\b/);
    expect(src).toMatch(/<View accessible accessibilityLabel=\{summary\.accessibilityLabel\} testID="plan-week-summary">/);
  });
});
