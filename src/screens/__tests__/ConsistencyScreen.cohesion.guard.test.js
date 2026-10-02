/**
 * Source guard for the Progress-tab cohesion sweep (R2, 2026-07-11), scoring
 * ConsistencyScreen against docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md.
 *
 * ConsistencyScreen was already fully compliant at the R2 census (it composes
 * only shared primitives: Card, EmptyState, SectionLabel, BackHeader,
 * InfoTooltip, plus the shared ProgressSections cards). This guard PINS that
 * clean baseline so a future edit cannot reintroduce a hand-rolled surface:
 *   1. No raw <Modal> and no hand-rolled TouchableOpacity (every control comes
 *      from a shared primitive).
 *   2. Headers/section labels/empties/cards go through the shared components.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ConsistencyScreen.js'), 'utf8');

// D214 (lane 4) addendum: the screen is the plan's, built from the shared
// pieces. The census gains the pins that keep it so (the screen-level words are
// pinned in ConsistencyScreen.d214.test.js).
describe('ConsistencyScreen cohesion census (R2)', () => {
  test('no hand-rolled raw <Modal>', () => {
    expect(SRC).not.toMatch(/<Modal[\s/>]/);
  });

  test('no hand-rolled TouchableOpacity (controls come from shared primitives)', () => {
    expect(SRC).not.toMatch(/TouchableOpacity/);
  });

  test('composes the shared header / label / empty / card primitives', () => {
    expect(SRC).toMatch(/import BackHeader from '\.\.\/components\/BackHeader'/);
    expect(SRC).toMatch(/import Card from '\.\.\/components\/Card'/);
    expect(SRC).toMatch(/import EmptyState from '\.\.\/components\/EmptyState'/);
    expect(SRC).toMatch(/import SectionLabel from '\.\.\/components\/SectionLabel'/);
    expect(SRC).toMatch(/<BackHeader title="Consistency" \/>/);
  });

  test('D214: the screen composes the shared plan-week card, grid section, block card and load card', () => {
    expect(SRC).toMatch(/import PlanWeekCard from '\.\.\/components\/PlanWeekCard'/);
    expect(SRC).toMatch(/TrainingDaysSection/);
    expect(SRC).toMatch(/BlockCard/);
    expect(SRC).toMatch(/LoadCard/);
    expect(SRC).toMatch(/<BlockShapeCard/);
  });

  test('D214: headings are SectionLabels, and every section of the plan has one', () => {
    for (const heading of ['Your plan week', 'Last 12 weeks', 'Your block', "This week's plan", 'Load', 'Sessions']) {
      expect(SRC).toContain(`<SectionLabel heading>${heading}</SectionLabel>`);
    }
  });

  test('D214: the screen draws no colour of its own beyond the ink and the page ground', () => {
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(code).not.toMatch(/colors\.(primaryFill|warning|success|error|gold)\b/);
    // The only brand-token read is the refresh spinner's tint, the platform's
    // own control (a fact is never amber, plan rule 3).
    expect(code.match(/colors\.primary\b/g)).toHaveLength(1);
    expect(code).toMatch(/tintColor=\{t\.colors\.primary\}/);
  });
});
